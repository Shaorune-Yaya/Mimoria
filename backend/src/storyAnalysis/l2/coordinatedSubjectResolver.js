// ======================================================
// L2 Coordinated Subject Resolver
//
// Expands explicit English coordinated subjects:
//
// Alice and John joined the Guild.
// -> ["Alice", "John"]
//
// Alice, John, and Mary joined the Guild.
// -> ["Alice", "John", "Mary"]
//
// The United States and Canada signed the treaty.
// -> ["The United States", "Canada"]
//
// This layer only handles explicit coordinated noun
// phrases.
//
// Plural pronoun coreference:
//
// They later left.
//
// belongs to a future discourse/coreference layer.
// ======================================================


// ======================================================
// Constants
// ======================================================

const LOWERCASE_NAME_CONNECTORS =
  new Set([
    "of",
    "the",
    "de",
    "da",
    "del",
    "la",
    "le",
    "van",
    "von",
    "di",
  ]);


const DISCOURSE_PREFIX_PATTERN =
  /^(?:(?:then|later|afterward|afterwards|finally|eventually|subsequently|initially|first|firstly|meanwhile|previously|but|however|therefore|thus|so|yet)\s*,?\s+)+/iu;


const PRE_VERB_ADVERB_PATTERN =
  /\b(?:finally|eventually|later|then|subsequently|also|both)\s*$/iu;


// ======================================================
// Basic Helpers
// ======================================================

function normalizeSpace(
  value
) {
  return String(
    value || ""
  )
    .replace(
      /\s+/gu,
      " "
    )
    .trim();
}


function stripOuterPunctuation(
  value
) {
  return normalizeSpace(
    value
  )
    .replace(
      /^[,;:]+/u,
      ""
    )
    .replace(
      /[,;:]+$/u,
      ""
    )
    .trim();
}


function stripEnglishDiscoursePrefix(
  value
) {
  let result =
    normalizeSpace(
      value
    );


  /*
   * Later Alice and John joined...
   * But Alice and John joined...
   */
  result =
    result.replace(
      DISCOURSE_PREFIX_PATTERN,
      ""
    );


  return result.trim();
}


// ======================================================
// Named Phrase Validation
// ======================================================

function isCapitalizedNameWord(
  value
) {
  /*
   * Examples:
   *
   * Alice
   * John
   * O'Brien
   * Smith-Jones
   */
  return /^[A-Z][A-Za-z0-9'’\-]*$/u.test(
    String(
      value || ""
    )
  );
}


function isEnglishNamedPhrase(
  value
) {
  const normalized =
    stripOuterPunctuation(
      value
    );


  if (
    !normalized
  ) {
    return false;
  }


  const words =
    normalized.split(
      /\s+/u
    );


  /*
   * Defensive upper bound.
   *
   * This is intended for named noun phrases, not entire
   * sentence fragments.
   */
  if (
    words.length >
    8
  ) {
    return false;
  }


  let hasCapitalizedWord =
    false;


  for (
    const word of
    words
  ) {
    if (
      isCapitalizedNameWord(
        word
      )
    ) {
      hasCapitalizedWord =
        true;

      continue;
    }


    /*
     * Allow internal lowercase name connectors:
     *
     * Kingdom of Heaven
     * House of Black
     *
     * "The" itself is capitalized and is already handled
     * by isCapitalizedNameWord().
     */
    if (
      LOWERCASE_NAME_CONNECTORS.has(
        word.toLowerCase()
      )
    ) {
      continue;
    }


    return false;
  }


  return hasCapitalizedWord;
}


// ======================================================
// Split Coordinated Subject Phrase
// ======================================================

function splitCoordinatedPhrase(
  value
) {
  const normalized =
    normalizeSpace(
      value
    );


  if (
    !normalized
  ) {
    return [];
  }


  /*
   * Normalize Oxford comma:
   *
   * Alice, John, and Mary
   *
   * ->
   *
   * Alice, John, Mary
   */
  let prepared =
    normalized.replace(
      /,\s*(?:and|&)\s+/giu,
      ", "
    );


  /*
   * Normalize simple conjunction:
   *
   * Alice and John
   *
   * ->
   *
   * Alice, John
   */
  prepared =
    prepared.replace(
      /\s+(?:and|&)\s+/giu,
      ", "
    );


  return prepared
    .split(
      /\s*,\s*/u
    )
    .map(
      stripOuterPunctuation
    )
    .filter(
      Boolean
    );
}


// ======================================================
// Event Coordinate Helper
// ======================================================

function getRelativeEventStart({
  clause,
  eventMatch,
}) {
  const clauseText =
    String(
      clause?.text ||
      ""
    );


  const clauseStart =
    Number(
      clause?.start ??
      0
    );


  const eventStart =
    Number(
      eventMatch?.start
    );


  if (
    !Number.isFinite(
      eventStart
    )
  ) {
    return null;
  }


  /*
   * Normal L2 representation:
   *
   * clause.start and eventMatch.start are both absolute
   * offsets in the complete document.
   */
  const absoluteRelative =
    eventStart -
    clauseStart;


  if (
    absoluteRelative >=
      0 &&
    absoluteRelative <=
      clauseText.length
  ) {
    return absoluteRelative;
  }


  /*
   * Defensive compatibility:
   *
   * If a future caller supplies an event offset already
   * relative to the clause, accept it.
   */
  if (
    eventStart >=
      0 &&
    eventStart <=
      clauseText.length
  ) {
    return eventStart;
  }


  return null;
}


// ======================================================
// Get Subject Phrase Before Event
// ======================================================

function getPreEventSubjectPhrase({
  clause,
  eventMatch,
}) {
  if (
    !clause ||
    !eventMatch
  ) {
    return "";
  }


  const relativeStart =
    getRelativeEventStart({
      clause,
      eventMatch,
    });


  if (
    relativeStart ===
      null ||
    relativeStart <=
      0
  ) {
    return "";
  }


  let before =
    String(
      clause.text ||
      ""
    ).slice(
      0,
      relativeStart
    );


  /*
   * Keep commas.
   *
   * Alice, John, and Mary
   *
   * uses commas as part of the coordinated subject.
   *
   * Only sentence-like boundaries are removed here.
   */
  const pieces =
    before.split(
      /[;.!?]/u
    );


  before =
    pieces[
      pieces.length -
      1
    ] ||
    "";


  before =
    stripEnglishDiscoursePrefix(
      before
    );


  /*
   * Alice and John finally joined...
   *
   * ->
   *
   * Alice and John
   */
  before =
    before.replace(
      PRE_VERB_ADVERB_PATTERN,
      ""
    );


  return normalizeSpace(
    before
  );
}


// ======================================================
// Validate Coordinated Parts
// ======================================================

function validateCoordinatedParts(
  parts
) {
  if (
    !Array.isArray(
      parts
    ) ||
    parts.length <
      2
  ) {
    return false;
  }


  return parts.every(
    (part) =>
      isEnglishNamedPhrase(
        part
      )
  );
}


// ======================================================
// Deduplicate
// ======================================================

function deduplicateSubjects(
  subjects
) {
  const seen =
    new Set();


  const result =
    [];


  for (
    const subject of
    subjects
  ) {
    const normalized =
      normalizeSpace(
        subject
      );


    if (
      !normalized
    ) {
      continue;
    }


    const key =
      normalized.toLocaleLowerCase(
        "en-US"
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
      normalized
    );
  }


  return result;
}


// ======================================================
// Main Resolver
// ======================================================

function extractEnglishCoordinatedSubjects({
  clause,
  eventMatch,
}) {
  const phrase =
    getPreEventSubjectPhrase({
      clause,
      eventMatch,
    });


  if (
    !phrase
  ) {
    return [];
  }


  /*
   * A coordinated phrase needs an actual conjunction.
   *
   * We deliberately do not accept a bare comma by itself
   * because:
   *
   * "Yesterday, Alice joined..."
   *
   * must not become:
   *
   * ["Yesterday", "Alice"]
   */
  const hasExplicitConjunction =
    /\s+(?:and|&)\s+/iu.test(
      phrase
    ) ||
    /,\s*(?:and|&)\s+/iu.test(
      phrase
    );


  if (
    !hasExplicitConjunction
  ) {
    return [];
  }


  const parts =
    splitCoordinatedPhrase(
      phrase
    );


  if (
    !validateCoordinatedParts(
      parts
    )
  ) {
    return [];
  }


  return deduplicateSubjects(
    parts
  );
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  normalizeSpace,

  stripOuterPunctuation,

  stripEnglishDiscoursePrefix,

  isCapitalizedNameWord,

  isEnglishNamedPhrase,

  splitCoordinatedPhrase,

  getRelativeEventStart,

  getPreEventSubjectPhrase,

  validateCoordinatedParts,

  deduplicateSubjects,

  extractEnglishCoordinatedSubjects,
};