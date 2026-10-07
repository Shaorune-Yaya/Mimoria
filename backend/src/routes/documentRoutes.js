const express = require("express");

const Document = require("../models/Document");
const DocumentNode = require("../models/DocumentNode");

const {
  getDevUser,
  getOwnedWorld,
} = require("../utils/devUser");

const router = express.Router();

/*
 * Get every document in a world.
 */
router.get("/world/:worldId", async (req, res) => {
  try {
    const user = await getDevUser();

    const world = await getOwnedWorld(
      req.params.worldId,
      user._id
    );

    if (!world) {
      return res.status(404).json({
        message: "World not found.",
      });
    }

    const documents = await Document.find({
      worldId: world._id,
    }).sort({
      updatedAt: -1,
    });

    res.json(documents);
  } catch (error) {
    console.error(
      "Failed to load documents:",
      error
    );

    res.status(500).json({
      message: "Failed to load documents.",
    });
  }
});

/*
 * Get one document.
 */
router.get("/:documentId", async (req, res) => {
  try {
    const user = await getDevUser();

    const document = await Document.findById(
      req.params.documentId
    );

    if (!document) {
      return res.status(404).json({
        message: "Document not found.",
      });
    }

    const world = await getOwnedWorld(
      document.worldId,
      user._id
    );

    if (!world) {
      return res.status(403).json({
        message: "You do not have access to this document.",
      });
    }

    res.json(document);
  } catch (error) {
    console.error(
      "Failed to load document:",
      error
    );

    res.status(500).json({
      message: "Failed to load document.",
    });
  }
});

/*
 * Create a document.
 *
 * A matching DocumentNode is automatically created
 * so the document immediately appears in Explorer.
 */
router.post("/", async (req, res) => {
  try {
    const user = await getDevUser();

    const {
      worldId,
      title,
      parentId = null,
    } = req.body;

    const world = await getOwnedWorld(
      worldId,
      user._id
    );

    if (!world) {
      return res.status(404).json({
        message: "World not found.",
      });
    }

    let parentNode = null;

    if (parentId) {
      parentNode = await DocumentNode.findOne({
        _id: parentId,
        worldId: world._id,
        kind: "folder",
      });

      if (!parentNode) {
        return res.status(400).json({
          message: "Invalid parent folder.",
        });
      }
    }

    const siblingCount =
      await DocumentNode.countDocuments({
        worldId: world._id,
        parentId: parentId || null,
      });

    const document = await Document.create({
      worldId: world._id,

      title:
        typeof title === "string" &&
        title.trim()
          ? title.trim()
          : "Untitled Document",

      contentVersion: 0,
      syncedVersion: 0,
      lastSavedAt: new Date(),
    });

    try {
      await DocumentNode.create({
        worldId: world._id,
        kind: "document",
        name: document.title,
        documentId: document._id,
        parentId: parentNode
          ? parentNode._id
          : null,
        order: siblingCount,
      });
    } catch (nodeError) {
      await Document.findByIdAndDelete(
        document._id
      );

      throw nodeError;
    }

    res.status(201).json(document);
  } catch (error) {
    console.error(
      "Failed to create document:",
      error
    );

    res.status(500).json({
      message: "Failed to create document.",
    });
  }
});

/*
 * Rename a document.
 *
 * The Explorer node name is updated at the same time.
 */
router.put("/:documentId/title", async (req, res) => {
  try {
    const user = await getDevUser();

    const document = await Document.findById(
      req.params.documentId
    );

    if (!document) {
      return res.status(404).json({
        message: "Document not found.",
      });
    }

    const world = await getOwnedWorld(
      document.worldId,
      user._id
    );

    if (!world) {
      return res.status(403).json({
        message: "You do not have access to this document.",
      });
    }

    const title =
      typeof req.body.title === "string"
        ? req.body.title.trim()
        : "";

    if (!title) {
      return res.status(400).json({
        message: "Document title is required.",
      });
    }

    document.title = title;

    await document.save();

    await DocumentNode.updateOne(
      {
        worldId: world._id,
        documentId: document._id,
      },
      {
        $set: {
          name: title,
        },
      }
    );

    res.json(document);
  } catch (error) {
    console.error(
      "Failed to rename document:",
      error
    );

    res.status(500).json({
      message: "Failed to rename document.",
    });
  }
});

/*
 * Save document content.
 *
 * This endpoint is intentionally separate from Story Sync.
 *
 * Auto-save will call this endpoint frequently.
 * Story analysis will happen later through another endpoint.
 */
router.put("/:documentId/content", async (req, res) => {
  try {
    const user = await getDevUser();

    const document = await Document.findById(
      req.params.documentId
    );

    if (!document) {
      return res.status(404).json({
        message: "Document not found.",
      });
    }

    const world = await getOwnedWorld(
      document.worldId,
      user._id
    );

    if (!world) {
      return res.status(403).json({
        message: "You do not have access to this document.",
      });
    }

    const {
      content,
      plainText = "",
    } = req.body;

    if (!content) {
      return res.status(400).json({
        message: "Document content is required.",
      });
    }

    document.content = content;

    document.plainText =
      typeof plainText === "string"
        ? plainText
        : "";

    document.contentVersion += 1;

    document.lastSavedAt = new Date();

    /*
     * Required because content uses Mixed.
     */
    document.markModified("content");

    await document.save();

    res.json({
      document,
      sync: {
        contentVersion:
          document.contentVersion,

        syncedVersion:
          document.syncedVersion,

        needsSync:
          document.contentVersion >
          document.syncedVersion,
      },
    });
  } catch (error) {
    console.error(
      "Failed to save document:",
      error
    );

    res.status(500).json({
      message: "Failed to save document.",
    });
  }
});

/*
 * Delete a document.
 *
 * Only the document and its own Explorer node are removed.
 */
router.delete("/:documentId", async (req, res) => {
  try {
    const user = await getDevUser();

    const document = await Document.findById(
      req.params.documentId
    );

    if (!document) {
      return res.status(404).json({
        message: "Document not found.",
      });
    }

    const world = await getOwnedWorld(
      document.worldId,
      user._id
    );

    if (!world) {
      return res.status(403).json({
        message: "You do not have access to this document.",
      });
    }

    const node = await DocumentNode.findOne({
      worldId: world._id,
      documentId: document._id,
    });

    if (node) {
      await DocumentNode.deleteOne({
        _id: node._id,
      });
    }

    await Document.deleteOne({
      _id: document._id,
    });

    res.json({
      message: "Document deleted.",
    });
  } catch (error) {
    console.error(
      "Failed to delete document:",
      error
    );

    res.status(500).json({
      message: "Failed to delete document.",
    });
  }
});

module.exports = router;