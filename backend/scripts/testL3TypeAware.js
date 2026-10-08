const {
  analyzeStory,
  resolveCandidateEntities,
} = require(
  "../src/storyAnalysis"
);


// ======================================================
// Fake World
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

  /*
   * Same name:
   * one city, one spacecraft.
   */
  {
    _id:
      "entity-silvermoon-city",

    name:
      "Silvermoon",

    entityTypeId:
      "type-city",

    typeConcept:
      "entityType.city",
  },

  {
    _id:
      "entity-silvermoon-ship",

    name:
      "Silvermoon",

    entityTypeId:
      "type-spacecraft",

    typeConcept:
      "entityType.spacecraft",
  },

  /*
   * Same name:
   * one character, one guild.
   */
  {
    _id:
      "entity-phoenix-character",

    name:
      "Phoenix",

    entityTypeId:
      "type-character",

    typeConcept:
      "entityType.character",
  },

  {
    _id:
      "entity-phoenix-guild",

    name:
      "Phoenix",

    entityTypeId:
      "type-guild",

    typeConcept:
      "entityType.guild",
  },
];


// ======================================================
// Helper
// ======================================================

function runTest({
  title,
  text,
  packs = [],
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


  const story =
    analyzeStory(
      text,
      "en",
      {
        enabledPacks:
          packs,
      }
    );


  const resolved =
    resolveCandidateEntities({
      candidates: [
        ...story
          .eventCandidates,

        ...story
          .relationCandidates,
      ],

      entities,
    });


  console.log(
    "\nResolved:"
  );


  for (
    const candidate of
    resolved.candidates
  ) {
    console.log({
      candidateType:
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

      subject:
        candidate
          .subjectHint,

      subjectEntity:
        candidate
          .subjectEntityId,

      subjectType:
        candidate
          .subjectResolution
          ?.entityTypeConcept,

      object:
        candidate
          .objectHint,

      objectStatus:
        candidate
          .objectResolution
          ?.status,

      objectEntity:
        candidate
          .objectEntityId,

      objectType:
        candidate
          .objectResolution
          ?.entityTypeConcept,

      objectTypeCompatible:
        candidate
          .objectResolution
          ?.typeCompatible,

      expectedObjectTypes:
        candidate
          .objectResolution
          ?.expectedTypeConcepts,
    });
  }


  console.log(
    "\nSuggestions:"
  );

  console.log(
    resolved.entitySuggestions
  );
}


// ======================================================
// Travel
// ======================================================

runTest({
  title:
    "Travel should prefer city",

  text:
    "Alice traveled to Silvermoon.",
});


// ======================================================
// Join
// ======================================================

runTest({
  title:
    "Join should prefer guild",

  text:
    "Alice joined Phoenix.",
});


// ======================================================
// Missing organization
// ======================================================

runTest({
  title:
    "Missing organization gets type hint",

  text:
    "Alice joined Black Moon Order.",
});