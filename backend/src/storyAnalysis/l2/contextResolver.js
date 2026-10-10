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

const {
  isGrammaticalFragment,
} = require(
  "./candidateQualityScoring"
);

const {
  createMention,

  createMentionMemory,

  rememberMention,

  rankPronounAntecedents,
} = require(
  "./mentionScoring"
);

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
// Subject Mention Validation
//
// A grammatical fragment must not become a discourse
// entity.
//
// Examples:
//
// 经常前往北境
// ↑
//
// "经常" is an adverb, not the subject.
//
// 现在住在河谷城
//
// "现在" is temporal context, not an Entity.
//
// The resolver should treat these as "missing subject"
// and inherit the real discourse subject instead.
// ======================================================

function isValidExplicitSubject(
  value,
  locale
) {
  if (
    !value
  ) {
    return false;
  }


  /*
   * Pronouns are valid grammatical subjects.
   *
   * They will be resolved separately.
   */
  if (
    isPronoun(
      value,
      locale
    )
  ) {
    return true;
  }


  if (
    isGrammaticalFragment({
      value,

      locale,
    })
  ) {
    return false;
  }


  return true;
}

// ======================================================
// Clause Lookup
// ======================================================

function getClauseForCandidate(
  candidate,
  clauses
) {
  return (
    clauses.find(
      (
        clause
      ) =>
        candidate.start >=
          clause.start &&
        candidate.start <=
          clause.end
    ) ||
    null
  );
}


function getClauseIndexForCandidate(
  candidate,
  clauses
) {
  return clauses.findIndex(
    (
      clause
    ) =>
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
    [
      ...candidates,
    ]
      .sort(
        (
          a,
          b
        ) =>
          (
            a.start ??
            0
          ) -
          (
            b.start ??
            0
          )
      );


  let discourseSubject =
    null;


  let currentClause =
    null;


  let clauseSubject =
    null;


  const memory =
    createMentionMemory();


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


    const clauseIndex =
      getClauseIndexForCandidate(
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


    // ==================================================
    // Preserve Original Grammatical Subject
    // ==================================================

    const originalSubject =
      normalizeSubject(
        candidate.subjectHint,
        locale
      );


    const originalSubjectWasPronoun =
      Boolean(
        originalSubject &&
        isPronoun(
          originalSubject,
          locale
        )
      );


    let subject =
      originalSubject;


    let pronounResolution =
      null;


    // ==================================================
    // Explicit Named Subject
    // ==================================================

    if (
      subject &&
      !isPronoun(
        subject,
        locale
      ) &&
      isValidExplicitSubject(
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
    * Grammatical material was accidentally extracted as a
    * subject.
    *
    * Example:
    *
    * 经常前往北境
    *
    * "经常" must not replace the current discourse subject.
    */
    else if (
      subject &&
      !isValidExplicitSubject(
        subject,
        locale
      )
    ) {
      subject =
        clauseSubject ||
        discourseSubject ||
        null;
    }

    // ==================================================
    // Pronoun
    //
    // New:
    //
    // candidate-ranking resolver first.
    //
    // Old:
    //
    // clauseSubject / discourseSubject remains as safe
    // fallback when mention memory has insufficient
    // evidence.
    // ==================================================

    else if (
      subject &&
      isPronoun(
        subject,
        locale
      )
    ) {
      pronounResolution =
        rankPronounAntecedents({
          memory,

          currentStart:
            candidate.start ??
            null,

          currentClauseIndex:
            clauseIndex >=
              0
              ? clauseIndex
              : null,

          discourseSubject,
        });


      if (
        pronounResolution
          .status ===
        "resolved"
      ) {
        subject =
          pronounResolution
            .antecedent;
      } else {
        /*
         * Do NOT aggressively guess when ranking says the
         * antecedent is ambiguous.
         *
         * If there is a clear clause-local subject we can
         * still use it.
         */
        subject =
          clauseSubject ||
          (
            pronounResolution
              .status ===
              "unresolved"
              ? discourseSubject
              : null
          ) ||
          subject;
      }
    }


    // ==================================================
    // Missing Subject
    // ==================================================

    else {
      subject =
        clauseSubject ||
        discourseSubject ||
        null;
    }


    // ==================================================
    // Update Discourse Subject
    // ==================================================

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


    // ==================================================
    // Object Mention
    // ==================================================

    const object =
      normalizeSubject(
        candidate.objectHint,
        locale
      );


    // ==================================================
    // Build Resolved Candidate
    // ==================================================

    const resolvedCandidate = {
      ...candidate,

      subjectHint:
        subject,

      context: {
        ...(
          candidate.context ||
          {}
        ),

        clauseIndex:
          clauseIndex >=
            0
            ? clauseIndex
            : null,

        subjectInherited:
          candidate.subjectHint !==
            subject,

        discourseSubject:
          discourseSubject,

        originalSubject,

        originalSubjectWasPronoun,

        resolvedPronoun:
          originalSubjectWasPronoun
            ? originalSubject
            : null,

        pronounResolution:
          originalSubjectWasPronoun
            ? pronounResolution
            : null,

        pronounResolutionStatus:
          originalSubjectWasPronoun
            ? (
                pronounResolution
                  ?.status ||
                "unresolved"
              )
            : null,

        pronounResolutionConfidence:
          originalSubjectWasPronoun
            ? (
                pronounResolution
                  ?.confidence ||
                0
              )
            : null,

        pronounResolutionMargin:
          originalSubjectWasPronoun
            ? (
                pronounResolution
                  ?.margin ||
                0
              )
            : null,
      },
    };


    results.push(
      resolvedCandidate
    );


    // ==================================================
    // Update Mention Memory AFTER Resolution
    //
    // Important:
    //
    // We must not put the current pronoun into memory
    // before trying to resolve that pronoun.
    // ==================================================

    if (
      subject &&
      !isPronoun(
        subject,
        locale
      )
    ) {
      const mention =
        createMention({
          name:
            subject,

          start:
            candidate.start ??
            null,

          end:
            candidate.end ??
            null,

          clauseIndex:
            clauseIndex >=
              0
              ? clauseIndex
              : null,

          role:
            "subject",

          source:
            candidate.candidateType ||
            null,
        });


      rememberMention(
        memory,
        mention
      );
    }


    if (
      object &&
      !isPronoun(
        object,
        locale
      )
    ) {
      const mention =
        createMention({
          name:
            object,

          start:
            candidate.start ??
            null,

          end:
            candidate.end ??
            null,

          clauseIndex:
            clauseIndex >=
              0
              ? clauseIndex
              : null,

          role:
            "object",

          source:
            candidate.candidateType ||
            null,
        });


      rememberMention(
        memory,
        mention
      );
    }
  }


  return results;
}


module.exports = {
  resolveCandidateContexts,
  normalizeSubject,
  isPronoun,
};