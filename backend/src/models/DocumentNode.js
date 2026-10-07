const mongoose = require("mongoose");

const documentNodeSchema = new mongoose.Schema(
  {
    worldId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "World",
      required: true,
      index: true,
    },

    /*
     * A node can either be:
     *
     * folder   -> Explorer folder
     * document -> References a real Document
     */
    kind: {
      type: String,
      enum: ["folder", "document"],
      required: true,
    },

    /*
     * Folder names are stored directly on the node.
     *
     * Document nodes normally mirror the Document title.
     */
    name: {
      type: String,
      trim: true,
      default: "",
    },

    /*
     * Only document nodes use documentId.
     */
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
    },

    /*
     * Parent can be:
     * - null = root
     * - another folder
     *
     * We will initially only allow documents inside folders.
     * The data model remains flexible enough to expand later.
     */
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocumentNode",
      default: null,
      index: true,
    },

    /*
     * Used for drag-and-drop sibling ordering.
     */
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * A Document should appear only once inside the
 * Documents Explorer for the same world.
 */
documentNodeSchema.index(
  {
    worldId: 1,
    documentId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      documentId: {
        $type: "objectId",
      },
    },
  }
);

documentNodeSchema.index({
  worldId: 1,
  parentId: 1,
  order: 1,
});

module.exports = mongoose.model(
  "DocumentNode",
  documentNodeSchema
);