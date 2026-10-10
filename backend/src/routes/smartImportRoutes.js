const express = require(
  "express"
);

const World = require(
  "../models/World"
);

const Document = require(
  "../models/Document"
);

const Entity = require(
  "../models/Entity"
);

const EntityType = require(
  "../models/EntityType"
);

const Relation = require(
  "../models/Relation"
);

const StorySyncCandidate = require(
  "../models/StorySyncCandidate"
);

const {
  requireAuth,
} = require(
  "../middleware/requireAuth"
);

const {
  analyzeStoryForSuggestions,
} = require(
  "../storyAnalysis/l3/storyAnalysisPipeline"
);

const {
  mapSuggestionsToStorySyncCandidates,
} = require(
  "../storyAnalysis/l4/storySyncMapper"
);

const {
  persistStorySyncCandidates,
} = require(
  "../storyAnalysis/l4/storySyncPersistenceService"
);

const {
  applyStorySyncCandidate,
  StorySyncApplyError,
  validateFieldValue,
} = require(
  "../storyAnalysis/l4/storySyncApplyService"
);

const {
  ensureRecommendedEntityType,
  RecommendedEntityTypeError,
} = require(
  "../storyAnalysis/l4/recommendedEntityTypeService"
);

const {
  ignoreStorySyncCandidate,
  StorySyncResolutionError,
} = require(
  "../storyAnalysis/l4/storySyncResolutionService"
);

const router =
  express.Router();

router.use(
  requireAuth
);


// ======================================================
// Errors
// ======================================================

class StorySuggestionEditError
  extends Error {
  constructor(
    message,
    {
      code =
        "SMART_IMPORT_EDIT_ERROR",

      statusCode =
        400,

      details =
        null,
    } = {}
  ) {
    super(
      message
    );

    this.name =
      "StorySuggestionEditError";

    this.code =
      code;

    this.statusCode =
      statusCode;

    this.details =
      details;
  }
}


// ======================================================
// Ownership
// ======================================================

async function findOwnedWorld(
  worldId,
  userId
) {
  try {
    return await World.findOne({
      _id:
        worldId,

      ownerId:
        userId,
    });
  } catch {
    return null;
  }
}


async function loadOwnedCandidate(
  candidateId,
  userId
) {
  let candidate =
    null;

  try {
    candidate =
      await StorySyncCandidate
        .findById(
          candidateId
        );
  } catch {
    return {
      error: {
        status:
          404,

        code:
          "SMART_IMPORT_SUGGESTION_NOT_FOUND",

        message:
          "Smart Import suggestion not found.",
      },
    };
  }

  if (
    !candidate
  ) {
    return {
      error: {
        status:
          404,

        code:
          "SMART_IMPORT_SUGGESTION_NOT_FOUND",

        message:
          "Smart Import suggestion not found.",
      },
    };
  }

  const world =
    await findOwnedWorld(
      candidate.worldId,
      userId
    );

  if (
    !world
  ) {
    /*
     * Deliberately use 404 so another user's private
     * candidate cannot be discovered by ID probing.
     */
    return {
      error: {
        status:
          404,

        code:
          "SMART_IMPORT_SUGGESTION_NOT_FOUND",

        message:
          "Smart Import suggestion not found.",
      },
    };
  }

  return {
    candidate,
    world,
  };
}


// ======================================================
// Scratch Document
//
// Smart Import deliberately reuses the existing analysis
// pipeline, but it does NOT create a DocumentNode.
//
// Therefore this scratch document never appears in the
// normal Documents tree.
// ======================================================

async function getOrCreateScratchDocument(
  world
) {
  let document =
    await Document.findOne({
      worldId:
        world._id,

      "settings.smartImportScratch":
        true,
    });

  if (
    document
  ) {
    return document;
  }

  document =
    new Document({
      worldId:
        world._id,

      title:
        "__Mimoria Smart Import__",

      plainText:
        "",

      contentVersion:
        0,

      syncedVersion:
        0,

      settings: {
        smartImportScratch:
          true,
      },
    });

  await document.save();

  return document;
}
function normalizeEntityName(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /\s+/gu,
      " "
    );
}


function buildEntityNameVariants(
  value
) {
  const original =
    String(
      value || ""
    )
      .trim();


  if (
    !original
  ) {
    return [];
  }


  const variants =
    new Set([
      original,
    ]);


  /*
   * Chinese temporal words that an analyzer may
   * accidentally attach to the preceding entity name.
   *
   * IMPORTANT:
   * These are only alternative lookup candidates.
   * We never mutate the name unless an existing Canon
   * entity actually matches the shortened variant.
   */
  const chineseSuffixes = [
    "今年",
    "目前",
    "现在",
    "当前",
    "现年",
  ];


  for (
    const suffix of
    chineseSuffixes
  ) {
    if (
      original.endsWith(
        suffix
      ) &&
      original.length >
        suffix.length
    ) {
      variants.add(
        original.slice(
          0,
          -suffix.length
        )
          .trim()
      );
    }
  }


  return [
    ...variants,
  ]
    .filter(
      Boolean
    );
}


function findExistingEntityByName(
  entities,
  rawName
) {
  const variants =
    buildEntityNameVariants(
      rawName
    );


  if (
    variants.length ===
    0
  ) {
    return null;
  }


  /*
   * Exact original name has highest priority.
   */
  for (
    const variant of
    variants
  ) {
    const normalizedVariant =
      normalizeEntityName(
        variant
      );


    const matches =
      entities.filter(
        (
          entity
        ) =>
          normalizeEntityName(
            entity?.name
          ) ===
          normalizedVariant
      );


    /*
     * Only auto-resolve an unambiguous match.
     */
    if (
      matches.length ===
      1
    ) {
      return matches[0];
    }
  }


  return null;
}
// ======================================================
// Materialize Accepted Entity Dependencies
// ======================================================

async function materializeAcceptedEntityDependencies({
  candidate,
  appliedResult,
}) {
  if (
    !candidate ||
    candidate.kind !==
      "create-entity" ||
    !appliedResult?.entityId
  ) {
    return [];
  }


  const entity =
    await Entity.findOne({
      _id:
        appliedResult.entityId,

      worldId:
        candidate.worldId,
    });


  if (
    !entity
  ) {
    return [];
  }


  const sourcePayload =
    candidate.payload ||
    {};


  const draftEntityKey =
    String(
      sourcePayload
        .draftEntityKey ||
      appliedResult
        .draftEntityKey ||
      ""
    )
      .normalize(
        "NFKC"
      )
      .trim()
      .toLowerCase();


  const sourceName =
    normalizeEntityName(
      sourcePayload.name ||
      appliedResult.name ||
      entity.name
    );


  const siblings =
    await StorySyncCandidate.find({
      _id: {
        $ne:
          candidate._id,
      },

      worldId:
        candidate.worldId,

      documentId:
        candidate.documentId,

      status:
        "pending",
    });


  const changedCandidates =
    [];


  function normalizedDraftKey(
    value
  ) {
    return String(
      value ||
      ""
    )
      .normalize(
        "NFKC"
      )
      .trim()
      .toLowerCase();
  }


  function matchesDraft({
    candidateDraftKey,
    candidateName,
  }) {
    const normalizedCandidateDraftKey =
      normalizedDraftKey(
        candidateDraftKey
      );


    /*
     * Strongest match:
     * both suggestions reference the same analysis-time
     * draft entity.
     */
    if (
      draftEntityKey &&
      normalizedCandidateDraftKey &&
      normalizedCandidateDraftKey ===
        draftEntityKey
    ) {
      return true;
    }


    /*
     * If either side has a draft key but they differ,
     * do NOT fall back to the name.
     *
     * The draft key exists specifically to disambiguate
     * same-name entities.
     */
    if (
      draftEntityKey ||
      normalizedCandidateDraftKey
    ) {
      return false;
    }


    /*
     * Legacy candidates may not have draft keys.
     *
     * In that case only allow an exact normalized name
     * match.
     */
    const normalizedCandidateName =
      normalizeEntityName(
        candidateName
      );


    return Boolean(
      sourceName &&
      normalizedCandidateName &&
      sourceName ===
        normalizedCandidateName
    );
  }


  for (
    const sibling of
    siblings
  ) {
    const payload = {
      ...(
        sibling.payload ||
        {}
      ),
    };


    let changed =
      false;


    // ==================================================
    // Field Update
    // ==================================================

    if (
      sibling.kind ===
      "field-update"
    ) {
      const dependencyMatches =
        matchesDraft({
          candidateDraftKey:
            payload
              .targetDraftEntityKey,

          candidateName:
            payload
              .targetEntityName,
        });


      if (
        dependencyMatches
      ) {
        const nextEntityId =
          String(
            entity._id
          );


        if (
          String(
            payload
              .targetEntityId ||
            ""
          ) !==
          nextEntityId
        ) {
          payload.targetEntityId =
            nextEntityId;

          changed =
            true;
        }


        if (
          payload
            .targetEntityName !==
          entity.name
        ) {
          payload.targetEntityName =
            entity.name;

          changed =
            true;
        }
      }
    }


    // ==================================================
    // Relation Update
    // ==================================================

    if (
      sibling.kind ===
      "relation-update"
    ) {
      const subjectMatches =
        matchesDraft({
          candidateDraftKey:
            payload
              .subjectDraftEntityKey,

          candidateName:
            payload
              .subjectName,
        });


      const objectMatches =
        matchesDraft({
          candidateDraftKey:
            payload
              .objectDraftEntityKey,

          candidateName:
            payload
              .objectName,
        });


      if (
        subjectMatches
      ) {
        const nextEntityId =
          String(
            entity._id
          );


        if (
          String(
            payload
              .subjectEntityId ||
            ""
          ) !==
          nextEntityId
        ) {
          payload.subjectEntityId =
            nextEntityId;

          changed =
            true;
        }


        if (
          payload.subjectName !==
          entity.name
        ) {
          payload.subjectName =
            entity.name;

          changed =
            true;
        }
      }


      if (
        objectMatches
      ) {
        const nextEntityId =
          String(
            entity._id
          );


        if (
          String(
            payload
              .objectEntityId ||
            ""
          ) !==
          nextEntityId
        ) {
          payload.objectEntityId =
            nextEntityId;

          changed =
            true;
        }


        if (
          payload.objectName !==
          entity.name
        ) {
          payload.objectName =
            entity.name;

          changed =
            true;
        }
      }
    }


    // ==================================================
    // Historical Event
    //
    // Timeline is not implemented yet, but keeping these
    // references synchronized now prevents another
    // migration later.
    // ==================================================

    if (
      sibling.kind ===
      "event-history"
    ) {
      const subjectMatches =
        matchesDraft({
          candidateDraftKey:
            payload
              .subjectDraftEntityKey,

          candidateName:
            payload
              .subjectName,
        });


      const objectMatches =
        matchesDraft({
          candidateDraftKey:
            payload
              .objectDraftEntityKey,

          candidateName:
            payload
              .objectName,
        });


      if (
        subjectMatches
      ) {
        payload.subjectEntityId =
          String(
            entity._id
          );

        payload.subjectName =
          entity.name;

        changed =
          true;
      }


      if (
        objectMatches
      ) {
        payload.objectEntityId =
          String(
            entity._id
          );

        payload.objectName =
          entity.name;

        changed =
          true;
      }
    }


    if (
      !changed
    ) {
      continue;
    }


    /*
     * This is NOT a user edit.
     *
     * Do not call recordUserEdit(), otherwise Mimoria
     * would incorrectly display "Edited" simply because a
     * dependency was materialized automatically.
     */
    sibling.payload =
      payload;


    sibling.markModified(
      "payload"
    );


    await sibling.save();


    changedCandidates.push(
      sibling
    );
  }


  return changedCandidates;
}
// ======================================================
// General Helpers
// ======================================================

function clonePlain(
  value
) {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }


  try {
    return JSON.parse(
      JSON.stringify(
        value
      )
    );
  } catch {
    return value;
  }
}


function escapeRegExp(
  value
) {
  return String(
    value
  )
    .replace(
      /[.*+?^${}()|[\]\\]/gu,
      "\\$&"
    );
}


function normalizeEnabledPacks(
  value
) {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [
      "furry",
      "sciFi",
    ];
  }


  return value
    .map(
      (item) =>
        String(
          item || ""
        )
          .trim()
    )
    .filter(
      Boolean
    );
}



// ======================================================
// Story Locale Detection
//
// IMPORTANT:
//
// Analysis language must be based on the story text,
// not the user's UI language.
//
// Chinese UI + English story must still use English
// recognition rules.
// ======================================================

function detectStoryLocale(
  text
) {
  const source =
    String(
      text || ""
    );


  const chineseMatches =
    source.match(
      /[\u3400-\u4DBF\u4E00-\u9FFF]/gu
    ) ||
    [];


  const latinMatches =
    source.match(
      /[A-Za-z]/gu
    ) ||
    [];


  const chineseCount =
    chineseMatches.length;

  const latinCount =
    latinMatches.length;


  if (
    chineseCount ===
      0 &&
    latinCount >
      0
  ) {
    return "en";
  }


  if (
    latinCount ===
      0 &&
    chineseCount >
      0
  ) {
    return "zh-CN";
  }


  /*
   * Mixed-language text:
   *
   * Chinese generally uses fewer characters than English
   * needs alphabetic characters, so a modest threshold is
   * more useful than a strict 50/50 comparison.
   */
  if (
    chineseCount >
    latinCount *
      0.15
  ) {
    return "zh-CN";
  }


  return "en";
}


function resolveAnalysisLocale({
  text,

  requestedLocale,

  forceLocale =
    false,
}) {
  const requested =
    String(
      requestedLocale ||
      "auto"
    )
      .trim();


  /*
   * Explicit override is supported for future per-document
   * settings, but it must be deliberately requested.
   */
  if (
    forceLocale
  ) {
    if (
      requested ===
        "en" ||
      requested ===
        "en-US"
    ) {
      return "en";
    }


    if (
      requested ===
      "zh-CN"
    ) {
      return "zh-CN";
    }
  }


  return detectStoryLocale(
    text
  );
}



// ======================================================
// Relation / Event Normalization
// ======================================================

function normalizeRelationType(
  value
) {
  const normalized =
    String(
      value || ""
    )
      .trim();


  if (
    normalized.startsWith(
      "relation."
    )
  ) {
    return normalized.slice(
      "relation.".length
    );
  }


  return normalized;
}


function normalizeRelationConcept(
  value
) {
  const normalized =
    String(
      value || ""
    )
      .trim();


  if (
    !normalized
  ) {
    return "";
  }


  if (
    normalized.startsWith(
      "relation."
    )
  ) {
    return normalized;
  }


  return `relation.${normalized}`;
}


function normalizeEventConcept(
  value
) {
  const normalized =
    String(
      value || ""
    )
      .trim();


  if (
    !normalized
  ) {
    return "";
  }


  if (
    normalized.startsWith(
      "event."
    )
  ) {
    return normalized;
  }


  return `event.${normalized}`;
}



// ======================================================
// Canonical Value Comparison
//
// Supports:
//
// - primitive values
// - ObjectId
// - arrays
// - maps
// - plain objects
// - dates
// ======================================================

function canonicalizeValue(
  value
) {
  if (
    value ===
    undefined
  ) {
    return {
      __type:
        "undefined",
    };
  }


  if (
    value ===
    null
  ) {
    return null;
  }


  if (
    value instanceof
    Date
  ) {
    return value.toISOString();
  }


  if (
    value instanceof
    Map
  ) {
    const result =
      {};


    for (
      const [
        key,
        item,
      ] of value.entries()
    ) {
      result[key] =
        canonicalizeValue(
          item
        );
    }


    return result;
  }


  if (
    Array.isArray(
      value
    )
  ) {
    return value.map(
      canonicalizeValue
    );
  }


  if (
    typeof value ===
    "object"
  ) {
    /*
     * BSON / Mongoose ObjectId
     */
    if (
      value
        ?._bsontype ===
        "ObjectId" ||
      value
        ?.constructor
        ?.name ===
        "ObjectId"
    ) {
      return String(
        value
      );
    }


    const result =
      {};


    for (
      const key of
      Object.keys(
        value
      )
        .sort()
    ) {
      result[key] =
        canonicalizeValue(
          value[key]
        );
    }


    return result;
  }


  return value;
}


function valuesEqual(
  left,
  right
) {
  return (
    JSON.stringify(
      canonicalizeValue(
        left
      )
    ) ===
    JSON.stringify(
      canonicalizeValue(
        right
      )
    )
  );
}


function getEntityStoredValue(
  entity,
  fieldKey
) {
  if (
    !entity ||
    !fieldKey
  ) {
    return undefined;
  }


  if (
    entity.values instanceof
    Map
  ) {
    return entity
      .values
      .get(
        fieldKey
      );
  }


  if (
    entity.values &&
    typeof entity.values ===
      "object"
  ) {
    return entity
      .values[
        fieldKey
      ];
  }


  return undefined;
}



// ======================================================
// Entity Type Semantic Map
// ======================================================

function normalizeEntityTypeName(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


function inferEntityTypeConcept(
  entityType
) {
  if (
    entityType
      ?.canonicalConcept
  ) {
    return String(
      entityType
        .canonicalConcept
    )
      .trim();
  }


  const name =
    normalizeEntityTypeName(
      entityType?.name
    );


  const aliases = {
    "entityType.character": [
      "character",
      "person",
      "角色",
      "人物",
      "人物角色",
    ],

    "entityType.location": [
      "location",
      "place",
      "地点",
      "位置",
      "场所",
    ],

    "entityType.organization": [
      "organization",
      "organisation",
      "faction",
      "组织",
      "机构",
      "势力",
    ],

    "entityType.item": [
      "item",
      "object",
      "物品",
      "道具",
    ],
  };


  for (
    const [
      concept,
      names,
    ] of Object.entries(
      aliases
    )
  ) {
    if (
      names.some(
        (
          alias
        ) =>
          normalizeEntityTypeName(
            alias
          ) ===
          name
      )
    ) {
      return concept;
    }
  }


  return null;
}


function buildEntityTypeConceptMap(
  entityTypes = []
) {
  const result =
    {};


  for (
    const entityType of
    entityTypes
  ) {
    const concept =
      inferEntityTypeConcept(
        entityType
      );


    if (
      !concept
    ) {
      continue;
    }


    result[
      String(
        entityType._id
      )
    ] =
      concept;
  }


  return result;
}



// ======================================================
// Analysis Wrapper
// ======================================================

function runUnifiedStoryAnalysis({
  text,

  locale,

  entities,

  entityTypes,

  entityTypeConceptMap,

  enabledPacks,

  nsfwEnabled,
}) {
  const options = {
    entities,

    entityTypes,

    entityTypeConceptMap,

    enabledPacks,

    nsfwEnabled,
  };


  return analyzeStoryForSuggestions(
    text,

    locale,

    options
  );
}



// ======================================================
// Extract Unified Suggestions
// ======================================================

function extractSuggestions(
  analysis
) {
  if (
    Array.isArray(
      analysis
    )
  ) {
    return analysis;
  }


  if (
    Array.isArray(
      analysis
        ?.suggestions
    )
  ) {
    return analysis
      .suggestions;
  }


  if (
    Array.isArray(
      analysis
        ?.storySuggestions
    )
  ) {
    return analysis
      .storySuggestions;
  }


  if (
    Array.isArray(
      analysis
        ?.suggestionResult
        ?.suggestions
    )
  ) {
    return analysis
      .suggestionResult
      .suggestions;
  }


  if (
    Array.isArray(
      analysis
        ?.storySuggestionResult
        ?.suggestions
    )
  ) {
    return analysis
      .storySuggestionResult
      .suggestions;
  }


  if (
    Array.isArray(
      analysis
        ?.result
        ?.suggestions
    )
  ) {
    return analysis
      .result
      .suggestions;
  }


  return [];
}



// ======================================================
// Canonical State Enrichment
//
// L3 says:
//
// "The story implies X."
//
// L4 asks:
//
// "Does current Canon already satisfy X?"
//
// If yes:
//   do not create a pending suggestion.
//
// If no:
//   attach a baseline and persist a revision.
//
// This is what enables canonical drift detection.
// ======================================================

function enrichRecordsWithCanonicalState({
  records = [],

  entities = [],

  entityTypes = [],

  relations = [],
}) {
  const entityMap =
    new Map(
      entities.map(
        (entity) => [
          String(
            entity._id
          ),

          entity,
        ]
      )
    );


  const entityTypeMap =
    new Map(
      entityTypes.map(
        (entityType) => [
          String(
            entityType._id
          ),

          entityType,
        ]
      )
    );


  const activeRecords =
    [];

  const satisfied =
    [];


  for (
    const rawRecord of
    records
  ) {
    const record = {
      ...rawRecord,

      payload:
        clonePlain(
          rawRecord.payload ||
          {}
        ),

      source:
        clonePlain(
          rawRecord.source ||
          {}
        ),

      warnings: [
        ...(
          rawRecord.warnings ||
          []
        ),
      ],
    };


    /*
     * Mapper suggestionId becomes semantic identity.
     *
     * Persistence later creates:
     *
     * semanticKey::revision::N
     */
    record.semanticKey =
      String(
        rawRecord
          .semanticKey ||
        rawRecord
          .suggestionId ||
        ""
      )
        .trim();


    // ==================================================
    // field-update
    // ==================================================

    if (
      record.kind ===
      "field-update"
    ) {
      let payload =
        record.payload ||
        {};


      let entity =
        entityMap.get(
          String(
            payload
              .targetEntityId ||
            ""
          )
        );


      // ------------------------------------------------
      // Fallback:
      // Resolve the target Entity by name when the
      // analyzer did not provide a usable Entity ID.
      // ------------------------------------------------

      if (
        !entity &&
        payload.targetEntityName
      ) {
        entity =
          findExistingEntityByName(
            entities,
            payload.targetEntityName
          );
      }


      // ------------------------------------------------
      // Canonicalize Resolved Entity
      //
      // Important:
      // Update BOTH:
      //
      // - local payload
      // - record.payload
      //
      // so all logic below reads the corrected Entity ID
      // and canonical Entity name.
      // ------------------------------------------------

      if (
        entity
      ) {
        payload = {
          ...payload,

          targetEntityId:
            String(
              entity._id
            ),

          targetEntityName:
            entity.name,
        };


        record.payload =
          payload;
      }


      if (
        entity
      ) {
        const currentValue =
          getEntityStoredValue(
            entity,

            payload.fieldKey
          );


        /*
        * Canon already matches the story.
        *
        * Example:
        *
        * story = age 24
        * Canon = age 24
        *
        * There is nothing to ask the user.
        */
        if (
          valuesEqual(
            currentValue,
            payload.value
          )
        ) {
          satisfied.push({
            record,

            reason:
              "field-already-matches-canonical",
          });


          continue;
        }


        record.baseline = {
          type:
            "field-value",

          entityId:
            String(
              entity._id
            ),

          fieldKey:
            payload.fieldKey,

          currentValue:
            canonicalizeValue(
              currentValue
            ),

          suggestedValue:
            canonicalizeValue(
              payload.value
            ),

          entityUpdatedAt:
            entity.updatedAt
              ? new Date(
                  entity.updatedAt
                ).toISOString()
              : null,
        };
      } else {
        record.baseline = {
          type:
            "field-target-missing",

          entityId:
            payload
              .targetEntityId
              ? String(
                  payload
                    .targetEntityId
                )
              : null,

          fieldKey:
            payload.fieldKey ??
            null,
        };
      }


      activeRecords.push(
        record
      );


      continue;
    }

    // ==================================================
    // relation-update
    // ==================================================

    if (
      record.kind ===
      "relation-update"
    ) {
      let payload =
        record.payload ||
        {};


      const relationType =
        normalizeRelationType(
          payload
            .relationConcept ||
          payload
            .relationType ||
          record
            .relationConcept ||
          record
            .relationType
        );


      const existingRelation =
        relations.find(
          (relation) =>
            String(
              relation
                .subjectEntityId
            ) ===
              String(
                payload
                  .subjectEntityId
              ) &&
            String(
              relation
                .objectEntityId
            ) ===
              String(
                payload
                  .objectEntityId
              ) &&
            String(
              relation
                .relationType
            ) ===
              relationType
        );


      if (
        existingRelation
      ) {
        satisfied.push({
          record,

          reason:
            "relation-already-exists",
        });


        continue;
      }


      record.baseline = {
        type:
          "relation-presence",

        exists:
          false,

        subjectEntityId:
          payload
            .subjectEntityId
            ? String(
                payload
                  .subjectEntityId
              )
            : null,

        objectEntityId:
          payload
            .objectEntityId
            ? String(
                payload
                  .objectEntityId
              )
            : null,

        relationType,
      };


      activeRecords.push(
        record
      );


      continue;
    }


    // ==================================================
    // create-schema-field
    // ==================================================

    if (
      record.kind ===
      "create-schema-field"
    ) {
      let payload =
        record.payload ||
        {};


      const entityType =
        entityTypeMap.get(
          String(
            payload
              .targetEntityTypeId ||
            ""
          )
        );


      if (
        entityType
      ) {
        const fields =
          Array.isArray(
            entityType.fields
          )
            ? entityType.fields
            : [];


        const requestedLabel =
          String(
            payload
              .suggestedLabel ||
            ""
          )
            .trim()
            .toLowerCase();


        const existingField =
          fields.find(
            (field) => {
              if (
                payload
                  .fieldConcept &&
                field
                  .canonicalConcept ===
                  payload
                    .fieldConcept
              ) {
                return true;
              }


              if (
                requestedLabel &&
                String(
                  field.label ||
                  ""
                )
                  .trim()
                  .toLowerCase() ===
                  requestedLabel
              ) {
                return true;
              }


              return false;
            }
          );


        if (
          existingField
        ) {
          satisfied.push({
            record,

            reason:
              "schema-field-already-exists",
          });


          continue;
        }
      }


      record.baseline = {
        type:
          "schema-field-missing",

        entityTypeId:
          payload
            .targetEntityTypeId
            ? String(
                payload
                  .targetEntityTypeId
              )
            : null,

        fieldConcept:
          payload
            .fieldConcept ??
          null,

        suggestedLabel:
          payload
            .suggestedLabel ??
          null,
      };


      activeRecords.push(
        record
      );


      continue;
    }


    // ==================================================
    // create-select-option
    // ==================================================

    if (
      record.kind ===
      "create-select-option"
    ) {
      let payload =
        record.payload ||
        {};


      const entityType =
        entityTypeMap.get(
          String(
            payload
              .targetEntityTypeId ||
            ""
          )
        );


      const field =
        entityType
          ?.fields
          ?.find(
            (item) =>
              item.key ===
              payload.fieldKey
          );


      const options =
        Array.isArray(
          field?.options
        )
          ? field.options
          : [];


      const requestedValue =
        String(
          payload.value ??
          ""
        )
          .trim();


      const alreadyExists =
        options.some(
          (option) =>
            String(
              option
            )
              .trim()
              .toLowerCase() ===
            requestedValue
              .toLowerCase()
        );


      if (
        alreadyExists
      ) {
        satisfied.push({
          record,

          reason:
            "select-option-already-exists",
        });


        continue;
      }


      record.baseline = {
        type:
          "select-option-missing",

        entityTypeId:
          payload
            .targetEntityTypeId
            ? String(
                payload
                  .targetEntityTypeId
              )
            : null,

        fieldKey:
          payload.fieldKey ??
          null,

        value:
          payload.value ??
          null,
      };


      activeRecords.push(
        record
      );


      continue;
    }


    // ==================================================
    // create-entity
    //
    // L3 normally suppresses this when an Entity already
    // resolves successfully.
    //
    // We still attach baseline information here.
    // ==================================================

    if (
      record.kind ===
      "create-entity"
    ) {
      let payload =
        record.payload ||
        {};


      const existingEntity =
        findExistingEntityByName(
          entities,
          payload.name
        );


      /*
      * L3 may occasionally extract:
      *
      * "艾琳今年23岁"
      *
      * as:
      *
      * name = "艾琳今年"
      *
      * Before creating another Entity, always compare against
      * the current Canon.
      */
      if (
        existingEntity
      ) {
        record.payload = {
          ...payload,

          name:
            existingEntity.name,

          existingEntityId:
            String(
              existingEntity._id
            ),
        };


        satisfied.push({
          record,

          reason:
            "entity-already-exists",
        });


        continue;
      }


      record.baseline = {
        type:
          "entity-missing",

        name:
          payload.name ??
          null,

        likelyTypeConcept:
          payload
            .likelyTypeConcept ??
          null,
      };


      activeRecords.push(
        record
      );


      continue;
    }


    // ==================================================
    // event-history
    // ==================================================

    if (
      record.kind ===
      "event-history"
    ) {
      record.baseline = {
        type:
          "timeline-not-yet-persisted",
      };


      activeRecords.push(
        record
      );


      continue;
    }


    // ==================================================
    // Fallback
    // ==================================================

    record.baseline =
      record.baseline ??
      {
        type:
          "analysis-only",
      };


    activeRecords.push(
      record
    );
  }


  return {
    records:
      activeRecords,

    satisfied,
  };
}



// ======================================================
// Candidate DTO
// ======================================================

function candidateToDto(
  candidate
) {
  if (
    !candidate
  ) {
    return null;
  }


  const source =
    candidate.source ||
    {};


  return {
    id:
      String(
        candidate._id
      ),

    suggestionId:
      candidate
        .suggestionId,

    semanticKey:
      candidate
        .semanticKey ??
      null,

    revisionKey:
      candidate
        .revisionKey ??
      null,

    revisionNumber:
      candidate
        .revisionNumber ??
      1,

    baseline:
      candidate
        .baseline ??
      null,

    kind:
      candidate.kind,

    status:
      candidate.status,

    confidence:
      candidate.confidence,

    payload:
      candidate.payload,

    originalPayload:
      candidate
        .originalPayload ??
      null,

    editedByUser:
      candidate
        .editedByUser ===
      true,

    editedAt:
      candidate
        .editedAt ??
      null,

    editHistory:
      candidate
        .editHistory ??
      [],

    source: {
      documentVersion:
        source
          .documentVersion ??
        null,

      textRange:
        source
          .textRange ??
        null,

      originalText:
        source
          .originalText ??
        null,

      subjectHint:
        source
          .subjectHint ??
        null,

      objectHint:
        source
          .objectHint ??
        null,

      fieldConcept:
        source
          .fieldConcept ??
        null,

      eventConcept:
        source
          .eventConcept ??
        null,

      relationConcept:
        source
          .relationConcept ??
        null,

      candidateType:
        source
          .candidateType ??
        null,
    },

    warnings:
      candidate.warnings ||
      [],

    acceptedAt:
      candidate
        .acceptedAt ??
      null,

    ignoredAt:
      candidate
        .ignoredAt ??
      null,

    supersededAt:
      candidate
        .supersededAt ??
      null,

    appliedResult:
      candidate
        .appliedResult ??
      null,

    createdAt:
      candidate
        .createdAt ??
      null,

    updatedAt:
      candidate
        .updatedAt ??
      null,
  };
}



// ======================================================
// Entity Resolution for User Edits
// ======================================================

async function loadEntityInWorldById({
  entityId,

  worldId,
}) {
  if (
    !entityId
  ) {
    throw new StorySuggestionEditError(
      "Entity ID is required.",
      {
        code:
          "ENTITY_ID_REQUIRED",
      }
    );
  }


  let entity =
    null;


  try {
    entity =
      await Entity.findOne({
        _id:
          entityId,

        worldId,
      });
  } catch {
    throw new StorySuggestionEditError(
      "Invalid Entity ID.",
      {
        code:
          "INVALID_ENTITY_ID",
      }
    );
  }


  if (
    !entity
  ) {
    throw new StorySuggestionEditError(
      "Entity not found in this world.",
      {
        code:
          "ENTITY_NOT_FOUND",

        statusCode:
          404,
      }
    );
  }


  return entity;
}


async function resolveEntityByExactName({
  name,

  worldId,
}) {
  const normalized =
    String(
      name || ""
    )
      .trim();


  if (
    !normalized
  ) {
    throw new StorySuggestionEditError(
      "Entity name cannot be empty.",
      {
        code:
          "ENTITY_NAME_REQUIRED",
      }
    );
  }


  const matches =
    await Entity.find({
      worldId,

      name: {
        $regex:
          `^${escapeRegExp(
            normalized
          )}$`,

        $options:
          "i",
      },
    });


  if (
    matches.length ===
    0
  ) {
    throw new StorySuggestionEditError(
      `No existing entity named "${normalized}" was found.`,
      {
        code:
          "ENTITY_NAME_NOT_FOUND",

        statusCode:
          422,

        details: {
          name:
            normalized,
        },
      }
    );
  }


  if (
    matches.length >
    1
  ) {
    throw new StorySuggestionEditError(
      `More than one entity is named "${normalized}".`,
      {
        code:
          "ENTITY_NAME_AMBIGUOUS",

        statusCode:
          409,

        details: {
          name:
            normalized,

          matches:
            matches.map(
              (entity) => ({
                id:
                  String(
                    entity._id
                  ),

                name:
                  entity.name,

                entityTypeId:
                  String(
                    entity.entityTypeId
                  ),
              })
            ),
        },
      }
    );
  }


  return matches[0];
}


// ======================================================
// Editable Payload Fields
// ======================================================

const EDITABLE_PAYLOAD_FIELDS = {
  "field-update":
    new Set([
      "value",
    ]),

  "relation-update":
    new Set([
      "subjectEntityId",
      "subjectName",
      "relationConcept",
      "objectEntityId",
      "objectName",
    ]),

  "event-history":
    new Set([
      "subjectEntityId",
      "subjectName",
      "eventConcept",
      "objectEntityId",
      "objectName",
    ]),

  "create-entity":
    new Set([
      "name",

      "entityTypeId",

      "likelyTypeConcept",

      "recommendedTypeName",

      "recommendedTypeIcon",

      "recommendedFields",
    ]),

  "create-schema-field":
    new Set([
      "suggestedLabel",
      "suggestedValueType",
    ]),

  "create-select-option":
    new Set([
      "value",
    ]),
};


function assertEditablePatch(
  candidate,
  payloadPatch
) {
  if (
    candidate.status !==
    "pending"
  ) {
    throw new StorySuggestionEditError(
      `Candidate cannot be edited while status is "${candidate.status}".`,
      {
        code:
          "CANDIDATE_NOT_EDITABLE",

        statusCode:
          409,
      }
    );
  }


  if (
    !payloadPatch ||
    typeof payloadPatch !==
      "object" ||
    Array.isArray(
      payloadPatch
    )
  ) {
    throw new StorySuggestionEditError(
      "payload must be an object.",
      {
        code:
          "INVALID_EDIT_PAYLOAD",
      }
    );
  }


  const allowed =
    EDITABLE_PAYLOAD_FIELDS[
      candidate.kind
    ];


  if (
    !allowed
  ) {
    throw new StorySuggestionEditError(
      `Suggestion kind "${candidate.kind}" is not editable.`,
      {
        code:
          "SUGGESTION_KIND_NOT_EDITABLE",
      }
    );
  }


  const invalidFields =
    Object.keys(
      payloadPatch
    )
      .filter(
        (key) =>
          !allowed.has(
            key
          )
      );


  if (
    invalidFields.length >
    0
  ) {
    throw new StorySuggestionEditError(
      "One or more payload fields cannot be edited.",
      {
        code:
          "EDIT_FIELD_NOT_ALLOWED",

        details: {
          invalidFields,
        },
      }
    );
  }
}

// ======================================================
// Cascade Draft Entity Rename
// ======================================================

async function cascadeDraftEntityRename({
  candidate,
  oldName,
  newName,
}) {
  if (
    !candidate ||
    candidate.kind !==
      "create-entity"
  ) {
    return [];
  }


  const normalizedOldName =
    String(
      oldName ||
      ""
    )
      .trim();


  const normalizedNewName =
    String(
      newName ||
      ""
    )
      .trim();


  if (
    !normalizedOldName ||
    !normalizedNewName ||
    normalizedOldName ===
      normalizedNewName
  ) {
    return [];
  }


  const draftEntityKey =
    String(
      candidate
        ?.payload
        ?.draftEntityKey ||
      candidate
        ?.source
        ?.draftEntityKey ||
      ""
    )
      .trim();


  /*
   * Only operate inside the same analysis document/world.
   *
   * Do not accidentally rename suggestions from another
   * Smart Import run.
   */
  const siblingCandidates =
    await StorySyncCandidate.find({
      _id: {
        $ne:
          candidate._id,
      },

      worldId:
        candidate.worldId,

      documentId:
        candidate.documentId,

      status:
        "pending",
    });


  const changedCandidates =
    [];


  for (
    const sibling of
    siblingCandidates
  ) {
    const payload = {
      ...(
        sibling.payload ||
        {}
      ),
    };


    let changed =
      false;


    // ==================================================
    // Field Update
    // ==================================================

    if (
      sibling.kind ===
      "field-update"
    ) {
      const sameDraft =
        Boolean(
          draftEntityKey &&
          String(
            payload
              .targetDraftEntityKey ||
            sibling
              ?.source
              ?.subjectDraftEntityKey ||
            ""
          )
            .trim() ===
            draftEntityKey
        );


      const sameLegacyName =
        !draftEntityKey &&
        String(
          payload
            .targetEntityName ||
          ""
        )
          .trim() ===
          normalizedOldName;


      if (
        sameDraft ||
        sameLegacyName
      ) {
        payload.targetEntityName =
          normalizedNewName;

        changed =
          true;
      }
    }


    // ==================================================
    // Relation Update
    // ==================================================

    if (
      sibling.kind ===
      "relation-update"
    ) {
      const subjectUsesDraft =
        Boolean(
          draftEntityKey &&
          String(
            payload
              .subjectDraftEntityKey ||
            sibling
              ?.source
              ?.subjectDraftEntityKey ||
            ""
          )
            .trim() ===
            draftEntityKey
        );


      const objectUsesDraft =
        Boolean(
          draftEntityKey &&
          String(
            payload
              .objectDraftEntityKey ||
            sibling
              ?.source
              ?.objectDraftEntityKey ||
            ""
          )
            .trim() ===
            draftEntityKey
        );


      const subjectLegacyMatch =
        !draftEntityKey &&
        String(
          payload
            .subjectName ||
          ""
        )
          .trim() ===
          normalizedOldName;


      const objectLegacyMatch =
        !draftEntityKey &&
        String(
          payload
            .objectName ||
          ""
        )
          .trim() ===
          normalizedOldName;


      if (
        subjectUsesDraft ||
        subjectLegacyMatch
      ) {
        payload.subjectName =
          normalizedNewName;

        changed =
          true;
      }


      if (
        objectUsesDraft ||
        objectLegacyMatch
      ) {
        payload.objectName =
          normalizedNewName;

        changed =
          true;
      }
    }


    // ==================================================
    // Historical Event
    // ==================================================

    if (
      sibling.kind ===
      "event-history"
    ) {
      const subjectUsesDraft =
        Boolean(
          draftEntityKey &&
          String(
            payload
              .subjectDraftEntityKey ||
            sibling
              ?.source
              ?.subjectDraftEntityKey ||
            ""
          )
            .trim() ===
            draftEntityKey
        );


      const objectUsesDraft =
        Boolean(
          draftEntityKey &&
          String(
            payload
              .objectDraftEntityKey ||
            sibling
              ?.source
              ?.objectDraftEntityKey ||
            ""
          )
            .trim() ===
            draftEntityKey
        );


      const subjectLegacyMatch =
        !draftEntityKey &&
        String(
          payload
            .subjectName ||
          ""
        )
          .trim() ===
          normalizedOldName;


      const objectLegacyMatch =
        !draftEntityKey &&
        String(
          payload
            .objectName ||
          ""
        )
          .trim() ===
          normalizedOldName;


      if (
        subjectUsesDraft ||
        subjectLegacyMatch
      ) {
        payload.subjectName =
          normalizedNewName;

        changed =
          true;
      }


      if (
        objectUsesDraft ||
        objectLegacyMatch
      ) {
        payload.objectName =
          normalizedNewName;

        changed =
          true;
      }
    }


    if (
      !changed
    ) {
      continue;
    }


    /*
     * This rename is the consequence of one explicit user
     * correction.
     *
     * Keep it in edit history as well, rather than silently
     * mutating sibling payloads.
     */
    sibling.recordUserEdit(
      payload
    );


    await sibling.save();


    changedCandidates.push(
      sibling
    );
  }


  return changedCandidates;
}

// ======================================================
// Build Edited Payload
// ======================================================

async function buildEditedPayload({
  candidate,

  payloadPatch,
}) {
  assertEditablePatch(
    candidate,

    payloadPatch
  );


  const currentPayload =
    clonePlain(
      candidate.payload ||
      {}
    );


  const nextPayload = {
    ...currentPayload,

    ...clonePlain(
      payloadPatch
    ),
  };

  const ALLOWED_RECOMMENDED_FIELD_TYPES =
  new Set([
    "text",
    "long-text",
    "number",
    "boolean",
    "date",
    "select",
    "entity-reference",
  ]);


  async function normalizeRecommendedFieldsForEdit({
    fields,

    worldId,
  }) {
    if (
      !Array.isArray(
        fields
      )
    ) {
      throw new StorySuggestionEditError(
        "recommendedFields must be an array.",
        {
          code:
            "INVALID_RECOMMENDED_FIELDS",
        }
      );
    }


    if (
      fields.length >
      50
    ) {
      throw new StorySuggestionEditError(
        "Too many recommended fields.",
        {
          code:
            "TOO_MANY_RECOMMENDED_FIELDS",
        }
      );
    }


    const result =
      [];


    const seenConcepts =
      new Set();


    const seenLabels =
      new Set();


    for (
      const rawField of
      fields
    ) {
      if (
        !rawField ||
        typeof rawField !==
          "object" ||
        Array.isArray(
          rawField
        )
      ) {
        throw new StorySuggestionEditError(
          "Each recommended field must be an object.",
          {
            code:
              "INVALID_RECOMMENDED_FIELD",
          }
        );
      }


      const fieldConcept =
        String(
          rawField
            .fieldConcept ||
          ""
        )
          .trim();


      if (
        fieldConcept &&
        !fieldConcept.startsWith(
          "field."
        )
      ) {
        throw new StorySuggestionEditError(
          "Recommended field concept must start with field.",
          {
            code:
              "INVALID_FIELD_CONCEPT",
          }
        );
      }


      const label =
        String(
          rawField.label ||
          ""
        )
          .trim();


      if (
        !fieldConcept &&
        !label
      ) {
        throw new StorySuggestionEditError(
          "A recommended field requires a label or field concept.",
          {
            code:
              "RECOMMENDED_FIELD_NAME_REQUIRED",
          }
        );
      }


      const type =
        String(
          rawField.type ||
          "text"
        )
          .trim();


      if (
        !ALLOWED_RECOMMENDED_FIELD_TYPES
          .has(
            type
          )
      ) {
        throw new StorySuggestionEditError(
          `Unsupported recommended field type: ${type}`,
          {
            code:
              "UNSUPPORTED_RECOMMENDED_FIELD_TYPE",
          }
        );
      }


      const normalizedLabel =
        label
          .toLowerCase();


      if (
        fieldConcept &&
        seenConcepts.has(
          fieldConcept
        )
      ) {
        continue;
      }


      if (
        normalizedLabel &&
        seenLabels.has(
          normalizedLabel
        )
      ) {
        continue;
      }


      if (
        fieldConcept
      ) {
        seenConcepts.add(
          fieldConcept
        );
      }


      if (
        normalizedLabel
      ) {
        seenLabels.add(
          normalizedLabel
        );
      }


      let options =
        [];


      if (
        type ===
        "select"
      ) {
        options =
          Array.isArray(
            rawField.options
          )
            ? [
                ...new Set(
                  rawField.options
                    .map(
                      (option) =>
                        String(
                          option || ""
                        )
                          .trim()
                    )
                    .filter(
                      Boolean
                    )
                ),
              ]
            : [];
      }


      let referenceEntityTypeId =
        null;


      if (
        type ===
          "entity-reference" &&
        rawField
          .referenceEntityTypeId
      ) {
        const referenceType =
          await EntityType.findOne({
            _id:
              rawField
                .referenceEntityTypeId,

            worldId,
          });


        if (
          !referenceType
        ) {
          throw new StorySuggestionEditError(
            "Referenced Entity Type does not exist in this world.",
            {
              code:
                "REFERENCE_ENTITY_TYPE_NOT_FOUND",

              statusCode:
                404,
            }
          );
        }


        referenceEntityTypeId =
          String(
            referenceType._id
          );
      }


      result.push({
        fieldConcept:
          fieldConcept ||
          null,

        label:
          label ||
          null,

        type,

        required:
          rawField.required ===
          true,

        options,

        referenceEntityTypeId,
      });
    }


    return result;
  }

  // ==================================================
  // field-update
  // ==================================================

  if (
    candidate.kind ===
    "field-update"
  ) {
    if (
      !Object.prototype
        .hasOwnProperty
        .call(
          payloadPatch,
          "value"
        )
    ) {
      return nextPayload;
    }


    const entity =
      await loadEntityInWorldById({
        entityId:
          currentPayload
            .targetEntityId,

        worldId:
          candidate.worldId,
      });


    const entityType =
      await EntityType.findOne({
        _id:
          entity.entityTypeId,

        worldId:
          candidate.worldId,
      });


    if (
      !entityType
    ) {
      throw new StorySuggestionEditError(
        "Target Entity Type no longer exists.",
        {
          code:
            "ENTITY_TYPE_NOT_FOUND",

          statusCode:
            404,
        }
      );
    }


    const field =
      entityType
        .fields
        .find(
          (item) =>
            item.key ===
            currentPayload
              .fieldKey
        );


    if (
      !field
    ) {
      throw new StorySuggestionEditError(
        "Target field no longer exists.",
        {
          code:
            "FIELD_NOT_FOUND",

          statusCode:
            404,
        }
      );
    }


    /*
     * Reuse the exact Apply Engine validator.
     */
    nextPayload.value =
      await validateFieldValue({
        field,

        value:
          payloadPatch.value,

        worldId:
          candidate.worldId,

        session:
          null,
      });


    return nextPayload;
  }


  // ==================================================
  // relation-update / event-history
  // ==================================================

  if (
    candidate.kind ===
      "relation-update" ||
    candidate.kind ===
      "event-history"
  ) {
    const subjectIdWasPatched =
      Object.prototype
        .hasOwnProperty
        .call(
          payloadPatch,
          "subjectEntityId"
        );


    const subjectNameWasPatched =
      Object.prototype
        .hasOwnProperty
        .call(
          payloadPatch,
          "subjectName"
        );


    if (
      subjectIdWasPatched
    ) {
      const subject =
        await loadEntityInWorldById({
          entityId:
            payloadPatch
              .subjectEntityId,

          worldId:
            candidate.worldId,
        });


      nextPayload.subjectEntityId =
        String(
          subject._id
        );

      nextPayload.subjectName =
        subject.name;
    } else if (
      subjectNameWasPatched
    ) {
      const subject =
        await resolveEntityByExactName({
          name:
            payloadPatch
              .subjectName,

          worldId:
            candidate.worldId,
        });


      nextPayload.subjectEntityId =
        String(
          subject._id
        );

      nextPayload.subjectName =
        subject.name;
    }


    const objectIdWasPatched =
      Object.prototype
        .hasOwnProperty
        .call(
          payloadPatch,
          "objectEntityId"
        );


    const objectNameWasPatched =
      Object.prototype
        .hasOwnProperty
        .call(
          payloadPatch,
          "objectName"
        );


    if (
      objectIdWasPatched
    ) {
      if (
        payloadPatch
          .objectEntityId ===
          null ||
        payloadPatch
          .objectEntityId ===
          ""
      ) {
        nextPayload.objectEntityId =
          null;

        nextPayload.objectName =
          null;
      } else {
        const object =
          await loadEntityInWorldById({
            entityId:
              payloadPatch
                .objectEntityId,

            worldId:
              candidate.worldId,
          });


        nextPayload.objectEntityId =
          String(
            object._id
          );

        nextPayload.objectName =
          object.name;
      }
    } else if (
      objectNameWasPatched
    ) {
      const objectName =
        String(
          payloadPatch
            .objectName ||
          ""
        )
          .trim();


      if (
        !objectName
      ) {
        nextPayload.objectEntityId =
          null;

        nextPayload.objectName =
          null;
      } else {
        const object =
          await resolveEntityByExactName({
            name:
              objectName,

            worldId:
              candidate.worldId,
          });


        nextPayload.objectEntityId =
          String(
            object._id
          );

        nextPayload.objectName =
          object.name;
      }
    }


    if (
      candidate.kind ===
        "relation-update" &&
      Object.prototype
        .hasOwnProperty
        .call(
          payloadPatch,
          "relationConcept"
        )
    ) {
      const relationConcept =
        normalizeRelationConcept(
          payloadPatch
            .relationConcept
        );


      if (
        !relationConcept
      ) {
        throw new StorySuggestionEditError(
          "Relation concept cannot be empty.",
          {
            code:
              "RELATION_CONCEPT_REQUIRED",
          }
        );
      }


      nextPayload.relationConcept =
        relationConcept;
    }


    if (
      candidate.kind ===
        "event-history" &&
      Object.prototype
        .hasOwnProperty
        .call(
          payloadPatch,
          "eventConcept"
        )
    ) {
      const eventConcept =
        normalizeEventConcept(
          payloadPatch
            .eventConcept
        );


      if (
        !eventConcept
      ) {
        throw new StorySuggestionEditError(
          "Event concept cannot be empty.",
          {
            code:
              "EVENT_CONCEPT_REQUIRED",
          }
        );
      }


      nextPayload.eventConcept =
        eventConcept;
    }


    return nextPayload;
  }


  // ==================================================
  // create-entity
  // ==================================================

  if (
    candidate.kind ===
    "create-entity"
  ) {
    // ------------------------------------------------
    // Entity Name
    // ------------------------------------------------

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          payloadPatch,
          "name"
        )
    ) {
      const name =
        String(
          payloadPatch.name ||
          ""
        )
          .trim();


      if (
        !name
      ) {
        throw new StorySuggestionEditError(
          "Entity name cannot be empty.",
          {
            code:
              "ENTITY_NAME_REQUIRED",
          }
        );
      }


      nextPayload.name =
        name;
    }


    // ------------------------------------------------
    // Existing EntityType Selection
    //
    // Empty string means:
    // go back to recommended EntityType mode.
    // ------------------------------------------------

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          payloadPatch,
          "entityTypeId"
        )
    ) {
      const requestedEntityTypeId =
        String(
          payloadPatch
            .entityTypeId ||
          ""
        )
          .trim();


      if (
        !requestedEntityTypeId
      ) {
        nextPayload.entityTypeId =
          null;
      } else {
        const entityType =
          await EntityType.findOne({
            _id:
              requestedEntityTypeId,

            worldId:
              candidate.worldId,
          });


        if (
          !entityType
        ) {
          throw new StorySuggestionEditError(
            "Selected Entity Type does not exist in this world.",
            {
              code:
                "ENTITY_TYPE_NOT_FOUND",

              statusCode:
                404,
            }
          );
        }


        nextPayload.entityTypeId =
          String(
            entityType._id
          );
      }
    }


    // ------------------------------------------------
    // Recommended Semantic Type
    // ------------------------------------------------

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          payloadPatch,
          "likelyTypeConcept"
        )
    ) {
      const concept =
        String(
          payloadPatch
            .likelyTypeConcept ||
          ""
        )
          .trim();


      if (
        concept &&
        !concept.startsWith(
          "entityType."
        )
      ) {
        throw new StorySuggestionEditError(
          "Recommended Entity Type concept must start with entityType.",
          {
            code:
              "INVALID_ENTITY_TYPE_CONCEPT",
          }
        );
      }


      nextPayload.likelyTypeConcept =
        concept ||
        null;


      /*
      * Changing semantic recommendation means any previous
      * concrete recommended EntityType is no longer trusted.
      *
      * Existing manually selected type remains controlled
      * through entityTypeId in the same edit request.
      */
      if (
        !Object.prototype
          .hasOwnProperty
          .call(
            payloadPatch,
            "entityTypeId"
          )
      ) {
        nextPayload.entityTypeId =
          null;
      }
    }


    // ------------------------------------------------
    // Recommended Display Name
    //
    // This is free text by design.
    // ------------------------------------------------

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          payloadPatch,
          "recommendedTypeName"
        )
    ) {
      const recommendedTypeName =
        String(
          payloadPatch
            .recommendedTypeName ||
          ""
        )
          .trim();


      nextPayload.recommendedTypeName =
        recommendedTypeName ||
        null;
    }


    // ------------------------------------------------
    // Recommended Icon
    //
    // Free text allows emoji and short symbols.
    // ------------------------------------------------

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          payloadPatch,
          "recommendedTypeIcon"
        )
    ) {
      const recommendedTypeIcon =
        String(
          payloadPatch
            .recommendedTypeIcon ||
          ""
        )
          .trim();


      /*
      * Prevent accidentally storing a paragraph as an icon.
      */
      if (
        recommendedTypeIcon.length >
        32
      ) {
        throw new StorySuggestionEditError(
          "Recommended Entity Type icon is too long.",
          {
            code:
              "ENTITY_TYPE_ICON_TOO_LONG",
          }
        );
      }


      nextPayload.recommendedTypeIcon =
        recommendedTypeIcon ||
        null;
    }

    // ------------------------------------------------
    // Recommended Fields
    // ------------------------------------------------

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          payloadPatch,
          "recommendedFields"
        )
    ) {
      nextPayload.recommendedFields =
        await normalizeRecommendedFieldsForEdit({
          fields:
            payloadPatch
              .recommendedFields,

          worldId:
            candidate.worldId,
        });
    }

    return nextPayload;
  }


  // ==================================================
  // create-schema-field
  // ==================================================

  if (
    candidate.kind ===
    "create-schema-field"
  ) {
    if (
      Object.prototype
        .hasOwnProperty
        .call(
          payloadPatch,
          "suggestedLabel"
        )
    ) {
      const label =
        String(
          payloadPatch
            .suggestedLabel ||
          ""
        )
          .trim();


      if (
        !label
      ) {
        throw new StorySuggestionEditError(
          "Field label cannot be empty.",
          {
            code:
              "FIELD_LABEL_REQUIRED",
          }
        );
      }


      nextPayload.suggestedLabel =
        label;
    }


    if (
      Object.prototype
        .hasOwnProperty
        .call(
          payloadPatch,
          "suggestedValueType"
        )
    ) {
      const fieldType =
        String(
          payloadPatch
            .suggestedValueType ||
          ""
        )
          .trim()
          .toLowerCase();


      const allowedTypes =
        new Set([
          "text",
          "long-text",
          "number",
          "boolean",
          "date",
          "select",
          "entity-reference",
        ]);


      if (
        !allowedTypes.has(
          fieldType
        )
      ) {
        throw new StorySuggestionEditError(
          "Invalid field type.",
          {
            code:
              "INVALID_FIELD_TYPE",

            details: {
              fieldType,
            },
          }
        );
      }


      nextPayload.suggestedValueType =
        fieldType;
    }


    return nextPayload;
  }


  // ==================================================
  // create-select-option
  // ==================================================

  if (
    candidate.kind ===
    "create-select-option"
  ) {
    if (
      Object.prototype
        .hasOwnProperty
        .call(
          payloadPatch,
          "value"
        )
    ) {
      const value =
        String(
          payloadPatch.value ??
          ""
        )
          .trim();


      if (
        !value
      ) {
        throw new StorySuggestionEditError(
          "Select option cannot be empty.",
          {
            code:
              "SELECT_OPTION_REQUIRED",
          }
        );
      }


      nextPayload.value =
        value;
    }


    return nextPayload;
  }


  return nextPayload;
}




// ======================================================
// Analyze Text
//
// POST /api/smart-import/world/:worldId/analyze
//
// Body:
// {
//   text: "...",
//   locale: "auto" | "zh-CN" | "en",
//   forceLocale: false,
//   enabledPacks: ["furry", "sciFi"],
//   nsfwEnabled: false
// }
// ======================================================

router.post(
  "/world/:worldId/analyze",

  async (
    req,
    res
  ) => {
    try {
      const world =
        await findOwnedWorld(
          req.params.worldId,
          req.user._id
        );

      if (
        !world
      ) {
        return res
          .status(404)
          .json({
            message:
              "World not found.",

            code:
              "WORLD_NOT_FOUND",
          });
      }

      const text =
        String(
          req.body?.text ||
          ""
        )
          .trim();

      if (
        !text
      ) {
        return res
          .status(400)
          .json({
            message:
              "Import text is required.",

            code:
              "SMART_IMPORT_TEXT_REQUIRED",
          });
      }

      if (
        text.length >
        50000
      ) {
        return res
          .status(413)
          .json({
            message:
              "Import text is too long.",

            code:
              "SMART_IMPORT_TEXT_TOO_LONG",

            maxLength:
              50000,
          });
      }

      const requestedLocale =
        req.body?.locale ||
        "auto";

      const forceLocale =
        Boolean(
          req.body
            ?.forceLocale
        );

      const locale =
        resolveAnalysisLocale({
          text,

          requestedLocale,

          forceLocale,
        });

      const enabledPacks =
        normalizeEnabledPacks(
          req.body
            ?.enabledPacks
        );

      const nsfwEnabled =
        Boolean(
          req.body
            ?.nsfwEnabled
        );

      const scratchDocument =
        await getOrCreateScratchDocument(
          world
        );

      /*
       * Smart Import is deliberately session-like.
       *
       * A fresh analysis replaces the previous pending
       * import session instead of carrying ignored/edit
       * history forever.
       *
       * Canonical changes already applied remain in the
       * World and are filtered below.
       */
      await StorySyncCandidate.deleteMany({
        documentId:
          scratchDocument._id,
      });

      scratchDocument.plainText =
        text;

      scratchDocument.contentVersion =
        Number(
          scratchDocument
            .contentVersion ??
          0
        ) +
        1;

      scratchDocument.syncedVersion =
        0;

      scratchDocument.lastSyncedAt =
        null;

      scratchDocument.settings = {
        ...(
          scratchDocument
            .settings ||
          {}
        ),

        smartImportScratch:
          true,
      };

      scratchDocument.markModified(
        "settings"
      );

      await scratchDocument.save();

      const [
        entities,
        entityTypes,
        relations,
      ] =
        await Promise.all([
          Entity
            .find({
              worldId:
                world._id,
            })
            .lean(),

          EntityType
            .find({
              worldId:
                world._id,
            })
            .lean(),

          Relation
            .find({
              worldId:
                world._id,
            })
            .lean(),
        ]);

      const entityTypeConceptMap =
        buildEntityTypeConceptMap(
          entityTypes
        );

      const analysis =
        await Promise.resolve(
          runUnifiedStoryAnalysis({
            text,

            locale,

            entities,

            entityTypes,

            entityTypeConceptMap,

            enabledPacks,

            nsfwEnabled,
          })
        );

      const suggestions =
        extractSuggestions(
          analysis
        );

      const mapped =
        mapSuggestionsToStorySyncCandidates({
          suggestions,

          worldId:
            world._id,

          documentId:
            scratchDocument._id,

          documentVersion:
            scratchDocument
              .contentVersion,

          originalText:
            text,
        });

      const enriched =
        enrichRecordsWithCanonicalState({
          records:
            mapped.records,

          entities,

          entityTypes,

          relations,
        });

      const persistence =
        await persistStorySyncCandidates({
          worldId:
            world._id,

          documentId:
            scratchDocument._id,

          documentVersion:
            scratchDocument
              .contentVersion,

          records:
            enriched.records,
        });

      scratchDocument.syncedVersion =
        scratchDocument
          .contentVersion;

      scratchDocument.lastAnalyzedCanonVersion =
        Number(
          world.canonVersion ??
          0
        );

      scratchDocument.lastSyncedAt =
        new Date();

      await scratchDocument.save();

      const candidates =
        await StorySyncCandidate
          .find({
            documentId:
              scratchDocument._id,

            status:
              "pending",
          })
          .sort({
            confidence:
              -1,

            createdAt:
              1,
          });

      return res.json({
        worldId:
          String(
            world._id
          ),

        session: {
          documentId:
            String(
              scratchDocument._id
            ),

          contentVersion:
            scratchDocument
              .contentVersion,

          analyzedAt:
            scratchDocument
              .lastSyncedAt,

          locale,
        },

        analysis: {
          suggestionCount:
            suggestions.length,

          activeSuggestionCount:
            enriched
              .records
              .length,

          canonicalSatisfiedCount:
            enriched
              .satisfied
              .length,

          skippedCount:
            mapped
              .skipped
              .length,
        },

        persistence: {
          created:
            persistence
              .createdCount,

          refreshed:
            persistence
              .refreshedCount,

          preserved:
            persistence
              .preservedCount,

          reactivated:
            persistence
              .reactivatedCount,

          superseded:
            persistence
              .supersededCount,
        },

        candidates:
          candidates.map(
            candidateToDto
          ),

        satisfied:
          enriched
            .satisfied
            .map(
              (item) => ({
                suggestionId:
                  item
                    .record
                    .suggestionId,

                semanticKey:
                  item
                    .record
                    .semanticKey,

                kind:
                  item
                    .record
                    .kind,

                reason:
                  item.reason,
              })
            ),

        skipped:
          mapped.skipped,
      });
    } catch (
      error
    ) {
      console.error(
        "Smart Import analysis failed:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Smart Import analysis failed.",

          code:
            "SMART_IMPORT_ANALYSIS_FAILED",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Edit Suggestion
//
// PATCH /api/smart-import/:candidateId
//
// Body:
// {
//   payload: { ... }
// }
// ======================================================

router.patch(
  "/:candidateId",

  async (
    req,
    res
  ) => {
    try {
      const loaded =
        await loadOwnedCandidate(
          req.params
            .candidateId,

          req.user._id
        );

      if (
        loaded.error
      ) {
        return res
          .status(
            loaded
              .error
              .status
          )
          .json(
            loaded.error
          );
      }

      const {
        candidate,
      } =
        loaded;

      const payloadPatch =
        req.body
          ?.payload;

      const previousPayload =
        clonePlain(
          candidate.payload ||
          {}
        );


      const nextPayload =
        await buildEditedPayload({
          candidate,

          payloadPatch,
        });


      candidate.recordUserEdit(
        nextPayload
      );


      await candidate.save();


      let updatedRelatedCandidates =
        [];


      /*
      * If the user corrected the name of a draft Entity,
      * propagate that corrected presentation name to every
      * pending suggestion that references the same draft.
      */
      if (
        candidate.kind ===
          "create-entity" &&
        Object.prototype
          .hasOwnProperty
          .call(
            payloadPatch ||
            {},
            "name"
          )
      ) {
        const previousName =
          String(
            previousPayload
              ?.name ||
            ""
          )
            .trim();


        const nextName =
          String(
            nextPayload
              ?.name ||
            ""
          )
            .trim();


        if (
          previousName &&
          nextName &&
          previousName !==
            nextName
        ) {
          updatedRelatedCandidates =
            await cascadeDraftEntityRename({
              candidate,

              oldName:
                previousName,

              newName:
                nextName,
            });
        }
      }


      return res.json({
        candidate:
          candidateToDto(
            candidate
          ),

        relatedCandidates:
          updatedRelatedCandidates.map(
            candidateToDto
          ),
      });
    } catch (
      error
    ) {
      console.error(
        "Failed to edit Smart Import suggestion:",
        error
      );

      if (
        error instanceof
          StorySuggestionEditError ||
        error instanceof
          StorySyncApplyError
      ) {
        return res
          .status(
            error.statusCode ||
            400
          )
          .json({
            message:
              error.message,

            code:
              error.code,

            details:
              error.details ??
              null,
          });
      }

      return res
        .status(500)
        .json({
          message:
            "Failed to edit Smart Import suggestion.",

          code:
            "SMART_IMPORT_EDIT_FAILED",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Apply Suggestion
//
// POST /api/smart-import/:candidateId/apply
// ======================================================

router.post(
  "/:candidateId/apply",

  async (
    req,
    res
  ) => {
    try {
      const loaded =
        await loadOwnedCandidate(
          req.params
            .candidateId,

          req.user._id
        );

      if (
        loaded.error
      ) {
        return res
          .status(
            loaded
              .error
              .status
          )
          .json(
            loaded.error
          );
      }

      let {
        candidate,
      } =
        loaded;

      let recommendedEntityTypeResult =
        null;

      if (
        candidate.kind ===
          "create-entity" &&
        candidate.status ===
          "pending"
      ) {
        const useRecommendedEntityType =
          req.body
            ?.useRecommendedEntityType ===
          true;

        if (
          useRecommendedEntityType
        ) {
          recommendedEntityTypeResult =
            await ensureRecommendedEntityType({
              candidate,

              locale:
                req.body
                  ?.locale ||
                "en",
            });

            /*
            * User may edit the presentation of a recommended type
            * before confirming it.
            *
            * Only modify presentation when this EntityType was
            * CREATED by this action.
            *
            * Never rename or re-icon an existing canonical type
            * simply because one Smart Import suggestion was edited.
            */
            if (
              recommendedEntityTypeResult
                ?.created ===
                true &&
              recommendedEntityTypeResult
                ?.entityType
            ) {
              const recommendedTypeName =
                String(
                  candidate
                    .payload
                    ?.recommendedTypeName ||
                  ""
                )
                  .trim();


              const recommendedTypeIcon =
                String(
                  candidate
                    .payload
                    ?.recommendedTypeIcon ||
                  ""
                )
                  .trim();


              let presentationChanged =
                false;


              if (
                recommendedTypeName &&
                recommendedTypeName !==
                  recommendedEntityTypeResult
                    .entityType
                    .name
              ) {
                recommendedEntityTypeResult
                  .entityType
                  .name =
                  recommendedTypeName;

                presentationChanged =
                  true;
              }


              if (
                recommendedTypeIcon &&
                recommendedTypeIcon !==
                  recommendedEntityTypeResult
                    .entityType
                    .icon
              ) {
                recommendedEntityTypeResult
                  .entityType
                  .icon =
                  recommendedTypeIcon;

                presentationChanged =
                  true;
              }


              if (
                presentationChanged
              ) {
                await recommendedEntityTypeResult
                  .entityType
                  .save();
              }
            }

          candidate =
            await StorySyncCandidate
              .findById(
                candidate._id
              );

          if (
            !candidate
          ) {
            return res
              .status(404)
              .json({
                message:
                  "Smart Import suggestion no longer exists.",

                code:
                  "SMART_IMPORT_SUGGESTION_NOT_FOUND",
              });
          }
        } else if (
          req.body
            ?.entityTypeId
        ) {
          const entityType =
            await EntityType.findOne({
              _id:
                req.body
                  .entityTypeId,

              worldId:
                candidate.worldId,
            });

          if (
            !entityType
          ) {
            return res
              .status(404)
              .json({
                message:
                  "Selected Entity Type does not exist in this world.",

                code:
                  "ENTITY_TYPE_NOT_FOUND",
              });
          }

          candidate.payload = {
            ...(
              candidate.payload ||
              {}
            ),

            entityTypeId:
              String(
                entityType._id
              ),
          };

          candidate.markModified(
            "payload"
          );

          await candidate.save();
        }
      }

      const result =
        await applyStorySyncCandidate({
          candidateId:
            candidate._id,
        });


      let updatedRelatedCandidates =
        [];


      /*
      * A newly materialized Entity can unlock:
      *
      * - field updates
      * - relations
      * - future timeline events
      *
      * Push the real Entity ID into those pending sibling
      * candidates immediately so the frontend dependency
      * state updates without requiring another analysis.
      */
      if (
        result.candidate?.kind ===
          "create-entity" &&
        result.candidate?.status ===
          "accepted" &&
        result.appliedResult
          ?.entityId
      ) {
        updatedRelatedCandidates =
          await materializeAcceptedEntityDependencies({
            candidate:
              result.candidate,

            appliedResult:
              result.appliedResult,
          });
      }


      return res.json({
        candidate:
          candidateToDto(
            result.candidate
          ),

        appliedResult:
          result
            .appliedResult,

        alreadyAccepted:
          result
            .alreadyAccepted,

        recommendedEntityType:
          recommendedEntityTypeResult
            ? {
                id:
                  String(
                    recommendedEntityTypeResult
                      .entityType
                      ?._id ||
                    ""
                  ),

                name:
                  recommendedEntityTypeResult
                    .entityType
                    ?.name ??
                  null,

                icon:
                  recommendedEntityTypeResult
                    .entityType
                    ?.icon ??
                  null,

                canonicalConcept:
                  recommendedEntityTypeResult
                    .entityType
                    ?.canonicalConcept ??
                  null,

                created:
                  recommendedEntityTypeResult
                    .created ===
                  true,

                reused:
                  recommendedEntityTypeResult
                    .reused ===
                  true,
              }
            : null,

            relatedCandidates:
              updatedRelatedCandidates.map(
                candidateToDto
              ),
      });
    } catch (
      error
    ) {
      console.error(
        "Failed to apply Smart Import suggestion:",
        error
      );

      if (
        error instanceof
        RecommendedEntityTypeError
      ) {
        return res
          .status(
            error.statusCode ||
            400
          )
          .json({
            message:
              error.message,

            code:
              error.code,

            details:
              error.details ??
              null,
          });
      }

      if (
        error instanceof
        StorySyncApplyError
      ) {
        return res
          .status(
            error.statusCode ||
            400
          )
          .json({
            message:
              error.message,

            code:
              error.code,

            details:
              error.details ??
              null,
          });
      }

      return res
        .status(500)
        .json({
          message:
            "Failed to apply Smart Import suggestion.",

          code:
            "SMART_IMPORT_APPLY_FAILED",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Ignore Suggestion
//
// POST /api/smart-import/:candidateId/ignore
// ======================================================

router.post(
  "/:candidateId/ignore",

  async (
    req,
    res
  ) => {
    try {
      const loaded =
        await loadOwnedCandidate(
          req.params
            .candidateId,

          req.user._id
        );

      if (
        loaded.error
      ) {
        return res
          .status(
            loaded
              .error
              .status
          )
          .json(
            loaded.error
          );
      }

      const result =
        await ignoreStorySyncCandidate({
          candidateId:
            loaded
              .candidate
              ._id,
        });

      return res.json({
        candidate:
          candidateToDto(
            result.candidate
          ),

        alreadyIgnored:
          result
            .alreadyIgnored,
      });
    } catch (
      error
    ) {
      console.error(
        "Failed to ignore Smart Import suggestion:",
        error
      );

      if (
        error instanceof
        StorySyncResolutionError
      ) {
        return res
          .status(
            error.statusCode ||
            400
          )
          .json({
            message:
              error.message,

            code:
              error.code,

            details:
              error.details ??
              null,
          });
      }

      return res
        .status(500)
        .json({
          message:
            "Failed to ignore Smart Import suggestion.",

          code:
            "SMART_IMPORT_IGNORE_FAILED",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Exports
// ======================================================

module.exports =
  router;
