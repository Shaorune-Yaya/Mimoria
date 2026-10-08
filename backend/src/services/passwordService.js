const bcrypt =
  require(
    "bcryptjs"
  );


// ======================================================
// Constants
// ======================================================

const PASSWORD_MIN_LENGTH =
  8;

const PASSWORD_MAX_LENGTH =
  128;

const BCRYPT_ROUNDS =
  12;


// ======================================================
// Error
// ======================================================

class PasswordValidationError
  extends Error {
  constructor(
    message,
    {
      code =
        "INVALID_PASSWORD",

      details =
        null,
    } = {}
  ) {
    super(
      message
    );


    this.name =
      "PasswordValidationError";

    this.code =
      code;

    this.details =
      details;
  }
}


// ======================================================
// Validate Password
// ======================================================

function validatePassword(
  password
) {
  if (
    typeof password !==
    "string"
  ) {
    throw new PasswordValidationError(
      "Password must be a string."
    );
  }


  if (
    password.length <
    PASSWORD_MIN_LENGTH
  ) {
    throw new PasswordValidationError(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
      {
        code:
          "PASSWORD_TOO_SHORT",

        details: {
          minimum:
            PASSWORD_MIN_LENGTH,
        },
      }
    );
  }


  if (
    password.length >
    PASSWORD_MAX_LENGTH
  ) {
    throw new PasswordValidationError(
      `Password must be no more than ${PASSWORD_MAX_LENGTH} characters long.`,
      {
        code:
          "PASSWORD_TOO_LONG",

        details: {
          maximum:
            PASSWORD_MAX_LENGTH,
        },
      }
    );
  }


  return true;
}


// ======================================================
// Hash Password
// ======================================================

async function hashPassword(
  password
) {
  validatePassword(
    password
  );


  return bcrypt.hash(
    password,
    BCRYPT_ROUNDS
  );
}


// ======================================================
// Verify Password
// ======================================================

async function verifyPassword(
  password,
  passwordHash
) {
  if (
    typeof password !==
      "string" ||
    typeof passwordHash !==
      "string" ||
    !passwordHash
  ) {
    return false;
  }


  try {
    return await bcrypt.compare(
      password,
      passwordHash
    );
  } catch {
    return false;
  }
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  BCRYPT_ROUNDS,

  PasswordValidationError,

  validatePassword,
  hashPassword,
  verifyPassword,
};