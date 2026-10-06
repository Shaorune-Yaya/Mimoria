const express = require("express");

const World = require("../models/World");

const {
  getDevUser,
  claimLegacyWorlds,
  getOwnedWorld,
} = require("../utils/devUser");

const router = express.Router();

// Get all worlds owned by the current development user.
router.get("/", async (req, res) => {
  try {
    const user = await getDevUser();

    // Automatically migrate worlds created before ownerId existed.
    await claimLegacyWorlds(user._id);

    const worlds = await World.find({
      ownerId: user._id,
    }).sort({
      updatedAt: -1,
    });

    res.json(worlds);
  } catch (error) {
    console.error("Failed to get worlds:", error);

    res.status(500).json({
      message: "Failed to get worlds",
      error: error.message,
    });
  }
});

// Create a new world.
router.post("/", async (req, res) => {
  try {
    const user = await getDevUser();

    const {
      name,
      description,
      icon,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "World name is required",
      });
    }

    const world = new World({
      ownerId: user._id,
      name: name.trim(),
      description,
      icon,
    });

    const savedWorld = await world.save();

    res.status(201).json(savedWorld);
  } catch (error) {
    console.error("Failed to create world:", error);

    res.status(500).json({
      message: "Failed to create world",
      error: error.message,
    });
  }
});

// Get one world owned by the current development user.
router.get("/:id", async (req, res) => {
  try {
    const user = await getDevUser();

    const world = await getOwnedWorld(
      req.params.id,
      user._id
    );

    if (!world) {
      return res.status(404).json({
        message: "World not found",
      });
    }

    res.json(world);
  } catch (error) {
    console.error("Failed to get world:", error);

    res.status(500).json({
      message: "Failed to get world",
      error: error.message,
    });
  }
});

module.exports = router;