// ======================================================
// L4-B Story Suggestion Contract
//
// Validates normalized Story Suggestions before they are
// converted into persistent StorySyncCandidate records.
//
// No database access.
// No writes.
// ======================================================


const SUPPORTED_SUGGESTION_KINDS = [
  "field-update",
  "relation-update",
  "event-history",
  "create-entity",
  "create-schema-field",
  "create-select-option",
];


const SUPPORTED_ANALYSIS_STATUSES = [
  "ready",
  "needs-user-confirmation",
  "informational",
];


// ======================================================
// Helpers
// ======================================================

function hasValue(
  value
) {
  return (
    value !==
      null &&
    value !==
      undefined &&
    value !==
      ""
  );
}


function addError(
  errors,
  field,
  message
) {
  errors.push({
    field,
    message,
  });
}


// ======================================================
// Field Update
//
// A field update may target:
//
// 1. Existing Entity
//    targetEntityId
//
// 2. Draft Entity
//    targetDraftEntityKey
//
// A field may also be identified by:
//
// 1. Existing schema fieldKey
// 2. Canonical fieldConcept
//
// This allows Smart Import to preserve facts before the
// target entity/schema has been materialized.
// ======================================================

function validateFieldUpdate(
  suggestion,
  errors
) {
  const hasTargetEntity =
    hasValue(
      suggestion
        .targetEntityId
    );


  const hasDraftTarget =
    hasValue(
      suggestion
        .targetDraftEntityKey
    );


  if (
    !hasTargetEntity &&
    !hasDraftTarget
  ) {
    addError(
      errors,
      "targetEntityId",
      "field-update requires targetEntityId or targetDraftEntityKey."
    );
  }


  const hasFieldKey =
    hasValue(
      suggestion
        .fieldKey
    );


  const hasFieldConcept =
    hasValue(
      suggestion
        .fieldConcept
    );


  if (
    !hasFieldKey &&
    !hasFieldConcept
  ) {
    addError(
      errors,
      "fieldKey",
      "field-update requires fieldKey or fieldConcept."
    );
  }


  if (
    suggestion.value ===
    undefined
  ) {
    addError(
      errors,
      "value",
      "field-update requires value."
    );
  }
}


// ======================================================
// Relation Update
//
// Each side can independently reference either:
//
// entityId
// draftEntityKey
// ======================================================

function validateRelationUpdate(
  suggestion,
  errors
) {
  const hasSubject =
    hasValue(
      suggestion
        .subjectEntityId
    ) ||
    hasValue(
      suggestion
        .subjectDraftEntityKey
    );


  if (
    !hasSubject
  ) {
    addError(
      errors,
      "subjectEntityId",
      "relation-update requires subjectEntityId or subjectDraftEntityKey."
    );
  }


  if (
    !hasValue(
      suggestion
        .relationConcept
    )
  ) {
    addError(
      errors,
      "relationConcept",
      "relation-update requires relationConcept."
    );
  }


  const hasObject =
    hasValue(
      suggestion
        .objectEntityId
    ) ||
    hasValue(
      suggestion
        .objectDraftEntityKey
    );


  if (
    !hasObject
  ) {
    addError(
      errors,
      "objectEntityId",
      "relation-update requires objectEntityId or objectDraftEntityKey."
    );
  }
}


// ======================================================
// Event
// ======================================================

function validateEventHistory(
  suggestion,
  errors
) {
  if (
    !hasValue(
      suggestion
        .eventConcept
    )
  ) {
    addError(
      errors,
      "eventConcept",
      "event-history requires eventConcept."
    );
  }
}


// ======================================================
// Create Entity
// ======================================================

function validateCreateEntity(
  suggestion,
  errors
) {
  if (
    !hasValue(
      suggestion
        .name
    )
  ) {
    addError(
      errors,
      "name",
      "create-entity requires name."
    );
  }
}


// ======================================================
// Create Schema Field
// ======================================================

function validateCreateSchemaField(
  suggestion,
  errors
) {
  if (
    !hasValue(
      suggestion
        .targetEntityTypeId
    )
  ) {
    addError(
      errors,
      "targetEntityTypeId",
      "create-schema-field requires targetEntityTypeId."
    );
  }


  if (
    !hasValue(
      suggestion
        .fieldConcept
    )
  ) {
    addError(
      errors,
      "fieldConcept",
      "create-schema-field requires fieldConcept."
    );
  }


  if (
    !hasValue(
      suggestion
        .suggestedLabel
    )
  ) {
    addError(
      errors,
      "suggestedLabel",
      "create-schema-field requires suggestedLabel."
    );
  }


  if (
    !hasValue(
      suggestion
        .suggestedValueType
    )
  ) {
    addError(
      errors,
      "suggestedValueType",
      "create-schema-field requires suggestedValueType."
    );
  }
}


// ======================================================
// Create Select Option
// ======================================================

function validateCreateSelectOption(
  suggestion,
  errors
) {
  if (
    !hasValue(
      suggestion
        .fieldKey
    )
  ) {
    addError(
      errors,
      "fieldKey",
      "create-select-option requires fieldKey."
    );
  }


  if (
    suggestion.value ===
      undefined ||
    suggestion.value ===
      null
  ) {
    addError(
      errors,
      "value",
      "create-select-option requires value."
    );
  }
}


// ======================================================
// Main Validator
// ======================================================

function validateStorySuggestion(
  suggestion
) {
  const errors =
    [];


  if (
    !suggestion ||
    typeof suggestion !==
      "object"
  ) {
    return {
      valid:
        false,

      errors: [
        {
          field:
            null,

          message:
            "Suggestion must be an object.",
        },
      ],
    };
  }


  if (
    !hasValue(
      suggestion
        .suggestionId
    )
  ) {
    addError(
      errors,
      "suggestionId",
      "Suggestion requires suggestionId."
    );
  }


  if (
    !SUPPORTED_SUGGESTION_KINDS
      .includes(
        suggestion.kind
      )
  ) {
    addError(
      errors,
      "kind",
      `Unsupported suggestion kind: ${suggestion.kind}`
    );
  }


  if (
    !SUPPORTED_ANALYSIS_STATUSES
      .includes(
        suggestion.status
      )
  ) {
    addError(
      errors,
      "status",
      `Unsupported analysis status: ${suggestion.status}`
    );
  }


  if (
    suggestion.confidence !==
      undefined &&
    (
      typeof suggestion
        .confidence !==
        "number" ||
      suggestion.confidence <
        0 ||
      suggestion.confidence >
        1
    )
  ) {
    addError(
      errors,
      "confidence",
      "Confidence must be a number between 0 and 1."
    );
  }


  switch (
    suggestion.kind
  ) {
    case "field-update":
      validateFieldUpdate(
        suggestion,
        errors
      );

      break;


    case "relation-update":
      validateRelationUpdate(
        suggestion,
        errors
      );

      break;


    case "event-history":
      validateEventHistory(
        suggestion,
        errors
      );

      break;


    case "create-entity":
      validateCreateEntity(
        suggestion,
        errors
      );

      break;


    case "create-schema-field":
      validateCreateSchemaField(
        suggestion,
        errors
      );

      break;


    case "create-select-option":
      validateCreateSelectOption(
        suggestion,
        errors
      );

      break;


    default:
      break;
  }


  return {
    valid:
      errors.length ===
      0,

    errors,
  };
}


// ======================================================
// Assertion Helper
// ======================================================

function assertStorySuggestion(
  suggestion
) {
  const result =
    validateStorySuggestion(
      suggestion
    );


  if (
    result.valid
  ) {
    return suggestion;
  }


  const message =
    result.errors
      .map(
        (error) =>
          error.field
            ? `${error.field}: ${error.message}`
            : error.message
      )
      .join(
        " | "
      );


  const error =
    new Error(
      `Invalid Story Suggestion: ${message}`
    );


  error.name =
    "StorySuggestionValidationError";


  error.validationErrors =
    result.errors;


  throw error;
}


// ======================================================
// Batch Validator
// ======================================================

function validateStorySuggestions(
  suggestions = []
) {
  return suggestions.map(
    (
      suggestion,
      index
    ) => {
      const validation =
        validateStorySuggestion(
          suggestion
        );


      return {
        index,

        suggestionId:
          suggestion
            ?.suggestionId ??
          null,

        kind:
          suggestion
            ?.kind ??
          null,

        ...validation,
      };
    }
  );
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  SUPPORTED_SUGGESTION_KINDS,
  SUPPORTED_ANALYSIS_STATUSES,

  validateStorySuggestion,
  assertStorySuggestion,
  validateStorySuggestions,
};