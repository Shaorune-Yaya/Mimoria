const {
  scoreEntityTypeCandidates,
} = require(
  "./semanticScoring"
);


const {
  findSemanticEntityByName,
} = require(
  "./semanticState"
);


// ======================================================
// Helpers
// ======================================================

function unique(
  values
) {
  return [
    ...new Set(
      (
        values ||
        []
      ).filter(
        Boolean
      )
    ),
  ];
}


function getExistingEntityTypeConcepts(
  entityTypeConceptMap
) {
  if (
    !entityTypeConceptMap
  ) {
    return [];
  }


  if (
    entityTypeConceptMap instanceof
    Map
  ) {
    return unique(
      Array.from(
        entityTypeConceptMap
          .values()
      )
    );
  }


  return unique(
    Object.values(
      entityTypeConceptMap
    )
  );
}


// ======================================================
// Refine One Suggestion
// ======================================================

function refineEntitySuggestion({
  suggestion,

  semanticState,

  entityTypeConceptMap = {},
}) {
  if (
    !suggestion?.name
  ) {
    return suggestion;
  }


  const semanticEntity =
    findSemanticEntityByName(
      semanticState,
      suggestion.name
    );


  /*
   * No memory exists for this entity.
   *
   * Keep the first-pass result unchanged.
   */
  if (
    !semanticEntity
  ) {
    return suggestion;
  }


  const scoring =
    scoreEntityTypeCandidates({
      expectedTypeConcepts:
        suggestion
          .expectedTypeConcepts ||
        [],

      unknownEvidence:
        suggestion
          .unknownEntityEvidence ||
        [],

      existingEntityTypeConcepts:
        getExistingEntityTypeConcepts(
          entityTypeConceptMap
        ),

      priorTypeConcept:
        suggestion
          .likelyTypeConcept ||
        null,

      priorTypeConfidence:
        suggestion
          .typeInferenceConfidence ??
        suggestion
          .confidence ??
        0,

      semanticEntity,
    });


  if (
    !scoring.bestConcept
  ) {
    return {
      ...suggestion,

      semanticRefinement: {
        status:
          "no-result",

        scoring,
      },
    };
  }


  const alternatives =
    scoring.ranked
      .slice(
        1,
        4
      )
      .filter(
        (
          item
        ) =>
          item.score >
          0
      )
      .map(
        (
          item
        ) =>
          item.conceptId
      );


  return {
    ...suggestion,

    likelyTypeConcept:
      scoring.bestConcept,

    typeInferenceStatus:
      scoring.ambiguous
        ? "semantic-memory-ambiguous"
        : "semantic-memory-refined",

    typeInferenceConfidence:
      scoring.confidence,

    conflictingTypeConcepts:
      unique([
        ...(
          suggestion
            .conflictingTypeConcepts ||
          []
        ),

        ...alternatives,
      ]),

    semanticRefinement: {
      status:
        scoring.ambiguous
          ? "ambiguous"
          : "refined",

      previousTypeConcept:
        suggestion
          .likelyTypeConcept ||
        null,

      previousConfidence:
        suggestion
          .typeInferenceConfidence ??
        0,

      nextTypeConcept:
        scoring.bestConcept,

      nextConfidence:
        scoring.confidence,

      margin:
        scoring.margin,

      semanticEntityKey:
        semanticEntity.key,

      scoring,
    },
  };
}


// ======================================================
// Refine All Suggestions
// ======================================================

function refineEntitySuggestions({
  entitySuggestions = [],

  semanticState,

  entityTypeConceptMap = {},
}) {
  if (
    !semanticState
  ) {
    return entitySuggestions;
  }


  return (
    entitySuggestions ||
    []
  )
    .map(
      (
        suggestion
      ) =>
        refineEntitySuggestion({
          suggestion,

          semanticState,

          entityTypeConceptMap,
        })
    );
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  refineEntitySuggestion,

  refineEntitySuggestions,

  getExistingEntityTypeConcepts,
};