const express = require(
  "express"
);

const Entity = require(
  "../models/Entity"
);

const EntityType = require(
  "../models/EntityType"
);

const TreeNode = require(
  "../models/TreeNode"
);


const {
  getDevUser,
  getOwnedWorld,
} = require(
  "../utils/devUser"
);


const {
  bumpWorldCanonVersion,
} = require(
  "../services/worldCanonVersionService"
);


const router =
  express.Router();


// ======================================================
// Get every Entity belonging to a World
// ======================================================

router.get(
  "/world/:worldId",

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getDevUser();


      const world =
        await getOwnedWorld(
          req.params.worldId,
          user._id
        );


      if (
        !world
      ) {
        return res
          .status(404)
          .json({
            message:
              "World not found",
          });
      }


      const entities =
        await Entity.find({
          worldId:
            world._id,
        })
          .populate(
            "entityTypeId",
            "name icon description canonicalConcept"
          )
          .sort({
            updatedAt:
              -1,
          });


      res.json(
        entities
      );
    } catch (error) {
      console.error(
        "Failed to get entities:",
        error
      );


      res
        .status(500)
        .json({
          message:
            "Failed to get entities",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Get Entities belonging to a specific Entity Type
// ======================================================

router.get(
  "/world/:worldId/type/:entityTypeId",

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getDevUser();


      const world =
        await getOwnedWorld(
          req.params.worldId,
          user._id
        );


      if (
        !world
      ) {
        return res
          .status(404)
          .json({
            message:
              "World not found",
          });
      }


      const entityType =
        await EntityType.findOne({
          _id:
            req.params.entityTypeId,

          worldId:
            world._id,
        });


      if (
        !entityType
      ) {
        return res
          .status(404)
          .json({
            message:
              "Entity type not found",
          });
      }


      const entities =
        await Entity.find({
          worldId:
            world._id,

          entityTypeId:
            entityType._id,
        })
          .select(
            "name entityTypeId"
          )
          .sort({
            name:
              1,
          });


      res.json(
        entities
      );
    } catch (error) {
      console.error(
        "Failed to get entities:",
        error
      );


      res
        .status(500)
        .json({
          message:
            "Failed to get entities",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Validation Helper
// ======================================================

function cleanEntityValues({
  entityType,
  submittedValues = {},
}) {
  const cleanedValues =
    {};


  for (
    const field of
    entityType.fields
  ) {
    const value =
      submittedValues[
        field.key
      ];


    if (
      field.required
    ) {
      const isEmpty =
        value ===
          undefined ||
        value ===
          null ||
        value ===
          "";


      if (
        isEmpty
      ) {
        return {
          error:
            `${field.label} is required`,
        };
      }
    }


    if (
      value ===
        undefined ||
      value ===
        null ||
      value ===
        ""
    ) {
      continue;
    }


    if (
      field.type ===
      "number"
    ) {
      const numberValue =
        Number(
          value
        );


      if (
        Number.isNaN(
          numberValue
        )
      ) {
        return {
          error:
            `${field.label} must be a number`,
        };
      }


      cleanedValues[
        field.key
      ] =
        numberValue;


      continue;
    }


    if (
      field.type ===
      "boolean"
    ) {
      cleanedValues[
        field.key
      ] =
        Boolean(
          value
        );


      continue;
    }


    if (
      field.type ===
      "select"
    ) {
      if (
        !field.options.includes(
          value
        )
      ) {
        return {
          error:
            `Invalid option for ${field.label}`,
        };
      }


      cleanedValues[
        field.key
      ] =
        value;


      continue;
    }


    cleanedValues[
      field.key
    ] =
      value;
  }


  return {
    values:
      cleanedValues,
  };
}


// ======================================================
// Create an Entity
// ======================================================

router.post(
  "/",

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getDevUser();


      const {
        worldId,
        entityTypeId,
        name,
        values,
      } =
        req.body;


      if (
        !worldId
      ) {
        return res
          .status(400)
          .json({
            message:
              "worldId is required",
          });
      }


      if (
        !entityTypeId
      ) {
        return res
          .status(400)
          .json({
            message:
              "entityTypeId is required",
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
              "Entity name is required",
          });
      }


      const world =
        await getOwnedWorld(
          worldId,
          user._id
        );


      if (
        !world
      ) {
        return res
          .status(404)
          .json({
            message:
              "World not found",
          });
      }


      const entityType =
        await EntityType.findById(
          entityTypeId
        );


      if (
        !entityType
      ) {
        return res
          .status(404)
          .json({
            message:
              "Entity type not found",
          });
      }


      if (
        entityType
          .worldId
          .toString() !==
        world
          ._id
          .toString()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Entity type does not belong to this world",
          });
      }


      const validation =
        cleanEntityValues({
          entityType,

          submittedValues:
            values ||
            {},
        });


      if (
        validation.error
      ) {
        return res
          .status(400)
          .json({
            message:
              validation.error,
          });
      }


      const entity =
        new Entity({
          worldId:
            world._id,

          entityTypeId,

          name:
            name.trim(),

          values:
            validation.values,
        });


      const savedEntity =
        await entity.save();


      const rootCount =
        await TreeNode
          .countDocuments({
            worldId:
              world._id,

            parentId:
              null,
          });


      await TreeNode.create({
        worldId:
          world._id,

        kind:
          "entity",

        entityId:
          savedEntity._id,

        parentId:
          null,

        order:
          rootCount,
      });


      // --------------------------------------------------
      // Canon changed
      // --------------------------------------------------

      const canonVersion =
        await bumpWorldCanonVersion(
          world._id
        );


      const populatedEntity =
        await Entity
          .findById(
            savedEntity._id
          )
          .populate(
            "entityTypeId",
            "name icon"
          );


      /*
       * Keep Entity response compatible.
       *
       * The version is included as a transient JSON field.
       */
      const dto =
        populatedEntity.toObject();


      dto.canonVersion =
        canonVersion;


      res
        .status(201)
        .json(
          dto
        );
    } catch (error) {
      console.error(
        "Failed to create entity:",
        error
      );


      res
        .status(500)
        .json({
          message:
            "Failed to create entity",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Update an Entity
// ======================================================

router.put(
  "/:id",

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getDevUser();


      const {
        name,
        values,
      } =
        req.body;


      const entity =
        await Entity.findById(
          req.params.id
        );


      if (
        !entity
      ) {
        return res
          .status(404)
          .json({
            message:
              "Entity not found",
          });
      }


      const world =
        await getOwnedWorld(
          entity.worldId,
          user._id
        );


      if (
        !world
      ) {
        return res
          .status(404)
          .json({
            message:
              "Entity not found",
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
              "Entity name is required",
          });
      }


      const entityType =
        await EntityType.findById(
          entity.entityTypeId
        );


      if (
        !entityType
      ) {
        return res
          .status(404)
          .json({
            message:
              "Entity type not found",
          });
      }


      const validation =
        cleanEntityValues({
          entityType,

          submittedValues:
            values ||
            {},
        });


      if (
        validation.error
      ) {
        return res
          .status(400)
          .json({
            message:
              validation.error,
          });
      }


      entity.name =
        name.trim();


      entity.values =
        validation.values;


      await entity.save();


      const canonVersion =
        await bumpWorldCanonVersion(
          world._id
        );


      const updatedEntity =
        await Entity
          .findById(
            entity._id
          )
          .populate(
            "entityTypeId",
            "name icon"
          );


      const dto =
        updatedEntity.toObject();


      dto.canonVersion =
        canonVersion;


      res.json(
        dto
      );
    } catch (error) {
      console.error(
        "Failed to update entity:",
        error
      );


      res
        .status(500)
        .json({
          message:
            "Failed to update entity",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Delete an Entity
//
// Any child TreeNodes are promoted to the deleted
// Entity node's parent.
// ======================================================

router.delete(
  "/:id",

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getDevUser();


      const entity =
        await Entity.findById(
          req.params.id
        );


      if (
        !entity
      ) {
        return res
          .status(404)
          .json({
            message:
              "Entity not found",
          });
      }


      const world =
        await getOwnedWorld(
          entity.worldId,
          user._id
        );


      if (
        !world
      ) {
        return res
          .status(404)
          .json({
            message:
              "Entity not found",
          });
      }


      const treeNode =
        await TreeNode.findOne({
          worldId:
            world._id,

          kind:
            "entity",

          entityId:
            entity._id,
        });


      if (
        treeNode
      ) {
        const siblings =
          await TreeNode
            .find({
              worldId:
                world._id,

              parentId:
                treeNode.parentId ||
                null,

              _id: {
                $ne:
                  treeNode._id,
              },
            })
            .sort({
              order:
                1,

              createdAt:
                1,
            });


        const children =
          await TreeNode
            .find({
              worldId:
                world._id,

              parentId:
                treeNode._id,
            })
            .sort({
              order:
                1,

              createdAt:
                1,
            });


        const insertionIndex =
          Math.max(
            0,

            Math.min(
              treeNode.order ||
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
          await TreeNode
            .bulkWrite(
              finalNodes.map(
                (
                  node,
                  index
                ) => ({
                  updateOne: {
                    filter: {
                      _id:
                        node._id,
                    },

                    update: {
                      $set: {
                        parentId:
                          treeNode.parentId ||
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


        await treeNode.deleteOne();
      }


      await entity.deleteOne();


      const canonVersion =
        await bumpWorldCanonVersion(
          world._id
        );


      res.json({
        message:
          "Entity deleted",

        canonVersion,
      });
    } catch (error) {
      console.error(
        "Failed to delete entity:",
        error
      );


      res
        .status(500)
        .json({
          message:
            "Failed to delete entity",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Exports
// ======================================================

module.exports =
  router;