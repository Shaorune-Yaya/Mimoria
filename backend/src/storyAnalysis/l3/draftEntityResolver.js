const {
  isConceptSameOrChildOf,
} = require(
  "./typeCompatibility"
);


const {
  PRESENTATION,
} = require(
  "../concepts/entityTypePresentation"
);


const zhEntityTypeLexicon =
  require(
    "../lexicons/zh-CN/entityTypes.json"
  );


// ======================================================
// Normalization
// ======================================================

function normalizeDraftEntityKey(
  value
) {
  return String(
    value || ""
  )
    .normalize(
      "NFKC"
    )
    .trim()
    .toLowerCase();
}


function getEntityTypeId(
  entityType
) {
  if (
    !entityType
  ) {
    return null;
  }


  const value =
    entityType._id ||
    entityType.id ||
    null;


  return value
    ? String(
        value
      )
    : null;
}

// ======================================================
// EntityType Semantic Name Matching
//
// Existing user-created EntityTypes do not necessarily
// have canonicalConcept yet.
//
// Example:
//
// name:
//   "角色"
//
// canonicalConcept:
//   null
//
// We should still understand:
//
// "角色"
// -> entityType.character
//
// Canonical bindings always win. Human-name matching is
// only a fallback.
// ======================================================

function normalizeEntityTypeName(
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
    .toLowerCase()
    .replace(
      /\s+/gu,
      ""
    );
}


function getLexiconAliasValues(
  entry
) {
  if (
    !entry
  ) {
    return [];
  }


  const aliases =
    entry.aliases ||
    {};


  return [
    ...(
      aliases.strong ||
      []
    ),

    ...(
      aliases.normal ||
      []
    ),

    ...(
      aliases.weak ||
      []
    ),
  ]
    .map(
      normalizeEntityTypeName
    )
    .filter(
      Boolean
    );
}


function inferEntityTypeConceptFromName(
  entityType
) {
  const normalizedName =
    normalizeEntityTypeName(
      entityType?.name
    );


  if (
    !normalizedName
  ) {
    return null;
  }


  // ====================================================
  // 1. Presentation labels
  //
  // Examples:
  //
  // Character
  // 人物
  // Organization
  // 组织
  // ====================================================

  for (
    const [
      conceptId,
      presentation,
    ] of Object.entries(
      PRESENTATION ||
      {}
    )
  ) {
    const labels =
      Object.values(
        presentation
          ?.labels ||
        {}
      )
        .map(
          normalizeEntityTypeName
        )
        .filter(
          Boolean
        );


    if (
      labels.includes(
        normalizedName
      )
    ) {
      return conceptId;
    }
  }


  // ====================================================
  // 2. EntityType lexicon aliases
  //
  // Examples:
  //
  // 角色
  // 人物
  // 角色档案
  //
  // -> entityType.character
  // ====================================================

  const entries =
    Array.isArray(
      zhEntityTypeLexicon
        ?.entries
    )
      ? zhEntityTypeLexicon
          .entries
      : [];


  for (
    const entry of
    entries
  ) {
    const aliases =
      getLexiconAliasValues(
        entry
      );


    if (
      aliases.includes(
        normalizedName
      )
    ) {
      return (
        entry.conceptId ||
        null
      );
    }
  }


  return null;
}

function getEntityTypeConcept({
  entityType,
  entityTypeConceptMap = {},
}) {
  const entityTypeId =
    getEntityTypeId(
      entityType
    );


  // ====================================================
  // 1. Explicit external semantic map
  // ====================================================

  if (
    entityTypeId &&
    entityTypeConceptMap[
      entityTypeId
    ]
  ) {
    return entityTypeConceptMap[
      entityTypeId
    ];
  }


  // ====================================================
  // 2. Canonical binding stored on EntityType
  // ====================================================

  if (
    entityType
      ?.canonicalConcept
  ) {
    return entityType
      .canonicalConcept;
  }


  // ====================================================
  // 3. Human-readable EntityType name fallback
  //
  // Important for older / user-created schemas which were
  // created before canonicalConcept existed.
  // ====================================================

  return inferEntityTypeConceptFromName(
    entityType
  );
}


// ======================================================
// Array Helpers
// ======================================================

function mergeUnique(
  left = [],
  right = []
) {
  return [
    ...new Set([
      ...left,
      ...right,
    ].filter(
      Boolean
    )),
  ];
}


// ======================================================
// Type Preference
// ======================================================

function shouldPreferIncomingType(
  existing,
  incoming
) {
  if (
    !incoming
      ?.likelyTypeConcept
  ) {
    return false;
  }


  if (
    !existing
      ?.likelyTypeConcept
  ) {
    return true;
  }


  if (
    incoming
      .typeInferenceStatus ===
      "intersected" &&
    existing
      .typeInferenceStatus !==
      "intersected"
  ) {
    return true;
  }


  const incomingConfidence =
    incoming
      .typeInferenceConfidence ??
    incoming
      .confidence ??
    0;


  const existingConfidence =
    existing
      .typeInferenceConfidence ??
    existing
      .confidence ??
    0;


  return (
    incomingConfidence >
    existingConfidence
  );
}


// ======================================================
// Build Draft Entities
//
// Draft entities exist only during analysis.
//
// They are NOT MongoDB documents and they do NOT receive
// fake ObjectIds.
//
// Example:
//
// Alice is 24 years old.
//
// Alice does not exist in Canon yet.
//
// draftEntities:
//
// {
//   draftEntityKey: "alice",
//   name: "Alice",
//   likelyTypeConcept: "entityType.character"
// }
// ======================================================

function buildDraftEntities(
  entitySuggestions = []
) {
  const map =
    new Map();


  for (
    const suggestion of
    entitySuggestions
  ) {
    const key =
      normalizeDraftEntityKey(
        suggestion
          ?.normalizedName ||
        suggestion
          ?.name
      );


    if (
      !key
    ) {
      continue;
    }


    const incoming = {
      draftEntityKey:
        key,

      name:
        suggestion
          ?.name ||
        key,

      normalizedName:
        key,

      likelyTypeConcept:
        suggestion
          ?.likelyTypeConcept ||
        suggestion
          ?.likelyType ||
        null,

      expectedTypeConcepts:
        mergeUnique(
          suggestion
            ?.expectedTypeConcepts ||
          [],
          []
        ),

      roles:
        mergeUnique(
          suggestion
            ?.roles ||
          [],
          [
            suggestion
              ?.role,
          ]
        ),

      sourceConcepts:
        mergeUnique(
          suggestion
            ?.sourceConcepts ||
          [],
          [
            suggestion
              ?.sourceConcept,
          ]
        ),

      confidence:
        suggestion
          ?.confidence ??
        0.7,

      typeInferenceStatus:
        suggestion
          ?.typeInferenceStatus ||
        null,

      typeInferenceConfidence:
        suggestion
          ?.typeInferenceConfidence ??
        0,

      unknownEntityEvidence: [
        ...(
          suggestion
            ?.unknownEntityEvidence ||
          []
        ),
      ],

      conflictingTypeConcepts:
        mergeUnique(
          suggestion
            ?.conflictingTypeConcepts ||
          [],
          []
        ),
    };


    const existing =
      map.get(
        key
      );


    if (
      !existing
    ) {
      map.set(
        key,
        incoming
      );

      continue;
    }


    existing.expectedTypeConcepts =
      mergeUnique(
        existing
          .expectedTypeConcepts,
        incoming
          .expectedTypeConcepts
      );


    existing.roles =
      mergeUnique(
        existing.roles,
        incoming.roles
      );


    existing.sourceConcepts =
      mergeUnique(
        existing
          .sourceConcepts,
        incoming
          .sourceConcepts
      );


    existing.conflictingTypeConcepts =
      mergeUnique(
        existing
          .conflictingTypeConcepts,
        incoming
          .conflictingTypeConcepts
      );


    existing.unknownEntityEvidence = [
      ...(
        existing
          .unknownEntityEvidence ||
        []
      ),

      ...(
        incoming
          .unknownEntityEvidence ||
        []
      ),
    ];


    existing.confidence =
      Math.max(
        existing
          .confidence ||
        0,

        incoming
          .confidence ||
        0
      );


    if (
      shouldPreferIncomingType(
        existing,
        incoming
      )
    ) {
      existing.likelyTypeConcept =
        incoming
          .likelyTypeConcept;


      existing.typeInferenceStatus =
        incoming
          .typeInferenceStatus;


      existing.typeInferenceConfidence =
        incoming
          .typeInferenceConfidence;
    } else if (
      existing
        .likelyTypeConcept ===
      incoming
        .likelyTypeConcept
    ) {
      existing.typeInferenceConfidence =
        Math.max(
          existing
            .typeInferenceConfidence ||
          0,

          incoming
            .typeInferenceConfidence ||
          0
        );
    }
  }


  return Array.from(
    map.values()
  );
}


// ======================================================
// Draft Lookup
// ======================================================

function buildDraftEntityMap(
  draftEntities = []
) {
  const map =
    new Map();


  for (
    const draftEntity of
    draftEntities
  ) {
    const key =
      normalizeDraftEntityKey(
        draftEntity
          ?.draftEntityKey ||
        draftEntity
          ?.normalizedName ||
        draftEntity
          ?.name
      );


    if (
      !key
    ) {
      continue;
    }


    map.set(
      key,
      draftEntity
    );
  }


  return map;
}


function findDraftEntity(
  hint,
  draftEntitiesOrMap = []
) {
  const key =
    normalizeDraftEntityKey(
      hint
    );


  if (
    !key
  ) {
    return null;
  }


  const map =
    draftEntitiesOrMap instanceof
      Map
      ? draftEntitiesOrMap
      : buildDraftEntityMap(
          draftEntitiesOrMap
        );


  return (
    map.get(
      key
    ) ||
    null
  );
}


// ======================================================
// Candidate Draft Enrichment
// ======================================================

function enrichOneSide({
  result,

  role,

  hint,

  entityId,

  resolution,

  draftMap,
}) {
  if (
    entityId ||
    !hint
  ) {
    return;
  }


  const draftEntity =
    findDraftEntity(
      hint,
      draftMap
    );


  if (
    !draftEntity
  ) {
    return;
  }


  const prefix =
    role ===
      "object"
      ? "object"
      : "subject";


  result[
    `${prefix}DraftEntityKey`
  ] =
    draftEntity
      .draftEntityKey;


  result[
    `${prefix}DraftEntity`
  ] =
    draftEntity;


  result[
    `${prefix}TypeConcept`
  ] =
    draftEntity
      .likelyTypeConcept ||
    null;


  /*
   * Preserve the original resolution information,
   * but mark this side as an analysis-time draft.
   */
  result[
    `${prefix}Resolution`
  ] = {
    ...(
      resolution ||
      {}
    ),

    status:
      "draft",

    hint,

    entityId:
      null,

    draftEntityKey:
      draftEntity
        .draftEntityKey,

    likelyTypeConcept:
      draftEntity
        .likelyTypeConcept ||
      null,

    expectedTypeConcepts:
      draftEntity
        .expectedTypeConcepts ||
      [],

    confidence:
      Math.max(
        resolution
          ?.confidence ||
        0,

        draftEntity
          .confidence ||
        0
      ),
  };
}


function enrichCandidatesWithDraftEntities({
  candidates = [],

  draftEntities = [],
}) {
  const draftMap =
    buildDraftEntityMap(
      draftEntities
    );


  return candidates.map(
    (candidate) => {
      const result = {
        ...candidate,
      };


      enrichOneSide({
        result,

        role:
          "subject",

        hint:
          candidate
            ?.subjectHint,

        entityId:
          candidate
            ?.subjectEntityId,

        resolution:
          candidate
            ?.subjectResolution,

        draftMap,
      });


      enrichOneSide({
        result,

        role:
          "object",

        hint:
          candidate
            ?.objectHint,

        entityId:
          candidate
            ?.objectEntityId,

        resolution:
          candidate
            ?.objectResolution,

        draftMap,
      });


      return result;
    }
  );
}


// ======================================================
// Draft -> Existing EntityType
//
// A draft entity has no Mongo Entity yet.
//
// However, if the world already contains an EntityType
// whose canonicalConcept matches the inferred type,
// schema analysis can continue safely.
//
// Example:
//
// Draft Alice
// likelyTypeConcept = entityType.character
//
// Existing EntityType:
// 人物
// canonicalConcept = entityType.character
//
// -> schema analysis may use 人物.fields
// ======================================================

function findBestEntityTypeForDraft({
  draftEntity,

  entityTypes = [],

  entityTypeConceptMap = {},
}) {
  const likelyTypeConcept =
    draftEntity
      ?.likelyTypeConcept ||
    null;


  if (
    !likelyTypeConcept
  ) {
    return {
      entityType:
        null,

      entityTypeId:
        null,

      entityTypeConcept:
        null,

      matchType:
        "none",
    };
  }


  const typed =
    entityTypes
      .map(
        (entityType) => ({
          entityType,

          entityTypeId:
            getEntityTypeId(
              entityType
            ),

          entityTypeConcept:
            getEntityTypeConcept({
              entityType,

              entityTypeConceptMap,
            }),
        })
      )
      .filter(
        (item) =>
          Boolean(
            item.entityTypeId
          )
      );


  // Exact semantic match first.
  const exact =
    typed.find(
      (item) =>
        item
          .entityTypeConcept ===
        likelyTypeConcept
    );


  if (
    exact
  ) {
    return {
      ...exact,

      matchType:
        "exact",
    };
  }


  /*
   * Example:
   *
   * inferred = character
   * existing = android
   *
   * android may be a child of character.
   */
  const child =
    typed.find(
      (item) =>
        item
          .entityTypeConcept &&
        isConceptSameOrChildOf(
          item
            .entityTypeConcept,

          likelyTypeConcept
        )
    );


  if (
    child
  ) {
    return {
      ...child,

      matchType:
        "child",
    };
  }


  /*
   * Fall back to all semantic expectations accumulated
   * from age / occupation / member_of / etc.
   */
  const expectedTypeConcepts =
    draftEntity
      ?.expectedTypeConcepts ||
    [];


  for (
    const expectedConcept of
    expectedTypeConcepts
  ) {
    const compatible =
      typed.find(
        (item) =>
          item
            .entityTypeConcept &&
          (
            item
              .entityTypeConcept ===
              expectedConcept ||
            isConceptSameOrChildOf(
              item
                .entityTypeConcept,

              expectedConcept
            )
          )
      );


    if (
      compatible
    ) {
      return {
        ...compatible,

        matchType:
          "expected-compatible",
      };
    }
  }


  return {
    entityType:
      null,

    entityTypeId:
      null,

    entityTypeConcept:
      null,

    matchType:
      "none",
  };
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  normalizeDraftEntityKey,

  buildDraftEntities,
  buildDraftEntityMap,
  findDraftEntity,

  enrichCandidatesWithDraftEntities,

  findBestEntityTypeForDraft,
};