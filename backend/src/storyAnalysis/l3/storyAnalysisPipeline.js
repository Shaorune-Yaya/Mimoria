// ======================================================
// L3 Unified Story Analysis Pipeline
//
// Mimoria now performs two semantic passes:
//
// Pass 1
// ------------------------------------------------------
// L1 lexical analysis
// L2 context / coreference
// L3-A initial entity resolution
//
// Pass 2
// ------------------------------------------------------
// Semantic working memory
// Semantic entity type reranking
// Draft entity rebuilding
//
// Then:
//
// Schema/value resolution
// Story suggestion generation
//
// Still pure analysis.
// No database writes.
// ======================================================

const {
  scoreEventCandidates,
} = require(
  "./eventSemanticScoring"
);

const {
  analyzeStoryEntities,
} = require(
  "../index"
);


const {
  resolveFieldCandidateSchemas,
} = require(
  "./candidateSchemaResolver"
);


const {
  generateStorySuggestions,
} = require(
  "./storySuggestionGenerator"
);


const {
  buildSemanticState,
  serializeSemanticState,
} = require(
  "./semanticState"
);


const {
  inferPronounAttributeCandidates,
} = require(
  "./pronounAttributeResolver"
);


const {
  refineEntitySuggestions,
} = require(
  "./semanticEntityRefiner"
);


const {
  buildDraftEntities,
  enrichCandidatesWithDraftEntities,
} = require(
  "./draftEntityResolver"
);

const {
  scoreRelationCandidates,
} = require(
  "./relationSemanticScoring"
);

// ======================================================
// Main Pipeline
// ======================================================

function analyzeStoryForSuggestions(
  text,
  locale = "zh-CN",
  options = {}
) {
  const {
    entities = [],

    entityTypes = [],

    entityTypeConceptMap = {},

    enabledPacks = [],

    nsfwEnabled = false,
  } = options;


  // ====================================================
  // PASS 1
  //
  // L1 + L2 + Initial L3 Entity Resolution
  // ====================================================

  const initialEntityAnalysis =
    analyzeStoryEntities(
      text,
      locale,
      {
        ...options,

        entities,

        enabledPacks,

        nsfwEnabled,
      }
    );


  const initialResolvedCandidates =
    initialEntityAnalysis
      ?.resolvedCandidates ??
    [];


  const initialEntitySuggestions =
    initialEntityAnalysis
      ?.entitySuggestions ??
    [];


  // ====================================================
  // Initial Semantic Attributes
  //
  // Context resolution has already converted:
  //
  // 她 -> 诺拉
  //
  // Therefore we can derive:
  //
  // 诺拉 -> field.gender = female
  // ====================================================

  const initialPronounAttributeCandidates =
    inferPronounAttributeCandidates({
      candidates:
        initialResolvedCandidates,
    });


  // ====================================================
  // Initial Semantic Working Memory
  //
  // This memory is deliberately built BEFORE semantic
  // reranking.
  //
  // It becomes the contextual evidence for Pass 2.
  // ====================================================

  const initialSemanticCandidates = [
    ...initialResolvedCandidates,

    ...initialPronounAttributeCandidates,
  ];


  const initialSemanticState =
    buildSemanticState({
      candidates:
        initialSemanticCandidates,
    });


  // ====================================================
  // PASS 2
  //
  // Semantic Entity Type Reranking
  //
  // Re-evaluate missing/draft entity types using:
  //
  // - first-pass inference
  // - lexical evidence
  // - ontology expectations
  // - existing Canon EntityTypes
  // - Semantic Working Memory
  // - remembered fields
  // - mention frequency
  // - entity salience
  //
  // Example:
  //
  // Nora
  //
  // First pass:
  //   Character 0.68
  //
  // Semantic memory:
  //   age
  //   gender
  //   occupation
  //   repeated mentions
  //
  // Second pass:
  //   Character 0.94
  // ====================================================

  const refinedEntitySuggestions =
    refineEntitySuggestions({
      entitySuggestions:
        initialEntitySuggestions,

      semanticState:
        initialSemanticState,

      entityTypeConceptMap,
    });


  // ====================================================
  // Rebuild Draft Entities
  //
  // The first-pass Draft Entity may contain an older type.
  //
  // Since Pass 2 can improve the type classification,
  // rebuild drafts from the refined suggestions.
  // ====================================================

  const refinedDraftEntities =
    buildDraftEntities(
      refinedEntitySuggestions
    );


  // ====================================================
  // Re-attach Refined Drafts
  //
  // Existing canonical entities remain unchanged.
  //
  // Missing entities now receive their refined draft type.
  // ====================================================

  const refinedResolvedCandidates =
    enrichCandidatesWithDraftEntities({
      candidates:
        initialResolvedCandidates,

      draftEntities:
        refinedDraftEntities,
    });


  // ====================================================
  // Re-run Pronoun Semantic Attributes
  //
  // Pronoun inference itself usually will not change.
  //
  // However, rebuilding it here ensures the final semantic
  // candidate set references the refined candidate state.
  // ====================================================

  const pronounAttributeCandidates =
    inferPronounAttributeCandidates({
      candidates:
        refinedResolvedCandidates,
    });


  // ====================================================
  // Final Unified Semantic Candidates
  // ====================================================

  const semanticCandidates = [
    ...refinedResolvedCandidates,

    ...pronounAttributeCandidates,
  ];


  // ====================================================
  // Final Semantic State
  //
  // This is the analysis-time world representation after
  // semantic refinement.
  // ====================================================

  const semanticState =
    buildSemanticState({
      candidates:
        semanticCandidates,
    });


  // ====================================================
  // Final Entity Analysis
  //
  // Preserve everything returned by analyzeStoryEntities,
  // but replace the parts improved by Pass 2.
  // ====================================================

  const entityAnalysis = {
    ...initialEntityAnalysis,

    resolvedCandidates:
      refinedResolvedCandidates,

    entitySuggestions:
      refinedEntitySuggestions,

    draftEntities:
      refinedDraftEntities,
  };


  // ====================================================
  // Field Candidates
  // ====================================================

  const fieldCandidates =
    semanticCandidates.filter(
      (
        candidate
      ) =>
        candidate
          ?.candidateType ===
        "field-value"
    );


  // ====================================================
  // Relation Candidates
  // ====================================================

  const rawRelationCandidates =
    semanticCandidates.filter(
      (
        candidate
      ) =>
        candidate
          ?.candidateType ===
          "relation" ||
        Boolean(
          candidate
            ?.relationConcept
        )
    );


  const relationCandidates =
    scoreRelationCandidates({
      candidates:
        rawRelationCandidates,

      semanticState,
    });


  // ====================================================
  // Event Candidates
  // ====================================================

  const rawEventCandidates =
    semanticCandidates.filter(
      (
        candidate
      ) =>
        candidate
          ?.candidateType ===
          "event" ||
        Boolean(
          candidate
            ?.eventConcept
        )
    );


  // ====================================================
  // Event Argument Quality
  //
  // A high-confidence predicate does not guarantee that
  // subject/object spans were extracted correctly.
  //
  // Example:
  //
  // 前往
  //
  // may confidently mean event.travel,
  // while:
  //
  // 北境采集稀有药材
  //
  // is still a malformed object span.
  // ====================================================

  const eventScoring =
    scoreEventCandidates({
      candidates:
        rawEventCandidates,

      unknownEntities:
        entityAnalysis
          ?.unknownEntities ??
        [],
    });


  const eventCandidates =
    eventScoring
      .candidates;


  const suppressedEventCandidates =
    eventScoring
      .suppressedCandidates;


  // ====================================================
  // Schema / Value Resolution
  //
  // This now receives candidates containing refined Draft
  // Entity types.
  // ====================================================

  const schemaAnalysis =
    resolveFieldCandidateSchemas({
      fieldCandidates,

      entityTypes,

      entities,

      entityTypeConceptMap,

      locale,

      enabledPacks,

      nsfwEnabled,
    });


  // ====================================================
  // Story Suggestion Generation
  // ====================================================

  const suggestions =
    generateStorySuggestions({
      fieldCandidates:
        schemaAnalysis
          ?.candidates ??
        [],

      relationCandidates,

      eventCandidates,

      entitySuggestions:
        refinedEntitySuggestions,

      schemaSuggestions:
        schemaAnalysis
          ?.schemaSuggestions ??
        [],

      selectOptionSuggestions:
        schemaAnalysis
          ?.selectOptionSuggestions ??
        [],

      referenceEntitySuggestions:
        schemaAnalysis
          ?.referenceEntitySuggestions ??
        [],
    });


  // ====================================================
  // Result
  //
  // Only expose JSON-safe Semantic State snapshots.
  // ====================================================

  return {
    text,

    locale,

    entityAnalysis,

    suppressedEventCandidates,

    semanticStateSnapshot:
      serializeSemanticState(
        semanticState
      ),

    semanticRefinement: {
      initialState:
        serializeSemanticState(
          initialSemanticState
        ),

      refinedEntityCount:
        refinedEntitySuggestions.length,
    },

    schemaAnalysis,

    suggestions,

    summary:
      summarizeSuggestions(
        suggestions
      ),
  };
}


// ======================================================
// Summary
// ======================================================

function summarizeSuggestions(
  suggestions = []
) {
  const normalizedSuggestions =
    Array.isArray(
      suggestions
    )
      ? suggestions
      : [];


  const summary = {
    total:
      normalizedSuggestions.length,

    ready:
      0,

    needsUserConfirmation:
      0,

    informational:
      0,

    byKind:
      {},
  };


  for (
    const suggestion of
    normalizedSuggestions
  ) {
    if (
      suggestion?.status ===
      "ready"
    ) {
      summary.ready +=
        1;
    }


    if (
      suggestion?.status ===
      "needs-user-confirmation"
    ) {
      summary
        .needsUserConfirmation +=
        1;
    }


    if (
      suggestion?.status ===
      "informational"
    ) {
      summary
        .informational +=
        1;
    }


    const kind =
      suggestion?.kind ||
      "unknown";


    summary.byKind[
      kind
    ] =
      (
        summary.byKind[
          kind
        ] ||
        0
      ) +
      1;
  }


  return summary;
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  analyzeStoryForSuggestions,

  summarizeSuggestions,
};