const express =
  require(
    "express"
  );

const crypto =
  require(
    "crypto"
  );


const World =
  require(
    "../models/World"
  );

const EntityType =
  require(
    "../models/EntityType"
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


async function findOwnedEntityType({
  entityTypeId,
  userId,
}) {
  const entityType =
    await EntityType.findById(
      entityTypeId
    );


  if (
    !entityType
  ) {
    return null;
  }


  const world =
    await findOwnedWorld(
      entityType.worldId,
      userId
    );


  if (
    !world
  ) {
    return null;
  }


  return {
    entityType,
    world,
  };
}


// ======================================================
// Field Helpers
// ======================================================

function cleanSelectOptions(
  options
) {
  if (
    !Array.isArray(
      options
    )
  ) {
    return [];
  }


  const seen =
    new Set();


  const result =
    [];


  for (
    const option of
    options
  ) {
    const normalized =
      String(
        option
      )
        .trim();


    if (
      !normalized
    ) {
      continue;
    }


    const key =
      normalized
        .toLocaleLowerCase();


    if (
      seen.has(
        key
      )
    ) {
      continue;
    }


    seen.add(
      key
    );


    result.push(
      normalized
    );
  }


  return result;
}


// ======================================================
// Validate Entity Type Reference
//
// referenceEntityTypeId must refer to an EntityType in
// the exact same owned World.
// ======================================================

async function validateReferenceEntityType({
  world,
  type,
  referenceEntityTypeId,
}) {
  if (
    type !==
      "entity-reference" ||
    !referenceEntityTypeId
  ) {
    return {
      referenceEntityTypeId:
        null,
    };
  }


  let referencedType;


  try {
    referencedType =
      await EntityType.findOne({
        _id:
          referenceEntityTypeId,

        worldId:
          world._id,
      });
  } catch {
    return {
      error:
        "Invalid referenced Entity Type",
    };
  }


  if (
    !referencedType
  ) {
    return {
      error:
        "Referenced Entity Type not found",
    };
  }


  return {
    referenceEntityTypeId:
      referencedType._id,
  };
}


// ======================================================
// Get All Entity Types in World
//
// GET /api/entity-types/world/:worldId
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


      const entityTypes =
        await EntityType
          .find({
            worldId:
              world._id,
          })
          .sort({
            createdAt:
              1,
          });


      return res.json(
        entityTypes
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to get entity types:",
        error
      );


      return res
        .status(500)
        .json({
          message:
            "Failed to get entity types",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Create Entity Type
//
// POST /api/entity-types
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
        name,
        description,
        icon,
        canonicalConcept,
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
              "Entity type name is required",

            code:
              "ENTITY_TYPE_NAME_REQUIRED",
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


      const entityType =
        new EntityType({
          worldId:
            world._id,

          name:
            normalizedName,

          description:
            typeof description ===
            "string"
              ? description
              : "",

          icon:
            typeof icon ===
              "string" &&
            icon.trim()
              ? icon.trim()
              : "📄",

          canonicalConcept:
            canonicalConcept ||
            null,
        });


      const savedEntityType =
        await entityType.save();


      const canonVersion =
        await bumpWorldCanonVersion(
          world._id
        );


      const dto =
        savedEntityType.toObject();


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
        "Failed to create entity type:",
        error
      );


      return res
        .status(500)
        .json({
          message:
            "Failed to create entity type",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Get One Entity Type
//
// GET /api/entity-types/:id
// ======================================================

router.get(
  "/:id",

  async (
    req,
    res
  ) => {
    try {
      const owned =
        await findOwnedEntityType({
          entityTypeId:
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
              "Entity type not found",

            code:
              "ENTITY_TYPE_NOT_FOUND",
          });
      }


      return res.json(
        owned.entityType
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to get entity type:",
        error
      );


      return res
        .status(500)
        .json({
          message:
            "Failed to get entity type",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Add Field
//
// POST /api/entity-types/:id/fields
// ======================================================

router.post(
  "/:id/fields",

  async (
    req,
    res
  ) => {
    try {
      const {
        label,
        type,
        required,
        referenceEntityTypeId,
        options,
        canonicalConcept,
      } =
        req.body ||
        {};


      const normalizedLabel =
        String(
          label ||
          ""
        )
          .trim();


      if (
        !normalizedLabel
      ) {
        return res
          .status(400)
          .json({
            message:
              "Field label is required",

            code:
              "FIELD_LABEL_REQUIRED",
          });
      }


      if (
        !type
      ) {
        return res
          .status(400)
          .json({
            message:
              "Field type is required",

            code:
              "FIELD_TYPE_REQUIRED",
          });
      }


      const owned =
        await findOwnedEntityType({
          entityTypeId:
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
              "Entity type not found",

            code:
              "ENTITY_TYPE_NOT_FOUND",
          });
      }


      const {
        entityType,
        world,
      } =
        owned;


      const duplicate =
        entityType.fields.find(
          (field) =>
            String(
              field.label ||
              ""
            )
              .trim()
              .toLowerCase() ===
            normalizedLabel
              .toLowerCase()
        );


      if (
        duplicate
      ) {
        return res
          .status(400)
          .json({
            message:
              "A field with this name already exists",

            code:
              "FIELD_NAME_DUPLICATE",
          });
      }


      const referenceValidation =
        await validateReferenceEntityType({
          world,

          type,

          referenceEntityTypeId,
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
              "REFERENCE_ENTITY_TYPE_INVALID",
          });
      }


      const key =
        `field_${crypto
          .randomUUID()
          .replace(
            /-/gu,
            ""
          )}`;


      const newField = {
        key,

        label:
          normalizedLabel,

        type,

        required:
          Boolean(
            required
          ),

        canonicalConcept:
          canonicalConcept ||
          null,

        referenceEntityTypeId:
          referenceValidation
            .referenceEntityTypeId,

        options:
          type ===
          "select"
            ? cleanSelectOptions(
                options
              )
            : [],

        order:
          entityType
            .fields
            .length,
      };


      entityType
        .fields
        .push(
          newField
        );


      await entityType.save();


      const canonVersion =
        await bumpWorldCanonVersion(
          world._id
        );


      const dto =
        entityType.toObject();


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
        "Failed to add field:",
        error
      );


      return res
        .status(500)
        .json({
          message:
            "Failed to add field",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Update Existing Field
//
// PUT /api/entity-types/:id/fields/:fieldId
// ======================================================

router.put(
  "/:id/fields/:fieldId",

  async (
    req,
    res
  ) => {
    try {
      const {
        label,
        type,
        required,
        referenceEntityTypeId,
        options,
        canonicalConcept,
      } =
        req.body ||
        {};


      const owned =
        await findOwnedEntityType({
          entityTypeId:
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
              "Entity type not found",

            code:
              "ENTITY_TYPE_NOT_FOUND",
          });
      }


      const {
        entityType,
        world,
      } =
        owned;


      const field =
        entityType
          .fields
          .id(
            req.params.fieldId
          );


      if (
        !field
      ) {
        return res
          .status(404)
          .json({
            message:
              "Field not found",

            code:
              "FIELD_NOT_FOUND",
          });
      }


      const normalizedLabel =
        String(
          label ||
          ""
        )
          .trim();


      if (
        !normalizedLabel
      ) {
        return res
          .status(400)
          .json({
            message:
              "Field label is required",

            code:
              "FIELD_LABEL_REQUIRED",
          });
      }


      if (
        !type
      ) {
        return res
          .status(400)
          .json({
            message:
              "Field type is required",

            code:
              "FIELD_TYPE_REQUIRED",
          });
      }


      const duplicate =
        entityType.fields.find(
          (
            otherField
          ) =>
            String(
              otherField._id
            ) !==
              String(
                field._id
              ) &&
            String(
              otherField.label ||
              ""
            )
              .trim()
              .toLowerCase() ===
              normalizedLabel
                .toLowerCase()
        );


      if (
        duplicate
      ) {
        return res
          .status(400)
          .json({
            message:
              "A field with this name already exists",

            code:
              "FIELD_NAME_DUPLICATE",
          });
      }


      const referenceValidation =
        await validateReferenceEntityType({
          world,

          type,

          referenceEntityTypeId,
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
              "REFERENCE_ENTITY_TYPE_INVALID",
          });
      }


      field.label =
        normalizedLabel;


      field.type =
        type;


      field.required =
        Boolean(
          required
        );


      /*
       * Existing frontend may omit canonicalConcept.
       *
       * Preserve the old semantic mapping unless the
       * request explicitly includes the property.
       */
      if (
        canonicalConcept !==
        undefined
      ) {
        field.canonicalConcept =
          canonicalConcept ||
          null;
      }


      field.referenceEntityTypeId =
        referenceValidation
          .referenceEntityTypeId;


      field.options =
        type ===
        "select"
          ? cleanSelectOptions(
              options
            )
          : [];


      await entityType.save();


      const canonVersion =
        await bumpWorldCanonVersion(
          world._id
        );


      const dto =
        entityType.toObject();


      dto.canonVersion =
        canonVersion;


      return res.json(
        dto
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to update field:",
        error
      );


      return res
        .status(500)
        .json({
          message:
            "Failed to update field",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Delete Field
//
// DELETE /api/entity-types/:id/fields/:fieldId
// ======================================================

router.delete(
  "/:id/fields/:fieldId",

  async (
    req,
    res
  ) => {
    try {
      const owned =
        await findOwnedEntityType({
          entityTypeId:
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
              "Entity type not found",

            code:
              "ENTITY_TYPE_NOT_FOUND",
          });
      }


      const {
        entityType,
        world,
      } =
        owned;


      const field =
        entityType
          .fields
          .id(
            req.params.fieldId
          );


      if (
        !field
      ) {
        return res
          .status(404)
          .json({
            message:
              "Field not found",

            code:
              "FIELD_NOT_FOUND",
          });
      }


      field.deleteOne();


      await entityType.save();


      const canonVersion =
        await bumpWorldCanonVersion(
          world._id
        );


      const dto =
        entityType.toObject();


      dto.canonVersion =
        canonVersion;


      return res.json(
        dto
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to delete field:",
        error
      );


      return res
        .status(500)
        .json({
          message:
            "Failed to delete field",

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