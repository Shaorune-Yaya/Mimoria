// ======================================================
// L3-B3 Field Value Resolver
//
// Resolves candidate values against actual schema field
// constraints.
//
// Supports:
//
// - Select
// - Entity-Reference
//
// No database writes.
// ======================================================


const {
  normalizeFieldType,
} = require(
  "./fieldTypeCompatibility"
);

const {
  resolveEntityHint,
} = require(
  "./entityResolver"
);


// ======================================================
// Helpers
// ======================================================

function normalizeValue(
  value
) {
  return String(
    value ?? ""
  )
    .normalize(
      "NFKC"
    )
    .trim()
    .replace(
      /\s+/gu,
      " "
    )
    .toLowerCase();
}


function getFieldOptions(
  field
) {
  const raw =
    field?.options ??
    field?.selectOptions ??
    [];


  if (
    !Array.isArray(
      raw
    )
  ) {
    return [];
  }


  return raw;
}


function getOptionValue(
  option
) {
  if (
    typeof option ===
    "string"
  ) {
    return option;
  }


  return (
    option?.value ??
    option?.label ??
    option?.name ??
    null
  );
}


// ======================================================
// Entity-Reference Constraint Helpers
// ======================================================

function getReferenceTypeConstraints(
  field
) {
  const raw =
    field?.referenceTypes ??
    field?.allowedEntityTypes ??
    field?.entityTypes ??
    field?.allowedTypes ??
    [];


  if (
    Array.isArray(
      raw
    )
  ) {
    return raw.map(
      (value) =>
        String(
          value
        )
    );
  }


  if (
    raw
  ) {
    return [
      String(
        raw
      ),
    ];
  }


  return [];
}


// ======================================================
// Select
// ======================================================

function resolveSelectValue({
  value,
  field,
}) {
  const options =
    getFieldOptions(
      field
    );


  const normalizedValue =
    normalizeValue(
      value
    );


  const matches =
    options.filter(
      (option) => {
        const optionValue =
          getOptionValue(
            option
          );


        return (
          optionValue &&
          normalizeValue(
            optionValue
          ) ===
            normalizedValue
        );
      }
    );


  if (
    matches.length ===
    1
  ) {
    const matched =
      matches[0];


    return {
      status:
        "resolved",

      valueType:
        "select",

      resolvedValue:
        getOptionValue(
          matched
        ),

      matchedOption:
        matched,

      confidence:
        1,
    };
  }


  if (
    matches.length >
    1
  ) {
    return {
      status:
        "ambiguous",

      valueType:
        "select",

      resolvedValue:
        null,

      alternatives:
        matches,

      confidence:
        1,
    };
  }


  return {
    status:
      "missing-option",

    valueType:
      "select",

    resolvedValue:
      null,

    requestedValue:
      value,

    confidence:
      0,
  };
}


// ======================================================
// Entity Reference
// ======================================================

function resolveEntityReferenceValue({
  value,

  field,

  entities = [],

  entityTypeConceptMap = {},
}) {
  const referenceHint =
    typeof value ===
      "string"
      ? value
      : value?.name ??
        null;


  if (
    !referenceHint
  ) {
    return {
      status:
        "missing-reference-hint",

      valueType:
        "entity-reference",

      resolvedValue:
        null,

      referenceHint:
        null,

      confidence:
        0,
    };
  }


  const referenceTypeConstraints =
    getReferenceTypeConstraints(
      field
    );


  /*
   * Current schema reference constraints are treated as
   * EntityType IDs.
   *
   * If canonical concept mapping is available, convert
   * those IDs into semantic type concepts so L3-A can
   * use type-aware disambiguation.
   */
  const expectedTypeConcepts =
    referenceTypeConstraints
      .map(
        (typeId) =>
          entityTypeConceptMap[
            typeId
          ] ||
          null
      )
      .filter(
        Boolean
      );


  const resolution =
    resolveEntityHint(
      referenceHint,
      entities,
      {
        expectedTypeConcepts,

        entityTypeConceptMap,
      }
    );


  if (
    resolution.status ===
    "resolved"
  ) {
    return {
      status:
        "resolved",

      valueType:
        "entity-reference",

      resolvedValue:
        resolution.entityId,

      referenceHint,

      entityId:
        resolution.entityId,

      entityTypeId:
        resolution.entityTypeId,

      matchedName:
        resolution.matchedName,

      matchType:
        resolution.matchType,

      confidence:
        resolution.confidence,

      referenceResolution:
        resolution,
    };
  }


  if (
    resolution.status ===
    "ambiguous"
  ) {
    return {
      status:
        "ambiguous-reference",

      valueType:
        "entity-reference",

      resolvedValue:
        null,

      referenceHint,

      confidence:
        resolution.confidence,

      alternatives:
        resolution.alternatives,

      referenceResolution:
        resolution,
    };
  }


  return {
    status:
      "missing-reference",

    valueType:
      "entity-reference",

    resolvedValue:
      null,

    referenceHint,

    confidence:
      0,

    referenceResolution:
      resolution,

    expectedTypeConcepts,

    referenceTypeConstraints,
  };
}


// ======================================================
// Main
// ======================================================

function resolveFieldValue({
  value,

  field,

  entities = [],

  entityTypeConceptMap = {},
}) {
  const fieldType =
    normalizeFieldType(
      field?.type ??
      field?.valueType ??
      field?.fieldType
    );


  if (
    fieldType ===
    "select"
  ) {
    return resolveSelectValue({
      value,
      field,
    });
  }


  if (
    fieldType ===
    "entity-reference"
  ) {
    return resolveEntityReferenceValue({
      value,

      field,

      entities,

      entityTypeConceptMap,
    });
  }


  return {
    status:
      "not-required",

    valueType:
      fieldType,

    resolvedValue:
      value,

    confidence:
      1,
  };
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  normalizeValue,

  getFieldOptions,
  getOptionValue,

  getReferenceTypeConstraints,

  resolveSelectValue,
  resolveEntityReferenceValue,

  resolveFieldValue,
};