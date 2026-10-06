const mongoose = require("mongoose");

const fieldSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "text",
        "long-text",
        "number",
        "boolean",
        "date",
        "entity-reference",
        "select",
      ],
    },

    required: {
      type: Boolean,
      default: false,
    },

    // Used by Entity Reference fields.
    referenceEntityTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EntityType",
      default: null,
    },

    // Used by Dropdown / Select fields.
    options: {
      type: [String],
      default: [],
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: true,
  }
);

const entityTypeSchema = new mongoose.Schema(
  {
    worldId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "World",
      required: true,
      index: true,
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
      type: [fieldSchema],
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