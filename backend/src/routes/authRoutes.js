const express =
  require(
    "express"
  );


const User =
  require(
    "../models/User"
  );


const {
  AccountValidationError,

  validateEmail,
  validateUsername,

  normalizeEmail,
  normalizeUsername,

  normalizeDisplayName,
} = require(
  "../utils/accountValidation"
);


const {
  PasswordValidationError,

  validatePassword,
  hashPassword,
  verifyPassword,
} = require(
  "../services/passwordService"
);


const {
  InviteValidationError,

  validateInviteCode,
} = require(
  "../services/inviteService"
);


const {
  createVerificationChallenge,

  normalizeVerificationCode,

  verifyVerificationCodeHash,

  isVerificationExpired,
} = require(
  "../utils/verificationCode"
);


const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require(
  "../services/emailService"
);


const {
  createAuthToken,

  setAuthCookie,

  clearAuthCookie,
} = require(
  "../utils/authToken"
);


const {
  getSessionUser,
} = require(
  "../middleware/requireAuth"
);


const router =
  express.Router();


// ======================================================
// Constants
// ======================================================

const MAX_VERIFICATION_ATTEMPTS =
  10;


const RESEND_COOLDOWN_MS =
  60 *
  1000;

const MAX_PASSWORD_RESET_ATTEMPTS =
  10;


const PASSWORD_RESET_COOLDOWN_MS =
  60 *
  1000;


// ======================================================
// User DTO
// ======================================================

function userToDto(
  user
) {
  return {
    id:
      String(
        user._id
      ),

    username:
      user.username,

    displayName:
      user.displayName,

    email:
      user.email,

    emailVerified:
      Boolean(
        user.emailVerified
      ),

    role:
      user.role,

    status:
      user.status,

    createdAt:
      user.createdAt,

    lastLoginAt:
      user.lastLoginAt ??
      null,
  };
}


// ======================================================
// Duplicate Check
// ======================================================

async function findDuplicateAccount({
  email,
  username,
}) {
  return User.findOne({
    $or: [
      {
        email,
      },

      {
        username,
      },
    ],
  });
}


// ======================================================
// Normalize Login Identifier
//
// Login accepts:
//
// email@example.com
//
// or:
//
// username
// ======================================================

function normalizeLoginIdentifier(
  value
) {
  const identifier =
    String(
      value || ""
    )
      .trim();


  if (
    !identifier
  ) {
    return {
      type:
        null,

      value:
        "",
    };
  }


  if (
    identifier.includes(
      "@"
    )
  ) {
    return {
      type:
        "email",

      value:
        normalizeEmail(
          identifier
        ),
    };
  }


  return {
    type:
      "username",

    value:
      normalizeUsername(
        identifier
      ),
  };
}


// ======================================================
// REGISTER
//
// POST /api/auth/register
//
// {
//   email,
//   username,
//   password,
//   inviteCode,
//   displayName?
// }
// ======================================================

router.post(
  "/register",

  async (
    req,
    res
  ) => {
    try {
      const email =
        validateEmail(
          req.body
            ?.email
        );


      const username =
        validateUsername(
          req.body
            ?.username
        );


      const password =
        String(
          req.body
            ?.password ||
          ""
        );


      const invite =
        await validateInviteCode(
          req.body
            ?.inviteCode
        );


      const duplicate =
        await findDuplicateAccount({
          email,
          username,
        });


      if (
        duplicate
      ) {
        if (
          duplicate.email ===
          email
        ) {
          return res
            .status(409)
            .json({
              message:
                "An account with this email already exists.",

              code:
                "EMAIL_ALREADY_REGISTERED",
            });
        }


        return res
          .status(409)
          .json({
            message:
              "This username is already taken.",

            code:
              "USERNAME_ALREADY_TAKEN",
          });
      }


      const passwordHash =
        await hashPassword(
          password
        );


      const verification =
        createVerificationChallenge();


      const displayName =
        normalizeDisplayName(
          req.body
            ?.displayName,

          username
        );


      const user =
        new User({
          username,

          email,

          displayName,

          passwordHash,

          emailVerified:
            false,

          inviteCode:
            invite.code,

          inviteAcceptedAt:
            new Date(),

          role:
            "user",

          status:
            "active",

          isDevelopmentUser:
            false,

          emailVerification: {
            codeHash:
              verification
                .codeHash,

            expiresAt:
              verification
                .expiresAt,

            lastSentAt:
              new Date(),

            failedAttempts:
              0,
          },
        });


      await user.save();


      try {
        await sendVerificationEmail({
          to:
            email,

          username:
            displayName ||
            username,

          code:
            verification
              .code,
        });
      } catch (
        emailError
      ) {
        console.error(
          "Verification email failed:",
          emailError
        );


        return res
          .status(502)
          .json({
            message:
              "Account was created, but the verification email could not be sent.",

            code:
              "VERIFICATION_EMAIL_FAILED",

            user:
              userToDto(
                user
              ),

            requiresEmailVerification:
              true,
          });
      }


      return res
        .status(201)
        .json({
          user:
            userToDto(
              user
            ),

          requiresEmailVerification:
            true,

          verificationExpiresAt:
            verification
              .expiresAt,
        });
    } catch (
      error
    ) {
      console.error(
        "Registration failed:",
        error
      );


      if (
        error instanceof
        AccountValidationError ||
        error instanceof
        PasswordValidationError ||
        error instanceof
        InviteValidationError
      ) {
        return res
          .status(
            error.statusCode ||
            400
          )
          .json({
            message:
              error.message,

            code:
              error.code,

            details:
              error.details ||
              null,
          });
      }


      if (
        error?.code ===
        11000
      ) {
        const field =
          Object.keys(
            error.keyPattern ||
            {}
          )[0];


        return res
          .status(409)
          .json({
            message:
              field ===
                "email"
                ? "An account with this email already exists."
                : "This username is already taken.",

            code:
              field ===
                "email"
                ? "EMAIL_ALREADY_REGISTERED"
                : "USERNAME_ALREADY_TAKEN",
          });
      }


      return res
        .status(500)
        .json({
          message:
            "Registration failed.",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// VERIFY EMAIL
//
// POST /api/auth/verify-email
//
// {
//   email,
//   code
// }
// ======================================================

router.post(
  "/verify-email",

  async (
    req,
    res
  ) => {
    try {
      const email =
        validateEmail(
          req.body
            ?.email
        );


      const code =
        normalizeVerificationCode(
          req.body
            ?.code
        );


      if (
        !/^\d{6}$/u.test(
          code
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Verification code must contain six digits.",

            code:
              "INVALID_VERIFICATION_CODE",
          });
      }


      const user =
        await User.findOne({
          email,
        });


      if (
        !user
      ) {
        return res
          .status(404)
          .json({
            message:
              "Account not found.",

            code:
              "ACCOUNT_NOT_FOUND",
          });
      }


      /*
       * IMPORTANT:
       *
       * Never issue a login session merely because the
       * email was already verified.
       *
       * Otherwise anyone who knows a registered email
       * address could use this endpoint to log in.
       */
      if (
        user.emailVerified
      ) {
        return res
          .status(409)
          .json({
            message:
              "This email address has already been verified.",

            code:
              "EMAIL_ALREADY_VERIFIED",

            user:
              userToDto(
                user
              ),

            alreadyVerified:
              true,

            authenticated:
              false,
          });
      }


      const verification =
        user.emailVerification;


      if (
        !verification
          ?.codeHash
      ) {
        return res
          .status(400)
          .json({
            message:
              "No active verification code exists.",

            code:
              "VERIFICATION_CODE_MISSING",
          });
      }


      if (
        isVerificationExpired(
          verification
            .expiresAt
        )
      ) {
        return res
          .status(410)
          .json({
            message:
              "Verification code has expired.",

            code:
              "VERIFICATION_CODE_EXPIRED",
          });
      }


      if (
        (
          verification
            .failedAttempts ||
          0
        ) >=
        MAX_VERIFICATION_ATTEMPTS
      ) {
        return res
          .status(429)
          .json({
            message:
              "Too many incorrect verification attempts. Request a new code.",

            code:
              "VERIFICATION_ATTEMPTS_EXCEEDED",
          });
      }


      const valid =
        verifyVerificationCodeHash(
          code,

          verification
            .codeHash
        );


      if (
        !valid
      ) {
        user.emailVerification.failedAttempts =
          (
            user
              .emailVerification
              .failedAttempts ||
            0
          ) +
          1;


        user.markModified(
          "emailVerification"
        );


        await user.save();


        return res
          .status(400)
          .json({
            message:
              "Verification code is incorrect.",

            code:
              "INCORRECT_VERIFICATION_CODE",

            attemptsRemaining:
              Math.max(
                0,

                MAX_VERIFICATION_ATTEMPTS -
                  user
                    .emailVerification
                    .failedAttempts
              ),
          });
      }


      user.emailVerified =
        true;


      user.clearEmailVerification();


      user.lastLoginAt =
        new Date();


      await user.save();


      const token =
        createAuthToken(
          user
        );


      setAuthCookie(
        res,
        token
      );


      return res.json({
        user:
          userToDto(
            user
          ),

        alreadyVerified:
          false,

        authenticated:
          true,
      });
    } catch (
      error
    ) {
      console.error(
        "Email verification failed:",
        error
      );


      if (
        error instanceof
        AccountValidationError
      ) {
        return res
          .status(400)
          .json({
            message:
              error.message,

            code:
              error.code,

            details:
              error.details ||
              null,
          });
      }


      return res
        .status(500)
        .json({
          message:
            "Email verification failed.",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// RESEND EMAIL VERIFICATION
//
// POST /api/auth/resend-verification
//
// {
//   email
// }
// ======================================================

router.post(
  "/resend-verification",

  async (
    req,
    res
  ) => {
    try {
      const email =
        validateEmail(
          req.body
            ?.email
        );


      const user =
        await User.findOne({
          email,
        });


      /*
       * Do not disclose whether an email exists here.
       */
      if (
        !user
      ) {
        return res.json({
          sent:
            true,
        });
      }


      if (
        user.emailVerified
      ) {
        return res.json({
          sent:
            true,

          alreadyVerified:
            true,
        });
      }


      const lastSentAt =
        user
          .emailVerification
          ?.lastSentAt
          ? new Date(
              user
                .emailVerification
                .lastSentAt
            )
          : null;


      if (
        lastSentAt &&
        Date.now() -
          lastSentAt.getTime() <
          RESEND_COOLDOWN_MS
      ) {
        const retryAfterSeconds =
          Math.ceil(
            (
              RESEND_COOLDOWN_MS -
              (
                Date.now() -
                lastSentAt.getTime()
              )
            ) /
              1000
          );


        return res
          .status(429)
          .json({
            message:
              "Please wait before requesting another verification code.",

            code:
              "VERIFICATION_RESEND_COOLDOWN",

            retryAfterSeconds,
          });
      }


      const verification =
        createVerificationChallenge();


      user.emailVerification = {
        codeHash:
          verification
            .codeHash,

        expiresAt:
          verification
            .expiresAt,

        lastSentAt:
          new Date(),

        failedAttempts:
          0,
      };


      user.markModified(
        "emailVerification"
      );


      await user.save();


      await sendVerificationEmail({
        to:
          user.email,

        username:
          user.displayName ||
          user.username,

        code:
          verification.code,
      });


      return res.json({
        sent:
          true,

        verificationExpiresAt:
          verification
            .expiresAt,
      });
    } catch (
      error
    ) {
      console.error(
        "Resend verification failed:",
        error
      );


      if (
        error instanceof
        AccountValidationError
      ) {
        return res
          .status(400)
          .json({
            message:
              error.message,

            code:
              error.code,
          });
      }


      return res
        .status(500)
        .json({
          message:
            "Unable to resend verification code.",

          error:
            error.message,
        });
    }
  }
);
// ======================================================
// FORGOT PASSWORD
//
// POST /api/auth/forgot-password
//
// {
//   email
// }
//
// Do not reveal whether the email exists.
// ======================================================

router.post(
  "/forgot-password",

  async (
    req,
    res
  ) => {
    try {
      const email =
        validateEmail(
          req.body
            ?.email
        );


      const user =
        await User.findOne({
          email,
        });


      /*
       * Do not disclose whether an account exists.
       */
      if (
        !user
      ) {
        return res.json({
          sent:
            true,
        });
      }


      if (
        user.status !==
        "active"
      ) {
        return res.json({
          sent:
            true,
        });
      }


      const lastSentAt =
        user
          .passwordReset
          ?.lastSentAt
          ? new Date(
              user
                .passwordReset
                .lastSentAt
            )
          : null;


      if (
        lastSentAt &&
        Date.now() -
          lastSentAt.getTime() <
          PASSWORD_RESET_COOLDOWN_MS
      ) {
        const retryAfterSeconds =
          Math.ceil(
            (
              PASSWORD_RESET_COOLDOWN_MS -
              (
                Date.now() -
                lastSentAt.getTime()
              )
            ) /
              1000
          );


        return res
          .status(429)
          .json({
            message:
              "Please wait before requesting another password reset code.",

            code:
              "PASSWORD_RESET_COOLDOWN",

            retryAfterSeconds,
          });
      }


      const verification =
        createVerificationChallenge();


      user.passwordReset = {
        codeHash:
          verification
            .codeHash,

        expiresAt:
          verification
            .expiresAt,

        lastSentAt:
          new Date(),

        failedAttempts:
          0,
      };


      user.markModified(
        "passwordReset"
      );


      await user.save();


      await sendPasswordResetEmail({
        to:
          user.email,

        username:
          user.displayName ||
          user.username,

        code:
          verification.code,
      });


      return res.json({
        sent:
          true,

        verificationExpiresAt:
          verification
            .expiresAt,
      });
    } catch (
      error
    ) {
      console.error(
        "Forgot-password request failed:",
        error
      );


      if (
        error instanceof
        AccountValidationError
      ) {
        /*
         * Keep the response generic so invalid / unknown
         * email input cannot be used for enumeration.
         */
        return res.json({
          sent:
            true,
        });
      }


      return res
        .status(500)
        .json({
          message:
            "Unable to process password reset request.",

          code:
            "PASSWORD_RESET_REQUEST_FAILED",
        });
    }
  }
);


// ======================================================
// RESET PASSWORD
//
// POST /api/auth/reset-password
//
// {
//   email,
//   code,
//   newPassword
// }
// ======================================================

router.post(
  "/reset-password",

  async (
    req,
    res
  ) => {
    try {
      const email =
        validateEmail(
          req.body
            ?.email
        );


      const code =
        normalizeVerificationCode(
          req.body
            ?.code
        );


      const newPassword =
        String(
          req.body
            ?.newPassword ||
          ""
        );


      if (
        !/^\d{6}$/u.test(
          code
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Password reset code must contain six digits.",

            code:
              "INVALID_PASSWORD_RESET_CODE",
          });
      }


      /*
       * Validate before doing any password hash work.
       */
      validatePassword(
        newPassword
      );


      const user =
        await User.findOne({
          email,
        })
          .select(
            "+passwordHash"
          );


      /*
       * Keep unknown-account and bad-code responses
       * intentionally similar.
       */
      if (
        !user
      ) {
        return res
          .status(400)
          .json({
            message:
              "Password reset code is invalid or expired.",

            code:
              "INVALID_PASSWORD_RESET_CODE",
          });
      }


      const reset =
        user.passwordReset;


      if (
        !reset?.codeHash
      ) {
        return res
          .status(400)
          .json({
            message:
              "Password reset code is invalid or expired.",

            code:
              "INVALID_PASSWORD_RESET_CODE",
          });
      }


      if (
        isVerificationExpired(
          reset.expiresAt
        )
      ) {
        user.clearPasswordReset();


        await user.save();


        return res
          .status(410)
          .json({
            message:
              "Password reset code has expired.",

            code:
              "PASSWORD_RESET_CODE_EXPIRED",
          });
      }


      if (
        (
          reset.failedAttempts ||
          0
        ) >=
        MAX_PASSWORD_RESET_ATTEMPTS
      ) {
        return res
          .status(429)
          .json({
            message:
              "Too many incorrect password reset attempts. Request a new code.",

            code:
              "PASSWORD_RESET_ATTEMPTS_EXCEEDED",
          });
      }


      const valid =
        verifyVerificationCodeHash(
          code,

          reset.codeHash
        );


      if (
        !valid
      ) {
        user.passwordReset.failedAttempts =
          (
            user
              .passwordReset
              .failedAttempts ||
            0
          ) +
          1;


        user.markModified(
          "passwordReset"
        );


        await user.save();


        return res
          .status(400)
          .json({
            message:
              "Password reset code is incorrect.",

            code:
              "INCORRECT_PASSWORD_RESET_CODE",

            attemptsRemaining:
              Math.max(
                0,

                MAX_PASSWORD_RESET_ATTEMPTS -
                  user
                    .passwordReset
                    .failedAttempts
              ),
          });
      }


      user.passwordHash =
        await hashPassword(
          newPassword
        );


      user.clearPasswordReset();


      await user.save();


      /*
       * Do not automatically log the user in after a
       * password reset.
       */
      clearAuthCookie(
        res
      );


      return res.json({
        reset:
          true,

        message:
          "Password has been reset successfully.",
      });
    } catch (
      error
    ) {
      console.error(
        "Password reset failed:",
        error
      );


      if (
        error instanceof
        AccountValidationError ||
        error instanceof
        PasswordValidationError
      ) {
        return res
          .status(
            error.statusCode ||
            400
          )
          .json({
            message:
              error.message,

            code:
              error.code,

            details:
              error.details ||
              null,
          });
      }


      return res
        .status(500)
        .json({
          message:
            "Unable to reset password.",

          code:
            "PASSWORD_RESET_FAILED",
        });
    }
  }
);


// ======================================================
// CHANGE PASSWORD
//
// POST /api/auth/change-password
//
// {
//   currentPassword,
//   newPassword
// }
// ======================================================

router.post(
  "/change-password",

  async (
    req,
    res
  ) => {
    try {
      const sessionUser =
        await getSessionUser(
          req
        );


      if (
        !sessionUser
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
        sessionUser.status !==
        "active"
      ) {
        clearAuthCookie(
          res
        );


        return res
          .status(403)
          .json({
            message:
              "This account is not active.",

            code:
              "ACCOUNT_NOT_ACTIVE",
          });
      }


      const currentPassword =
        String(
          req.body
            ?.currentPassword ||
          ""
        );


      const newPassword =
        String(
          req.body
            ?.newPassword ||
          ""
        );


      if (
        !currentPassword ||
        !newPassword
      ) {
        return res
          .status(400)
          .json({
            message:
              "Current password and new password are required.",

            code:
              "PASSWORD_FIELDS_REQUIRED",
          });
      }


      validatePassword(
        newPassword
      );


      const user =
        await User
          .findById(
            sessionUser._id
          )
          .select(
            "+passwordHash"
          );


      if (
        !user
      ) {
        clearAuthCookie(
          res
        );


        return res
          .status(401)
          .json({
            message:
              "Authentication is required.",

            code:
              "AUTHENTICATION_REQUIRED",
          });
      }


      const currentPasswordValid =
        await verifyPassword(
          currentPassword,

          user.passwordHash
        );


      if (
        !currentPasswordValid
      ) {
        return res
          .status(400)
          .json({
            message:
              "Current password is incorrect.",

            code:
              "CURRENT_PASSWORD_INCORRECT",
          });
      }


      const samePassword =
        await verifyPassword(
          newPassword,

          user.passwordHash
        );


      if (
        samePassword
      ) {
        return res
          .status(400)
          .json({
            message:
              "New password must be different from the current password.",

            code:
              "PASSWORD_UNCHANGED",
          });
      }


      user.passwordHash =
        await hashPassword(
          newPassword
        );


      user.clearPasswordReset();


      await user.save();


      return res.json({
        changed:
          true,

        message:
          "Password changed successfully.",
      });
    } catch (
      error
    ) {
      console.error(
        "Change-password failed:",
        error
      );


      if (
        error instanceof
        PasswordValidationError
      ) {
        return res
          .status(400)
          .json({
            message:
              error.message,

            code:
              error.code,

            details:
              error.details ||
              null,
          });
      }


      return res
        .status(500)
        .json({
          message:
            "Unable to change password.",

          code:
            "PASSWORD_CHANGE_FAILED",
        });
    }
  }
);

// ======================================================
// LOGIN
//
// POST /api/auth/login
//
// {
//   identifier: "email@example.com"
//   password: "..."
// }
//
// or:
//
// {
//   identifier: "username"
//   password: "..."
// }
// ======================================================

router.post(
  "/login",

  async (
    req,
    res
  ) => {
    try {
      const identifier =
        normalizeLoginIdentifier(
          req.body
            ?.identifier
        );


      const password =
        String(
          req.body
            ?.password ||
          ""
        );


      if (
        !identifier.value ||
        !password
      ) {
        return res
          .status(400)
          .json({
            message:
              "Email or username and password are required.",

            code:
              "LOGIN_FIELDS_REQUIRED",
          });
      }


      // --------------------------------------------------
      // Query account
      //
      // passwordHash has select:false in User schema,
      // therefore it must be explicitly selected.
      // --------------------------------------------------

      const query =
        identifier.type ===
          "email"
          ? {
              email:
                identifier.value,
            }
          : {
              username:
                identifier.value,
            };


      const user =
        await User
          .findOne(
            query
          )
          .select(
            "+passwordHash"
          );


      /*
       * Use the same public message for:
       *
       * unknown account
       * incorrect password
       *
       * This reduces account enumeration through login.
       */
      if (
        !user
      ) {
        return res
          .status(401)
          .json({
            message:
              "Email, username, or password is incorrect.",

            code:
              "INVALID_CREDENTIALS",
          });
      }


      const passwordValid =
        await verifyPassword(
          password,
          user.passwordHash
        );


      if (
        !passwordValid
      ) {
        return res
          .status(401)
          .json({
            message:
              "Email, username, or password is incorrect.",

            code:
              "INVALID_CREDENTIALS",
          });
      }


      // --------------------------------------------------
      // Account State
      // --------------------------------------------------

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
        !user.emailVerified
      ) {
        return res
          .status(403)
          .json({
            message:
              "Verify your email address before signing in.",

            code:
              "EMAIL_NOT_VERIFIED",

            requiresEmailVerification:
              true,

            email:
              user.email,
          });
      }


      // --------------------------------------------------
      // Login Success
      // --------------------------------------------------

      user.lastLoginAt =
        new Date();


      await user.save();


      const token =
        createAuthToken(
          user
        );


      setAuthCookie(
        res,
        token
      );


      return res.json({
        authenticated:
          true,

        user:
          userToDto(
            user
          ),
      });
    } catch (
      error
    ) {
      console.error(
        "Login failed:",
        error
      );


      return res
        .status(500)
        .json({
          message:
            "Login failed.",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// CURRENT USER
//
// GET /api/auth/me
// ======================================================

router.get(
  "/me",

  async (
    req,
    res
  ) => {
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
            authenticated:
              false,

            user:
              null,

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
        clearAuthCookie(
          res
        );


        return res
          .status(403)
          .json({
            authenticated:
              false,

            user:
              null,

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
        clearAuthCookie(
          res
        );


        return res
          .status(403)
          .json({
            authenticated:
              false,

            user:
              null,

            message:
              "Email verification is required.",

            code:
              "EMAIL_NOT_VERIFIED",
          });
      }


      return res.json({
        authenticated:
          true,

        user:
          userToDto(
            user
          ),
      });
    } catch (
      error
    ) {
      console.error(
        "Current-user lookup failed:",
        error
      );


      return res
        .status(500)
        .json({
          authenticated:
            false,

          user:
            null,

          message:
            "Unable to load the current account.",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// LOGOUT
//
// POST /api/auth/logout
// ======================================================

router.post(
  "/logout",

  (
    req,
    res
  ) => {
    clearAuthCookie(
      res
    );


    return res.json({
      authenticated:
        false,

      user:
        null,

      loggedOut:
        true,
    });
  }
);


// ======================================================
// Exports
// ======================================================

module.exports = {
  router,

  userToDto,

  normalizeLoginIdentifier,
};