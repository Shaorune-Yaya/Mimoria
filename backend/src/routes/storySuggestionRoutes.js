const express = require(
  "express"
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
  getDevUser,
  getOwnedWorld,
} = require(
  "../utils/devUser"
);


// ======================================================
// L3 Unified Analysis Pipeline
// ======================================================

const {
  analyzeStoryForSuggestions,
} = require(
  "../storyAnalysis/l3/storyAnalysisPipeline"
);


// ======================================================
// L4 Mapper
// ======================================================

const {
  mapSuggestionsToStorySyncCandidates,
} = require(
  "../storyAnalysis/l4/storySyncMapper"
);


// ======================================================
// L4 Persistence
// ======================================================

const {
  persistStorySyncCandidates,
} = require(
  "../storyAnalysis/l4/storySyncPersistenceService"
);


// ======================================================
// L4 Apply
// ======================================================

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

// ======================================================
// L4 Ignore
// ======================================================

const {
  ignoreStorySyncCandidate,

  StorySyncResolutionError,
} = require(
  "../storyAnalysis/l4/storySyncResolutionService"
);


const router =
  express.Router();


// ======================================================
// Story Suggestion Edit Error
// ======================================================

class StorySuggestionEditError
  extends Error {
  constructor(
    message,
    {
      code =
        "STORY_SUGGESTION_EDIT_ERROR",

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

function buildEntityTypeConceptMap(
  entityTypes = []
) {
  const result =
    {};


  for (
    const entityType of
    entityTypes
  ) {
    if (
      !entityType
        ?.canonicalConcept
    ) {
      continue;
    }


    result[
      String(
        entityType._id
      )
    ] =
      entityType
        .canonicalConcept;
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
// Analysis State
// ======================================================

function getAnalysisState({
  document,

  world,
}) {
  const contentVersion =
    Number(
      document
        ?.contentVersion ??
      0
    );


  const syncedVersion =
    Number(
      document
        ?.syncedVersion ??
      0
    );


  const worldCanonVersion =
    Number(
      world
        ?.canonVersion ??
      0
    );


  const lastAnalyzedCanonVersion =
    Number(
      document
        ?.lastAnalyzedCanonVersion ??
      0
    );


  const documentNeedsAnalysis =
    contentVersion !==
    syncedVersion;


  const canonNeedsAnalysis =
    worldCanonVersion !==
    lastAnalyzedCanonVersion;


  return {
    contentVersion,

    syncedVersion,

    worldCanonVersion,

    lastAnalyzedCanonVersion,

    documentNeedsAnalysis,

    canonNeedsAnalysis,

    needsAnalysis:
      documentNeedsAnalysis ||
      canonNeedsAnalysis,
  };
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
      const payload =
        record.payload ||
        {};


      const entity =
        entityMap.get(
          String(
            payload
              .targetEntityId ||
            ""
          )
        );


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
      const payload =
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
      const payload =
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
      const payload =
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
      record.baseline = {
        type:
          "entity-missing",

        name:
          record
            .payload
            ?.name ??
          null,

        likelyTypeConcept:
          record
            .payload
            ?.likelyTypeConcept ??
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
// Load Document + Permission
// ======================================================

async function loadOwnedDocument(
  documentId
) {
  const user =
    await getDevUser();


  const document =
    await Document.findById(
      documentId
    );


  if (
    !document
  ) {
    return {
      error: {
        status:
          404,

        message:
          "Document not found.",
      },
    };
  }


  const world =
    await getOwnedWorld(
      document.worldId,

      user._id
    );


  if (
    !world
  ) {
    return {
      error: {
        status:
          403,

        message:
          "You do not have access to this document.",
      },
    };
  }


  return {
    user,

    world,

    document,
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


    if (
      Object.prototype
        .hasOwnProperty
        .call(
          payloadPatch,
          "entityTypeId"
        )
    ) {
      const entityType =
        await EntityType.findOne({
          _id:
            payloadPatch
              .entityTypeId,

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
// Analyze Document
//
// POST
// /api/story-suggestions/documents/:documentId/analyze
//
// Body:
//
// {
//   locale: "auto" | "zh-CN" | "en",
//   forceLocale: false,
//   enabledPacks: ["furry", "sciFi"],
//   nsfwEnabled: false
// }
// ======================================================

router.post(
  "/documents/:documentId/analyze",

  async (
    req,
    res
  ) => {
    try {
      const loaded =
        await loadOwnedDocument(
          req.params
            .documentId
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
          .json({
            message:
              loaded
                .error
                .message,
          });
      }


      const {
        world,
        document,
      } =
        loaded;


      const text =
        document
          .plainText ||
        "";


      const requestedLocale =
        req.body
          ?.locale ||
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


      const analysisStartedAtCanonVersion =
        Number(
          world
            .canonVersion ??
          0
        );


      // --------------------------------------------------
      // Load current canonical world data
      // --------------------------------------------------

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


      // --------------------------------------------------
      // Run L1 -> L3
      // --------------------------------------------------

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


      // --------------------------------------------------
      // L3 -> L4 Candidate records
      // --------------------------------------------------

      const mapped =
        mapSuggestionsToStorySyncCandidates({
          suggestions,

          worldId:
            world._id,

          documentId:
            document._id,

          documentVersion:
            document
              .contentVersion,

          originalText:
            text,
        });


      // --------------------------------------------------
      // Compare suggestions to CURRENT Canon
      // --------------------------------------------------

      const enriched =
        enrichRecordsWithCanonicalState({
          records:
            mapped.records,

          entities,

          entityTypes,

          relations,
        });


      // --------------------------------------------------
      // Persist revision-aware suggestions
      // --------------------------------------------------

      const persistence =
        await persistStorySyncCandidates({
          worldId:
            world._id,

          documentId:
            document._id,

          documentVersion:
            document
              .contentVersion,

          records:
            enriched.records,
        });


      // --------------------------------------------------
      // Guard against Canon changing while analysis runs.
      //
      // Reload World immediately before marking analysis
      // as current.
      // --------------------------------------------------

      const freshWorld =
        await getOwnedWorld(
          world._id,

          loaded.user._id
        );


      const finalCanonVersion =
        Number(
          freshWorld
            ?.canonVersion ??
          0
        );


      /*
       * If Canon changed during analysis, do not claim that
       * this analysis represents the newer Canon.
       */
      const canonChangedDuringAnalysis =
        finalCanonVersion !==
        analysisStartedAtCanonVersion;


      document.syncedVersion =
        document.contentVersion;


      document.lastAnalyzedCanonVersion =
        analysisStartedAtCanonVersion;


      document.lastSyncedAt =
        new Date();


      await document.save();


      const currentCandidates =
        await StorySyncCandidate
          .find({
            documentId:
              document._id,

            status:
              "pending",

            "source.documentVersion":
              document
                .contentVersion,
          })
          .sort({
            confidence:
              -1,

            createdAt:
              1,
          });


      const state =
        getAnalysisState({
          document,

          world:
            freshWorld ||
            world,
        });


      res.json({
        document: {
          id:
            String(
              document._id
            ),

          contentVersion:
            document
              .contentVersion,

          syncedVersion:
            document
              .syncedVersion,

          lastAnalyzedCanonVersion:
            document
              .lastAnalyzedCanonVersion,

          worldCanonVersion:
            finalCanonVersion,

          documentNeedsAnalysis:
            state
              .documentNeedsAnalysis,

          canonNeedsAnalysis:
            state
              .canonNeedsAnalysis,

          needsAnalysis:
            state
              .needsAnalysis,

          canonChangedDuringAnalysis,

          lastSyncedAt:
            document
              .lastSyncedAt,
        },

        analysis: {
          requestedLocale,

          forceLocale,

          locale,

          autoDetectedLocale:
            detectStoryLocale(
              text
            ),

          enabledPacks,

          nsfwEnabled,

          suggestionCount:
            suggestions.length,

          mappedCount:
            mapped
              .records
              .length,

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
          currentCandidates.map(
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
    } catch (error) {
      console.error(
        "Story Suggestions analysis failed:",
        error
      );


      res
        .status(500)
        .json({
          message:
            "Story Suggestions analysis failed.",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Get Suggestions for Document
//
// GET
// /api/story-suggestions/documents/:documentId
// ======================================================

router.get(
  "/documents/:documentId",

  async (
    req,
    res
  ) => {
    try {
      const loaded =
        await loadOwnedDocument(
          req.params
            .documentId
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
          .json({
            message:
              loaded
                .error
                .message,
          });
      }


      const {
        document,
        world,
      } =
        loaded;


      const requestedStatus =
        String(
          req.query
            ?.status ||
          "pending"
        )
          .trim()
          .toLowerCase();


      const allowed =
        new Set([
          "pending",
          "accepted",
          "ignored",
          "superseded",
          "all",
        ]);


      if (
        !allowed.has(
          requestedStatus
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid candidate status.",
          });
      }


      const state =
        getAnalysisState({
          document,

          world,
        });


      const query = {
        documentId:
          document._id,

        suggestionId: {
          $type:
            "string",
        },
      };


      if (
        requestedStatus !==
        "all"
      ) {
        query.status =
          requestedStatus;
      }


      /*
       * Pending suggestions belong to the latest analyzed
       * content version.
       *
       * When Canon changes, these may be stale; the
       * response explicitly reports canonNeedsAnalysis.
       */
      if (
        requestedStatus ===
        "pending"
      ) {
        query[
          "source.documentVersion"
        ] =
          document
            .syncedVersion;
      }


      const candidates =
        await StorySyncCandidate
          .find(
            query
          )
          .sort({
            confidence:
              -1,

            createdAt:
              1,
          });


      res.json({
        documentId:
          String(
            document._id
          ),

        contentVersion:
          state
            .contentVersion,

        syncedVersion:
          state
            .syncedVersion,

        worldCanonVersion:
          state
            .worldCanonVersion,

        lastAnalyzedCanonVersion:
          state
            .lastAnalyzedCanonVersion,

        documentNeedsAnalysis:
          state
            .documentNeedsAnalysis,

        canonNeedsAnalysis:
          state
            .canonNeedsAnalysis,

        needsAnalysis:
          state
            .needsAnalysis,

        status:
          requestedStatus,

        candidates:
          candidates.map(
            candidateToDto
          ),
      });
    } catch (error) {
      console.error(
        "Failed to load Story Suggestions:",
        error
      );


      res
        .status(500)
        .json({
          message:
            "Failed to load Story Suggestions.",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Edit Suggestion
//
// PATCH /api/story-suggestions/:candidateId
//
// Example:
//
// {
//   "payload": {
//     "subjectName": "牙牙"
//   }
// }
// ======================================================

router.patch(
  "/:candidateId",

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getDevUser();


      const candidate =
        await StorySyncCandidate
          .findById(
            req.params
              .candidateId
          );


      if (
        !candidate
      ) {
        return res
          .status(404)
          .json({
            message:
              "Story Suggestion not found.",
          });
      }


      const world =
        await getOwnedWorld(
          candidate.worldId,

          user._id
        );


      if (
        !world
      ) {
        return res
          .status(403)
          .json({
            message:
              "You do not have access to this Story Suggestion.",
          });
      }


      const payloadPatch =
        req.body
          ?.payload;


      const nextPayload =
        await buildEditedPayload({
          candidate,

          payloadPatch,
        });


      candidate.recordUserEdit(
        nextPayload
      );


      await candidate.save();


      res.json({
        candidate:
          candidateToDto(
            candidate
          ),
      });
    } catch (error) {
      console.error(
        "Failed to edit Story Suggestion:",
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


      res
        .status(500)
        .json({
          message:
            "Failed to edit Story Suggestion.",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Apply Suggestion
//
// POST /api/story-suggestions/:candidateId/apply
// ======================================================

// ======================================================
// Apply Suggestion
//
// POST /api/story-suggestions/:candidateId/apply
//
// Existing EntityType:
//
// {
//   "entityTypeId": "..."
// }
//
// Recommended EntityType:
//
// {
//   "useRecommendedEntityType": true,
//   "locale": "zh-CN"
// }
//
// If the recommended type does not exist in this World,
// it will be created ONLY because the user explicitly
// requested useRecommendedEntityType.
// ======================================================

// ======================================================
// Apply Suggestion
//
// POST /api/story-suggestions/:candidateId/apply
//
// Existing EntityType:
//
// {
//   "entityTypeId": "..."
// }
//
// Recommended EntityType:
//
// {
//   "useRecommendedEntityType": true,
//   "locale": "zh-CN"
// }
// ======================================================

router.post(
  "/:candidateId/apply",

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getDevUser();


      let candidate =
        await StorySyncCandidate
          .findById(
            req.params.candidateId
          );


      if (
        !candidate
      ) {
        return res
          .status(404)
          .json({
            message:
              "Story Suggestion not found.",
          });
      }


      const world =
        await getOwnedWorld(
          candidate.worldId,
          user._id
        );


      if (
        !world
      ) {
        return res
          .status(403)
          .json({
            message:
              "You do not have access to this Story Suggestion.",
          });
      }


      let recommendedEntityTypeResult =
        null;


      // ==================================================
      // create-entity
      // ==================================================

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


        // ================================================
        // Option A:
        // Explicitly use analyzer-recommended EntityType.
        // ================================================

        if (
          useRecommendedEntityType
        ) {
          console.log(
            "[StorySuggestion Apply] Using recommended EntityType:",
            {
              candidateId:
                String(
                  candidate._id
                ),

              name:
                candidate
                  .payload
                  ?.name,

              likelyTypeConcept:
                candidate
                  .payload
                  ?.likelyTypeConcept,

              locale:
                req.body
                  ?.locale ||
                "en",
            }
          );


          recommendedEntityTypeResult =
            await ensureRecommendedEntityType({
              candidate,

              locale:
                req.body
                  ?.locale ||
                "en",
            });


          /*
           * IMPORTANT:
           *
           * Reload candidate from MongoDB after the
           * recommended type service updates payload.
           *
           * Do not rely on the old in-memory document.
           */
          candidate =
            await StorySyncCandidate
              .findById(
                req.params.candidateId
              );


          if (
            !candidate
          ) {
            return res
              .status(404)
              .json({
                message:
                  "Story Suggestion disappeared after Entity Type resolution.",
              });
          }


          console.log(
            "[StorySuggestion Apply] Candidate after recommended type resolution:",
            {
              candidateId:
                String(
                  candidate._id
                ),

              entityTypeId:
                candidate
                  .payload
                  ?.entityTypeId,

              likelyTypeConcept:
                candidate
                  .payload
                  ?.likelyTypeConcept,
            }
          );


          if (
            !candidate
              .payload
              ?.entityTypeId
          ) {
            return res
              .status(500)
              .json({
                message:
                  "Recommended Entity Type was resolved but entityTypeId was not written to the candidate.",

                code:
                  "RECOMMENDED_ENTITY_TYPE_NOT_ATTACHED",

                details: {
                  candidateId:
                    String(
                      candidate._id
                    ),

                  likelyTypeConcept:
                    candidate
                      .payload
                      ?.likelyTypeConcept,

                  recommendedResult:
                    recommendedEntityTypeResult
                      ? {
                          entityTypeId:
                            String(
                              recommendedEntityTypeResult
                                .entityType
                                ?._id ||
                              ""
                            ),

                          created:
                            recommendedEntityTypeResult
                              .created,

                          reused:
                            recommendedEntityTypeResult
                              .reused,
                        }
                      : null,
                },
              });
          }
        }


        // ================================================
        // Option B:
        // User manually selects an existing EntityType.
        // ================================================

        else if (
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

                details:
                  null,
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


          candidate =
            await StorySyncCandidate
              .findById(
                candidate._id
              );
        }
      }


      // ==================================================
      // Apply Canon Mutation
      // ==================================================

      const result =
        await applyStorySyncCandidate({
          candidateId:
            candidate._id,
        });


      res.json({
        candidate:
          candidateToDto(
            result.candidate
          ),

        appliedResult:
          result.appliedResult,

        alreadyAccepted:
          result.alreadyAccepted,

        canonChanged:
          result.canonChanged ??
          false,

        canonVersion:
          result.canonVersion ??
          result
            .appliedResult
            ?.canonVersion ??
          recommendedEntityTypeResult
            ?.canonVersion ??
          null,

        recommendedEntityType:
          recommendedEntityTypeResult
            ? {
                id:
                  String(
                    recommendedEntityTypeResult
                      .entityType
                      ._id
                  ),

                name:
                  recommendedEntityTypeResult
                    .entityType
                    .name,

                icon:
                  recommendedEntityTypeResult
                    .entityType
                    .icon,

                canonicalConcept:
                  recommendedEntityTypeResult
                    .entityType
                    .canonicalConcept,

                created:
                  recommendedEntityTypeResult
                    .created,

                reused:
                  recommendedEntityTypeResult
                    .reused,

                canonicalConceptAttached:
                  recommendedEntityTypeResult
                    .canonicalConceptAttached ??
                  false,
              }
            : null,
      });
    } catch (
      error
    ) {
      console.error(
        "Failed to apply Story Suggestion:",
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
              error.details,
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
              error.details,
          });
      }


      res
        .status(500)
        .json({
          message:
            "Failed to apply Story Suggestion.",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Ignore Suggestion
//
// POST /api/story-suggestions/:candidateId/ignore
// ======================================================

router.post(
  "/:candidateId/ignore",

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getDevUser();


      const candidate =
        await StorySyncCandidate
          .findById(
            req.params
              .candidateId
          );


      if (
        !candidate
      ) {
        return res
          .status(404)
          .json({
            message:
              "Story Suggestion not found.",
          });
      }


      const world =
        await getOwnedWorld(
          candidate.worldId,

          user._id
        );


      if (
        !world
      ) {
        return res
          .status(403)
          .json({
            message:
              "You do not have access to this Story Suggestion.",
          });
      }


      const result =
        await ignoreStorySyncCandidate({
          candidateId:
            candidate._id,
        });


      res.json({
        candidate:
          candidateToDto(
            result.candidate
          ),

        alreadyIgnored:
          result
            .alreadyIgnored,
      });
    } catch (error) {
      console.error(
        "Failed to ignore Story Suggestion:",
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
              error.details,
          });
      }


      res
        .status(500)
        .json({
          message:
            "Failed to ignore Story Suggestion.",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Get One Suggestion
//
// GET /api/story-suggestions/:candidateId
// ======================================================

router.get(
  "/:candidateId",

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getDevUser();


      const candidate =
        await StorySyncCandidate
          .findById(
            req.params
              .candidateId
          );


      if (
        !candidate
      ) {
        return res
          .status(404)
          .json({
            message:
              "Story Suggestion not found.",
          });
      }


      const world =
        await getOwnedWorld(
          candidate.worldId,

          user._id
        );


      if (
        !world
      ) {
        return res
          .status(403)
          .json({
            message:
              "You do not have access to this Story Suggestion.",
          });
      }


      res.json({
        candidate:
          candidateToDto(
            candidate
          ),
      });
    } catch (error) {
      console.error(
        "Failed to load Story Suggestion:",
        error
      );


      res
        .status(500)
        .json({
          message:
            "Failed to load Story Suggestion.",

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