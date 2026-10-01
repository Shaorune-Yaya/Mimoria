const express = require("express");
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


module.exports = router;