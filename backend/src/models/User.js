const mongoose = require(
  "mongoose"
);


// ======================================================
// Constants
// ======================================================

const USER_ROLES = [
  "user",
  "admin",
];


const USER_STATUSES = [
  "active",
  "suspended",
];


// ======================================================
// Email Verification
// ======================================================

const emailVerificationSchema =
  new mongoose.Schema(
    {
      codeHash: {
        type:
          String,

        default:
          null,
      },

      expiresAt: {
        type:
          Date,

        default:
          null,
      },

      lastSentAt: {
        type:
          Date,

        default:
          null,
      },

      failedAttempts: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },
    },
    {
      _id:
        false,
    }
  );


// ======================================================
// User
// ======================================================

const userSchema =
  new mongoose.Schema(
    {
      // ------------------------------------------------
      // Login Identity
      // ------------------------------------------------

      username: {
        type:
          String,

        trim:
          true,

        default:
          null,

        minlength:
          3,

        maxlength:
          24,
      },


      email: {
        type:
          String,

        trim:
          true,

        lowercase:
          true,

        default:
          null,

        maxlength:
          254,
      },


      passwordHash: {
        type:
          String,

        default:
          null,

        select:
          false,
      },


      // ------------------------------------------------
      // Public Profile
      //
      // username:
      // unique account/login name
      //
      // displayName:
      // visible name shown inside Mimoria
      // ------------------------------------------------

      displayName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },


      // ------------------------------------------------
      // Email Verification
      // ------------------------------------------------

      emailVerified: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },


      emailVerification: {
        type:
          emailVerificationSchema,

        default:
          () => ({
            codeHash:
              null,

            expiresAt:
              null,

            lastSentAt:
              null,

            failedAttempts:
              0,
          }),
      },


      // ------------------------------------------------
      // Beta Access
      // ------------------------------------------------

      inviteCode: {
        type:
          String,

        trim:
          true,

        default:
          null,
      },


      inviteAcceptedAt: {
        type:
          Date,

        default:
          null,
      },


      // ------------------------------------------------
      // Account State
      // ------------------------------------------------

      role: {
        type:
          String,

        enum:
          USER_ROLES,

        default:
          "user",

        index:
          true,
      },


      status: {
        type:
          String,

        enum:
          USER_STATUSES,

        default:
          "active",

        index:
          true,
      },


      lastLoginAt: {
        type:
          Date,

        default:
          null,
      },


      // =================================================
      // Development Compatibility
      //
      // Keep this while Mimoria is migrating away from
      // getDevUser().
      //
      // The temporary development user does not need:
      //
      // email
      // username
      // password
      //
      // and therefore those fields intentionally are NOT
      // globally required in this model.
      // =================================================

      isDevelopmentUser: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },
    },
    {
      timestamps:
        true,

      minimize:
        false,
    }
  );


// ======================================================
// Indexes
// ======================================================

/*
 * Real registered users must have unique emails.
 *
 * The development user has no email, so a partial index
 * lets it continue existing safely.
 */
userSchema.index(
  {
    email:
      1,
  },
  {
    unique:
      true,

    partialFilterExpression: {
      email: {
        $type:
          "string",
      },
    },
  }
);


/*
 * Usernames are also unique.
 *
 * Case normalization will be handled before registration.
 */
userSchema.index(
  {
    username:
      1,
  },
  {
    unique:
      true,

    partialFilterExpression: {
      username: {
        $type:
          "string",
      },
    },
  }
);


// ======================================================
// Instance Helpers
// ======================================================

userSchema.methods.isRealAccount =
  function isRealAccount() {
    return Boolean(
      !this.isDevelopmentUser &&
      this.email &&
      this.username &&
      this.passwordHash
    );
  };


userSchema.methods.clearEmailVerification =
  function clearEmailVerification() {
    this.emailVerification = {
      codeHash:
        null,

      expiresAt:
        null,

      lastSentAt:
        null,

      failedAttempts:
        0,
    };


    return this;
  };


// ======================================================
// Static Constants
// ======================================================

userSchema.statics.USER_ROLES =
  USER_ROLES;


userSchema.statics.USER_STATUSES =
  USER_STATUSES;


// ======================================================
// Model
// ======================================================

const User =
  mongoose.models.User ||
  mongoose.model(
    "User",
    userSchema
  );


module.exports =
  User;