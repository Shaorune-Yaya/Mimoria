const jwt =
  require(
    "jsonwebtoken"
  );


// ======================================================
// Constants
// ======================================================

const AUTH_COOKIE_NAME =
  "mimoria_session";


const AUTH_TOKEN_EXPIRES_IN =
  "7d";


const AUTH_COOKIE_MAX_AGE =
  7 *
  24 *
  60 *
  60 *
  1000;


// ======================================================
// Configuration
// ======================================================

function getJwtSecret() {
  const secret =
    process.env
      .JWT_SECRET;


  if (
    !secret
  ) {
    throw new Error(
      "JWT_SECRET is missing from the environment configuration."
    );
  }


  return secret;
}


// ======================================================
// Token
// ======================================================

function createAuthToken(
  user
) {
  if (
    !user?._id
  ) {
    throw new Error(
      "A valid User is required to create an authentication token."
    );
  }


  /*
   * Keep JWT claims minimal.
   *
   * Role/status are intentionally loaded from MongoDB on
   * authenticated requests later so changing an account
   * does not require waiting for the JWT to expire.
   */
  return jwt.sign(
    {
      sub:
        String(
          user._id
        ),

      type:
        "mimoria-session",
    },

    getJwtSecret(),

    {
      expiresIn:
        AUTH_TOKEN_EXPIRES_IN,

      issuer:
        "mimoria",

      audience:
        "mimoria-web",
    }
  );
}


// ======================================================
// Verify
// ======================================================

function verifyAuthToken(
  token
) {
  if (
    !token
  ) {
    return null;
  }


  try {
    const payload =
      jwt.verify(
        token,

        getJwtSecret(),

        {
          issuer:
            "mimoria",

          audience:
            "mimoria-web",
        }
      );


    if (
      payload?.type !==
      "mimoria-session" ||
      !payload?.sub
    ) {
      return null;
    }


    return payload;
  } catch {
    return null;
  }
}


// ======================================================
// Cookie Options
// ======================================================

function getAuthCookieOptions() {
  const production =
    process.env.NODE_ENV ===
    "production";


  return {
    httpOnly:
      true,

    secure:
      production,

    /*
     * Lax is suitable when frontend/backend are under the
     * same site, including normal production subdomains.
     */
    sameSite:
      "lax",

    path:
      "/",

    maxAge:
      AUTH_COOKIE_MAX_AGE,
  };
}


function getClearAuthCookieOptions() {
  const options =
    getAuthCookieOptions();


  return {
    httpOnly:
      options.httpOnly,

    secure:
      options.secure,

    sameSite:
      options.sameSite,

    path:
      options.path,
  };
}


// ======================================================
// Response Helpers
// ======================================================

function setAuthCookie(
  res,
  token
) {
  res.cookie(
    AUTH_COOKIE_NAME,
    token,
    getAuthCookieOptions()
  );
}


function clearAuthCookie(
  res
) {
  res.clearCookie(
    AUTH_COOKIE_NAME,
    getClearAuthCookieOptions()
  );
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  AUTH_COOKIE_NAME,
  AUTH_TOKEN_EXPIRES_IN,
  AUTH_COOKIE_MAX_AGE,

  getJwtSecret,

  createAuthToken,
  verifyAuthToken,

  getAuthCookieOptions,

  setAuthCookie,
  clearAuthCookie,
};