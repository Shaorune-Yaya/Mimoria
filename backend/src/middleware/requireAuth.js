const User =
  require(
    "../models/User"
  );


const {
  AUTH_COOKIE_NAME,

  verifyAuthToken,
} = require(
  "../utils/authToken"
);


// ======================================================
// Authentication Error
// ======================================================

class AuthenticationError
  extends Error {
  constructor(
    message,
    {
      code =
        "AUTHENTICATION_REQUIRED",

      statusCode =
        401,

      details =
        null,
    } = {}
  ) {
    super(
      message
    );


    this.name =
      "AuthenticationError";

    this.code =
      code;

    this.statusCode =
      statusCode;

    this.details =
      details;
  }
}


// ======================================================
// Get Session User
//
// Does not write a response.
//
// Useful for:
//
// - requireAuth middleware
// - /api/auth/me
// - future optional authentication
// ======================================================

async function getSessionUser(
  req
) {
  const token =
    req.cookies?.[
      AUTH_COOKIE_NAME
    ];


  if (
    !token
  ) {
    return null;
  }


  const payload =
    verifyAuthToken(
      token
    );


  if (
    !payload?.sub
  ) {
    return null;
  }


  const user =
    await User.findById(
      payload.sub
    );


  if (
    !user
  ) {
    return null;
  }


  return user;
}


// ======================================================
// Require Authentication
// ======================================================

async function requireAuth(
  req,
  res,
  next
) {
  try {
    const user =
      await getSessionUser(
        req
      );


    if (
      !user
    ) {
      return res
        .status(401)
        .json({
          message:
            "Authentication is required.",

          code:
            "AUTHENTICATION_REQUIRED",
        });
    }


    if (
      user.status !==
      "active"
    ) {
      return res
        .status(403)
        .json({
          message:
            "This account is not active.",

          code:
            "ACCOUNT_NOT_ACTIVE",
        });
    }


    if (
      !user.emailVerified &&
      !user.isDevelopmentUser
    ) {
      return res
        .status(403)
        .json({
          message:
            "Email verification is required.",

          code:
            "EMAIL_NOT_VERIFIED",
        });
    }


    req.user =
      user;


    next();
  } catch (
    error
  ) {
    console.error(
      "Authentication middleware failed:",
      error
    );


    return res
      .status(500)
      .json({
        message:
          "Authentication check failed.",

        code:
          "AUTHENTICATION_CHECK_FAILED",
      });
  }
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  AuthenticationError,

  getSessionUser,

  requireAuth,
};