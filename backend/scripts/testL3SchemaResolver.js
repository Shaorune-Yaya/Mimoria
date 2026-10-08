const {
  analyzeStoryEntities,
  resolveFieldCandidateSchemas,
} = require(
  "../src/storyAnalysis"
);

const entityTypeConceptMap = {
  "type-character":
    "entityType.character",

  "type-country":
    "entityType.country",

  "type-city":
    "entityType.city",

  "type-location":
    "entityType.location",

  "type-planet":
    "entityType.planet",
};

// ======================================================
// Fake World Entities
// ======================================================

const entities = [
  {
    _id:
      "entity-yelan",

    name:
      "夜岚",

    entityTypeId:
      "type-character",

    typeConcept:
      "entityType.character",
  },

  {
    _id:
        "entity-us",

    name:
        "美利坚合众国",

    entityTypeId:
        "type-country",

    typeConcept:
        "entityType.country",

    aliases: [
        "美国",
    ],
  },

  {
    _id:
      "entity-kepler",

    name:
      "开普勒七号",

    entityTypeId:
      "type-planet",

    typeConcept:
      "entityType.planet",
  },
];


// ======================================================
// Fake User Schemas
//
// Notice:
// field keys are random IDs.
// ======================================================

const entityTypes = [
  {
    _id:
      "type-character",

    name:
      "角色",

    fields: [
      {
        key:
          "char-field-species-93ea",

        label:
          "兽种",

        type:
          "Text",
      },

      {
        key:
            "char-field-birthplace-8821",

        label:
            "出生地",

        type:
            "Entity-Reference",

        referenceTypes: [
            "type-country",
            "type-city",
            "type-location",
        ],
      },

      {
        key:
            "char-field-primary-color-a72b",

        label:
            "主色",

        type:
            "Select",

        options: [
            "红色",
            "蓝色",
            "白色",
        ],
      },

      {
        key:
          "char-field-age-f551",

        label:
          "年龄",

        type:
          "Number",
      },
    ],
  },

  {
    _id:
      "type-planet",

    name:
      "星球",

    fields: [
      {
        key:
          "planet-field-gravity-b991",

        label:
          "表面重力",

        type:
          "Number",

        canonicalConcept:
          "field.gravity",
      },

      {
        key:
          "planet-field-atmosphere-c172",

        label:
          "大气",

        type:
          "Text",
      },

      /*
       * Intentionally missing field.habitability
       * so we can test schema suggestions.
       */
    ],
  },
];


// ======================================================
// Helper
// ======================================================

function runTest({
  title,
  text,
  packs,
}) {
  console.log(
    "\n======================================"
  );

  console.log(
    title
  );

  console.log(
    text
  );


  const l3a =
    analyzeStoryEntities(
      text,
      "zh-CN",
      {
        entities,

        enabledPacks:
          packs ||
          [],
      }
    );


  /*
   * Only field-value candidates participate in
   * schema field resolution.
   */
  const fieldCandidates =
    l3a
      .resolvedCandidates
      .filter(
        (candidate) =>
          candidate
            .candidateType ===
          "field-value"
      );


  const schema =
    resolveFieldCandidateSchemas({
        fieldCandidates,

        entityTypes,

        entities,

        entityTypeConceptMap,

        locale:
        "zh-CN",

        enabledPacks:
        packs || [],

        nsfwEnabled:
        false,
    });


  console.log(
    "\nResolved fields:"
  );


  for (
    const candidate of
    schema.candidates
  ) {
    console.log({
      subject:
        candidate
          .subjectHint,

      subjectEntityId:
        candidate
          .subjectEntityId,

      fieldConcept:
        candidate
          .fieldConcept,

      value:
        candidate
          .normalizedValue,

      schemaStatus:
        candidate
          .schemaResolution
          ?.status,

      resolvedFieldKey:
        candidate
          .resolvedFieldKey,

      resolvedFieldLabel:
        candidate
          .resolvedFieldLabel,

      resolvedFieldType:
        candidate
          .resolvedFieldType,

      matchType:
        candidate
          .schemaResolution
          ?.matchType,

      confidence:
        candidate
          .schemaResolution
          ?.confidence,

    typeStatus:
  candidate
    .typeCompatibility
    ?.status,

    canonicalType:
    candidate
        .typeCompatibility
        ?.canonicalType,

    schemaType:
    candidate
        .typeCompatibility
        ?.schemaType,

    runtimeType:
    candidate
        .typeCompatibility
        ?.runtimeType,

    typeCompatible:
    candidate
        .typeCompatibility
        ?.compatible,

    typeWarning:
    candidate
        .typeCompatibility
        ?.warning,

    storageStrategy:
    candidate
        .typeCompatibility
        ?.storageValueStrategy,

    storagePreview:
    candidate
        .storageValuePreview,

    valueStatus:
    candidate
        .valueResolution
        ?.status,

    resolvedValue:
    candidate
        .valueResolution
        ?.resolvedValue,

    requestedValue:
    candidate
        .valueResolution
        ?.requestedValue,
    });
  }


  console.log(
    "\nSchema suggestions:"
  );


  console.log(
    schema.schemaSuggestions
  );

  console.log(
    "\nSelect option suggestions:"
  );

  console.log(
    schema.selectOptionSuggestions
  );

  console.log(
    "\nReference entity suggestions:"
  );

  console.log(
    schema.referenceEntitySuggestions
  );
}


// ======================================================
// Furry
// ======================================================

runTest({
  title:
    "Character custom schema",

  text:
    "夜岚是一只虎鲸猫，主色是蓝色。",

  packs: [
    "furry",
  ],
});


// ======================================================
// Sci-Fi
// ======================================================

runTest({
  title:
    "Planet custom schema",

  text:
    "开普勒七号拥有1.2G表面重力，大气是可呼吸氮氧大气，宜居度很高。",

  packs: [
    "sciFi",
  ],
});

runTest({
  title:
    "Character missing select option",

  text:
    "夜岚主色是紫罗兰色。",

  packs: [
    "furry",
  ],
});

runTest({
  title:
    "Existing entity reference",

  text:
    "夜岚出生于美利坚合众国。",

  packs: [
    "furry",
  ],
});

runTest({
  title:
    "Missing entity reference",

  text:
    "夜岚出生于阿尔卡迪亚帝国。",

  packs: [
    "furry",
  ],
});