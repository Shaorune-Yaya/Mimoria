const mongoose = require(
  "mongoose"
);

const StorySyncCandidate =
  require(
    "../src/models/StorySyncCandidate"
  );

const {
  mapSuggestionsToStorySyncCandidates,
} = require(
  "../src/storyAnalysis/l4/storySyncMapper"
);


// ======================================================
// IDs
// ======================================================

const worldId =
  new mongoose.Types.ObjectId();


const documentId =
  new mongoose.Types.ObjectId();


const entityId =
  new mongoose.Types.ObjectId();


const countryId =
  new mongoose.Types.ObjectId();


// ======================================================
// Fake L3 Suggestions
// ======================================================

const suggestions = [
  {
    suggestionId:
      "field-update::character::field-primary-color::blue",

    kind:
      "field-update",

    status:
      "ready",

    targetEntityId:
      entityId,

    targetEntityName:
      "夜岚",

    fieldKey:
      "field-primary-color",

    fieldLabel:
      "主色",

    fieldConcept:
      "field.primaryColor",

    fieldType:
      "Select",

    value:
      "蓝色",

    originalValue:
      "蓝色",

    confidence:
      0.95,

    warnings:
      [],

    source: {
      candidateType:
        "field-value",

      subjectHint:
        "夜岚",
    },
  },

  {
    suggestionId:
      "field-update::character::birthplace::usa",

    kind:
      "field-update",

    status:
      "ready",

    targetEntityId:
      entityId,

    targetEntityName:
      "夜岚",

    fieldKey:
      "field-birthplace",

    fieldLabel:
      "出生地",

    fieldConcept:
      "field.birthplace",

    fieldType:
      "Entity-Reference",

    value:
      countryId,

    originalValue:
      "美利坚合众国",

    confidence:
      0.98,

    warnings:
      [],

    source: {
      candidateType:
        "field-value",

      subjectHint:
        "夜岚",
    },
  },

  {
    suggestionId:
      "create-entity::阿尔卡迪亚帝国::field.birthplace",

    kind:
      "create-entity",

    status:
      "needs-user-confirmation",

    name:
      "阿尔卡迪亚帝国",

    likelyTypeConcept:
      null,

    expectedTypeConcepts: [
      "entityType.country",
      "entityType.city",
      "entityType.location",
    ],

    fieldKey:
      "field-birthplace",

    fieldLabel:
      "出生地",

    fieldConcept:
      "field.birthplace",

    role:
      "field-value",

    confidence:
      0.98,

    source: {
      subject:
        "夜岚",

      sourceEntityId:
        entityId,

      sourceConcept:
        "field.birthplace",
    },
  },
];


// ======================================================
// Mapping
// ======================================================

const mapped =
  mapSuggestionsToStorySyncCandidates({
    suggestions,

    worldId,

    documentId,

    documentVersion:
      15,

    originalText:
      "夜岚主色是蓝色，出生于美利坚合众国。",
  });


console.log(
  "\n======================================"
);

console.log(
  "Mapped records"
);


console.dir(
  mapped,
  {
    depth:
      null,
  }
);


// ======================================================
// Mongoose Validation
// ======================================================

async function main() {
  for (
    const record of
    mapped.records
  ) {
    const candidate =
      new StorySyncCandidate(
        record
      );


    try {
      await candidate
        .validate();


      console.log(
        "\nVALID:"
      );


      console.log({
        kind:
          candidate.kind,

        status:
          candidate.status,

        suggestionId:
          candidate.suggestionId,

        payload:
          candidate.payload,

        documentVersion:
          candidate
            .source
            .documentVersion,
      });
    } catch (
      error
    ) {
      console.error(
        "\nINVALID:"
      );

      console.error(
        error
      );
    }
  }
}


main()
  .catch(
    (error) => {
      console.error(
        error
      );

      process.exitCode =
        1;
    }
  );