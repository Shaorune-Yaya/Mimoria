// ======================================================
// L2 Context Resolver
//
// Resolves:
//
// - Subject inheritance
// - English pronouns
// - Chinese pronouns
// - Subject carry-over between clauses
//
// It does NOT perform coreference with an LLM.
// This is deterministic discourse resolution.
// ======================================================


const ENGLISH_PRONOUNS =
  new Set([
    "he",
    "him",
    "his",

    "she",
    "her",
    "hers",

    "it",
    "its",

    "they",
    "them",
    "their",
    "theirs",
  ]);


const CHINESE_PRONOUNS =
  new Set([
    "他",
    "他的",

    "她",
    "她的",

    "它",
    "它的",

    "他们",
    "他们的",

    "她们",
    "她们的",

    "它们",
    "它们的",

    "其",
    "其的",
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


function normalizeSubject(
  subject,
  locale
) {
  if (!subject) {
    return null;
  }


  let value =
    String(
      subject
    )
      .trim();


  if (
    isChineseLocale(
      locale
    )
  ) {
    value =
      value.replace(
        /(?:的|之)$/u,
        ""
      );
  }


  return (
    value ||
    null
  );
}


function isPronoun(
  value,
  locale
) {
  if (!value) {
    return false;
  }


  const normalized =
    String(
      value
    )
      .trim()
      .toLowerCase();


  if (
    isChineseLocale(
      locale
    )
  ) {
    return CHINESE_PRONOUNS.has(
      value.trim()
    );
  }


  return ENGLISH_PRONOUNS.has(
    normalized
  );
}


// ======================================================
// Clause Lookup
// ======================================================

function getClauseForCandidate(
  candidate,
  clauses
) {
  return clauses.find(
    (clause) =>
      candidate.start >=
        clause.start &&
      candidate.start <=
        clause.end
  );
}


// ======================================================
// Resolver
// ======================================================

function resolveCandidateContexts({
  candidates,
  clauses,
  locale,
}) {
  const sorted =
    [...candidates]
      .sort(
        (
          a,
          b
        ) =>
          a.start -
          b.start
      );


  let discourseSubject =
    null;


  let currentClause =
    null;


  let clauseSubject =
    null;


  const results =
    [];


  for (
    const candidate of
    sorted
  ) {
    const clause =
      getClauseForCandidate(
        candidate,
        clauses
      );


    if (
      clause !==
      currentClause
    ) {
      currentClause =
        clause;

      clauseSubject =
        null;
    }


    let subject =
      normalizeSubject(
        candidate.subjectHint,
        locale
      );


    /*
     * Explicit non-pronoun subject.
     */
    if (
      subject &&
      !isPronoun(
        subject,
        locale
      )
    ) {
      clauseSubject =
        subject;

      discourseSubject =
        subject;
    }


    /*
     * Pronoun:
     *
     * Her body type...
     * 她的主色...
     */
    else if (
      subject &&
      isPronoun(
        subject,
        locale
      )
    ) {
      subject =
        clauseSubject ||
        discourseSubject ||
        subject;
    }


    /*
     * No subject at all:
     *
     * Alice is 24...
     * ...was born in New York
     *
     * second extractor can inherit Alice.
     */
    else {
      subject =
        clauseSubject ||
        discourseSubject ||
        null;
    }


    if (
      subject &&
      !isPronoun(
        subject,
        locale
      )
    ) {
      clauseSubject =
        subject;

      discourseSubject =
        subject;
    }


    results.push({
      ...candidate,

      subjectHint:
        subject,

      context: {
        ...(candidate.context ||
          {}),

        subjectInherited:
          candidate.subjectHint !==
            subject,

        discourseSubject:
          discourseSubject,
      },
    });
  }


  return results;
}


module.exports = {
  resolveCandidateContexts,
  normalizeSubject,
  isPronoun,
};