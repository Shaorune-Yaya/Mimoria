const express = require("express");

const TreeNode = require("../models/TreeNode");
const Entity = require("../models/Entity");

const router = express.Router();


// ======================================================
// Helper
// 为旧 Entity 自动补 TreeNode
// ======================================================

async function syncMissingEntityNodes(worldId) {
  const entities = await Entity.find({
    worldId,
  }).select("_id");

  const entityIds = entities.map(
    (entity) => entity._id
  );

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
      existingNodes.map(
        (node) =>
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

        order:
          rootCount + index,
      })
    );

  await TreeNode.insertMany(
    newNodes,
    {
      ordered: false,
    }
  );
}


// ======================================================
// GET Tree
// 同时自动补齐旧 Entity
//
// GET /api/tree/world/:worldId
// ======================================================

router.get(
  "/world/:worldId",
  async (req, res) => {
    try {
      const { worldId } =
        req.params;

      await syncMissingEntityNodes(
        worldId
      );

      const nodes =
        await TreeNode.find({
          worldId,
        })
          .populate({
            path: "entityId",

            populate: {
              path: "entityTypeId",
              select:
                "name icon",
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


// ======================================================
// CREATE Folder
//
// POST /api/tree/folders
// ======================================================

router.post(
  "/folders",
  async (req, res) => {
    try {
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

      if (
        !name ||
        !name.trim()
      ) {
        return res.status(400).json({
          message:
            "Folder name is required",
        });
      }


      // 如果指定父节点，确认属于同一个 World
      if (parentId) {
        const parent =
          await TreeNode.findById(
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
          worldId
        ) {
          return res
            .status(400)
            .json({
              message:
                "Parent node belongs to another world",
            });
        }
      }


      const siblingCount =
        await TreeNode.countDocuments({
          worldId,
          parentId:
            parentId || null,
        });


      const folder =
        new TreeNode({
          worldId,

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


// ======================================================
// 检查 target 是否在 dragged node 的后代里
// 防止：
// A
// └ B
//
// 然后把 A 拖进 B
// ======================================================

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


// ======================================================
// MOVE Node
//
// PUT /api/tree/:nodeId/move
//
// body:
// {
//   parentId: "..."
// }
//
// parentId null = Root
// ======================================================

router.put(
  "/:nodeId/move",
  async (req, res) => {
    try {
      const { nodeId } =
        req.params;

      const {
        parentId,
      } = req.body;


      const node =
        await TreeNode.findById(
          nodeId
        );

      if (!node) {
        return res
          .status(404)
          .json({
            message:
              "Tree node not found",
          });
      }


      // 移回 Root
      if (!parentId) {
        const rootCount =
          await TreeNode.countDocuments({
            worldId:
              node.worldId,
            parentId: null,
          });


        node.parentId = null;

        node.order =
          rootCount;

        await node.save();


        return res.json(node);
      }


      // 不能拖到自己下面
      if (
        nodeId === parentId
      ) {
        return res
          .status(400)
          .json({
            message:
              "A node cannot be its own parent",
          });
      }


      const parent =
        await TreeNode.findById(
          parentId
        );


      if (!parent) {
        return res
          .status(404)
          .json({
            message:
              "Target node not found",
          });
      }


      if (
        parent.worldId.toString() !==
        node.worldId.toString()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Cannot move between different worlds",
          });
      }


      // 防止循环
      const createsCycle =
        await isDescendant(
          nodeId,
          parentId
        );


      if (createsCycle) {
        return res
          .status(400)
          .json({
            message:
              "Cannot move a node inside its own descendant",
          });
      }


      const siblingCount =
        await TreeNode.countDocuments({
          worldId:
            node.worldId,

          parentId:
            parent._id,
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


// ======================================================
// RENAME Folder
//
// PUT /api/tree/:nodeId
// ======================================================

router.put(
  "/:nodeId",
  async (req, res) => {
    try {
      const {
        name,
      } = req.body;


      const node =
        await TreeNode.findById(
          req.params.nodeId
        );


      if (!node) {
        return res
          .status(404)
          .json({
            message:
              "Tree node not found",
          });
      }


      if (
        node.kind !== "folder"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Only folders can be renamed from the tree",
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


      node.name =
        name.trim();

      await node.save();


      res.json(node);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Failed to rename folder",
        error: error.message,
      });
    }
  }
);


// ======================================================
// DELETE Folder
//
// DELETE /api/tree/:nodeId
//
// 默认：删除文件夹，但把里面东西提到上一级
// 不会删除 Entity
// ======================================================

router.delete(
  "/:nodeId",
  async (req, res) => {
    try {
      const node =
        await TreeNode.findById(
          req.params.nodeId
        );


      if (!node) {
        return res
          .status(404)
          .json({
            message:
              "Tree node not found",
          });
      }


      if (
        node.kind !== "folder"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Entity nodes cannot be deleted from this endpoint",
          });
      }


      // 子节点提升到当前 Folder 的父级
      await TreeNode.updateMany(
        {
          parentId:
            node._id,
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
      console.error(error);

      res.status(500).json({
        message:
          "Failed to delete folder",
        error: error.message,
      });
    }
  }
);


module.exports = router;