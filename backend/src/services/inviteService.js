const fs =
  require(
    "fs/promises"
  );

const path =
  require(
    "path"
  );


const User =
  require(
    "../models/User"
  );


// ======================================================
// File
// ======================================================

const INVITE_FILE =
  path.resolve(
    __dirname,
    "../../private/betaInvites.json"
  );


// ======================================================
// Error
// ======================================================

class InviteValidationError
  extends Error {
  constructor(
    message,
    {
      code =
        "INVALID_INVITE_CODE",

      statusCode =
        400,

      details =
        null,
    } = {}
  ) {
    super(
      message
    );


    this.name =
      "InviteValidationError";

    this.code =
      code;

    this.statusCode =
      statusCode;

    this.details =
      details;
  }
}


// ======================================================
// Normalize
// ======================================================

function normalizeInviteCode(
  value
) {
  return String(
    value || ""
  )
    .trim();
}


// ======================================================
// Load Invite Configuration
// ======================================================

async function loadInviteConfiguration() {
  let raw;


  try {
    raw =
      await fs.readFile(
        INVITE_FILE,
        "utf8"
      );
  } catch (
    error
  ) {
    throw new Error(
      `Unable to read Beta invite configuration: ${error.message}`
    );
  }


  try {
    const parsed =
      JSON.parse(
        raw
      );


    if (
      !parsed ||
      typeof parsed !==
        "object" ||
      Array.isArray(
        parsed
      )
    ) {
      throw new Error(
        "Beta invite configuration must be a JSON object."
      );
    }


    return parsed;
  } catch (
    error
  ) {
    throw new Error(
      `Invalid Beta invite configuration: ${error.message}`
    );
  }
}


// ======================================================
// Get Invite Definition
// ======================================================

async function getInviteDefinition(
  inviteCode
) {
  const normalized =
    normalizeInviteCode(
      inviteCode
    );


  if (
    !normalized
  ) {
    return null;
  }


  const configuration =
    await loadInviteConfiguration();


  const definition =
    configuration[
      normalized
    ];


  if (
    !definition
  ) {
    return null;
  }


  return {
    code:
      normalized,

    enabled:
      definition.enabled !==
      false,

    maxUses:
      Number.isFinite(
        Number(
          definition.maxUses
        )
      )
        ? Number(
            definition.maxUses
          )
        : null,

    label:
      String(
        definition.label ||
        normalized
      ),
  };
}


// ======================================================
// Count Uses
//
// MongoDB is the source of truth for usage count.
// ======================================================

async function countInviteUses(
  inviteCode
) {
  const normalized =
    normalizeInviteCode(
      inviteCode
    );


  if (
    !normalized
  ) {
    return 0;
  }


  return User.countDocuments({
    inviteCode:
      normalized,

    isDevelopmentUser: {
      $ne:
        true,
    },
  });
}


// ======================================================
// Validate Invite
// ======================================================

async function validateInviteCode(
  inviteCode
) {
  const normalized =
    normalizeInviteCode(
      inviteCode
    );


  if (
    !normalized
  ) {
    throw new InviteValidationError(
      "Beta invite code is required.",
      {
        code:
          "INVITE_CODE_REQUIRED",
      }
    );
  }


  const definition =
    await getInviteDefinition(
      normalized
    );


  if (
    !definition
  ) {
    throw new InviteValidationError(
      "Beta invite code is invalid.",
      {
        code:
          "INVALID_INVITE_CODE",
      }
    );
  }


  if (
    !definition.enabled
  ) {
    throw new InviteValidationError(
      "This Beta invite code is disabled.",
      {
        code:
          "INVITE_CODE_DISABLED",

        statusCode:
          403,
      }
    );
  }


  const used =
    await countInviteUses(
      normalized
    );


  if (
    definition.maxUses !==
      null &&
    used >=
      definition.maxUses
  ) {
    throw new InviteValidationError(
      "This Beta invite code has reached its usage limit.",
      {
        code:
          "INVITE_CODE_EXHAUSTED",

        statusCode:
          403,

        details: {
          maxUses:
            definition.maxUses,

          used,
        },
      }
    );
  }


  return {
    code:
      normalized,

    label:
      definition.label,

    maxUses:
      definition.maxUses,

    used,

    remaining:
      definition.maxUses ===
      null
        ? null
        : Math.max(
            0,
            definition.maxUses -
              used
          ),
  };
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  INVITE_FILE,

  InviteValidationError,

  normalizeInviteCode,

  loadInviteConfiguration,
  getInviteDefinition,
  countInviteUses,

  validateInviteCode,
};