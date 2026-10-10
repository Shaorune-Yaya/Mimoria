const {
  isConceptSameOrChildOf,
} = require(
  "./typeCompatibility"
);


// ======================================================
// Constants
// ======================================================

const SCORE_WEIGHTS = {
  // ====================================================
  // Structural / Semantic Context
  // ====================================================

  semanticExpectation:
    0.72,


  // ====================================================
  // Lexical Evidence
  // ====================================================

  lexicalExact:
    0.68,

  lexicalSuffix:
    0.58,

  lexicalNormal:
    0.38,

  lexicalWeak:
    0.18,


  // ====================================================
  // Existing Canon
  // ====================================================

  existingCanonCompatible:
    0.34,


  // ====================================================
  // First-Pass Inference
  //
  // The first pass is useful evidence, but must never
  // dominate stronger contextual information.
  // ====================================================

  priorInference:
    0.24,


  // ====================================================
  // Semantic Working Memory
  // ====================================================

  semanticMemoryType:
    0.58,

  semanticMemoryField:
    0.20,

  semanticMemoryMention:
    0.035,

  semanticMemorySalience:
    0.10,


  // ====================================================
  // Agreement
  // ====================================================

  evidenceAgreement:
    0.12,


  // ====================================================
  // Penalties
  // ====================================================

  semanticConflict:
    -0.48,

  semanticMemoryConflict:
    -0.34,

  internalSubstring:
    -0.42,

  incompatibleCanon:
    -0.30,
};


const BROAD_TYPE_PREFERENCE = [
  "entityType.character",
  "entityType.organization",
  "entityType.location",
  "entityType.item",
  "entityType.vehicle",
];


// ======================================================
// Helpers
// ======================================================

function clamp01(
  value
) {
  return Math.max(
    0,
    Math.min(
      1,
      Number(
        value
      ) || 0
    )
  );
}


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


function normalizeConcept(
  value
) {
  const result =
    String(
      value ||
      ""
    )
      .trim();


  return result ||
    null;
}


function addEvidence(
  scoreMap,
  conceptId,
  {
    score,
    source,
    reason,
    metadata =
      null,
  }
) {
  const normalizedConcept =
    normalizeConcept(
      conceptId
    );


  if (
    !normalizedConcept
  ) {
    return;
  }


  if (
    !scoreMap.has(
      normalizedConcept
    )
  ) {
    scoreMap.set(
      normalizedConcept,
      {
        conceptId:
          normalizedConcept,

        rawScore:
          0,

        evidence:
          [],
      }
    );
  }


  const entry =
    scoreMap.get(
      normalizedConcept
    );


  entry.rawScore +=
    score;


  entry.evidence.push({
    source,

    reason,

    score,

    metadata,
  });
}


// ======================================================
// Ontology Compatibility
// ======================================================

function conceptCompatibleWithAny(
  conceptId,
  expectedConcepts
) {
  if (
    !conceptId
  ) {
    return false;
  }


  if (
    !Array.isArray(
      expectedConcepts
    ) ||
    expectedConcepts.length ===
      0
  ) {
    return true;
  }


  return expectedConcepts.some(
    (
      expected
    ) =>
      conceptId ===
        expected ||
      isConceptSameOrChildOf(
        conceptId,
        expected
      ) ||
      isConceptSameOrChildOf(
        expected,
        conceptId
      )
  );
}


// ======================================================
// Expected Semantic Evidence
// ======================================================

function scoreExpectedTypes(
  scoreMap,
  expectedTypeConcepts
) {
  const expected =
    unique(
      expectedTypeConcepts
    );


  for (
    const conceptId of
    expected
  ) {
    addEvidence(
      scoreMap,
      conceptId,
      {
        score:
          SCORE_WEIGHTS
            .semanticExpectation,

        source:
          "semantic-expectation",

        reason:
          "candidate-role-expects-type",
      }
    );
  }
}


// ======================================================
// Unknown / Lexical Evidence
// ======================================================

function getLexicalWeight(
  item
) {
  const evidenceType =
    item
      ?.originalCandidate
      ?.evidence?.[0]
      ?.evidenceType ||
    item
      ?.evidenceType ||
    null;


  const strength =
    item
      ?.originalCandidate
      ?.evidence?.[0]
      ?.strength ||
    item
      ?.strength ||
    null;


  if (
    evidenceType ===
      "exact"
  ) {
    return SCORE_WEIGHTS
      .lexicalExact;
  }


  if (
    evidenceType ===
      "suffix"
  ) {
    return SCORE_WEIGHTS
      .lexicalSuffix;
  }


  if (
    strength ===
      "weak"
  ) {
    return SCORE_WEIGHTS
      .lexicalWeak;
  }


  return SCORE_WEIGHTS
    .lexicalNormal;
}


function scoreLexicalEvidence(
  scoreMap,
  unknownEvidence
) {
  for (
    const item of
    unknownEvidence ||
    []
  ) {
    if (
      !item?.typeConcept
    ) {
      continue;
    }


    const confidence =
      clamp01(
        item.confidence ??
        0.6
      );


    const baseWeight =
      getLexicalWeight(
        item
      );


    addEvidence(
      scoreMap,
      item.typeConcept,
      {
        score:
          baseWeight *
          confidence,

        source:
          "lexical",

        reason:
          item.nameMatchType ||
          "lexical-type-match",

        metadata: {
          confidence,

          source:
            item.source ||
            null,
        },
      }
    );
  }
}

// ======================================================
// First-Pass Type Prior
//
// Semantic refinement should not forget everything learned
// during the first pass.
//
// However, the prior receives deliberately less weight
// than strong contextual / semantic evidence.
// ======================================================

function scorePriorInference(
  scoreMap,
  {
    priorTypeConcept =
      null,

    priorTypeConfidence =
      0,
  } = {}
) {
  if (
    !priorTypeConcept
  ) {
    return;
  }


  const confidence =
    clamp01(
      priorTypeConfidence
    );


  addEvidence(
    scoreMap,
    priorTypeConcept,
    {
      score:
        SCORE_WEIGHTS
          .priorInference *
        confidence,

      source:
        "prior-inference",

      reason:
        "first-pass-type-inference",

      metadata: {
        confidence,
      },
    }
  );
}


// ======================================================
// Semantic Memory Helpers
// ======================================================

function getSemanticTypeEvidenceCount(
  semanticEntity,
  conceptId
) {
  if (
    !semanticEntity ||
    !conceptId
  ) {
    return 0;
  }


  const sources =
    new Set();


  for (
    const evidence of
    semanticEntity.evidence ||
    []
  ) {
    if (
      evidence?.kind !==
        "type" ||
      evidence?.concept !==
        conceptId
    ) {
      continue;
    }


    sources.add(
      evidence.source ||
      "unknown"
    );
  }


  return sources.size;
}


function getSemanticBestType(
  semanticEntity
) {
  if (
    !semanticEntity
  ) {
    return null;
  }


  const entries =
    Object.entries(
      semanticEntity
        .probableTypes ||
      {}
    );


  if (
    entries.length ===
    0
  ) {
    return null;
  }


  entries.sort(
    (
      a,
      b
    ) =>
      b[1] -
      a[1]
  );


  return {
    conceptId:
      entries[0][0],

    confidence:
      clamp01(
        entries[0][1]
      ),

    sourceCount:
      getSemanticTypeEvidenceCount(
        semanticEntity,
        entries[0][0]
      ),
  };
}


// ======================================================
// Semantic Memory Type Evidence
// ======================================================

function scoreSemanticMemoryTypes(
  scoreMap,
  semanticEntity
) {
  if (
    !semanticEntity
  ) {
    return;
  }


  for (
    const [
      conceptId,
      rawConfidence,
    ] of Object.entries(
      semanticEntity
        .probableTypes ||
      {}
    )
  ) {
    const confidence =
      clamp01(
        rawConfidence
      );


    const sourceCount =
      getSemanticTypeEvidenceCount(
        semanticEntity,
        conceptId
      );


    /*
     * One source may simply be the first-pass draft type.
     *
     * Several independent sources are significantly more
     * trustworthy.
     */
    const diversityFactor =
      sourceCount <=
        1
        ? 0.55
        : sourceCount ===
            2
          ? 0.78
          : 1;


    addEvidence(
      scoreMap,
      conceptId,
      {
        score:
          SCORE_WEIGHTS
            .semanticMemoryType *
          confidence *
          diversityFactor,

        source:
          "semantic-memory",

        reason:
          "remembered-type-evidence",

        metadata: {
          confidence,

          sourceCount,

          diversityFactor,
        },
      }
    );
  }
}


// ======================================================
// Semantic Field Evidence
//
// Certain fields strongly imply that their owner is a
// Character.
//
// This is deliberately ontology-level evidence instead of
// checking literal words in the source text.
// ======================================================

const CHARACTER_FIELD_CONCEPTS =
  new Set([
    "field.age",
    "field.gender",
    "field.pronouns",
    "field.occupation",
    "field.birthplace",
  ]);


function scoreSemanticMemoryFields(
  scoreMap,
  semanticEntity
) {
  if (
    !semanticEntity
  ) {
    return;
  }


  let totalCharacterFieldScore =
    0;


  for (
    const [
      fieldConcept,
      fieldData,
    ] of Object.entries(
      semanticEntity.fields ||
      {}
    )
  ) {
    if (
      !CHARACTER_FIELD_CONCEPTS.has(
        fieldConcept
      )
    ) {
      continue;
    }


    const confidence =
      clamp01(
        fieldData?.confidence ??
        0.7
      );


    totalCharacterFieldScore +=
      SCORE_WEIGHTS
        .semanticMemoryField *
      confidence;
  }


  /*
   * Avoid allowing a huge number of fields to create an
   * unlimited score.
   */
  totalCharacterFieldScore =
    Math.min(
      0.52,
      totalCharacterFieldScore
    );


  if (
    totalCharacterFieldScore <=
    0
  ) {
    return;
  }


  addEvidence(
    scoreMap,
    "entityType.character",
    {
      score:
        totalCharacterFieldScore,

      source:
        "semantic-memory-fields",

      reason:
        "character-like-field-set",

      metadata: {
        fieldConcepts:
          Object.keys(
            semanticEntity.fields ||
            {}
          )
            .filter(
              (
                fieldConcept
              ) =>
                CHARACTER_FIELD_CONCEPTS.has(
                  fieldConcept
                )
            ),
      },
    }
  );
}


// ======================================================
// Mention / Salience Reinforcement
//
// Salience alone does not determine WHAT an entity is.
//
// It only strengthens type beliefs already present in
// Semantic State.
// ======================================================

function scoreSemanticMemorySalience(
  scoreMap,
  semanticEntity
) {
  if (
    !semanticEntity
  ) {
    return;
  }


  const probableTypes =
    Object.keys(
      semanticEntity
        .probableTypes ||
      {}
    );


  if (
    probableTypes.length ===
    0
  ) {
    return;
  }


  const mentionCount =
    Math.max(
      0,
      Number(
        semanticEntity
          .mentionCount ||
        0
      )
    );


  const salience =
    clamp01(
      semanticEntity
        .salience ??
      0
    );


  const mentionBonus =
    Math.min(
      0.14,

      mentionCount *
      SCORE_WEIGHTS
        .semanticMemoryMention
    );


  const salienceBonus =
    SCORE_WEIGHTS
      .semanticMemorySalience *
    salience;


  for (
    const conceptId of
    probableTypes
  ) {
    addEvidence(
      scoreMap,
      conceptId,
      {
        score:
          mentionBonus +
          salienceBonus,

        source:
          "semantic-memory-salience",

        reason:
          "repeated-contextual-mention",

        metadata: {
          mentionCount,

          salience,
        },
      }
    );
  }
}


// ======================================================
// Semantic Memory Conflict
//
// Only strong, independently supported memory may punish
// incompatible interpretations.
//
// This prevents one bad first-pass guess from locking the
// system into itself forever.
// ======================================================

function applySemanticMemoryConflict(
  scoreMap,
  semanticEntity
) {
  const bestType =
    getSemanticBestType(
      semanticEntity
    );


  if (
    !bestType ||
    bestType.confidence <
      0.78 ||
    bestType.sourceCount <
      2
  ) {
    return;
  }


  for (
    const entry of
    scoreMap.values()
  ) {
    if (
      entry.conceptId ===
      bestType.conceptId
    ) {
      continue;
    }


    if (
      conceptCompatibleWithAny(
        entry.conceptId,
        [
          bestType.conceptId,
        ]
      )
    ) {
      continue;
    }


    addEvidence(
      scoreMap,
      entry.conceptId,
      {
        score:
          SCORE_WEIGHTS
            .semanticMemoryConflict,

        source:
          "semantic-memory-conflict",

        reason:
          "conflicts-with-established-memory",

        metadata: {
          establishedType:
            bestType.conceptId,

          establishedConfidence:
            bestType.confidence,

          sourceCount:
            bestType.sourceCount,
        },
      }
    );
  }
}

// ======================================================
// Compatibility Reward / Conflict Penalty
// ======================================================

function applySemanticCompatibility(
  scoreMap,
  expectedTypeConcepts
) {
  const expected =
    unique(
      expectedTypeConcepts
    );


  if (
    expected.length ===
    0
  ) {
    return;
  }


  for (
    const entry of
    scoreMap.values()
  ) {
    if (
      conceptCompatibleWithAny(
        entry.conceptId,
        expected
      )
    ) {
      addEvidence(
        scoreMap,
        entry.conceptId,
        {
          score:
            SCORE_WEIGHTS
              .evidenceAgreement,

          source:
            "semantic-compatibility",

          reason:
            "lexical-and-context-agree",
        }
      );
    } else {
      addEvidence(
        scoreMap,
        entry.conceptId,
        {
          score:
            SCORE_WEIGHTS
              .semanticConflict,

          source:
            "semantic-conflict",

          reason:
            "type-conflicts-with-context",
        }
      );
    }
  }
}


// ======================================================
// Canon Preference
//
// A major design principle for Mimoria:
//
// Reuse the user's existing schema whenever it is
// semantically compatible instead of constantly creating
// narrower EntityTypes.
// ======================================================

function scoreExistingEntityTypes(
  scoreMap,
  {
    existingEntityTypeConcepts = [],

    expectedTypeConcepts = [],
  } = {}
) {
  const expected =
    unique(
      expectedTypeConcepts
    );


  for (
    const conceptId of
    unique(
      existingEntityTypeConcepts
    )
  ) {
    /*
     * Existing Canon should strengthen a type only when:
     *
     * 1. the scorer already has evidence for it
     *
     * OR
     *
     * 2. semantic context explicitly expects a compatible
     *    type.
     *
     * This prevents every existing EntityType in the world
     * from receiving a bonus when there is no context.
     */
    const alreadyCandidate =
      scoreMap.has(
        conceptId
      );


    const semanticallyExpected =
      expected.length >
        0 &&
      conceptCompatibleWithAny(
        conceptId,
        expected
      );


    if (
      !alreadyCandidate &&
      !semanticallyExpected
    ) {
      continue;
    }


    addEvidence(
      scoreMap,
      conceptId,
      {
        score:
          SCORE_WEIGHTS
            .existingCanonCompatible,

        source:
          "existing-canon",

        reason:
          "compatible-existing-entity-type",
      }
    );
  }
}


// ======================================================
// Score Normalization
//
// We deliberately do NOT pretend these values are true
// probabilities.
//
// They are ranking confidence values.
// ======================================================

function normalizeScore(
  rawScore
) {
  /*
   * Smooth saturating transform.
   *
   * 0.0 -> 0
   * 0.5 -> ~0.39
   * 1.0 -> ~0.63
   * 2.0 -> ~0.86
   */
  if (
    rawScore <=
    0
  ) {
    return 0;
  }


  return (
    1 -
    Math.exp(
      -rawScore
    )
  );
}


// ======================================================
// Broad-Type Tie Preference
// ======================================================

function getBroadPreferenceIndex(
  conceptId
) {
  const index =
    BROAD_TYPE_PREFERENCE
      .indexOf(
        conceptId
      );


  return index >=
    0
    ? index
    : Number
        .MAX_SAFE_INTEGER;
}


// ======================================================
// Main
// ======================================================

function scoreEntityTypeCandidates({
  expectedTypeConcepts = [],

  unknownEvidence = [],

  existingEntityTypeConcepts = [],

  priorTypeConcept =
    null,

  priorTypeConfidence =
    0,

  semanticEntity =
    null,
}) {
  const scoreMap =
    new Map();


  // ====================================================
  // Structural Expectations
  // ====================================================

  scoreExpectedTypes(
    scoreMap,
    expectedTypeConcepts
  );


  // ====================================================
  // Lexical Evidence
  // ====================================================

  scoreLexicalEvidence(
    scoreMap,
    unknownEvidence
  );


  // ====================================================
  // First-Pass Prior
  // ====================================================

  scorePriorInference(
    scoreMap,
    {
      priorTypeConcept,

      priorTypeConfidence,
    }
  );


  // ====================================================
  // Semantic Working Memory
  // ====================================================

  scoreSemanticMemoryTypes(
    scoreMap,
    semanticEntity
  );


  scoreSemanticMemoryFields(
    scoreMap,
    semanticEntity
  );


  scoreSemanticMemorySalience(
    scoreMap,
    semanticEntity
  );


  // ====================================================
  // Existing Canon
  // ====================================================

  scoreExistingEntityTypes(
    scoreMap,
    {
      existingEntityTypeConcepts,

      expectedTypeConcepts,
    }
  );


  // ====================================================
  // Context Compatibility
  // ====================================================

  applySemanticCompatibility(
    scoreMap,
    expectedTypeConcepts
  );


  // ====================================================
  // Strong Memory Conflict
  // ====================================================

  applySemanticMemoryConflict(
    scoreMap,
    semanticEntity
  );


  // ====================================================
  // Ranking
  // ====================================================

  const ranked =
    Array.from(
      scoreMap.values()
    )
      .map(
        (
          entry
        ) => ({
          ...entry,

          score:
            normalizeScore(
              entry.rawScore
            ),
        })
      )
      .sort(
        (
          a,
          b
        ) => {
          const scoreDifference =
            b.score -
            a.score;


          if (
            Math.abs(
              scoreDifference
            ) >
            0.025
          ) {
            return scoreDifference;
          }


          return (
            getBroadPreferenceIndex(
              a.conceptId
            ) -
            getBroadPreferenceIndex(
              b.conceptId
            )
          );
        }
      );


  const best =
    ranked[0] ||
    null;


  const second =
    ranked[1] ||
    null;


  const margin =
    best
      ? best.score -
        (
          second?.score ||
          0
        )
      : 0;


  return {
    bestConcept:
      best?.conceptId ||
      null,

    confidence:
      best?.score ||
      0,

    margin,

    ranked,

    ambiguous:
      Boolean(
        best &&
        second &&
        margin <
          0.12
      ),

    semanticMemoryUsed:
      Boolean(
        semanticEntity
      ),
  };
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  SCORE_WEIGHTS,

  clamp01,

  conceptCompatibleWithAny,

  scoreEntityTypeCandidates,
};