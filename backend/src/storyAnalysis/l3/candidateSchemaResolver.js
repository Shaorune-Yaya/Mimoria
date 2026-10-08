const {
  resolveFieldValue,
} = require(
  "./fieldValueResolver"
);

const {
  evaluateFieldTypeCompatibility,
  getStorageValuePreview,
} = require(
  "./fieldTypeCompatibility"
);

const {
  getEntityTypeId,
  getEntityTypeName,

  resolveSchemaField,
  getSuggestedFieldMetadata,
} = require(
  "./schemaFieldResolver"
);


// ======================================================
// Entity Type Lookup
// ======================================================

function findEntityTypeById(
  entityTypeId,
  entityTypes
) {
  if (
    !entityTypeId
  ) {
    return null;
  }


  return (
    entityTypes ||
    []
  ).find(
    (entityType) =>
      getEntityTypeId(
        entityType
      ) ===
      String(
        entityTypeId
      )
  ) || null;
}


// ======================================================
// Schema Field Suggestion
// ======================================================

function makeSchemaFieldSuggestion({
  candidate,
  entityType,
  locale,

  enabledPacks,
  nsfwEnabled,
}) {
  const metadata =
    getSuggestedFieldMetadata(
      candidate.fieldConcept,
      locale,
      {
        enabledPacks,
        nsfwEnabled,
      }
    );


  return {
    candidateType:
      "schema-field",

    status:
      "suggested",

    targetEntityTypeId:
      getEntityTypeId(
        entityType
      ),

    targetEntityTypeName:
      getEntityTypeName(
        entityType
      ),

    canonicalConcept:
      candidate.fieldConcept,

    suggestedLabel:
      metadata
        .suggestedLabel,

    suggestedValueType:
      metadata
        .suggestedValueType,

    exampleValue:
      candidate
        .normalizedValue ??
      candidate.value,

    sourceSubject:
      candidate
        .subjectHint,

    sourceEntityId:
      candidate
        .subjectEntityId ||
      null,

    confidence:
      candidate
        .confidence ??
      0.7,
  };
}


// ======================================================
// Select Option Suggestion
// ======================================================

function makeSelectOptionSuggestion({
  candidate,
}) {
  return {
    candidateType:
      "select-option",

    status:
      "suggested",

    targetEntityTypeId:
      candidate
        .subjectResolution
        ?.entityTypeId ||
      null,

    fieldKey:
      candidate
        .resolvedFieldKey,

    fieldLabel:
      candidate
        .resolvedFieldLabel,

    fieldConcept:
      candidate
        .fieldConcept,

    suggestedValue:
      candidate
        .valueResolution
        ?.requestedValue ??
      candidate
        .normalizedValue ??
      candidate.value,

    sourceSubject:
      candidate
        .subjectHint,

    sourceEntityId:
      candidate
        .subjectEntityId ||
      null,

    confidence:
      candidate
        .confidence ??
      0.7,
  };
}


// ======================================================
// Reference Entity Suggestion
// ======================================================

function makeReferenceEntitySuggestion({
  candidate,
}) {
  return {
    candidateType:
      "entity",

    status:
      "suggested",

    name:
      candidate
        .valueResolution
        ?.referenceHint ||
      null,

    role:
      "field-value",

    sourceCandidateType:
      candidate
        .candidateType,

    sourceConcept:
      candidate
        .fieldConcept,

    /*
     * This is the EntityType that owns the field.
     *
     * Example:
     * 夜岚 -> Character
     *
     * The reference target constraints are stored
     * separately below.
     */
    sourceEntityTypeId:
      candidate
        .subjectResolution
        ?.entityTypeId ||
      null,

    sourceEntityId:
      candidate
        .subjectEntityId ||
      null,

    sourceSubject:
      candidate
        .subjectHint ||
      null,

    fieldKey:
      candidate
        .resolvedFieldKey,

    fieldLabel:
      candidate
        .resolvedFieldLabel,

    fieldConcept:
      candidate
        .fieldConcept,

    expectedTypeConcepts:
      candidate
        .valueResolution
        ?.expectedTypeConcepts ||
      [],

    referenceTypeConstraints:
      candidate
        .valueResolution
        ?.referenceTypeConstraints ||
      [],

    confidence:
      candidate
        .confidence ??
      0.7,
  };
}


// ======================================================
// Resolve Field Candidates
// ======================================================

function resolveFieldCandidateSchemas({
  fieldCandidates = [],

  entityTypes = [],

  entities = [],

  entityTypeConceptMap = {},

  locale = "zh-CN",

  enabledPacks = [],

  nsfwEnabled = false,
}) {
  const resolvedCandidates =
    [];


  const schemaSuggestions =
    [];


  const selectOptionSuggestions =
    [];


  const referenceEntitySuggestions =
    [];


  for (
    const candidate of
    fieldCandidates
  ) {
    const result = {
      ...candidate,
    };


    // --------------------------------------------------
    // L3-A must resolve subject entity type first
    // --------------------------------------------------

    const subjectTypeId =
      candidate
        .subjectResolution
        ?.entityTypeId ||
      null;


    if (
      !subjectTypeId
    ) {
      result.schemaResolution = {
        status:
          "missing-subject-type",

        fieldConcept:
          candidate
            .fieldConcept,

        fieldKey:
          null,

        confidence:
          0,
      };


      result.typeCompatibility =
        null;


      result.valueResolution =
        null;


      result.storageValuePreview =
        null;


      resolvedCandidates.push(
        result
      );


      continue;
    }


    // --------------------------------------------------
    // Find user's real EntityType schema
    // --------------------------------------------------

    const entityType =
      findEntityTypeById(
        subjectTypeId,
        entityTypes
      );


    if (
      !entityType
    ) {
      result.schemaResolution = {
        status:
          "missing-entity-type-schema",

        entityTypeId:
          subjectTypeId,

        fieldConcept:
          candidate
            .fieldConcept,

        fieldKey:
          null,

        confidence:
          0,
      };


      result.typeCompatibility =
        null;


      result.valueResolution =
        null;


      result.storageValuePreview =
        null;


      resolvedCandidates.push(
        result
      );


      continue;
    }


    // --------------------------------------------------
    // L3-B1
    // Resolve canonical field -> user's real field
    // --------------------------------------------------

    const schemaResolution =
      resolveSchemaField({
        fieldConcept:
          candidate.fieldConcept,

        entityType,

        locale,

        enabledPacks,

        nsfwEnabled,
      });


    result.schemaResolution =
      schemaResolution;


    result.resolvedFieldKey =
      schemaResolution
        .status ===
        "resolved"
        ? schemaResolution
            .fieldKey
        : null;


    result.resolvedFieldLabel =
      schemaResolution
        .status ===
        "resolved"
        ? schemaResolution
            .fieldLabel
        : null;


    result.resolvedFieldType =
      schemaResolution
        .status ===
        "resolved"
        ? schemaResolution
            .fieldType
        : null;


    // --------------------------------------------------
    // L3-B2 + L3-B3
    // --------------------------------------------------

    if (
      schemaResolution.status ===
      "resolved"
    ) {
      const candidateValue =
        candidate.normalizedValue ??
        candidate.value;


      // ------------------------------------------------
      // L3-B2 Field Type Compatibility
      // ------------------------------------------------

      const typeCompatibility =
        evaluateFieldTypeCompatibility({
          fieldConcept:
            candidate.fieldConcept,

          schemaFieldType:
            schemaResolution.fieldType,

          value:
            candidateValue,
        });


      result.typeCompatibility =
        typeCompatibility;


      // ------------------------------------------------
      // L3-B3 Field Value Resolution
      //
      // Select:
      // "蓝色"
      // -> existing option
      //
      // Entity-Reference:
      // "美利坚合众国"
      // -> entity-us
      // ------------------------------------------------

      const valueResolution =
        resolveFieldValue({
          value:
            candidateValue,

          field:
            schemaResolution.field,

          entities,

          entityTypeConceptMap,
        });


      result.valueResolution =
        valueResolution;


      // ------------------------------------------------
      // Missing Select Option
      // ------------------------------------------------

      if (
        valueResolution.status ===
        "missing-option"
      ) {
        selectOptionSuggestions.push(
          makeSelectOptionSuggestion({
            candidate:
              result,
          })
        );
      }


      // ------------------------------------------------
      // Missing Entity Reference
      // ------------------------------------------------

      if (
        valueResolution.status ===
        "missing-reference"
      ) {
        referenceEntitySuggestions.push(
          makeReferenceEntitySuggestion({
            candidate:
              result,
          })
        );
      }


      // ------------------------------------------------
      // Storage Value Preview
      //
      // Important:
      //
      // Resolved reference:
      // entity-us
      //
      // Missing reference:
      // null
      //
      // Never put unresolved plain text into an actual
      // Entity-Reference field.
      // ------------------------------------------------

      if (
        valueResolution.status ===
        "resolved"
      ) {
        result.storageValuePreview =
          valueResolution
            .resolvedValue;
      } else if (
        valueResolution.status ===
          "missing-reference" ||
        valueResolution.status ===
          "ambiguous-reference" ||
        valueResolution.status ===
          "missing-reference-hint"
      ) {
        result.storageValuePreview =
          null;
      } else {
        result.storageValuePreview =
          getStorageValuePreview({
            value:
              candidateValue,

            compatibility:
              typeCompatibility,
          });
      }
    } else {
      result.typeCompatibility =
        null;


      result.valueResolution =
        null;


      result.storageValuePreview =
        null;
    }


    // --------------------------------------------------
    // Missing Schema Field
    // --------------------------------------------------

    if (
      schemaResolution.status ===
      "missing"
    ) {
      schemaSuggestions.push(
        makeSchemaFieldSuggestion({
          candidate:
            result,

          entityType,

          locale,

          enabledPacks,

          nsfwEnabled,
        })
      );
    }


    resolvedCandidates.push(
      result
    );
  }


  return {
    candidates:
      resolvedCandidates,

    schemaSuggestions:
      deduplicateSchemaSuggestions(
        schemaSuggestions
      ),

    selectOptionSuggestions:
      deduplicateSelectOptionSuggestions(
        selectOptionSuggestions
      ),

    referenceEntitySuggestions:
      deduplicateReferenceEntitySuggestions(
        referenceEntitySuggestions
      ),
  };
}


// ======================================================
// Schema Suggestion Deduplication
// ======================================================

function deduplicateSchemaSuggestions(
  suggestions
) {
  const map =
    new Map();


  for (
    const suggestion of
    suggestions
  ) {
    const key = [
      suggestion
        .targetEntityTypeId,

      suggestion
        .canonicalConcept,
    ].join(
      "::"
    );


    const existing =
      map.get(
        key
      );


    if (
      !existing
    ) {
      map.set(
        key,
        {
          ...suggestion,

          exampleValues: [
            suggestion
              .exampleValue,
          ],
        }
      );


      continue;
    }


    const serialized =
      JSON.stringify(
        suggestion.exampleValue
      );


    const alreadyExists =
      existing
        .exampleValues
        .some(
          (value) =>
            JSON.stringify(
              value
            ) ===
            serialized
        );


    if (
      !alreadyExists
    ) {
      existing
        .exampleValues
        .push(
          suggestion
            .exampleValue
        );
    }


    existing.confidence =
      Math.max(
        existing.confidence,
        suggestion.confidence
      );
  }


  return Array.from(
    map.values()
  );
}


// ======================================================
// Select Option Suggestion Deduplication
// ======================================================

function deduplicateSelectOptionSuggestions(
  suggestions
) {
  const map =
    new Map();


  for (
    const suggestion of
    suggestions
  ) {
    const normalizedValue =
      String(
        suggestion
          .suggestedValue ??
        ""
      )
        .normalize(
          "NFKC"
        )
        .trim()
        .toLowerCase();


    const key = [
      suggestion
        .fieldKey,

      normalizedValue,
    ].join(
      "::"
    );


    const existing =
      map.get(
        key
      );


    if (
      !existing
    ) {
      map.set(
        key,
        suggestion
      );


      continue;
    }


    existing.confidence =
      Math.max(
        existing.confidence,
        suggestion.confidence
      );
  }


  return Array.from(
    map.values()
  );
}


// ======================================================
// Reference Entity Suggestion Deduplication
// ======================================================

function deduplicateReferenceEntitySuggestions(
  suggestions
) {
  const map =
    new Map();


  for (
    const suggestion of
    suggestions
  ) {
    const normalizedName =
      String(
        suggestion.name ||
        ""
      )
        .normalize(
          "NFKC"
        )
        .trim()
        .toLowerCase();


    if (
      !normalizedName
    ) {
      continue;
    }


    /*
     * Include field concept in the key.
     *
     * This prevents two unrelated reference fields from
     * being merged only because they mention the same
     * missing entity name.
     */
    const key = [
      normalizedName,

      suggestion
        .fieldConcept ||
      "",
    ].join(
      "::"
    );


    const existing =
      map.get(
        key
      );


    if (
      !existing
    ) {
      map.set(
        key,
        suggestion
      );


      continue;
    }


    existing.confidence =
      Math.max(
        existing.confidence,
        suggestion.confidence
      );


    existing.expectedTypeConcepts = [
      ...new Set([
        ...(
          existing
            .expectedTypeConcepts ||
          []
        ),

        ...(
          suggestion
            .expectedTypeConcepts ||
          []
        ),
      ]),
    ];


    existing.referenceTypeConstraints = [
      ...new Set([
        ...(
          existing
            .referenceTypeConstraints ||
          []
        ),

        ...(
          suggestion
            .referenceTypeConstraints ||
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
// Exports
// ======================================================

module.exports = {
  findEntityTypeById,

  makeSchemaFieldSuggestion,
  makeSelectOptionSuggestion,
  makeReferenceEntitySuggestion,

  resolveFieldCandidateSchemas,

  deduplicateSchemaSuggestions,
  deduplicateSelectOptionSuggestions,
  deduplicateReferenceEntitySuggestions,
};