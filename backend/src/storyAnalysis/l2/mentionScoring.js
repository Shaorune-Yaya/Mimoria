// ======================================================
// L2 Mention Scoring
//
// Lightweight discourse / coreference ranking.
//
// Inspired by modern mention-ranking coreference systems:
//
// pronoun
//   ↓
// candidate antecedents
//   ↓
// contextual feature scoring
//   ↓
// best antecedent + confidence margin
//
// This layer is intentionally deterministic.
//
// It does NOT write Canon.
// It does NOT know MongoDB.
// It only ranks discourse mentions.
// ======================================================


// ======================================================
// Weights
// ======================================================

const MENTION_WEIGHTS = {
  /*
   * Recency is important, similar to attention decay.
   */
  sameClause:
    0.42,

  previousClause:
    0.32,

  recentMention:
    0.26,


  /*
   * Grammatical salience.
   *
   * Previous subjects tend to remain discourse topics.
   */
  previousSubject:
    0.34,

  discourseSubject:
    0.26,

  previousObject:
    0.15,


  /*
   * Repeated references strengthen an entity's
   * representation in discourse memory.
   */
  repeatedMention:
    0.06,


  /*
   * Penalize increasingly distant mentions.
   */
  clauseDistancePenalty:
    -0.10,

  characterDistancePenalty:
    -0.0008,
};


// ======================================================
// Constants
// ======================================================

const MIN_ACCEPT_SCORE =
  0.30;


const MIN_CONFIDENCE_MARGIN =
  0.12;


const MAX_MEMORY_MENTIONS =
  24;


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


function normalizeName(
  value
) {
  return String(
    value ||
    ""
  )
    .normalize(
      "NFKC"
    )
    .trim();
}


// ======================================================
// Memory Entry
// ======================================================

function createMention({
  name,

  start = null,

  end = null,

  clauseIndex = null,

  role = null,

  source = null,
}) {
  const normalizedName =
    normalizeName(
      name
    );


  if (
    !normalizedName
  ) {
    return null;
  }


  return {
    name:
      normalizedName,

    normalizedName,

    start:
      Number.isFinite(
        start
      )
        ? start
        : null,

    end:
      Number.isFinite(
        end
      )
        ? end
        : null,

    clauseIndex:
      Number.isInteger(
        clauseIndex
      )
        ? clauseIndex
        : null,

    role:
      role ||
      null,

    source:
      source ||
      null,
  };
}


// ======================================================
// Discourse Memory
// ======================================================

function createMentionMemory() {
  return {
    mentions:
      [],

    stats:
      new Map(),

    lastSubject:
      null,

    lastObject:
      null,
  };
}


function rememberMention(
  memory,
  mention
) {
  if (
    !memory ||
    !mention?.name
  ) {
    return;
  }


  memory.mentions.push(
    mention
  );


  if (
    memory.mentions.length >
    MAX_MEMORY_MENTIONS
  ) {
    memory.mentions.splice(
      0,
      memory.mentions.length -
        MAX_MEMORY_MENTIONS
    );
  }


  const existing =
    memory.stats.get(
      mention.normalizedName
    ) ||
    {
      count:
        0,

      subjectCount:
        0,

      objectCount:
        0,

      lastStart:
        null,

      lastClauseIndex:
        null,
    };


  existing.count +=
    1;


  if (
    mention.role ===
    "subject"
  ) {
    existing.subjectCount +=
      1;


    memory.lastSubject =
      mention.name;
  }


  if (
    mention.role ===
    "object"
  ) {
    existing.objectCount +=
      1;


    memory.lastObject =
      mention.name;
  }


  existing.lastStart =
    mention.start;


  existing.lastClauseIndex =
    mention.clauseIndex;


  memory.stats.set(
    mention.normalizedName,
    existing
  );
}


// ======================================================
// Candidate Collection
// ======================================================

function collectAntecedentCandidates(
  memory
) {
  if (
    !memory?.mentions?.length
  ) {
    return [];
  }


  const byName =
    new Map();


  /*
   * Walk backwards.
   *
   * The newest mention becomes the representative mention
   * for that entity, while stats still preserve its older
   * discourse history.
   */
  for (
    let index =
      memory.mentions.length -
      1;

    index >=
      0;

    index -=
      1
  ) {
    const mention =
      memory.mentions[
        index
      ];


    if (
      byName.has(
        mention.normalizedName
      )
    ) {
      continue;
    }


    byName.set(
      mention.normalizedName,
      mention
    );
  }


  return Array.from(
    byName.values()
  );
}


// ======================================================
// Individual Mention Score
// ======================================================

function scoreAntecedent({
  mention,

  memory,

  currentStart = null,

  currentClauseIndex = null,

  discourseSubject = null,
}) {
  let rawScore =
    0;


  const evidence =
    [];


  function add(
    score,
    reason
  ) {
    rawScore +=
      score;


    evidence.push({
      score,

      reason,
    });
  }


  // ----------------------------------------------------
  // Clause Distance
  // ----------------------------------------------------

  if (
    Number.isInteger(
      currentClauseIndex
    ) &&
    Number.isInteger(
      mention.clauseIndex
    )
  ) {
    const clauseDistance =
      Math.max(
        0,
        currentClauseIndex -
          mention.clauseIndex
      );


    if (
      clauseDistance ===
      0
    ) {
      add(
        MENTION_WEIGHTS
          .sameClause,

        "same-clause"
      );
    } else if (
      clauseDistance ===
      1
    ) {
      add(
        MENTION_WEIGHTS
          .previousClause,

        "previous-clause"
      );
    }


    if (
      clauseDistance >
      1
    ) {
      add(
        MENTION_WEIGHTS
          .clauseDistancePenalty *
          (
            clauseDistance -
            1
          ),

        "clause-distance"
      );
    }
  }


  // ----------------------------------------------------
  // Character Distance
  // ----------------------------------------------------

  if (
    Number.isFinite(
      currentStart
    ) &&
    Number.isFinite(
      mention.start
    )
  ) {
    const characterDistance =
      Math.max(
        0,
        currentStart -
          mention.start
      );


    /*
     * Very recent mentions receive positive attention.
     */
    if (
      characterDistance <=
      80
    ) {
      add(
        MENTION_WEIGHTS
          .recentMention,

        "recent-mention"
      );
    }


    if (
      characterDistance >
      80
    ) {
      add(
        MENTION_WEIGHTS
          .characterDistancePenalty *
          Math.min(
            characterDistance -
              80,

            500
          ),

        "character-distance"
      );
    }
  }


  // ----------------------------------------------------
  // Grammatical Salience
  // ----------------------------------------------------

  if (
    mention.name ===
    memory.lastSubject
  ) {
    add(
      MENTION_WEIGHTS
        .previousSubject,

      "previous-subject"
    );
  }


  if (
    mention.name ===
    memory.lastObject
  ) {
    add(
      MENTION_WEIGHTS
        .previousObject,

      "previous-object"
    );
  }


  if (
    discourseSubject &&
    mention.name ===
      discourseSubject
  ) {
    add(
      MENTION_WEIGHTS
        .discourseSubject,

      "discourse-subject"
    );
  }


  // ----------------------------------------------------
  // Mention Frequency
  // ----------------------------------------------------

  const stats =
    memory.stats.get(
      mention.normalizedName
    );


  if (
    stats?.count >
    1
  ) {
    add(
      Math.min(
        0.18,

        (
          stats.count -
          1
        ) *
          MENTION_WEIGHTS
            .repeatedMention
      ),

      "repeated-mention"
    );
  }


  /*
   * Ranking score rather than calibrated probability.
   */
  const confidence =
    rawScore <=
      0
      ? 0
      : (
          1 -
          Math.exp(
            -rawScore
          )
        );


  return {
    mention,

    rawScore,

    score:
      clamp01(
        confidence
      ),

    evidence,
  };
}


// ======================================================
// Pronoun Resolution
// ======================================================

function rankPronounAntecedents({
  memory,

  currentStart = null,

  currentClauseIndex = null,

  discourseSubject = null,
}) {
  const candidates =
    collectAntecedentCandidates(
      memory
    );


  const ranked =
    candidates
      .map(
        (
          mention
        ) =>
          scoreAntecedent({
            mention,

            memory,

            currentStart,

            currentClauseIndex,

            discourseSubject,
          })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.score -
          a.score
      );


  const best =
    ranked[0] ||
    null;


  const second =
    ranked[1] ||
    null;


  const margin =
    best
      ? best.score -
        (
          second?.score ||
          0
        )
      : 0;


  const accepted =
    Boolean(
      best &&
      best.score >=
        MIN_ACCEPT_SCORE &&
      (
        !second ||
        margin >=
          MIN_CONFIDENCE_MARGIN
      )
    );


  return {
    status:
      !best
        ? "unresolved"
        : accepted
          ? "resolved"
          : "ambiguous",

    antecedent:
      accepted
        ? best.mention.name
        : null,

    bestCandidate:
      best,

    alternatives:
      ranked.slice(
        1,
        4
      ),

    confidence:
      best?.score ||
      0,

    margin,

    ranked,
  };
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  MENTION_WEIGHTS,

  createMention,

  createMentionMemory,

  rememberMention,

  collectAntecedentCandidates,

  scoreAntecedent,

  rankPronounAntecedents,
};