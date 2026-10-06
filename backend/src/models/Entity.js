const mongoose = require("mongoose");

const entitySchema = new mongoose.Schema(
  {
    worldId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "World",
      required: true,
      index: true,
    },

    entityTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EntityType",
      required: true,
      index: true,
    },

    // Every entity must have a name.
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Stores values for user-defined schema fields.
    values: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const Entity = mongoose.model(
  "Entity",
  entitySchema
);

module.exports = Entity;