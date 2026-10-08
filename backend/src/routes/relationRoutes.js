const express = require(
  "express"
);


const Relation = require(
  "../models/Relation"
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
// Get Relations for World
//
// GET /api/relations/world/:worldId
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
              "World not found.",
          });
      }


      const relations =
        await Relation.find({
          worldId:
            world._id,
        })
          .populate(
            "subjectEntityId",
            "name entityTypeId"
          )
          .populate(
            "objectEntityId",
            "name entityTypeId"
          )
          .populate(
            "sourceDocumentId",
            "title"
          )
          .sort({
            updatedAt:
              -1,
          });


      res.json(
        relations
      );
    } catch (error) {
      console.error(
        "Failed to load relations:",
        error
      );


      res
        .status(500)
        .json({
          message:
            "Failed to load relations.",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Delete Relation
//
// DELETE /api/relations/:relationId
// ======================================================

router.delete(
  "/:relationId",

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getDevUser();


      const relation =
        await Relation.findById(
          req.params.relationId
        );


      if (
        !relation
      ) {
        return res
          .status(404)
          .json({
            message:
              "Relation not found.",
          });
      }


      const world =
        await getOwnedWorld(
          relation.worldId,
          user._id
        );


      if (
        !world
      ) {
        return res
          .status(403)
          .json({
            message:
              "You do not have access to this relation.",
          });
      }


      await relation.deleteOne();


      const canonVersion =
        await bumpWorldCanonVersion(
          world._id
        );


      res.json({
        message:
          "Relation deleted.",

        canonVersion,
      });
    } catch (error) {
      console.error(
        "Failed to delete relation:",
        error
      );


      res
        .status(500)
        .json({
          message:
            "Failed to delete relation.",

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