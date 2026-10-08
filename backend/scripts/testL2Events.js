const {
  analyzeStory,
} = require(
  "../src/storyAnalysis"
);


const samples = [
  {
    title:
      "Chinese membership history",

    locale:
      "zh-CN",

    packs: [],

    text:
      "牙牙一开始加入民主党，后来退出，最后加入共产党。",
  },

  {
    title:
      "Chinese negation",

    locale:
      "zh-CN",

    packs: [],

    text:
      "牙牙并没有加入民主党。",
  },

  {
    title:
      "Chinese intention",

    locale:
      "zh-CN",

    packs: [],

    text:
      "牙牙计划加入共产党。",
  },

  {
    title:
      "Chinese uncertainty",

    locale:
      "zh-CN",

    packs: [],

    text:
      "牙牙可能加入共产党。",
  },

  {
    title:
      "Chinese travel",

    locale:
      "zh-CN",

    packs: [],

    text:
      "夜岚离开银月城，随后前往黑石港。",
  },

  {
    title:
      "Chinese Sci-Fi sequence",

    locale:
      "zh-CN",

    packs: [
      "sciFi",
    ],

    text:
      "曙光号发射升空，随后进入超空间，最后停靠在月神空间站。",
  },

  {
    title:
      "Chinese Cyberpunk",

    locale:
      "zh-CN",

    packs: [
      "sciFi",
    ],

    text:
      "夜岚接受了义体改造，后来黑入了天穹公司的主网络。",
  },

  {
    title:
      "Chinese colonization",

    locale:
      "zh-CN",

    packs: [
      "sciFi",
    ],

    text:
      "联邦在新伊甸建立殖民地，随后开始进行行星改造。",
  },

  {
    title:
      "English join leave",

    locale:
      "en",

    packs: [],

    text:
      "Alice joined the Guild, later left, and finally joined the Order.",
  },

  {
    title:
      "English negation",

    locale:
      "en",

    packs: [],

    text:
      "Alice did not join the Guild.",
  },

  {
    title:
      "English intention",

    locale:
      "en",

    packs: [],

    text:
      "Alice plans to join the Guild.",
  },

  {
    title:
      "English Sci-Fi",

    locale:
      "en",

    packs: [
      "sciFi",
    ],

    text:
      "The Aurora launched, entered hyperspace, docked at Luna Station, and later landed on Mars.",
  },

  {
    title:
      "English AI",

    locale:
      "en",

    packs: [
      "sciFi",
    ],

    text:
      "Eden became self-aware and later uploaded its mind to the orbital network.",
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
    analyzeStory(
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
    "\nEvents:"
  );


  if (
    result
      .eventCandidates
      .length ===
    0
  ) {
    console.log(
      "(none)"
    );

    continue;
  }


  for (
    const event of
    result
      .eventCandidates
  ) {
    console.log({
      eventConcept:
        event.eventConcept,

      subject:
        event.subjectHint,

      object:
        event.objectHint,

      negated:
        event.negated,

      intended:
        event.intended,

      uncertain:
        event.uncertain,

      confidence:
        Number(
          event
            .confidence
            .toFixed(2)
        ),

      sequence:
        event.sequenceIndex,

      metadata:
        event.metadata,
    });
  }
}