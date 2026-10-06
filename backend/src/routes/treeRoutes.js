const express = require("express");

const TreeNode = require("../models/TreeNode");
const Entity = require("../models/Entity");

const {
  getDevUser,
  getOwnedWorld,
} = require("../utils/devUser");

const router = express.Router();

// Create TreeNodes for Entities created before the tree system existed.
async function syncMissingEntityNodes(worldId) {
  const entities = await Entity.find({
    worldId,
  }).select("_id");

  const entityIds = entities.map(
    (entity) => entity._id
  );

  if (entityIds.length === 0) {
    return;
  }

  const existingNodes =
    await TreeNode.find({
      worldId,
      kind: "entity",
      entityId: {
        $in: entityIds,
      },
    }).select("entityId");

  const existingEntityIds =
    new Set(
      existingNodes.map((node) =>
        node.entityId.toString()
      )
    );

  const missingEntities =
    entities.filter(
      (entity) =>
        !existingEntityIds.has(
          entity._id.toString()
        )
    );

  if (missingEntities.length === 0) {
    return;
  }

  const rootCount =
    await TreeNode.countDocuments({
      worldId,
      parentId: null,
    });

  const newNodes =
    missingEntities.map(
      (entity, index) => ({
        worldId,
        kind: "entity",
        entityId: entity._id,
        parentId: null,
        order: rootCount + index,
      })
    );

  try {
    await TreeNode.insertMany(
      newNodes,
      {
        ordered: false,
      }
    );
  } catch (error) {
    // Duplicate nodes may occur if simultaneous requests
    // try to synchronize the tree at the same time.
    if (error.code !== 11000) {
      throw error;
    }
  }
}

// Get the complete tree for a World.
router.get(
  "/world/:worldId",
  async (req, res) => {
    try {
      const user = await getDevUser();

      const world = await getOwnedWorld(
        req.params.worldId,
        user._id
      );

      if (!world) {
        return res.status(404).json({
          message: "World not found",
        });
      }

      await syncMissingEntityNodes(
        world._id
      );

      const nodes =
        await TreeNode.find({
          worldId: world._id,
        })
          .populate({
            path: "entityId",

            populate: {
              path: "entityTypeId",
              select: "name icon",
            },
          })
          .sort({
            order: 1,
            createdAt: 1,
          });

      res.json(nodes);
    } catch (error) {
      console.error(
        "Failed to get tree:",
        error
      );

      res.status(500).json({
        message:
          "Failed to get tree",
        error: error.message,
      });
    }
  }
);

// Create a folder.
router.post(
  "/folders",
  async (req, res) => {
    try {
      const user = await getDevUser();

      const {
        worldId,
        name,
        parentId,
      } = req.body;

      if (!worldId) {
        return res.status(400).json({
          message:
            "worldId is required",
        });
      }

      if (!name || !name.trim()) {
        return res.status(400).json({
          message:
            "Folder name is required",
        });
      }

      const world = await getOwnedWorld(
        worldId,
        user._id
      );

      if (!world) {
        return res.status(404).json({
          message: "World not found",
        });
      }

      // If a parent is provided, verify that it belongs to this World.
      if (parentId) {
        const parent =
          await TreeNode.findById(
            parentId
          );

        if (!parent) {
          return res.status(404).json({
            message:
              "Parent node not found",
          });
        }

        if (
          parent.worldId.toString() !==
          world._id.toString()
        ) {
          return res.status(400).json({
            message:
              "Parent node belongs to another world",
          });
        }
      }

      const siblingCount =
        await TreeNode.countDocuments({
          worldId: world._id,
          parentId:
            parentId || null,
        });

      const folder =
        new TreeNode({
          worldId: world._id,

          kind: "folder",

          name: name.trim(),

          parentId:
            parentId || null,

          order: siblingCount,
        });

      const savedFolder =
        await folder.save();

      res
        .status(201)
        .json(savedFolder);
    } catch (error) {
      console.error(
        "Failed to create folder:",
        error
      );

      res.status(500).json({
        message:
          "Failed to create folder",
        error: error.message,
      });
    }
  }
);

// Check whether a target node is inside another node's descendants.
async function isDescendant(
  nodeId,
  possibleDescendantId
) {
  let currentId =
    possibleDescendantId;

  while (currentId) {
    const current =
      await TreeNode.findById(
        currentId
      ).select("parentId");

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

// Move a node.
// parentId = null moves it to the tree root.
router.put(
  "/:nodeId/move",
  async (req, res) => {
    try {
      const user = await getDevUser();

      const {
        nodeId,
      } = req.params;

      const {
        parentId,
      } = req.body;

      const node =
        await TreeNode.findById(
          nodeId
        );

      if (!node) {
        return res.status(404).json({
          message:
            "Tree node not found",
        });
      }

      const world = await getOwnedWorld(
        node.worldId,
        user._id
      );

      if (!world) {
        return res.status(404).json({
          message:
            "Tree node not found",
        });
      }

      // Move the node back to the root.
      if (!parentId) {
        const rootCount =
          await TreeNode.countDocuments({
            worldId: world._id,
            parentId: null,
            _id: {
              $ne: node._id,
            },
          });

        node.parentId = null;
        node.order = rootCount;

        await node.save();

        return res.json(node);
      }

      // A node cannot be placed inside itself.
      if (
        nodeId.toString() ===
        parentId.toString()
      ) {
        return res.status(400).json({
          message:
            "A node cannot be its own parent",
        });
      }

      const parent =
        await TreeNode.findById(
          parentId
        );

      if (!parent) {
        return res.status(404).json({
          message:
            "Target node not found",
        });
      }

      if (
        parent.worldId.toString() !==
        world._id.toString()
      ) {
        return res.status(400).json({
          message:
            "Cannot move between different worlds",
        });
      }

      // Prevent circular tree structures.
      const createsCycle =
        await isDescendant(
          nodeId,
          parentId
        );

      if (createsCycle) {
        return res.status(400).json({
          message:
            "Cannot move a node inside its own descendant",
        });
      }

      const siblingCount =
        await TreeNode.countDocuments({
          worldId: world._id,

          parentId: parent._id,

          _id: {
            $ne: node._id,
          },
        });

      node.parentId =
        parent._id;

      node.order =
        siblingCount;

      await node.save();

      res.json(node);
    } catch (error) {
      console.error(
        "Failed to move tree node:",
        error
      );

      res.status(500).json({
        message:
          "Failed to move tree node",
        error: error.message,
      });
    }
  }
);

// Rename a folder.
router.put(
  "/:nodeId",
  async (req, res) => {
    try {
      const user = await getDevUser();

      const {
        name,
      } = req.body;

      const node =
        await TreeNode.findById(
          req.params.nodeId
        );

      if (!node) {
        return res.status(404).json({
          message:
            "Tree node not found",
        });
      }

      const world = await getOwnedWorld(
        node.worldId,
        user._id
      );

      if (!world) {
        return res.status(404).json({
          message:
            "Tree node not found",
        });
      }

      if (
        node.kind !== "folder"
      ) {
        return res.status(400).json({
          message:
            "Only folders can be renamed from the tree",
        });
      }

      if (!name || !name.trim()) {
        return res.status(400).json({
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
        "Failed to rename folder:",
        error
      );

      res.status(500).json({
        message:
          "Failed to rename folder",
        error: error.message,
      });
    }
  }
);

// Delete a folder.
// Child nodes are moved one level up instead of being deleted.
router.delete(
  "/:nodeId",
  async (req, res) => {
    try {
      const user = await getDevUser();

      const node =
        await TreeNode.findById(
          req.params.nodeId
        );

      if (!node) {
        return res.status(404).json({
          message:
            "Tree node not found",
        });
      }

      const world = await getOwnedWorld(
        node.worldId,
        user._id
      );

      if (!world) {
        return res.status(404).json({
          message:
            "Tree node not found",
        });
      }

      if (
        node.kind !== "folder"
      ) {
        return res.status(400).json({
          message:
            "Entity nodes cannot be deleted from this endpoint",
        });
      }

      // Move all children to the deleted folder's parent.
      await TreeNode.updateMany(
        {
          worldId: world._id,
          parentId: node._id,
        },
        {
          $set: {
            parentId:
              node.parentId || null,
          },
        }
      );

      await node.deleteOne();

      res.json({
        message:
          "Folder deleted",
      });
    } catch (error) {
      console.error(
        "Failed to delete folder:",
        error
      );

      res.status(500).json({
        message:
          "Failed to delete folder",
        error: error.message,
      });
    }
  }
);

module.exports = router;