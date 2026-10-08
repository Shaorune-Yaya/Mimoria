require(
  "dotenv"
).config();

const dns =
  require(
    "dns"
  );


dns.setServers([
  "8.8.8.8",
  "1.1.1.1",
]);

const mongoose =
  require(
    "mongoose"
  );


const StorySyncCandidate =
  require(
    "../src/models/StorySyncCandidate"
  );


const {
  persistStorySyncCandidates,
} = require(
  "../src/storyAnalysis/l4/storySyncPersistenceService"
);


// ======================================================
// Test IDs
//
// These do not need matching World / Document records
// because StorySyncCandidate currently stores refs but
// does not require population for this test.
// ======================================================

const worldId =
  new mongoose.Types.ObjectId();


const documentId =
  new mongoose.Types.ObjectId();


const entityId =
  new mongoose.Types.ObjectId();


// ======================================================
// Record Factory
// ======================================================

function makeFieldRecord({
  value,

  version,
}) {
  return {
    worldId,

    documentId,

    suggestionId:
      `field-update::entity-yelan::field-color::${value}`,

    kind:
      "field-update",

    status:
      "pending",

    confidence:
      0.95,

    payload: {
      targetEntityId:
        entityId,

      fieldKey:
        "field-color",

      fieldLabel:
        "主色",

      fieldConcept:
        "field.primaryColor",

      fieldType:
        "Select",

      value,
    },

    source: {
      documentVersion:
        version,

      originalText:
        `夜岚主色是${value}。`,

      subjectHint:
        "夜岚",

      fieldConcept:
        "field.primaryColor",

      candidateType:
        "field-value",
    },

    warnings:
      [],
  };
}


// ======================================================
// Main
// ======================================================

async function main() {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI;


  if (
    !uri
  ) {
    throw new Error(
      "Missing MONGODB_URI or MONGO_URI in .env"
    );
  }


  await mongoose.connect(
    uri
  );


  console.log(
    "MongoDB connected."
  );


  try {
    // --------------------------------------------------
    // Clean only this synthetic test document
    // --------------------------------------------------

    await StorySyncCandidate
      .deleteMany({
        documentId,
      });


    // ==================================================
    // TEST 1
    // First analysis
    // ==================================================

    console.log(
      "\n======================================"
    );

    console.log(
      "TEST 1 - First analysis"
    );


    const first =
      await persistStorySyncCandidates({
        worldId,

        documentId,

        documentVersion:
          15,

        records: [
          makeFieldRecord({
            value:
              "蓝色",

            version:
              15,
          }),
        ],
      });


    console.log({
      created:
        first.createdCount,

      refreshed:
        first.refreshedCount,

      superseded:
        first.supersededCount,
    });


    // ==================================================
    // TEST 2
    // Same version again
    // ==================================================

    console.log(
      "\n======================================"
    );

    console.log(
      "TEST 2 - Same analysis again"
    );


    const second =
      await persistStorySyncCandidates({
        worldId,

        documentId,

        documentVersion:
          15,

        records: [
          makeFieldRecord({
            value:
              "蓝色",

            version:
              15,
          }),
        ],
      });


    console.log({
      created:
        second.createdCount,

      refreshed:
        second.refreshedCount,

      superseded:
        second.supersededCount,
    });


    // ==================================================
    // TEST 3
    // Accept blue
    // ==================================================

    console.log(
      "\n======================================"
    );

    console.log(
      "TEST 3 - Accept existing suggestion"
    );


    const blue =
      await StorySyncCandidate
        .findOne({
          documentId,

          suggestionId:
            "field-update::entity-yelan::field-color::蓝色",
        });


    blue.markAccepted({
      test:
        true,
    });


    await blue.save();


    console.log({
      status:
        blue.status,

      acceptedAt:
        Boolean(
          blue.acceptedAt
        ),
    });


    // ==================================================
    // TEST 4
    // Analyze same suggestion again
    //
    // It MUST remain accepted.
    // ==================================================

    console.log(
      "\n======================================"
    );

    console.log(
      "TEST 4 - Accepted suggestion is preserved"
    );


    const fourth =
      await persistStorySyncCandidates({
        worldId,

        documentId,

        documentVersion:
          16,

        records: [
          makeFieldRecord({
            value:
              "蓝色",

            version:
              16,
          }),
        ],
      });


    const blueAfter =
      await StorySyncCandidate
        .findOne({
          documentId,

          suggestionId:
            "field-update::entity-yelan::field-color::蓝色",
        });


    console.log({
      preserved:
        fourth.preservedCount,

      status:
        blueAfter.status,
    });


    // ==================================================
    // TEST 5
    // New value appears
    //
    // Red becomes pending.
    // Accepted blue remains accepted.
    // ==================================================

    console.log(
      "\n======================================"
    );

    console.log(
      "TEST 5 - New value creates new suggestion"
    );


    const fifth =
      await persistStorySyncCandidates({
        worldId,

        documentId,

        documentVersion:
          17,

        records: [
          makeFieldRecord({
            value:
              "红色",

            version:
              17,
          }),
        ],
      });


    console.log({
      created:
        fifth.createdCount,

      superseded:
        fifth.supersededCount,
    });


    // ==================================================
    // TEST 6
    // Red disappears
    //
    // Red is still pending, so it should supersede.
    // ==================================================

    console.log(
      "\n======================================"
    );

    console.log(
      "TEST 6 - Missing pending suggestion supersedes"
    );


    const sixth =
      await persistStorySyncCandidates({
        worldId,

        documentId,

        documentVersion:
          18,

        records:
          [],
      });


    console.log({
      superseded:
        sixth.supersededCount,
    });


    // ==================================================
    // TEST 7
    // Red reappears
    //
    // It should return from superseded -> pending.
    // ==================================================

    console.log(
      "\n======================================"
    );

    console.log(
      "TEST 7 - Superseded suggestion reactivates"
    );


    const seventh =
      await persistStorySyncCandidates({
        worldId,

        documentId,

        documentVersion:
          19,

        records: [
          makeFieldRecord({
            value:
              "红色",

            version:
              19,
          }),
        ],
      });


    console.log({
      reactivated:
        seventh
          .reactivatedCount,
    });


    // ==================================================
    // Final State
    // ==================================================

    console.log(
      "\n======================================"
    );

    console.log(
      "FINAL STATE"
    );


    const all =
      await StorySyncCandidate
        .find({
          documentId,
        })
        .sort({
          createdAt:
            1,
        })
        .lean();


    console.log(
      all.map(
        (candidate) => ({
          suggestionId:
            candidate
              .suggestionId,

          status:
            candidate.status,

          version:
            candidate
              .source
              ?.documentVersion,

          value:
            candidate
              .payload
              ?.value,
        })
      )
    );
  } finally {
    // --------------------------------------------------
    // Remove synthetic test records
    // --------------------------------------------------

    await StorySyncCandidate
      .deleteMany({
        documentId,
      });


    await mongoose
      .disconnect();


    console.log(
      "\nTest data cleaned."
    );
  }
}


main()
  .catch(
    async (
      error
    ) => {
      console.error(
        error
      );


      try {
        await mongoose
          .disconnect();
      } catch {
        // Ignore disconnect errors.
      }


      process.exitCode =
        1;
    }
  );