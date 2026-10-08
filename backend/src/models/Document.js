const mongoose = require(
  "mongoose"
);


const documentSchema =
  new mongoose.Schema(
    {
      worldId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "World",

        required:
          true,

        index:
          true,
      },

      title: {
        type:
          String,

        trim:
          true,

        default:
          "Untitled Document",
      },


      // ==================================================
      // TipTap JSON
      // ==================================================

      content: {
        type:
          mongoose.Schema.Types.Mixed,

        default:
          () => ({
            type:
              "doc",

            content: [
              {
                type:
                  "paragraph",

                content:
                  [],
              },
            ],
          }),
      },


      // ==================================================
      // Plain Text
      // ==================================================

      plainText: {
        type:
          String,

        default:
          "",
      },


      // ==================================================
      // Document Content Version
      //
      // Incremented whenever document content changes.
      // ==================================================

      contentVersion: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },


      // ==================================================
      // Latest analyzed Document version
      // ==================================================

      syncedVersion: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },


      // ==================================================
      // Canon version used by the latest successful
      // Story Suggestions analysis.
      //
      // A document needs re-analysis when:
      //
      // contentVersion !== syncedVersion
      //
      // OR
      //
      // world.canonVersion !== lastAnalyzedCanonVersion
      // ==================================================

      lastAnalyzedCanonVersion: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },


      lastSavedAt: {
        type:
          Date,

        default:
          Date.now,
      },


      lastSyncedAt: {
        type:
          Date,

        default:
          null,
      },


      // ==================================================
      // Future Document Settings
      //
      // Later this can contain an explicit document
      // language override:
      //
      // {
      //   analysisLocale: "auto" | "zh-CN" | "en"
      // }
      // ==================================================

      settings: {
        type:
          mongoose.Schema.Types.Mixed,

        default:
          () => ({}),
      },
    },
    {
      timestamps:
        true,
    }
  );


documentSchema.index({
  worldId:
    1,

  updatedAt:
    -1,
});


const Document =
  mongoose.models.Document ||
  mongoose.model(
    "Document",
    documentSchema
  );


module.exports =
  Document;