const {
  LANGUAGE_CONCEPTS,
} = require(
  "./languageConcepts"
);

const CONCEPTS = {
  // ====================================================
  // Entity Types - People / Creatures
  // ====================================================

  "entityType.character": {
    kind: "entity-type",
    parent: null,
    icon: "👤",
  },

  "entityType.person": {
    kind: "entity-type",
    parent: "entityType.character",
    icon: "👤",
  },

  "entityType.family": {
    kind: "entity-type",
    parent: "entityType.organization",
    icon: "👪",
  },

  "entityType.clan": {
    kind: "entity-type",
    parent: "entityType.family",
    icon: "👪",
  },

  "entityType.dynasty": {
    kind: "entity-type",
    parent: "entityType.family",
    icon: "👑",
  },

  "entityType.race": {
    kind: "entity-type",
    parent: null,
    icon: "🧬",
  },

  "entityType.species": {
    kind: "entity-type",
    parent: null,
    icon: "🧬",
  },

  "entityType.creature": {
    kind: "entity-type",
    parent: null,
    icon: "🐾",
  },

  "entityType.monster": {
    kind: "entity-type",
    parent: "entityType.creature",
    icon: "🐾",
  },

  "entityType.deity": {
    kind: "entity-type",
    parent: "entityType.character",
    icon: "✦",
  },

  "entityType.spirit": {
    kind: "entity-type",
    parent: "entityType.creature",
    icon: "✧",
  },

  "entityType.robot": {
    kind: "entity-type",
    parent: "entityType.character",
    icon: "🤖",
  },

  "entityType.artificialIntelligence": {
    kind: "entity-type",
    parent: "entityType.character",
    icon: "◈",
  },


  // ====================================================
  // Entity Types - Geography
  // ====================================================

  "entityType.location": {
    kind: "entity-type",
    parent: null,
    icon: "📍",
  },

  "entityType.country": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "🌐",
  },

  "entityType.kingdom": {
    kind: "entity-type",
    parent: "entityType.country",
    icon: "👑",
  },

  "entityType.empire": {
    kind: "entity-type",
    parent: "entityType.country",
    icon: "♜",
  },

  "entityType.city": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "🏙️",
  },

  "entityType.port": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "⚓",
  },

  "entityType.town": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "🏘️",
  },

  "entityType.village": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "🏡",
  },

  "entityType.region": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "🗺️",
  },

  "entityType.province": {
    kind: "entity-type",
    parent: "entityType.region",
    icon: "🗺️",
  },

  "entityType.continent": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "🌍",
  },

  "entityType.planet": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "🪐",
  },

  "entityType.world": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "🌐",
  },

  "entityType.dimension": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "◉",
  },

  "entityType.island": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "🏝️",
  },

  "entityType.mountain": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "⛰️",
  },

  "entityType.forest": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "🌲",
  },

  "entityType.river": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "〰",
  },

  "entityType.lake": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "💧",
  },

  "entityType.ocean": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "🌊",
  },

  "entityType.desert": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "🏜️",
  },

  "entityType.building": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "🏠",
  },

  "entityType.landmark": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "◆",
  },

  "entityType.ruin": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "🏚️",
  },

  "entityType.dungeon": {
    kind: "entity-type",
    parent: "entityType.location",
    icon: "⬟",
  },


  // ====================================================
  // Entity Types - Organizations
  // ====================================================

  "entityType.organization": {
    kind: "entity-type",
    parent: null,
    icon: "🏢",
  },

  "entityType.faction": {
    kind: "entity-type",
    parent: "entityType.organization",
    icon: "🏛️",
  },

  "entityType.government": {
    kind: "entity-type",
    parent: "entityType.organization",
    icon: "⚖️",
  },

  "entityType.politicalParty": {
    kind: "entity-type",
    parent: "entityType.organization",
    icon: "🏛️",
  },

  "entityType.guild": {
    kind: "entity-type",
    parent: "entityType.organization",
    icon: "🛡️",
  },

  "entityType.corporation": {
    kind: "entity-type",
    parent: "entityType.organization",
    icon: "🏢",
  },

  "entityType.military": {
    kind: "entity-type",
    parent: "entityType.organization",
    icon: "⚔️",
  },

  "entityType.militaryUnit": {
    kind: "entity-type",
    parent: "entityType.military",
    icon: "⚔️",
  },

  "entityType.order": {
    kind: "entity-type",
    parent: "entityType.organization",
    icon: "🛡️",
  },

  "entityType.religion": {
    kind: "entity-type",
    parent: null,
    icon: "✦",
  },

  "entityType.church": {
    kind: "entity-type",
    parent: "entityType.organization",
    icon: "⛪",
  },

  "entityType.cult": {
    kind: "entity-type",
    parent: "entityType.organization",
    icon: "◉",
  },

  "entityType.school": {
    kind: "entity-type",
    parent: "entityType.organization",
    icon: "🏫",
  },

  "entityType.secretSociety": {
    kind: "entity-type",
    parent: "entityType.organization",
    icon: "◈",
  },

  "entityType.criminalOrganization": {
    kind: "entity-type",
    parent: "entityType.organization",
    icon: "♠",
  },


  // ====================================================
  // Entity Types - Items
  // ====================================================

  "entityType.item": {
    kind: "entity-type",
    parent: null,
    icon: "📦",
  },

  "entityType.weapon": {
    kind: "entity-type",
    parent: "entityType.item",
    icon: "⚔️",
  },

  "entityType.armor": {
    kind: "entity-type",
    parent: "entityType.item",
    icon: "🛡️",
  },

  "entityType.artifact": {
    kind: "entity-type",
    parent: "entityType.item",
    icon: "💎",
  },

  "entityType.relic": {
    kind: "entity-type",
    parent: "entityType.artifact",
    icon: "◆",
  },

  "entityType.tool": {
    kind: "entity-type",
    parent: "entityType.item",
    icon: "🔧",
  },

  "entityType.vehicle": {
    kind: "entity-type",
    parent: "entityType.item",
    icon: "🚗",
  },

  "entityType.ship": {
    kind: "entity-type",
    parent: "entityType.vehicle",
    icon: "🚢",
  },

  "entityType.spacecraft": {
    kind: "entity-type",
    parent: "entityType.vehicle",
    icon: "🚀",
  },

  "entityType.book": {
    kind: "entity-type",
    parent: "entityType.item",
    icon: "📖",
  },

  "entityType.document": {
    kind: "entity-type",
    parent: "entityType.item",
    icon: "📜",
  },

  "entityType.food": {
    kind: "entity-type",
    parent: "entityType.item",
    icon: "🍴",
  },

  "entityType.resource": {
    kind: "entity-type",
    parent: null,
    icon: "⛏️",
  },

  "entityType.material": {
    kind: "entity-type",
    parent: "entityType.resource",
    icon: "◆",
  },

  "entityType.currency": {
    kind: "entity-type",
    parent: null,
    icon: "💰",
  },


  // ====================================================
  // Entity Types - Lore / Abstract
  // ====================================================

  "entityType.event": {
    kind: "entity-type",
    parent: null,
    icon: "◆",
  },

  "entityType.war": {
    kind: "entity-type",
    parent: "entityType.event",
    icon: "⚔️",
  },

  "entityType.battle": {
    kind: "entity-type",
    parent: "entityType.event",
    icon: "⚔️",
  },

  "entityType.disaster": {
    kind: "entity-type",
    parent: "entityType.event",
    icon: "⚠️",
  },

  "entityType.era": {
    kind: "entity-type",
    parent: null,
    icon: "⌛",
  },

  "entityType.language": {
    kind: "entity-type",
    parent: null,
    icon: "💬",
  },

  "entityType.culture": {
    kind: "entity-type",
    parent: null,
    icon: "◈",
  },

  "entityType.law": {
    kind: "entity-type",
    parent: null,
    icon: "⚖️",
  },

  "entityType.technology": {
    kind: "entity-type",
    parent: null,
    icon: "⚙️",
  },

  "entityType.magic": {
    kind: "entity-type",
    parent: null,
    icon: "✨",
  },

  "entityType.spell": {
    kind: "entity-type",
    parent: "entityType.magic",
    icon: "✨",
  },

  "entityType.ability": {
    kind: "entity-type",
    parent: null,
    icon: "⭐",
  },

  "entityType.skill": {
    kind: "entity-type",
    parent: "entityType.ability",
    icon: "⭐",
  },

  "entityType.profession": {
    kind: "entity-type",
    parent: null,
    icon: "💼",
  },

  "entityType.disease": {
    kind: "entity-type",
    parent: null,
    icon: "✚",
  },

  "entityType.concept": {
    kind: "entity-type",
    parent: null,
    icon: "💡",
  },


  // ====================================================
  // Fields - Generic
  // ====================================================

  "field.description": {
    kind: "field",
    valueType: "long-text",
  },

  "field.summary": {
    kind: "field",
    valueType: "long-text",
  },

  "field.history": {
    kind: "field",
    valueType: "long-text",
  },

  "field.background": {
    kind: "field",
    valueType: "long-text",
  },

  "field.status": {
    kind: "field",
    valueType: "text",
  },

  "field.alias": {
    kind: "field",
    valueType: "text",
  },

  "field.nickname": {
    kind: "field",
    valueType: "text",
  },

  "field.title": {
    kind: "field",
    valueType: "text",
  },


  // ====================================================
  // Fields - Character
  // ====================================================

  "field.age": {
    kind: "field",
    valueType: "number",
  },

  "field.birthdate": {
    kind: "field",
    valueType: "date",
  },

  "field.birthplace": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.location",
  },

  "field.deathdate": {
    kind: "field",
    valueType: "date",
  },

  "field.deathplace": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.location",
  },

  "field.gender": {
    kind: "field",
    valueType: "text",
  },

  "field.pronouns": {
    kind: "field",
    valueType: "text",
  },

  "field.race": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.race",
  },

  "field.species": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.species",
  },

  "field.nationality": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.country",
  },

  "field.occupation": {
    kind: "field",
    valueType: "text",
  },

  "field.rank": {
    kind: "field",
    valueType: "text",
  },

  "field.role": {
    kind: "field",
    valueType: "text",
  },

  "field.affiliation": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.organization",
  },

  "field.residence": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.location",
  },

  "field.currentLocation": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.location",
  },

  "field.hometown": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.location",
  },

  "field.height": {
    kind: "field",
    valueType: "number",
  },

  "field.weight": {
    kind: "field",
    valueType: "number",
  },

  "field.eyeColor": {
    kind: "field",
    valueType: "text",
  },

  "field.hairColor": {
    kind: "field",
    valueType: "text",
  },

  "field.appearance": {
    kind: "field",
    valueType: "long-text",
  },

  "field.personality": {
    kind: "field",
    valueType: "long-text",
  },

  "field.goal": {
    kind: "field",
    valueType: "long-text",
  },

  "field.motivation": {
    kind: "field",
    valueType: "long-text",
  },

  "field.likes": {
    kind: "field",
    valueType: "long-text",
  },

  "field.dislikes": {
    kind: "field",
    valueType: "long-text",
  },

  "field.fears": {
    kind: "field",
    valueType: "long-text",
  },

  "field.alive": {
    kind: "field",
    valueType: "boolean",
  },

  // ====================================================
  // Fields - Character Appearance / Creature Anatomy
  // ====================================================

  "field.bodyForm": {
    kind: "field",
    valueType: "text",
  },

  "field.bodyCovering": {
    kind: "field",
    valueType: "text",
  },

  "field.primaryColor": {
    kind: "field",
    valueType: "text",
  },

  "field.secondaryColor": {
    kind: "field",
    valueType: "text",
  },

  "field.accentColor": {
    kind: "field",
    valueType: "text",
  },

  "field.colorPalette": {
    kind: "field",
    valueType: "long-text",
  },

  "field.markings": {
    kind: "field",
    valueType: "long-text",
  },

  "field.furColor": {
    kind: "field",
    valueType: "text",
  },

  "field.furLength": {
    kind: "field",
    valueType: "text",
  },

  "field.earType": {
    kind: "field",
    valueType: "text",
  },

  "field.hornType": {
    kind: "field",
    valueType: "text",
  },

  "field.tailType": {
    kind: "field",
    valueType: "text",
  },

  "field.wingType": {
    kind: "field",
    valueType: "text",
  },

  "field.legType": {
    kind: "field",
    valueType: "text",
  },

  "field.pawPadColor": {
    kind: "field",
    valueType: "text",
  },

  "field.accessories": {
    kind: "field",
    valueType: "long-text",
  },

  "field.clothing": {
    kind: "field",
    valueType: "long-text",
  },


  // ====================================================
  // Fields - Optional Adult / Reproductive Anatomy
  // ====================================================

  "field.sexualAnatomy": {
    kind: "field",
    valueType: "long-text",
    adult: true,
  },

  "field.reproductiveAnatomy": {
    kind: "field",
    valueType: "long-text",
    adult: true,
  },

  "field.matingTrait": {
    kind: "field",
    valueType: "long-text",
    adult: true,
  },

  "field.heatCycle": {
    kind: "field",
    valueType: "text",
    adult: true,
  },

  "field.adultContentTags": {
    kind: "field",
    valueType: "long-text",
    adult: true,
  },
  
  // ====================================================
  // Fields - Location
  // ====================================================

  "field.locationType": {
    kind: "field",
    valueType: "text",
  },

  "field.parentLocation": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.location",
  },

  "field.capital": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.city",
  },

  "field.population": {
    kind: "field",
    valueType: "number",
  },

  "field.area": {
    kind: "field",
    valueType: "number",
  },

  "field.elevation": {
    kind: "field",
    valueType: "number",
  },

  "field.climate": {
    kind: "field",
    valueType: "text",
  },

  "field.terrain": {
    kind: "field",
    valueType: "text",
  },

  "field.biome": {
    kind: "field",
    valueType: "text",
  },

  "field.environment": {
    kind: "field",
    valueType: "long-text",
  },

  "field.government": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.government",
  },

  "field.ruler": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.character",
  },

  "field.owner": {
    kind: "field",
    valueType: "entity-reference",
  },

  "field.controller": {
    kind: "field",
    valueType: "entity-reference",
  },

  "field.coordinates": {
    kind: "field",
    valueType: "text",
  },


  // ====================================================
  // Fields - Organization
  // ====================================================

  "field.organizationType": {
    kind: "field",
    valueType: "text",
  },

  "field.founder": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.character",
  },

  "field.leader": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.character",
  },

  "field.headquarters": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.location",
  },

  "field.memberCount": {
    kind: "field",
    valueType: "number",
  },

  "field.ideology": {
    kind: "field",
    valueType: "long-text",
  },

  "field.mission": {
    kind: "field",
    valueType: "long-text",
  },

  "field.motto": {
    kind: "field",
    valueType: "text",
  },

  "field.symbol": {
    kind: "field",
    valueType: "text",
  },

  "field.parentOrganization": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.organization",
  },

  "field.territory": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.location",
  },


  // ====================================================
  // Fields - Item
  // ====================================================

  "field.itemType": {
    kind: "field",
    valueType: "text",
  },

  "field.creator": {
    kind: "field",
    valueType: "entity-reference",
  },

  "field.manufacturer": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.organization",
  },

  "field.origin": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.location",
  },

  "field.material": {
    kind: "field",
    valueType: "text",
  },

  "field.rarity": {
    kind: "field",
    valueType: "text",
  },

  "field.value": {
    kind: "field",
    valueType: "number",
  },

  "field.price": {
    kind: "field",
    valueType: "number",
  },

  "field.power": {
    kind: "field",
    valueType: "text",
  },

  "field.effect": {
    kind: "field",
    valueType: "long-text",
  },

  "field.requirement": {
    kind: "field",
    valueType: "long-text",
  },


  // ====================================================
  // Fields - Dates / Events
  // ====================================================

  "field.date": {
    kind: "field",
    valueType: "date",
  },

  "field.startDate": {
    kind: "field",
    valueType: "date",
  },

  "field.endDate": {
    kind: "field",
    valueType: "date",
  },

  "field.foundedDate": {
    kind: "field",
    valueType: "date",
  },

  "field.dissolvedDate": {
    kind: "field",
    valueType: "date",
  },

  "field.destroyedDate": {
    kind: "field",
    valueType: "date",
  },

  "field.eventType": {
    kind: "field",
    valueType: "text",
  },

  "field.cause": {
    kind: "field",
    valueType: "long-text",
  },

  "field.result": {
    kind: "field",
    valueType: "long-text",
  },

  "field.winner": {
    kind: "field",
    valueType: "entity-reference",
  },

  "field.loser": {
    kind: "field",
    valueType: "entity-reference",
  },

  "field.casualties": {
    kind: "field",
    valueType: "number",
  },


  // ====================================================
  // Fields - Society / Culture
  // ====================================================

  "field.language": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.language",
  },

  "field.currency": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.currency",
  },

  "field.religion": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.religion",
  },

  "field.culture": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.culture",
  },

  "field.governmentType": {
    kind: "field",
    valueType: "text",
  },

  "field.headOfState": {
    kind: "field",
    valueType: "entity-reference",
    targetConcept: "entityType.character",
  },

    ...LANGUAGE_CONCEPTS,
    
};


function getConcept(
  conceptId
) {
  return (
    CONCEPTS[
      conceptId
    ] ||
    null
  );
}


function hasConcept(
  conceptId
) {
  return Boolean(
    CONCEPTS[
      conceptId
    ]
  );
}


function getConceptsByKind(
  kind
) {
  return Object.entries(
    CONCEPTS
  )
    .filter(
      (
        [
          _conceptId,
          definition,
        ]
      ) =>
        definition.kind ===
        kind
    )
    .map(
      (
        [
          conceptId,
          definition,
        ]
      ) => ({
        conceptId,
        ...definition,
      })
    );
}


module.exports = {
  CONCEPTS,
  getConcept,
  hasConcept,
  getConceptsByKind,
};