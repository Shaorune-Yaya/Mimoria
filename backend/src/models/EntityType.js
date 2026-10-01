const mongoose = require("mongoose");

const entityTypeSchema = new mongoose.Schema(
  {
    worldId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "World",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    icon: {
      type: String,
      default: "📄",
    },

    fields: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const EntityType = mongoose.model(
  "EntityType",
  entityTypeSchema
);

module.exports = EntityType;