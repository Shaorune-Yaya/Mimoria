// ======================================================
// L3-B Schema Field Resolver
//
// Maps canonical field concepts:
//
// field.age
// field.species
// field.gravity
//
// to the user's actual EntityType field:
//
// {
//   key: "uuid...",
//   name: "年龄",
//   type: "Number"
// }
//
// No schema writes.
// No field creation.
// ======================================================


const {
  loadLocale,
} = require(
  "../core/lexiconLoader"
);

const {
  loadPackLocale,
} = require(
  "../packs/packLoader"
);

const {
  mergeLexicons,
} = require(
  "../core/lexiconMerger"
);

const {
  getConcept,
} = require(
  "../concepts/registry"
);


// ======================================================
// Normalization
// ======================================================

function normalizeSchemaLabel(
  value
) {
  return String(
    value || ""
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


// ======================================================
// Entity Type Helpers
// ======================================================

function getEntityTypeId(
  entityType
) {
  if (
    !entityType
  ) {
    return null;
  }


  return String(
    entityType._id ??
    entityType.id ??
    ""
  ) || null;
}


function getEntityTypeName(
  entityType
) {
  return String(
    entityType?.name ??
    entityType?.label ??
    entityType?.title ??
    ""
  )
    .trim();
}


function getEntityTypeFields(
  entityType
) {
  if (
    Array.isArray(
      entityType?.fields
    )
  ) {
    return entityType.fields;
  }


  return [];
}


// ======================================================
// Schema Field Helpers
//
// Intentionally tolerant because Mimoria's field objects
// may evolve over time.
// ======================================================

function getSchemaFieldKey(
  field
) {
  if (!field) {
    return null;
  }


  const value =
    field.key ??
    field.id ??
    field._id ??
    null;


  return (
    value ===
    null ||
    value ===
    undefined
  )
    ? null
    : String(
        value
      );
}


function getSchemaFieldLabel(
  field
) {
  return String(
    field?.label ??
    field?.name ??
    field?.title ??
    field?.displayName ??
    ""
  )
    .trim();
}


function getSchemaFieldType(
  field
) {
  return (
    field?.type ??
    field?.valueType ??
    field?.fieldType ??
    null
  );
}


function getSchemaFieldCanonicalConcept(
  field
) {
  return (
    field?.canonicalConcept ??
    field?.conceptId ??
    field?.semanticConcept ??
    null
  );
}


// ======================================================
// Alias Extraction
//
// We reuse the same locale lexicon as L1 instead of
// maintaining a second giant alias dictionary.
//
// The traversal is intentionally generic so it tolerates
// arrays/categories in the lexicon structure.
// ======================================================

function collectAliasesFromNode(
  node,
  targetConceptId,
  results,
  visited
) {
  if (
    node ===
      null ||
    node ===
      undefined
  ) {
    return;
  }


  if (
    typeof node !==
      "object"
  ) {
    return;
  }


  if (
    visited.has(
      node
    )
  ) {
    return;
  }


  visited.add(
    node
  );


  if (
    Array.isArray(
      node
    )
  ) {
    for (
      const item of
      node
    ) {
      collectAliasesFromNode(
        item,
        targetConceptId,
        results,
        visited
      );
    }


    return;
  }


  const conceptId =
    node.conceptId ??
    node.concept ??
    null;


  if (
    conceptId ===
    targetConceptId
  ) {
    const aliases =
      node.aliases;


    if (
      Array.isArray(
        aliases
      )
    ) {
      for (
        const alias of
        aliases
      ) {
        if (
          typeof alias ===
          "string"
        ) {
          results.add(
            alias
          );
        }
      }
    }


    if (
      aliases &&
      typeof aliases ===
        "object"
    ) {
      for (
        const value of
        Object.values(
          aliases
        )
      ) {
        if (
          Array.isArray(
            value
          )
        ) {
          for (
            const alias of
            value
          ) {
            if (
              typeof alias ===
              "string"
            ) {
              results.add(
                alias
              );
            }
          }
        }
      }
    }


    if (
      typeof node.expression ===
      "string"
    ) {
      results.add(
        node.expression
      );
    }


    if (
      typeof node.label ===
      "string"
    ) {
      results.add(
        node.label
      );
    }


    if (
      typeof node.name ===
      "string"
    ) {
      results.add(
        node.name
      );
    }
  }


  for (
    const value of
    Object.values(
      node
    )
  ) {
    collectAliasesFromNode(
      value,
      targetConceptId,
      results,
      visited
    );
  }
}

// ======================================================
// Schema Alias Lexicon
//
// Schema resolution must see the same enabled domain
// packs as story analysis.
//
// Core
// + Furry
// + Sci-Fi
// + future packs
// ======================================================

function buildSchemaAliasLexicon(
  locale = "zh-CN",
  options = {}
) {
  const enabledPacks =
    Array.isArray(
      options.enabledPacks
    )
      ? options.enabledPacks
      : [];


  const nsfwEnabled =
    options.nsfwEnabled ===
    true;


  let lexicon =
    loadLocale(
      locale
    );


  for (
    const packId of
    enabledPacks
  ) {
    try {
      const packLexicon =
        loadPackLocale(
          packId,
          locale,
          {
            nsfwEnabled,
          }
        );


      lexicon =
        mergeLexicons(
          lexicon,
          packLexicon
        );
    } catch {
      /*
       * A missing / disabled pack should not make
       * schema resolution crash.
       */
    }
  }


  return lexicon;
}

function getFieldConceptAliases(
  fieldConcept,
  locale = "zh-CN",
  options = {}
) {
  const results =
    new Set();


  /*
   * Canonical fallback:
   *
   * field.primaryColor
   * -> primaryColor
   */
  const canonicalTail =
    String(
      fieldConcept || ""
    )
      .split(".")
      .pop();


  if (
    canonicalTail
  ) {
    results.add(
      canonicalTail
    );
  }


  let lexicon =
    null;


  try {
    lexicon =
      buildSchemaAliasLexicon(
        locale,
        options
      );
  } catch {
    lexicon =
      null;
  }


  if (
    lexicon
  ) {
    collectAliasesFromNode(
      lexicon,
      fieldConcept,
      results,
      new Set()
    );
  }


  return [
    ...results,
  ];
}


// ======================================================
// Direct Canonical Match
// ======================================================

function findCanonicalMatches({
  fieldConcept,
  fields,
}) {
  return fields.filter(
    (field) =>
      getSchemaFieldCanonicalConcept(
        field
      ) ===
      fieldConcept
  );
}


// ======================================================
// Label Match
// ======================================================

function calculateLabelMatch({
  label,
  aliases,
}) {
  const normalizedLabel =
    normalizeSchemaLabel(
      label
    );


  if (
    !normalizedLabel
  ) {
    return null;
  }


  for (
    const alias of
    aliases
  ) {
    const normalizedAlias =
      normalizeSchemaLabel(
        alias
      );


    if (
      !normalizedAlias
    ) {
      continue;
    }


    if (
      normalizedLabel ===
      normalizedAlias
    ) {
      return {
        matchType:
          "exact-label",

        confidence:
          0.95,

        matchedAlias:
          alias,
      };
    }
  }


  return null;
}


// ======================================================
// Resolve
// ======================================================

function resolveSchemaField({
  fieldConcept,

  entityType,

  locale = "zh-CN",

  enabledPacks = [],

  nsfwEnabled = false,
}){
  if (
    !fieldConcept
  ) {
    return {
      status:
        "missing-concept",

      fieldConcept:
        null,

      fieldKey:
        null,

      confidence:
        0,
    };
  }


  if (
    !entityType
  ) {
    return {
      status:
        "missing-entity-type",

      fieldConcept,

      fieldKey:
        null,

      confidence:
        0,
    };
  }


  const fields =
    getEntityTypeFields(
      entityType
    );


  /*
   * Best case:
   * schema field already stores canonical concept.
   */
  const canonicalMatches =
    findCanonicalMatches({
      fieldConcept,
      fields,
    });


  if (
    canonicalMatches.length ===
    1
  ) {
    const field =
      canonicalMatches[0];


    return {
      status:
        "resolved",

      fieldConcept,

      fieldKey:
        getSchemaFieldKey(
          field
        ),

      fieldLabel:
        getSchemaFieldLabel(
          field
        ),

      fieldType:
        getSchemaFieldType(
          field
        ),

      matchType:
        "canonical-concept",

      confidence:
        1,

      field,
    };
  }


  if (
    canonicalMatches.length >
    1
  ) {
    return {
      status:
        "ambiguous",

      fieldConcept,

      fieldKey:
        null,

      confidence:
        1,

      alternatives:
        canonicalMatches.map(
          (field) => ({
            fieldKey:
              getSchemaFieldKey(
                field
              ),

            fieldLabel:
              getSchemaFieldLabel(
                field
              ),

            fieldType:
              getSchemaFieldType(
                field
              ),

            matchType:
              "canonical-concept",
          })
        ),
    };
  }


  /*
   * Existing Mimoria schemas may predate canonicalConcept.
   * Fall back to labels such as:
   *
   * 年龄
   * Age
   * 兽种
   * Species
   */
  const aliases =
    getFieldConceptAliases(
        fieldConcept,
        locale,
        {
        enabledPacks,
        nsfwEnabled,
        }
    );


  const labelMatches =
    [];


  for (
    const field of
    fields
  ) {
    const label =
      getSchemaFieldLabel(
        field
      );


    const match =
      calculateLabelMatch({
        label,
        aliases,
      });


    if (!match) {
      continue;
    }


    labelMatches.push({
      field,
      ...match,
    });
  }


  if (
    labelMatches.length ===
    0
  ) {
    return {
      status:
        "missing",

      fieldConcept,

      fieldKey:
        null,

      confidence:
        0,

      aliasesChecked:
        aliases,
    };
  }


  labelMatches.sort(
    (
      a,
      b
    ) =>
      b.confidence -
      a.confidence
  );


  const best =
    labelMatches[0];


  const tied =
    labelMatches.filter(
      (item) =>
        item.confidence ===
        best.confidence
    );


  if (
    tied.length >
    1
  ) {
    return {
      status:
        "ambiguous",

      fieldConcept,

      fieldKey:
        null,

      confidence:
        best.confidence,

      alternatives:
        tied.map(
          (item) => ({
            fieldKey:
              getSchemaFieldKey(
                item.field
              ),

            fieldLabel:
              getSchemaFieldLabel(
                item.field
              ),

            fieldType:
              getSchemaFieldType(
                item.field
              ),

            matchType:
              item.matchType,

            matchedAlias:
              item.matchedAlias,
          })
        ),
    };
  }


  return {
    status:
      "resolved",

    fieldConcept,

    fieldKey:
      getSchemaFieldKey(
        best.field
      ),

    fieldLabel:
      getSchemaFieldLabel(
        best.field
      ),

    fieldType:
      getSchemaFieldType(
        best.field
      ),

    matchType:
      best.matchType,

    matchedAlias:
      best.matchedAlias,

    confidence:
      best.confidence,

    field:
      best.field,
  };
}


// ======================================================
// Suggested Field Metadata
// ======================================================

function getSuggestedFieldMetadata(
  fieldConcept,
  locale = "zh-CN",
  options = {}
) {
  const concept =
    getConcept(
      fieldConcept
    );


  const aliases =
    getFieldConceptAliases(
        fieldConcept,
        locale,
        options
    );


  /*
   * Prefer a human-readable locale alias.
   */
  const suggestedLabel =
    aliases.find(
      (alias) =>
        locale
          .toLowerCase()
          .startsWith(
            "zh"
          )
          ? /[\p{Script=Han}]/u.test(
              alias
            )
          : /^[A-Za-z]/u.test(
              alias
            )
    ) ||
    aliases[0] ||
    fieldConcept
      .split(".")
      .pop();


  return {
    canonicalConcept:
      fieldConcept,

    suggestedLabel,

    /*
     * Preserve the registry's definition instead of
     * inventing another schema type system.
     */
    suggestedValueType:
      concept?.valueType ||
      concept?.type ||
      "text",
  };
}


module.exports = {
  normalizeSchemaLabel,

  getEntityTypeId,
  getEntityTypeName,
  getEntityTypeFields,

  getSchemaFieldKey,
  getSchemaFieldLabel,
  getSchemaFieldType,
  getSchemaFieldCanonicalConcept,

  getFieldConceptAliases,

  resolveSchemaField,

  getSuggestedFieldMetadata,
  buildSchemaAliasLexicon,
  
};