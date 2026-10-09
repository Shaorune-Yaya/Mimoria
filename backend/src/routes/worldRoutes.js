const express =
  require(
    "express"
  );


const World =
  require(
    "../models/World"
  );


const EntityType =
  require(
    "../models/EntityType"
  );


const Entity =
  require(
    "../models/Entity"
  );


const TreeNode =
  require(
    "../models/TreeNode"
  );


const Document =
  require(
    "../models/Document"
  );


const DocumentNode =
  require(
    "../models/DocumentNode"
  );


const Relation =
  require(
    "../models/Relation"
  );


const StorySyncCandidate =
  require(
    "../models/StorySyncCandidate"
  );


const {
  requireAuth,
} = require(
  "../middleware/requireAuth"
);


const {
  getOwnedWorld,
} = require(
  "../utils/devUser"
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
// Get All Worlds
//
// GET /api/worlds
// ======================================================

router.get(
  "/",

  async (
    req,
    res
  ) => {
    try {
      const user =
        req.user;


      const worlds =
        await World
          .find({
            ownerId:
              user._id,
          })
          .sort({
            updatedAt:
              -1,
          });


      return res.json(
        worlds
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to get worlds:",
        error
      );


      return res
        .status(500)
        .json({
          message:
            "Failed to get worlds",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Create World
//
// POST /api/worlds
// ======================================================

router.post(
  "/",

  async (
    req,
    res
  ) => {
    try {
      const user =
        req.user;


      const {
        name,
        description,
        icon,
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
              "World name is required",

            code:
              "WORLD_NAME_REQUIRED",
          });
      }


      const world =
        new World({
          ownerId:
            user._id,

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
              : "🌍",
        });


      const savedWorld =
        await world.save();


      return res
        .status(201)
        .json(
          savedWorld
        );
    } catch (
      error
    ) {
      console.error(
        "Failed to create world:",
        error
      );


      return res
        .status(500)
        .json({
          message:
            "Failed to create world",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Create Tutorial World
//
// POST /api/worlds/tutorial
// ======================================================

router.post(
  "/tutorial",

  async (
    req,
    res
  ) => {
    try {
      const user =
        req.user;


      const existingTutorialWorld =
        await World.findOne({
          ownerId:
            user._id,

          "settings.isOnboardingWorld":
            true,
        });


      if (
        existingTutorialWorld
      ) {
        return res.json(
          existingTutorialWorld
        );
      }


      const {
        name,
        description,
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
              "Tutorial world name is required.",

            code:
              "TUTORIAL_WORLD_NAME_REQUIRED",
          });
      }


      const world =
        new World({
          ownerId:
            user._id,

          name:
            normalizedName,

          description:
            typeof description ===
            "string"
              ? description
              : "",

          icon:
            "🌱",

          settings: {
            isOnboardingWorld:
              true,
          },
        });


      const savedWorld =
        await world.save();


      return res
        .status(201)
        .json(
          savedWorld
        );
    } catch (
      error
    ) {
      console.error(
        "Failed to create tutorial world:",
        error
      );


      return res
        .status(500)
        .json({
          message:
            "Failed to create tutorial world",

          code:
            "TUTORIAL_WORLD_CREATE_FAILED",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Get One World
//
// GET /api/worlds/:id
// ======================================================

router.get(
  "/:id",

  async (
    req,
    res
  ) => {
    try {
      const user =
        req.user;


      const world =
        await getOwnedWorld(
          req.params.id,
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

            code:
              "WORLD_NOT_FOUND",
          });
      }


      return res.json(
        world
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to get world:",
        error
      );


      return res
        .status(500)
        .json({
          message:
            "Failed to get world",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Delete World
//
// DELETE /api/worlds/:id
//
// Deletes all data directly belonging to the World.
// Ownership is checked before anything is removed.
// ======================================================

router.delete(
  "/:id",

  async (
    req,
    res
  ) => {
    try {
      const user =
        req.user;


      const world =
        await getOwnedWorld(
          req.params.id,
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

            code:
              "WORLD_NOT_FOUND",
          });
      }


      const worldId =
        world._id;


      /*
       * Delete World-owned child data first.
       */

      await Promise.all([
        StorySyncCandidate.deleteMany({
          worldId,
        }),

        Relation.deleteMany({
          worldId,
        }),

        DocumentNode.deleteMany({
          worldId,
        }),

        Document.deleteMany({
          worldId,
        }),

        TreeNode.deleteMany({
          worldId,
        }),

        Entity.deleteMany({
          worldId,
        }),

        EntityType.deleteMany({
          worldId,
        }),
      ]);


      await World.deleteOne({
        _id:
          worldId,

        ownerId:
          user._id,
      });


      return res.json({
        success:
          true,

        deletedWorldId:
          String(
            worldId
          ),
      });
    } catch (
      error
    ) {
      console.error(
        "Failed to delete world:",
        error
      );


      return res
        .status(500)
        .json({
          message:
            "Failed to delete world",

          code:
            "WORLD_DELETE_FAILED",

          error:
            error.message,
        });
    }
  }
);


module.exports =
  router;