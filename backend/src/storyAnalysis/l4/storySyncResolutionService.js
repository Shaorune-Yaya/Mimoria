const StorySyncCandidate = require(
  "../../models/StorySyncCandidate"
);


// ======================================================
// Error
// ======================================================

class StorySyncResolutionError
  extends Error {
  constructor(
    message,
    {
      code =
        "STORY_SYNC_RESOLUTION_ERROR",

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
      "StorySyncResolutionError";

    this.code =
      code;

    this.statusCode =
      statusCode;

    this.details =
      details;
  }
}


// ======================================================
// Ignore Candidate
// ======================================================

async function ignoreStorySyncCandidate({
  candidateId,
}) {
  if (
    !candidateId
  ) {
    throw new StorySyncResolutionError(
      "candidateId is required.",
      {
        code:
          "CANDIDATE_ID_REQUIRED",
      }
    );
  }


  const candidate =
    await StorySyncCandidate
      .findById(
        candidateId
      );


  if (
    !candidate
  ) {
    throw new StorySyncResolutionError(
      "Story Sync candidate not found.",
      {
        code:
          "CANDIDATE_NOT_FOUND",

        statusCode:
          404,
      }
    );
  }


  // ----------------------------------------------------
  // Idempotent Ignore
  // ----------------------------------------------------

  if (
    candidate.status ===
    "ignored"
  ) {
    return {
      candidate,

      alreadyIgnored:
        true,
    };
  }


  // ----------------------------------------------------
  // Accepted canon should not be changed by Ignore.
  // ----------------------------------------------------

  if (
    candidate.status ===
    "accepted"
  ) {
    throw new StorySyncResolutionError(
      "An accepted suggestion cannot be ignored.",
      {
        code:
          "CANDIDATE_ALREADY_ACCEPTED",

        statusCode:
          409,
      }
    );
  }


  // ----------------------------------------------------
  // Superseded suggestions are historical only.
  // ----------------------------------------------------

  if (
    candidate.status ===
    "superseded"
  ) {
    throw new StorySyncResolutionError(
      "A superseded suggestion is no longer actionable.",
      {
        code:
          "CANDIDATE_SUPERSEDED",

        statusCode:
          409,
      }
    );
  }


  candidate.markIgnored();


  await candidate.save();


  return {
    candidate,

    alreadyIgnored:
      false,
  };
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  StorySyncResolutionError,

  ignoreStorySyncCandidate,
};