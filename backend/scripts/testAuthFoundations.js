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


const {
  validatePassword,
  hashPassword,
  verifyPassword,
} = require(
  "../src/services/passwordService"
);


const {
  createVerificationChallenge,
  verifyVerificationCodeHash,
  isVerificationExpired,
} = require(
  "../src/utils/verificationCode"
);


const {
  validateInviteCode,
} = require(
  "../src/services/inviteService"
);


const {
  createAuthToken,
  verifyAuthToken,
} = require(
  "../src/utils/authToken"
);


// ======================================================
// Assertions
// ======================================================

function assert(
  condition,
  message
) {
  if (
    !condition
  ) {
    throw new Error(
      message
    );
  }
}


// ======================================================
// Test
// ======================================================

async function run() {
  try {
    console.log(
      "\n=== Mimoria Auth Foundation Test ===\n"
    );


    if (
      !process.env
        .MONGODB_URI
    ) {
      throw new Error(
        "MONGODB_URI is missing."
      );
    }


    if (
      !process.env
        .JWT_SECRET
    ) {
      throw new Error(
        "JWT_SECRET is missing."
      );
    }


    if (
      !process.env
        .EMAIL_CODE_SECRET
    ) {
      throw new Error(
        "EMAIL_CODE_SECRET is missing."
      );
    }


    await mongoose.connect(
      process.env.MONGODB_URI
    );


    console.log(
      "MongoDB connected."
    );


    // ==================================================
    // Password
    // ==================================================

    const password =
      "MimoriaTestPassword123!";


    validatePassword(
      password
    );


    const passwordHash =
      await hashPassword(
        password
      );


    assert(
      passwordHash !==
        password,

      "Password was not hashed."
    );


    assert(
      await verifyPassword(
        password,
        passwordHash
      ),

      "Correct password failed verification."
    );


    assert(
      !(
        await verifyPassword(
          "WrongPassword",
          passwordHash
        )
      ),

      "Incorrect password passed verification."
    );


    console.log(
      "PASS: Password hashing"
    );


    // ==================================================
    // Verification Code
    // ==================================================

    const challenge =
      createVerificationChallenge();


    console.log(
      "Generated test verification code:",
      challenge.code
    );


    assert(
      /^\d{6}$/u.test(
        challenge.code
      ),

      "Verification code is not six digits."
    );


    assert(
      verifyVerificationCodeHash(
        challenge.code,
        challenge.codeHash
      ),

      "Verification code hash failed."
    );


    assert(
      !verifyVerificationCodeHash(
        "000000" ===
          challenge.code
          ? "111111"
          : "000000",

        challenge.codeHash
      ),

      "Incorrect verification code passed."
    );


    assert(
      !isVerificationExpired(
        challenge.expiresAt
      ),

      "New verification challenge is already expired."
    );


    console.log(
      "PASS: Verification codes"
    );


    // ==================================================
    // Invite
    // ==================================================

    const inviteConfiguration =
      require(
        "../private/betaInvites.json"
      );


    const firstInviteCode =
      Object.keys(
        inviteConfiguration
      )[0];


    assert(
      firstInviteCode,

      "betaInvites.json does not contain an invite code."
    );


    const invite =
      await validateInviteCode(
        firstInviteCode
      );


    console.log(
      "Invite:",
      invite
    );


    assert(
      invite.code ===
        firstInviteCode,

      "Invite validation returned the wrong code."
    );


    console.log(
      "PASS: Beta invite validation"
    );


    // ==================================================
    // JWT
    //
    // Use an existing dev user or a temporary in-memory
    // object with a valid MongoDB ObjectId.
    // ==================================================

    const existingUser =
      await User.findOne();


    const fakeUser =
      existingUser ||
      {
        _id:
          new mongoose
            .Types
            .ObjectId(),
      };


    const token =
      createAuthToken(
        fakeUser
      );


    assert(
      typeof token ===
        "string" &&
      token.length >
        20,

      "JWT was not created."
    );


    const decoded =
      verifyAuthToken(
        token
      );


    assert(
      decoded,

      "JWT failed verification."
    );


    assert(
      String(
        decoded.sub
      ) ===
        String(
          fakeUser._id
        ),

      "JWT user ID does not match."
    );


    console.log(
      "PASS: JWT authentication token"
    );


    console.log(
      "\nAll auth foundation tests passed.\n"
    );
  } finally {
    await mongoose
      .disconnect()
      .catch(
        () => {}
      );
  }
}


// ======================================================
// Run
// ======================================================

run()
  .catch(
    (error) => {
      console.error(
        "\nAuth foundation test FAILED:\n"
      );


      console.error(
        error
      );


      process.exitCode =
        1;
    }
  );