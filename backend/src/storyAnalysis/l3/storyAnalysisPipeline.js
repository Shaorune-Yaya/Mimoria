// ======================================================
// L3 Unified Story Analysis Pipeline
//
// Combines:
//
// L1 / L2
// L3-A entity resolution
// L3-B schema/value resolution
// L3-C story suggestion generation
//
// Still pure analysis.
// No database writes.
// ======================================================


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


  // ----------------------------------------------------
  // L1 + L2 + L3-A
  // ----------------------------------------------------

  const entityAnalysis =
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


  const allResolvedCandidates =
    entityAnalysis
      ?.resolvedCandidates ??
    [];


  const fieldCandidates =
    allResolvedCandidates.filter(
      (candidate) =>
        candidate
          ?.candidateType ===
        "field-value"
    );


  // ----------------------------------------------------
  // L3-B
  // ----------------------------------------------------

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


  /*
   * analyzeStoryEntities already contains resolved
   * relation/event candidates.
   *
   * Keep field candidates from L3-B because they now
   * contain schema/value resolution information.
   */
  const relationCandidates =
    allResolvedCandidates.filter(
      (candidate) =>
        candidate
          ?.candidateType ===
          "relation" ||
        candidate
          ?.relationConcept
    );


  const eventCandidates =
    allResolvedCandidates.filter(
      (candidate) =>
        candidate
          ?.candidateType ===
          "event" ||
        candidate
          ?.eventConcept
    );


  // ----------------------------------------------------
  // L3-C
  // ----------------------------------------------------

  const suggestions =
    generateStorySuggestions({
      fieldCandidates:
        schemaAnalysis
          .candidates,

      relationCandidates,

      eventCandidates,

      entitySuggestions:
        entityAnalysis
          ?.entitySuggestions ??
        [],

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


  return {
    text,

    locale,

    entityAnalysis,

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
  suggestions
) {
  const summary = {
    total:
      suggestions.length,

    ready:
      0,

    needsUserConfirmation:
      0,

    informational:
      0,

    byKind: {},
  };


  for (
    const suggestion of
    suggestions
  ) {
    if (
      suggestion.status ===
      "ready"
    ) {
      summary.ready +=
        1;
    }


    if (
      suggestion.status ===
      "needs-user-confirmation"
    ) {
      summary
        .needsUserConfirmation +=
        1;
    }


    if (
      suggestion.status ===
      "informational"
    ) {
      summary
        .informational +=
        1;
    }


    const kind =
      suggestion.kind ||
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