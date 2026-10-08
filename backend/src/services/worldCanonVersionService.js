const World = require(
  "../models/World"
);


// ======================================================
// Bump World Canon Version
//
// This function should be called exactly once for one
// successful canonical mutation.
//
// It supports Mongoose sessions so Story Suggestion Apply
// can bump the version inside the same transaction as the
// underlying Entity / Relation / EntityType mutation.
// ======================================================

async function bumpWorldCanonVersion(
  worldId,
  {
    session =
      null,
  } = {}
) {
  if (
    !worldId
  ) {
    throw new Error(
      "bumpWorldCanonVersion requires worldId."
    );
  }


  let query =
    World.findByIdAndUpdate(
      worldId,
      {
        $inc: {
          canonVersion:
            1,
        },
      },
      {
        new:
          true,
      }
    );


  if (
    session
  ) {
    query =
      query.session(
        session
      );
  }


  const world =
    await query;


  if (
    !world
  ) {
    throw new Error(
      "World not found while bumping canonVersion."
    );
  }


  return world.canonVersion;
}


// ======================================================
// Read World Canon Version
// ======================================================

async function getWorldCanonVersion(
  worldId,
  {
    session =
      null,
  } = {}
) {
  let query =
    World.findById(
      worldId
    )
      .select(
        "canonVersion"
      );


  if (
    session
  ) {
    query =
      query.session(
        session
      );
  }


  const world =
    await query;


  if (
    !world
  ) {
    return null;
  }


  return (
    world.canonVersion ??
    0
  );
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  bumpWorldCanonVersion,
  getWorldCanonVersion,
};