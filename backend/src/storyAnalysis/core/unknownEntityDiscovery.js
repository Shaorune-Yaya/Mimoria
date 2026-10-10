const {
  normalizeText,
  normalizeForComparison,
} = require(
  "./textNormalizer"
);


const {
  scoreUnknownEntityCandidate,
  combineEntityConfidence,
  getQualityDisposition,
} = require(
  "../l2/candidateQualityScoring"
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

function cleanChineseEntityCandidateSpan({
  text,
  start,
  end,
}) {
  let nextStart =
    start;


  let value =
    text
      .slice(
        nextStart,
        end
      )
      .trim();


  /*
   * Remove grammar that can be swallowed while scanning
   * left from a suffix-based EntityType clue.
   *
   * Examples:
   *
   * 一名来自北境
   * -> 北境
   *
   * 来自北境
   * -> 北境
   *
   * 位于银港
   * -> 银港
   *
   * We remove grammar only at the beginning of the span.
   * Entity suffixes themselves are preserved.
   */
  const prefixMatch =
    value.match(
      /^(?:(?:一名|一位|一个|一座)\s*)?(?:来自|源自|源于|出身于|位于|坐落于|坐落在|地处|隶属于|隶属|属于|归属于|归属|加入|任职于|就职于|供职于|居住在|住在|定居于|出生于|出生在|生于)+/u
    );


  if (
    prefixMatch?.[0]
  ) {
    const rawPrefix =
      prefixMatch[0];


    const offsetInOriginal =
      text
        .slice(
          start,
          end
        )
        .indexOf(
          rawPrefix
        );


    if (
      offsetInOriginal >=
      0
    ) {
      nextStart =
        start +
        offsetInOriginal +
        rawPrefix.length;
    }


    value =
      text
        .slice(
          nextStart,
          end
        )
        .trim();
  }


  return {
    start:
      nextStart,

    end,

    name:
      value,
  };
}

// ======================================================
// Chinese Entity Type Evidence Validation
//
// Entity-type lexicon hits inside a proper name must not
// automatically determine the entity's type.
//
// Example:
//
// 河谷城
//
// "河" may match entityType.river, but it occurs inside the
// proper name.
//
// "城" occurs at the end and is therefore much stronger
// evidence for entityType.city.
//
// For Chinese proper names we currently require entity-type
// lexical evidence to describe either:
//
// - the whole extracted name
// - or the suffix of the extracted name
//
// This prevents internal fragments such as:
//
// 河谷城 -> river
// 星海公司 -> planet
// 山岚学院 -> mountain
//
// while keeping:
//
// 黑石城 -> city
// 银月公会 -> guild
// 赤霞山 -> mountain
// ======================================================

function isReliableChineseEntityTypeEvidence({
  name,
  match,
}) {
  const normalizedName =
    normalizeForComparison(
      name,
      "zh-CN"
    );


  const normalizedExpression =
    normalizeForComparison(
      match?.expression,
      "zh-CN"
    );


  if (
    !normalizedName ||
    !normalizedExpression
  ) {
    return false;
  }


  // Exact names remain valid.
  if (
    normalizedName ===
    normalizedExpression
  ) {
    return true;
  }


  // Chinese entity-type clues are primarily suffix based.
  //
  // Examples:
  //
  // 河谷城 -> 城
  // 银月公会 -> 公会
  // 黑石港 -> 港
  //
  // An internal lexical fragment is not enough.
  if (
    normalizedName.endsWith(
      normalizedExpression
    )
  ) {
    return true;
  }


  return false;
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


    /*
    * Chinese role/title expressions describe an entity,
    * but are normally NOT the entity name itself.
    *
    * Example:
    *
    * 诺拉是一名炼金术师
    *
    * "炼金术师"
    * -> field.occupation
    *
    * It must not independently become:
    *
    * create entity "炼金术师"
    *
    * The subject Entity is discovered through the structured
    * field/relation candidates instead.
    */
    const usefulEvidence =
      concept.kind ===
      "entity-type";


    if (
      !usefulEvidence
    ) {
      continue;
    }


    const initialStart =
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


    const cleanedSpan =
      cleanChineseEntityCandidateSpan({
        text,

        start:
          initialStart,

        end,
      });


    const start =
      cleanedSpan.start;


    const name =
      cleanedSpan.name;


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


    /*
    * A lexicon term appearing somewhere inside a Chinese
    * proper name is not enough to classify the whole entity.
    *
    * Example:
    *
    * 河谷城
    *
    * 河 -> entityType.river
    *
    * This must NOT make the whole entity a River.
    *
    * 城 -> entityType.city
    *
    * This occurs at the name boundary and remains valid.
    */
    if (
      concept.kind ===
        "entity-type" &&
      !isReliableChineseEntityTypeEvidence({
        name,
        match,
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


  const mergedCandidates =
  mergeCandidateEvidence(
    candidates
  );


const qualityScoredCandidates =
  mergedCandidates.map(
    (
      candidate
    ) => {
      /*
       * Preserve the old lexical confidence.
       *
       * It is useful evidence, but it is no longer treated
       * as the final confidence of the Entity mention.
       */
      const lexicalConfidence =
        candidate
          ?.confidence ??
        0.5;


      const spanQuality =
        scoreUnknownEntityCandidate({
          candidate,

          text,

          semanticMatches:
            matches,

          locale:
            lexicon.locale,
        });


      const confidence =
        combineEntityConfidence(
          lexicalConfidence,

          spanQuality.score
        );


      return {
        ...candidate,


        // -----------------------------------------------
        // Confidence decomposition
        // -----------------------------------------------

        lexicalConfidence,

        spanConfidence:
          spanQuality.score,

        confidence,


        // -----------------------------------------------
        // Debug / future UI information
        // -----------------------------------------------

        spanQuality:
          spanQuality.quality,

        spanQualityEvidence:
          spanQuality.evidence,

        qualityDisposition:
          getQualityDisposition(
            confidence
          ),
      };
    }
  );


return qualityScoredCandidates
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