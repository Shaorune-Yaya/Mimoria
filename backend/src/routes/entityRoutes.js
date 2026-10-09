const express =
  require(
    "express"
  );


const World =
  require(
    "../models/World"
  );

const Entity =
  require(
    "../models/Entity"
  );

const EntityType =
  require(
    "../models/EntityType"
  );

const TreeNode =
  require(
    "../models/TreeNode"
  );


const {
  requireAuth,
} = require(
  "../middleware/requireAuth"
);


const {
  bumpWorldCanonVersion,
} = require(
  "../services/worldCanonVersionService"
);


const router =
  express.Router();


// ======================================================
// Authentication
// ======================================================

router.use(
  requireAuth
);


// ======================================================
// Ownership Helpers
// ======================================================

async function findOwnedWorld(
  worldId,
  userId
) {
  if (
    !worldId ||
    !userId
  ) {
    return null;
  }


  return World.findOne({
    _id:
      worldId,

    ownerId:
      userId,
  });
}


async function findOwnedEntity({
  entityId,
  userId,
}) {
  const entity =
    await Entity.findById(
      entityId
    );


  if (
    !entity
  ) {
    return null;
  }


  const world =
    await findOwnedWorld(
      entity.worldId,
      userId
    );


  if (
    !world
  ) {
    return null;
  }


  return {
    entity,
    world,
  };
}


// ======================================================
// Entity Value Validation
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


    // --------------------------------------------------
    // Number
    // --------------------------------------------------

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


    // --------------------------------------------------
    // Boolean
    // --------------------------------------------------

    if (
      field.type ===
      "boolean"
    ) {
      /*
       * Avoid Boolean("false") === true.
       */
      if (
        typeof value ===
        "string"
      ) {
        const normalized =
          value
            .trim()
            .toLowerCase();


        if (
          normalized ===
          "true"
        ) {
          cleanedValues[
            field.key
          ] =
            true;


          continue;
        }


        if (
          normalized ===
          "false"
        ) {
          cleanedValues[
            field.key
          ] =
            false;


          continue;
        }
      }


      cleanedValues[
        field.key
      ] =
        Boolean(
          value
        );


      continue;
    }


    // --------------------------------------------------
    // Select
    // --------------------------------------------------

    if (
      field.type ===
      "select"
    ) {
      const options =
        Array.isArray(
          field.options
        )
          ? field.options
          : [];


      if (
        !options.includes(
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


    // --------------------------------------------------
    // Default
    // --------------------------------------------------

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
// Entity Reference Validation
//
// Prevent values such as:
//
// User A World:
// Character.home = <Entity from User B World>
//
// from being stored manually through the API.
// ======================================================

async function validateEntityReferenceValues({
  world,
  entityType,
  values,
}) {
  for (
    const field of
    entityType.fields
  ) {
    if (
      field.type !==
      "entity-reference"
    ) {
      continue;
    }


    const value =
      values[
        field.key
      ];


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


    let referencedEntity;


    try {
      referencedEntity =
        await Entity.findOne({
          _id:
            value,

          worldId:
            world._id,
        });
    } catch {
      return {
        error:
          `Invalid entity reference for ${field.label}`,
      };
    }


    if (
      !referencedEntity
    ) {
      return {
        error:
          `Referenced entity for ${field.label} was not found`,
      };
    }


    if (
      field.referenceEntityTypeId &&
      String(
        referencedEntity
          .entityTypeId
      ) !==
        String(
          field
            .referenceEntityTypeId
        )
    ) {
      return {
        error:
          `Referenced entity has an invalid type for ${field.label}`,
      };
    }
  }


  return {
    valid:
      true,
  };
}


// ======================================================
// Get Every Entity in World
//
// GET /api/entities/world/:worldId
// ======================================================

router.get(
  "/world/:worldId",

  async (
    req,
    res
  ) => {
    try {
      const world =
        await findOwnedWorld(
          req.params.worldId,
          req.user._id
        );


      if (
        !world
      ) {
        return res
          .status(404)
          .json({
            message:
              "World not found",

            code:
              "WORLD_NOT_FOUND",
          });
      }


      const entities =
        await Entity
          .find({
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


      return res.json(
        entities
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to get entities:",
        error
      );


      return res
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
// Get Entities by Entity Type
//
// GET
// /api/entities/world/:worldId/type/:entityTypeId
// ======================================================

router.get(
  "/world/:worldId/type/:entityTypeId",

  async (
    req,
    res
  ) => {
    try {
      const world =
        await findOwnedWorld(
          req.params.worldId,
          req.user._id
        );


      if (
        !world
      ) {
        return res
          .status(404)
          .json({
            message:
              "World not found",

            code:
              "WORLD_NOT_FOUND",
          });
      }


      const entityType =
        await EntityType.findOne({
          _id:
            req.params
              .entityTypeId,

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

            code:
              "ENTITY_TYPE_NOT_FOUND",
          });
      }


      const entities =
        await Entity
          .find({
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


      return res.json(
        entities
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to get entities:",
        error
      );


      return res
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
// Create Entity
//
// POST /api/entities
// ======================================================

router.post(
  "/",

  async (
    req,
    res
  ) => {
    try {
      const {
        worldId,
        entityTypeId,
        name,
        values,
      } =
        req.body ||
        {};


      if (
        !worldId
      ) {
        return res
          .status(400)
          .json({
            message:
              "worldId is required",

            code:
              "WORLD_ID_REQUIRED",
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

            code:
              "ENTITY_TYPE_ID_REQUIRED",
          });
      }


      const normalizedName =
        String(
          name ||
          ""
        )
          .trim();


      if (
        !normalizedName
      ) {
        return res
          .status(400)
          .json({
            message:
              "Entity name is required",

            code:
              "ENTITY_NAME_REQUIRED",
          });
      }


      const world =
        await findOwnedWorld(
          worldId,
          req.user._id
        );


      if (
        !world
      ) {
        return res
          .status(404)
          .json({
            message:
              "World not found",

            code:
              "WORLD_NOT_FOUND",
          });
      }


      /*
       * Query by both ID and worldId instead of loading
       * globally and comparing afterward.
       *
       * This avoids exposing cross-world records.
       */
      const entityType =
        await EntityType.findOne({
          _id:
            entityTypeId,

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

            code:
              "ENTITY_TYPE_NOT_FOUND",
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

            code:
              "ENTITY_VALUES_INVALID",
          });
      }


      const referenceValidation =
        await validateEntityReferenceValues({
          world,

          entityType,

          values:
            validation.values,
        });


      if (
        referenceValidation.error
      ) {
        return res
          .status(400)
          .json({
            message:
              referenceValidation.error,

            code:
              "ENTITY_REFERENCE_INVALID",
          });
      }


      const entity =
        new Entity({
          worldId:
            world._id,

          entityTypeId:
            entityType._id,

          name:
            normalizedName,

          values:
            validation.values,
        });


      const savedEntity =
        await entity.save();


      // --------------------------------------------------
      // Create root TreeNode
      // --------------------------------------------------

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


      const dto =
        populatedEntity.toObject();


      dto.canonVersion =
        canonVersion;


      return res
        .status(201)
        .json(
          dto
        );
    } catch (
      error
    ) {
      console.error(
        "Failed to create entity:",
        error
      );


      return res
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
// Update Entity
//
// PUT /api/entities/:id
// ======================================================

router.put(
  "/:id",

  async (
    req,
    res
  ) => {
    try {
      const owned =
        await findOwnedEntity({
          entityId:
            req.params.id,

          userId:
            req.user._id,
        });


      /*
       * Deliberately return the same 404 for:
       *
       * nonexistent entity
       * another user's entity
       */
      if (
        !owned
      ) {
        return res
          .status(404)
          .json({
            message:
              "Entity not found",

            code:
              "ENTITY_NOT_FOUND",
          });
      }


      const {
        entity,
        world,
      } =
        owned;


      const {
        name,
        values,
      } =
        req.body ||
        {};


      const normalizedName =
        String(
          name ||
          ""
        )
          .trim();


      if (
        !normalizedName
      ) {
        return res
          .status(400)
          .json({
            message:
              "Entity name is required",

            code:
              "ENTITY_NAME_REQUIRED",
          });
      }


      const entityType =
        await EntityType.findOne({
          _id:
            entity.entityTypeId,

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

            code:
              "ENTITY_TYPE_NOT_FOUND",
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

            code:
              "ENTITY_VALUES_INVALID",
          });
      }


      const referenceValidation =
        await validateEntityReferenceValues({
          world,

          entityType,

          values:
            validation.values,
        });


      if (
        referenceValidation.error
      ) {
        return res
          .status(400)
          .json({
            message:
              referenceValidation.error,

            code:
              "ENTITY_REFERENCE_INVALID",
          });
      }


      entity.name =
        normalizedName;


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


      return res.json(
        dto
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to update entity:",
        error
      );


      return res
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
// Delete Entity
//
// DELETE /api/entities/:id
//
// Child TreeNodes are promoted to the deleted Entity
// node's parent.
// ======================================================

router.delete(
  "/:id",

  async (
    req,
    res
  ) => {
    try {
      const owned =
        await findOwnedEntity({
          entityId:
            req.params.id,

          userId:
            req.user._id,
        });


      if (
        !owned
      ) {
        return res
          .status(404)
          .json({
            message:
              "Entity not found",

            code:
              "ENTITY_NOT_FOUND",
          });
      }


      const {
        entity,
        world,
      } =
        owned;


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
          await TreeNode.bulkWrite(
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


      return res.json({
        message:
          "Entity deleted",

        canonVersion,
      });
    } catch (
      error
    ) {
      console.error(
        "Failed to delete entity:",
        error
      );


      return res
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