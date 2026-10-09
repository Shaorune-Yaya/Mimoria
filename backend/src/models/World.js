const mongoose = require(
  "mongoose"
);


const worldSchema =
  new mongoose.Schema(
    {
      ownerId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,

        index:
          true,
      },

      name: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      description: {
        type:
          String,

        default:
          "",
      },

      icon: {
        type:
          String,

        default:
          "🌍",
      },
      
      // ==================================================
      // World Settings
      // ==================================================

      settings: {
        isOnboardingWorld: {
          type:
            Boolean,

          default:
            false,

          index:
            true,
        },
      },

      // ==================================================
      // Canon Version
      //
      // Incremented whenever canonical world data changes.
      //
      // Examples:
      //
      // - Entity create / update / delete
      // - EntityType or schema field changes
      // - Relation create / delete
      // - Story Suggestion Apply that changes Canon
      //
      // Documents compare this value against
      // lastAnalyzedCanonVersion.
      // ==================================================

      canonVersion: {
        type:
          Number,

        default:
          0,

        min:
          0,

        index:
          true,
      },
    },
    {
      timestamps:
        true,
    }
  );


const World =
  mongoose.models.World ||
  mongoose.model(
    "World",
    worldSchema
  );


module.exports =
  World;