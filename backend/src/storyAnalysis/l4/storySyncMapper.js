// ======================================================
// L4-B Story Suggestion -> StorySyncCandidate Mapper
//
// Converts validated L3 Story Suggestions into plain
// objects suitable for StorySyncCandidate persistence.
//
// No database writes.
// ======================================================


const {
  assertStorySuggestion,
} = require(
  "./storySuggestionContract"
);


// ======================================================
// Helpers
// ======================================================

function isPlainObject(
  value
) {
  if (
    value ===
      null ||
    typeof value !==
      "object"
  ) {
    return false;
  }


  const prototype =
    Object.getPrototypeOf(
      value
    );


  return (
    prototype ===
      Object.prototype ||
    prototype ===
      null
  );
}


/*
 * Remove undefined values without destroying special
 * object types such as:
 *
 * - mongoose.Types.ObjectId
 * - Date
 * - Buffer
 * - BSON values
 *
 * Only ordinary JavaScript objects are recursively
 * copied.
 */
function cleanUndefined(
  value
) {
  if (
    Array.isArray(
      value
    )
  ) {
    return value
      .filter(
        (item) =>
          item !==
          undefined
      )
      .map(
        cleanUndefined
      );
  }


  /*
   * IMPORTANT:
   *
   * Do not recursively expand ObjectId / Date / Buffer
   * or other class instances.
   */
  if (
    !isPlainObject(
      value
    )
  ) {
    return value;
  }


  const result =
    {};


  for (
    const [
      key,
      child,
    ] of Object.entries(
      value
    )
  ) {
    if (
      child ===
      undefined
    ) {
      continue;
    }


    result[
      key
    ] =
      cleanUndefined(
        child
      );
  }


  return result;
}


// ======================================================
// Payload Builders
// ======================================================

function buildFieldUpdatePayload(
  suggestion
) {
  return {
    targetEntityId:
      suggestion
        .targetEntityId,

    targetEntityName:
      suggestion
        .targetEntityName,

    fieldKey:
      suggestion
        .fieldKey,

    fieldLabel:
      suggestion
        .fieldLabel,

    fieldConcept:
      suggestion
        .fieldConcept,

    fieldType:
      suggestion
        .fieldType,

    value:
      suggestion
        .value,

    originalValue:
      suggestion
        .originalValue,
  };
}


function buildRelationUpdatePayload(
  suggestion
) {
  return {
    subjectEntityId:
      suggestion
        .subjectEntityId,

    subjectName:
      suggestion
        .subjectName,

    relationConcept:
      suggestion
        .relationConcept,

    objectEntityId:
      suggestion
        .objectEntityId,

    objectName:
      suggestion
        .objectName,
  };
}


function buildEventHistoryPayload(
  suggestion
) {
  return {
    eventConcept:
      suggestion
        .eventConcept,

    subjectEntityId:
      suggestion
        .subjectEntityId,

    subjectName:
      suggestion
        .subjectName,

    objectEntityId:
      suggestion
        .objectEntityId,

    objectName:
      suggestion
        .objectName,

    sequenceIndex:
      suggestion
        .sequenceIndex,

    negated:
      suggestion
        .negated,

    intended:
      suggestion
        .intended,

    uncertain:
      suggestion
        .uncertain,
  };
}


function buildCreateEntityPayload(
  suggestion
) {
  return {
    name:
      suggestion
        .name,

    likelyTypeConcept:
      suggestion
        .likelyTypeConcept,

    expectedTypeConcepts:
      suggestion
        .expectedTypeConcepts,

    fieldKey:
      suggestion
        .fieldKey,

    fieldLabel:
      suggestion
        .fieldLabel,

    fieldConcept:
      suggestion
        .fieldConcept,

    role:
      suggestion
        .role,
  };
}


function buildCreateSchemaFieldPayload(
  suggestion
) {
  return {
    targetEntityTypeId:
      suggestion
        .targetEntityTypeId,

    targetEntityTypeName:
      suggestion
        .targetEntityTypeName,

    fieldConcept:
      suggestion
        .fieldConcept,

    suggestedLabel:
      suggestion
        .suggestedLabel,

    suggestedValueType:
      suggestion
        .suggestedValueType,

    exampleValues:
      suggestion
        .exampleValues,
  };
}


function buildCreateSelectOptionPayload(
  suggestion
) {
  return {
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
        .value,
  };
}


// ======================================================
// Payload Router
// ======================================================

function buildSuggestionPayload(
  suggestion
) {
  switch (
    suggestion.kind
  ) {
    case "field-update":
      return buildFieldUpdatePayload(
        suggestion
      );


    case "relation-update":
      return buildRelationUpdatePayload(
        suggestion
      );


    case "event-history":
      return buildEventHistoryPayload(
        suggestion
      );


    case "create-entity":
      return buildCreateEntityPayload(
        suggestion
      );


    case "create-schema-field":
      return buildCreateSchemaFieldPayload(
        suggestion
      );


    case "create-select-option":
      return buildCreateSelectOptionPayload(
        suggestion
      );


    default:
      throw new Error(
        `Unsupported Story Suggestion kind: ${suggestion.kind}`
      );
  }
}


// ======================================================
// Source Builder
// ======================================================

function buildCandidateSource({
  suggestion,

  documentVersion = null,

  originalText = null,

  textRange = null,
}) {
  const suggestionSource =
    suggestion.source ||
    {};


  return cleanUndefined({
    documentVersion,

    textRange,

    originalText,

    subjectHint:
      suggestionSource
        .subjectHint ??
      suggestionSource
        .subject ??
      null,

    objectHint:
      suggestionSource
        .objectHint ??
      null,

    fieldConcept:
      suggestion
        .fieldConcept ??
      suggestionSource
        .fieldConcept ??
      suggestionSource
        .sourceConcept ??
      null,

    eventConcept:
      suggestion
        .eventConcept ??
      null,

    relationConcept:
      suggestion
        .relationConcept ??
      null,

    candidateType:
      suggestionSource
        .candidateType ??
      null,
  });
}


// ======================================================
// Main Mapper
// ======================================================

function mapSuggestionToStorySyncCandidate({
  suggestion,

  worldId,

  documentId,

  documentVersion = null,

  originalText = null,

  textRange = null,
}) {
  assertStorySuggestion(
    suggestion
  );


  if (
    !worldId
  ) {
    throw new Error(
      "worldId is required when mapping a Story Suggestion."
    );
  }


  if (
    !documentId
  ) {
    throw new Error(
      "documentId is required when mapping a Story Suggestion."
    );
  }


  const payload =
    buildSuggestionPayload(
      suggestion
    );


  const source =
    buildCandidateSource({
      suggestion,

      documentVersion,

      originalText,

      textRange,
    });


  const record = {
    worldId,

    documentId,

    suggestionId:
      suggestion
        .suggestionId,

    kind:
      suggestion
        .kind,

    /*
     * L3 status describes analysis readiness.
     *
     * StorySyncCandidate status describes whether the
     * user has acted on the suggestion.
     *
     * Every newly-persisted suggestion starts pending.
     */
    status:
      "pending",

    confidence:
      suggestion
        .confidence ??
      0.7,

    payload,

    source,

    warnings:
      suggestion
        .warnings ??
      [],
  };


  // ----------------------------------------------------
  // Legacy relation compatibility
  // ----------------------------------------------------

  if (
    suggestion.kind ===
    "relation-update"
  ) {
    record.relationConcept =
      suggestion
        .relationConcept;

    record.relationType =
      suggestion
        .relationConcept;

    record.subjectEntityId =
      suggestion
        .subjectEntityId;

    record.objectEntityId =
      suggestion
        .objectEntityId;

    record.subjectHint =
      suggestion
        .subjectName ??
      null;

    record.objectHint =
      suggestion
        .objectName ??
      null;
  }


  return cleanUndefined(
    record
  );
}


// ======================================================
// Batch Mapper
// ======================================================

function mapSuggestionsToStorySyncCandidates({
  suggestions = [],

  worldId,

  documentId,

  documentVersion = null,

  originalText = null,
}) {
  const records =
    [];


  const skipped =
    [];


  for (
    const suggestion of
    suggestions
  ) {
    /*
     * Informational suggestions are useful analysis
     * output but do not need to enter the pending user
     * action queue.
     */
    if (
      suggestion.status ===
      "informational"
    ) {
      skipped.push({
        suggestionId:
          suggestion
            .suggestionId,

        kind:
          suggestion
            .kind,

        reason:
          "informational",
      });


      continue;
    }


    records.push(
      mapSuggestionToStorySyncCandidate({
        suggestion,

        worldId,

        documentId,

        documentVersion,

        originalText,
      })
    );
  }


  return {
    records,

    skipped,
  };
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  isPlainObject,
  cleanUndefined,

  buildFieldUpdatePayload,
  buildRelationUpdatePayload,
  buildEventHistoryPayload,
  buildCreateEntityPayload,
  buildCreateSchemaFieldPayload,
  buildCreateSelectOptionPayload,

  buildSuggestionPayload,
  buildCandidateSource,

  mapSuggestionToStorySyncCandidate,
  mapSuggestionsToStorySyncCandidates,
};