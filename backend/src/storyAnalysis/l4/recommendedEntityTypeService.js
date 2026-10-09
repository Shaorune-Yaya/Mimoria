const crypto = require(
  "crypto"
);

const EntityType = require(
  "../../models/EntityType"
);

const {
  bumpWorldCanonVersion,
} = require(
  "../../services/worldCanonVersionService"
);

const {
  getEntityTypePresentation,
} = require(
  "../concepts/entityTypePresentation"
);

const {
  getSuggestedFieldMetadata,
} = require(
  "../l3/schemaFieldResolver"
);


// ======================================================
// Error
// ======================================================

class RecommendedEntityTypeError
  extends Error {
  constructor(
    message,
    {
      code =
        "RECOMMENDED_ENTITY_TYPE_ERROR",

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
      "RecommendedEntityTypeError";

    this.code =
      code;

    this.statusCode =
      statusCode;

    this.details =
      details;
  }
}


// ======================================================
// Locale
// ======================================================

function normalizeLocale(
  locale
) {
  const normalized =
    String(
      locale || ""
    )
      .trim()
      .toLowerCase();


  if (
    normalized.startsWith(
      "zh"
    )
  ) {
    return "zh-CN";
  }


  return "en";
}


// ======================================================
// Existing Type
// ======================================================

async function findRecommendedEntityType({
  worldId,

  canonicalConcept,
}) {
  if (
    !worldId ||
    !canonicalConcept
  ) {
    return null;
  }


  return EntityType.findOne({
    worldId,

    canonicalConcept,
  });
}


// ======================================================
// Recommended Field Helpers
// ======================================================

const ALLOWED_FIELD_TYPES =
  new Set([
    "text",
    "long-text",
    "number",
    "boolean",
    "date",
    "entity-reference",
    "select",
  ]);


function normalizeFieldType(
  value
) {
  const normalized =
    String(
      value || ""
    )
      .trim();


  if (
    ALLOWED_FIELD_TYPES.has(
      normalized
    )
  ) {
    return normalized;
  }


  return "text";
}


function createFieldKey() {
  return `field_${crypto
    .randomUUID()
    .replace(
      /-/gu,
      ""
    )}`;
}


function buildRecommendedSchemaFields({
  payload,

  locale,
}) {
  const recommendedFields =
    Array.isArray(
      payload
        ?.recommendedFields
    )
      ? payload
          .recommendedFields
      : [];


  const result =
    [];


  const seenConcepts =
    new Set();


  const seenLabels =
    new Set();


  for (
    const field of
    recommendedFields
  ) {
    if (
      !field ||
      typeof field !==
        "object"
    ) {
      continue;
    }


    const fieldConcept =
      String(
        field
          .fieldConcept ||
        ""
      )
        .trim();


    let metadata =
      null;


    if (
      fieldConcept
    ) {
      metadata =
        getSuggestedFieldMetadata(
          fieldConcept,

          locale,

          {
            enabledPacks: [
              "furry",
              "sciFi",
            ],

            nsfwEnabled:
              false,
          }
        );
    }


    const label =
      String(
        field.label ||
        metadata
          ?.suggestedLabel ||
        fieldConcept ||
        "Field"
      )
        .trim();


    if (
      !label
    ) {
      continue;
    }


    const normalizedLabel =
      label
        .toLowerCase();


    if (
      fieldConcept &&
      seenConcepts.has(
        fieldConcept
      )
    ) {
      continue;
    }


    if (
      seenLabels.has(
        normalizedLabel
      )
    ) {
      continue;
    }


    if (
      fieldConcept
    ) {
      seenConcepts.add(
        fieldConcept
      );
    }


    seenLabels.add(
      normalizedLabel
    );


    const type =
      normalizeFieldType(
        field.type ||
        metadata
          ?.suggestedValueType ||
        "text"
      );


    const options =
      type ===
        "select" &&
      Array.isArray(
        field.options
      )
        ? [
            ...new Set(
              field.options
                .map(
                  (option) =>
                    String(
                      option || ""
                    )
                      .trim()
                )
                .filter(
                  Boolean
                )
            ),
          ]
        : [];


    result.push({
      key:
        createFieldKey(),

      label,

      type,

      required:
        field.required ===
        true,

      canonicalConcept:
        fieldConcept ||
        null,

      referenceEntityTypeId:
        type ===
          "entity-reference"
          ? field
              .referenceEntityTypeId ||
            null
          : null,

      options,

      order:
        result.length,
    });
  }


  return result;
}


// ======================================================
// Ensure Recommended Entity Type
// ======================================================

async function ensureRecommendedEntityType({
  candidate,

  locale =
    "en",
}) {
  if (
    !candidate
  ) {
    throw new RecommendedEntityTypeError(
      "Story Suggestion is required.",
      {
        code:
          "CANDIDATE_REQUIRED",
      }
    );
  }


  if (
    candidate.kind !==
    "create-entity"
  ) {
    throw new RecommendedEntityTypeError(
      "Recommended Entity Type creation is only available for create-entity suggestions.",
      {
        code:
          "INVALID_CANDIDATE_KIND",

        statusCode:
          409,

        details: {
          kind:
            candidate.kind,
        },
      }
    );
  }


  if (
    candidate.status !==
    "pending"
  ) {
    throw new RecommendedEntityTypeError(
      `Candidate cannot choose a recommended Entity Type while status is "${candidate.status}".`,
      {
        code:
          "CANDIDATE_NOT_PENDING",

        statusCode:
          409,
      }
    );
  }


  const payload =
    candidate.payload ||
    {};


  const canonicalConcept =
    String(
      payload
        .likelyTypeConcept ||
      ""
    )
      .trim();


  if (
    !canonicalConcept
  ) {
    throw new RecommendedEntityTypeError(
      "This suggestion does not have a recommended Entity Type.",
      {
        code:
          "RECOMMENDED_TYPE_NOT_AVAILABLE",

        statusCode:
          422,
      }
    );
  }


  // ----------------------------------------------------
  // Already selected
  // ----------------------------------------------------

  if (
    payload.entityTypeId
  ) {
    const existingSelected =
      await EntityType.findOne({
        _id:
          payload.entityTypeId,

        worldId:
          candidate.worldId,
      });


    if (
      existingSelected
    ) {
      return {
        entityType:
          existingSelected,

        created:
          false,

        reused:
          true,

        canonVersion:
          null,
      };
    }
  }


  // ----------------------------------------------------
  // Reuse Existing Semantic EntityType
  //
  // Important:
  // Do NOT automatically add recommendedFields to an
  // already-existing EntityType.
  // ----------------------------------------------------

  const existing =
    await findRecommendedEntityType({
      worldId:
        candidate.worldId,

      canonicalConcept,
    });


  if (
    existing
  ) {
    candidate.payload = {
      ...payload,

      entityTypeId:
        String(
          existing._id
        ),
    };


    candidate.markModified(
      "payload"
    );


    await candidate.save();


    return {
      entityType:
        existing,

      created:
        false,

      reused:
        true,

      canonVersion:
        null,
    };
  }


  // ----------------------------------------------------
  // Presentation
  // ----------------------------------------------------

  const normalizedLocale =
    normalizeLocale(
      locale
    );


  const presentation =
    getEntityTypePresentation(
      canonicalConcept,

      normalizedLocale
    );


  const defaultName =
    String(
      presentation
        ?.label ||
      ""
    )
      .trim();


  const customName =
    String(
      payload
        .recommendedTypeName ||
      ""
    )
      .trim();


  const name =
    customName ||
    defaultName;


  if (
    !name
  ) {
    throw new RecommendedEntityTypeError(
      "Unable to determine a display name for the recommended Entity Type.",
      {
        code:
          "RECOMMENDED_TYPE_LABEL_MISSING",

        details: {
          canonicalConcept,
        },
      }
    );
  }


  const customIcon =
    String(
      payload
        .recommendedTypeIcon ||
      ""
    )
      .trim();


  const icon =
    customIcon ||
    presentation
      ?.icon ||
    "📄";


  // ----------------------------------------------------
  // Same visible name
  // ----------------------------------------------------

  const sameName =
    await EntityType.findOne({
      worldId:
        candidate.worldId,

      name: {
        $regex:
          `^${escapeRegExp(
            name
          )}$`,

        $options:
          "i",
      },
    });


  if (
    sameName
  ) {
    if (
      !sameName
        .canonicalConcept
    ) {
      sameName.canonicalConcept =
        canonicalConcept;


      await sameName.save();


      const canonVersion =
        await bumpWorldCanonVersion(
          candidate.worldId
        );


      candidate.payload = {
        ...payload,

        entityTypeId:
          String(
            sameName._id
          ),
      };


      candidate.markModified(
        "payload"
      );


      await candidate.save();


      return {
        entityType:
          sameName,

        created:
          false,

        reused:
          true,

        canonicalConceptAttached:
          true,

        canonVersion,
      };
    }


    throw new RecommendedEntityTypeError(
      `An Entity Type named "${name}" already exists but represents a different canonical concept.`,
      {
        code:
          "ENTITY_TYPE_NAME_CONFLICT",

        statusCode:
          409,

        details: {
          existingEntityTypeId:
            String(
              sameName._id
            ),

          existingCanonicalConcept:
            sameName
              .canonicalConcept,

          requestedCanonicalConcept:
            canonicalConcept,

          name,
        },
      }
    );
  }


  // ----------------------------------------------------
  // Build recommended schema fields
  // ----------------------------------------------------

  const fields =
    buildRecommendedSchemaFields({
      payload,

      locale:
        normalizedLocale,
    });


  // ----------------------------------------------------
  // Create New EntityType
  // ----------------------------------------------------

  const entityType =
    await EntityType.create({
      worldId:
        candidate.worldId,

      name,

      description:
        "",

      icon,

      canonicalConcept,

      fields,
    });


  const canonVersion =
    await bumpWorldCanonVersion(
      candidate.worldId
    );


  // ----------------------------------------------------
  // Connect Candidate to concrete EntityType
  // ----------------------------------------------------

  candidate.payload = {
    ...payload,

    entityTypeId:
      String(
        entityType._id
      ),
  };


  candidate.markModified(
    "payload"
  );


  await candidate.save();


  return {
    entityType,

    created:
      true,

    reused:
      false,

    canonicalConceptAttached:
      false,

    createdFieldCount:
      fields.length,

    canonVersion,
  };
}


// ======================================================
// Helper
// ======================================================

function escapeRegExp(
  value
) {
  return String(
    value || ""
  )
    .replace(
      /[.*+?^${}()|[\]\\]/gu,
      "\\$&"
    );
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  RecommendedEntityTypeError,

  normalizeLocale,

  findRecommendedEntityType,

  buildRecommendedSchemaFields,

  ensureRecommendedEntityType,
};