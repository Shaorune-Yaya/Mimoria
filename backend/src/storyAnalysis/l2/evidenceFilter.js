// ======================================================
// L2 Evidence Filter
//
// Removes weaker / nested lexical evidence before
// pattern extraction.
//
// Examples:
//
// 魔法师
// └─ 法师
//
// 意识等级
// └─ 等级
//
// 完全自主意识
// └─ 自主意识
//
// Prefer the larger and more specific evidence.
// ======================================================


function getLength(
  item
) {
  return Math.max(
    0,
    item.end -
      item.start
  );
}


function contains(
  outer,
  inner
) {
  return (
    outer.start <=
      inner.start &&
    outer.end >=
      inner.end
  );
}


function isStrictlyLarger(
  outer,
  inner
) {
  return (
    contains(
      outer,
      inner
    ) &&
    getLength(
      outer
    ) >
      getLength(
        inner
      )
  );
}


// ======================================================
// Concept Compatibility
// ======================================================

function shouldCompete(
  outer,
  inner
) {
  const outerKind =
    outer.concept
      ?.kind;

  const innerKind =
    inner.concept
      ?.kind;


  /*
   * Same semantic kind:
   *
   * role vs role
   * field vs field
   * entity-type vs entity-type
   */
  if (
    outerKind &&
    outerKind ===
      innerKind
  ) {
    return true;
  }


  return false;
}


// ======================================================
// Specificity
// ======================================================

function isMoreSpecific(
  outer,
  inner
) {
  if (
    !isStrictlyLarger(
      outer,
      inner
    )
  ) {
    return false;
  }


  if (
    !shouldCompete(
      outer,
      inner
    )
  ) {
    return false;
  }


  /*
   * Higher confidence wins immediately.
   */
  if (
    outer.confidence >
    inner.confidence
  ) {
    return true;
  }


  /*
   * Equal confidence:
   * prefer longer phrase.
   */
  if (
    outer.confidence ===
    inner.confidence
  ) {
    return true;
  }


  /*
   * Allow a significantly longer phrase to suppress
   * a slightly higher-confidence generic fragment.
   */
  const lengthDifference =
    getLength(
      outer
    ) -
    getLength(
      inner
    );


  if (
    lengthDifference >=
      2 &&
    outer.confidence >=
      inner.confidence -
        0.2
  ) {
    return true;
  }


  return false;
}


// ======================================================
// Public
// ======================================================

function filterSpecificEvidence(
  matches
) {
  if (
    !Array.isArray(
      matches
    )
  ) {
    return [];
  }


  return matches.filter(
    (
      candidate,
      candidateIndex
    ) => {
      for (
        let index =
          0;
        index <
          matches.length;
        index +=
          1
      ) {
        if (
          index ===
          candidateIndex
        ) {
          continue;
        }


        const other =
          matches[index];


        if (
          isMoreSpecific(
            other,
            candidate
          )
        ) {
          return false;
        }
      }


      return true;
    }
  );
}


module.exports = {
  filterSpecificEvidence,
};