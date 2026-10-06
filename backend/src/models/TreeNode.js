const mongoose = require("mongoose");

const treeNodeSchema = new mongoose.Schema(
  {
    worldId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "World",
      required: true,
      index: true,
    },

    // folder = user-created folder
    // entity = node connected to a real Entity
    kind: {
      type: String,
      enum: ["folder", "entity"],
      required: true,
    },

    // Used by folder nodes.
    name: {
      type: String,
      default: "",
      trim: true,
    },

    // Used by entity nodes.
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entity",
      default: null,
    },

    // null means the node is located at the tree root.
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TreeNode",
      default: null,
    },

    // Position among sibling nodes.
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// An Entity can only appear once in a World's tree.
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