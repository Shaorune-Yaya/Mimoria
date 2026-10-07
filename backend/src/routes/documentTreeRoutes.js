const express = require("express");

const DocumentNode = require("../models/DocumentNode");

const {
  getDevUser,
  getOwnedWorld,
} = require("../utils/devUser");

const router = express.Router();

/*
 * Normalize sibling order.
 */
async function normalizeOrder(
  worldId,
  parentId
) {
  const nodes = await DocumentNode.find({
    worldId,
    parentId: parentId || null,
  }).sort({
    order: 1,
    createdAt: 1,
  });

  const operations = nodes.map(
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
  );

  if (operations.length > 0) {
    await DocumentNode.bulkWrite(
      operations
    );
  }
}

/*
 * Check whether moving a folder would create a cycle.
 */
async function wouldCreateCycle(
  nodeId,
  parentId
) {
  if (!parentId) {
    return false;
  }

  if (
    String(nodeId) ===
    String(parentId)
  ) {
    return true;
  }

  let currentId = parentId;

  while (currentId) {
    const current =
      await DocumentNode.findById(
        currentId
      );

    if (!current) {
      break;
    }

    if (
      String(current._id) ===
      String(nodeId)
    ) {
      return true;
    }

    currentId = current.parentId;
  }

  return false;
}

/*
 * Get the complete Documents Explorer tree.
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

    const nodes = await DocumentNode.find({
      worldId: world._id,
    })
      .populate("documentId")
      .sort({
        parentId: 1,
        order: 1,
        createdAt: 1,
      });

    res.json(nodes);
  } catch (error) {
    console.error(
      "Failed to load document tree:",
      error
    );

    res.status(500).json({
      message:
        "Failed to load document tree.",
    });
  }
});

/*
 * Create a folder.
 */
router.post("/folders", async (req, res) => {
  try {
    const user = await getDevUser();

    const {
      worldId,
      name,
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

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        message: "Folder name is required.",
      });
    }

    let parentNode = null;

    if (parentId) {
      parentNode =
        await DocumentNode.findOne({
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

    const folder =
      await DocumentNode.create({
        worldId: world._id,
        kind: "folder",
        name: name.trim(),
        parentId: parentNode
          ? parentNode._id
          : null,
        order: siblingCount,
      });

    res.status(201).json(folder);
  } catch (error) {
    console.error(
      "Failed to create document folder:",
      error
    );

    res.status(500).json({
      message:
        "Failed to create document folder.",
    });
  }
});

/*
 * Rename a folder.
 */
router.put("/:nodeId/name", async (req, res) => {
  try {
    const user = await getDevUser();

    const node =
      await DocumentNode.findById(
        req.params.nodeId
      );

    if (!node) {
      return res.status(404).json({
        message: "Document node not found.",
      });
    }

    const world = await getOwnedWorld(
      node.worldId,
      user._id
    );

    if (!world) {
      return res.status(403).json({
        message:
          "You do not have access to this node.",
      });
    }

    if (node.kind !== "folder") {
      return res.status(400).json({
        message:
          "Only folders can be renamed through this endpoint.",
      });
    }

    const name =
      typeof req.body.name === "string"
        ? req.body.name.trim()
        : "";

    if (!name) {
      return res.status(400).json({
        message: "Folder name is required.",
      });
    }

    node.name = name;

    await node.save();

    res.json(node);
  } catch (error) {
    console.error(
      "Failed to rename document folder:",
      error
    );

    res.status(500).json({
      message:
        "Failed to rename document folder.",
    });
  }
});

/*
 * Move/reorder a node.
 *
 * parentId:
 *   null -> root
 *   folder id -> inside that folder
 *
 * index:
 *   desired sibling position
 */
router.put("/:nodeId/move", async (req, res) => {
  try {
    const user = await getDevUser();

    const node =
      await DocumentNode.findById(
        req.params.nodeId
      );

    if (!node) {
      return res.status(404).json({
        message: "Document node not found.",
      });
    }

    const world = await getOwnedWorld(
      node.worldId,
      user._id
    );

    if (!world) {
      return res.status(403).json({
        message:
          "You do not have access to this node.",
      });
    }

    const oldParentId =
      node.parentId || null;

    const requestedParentId =
      req.body.parentId || null;

    let newParentId = null;

    if (requestedParentId) {
      const parent =
        await DocumentNode.findOne({
          _id: requestedParentId,
          worldId: world._id,
          kind: "folder",
        });

      if (!parent) {
        return res.status(400).json({
          message:
            "Invalid destination folder.",
        });
      }

      newParentId = parent._id;
    }

    if (
      node.kind === "folder" &&
      (await wouldCreateCycle(
        node._id,
        newParentId
      ))
    ) {
      return res.status(400).json({
        message:
          "Cannot move a folder inside itself or one of its descendants.",
      });
    }

    node.parentId = newParentId;

    await node.save();

    await normalizeOrder(
      world._id,
      oldParentId
    );

    let siblings =
      await DocumentNode.find({
        worldId: world._id,
        parentId: newParentId,
        _id: {
          $ne: node._id,
        },
      }).sort({
        order: 1,
        createdAt: 1,
      });

    let index = Number.isInteger(
      req.body.index
    )
      ? req.body.index
      : siblings.length;

    index = Math.max(
      0,
      Math.min(index, siblings.length)
    );

    siblings.splice(index, 0, node);

    const operations = siblings.map(
      (sibling, siblingIndex) => ({
        updateOne: {
          filter: {
            _id: sibling._id,
          },

          update: {
            $set: {
              parentId: newParentId,
              order: siblingIndex,
            },
          },
        },
      })
    );

    if (operations.length > 0) {
      await DocumentNode.bulkWrite(
        operations
      );
    }

    const updatedNode =
      await DocumentNode.findById(
        node._id
      ).populate("documentId");

    res.json(updatedNode);
  } catch (error) {
    console.error(
      "Failed to move document node:",
      error
    );

    res.status(500).json({
      message:
        "Failed to move document node.",
    });
  }
});

/*
 * Delete a folder.
 *
 * Children are promoted to the deleted folder's parent.
 * Documents themselves are NOT deleted.
 */
router.delete("/:nodeId", async (req, res) => {
  try {
    const user = await getDevUser();

    const node =
      await DocumentNode.findById(
        req.params.nodeId
      );

    if (!node) {
      return res.status(404).json({
        message: "Document node not found.",
      });
    }

    const world = await getOwnedWorld(
      node.worldId,
      user._id
    );

    if (!world) {
      return res.status(403).json({
        message:
          "You do not have access to this node.",
      });
    }

    if (node.kind !== "folder") {
      return res.status(400).json({
        message:
          "Delete document nodes through the document API.",
      });
    }

    const parentId =
      node.parentId || null;

    const children =
      await DocumentNode.find({
        worldId: world._id,
        parentId: node._id,
      }).sort({
        order: 1,
        createdAt: 1,
      });

    const existingSiblings =
      await DocumentNode.find({
        worldId: world._id,
        parentId,
        _id: {
          $ne: node._id,
        },
      }).sort({
        order: 1,
        createdAt: 1,
      });

    const insertionIndex = Math.max(
      0,
      Math.min(
        node.order,
        existingSiblings.length
      )
    );

    existingSiblings.splice(
      insertionIndex,
      0,
      ...children
    );

    const operations =
      existingSiblings.map(
        (sibling, index) => ({
          updateOne: {
            filter: {
              _id: sibling._id,
            },

            update: {
              $set: {
                parentId,
                order: index,
              },
            },
          },
        })
      );

    if (operations.length > 0) {
      await DocumentNode.bulkWrite(
        operations
      );
    }

    await DocumentNode.deleteOne({
      _id: node._id,
    });

    res.json({
      message:
        "Folder deleted and children promoted.",
    });
  } catch (error) {
    console.error(
      "Failed to delete document folder:",
      error
    );

    res.status(500).json({
      message:
        "Failed to delete document folder.",
    });
  }
});

module.exports = router;