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

  normalizeDisplayName,
} = require(
  "../utils/accountValidation"
);


const {
  PasswordValidationError,

  hashPassword,
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
} = require(
  "../services/emailService"
);


const {
  createAuthToken,

  setAuthCookie,
} = require(
  "../utils/authToken"
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


// ======================================================
// DTO
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
// Register
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


      // --------------------------------------------------
      // Send verification code
      // --------------------------------------------------

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
        /*
         * Keep the newly-created account.
         *
         * The user can request another code later.
         */
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


      /*
       * MongoDB unique index race protection.
       */
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
// Verify Email
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


      // --------------------------------------------------
      // Verification successful
      // --------------------------------------------------

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
// Resend Verification Code
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
       * Do not reveal whether an email address exists.
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
// Exports
// ======================================================

module.exports = {
  router,

  userToDto,
};