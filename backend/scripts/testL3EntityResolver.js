const {
  resolveEntityHint,
} = require(
  "../src/storyAnalysis"
);


// ======================================================
// Fake World
// ======================================================

const entities = [
  {
    _id:
      "entity-yaya",

    name:
      "牙牙",

    entityTypeId:
      "type-character",

    aliases: [],
  },

  {
    _id:
      "entity-democratic",

    name:
      "民主党",

    entityTypeId:
      "type-political-party",

    aliases: [
      "民主派",
    ],
  },

  {
    _id:
      "entity-communist",

    name:
      "共产党",

    entityTypeId:
      "type-political-party",

    aliases: [
      "共产主义政党",
    ],
  },

  {
    _id:
      "entity-luna",

    name:
      "Luna Station",

    entityTypeId:
      "type-space-station",

    aliases: [
      "Luna Orbital Station",
    ],
  },
];


const tests = [
  "牙牙",
  "民主党",
  "民主派",
  "共产党",
  "共产主义政党",

  "Luna Station",
  "the Luna Station",
  "Luna Orbital Station",

  "黑月骑士团",
];


for (
  const hint of
  tests
) {
  console.log(
    "\n----------------------------"
  );

  console.log(
    "Hint:",
    hint
  );


  console.log(
    resolveEntityHint(
      hint,
      entities
    )
  );
}