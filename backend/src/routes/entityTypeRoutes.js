const express = require("express");
const crypto = require("crypto");
const EntityType = require("../models/EntityType");

const router = express.Router();


// 获取某个 World 的所有 Entity Types
router.get("/world/:worldId", async (req, res) => {
  try {
    const entityTypes = await EntityType.find({
      worldId: req.params.worldId,
    }).sort({
      createdAt: 1,
    });

    res.json(entityTypes);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get entity types",
      error: error.message,
    });
  }
});


// 创建 Entity Type
router.post("/", async (req, res) => {
  try {
    const {
      worldId,
      name,
      description,
      icon,
    } = req.body;

    if (!worldId) {
      return res.status(400).json({
        message: "worldId is required",
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Entity type name is required",
      });
    }

    const entityType = new EntityType({
      worldId,
      name: name.trim(),
      description,
      icon,
    });

    const savedEntityType =
      await entityType.save();

    res.status(201).json(savedEntityType);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create entity type",
      error: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const entityType = await EntityType.findById(
      req.params.id
    );

    if (!entityType) {
      return res.status(404).json({
        message: "Entity type not found",
      });
    }

    res.json(entityType);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get entity type",
      error: error.message,
    });
  }
});

router.post("/:id/fields", async (req, res) => {
  try {
    const {
      label,
      type,
      required,
      referenceEntityTypeId,
      options,
    } = req.body;

    if (!label || !label.trim()) {
      return res.status(400).json({
        message: "Field label is required",
      });
    }

    if (!type) {
      return res.status(400).json({
        message: "Field type is required",
      });
    }

    const entityType = await EntityType.findById(
      req.params.id
    );

    if (!entityType) {
      return res.status(404).json({
        message: "Entity type not found",
      });
    }

    const duplicate = entityType.fields.find(
      (field) =>
        field.label.trim().toLowerCase() ===
        label.trim().toLowerCase()
    );

    if (duplicate) {
      return res.status(400).json({
        message: "A field with this name already exists",
      });
    }

    const key = `field_${crypto
      .randomUUID()
      .replace(/-/g, "")}`;

    const cleanedOptions =
      type === "select"
        ? (options || [])
            .map((option) => option.trim())
            .filter(Boolean)
        : [];

    const newField = {
      key,

      label: label.trim(),

      type,

      required: Boolean(required),

      referenceEntityTypeId:
        type === "entity-reference"
          ? referenceEntityTypeId || null
          : null,

      options: cleanedOptions,

      order: entityType.fields.length,
    };

    entityType.fields.push(newField);

    await entityType.save();

    res.status(201).json(entityType);
  } catch (error) {
    console.error("Failed to add field:");
    console.error(error);

    res.status(500).json({
      message: "Failed to add field",
      error: error.message,
    });
  }
});

router.put("/:id/fields/:fieldId", async (req, res) => {
  try {
    const {
      label,
      type,
      required,
      referenceEntityTypeId,
      options,
    } = req.body;

    const entityType = await EntityType.findById(
      req.params.id
    );

    if (!entityType) {
      return res.status(404).json({
        message: "Entity type not found",
      });
    }

    const field = entityType.fields.id(
      req.params.fieldId
    );

    if (!field) {
      return res.status(404).json({
        message: "Field not found",
      });
    }

    if (!label || !label.trim()) {
      return res.status(400).json({
        message: "Field label is required",
      });
    }

    const duplicate = entityType.fields.find(
      (otherField) =>
        otherField._id.toString() !==
          field._id.toString() &&
        otherField.label
          .trim()
          .toLowerCase() ===
          label.trim().toLowerCase()
    );

    if (duplicate) {
      return res.status(400).json({
        message: "A field with this name already exists",
      });
    }

    field.label = label.trim();
    field.type = type;
    field.required = Boolean(required);

    field.referenceEntityTypeId =
      type === "entity-reference"
        ? referenceEntityTypeId || null
        : null;

    field.options =
      type === "select"
        ? (options || [])
            .map((option) => option.trim())
            .filter(Boolean)
        : [];

    await entityType.save();

    res.json(entityType);
  } catch (error) {
    console.error("Failed to update field:");
    console.error(error);

    res.status(500).json({
      message: "Failed to update field",
      error: error.message,
    });
  }
});

router.delete(
  "/:id/fields/:fieldId",
  async (req, res) => {
    try {
      const entityType =
        await EntityType.findById(req.params.id);

      if (!entityType) {
        return res.status(404).json({
          message: "Entity type not found",
        });
      }

      const field = entityType.fields.id(
        req.params.fieldId
      );

      if (!field) {
        return res.status(404).json({
          message: "Field not found",
        });
      }

      field.deleteOne();

      await entityType.save();

      res.json(entityType);
    } catch (error) {
      console.error("Failed to delete field:");
      console.error(error);

      res.status(500).json({
        message: "Failed to delete field",
        error: error.message,
      });
    }
  }
);

module.exports = router;