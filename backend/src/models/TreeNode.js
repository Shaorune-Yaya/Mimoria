const mongoose = require("mongoose");

const treeNodeSchema = new mongoose.Schema(
  {
    worldId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "World",
      required: true,
      index: true,
    },

    // folder = 用户创建的纯文件夹
    // entity = 对应一个真实 Entity
    kind: {
      type: String,
      enum: ["folder", "entity"],
      required: true,
    },

    // Folder 使用
    name: {
      type: String,
      default: "",
      trim: true,
    },

    // Entity Node 使用
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entity",
      default: null,
    },

    // null = 根目录
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TreeNode",
      default: null,
    },

    // 同一级里的顺序
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);


// 一个 Entity 在一个 World 的 Tree 中只能出现一次
treeNodeSchema.index(
  {
    worldId: 1,
    entityId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      entityId: {
        $type: "objectId",
      },
    },
  }
);


const TreeNode = mongoose.model(
  "TreeNode",
  treeNodeSchema
);

module.exports = TreeNode;