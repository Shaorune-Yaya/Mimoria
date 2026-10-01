const express = require("express");
const World = require("../models/World");

const router = express.Router();


// Get all worlds
router.get("/", async (req, res) => {
  try {
    const worlds = await World.find().sort({
      updatedAt: -1,
    });

    res.json(worlds);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get worlds",
      error: error.message,
    });
  }
});


// Create a new world
router.post("/", async (req, res) => {
  try {
    const { name, description, icon } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "World name is required",
      });
    }

    const world = new World({
      name,
      description,
      icon,
    });

    const savedWorld = await world.save();

    res.status(201).json(savedWorld);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create world",
      error: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const world = await World.findById(req.params.id);

    if (!world) {
      return res.status(404).json({
        message: "World not found",
      });
    }

    res.json(world);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get world",
      error: error.message,
    });
  }
});

module.exports = router;