const {
  analyzeStoryForSuggestions,
} = require(
  "../src/storyAnalysis/l3/storyAnalysisPipeline"
);


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

    aliases: [
      "美国",
    ],

    entityTypeId:
      "type-country",

    typeConcept:
      "entityType.country",
  },
];


const entityTypes = [
  {
    _id:
      "type-character",

    name:
      "角色",

    fields: [
      {
        key:
          "field-species",

        label:
          "兽种",

        type:
          "Text",
      },

      {
        key:
          "field-primary-color",

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
          "field-birthplace",

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
    ],
  },
];


const entityTypeConceptMap = {
  "type-character":
    "entityType.character",

  "type-country":
    "entityType.country",

  "type-city":
    "entityType.city",

  "type-location":
    "entityType.location",
};


function test(
  title,
  text
) {
  console.log(
    "\n======================================"
  );

  console.log(
    title
  );

  console.log(
    text
  );


  const result =
    analyzeStoryForSuggestions(
      text,
      "zh-CN",
      {
        entities,

        entityTypes,

        entityTypeConceptMap,

        enabledPacks: [
          "furry",
        ],
      }
    );


  console.log(
    "\nSummary:"
  );

  console.dir(
    result.summary,
    {
      depth:
        null,
    }
  );


  console.log(
    "\nSuggestions:"
  );

  console.dir(
    result.suggestions,
    {
      depth:
        null,
    }
  );
}


test(
  "Ready field updates",

  "夜岚是一只虎鲸猫，主色是蓝色，出生于美利坚合众国。"
);


test(
  "Missing select option",

  "夜岚主色是紫罗兰色。"
);


test(
  "Missing reference entity",

  "夜岚出生于阿尔卡迪亚帝国。"
);