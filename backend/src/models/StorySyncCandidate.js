const mongoose = require(
  "mongoose"
);


// ======================================================
// Constants
// ======================================================

const STORY_SYNC_KINDS = [
  "field-update",
  "relation-update",
  "event-history",
  "create-entity",
  "create-schema-field",
  "create-select-option",
];


const STORY_SYNC_STATUSES = [
  "pending",
  "accepted",
  "ignored",
  "superseded",
];


// ======================================================
// Source Text Range
// ======================================================

const textRangeSchema =
  new mongoose.Schema(
    {
      start: {
        type:
          Number,

        default:
          null,
      },

      end: {
        type:
          Number,

        default:
          null,
      },
    },
    {
      _id:
        false,
    }
  );


// ======================================================
// Suggestion Source
// ======================================================

const sourceSchema =
  new mongoose.Schema(
    {
      documentVersion: {
        type:
          mongoose.Schema.Types.Mixed,

        default:
          null,
      },

      textRange: {
        type:
          textRangeSchema,

        default:
          null,
      },

      originalText: {
        type:
          String,

        default:
          null,
      },

      subjectHint: {
        type:
          String,

        default:
          null,
      },

      objectHint: {
        type:
          String,

        default:
          null,
      },

      fieldConcept: {
        type:
          String,

        default:
          null,
      },

      eventConcept: {
        type:
          String,

        default:
          null,
      },

      relationConcept: {
        type:
          String,

        default:
          null,
      },

      candidateType: {
        type:
          String,

        default:
          null,
      },
    },
    {
      _id:
        false,
    }
  );


// ======================================================
// Edit History
// ======================================================

const editHistorySchema =
  new mongoose.Schema(
    {
      editedAt: {
        type:
          Date,

        default:
          Date.now,
      },

      previousPayload: {
        type:
          mongoose.Schema.Types.Mixed,

        default:
          null,
      },

      nextPayload: {
        type:
          mongoose.Schema.Types.Mixed,

        default:
          null,
      },
    },
    {
      _id:
        false,
    }
  );


// ======================================================
// Story Sync Candidate
// ======================================================

const storySyncCandidateSchema =
  new mongoose.Schema(
    {
      // ------------------------------------------------
      // Ownership
      // ------------------------------------------------

      worldId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "World",

        required:
          true,

        index:
          true,
      },

      documentId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Document",

        required:
          true,

        index:
          true,
      },


      // ------------------------------------------------
      // Revision Identity
      //
      // semanticKey:
      //   What the analyzer is semantically suggesting.
      //
      // Example:
      // field-update::entity::ageField::24
      //
      // revisionKey / suggestionId:
      //   One concrete actionable revision.
      //
      // Example:
      // field-update::...::24::revision::2
      //
      // This lets accepted history remain immutable while
      // the same semantic conflict can reappear after the
      // canonical database changes later.
      // ------------------------------------------------

      semanticKey: {
        type:
          String,

        trim:
          true,

        default:
          null,

        index:
          true,
      },

      revisionKey: {
        type:
          String,

        trim:
          true,

        default:
          null,
      },

      revisionNumber: {
        type:
          Number,

        min:
          1,

        default:
          1,
      },

      /*
       * suggestionId remains the externally visible stable
       * identifier for this concrete revision.
       *
       * New candidates use revisionKey as suggestionId.
       *
       * Legacy candidates may still contain the old
       * analyzer semantic ID directly.
       */
      suggestionId: {
        type:
          String,

        trim:
          true,

        default:
          null,
      },


      // ------------------------------------------------
      // Canonical Baseline
      //
      // Snapshot of relevant canonical state when this
      // revision was created/refreshed.
      //
      // Examples:
      //
      // field-update:
      // {
      //   type: "field-value",
      //   currentValue: 14
      // }
      //
      // relation-update:
      // {
      //   type: "relation-presence",
      //   exists: false
      // }
      // ------------------------------------------------

      baseline: {
        type:
          mongoose.Schema.Types.Mixed,

        default:
          null,
      },


      // ------------------------------------------------
      // Suggestion Kind
      // ------------------------------------------------

      kind: {
        type:
          String,

        enum:
          STORY_SYNC_KINDS,

        default:
          "relation-update",

        index:
          true,
      },


      // ------------------------------------------------
      // Lifecycle
      // ------------------------------------------------

      status: {
        type:
          String,

        enum:
          STORY_SYNC_STATUSES,

        default:
          "pending",

        index:
          true,
      },


      // ------------------------------------------------
      // Analysis Confidence
      // ------------------------------------------------

      confidence: {
        type:
          Number,

        min:
          0,

        max:
          1,

        default:
          0.7,
      },


      // ------------------------------------------------
      // Unified Suggestion Payload
      // ------------------------------------------------

      payload: {
        type:
          mongoose.Schema.Types.Mixed,

        default:
          {},
      },


      // ------------------------------------------------
      // Original Machine Payload
      //
      // Set only when the user first edits a suggestion.
      // This preserves what the analyzer originally
      // proposed for auditing / future rule tuning.
      // ------------------------------------------------

      originalPayload: {
        type:
          mongoose.Schema.Types.Mixed,

        default:
          null,
      },

      editedByUser: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },

      editedAt: {
        type:
          Date,

        default:
          null,
      },

      editHistory: {
        type: [
          editHistorySchema
        ],

        default:
          [],
      },


      // ------------------------------------------------
      // Source Evidence
      // ------------------------------------------------

      source: {
        type:
          sourceSchema,

        default:
          () => ({}),
      },


      // ------------------------------------------------
      // Warnings
      // ------------------------------------------------

      warnings: {
        type: [
          String
        ],

        default:
          [],
      },


      // ------------------------------------------------
      // Apply Metadata
      // ------------------------------------------------

      acceptedAt: {
        type:
          Date,

        default:
          null,
      },

      ignoredAt: {
        type:
          Date,

        default:
          null,
      },

      supersededAt: {
        type:
          Date,

        default:
          null,
      },

      appliedResult: {
        type:
          mongoose.Schema.Types.Mixed,

        default:
          null,
      },


      // =================================================
      // Legacy Relation Compatibility
      // =================================================

      relationType: {
        type:
          String,

        default:
          null,
      },

      relationConcept: {
        type:
          String,

        default:
          null,
      },

      subjectEntityId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Entity",

        default:
          null,
      },

      objectEntityId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Entity",

        default:
          null,
      },

      subjectHint: {
        type:
          String,

        default:
          null,
      },

      objectHint: {
        type:
          String,

        default:
          null,
      },

      evidence: {
        type:
          mongoose.Schema.Types.Mixed,

        default:
          null,
      },
    },
    {
      timestamps:
        true,

      minimize:
        false,
    }
  );


// ======================================================
// Indexes
// ======================================================

storySyncCandidateSchema.index(
  {
    worldId:
      1,

    documentId:
      1,

    status:
      1,
  }
);


storySyncCandidateSchema.index(
  {
    documentId:
      1,

    kind:
      1,

    status:
      1,
  }
);


storySyncCandidateSchema.index(
  {
    documentId:
      1,

    semanticKey:
      1,

    status:
      1,
  }
);


/*
 * One concrete revision ID must remain unique.
 *
 * Legacy candidates may not have semanticKey or
 * revisionKey, but suggestionId still exists.
 */
storySyncCandidateSchema.index(
  {
    documentId:
      1,

    suggestionId:
      1,
  },
  {
    unique:
      true,

    partialFilterExpression: {
      suggestionId: {
        $type:
          "string",
      },
    },
  }
);


// ======================================================
// Instance Helpers
// ======================================================

storySyncCandidateSchema.methods.markAccepted =
  function markAccepted(
    appliedResult = null
  ) {
    this.status =
      "accepted";

    this.acceptedAt =
      new Date();

    this.ignoredAt =
      null;

    this.supersededAt =
      null;

    this.appliedResult =
      appliedResult;

    return this;
  };


storySyncCandidateSchema.methods.markIgnored =
  function markIgnored() {
    this.status =
      "ignored";

    this.ignoredAt =
      new Date();

    this.acceptedAt =
      null;

    this.supersededAt =
      null;

    return this;
  };


storySyncCandidateSchema.methods.markSuperseded =
  function markSuperseded() {
    this.status =
      "superseded";

    this.supersededAt =
      new Date();

    this.acceptedAt =
      null;

    this.ignoredAt =
      null;

    return this;
  };


storySyncCandidateSchema.methods.recordUserEdit =
  function recordUserEdit(
    nextPayload
  ) {
    const previousPayload =
      this.payload
        ? structuredCloneSafe(
            this.payload
          )
        : {};


    if (
      !this.originalPayload
    ) {
      this.originalPayload =
        structuredCloneSafe(
          previousPayload
        );
    }


    this.editHistory.push({
      editedAt:
        new Date(),

      previousPayload,

      nextPayload:
        structuredCloneSafe(
          nextPayload
        ),
    });


    this.payload =
      nextPayload;

    this.editedByUser =
      true;

    this.editedAt =
      new Date();


    this.markModified(
      "payload"
    );

    this.markModified(
      "originalPayload"
    );

    this.markModified(
      "editHistory"
    );


    return this;
  };


// ======================================================
// Local Clone Helper
// ======================================================

function structuredCloneSafe(
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
// Static Helpers
// ======================================================

storySyncCandidateSchema.statics.STORY_SYNC_KINDS =
  STORY_SYNC_KINDS;


storySyncCandidateSchema.statics.STORY_SYNC_STATUSES =
  STORY_SYNC_STATUSES;


// ======================================================
// Model
// ======================================================

const StorySyncCandidate =
  mongoose.models
    .StorySyncCandidate ||
  mongoose.model(
    "StorySyncCandidate",
    storySyncCandidateSchema
  );


module.exports =
  StorySyncCandidate;