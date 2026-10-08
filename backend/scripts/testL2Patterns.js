const {
  analyzePatterns,
} = require(
  "../src/storyAnalysis"
);


const samples = [
  {
    title:
      "Original target",

    locale:
      "zh-CN",

    packs: [],

    text:
      "牙牙是一名24岁的魔法师，出生于美利坚合众国。",
  },

  {
    title:
      "Chinese Furry",

    locale:
      "zh-CN",

    packs: [
      "furry",
    ],

    text:
      "我的兽设夜岚是一只虎鲸猫，主色是蓝色，副色是白色，异色瞳，趾行，肉垫是粉色。",
  },

  {
    title:
      "Chinese simple species",

    locale:
      "zh-CN",

    packs: [
      "furry",
    ],

    text:
      "白露是一只狐狸。",
  },

  {
    title:
      "English Furry",

    locale:
      "en",

    packs: [
      "furry",
    ],

    text:
      "Luna is a wolf-dragon hybrid. Her body type is anthro.",
  },

  {
    title:
      "Chinese Sci-Fi",

    locale:
      "zh-CN",

    packs: [
      "sciFi",
    ],

    text:
      "开普勒七号拥有1.2G表面重力，大气是可呼吸氮氧大气，宜居度很高。",
  },

  {
    title:
      "Chinese AI",

    locale:
      "zh-CN",

    packs: [
      "sciFi",
    ],

    text:
      "人工智能伊甸的意识等级是完全自主意识。",
  },

  {
    title:
      "Mixed Furry Sci-Fi",

    locale:
      "zh-CN",

    packs: [
      "furry",
      "sciFi",
    ],

    text:
      "夜岚是一只虎鲸猫，anthro体型，安装了义体，使用曲率引擎。",
  },

  {
    title:
      "English age",

    locale:
      "en",

    packs: [],

    text:
      "Alice is 24 years old and was born in New York.",
  },
];


for (
  const sample of
  samples
) {
  console.log(
    "\n======================================"
  );

  console.log(
    sample.title
  );

  console.log(
    sample.locale
  );

  console.log(
    sample.text
  );


  const result =
    analyzePatterns(
      sample.text,
      sample.locale,
      {
        enabledPacks:
          sample.packs,

        nsfwEnabled:
          false,
      }
    );


  console.log(
    "\nClauses:"
  );


  console.log(
    result.clauses
  );


  console.log(
    "\nL2 Candidates:"
  );


  for (
    const candidate of
    result.candidates
  ) {
    console.log({
      candidateType:
        candidate
          .candidateType,

      subjectHint:
        candidate
          .subjectHint,

      fieldConcept:
        candidate
          .fieldConcept,

      value:
        candidate.value,

      normalizedValue:
        candidate
          .normalizedValue,

      confidence:
        Number(
          candidate
            .confidence
            .toFixed(2)
        ),

      extractor:
        candidate.extractor,

      metadata:
        candidate.metadata,
    });
  }
}