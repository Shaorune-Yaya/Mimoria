const dns =
  require(
    "dns"
  );

const dotenv =
  require(
    "dotenv"
  );

const mongoose =
  require(
    "mongoose"
  );


dotenv.config();


dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);


const User =
  require(
    "../src/models/User"
  );

const World =
  require(
    "../src/models/World"
  );


async function main() {
  if (
    !process.env.MONGODB_URI
  ) {
    throw new Error(
      "MONGODB_URI is missing."
    );
  }


  await mongoose.connect(
    process.env.MONGODB_URI
  );


  const users =
    await User
      .find({})
      .lean();


  const worlds =
    await World
      .find({})
      .lean();


  console.log(
    "\n===== USERS =====\n"
  );


  for (
    const user of users
  ) {
    console.log({
      id:
        String(
          user._id
        ),

      username:
        user.username,

      email:
        user.email,

      displayName:
        user.displayName,

      role:
        user.role,

      status:
        user.status,

      isDevelopmentUser:
        user.isDevelopmentUser,
    });
  }


  console.log(
    "\n===== WORLDS =====\n"
  );


  for (
    const world of worlds
  ) {
    console.log({
      id:
        String(
          world._id
        ),

      name:
        world.name,

      ownerId:
        world.ownerId
          ? String(
              world.ownerId
            )
          : null,

      canonVersion:
        world.canonVersion,
    });
  }


  console.log(
    "\n===== WORLD OWNERS =====\n"
  );


  for (
    const world of worlds
  ) {
    const owner =
      users.find(
        (user) =>
          String(
            user._id
          ) ===
          String(
            world.ownerId
          )
      );


    console.log({
      world:
        world.name,

      worldId:
        String(
          world._id
        ),

      ownerId:
        world.ownerId
          ? String(
              world.ownerId
            )
          : null,

      ownerUsername:
        owner?.username ||
        null,

      ownerEmail:
        owner?.email ||
        null,

      ownerDisplayName:
        owner?.displayName ||
        null,

      ownerRole:
        owner?.role ||
        null,

      ownerIsDevelopmentUser:
        owner
          ?.isDevelopmentUser ??
        null,
    });
  }
}


main()
  .catch(
    (error) => {
      console.error(
        "\nWorld owner check failed:\n"
      );

      console.error(
        error
      );

      process.exitCode =
        1;
    }
  )
  .finally(
    async () => {
      await mongoose
        .disconnect()
        .catch(
          () => {}
        );
    }
  );