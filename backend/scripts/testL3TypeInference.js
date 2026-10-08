const {
  analyzeStoryEntities,
} = require(
  "../src/storyAnalysis"
);


// ======================================================
// Existing World
// ======================================================

const entities = [
  {
    _id:
      "entity-alice",

    name:
      "Alice",

    entityTypeId:
      "type-character",

    typeConcept:
      "entityType.character",
  },

  {
    _id:
      "entity-yaya",

    name:
      "牙牙",

    entityTypeId:
      "type-character",

    typeConcept:
      "entityType.character",
  },
];


// ======================================================
// Tests
// ======================================================

const samples = [
  {
    title:
      "English missing order",

    locale:
      "en",

    text:
      "Alice joined Black Moon Order.",
  },

  {
    title:
      "Chinese missing guild",

    locale:
      "zh-CN",

    text:
      "牙牙加入银月公会。",
  },

  {
    title:
      "Chinese missing political party",

    locale:
      "zh-CN",

    text:
      "牙牙加入星火党。",
  },

  {
    title:
      "English missing city",

    locale:
      "en",

    text:
      "Alice traveled to Silvermoon City.",
  },

  {
    title:
      "Chinese missing port",

    locale:
      "zh-CN",

    text:
      "牙牙前往黑石港。",
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
    analyzeStoryEntities(
      sample.text,
      sample.locale,
      {
        entities,

        enabledPacks: [
          "furry",
          "sciFi",
        ],

        nsfwEnabled:
          false,
      }
    );


  console.log(
    "\nUnknown entities:"
  );


  console.log(
    result
      .unknownEntities
      .map(
        (candidate) => ({
          name:
            candidate.name,

          likelyType:
            candidate.likelyType,

          confidence:
            Number(
              (
                candidate.confidence ||
                0
              )
                .toFixed(
                  2
                )
            ),

          alternatives:
            candidate
              .alternativeTypes ||
            [],
        })
      )
  );


  console.log(
    "\nEntity suggestions:"
  );


  console.log(
    result
        .entitySuggestions
        .map(
        (suggestion) => ({
            name:
            suggestion.name,

            likelyType:
            suggestion
                .likelyTypeConcept,

            inference:
            suggestion
                .typeInferenceStatus,

            confidence:
            Number(
                (
                suggestion
                    .typeInferenceConfidence ||
                0
                )
                .toFixed(
                    2
                )
            ),

            evidence:
            (
                suggestion
                .unknownEntityEvidence ||
                []
            ).map(
                (evidence) => ({
                type:
                    evidence
                    .typeConcept,

                source:
                    evidence
                    .source,

                nameMatch:
                    evidence
                    .nameMatchType,

                confidence:
                    Number(
                    (
                        evidence
                        .confidence ||
                        0
                    )
                        .toFixed(
                        2
                        )
                    ),
                })
            ),

            conflicting:
            suggestion
                .conflictingTypeConcepts,
        })
        )
    );
}