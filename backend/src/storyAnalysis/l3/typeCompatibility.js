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
};


const RELATION_OBJECT_EXPECTATIONS = {
  "relation.member_of":
    ORGANIZATION_TYPES,

  "relation.located_in":
    LOCATION_TYPES,

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

  "relation.located_in": [
    ...CHARACTER_TYPES,
    ...ORGANIZATION_TYPES,
    ...LOCATION_TYPES,
    ...VEHICLE_TYPES,
  ],
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
// Expected Types
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


  if (
    candidate.candidateType ===
    "event"
  ) {
    if (
      role ===
      "subject"
    ) {
      return uniqueConcepts(
        EVENT_SUBJECT_EXPECTATIONS[
          candidate.eventConcept
        ]
      );
    }


    if (
      role ===
      "object"
    ) {
      return uniqueConcepts(
        EVENT_OBJECT_EXPECTATIONS[
          candidate.eventConcept
        ]
      );
    }
  }


  if (
    candidate.candidateType ===
    "relation-state"
  ) {
    if (
      role ===
      "subject"
    ) {
      return uniqueConcepts(
        RELATION_SUBJECT_EXPECTATIONS[
          candidate.relationConcept
        ]
      );
    }


    if (
      role ===
      "object"
    ) {
      return uniqueConcepts(
        RELATION_OBJECT_EXPECTATIONS[
          candidate.relationConcept
        ]
      );
    }
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


module.exports = {
  CHARACTER_TYPES,
  ORGANIZATION_TYPES,
  LOCATION_TYPES,
  VEHICLE_TYPES,

  getExpectedTypeConcepts,

  isConceptSameOrChildOf,
  calculateTypeCompatibility,
};