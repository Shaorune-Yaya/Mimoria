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

const {
  getConcept,
} = require(
  "../concepts/registry"
);

const {
  scoreEntityHintQuality,
  combineEntityConfidence,
  getQualityDisposition,
} = require(
  "../l2/candidateQualityScoring"
);

// ======================================================
// Existing Entity Type Concepts
// ======================================================

function getExistingEntityTypeConcepts(
  entityTypeConceptMap
) {
  if (
    !entityTypeConceptMap
  ) {
    return [];
  }


  /*
   * Current Mimoria callers may represent this mapping
   * either as:
   *
   * Map
   *
   * or:
   *
   * plain object
   *
   * We support both.
   */
  if (
    entityTypeConceptMap instanceof
    Map
  ) {
    return [
      ...new Set(
        Array.from(
          entityTypeConceptMap
            .values()
        )
          .filter(
            Boolean
          )
      ),
    ];
  }


  return [
    ...new Set(
      Object.values(
        entityTypeConceptMap
      )
        .filter(
          Boolean
        )
    ),
  ];
}

// ======================================================
// Entity Suggestion
// ======================================================

function makeEntitySuggestion({
  hint,

  role,

  candidate,

  expectedTypeConcepts,

  unknownEntities,

  entityTypeConceptMap,
}) {
  // ====================================================
  // Type Meaning
  //
  // What kind of entity could this be?
  // ====================================================

  const typeInference =
    inferEntityType({
      hint,

      expectedTypeConcepts,

      unknownEntities,

      existingEntityTypeConcepts:
        getExistingEntityTypeConcepts(
          entityTypeConceptMap
        ),
    });


  // ====================================================
  // Span / Mention Quality
  //
  // Is this text span itself likely to be a real entity?
  // ====================================================

  const spanQuality =
    scoreEntityHintQuality({
      hint,

      role,

      sourceCandidate:
        candidate,

      unknownEntities,
    });


  // ====================================================
  // Semantic Confidence
  //
  // Keep source semantic structure and type inference
  // separate from span quality.
  // ====================================================

  const sourceConfidence =
    Math.max(
      0,

      Math.min(
        1,

        candidate
          ?.confidence ??
        0.7
      )
    );


  const typeConfidence =
    Math.max(
      0,

      Math.min(
        1,

        typeInference
          ?.confidence ??
        0
      )
    );


  const semanticConfidence =
    Math.max(
      sourceConfidence,

      typeConfidence
    );


  // ====================================================
  // Final Confidence
  //
  // A bad span cannot be rescued by a strong type guess.
  // ====================================================

  const confidence =
    combineEntityConfidence(
      semanticConfidence,

      spanQuality.score
    );


  const qualityDisposition =
    getQualityDisposition(
      confidence
    );


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


    // ==================================================
    // Source
    // ==================================================

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


    // ==================================================
    // Confidence Breakdown
    // ==================================================

    confidence,

    spanConfidence:
      spanQuality.score,

    semanticConfidence,

    typeConfidence,

    sourceConfidence,

    qualityDisposition,

    qualityEvidence:
      spanQuality.evidence,


    // ==================================================
    // Type Inference
    // ==================================================

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

        entityTypeConceptMap,
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
// Semantic Entity Promotion
//
// Some ordinary field values represent reusable world
// concepts.
//
// Example:
//
// Alice is an Alchemist.
//
// field.occupation = "Alchemist"
//
// The field may remain text for backward compatibility,
// while Smart Import may ALSO suggest:
//
// Entity:
// Alchemist
//
// EntityType:
// Profession
//
// Whether promotion is allowed comes from registry.js.
// ======================================================

function normalizePromotableValue(
  value
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }


  if (
    typeof value !==
    "string"
  ) {
    return null;
  }


  const normalized =
    value
      .normalize(
        "NFKC"
      )
      .trim()
      .replace(
        /\s+/gu,
        " "
      );


  if (
    !normalized
  ) {
    return null;
  }


  /*
   * Do not promote entire paragraphs or descriptions.
   */
  if (
    normalized.length >
      80
  ) {
    return null;
  }


  /*
   * Obvious prose fragments are bad reusable entities.
   */
  if (
    /[。！？!?；;\n\r]/u.test(
      normalized
    )
  ) {
    return null;
  }


  return normalized;
}


// ======================================================
// Read Promotion Metadata
// ======================================================

function getFieldPromotionConfig(
  candidate
) {
  const fieldConcept =
    candidate
      ?.fieldConcept ||
    null;


  if (
    !fieldConcept
  ) {
    return null;
  }


  const definition =
    getConcept(
      fieldConcept
    );


  const targetTypeConcept =
    definition
      ?.promoteValueToEntityType ||
    null;


  if (
    !targetTypeConcept
  ) {
    return null;
  }


  return {
    fieldConcept,

    targetTypeConcept,

    confidence:
      Math.max(
        0,

        Math.min(
          1,

          definition
            ?.promotionConfidence ??
          0.75
        )
      ),
  };
}


// ======================================================
// Promote One Field Value
// ======================================================

function buildPromotedEntitySuggestion({
  candidate,

  entities,

  entityTypeConceptMap,

  unknownEntities,
}) {
  const config =
    getFieldPromotionConfig(
      candidate
    );


  if (
    !config
  ) {
    return null;
  }


  const value =
    normalizePromotableValue(
      candidate
        ?.normalizedValue ??
      candidate
        ?.value
    );


  if (
    !value
  ) {
    return null;
  }


  const expectedTypeConcepts = [
    config
      .targetTypeConcept,
  ];


  /*
   * First try Canon.
   *
   * If "Alchemist" already exists as Profession,
   * nothing should be suggested.
   */
  const existingResolution =
    resolveEntityHint(
      value,

      entities,

      {
        expectedTypeConcepts,

        entityTypeConceptMap,
      }
    );


  if (
    existingResolution
      .status ===
    "resolved"
  ) {
    return null;
  }


  /*
   * Ambiguous:
   *
   * Do not create another entity automatically.
   * The existing ambiguity must be resolved elsewhere.
   */
  if (
    existingResolution
      .status ===
    "ambiguous"
  ) {
    return null;
  }


  const promotionCandidate = {
    ...candidate,

    confidence:
      Math.min(
        0.95,

        Math.max(
          candidate
            ?.confidence ??
          0.7,

          config.confidence
        )
      ),

    promotedFromField:
      true,

    promotionFieldConcept:
      config
        .fieldConcept,

    promotionTargetTypeConcept:
      config
        .targetTypeConcept,
  };


  const suggestion =
    makeEntitySuggestion({
      hint:
        value,

      role:
        "field-value",

      candidate:
        promotionCandidate,

      expectedTypeConcepts,

      unknownEntities,

      entityTypeConceptMap,
    });


  return {
    ...suggestion,

    promotion: {
      fieldConcept:
        config
          .fieldConcept,

      targetTypeConcept:
        config
          .targetTypeConcept,

      sourceSubject:
        candidate
          ?.subjectHint ||
        null,
    },
  };
}


// ======================================================
// Promote Field Values
// ======================================================

function discoverPromotedEntitySuggestions({
  candidates = [],

  entities = [],

  entityTypeConceptMap = {},

  unknownEntities = [],
}) {
  const results =
    [];


  for (
    const candidate of
    candidates
  ) {
    if (
      candidate
        ?.candidateType !==
      "field-value"
    ) {
      continue;
    }


    const suggestion =
      buildPromotedEntitySuggestion({
        candidate,

        entities,

        entityTypeConceptMap,

        unknownEntities,
      });


    if (
      suggestion
    ) {
      results.push(
        suggestion
      );
    }
  }


  return results;
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


    // ==================================================
    // First Mention
    // ==================================================

    if (
      !existing
    ) {
      map.set(
        key,
        {
          ...suggestion,

          occurrenceCount:
            1,

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


    // ==================================================
    // Repeated Mention
    //
    // Repetition is contextual evidence.
    //
    // A malformed one-off fragment should remain weak.
    //
    // A real entity repeatedly appearing in independent
    // facts becomes more trustworthy.
    // ==================================================

    existing.occurrenceCount =
      (
        existing
          .occurrenceCount ||
        1
      ) +
      1;


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


    /*
     * Preserve the strongest independently observed span.
     */
    if (
      (
        suggestion
          .spanConfidence ||
        0
      ) >
      (
        existing
          .spanConfidence ||
        0
      )
    ) {
      existing.spanConfidence =
        suggestion
          .spanConfidence;


      existing.qualityEvidence =
        suggestion
          .qualityEvidence ||
        existing
          .qualityEvidence;
    }


    existing.semanticConfidence =
      Math.max(
        existing
          .semanticConfidence ||
        0,

        suggestion
          .semanticConfidence ||
        0
      );


    existing.typeConfidence =
      Math.max(
        existing
          .typeConfidence ||
        0,

        suggestion
          .typeConfidence ||
        0
      );


    existing.sourceConfidence =
      Math.max(
        existing
          .sourceConfidence ||
        0,

        suggestion
          .sourceConfidence ||
        0
      );


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


  // ====================================================
  // Repetition Calibration
  // ====================================================

  const merged =
    Array.from(
      map.values()
    );


  for (
    const suggestion of
    merged
  ) {
    const occurrenceCount =
      suggestion
        .occurrenceCount ||
      1;


    /*
     * Repeated mentions can recover a moderately uncertain
     * span.
     *
     * But repetition must NOT rescue something already
     * extremely weak.
     */
    if (
      occurrenceCount >
        1 &&
      suggestion.confidence >=
        0.32
    ) {
      const repetitionBonus =
        Math.min(
          0.12,

          (
            occurrenceCount -
            1
          ) *
          0.05
        );


      suggestion.confidence =
        Math.min(
          0.95,

          suggestion.confidence +
          repetitionBonus
        );
    }


    suggestion.qualityDisposition =
      getQualityDisposition(
        suggestion.confidence
      );
  }


  return merged;
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


  // ====================================================
  // Pass 1
  //
  // Resolve normal subject/object references against
  // Canon.
  // ====================================================

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


  // ====================================================
  // Pass 2
  //
  // Semantic Entity Promotion
  //
  // Example:
  //
  // field.occupation = Alchemist
  //
  // Registry says:
  //
  // promoteValueToEntityType =
  // entityType.profession
  //
  // Therefore "Alchemist" may become a reusable entity.
  // ====================================================

  const promotedEntitySuggestions =
    discoverPromotedEntitySuggestions({
      candidates:
        initiallyResolvedCandidates,

      entities,

      entityTypeConceptMap,

      unknownEntities,
    });


  rawEntitySuggestions.push(
    ...promotedEntitySuggestions
  );


  // ====================================================
  // Pass 3
  //
  // Merge repeated references to the same missing entity.
  // ====================================================

  const mergedEntitySuggestions =
    deduplicateEntitySuggestions(
      rawEntitySuggestions
    );


  // ======================================================
  // Candidate Quality Gate
  //
  // Suppressed suggestions are preserved for diagnostics,
  // but they do NOT:
  //
  // - create Draft Entities
  // - enter Semantic State as fake entities
  // - reach normal Smart Import suggestions
  //
  // Low-confidence candidates remain available for now.
  // We will fold them in the UI in the next step.
  // ======================================================

  const suppressedEntitySuggestions =
    mergedEntitySuggestions.filter(
      (
        suggestion
      ) =>
        suggestion
          .qualityDisposition ===
        "suppressed"
    );


  const entitySuggestions =
    mergedEntitySuggestions.filter(
      (
        suggestion
      ) =>
        suggestion
          .qualityDisposition !==
        "suppressed"
    );


  const draftEntities =
    buildDraftEntities(
      entitySuggestions
    );


  // ====================================================
  // Pass 5
  //
  // Attach Draft identities back onto candidate subjects
  // and objects.
  // ====================================================

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

  suppressedEntitySuggestions,

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

  normalizePromotableValue,

  getFieldPromotionConfig,

  buildPromotedEntitySuggestion,

  discoverPromotedEntitySuggestions,
};