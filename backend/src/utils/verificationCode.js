const crypto =
  require(
    "crypto"
  );


// ======================================================
// Constants
// ======================================================

const VERIFICATION_CODE_LENGTH =
  6;

const VERIFICATION_CODE_TTL_MINUTES =
  10;


// ======================================================
// Configuration
// ======================================================

function getVerificationSecret() {
  const secret =
    process.env
      .EMAIL_CODE_SECRET;


  if (
    !secret
  ) {
    throw new Error(
      "EMAIL_CODE_SECRET is missing from the environment configuration."
    );
  }


  return secret;
}


// ======================================================
// Normalize
// ======================================================

function normalizeVerificationCode(
  value
) {
  return String(
    value || ""
  )
    .trim();
}


// ======================================================
// Generate Code
// ======================================================

function generateVerificationCode() {
  const maximum =
    10 **
    VERIFICATION_CODE_LENGTH;


  const number =
    crypto.randomInt(
      0,
      maximum
    );


  return String(
    number
  )
    .padStart(
      VERIFICATION_CODE_LENGTH,
      "0"
    );
}


// ======================================================
// Hash Code
//
// We use HMAC instead of a plain SHA hash.
//
// A 6-digit code only has 1,000,000 possible values.
// If the database were leaked, plain SHA hashes could be
// brute-forced very easily.
//
// The server-side EMAIL_CODE_SECRET acts as a pepper.
// ======================================================

function hashVerificationCode(
  code
) {
  const normalized =
    normalizeVerificationCode(
      code
    );


  return crypto
    .createHmac(
      "sha256",
      getVerificationSecret()
    )
    .update(
      normalized,
      "utf8"
    )
    .digest(
      "hex"
    );
}


// ======================================================
// Verify Code Hash
// ======================================================

function verifyVerificationCodeHash(
  code,
  expectedHash
) {
  if (
    !expectedHash
  ) {
    return false;
  }


  const actualHash =
    hashVerificationCode(
      code
    );


  const actualBuffer =
    Buffer.from(
      actualHash,
      "hex"
    );


  const expectedBuffer =
    Buffer.from(
      String(
        expectedHash
      ),
      "hex"
    );


  if (
    actualBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }


  return crypto.timingSafeEqual(
    actualBuffer,
    expectedBuffer
  );
}


// ======================================================
// Expiration
// ======================================================

function createVerificationExpiry() {
  return new Date(
    Date.now() +
    VERIFICATION_CODE_TTL_MINUTES *
      60 *
      1000
  );
}


function isVerificationExpired(
  expiresAt
) {
  if (
    !expiresAt
  ) {
    return true;
  }


  const timestamp =
    new Date(
      expiresAt
    )
      .getTime();


  if (
    !Number.isFinite(
      timestamp
    )
  ) {
    return true;
  }


  return timestamp <=
    Date.now();
}


// ======================================================
// Create Verification Challenge
// ======================================================

function createVerificationChallenge() {
  const code =
    generateVerificationCode();


  return {
    code,

    codeHash:
      hashVerificationCode(
        code
      ),

    expiresAt:
      createVerificationExpiry(),
  };
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  VERIFICATION_CODE_LENGTH,
  VERIFICATION_CODE_TTL_MINUTES,

  normalizeVerificationCode,

  generateVerificationCode,

  hashVerificationCode,
  verifyVerificationCodeHash,

  createVerificationExpiry,
  isVerificationExpired,

  createVerificationChallenge,
};