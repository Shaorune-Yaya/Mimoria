const {
  isConceptSameOrChildOf,
  getExpectedTypeConcepts,
} = require(
  "./typeCompatibility"
);


const {
  findSemanticEntityByName,
  getBestType,
} = require(
  "./semanticState"
);


// ======================================================
// Weights
// ======================================================

const RELATION_SCORE_WEIGHTS = {
  subjectTypeCompatible:
    0.46,

  objectTypeCompatible:
    0.54,

  subjectMemoryType:
    0.24,

  objectMemoryType:
    0.28,

  subjectSalience:
    0.08,

  objectSalience:
    0.06,

  existingRelationMemory:
    0.18,

  incompatibleSubject:
    -0.40,

  incompatibleObject:
    -0.48,
};


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


function normalizeRelationConcept(
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


function conceptMatchesAny(
  actualConcept,
  expectedConcepts = []
) {
  if (
    !actualConcept
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
      actualConcept ===
        expected ||
      isConceptSameOrChildOf(
        actualConcept,
        expected
      ) ||
      isConceptSameOrChildOf(
        expected,
        actualConcept
      )
  );
}


function addEvidence(
  result,
  {
    score,
    source,
    reason,
    metadata = null,
  }
) {
  result.rawScore +=
    score;


  result.evidence.push({
    score,

    source,

    reason,

    metadata,
  });
}


// ======================================================
// Expected Type Helpers
// ======================================================

function getRelationExpectedTypes(
  candidate
) {
  return {
    subjectExpected:
      getExpectedTypeConcepts({
        candidate,

        role:
          "subject",
      }),

    objectExpected:
      getExpectedTypeConcepts({
        candidate,

        role:
          "object",
      }),
  };
}


// ======================================================
// Semantic Entity Helpers
// ======================================================

function getSemanticEntityType(
  semanticEntity
) {
  const best =
    getBestType(
      semanticEntity
    );


  if (
    !best
  ) {
    return {
      concept:
        null,

      confidence:
        0,
    };
  }


  return {
    concept:
      best.concept,

    confidence:
      clamp01(
        best.confidence
      ),
  };
}


// ======================================================
// Relation Memory
// ======================================================

function hasExistingRelationEvidence(
  subjectEntity,
  relationConcept,
  objectName
) {
  if (
    !subjectEntity ||
    !relationConcept ||
    !objectName
  ) {
    return false;
  }


  const existing =
    subjectEntity
      .relations[
        relationConcept
      ];


  if (
    !Array.isArray(
      existing
    )
  ) {
    return false;
  }


  return existing.some(
    (
      item
    ) =>
      item?.targetName ===
      objectName
  );
}


// ======================================================
// Main Scorer
// ======================================================

function scoreRelationCandidate({
  candidate,

  semanticState,
}) {
  const relationConcept =
    normalizeRelationConcept(
      candidate
        ?.relationConcept
    );


  const result = {
    relationConcept,

    rawScore:
      0,

    score:
      0,

    evidence:
      [],

    subjectSemanticEntity:
      null,

    objectSemanticEntity:
      null,

    subjectExpectedTypes:
      [],

    objectExpectedTypes:
      [],
  };


  if (
    !relationConcept
  ) {
    return result;
  }


  const {
    subjectExpected,
    objectExpected,
  } =
    getRelationExpectedTypes(
      candidate
    );


  result.subjectExpectedTypes =
    subjectExpected;


  result.objectExpectedTypes =
    objectExpected;


  const subjectEntity =
    findSemanticEntityByName(
      semanticState,
      candidate
        ?.subjectHint
    );


  const objectEntity =
    findSemanticEntityByName(
      semanticState,
      candidate
        ?.objectHint
    );


  result.subjectSemanticEntity =
    subjectEntity;


  result.objectSemanticEntity =
    objectEntity;


  // ====================================================
  // Subject Type
  // ====================================================

  const subjectType =
    getSemanticEntityType(
      subjectEntity
    );


  if (
    subjectType.concept
  ) {
    if (
      conceptMatchesAny(
        subjectType.concept,
        subjectExpected
      )
    ) {
      addEvidence(
        result,
        {
          score:
            RELATION_SCORE_WEIGHTS
              .subjectTypeCompatible *
            subjectType.confidence,

          source:
            "relation-subject-type",

          reason:
            "subject-type-compatible",

          metadata: {
            concept:
              subjectType.concept,

            confidence:
              subjectType.confidence,
          },
        }
      );
    } else {
      addEvidence(
        result,
        {
          score:
            RELATION_SCORE_WEIGHTS
              .incompatibleSubject,

          source:
            "relation-subject-type",

          reason:
            "subject-type-conflict",

          metadata: {
            concept:
              subjectType.concept,

            expected:
              subjectExpected,
          },
        }
      );
    }
  }


  // ====================================================
  // Object Type
  // ====================================================

  const objectType =
    getSemanticEntityType(
      objectEntity
    );


  if (
    objectType.concept
  ) {
    if (
      conceptMatchesAny(
        objectType.concept,
        objectExpected
      )
    ) {
      addEvidence(
        result,
        {
          score:
            RELATION_SCORE_WEIGHTS
              .objectTypeCompatible *
            objectType.confidence,

          source:
            "relation-object-type",

          reason:
            "object-type-compatible",

          metadata: {
            concept:
              objectType.concept,

            confidence:
              objectType.confidence,
          },
        }
      );
    } else {
      addEvidence(
        result,
        {
          score:
            RELATION_SCORE_WEIGHTS
              .incompatibleObject,

          source:
            "relation-object-type",

          reason:
            "object-type-conflict",

          metadata: {
            concept:
              objectType.concept,

            expected:
              objectExpected,
          },
        }
      );
    }
  }


  // ====================================================
  // Semantic Memory Confidence
  // ====================================================

  if (
    subjectEntity &&
    subjectType.concept
  ) {
    addEvidence(
      result,
      {
        score:
          RELATION_SCORE_WEIGHTS
            .subjectMemoryType *
          subjectType.confidence,

        source:
          "semantic-memory",

        reason:
          "subject-memory-support",
      }
    );
  }


  if (
    objectEntity &&
    objectType.concept
  ) {
    addEvidence(
      result,
      {
        score:
          RELATION_SCORE_WEIGHTS
            .objectMemoryType *
          objectType.confidence,

        source:
          "semantic-memory",

        reason:
          "object-memory-support",
      }
    );
  }


  // ====================================================
  // Salience
  // ====================================================

  if (
    subjectEntity
  ) {
    addEvidence(
      result,
      {
        score:
          RELATION_SCORE_WEIGHTS
            .subjectSalience *
          clamp01(
            subjectEntity.salience
          ),

        source:
          "semantic-salience",

        reason:
          "subject-is-discourse-salient",
      }
    );
  }


  if (
    objectEntity
  ) {
    addEvidence(
      result,
      {
        score:
          RELATION_SCORE_WEIGHTS
            .objectSalience *
          clamp01(
            objectEntity.salience
          ),

        source:
          "semantic-salience",

        reason:
          "object-is-discourse-salient",
      }
    );
  }


  // ====================================================
  // Existing Relation Memory
  // ====================================================

  if (
    hasExistingRelationEvidence(
      subjectEntity,
      relationConcept,
      candidate
        ?.objectHint
    )
  ) {
    addEvidence(
      result,
      {
        score:
          RELATION_SCORE_WEIGHTS
            .existingRelationMemory,

        source:
          "relation-memory",

        reason:
          "same-relation-already-observed",
      }
    );
  }


  // ====================================================
  // Normalize
  // ====================================================

  result.score =
    result.rawScore <=
      0
      ? 0
      : (
          1 -
          Math.exp(
            -result.rawScore
          )
        );


  result.score =
    clamp01(
      result.score
    );


  return result;
}


// ======================================================
// Batch
// ======================================================

function scoreRelationCandidates({
  candidates = [],

  semanticState,
}) {
  return (
    candidates ||
    []
  )
    .map(
      (
        candidate
      ) => {
        const semanticRelationScoring =
          scoreRelationCandidate({
            candidate,

            semanticState,
          });


        return {
          ...candidate,

          semanticRelationScoring,

          semanticRelationConfidence:
            semanticRelationScoring
              .score,
        };
      }
    );
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  RELATION_SCORE_WEIGHTS,

  conceptMatchesAny,

  scoreRelationCandidate,

  scoreRelationCandidates,
};