// ======================================================
// L2 Candidate Quality Scoring
//
// Determines whether a text span itself looks like a
// plausible entity mention.
//
// IMPORTANT:
//
// This layer does NOT decide:
//
// "What type of entity is this?"
//
// It decides:
//
// "Is this span probably an entity mention at all?"
//
// This separates:
//
// spanConfidence
//
// from:
//
// typeConfidence
//
// Mimoria can therefore avoid situations such as:
//
// "朋友艾琳留"
//   typeConfidence = 0.95
//
// while ignoring:
//
//   spanConfidence = 0.20
//
// Lexicons are supporting evidence only.
// Structure and context have higher authority.
// ======================================================


// ======================================================
// Thresholds
// ======================================================

const QUALITY_THRESHOLDS = {
  normal:
    0.72,

  lowConfidence:
    0.45,
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


function normalizeText(
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
    .replace(
      /\s+/gu,
      " "
    )
    .toLowerCase();
}


function inferLocale(
  value
) {
  const text =
    String(
      value ||
      ""
    );


  if (
    /[\p{Script=Han}]/u.test(
      text
    )
  ) {
    return "zh-CN";
  }


  return "en";
}


function isChineseLocale(
  locale
) {
  return String(
    locale ||
    ""
  )
    .toLowerCase()
    .startsWith(
      "zh"
    );
}


function rangesOverlap(
  startA,
  endA,
  startB,
  endB
) {
  if (
    !Number.isFinite(
      startA
    ) ||
    !Number.isFinite(
      endA
    ) ||
    !Number.isFinite(
      startB
    ) ||
    !Number.isFinite(
      endB
    )
  ) {
    return false;
  }


  return (
    startA <
      endB &&
    endA >
      startB
  );
}


// ======================================================
// Grammatical Fragment Detection
//
// These are CLOSED-CLASS grammatical forms.
//
// They are not worldbuilding vocabulary.
//
// We intentionally do NOT put:
//
// city names
// professions
// organizations
// fantasy words
// sci-fi words
//
// here.
//
// This is equivalent to identifying grammatical function
// tokens, not building a topic dictionary.
// ======================================================

function isChineseGrammaticalFragment(
  value
) {
  const text =
    normalizeText(
      value
    );


  if (
    !text
  ) {
    return true;
  }


  /*
   * Standalone pronouns / deixis / discourse adverbs.
   */
  if (
    /^(?:他|她|它|他们|她们|它们|这|那|这里|那里|哪里|此处|彼处|当地|目前|现在|后来|随后|然后|接着|最终|最后|经常|常常|仍|仍然|则|又|也|还|曾|曾经|已经|正在|当)$/u.test(
      text
    )
  ) {
    return true;
  }


  /*
   * Pronoun + grammatical residue.
   *
   * 她仍
   * 他也
   * 它还
   */
  if (
    /^(?:他|她|它|他们|她们|它们)(?:仍|仍然|也|又|则|还|曾|已经|正在|会|将)$/u.test(
      text
    )
  ) {
    return true;
  }


  return false;
}


function isEnglishGrammaticalFragment(
  value
) {
  const text =
    normalizeText(
      value
    );


  if (
    !text
  ) {
    return true;
  }


  return /^(?:he|she|it|they|him|her|them|here|there|where|now|currently|later|then|still|again|often|usually|already)$/iu.test(
    text
  );
}


function isGrammaticalFragment({
  value,

  locale,
}) {
  if (
    isChineseLocale(
      locale
    )
  ) {
    return isChineseGrammaticalFragment(
      value
    );
  }


  return isEnglishGrammaticalFragment(
    value
  );
}


// ======================================================
// Evidence Builder
// ======================================================

function addEvidence(
  result,
  {
    score,

    feature,

    reason,

    metadata =
      null,
  }
) {
  result.rawScore +=
    score;


  result.evidence.push({
    score,

    feature,

    reason,

    metadata,
  });
}


// ======================================================
// Lexical Support
//
// Deliberately LOW weight.
//
// Lexicon proposes.
// It does not decide.
// ======================================================

function scoreLexicalSupport(
  result,
  evidence = []
) {
  let lexicalBonus =
    0;


  for (
    const item of
    evidence ||
    []
  ) {
    const evidenceType =
      item?.evidenceType ||
      null;


    const strength =
      item?.strength ||
      null;


    if (
      evidenceType ===
      "exact"
    ) {
      lexicalBonus +=
        0.12;
    } else if (
      evidenceType ===
      "suffix"
    ) {
      lexicalBonus +=
        0.08;
    } else {
      lexicalBonus +=
        0.03;
    }


    if (
      strength ===
      "strong"
    ) {
      lexicalBonus +=
        0.04;
    }


    if (
      strength ===
      "weak"
    ) {
      lexicalBonus -=
        0.03;
    }
  }


  lexicalBonus =
    Math.max(
      -0.05,

      Math.min(
        0.16,

        lexicalBonus
      )
    );


  if (
    lexicalBonus !==
    0
  ) {
    addEvidence(
      result,
      {
        score:
          lexicalBonus,

        feature:
          "lexical-support",

        reason:
          "lexicon-provides-supporting-evidence",
      }
    );
  }
}


// ======================================================
// Semantic Span Contamination
//
// If a candidate Entity span swallows an already-known
// predicate / field / event, the span is suspicious.
//
// Example:
//
// 北境采集稀有药材
//
// if "采集" has already been recognized as an Event,
// the entity span crossing it should lose confidence.
//
// This uses semantic structure already discovered by the
// pipeline.
//
// It does NOT maintain a hard-coded verb dictionary.
// ======================================================

function scoreSemanticContamination(
  result,
  {
    start,

    end,

    semanticMatches = [],
  }
) {
  if (
    !Number.isFinite(
      start
    ) ||
    !Number.isFinite(
      end
    )
  ) {
    return;
  }


  for (
    const match of
    semanticMatches ||
    []
  ) {
    if (
      !rangesOverlap(
        start,
        end,
        match?.start,
        match?.end
      )
    ) {
      continue;
    }


    const kind =
      match
        ?.concept
        ?.kind ||
      null;


    /*
     * Entity-type evidence is allowed inside an Entity.
     *
     * 河谷城
     *     城
     */
    if (
      kind ===
      "entity-type"
    ) {
      continue;
    }


    if (
      kind ===
        "relation" ||
      kind ===
        "event"
    ) {
      addEvidence(
        result,
        {
          score:
            -0.48,

          feature:
            "predicate-contamination",

          reason:
            "entity-span-overlaps-predicate",

          metadata: {
            conceptId:
              match.conceptId ||
              null,

            expression:
              match.expression ||
              null,
          },
        }
      );


      continue;
    }


    if (
      kind ===
        "field" ||
      kind ===
        "role-signal"
    ) {
      addEvidence(
        result,
        {
          score:
            -0.16,

          feature:
            "semantic-contamination",

          reason:
            "entity-span-overlaps-semantic-expression",

          metadata: {
            conceptId:
              match.conceptId ||
              null,
          },
        }
      );
    }
  }
}


// ======================================================
// Name Shape
// ======================================================

function scoreNameShape(
  result,
  {
    name,

    locale,

    hasIndependentSupport =
      false,

    role =
      null,
  }
) {
  const normalized =
    normalizeText(
      name
    );


  if (
    !normalized
  ) {
    addEvidence(
      result,
      {
        score:
          -1,

        feature:
          "empty-span",

        reason:
          "candidate-has-no-text",
      }
    );


    return;
  }


  if (
    isGrammaticalFragment({
      value:
        normalized,

      locale,
    })
  ) {
    addEvidence(
      result,
      {
        score:
          -0.62,

        feature:
          "grammatical-fragment",

        reason:
          "span-is-grammatical-not-entity",
      }
    );
  }


  if (
    isChineseLocale(
      locale
    )
  ) {
    const length =
      Array.from(
        normalized
      ).length;


    if (
      length ===
      1
    ) {
      addEvidence(
        result,
        {
          score:
            -0.52,

          feature:
            "single-character",

          reason:
            "single-character-unknown-entity-is-weak",
        }
      );
    } else if (
      length >=
        2 &&
      length <=
        8
    ) {
      addEvidence(
        result,
        {
          score:
            0.08,

          feature:
            "reasonable-length",

          reason:
            "span-length-is-plausible",
        }
      );
    }


    /*
     * Long Chinese subject/object spans without
     * independent evidence are often predicate-contaminated
     * fragments.
     *
     * Examples:
     *
     * 朋友艾琳留
     * 北境采集稀有药材
     *
     * A real long proper noun can recover through:
     *
     * - entity suffix evidence
     * - repeated mentions
     * - Canon match
     * - later semantic memory
     */
    if (
      !hasIndependentSupport &&
      (
        role ===
          "subject" ||
        role ===
          "object"
      ) &&
      length >=
        5
    ) {
      addEvidence(
        result,
        {
          score:
            -0.45,

          feature:
            "long-unanchored-span",

          reason:
            "structured-entity-span-is-long-without-independent-support",

          metadata: {
            length,

            role,
          },
        }
      );
    }


    if (
      length >
      12
    ) {
      addEvidence(
        result,
        {
          score:
            -0.22,

          feature:
            "excessive-length",

          reason:
            "span-is-too-long-for-typical-entity-mention",
        }
      );
    }


    /*
     * Closed-class discourse particles inside an otherwise
     * unsupported candidate are suspicious.
     *
     * 父亲则留
     * 她仍
     *
     * Again, this is grammar, not topical vocabulary.
     */
    if (
      !hasIndependentSupport &&
      /(?:则|仍|仍然|又|也|还|已经|正在)/u.test(
        normalized
      )
    ) {
      addEvidence(
        result,
        {
          score:
            -0.24,

          feature:
            "discourse-particle-contamination",

          reason:
            "span-contains-discourse-grammar",
        }
      );
    }


    return;
  }


  const tokenCount =
    normalized
      .split(
        /\s+/u
      )
      .filter(
        Boolean
      )
      .length;


  if (
    tokenCount >=
      1 &&
    tokenCount <=
      4
  ) {
    addEvidence(
      result,
      {
        score:
          0.07,

        feature:
          "reasonable-token-count",

        reason:
          "english-name-length-is-plausible",
      }
    );
  }


  if (
    !hasIndependentSupport &&
    tokenCount >
      5
  ) {
    addEvidence(
      result,
      {
        score:
          -0.30,

        feature:
          "long-unanchored-span",

        reason:
          "english-span-is-too-long-without-support",
      }
    );
  }
}


// ======================================================
// Boundaries
// ======================================================

function scoreTextBoundaries(
  result,
  {
    text,

    start,

    end,

    locale,
  }
) {
  if (
    !text ||
    !Number.isFinite(
      start
    ) ||
    !Number.isFinite(
      end
    )
  ) {
    return;
  }


  const before =
    start >
      0
      ? text[
          start -
          1
        ]
      : null;


  const after =
    end <
      text.length
      ? text[
          end
        ]
      : null;


  const boundaryPattern =
    isChineseLocale(
      locale
    )
      ? /[\s，。！？；：、,.!?;:"“”'‘’（）()]/u
      : /[\s,.;:!?()"“”'‘’]/u;


  if (
    before ===
      null ||
    boundaryPattern.test(
      before
    )
  ) {
    addEvidence(
      result,
      {
        score:
          0.04,

        feature:
          "left-boundary",

        reason:
          "span-start-aligns-with-boundary",
      }
    );
  }


  if (
    after ===
      null ||
    boundaryPattern.test(
      after
    )
  ) {
    addEvidence(
      result,
      {
        score:
          0.04,

        feature:
          "right-boundary",

        reason:
          "span-end-aligns-with-boundary",
      }
    );
  }
}


// ======================================================
// Unknown Entity Quality
// ======================================================

function scoreUnknownEntityCandidate({
  candidate,

  text = "",

  semanticMatches = [],

  locale = null,
}) {
  const resolvedLocale =
    locale ||
    candidate?.locale ||
    inferLocale(
      candidate?.name
    );


  const result = {
    rawScore:
      0.48,

    score:
      0,

    quality:
      "unknown",

    evidence:
      [],
  };


  const lexicalEvidence =
    candidate
      ?.evidence ||
    [];


  const hasIndependentSupport =
    lexicalEvidence.some(
      (
        item
      ) =>
        item?.evidenceType ===
          "exact" ||
        item?.evidenceType ===
          "suffix"
    );


  scoreLexicalSupport(
    result,
    lexicalEvidence
  );


  scoreNameShape(
    result,
    {
      name:
        candidate?.name,

      locale:
        resolvedLocale,

      hasIndependentSupport,
    }
  );


  scoreSemanticContamination(
    result,
    {
      start:
        candidate?.start,

      end:
        candidate?.end,

      semanticMatches,
    }
  );


  scoreTextBoundaries(
    result,
    {
      text,

      start:
        candidate?.start,

      end:
        candidate?.end,

      locale:
        resolvedLocale,
    }
  );


  result.score =
    clamp01(
      result.rawScore
    );


  result.quality =
    getQualityDisposition(
      result.score
    );


  return result;
}


// ======================================================
// Unknown Support Lookup
// ======================================================

function findUnknownEntitySupport(
  hint,
  unknownEntities = []
) {
  const normalizedHint =
    normalizeText(
      hint
    );


  if (
    !normalizedHint
  ) {
    return [];
  }


  return (
    unknownEntities ||
    []
  )
    .filter(
      (
        item
      ) =>
        normalizeText(
          item?.name
        ) ===
        normalizedHint
    )
    .sort(
      (
        a,
        b
      ) =>
        (
          b?.spanConfidence ??
          b?.confidence ??
          0
        ) -
        (
          a?.spanConfidence ??
          a?.confidence ??
          0
        )
    );
}


// ======================================================
// Entity Hint Quality
//
// Used when structured extraction proposes:
//
// subjectHint
// objectHint
// field reference value
//
// This is especially important because structural type
// expectations can otherwise give malformed spans a high
// EntityType confidence.
// ======================================================

function scoreEntityHintQuality({
  hint,

  role = null,

  sourceCandidate =
    null,

  unknownEntities = [],

  locale = null,
}) {
  const resolvedLocale =
    locale ||
    inferLocale(
      hint
    );


  const support =
    findUnknownEntitySupport(
      hint,
      unknownEntities
    );


  const bestSupport =
    support[0] ||
    null;


  const hasIndependentSupport =
    Boolean(
      bestSupport
    );


  const result = {
    rawScore:
      0.48,

    score:
      0,

    quality:
      "unknown",

    evidence:
      [],
  };


  // ----------------------------------------------------
  // Structural Role
  //
  // Structure matters more than lexicon.
  // ----------------------------------------------------

  if (
    [
      "subject",
      "object",
      "field-value",
    ].includes(
      role
    )
  ) {
    addEvidence(
      result,
      {
        score:
          0.12,

        feature:
          "structured-role",

        reason:
          "candidate-was-extracted-from-semantic-structure",

        metadata: {
          role,
        },
      }
    );
  }


  if (
    sourceCandidate
      ?.relationConcept ||
    sourceCandidate
      ?.eventConcept ||
    sourceCandidate
      ?.fieldConcept
  ) {
    addEvidence(
      result,
      {
        score:
          0.04,

        feature:
          "semantic-anchor",

        reason:
          "candidate-originates-from-semantic-fact",
      }
    );
  }


  // ----------------------------------------------------
  // Independent Unknown-Entity Evidence
  // ----------------------------------------------------

  if (
    bestSupport
  ) {
    const supportConfidence =
      clamp01(
        bestSupport
          ?.spanConfidence ??
        bestSupport
          ?.confidence ??
        0
      );


    addEvidence(
      result,
      {
        score:
          0.34 *
          supportConfidence,

        feature:
          "independent-mention-support",

        reason:
          "same-span-was-independently-detected",

        metadata: {
          supportConfidence,

          likelyType:
            bestSupport
              ?.likelyType ||
            null,
        },
      }
    );
  }


  scoreNameShape(
    result,
    {
      name:
        hint,

      locale:
        resolvedLocale,

      hasIndependentSupport,

      role,
    }
  );


  result.score =
    clamp01(
      result.rawScore
    );


  result.quality =
    getQualityDisposition(
      result.score
    );


  return result;
}


// ======================================================
// Confidence Calibration
//
// Weakest-link style.
//
// A 95% type prediction should NOT rescue a 20% span.
//
// Example:
//
// typeConfidence = 0.95
// spanConfidence = 0.20
//
// final ≈ 0.35
//
// Conversely:
//
// typeConfidence = 0.95
// spanConfidence = 0.85
//
// final ≈ 0.87
// ======================================================

function combineEntityConfidence(
  semanticConfidence,
  spanConfidence
) {
  const semantic =
    clamp01(
      semanticConfidence
    );


  const span =
    clamp01(
      spanConfidence
    );


  const low =
    Math.min(
      semantic,
      span
    );


  const high =
    Math.max(
      semantic,
      span
    );


  return clamp01(
    low +
    (
      high -
      low
    ) *
    0.20
  );
}


// ======================================================
// Visibility / Quality
// ======================================================

function getQualityDisposition(
  confidence
) {
  const value =
    clamp01(
      confidence
    );


  if (
    value >=
    QUALITY_THRESHOLDS
      .normal
  ) {
    return "normal";
  }


  if (
    value >=
    QUALITY_THRESHOLDS
      .lowConfidence
  ) {
    return "low-confidence";
  }


  return "suppressed";
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  QUALITY_THRESHOLDS,

  clamp01,

  inferLocale,

  normalizeText,

  isGrammaticalFragment,

  scoreUnknownEntityCandidate,

  findUnknownEntitySupport,

  scoreEntityHintQuality,

  combineEntityConfidence,

  getQualityDisposition,
};