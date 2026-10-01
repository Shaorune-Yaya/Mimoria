const express = require("express");

const Entity = require("../models/Entity");
const EntityType = require("../models/EntityType");

const router = express.Router();


// ======================================================
// 获取某个 World 的所有实体
// GET /api/entities/world/:worldId
// ======================================================

router.get("/world/:worldId", async (req, res) => {
  try {
    const entities = await Entity.find({
      worldId: req.params.worldId,
    })
      .populate(
        "entityTypeId",
        "name icon"
      )
      .sort({
        updatedAt: -1,
      });

    res.json(entities);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to get entities",
      error: error.message,
    });
  }
});


// ======================================================
// 获取某种 Entity Type 下的实体
// Entity Reference 字段以后会用到
//
// GET /api/entities/world/:worldId/type/:entityTypeId
// ======================================================

router.get(
  "/world/:worldId/type/:entityTypeId",
  async (req, res) => {
    try {
      const entities = await Entity.find({
        worldId: req.params.worldId,
        entityTypeId: req.params.entityTypeId,
      })
        .select("name entityTypeId")
        .sort({
          name: 1,
        });

      res.json(entities);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to get entities",
        error: error.message,
      });
    }
  }
);


// ======================================================
// 创建实体
// POST /api/entities
// ======================================================

router.post("/", async (req, res) => {
  try {
    const {
      worldId,
      entityTypeId,
      name,
      values,
    } = req.body;


    if (!worldId) {
      return res.status(400).json({
        message: "worldId is required",
      });
    }


    if (!entityTypeId) {
      return res.status(400).json({
        message: "entityTypeId is required",
      });
    }


    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Entity name is required",
      });
    }


    // 读取 Schema
    const entityType =
      await EntityType.findById(entityTypeId);


    if (!entityType) {
      return res.status(404).json({
        message: "Entity type not found",
      });
    }


    // 防止拿其他 World 的 Schema 创建实体
    if (
      entityType.worldId.toString() !== worldId
    ) {
      return res.status(400).json({
        message:
          "Entity type does not belong to this world",
      });
    }


    const submittedValues = values || {};

    const cleanedValues = {};


    // ==================================================
    // 按照 Schema 检查并整理用户输入
    // ==================================================

    for (const field of entityType.fields) {
      const value =
        submittedValues[field.key];


      // Required 检查
      if (field.required) {
        const isEmpty =
          value === undefined ||
          value === null ||
          value === "";

        if (isEmpty) {
          return res.status(400).json({
            message: `${field.label} is required`,
          });
        }
      }


      // 没填写的非必填字段可以跳过
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        continue;
      }


      // Number
      if (field.type === "number") {
        const numberValue = Number(value);

        if (Number.isNaN(numberValue)) {
          return res.status(400).json({
            message: `${field.label} must be a number`,
          });
        }

        cleanedValues[field.key] =
          numberValue;

        continue;
      }


      // Boolean
      if (field.type === "boolean") {
        cleanedValues[field.key] =
          Boolean(value);

        continue;
      }


      // Dropdown
      if (field.type === "select") {
        if (
          !field.options.includes(value)
        ) {
          return res.status(400).json({
            message: `Invalid option for ${field.label}`,
          });
        }

        cleanedValues[field.key] = value;

        continue;
      }


      // 其他类型目前直接保存
      cleanedValues[field.key] = value;
    }


    const entity = new Entity({
      worldId,
      entityTypeId,
      name: name.trim(),
      values: cleanedValues,
    });


    const savedEntity =
      await entity.save();


    const populatedEntity =
      await Entity.findById(
        savedEntity._id
      ).populate(
        "entityTypeId",
        "name icon"
      );


    res.status(201).json(
      populatedEntity
    );
  } catch (error) {
    console.error(
      "Failed to create entity:",
      error
    );

    res.status(500).json({
      message: "Failed to create entity",
      error: error.message,
    });
  }
});


module.exports = router;