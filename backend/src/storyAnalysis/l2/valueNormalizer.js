// ======================================================
// L2 Value Normalizer
// ======================================================


function cleanStringValue(
  value
) {
  return String(
    value ?? ""
  )
    .trim()
    .replace(
      /^[：:=\-—\s]+/u,
      ""
    )
    .replace(
      /[，。！？；,.!?;]+$/u,
      ""
    )
    .trim();
}


// ======================================================
// Numbers
// ======================================================

function parseNumberValue(
  value
) {
  const cleaned =
    cleanStringValue(
      value
    );


  const match =
    cleaned.match(
      /-?\d+(?:\.\d+)?/u
    );


  if (!match) {
    return null;
  }


  const parsed =
    Number(
      match[0]
    );


  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}


// ======================================================
// Age
// ======================================================

function normalizeAge(
  value
) {
  const number =
    parseNumberValue(
      value
    );


  if (
    number ===
    null
  ) {
    return null;
  }


  if (
    number <
      0 ||
    number >
      10000
  ) {
    return null;
  }


  return number;
}


// ======================================================
// Gravity
// ======================================================

function normalizeGravity(
  value
) {
  const cleaned =
    cleanStringValue(
      value
    );


  const gMatch =
    cleaned.match(
      /(-?\d+(?:\.\d+)?)\s*[gG]\b/u
    );


  if (
    gMatch
  ) {
    return {
      value:
        Number(
          gMatch[1]
        ),

      unit:
        "g",
    };
  }


  const number =
    parseNumberValue(
      cleaned
    );


  if (
    number !==
    null
  ) {
    return {
      value:
        number,

      unit:
        null,
    };
  }


  return null;
}


// ======================================================
// Generic
// ======================================================

function normalizeFieldValue(
  fieldConcept,
  value
) {
  const cleaned =
    cleanStringValue(
      value
    );


  if (!cleaned) {
    return null;
  }


  switch (
    fieldConcept
  ) {
    case "field.age":
      return normalizeAge(
        cleaned
      );


    case "field.gravity":
      return (
        normalizeGravity(
          cleaned
        ) ||
        cleaned
      );


    default:
      return cleaned;
  }
}


module.exports = {
  cleanStringValue,
  parseNumberValue,

  normalizeAge,
  normalizeGravity,
  normalizeFieldValue,
};