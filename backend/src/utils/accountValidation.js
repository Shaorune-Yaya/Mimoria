// ======================================================
// Mimoria Account Validation
// ======================================================


// ======================================================
// Constants
// ======================================================

const USERNAME_MIN_LENGTH =
  3;

const USERNAME_MAX_LENGTH =
  24;


// ======================================================
// Validation Error
// ======================================================

class AccountValidationError
  extends Error {
  constructor(
    message,
    {
      code =
        "ACCOUNT_VALIDATION_FAILED",

      details =
        null,
    } = {}
  ) {
    super(
      message
    );


    this.name =
      "AccountValidationError";

    this.code =
      code;

    this.details =
      details;
  }
}


// ======================================================
// Email
// ======================================================

function normalizeEmail(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


function validateEmail(
  value
) {
  const email =
    normalizeEmail(
      value
    );


  if (
    !email
  ) {
    throw new AccountValidationError(
      "Email is required.",
      {
        code:
          "EMAIL_REQUIRED",
      }
    );
  }


  /*
   * Intentionally practical rather than attempting to
   * reproduce the complete RFC email grammar.
   */
  const valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(
      email
    );


  if (
    !valid
  ) {
    throw new AccountValidationError(
      "Email address is invalid.",
      {
        code:
          "INVALID_EMAIL",
      }
    );
  }


  if (
    email.length >
    254
  ) {
    throw new AccountValidationError(
      "Email address is too long.",
      {
        code:
          "EMAIL_TOO_LONG",
      }
    );
  }


  return email;
}


// ======================================================
// Username
// ======================================================

function normalizeUsername(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


function validateUsername(
  value
) {
  const username =
    normalizeUsername(
      value
    );


  if (
    !username
  ) {
    throw new AccountValidationError(
      "Username is required.",
      {
        code:
          "USERNAME_REQUIRED",
      }
    );
  }


  if (
    username.length <
    USERNAME_MIN_LENGTH
  ) {
    throw new AccountValidationError(
      `Username must be at least ${USERNAME_MIN_LENGTH} characters long.`,
      {
        code:
          "USERNAME_TOO_SHORT",
      }
    );
  }


  if (
    username.length >
    USERNAME_MAX_LENGTH
  ) {
    throw new AccountValidationError(
      `Username must be no more than ${USERNAME_MAX_LENGTH} characters long.`,
      {
        code:
          "USERNAME_TOO_LONG",
      }
    );
  }


  /*
   * Beta rule:
   *
   * a-z
   * 0-9
   * underscore
   * hyphen
   */
  if (
    !/^[a-z0-9_-]+$/u.test(
      username
    )
  ) {
    throw new AccountValidationError(
      "Username may only contain letters, numbers, underscores, and hyphens.",
      {
        code:
          "INVALID_USERNAME",
      }
    );
  }


  return username;
}


// ======================================================
// Display Name
// ======================================================

function normalizeDisplayName(
  value,
  fallbackUsername = ""
) {
  const displayName =
    String(
      value || ""
    )
      .trim();


  if (
    displayName
  ) {
    return displayName.slice(
      0,
      80
    );
  }


  return String(
    fallbackUsername ||
    ""
  )
    .trim()
    .slice(
      0,
      80
    );
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,

  AccountValidationError,

  normalizeEmail,
  validateEmail,

  normalizeUsername,
  validateUsername,

  normalizeDisplayName,
};