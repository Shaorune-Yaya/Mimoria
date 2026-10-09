
const crypto = require(
  "crypto"
);

const mongoose = require(
  "mongoose"
);

const StorySyncCandidate = require(
  "../../models/StorySyncCandidate"
);

const Entity = require(
  "../../models/Entity"
);

const EntityType = require(
  "../../models/EntityType"
);

const Relation = require(
  "../../models/Relation"
);

const TreeNode = require(
  "../../models/TreeNode"
);

const {
  bumpWorldCanonVersion,
} = require(
  "../../services/worldCanonVersionService"
);

// ======================================================
// Errors
// ======================================================

class StorySyncApplyError extends Error {
  constructor(
    message,
    {
      code =
        "STORY_SYNC_APPLY_ERROR",

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
      "StorySyncApplyError";

    this.code =
      code;

    this.statusCode =
      statusCode;

    this.details =
      details;
  }
}


class StorySyncApplyDeferredError
  extends StorySyncApplyError {
  constructor(
    message,
    details = null
  ) {
    super(
      message,
      {
        code:
          "STORY_SYNC_APPLY_DEFERRED",

        statusCode:
          409,

        details,
      }
    );

    this.name =
      "StorySyncApplyDeferredError";
  }
}


// ======================================================
// Helpers
// ======================================================

function idsEqual(
  a,
  b
) {
  if (
    !a ||
    !b
  ) {
    return false;
  }

  return (
    String(
      a
    ) ===
    String(
      b
    )
  );
}


function normalizeFieldType(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


function normalizeRelationType(
  relationConcept
) {
  const value =
    String(
      relationConcept || ""
    )
      .trim();

  if (
    value.startsWith(
      "relation."
    )
  ) {
    return value.slice(
      "relation.".length
    );
  }

  return value;
}


function normalizeSuggestedFieldType(
  value
) {
  const normalized =
    String(
      value || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /_/gu,
        "-"
      );

  const aliases = {
    string:
      "text",

    text:
      "text",

    longtext:
      "long-text",

    "long-text":
      "long-text",

    number:
      "number",

    numeric:
      "number",

    integer:
      "number",

    float:
      "number",

    double:
      "number",

    boolean:
      "boolean",

    bool:
      "boolean",

    date:
      "date",

    datetime:
      "date",

    select:
      "select",

    dropdown:
      "select",

    reference:
      "entity-reference",

    entityreference:
      "entity-reference",

    "entity-reference":
      "entity-reference",
  };

  return (
    aliases[
      normalized
    ] ||
    normalized
  );
}


function getCandidateDocumentVersion(
  candidate
) {
  return (
    candidate
      ?.source
      ?.documentVersion ??
    candidate
      ?.contentVersion ??
    null
  );
}


// ======================================================
// Entity Helpers
// ======================================================

async function ensureEntityInWorld({
  entityId,
  worldId,
  session = null,
}) {
  const query =
    Entity.findById(
      entityId
    );

  if (
    session
  ) {
    query.session(
      session
    );
  }

  const entity =
    await query;

  if (
    !entity
  ) {
    throw new StorySyncApplyError(
      "Target entity no longer exists.",
      {
        code:
          "ENTITY_NOT_FOUND",

        statusCode:
          404,
      }
    );
  }

  if (
    !idsEqual(
      entity.worldId,
      worldId
    )
  ) {
    throw new StorySyncApplyError(
      "Target entity belongs to another world.",
      {
        code:
          "ENTITY_WORLD_MISMATCH",
      }
    );
  }

  return entity;
}


async function ensureEntityTypeInWorld({
  entityTypeId,
  worldId,
  session = null,
}) {
  const query =
    EntityType.findById(
      entityTypeId
    );

  if (
    session
  ) {
    query.session(
      session
    );
  }

  const entityType =
    await query;

  if (
    !entityType
  ) {
    throw new StorySyncApplyError(
      "Target entity type no longer exists.",
      {
        code:
          "ENTITY_TYPE_NOT_FOUND",

        statusCode:
          404,
      }
    );
  }

  if (
    !idsEqual(
      entityType.worldId,
      worldId
    )
  ) {
    throw new StorySyncApplyError(
      "Target entity type belongs to another world.",
      {
        code:
          "ENTITY_TYPE_WORLD_MISMATCH",
      }
    );
  }

  return entityType;
}


function findFieldByKey(
  entityType,
  fieldKey
) {
  return (
    entityType
      .fields
      .find(
        (field) =>
          field.key ===
          fieldKey
      ) ||
    null
  );
}

// ======================================================
// Draft Entity Resolution
//
// Smart Import can persist dependent suggestions before
// their target Entity exists.
//
// Once the create-entity suggestion is accepted, its
// appliedResult contains the real Entity ID.
//
// Dependent field/relation suggestions resolve that ID
// here.
// ======================================================

function normalizeDraftEntityKey(
  value
) {
  return String(
    value || ""
  )
    .normalize(
      "NFKC"
    )
    .trim()
    .toLowerCase();
}


async function resolveAcceptedDraftEntity({
  candidate,

  draftEntityKey,

  session = null,
}) {
  const normalizedKey =
    normalizeDraftEntityKey(
      draftEntityKey
    );


  if (
    !normalizedKey
  ) {
    return null;
  }


  let query =
    StorySyncCandidate.findOne({
      worldId:
        candidate.worldId,

      documentId:
        candidate.documentId,

      kind:
        "create-entity",

      status:
        "accepted",

      "payload.draftEntityKey":
        normalizedKey,
    });


  if (
    session
  ) {
    query =
      query.session(
        session
      );
  }


  const createCandidate =
    await query;


  const entityId =
    createCandidate
      ?.appliedResult
      ?.entityId ??
    null;


  if (
    !entityId
  ) {
    return null;
  }


  return ensureEntityInWorld({
    entityId,

    worldId:
      candidate.worldId,

    session,
  });
}


async function resolveCandidateEntityReference({
  candidate,

  entityId = null,

  draftEntityKey = null,

  entityName = null,

  session = null,
}) {
  /*
   * Canonical ID always has priority.
   */
  if (
    entityId
  ) {
    return ensureEntityInWorld({
      entityId,

      worldId:
        candidate.worldId,

      session,
    });
  }


  /*
   * Then resolve the accepted create-entity dependency.
   */
  if (
    draftEntityKey
  ) {
    const draftEntity =
      await resolveAcceptedDraftEntity({
        candidate,

        draftEntityKey,

        session,
      });


    if (
      draftEntity
    ) {
      return draftEntity;
    }


    throw new StorySyncApplyDeferredError(
      `Entity dependency "${entityName || draftEntityKey}" has not been created yet.`,
      {
        requiredDependency:
          "create-entity",

        draftEntityKey,

        entityName:
          entityName ??
        null,
      }
    );
  }


  throw new StorySyncApplyDeferredError(
    "This suggestion does not yet have a materialized Entity target.",
    {
      entityName:
        entityName ??
      null,
    }
  );
}


function findFieldByConcept(
  entityType,
  fieldConcept
) {
  if (
    !entityType ||
    !fieldConcept
  ) {
    return null;
  }


  return (
    entityType
      .fields
      .find(
        (field) =>
          field
            .canonicalConcept ===
          fieldConcept
      ) ||
    null
  );
}

// ======================================================
// Field Value Validation
// ======================================================

async function validateFieldValue({
  field,
  value,
  worldId,
  session = null,
}) {
  const fieldType =
    normalizeFieldType(
      field.type
    );


  // ----------------------------------------------------
  // Number
  // ----------------------------------------------------

  if (
    fieldType ===
    "number"
  ) {
    const numeric =
      Number(
        value
      );

    if (
      Number.isNaN(
        numeric
      )
    ) {
      throw new StorySyncApplyError(
        `${field.label} must be a number.`,
        {
          code:
            "INVALID_NUMBER_VALUE",
        }
      );
    }

    return numeric;
  }


  // ----------------------------------------------------
  // Boolean
  // ----------------------------------------------------

  if (
    fieldType ===
    "boolean"
  ) {
    if (
      typeof value ===
      "boolean"
    ) {
      return value;
    }

    if (
      value ===
        "true" ||
      value ===
        1
    ) {
      return true;
    }

    if (
      value ===
        "false" ||
      value ===
        0
    ) {
      return false;
    }

    throw new StorySyncApplyError(
      `${field.label} must be a boolean.`,
      {
        code:
          "INVALID_BOOLEAN_VALUE",
      }
    );
  }


  // ----------------------------------------------------
  // Select
  // ----------------------------------------------------

  if (
    fieldType ===
    "select"
  ) {
    if (
      !field.options.includes(
        value
      )
    ) {
      throw new StorySyncApplyError(
        `Select option "${value}" does not exist for ${field.label}.`,
        {
          code:
            "SELECT_OPTION_NOT_FOUND",

          details: {
            fieldKey:
              field.key,

            value,
          },
        }
      );
    }

    return value;
  }


  // ----------------------------------------------------
  // Entity Reference
  // ----------------------------------------------------

  if (
    fieldType ===
    "entity-reference"
  ) {
    if (
      !mongoose
        .Types
        .ObjectId
        .isValid(
          value
        )
    ) {
      throw new StorySyncApplyError(
        `${field.label} requires a valid Entity reference.`,
        {
          code:
            "INVALID_ENTITY_REFERENCE",
        }
      );
    }

    const referencedEntity =
      await ensureEntityInWorld({
        entityId:
          value,

        worldId,

        session,
      });

    if (
      field
        .referenceEntityTypeId &&
      !idsEqual(
        referencedEntity
          .entityTypeId,

        field
          .referenceEntityTypeId
      )
    ) {
      throw new StorySyncApplyError(
        `Referenced entity type is not allowed for ${field.label}.`,
        {
          code:
            "ENTITY_REFERENCE_TYPE_MISMATCH",
        }
      );
    }

    return referencedEntity
      ._id;
  }


  // ----------------------------------------------------
  // Date
  // ----------------------------------------------------

  if (
    fieldType ===
    "date"
  ) {
    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      throw new StorySyncApplyError(
        `${field.label} contains an invalid date.`,
        {
          code:
            "INVALID_DATE_VALUE",
        }
      );
    }

    return value;
  }


  // ----------------------------------------------------
  // Text / Long Text
  // ----------------------------------------------------

  if (
    fieldType ===
      "text" ||
    fieldType ===
      "long-text"
  ) {
    return String(
      value ?? ""
    );
  }

  return value;
}


// ======================================================
// Apply: Field Update
// ======================================================

async function applyFieldUpdate({
  candidate,

  session = null,
}) {
  const payload =
    candidate.payload ||
    {};


  // ----------------------------------------------------
  // Resolve Existing / Draft Entity
  // ----------------------------------------------------

  const entity =
    await resolveCandidateEntityReference({
      candidate,

      entityId:
        payload
          .targetEntityId,

      draftEntityKey:
        payload
          .targetDraftEntityKey,

      entityName:
        payload
          .targetEntityName,

      session,
    });


  const entityType =
    await ensureEntityTypeInWorld({
      entityTypeId:
        entity.entityTypeId,

      worldId:
        candidate.worldId,

      session,
    });


  // ----------------------------------------------------
  // Resolve Schema Field
  //
  // Existing suggestions use fieldKey.
  //
  // Draft Smart Import suggestions may only know the
  // language-independent canonical fieldConcept.
  // ----------------------------------------------------

  let field =
    payload.fieldKey
      ? findFieldByKey(
          entityType,

          payload.fieldKey
        )
      : null;


  if (
    !field &&
    payload
      .fieldConcept
  ) {
    field =
      findFieldByConcept(
        entityType,

        payload
          .fieldConcept
      );
  }


  if (
    !field
  ) {
    throw new StorySyncApplyDeferredError(
      "The required schema field does not exist yet.",
      {
        requiredDependency:
          "create-schema-field",

        entityTypeId:
          String(
            entityType._id
          ),

        entityTypeName:
          entityType.name,

        fieldKey:
          payload
            .fieldKey ??
        null,

        fieldConcept:
          payload
            .fieldConcept ??
        null,

        targetEntityId:
          String(
            entity._id
          ),

        targetEntityName:
          entity.name,
      }
    );
  }


  const validatedValue =
    await validateFieldValue({
      field,

      value:
        payload.value,

      worldId:
        candidate.worldId,

      session,
    });


  const previousValue =
    entity.values.get(
      field.key
    );


  /*
   * Keep the existing idempotent behavior, but avoid a
   * pointless DB save when the value already matches.
   */
  const previousComparable =
    previousValue instanceof
      mongoose.Types.ObjectId
      ? String(
          previousValue
        )
      : previousValue;


  const nextComparable =
    validatedValue instanceof
      mongoose.Types.ObjectId
      ? String(
          validatedValue
        )
      : validatedValue;


  const alreadyMatches =
    JSON.stringify(
      previousComparable
    ) ===
    JSON.stringify(
      nextComparable
    );


  if (
    !alreadyMatches
  ) {
    entity.values.set(
      field.key,

      validatedValue
    );


    await entity.save({
      session,
    });
  }


  return {
    appliedKind:
      "field-update",

    entityId:
      entity._id,

    entityName:
      entity.name,

    resolvedFromDraft:
      Boolean(
        payload
          .targetDraftEntityKey &&
        !payload
          .targetEntityId
      ),

    draftEntityKey:
      payload
        .targetDraftEntityKey ??
      null,

    fieldKey:
      field.key,

    fieldConcept:
      field
        .canonicalConcept ??
      payload
        .fieldConcept ??
      null,

    previousValue,

    value:
      validatedValue,

    changed:
      !alreadyMatches,

    graphImpact: {
      type:
        alreadyMatches
          ? "entity-present"
          : "entity-updated",

      entityIds: [
        entity._id,
      ],
    },

    timelineImpact:
      null,
  };
}


// ======================================================
// Apply: Create Select Option
// ======================================================

async function applyCreateSelectOption({
  candidate,
  session = null,
}) {
  const payload =
    candidate.payload ||
    {};

  const entityType =
    await ensureEntityTypeInWorld({
      entityTypeId:
        payload.targetEntityTypeId,

      worldId:
        candidate.worldId,

      session,
    });

  const field =
    findFieldByKey(
      entityType,
      payload.fieldKey
    );

  if (
    !field
  ) {
    throw new StorySyncApplyError(
      "Target Select field no longer exists.",
      {
        code:
          "FIELD_NOT_FOUND",

        statusCode:
          404,
      }
    );
  }

  if (
    field.type !==
    "select"
  ) {
    throw new StorySyncApplyError(
      "Target field is not a Select field.",
      {
        code:
          "FIELD_NOT_SELECT",
      }
    );
  }

  const value =
    String(
      payload.value ??
      ""
    )
      .trim();

  if (
    !value
  ) {
    throw new StorySyncApplyError(
      "Select option cannot be empty.",
      {
        code:
          "EMPTY_SELECT_OPTION",
      }
    );
  }

  const existing =
    field.options.find(
      (option) =>
        String(
          option
        )
          .trim()
          .toLowerCase() ===
        value
          .toLowerCase()
    );

  if (
    !existing
  ) {
    field.options.push(
      value
    );

    await entityType.save({
      session,
    });
  }

  return {
    appliedKind:
      "create-select-option",

    entityTypeId:
      entityType._id,

    fieldKey:
      field.key,

    value:
      existing ||
      value,

    created:
      !existing,

    graphImpact:
      null,

    timelineImpact:
      null,
  };
}


// ======================================================
// Apply: Create Schema Field
// ======================================================

async function applyCreateSchemaField({
  candidate,
  session = null,
}) {
  const payload =
    candidate.payload ||
    {};

  const entityType =
    await ensureEntityTypeInWorld({
      entityTypeId:
        payload.targetEntityTypeId,

      worldId:
        candidate.worldId,

      session,
    });

  const canonicalConcept =
    payload.fieldConcept ||
    null;

  let existingField =
    null;


  // ----------------------------------------------------
  // Match existing field by canonical concept
  // ----------------------------------------------------

  if (
    canonicalConcept
  ) {
    existingField =
      entityType
        .fields
        .find(
          (field) =>
            field
              .canonicalConcept ===
            canonicalConcept
        ) ||
      null;
  }


  // ----------------------------------------------------
  // Fallback: match label
  // ----------------------------------------------------

  if (
    !existingField
  ) {
    const requestedLabel =
      String(
        payload
          .suggestedLabel ||
        ""
      )
        .trim()
        .toLowerCase();

    if (
      requestedLabel
    ) {
      existingField =
        entityType
          .fields
          .find(
            (field) =>
              String(
                field.label ||
                ""
              )
                .trim()
                .toLowerCase() ===
              requestedLabel
          ) ||
        null;
    }
  }


  // ----------------------------------------------------
  // Already exists -> idempotent success
  // ----------------------------------------------------

  if (
    existingField
  ) {
    return {
      appliedKind:
        "create-schema-field",

      entityTypeId:
        entityType._id,

      fieldKey:
        existingField.key,

      canonicalConcept:
        existingField
          .canonicalConcept ??
        canonicalConcept,

      fieldType:
        existingField.type,

      created:
        false,

      graphImpact:
        null,

      timelineImpact:
        null,
    };
  }


  // ----------------------------------------------------
  // Validate type
  // ----------------------------------------------------

  const type =
    normalizeSuggestedFieldType(
      payload
        .suggestedValueType
    );

  const allowedTypes =
    new Set([
      "text",
      "long-text",
      "number",
      "boolean",
      "date",
      "entity-reference",
      "select",
    ]);

  if (
    !allowedTypes.has(
      type
    )
  ) {
    throw new StorySyncApplyError(
      `Unsupported field type: ${type}`,
      {
        code:
          "UNSUPPORTED_FIELD_TYPE",
      }
    );
  }


  // ----------------------------------------------------
  // Generate random field key
  // ----------------------------------------------------

  const fieldKey =
    `field_${crypto
      .randomUUID()
      .replace(
        /-/gu,
        ""
      )}`;


  entityType.fields.push({
    key:
      fieldKey,

    label:
      String(
        payload
          .suggestedLabel ||
        canonicalConcept ||
        "Field"
      )
        .trim(),

    type,

    required:
      false,

    canonicalConcept,

    referenceEntityTypeId:
      null,

    options:
      [],

    order:
      entityType
        .fields
        .length,
  });


  await entityType.save({
    session,
  });


  return {
    appliedKind:
      "create-schema-field",

    entityTypeId:
      entityType._id,

    fieldKey,

    canonicalConcept,

    fieldType:
      type,

    created:
      true,

    graphImpact:
      null,

    timelineImpact:
      null,
  };
}


// ======================================================
// Apply: Create Entity
// ======================================================

async function applyCreateEntity({
  candidate,
  session = null,
}) {
  const payload =
    candidate.payload ||
    {};


  // ----------------------------------------------------
  // Require explicit concrete EntityType
  //
  // Story analysis may suggest:
  //
  // country / city / location
  //
  // but must not silently choose the user's concrete
  // Mimoria EntityType.
  // ----------------------------------------------------

  const entityTypeId =
    payload.entityTypeId ||
    null;

  if (
    !entityTypeId
  ) {
    throw new StorySyncApplyDeferredError(
      "Creating this entity requires a concrete Entity Type selection.",
      {
        requiredInput:
          "entityTypeId",

        name:
          payload.name,

        likelyTypeConcept:
          payload
            .likelyTypeConcept ??
          null,

        expectedTypeConcepts:
          payload
            .expectedTypeConcepts ??
          [],
      }
    );
  }


  const entityType =
    await ensureEntityTypeInWorld({
      entityTypeId,

      worldId:
        candidate.worldId,

      session,
    });


  const name =
    String(
      payload.name ||
      ""
    )
      .trim();

  if (
    !name
  ) {
    throw new StorySyncApplyError(
      "Entity name is required.",
      {
        code:
          "ENTITY_NAME_REQUIRED",
      }
    );
  }


  // ----------------------------------------------------
  // Find existing identical entity
  // ----------------------------------------------------

  let existingQuery =
    Entity.findOne({
      worldId:
        candidate.worldId,

      entityTypeId:
        entityType._id,

      name,
    });

  if (
    session
  ) {
    existingQuery =
      existingQuery.session(
        session
      );
  }

  let entity =
    await existingQuery;

  let created =
    false;


  // ----------------------------------------------------
  // Create Entity
  // ----------------------------------------------------

  if (
    !entity
  ) {
    const createdEntities =
      await Entity.create(
        [
          {
            worldId:
              candidate.worldId,

            entityTypeId:
              entityType._id,

            name,

            values:
              {},
          },
        ],
        {
          session,
        }
      );

    entity =
      createdEntities[0];

    created =
      true;
  }


  // ----------------------------------------------------
  // Ensure TreeNode
  //
  // Story-created Entities must behave exactly like
  // Entities created through the normal UI.
  // ----------------------------------------------------

  let treeQuery =
    TreeNode.findOne({
      worldId:
        candidate.worldId,

      kind:
        "entity",

      entityId:
        entity._id,
    });

  if (
    session
  ) {
    treeQuery =
      treeQuery.session(
        session
      );
  }

  let treeNode =
    await treeQuery;

  let treeNodeCreated =
    false;


  if (
    !treeNode
  ) {
    let countQuery =
      TreeNode.countDocuments({
        worldId:
          candidate.worldId,

        parentId:
          null,
      });

    if (
      session
    ) {
      countQuery =
        countQuery.session(
          session
        );
    }

    const rootCount =
      await countQuery;


    const createdNodes =
      await TreeNode.create(
        [
          {
            worldId:
              candidate.worldId,

            kind:
              "entity",

            entityId:
              entity._id,

            parentId:
              null,

            order:
              rootCount,
          },
        ],
        {
          session,
        }
      );

    treeNode =
      createdNodes[0];

    treeNodeCreated =
      true;
  }


  return {
    appliedKind:
      "create-entity",

    entityId:
      entity._id,

    draftEntityKey:
        payload
            .draftEntityKey ??
        null,
    
    entityTypeId:
      entityType._id,

    treeNodeId:
      treeNode._id,

    name:
      entity.name,

    created,

    treeNodeCreated,


    // --------------------------------------------------
    // Relationship Graph extension point
    // --------------------------------------------------

    graphImpact: {
      type:
        created
          ? "entity-created"
          : "entity-present",

      entityIds: [
        entity._id,
      ],
    },


    // --------------------------------------------------
    // Timeline extension point
    // --------------------------------------------------

    timelineImpact:
      null,
  };
}


// ======================================================
// Apply: Relation Update
//
// Relation is the canonical edge source for the future
// Relationship Graph.
// ======================================================

async function applyRelationUpdate({
  candidate,

  session = null,
}) {
  const payload =
    candidate.payload ||
    {};


  // ----------------------------------------------------
  // Resolve Existing / Draft Subject
  // ----------------------------------------------------

  const subject =
    await resolveCandidateEntityReference({
      candidate,

      entityId:
        payload
          .subjectEntityId,

      draftEntityKey:
        payload
          .subjectDraftEntityKey,

      entityName:
        payload
          .subjectName,

      session,
    });


  // ----------------------------------------------------
  // Resolve Existing / Draft Object
  // ----------------------------------------------------

  const object =
    await resolveCandidateEntityReference({
      candidate,

      entityId:
        payload
          .objectEntityId,

      draftEntityKey:
        payload
          .objectDraftEntityKey,

      entityName:
        payload
          .objectName,

      session,
    });


  const relationType =
    normalizeRelationType(
      payload
        .relationConcept ||
      candidate.relationConcept ||
      candidate.relationType
    );


  if (
    !relationType
  ) {
    throw new StorySyncApplyError(
      "relation-update requires a relation type.",
      {
        code:
          "RELATION_TYPE_REQUIRED",
      }
    );
  }


  // ----------------------------------------------------
  // Idempotency
  // ----------------------------------------------------

  let relationQuery =
    Relation.findOne({
      worldId:
        candidate.worldId,

      subjectEntityId:
        subject._id,

      objectEntityId:
        object._id,

      relationType,
    });


  if (
    session
  ) {
    relationQuery =
      relationQuery.session(
        session
      );
  }


  let relation =
    await relationQuery;


  let created =
    false;


  if (
    !relation
  ) {
    const relations =
      await Relation.create(
        [
          {
            worldId:
              candidate.worldId,

            subjectEntityId:
              subject._id,

            objectEntityId:
              object._id,

            relationType,

            relationLabel:
              payload
                .relationLabel ??
              relationType,

            sourceDocumentId:
              candidate
                .documentId,

            sourceContentVersion:
              getCandidateDocumentVersion(
                candidate
              ),

            sourceText:
              candidate
                ?.source
                ?.originalText ??
              "",

            sourceCandidateId:
              candidate._id,

            confidence:
              candidate.confidence,
          },
        ],
        {
          session,
        }
      );


    relation =
      relations[0];


    created =
      true;
  }


  return {
    appliedKind:
      "relation-update",

    relationId:
      relation._id,

    relationType,

    subjectEntityId:
      subject._id,

    subjectName:
      subject.name,

    subjectDraftEntityKey:
      payload
        .subjectDraftEntityKey ??
      null,

    objectEntityId:
      object._id,

    objectName:
      object.name,

    objectDraftEntityKey:
      payload
        .objectDraftEntityKey ??
      null,

    created,

    graphImpact: {
      type:
        created
          ? "edge-created"
          : "edge-present",

      relationId:
        relation._id,

      subjectEntityId:
        subject._id,

      objectEntityId:
        object._id,

      relationType,
    },

    timelineImpact:
      null,
  };
}


// ======================================================
// Apply: Event History
//
// TIMELINE EXTENSION POINT
//
// We deliberately do not create a fake Timeline model
// here.
//
// Future implementation can inject:
//
// hooks.applyEventHistory
//
// and return:
// {
//   eventId,
//   ...
// }
// ======================================================

async function applyEventHistory({
  candidate,
  session = null,
  hooks = {},
}) {
  if (
    typeof hooks
      .applyEventHistory !==
    "function"
  ) {
    throw new StorySyncApplyDeferredError(
      "Timeline persistence is not implemented yet.",
      {
        kind:
          "event-history",

        eventConcept:
          candidate
            ?.payload
            ?.eventConcept ??
          null,

        extensionPoint:
          "hooks.applyEventHistory",
      }
    );
  }

  const result =
    await hooks
      .applyEventHistory({
        candidate,

        session,
      });

  return {
    appliedKind:
      "event-history",

    ...result,

    timelineImpact: {
      type:
        "timeline-event-updated",

      eventId:
        result
          ?.eventId ??
        null,
    },
  };
}


// ======================================================
// Dispatcher
// ======================================================

async function applyCandidateMutation({
  candidate,
  session = null,
  hooks = {},
}) {
  switch (
    candidate.kind
  ) {
    case "field-update":
      return applyFieldUpdate({
        candidate,
        session,
      });


    case "create-select-option":
      return applyCreateSelectOption({
        candidate,
        session,
      });


    case "create-schema-field":
      return applyCreateSchemaField({
        candidate,
        session,
      });


    case "create-entity":
      return applyCreateEntity({
        candidate,
        session,
      });


    case "relation-update":
      return applyRelationUpdate({
        candidate,
        session,
      });


    case "event-history":
      return applyEventHistory({
        candidate,
        session,
        hooks,
      });


    default:
      throw new StorySyncApplyError(
        `Unsupported Story Sync kind: ${candidate.kind}`,
        {
          code:
            "UNSUPPORTED_STORY_SYNC_KIND",
        }
      );
  }
}

// ======================================================
// Canon Mutation Detection
//
// Returns true only when this Apply actually changed
// canonical world data.
//
// This prevents idempotent Apply from unnecessarily
// invalidating every Document again.
// ======================================================

function didCanonicalStateChange(
  candidate,
  appliedResult
) {
  if (
    !candidate ||
    !appliedResult
  ) {
    return false;
  }


  switch (
    candidate.kind
  ) {
    case "field-update":
        return (
            appliedResult
            .changed !==
            false
        );


    case "create-select-option":
      return (
        appliedResult.created ===
        true
      );


    case "create-schema-field":
      return (
        appliedResult.created ===
        true
      );


    case "create-entity":
      return (
        appliedResult.created ===
        true
      );


    case "relation-update":
      return (
        appliedResult.created ===
        true
      );


    case "event-history":
      /*
       * Timeline persistence is currently deferred.
       *
       * When a Timeline model exists later, this can be
       * changed to inspect the Timeline mutation result.
       */
      return false;


    default:
      return false;
  }
}

// ======================================================
// Post Apply Hooks
//
// These happen AFTER the DB transaction commits.
//
// A Graph / Timeline cache or websocket failure should
// never roll back valid canonical state.
// ======================================================

async function runPostApplyHooks({
  candidate,
  appliedResult,
  hooks = {},
}) {
  if (
    appliedResult
      ?.graphImpact &&
    typeof hooks
      .onGraphImpact ===
      "function"
  ) {
    await hooks
      .onGraphImpact({
        candidate,

        impact:
          appliedResult
            .graphImpact,
      });
  }


  if (
    appliedResult
      ?.timelineImpact &&
    typeof hooks
      .onTimelineImpact ===
      "function"
  ) {
    await hooks
      .onTimelineImpact({
        candidate,

        impact:
          appliedResult
            .timelineImpact,
      });
  }


  if (
    typeof hooks
      .onCanonicalMutation ===
      "function"
  ) {
    await hooks
      .onCanonicalMutation({
        candidate,

        appliedResult,
      });
  }
}


// ======================================================
// Main Apply
// ======================================================

async function applyStorySyncCandidate({
  candidateId,
  hooks = {},
}) {
  if (
    !candidateId
  ) {
    throw new StorySyncApplyError(
      "candidateId is required.",
      {
        code:
          "CANDIDATE_ID_REQUIRED",
      }
    );
  }


  const session =
    await mongoose
      .startSession();


  let finalCandidate =
    null;

  let appliedResult =
    null;

  let alreadyAccepted =
    false;

  let canonVersion =
    null;

  let canonChanged =
    false;


  try {
    await session.withTransaction(
      async () => {
        const candidate =
          await StorySyncCandidate
            .findById(
              candidateId
            )
            .session(
              session
            );


        if (
          !candidate
        ) {
          throw new StorySyncApplyError(
            "Story Sync candidate not found.",
            {
              code:
                "CANDIDATE_NOT_FOUND",

              statusCode:
                404,
            }
          );
        }


        // ----------------------------------------------
        // Idempotent Apply
        // ----------------------------------------------

        if (
          candidate.status ===
          "accepted"
        ) {
          finalCandidate =
            candidate;

          appliedResult =
            candidate
              .appliedResult ??
            {
              alreadyAccepted:
                true,
            };

          alreadyAccepted =
            true;

          return;
        }


        if (
          candidate.status !==
          "pending"
        ) {
          throw new StorySyncApplyError(
            `Candidate cannot be applied while status is "${candidate.status}".`,
            {
              code:
                "CANDIDATE_NOT_PENDING",

              statusCode:
                409,
            }
          );
        }


        // ----------------------------------------------
        // Canon mutation FIRST
        // ----------------------------------------------

        appliedResult =
          await applyCandidateMutation({
            candidate,

            session,

            hooks,
          });


        // ----------------------------------------------
        // Determine whether Canon really changed
        // ----------------------------------------------

        canonChanged =
          didCanonicalStateChange(
            candidate,
            appliedResult
          );


        // ----------------------------------------------
        // Bump canonVersion in SAME transaction.
        //
        // Therefore:
        //
        // Entity/Relation mutation succeeds
        // + canonVersion increment succeeds
        // + Candidate accepted
        //
        // all commit together.
        // ----------------------------------------------

        if (
          canonChanged
        ) {
          canonVersion =
            await bumpWorldCanonVersion(
              candidate.worldId,
              {
                session,
              }
            );


          appliedResult = {
            ...appliedResult,

            canonVersion,
          };
        }


        // ----------------------------------------------
        // Only mark accepted AFTER canonical mutation
        // and canonVersion bump both succeed.
        // ----------------------------------------------

        candidate.markAccepted(
          appliedResult
        );


        await candidate.save({
          session,
        });


        finalCandidate =
          candidate;
      }
    );
  } finally {
    await session.endSession();
  }


  // ----------------------------------------------------
  // Do not emit duplicate hooks when Apply is called
  // again on an already-accepted Candidate.
  // ----------------------------------------------------

  if (
    !alreadyAccepted
  ) {
    await runPostApplyHooks({
      candidate:
        finalCandidate,

      appliedResult,

      hooks,
    });
  }


  return {
    candidate:
      finalCandidate,

    appliedResult,

    alreadyAccepted,

    canonChanged,

    canonVersion,
  };
}

// ======================================================
// Exports
// ======================================================

module.exports = {
  StorySyncApplyError,
  StorySyncApplyDeferredError,

  idsEqual,

  normalizeFieldType,
  normalizeRelationType,
  normalizeSuggestedFieldType,

  getCandidateDocumentVersion,

  ensureEntityInWorld,
  ensureEntityTypeInWorld,

  findFieldByKey,

  validateFieldValue,

  applyFieldUpdate,
  applyCreateSelectOption,
  applyCreateSchemaField,
  applyCreateEntity,
  applyRelationUpdate,
  applyEventHistory,

  applyCandidateMutation,

  runPostApplyHooks,

  applyStorySyncCandidate,

  didCanonicalStateChange,
};