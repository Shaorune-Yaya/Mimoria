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
// Normalize Locale
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
// Find Existing Recommended Type
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
// Ensure Recommended Entity Type
//
// This is called ONLY after explicit user confirmation.
//
// Example:
//
// Candidate:
// {
//   kind: "create-entity",
//   payload: {
//     name: "Black Rose Church",
//     likelyTypeConcept: "entityType.church"
//   }
// }
//
// If the World already has:
//
// 教会
// canonicalConcept = entityType.church
//
// -> reuse it.
//
// Otherwise:
//
// -> create the recommended EntityType.
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
  // Reuse an existing semantic EntityType
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
  // Create Recommended EntityType
  // ----------------------------------------------------

  const presentation =
    getEntityTypePresentation(
      canonicalConcept,

      normalizeLocale(
        locale
      )
    );


  const name =
    String(
      presentation
        ?.label ||
      ""
    )
      .trim();


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


  /*
   * Defensive fallback:
   *
   * If the World already contains a type with exactly the
   * same localized name but without canonicalConcept,
   * reuse it and attach the concept instead of creating a
   * duplicate visible type.
   */
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


    /*
     * Same visible name but different semantic concept.
     *
     * Do not silently merge them.
     */
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


  const entityType =
    await EntityType.create({
      worldId:
        candidate.worldId,

      name,

      description:
        "",

      icon:
        presentation
          ?.icon ||
        "📄",

      canonicalConcept,

      fields:
        [],
    });


  /*
   * Creating an EntityType changes World Canon.
   */
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

  ensureRecommendedEntityType,
};