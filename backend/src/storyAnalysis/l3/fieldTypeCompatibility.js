// ======================================================
// L3-B2 Field Type Compatibility
//
// Compares:
//
// canonical semantic value type
//        vs
// user's actual Mimoria schema field type
//
// No database writes.
// No automatic schema changes.
// ======================================================


const {
  getConcept,
} = require(
  "../concepts/registry"
);


// ======================================================
// Type Normalization
// ======================================================

function normalizeFieldType(
  value
) {
  const normalized =
    String(
      value || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[\s_-]+/gu,
        ""
      );


  const aliases = {
    text:
      "text",

    string:
      "text",

    shorttext:
      "text",

    textarea:
      "long-text",

    longtext:
      "long-text",

    markdown:
      "long-text",

    number:
      "number",

    numeric:
      "number",

    integer:
      "number",

    float:
      "number",

    double:
      "number",

    boolean:
      "boolean",

    bool:
      "boolean",

    checkbox:
      "boolean",

    date:
      "date",

    datetime:
      "date",

    select:
      "select",

    dropdown:
      "select",

    enum:
      "select",

    entityreference:
      "entity-reference",

    reference:
      "entity-reference",

    entityref:
      "entity-reference",
  };


  return (
    aliases[
      normalized
    ] ||
    normalized ||
    null
  );
}


// ======================================================
// Canonical Expected Type
// ======================================================

function getCanonicalFieldValueType(
  fieldConcept
) {
  const concept =
    getConcept(
      fieldConcept
    );


  const rawType =
    concept?.valueType ??
    concept?.type ??
    null;


  return normalizeFieldType(
    rawType
  );
}


// ======================================================
// Actual Value Inspection
// ======================================================

function inferRuntimeValueType(
  value
) {
  if (
    value ===
    null ||
    value ===
    undefined
  ) {
    return "unknown";
  }


  if (
    typeof value ===
    "boolean"
  ) {
    return "boolean";
  }


  if (
    typeof value ===
    "number"
  ) {
    return "number";
  }


  if (
    typeof value ===
    "string"
  ) {
    return "text";
  }


  if (
    Array.isArray(
      value
    )
  ) {
    return "array";
  }


  if (
    typeof value ===
    "object"
  ) {
    /*
     * Normalized measured number:
     *
     * {
     *   value: 1.2,
     *   unit: "g"
     * }
     */
    if (
      typeof value.value ===
        "number" &&
      value.unit
    ) {
      return "measured-number";
    }


    /*
     * Already-resolved entity reference shape.
     */
    if (
      value.entityId ||
      value._id
    ) {
      return "entity-reference";
    }


    return "object";
  }


  return "unknown";
}


// ======================================================
// Compatibility Result Factory
// ======================================================

function makeCompatibility({
  status,

  compatible,

  canonicalType,

  schemaType,

  runtimeType,

  warning = null,

  reason = null,

  storageValueStrategy =
    "as-is",

  confidence = 1,
}) {
  return {
    status,

    compatible,

    canonicalType,

    schemaType,

    runtimeType,

    warning,

    reason,

    storageValueStrategy,

    confidence,
  };
}


// ======================================================
// Compatibility Rules
// ======================================================

function evaluateFieldTypeCompatibility({
  fieldConcept,

  schemaFieldType,

  value,
}) {
  const canonicalType =
    getCanonicalFieldValueType(
      fieldConcept
    );


  const schemaType =
    normalizeFieldType(
      schemaFieldType
    );


  const runtimeType =
    inferRuntimeValueType(
      value
    );


  // ----------------------------------------------------
  // Missing schema type information
  // ----------------------------------------------------

  if (
    !schemaType
  ) {
    return makeCompatibility({
      status:
        "unknown-schema-type",

      compatible:
        null,

      canonicalType,

      schemaType:
        null,

      runtimeType,

      warning:
        "Schema field type is missing.",

      confidence:
        0,
    });
  }


  // ----------------------------------------------------
  // Missing canonical type information
  // ----------------------------------------------------

  if (
    !canonicalType
  ) {
    return makeCompatibility({
      status:
        "canonical-type-unknown",

      compatible:
        null,

      canonicalType:
        null,

      schemaType,

      runtimeType,

      warning:
        "Canonical field value type is not defined.",

      confidence:
        0.5,
    });
  }


  // ----------------------------------------------------
  // Measured Number -> Number
  //
  // IMPORTANT:
  // This must run BEFORE the exact semantic type check.
  //
  // Example:
  //
  // {
  //   value: 1.2,
  //   unit: "g"
  // }
  //
  // canonical type = number
  // schema type    = number
  // runtime type   = measured-number
  //
  // The Number field should receive only 1.2.
  // ----------------------------------------------------

  if (
    canonicalType ===
      "number" &&
    schemaType ===
      "number" &&
    runtimeType ===
      "measured-number"
  ) {
    return makeCompatibility({
      status:
        "compatible",

      compatible:
        true,

      canonicalType,

      schemaType,

      runtimeType,

      warning:
        "Unit metadata is preserved in analysis, while the numeric component is prepared for the Number field.",

      storageValueStrategy:
        "numeric-component",

      confidence:
        0.95,
    });
  }


  // ----------------------------------------------------
  // Exact semantic type
  // ----------------------------------------------------

  if (
    canonicalType ===
    schemaType
  ) {
    return makeCompatibility({
      status:
        "exact",

      compatible:
        true,

      canonicalType,

      schemaType,

      runtimeType,

      confidence:
        1,
    });
  }


  // ----------------------------------------------------
  // Text <-> Long Text
  // ----------------------------------------------------

  if (
    (
      canonicalType ===
        "text" &&
      schemaType ===
        "long-text"
    ) ||
    (
      canonicalType ===
        "long-text" &&
      schemaType ===
        "text"
    )
  ) {
    return makeCompatibility({
      status:
        "compatible",

      compatible:
        true,

      canonicalType,

      schemaType,

      runtimeType,

      warning:
        "Text field length differs from the canonical semantic type.",

      confidence:
        0.95,
    });
  }


  // ----------------------------------------------------
  // Entity Reference -> Text
  //
  // Example:
  //
  // field.species
  // canonical = entity-reference
  //
  // user's schema:
  // 兽种 = Text
  //
  // We can safely store:
  // 虎鲸猫
  //
  // but it loses actual entity-reference semantics.
  // ----------------------------------------------------

  if (
    canonicalType ===
      "entity-reference" &&
    (
      schemaType ===
        "text" ||
      schemaType ===
        "long-text"
    )
  ) {
    return makeCompatibility({
      status:
        "compatible-with-warning",

      compatible:
        true,

      canonicalType,

      schemaType,

      runtimeType,

      warning:
        "Value can be stored as text, but entity-reference semantics will be lost.",

      storageValueStrategy:
        "reference-name-as-text",

      confidence:
        0.85,
    });
  }


  // ----------------------------------------------------
  // Text -> Entity Reference
  //
  // Example:
  //
  // birthplace = "美利坚合众国"
  //
  // schema field:
  // Entity-Reference
  //
  // The text cannot be stored directly.
  // It must first resolve to an entity ID.
  // ----------------------------------------------------

  if (
    (
      canonicalType ===
        "text" ||
      runtimeType ===
        "text"
    ) &&
    schemaType ===
      "entity-reference"
  ) {
    return makeCompatibility({
      status:
        "requires-reference-resolution",

      compatible:
        null,

      canonicalType,

      schemaType,

      runtimeType,

      warning:
        "Text value must be resolved to an entity before it can be stored in an Entity-Reference field.",

      storageValueStrategy:
        "resolve-entity-reference",

      confidence:
        0.7,
    });
  }


  // ----------------------------------------------------
  // Select
  //
  // Text can potentially fit a Select field, but we
  // still need to verify whether the option exists.
  // ----------------------------------------------------

  if (
    schemaType ===
      "select" &&
    (
      canonicalType ===
        "text" ||
      runtimeType ===
        "text"
    )
  ) {
    return makeCompatibility({
      status:
        "requires-select-option-check",

      compatible:
        null,

      canonicalType,

      schemaType,

      runtimeType,

      warning:
        "The value is textual but must match an existing Select option.",

      storageValueStrategy:
        "validate-select-option",

      confidence:
        0.8,
    });
  }


  // ----------------------------------------------------
  // Safe textual fallback
  //
  // If the user's schema field is text, many semantic
  // values can still be represented as text, although
  // structure may be lost.
  // ----------------------------------------------------

  if (
    schemaType ===
      "text" ||
    schemaType ===
      "long-text"
  ) {
    return makeCompatibility({
      status:
        "compatible-with-warning",

      compatible:
        true,

      canonicalType,

      schemaType,

      runtimeType,

      warning:
        "The value can be represented as text, but some semantic structure may be lost.",

      storageValueStrategy:
        "stringify",

      confidence:
        0.75,
    });
  }


  // ----------------------------------------------------
  // Otherwise incompatible
  // ----------------------------------------------------

  return makeCompatibility({
    status:
      "incompatible",

    compatible:
      false,

    canonicalType,

    schemaType,

    runtimeType,

    reason:
      `Canonical type "${canonicalType}" is not compatible with schema type "${schemaType}".`,

    storageValueStrategy:
      null,

    confidence:
      1,
  });
}


// ======================================================
// Storage Value Preview
//
// Prepares the value that WOULD be written.
//
// This does not write anything to the database.
// ======================================================

function getStorageValuePreview({
  value,
  compatibility,
}) {
  if (
    !compatibility
  ) {
    return value;
  }


  switch (
    compatibility
      .storageValueStrategy
  ) {
    // --------------------------------------------------
    // { value: 1.2, unit: "g" }
    // -> 1.2
    // --------------------------------------------------

    case "numeric-component":
      return (
        typeof value ===
          "object" &&
        value !==
          null
      )
        ? value.value
        : value;


    // --------------------------------------------------
    // Entity reference semantic value stored in a Text
    // field.
    // --------------------------------------------------

    case "reference-name-as-text":
      if (
        typeof value ===
          "string"
      ) {
        return value;
      }


      return (
        value?.name ??
        String(
          value ?? ""
        )
      );


    // --------------------------------------------------
    // Generic textual fallback
    // --------------------------------------------------

    case "stringify":
      if (
        typeof value ===
          "string"
      ) {
        return value;
      }


      return JSON.stringify(
        value
      );


    // --------------------------------------------------
    // Select / Entity-Reference are resolved in L3-B3.
    // Preserve original value for now.
    // --------------------------------------------------

    case "validate-select-option":
    case "resolve-entity-reference":
    case "as-is":
    default:
      return value;
  }
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  normalizeFieldType,

  getCanonicalFieldValueType,

  inferRuntimeValueType,

  evaluateFieldTypeCompatibility,

  getStorageValuePreview,
};