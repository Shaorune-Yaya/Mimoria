const {
  analyzeLexicon,
} = require(
  "../src/storyAnalysis"
);


const samples = [
  {
    title:
      "Chinese mixed language",

    locale:
      "zh-CN",

    text:
      "我的 fursona 夜岚是一只 wolf-dragon，anthro 体型，digitigrade，蓝色 fur，白色 markings。",
  },

  {
    title:
      "Chinese fandom species",

    locale:
      "zh-CN",

    text:
      "我的兽设是 Protogen，朋友的是 Sergal，另一个角色是 Dutch Angel Dragon。",
  },

  {
    title:
      "Chinese Avali and Synth",

    locale:
      "zh-CN",

    text:
      "这个OC是 Avali，另一个是 Synth。",
  },

  {
    title:
      "English fandom species",

    locale:
      "en",

    text:
      "My characters include a Protogen, a Sergal, a Dutchie, and an Avali.",
  },

  {
    title:
      "Fandom plurals",

    locale:
      "en",

    text:
      "The group contains Protogens, Sergals, Dutchies, and Synths.",
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
    "\nImportant matches:"
  );


  console.log(
    result.matches
      .filter(
        (match) =>
          [
            "entityType.character",
            "field.species",
            "field.bodyForm",
            "field.legType",
            "field.furColor",
            "field.markings",
          ].includes(
            match.conceptId
          )
      )
      .map(
        (match) => ({
          expression:
            match.expression,

          conceptId:
            match.conceptId,

          confidence:
            Number(
              match
                .confidence
                .toFixed(2)
            ),

          range: [
            match.start,
            match.end,
          ],
        })
      )
  );


  console.log(
    "\nSpecies evidence:"
  );


  console.log(
    result.speciesEvidence.map(
      (item) => ({
        surface:
          item.surface,

        normalized:
          item.normalizedValue,

        synthetic:
          item.synthetic,

        normalization:
          item.normalization,

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


  console.log(
    result.compoundSpeciesCandidates.map(
      (candidate) => ({
        text:
          candidate.text,

        components:
          candidate.components.map(
            (component) =>
              component.normalizedValue
          ),

        confidence:
          Number(
            candidate
              .confidence
              .toFixed(2)
          ),
      })
    )
  );
}