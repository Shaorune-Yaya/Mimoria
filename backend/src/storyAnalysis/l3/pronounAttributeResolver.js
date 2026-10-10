// ======================================================
// L3 Pronoun Attribute Resolver
//
// Converts resolved grammatical pronoun evidence into
// semantic field candidates.
//
// Example:
//
// 诺拉来自北境。她是一名炼金术师。
//
// L2 resolves:
//
// 她 -> 诺拉
//
// L3 can therefore derive:
//
// 诺拉
// field.gender
// female
//
// This produces analysis evidence only.
// It never writes directly to Canon.
// ======================================================


// ======================================================
// Pronoun Semantics
// ======================================================

const PRONOUN_ATTRIBUTES = {
  // Chinese

  "她": {
    gender:
      "female",

    confidence:
      0.93,
  },

  "她的": {
    gender:
      "female",

    confidence:
      0.93,
  },

  "他": {
    gender:
      "male",

    confidence:
      0.93,
  },

  "他的": {
    gender:
      "male",

    confidence:
      0.93,
  },


  // English

  she: {
    gender:
      "female",

    confidence:
      0.93,
  },

  her: {
    gender:
      "female",

    confidence:
      0.90,
  },

  hers: {
    gender:
      "female",

    confidence:
      0.93,
  },

  herself: {
    gender:
      "female",

    confidence:
      0.93,
  },

  he: {
    gender:
      "male",

    confidence:
      0.93,
  },

  him: {
    gender:
      "male",

    confidence:
      0.90,
  },

  his: {
    gender:
      "male",

    confidence:
      0.93,
  },

  himself: {
    gender:
      "male",

    confidence:
      0.93,
  },
};


// ======================================================
// Helpers
// ======================================================

function normalizePronoun(
  value
) {
  return String(
    value ||
    ""
  )
    .normalize(
      "NFKC"
    )
    .trim()
    .toLowerCase();
}


function getPronounAttribute(
  pronoun
) {
  if (
    !pronoun
  ) {
    return null;
  }


  const exact =
    PRONOUN_ATTRIBUTES[
      String(
        pronoun
      )
        .trim()
    ];


  if (
    exact
  ) {
    return exact;
  }


  return (
    PRONOUN_ATTRIBUTES[
      normalizePronoun(
        pronoun
      )
    ] ||
    null
  );
}


function makeCandidateKey(
  candidate
) {
  return [
    candidate.subjectEntityId ||
      candidate.subjectHint ||
      "",

    candidate.fieldConcept ||
      "",

    String(
      candidate.normalizedValue ??
      candidate.value ??
      ""
    ),
  ].join(
    "::"
  );
}


// ======================================================
// Main
// ======================================================

function inferPronounAttributeCandidates({
  candidates = [],
}) {
  const results =
    [];


  const seen =
    new Set();


  for (
    const candidate of
    candidates
  ) {
    const pronoun =
      candidate
        ?.context
        ?.resolvedPronoun ||
      null;


    if (
      !pronoun
    ) {
      continue;
    }

    /*
    * Never derive a semantic attribute from an ambiguous
    * coreference.
    *
    * Example:
    *
    * Nora met Alice. She...
    *
    * If "she" cannot be confidently attached to one person,
    * we must not assign gender to either entity.
    */
    const pronounResolutionStatus =
    candidate
        ?.context
        ?.pronounResolutionStatus ||
    null;


    if (
    pronounResolutionStatus &&
    pronounResolutionStatus !==
        "resolved"
    ) {
    continue;
    }
    
    const attribute =
      getPronounAttribute(
        pronoun
      );


    if (
      !attribute?.gender
    ) {
      continue;
    }


    /*
     * Coreference must already have produced a concrete
     * semantic subject.
     *
     * We never create:
     *
     * 她 -> gender=female
     *
     * as an entity called "她".
     */
    const subjectHint =
      candidate.subjectHint ||
      candidate
        ?.context
        ?.discourseSubject ||
      null;


    if (
      !subjectHint
    ) {
      continue;
    }


    const genderCandidate = {
      candidateType:
        "field-value",

      subjectHint,

      subjectEntityId:
        candidate
          .subjectEntityId ||
        null,

      subjectDraftEntityKey:
        candidate
          .subjectDraftEntityKey ||
        null,

      subjectTypeConcept:
        candidate
          .subjectTypeConcept ||
        "entityType.character",

      fieldConcept:
        "field.gender",

      value:
        attribute.gender,

      normalizedValue:
        attribute.gender,

      sourceText:
        candidate.sourceText ||
        pronoun,

      start:
        candidate.start,

      end:
        candidate.end,

      confidence:
        attribute.confidence,

      extractor:
        "semantic.pronoun-attribute",

      evidence: [
        {
          type:
            "pronoun-coreference",

          pronoun,

          resolvedSubject:
            subjectHint,

          confidence:
            attribute.confidence,
        },
      ],

      context: {
        ...(candidate.context ||
          {}),

        inferredFromPronoun:
          true,

        pronoun,

        semanticAttribute:
          "gender",
      },
    };


    const key =
      makeCandidateKey(
        genderCandidate
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


    results.push(
      genderCandidate
    );
  }


  return results;
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  PRONOUN_ATTRIBUTES,

  getPronounAttribute,

  inferPronounAttributeCandidates,
};