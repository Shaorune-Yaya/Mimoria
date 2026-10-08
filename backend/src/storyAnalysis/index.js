const {
  CONCEPTS,
  getConcept,
  hasConcept,
  getConceptsByKind,
} = require(
  "./concepts/registry"
);

const {
  loadMatchableCategory,
  loadSupportCategory,
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

const {
  discoverUnknownEntities,
} = require(
  "./core/unknownEntityDiscovery"
);

const {
  normalizeSpeciesEvidence,
} = require(
  "./core/speciesNormalizer"
);

const {
  detectCompoundSpecies,
} = require(
  "./core/compoundSpeciesDetector"
);

const {
  mergeLexicons,
} = require(
  "./core/lexiconMerger"
);

const {
  loadPackLocale,
  clearPackCache,
  getPackDebugInfo,
} = require(
  "./packs/packLoader"
);

const {
  PACK_REGISTRY,
  getPackDefinition,
  hasPack,
  getAllPacks,
} = require(
  "./packs/packRegistry"
);


// ======================================================
// Lexicon Composition
// ======================================================

function buildLexicon(
  locale = "zh-CN",
  options = {}
) {
  const enabledPacks =
    Array.isArray(
      options.enabledPacks
    )
      ? options.enabledPacks
      : [];


  const nsfwEnabled =
    options.nsfwEnabled ===
    true;


  let lexicon =
    loadLocale(
      locale
    );


  lexicon = {
    ...lexicon,

    enabledPacks: [],

    nsfwEnabled,
  };


  for (
    const packId of
    enabledPacks
  ) {
    if (
      !hasPack(
        packId
      )
    ) {
      continue;
    }


    const packLexicon =
      loadPackLocale(
        packId,
        locale,
        {
          nsfwEnabled,
        }
      );


    lexicon =
      mergeLexicons(
        lexicon,
        packLexicon
      );
  }


  lexicon.nsfwEnabled =
    nsfwEnabled;


  return lexicon;
}


// ======================================================
// Lexical Analysis
// ======================================================

function analyzeLexicon(
  text,
  locale = "zh-CN",
  options = {}
) {
  const lexicon =
    buildLexicon(
      locale,
      options
    );


  const rawMatches =
    matchLexicon({
      text,
      lexicon,
    });


  const matches =
    rawMatches.map(
      (match) => ({
        ...match,

        concept:
          getConcept(
            match.conceptId
          ),
      })
    );


  const speciesEvidence =
    normalizeSpeciesEvidence({
      text,
      matches,
      lexicon,
      locale,
    });


  const compoundSpeciesCandidates =
    detectCompoundSpecies({
      text,

      speciesEvidence,

      matches,

      locale,
    });


  return {
    locale,

    enabledPacks:
      lexicon.enabledPacks,

    nsfwEnabled:
      lexicon.nsfwEnabled,

    normalizedText:
      normalizeText(
        text,
        locale
      ),

    matches,

    speciesEvidence,

    compoundSpeciesCandidates,

    lexicon,
  };
}


// ======================================================
// Unknown Entity Analysis
// ======================================================

function analyzeUnknownEntities(
  text,
  locale = "zh-CN",
  options = {}
) {
  const lexiconAnalysis =
    analyzeLexicon(
      text,
      locale,
      options
    );


  return {
    ...lexiconAnalysis,

    unknownEntities:
      discoverUnknownEntities({
        text,

        lexiconAnalysis: {
          ...lexiconAnalysis,

          conceptResolver:
            getConcept,
        },

        lexicon:
          lexiconAnalysis.lexicon,
      }),
  };
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  CONCEPTS,

  getConcept,
  hasConcept,
  getConceptsByKind,

  loadMatchableCategory,
  loadSupportCategory,
  loadLocale,
  clearLexiconCache,

  matchLexicon,

  normalizeText,
  normalizeForComparison,

  mergeLexicons,

  PACK_REGISTRY,
  getPackDefinition,
  hasPack,
  getAllPacks,

  loadPackLocale,
  clearPackCache,
  getPackDebugInfo,

  buildLexicon,

  normalizeSpeciesEvidence,
  detectCompoundSpecies,

  analyzeLexicon,
  analyzeUnknownEntities,
  discoverUnknownEntities,
};