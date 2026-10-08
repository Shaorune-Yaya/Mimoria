// ======================================================
// L3-A Entity Type Inference
//
// Combines:
//
// 1. Semantic expectations from L2/L3
// 2. Unknown Entity Discovery evidence from L1
//
// Designed to tolerate noisy unknown-entity spans.
// ======================================================


const {
  isConceptSameOrChildOf,
} = require(
  "./typeCompatibility"
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


function normalizeName(
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


// ======================================================
// Compatibility
// ======================================================

function isCompatibleWithExpected(
  candidateType,
  expectedTypes
) {
  if (
    !candidateType
  ) {
    return false;
  }


  if (
    !Array.isArray(
      expectedTypes
    ) ||
    expectedTypes.length ===
      0
  ) {
    return true;
  }


  return expectedTypes.some(
    (expected) => {
      if (
        candidateType ===
        expected
      ) {
        return true;
      }


      return isConceptSameOrChildOf(
        candidateType,
        expected
      );
    }
  );
}


// ======================================================
// Alternative Type Helpers
// ======================================================

function getAlternativeTypeConcept(
  alternative
) {
  if (!alternative) {
    return null;
  }


  if (
    typeof alternative ===
    "string"
  ) {
    return alternative;
  }


  return (
    alternative.likelyType ||
    alternative.typeConcept ||
    alternative.conceptId ||
    alternative.type ||
    null
  );
}


function getAlternativeConfidence(
  alternative,
  fallback = 0.6
) {
  if (
    !alternative ||
    typeof alternative ===
      "string"
  ) {
    return fallback;
  }


  return (
    alternative.confidence ??
    alternative.score ??
    fallback
  );
}


// ======================================================
// Unknown Candidate Name Matching
// ======================================================

function calculateUnknownNameMatch({
  hint,
  candidateName,
}) {
  const normalizedHint =
    normalizeName(
      hint
    );


  const normalizedCandidate =
    normalizeName(
      candidateName
    );


  if (
    !normalizedHint ||
    !normalizedCandidate
  ) {
    return null;
  }


  /*
   * Exact evidence:
   *
   * Black Moon Order
   * == Black Moon Order
   */
  if (
    normalizedHint ===
    normalizedCandidate
  ) {
    return {
      matchType:
        "exact",

      score:
        1,
    };
  }


  /*
   * Conservative Chinese/noisy-span recovery:
   *
   * hint:
   * 银月公会
   *
   * L1 candidate:
   * 牙牙加入银月公会
   *
   * Only suffix containment is accepted because object
   * hints commonly occur at the end of noisy Chinese
   * unknown-entity spans.
   */
  if (
    normalizedHint.length >=
      2 &&
    normalizedCandidate.endsWith(
      normalizedHint
    )
  ) {
    return {
      matchType:
        "candidate-ends-with-hint",

      score:
        0.88,
    };
  }


  /*
   * Rare reverse case:
   *
   * hint may contain a more specific phrase than L1.
   */
  if (
    normalizedCandidate.length >=
      3 &&
    normalizedHint.endsWith(
      normalizedCandidate
    )
  ) {
    return {
      matchType:
        "hint-ends-with-candidate",

      score:
        0.8,
    };
  }


  return null;
}


// ======================================================
// Expand Unknown Evidence
// ======================================================

function expandUnknownCandidate(
  candidate,
  nameMatch
) {
  const results =
    [];


  if (
    candidate.likelyType
  ) {
    results.push({
      typeConcept:
        candidate.likelyType,

      confidence:
        Math.min(
          1,
          (
            candidate.confidence ??
            0.7
          ) *
            nameMatch.score
        ),

      source:
        "primary",

      nameMatchType:
        nameMatch.matchType,

      originalCandidate:
        candidate,
    });
  }


  for (
    const alternative of
    candidate.alternativeTypes ||
    []
  ) {
    const typeConcept =
      getAlternativeTypeConcept(
        alternative
      );


    if (!typeConcept) {
      continue;
    }


    results.push({
      typeConcept,

      confidence:
        Math.min(
          1,
          getAlternativeConfidence(
            alternative,
            0.6
          ) *
            nameMatch.score
        ),

      source:
        "alternative",

      nameMatchType:
        nameMatch.matchType,

      originalCandidate:
        candidate,

      originalAlternative:
        alternative,
    });
  }


  return results;
}


// ======================================================
// Find Evidence
// ======================================================

function findUnknownEntityEvidence({
  hint,
  unknownEntities,
}) {
  const evidence =
    [];


  for (
    const candidate of
    unknownEntities ||
    []
  ) {
    const nameMatch =
      calculateUnknownNameMatch({
        hint,

        candidateName:
          candidate.name,
      });


    if (!nameMatch) {
      continue;
    }


    evidence.push(
      ...expandUnknownCandidate(
        candidate,
        nameMatch
      )
    );
  }


  return evidence.sort(
    (
      a,
      b
    ) =>
      b.confidence -
      a.confidence
  );
}


// ======================================================
// Broad Fallback
// ======================================================

function chooseBroadExpectedType(
  expectedTypeConcepts
) {
  const expected =
    unique(
      expectedTypeConcepts
    );


  const preferred = [
    "entityType.character",
    "entityType.organization",
    "entityType.location",
    "entityType.vehicle",
    "entityType.spacecraft",
    "entityType.planet",
    "entityType.spaceStation",
  ];


  for (
    const concept of
    preferred
  ) {
    if (
      expected.includes(
        concept
      )
    ) {
      return concept;
    }
  }


  if (
    expected.length ===
    1
  ) {
    return expected[0];
  }


  return null;
}


// ======================================================
// Main Inference
// ======================================================

function inferEntityType({
  hint,

  expectedTypeConcepts = [],

  unknownEntities = [],
}) {
  const evidence =
    findUnknownEntityEvidence({
      hint,
      unknownEntities,
    });


  /*
   * No lexical type evidence.
   *
   * Example:
   * 黑石港 currently has no L1 unknown candidate.
   *
   * Fall back safely to semantic expectation:
   * location.
   */
  if (
    evidence.length ===
    0
  ) {
    return {
      status:
        "semantic-only",

      likelyTypeConcept:
        chooseBroadExpectedType(
          expectedTypeConcepts
        ),

      confidence:
        0.6,

      unknownEvidence:
        [],

      expectedTypeConcepts:
        unique(
          expectedTypeConcepts
        ),
    };
  }


  /*
   * Select the strongest evidence that is compatible
   * with event/relation semantics.
   *
   * This also allows an alternativeTypes entry to beat
   * an incompatible primary prediction.
   */
  const compatibleEvidence =
    evidence.filter(
      (item) =>
        isCompatibleWithExpected(
          item.typeConcept,
          expectedTypeConcepts
        )
    );


  if (
    compatibleEvidence.length >
    0
  ) {
    const best =
      compatibleEvidence[0];


    return {
      status:
        "intersected",

      likelyTypeConcept:
        best.typeConcept,

      confidence:
        Math.min(
          1,
          best.confidence +
            0.08
        ),

      unknownEvidence:
        evidence,

      expectedTypeConcepts:
        unique(
          expectedTypeConcepts
        ),

      matchedUnknownEvidence:
        best,
    };
  }


  /*
   * We found lexical evidence, but none of it agrees
   * with semantic expectations.
   *
   * Do not trust either side blindly.
   */
  return {
    status:
      "type-conflict",

    likelyTypeConcept:
      chooseBroadExpectedType(
        expectedTypeConcepts
      ),

    confidence:
      0.5,

    unknownEvidence:
      evidence,

    expectedTypeConcepts:
      unique(
        expectedTypeConcepts
      ),

    conflictingTypeConcepts:
      unique(
        evidence.map(
          (item) =>
            item.typeConcept
        )
      ),
  };
}


module.exports = {
  normalizeName,

  getAlternativeTypeConcept,
  getAlternativeConfidence,

  calculateUnknownNameMatch,
  findUnknownEntityEvidence,

  isCompatibleWithExpected,

  chooseBroadExpectedType,

  inferEntityType,
};