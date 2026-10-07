const express = require("express");

const TreeNode = require("../models/TreeNode");
const Entity = require("../models/Entity");

const {
  getDevUser,
  getOwnedWorld,
} = require("../utils/devUser");

const router = express.Router();


// ======================================================
// Helpers
// ======================================================

// Create TreeNodes for Entities created before
// the tree system existed.
async function syncMissingEntityNodes(
  worldId
) {
  const entities =
    await Entity.find({
      worldId,
    }).select("_id");

  const entityIds =
    entities.map(
      (entity) => entity._id
    );

  if (
    entityIds.length === 0
  ) {
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

  if (
    missingEntities.length === 0
  ) {
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

        entityId:
          entity._id,

        parentId: null,

        order:
          rootCount + index,
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
    // Duplicate nodes may occur if simultaneous
    // requests try to synchronize the tree.
    if (
      error.code !== 11000
    ) {
      throw error;
    }
  }
}


// Check whether a target node is inside
// another node's descendants.
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


// Return true when two parent IDs
// represent the same parent.
function sameParentId(
  firstParentId,
  secondParentId
) {
  const first =
    firstParentId
      ? firstParentId.toString()
      : null;

  const second =
    secondParentId
      ? secondParentId.toString()
      : null;

  return first === second;
}


// Normalize sibling order under one parent.
async function normalizeSiblingOrder(
  worldId,
  parentId
) {
  const siblings =
    await TreeNode.find({
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

  await TreeNode.bulkWrite(
    siblings.map(
      (
        sibling,
        index
      ) => ({
        updateOne: {
          filter: {
            _id:
              sibling._id,
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


// ======================================================
// Get Tree
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

      await syncMissingEntityNodes(
        world._id
      );

      const nodes =
        await TreeNode.find({
          worldId:
            world._id,
        })
          .populate({
            path:
              "entityId",

            populate: {
              path:
                "entityTypeId",

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

      res
        .status(500)
        .json({
          message:
            "Failed to get tree",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Create Folder
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

      // Verify the parent belongs
      // to the same World.
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
          parent.worldId
            .toString() !==
          world._id
            .toString()
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
          worldId:
            world._id,

          parentId:
            parentId ||
            null,
        });

      const folder =
        new TreeNode({
          worldId:
            world._id,

          kind:
            "folder",

          name:
            name.trim(),

          parentId:
            parentId ||
            null,

          order:
            siblingCount,
        });

      const savedFolder =
        await folder.save();

      res
        .status(201)
        .json(
          savedFolder
        );
    } catch (error) {
      console.error(
        "Failed to create folder:",
        error
      );

      res
        .status(500)
        .json({
          message:
            "Failed to create folder",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Move / Reorder Node
//
// parentId:
// null = root
//
// index:
// null = append to end
// number = destination sibling index
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
              "Tree node not found",
          });
      }

      const oldParentId =
        node.parentId ||
        null;

      let destinationParentId =
        null;


      // ==================================================
      // Validate Destination Parent
      // ==================================================

      if (parentId) {
        if (
          nodeId.toString() ===
          parentId.toString()
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
          parent.worldId
            .toString() !==
          world._id
            .toString()
        ) {
          return res
            .status(400)
            .json({
              message:
                "Cannot move between different worlds",
            });
        }

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

        destinationParentId =
          parent._id;
      }


      // ==================================================
      // Load Destination Siblings
      // ==================================================

      const destinationSiblings =
        await TreeNode.find({
          worldId:
            world._id,

          parentId:
            destinationParentId ||
            null,

          _id: {
            $ne:
              node._id,
          },
        }).sort({
          order: 1,
          createdAt: 1,
        });


      // ==================================================
      // Calculate Destination Index
      // ==================================================

      let insertionIndex =
        destinationSiblings
          .length;

      if (
        index !== undefined &&
        index !== null
      ) {
        const parsedIndex =
          Number(index);

        if (
          !Number.isInteger(
            parsedIndex
          )
        ) {
          return res
            .status(400)
            .json({
              message:
                "index must be an integer",
            });
        }

        insertionIndex =
          Math.max(
            0,

            Math.min(
              parsedIndex,

              destinationSiblings
                .length
            )
          );
      }


      // ==================================================
      // Move Node
      // ==================================================

      node.parentId =
        destinationParentId;

      node.order =
        insertionIndex;

      await node.save();


      // ==================================================
      // Rebuild Destination Order
      // ==================================================

      const reorderedDestination = [
        ...destinationSiblings.slice(
          0,
          insertionIndex
        ),

        node,

        ...destinationSiblings.slice(
          insertionIndex
        ),
      ];

      if (
        reorderedDestination
          .length > 0
      ) {
        await TreeNode.bulkWrite(
          reorderedDestination.map(
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
                      destinationParentId ||
                      null,

                    order:
                      siblingIndex,
                  },
                },
              },
            })
          )
        );
      }


      // ==================================================
      // Normalize Previous Parent
      // ==================================================

      if (
        !sameParentId(
          oldParentId,
          destinationParentId
        )
      ) {
        await normalizeSiblingOrder(
          world._id,
          oldParentId
        );
      }


      const updatedNode =
        await TreeNode.findById(
          node._id
        );

      res.json(
        updatedNode
      );
    } catch (error) {
      console.error(
        "Failed to move tree node:",
        error
      );

      res
        .status(500)
        .json({
          message:
            "Failed to move tree node",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Rename Folder
// ======================================================

router.put(
  "/:nodeId",

  async (req, res) => {
    try {
      const user =
        await getDevUser();

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
              "Tree node not found",
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
        "Failed to rename folder:",
        error
      );

      res
        .status(500)
        .json({
          message:
            "Failed to rename folder",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Delete Folder
//
// Children are promoted one level.
// Entities are not deleted.
// ======================================================

router.delete(
  "/:nodeId",

  async (req, res) => {
    try {
      const user =
        await getDevUser();

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
              "Tree node not found",
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
              "Entity nodes cannot be deleted from this endpoint",
          });
      }


      // ==================================================
      // Load Current Siblings
      // ==================================================

      const siblings =
        await TreeNode.find({
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


      // ==================================================
      // Load Folder Children
      // ==================================================

      const children =
        await TreeNode.find({
          worldId:
            world._id,

          parentId:
            node._id,
        }).sort({
          order: 1,
          createdAt: 1,
        });


      // ==================================================
      // Insert Children Where Folder Used To Be
      // ==================================================

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
        await TreeNode.bulkWrite(
          finalNodes.map(
            (
              childNode,
              index
            ) => ({
              updateOne: {
                filter: {
                  _id:
                    childNode._id,
                },

                update: {
                  $set: {
                    parentId:
                      node.parentId ||
                      null,

                    order:
                      index,
                  },
                },
              },
            })
          )
        );
      }


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

      res
        .status(500)
        .json({
          message:
            "Failed to delete folder",

          error:
            error.message,
        });
    }
  }
);


module.exports = router;