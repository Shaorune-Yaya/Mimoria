const {
  scoreEntityHintQuality,
  combineEntityConfidence,
  getQualityDisposition,
} = require(
  "../l2/candidateQualityScoring"
);


// ======================================================
// L3 Event Semantic Scoring
//
// Event detection contains several independent questions:
//
// 1. Did we detect the predicate correctly?
//
// 2. Is the subject span valid?
//
// 3. Is the object span valid?
//
// These confidences must NOT be collapsed into the
// predicate lexical confidence.
//
// Example:
//
// 罗莎经常前往北境采集药材
//
// Predicate:
//
// 前往
// -> event.travel
// -> very high confidence
//
// But:
//
// object = "北境采集药材"
//
// may be a poor argument span.
//
// Therefore:
//
// predicateConfidence = 1.00
// objectSpanConfidence = 0.30
//
// final event confidence must become low.
// ======================================================


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


// ======================================================
// One Event
// ======================================================

function scoreEventCandidate({
  candidate,

  unknownEntities = [],
}) {
  if (
    !candidate
  ) {
    return null;
  }


  const predicateConfidence =
    clamp01(
      candidate
        ?.confidence ??
      0.7
    );


  // ====================================================
  // Subject Quality
  // ====================================================

  const subjectQuality =
    candidate
      ?.subjectHint
      ? scoreEntityHintQuality({
          hint:
            candidate.subjectHint,

          role:
            "subject",

          sourceCandidate:
            candidate,

          unknownEntities,
        })
      : null;


  // ====================================================
  // Object Quality
  // ====================================================

  const objectQuality =
    candidate
      ?.objectHint
      ? scoreEntityHintQuality({
          hint:
            candidate.objectHint,

          role:
            "object",

          sourceCandidate:
            candidate,

          unknownEntities,
        })
      : null;


  /*
   * Event arguments are a weakest-link system.
   *
   * A strong predicate cannot rescue malformed arguments.
   */
  let finalConfidence =
    predicateConfidence;


  if (
    subjectQuality
  ) {
    finalConfidence =
      combineEntityConfidence(
        finalConfidence,

        subjectQuality.score
      );
  }


  if (
    objectQuality
  ) {
    finalConfidence =
      combineEntityConfidence(
        finalConfidence,

        objectQuality.score
      );
  }


  /*
   * Object-bearing events require a reasonably credible
   * object mention.
   *
   * We do NOT delete the candidate.
   *
   * It remains available for diagnostics.
   */
  const argumentDisposition =
    getQualityDisposition(
      Math.min(
        subjectQuality
          ?.score ??
          1,

        objectQuality
          ?.score ??
          1
      )
    );


  const qualityDisposition =
    getQualityDisposition(
      finalConfidence
    );


  return {
    ...candidate,


    // --------------------------------------------------
    // Preserve original predicate confidence
    // --------------------------------------------------

    predicateConfidence,


    // --------------------------------------------------
    // Argument confidence
    // --------------------------------------------------

    subjectSpanConfidence:
      subjectQuality
        ?.score ??
      null,

    objectSpanConfidence:
      objectQuality
        ?.score ??
      null,


    // --------------------------------------------------
    // Final calibrated confidence
    // --------------------------------------------------

    confidence:
      finalConfidence,

    qualityDisposition,

    argumentDisposition,


    // --------------------------------------------------
    // Diagnostics
    // --------------------------------------------------

    eventQuality: {
      predicateConfidence,

      subject:
        subjectQuality,

      object:
        objectQuality,

      finalConfidence,

      qualityDisposition,

      argumentDisposition,
    },
  };
}


// ======================================================
// Batch
// ======================================================

function scoreEventCandidates({
  candidates = [],

  unknownEntities = [],
}) {
  const visible =
    [];


  const suppressed =
    [];


  for (
    const candidate of
    candidates ||
    []
  ) {
    const scored =
      scoreEventCandidate({
        candidate,

        unknownEntities,
      });


    if (
      !scored
    ) {
      continue;
    }


    /*
     * Bad argument boundaries should not become normal
     * Story Suggestions.
     *
     * Keep them for debugging instead.
     */
    if (
      scored.argumentDisposition ===
        "suppressed" ||
      scored.qualityDisposition ===
        "suppressed"
    ) {
      suppressed.push(
        scored
      );


      continue;
    }


    visible.push(
      scored
    );
  }


  return {
    candidates:
      visible,

    suppressedCandidates:
      suppressed,
  };
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  scoreEventCandidate,

  scoreEventCandidates,
};