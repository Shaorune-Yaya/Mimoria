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
// Suggestion Confidence Policy
//
// Confidence tiers are derived from the numeric score.
//
// IMPORTANT:
//
// The numeric confidence is the source of truth.
// We deliberately do NOT persist the tier in MongoDB.
//
// This lets thresholds evolve without requiring data
// migrations.
// ======================================================

const SUGGESTION_CONFIDENCE_THRESHOLDS = {
  normal:
    0.72,

  lowConfidence:
    0.55,

  veryLowConfidence:
    0.38,
};


function clampConfidence(
  value
) {
  return Math.max(
    0,

    Math.min(
      1,

      Number(
        value
      ) || 0
    )
  );
}


function getSuggestionConfidenceTier(
  confidence
) {
  const value =
    clampConfidence(
      confidence
    );


  if (
    value >=
    SUGGESTION_CONFIDENCE_THRESHOLDS
      .normal
  ) {
    return "normal";
  }


  if (
    value >=
    SUGGESTION_CONFIDENCE_THRESHOLDS
      .lowConfidence
  ) {
    return "low-confidence";
  }


  if (
    value >=
    SUGGESTION_CONFIDENCE_THRESHOLDS
      .veryLowConfidence
  ) {
    return "very-low-confidence";
  }


  return "suppressed";
}


function decorateSuggestionConfidence(
  suggestion
) {
  if (
    !suggestion
  ) {
    return null;
  }


  const confidence =
    clampConfidence(
      suggestion.confidence ??
      0.7
    );


  return {
    ...suggestion,

    confidence,

    confidenceTier:
      getSuggestionConfidenceTier(
        confidence
      ),
  };
}

// ======================================================
// Recommended EntityType Fields
//
// These fields describe the schema that could be created
// together with a NEW recommended EntityType.
//
// They do NOT replace field-update suggestions.
// ======================================================

function normalizeDraftKey(
  value
) {
  return String(
    value || ""
  )
    .normalize("NFKC")
    .trim()
    .toLowerCase();
}


function inferRecommendedFieldType(
  candidate
) {
  if (
    candidate?.resolvedFieldType
  ) {
    return candidate.resolvedFieldType;
  }


  if (
    candidate?.schemaResolution?.fieldType
  ) {
    return candidate
      .schemaResolution
      .fieldType;
  }


  const concept =
    candidate?.fieldConcept ||
    "";


  const value =
    candidate?.normalizedValue ??
    candidate?.value;


  // Canonical semantic hints.
  if (
    concept === "field.age" ||
    concept === "field.height" ||
    concept === "field.weight"
  ) {
    return "number";
  }


  if (
    concept === "field.alive"
  ) {
    return "boolean";
  }


  if (
    concept === "field.birthdate" ||
    concept === "field.deathdate"
  ) {
    return "date";
  }


  // Value-based fallback.
  if (
    typeof value === "number"
  ) {
    return "number";
  }


  if (
    typeof value === "boolean"
  ) {
    return "boolean";
  }


  return "text";
}


function createRecommendedFieldFromCandidate(
  candidate
) {
  const fieldConcept =
    candidate?.fieldConcept ||
    null;


  if (
    !fieldConcept
  ) {
    return null;
  }


  let label =
    candidate?.resolvedFieldLabel ||
    candidate?.schemaResolution?.fieldLabel ||
    null;


  /*
   * Do not persist machine labels such as "field.age"
   * as visible schema labels.
   *
   * The frontend can localize them while editing, and the
   * recommended EntityType service also has a semantic
   * fallback when the user applies without editing.
   */
  if (
    label === fieldConcept ||
    String(label || "").startsWith("field.")
  ) {
    label = null;
  }


  return {
    fieldConcept,

    label,

    type:
      inferRecommendedFieldType(
        candidate
      ),

    required:
      false,

    options:
      [],

    referenceEntityTypeId:
      null,
  };
}


function buildRecommendedFieldsForEntity({
  entitySuggestion,

  fieldCandidates = [],
}) {
  const entityDraftKey =
    normalizeDraftKey(
      entitySuggestion?.draftEntityKey ||
      entitySuggestion?.normalizedName ||
      entitySuggestion?.name
    );


  if (
    !entityDraftKey
  ) {
    return [];
  }


  const result =
    [];


  const seen =
    new Set();


  for (
    const candidate of
    fieldCandidates
  ) {
    const candidateDraftKey =
      normalizeDraftKey(
        candidate?.subjectDraftEntityKey ||
        candidate?.subjectResolution?.draftEntityKey ||
        candidate?.subjectHint
      );


    if (
      !candidateDraftKey ||
      candidateDraftKey !==
        entityDraftKey
    ) {
      continue;
    }


    const recommendedField =
      createRecommendedFieldFromCandidate(
        candidate
      );


    if (
      !recommendedField
    ) {
      continue;
    }


    const identity =
      recommendedField
        .fieldConcept ||
      normalizeDraftKey(
        recommendedField.label
      );


    if (
      seen.has(identity)
    ) {
      continue;
    }


    seen.add(identity);

    result.push(
      recommendedField
    );
  }


  return result;
}

// ======================================================
// Field Update Suggestions
// ======================================================

function createFieldUpdateSuggestion(
  candidate
) {
  const targetEntityId =
    candidate
      ?.subjectEntityId ??
    candidate
      ?.subjectResolution
      ?.entityId ??
    null;


  const targetDraftEntityKey =
    candidate
      ?.subjectDraftEntityKey ??
    candidate
      ?.subjectResolution
      ?.draftEntityKey ??
    null;


  /*
   * Existing Entity or Draft Entity is required.
   */
  if (
    !targetEntityId &&
    !targetDraftEntityKey
  ) {
    return null;
  }


  const fieldConcept =
    candidate
      ?.fieldConcept ??
    null;


  const fieldKey =
    candidate
      ?.resolvedFieldKey ??
    null;


  /*
   * For a materialized schema we use fieldKey.
   *
   * For a Draft Entity whose EntityType/schema does not
   * exist yet, fieldConcept is enough to preserve the fact.
   */
  if (
    !fieldKey &&
    !fieldConcept
  ) {
    return null;
  }


  /*
   * If schema resolution actually succeeded, respect
   * explicit incompatibility.
   */
  if (
    candidate
      ?.typeCompatibility
      ?.compatible ===
      false
  ) {
    return null;
  }


  /*
   * Missing Select option still requires the option to be
   * created before the field value can be applied.
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
   * Existing Entity Reference fields remain unresolved
   * until their referenced Entity exists.
   *
   * A future pass can convert these into Draft-reference
   * values. Relation candidates are handled separately.
   */
  if (
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


  let value =
    candidate
      ?.storageValuePreview;


  /*
   * Draft schema analysis often has no storage preview yet.
   * Preserve the normalized semantic value instead.
   */
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    value =
      candidate
        ?.normalizedValue ??
      candidate
        ?.value;
  }


  if (
    value ===
    undefined
  ) {
    return null;
  }


  const targetIdentity =
    targetEntityId ||
    `draft:${targetDraftEntityKey}`;


  const hasUnresolvedDependency =
    !targetEntityId ||
    !fieldKey;


  return {
    suggestionId:
      makeSuggestionId([
        "field-update",

        targetIdentity,

        fieldKey ||
        fieldConcept,

        JSON.stringify(
          value
        ),
      ]),

    kind:
      "field-update",

    status:
      hasUnresolvedDependency
        ? "needs-user-confirmation"
        : "ready",

    targetEntityId,

    targetDraftEntityKey,

    targetEntityName:
      candidate
        ?.subjectHint ??
      candidate
        ?.subjectDraftEntity
        ?.name ??
      null,

    targetTypeConcept:
      candidate
        ?.subjectTypeConcept ??
      candidate
        ?.subjectDraftEntity
        ?.likelyTypeConcept ??
      null,

    fieldKey,

    fieldLabel:
      candidate
        ?.resolvedFieldLabel ??
      fieldConcept,

    fieldConcept,

    fieldType:
      candidate
        ?.resolvedFieldType ??
      null,

    value,

    originalValue:
      candidate
        ?.normalizedValue ??
      candidate
        ?.value,

    confidence:
      getCandidateConfidence(
        candidate
      ),

    warnings: [
      candidate
        ?.typeCompatibility
        ?.warning,

      !targetEntityId
        ? "TARGET_ENTITY_IS_DRAFT"
        : null,

      !fieldKey
        ? "FIELD_SCHEMA_NOT_MATERIALIZED"
        : null,
    ].filter(
      Boolean
    ),

    source: {
      candidateType:
        candidate
          ?.candidateType,

      subjectHint:
        candidate
          ?.subjectHint,

      subjectDraftEntityKey:
        targetDraftEntityKey,

      schemaMatchType:
        candidate
          ?.schemaResolution
          ?.matchType,

      schemaResolution:
        candidate
          ?.schemaResolution
          ?.status,

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
  suggestion,
  {
    recommendedFields = [],
  } = {}
) {
  if (
    isObviouslyNonEntitySuggestion(
      suggestion
    )
  ) {
    return null;
  }


  const name =
    normalizeEntitySuggestionName(
      suggestion.name
    );


  const draftEntityKey =
    normalizeDraftKey(
      suggestion?.draftEntityKey ||
      suggestion?.normalizedName ||
      name
    );


  return {
    suggestionId:
      makeSuggestionId([
        "create-entity",

        draftEntityKey,

        suggestion
          .likelyTypeConcept ??
        suggestion
          .likelyType ??
        "",
      ]),

    kind:
      "create-entity",

    status:
      "needs-user-confirmation",

    name,

    draftEntityKey,

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

    recommendedFields:
      Array.isArray(
        recommendedFields
      )
        ? recommendedFields
        : [],

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

    roles:
      suggestion
        .roles ??
      [],

    confidence:
      suggestion
        .confidence ??
      0.7,

    source: {
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

      sourceConcepts:
        suggestion
          .sourceConcepts ??
      [],
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


  const subjectDraftEntityKey =
    candidate
      ?.subjectDraftEntityKey ??
    candidate
      ?.subjectResolution
      ?.draftEntityKey ??
    null;


  const objectEntityId =
    candidate
      ?.objectResolution
      ?.entityId ??
    candidate
      ?.objectEntityId ??
    null;


  const objectDraftEntityKey =
    candidate
      ?.objectDraftEntityKey ??
    candidate
      ?.objectResolution
      ?.draftEntityKey ??
    null;


  /*
   * Each side must exist either canonically or as a draft.
   */
  if (
    (
      !subjectEntityId &&
      !subjectDraftEntityKey
    ) ||
    (
      !objectEntityId &&
      !objectDraftEntityKey
    )
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


  const subjectIdentity =
    subjectEntityId ||
    `draft:${subjectDraftEntityKey}`;


  const objectIdentity =
    objectEntityId ||
    `draft:${objectDraftEntityKey}`;


  const hasDraftDependency =
    !subjectEntityId ||
    !objectEntityId;


  return {
    suggestionId:
      makeSuggestionId([
        "relation-update",

        subjectIdentity,

        relationConcept,

        objectIdentity,
      ]),

    kind:
      "relation-update",

    status:
      hasDraftDependency
        ? "needs-user-confirmation"
        : "ready",

    subjectEntityId,

    subjectDraftEntityKey,

    subjectName:
      candidate
        ?.subjectHint ??
      candidate
        ?.subjectDraftEntity
        ?.name ??
      null,

    relationConcept,

    objectEntityId,

    objectDraftEntityKey,

    objectName:
      candidate
        ?.objectHint ??
      candidate
        ?.objectDraftEntity
        ?.name ??
      null,

    confidence:
      candidate
        ?.confidence ??
      0.7,

    warnings: [
      !subjectEntityId
        ? "SUBJECT_ENTITY_IS_DRAFT"
        : null,

      !objectEntityId
        ? "OBJECT_ENTITY_IS_DRAFT"
        : null,
    ].filter(
      Boolean
    ),

    source: {
      candidateType:
        candidate
          ?.candidateType,

      state:
        candidate
          ?.state ??
      null,

      subjectDraftEntityKey,

      objectDraftEntityKey,
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
// Relation Representation Planning
//
// Some relations have already been converted into a
// preferred field representation by PatternExtractor.
//
// When such a field candidate exists, do not also show the
// user a duplicate relation suggestion.
//
// Example:
//
// 诺拉隶属于银月协会
//
// Preferred UI:
//
// 角色缺少：所属组织
// 所属组织 = 银月协会
//
// Instead of simultaneously showing:
//
// 诺拉 -> 隶属于 -> 银月协会
// ======================================================

function relationIsRepresentedByPreferredField({
  relationCandidate,
  fieldCandidates = [],
}) {
  const relationConcept =
    relationCandidate
      ?.relationConcept ||
    relationCandidate
      ?.relationType ||
    null;


  if (
    !relationConcept
  ) {
    return false;
  }


  const subjectKey =
    normalizeDraftKey(
      relationCandidate
        ?.subjectHint
    );


  const objectKey =
    normalizeDraftKey(
      relationCandidate
        ?.objectHint
    );


  if (
    !subjectKey ||
    !objectKey
  ) {
    return false;
  }


  return fieldCandidates.some(
    (
      fieldCandidate
    ) => {
      if (
        fieldCandidate
          ?.metadata
          ?.representationPreference !==
          "field-first"
      ) {
        return false;
      }


      if (
        fieldCandidate
          ?.metadata
          ?.relationConcept !==
          relationConcept
      ) {
        return false;
      }


      const fieldSubjectKey =
        normalizeDraftKey(
          fieldCandidate
            ?.subjectHint
        );


      const fieldObjectKey =
        normalizeDraftKey(
          fieldCandidate
            ?.normalizedValue ??
          fieldCandidate
            ?.value
        );


      return (
        fieldSubjectKey ===
          subjectKey &&
        fieldObjectKey ===
          objectKey
      );
    }
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


  // ====================================================
  // 1. Schema First
  //
  // Prefer teaching Mimoria how the user's existing
  // EntityTypes should represent the information before
  // suggesting graph relations or duplicate types.
  // ====================================================

  for (
    const schema of
    schemaSuggestions
  ) {
    const suggestion =
      createSchemaFieldSuggestion(
        schema
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
  // Missing Select options belong to schema preparation.
  // ----------------------------------------------------

  for (
    const option of
    selectOptionSuggestions
  ) {
    const suggestion =
      createSelectOptionSuggestion(
        option
      );


    if (
      suggestion
    ) {
      suggestions.push(
        suggestion
      );
    }
  }


  // ====================================================
  // 2. Missing Entities
  //
  // Reuse of an existing EntityType should already have
  // been resolved by DraftEntityResolver before this stage.
  // ====================================================

  for (
    const entity of
    entitySuggestions
  ) {
    const recommendedFields =
      buildRecommendedFieldsForEntity({
        entitySuggestion:
          entity,

        fieldCandidates,
      });


    const suggestion =
      createEntitySuggestion(
        entity,
        {
          recommendedFields,
        }
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
  // Missing reference entities
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


  // ====================================================
  // 3. Field Updates
  //
  // Once schema/entity structure is understood, expose the
  // concrete canonical values.
  // ====================================================

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


  // ====================================================
  // 4. Relations
  //
  // A relation stays visible only when a preferred field
  // representation did not already express the same fact.
  // ====================================================

  for (
    const candidate of
    relationCandidates
  ) {
    if (
      relationIsRepresentedByPreferredField({
        relationCandidate:
          candidate,

        fieldCandidates,
      })
    ) {
      continue;
    }


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


  // ====================================================
  // 5. Event History
  // ====================================================

  for (
    const candidate of
    eventCandidates
  ) {
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


  const deduplicatedSuggestions =
  deduplicateStorySuggestions(
    suggestions
  );


  const confidenceDecoratedSuggestions =
    deduplicatedSuggestions
      .map(
        (
          suggestion
        ) =>
          decorateSuggestionConfidence(
            suggestion
          )
      )
      .filter(
        Boolean
      );


  /*
  * Extremely weak suggestions remain useful internally
  * during analysis/debugging, but should not become
  * user-facing Smart Import candidates.
  *
  * < 38%
  * -> do not persist
  * -> do not display
  *
  * 38%–55%
  * -> preserve
  * -> frontend hides them by default
  *
  * 55%–72%
  * -> preserve
  * -> frontend visibly marks them as low confidence
  *
  * >= 72%
  * -> normal suggestion
  */
  return confidenceDecoratedSuggestions.filter(
    (
      suggestion
    ) =>
      suggestion.confidenceTier !==
      "suppressed"
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

  normalizeDraftKey,
  inferRecommendedFieldType,
  createRecommendedFieldFromCandidate,
  buildRecommendedFieldsForEntity,
  relationIsRepresentedByPreferredField,
  
  SUGGESTION_CONFIDENCE_THRESHOLDS,
  clampConfidence,
  getSuggestionConfidenceTier,
  decorateSuggestionConfidence,
};