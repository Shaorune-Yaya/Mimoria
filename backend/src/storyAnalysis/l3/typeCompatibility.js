// ======================================================
// L3-A Type Compatibility
//
// Provides deterministic ontology compatibility scoring
// for entity resolution.
//
// This layer does NOT access MongoDB.
// ======================================================


const {
  getConcept,
} = require(
  "../concepts/registry"
);


// ======================================================
// Semantic Type Groups
// ======================================================

const CHARACTER_TYPES = [
  "entityType.character",
  "entityType.person",
  "entityType.robot",
  "entityType.android",
  "entityType.cyborg",
  "entityType.artificialIntelligence",
];


const ORGANIZATION_TYPES = [
  "entityType.organization",
  "entityType.faction",
  "entityType.government",
  "entityType.politicalParty",
  "entityType.guild",
  "entityType.corporation",
  "entityType.military",
  "entityType.militaryUnit",
  "entityType.order",
  "entityType.religion",
  "entityType.church",
  "entityType.cult",
  "entityType.school",
  "entityType.secretSociety",
  "entityType.criminalOrganization",
];


const LOCATION_TYPES = [
  "entityType.location",
  "entityType.country",
  "entityType.kingdom",
  "entityType.empire",
  "entityType.city",
  "entityType.port",
  "entityType.town",
  "entityType.village",
  "entityType.region",
  "entityType.province",
  "entityType.continent",
  "entityType.planet",
  "entityType.world",
  "entityType.dimension",
  "entityType.island",
  "entityType.mountain",
  "entityType.forest",
  "entityType.river",
  "entityType.lake",
  "entityType.ocean",
  "entityType.desert",
  "entityType.building",
  "entityType.landmark",
  "entityType.ruin",
  "entityType.dungeon",

  "entityType.star",
  "entityType.starSystem",
  "entityType.spaceStation",
  "entityType.colony",
];


const VEHICLE_TYPES = [
  "entityType.vehicle",
  "entityType.ship",
  "entityType.spacecraft",
];


// ======================================================
// Candidate Expectations
// ======================================================

const EVENT_OBJECT_EXPECTATIONS = {
  "event.join":
    ORGANIZATION_TYPES,

  "event.leave":
    ORGANIZATION_TYPES,

  "event.travel":
    LOCATION_TYPES,

  "event.arrive":
    LOCATION_TYPES,

  "event.depart":
    LOCATION_TYPES,

  "event.land":
    LOCATION_TYPES,

  "event.dock": [
    "entityType.spaceStation",
    "entityType.building",
    "entityType.location",

    ...LOCATION_TYPES,
  ],

  "event.colonize": [
    "entityType.planet",
    "entityType.colony",
    "entityType.location",
  ],

  "event.terraform": [
    "entityType.planet",
    "entityType.colony",
  ],

  "event.hack": [
    "entityType.organization",
    "entityType.corporation",
    "entityType.artificialIntelligence",
    "entityType.building",
  ],
};


const EVENT_SUBJECT_EXPECTATIONS = {
  "event.join":
    CHARACTER_TYPES,

  "event.leave":
    CHARACTER_TYPES,

  "event.travel": [
    ...CHARACTER_TYPES,
    ...VEHICLE_TYPES,
  ],

  "event.depart": [
    ...CHARACTER_TYPES,
    ...VEHICLE_TYPES,
  ],

  "event.arrive": [
    ...CHARACTER_TYPES,
    ...VEHICLE_TYPES,
  ],

  "event.launch":
    VEHICLE_TYPES,

  "event.land":
    VEHICLE_TYPES,

  "event.dock":
    VEHICLE_TYPES,

  "event.ftlJump":
    VEHICLE_TYPES,

  "event.augment":
    CHARACTER_TYPES,

  "event.uploadMind":
    CHARACTER_TYPES,

  "event.downloadMind":
    CHARACTER_TYPES,

  "event.birth":
    CHARACTER_TYPES,

  "event.death":
    CHARACTER_TYPES,
};


const RELATION_OBJECT_EXPECTATIONS = {
  "relation.member_of":
    ORGANIZATION_TYPES,

  "relation.located_in":
    LOCATION_TYPES,

  "relation.from":
    LOCATION_TYPES,

  "relation.origin":
    LOCATION_TYPES,

  "relation.born_in":
    LOCATION_TYPES,

  "relation.resides_in":
    LOCATION_TYPES,

  "relation.lives_in":
    LOCATION_TYPES,

  "relation.works_for":
    ORGANIZATION_TYPES,

  "relation.affiliated_with":
    ORGANIZATION_TYPES,

  "relation.colony_of": [
    ...ORGANIZATION_TYPES,
    "entityType.planet",
  ],

  "relation.orbits": [
    "entityType.star",
    "entityType.planet",
  ],
};


const RELATION_SUBJECT_EXPECTATIONS = {
  "relation.member_of":
    CHARACTER_TYPES,

  "relation.from":
    CHARACTER_TYPES,

  "relation.origin":
    CHARACTER_TYPES,

  "relation.born_in":
    CHARACTER_TYPES,

  "relation.resides_in":
    CHARACTER_TYPES,

  "relation.lives_in":
    CHARACTER_TYPES,

  "relation.works_for":
    CHARACTER_TYPES,

  "relation.affiliated_with": [
    ...CHARACTER_TYPES,
    ...ORGANIZATION_TYPES,
  ],

  "relation.located_in": [
    ...CHARACTER_TYPES,
    ...ORGANIZATION_TYPES,
    ...LOCATION_TYPES,
    ...VEHICLE_TYPES,
  ],
};


// ======================================================
// Field Subject Expectations
//
// These fields describe the entity that owns the field.
//
// Example:
//
// Alice is 24 years old.
//
// field.age belongs to Alice.
// Therefore Alice is very likely a Character.
//
// This is especially important for Smart Import because
// the subject entity may not exist in MongoDB yet.
// ======================================================

const FIELD_SUBJECT_EXPECTATIONS = {
  // ----------------------------------------------------
  // Character identity / biography
  // ----------------------------------------------------

  "field.age":
    CHARACTER_TYPES,

  "field.birthdate":
    CHARACTER_TYPES,

  "field.birthplace":
    CHARACTER_TYPES,

  "field.deathdate":
    CHARACTER_TYPES,

  "field.deathplace":
    CHARACTER_TYPES,

  "field.gender":
    CHARACTER_TYPES,

  "field.pronouns":
    CHARACTER_TYPES,

  "field.race":
    CHARACTER_TYPES,

  "field.species":
    CHARACTER_TYPES,

  "field.nationality":
    CHARACTER_TYPES,

  "field.occupation":
    CHARACTER_TYPES,

  "field.profession":
    CHARACTER_TYPES,

  "field.rank":
    CHARACTER_TYPES,

  "field.role":
    CHARACTER_TYPES,

  "field.affiliation":
    CHARACTER_TYPES,

  "field.residence":
    CHARACTER_TYPES,

  "field.currentLocation":
    CHARACTER_TYPES,

  "field.hometown":
    CHARACTER_TYPES,

  "field.height":
    CHARACTER_TYPES,

  "field.weight":
    CHARACTER_TYPES,

  "field.eyeColor":
    CHARACTER_TYPES,

  "field.hairColor":
    CHARACTER_TYPES,

  "field.appearance":
    CHARACTER_TYPES,

  "field.personality":
    CHARACTER_TYPES,

  "field.goal":
    CHARACTER_TYPES,

  "field.motivation":
    CHARACTER_TYPES,

  "field.likes":
    CHARACTER_TYPES,

  "field.dislikes":
    CHARACTER_TYPES,

  "field.fears":
    CHARACTER_TYPES,

  "field.alive":
    CHARACTER_TYPES,
};


// ======================================================
// Ontology Helpers
// ======================================================

function getParentConceptId(
  conceptId
) {
  const concept =
    getConcept(
      conceptId
    );


  return (
    concept?.parent ||
    null
  );
}


function isConceptSameOrChildOf(
  actualConceptId,
  expectedConceptId
) {
  if (
    !actualConceptId ||
    !expectedConceptId
  ) {
    return false;
  }


  if (
    actualConceptId ===
    expectedConceptId
  ) {
    return true;
  }


  const visited =
    new Set();


  let current =
    actualConceptId;


  while (
    current &&
    !visited.has(
      current
    )
  ) {
    visited.add(
      current
    );


    const parent =
      getParentConceptId(
        current
      );


    if (
      !parent
    ) {
      return false;
    }


    if (
      parent ===
      expectedConceptId
    ) {
      return true;
    }


    current =
      parent;
  }


  return false;
}


// ======================================================
// Helpers
// ======================================================

function uniqueConcepts(
  values
) {
  return [
    ...new Set(
      (
        values ||
        []
      ).filter(
        Boolean
      )
    ),
  ];
}


function getCandidateEventConcept(
  candidate
) {
  return (
    candidate?.eventConcept ||
    candidate?.eventType ||
    null
  );
}


function getCandidateRelationConcept(
  candidate
) {
  return (
    candidate?.relationConcept ||
    candidate?.relationType ||
    null
  );
}


function getCandidateFieldConcept(
  candidate
) {
  return (
    candidate?.fieldConcept ||
    null
  );
}


// ======================================================
// Expected Types
//
// IMPORTANT:
//
// Do not rely only on candidateType.
//
// During the analysis pipeline several equivalent
// candidate shapes exist:
//
// relation
// relation-state
// event
// field-value
//
// Semantic concepts are more reliable than the exact
// internal candidateType label.
// ======================================================

function getExpectedTypeConcepts({
  candidate,
  role,
}) {
  if (
    !candidate ||
    !role
  ) {
    return [];
  }


  const eventConcept =
    getCandidateEventConcept(
      candidate
    );


  const relationConcept =
    getCandidateRelationConcept(
      candidate
    );


  const fieldConcept =
    getCandidateFieldConcept(
      candidate
    );


  // ====================================================
  // Event
  // ====================================================

  if (
    eventConcept
  ) {
    if (
      role ===
      "subject"
    ) {
      return uniqueConcepts(
        EVENT_SUBJECT_EXPECTATIONS[
          eventConcept
        ]
      );
    }


    if (
      role ===
      "object"
    ) {
      return uniqueConcepts(
        EVENT_OBJECT_EXPECTATIONS[
          eventConcept
        ]
      );
    }
  }


  // ====================================================
  // Relation
  // ====================================================

  if (
    relationConcept
  ) {
    if (
      role ===
      "subject"
    ) {
      return uniqueConcepts(
        RELATION_SUBJECT_EXPECTATIONS[
          relationConcept
        ]
      );
    }


    if (
      role ===
      "object"
    ) {
      return uniqueConcepts(
        RELATION_OBJECT_EXPECTATIONS[
          relationConcept
        ]
      );
    }
  }


  // ====================================================
  // Field Value
  //
  // Only the subject owns the field.
  //
  // Example:
  //
  // Alice age = 24
  //
  // Alice is the Character.
  //
  // The value 24 is not an Entity and therefore has no
  // object-side EntityType expectation.
  // ====================================================

  if (
    fieldConcept &&
    role ===
      "subject"
  ) {
    return uniqueConcepts(
      FIELD_SUBJECT_EXPECTATIONS[
        fieldConcept
      ]
    );
  }


  return [];
}


// ======================================================
// Compatibility Score
// ======================================================

function calculateTypeCompatibility({
  actualTypeConcept,
  expectedTypeConcepts,
}) {
  if (
    !actualTypeConcept ||
    !Array.isArray(
      expectedTypeConcepts
    ) ||
    expectedTypeConcepts.length ===
      0
  ) {
    return {
      compatible:
        null,

      score:
        0,

      matchedExpectedConcept:
        null,
    };
  }


  for (
    const expected of
    expectedTypeConcepts
  ) {
    if (
      actualTypeConcept ===
      expected
    ) {
      return {
        compatible:
          true,

        score:
          0.12,

        matchedExpectedConcept:
          expected,
      };
    }
  }


  for (
    const expected of
    expectedTypeConcepts
  ) {
    if (
      isConceptSameOrChildOf(
        actualTypeConcept,
        expected
      )
    ) {
      return {
        compatible:
          true,

        score:
          0.08,

        matchedExpectedConcept:
          expected,
      };
    }
  }


  return {
    compatible:
      false,

    score:
      -0.15,

    matchedExpectedConcept:
      null,
  };
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  CHARACTER_TYPES,
  ORGANIZATION_TYPES,
  LOCATION_TYPES,
  VEHICLE_TYPES,

  EVENT_OBJECT_EXPECTATIONS,
  EVENT_SUBJECT_EXPECTATIONS,

  RELATION_OBJECT_EXPECTATIONS,
  RELATION_SUBJECT_EXPECTATIONS,

  FIELD_SUBJECT_EXPECTATIONS,

  getExpectedTypeConcepts,

  isConceptSameOrChildOf,
  calculateTypeCompatibility,
};