// ======================================================
// L3 Semantic State
//
// Analysis-time working memory.
//
// This is intentionally NOT Canon.
//
// It represents what Mimoria currently believes while
// reading one piece of text.
//
// Example:
//
// Nora:
//   probableTypes:
//     character -> 0.94
//
//   fields:
//     age -> 23
//     gender -> female
//
//   relations:
//     from -> Northern Reach
//
// Later candidates can use this state as context.
// ======================================================


// ======================================================
// Constants
// ======================================================

const DEFAULT_ENTITY_SALIENCE =
  0.35;


const SALIENCE_INCREMENT =
  0.12;


const MAX_SALIENCE =
  1;


const TYPE_EVIDENCE_DECAY =
  0.92;


// ======================================================
// Helpers
// ======================================================

function clamp01(
  value
) {
  return Math.max(
    0,
    Math.min(
      1,
      Number(
        value
      ) || 0
    )
  );
}


function normalizeName(
  value
) {
  return String(
    value ||
    ""
  )
    .normalize(
      "NFKC"
    )
    .trim();
}


function normalizeConcept(
  value
) {
  const result =
    String(
      value ||
      ""
    )
      .trim();


  return result ||
    null;
}


function makeEntityKey({
  entityId,
  draftEntityKey,
  name,
}) {
  if (
    entityId
  ) {
    return `entity:${entityId}`;
  }


  if (
    draftEntityKey
  ) {
    return `draft:${draftEntityKey}`;
  }


  const normalizedName =
    normalizeName(
      name
    );


  if (
    normalizedName
  ) {
    return `name:${normalizedName}`;
  }


  return null;
}


function mergeConfidence(
  current,
  incoming
) {
  const a =
    clamp01(
      current
    );


  const b =
    clamp01(
      incoming
    );


  /*
   * Evidence accumulation:
   *
   * repeated independent support should increase
   * confidence, but never exceed 1.
   *
   * Example:
   *
   * 0.70 + 0.70
   * -> 0.91
   */
  return (
    1 -
    (
      1 -
      a
    ) *
    (
      1 -
      b
    )
  );
}


// ======================================================
// Semantic Entity
// ======================================================

function createSemanticEntity({
  key,

  name = null,

  entityId = null,

  draftEntityKey = null,
}) {
  return {
    key,

    name:
      normalizeName(
        name
      ) ||
      null,

    entityId:
      entityId ||
      null,

    draftEntityKey:
      draftEntityKey ||
      null,


    // --------------------------------------------------
    // Semantic Type Beliefs
    // --------------------------------------------------

    probableTypes:
      {},


    // --------------------------------------------------
    // Known / Suggested Fields
    // --------------------------------------------------

    fields:
      {},


    // --------------------------------------------------
    // Relations
    // --------------------------------------------------

    relations:
      {},


    // --------------------------------------------------
    // Discourse Memory
    // --------------------------------------------------

    mentionCount:
      0,

    salience:
      DEFAULT_ENTITY_SALIENCE,

    lastMentionStart:
      null,

    evidence:
      [],
  };
}


// ======================================================
// State
// ======================================================

function createSemanticState() {
  return {
    entities:
      new Map(),

    entityNameIndex:
      new Map(),

    sequence:
      0,
  };
}


// ======================================================
// Entity Lookup
// ======================================================

function getOrCreateSemanticEntity(
  state,
  {
    entityId = null,

    draftEntityKey = null,

    name = null,
  }
) {
  if (
    !state
  ) {
    return null;
  }


  const key =
    makeEntityKey({
      entityId,

      draftEntityKey,

      name,
    });


  if (
    !key
  ) {
    return null;
  }


  let entity =
    state.entities.get(
      key
    );


  /*
   * If we only know the name now, but the same name was
   * already seen under another temporary identity, reuse it.
   */
  if (
    !entity &&
    name
  ) {
    const indexedKey =
      state
        .entityNameIndex
        .get(
          normalizeName(
            name
          )
        );


    if (
      indexedKey
    ) {
      entity =
        state.entities.get(
          indexedKey
        );
    }
  }


  if (
    !entity
  ) {
    entity =
      createSemanticEntity({
        key,

        name,

        entityId,

        draftEntityKey,
      });


    state.entities.set(
      key,
      entity
    );
  }


  if (
    name
  ) {
    entity.name =
      normalizeName(
        name
      );


    state
      .entityNameIndex
      .set(
        entity.name,
        entity.key
      );
  }


  if (
    entityId
  ) {
    entity.entityId =
      entityId;
  }


  if (
    draftEntityKey
  ) {
    entity.draftEntityKey =
      draftEntityKey;
  }


  return entity;
}


// ======================================================
// Mention
// ======================================================

function registerMention(
  entity,
  {
    start = null,

    confidence = 0.7,

    source = null,
  } = {}
) {
  if (
    !entity
  ) {
    return;
  }


  entity.mentionCount +=
    1;


  entity.salience =
    Math.min(
      MAX_SALIENCE,

      entity.salience +
      SALIENCE_INCREMENT
    );


  if (
    Number.isFinite(
      start
    )
  ) {
    entity.lastMentionStart =
      start;
  }


  entity.evidence.push({
    kind:
      "mention",

    confidence:
      clamp01(
        confidence
      ),

    source,

    start,
  });
}


// ======================================================
// Type Evidence
// ======================================================

function addTypeEvidence(
  entity,
  {
    concept,

    confidence = 0.5,

    source = null,

    metadata = null,
  }
) {
  if (
    !entity
  ) {
    return;
  }


  const normalizedConcept =
    normalizeConcept(
      concept
    );


  if (
    !normalizedConcept
  ) {
    return;
  }


  const previous =
    entity
      .probableTypes[
        normalizedConcept
      ] ||
    0;


  const next =
    mergeConfidence(
      previous *
        TYPE_EVIDENCE_DECAY,

      confidence
    );


  entity
    .probableTypes[
      normalizedConcept
    ] =
    next;


  entity.evidence.push({
    kind:
      "type",

    concept:
      normalizedConcept,

    confidence:
      clamp01(
        confidence
      ),

    source,

    metadata,
  });
}


// ======================================================
// Field Evidence
// ======================================================

function addFieldEvidence(
  entity,
  {
    fieldConcept,

    value,

    confidence = 0.5,

    source = null,

    metadata = null,
  }
) {
  if (
    !entity
  ) {
    return;
  }


  const normalizedConcept =
    normalizeConcept(
      fieldConcept
    );


  if (
    !normalizedConcept
  ) {
    return;
  }


  const existing =
    entity
      .fields[
        normalizedConcept
      ];


  if (
    !existing ||
    confidence >=
      existing.confidence
  ) {
    entity.fields[
      normalizedConcept
    ] = {
      value,

      confidence:
        clamp01(
          confidence
        ),

      source,

      metadata,
    };
  }


  entity.evidence.push({
    kind:
      "field",

    fieldConcept:
      normalizedConcept,

    value,

    confidence:
      clamp01(
        confidence
      ),

    source,

    metadata,
  });
}


// ======================================================
// Relation Evidence
// ======================================================

function addRelationEvidence(
  entity,
  {
    relationConcept,

    targetName = null,

    targetEntityId = null,

    confidence = 0.5,

    source = null,
  }
) {
  if (
    !entity
  ) {
    return;
  }


  const normalizedConcept =
    normalizeConcept(
      relationConcept
    );


  if (
    !normalizedConcept
  ) {
    return;
  }


  if (
    !Array.isArray(
      entity
        .relations[
          normalizedConcept
        ]
    )
  ) {
    entity.relations[
      normalizedConcept
    ] = [];
  }


  const list =
    entity
      .relations[
        normalizedConcept
      ];


  const alreadyExists =
    list.some(
      (
        item
      ) =>
        (
          targetEntityId &&
          item.targetEntityId ===
            targetEntityId
        ) ||
        (
          targetName &&
          item.targetName ===
            targetName
        )
    );


  if (
    !alreadyExists
  ) {
    list.push({
      targetName,

      targetEntityId,

      confidence:
        clamp01(
          confidence
        ),

      source,
    });
  }


  entity.evidence.push({
    kind:
      "relation",

    relationConcept:
      normalizedConcept,

    targetName,

    targetEntityId,

    confidence:
      clamp01(
        confidence
      ),

    source,
  });
}


// ======================================================
// Best Type
// ======================================================

function getBestType(
  entity
) {
  if (
    !entity
  ) {
    return null;
  }


  const entries =
    Object.entries(
      entity.probableTypes ||
      {}
    );


  if (
    entries.length ===
    0
  ) {
    return null;
  }


  entries.sort(
    (
      a,
      b
    ) =>
      b[1] -
      a[1]
  );


  return {
    concept:
      entries[0][0],

    confidence:
      entries[0][1],
  };
}


// ======================================================
// Candidate -> Entity
// ======================================================

function resolveSemanticEntityFromCandidate(
  state,
  candidate,
  role =
    "subject"
) {
  if (
    !candidate
  ) {
    return null;
  }


  if (
    role ===
    "object"
  ) {
    return getOrCreateSemanticEntity(
      state,
      {
        entityId:
          candidate
            .objectEntityId ||
          candidate
            .objectResolution
            ?.entityId ||
          null,

        draftEntityKey:
          candidate
            .objectDraftEntityKey ||
          null,

        name:
          candidate.objectHint ||
          null,
      }
    );
  }


  return getOrCreateSemanticEntity(
    state,
    {
      entityId:
        candidate
          .subjectEntityId ||
        candidate
          .subjectResolution
          ?.entityId ||
        null,

      draftEntityKey:
        candidate
          .subjectDraftEntityKey ||
        null,

      name:
        candidate.subjectHint ||
        null,
    }
  );
}


// ======================================================
// Candidate Ingestion
// ======================================================

function ingestCandidate(
  state,
  candidate
) {
  if (
    !state ||
    !candidate
  ) {
    return;
  }


  const confidence =
    clamp01(
      candidate.confidence ??
      0.7
    );


  const subjectEntity =
    resolveSemanticEntityFromCandidate(
      state,
      candidate,
      "subject"
    );


  if (
    subjectEntity
  ) {
    registerMention(
      subjectEntity,
      {
        start:
          candidate.start,

        confidence,

        source:
          candidate.candidateType ||
          "candidate",
      }
    );


    const subjectTypeConcept =
      candidate
        .subjectTypeConcept ||
      candidate
        .subjectDraftEntity
        ?.likelyTypeConcept ||
      candidate
        .subjectResolution
        ?.entityTypeConcept ||
      null;


    if (
      subjectTypeConcept
    ) {
      addTypeEvidence(
        subjectEntity,
        {
          concept:
            subjectTypeConcept,

          confidence,

          source:
            "candidate-subject-type",
        }
      );
    }
  }


  // ====================================================
  // Field
  // ====================================================

  if (
    subjectEntity &&
    candidate.fieldConcept
  ) {
    addFieldEvidence(
      subjectEntity,
      {
        fieldConcept:
          candidate.fieldConcept,

        value:
          candidate
            .normalizedValue ??
          candidate.value,

        confidence,

        source:
          candidate.extractor ||
          candidate.candidateType ||
          "field-candidate",
      }
    );


    /*
     * Character-specific fields provide additional
     * semantic type evidence.
     *
     * Examples:
     *
     * age
     * gender
     * occupation
     * pronouns
     */
    if (
      [
        "field.age",
        "field.gender",
        "field.pronouns",
        "field.occupation",
      ].includes(
        candidate.fieldConcept
      )
    ) {
      addTypeEvidence(
        subjectEntity,
        {
          concept:
            "entityType.character",

          confidence:
            Math.max(
              0.7,
              confidence
            ),

          source:
            `field:${candidate.fieldConcept}`,
        }
      );
    }
  }


  // ====================================================
  // Relation
  // ====================================================

  if (
    subjectEntity &&
    candidate.relationConcept
  ) {
    addRelationEvidence(
      subjectEntity,
      {
        relationConcept:
          candidate
            .relationConcept,

        targetName:
          candidate.objectHint ||
          null,

        targetEntityId:
          candidate
            .objectEntityId ||
          candidate
            .objectResolution
            ?.entityId ||
          null,

        confidence,

        source:
          candidate.extractor ||
          "relation-candidate",
      }
    );
  }


  // ====================================================
  // Object Mention
  // ====================================================

  const objectEntity =
    resolveSemanticEntityFromCandidate(
      state,
      candidate,
      "object"
    );


  if (
    objectEntity
  ) {
    registerMention(
      objectEntity,
      {
        start:
          candidate.start,

        confidence,

        source:
          "candidate-object",
      }
    );


    const objectTypeConcept =
      candidate
        .objectTypeConcept ||
      candidate
        .objectDraftEntity
        ?.likelyTypeConcept ||
      candidate
        .objectResolution
        ?.entityTypeConcept ||
      null;


    if (
      objectTypeConcept
    ) {
      addTypeEvidence(
        objectEntity,
        {
          concept:
            objectTypeConcept,

          confidence,

          source:
            "candidate-object-type",
        }
      );
    }
  }
}


// ======================================================
// Build State
// ======================================================

function buildSemanticState({
  candidates = [],
}) {
  const state =
    createSemanticState();


  const sorted =
    [
      ...candidates,
    ]
      .sort(
        (
          a,
          b
        ) =>
          (
            a.start ??
            0
          ) -
          (
            b.start ??
            0
          )
      );


  for (
    const candidate of
    sorted
  ) {
    ingestCandidate(
      state,
      candidate
    );


    state.sequence +=
      1;
  }


  return state;
}


// ======================================================
// Serializable Debug Snapshot
// ======================================================

function serializeSemanticState(
  state
) {
  if (
    !state
  ) {
    return {
      entities:
        [],
    };
  }


  return {
    sequence:
      state.sequence,

    entities:
      Array.from(
        state.entities.values()
      )
        .map(
          (
            entity
          ) => ({
            key:
              entity.key,

            name:
              entity.name,

            entityId:
              entity.entityId,

            draftEntityKey:
              entity.draftEntityKey,

            mentionCount:
              entity.mentionCount,

            salience:
              entity.salience,

            probableTypes:
              entity.probableTypes,

            bestType:
              getBestType(
                entity
              ),

            fields:
              entity.fields,

            relations:
              entity.relations,

            lastMentionStart:
              entity
                .lastMentionStart,
          })
        ),
  };
}


// ======================================================
// Public Query Helpers
// ======================================================

function findSemanticEntityByName(
  state,
  name
) {
  if (
    !state ||
    !name
  ) {
    return null;
  }


  const normalizedName =
    normalizeName(
      name
    );


  const key =
    state
      .entityNameIndex
      .get(
        normalizedName
      );


  if (
    !key
  ) {
    return null;
  }


  return (
    state.entities.get(
      key
    ) ||
    null
  );
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  createSemanticState,

  getOrCreateSemanticEntity,

  registerMention,

  addTypeEvidence,

  addFieldEvidence,

  addRelationEvidence,

  getBestType,

  ingestCandidate,

  buildSemanticState,

  serializeSemanticState,

  findSemanticEntityByName,
};