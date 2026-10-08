// ======================================================
// L2 Candidate Cleanup
// ======================================================


function getLength(
  candidate
) {
  return Math.max(
    0,
    candidate.end -
      candidate.start
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


function overlaps(
  a,
  b
) {
  return (
    a.start <
      b.end &&
    b.start <
      a.end
  );
}


function sameCandidateType(
  a,
  b
) {
  return (
    a.candidateType ===
    b.candidateType
  );
}


function sameField(
  a,
  b
) {
  return (
    a.candidateType ===
      "field-value" &&
    b.candidateType ===
      "field-value" &&
    a.fieldConcept ===
      b.fieldConcept
  );
}


function normalizedText(
  value
) {
  if (
    value ===
    null ||
    value ===
    undefined
  ) {
    return "";
  }


  if (
    typeof value ===
    "string"
  ) {
    return value
      .trim()
      .toLowerCase();
  }


  return JSON.stringify(
    value
  );
}


// ======================================================
// Exact Duplicate
// ======================================================

function removeExactDuplicates(
  candidates
) {
  const map =
    new Map();


  for (
    const candidate of
    candidates
  ) {
    const key = [
      candidate.candidateType,
      candidate.fieldConcept ||
        "",
      candidate.eventConcept ||
        "",
      candidate.relationConcept ||
        "",
      candidate.subjectHint ||
        "",
      candidate.start,
      candidate.end,
      normalizedText(
        candidate.normalizedValue
      ),
    ].join(
      "::"
    );


    const existing =
      map.get(
        key
      );


    if (
      !existing ||
      candidate.confidence >
        existing.confidence
    ) {
      map.set(
        key,
        candidate
      );
    }
  }


  return Array.from(
    map.values()
  );
}


// ======================================================
// Same-field Semantic Containment
// ======================================================

function removeNestedSameFieldCandidates(
  candidates
) {
  return candidates.filter(
    (
      candidate,
      candidateIndex
    ) => {
      if (
        candidate.candidateType !==
        "field-value"
      ) {
        return true;
      }


      for (
        let index =
          0;
        index <
          candidates.length;
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
          candidates[index];


        if (
          !sameField(
            candidate,
            other
          )
        ) {
          continue;
        }


        const candidateValue =
          normalizedText(
            candidate.normalizedValue
          );


        const otherValue =
          normalizedText(
            other.normalizedValue
          );


        /*
         * Example:
         *
         * 完全自主意识
         * contains
         * 自主意识
         */
        const semanticContainment =
          typeof candidateValue ===
            "string" &&
          typeof otherValue ===
            "string" &&
          otherValue.includes(
            candidateValue
          ) &&
          otherValue !==
            candidateValue;


        if (
          semanticContainment &&
          other.confidence >=
            candidate.confidence
        ) {
          return false;
        }


        /*
         * Same source range containment.
         */
        if (
          contains(
            other,
            candidate
          ) &&
          other.confidence >
            candidate.confidence
        ) {
          return false;
        }


        /*
         * Overlapping candidates with same field and
         * same value: keep stronger / larger one.
         */
        if (
          overlaps(
            other,
            candidate
          ) &&
          otherValue ===
            candidateValue
        ) {
          if (
            other.confidence >
            candidate.confidence
          ) {
            return false;
          }


          if (
            other.confidence ===
              candidate.confidence &&
            getLength(
              other
            ) >
              getLength(
                candidate
              )
          ) {
            return false;
          }
        }
      }


      return true;
    }
  );
}


// ======================================================
// Role Specificity
// ======================================================

function removeNestedRoleValues(
  candidates
) {
  return candidates.filter(
    (
      candidate,
      candidateIndex
    ) => {
      if (
        candidate.candidateType !==
          "field-value" ||
        ![
          "field.occupation",
          "field.rank",
        ].includes(
          candidate.fieldConcept
        )
      ) {
        return true;
      }


      const candidateValue =
        String(
          candidate.value ||
          ""
        );


      for (
        let index =
          0;
        index <
          candidates.length;
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
          candidates[index];


        if (
          other.candidateType !==
            "field-value" ||
          other.fieldConcept !==
            candidate.fieldConcept
        ) {
          continue;
        }


        const otherValue =
          String(
            other.value ||
            ""
          );


        /*
         * 魔法师
         * contains
         * 法师
         */
        if (
          otherValue.length >
            candidateValue.length &&
          otherValue.includes(
            candidateValue
          ) &&
          other.confidence >=
            candidate.confidence
        ) {
          return false;
        }
      }


      return true;
    }
  );
}


// ======================================================
// Public
// ======================================================

function cleanupCandidates(
  candidates
) {
  let result =
    removeExactDuplicates(
      candidates
    );


  result =
    removeNestedSameFieldCandidates(
      result
    );


  result =
    removeNestedRoleValues(
      result
    );


  return result.sort(
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
  cleanupCandidates,
};