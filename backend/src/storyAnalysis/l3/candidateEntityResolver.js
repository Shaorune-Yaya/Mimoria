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

const {
  buildDraftEntities,
  enrichCandidatesWithDraftEntities,
} = require(
  "./draftEntityResolver"
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


  /*
   * Existing Entity:
   *
   * use the real canonical entity.
   *
   * Missing Entity:
   *
   * emit a create-entity suggestion. A later pass will
   * convert these missing entities into analysis-only
   * draft entities.
   */
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


  // ----------------------------------------------------
  // Subject
  // ----------------------------------------------------

  const subject =
    resolveSide({
      hint:
        candidate
          .subjectHint,

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


  // ----------------------------------------------------
  // Object
  // ----------------------------------------------------

  const object =
    resolveSide({
      hint:
        candidate
          .objectHint,

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
   * Intersected lexical + semantic evidence is stronger
   * than semantic-only evidence.
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
   * Same type:
   * retain the strongest confidence.
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


  /*
   * If the existing suggestion has no type but the new
   * evidence does, keep the inferred type.
   */
  if (
    !existing
      .likelyTypeConcept &&
    incoming
      .likelyTypeConcept
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
// Deduplicate Entity Suggestions
//
// One entity can appear in several facts:
//
// Alice age = 24
// Alice occupation = Alchemist
// Alice member_of = Church
//
// They must become ONE draft/create-entity suggestion.
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


    if (
      !key
    ) {
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
          ].filter(
            Boolean
          ),

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
      suggestion.role &&
      !existing
        .roles
        .includes(
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
        existing
          .confidence ||
        0,

        suggestion
          .confidence ||
        0
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
  const rawEntitySuggestions =
    [];


  // ----------------------------------------------------
  // Pass 1
  //
  // Resolve all references against real Canon entities.
  // Missing references produce entity suggestions.
  // ----------------------------------------------------

  const initiallyResolvedCandidates =
    candidates.map(
      (candidate) =>
        resolveOneCandidate({
          candidate,

          entities,

          entityTypeConceptMap,

          unknownEntities,

          entitySuggestions:
            rawEntitySuggestions,
        })
    );


  // ----------------------------------------------------
  // Pass 2
  //
  // Merge repeated references to the same missing entity.
  // ----------------------------------------------------

  const entitySuggestions =
    deduplicateEntitySuggestions(
      rawEntitySuggestions
    );


  // ----------------------------------------------------
  // Pass 3
  //
  // Convert missing entities into temporary draft
  // entities so subsequent L3 passes can continue
  // reasoning about them.
  //
  // Important:
  //
  // No MongoDB write happens here.
  // No fake ObjectId is generated.
  // ----------------------------------------------------

  const draftEntities =
    buildDraftEntities(
      entitySuggestions
    );


  // ----------------------------------------------------
  // Pass 4
  //
  // Attach draft identity back onto every candidate.
  //
  // Example:
  //
  // {
  //   subjectHint: "Alice",
  //   subjectEntityId: null,
  //   subjectDraftEntityKey: "alice",
  //   subjectTypeConcept: "entityType.character"
  // }
  // ----------------------------------------------------

  const resolvedCandidates =
    enrichCandidatesWithDraftEntities({
      candidates:
        initiallyResolvedCandidates,

      draftEntities,
    });


  return {
    candidates:
      resolvedCandidates,

    entitySuggestions,

    draftEntities,
  };
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  makeEntitySuggestion,

  resolveCandidateEntities,

  deduplicateEntitySuggestions,
};