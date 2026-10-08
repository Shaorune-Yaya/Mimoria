// ======================================================
// Clause Segmenter
//
// L2 works on smaller semantic clauses rather than
// scanning an entire document as one string.
// ======================================================


const CHINESE_BREAKS =
  new Set([
    "。",
    "！",
    "？",
    "；",
    "\n",
  ]);


const ENGLISH_BREAKS =
  new Set([
    ".",
    "!",
    "?",
    ";",
    "\n",
  ]);


// ======================================================
// Locale
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


// ======================================================
// Segmentation
// ======================================================

function segmentClauses(
  text,
  locale = "zh-CN"
) {
  if (!text) {
    return [];
  }


  const breakCharacters =
    isChineseLocale(
      locale
    )
      ? CHINESE_BREAKS
      : ENGLISH_BREAKS;


  const results =
    [];


  let start =
    0;


  for (
    let index =
      0;
    index <
      text.length;
    index +=
      1
  ) {
    const char =
      text[index];


    if (
      !breakCharacters.has(
        char
      )
    ) {
      continue;
    }


    const raw =
      text.slice(
        start,
        index
      );


    const leading =
      raw.length -
      raw.trimStart().length;


    const trimmed =
      raw.trim();


    if (
      trimmed
    ) {
      const clauseStart =
        start +
        leading;


      results.push({
        text:
          trimmed,

        start:
          clauseStart,

        end:
          clauseStart +
          trimmed.length,
      });
    }


    start =
      index +
      1;
  }


  if (
    start <
    text.length
  ) {
    const raw =
      text.slice(
        start
      );


    const leading =
      raw.length -
      raw.trimStart().length;


    const trimmed =
      raw.trim();


    if (
      trimmed
    ) {
      const clauseStart =
        start +
        leading;


      results.push({
        text:
          trimmed,

        start:
          clauseStart,

        end:
          clauseStart +
          trimmed.length,
      });
    }
  }


  return results;
}


// ======================================================
// Matching Helpers
// ======================================================

function getMatchesInsideClause(
  matches,
  clause
) {
  return (
    matches ||
    []
  ).filter(
    (match) =>
      match.start >=
        clause.start &&
      match.end <=
        clause.end
  );
}


function getCandidatesInsideClause(
  candidates,
  clause
) {
  return (
    candidates ||
    []
  ).filter(
    (candidate) =>
      candidate.start >=
        clause.start &&
      candidate.end <=
        clause.end
  );
}


module.exports = {
  isChineseLocale,
  isEnglishLocale,

  segmentClauses,

  getMatchesInsideClause,
  getCandidatesInsideClause,
};