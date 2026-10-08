const {
  analyzeLexicon,
} = require(
  "../src/storyAnalysis"
);


const samples = [
  {
    title:
      "Chinese wolf dragon",

    locale:
      "zh-CN",

    text:
      "夜岚是一只狼龙。",
  },

  {
    title:
      "Chinese triple hybrid",

    locale:
      "zh-CN",

    text:
      "这个角色是狼狐龙混种。",
  },

  {
    title:
      "Chinese orca cat",

    locale:
      "zh-CN",

    text:
      "墨海是一只虎鲸猫。",
  },

  {
    title:
      "Chinese separated hybrid",

    locale:
      "zh-CN",

    text:
      "这个角色是狼和龙的混种。",
  },

  {
    title:
      "Chinese normal list",

    locale:
      "zh-CN",

    text:
      "森林里生活着狼和狐狸。",
  },

  {
    title:
      "English singular hybrid",

    locale:
      "en",

    text:
      "My fursona is a wolf-dragon.",
  },

  {
    title:
      "English slash hybrid",

    locale:
      "en",

    text:
      "She is a fox/wolf hybrid.",
  },

  {
    title:
      "English spaced hybrid",

    locale:
      "en",

    text:
      "This character is a wolf dragon hybrid.",
  },

  {
    title:
      "English plural species",

    locale:
      "en",

    text:
      "The forest contains wolves, foxes, dragons, cats, and rabbits.",
  },

  {
    title:
      "English plural non-hybrid",

    locale:
      "en",

    text:
      "Wolves and foxes live in the forest.",
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
    analyzeLexicon(
      sample.text,
      sample.locale,
      {
        enabledPacks: [
          "furry",
        ],

        nsfwEnabled:
          false,
      }
    );


  console.log(
    "\nHybrid modifiers:"
  );


  console.log(
    result.matches
      .filter(
        (match) =>
          match.conceptId ===
          "modifier.hybrid"
      )
      .map(
        (match) => ({
          expression:
            match.expression,

          range: [
            match.start,
            match.end,
          ],
        })
      )
  );


  console.log(
    "\nNormalized species evidence:"
  );


  console.log(
    result.speciesEvidence.map(
      (item) => ({
        surface:
          item.surface,

        normalizedValue:
          item.normalizedValue,

        normalization:
          item.normalization,

        synthetic:
          item.synthetic,

        confidence:
          Number(
            item.confidence
              .toFixed(2)
          ),

        range: [
          item.start,
          item.end,
        ],
      })
    )
  );


  console.log(
    "\nCompound species:"
  );


  if (
    result
      .compoundSpeciesCandidates
      .length ===
    0
  ) {
    console.log(
      "(none)"
    );

    continue;
  }


  for (
    const candidate of
    result
      .compoundSpeciesCandidates
  ) {
    console.log({
      text:
        candidate.text,

      hybrid:
        candidate.hybrid,

      confidence:
        Number(
          candidate
            .confidence
            .toFixed(2)
        ),

      components:
        candidate.components.map(
          (component) => ({
            surface:
              component.text,

            normalized:
              component
                .normalizedValue,
          })
        ),

      range: [
        candidate.start,
        candidate.end,
      ],

      evidence:
        candidate.evidence,
    });
  }
}