require(
  "dotenv"
).config();

const mongoose =
  require(
    "mongoose"
  );

const User =
  require(
    "../src/models/User"
  );
  
const dns = require("dns");
dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

const {
  hashPassword,
} = require(
  "../src/services/passwordService"
);


// ======================================================
// Configuration
// ======================================================

const ADMIN_USERNAME =
  "admin";


const NEW_PASSWORD =
  "zht2581258";


// ======================================================
// Reset Admin Password
// ======================================================

async function resetAdminPassword() {
  const mongoUri =
    process.env
      .MONGODB_URI ||
    process.env
      .MONGO_URI;


  if (
    !mongoUri
  ) {
    throw new Error(
      "MONGODB_URI or MONGO_URI is missing from .env."
    );
  }


  await mongoose.connect(
    mongoUri
  );


  console.log(
    "Connected to MongoDB."
  );


  const user =
    await User
      .findOne({
        username:
          ADMIN_USERNAME,
      })
      .select(
        "+passwordHash"
      );


  if (
    !user
  ) {
    throw new Error(
      `User "${ADMIN_USERNAME}" was not found.`
    );
  }


  console.log(
    "Found user:",
    user.username
  );


  console.log(
    "Email:",
    user.email
  );


  console.log(
    "Role:",
    user.role
  );


  user.passwordHash =
    await hashPassword(
      NEW_PASSWORD
    );


  await user.save();


  console.log(
    ""
  );


  console.log(
    "========================================"
  );


  console.log(
    "Admin password reset successfully."
  );


  console.log(
    "Username:",
    user.username
  );


  console.log(
    "New password:",
    NEW_PASSWORD
  );


  console.log(
    "========================================"
  );
}


// ======================================================
// Run
// ======================================================

resetAdminPassword()
  .catch(
    (error) => {
      console.error(
        "Failed to reset admin password:",
        error
      );


      process.exitCode =
        1;
    }
  )
  .finally(
    async () => {
      await mongoose.disconnect();


      console.log(
        "Disconnected from MongoDB."
      );
    }
  );