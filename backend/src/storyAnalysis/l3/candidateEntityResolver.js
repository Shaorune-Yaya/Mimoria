const {
  normalizeComparableName,
  resolveEntityHint,
} = require(
  "./entityResolver"
);

const {
  getExpectedTypeConcepts,
} = require(
  "./typeCompatibility"
);

const {
  inferEntityType,
} = require(
  "./entityTypeInference"
);


// ======================================================
// Entity Suggestion
// ======================================================

function makeEntitySuggestion({
  hint,
  role,
  candidate,

  expectedTypeConcepts,

  unknownEntities,
}) {
  const typeInference =
    inferEntityType({
      hint,

      expectedTypeConcepts,

      unknownEntities,
    });


  return {
    candidateType:
      "entity",

    name:
      hint,

    normalizedName:
      normalizeComparableName(
        hint
      ),

    role,

    status:
      "suggested",

    sourceCandidateType:
      candidate
        ?.candidateType ||
      null,

    sourceConcept:
      candidate
        ?.eventConcept ||
      candidate
        ?.relationConcept ||
      candidate
        ?.fieldConcept ||
      null,

    confidence:
      Math.min(
        0.95,
        Math.max(
          candidate
            ?.confidence ??
          0.7,

          typeInference
            .confidence ||
          0
        )
      ),

    expectedTypeConcepts:
      expectedTypeConcepts ||
      [],

    likelyTypeConcept:
      typeInference
        .likelyTypeConcept,

    typeInferenceStatus:
      typeInference
        .status,

    typeInferenceConfidence:
      typeInference
        .confidence,

    unknownEntityEvidence:
      typeInference
        .unknownEvidence ||
      [],

    conflictingTypeConcepts:
      typeInference
        .conflictingTypeConcepts ||
      [],
  };
}


// ======================================================
// Resolve One Side
// ======================================================

function resolveSide({
  hint,
  role,
  candidate,

  entities,

  entityTypeConceptMap,

  unknownEntities,

  entitySuggestions,
}) {
  if (
    !hint
  ) {
    return {
      resolution: {
        status:
          "missing-hint",

        hint:
          null,

        entityId:
          null,

        confidence:
          0,
      },

      entityId:
        null,
    };
  }


  const expectedTypeConcepts =
    getExpectedTypeConcepts({
      candidate,
      role,
    });


  const resolution =
    resolveEntityHint(
      hint,
      entities,
      {
        expectedTypeConcepts,

        entityTypeConceptMap,
      }
    );


  if (
    resolution.status ===
    "missing"
  ) {
    entitySuggestions.push(
      makeEntitySuggestion({
        hint,
        role,
        candidate,

        expectedTypeConcepts,

        unknownEntities,
      })
    );
  }


  return {
    resolution,

    entityId:
      resolution.status ===
        "resolved"
        ? resolution.entityId
        : null,
  };
}


// ======================================================
// Resolve Candidate
// ======================================================

function resolveOneCandidate({
  candidate,

  entities,

  entityTypeConceptMap,

  unknownEntities,

  entitySuggestions,
}) {
  const result = {
    ...candidate,
  };


  const subject =
    resolveSide({
      hint:
        candidate.subjectHint,

      role:
        "subject",

      candidate,

      entities,

      entityTypeConceptMap,

      unknownEntities,

      entitySuggestions,
    });


  result.subjectResolution =
    subject.resolution;


  result.subjectEntityId =
    subject.entityId;


  const object =
    resolveSide({
      hint:
        candidate.objectHint,

      role:
        "object",

      candidate,

      entities,

      entityTypeConceptMap,

      unknownEntities,

      entitySuggestions,
    });


  result.objectResolution =
    object.resolution;


  result.objectEntityId =
    object.entityId;


  return result;
}


// ======================================================
// Suggestion Merge
// ======================================================

function mergeTypeInference(
  existing,
  incoming
) {
  /*
   * Prefer intersected evidence.
   */
  if (
    incoming
      .typeInferenceStatus ===
      "intersected" &&
    existing
      .typeInferenceStatus !==
      "intersected"
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
  }


  /*
   * Same inferred type:
   * preserve highest confidence.
   */
  if (
    incoming
      .likelyTypeConcept ===
      existing
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


  existing.conflictingTypeConcepts = [
    ...new Set([
      ...(
        existing
          .conflictingTypeConcepts ||
        []
      ),

      ...(
        incoming
          .conflictingTypeConcepts ||
        []
      ),
    ]),
  ];
}


// ======================================================
// Deduplicate Suggestions
// ======================================================

function deduplicateEntitySuggestions(
  suggestions
) {
  const map =
    new Map();


  for (
    const suggestion of
    suggestions
  ) {
    const key =
      suggestion
        .normalizedName;


    if (!key) {
      continue;
    }


    const existing =
      map.get(
        key
      );


    if (
      !existing
    ) {
      map.set(
        key,
        {
          ...suggestion,

          roles: [
            suggestion.role,
          ],

          sourceConcepts:
            suggestion.sourceConcept
              ? [
                  suggestion
                    .sourceConcept,
                ]
              : [],

          expectedTypeConcepts: [
            ...new Set(
              suggestion
                .expectedTypeConcepts ||
              []
            ),
          ],
        }
      );


      continue;
    }


    if (
      !existing.roles.includes(
        suggestion.role
      )
    ) {
      existing.roles.push(
        suggestion.role
      );
    }


    if (
      suggestion.sourceConcept &&
      !existing
        .sourceConcepts
        .includes(
          suggestion
            .sourceConcept
        )
    ) {
      existing
        .sourceConcepts
        .push(
          suggestion
            .sourceConcept
        );
    }


    existing.expectedTypeConcepts = [
      ...new Set([
        ...(
          existing
            .expectedTypeConcepts ||
          []
        ),

        ...(
          suggestion
            .expectedTypeConcepts ||
          []
        ),
      ]),
    ];


    existing.confidence =
      Math.max(
        existing.confidence,
        suggestion.confidence
      );


    mergeTypeInference(
      existing,
      suggestion
    );
  }


  return Array.from(
    map.values()
  );
}


// ======================================================
// Public
// ======================================================

function resolveCandidateEntities({
  candidates = [],

  entities = [],

  entityTypeConceptMap = {},

  unknownEntities = [],
}) {
  const entitySuggestions =
    [];


  const resolvedCandidates =
    candidates.map(
      (candidate) =>
        resolveOneCandidate({
          candidate,

          entities,

          entityTypeConceptMap,

          unknownEntities,

          entitySuggestions,
        })
    );


  return {
    candidates:
      resolvedCandidates,

    entitySuggestions:
      deduplicateEntitySuggestions(
        entitySuggestions
      ),
  };
}


module.exports = {
  makeEntitySuggestion,

  resolveCandidateEntities,

  deduplicateEntitySuggestions,
};