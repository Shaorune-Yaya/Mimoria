const express =
  require(
    "express"
  );


const World =
  require(
    "../models/World"
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
//
// Every World route requires a real authenticated user.
//
// req.user is populated by requireAuth.
// ======================================================

router.use(
  requireAuth
);


// ======================================================
// Get All Worlds
//
// GET /api/worlds
//
// Returns only Worlds owned by the authenticated user.
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
//
// Body:
//
// {
//   name,
//   description?,
//   icon?
// }
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
// Get One World
//
// GET /api/worlds/:id
//
// Only returns the World when it belongs to req.user.
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
        /*
         * Return 404 instead of 403.
         *
         * This avoids revealing whether another user's
         * private World ID exists.
         */
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


module.exports =
  router;