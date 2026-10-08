// ======================================================
// L3-A Entity Resolver
//
// Resolves entity hints using:
//
// 1. Exact canonical name
// 2. Exact alias
// 3. Semantic type compatibility
//
// No database access.
// No entity creation.
// ======================================================


const {
  calculateTypeCompatibility,
} = require(
  "./typeCompatibility"
);


// ======================================================
// Text Normalization
// ======================================================

function normalizeEntityName(
  value
) {
  return String(
    value || ""
  )
    .normalize(
      "NFKC"
    )
    .trim()
    .replace(
      /\s+/gu,
      " "
    )
    .toLowerCase();
}


function stripEnglishArticle(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .replace(
      /^(?:the|a|an)\s+/iu,
      ""
    );
}


function normalizeComparableName(
  value
) {
  return normalizeEntityName(
    stripEnglishArticle(
      value
    )
  );
}


// ======================================================
// Entity Helpers
// ======================================================

function getEntityId(
  entity
) {
  if (
    !entity
  ) {
    return null;
  }


  if (
    entity._id !==
    undefined &&
    entity._id !==
    null
  ) {
    return String(
      entity._id
    );
  }


  if (
    entity.id !==
    undefined &&
    entity.id !==
    null
  ) {
    return String(
      entity.id
    );
  }


  return null;
}


function getEntityName(
  entity
) {
  return String(
    entity?.name ||
    entity?.title ||
    ""
  )
    .trim();
}


function getEntityAliases(
  entity
) {
  if (
    !Array.isArray(
      entity?.aliases
    )
  ) {
    return [];
  }


  return entity.aliases
    .map(
      (alias) =>
        String(
          alias
        )
          .trim()
    )
    .filter(
      Boolean
    );
}


function getEntityTypeId(
  entity
) {
  const type =
    entity?.entityTypeId ??
    entity?.entityType ??
    null;


  if (
    type ===
    null ||
    type ===
    undefined
  ) {
    return null;
  }


  if (
    typeof type ===
      "object"
  ) {
    if (
      type._id !==
      undefined
    ) {
      return String(
        type._id
      );
    }
  }


  return String(
    type
  );
}


// ======================================================
// Canonical Type Concept
//
// We support several possible shapes intentionally.
//
// Fake tests:
//   entity.typeConcept
//
// Future DB:
//   entity.entityType.canonicalConcept
//
// Or external map:
//   entityTypeConceptMap[typeId]
// ======================================================

function getEntityTypeConcept(
  entity,
  entityTypeConceptMap = {}
) {
  if (
    entity?.typeConcept
  ) {
    return entity.typeConcept;
  }


  if (
    entity?.entityTypeConcept
  ) {
    return entity
      .entityTypeConcept;
  }


  if (
    typeof entity?.entityType ===
      "object" &&
    entity
      .entityType
      ?.canonicalConcept
  ) {
    return entity
      .entityType
      .canonicalConcept;
  }


  if (
    typeof entity?.entityType ===
      "object" &&
    entity
      .entityType
      ?.conceptId
  ) {
    return entity
      .entityType
      .conceptId;
  }


  const typeId =
    getEntityTypeId(
      entity
    );


  if (
    typeId &&
    entityTypeConceptMap[
      typeId
    ]
  ) {
    return entityTypeConceptMap[
      typeId
    ];
  }


  return null;
}


// ======================================================
// Name Match
// ======================================================

function matchEntityName(
  hint,
  entity
) {
  const normalizedHint =
    normalizeComparableName(
      hint
    );


  if (
    !normalizedHint
  ) {
    return null;
  }


  const name =
    getEntityName(
      entity
    );


  if (
    name &&
    normalizeComparableName(
      name
    ) ===
      normalizedHint
  ) {
    return {
      matchType:
        "exact-name",

      matchedText:
        name,

      nameScore:
        1,
    };
  }


  for (
    const alias of
    getEntityAliases(
      entity
    )
  ) {
    if (
      normalizeComparableName(
        alias
      ) ===
      normalizedHint
    ) {
      return {
        matchType:
          "exact-alias",

        matchedText:
          alias,

        nameScore:
          0.98,
      };
    }
  }


  return null;
}


// ======================================================
// Resolve
// ======================================================

function resolveEntityHint(
  hint,
  entities = [],
  options = {}
) {
  const expectedTypeConcepts =
    Array.isArray(
      options.expectedTypeConcepts
    )
      ? options.expectedTypeConcepts
      : [];


  const entityTypeConceptMap =
    options.entityTypeConceptMap ||
    {};


  if (
    !hint ||
    !String(
      hint
    ).trim()
  ) {
    return {
      status:
        "missing-hint",

      hint:
        null,

      entityId:
        null,

      entityTypeId:
        null,

      entityTypeConcept:
        null,

      matchedName:
        null,

      confidence:
        0,

      alternatives: [],
    };
  }


  const matches =
    [];


  for (
    const entity of
    entities
  ) {
    const nameMatch =
      matchEntityName(
        hint,
        entity
      );


    if (
      !nameMatch
    ) {
      continue;
    }


    const typeConcept =
      getEntityTypeConcept(
        entity,
        entityTypeConceptMap
      );


    const typeCompatibility =
      calculateTypeCompatibility({
        actualTypeConcept:
          typeConcept,

        expectedTypeConcepts,
      });


    const rawScore =
      nameMatch.nameScore +
      typeCompatibility.score;


    const confidence =
      Math.max(
        0,
        Math.min(
          1,
          rawScore
        )
      );


    matches.push({
      entity,

      entityId:
        getEntityId(
          entity
        ),

      entityTypeId:
        getEntityTypeId(
          entity
        ),

      entityTypeConcept:
        typeConcept,

      entityName:
        getEntityName(
          entity
        ),

      ...nameMatch,

      typeCompatibility,

      score:
        rawScore,

      confidence,
    });
  }


  if (
    matches.length ===
    0
  ) {
    return {
      status:
        "missing",

      hint,

      entityId:
        null,

      entityTypeId:
        null,

      entityTypeConcept:
        null,

      matchedName:
        null,

      confidence:
        0,

      expectedTypeConcepts,

      alternatives: [],
    };
  }


  matches.sort(
    (
      a,
      b
    ) => {
      if (
        a.score !==
        b.score
      ) {
        return (
          b.score -
          a.score
        );
      }


      return (
        b.nameScore -
        a.nameScore
      );
    }
  );


  const best =
    matches[0];


  const tied =
    matches.filter(
      (match) =>
        Math.abs(
          match.score -
          best.score
        ) <
        0.000001
    );


  /*
   * Multiple equally-good entities:
   * do not guess.
   */
  if (
    tied.length >
    1
  ) {
    return {
      status:
        "ambiguous",

      hint,

      entityId:
        null,

      entityTypeId:
        null,

      entityTypeConcept:
        null,

      matchedName:
        null,

      confidence:
        best.confidence,

      expectedTypeConcepts,

      alternatives:
        tied.map(
          (match) => ({
            entityId:
              match.entityId,

            entityTypeId:
              match.entityTypeId,

            entityTypeConcept:
              match
                .entityTypeConcept,

            name:
              match.entityName,

            matchType:
              match.matchType,

            typeCompatible:
              match
                .typeCompatibility
                .compatible,

            matchedExpectedConcept:
              match
                .typeCompatibility
                .matchedExpectedConcept,

            confidence:
              match.confidence,
          })
        ),
    };
  }


  /*
   * Important:
   *
   * We allow a unique exact name to resolve even if
   * its type is semantically unexpected.
   *
   * We expose the incompatibility so later conflict
   * detection can warn the user.
   */
  return {
    status:
      "resolved",

    hint,

    entityId:
      best.entityId,

    entityTypeId:
      best.entityTypeId,

    entityTypeConcept:
      best.entityTypeConcept,

    matchedName:
      best.entityName,

    matchType:
      best.matchType,

    confidence:
      best.confidence,

    expectedTypeConcepts,

    typeCompatible:
      best
        .typeCompatibility
        .compatible,

    matchedExpectedConcept:
      best
        .typeCompatibility
        .matchedExpectedConcept,

    alternatives: [],
  };
}


module.exports = {
  normalizeEntityName,
  normalizeComparableName,

  getEntityId,
  getEntityName,
  getEntityAliases,
  getEntityTypeId,
  getEntityTypeConcept,

  matchEntityName,
  resolveEntityHint,
};