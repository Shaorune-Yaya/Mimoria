const mongoose = require(
  "mongoose"
);


const relationSchema =
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


      subjectEntityId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref:
          "Entity",

        required:
          true,

        index:
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

        index:
          true,
      },


      /*
       * Stable machine-readable relationship key.
       *
       * Examples:
       * member_of
       * located_in
       * allied_with
       * enemy_of
       * controls
       * founded
       */
      relationType: {
        type:
          String,

        required:
          true,

        trim:
          true,

        index:
          true,
      },


      /*
       * Human-readable relationship phrase detected
       * from the source text.
       *
       * Examples:
       * 加入
       * 位于
       * joined
       * located in
       */
      relationLabel: {
        type:
          String,

        default:
          "",
      },


      /*
       * Optional source Document.
       */
      sourceDocumentId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref:
          "Document",

        default:
          null,

        index:
          true,
      },


      /*
       * Content version that produced this relation.
       */
      sourceContentVersion: {
        type:
          Number,

        default:
          null,
      },


      /*
       * Exact sentence used as evidence.
       */
      sourceText: {
        type:
          String,

        default:
          "",
      },


      /*
       * Candidate that created this relation.
       */
      sourceCandidateId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref:
          "StorySyncCandidate",

        default:
          null,
      },


      confidence: {
        type:
          Number,

        default:
          1,

        min:
          0,

        max:
          1,
      },
    },

    {
      timestamps:
        true,
    }
  );


relationSchema.index(
  {
    worldId:
      1,

    subjectEntityId:
      1,

    relationType:
      1,

    objectEntityId:
      1,
  }
);


const Relation =
  mongoose.model(
    "Relation",
    relationSchema
  );


module.exports =
  Relation;