const {
  analyzeStory,
  resolveCandidateEntities,
} = require(
  "../src/storyAnalysis"
);


// ======================================================
// Fake Existing World
// ======================================================

const entities = [
  {
    _id:
      "entity-yaya",

    name:
      "牙牙",

    entityTypeId:
      "type-character",

    aliases: [],
  },

  {
    _id:
      "entity-democratic",

    name:
      "民主党",

    entityTypeId:
      "type-political-party",

    aliases: [],
  },

  {
    _id:
      "entity-communist",

    name:
      "共产党",

    entityTypeId:
      "type-political-party",

    aliases: [],
  },

  {
    _id:
      "entity-yelan",

    name:
      "夜岚",

    entityTypeId:
      "type-character",

    aliases: [],
  },
];


// ======================================================
// Helper
// ======================================================

function printResolved(
  result
) {
  console.log(
    "\nResolved candidates:"
  );


  for (
    const candidate of
    result.candidates
  ) {
    console.log({
      type:
        candidate
          .candidateType,

      event:
        candidate
          .eventConcept ||
        null,

      relation:
        candidate
          .relationConcept ||
        null,

      subjectHint:
        candidate
          .subjectHint ||
        null,

      subjectStatus:
        candidate
          .subjectResolution
          ?.status ||
        null,

      subjectEntityId:
        candidate
          .subjectEntityId ||
        null,

      objectHint:
        candidate
          .objectHint ||
        null,

      objectStatus:
        candidate
          .objectResolution
          ?.status ||
        null,

      objectEntityId:
        candidate
          .objectEntityId ||
        null,
    });
  }


  console.log(
    "\nEntity suggestions:"
  );


  console.log(
    result.entitySuggestions
  );
}


// ======================================================
// Existing Entities
// ======================================================

console.log(
  "\n======================================"
);

console.log(
  "Existing entities"
);


const existingStory =
  analyzeStory(
    "牙牙一开始加入民主党，后来退出，最后加入共产党。",
    "zh-CN"
  );


const existingResult =
  resolveCandidateEntities({
    candidates: [
      ...existingStory
        .eventCandidates,

      ...existingStory
        .relationCandidates,
    ],

    entities,
  });


printResolved(
  existingResult
);


// ======================================================
// Missing Object
// ======================================================

console.log(
  "\n======================================"
);

console.log(
  "Missing organization"
);


const missingStory =
  analyzeStory(
    "夜岚加入黑月骑士团。",
    "zh-CN"
  );


const missingResult =
  resolveCandidateEntities({
    candidates: [
      ...missingStory
        .eventCandidates,

      ...missingStory
        .relationCandidates,
    ],

    entities,
  });


printResolved(
  missingResult
);