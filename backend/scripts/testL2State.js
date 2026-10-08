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

    text:
      "牙牙一开始加入民主党，后来退出，最后加入共产党。",
  },

  {
    title:
      "Chinese negated join",

    locale:
      "zh-CN",

    text:
      "牙牙并没有加入民主党。",
  },

  {
    title:
      "Chinese intended join",

    locale:
      "zh-CN",

    text:
      "牙牙计划加入共产党。",
  },

  {
    title:
      "Chinese uncertain join",

    locale:
      "zh-CN",

    text:
      "牙牙可能加入共产党。",
  },

  {
    title:
      "Chinese multiple memberships",

    locale:
      "zh-CN",

    text:
      "牙牙加入魔法师公会，后来又加入冒险者协会。",
  },

  {
    title:
      "Chinese leave one membership",

    locale:
      "zh-CN",

    text:
      "牙牙加入魔法师公会，后来加入冒险者协会，最后退出魔法师公会。",
  },

  {
    title:
      "English membership",

    locale:
      "en",

    text:
      "Alice joined the Guild, later left, and finally joined the Order.",
  },

  {
    title:
      "English negated",

    locale:
      "en",

    text:
      "Alice did not join the Guild.",
  },

  {
    title:
      "Sci-Fi events should not create relations",

    locale:
      "zh-CN",

    packs: [
      "sciFi",
    ],

    text:
      "曙光号发射升空，进入超空间，最后停靠在月神空间站。",
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
    sample.text
  );


  const result =
    analyzeStory(
      sample.text,
      sample.locale,
      {
        enabledPacks:
          sample.packs ||
          [],

        nsfwEnabled:
          false,
      }
    );


  console.log(
    "\nEvents:"
  );


  console.log(
    result
      .eventCandidates
      .map(
        (event) => ({
          seq:
            event.sequenceIndex,

          event:
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
        })
      )
  );


  console.log(
    "\nCurrent relations:"
  );


  console.log(
    result
      .relationCandidates
      .map(
        (relation) => ({
          subject:
            relation.subjectHint,

          relation:
            relation.relationConcept,

          object:
            relation.objectHint,

          state:
            relation.state,

          derivedFrom:
            relation
              .derivedFromEvents,
        })
      )
  );


  console.log(
    "\nEnded relations:"
  );


  console.log(
    result
      .endedRelations
      .map(
        (relation) => ({
          subject:
            relation.subjectHint,

          relation:
            relation.relationConcept,

          object:
            relation.objectHint,

          started:
            relation
              .startedBySequence,

          ended:
            relation
              .endedBySequence,

          derivedFrom:
            relation
              .derivedFromEvents,
        })
      )
  );


  console.log(
    "\nIgnored events:"
  );


  console.log(
    result
      .ignoredEvents
      .map(
        (event) => ({
          event:
            event.eventConcept,

          subject:
            event.subjectHint,

          object:
            event.objectHint,

          reason:
            event
              .stateResolution
              ?.reason,
        })
      )
  );
}