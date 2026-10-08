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

const TreeNode =
  require(
    "../src/models/TreeNode"
  );

const mongoose =
  require(
    "mongoose"
  );


const StorySyncCandidate =
  require(
    "../src/models/StorySyncCandidate"
  );

const Entity =
  require(
    "../src/models/Entity"
  );

const EntityType =
  require(
    "../src/models/EntityType"
  );

const Relation =
  require(
    "../src/models/Relation"
  );


const {
  applyStorySyncCandidate,
} = require(
  "../src/storyAnalysis/l4/storySyncApplyService"
);


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
      "Missing MongoDB URI."
    );
  }


  await mongoose.connect(
    uri
  );


  console.log(
    "MongoDB connected."
  );


  const worldId =
    new mongoose.Types.ObjectId();


  /*
   * We use synthetic IDs and clean everything afterward.
   *
   * Entity / EntityType do not require an actual World
   * document to exist for this isolated model test.
   */
  let characterType =
    null;

  let countryType =
    null;

  let yelan =
    null;

  let usa =
    null;


  try {
    // ==================================================
    // Setup
    // ==================================================

    characterType =
      await EntityType.create({
        worldId,

        name:
          "__StorySyncTestCharacter__",

        canonicalConcept:
          "entityType.character",

        fields: [
          {
            key:
              "field-color",

            label:
              "主色",

            type:
              "select",

            canonicalConcept:
              "field.primaryColor",

            options: [
              "蓝色",
            ],
          },
        ],
      });


    countryType =
      await EntityType.create({
        worldId,

        name:
          "__StorySyncTestCountry__",

        canonicalConcept:
          "entityType.country",

        fields:
          [],
      });


    yelan =
      await Entity.create({
        worldId,

        entityTypeId:
          characterType._id,

        name:
          "__StorySyncTestYelan__",

        values:
          {},
      });


    usa =
      await Entity.create({
        worldId,

        entityTypeId:
          countryType._id,

        name:
          "__StorySyncTestUSA__",

        values:
          {},
      });


    // ==================================================
    // TEST 1 - Field Update
    // ==================================================

    console.log(
      "\n======================================"
    );

    console.log(
      "TEST 1 - Field update"
    );


    const fieldCandidate =
      await StorySyncCandidate.create({
        worldId,

        documentId:
          new mongoose.Types.ObjectId(),

        suggestionId:
          `test-field-${Date.now()}`,

        kind:
          "field-update",

        status:
          "pending",

        payload: {
          targetEntityId:
            yelan._id,

          fieldKey:
            "field-color",

          fieldConcept:
            "field.primaryColor",

          value:
            "蓝色",
        },
      });


    const fieldResult =
      await applyStorySyncCandidate({
        candidateId:
          fieldCandidate._id,
      });


    const updatedYelan =
      await Entity.findById(
        yelan._id
      );


    console.log({
      candidateStatus:
        fieldResult
          .candidate
          .status,

      storedValue:
        updatedYelan
          .values
          .get(
            "field-color"
          ),
    });


    // ==================================================
    // TEST 2 - Create Select Option
    // ==================================================

    console.log(
      "\n======================================"
    );

    console.log(
      "TEST 2 - Create select option"
    );


    const selectCandidate =
      await StorySyncCandidate.create({
        worldId,

        documentId:
          new mongoose.Types.ObjectId(),

        suggestionId:
          `test-select-${Date.now()}`,

        kind:
          "create-select-option",

        status:
          "pending",

        payload: {
          targetEntityTypeId:
            characterType._id,

          fieldKey:
            "field-color",

          value:
            "紫罗兰色",
        },
      });


    const selectResult =
      await applyStorySyncCandidate({
        candidateId:
          selectCandidate._id,
      });


    const typeAfterSelect =
      await EntityType.findById(
        characterType._id
      );


    console.log({
      candidateStatus:
        selectResult
          .candidate
          .status,

      options:
        typeAfterSelect
          .fields[0]
          .options,
    });


    // ==================================================
    // TEST 2B - Create Schema Field
    // ==================================================

    console.log(
    "\n======================================"
    );

    console.log(
    "TEST 2B - Create schema field"
    );


    const schemaCandidate =
    await StorySyncCandidate.create({
        worldId,

        documentId:
        new mongoose.Types.ObjectId(),

        suggestionId:
        `test-schema-${Date.now()}`,

        kind:
        "create-schema-field",

        status:
        "pending",

        payload: {
        targetEntityTypeId:
            characterType._id,

        fieldConcept:
            "field.habitability",

        suggestedLabel:
            "宜居度",

        suggestedValueType:
            "text",
        },
    });


    const schemaResult =
    await applyStorySyncCandidate({
        candidateId:
        schemaCandidate._id,
    });


    const typeAfterSchema =
    await EntityType.findById(
        characterType._id
    );


    const newSchemaField =
    typeAfterSchema
        .fields
        .find(
        (field) =>
            field
            .canonicalConcept ===
            "field.habitability"
        );


    console.log({
    candidateStatus:
        schemaResult
        .candidate
        .status,

    created:
        schemaResult
        .appliedResult
        .created,

    fieldKey:
        newSchemaField
        ?.key,

    label:
        newSchemaField
        ?.label,

    canonicalConcept:
        newSchemaField
        ?.canonicalConcept,
    });

    // ==================================================
    // TEST 3 - Relation + Graph Hook
    // ==================================================

    console.log(
      "\n======================================"
    );

    console.log(
      "TEST 3 - Relation + graph hook"
    );


    const relationCandidate =
      await StorySyncCandidate.create({
        worldId,

        documentId:
          new mongoose.Types.ObjectId(),

        suggestionId:
          `test-relation-${Date.now()}`,

        kind:
          "relation-update",

        status:
          "pending",

        payload: {
          subjectEntityId:
            yelan._id,

          relationConcept:
            "relation.located_in",

          objectEntityId:
            usa._id,
        },

        source: {
          documentVersion:
            1,

          originalText:
            "夜岚位于测试国家。",
        },
      });


    let graphHookCalled =
      false;


    const relationResult =
      await applyStorySyncCandidate({
        candidateId:
          relationCandidate._id,

        hooks: {
          async onGraphImpact({
            impact,
          }) {
            graphHookCalled =
              true;


            console.log(
              "Graph impact:",
              impact
            );
          },
        },
      });


    console.log({
      candidateStatus:
        relationResult
          .candidate
          .status,

      relationId:
        relationResult
          .appliedResult
          .relationId,

      graphHookCalled,
    });


    // ==================================================
    // TEST 3A - Create Entity requires type selection
    // ==================================================

    console.log(
    "\n======================================"
    );

    console.log(
    "TEST 3A - Create entity deferred"
    );


    const createEntityDeferred =
    await StorySyncCandidate.create({
        worldId,

        documentId:
        new mongoose.Types.ObjectId(),

        suggestionId:
        `test-create-entity-deferred-${Date.now()}`,

        kind:
        "create-entity",

        status:
        "pending",

        payload: {
        name:
            "阿尔卡迪亚帝国",

        expectedTypeConcepts: [
            "entityType.country",
            "entityType.location",
        ],
        },
    });


    try {
    await applyStorySyncCandidate({
        candidateId:
        createEntityDeferred._id,
    });
    } catch (
    error
    ) {
    console.log({
        deferred:
        error.code,

        requiredInput:
        error
            .details
            ?.requiredInput,
    });
    }


    const deferredAfter =
    await StorySyncCandidate.findById(
        createEntityDeferred._id
    );


    console.log({
    status:
        deferredAfter.status,
    });

    // ==================================================
    // TEST 3B - Create Entity after type selection
    // ==================================================

    console.log(
    "\n======================================"
    );

    console.log(
    "TEST 3B - Create entity"
    );


    createEntityDeferred.payload = {
    ...createEntityDeferred.payload,

    entityTypeId:
        countryType._id,
    };


    await createEntityDeferred.save();


    const createEntityResult =
    await applyStorySyncCandidate({
        candidateId:
        createEntityDeferred._id,
    });


    const createdEntity =
    await Entity.findById(
        createEntityResult
        .appliedResult
        .entityId
    );


    const createdTreeNode =
    await TreeNode.findOne({
        worldId,

        kind:
        "entity",

        entityId:
        createdEntity._id,
    });


    console.log({
    candidateStatus:
        createEntityResult
        .candidate
        .status,

    entityName:
        createdEntity.name,

    entityTypeId:
        String(
        createdEntity
            .entityTypeId
        ),

    treeNodeCreated:
        Boolean(
        createdTreeNode
        ),
    });

    // ==================================================
    // TEST 4 - Timeline Deferred
    // ==================================================

    console.log(
      "\n======================================"
    );

    console.log(
      "TEST 4 - Timeline deferred hook"
    );


    const eventCandidate =
      await StorySyncCandidate.create({
        worldId,

        documentId:
          new mongoose.Types.ObjectId(),

        suggestionId:
          `test-event-${Date.now()}`,

        kind:
          "event-history",

        status:
          "pending",

        payload: {
          eventConcept:
            "event.join",

          subjectEntityId:
            yelan._id,

          objectEntityId:
            usa._id,

          sequenceIndex:
            0,
        },
      });


    try {
      await applyStorySyncCandidate({
        candidateId:
          eventCandidate._id,
      });
    } catch (
      error
    ) {
      console.log({
        deferred:
          error.code,

        message:
          error.message,
      });
    }


    const eventAfter =
      await StorySyncCandidate
        .findById(
          eventCandidate._id
        );


    console.log({
      eventCandidateStatus:
        eventAfter.status,
    });
  } finally {
    // ==================================================
    // Cleanup
    // ==================================================

    await Relation.deleteMany({
      worldId,
    });


    await StorySyncCandidate
      .deleteMany({
        worldId,
      });


    await TreeNode.deleteMany({
      worldId,
    });

    await Entity.deleteMany({
      worldId,
    });


    await EntityType.deleteMany({
      worldId,
    });


    await mongoose.disconnect();


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
        // Ignore cleanup error.
      }


      process.exitCode =
        1;
    }
  );