const User = require("../models/User");
const World = require("../models/World");

// Get or create the temporary Mimoria development user.
async function getDevUser() {
  try {
    const user = await User.findOneAndUpdate(
      {
        isDevelopmentUser: true,
      },
      {
        $setOnInsert: {
          displayName: "Mimoria Developer",
          isDevelopmentUser: true,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return user;
  } catch (error) {
    if (error.code === 11000) {
      return User.findOne({
        isDevelopmentUser: true,
      });
    }

    throw error;
  }
}

// Assign legacy worlds without an owner to the development user.
async function claimLegacyWorlds(userId) {
  await World.updateMany(
    {
      $or: [
        {
          ownerId: {
            $exists: false,
          },
        },
        {
          ownerId: null,
        },
      ],
    },
    {
      $set: {
        ownerId: userId,
      },
    }
  );
}

// Return a world only if it belongs to the current development user.
// Legacy worlds are automatically assigned to that user.
async function getOwnedWorld(
  worldId,
  userId
) {
  const world =
    await World.findById(
      worldId
    );

  if (!world) {
    return null;
  }

  if (!world.ownerId) {
    world.ownerId =
      userId;

    await world.save();

    return world;
  }

  if (
    world.ownerId.toString() !==
    userId.toString()
  ) {
    return null;
  }

  return world;
}

module.exports = {
  getDevUser,
  claimLegacyWorlds,
  getOwnedWorld,
};