const express = require("express");

const Document = require("../models/Document");
const DocumentNode = require("../models/DocumentNode");

const {
  getDevUser,
  getOwnedWorld,
} = require("../utils/devUser");

const router = express.Router();


// ======================================================
// Helpers
// ======================================================

function isValidTipTapDocument(content) {
  return Boolean(
    content &&
      typeof content === "object" &&
      content.type === "doc" &&
      Array.isArray(content.content)
  );
}


function contentIsEqual(
  currentContent,
  nextContent
) {
  try {
    return (
      JSON.stringify(currentContent) ===
      JSON.stringify(nextContent)
    );
  } catch {
    return false;
  }
}


// ======================================================
// Get All Documents in a World
//
// GET /api/documents/world/:worldId
// ======================================================

router.get(
  "/world/:worldId",
  async (req, res) => {
    try {
      const user =
        await getDevUser();

      const world =
        await getOwnedWorld(
          req.params.worldId,
          user._id
        );

      if (!world) {
        return res
          .status(404)
          .json({
            message:
              "World not found.",
          });
      }

      const documents =
        await Document.find({
          worldId:
            world._id,
        }).sort({
          updatedAt: -1,
        });

      res.json(
        documents
      );
    } catch (error) {
      console.error(
        "Failed to load documents:",
        error
      );

      res
        .status(500)
        .json({
          message:
            "Failed to load documents.",
        });
    }
  }
);


// ======================================================
// Get One Document
//
// GET /api/documents/:documentId
// ======================================================

router.get(
  "/:documentId",
  async (req, res) => {
    try {
      const user =
        await getDevUser();

      const document =
        await Document.findById(
          req.params.documentId
        );

      if (!document) {
        return res
          .status(404)
          .json({
            message:
              "Document not found.",
          });
      }

      const world =
        await getOwnedWorld(
          document.worldId,
          user._id
        );

      if (!world) {
        return res
          .status(403)
          .json({
            message:
              "You do not have access to this document.",
          });
      }

      res.json(
        document
      );
    } catch (error) {
      console.error(
        "Failed to load document:",
        error
      );

      res
        .status(500)
        .json({
          message:
            "Failed to load document.",
        });
    }
  }
);


// ======================================================
// Create Document
//
// POST /api/documents
//
// A matching DocumentNode is created automatically.
// ======================================================

router.post(
  "/",
  async (req, res) => {
    try {
      const user =
        await getDevUser();

      const {
        worldId,
        title,
        parentId = null,
      } = req.body;

      const world =
        await getOwnedWorld(
          worldId,
          user._id
        );

      if (!world) {
        return res
          .status(404)
          .json({
            message:
              "World not found.",
          });
      }

      let parentNode =
        null;

      if (parentId) {
        parentNode =
          await DocumentNode.findOne({
            _id:
              parentId,

            worldId:
              world._id,

            kind:
              "folder",
          });

        if (!parentNode) {
          return res
            .status(400)
            .json({
              message:
                "Invalid parent folder.",
            });
        }
      }

      const siblingCount =
        await DocumentNode.countDocuments(
          {
            worldId:
              world._id,

            parentId:
              parentNode
                ? parentNode._id
                : null,
          }
        );

      const document =
        await Document.create({
          worldId:
            world._id,

          title:
            typeof title ===
              "string" &&
            title.trim()
              ? title.trim()
              : "Untitled Document",

          content: {
            type: "doc",

            content: [
              {
                type:
                  "paragraph",

                content:
                  [],
              },
            ],
          },

          plainText:
            "",

          contentVersion:
            0,

          syncedVersion:
            0,

          lastSavedAt:
            new Date(),
        });

      try {
        await DocumentNode.create(
          {
            worldId:
              world._id,

            kind:
              "document",

            name:
              document.title,

            documentId:
              document._id,

            parentId:
              parentNode
                ? parentNode._id
                : null,

            order:
              siblingCount,
          }
        );
      } catch (nodeError) {
        await Document.findByIdAndDelete(
          document._id
        );

        throw nodeError;
      }

      res
        .status(201)
        .json(
          document
        );
    } catch (error) {
      console.error(
        "Failed to create document:",
        error
      );

      res
        .status(500)
        .json({
          message:
            "Failed to create document.",
        });
    }
  }
);


// ======================================================
// Rename Document
//
// PUT /api/documents/:documentId/title
//
// The matching Explorer node name is updated too.
// ======================================================

router.put(
  "/:documentId/title",
  async (req, res) => {
    try {
      const user =
        await getDevUser();

      const document =
        await Document.findById(
          req.params.documentId
        );

      if (!document) {
        return res
          .status(404)
          .json({
            message:
              "Document not found.",
          });
      }

      const world =
        await getOwnedWorld(
          document.worldId,
          user._id
        );

      if (!world) {
        return res
          .status(403)
          .json({
            message:
              "You do not have access to this document.",
          });
      }

      const title =
        typeof req.body.title ===
          "string"
          ? req.body.title.trim()
          : "";

      if (!title) {
        return res
          .status(400)
          .json({
            message:
              "Document title is required.",
          });
      }

      document.title =
        title;

      await document.save();

      await DocumentNode.updateOne(
        {
          worldId:
            world._id,

          documentId:
            document._id,
        },
        {
          $set: {
            name:
              title,
          },
        }
      );

      res.json(
        document
      );
    } catch (error) {
      console.error(
        "Failed to rename document:",
        error
      );

      res
        .status(500)
        .json({
          message:
            "Failed to rename document.",
        });
    }
  }
);


// ======================================================
// Save Document Content
//
// PUT /api/documents/:documentId/content
//
// This endpoint is intentionally independent from
// Story Sync.
//
// Auto-save may call this endpoint frequently.
// Story analysis will later use a separate endpoint.
// ======================================================

router.put(
  "/:documentId/content",
  async (req, res) => {
    try {
      const user =
        await getDevUser();

      const document =
        await Document.findById(
          req.params.documentId
        );

      if (!document) {
        return res
          .status(404)
          .json({
            message:
              "Document not found.",
          });
      }

      const world =
        await getOwnedWorld(
          document.worldId,
          user._id
        );

      if (!world) {
        return res
          .status(403)
          .json({
            message:
              "You do not have access to this document.",
          });
      }

      const {
        content,
        plainText = "",
      } = req.body;

      if (
        !isValidTipTapDocument(
          content
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid document content.",
          });
      }

      const nextPlainText =
        typeof plainText ===
          "string"
          ? plainText
          : "";

      const contentChanged =
        !contentIsEqual(
          document.content,
          content
        );

      const plainTextChanged =
        document.plainText !==
        nextPlainText;

      /*
       * Auto-save can occasionally send the same snapshot twice,
       * for example after a blur event immediately following a
       * debounce save.
       *
       * Do not create a new content version when nothing changed.
       */
      if (
        !contentChanged &&
        !plainTextChanged
      ) {
        return res.json({
          document,

          changed:
            false,

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
      }

      document.content =
        content;

      document.plainText =
        nextPlainText;

      document.contentVersion +=
        1;

      document.lastSavedAt =
        new Date();

      /*
       * content uses mongoose.Schema.Types.Mixed,
       * so Mongoose must be explicitly informed
       * whenever its nested structure changes.
       */
      document.markModified(
        "content"
      );

      await document.save();

      res.json({
        document,

        changed:
          true,

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

      res
        .status(500)
        .json({
          message:
            "Failed to save document.",
        });
    }
  }
);


// ======================================================
// Delete Document
//
// DELETE /api/documents/:documentId
// ======================================================

router.delete(
  "/:documentId",
  async (req, res) => {
    try {
      const user =
        await getDevUser();

      const document =
        await Document.findById(
          req.params.documentId
        );

      if (!document) {
        return res
          .status(404)
          .json({
            message:
              "Document not found.",
          });
      }

      const world =
        await getOwnedWorld(
          document.worldId,
          user._id
        );

      if (!world) {
        return res
          .status(403)
          .json({
            message:
              "You do not have access to this document.",
          });
      }

      const node =
        await DocumentNode.findOne({
          worldId:
            world._id,

          documentId:
            document._id,
        });

      if (node) {
        await DocumentNode.deleteOne(
          {
            _id:
              node._id,
          }
        );
      }

      await Document.deleteOne(
        {
          _id:
            document._id,
        }
      );

      res.json({
        message:
          "Document deleted.",
      });
    } catch (error) {
      console.error(
        "Failed to delete document:",
        error
      );

      res
        .status(500)
        .json({
          message:
            "Failed to delete document.",
        });
    }
  }
);


module.exports =
  router;