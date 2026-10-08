// ======================================================
// L3-C Story Suggestion Generator
//
// Converts internal analysis results into normalized
// user-facing Story Suggestions.
//
// Important:
//
// - No database writes.
// - No automatic canon changes.
// - Every suggestion still requires user confirmation.
// ======================================================


// ======================================================
// Helpers
// ======================================================

function makeSuggestionId(
  parts
) {
  return parts
    .filter(
      (part) =>
        part !==
          null &&
        part !==
          undefined &&
        part !==
          ""
    )
    .map(
      (part) =>
        String(
          part
        )
    )
    .join(
      "::"
    );
}


function getCandidateConfidence(
  candidate
) {
  return (
    candidate?.confidence ??
    candidate
      ?.schemaResolution
      ?.confidence ??
    0.7
  );
}


// ======================================================
// Field Update Suggestions
// ======================================================

function createFieldUpdateSuggestion(
  candidate
) {
  if (
    candidate
      ?.schemaResolution
      ?.status !==
      "resolved"
  ) {
    return null;
  }


  /*
   * A missing or ambiguous Entity-Reference is not yet
   * safe to write.
   */
  if (
    candidate
      ?.valueResolution
      ?.status ===
      "missing-reference" ||
    candidate
      ?.valueResolution
      ?.status ===
      "ambiguous-reference" ||
    candidate
      ?.valueResolution
      ?.status ===
      "missing-reference-hint"
  ) {
    return null;
  }


  /*
   * Missing Select option is also not directly writable.
   */
  if (
    candidate
      ?.valueResolution
      ?.status ===
      "missing-option"
  ) {
    return null;
  }


  /*
   * Explicitly incompatible schema types must not
   * generate ready-to-apply field updates.
   */
  if (
    candidate
      ?.typeCompatibility
      ?.compatible ===
      false
  ) {
    return null;
  }


  if (
    !candidate
      ?.subjectEntityId
  ) {
    return null;
  }


  if (
    !candidate
      ?.resolvedFieldKey
  ) {
    return null;
  }


  if (
    candidate
      .storageValuePreview ===
      undefined ||
    candidate
      .storageValuePreview ===
      null
  ) {
    return null;
  }


  return {
    suggestionId:
      makeSuggestionId([
        "field-update",

        candidate
          .subjectEntityId,

        candidate
          .resolvedFieldKey,

        JSON.stringify(
          candidate
            .storageValuePreview
        ),
      ]),

    kind:
      "field-update",

    status:
      "ready",

    targetEntityId:
      candidate
        .subjectEntityId,

    targetEntityName:
      candidate
        .subjectHint,

    fieldKey:
      candidate
        .resolvedFieldKey,

    fieldLabel:
      candidate
        .resolvedFieldLabel,

    fieldConcept:
      candidate
        .fieldConcept,

    fieldType:
      candidate
        .resolvedFieldType,

    value:
      candidate
        .storageValuePreview,

    originalValue:
      candidate
        .normalizedValue ??
      candidate
        .value,

    confidence:
      getCandidateConfidence(
        candidate
      ),

    warnings:
      [
        candidate
          ?.typeCompatibility
          ?.warning,
      ].filter(
        Boolean
      ),

    source:
      {
        candidateType:
          candidate
            .candidateType,

        subjectHint:
          candidate
            .subjectHint,

        schemaMatchType:
          candidate
            ?.schemaResolution
            ?.matchType,

        typeCompatibility:
          candidate
            ?.typeCompatibility
            ?.status,

        valueResolution:
          candidate
            ?.valueResolution
            ?.status,
      },
  };
}


// ======================================================
// Missing Schema Field Suggestions
// ======================================================

function createSchemaFieldSuggestion(
  suggestion
) {
  return {
    suggestionId:
      makeSuggestionId([
        "create-schema-field",

        suggestion
          .targetEntityTypeId,

        suggestion
          .canonicalConcept,
      ]),

    kind:
      "create-schema-field",

    status:
      "needs-user-confirmation",

    targetEntityTypeId:
      suggestion
        .targetEntityTypeId,

    targetEntityTypeName:
      suggestion
        .targetEntityTypeName,

    fieldConcept:
      suggestion
        .canonicalConcept,

    suggestedLabel:
      suggestion
        .suggestedLabel,

    suggestedValueType:
      suggestion
        .suggestedValueType,

    exampleValues:
      suggestion
        .exampleValues ??
      [
        suggestion
          .exampleValue,
      ],

    confidence:
      suggestion
        .confidence ??
      0.7,

    source:
      {
        subject:
          suggestion
            .sourceSubject,

        entityId:
          suggestion
            .sourceEntityId,
      },
  };
}


// ======================================================
// Select Option Suggestions
// ======================================================

function createSelectOptionSuggestion(
  suggestion
) {
  return {
    suggestionId:
      makeSuggestionId([
        "create-select-option",

        suggestion
          .fieldKey,

        suggestion
          .suggestedValue,
      ]),

    kind:
      "create-select-option",

    status:
      "needs-user-confirmation",

    targetEntityTypeId:
      suggestion
        .targetEntityTypeId,

    fieldKey:
      suggestion
        .fieldKey,

    fieldLabel:
      suggestion
        .fieldLabel,

    fieldConcept:
      suggestion
        .fieldConcept,

    value:
      suggestion
        .suggestedValue,

    confidence:
      suggestion
        .confidence ??
      0.7,

    source:
      {
        subject:
          suggestion
            .sourceSubject,

        entityId:
          suggestion
            .sourceEntityId,
      },
  };
}


// ======================================================
// Create Entity Suggestions
// ======================================================

function normalizeEntitySuggestionName(
  value
) {
  return String(
    value || ""
  )
    .normalize(
      "NFKC"
    )
    .trim();
}


function isObviouslyNonEntitySuggestion(
  suggestion
) {
  const name =
    normalizeEntitySuggestionName(
      suggestion
        ?.name
    );


  if (
    !name
  ) {
    return true;
  }


  /*
   * Defensive L3 guard.
   *
   * L2 should already resolve discourse/context fragments,
   * but a user-facing create-entity suggestion must never
   * be generated from obvious grammatical residue.
   */
  if (
    /^(?:但是|但|而|并且|并|则|又|再|还|还是|一开始|最初|起初|后来|随后|然后|接着|最终|最后|最终还是|最后还是|之后|同时)+$/u.test(
      name
    )
  ) {
    return true;
  }


  if (
    /^(?:的是|是的)(?:.+)?$/u.test(
      name
    )
  ) {
    return true;
  }


  /*
   * A two-party diplomacy phrase is not one entity.
   * L2 should split it into subject/object, but keep this
   * guard so a malformed event cannot leak into the UI.
   */
  if (
    suggestion
      ?.sourceConcept ===
      "event.establishDiplomacy" &&
    /[与和同]/u.test(
      name
    )
  ) {
    return true;
  }


  return false;
}


function createEntitySuggestion(
  suggestion
) {
  if (
    isObviouslyNonEntitySuggestion(
      suggestion
    )
  ) {
    return null;
  }


  return {
    suggestionId:
      makeSuggestionId([
        "create-entity",

        suggestion
          .name,

        suggestion
          .fieldConcept ??
        suggestion
          .likelyType ??
        "",
      ]),

    kind:
      "create-entity",

    status:
      "needs-user-confirmation",

    name:
      suggestion
        .name,

    likelyTypeConcept:
      suggestion
        .likelyTypeConcept ??
      suggestion
        .likelyType ??
      null,

    expectedTypeConcepts:
      suggestion
        .expectedTypeConcepts ??
      [],

    fieldKey:
      suggestion
        .fieldKey ??
      null,

    fieldLabel:
      suggestion
        .fieldLabel ??
      null,

    fieldConcept:
      suggestion
        .fieldConcept ??
      null,

    role:
      suggestion
        .role ??
      null,

    confidence:
      suggestion
        .confidence ??
      0.7,

    source:
      {
        subject:
          suggestion
            .sourceSubject ??
          null,

        sourceEntityId:
          suggestion
            .sourceEntityId ??
          null,

        sourceConcept:
          suggestion
            .sourceConcept ??
          null,
      },
  };
}


// ======================================================
// Relation Suggestions
// ======================================================

function createRelationSuggestion(
  candidate
) {
  const subjectEntityId =
    candidate
      ?.subjectResolution
      ?.entityId ??
    candidate
      ?.subjectEntityId ??
    null;


  const objectEntityId =
    candidate
      ?.objectResolution
      ?.entityId ??
    candidate
      ?.objectEntityId ??
    null;


  if (
    !subjectEntityId ||
    !objectEntityId
  ) {
    return null;
  }


  const relationConcept =
    candidate
      ?.relationConcept ??
    candidate
      ?.relationType ??
    null;


  if (
    !relationConcept
  ) {
    return null;
  }


  return {
    suggestionId:
      makeSuggestionId([
        "relation-update",

        subjectEntityId,

        relationConcept,

        objectEntityId,
      ]),

    kind:
      "relation-update",

    status:
      "ready",

    subjectEntityId,

    subjectName:
      candidate
        .subjectHint ??
      null,

    relationConcept,

    objectEntityId,

    objectName:
      candidate
        .objectHint ??
      null,

    confidence:
      candidate
        .confidence ??
      0.7,

    source:
      {
        candidateType:
          candidate
            .candidateType,

        state:
          candidate
            .state ??
          null,
      },
  };
}


// ======================================================
// Event Redundancy Filtering
//
// Some event candidates are useful internally but would
// duplicate a more precise field suggestion in the UI.
//
// Example:
//
// 夜岚出生于美国
//
// Internal analysis may contain:
//
// event.birth
// field.birthplace = 美国
//
// The field suggestion is the more actionable canonical
// update, so the birth event should stay internal.
// ======================================================

function isRedundantEventSuggestion({
  eventCandidate,

  fieldCandidates = [],
}) {
  const eventConcept =
    eventCandidate
      ?.eventConcept ??
    eventCandidate
      ?.eventType ??
    null;


  if (
    !eventConcept
  ) {
    return false;
  }


  // ----------------------------------------------------
  // Birth event duplicated by birthplace field
  // ----------------------------------------------------

  if (
    eventConcept ===
    "event.birth"
  ) {
    const subjectEntityId =
      eventCandidate
        ?.subjectResolution
        ?.entityId ??
      eventCandidate
        ?.subjectEntityId ??
      null;


    const subjectHint =
      eventCandidate
        ?.subjectHint ??
      null;


    const hasBirthplaceField =
      fieldCandidates.some(
        (fieldCandidate) => {
          if (
            fieldCandidate
              ?.fieldConcept !==
            "field.birthplace"
          ) {
            return false;
          }


          const fieldSubjectEntityId =
            fieldCandidate
              ?.subjectEntityId ??
            fieldCandidate
              ?.subjectResolution
              ?.entityId ??
            null;


          const fieldSubjectHint =
            fieldCandidate
              ?.subjectHint ??
            null;


          /*
           * Best case:
           * both resolve to the same actual Entity.
           */
          if (
            subjectEntityId &&
            fieldSubjectEntityId
          ) {
            return (
              String(
                subjectEntityId
              ) ===
              String(
                fieldSubjectEntityId
              )
            );
          }


          /*
           * Fallback for an incomplete event candidate.
           *
           * If L2 produced an event.birth without a
           * resolved subject, but the same analysis
           * contains a birthplace field, the event is
           * still redundant for Story Suggestions.
           */
          if (
            subjectHint &&
            fieldSubjectHint
          ) {
            return (
              String(
                subjectHint
              )
                .normalize(
                  "NFKC"
                )
                .trim()
                .toLowerCase() ===
              String(
                fieldSubjectHint
              )
                .normalize(
                  "NFKC"
                )
                .trim()
                .toLowerCase()
            );
          }


          /*
           * Some birth event candidates currently contain
           * no subject at all. If the analysis already
           * produced exactly one birthplace field, treat
           * the incomplete birth event as redundant.
           */
          return (
            !subjectEntityId &&
            !subjectHint
          );
        }
      );


    if (
      hasBirthplaceField
    ) {
      return true;
    }
  }


  return false;
}


// ======================================================
// Event Suggestions
// ======================================================

function createEventSuggestion(
  candidate
) {
  const subjectEntityId =
    candidate
      ?.subjectResolution
      ?.entityId ??
    candidate
      ?.subjectEntityId ??
    null;


  const objectEntityId =
    candidate
      ?.objectResolution
      ?.entityId ??
    candidate
      ?.objectEntityId ??
    null;


  const eventConcept =
    candidate
      ?.eventConcept ??
    candidate
      ?.eventType ??
    null;


  if (
    !eventConcept
  ) {
    return null;
  }


  /*
   * Negated / intended / uncertain events remain useful
   * analysis evidence, but should not become ready canon
   * suggestions.
   */
  const isNonCanonical =
    candidate
      ?.negated ===
      true ||
    candidate
      ?.intended ===
      true ||
    candidate
      ?.uncertain ===
      true;


  return {
    suggestionId:
      makeSuggestionId([
        "event-history",

        eventConcept,

        candidate
          ?.sequenceIndex ??
        "",

        candidate
          ?.subjectHint ??
        "",

        candidate
          ?.objectHint ??
        "",
      ]),

    kind:
      "event-history",

    status:
      isNonCanonical
        ? "informational"
        : "needs-user-confirmation",

    eventConcept,

    subjectEntityId,

    subjectName:
      candidate
        ?.subjectHint ??
      null,

    objectEntityId,

    objectName:
      candidate
        ?.objectHint ??
      null,

    sequenceIndex:
      candidate
        ?.sequenceIndex ??
      null,

    negated:
      candidate
        ?.negated ===
      true,

    intended:
      candidate
        ?.intended ===
      true,

    uncertain:
      candidate
        ?.uncertain ===
      true,

    confidence:
      candidate
        ?.confidence ??
      0.7,
  };
}


// ======================================================
// Deduplication
// ======================================================

function deduplicateStorySuggestions(
  suggestions
) {
  const map =
    new Map();


  for (
    const suggestion of
    suggestions
  ) {
    if (
      !suggestion ||
      !suggestion
        .suggestionId
    ) {
      continue;
    }


    const existing =
      map.get(
        suggestion
          .suggestionId
      );


    if (
      !existing
    ) {
      map.set(
        suggestion
          .suggestionId,

        suggestion
      );


      continue;
    }


    existing.confidence =
      Math.max(
        existing.confidence ??
        0,

        suggestion.confidence ??
        0
      );


    existing.warnings = [
      ...new Set([
        ...(
          existing.warnings ||
          []
        ),

        ...(
          suggestion.warnings ||
          []
        ),
      ]),
    ];
  }


  return Array.from(
    map.values()
  );
}


// ======================================================
// Main Generator
// ======================================================

function generateStorySuggestions({
  fieldCandidates = [],

  relationCandidates = [],

  eventCandidates = [],

  entitySuggestions = [],

  schemaSuggestions = [],

  selectOptionSuggestions = [],

  referenceEntitySuggestions = [],
}) {
  const suggestions =
    [];


  // ----------------------------------------------------
  // Ready field updates
  // ----------------------------------------------------

  for (
    const candidate of
    fieldCandidates
  ) {
    const suggestion =
      createFieldUpdateSuggestion(
        candidate
      );


    if (
      suggestion
    ) {
      suggestions.push(
        suggestion
      );
    }
  }


  // ----------------------------------------------------
  // Relations
  // ----------------------------------------------------

  for (
    const candidate of
    relationCandidates
  ) {
    const suggestion =
      createRelationSuggestion(
        candidate
      );


    if (
      suggestion
    ) {
      suggestions.push(
        suggestion
      );
    }
  }


  // ----------------------------------------------------
  // Event history
  // ----------------------------------------------------

  for (
    const candidate of
    eventCandidates
  ) {
    /*
     * Do not expose internal event evidence when a more
     * precise canonical field suggestion already represents
     * the same information.
     */
    if (
      isRedundantEventSuggestion({
        eventCandidate:
          candidate,

        fieldCandidates,
      })
    ) {
      continue;
    }


    const suggestion =
      createEventSuggestion(
        candidate
      );


    if (
      suggestion
    ) {
      suggestions.push(
        suggestion
      );
    }
  }


  // ----------------------------------------------------
  // L3-A missing entities
  // ----------------------------------------------------

  for (
    const entity of
    entitySuggestions
  ) {
    const suggestion =
      createEntitySuggestion(
        entity
      );


    if (
      suggestion
    ) {
      suggestions.push(
        suggestion
      );
    }
  }


  // ----------------------------------------------------
  // L3-B missing reference entities
  // ----------------------------------------------------

  for (
    const entity of
    referenceEntitySuggestions
  ) {
    const suggestion =
      createEntitySuggestion(
        entity
      );


    if (
      suggestion
    ) {
      suggestions.push(
        suggestion
      );
    }
  }


  // ----------------------------------------------------
  // Missing schema fields
  // ----------------------------------------------------

  for (
    const schema of
    schemaSuggestions
  ) {
    suggestions.push(
      createSchemaFieldSuggestion(
        schema
      )
    );
  }


  // ----------------------------------------------------
  // Missing Select options
  // ----------------------------------------------------

  for (
    const option of
    selectOptionSuggestions
  ) {
    suggestions.push(
      createSelectOptionSuggestion(
        option
      )
    );
  }


  return deduplicateStorySuggestions(
    suggestions
  );
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  makeSuggestionId,

  createFieldUpdateSuggestion,
  createSchemaFieldSuggestion,
  createSelectOptionSuggestion,
  createEntitySuggestion,
  normalizeEntitySuggestionName,
  isObviouslyNonEntitySuggestion,

  createRelationSuggestion,
  createEventSuggestion,

  deduplicateStorySuggestions,

  generateStorySuggestions,
  isRedundantEventSuggestion,
};