const mongoose = require(
  "mongoose"
);


const storySyncCandidateSchema =
  new mongoose.Schema(
    {
      worldId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref:
          "World",

        required:
          true,

        index:
          true,
      },


      documentId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref:
          "Document",

        required:
          true,

        index:
          true,
      },


      contentVersion: {
        type:
          Number,

        required:
          true,

        min:
          0,

        index:
          true,
      },


      candidateType: {
        type:
          String,

        enum: [
          "relation",
        ],

        default:
          "relation",

        required:
          true,
      },


      subjectEntityId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref:
          "Entity",

        required:
          true,
      },


      objectEntityId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref:
          "Entity",

        required:
          true,
      },


      relationType: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },


      relationLabel: {
        type:
          String,

        default:
          "",
      },


      /*
       * Sentence that caused the candidate.
       */
      sourceText: {
        type:
          String,

        default:
          "",
      },


      confidence: {
        type:
          Number,

        default:
          0.8,

        min:
          0,

        max:
          1,
      },


      status: {
        type:
          String,

        enum: [
          "pending",
          "accepted",
          "ignored",
        ],

        default:
          "pending",

        index:
          true,
      },


      appliedRelationId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref:
          "Relation",

        default:
          null,
      },


      resolvedAt: {
        type:
          Date,

        default:
          null,
      },
    },

    {
      timestamps:
        true,
    }
  );


storySyncCandidateSchema.index(
  {
    documentId:
      1,

    contentVersion:
      1,

    status:
      1,
  }
);


const StorySyncCandidate =
  mongoose.model(
    "StorySyncCandidate",
    storySyncCandidateSchema
  );


module.exports =
  StorySyncCandidate;