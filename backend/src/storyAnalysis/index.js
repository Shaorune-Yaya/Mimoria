const {
  resolveFieldValue,
  resolveSelectValue,
  resolveEntityReferenceValue,
} = require(
  "./l3/fieldValueResolver"
);

const {
  normalizeFieldType,
  getCanonicalFieldValueType,
  inferRuntimeValueType,
  evaluateFieldTypeCompatibility,
  getStorageValuePreview,
} = require(
  "./l3/fieldTypeCompatibility"
);

const {
  resolveSchemaField,
  getSuggestedFieldMetadata,
} = require(
  "./l3/schemaFieldResolver"
);

const {
  resolveFieldCandidateSchemas,
} = require(
  "./l3/candidateSchemaResolver"
);

const {
  inferEntityType,
  findUnknownEntityEvidence,
  isCompatibleWithExpected,
} = require(
  "./l3/entityTypeInference"
);

const {
  getExpectedTypeConcepts,
  isConceptSameOrChildOf,
  calculateTypeCompatibility,
} = require(
  "./l3/typeCompatibility"
);

const {
  resolveEntityHint,
} = require(
  "./l3/entityResolver"
);

const {
  resolveCandidateEntities,
} = require(
  "./l3/candidateEntityResolver"
);

const {
  resolveCurrentState,
} = require(
  "./l2/currentStateResolver"
);

const {
  assembleEvents,
} = require(
  "./l2/eventAssembler"
);

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
  filterSpecificEvidence,
} = require(
  "./l2/evidenceFilter"
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

const {
  extractPatternCandidates,
} = require(
  "./l2/patternExtractor"
);

const {
  cleanupCandidates,
} = require(
  "./l2/candidateCleanup"
);

const {
  resolveCandidateContexts,
} = require(
  "./l2/contextResolver"
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
// L1
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
    level:
      "L1",

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
// L1 Unknown Entities
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
// L2 Pattern Analysis
// ======================================================

function analyzePatterns(
  text,
  locale = "zh-CN",
  options = {}
) {
  const lexicalAnalysis =
    analyzeLexicon(
      text,
      locale,
      options
    );


  const patternResult =
    extractPatternCandidates({
      text,
      locale,
      lexicalAnalysis,
    });


  /*
   * Step 1:
   * Remove duplicate / less-specific extractions.
   */
  const cleanedCandidates =
    cleanupCandidates(
      patternResult.candidates
    );


  /*
   * Step 2:
   * Resolve subject inheritance / pronouns.
   */
  const resolvedCandidates =
    resolveCandidateContexts({
      candidates:
        cleanedCandidates,

      clauses:
        patternResult.clauses,

      locale,
    });


  return {
    level:
      "L2",

    locale,

    enabledPacks:
      lexicalAnalysis
        .enabledPacks,

    nsfwEnabled:
      lexicalAnalysis
        .nsfwEnabled,

    clauses:
      patternResult.clauses,

    candidates:
      resolvedCandidates,

    lexicalAnalysis,
  };
}

// ======================================================
// L2 Full Story Analysis
// ======================================================

function analyzeStory(
  text,
  locale = "zh-CN",
  options = {}
) {
  const patternAnalysis =
    analyzePatterns(
      text,
      locale,
      options
    );


  const lexicalAnalysis =
    patternAnalysis
      .lexicalAnalysis;


  const eventResult =
    assembleEvents({
      text,
      locale,
      lexicalAnalysis,
    });


  const stateResult =
    resolveCurrentState(
      eventResult.events
    );


  return {
    level:
      "L2",

    locale,

    enabledPacks:
      lexicalAnalysis
        .enabledPacks,

    nsfwEnabled:
      lexicalAnalysis
        .nsfwEnabled,

    fieldCandidates:
      patternAnalysis
        .candidates,

    eventCandidates:
      eventResult.events,

    relationCandidates:
      stateResult
        .currentRelations,

    endedRelations:
      stateResult
        .endedRelations,

    relationHistory:
      stateResult
        .relationHistory,

    ignoredEvents:
      stateResult
        .ignoredEvents,

    nonRelationEvents:
      stateResult
        .nonRelationEvents,

    candidates: [
      ...patternAnalysis
        .candidates,

      ...eventResult
        .events,

      ...stateResult
        .currentRelations,
    ]
      .sort(
        (
          a,
          b
        ) =>
          (
            a.start ??
            Number.MAX_SAFE_INTEGER
          ) -
          (
            b.start ??
            Number.MAX_SAFE_INTEGER
          )
      ),

    clauses:
      patternAnalysis
        .clauses,

    lexicalAnalysis,
  };
}

// ======================================================
// L3-A Story Entity Analysis
// ======================================================

function analyzeStoryEntities(
  text,
  locale = "zh-CN",
  options = {}
) {
  const storyAnalysis =
    analyzeStory(
      text,
      locale,
      options
    );


  const unknownAnalysis =
    analyzeUnknownEntities(
      text,
      locale,
      options
    );


  const entities =
    Array.isArray(
      options.entities
    )
      ? options.entities
      : [];


  const entityTypeConceptMap =
    options.entityTypeConceptMap ||
    {};


  const resolvableCandidates = [
    ...storyAnalysis
      .fieldCandidates,

    ...storyAnalysis
      .eventCandidates,

    ...storyAnalysis
      .relationCandidates,
  ];


  const entityResolution =
    resolveCandidateEntities({
      candidates:
        resolvableCandidates,

      entities,

      entityTypeConceptMap,

      unknownEntities:
        unknownAnalysis
          .unknownEntities,
    });


  return {
    level:
      "L3-A",

    locale,

    storyAnalysis,

    unknownEntities:
      unknownAnalysis
        .unknownEntities,

    resolvedCandidates:
      entityResolution
        .candidates,

    entitySuggestions:
      entityResolution
        .entitySuggestions,
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

  extractPatternCandidates,
  cleanupCandidates,
  resolveCandidateContexts,

  assembleEvents,

  analyzePatterns,
  analyzeStory,

  filterSpecificEvidence,
  resolveCurrentState,

  discoverUnknownEntities,
  resolveEntityHint,
  resolveCandidateEntities,

  getExpectedTypeConcepts,
  isConceptSameOrChildOf,
  calculateTypeCompatibility,

  inferEntityType,
  findUnknownEntityEvidence,
  isCompatibleWithExpected,

  analyzeStoryEntities,

  resolveSchemaField,
  getSuggestedFieldMetadata,
  resolveFieldCandidateSchemas,
  
  normalizeFieldType,
  getCanonicalFieldValueType,
  inferRuntimeValueType,
  evaluateFieldTypeCompatibility,
  getStorageValuePreview,

  resolveFieldValue,
  resolveSelectValue,
  resolveEntityReferenceValue,
};