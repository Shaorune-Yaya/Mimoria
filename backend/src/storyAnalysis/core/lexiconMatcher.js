const {
  normalizeText,
} = require(
  "./textNormalizer"
);


const STRENGTH_SCORE = {
  strong:
    1,

  normal:
    0.75,

  weak:
    0.45,
};


const EVIDENCE_PRIORITY = {
  alias:
    3,

  suffix:
    2,

  prefix:
    1,
};


// ======================================================
// Language Helpers
// ======================================================

function isCjkLocale(
  locale
) {
  const normalized =
    String(
      locale || ""
    ).toLowerCase();


  return (
    normalized.startsWith(
      "zh"
    ) ||
    normalized.startsWith(
      "ja"
    ) ||
    normalized.startsWith(
      "ko"
    )
  );
}


function isLatinWordCharacter(
  character
) {
  if (!character) {
    return false;
  }


  return /[\p{L}\p{N}_]/u.test(
    character
  );
}


function hasValidWordBoundaries({
  source,
  start,
  end,
  locale,
}) {
  /*
   * Chinese / Japanese / Korean normally do not use
   * whitespace word boundaries in the same way as
   * English, so boundary filtering is skipped here.
   */
  if (
    isCjkLocale(
      locale
    )
  ) {
    return true;
  }


  const before =
    start > 0
      ? source[
          start - 1
        ]
      : "";


  const after =
    end <
    source.length
      ? source[end]
      : "";


  const startsInsideWord =
    isLatinWordCharacter(
      before
    );


  const endsInsideWord =
    isLatinWordCharacter(
      after
    );


  return (
    !startsInsideWord &&
    !endsInsideWord
  );
}


// ======================================================
// Occurrence Matching
// ======================================================

function findAllOccurrences({
  source,
  target,
  locale,
}) {
  const results =
    [];


  if (
    !source ||
    !target
  ) {
    return results;
  }


  let offset =
    0;


  while (
    offset <
    source.length
  ) {
    const index =
      source.indexOf(
        target,
        offset
      );


    if (
      index ===
      -1
    ) {
      break;
    }


    const end =
      index +
      target.length;


    if (
      hasValidWordBoundaries({
        source,
        start:
          index,
        end,
        locale,
      })
    ) {
      results.push({
        start:
          index,

        end,
      });
    }


    offset =
      index +
      Math.max(
        target.length,
        1
      );
  }


  return results;
}


// ======================================================
// Alias Matching
// ======================================================

function collectAliasMatches({
  text,
  entry,
  locale,
  category,
}) {
  const matches =
    [];


  const normalizedText =
    normalizeText(
      text,
      locale
    );


  const aliases =
    entry.aliases ||
    {};


  for (
    const strength of
    [
      "strong",
      "normal",
      "weak",
    ]
  ) {
    const expressions =
      Array.isArray(
        aliases[
          strength
        ]
      )
        ? aliases[
            strength
          ]
        : [];


    for (
      const expression of
      expressions
    ) {
      const normalizedExpression =
        normalizeText(
          expression,
          locale
        );


      const occurrences =
        findAllOccurrences({
          source:
            normalizedText,

          target:
            normalizedExpression,

          locale,
        });


      for (
        const occurrence of
        occurrences
      ) {
        matches.push({
          conceptId:
            entry.conceptId,

          category,

          locale,

          evidenceType:
            "alias",

          expression,

          strength,

          confidence:
            STRENGTH_SCORE[
              strength
            ],

          start:
            occurrence.start,

          end:
            occurrence.end,
        });
      }
    }
  }


  return matches;
}


// ======================================================
// Suffix Matching
// ======================================================

function collectSuffixMatches({
  text,
  entry,
  locale,
  category,
}) {
  const matches =
    [];


  const normalizedText =
    normalizeText(
      text,
      locale
    );


  const suffixes =
    entry.suffixes ||
    {};


  for (
    const strength of
    [
      "strong",
      "normal",
      "weak",
    ]
  ) {
    const expressions =
      Array.isArray(
        suffixes[
          strength
        ]
      )
        ? suffixes[
            strength
          ]
        : [];


    for (
      const suffix of
      expressions
    ) {
      const normalizedSuffix =
        normalizeText(
          suffix,
          locale
        );


      const occurrences =
        findAllOccurrences({
          source:
            normalizedText,

          target:
            normalizedSuffix,

          locale,
        });


      for (
        const occurrence of
        occurrences
      ) {
        matches.push({
          conceptId:
            entry.conceptId,

          category,

          locale,

          evidenceType:
            "suffix",

          expression:
            suffix,

          strength,

          /*
           * A suffix is supporting evidence rather than
           * a complete semantic match.
           */
          confidence:
            STRENGTH_SCORE[
              strength
            ] *
            0.8,

          start:
            occurrence.start,

          end:
            occurrence.end,
        });
      }
    }
  }


  return matches;
}


// ======================================================
// Deduplication
// ======================================================

function getMatchPreferenceScore(
  match
) {
  return (
    match.confidence *
      100 +
    (
      EVIDENCE_PRIORITY[
        match.evidenceType
      ] || 0
    ) *
      10 +
    match.expression.length
  );
}


function collapseDuplicateEvidence(
  matches
) {
  const grouped =
    new Map();


  for (
    const match of
    matches
  ) {
    const key = [
      match.conceptId,
      match.category,
    ].join(
      "::"
    );


    if (
      !grouped.has(
        key
      )
    ) {
      grouped.set(
        key,
        []
      );
    }


    grouped
      .get(key)
      .push(match);
  }


  const result =
    [];


  for (
    const group of
    grouped.values()
  ) {
    /*
     * Prefer:
     *
     * 1. Higher confidence
     * 2. Longer expression
     * 3. Better evidence type
     *
     * This makes:
     *
     * 并没有
     * beat
     * 没有 / 没
     *
     * and:
     *
     * 加入了
     * beat
     * 加入
     *
     * while keeping overlapping matches that belong to
     * DIFFERENT Concepts.
     */
    const sorted =
      [...group].sort(
        (
          a,
          b
        ) => {
          const aLength =
            a.end -
            a.start;

          const bLength =
            b.end -
            b.start;


          if (
            a.confidence !==
            b.confidence
          ) {
            return (
              b.confidence -
              a.confidence
            );
          }


          if (
            aLength !==
            bLength
          ) {
            return (
              bLength -
              aLength
            );
          }


          return (
            (
              EVIDENCE_PRIORITY[
                b.evidenceType
              ] || 0
            ) -
            (
              EVIDENCE_PRIORITY[
                a.evidenceType
              ] || 0
            )
          );
        }
      );


    const kept =
      [];


    for (
      const candidate of
      sorted
    ) {
      const covered =
        kept.some(
          (existing) => {
            const overlaps =
              candidate.start <
                existing.end &&
              candidate.end >
                existing.start;


            if (!overlaps) {
              return false;
            }


            const candidateInside =
              candidate.start >=
                existing.start &&
              candidate.end <=
                existing.end;


            return candidateInside;
          }
        );


      if (
        covered
      ) {
        continue;
      }


      kept.push(
        candidate
      );
    }


    result.push(
      ...kept
    );
  }


  return result;
}


// ======================================================
// Sorting
// ======================================================

function sortMatches(
  matches
) {
  return [
    ...matches,
  ].sort(
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


      if (
        a.end !==
        b.end
      ) {
        return (
          b.end -
          a.end
        );
      }


      if (
        a.confidence !==
        b.confidence
      ) {
        return (
          b.confidence -
          a.confidence
        );
      }


      return (
        (
          EVIDENCE_PRIORITY[
            b.evidenceType
          ] || 0
        ) -
        (
          EVIDENCE_PRIORITY[
            a.evidenceType
          ] || 0
        )
      );
    }
  );
}


// ======================================================
// Public Matcher
// ======================================================

function matchLexicon({
  text,
  lexicon,
}) {
  if (
    !text ||
    !lexicon
  ) {
    return [];
  }


  const locale =
    lexicon.locale;


  const results =
    [];


  for (
    const [
      category,
      lexiconFile,
    ] of
    Object.entries(
      lexicon.categories
    )
  ) {
    for (
      const entry of
      lexiconFile.entries
    ) {
      results.push(
        ...collectAliasMatches({
          text,
          entry,
          locale,
          category,
        })
      );


      results.push(
        ...collectSuffixMatches({
          text,
          entry,
          locale,
          category,
        })
      );
    }
  }


  return sortMatches(
    collapseDuplicateEvidence(
      results
    )
  );
}


module.exports = {
  STRENGTH_SCORE,
  matchLexicon,
};