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

const {
  findBestEntityTypeForDraft,
} = require(
  "./draftEntityResolver"
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
      candidate
        .fieldConcept,

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
      candidate
        .fieldConcept,

    suggestedLabel:
      metadata
        .suggestedLabel,

    suggestedValueType:
      metadata
        .suggestedValueType,

    exampleValue:
      candidate
        .normalizedValue ??
      candidate
        .value,

    sourceSubject:
      candidate
        .subjectHint,

    sourceEntityId:
      candidate
        .subjectEntityId ||
      null,

    sourceDraftEntityKey:
      candidate
        .subjectDraftEntityKey ||
      null,

    sourceDraftEntityName:
      candidate
        .subjectDraftEntity
        ?.name ||
      null,

    subjectIsDraft:
      Boolean(
        candidate
          .subjectDraftEntityKey &&
        !candidate
          .subjectEntityId
      ),

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
        .subjectSchemaEntityTypeId ||
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
      candidate
        .value,

    sourceSubject:
      candidate
        .subjectHint,

    sourceEntityId:
      candidate
        .subjectEntityId ||
      null,

    sourceDraftEntityKey:
      candidate
        .subjectDraftEntityKey ||
      null,

    sourceDraftEntityName:
      candidate
        .subjectDraftEntity
        ?.name ||
      null,

    subjectIsDraft:
      Boolean(
        candidate
          .subjectDraftEntityKey &&
        !candidate
          .subjectEntityId
      ),

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

    sourceEntityTypeId:
      candidate
        .subjectSchemaEntityTypeId ||
      candidate
        .subjectResolution
        ?.entityTypeId ||
      null,

    sourceEntityId:
      candidate
        .subjectEntityId ||
      null,

    sourceDraftEntityKey:
      candidate
        .subjectDraftEntityKey ||
      null,

    sourceDraftEntityName:
      candidate
        .subjectDraftEntity
        ?.name ||
      null,

    subjectIsDraft:
      Boolean(
        candidate
          .subjectDraftEntityKey &&
        !candidate
          .subjectEntityId
      ),

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


    // ==================================================
    // Resolve Subject EntityType
    //
    // Existing entity:
    //
    // subjectResolution.entityTypeId
    //
    // Draft entity:
    //
    // subjectDraftEntity
    // -> inferred semantic type
    // -> find compatible existing EntityType schema
    // ==================================================

    const canonicalSubjectTypeId =
      candidate
        .subjectResolution
        ?.entityTypeId ||
      null;


    let subjectTypeId =
      canonicalSubjectTypeId;


    let subjectTypeSource =
      canonicalSubjectTypeId
        ? "canonical-entity"
        : null;


    let draftTypeMatch =
      null;


    if (
      !subjectTypeId &&
      candidate
        .subjectDraftEntity
    ) {
      draftTypeMatch =
        findBestEntityTypeForDraft({
          draftEntity:
            candidate
              .subjectDraftEntity,

          entityTypes,

          entityTypeConceptMap,
        });


      subjectTypeId =
        draftTypeMatch
          .entityTypeId ||
        null;


      if (
        subjectTypeId
      ) {
        subjectTypeSource =
          "draft-inferred-type";
      }
    }


    result.subjectSchemaEntityTypeId =
      subjectTypeId;


    result.subjectSchemaTypeSource =
      subjectTypeSource;


    result.subjectSchemaTypeMatch =
      draftTypeMatch
        ?.matchType ||
      null;


    // ==================================================
    // No usable EntityType schema yet
    // ==================================================

    if (
      !subjectTypeId
    ) {
      result.schemaResolution = {
        status:
          candidate
            .subjectDraftEntity
            ? "draft-subject-type-unmaterialized"
            : "missing-subject-type",

        fieldConcept:
          candidate
            .fieldConcept,

        fieldKey:
          null,

        likelyTypeConcept:
          candidate
            .subjectDraftEntity
            ?.likelyTypeConcept ||
          candidate
            .subjectTypeConcept ||
          null,

        draftEntityKey:
          candidate
            .subjectDraftEntityKey ||
          null,

        confidence:
          candidate
            .subjectDraftEntity
            ?.confidence ||
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


    // ==================================================
    // Find Real User EntityType
    // ==================================================

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

        subjectTypeSource,

        draftEntityKey:
          candidate
            .subjectDraftEntityKey ||
          null,

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


    // ==================================================
    // L3-B1
    // Canonical field -> user's schema field
    // ==================================================

    const schemaResolution =
      resolveSchemaField({
        fieldConcept:
          candidate
            .fieldConcept,

        entityType,

        locale,

        enabledPacks,

        nsfwEnabled,
      });


    result.schemaResolution = {
      ...schemaResolution,

      subjectTypeSource,

      draftEntityKey:
        candidate
          .subjectDraftEntityKey ||
        null,
    };


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


    // ==================================================
    // L3-B2 / L3-B3
    // ==================================================

    if (
      schemaResolution
        .status ===
      "resolved"
    ) {
      const candidateValue =
        candidate
          .normalizedValue ??
        candidate
          .value;


      // -----------------------------------------------
      // Field Type Compatibility
      // -----------------------------------------------

      const typeCompatibility =
        evaluateFieldTypeCompatibility({
          fieldConcept:
            candidate
              .fieldConcept,

          schemaFieldType:
            schemaResolution
              .fieldType,

          value:
            candidateValue,
        });


      result.typeCompatibility =
        typeCompatibility;


      // -----------------------------------------------
      // Field Value Resolution
      // -----------------------------------------------

      const valueResolution =
        resolveFieldValue({
          value:
            candidateValue,

          field:
            schemaResolution
              .field,

          entities,

          entityTypeConceptMap,
        });


      result.valueResolution =
        valueResolution;


      // -----------------------------------------------
      // Missing Select Option
      // -----------------------------------------------

      if (
        valueResolution
          .status ===
        "missing-option"
      ) {
        selectOptionSuggestions.push(
          makeSelectOptionSuggestion({
            candidate:
              result,
          })
        );
      }


      // -----------------------------------------------
      // Missing Entity Reference
      //
      // Example:
      //
      // Alice birthplace = Silverport
      //
      // Silverport does not exist yet.
      // -----------------------------------------------

      if (
        valueResolution
          .status ===
        "missing-reference"
      ) {
        referenceEntitySuggestions.push(
          makeReferenceEntitySuggestion({
            candidate:
              result,
          })
        );
      }


      // -----------------------------------------------
      // Storage Preview
      // -----------------------------------------------

      if (
        valueResolution
          .status ===
        "resolved"
      ) {
        result.storageValuePreview =
          valueResolution
            .resolvedValue;
      } else if (
        valueResolution
          .status ===
          "missing-reference" ||
        valueResolution
          .status ===
          "ambiguous-reference" ||
        valueResolution
          .status ===
          "missing-reference-hint"
      ) {
        /*
         * Never pretend an unresolved string is already
         * a real Entity Reference ObjectId.
         */
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


    // ==================================================
    // Missing Schema Field
    //
    // This now also works for a Draft Entity when its
    // inferred EntityType maps to an existing user type.
    //
    // Example:
    //
    // Alice -> Character draft
    // Character EntityType exists
    // field.age does not
    //
    // -> suggest Create Age field on Character
    // ==================================================

    if (
      schemaResolution
        .status ===
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
        suggestion
          .exampleValue
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
        existing
          .confidence ||
        0,

        suggestion
          .confidence ||
        0
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
        existing
          .confidence ||
        0,

        suggestion
          .confidence ||
        0
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
        suggestion
          .name ||
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
     * The same reference entity may appear in several
     * different fields.
     *
     * Include fieldConcept so unrelated references do not
     * merge incorrectly.
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
        existing
          .confidence ||
        0,

        suggestion
          .confidence ||
        0
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