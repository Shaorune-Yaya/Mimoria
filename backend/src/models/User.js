const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
      required: true,
      trim: true,
    },

    // Reserved for the future authentication system.
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    // Reserved for the future authentication system.
    // Never store plaintext passwords here.
    passwordHash: {
      type: String,
    },

    // Temporary flag used during development before real login exists.
    isDevelopmentUser: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Only real email strings must be unique.
userSchema.index(
  {
    email: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      email: {
        $type: "string",
      },
    },
  }
);

// Mimoria should only have one temporary development user.
userSchema.index(
  {
    isDevelopmentUser: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      isDevelopmentUser: true,
    },
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;