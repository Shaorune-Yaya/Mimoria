const {
  analyzeUnknownEntities,
} = require(
  "../src/storyAnalysis"
);


const samples = [
  {
    title:
      "Chinese locations",

    locale:
      "zh-CN",

    text:
      "牙牙从诺兰帝国来到银月港，后来进入白银城。",
  },

  {
    title:
      "Chinese organizations",

    locale:
      "zh-CN",

    text:
      "黑月骑士团与天机宗后来结盟。",
  },

  {
    title:
      "Chinese titles",

    locale:
      "zh-CN",

    text:
      "玄真道人和李将军一起进入银月城。",
  },

  {
    title:
      "Chinese generic rejection",

    locale:
      "zh-CN",

    text:
      "他后来进了城内，又去了山上，最后回到国内。",
  },

  {
    title:
      "Chinese mixed",

    locale:
      "zh-CN",

    text:
      "诺兰帝国的黑月教团总部位于银月港。",
  },

  {
    title:
      "English locations",

    locale:
      "en",

    text:
      "Alice traveled from the Northern Kingdom to Silvermoon City.",
  },

  {
    title:
      "English organizations",

    locale:
      "en",

    text:
      "The Black Rose Guild later allied with the Imperial Army.",
  },

  {
    title:
      "English titles",

    locale:
      "en",

    text:
      "Sir Aldric and General Marcus entered Silvermoon City.",
  },

  {
    title:
      "English generic rejection",

    locale:
      "en",

    text:
      "She stayed in the city and later returned home.",
  },

  {
    title:
      "English mixed",

    locale:
      "en",

    text:
      "The Northern Kingdom established the Royal Academy near Silvermoon City.",
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
    analyzeUnknownEntities(
      sample.text,
      sample.locale
    );


  console.log(
    "\nUnknown Entity Candidates:"
  );


  if (
    result
      .unknownEntities
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
      .unknownEntities
  ) {
    console.log({
      name:
        candidate.name,

      likelyType:
        candidate.likelyType,

      roleConceptId:
        candidate.roleConceptId,

      confidence:
        Number(
          candidate
            .confidence
            .toFixed(2)
        ),

      range: [
        candidate.start,
        candidate.end,
      ],

      alternativeTypes:
        candidate
          .alternativeTypes,

      evidence:
        candidate
          .evidence
          .map(
            (item) => ({
              conceptId:
                item.conceptId,

              expression:
                item.expression,

              evidenceType:
                item.evidenceType,

              confidence:
                Number(
                  item.confidence
                    .toFixed(
                      2
                    )
                ),
            })
          ),
    });
  }
}