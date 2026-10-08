// ======================================================
// Species Normalizer
//
// Produces normalized L1 species evidence.
//
// Examples:
//
// wolf     -> wolf
// wolves   -> wolf
// foxes    -> fox
// dragons  -> dragon
// bunnies  -> bunny
//
// Existing Chinese lexical matches are preserved.
//
// This module does NOT create field-value suggestions.
// ======================================================


// ======================================================
// Constants
// ======================================================

const STRENGTH_CONFIDENCE = {
  strong: 1,
  normal: 0.75,
  weak: 0.45,
};


const IRREGULAR_ENGLISH_PLURALS = {
  wolves: "wolf",

  foxes: "fox",

  mice: "mouse",

  geese: "goose",

  oxen: "ox",

  deer: "deer",

  sheep: "sheep",

  fish: "fish",

  species: "species",
};


// ======================================================
// Locale Helpers
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
// Lexicon Species Dictionary
// ======================================================

function collectSpeciesAliases(
  lexicon
) {
  const fields =
    lexicon
      ?.categories
      ?.fields
      ?.entries ||
    [];


  const dictionary =
    new Map();


  for (
    const entry of
    fields
  ) {
    if (
      entry.conceptId !==
      "field.species"
    ) {
      continue;
    }


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
      const values =
        aliases[strength] ||
        [];


      for (
        const value of
        values
      ) {
        const normalized =
          String(
            value
          )
            .trim()
            .toLowerCase();


        if (
          !normalized
        ) {
          continue;
        }


        const current =
          dictionary.get(
            normalized
          );


        const confidence =
          STRENGTH_CONFIDENCE[
            strength
          ] || 0.45;


        if (
          !current ||
          confidence >
            current.confidence
        ) {
          dictionary.set(
            normalized,
            {
              canonical:
                value,

              strength,

              confidence,
            }
          );
        }
      }
    }
  }


  return dictionary;
}


// ======================================================
// English Morphology
// ======================================================

function singularizeEnglishWord(
  word
) {
  const lower =
    String(
      word || ""
    )
      .toLowerCase();


  if (
    IRREGULAR_ENGLISH_PLURALS[
      lower
    ]
  ) {
    return IRREGULAR_ENGLISH_PLURALS[
      lower
    ];
  }


  /*
   * berries -> berry
   */
  if (
    lower.endsWith(
      "ies"
    ) &&
    lower.length >
      4
  ) {
    return (
      lower.slice(
        0,
        -3
      ) +
      "y"
    );
  }


  /*
   * foxes -> fox
   * boxes -> box
   * classes -> class
   *
   * Note:
   * foxes is already covered above,
   * but this keeps the normalizer generic.
   */
  if (
    lower.endsWith(
      "es"
    ) &&
    (
      lower.endsWith(
        "ses"
      ) ||
      lower.endsWith(
        "xes"
      ) ||
      lower.endsWith(
        "zes"
      ) ||
      lower.endsWith(
        "ches"
      ) ||
      lower.endsWith(
        "shes"
      )
    )
  ) {
    return lower.slice(
      0,
      -2
    );
  }


  /*
   * dragons -> dragon
   * cats -> cat
   *
   * Avoid:
   * species
   */
  if (
    lower.endsWith(
      "s"
    ) &&
    !lower.endsWith(
      "ss"
    ) &&
    lower.length >
      3
  ) {
    return lower.slice(
      0,
      -1
    );
  }


  return lower;
}


// ======================================================
// English Tokenization
// ======================================================

function tokenizeEnglish(
  text
) {
  const results =
    [];

  const pattern =
    /[A-Za-z][A-Za-z'’-]*/gu;

  let match;


  while (
    (
      match =
        pattern.exec(
          text
        )
    ) !==
    null
  ) {
    results.push({
      text:
        match[0],

      start:
        match.index,

      end:
        match.index +
        match[0].length,
    });
  }


  return results;
}


// ======================================================
// Existing Evidence
// ======================================================

function normalizeExistingSpeciesMatches(
  matches
) {
  return matches
    .filter(
      (match) =>
        match.conceptId ===
        "field.species"
    )
    .map(
      (match) => ({
        ...match,

        kind:
          "species-evidence",

        surface:
          match.expression,

        normalizedValue:
          String(
            match.expression
          )
            .trim()
            .toLowerCase(),

        normalization:
          "lexicon",

        synthetic:
          false,
      })
    );
}


// ======================================================
// English Synthetic Evidence
// ======================================================

function detectEnglishInflections({
  text,
  dictionary,
}) {
  const results =
    [];


  const tokens =
    tokenizeEnglish(
      text
    );


  for (
    const token of
    tokens
  ) {
    const lower =
      token.text
        .toLowerCase();


    /*
     * Exact aliases are already handled by
     * the normal matcher.
     */
    if (
      dictionary.has(
        lower
      )
    ) {
      continue;
    }


    const singular =
      singularizeEnglishWord(
        lower
      );


    if (
      singular ===
      lower
    ) {
      continue;
    }


    const definition =
      dictionary.get(
        singular
      );


    if (
      !definition
    ) {
      continue;
    }


    results.push({
      kind:
        "species-evidence",

      expression:
        token.text,

      surface:
        token.text,

      normalizedValue:
        singular,

      conceptId:
        "field.species",

      evidenceType:
        "morphology",

      strength:
        definition.strength,

      confidence:
        Math.max(
          0,
          definition.confidence -
            0.05
        ),

      start:
        token.start,

      end:
        token.end,

      normalization:
        "english-plural",

      synthetic:
        true,
    });
  }


  return results;
}


// ======================================================
// Duplicate Cleanup
// ======================================================

function collapseSpeciesEvidence(
  evidence
) {
  const groups =
    new Map();


  for (
    const item of
    evidence
  ) {
    const key = [
      item.start,
      item.end,
      item.normalizedValue,
    ].join(
      "::"
    );


    const current =
      groups.get(
        key
      );


    if (
      !current ||
      item.confidence >
        current.confidence
    ) {
      groups.set(
        key,
        item
      );
    }
  }


  return Array.from(
    groups.values()
  )
    .sort(
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
          (
            b.end -
            b.start
          ) -
          (
            a.end -
            a.start
          )
        );
      }
    );
}


// ======================================================
// Public API
// ======================================================

function normalizeSpeciesEvidence({
  text,
  matches,
  lexicon,
  locale,
}) {
  const existing =
    normalizeExistingSpeciesMatches(
      matches
    );


  if (
    isChineseLocale(
      locale
    )
  ) {
    return collapseSpeciesEvidence(
      existing
    );
  }


  if (
    !isEnglishLocale(
      locale
    )
  ) {
    return collapseSpeciesEvidence(
      existing
    );
  }


  const dictionary =
    collectSpeciesAliases(
      lexicon
    );


  const synthetic =
    detectEnglishInflections({
      text,
      dictionary,
    });


  return collapseSpeciesEvidence([
    ...existing,
    ...synthetic,
  ]);
}


module.exports = {
  normalizeSpeciesEvidence,
  singularizeEnglishWord,
};