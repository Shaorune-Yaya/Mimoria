const express = require("express");

const Document = require("../models/Document");
const DocumentNode = require(
  "../models/DocumentNode"
);

const {
  getDevUser,
  getOwnedWorld,
} = require("../utils/devUser");

const router = express.Router();


// ======================================================
// Helpers
// ======================================================

function normalizeParentId(parentId) {
  if (!parentId) {
    return null;
  }

  if (
    typeof parentId === "object" &&
    parentId._id
  ) {
    return parentId._id.toString();
  }

  return parentId.toString();
}


async function normalizeSiblingOrders(
  worldId,
  parentId
) {
  const siblings =
    await DocumentNode.find({
      worldId,
      parentId:
        parentId || null,
    }).sort({
      order: 1,
      createdAt: 1,
    });

  if (
    siblings.length === 0
  ) {
    return;
  }

  await DocumentNode.bulkWrite(
    siblings.map(
      (node, index) => ({
        updateOne: {
          filter: {
            _id: node._id,
          },

          update: {
            $set: {
              order: index,
            },
          },
        },
      })
    )
  );
}


// Create DocumentNodes for Documents that existed
// before the document tree system was added.
async function syncMissingDocumentNodes(
  worldId
) {
  const documents =
    await Document.find({
      worldId,
    }).select(
      "_id title"
    );

  if (
    documents.length === 0
  ) {
    return;
  }

  const documentIds =
    documents.map(
      (document) =>
        document._id
    );

  const existingNodes =
    await DocumentNode.find({
      worldId,

      kind: "document",

      documentId: {
        $in:
          documentIds,
      },
    }).select(
      "documentId"
    );

  const existingDocumentIds =
    new Set(
      existingNodes.map(
        (node) =>
          node.documentId.toString()
      )
    );

  const missingDocuments =
    documents.filter(
      (document) =>
        !existingDocumentIds.has(
          document._id.toString()
        )
    );

  if (
    missingDocuments.length ===
    0
  ) {
    return;
  }

  const rootCount =
    await DocumentNode.countDocuments({
      worldId,
      parentId: null,
    });

  const newNodes =
    missingDocuments.map(
      (document, index) => ({
        worldId,

        kind: "document",

        name:
          document.title,

        documentId:
          document._id,

        parentId: null,

        order:
          rootCount +
          index,
      })
    );

  try {
    await DocumentNode.insertMany(
      newNodes,
      {
        ordered: false,
      }
    );
  } catch (error) {
    if (
      error.code !== 11000
    ) {
      throw error;
    }
  }
}


// Check whether possibleDescendantId is
// somewhere inside nodeId.
async function isDescendant(
  nodeId,
  possibleDescendantId
) {
  let currentId =
    possibleDescendantId;

  while (currentId) {
    const current =
      await DocumentNode.findById(
        currentId
      ).select(
        "parentId"
      );

    if (!current) {
      return false;
    }

    if (
      current._id.toString() ===
      nodeId.toString()
    ) {
      return true;
    }

    currentId =
      current.parentId;
  }

  return false;
}


// ======================================================
// Get Document Tree
// GET /api/document-tree/world/:worldId
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
              "World not found",
          });
      }

      await syncMissingDocumentNodes(
        world._id
      );

      const nodes =
        await DocumentNode.find({
          worldId:
            world._id,
        })
          .populate(
            "documentId"
          )
          .sort({
            order: 1,
            createdAt: 1,
          });

      res.json(nodes);
    } catch (error) {
      console.error(
        "Failed to get document tree:",
        error
      );

      res.status(500).json({
        message:
          "Failed to get document tree",

        error:
          error.message,
      });
    }
  }
);


// ======================================================
// Create Folder
// POST /api/document-tree/folders
// ======================================================

router.post(
  "/folders",
  async (req, res) => {
    try {
      const user =
        await getDevUser();

      const {
        worldId,
        name,
        parentId,
      } = req.body;

      if (!worldId) {
        return res
          .status(400)
          .json({
            message:
              "worldId is required",
          });
      }

      if (
        !name ||
        !name.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Folder name is required",
          });
      }

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
              "World not found",
          });
      }

      if (parentId) {
        const parent =
          await DocumentNode.findById(
            parentId
          );

        if (!parent) {
          return res
            .status(404)
            .json({
              message:
                "Parent node not found",
            });
        }

        if (
          parent.worldId.toString() !==
          world._id.toString()
        ) {
          return res
            .status(400)
            .json({
              message:
                "Parent node belongs to another world",
            });
        }

        if (
          parent.kind !==
          "folder"
        ) {
          return res
            .status(400)
            .json({
              message:
                "Documents cannot contain child nodes",
            });
        }
      }

      const siblingCount =
        await DocumentNode.countDocuments({
          worldId:
            world._id,

          parentId:
            parentId ||
            null,
        });

      const folder =
        await DocumentNode.create({
          worldId:
            world._id,

          kind:
            "folder",

          name:
            name.trim(),

          documentId:
            null,

          parentId:
            parentId ||
            null,

          order:
            siblingCount,
        });

      res
        .status(201)
        .json(folder);
    } catch (error) {
      console.error(
        "Failed to create document folder:",
        error
      );

      res.status(500).json({
        message:
          "Failed to create folder",

        error:
          error.message,
      });
    }
  }
);


// ======================================================
// Rename Folder
// PUT /api/document-tree/:nodeId/name
// ======================================================

router.put(
  "/:nodeId/name",
  async (req, res) => {
    try {
      const user =
        await getDevUser();

      const node =
        await DocumentNode.findById(
          req.params.nodeId
        );

      if (!node) {
        return res
          .status(404)
          .json({
            message:
              "Document node not found",
          });
      }

      const world =
        await getOwnedWorld(
          node.worldId,
          user._id
        );

      if (!world) {
        return res
          .status(404)
          .json({
            message:
              "Document node not found",
          });
      }

      if (
        node.kind !==
        "folder"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Only folders can be renamed from the tree",
          });
      }

      const {
        name,
      } = req.body;

      if (
        !name ||
        !name.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Folder name is required",
          });
      }

      node.name =
        name.trim();

      await node.save();

      res.json(node);
    } catch (error) {
      console.error(
        "Failed to rename document folder:",
        error
      );

      res.status(500).json({
        message:
          "Failed to rename folder",

        error:
          error.message,
      });
    }
  }
);


// ======================================================
// Move / Reorder Node
//
// PUT /api/document-tree/:nodeId/move
//
// body:
//
// {
//   parentId: null | "...",
//   index: 0
// }
//
// index is the final position after the dragged node
// has been removed from its previous sibling list.
// ======================================================

router.put(
  "/:nodeId/move",
  async (req, res) => {
    try {
      const user =
        await getDevUser();

      const {
        nodeId,
      } = req.params;

      const {
        parentId,
        index,
      } = req.body;

      const node =
        await DocumentNode.findById(
          nodeId
        );

      if (!node) {
        return res
          .status(404)
          .json({
            message:
              "Document node not found",
          });
      }

      const world =
        await getOwnedWorld(
          node.worldId,
          user._id
        );

      if (!world) {
        return res
          .status(404)
          .json({
            message:
              "Document node not found",
          });
      }

      const destinationParentId =
        parentId ||
        null;

      // --------------------------------------------------
      // Validate destination parent
      // --------------------------------------------------

      if (
        destinationParentId
      ) {
        if (
          nodeId.toString() ===
          destinationParentId.toString()
        ) {
          return res
            .status(400)
            .json({
              message:
                "A node cannot be its own parent",
            });
        }

        const parent =
          await DocumentNode.findById(
            destinationParentId
          );

        if (!parent) {
          return res
            .status(404)
            .json({
              message:
                "Target folder not found",
            });
        }

        if (
          parent.worldId.toString() !==
          world._id.toString()
        ) {
          return res
            .status(400)
            .json({
              message:
                "Cannot move between different worlds",
            });
        }

        if (
          parent.kind !==
          "folder"
        ) {
          return res
            .status(400)
            .json({
              message:
                "Documents cannot contain child nodes",
            });
        }

        const createsCycle =
          await isDescendant(
            nodeId,
            destinationParentId
          );

        if (
          createsCycle
        ) {
          return res
            .status(400)
            .json({
              message:
                "Cannot move a folder inside its own descendant",
            });
        }
      }

      const sourceParentId =
        normalizeParentId(
          node.parentId
        );

      const destinationId =
        normalizeParentId(
          destinationParentId
        );

      // --------------------------------------------------
      // Same Parent Reorder
      // --------------------------------------------------

      if (
        sourceParentId ===
        destinationId
      ) {
        const siblings =
          await DocumentNode.find({
            worldId:
              world._id,

            parentId:
              destinationParentId,

            _id: {
              $ne:
                node._id,
            },
          }).sort({
            order: 1,
            createdAt: 1,
          });

        const requestedIndex =
          Number.isInteger(
            index
          )
            ? index
            : siblings.length;

        const insertIndex =
          Math.max(
            0,
            Math.min(
              requestedIndex,
              siblings.length
            )
          );

        siblings.splice(
          insertIndex,
          0,
          node
        );

        await DocumentNode.bulkWrite(
          siblings.map(
            (
              sibling,
              siblingIndex
            ) => ({
              updateOne: {
                filter: {
                  _id:
                    sibling._id,
                },

                update: {
                  $set: {
                    parentId:
                      destinationParentId,

                    order:
                      siblingIndex,
                  },
                },
              },
            })
          )
        );

        const updatedNode =
          await DocumentNode.findById(
            node._id
          ).populate(
            "documentId"
          );

        return res.json(
          updatedNode
        );
      }

      // --------------------------------------------------
      // Different Parent
      // --------------------------------------------------

      const oldSiblings =
        await DocumentNode.find({
          worldId:
            world._id,

          parentId:
            node.parentId ||
            null,

          _id: {
            $ne:
              node._id,
          },
        }).sort({
          order: 1,
          createdAt: 1,
        });

      if (
        oldSiblings.length >
        0
      ) {
        await DocumentNode.bulkWrite(
          oldSiblings.map(
            (
              sibling,
              siblingIndex
            ) => ({
              updateOne: {
                filter: {
                  _id:
                    sibling._id,
                },

                update: {
                  $set: {
                    order:
                      siblingIndex,
                  },
                },
              },
            })
          )
        );
      }

      const destinationSiblings =
        await DocumentNode.find({
          worldId:
            world._id,

          parentId:
            destinationParentId,

          _id: {
            $ne:
              node._id,
          },
        }).sort({
          order: 1,
          createdAt: 1,
        });

      const requestedIndex =
        Number.isInteger(
          index
        )
          ? index
          : destinationSiblings.length;

      const insertIndex =
        Math.max(
          0,
          Math.min(
            requestedIndex,
            destinationSiblings.length
          )
        );

      destinationSiblings.splice(
        insertIndex,
        0,
        node
      );

      await DocumentNode.bulkWrite(
        destinationSiblings.map(
          (
            sibling,
            siblingIndex
          ) => ({
            updateOne: {
              filter: {
                _id:
                  sibling._id,
              },

              update: {
                $set: {
                  parentId:
                    destinationParentId,

                  order:
                    siblingIndex,
                },
              },
            },
          })
        )
      );

      const updatedNode =
        await DocumentNode.findById(
          node._id
        ).populate(
          "documentId"
        );

      res.json(
        updatedNode
      );
    } catch (error) {
      console.error(
        "Failed to move document node:",
        error
      );

      res.status(500).json({
        message:
          "Failed to move document node",

        error:
          error.message,
      });
    }
  }
);


// ======================================================
// Delete Folder
//
// Children are promoted to the deleted folder's parent.
// Their relative order is preserved.
// ======================================================

router.delete(
  "/:nodeId",
  async (req, res) => {
    try {
      const user =
        await getDevUser();

      const node =
        await DocumentNode.findById(
          req.params.nodeId
        );

      if (!node) {
        return res
          .status(404)
          .json({
            message:
              "Document node not found",
          });
      }

      const world =
        await getOwnedWorld(
          node.worldId,
          user._id
        );

      if (!world) {
        return res
          .status(404)
          .json({
            message:
              "Document node not found",
          });
      }

      if (
        node.kind !==
        "folder"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Document nodes cannot be deleted from this endpoint",
          });
      }

      const parentId =
        node.parentId ||
        null;

      const siblings =
        await DocumentNode.find({
          worldId:
            world._id,

          parentId,

          _id: {
            $ne:
              node._id,
          },
        }).sort({
          order: 1,
          createdAt: 1,
        });

      const children =
        await DocumentNode.find({
          worldId:
            world._id,

          parentId:
            node._id,
        }).sort({
          order: 1,
          createdAt: 1,
        });

      const insertionIndex =
        Math.max(
          0,
          Math.min(
            node.order ||
              0,

            siblings.length
          )
        );

      const finalNodes = [
        ...siblings.slice(
          0,
          insertionIndex
        ),

        ...children,

        ...siblings.slice(
          insertionIndex
        ),
      ];

      if (
        finalNodes.length >
        0
      ) {
        await DocumentNode.bulkWrite(
          finalNodes.map(
            (
              childNode,
              childIndex
            ) => ({
              updateOne: {
                filter: {
                  _id:
                    childNode._id,
                },

                update: {
                  $set: {
                    parentId,

                    order:
                      childIndex,
                  },
                },
              },
            })
          )
        );
      }

      await node.deleteOne();

      await normalizeSiblingOrders(
        world._id,
        parentId
      );

      res.json({
        message:
          "Folder deleted",
      });
    } catch (error) {
      console.error(
        "Failed to delete document folder:",
        error
      );

      res.status(500).json({
        message:
          "Failed to delete folder",

        error:
          error.message,
      });
    }
  }
);


module.exports = router;