const {
  normalizeText,
  normalizeForComparison,
} = require(
  "./textNormalizer"
);


const CHINESE_BOUNDARY_PATTERN =
  /[\s，。！？；：、,.!?;:"“”'‘’（）()\[\]【】<>《》]/u;


const ENGLISH_BOUNDARY_PATTERN =
  /[\s,.;:!?()"“”'‘’\[\]{}<>]/u;


// ======================================================
// Helpers
// ======================================================

function isChineseLocale(
  locale
) {
  return String(
    locale || ""
  )
    .toLowerCase()
    .startsWith(
      "zh"
    );
}


function isEnglishLocale(
  locale
) {
  return String(
    locale || ""
  )
    .toLowerCase()
    .startsWith(
      "en"
    );
}


function isBoundaryCharacter(
  char,
  locale
) {
  if (!char) {
    return true;
  }


  if (
    isChineseLocale(
      locale
    )
  ) {
    return CHINESE_BOUNDARY_PATTERN.test(
      char
    );
  }


  return ENGLISH_BOUNDARY_PATTERN.test(
    char
  );
}


function uniqueByKey(
  items,
  keyBuilder
) {
  const seen =
    new Set();

  const result =
    [];


  for (
    const item of
    items
  ) {
    const key =
      keyBuilder(
        item
      );


    if (
      seen.has(
        key
      )
    ) {
      continue;
    }


    seen.add(
      key
    );

    result.push(
      item
    );
  }


  return result;
}


function getSupportTerms(
  lexicon
) {
  return (
    lexicon?.support
      ?.genericTerms ||
    {}
  );
}


function buildGenericTermSet(
  lexicon,
  locale
) {
  const support =
    getSupportTerms(
      lexicon
    );


  const values = [
    ...(support
      .genericLocations || []),

    ...(support
      .genericPeople || []),

    ...(support
      .genericOrganizations || []),

    ...(support
      .genericObjects || []),
  ];


  return new Set(
    values.map(
      (value) =>
        normalizeForComparison(
          value,
          locale
        )
    )
  );
}


function buildStopFragmentSet(
  lexicon,
  locale
) {
  const support =
    getSupportTerms(
      lexicon
    );


  return new Set(
    (
      support.stopFragments ||
      []
    ).map(
      (value) =>
        normalizeForComparison(
          value,
          locale
        )
    )
  );
}


function shouldRejectCandidate({
  name,
  lexicon,
  locale,
}) {
  const normalized =
    normalizeForComparison(
      name,
      locale
    );


  if (!normalized) {
    return true;
  }


  const genericTerms =
    buildGenericTermSet(
      lexicon,
      locale
    );


  if (
    genericTerms.has(
      normalized
    )
  ) {
    return true;
  }


  const stopFragments =
    buildStopFragmentSet(
      lexicon,
      locale
    );


  if (
    stopFragments.has(
      normalized
    )
  ) {
    return true;
  }


  if (
    isChineseLocale(
      locale
    ) &&
    normalized.length <
      2
  ) {
    return true;
  }


  if (
    isEnglishLocale(
      locale
    ) &&
    normalized.length <
      2
  ) {
    return true;
  }


  return false;
}


// ======================================================
// Chinese Name Extraction
// ======================================================

function findChineseCandidateStart({
  text,
  evidenceStart,
  maxLength = 12,
}) {
  let start =
    evidenceStart;


  let scanned =
    0;


  while (
    start >
      0 &&
    scanned <
      maxLength
  ) {
    const char =
      text[
        start - 1
      ];


    if (
      isBoundaryCharacter(
        char,
        "zh-CN"
      )
    ) {
      break;
    }


    /*
     * Stop at common structural particles.
     *
     * Example:
     * 赤霞山上的天机宗
     *
     * We do not want:
     * 赤霞山上的天机宗
     *
     * when extracting 天机宗.
     */
    if (
      [
        "的",
        "了",
        "在",
        "由",
        "与",
        "和",
        "及",
        "为",
        "是",
        "于",
        "向",
        "从",
        "把",
        "被",
      ].includes(
        char
      )
    ) {
      break;
    }


    start -=
      1;

    scanned +=
      1;
  }


  return start;
}


function findChineseCandidateEnd({
  text,
  evidenceEnd,
  maxLength = 4,
}) {
  let end =
    evidenceEnd;


  let scanned =
    0;


  while (
    end <
      text.length &&
    scanned <
      maxLength
  ) {
    const char =
      text[end];


    if (
      isBoundaryCharacter(
        char,
        "zh-CN"
      )
    ) {
      break;
    }


    /*
     * For now, do not aggressively expand rightward.
     * Most Chinese type hints are suffix-based.
     */
    if (
      [
        "的",
        "了",
        "在",
        "由",
        "与",
        "和",
        "及",
        "为",
        "是",
        "于",
        "向",
        "从",
        "把",
        "被",
      ].includes(
        char
      )
    ) {
      break;
    }


    end +=
      1;

    scanned +=
      1;
  }


  return end;
}


function extractChineseCandidates({
  text,
  matches,
  lexicon,
}) {
  const results =
    [];


  for (
    const match of
    matches
  ) {
    const concept =
      match.concept;


    if (
      !concept
    ) {
      continue;
    }


    const usefulEvidence =
      concept.kind ===
        "entity-type" ||
      concept.kind ===
        "role-signal";


    if (
      !usefulEvidence
    ) {
      continue;
    }


    const start =
      findChineseCandidateStart({
        text,
        evidenceStart:
          match.start,
      });


    const end =
      findChineseCandidateEnd({
        text,
        evidenceEnd:
          match.end,
      });


    const name =
      text
        .slice(
          start,
          end
        )
        .trim();


    if (
      shouldRejectCandidate({
        name,
        lexicon,
        locale:
          "zh-CN",
      })
    ) {
      continue;
    }


    let likelyType =
      null;

    let roleConceptId =
      null;


    if (
      concept.kind ===
      "entity-type"
    ) {
      likelyType =
        match.conceptId;
    }


    if (
      concept.kind ===
      "role-signal"
    ) {
      likelyType =
        "entityType.character";

      roleConceptId =
        match.conceptId;
    }


    let confidence =
      match.confidence;


    /*
     * Longer names are generally more plausible
     * than isolated fragments.
     */
    if (
      name.length >=
      3
    ) {
      confidence +=
        0.08;
    }


    if (
      match.evidenceType ===
      "suffix"
    ) {
      confidence +=
        0.05;
    }


    confidence =
      Math.min(
        confidence,
        1
      );


    results.push({
      name,

      start,

      end,

      locale:
        "zh-CN",

      likelyType,

      roleConceptId,

      confidence,

      evidence: [
        {
          conceptId:
            match.conceptId,

          expression:
            match.expression,

          evidenceType:
            match.evidenceType,

          strength:
            match.strength,

          confidence:
            match.confidence,
        },
      ],
    });
  }


  return results;
}


// ======================================================
// English Name Extraction
// ======================================================

function isEnglishNameToken(
  token
) {
  if (!token) {
    return false;
  }


  return (
    /^[A-Z][A-Za-z0-9'’-]*$/u.test(
      token
    ) ||
    /^[0-9]+(?:st|nd|rd|th)?$/iu.test(
      token
    )
  );
}


function extractEnglishNameAroundEvidence({
  text,
  evidenceStart,
  evidenceEnd,
}) {
  const before =
    text.slice(
      0,
      evidenceStart
    );


  const after =
    text.slice(
      evidenceEnd
    );


  const leftTokens =
    before
      .split(
        /\s+/u
      )
      .filter(Boolean);


  const evidenceText =
    text.slice(
      evidenceStart,
      evidenceEnd
    );


  const evidenceTokens =
    evidenceText
      .split(
        /\s+/u
      )
      .filter(Boolean);


  const collectedLeft =
    [];


  for (
    let index =
      leftTokens.length -
      1;
    index >=
      0;
    index -=
      1
  ) {
    const token =
      leftTokens[
        index
      ]
        .replace(
          /^[("'“‘]+|[),.;:!?"”’]+$/gu,
          ""
        );


    if (
      !isEnglishNameToken(
        token
      )
    ) {
      break;
    }


    collectedLeft.unshift(
      token
    );


    if (
      collectedLeft.length >=
      6
    ) {
      break;
    }
  }


  const cleanedEvidence =
    evidenceTokens
      .map(
        (token) =>
          token.replace(
            /^[("'“‘]+|[),.;:!?"”’]+$/gu,
            ""
          )
      )
      .filter(Boolean);


  const tokens = [
    ...collectedLeft,
    ...cleanedEvidence,
  ];


  /*
   * Optional one-token expansion to the right.
   * Usually unnecessary for suffix-based English names,
   * but retained for future compatibility.
   */
  const firstAfter =
    after
      .trimStart()
      .split(
        /\s+/u
      )[0];


  if (
    firstAfter &&
    isEnglishNameToken(
      firstAfter.replace(
        /^[("'“‘]+|[),.;:!?"”’]+$/gu,
        ""
      )
    )
  ) {
    /*
     * Do not automatically add it yet.
     * English canonical name suffixes are generally
     * already at the right edge.
     */
  }


  const name =
    tokens.join(
      " "
    );


  if (!name) {
    return null;
  }


  const start =
    text.lastIndexOf(
      name,
      evidenceEnd
    );


  return {
    name,

    start:
      start >= 0
        ? start
        : evidenceStart,

    end:
      (
        start >= 0
          ? start
          : evidenceStart
      ) +
      name.length,
  };
}


function extractEnglishCandidates({
  text,
  matches,
  lexicon,
}) {
  const results =
    [];


  for (
    const match of
    matches
  ) {
    const concept =
      match.concept;


    if (
      !concept
    ) {
      continue;
    }


    const usefulEvidence =
      concept.kind ===
        "entity-type" ||
      concept.kind ===
        "role-signal";


    if (
      !usefulEvidence
    ) {
      continue;
    }


    const extracted =
      extractEnglishNameAroundEvidence({
        text,
        evidenceStart:
          match.start,

        evidenceEnd:
          match.end,
      });


    if (
      !extracted
    ) {
      continue;
    }


    if (
      shouldRejectCandidate({
        name:
          extracted.name,

        lexicon,

        locale:
          "en",
      })
    ) {
      continue;
    }


    let likelyType =
      null;

    let roleConceptId =
      null;


    if (
      concept.kind ===
      "entity-type"
    ) {
      likelyType =
        match.conceptId;
    }


    if (
      concept.kind ===
      "role-signal"
    ) {
      likelyType =
        "entityType.character";

      roleConceptId =
        match.conceptId;
    }


    let confidence =
      match.confidence;


    if (
      extracted.name
        .split(
          /\s+/u
        )
        .length >=
      2
    ) {
      confidence +=
        0.08;
    }


    if (
      match.evidenceType ===
      "suffix"
    ) {
      confidence +=
        0.05;
    }


    confidence =
      Math.min(
        confidence,
        1
      );


    results.push({
      name:
        extracted.name,

      start:
        extracted.start,

      end:
        extracted.end,

      locale:
        "en",

      likelyType,

      roleConceptId,

      confidence,

      evidence: [
        {
          conceptId:
            match.conceptId,

          expression:
            match.expression,

          evidenceType:
            match.evidenceType,

          strength:
            match.strength,

          confidence:
            match.confidence,
        },
      ],
    });
  }


  return results;
}


// ======================================================
// Merge Candidates
// ======================================================

function mergeCandidateEvidence(
  candidates
) {
  const groups =
    new Map();


  for (
    const candidate of
    candidates
  ) {
    const key = [
      candidate.locale,
      candidate.start,
      candidate.end,
      normalizeForComparison(
        candidate.name,
        candidate.locale
      ),
    ].join(
      "::"
    );


    if (
      !groups.has(
        key
      )
    ) {
      groups.set(
        key,
        {
          ...candidate,

          evidence: [
            ...candidate.evidence,
          ],

          alternativeTypes:
            [],
        }
      );

      continue;
    }


    const existing =
      groups.get(
        key
      );


    existing.evidence.push(
      ...candidate.evidence
    );


    if (
      candidate.likelyType &&
      candidate.likelyType !==
        existing.likelyType
    ) {
      existing
        .alternativeTypes
        .push({
          conceptId:
            candidate.likelyType,

          confidence:
            candidate.confidence,
        });
    }


    if (
      candidate.confidence >
      existing.confidence
    ) {
      if (
        existing.likelyType &&
        existing.likelyType !==
          candidate.likelyType
      ) {
        existing
          .alternativeTypes
          .push({
            conceptId:
              existing.likelyType,

            confidence:
              existing.confidence,
          });
      }


      existing.likelyType =
        candidate.likelyType;

      existing.roleConceptId =
        candidate.roleConceptId ||
        existing.roleConceptId;

      existing.confidence =
        candidate.confidence;
    }
  }


  const merged =
    Array.from(
      groups.values()
    );


  for (
    const candidate of
    merged
  ) {
    candidate.evidence =
      uniqueByKey(
        candidate.evidence,
        (item) =>
          [
            item.conceptId,
            item.expression,
            item.evidenceType,
          ].join(
            "::"
          )
      );


    candidate.alternativeTypes =
      uniqueByKey(
        candidate.alternativeTypes,
        (item) =>
          item.conceptId
      )
        .filter(
          (item) =>
            item.conceptId !==
            candidate.likelyType
        )
        .sort(
          (
            a,
            b
          ) =>
            b.confidence -
            a.confidence
        );
  }


  return merged;
}


// ======================================================
// Public API
// ======================================================

function discoverUnknownEntities({
  text,
  lexiconAnalysis,
  lexicon,
}) {
  if (
    !text ||
    !lexiconAnalysis ||
    !lexicon
  ) {
    return [];
  }


  const matches =
    lexiconAnalysis.matches.map(
      (match) => ({
        ...match,

        concept:
          lexiconAnalysis
            .conceptResolver
            ? lexiconAnalysis
                .conceptResolver(
                  match.conceptId
                )
            : match.concept,
      })
    );


  let candidates =
    [];


  if (
    isChineseLocale(
      lexicon.locale
    )
  ) {
    candidates =
      extractChineseCandidates({
        text,
        matches,
        lexicon,
      });
  } else if (
    isEnglishLocale(
      lexicon.locale
    )
  ) {
    candidates =
      extractEnglishCandidates({
        text,
        matches,
        lexicon,
      });
  }


  return mergeCandidateEvidence(
    candidates
  )
    .sort(
      (
        a,
        b
      ) => {
        if (
          a.start !==
          b.start
        ) {
          return (
            a.start -
            b.start
          );
        }


        return (
          b.confidence -
          a.confidence
        );
      }
    );
}


module.exports = {
  discoverUnknownEntities,
};