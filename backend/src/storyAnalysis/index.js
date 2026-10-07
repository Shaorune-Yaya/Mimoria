const {
  CONCEPTS,
  getConcept,
  hasConcept,
  getConceptsByKind,
} = require(
  "./concepts/registry"
);

const {
  loadCategory,
  loadLocale,
  clearLexiconCache,
} = require(
  "./core/lexiconLoader"
);

const {
  matchLexicon,
} = require(
  "./core/lexiconMatcher"
);

const {
  normalizeText,
  normalizeForComparison,
} = require(
  "./core/textNormalizer"
);


function analyzeLexicon(
  text,
  locale = "zh-CN"
) {
  const lexicon =
    loadLocale(
      locale
    );


  return {
    locale,

    normalizedText:
      normalizeText(
        text,
        locale
      ),

    matches:
      matchLexicon({
        text,
        lexicon,
      }),
  };
}


module.exports = {
  CONCEPTS,

  getConcept,
  hasConcept,
  getConceptsByKind,

  loadCategory,
  loadLocale,
  clearLexiconCache,

  matchLexicon,

  normalizeText,
  normalizeForComparison,

  analyzeLexicon,
};