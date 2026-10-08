// ======================================================
// L4-C Story Sync Persistence Service
//
// Revision-aware persistence.
//
// Responsibilities:
//
// - Insert new pending revisions
// - Refresh existing pending revisions
// - Preserve user edits on pending suggestions
// - Preserve ignored semantic suggestions
// - Preserve accepted user-corrected suggestions
// - Create a new revision after canonical drift
// - Reactivate superseded suggestions
// - Supersede pending suggestions that disappear
//
// Important:
//
// This service DOES NOT apply suggestions to canonical
// Entity / Relation / EntityType data.
// ======================================================


const StorySyncCandidate =
  require(
    "../../models/StorySyncCandidate"
  );


// ======================================================
// Helpers
// ======================================================

function normalizeSuggestionId(
  value
) {
  return String(
    value || ""
  )
    .trim();
}


function sameDocumentVersion(
  a,
  b
) {
  return String(
    a ?? ""
  ) ===
    String(
      b ?? ""
    );
}


function getRecordSemanticKey(
  record
) {
  return normalizeSuggestionId(
    record
      ?.semanticKey ||
    record
      ?.suggestionId
  );
}


function getCandidateSemanticKey(
  candidate
) {
  return normalizeSuggestionId(
    candidate
      ?.semanticKey ||
    candidate
      ?.suggestionId
  );
}


function buildRevisionSuggestionId(
  semanticKey,
  revisionNumber
) {
  return [
    semanticKey,
    "revision",
    revisionNumber,
  ].join(
    "::"
  );
}


function cloneValue(
  value
) {
  if (
    value ===
      undefined
  ) {
    return undefined;
  }


  try {
    return JSON.parse(
      JSON.stringify(
        value
      )
    );
  } catch {
    return value;
  }
}


// ======================================================
// Incoming Semantic Map
//
// One semantic suggestion per analysis result.
// ======================================================

function buildRecordMap(
  records = []
) {
  const map =
    new Map();


  for (
    const record of
    records
  ) {
    const semanticKey =
      getRecordSemanticKey(
        record
      );


    if (
      !semanticKey
    ) {
      continue;
    }


    const normalizedRecord = {
      ...record,

      semanticKey,
    };


    /*
     * If duplicate semantic suggestions somehow arrive,
     * keep the higher-confidence form.
     */
    const existing =
      map.get(
        semanticKey
      );


    if (
      !existing ||
      (
        normalizedRecord
          .confidence ??
        0
      ) >
      (
        existing
          .confidence ??
        0
      )
    ) {
      map.set(
        semanticKey,
        normalizedRecord
      );
    }
  }


  return map;
}


// ======================================================
// Existing Candidate Grouping
// ======================================================

function buildExistingGroups(
  candidates = []
) {
  const groups =
    new Map();


  for (
    const candidate of
    candidates
  ) {
    const semanticKey =
      getCandidateSemanticKey(
        candidate
      );


    if (
      !semanticKey
    ) {
      continue;
    }


    if (
      !groups.has(
        semanticKey
      )
    ) {
      groups.set(
        semanticKey,
        []
      );
    }


    groups
      .get(
        semanticKey
      )
      .push(
        candidate
      );
  }


  for (
    const group of
    groups.values()
  ) {
    group.sort(
      (
        a,
        b
      ) => {
        const revisionDiff =
          (
            b.revisionNumber ??
            0
          ) -
          (
            a.revisionNumber ??
            0
          );


        if (
          revisionDiff !==
          0
        ) {
          return revisionDiff;
        }


        return (
          new Date(
            b.createdAt ||
            0
          ).getTime() -
          new Date(
            a.createdAt ||
            0
          ).getTime()
        );
      }
    );
  }


  return groups;
}


function findNewestByStatus(
  group,
  status
) {
  return (
    group.find(
      (candidate) =>
        candidate.status ===
        status
    ) ||
    null
  );
}


function findNewestIgnored(
  group
) {
  return findNewestByStatus(
    group,
    "ignored"
  );
}


function findNewestPending(
  group
) {
  return findNewestByStatus(
    group,
    "pending"
  );
}


function findNewestSuperseded(
  group
) {
  return findNewestByStatus(
    group,
    "superseded"
  );
}


function findNewestAccepted(
  group
) {
  return findNewestByStatus(
    group,
    "accepted"
  );
}


function findAcceptedUserCorrection(
  group
) {
  return (
    group.find(
      (candidate) =>
        candidate.status ===
          "accepted" &&
        candidate.editedByUser ===
          true
    ) ||
    null
  );
}


function getNextRevisionNumber(
  group
) {
  let maxRevision =
    0;


  for (
    const candidate of
    group
  ) {
    maxRevision =
      Math.max(
        maxRevision,

        candidate
          .revisionNumber ??
        0
      );
  }


  return (
    maxRevision +
    1
  );
}


// ======================================================
// Refresh Pending Candidate
// ======================================================

function refreshPendingCandidate(
  candidate,
  record
) {
  candidate.kind =
    record.kind;

  candidate.confidence =
    record.confidence;

  candidate.source =
    record.source;

  candidate.warnings =
    record.warnings ||
    [];

  candidate.baseline =
    record.baseline ??
    candidate.baseline ??
    null;


  /*
   * IMPORTANT:
   *
   * If the user manually corrected this pending
   * suggestion, a repeated Analyze must NOT overwrite
   * their edited payload with the machine output again.
   */
  if (
    candidate.editedByUser !==
    true
  ) {
    candidate.payload =
      record.payload;

    candidate.markModified(
      "payload"
    );
  }


  candidate.semanticKey =
    getRecordSemanticKey(
      record
    );


  /*
   * Legacy relation compatibility.
   */
  if (
    record.kind ===
    "relation-update"
  ) {
    candidate.relationType =
      record.relationType ??
      null;

    candidate.relationConcept =
      record.relationConcept ??
      null;

    candidate.subjectEntityId =
      record.subjectEntityId ??
      null;

    candidate.objectEntityId =
      record.objectEntityId ??
      null;

    candidate.subjectHint =
      record.subjectHint ??
      null;

    candidate.objectHint =
      record.objectHint ??
      null;
  }


  return candidate;
}


// ======================================================
// Reactivate Superseded Candidate
// ======================================================

function reactivateCandidate(
  candidate,
  record
) {
  refreshPendingCandidate(
    candidate,
    record
  );


  candidate.status =
    "pending";

  candidate.supersededAt =
    null;

  candidate.acceptedAt =
    null;

  candidate.ignoredAt =
    null;

  candidate.appliedResult =
    null;


  return candidate;
}


// ======================================================
// Create New Revision
// ======================================================

async function createRevision({
  worldId,

  documentId,

  semanticKey,

  record,

  revisionNumber,
}) {
  const suggestionId =
    buildRevisionSuggestionId(
      semanticKey,
      revisionNumber
    );


  const candidate =
    new StorySyncCandidate({
      ...record,

      worldId,

      documentId,

      semanticKey,

      revisionKey:
        suggestionId,

      suggestionId,

      revisionNumber,

      baseline:
        record.baseline ??
        null,

      status:
        "pending",

      /*
       * Keep the machine payload untouched.
       *
       * originalPayload is only populated if/when the
       * user edits it.
       */
      originalPayload:
        null,

      editedByUser:
        false,

      editedAt:
        null,

      editHistory:
        [],
    });


  await candidate.save();


  return candidate;
}


// ======================================================
// Persist
// ======================================================

async function persistStorySyncCandidates({
  worldId,

  documentId,

  documentVersion,

  records = [],
}) {
  if (
    !worldId
  ) {
    throw new Error(
      "persistStorySyncCandidates requires worldId."
    );
  }


  if (
    !documentId
  ) {
    throw new Error(
      "persistStorySyncCandidates requires documentId."
    );
  }


  if (
    documentVersion ===
      undefined ||
    documentVersion ===
      null
  ) {
    throw new Error(
      "persistStorySyncCandidates requires documentVersion."
    );
  }


  const incomingMap =
    buildRecordMap(
      records
    );


  const incomingSemanticKeys =
    new Set(
      incomingMap.keys()
    );


  // ----------------------------------------------------
  // Load all v2 / legacy candidates for this document
  // ----------------------------------------------------

  const existingCandidates =
    await StorySyncCandidate
      .find({
        documentId,

        suggestionId: {
          $type:
            "string",
        },
      });


  const existingGroups =
    buildExistingGroups(
      existingCandidates
    );


  const created =
    [];

  const refreshed =
    [];

  const preserved =
    [];

  const reactivated =
    [];

  const superseded =
    [];


  // ====================================================
  // Process Incoming Semantic Suggestions
  // ====================================================

  for (
    const [
      semanticKey,
      record,
    ] of incomingMap.entries()
  ) {
    const group =
      existingGroups.get(
        semanticKey
      ) ||
      [];


    // --------------------------------------------------
    // Ignore means:
    //
    // "Do not keep asking me about this semantic
    // suggestion."
    //
    // Therefore ignored suppresses future revisions of
    // the same semantic suggestion.
    // --------------------------------------------------

    const ignored =
      findNewestIgnored(
        group
      );


    if (
      ignored
    ) {
      preserved.push(
        ignored
      );


      continue;
    }


    // --------------------------------------------------
    // User-corrected accepted suggestion
    //
    // Example:
    //
    // Machine:
    // "的牙牙 -> member_of -> 共产党"
    //
    // User corrected:
    // "牙牙 -> member_of -> 共产党"
    //
    // Once accepted, do not immediately resurrect the
    // original wrong machine semantic suggestion.
    // --------------------------------------------------

    const acceptedCorrection =
      findAcceptedUserCorrection(
        group
      );


    if (
      acceptedCorrection
    ) {
      preserved.push(
        acceptedCorrection
      );


      continue;
    }


    // --------------------------------------------------
    // Current pending revision exists
    //
    // Refresh analysis metadata but preserve user edits.
    // --------------------------------------------------

    const pending =
      findNewestPending(
        group
      );


    if (
      pending
    ) {
      refreshPendingCandidate(
        pending,
        record
      );


      pending.status =
        "pending";

      pending.supersededAt =
        null;


      await pending.save();


      refreshed.push(
        pending
      );


      continue;
    }


    // --------------------------------------------------
    // If a normal accepted revision exists and this
    // semantic suggestion has appeared again, the route
    // has already established that Canon does NOT
    // currently satisfy it.
    //
    // Therefore this is canonical drift.
    //
    // Create a NEW revision instead of mutating history.
    // --------------------------------------------------

    const accepted =
      findNewestAccepted(
        group
      );


    if (
      accepted
    ) {
      const revisionNumber =
        getNextRevisionNumber(
          group
        );


      const candidate =
        await createRevision({
          worldId,

          documentId,

          semanticKey,

          record,

          revisionNumber,
        });


      created.push(
        candidate
      );


      if (
        !existingGroups.has(
          semanticKey
        )
      ) {
        existingGroups.set(
          semanticKey,
          []
        );
      }


      existingGroups
        .get(
          semanticKey
        )
        .unshift(
          candidate
        );


      continue;
    }


    // --------------------------------------------------
    // Previously superseded, now relevant again
    // --------------------------------------------------

    const previousSuperseded =
      findNewestSuperseded(
        group
      );


    if (
      previousSuperseded
    ) {
      reactivateCandidate(
        previousSuperseded,
        record
      );


      await previousSuperseded.save();


      reactivated.push(
        previousSuperseded
      );


      continue;
    }


    // --------------------------------------------------
    // Completely new semantic suggestion
    // --------------------------------------------------

    const revisionNumber =
      getNextRevisionNumber(
        group
      );


    const candidate =
      await createRevision({
        worldId,

        documentId,

        semanticKey,

        record,

        revisionNumber:
          Math.max(
            1,
            revisionNumber
          ),
      });


    created.push(
      candidate
    );


    if (
      !existingGroups.has(
        semanticKey
      )
    ) {
      existingGroups.set(
        semanticKey,
        []
      );
    }


    existingGroups
      .get(
        semanticKey
      )
      .unshift(
        candidate
      );
  }


  // ====================================================
  // Supersede Old Pending Suggestions
  //
  // Compare semanticKey, not revision-specific
  // suggestionId.
  // ====================================================

  for (
    const existing of
    existingCandidates
  ) {
    if (
      existing.status !==
      "pending"
    ) {
      continue;
    }


    const semanticKey =
      getCandidateSemanticKey(
        existing
      );


    if (
      incomingSemanticKeys.has(
        semanticKey
      )
    ) {
      continue;
    }


    existing.markSuperseded();


    await existing.save();


    superseded.push(
      existing
    );
  }


  return {
    documentId,

    documentVersion,

    incomingCount:
      incomingMap.size,

    createdCount:
      created.length,

    refreshedCount:
      refreshed.length,

    preservedCount:
      preserved.length,

    reactivatedCount:
      reactivated.length,

    supersededCount:
      superseded.length,

    created,

    refreshed,

    preserved,

    reactivated,

    superseded,
  };
}


// ======================================================
// Query Current Suggestions
// ======================================================

async function getCurrentPendingSuggestions({
  documentId,

  documentVersion = null,
}) {
  const query = {
    documentId,

    status:
      "pending",
  };


  if (
    documentVersion !==
      null &&
    documentVersion !==
      undefined
  ) {
    query[
      "source.documentVersion"
    ] =
      documentVersion;
  }


  return StorySyncCandidate
    .find(
      query
    )
    .sort({
      confidence:
        -1,

      createdAt:
        1,
    });
}


// ======================================================
// Supersede All Pending
// ======================================================

async function supersedePendingSuggestions({
  documentId,
}) {
  const now =
    new Date();


  const result =
    await StorySyncCandidate
      .updateMany(
        {
          documentId,

          status:
            "pending",
        },
        {
          $set: {
            status:
              "superseded",

            supersededAt:
              now,
          },
        }
      );


  return {
    matchedCount:
      result.matchedCount ??
      0,

    modifiedCount:
      result.modifiedCount ??
      0,
  };
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  normalizeSuggestionId,
  sameDocumentVersion,

  getRecordSemanticKey,
  getCandidateSemanticKey,

  buildRevisionSuggestionId,
  buildRecordMap,
  buildExistingGroups,

  refreshPendingCandidate,
  reactivateCandidate,

  persistStorySyncCandidates,

  getCurrentPendingSuggestions,

  supersedePendingSuggestions,
};