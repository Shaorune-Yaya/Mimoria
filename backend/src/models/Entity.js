const mongoose = require("mongoose");

const entitySchema = new mongoose.Schema(
  {
    worldId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "World",
      required: true,
    },

    entityTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EntityType",
      required: true,
    },

    // 每一个实体都必定有名称
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // 自定义 Schema 字段的数据
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