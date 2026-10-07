const LANGUAGE_CONCEPTS = {
  // ====================================================
  // Relations - Social
  // ====================================================

  "relation.parent_of": {
    kind: "relation",
    symmetric: false,
  },

  "relation.child_of": {
    kind: "relation",
    symmetric: false,
  },

  "relation.sibling_of": {
    kind: "relation",
    symmetric: true,
  },

  "relation.spouse_of": {
    kind: "relation",
    symmetric: true,
  },

  "relation.partner_of": {
    kind: "relation",
    symmetric: true,
  },

  "relation.friend_of": {
    kind: "relation",
    symmetric: true,
  },

  "relation.enemy_of": {
    kind: "relation",
    symmetric: true,
  },

  "relation.rival_of": {
    kind: "relation",
    symmetric: true,
  },

  "relation.mentor_of": {
    kind: "relation",
    symmetric: false,
  },

  "relation.student_of": {
    kind: "relation",
    symmetric: false,
  },

  "relation.master_of": {
    kind: "relation",
    symmetric: false,
  },


  // ====================================================
  // Relations - Organizations
  // ====================================================

  "relation.member_of": {
    kind: "relation",
    symmetric: false,
    objectConcepts: [
      "entityType.organization",
      "entityType.faction",
    ],
  },

  "relation.leader_of": {
    kind: "relation",
    symmetric: false,
  },

  "relation.founder_of": {
    kind: "relation",
    symmetric: false,
  },

  "relation.works_for": {
    kind: "relation",
    symmetric: false,
  },

  "relation.commands": {
    kind: "relation",
    symmetric: false,
  },

  "relation.serves": {
    kind: "relation",
    symmetric: false,
  },


  // ====================================================
  // Relations - Location
  // ====================================================

  "relation.located_in": {
    kind: "relation",
    symmetric: false,
    objectConcepts: [
      "entityType.location",
    ],
  },

  "relation.part_of": {
    kind: "relation",
    symmetric: false,
  },

  "relation.contains": {
    kind: "relation",
    symmetric: false,
  },

  "relation.capital_of": {
    kind: "relation",
    symmetric: false,
  },

  "relation.borders": {
    kind: "relation",
    symmetric: true,
  },

  "relation.near": {
    kind: "relation",
    symmetric: true,
  },

  "relation.north_of": {
    kind: "relation",
    symmetric: false,
  },

  "relation.south_of": {
    kind: "relation",
    symmetric: false,
  },

  "relation.east_of": {
    kind: "relation",
    symmetric: false,
  },

  "relation.west_of": {
    kind: "relation",
    symmetric: false,
  },


  // ====================================================
  // Relations - Origin / Residence
  // ====================================================

  "relation.born_in": {
    kind: "relation",
    symmetric: false,
  },

  "relation.from": {
    kind: "relation",
    symmetric: false,
  },

  "relation.lives_in": {
    kind: "relation",
    symmetric: false,
  },

  "relation.resides_in": {
    kind: "relation",
    symmetric: false,
  },


  // ====================================================
  // Relations - Politics
  // ====================================================

  "relation.allied_with": {
    kind: "relation",
    symmetric: true,
  },

  "relation.at_war_with": {
    kind: "relation",
    symmetric: true,
  },

  "relation.diplomatic_relations_with": {
    kind: "relation",
    symmetric: true,
  },

  "relation.controls": {
    kind: "relation",
    symmetric: false,
  },

  "relation.ruled_by": {
    kind: "relation",
    symmetric: false,
  },

  "relation.vassal_of": {
    kind: "relation",
    symmetric: false,
  },

  "relation.occupied_by": {
    kind: "relation",
    symmetric: false,
  },


  // ====================================================
  // Relations - Ownership / Creation
  // ====================================================

  "relation.owns": {
    kind: "relation",
    symmetric: false,
  },

  "relation.owned_by": {
    kind: "relation",
    symmetric: false,
  },

  "relation.created": {
    kind: "relation",
    symmetric: false,
  },

  "relation.created_by": {
    kind: "relation",
    symmetric: false,
  },

  "relation.uses": {
    kind: "relation",
    symmetric: false,
  },

  "relation.wields": {
    kind: "relation",
    symmetric: false,
  },


  // ====================================================
  // Events - Life
  // ====================================================

  "event.birth": {
    kind: "event",
  },

  "event.death": {
    kind: "event",
  },

  "event.resurrection": {
    kind: "event",
  },

  "event.marry": {
    kind: "event",
    producesRelation:
      "relation.spouse_of",
  },

  "event.divorce": {
    kind: "event",
    endsRelation:
      "relation.spouse_of",
  },


  // ====================================================
  // Events - Organization
  // ====================================================

  "event.join": {
    kind: "event",
    producesRelation:
      "relation.member_of",
  },

  "event.leave": {
    kind: "event",
    endsRelation:
      "relation.member_of",
  },

  "event.appoint": {
    kind: "event",
  },

  "event.promote": {
    kind: "event",
  },

  "event.demote": {
    kind: "event",
  },

  "event.resign": {
    kind: "event",
  },

  "event.expel": {
    kind: "event",
  },

  "event.betray": {
    kind: "event",
  },

  "event.surrender": {
    kind: "event",
  },

  "event.changeSide": {
    kind: "event",
  },


  // ====================================================
  // Events - Movement
  // ====================================================

  "event.travel": {
    kind: "event",
  },

  "event.arrive": {
    kind: "event",
  },

  "event.depart": {
    kind: "event",
  },

  "event.return": {
    kind: "event",
  },

  "event.escape": {
    kind: "event",
  },

  "event.exile": {
    kind: "event",
  },

  "event.migrate": {
    kind: "event",
  },


  // ====================================================
  // Events - Creation / Destruction
  // ====================================================

  "event.found": {
    kind: "event",
  },

  "event.create": {
    kind: "event",
  },

  "event.build": {
    kind: "event",
  },

  "event.destroy": {
    kind: "event",
  },

  "event.discover": {
    kind: "event",
  },

  "event.invent": {
    kind: "event",
  },


  // ====================================================
  // Events - Conflict
  // ====================================================

  "event.attack": {
    kind: "event",
  },

  "event.defend": {
    kind: "event",
  },

  "event.invade": {
    kind: "event",
  },

  "event.conquer": {
    kind: "event",
  },

  "event.occupy": {
    kind: "event",
  },

  "event.liberate": {
    kind: "event",
  },

  "event.rebel": {
    kind: "event",
  },

  "event.warStart": {
    kind: "event",
  },

  "event.warEnd": {
    kind: "event",
  },


  // ====================================================
  // Events - Diplomacy
  // ====================================================

  "event.formAlliance": {
    kind: "event",
    producesRelation:
      "relation.allied_with",
  },

  "event.breakAlliance": {
    kind: "event",
    endsRelation:
      "relation.allied_with",
  },

  "event.establishDiplomacy": {
    kind: "event",
    producesRelation:
      "relation.diplomatic_relations_with",
  },

  "event.breakDiplomacy": {
    kind: "event",
    endsRelation:
      "relation.diplomatic_relations_with",
  },


  // ====================================================
  // Events - Possession
  // ====================================================

  "event.acquire": {
    kind: "event",
  },

  "event.lose": {
    kind: "event",
  },

  "event.give": {
    kind: "event",
  },

  "event.steal": {
    kind: "event",
  },

  "event.buy": {
    kind: "event",
  },

  "event.sell": {
    kind: "event",
  },


  // ====================================================
  // Modifiers
  // ====================================================

  "modifier.negation": {
    kind: "modifier",
  },

  "modifier.uncertainty": {
    kind: "modifier",
  },

  "modifier.intention": {
    kind: "modifier",
  },

  "modifier.hypothetical": {
    kind: "modifier",
  },

  "modifier.reported": {
    kind: "modifier",
  },

  "modifier.past": {
    kind: "modifier",
  },

  "modifier.present": {
    kind: "modifier",
  },

  "modifier.future": {
    kind: "modifier",
  },

  "modifier.completed": {
    kind: "modifier",
  },

  "modifier.ongoing": {
    kind: "modifier",
  },


  // ====================================================
  // Discourse
  // ====================================================

  "discourse.contrast": {
    kind: "discourse",
  },

  "discourse.sequence": {
    kind: "discourse",
  },

  "discourse.before": {
    kind: "discourse",
  },

  "discourse.after": {
    kind: "discourse",
  },

  "discourse.finally": {
    kind: "discourse",
  },

  "discourse.cause": {
    kind: "discourse",
  },

  "discourse.result": {
    kind: "discourse",
  },

  "discourse.condition": {
    kind: "discourse",
  },


  // ====================================================
  // Units
  // ====================================================

  "unit.age.year": {
    kind: "unit",
    dimension: "age",
    canonicalUnit: "year",
  },

  "unit.length.mm": {
    kind: "unit",
    dimension: "length",
    canonicalUnit: "mm",
  },

  "unit.length.cm": {
    kind: "unit",
    dimension: "length",
    canonicalUnit: "cm",
  },

  "unit.length.m": {
    kind: "unit",
    dimension: "length",
    canonicalUnit: "m",
  },

  "unit.length.km": {
    kind: "unit",
    dimension: "length",
    canonicalUnit: "km",
  },

  "unit.mass.g": {
    kind: "unit",
    dimension: "mass",
    canonicalUnit: "g",
  },

  "unit.mass.kg": {
    kind: "unit",
    dimension: "mass",
    canonicalUnit: "kg",
  },

  "unit.mass.lb": {
    kind: "unit",
    dimension: "mass",
    canonicalUnit: "lb",
  },

  "unit.area.m2": {
    kind: "unit",
    dimension: "area",
    canonicalUnit: "m2",
  },

  "unit.area.km2": {
    kind: "unit",
    dimension: "area",
    canonicalUnit: "km2",
  },


  // ====================================================
  // Lexical Role Signals
  // ====================================================

  "role.occupation": {
    kind: "role-signal",
    fieldConcept:
      "field.occupation",
  },

  "role.title": {
    kind: "role-signal",
    fieldConcept:
      "field.title",
  },

  "role.ruler": {
    kind: "role-signal",
    fieldConcept:
      "field.title",
  },

  "role.religious": {
    kind: "role-signal",
    fieldConcept:
      "field.occupation",
  },

  "role.military": {
    kind: "role-signal",
    fieldConcept:
      "field.rank",
  },
};


module.exports = {
  LANGUAGE_CONCEPTS,
};