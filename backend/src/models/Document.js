const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    worldId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "World",
      required: true,
      index: true,
    },

    title: {
      type: String,
      trim: true,
      default: "Untitled Document",
    },

    /*
     * TipTap content will be stored as JSON.
     *
     * We intentionally use Mixed here because TipTap documents
     * contain many different node structures.
     *
     * Later every important text block will receive a stable blockId.
     */
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [],
          },
        ],
      }),
    },

    /*
     * Plain text representation of the document.
     *
     * This will later be useful for:
     * - Entity detection
     * - Story relationship analysis
     * - Search
     * - RAG / AI roleplay context
     */
    plainText: {
      type: String,
      default: "",
    },

    /*
     * Incremented whenever document content changes.
     *
     * Example:
     * contentVersion = 15
     * syncedVersion = 12
     *
     * This means Story Data is three versions behind
     * and the document needs synchronization.
     */
    contentVersion: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
     * The latest content version that has been analyzed
     * by the Story Sync system.
     *
     * Story Sync will be implemented later.
     */
    syncedVersion: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastSavedAt: {
      type: Date,
      default: Date.now,
    },

    /*
     * Reserved for the future Story Sync system.
     */
    lastSyncedAt: {
      type: Date,
      default: null,
    },

    /*
     * Reserved for future document settings.
     *
     * Examples:
     * - editor preferences
     * - document language
     * - analysis configuration
     */
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

documentSchema.index({
  worldId: 1,
  updatedAt: -1,
});

module.exports = mongoose.model("Document", documentSchema);