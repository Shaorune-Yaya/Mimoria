const mongoose = require(
  "mongoose"
);

const StorySyncCandidate =
  require(
    "../src/models/StorySyncCandidate"
  );


// ======================================================
// Fake ObjectIds
// ======================================================

const worldId =
  new mongoose.Types.ObjectId();


const documentId =
  new mongoose.Types.ObjectId();


const entityId =
  new mongoose.Types.ObjectId();


// ======================================================
// Field Update
// ======================================================

const fieldUpdate =
  new StorySyncCandidate({
    worldId,

    documentId,

    suggestionId:
      "field-update::entity-yelan::field-primary-color::blue",

    kind:
      "field-update",

    status:
      "pending",

    confidence:
      0.95,

    payload: {
      targetEntityId:
        entityId,

      fieldKey:
        "field-primary-color",

      fieldLabel:
        "主色",

      fieldConcept:
        "field.primaryColor",

      value:
        "蓝色",
    },

    source: {
      documentVersion:
        12,

      originalText:
        "夜岚主色是蓝色。",

      subjectHint:
        "夜岚",

      fieldConcept:
        "field.primaryColor",

      candidateType:
        "field-value",
    },
  });


// ======================================================
// Create Entity
// ======================================================

const createEntity =
  new StorySyncCandidate({
    worldId,

    documentId,

    suggestionId:
      "create-entity::阿尔卡迪亚帝国::field.birthplace",

    kind:
      "create-entity",

    confidence:
      0.98,

    payload: {
      name:
        "阿尔卡迪亚帝国",

      expectedTypeConcepts: [
        "entityType.country",
        "entityType.city",
        "entityType.location",
      ],

      fieldConcept:
        "field.birthplace",
    },

    source: {
      documentVersion:
        12,

      originalText:
        "夜岚出生于阿尔卡迪亚帝国。",

      subjectHint:
        "夜岚",

      fieldConcept:
        "field.birthplace",
    },
  });


// ======================================================
// Legacy Relation
// ======================================================

const legacyRelation =
  new StorySyncCandidate({
    worldId,

    documentId,

    relationType:
      "member_of",

    subjectEntityId:
      entityId,

    subjectHint:
      "夜岚",

    objectHint:
      "银月公会",
  });


// ======================================================
// Validate
// ======================================================

function validateCandidate(
  title,
  candidate
) {
  console.log(
    "\n======================================"
  );

  console.log(
    title
  );


  const error =
    candidate
      .validateSync();


  if (
    error
  ) {
    console.error(
      error
    );

    return;
  }


  console.log({
    kind:
      candidate.kind,

    status:
      candidate.status,

    suggestionId:
      candidate.suggestionId,

    confidence:
      candidate.confidence,

    payload:
      candidate.payload,

    source:
      candidate.source,

    relationType:
      candidate.relationType,
  });
}


validateCandidate(
  "Field update",
  fieldUpdate
);


validateCandidate(
  "Create entity",
  createEntity
);


validateCandidate(
  "Legacy relation",
  legacyRelation
);


// ======================================================
// Instance Helper Test
// ======================================================

fieldUpdate.markAccepted({
  updated:
    true,

  fieldKey:
    "field-primary-color",
});


console.log(
  "\n======================================"
);

console.log(
  "Accepted helper"
);


console.log({
  status:
    fieldUpdate.status,

  acceptedAt:
    Boolean(
      fieldUpdate.acceptedAt
    ),

  appliedResult:
    fieldUpdate.appliedResult,
});


createEntity.markIgnored();


console.log(
  "\n======================================"
);

console.log(
  "Ignored helper"
);


console.log({
  status:
    createEntity.status,

  ignoredAt:
    Boolean(
      createEntity.ignoredAt
    ),
});