const express = require(
  "express"
);

const crypto = require(
  "crypto"
);


const EntityType = require(
  "../models/EntityType"
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
// Get all Entity Types belonging to a World
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


      res.json(
        entityTypes
      );
    } catch (error) {
      console.error(
        "Failed to get entity types:",
        error
      );


      res
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
// Create an Entity Type
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
        name,
        description,
        icon,
        canonicalConcept,
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
        !name ||
        !name.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Entity type name is required",
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
        new EntityType({
          worldId:
            world._id,

          name:
            name.trim(),

          description,

          icon,

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


      res
        .status(201)
        .json(
          dto
        );
    } catch (error) {
      console.error(
        "Failed to create entity type:",
        error
      );


      res
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
// Get one Entity Type
// ======================================================

router.get(
  "/:id",

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getDevUser();


      const entityType =
        await EntityType.findById(
          req.params.id
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


      const world =
        await getOwnedWorld(
          entityType.worldId,
          user._id
        );


      if (
        !world
      ) {
        return res
          .status(404)
          .json({
            message:
              "Entity type not found",
          });
      }


      res.json(
        entityType
      );
    } catch (error) {
      console.error(
        "Failed to get entity type:",
        error
      );


      res
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
// Add a field to an Entity Type
// ======================================================

router.post(
  "/:id/fields",

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getDevUser();


      const {
        label,
        type,
        required,
        referenceEntityTypeId,
        options,
        canonicalConcept,
      } =
        req.body;


      if (
        !label ||
        !label.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Field label is required",
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
          });
      }


      const entityType =
        await EntityType.findById(
          req.params.id
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


      const world =
        await getOwnedWorld(
          entityType.worldId,
          user._id
        );


      if (
        !world
      ) {
        return res
          .status(404)
          .json({
            message:
              "Entity type not found",
          });
      }


      const duplicate =
        entityType.fields.find(
          (field) =>
            field.label
              .trim()
              .toLowerCase() ===
            label
              .trim()
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
          });
      }


      const key =
        `field_${crypto
          .randomUUID()
          .replace(
            /-/gu,
            ""
          )}`;


      const cleanedOptions =
        type ===
        "select"
          ? (
              options ||
              []
            )
              .map(
                (option) =>
                  String(
                    option
                  )
                    .trim()
              )
              .filter(
                Boolean
              )
          : [];


      const newField = {
        key,

        label:
          label.trim(),

        type,

        required:
          Boolean(
            required
          ),

        canonicalConcept:
          canonicalConcept ||
          null,

        referenceEntityTypeId:
          type ===
          "entity-reference"
            ? referenceEntityTypeId ||
              null
            : null,

        options:
          cleanedOptions,

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


      res
        .status(201)
        .json(
          dto
        );
    } catch (error) {
      console.error(
        "Failed to add field:",
        error
      );


      res
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
// Update an existing field
// ======================================================

router.put(
  "/:id/fields/:fieldId",

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getDevUser();


      const {
        label,
        type,
        required,
        referenceEntityTypeId,
        options,
        canonicalConcept,
      } =
        req.body;


      const entityType =
        await EntityType.findById(
          req.params.id
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


      const world =
        await getOwnedWorld(
          entityType.worldId,
          user._id
        );


      if (
        !world
      ) {
        return res
          .status(404)
          .json({
            message:
              "Entity type not found",
          });
      }


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
          });
      }


      if (
        !label ||
        !label.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Field label is required",
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
          });
      }


      const duplicate =
        entityType.fields.find(
          (
            otherField
          ) =>
            otherField
              ._id
              .toString() !==
              field
                ._id
                .toString() &&
            otherField
              .label
              .trim()
              .toLowerCase() ===
              label
                .trim()
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
          });
      }


      field.label =
        label.trim();

      field.type =
        type;

      field.required =
        Boolean(
          required
        );


      /*
       * If canonicalConcept is omitted by the existing
       * frontend, preserve the current semantic mapping.
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
        type ===
        "entity-reference"
          ? referenceEntityTypeId ||
            null
          : null;


      field.options =
        type ===
        "select"
          ? (
              options ||
              []
            )
              .map(
                (option) =>
                  String(
                    option
                  )
                    .trim()
              )
              .filter(
                Boolean
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


      res.json(
        dto
      );
    } catch (error) {
      console.error(
        "Failed to update field:",
        error
      );


      res
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
// Delete a field
// ======================================================

router.delete(
  "/:id/fields/:fieldId",

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getDevUser();


      const entityType =
        await EntityType.findById(
          req.params.id
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


      const world =
        await getOwnedWorld(
          entityType.worldId,
          user._id
        );


      if (
        !world
      ) {
        return res
          .status(404)
          .json({
            message:
              "Entity type not found",
          });
      }


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


      res.json(
        dto
      );
    } catch (error) {
      console.error(
        "Failed to delete field:",
        error
      );


      res
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