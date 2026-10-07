const fs = require(
  "fs"
);

const path = require(
  "path"
);

const {
  hasConcept,
} = require(
  "../concepts/registry"
);


const MATCHABLE_CATEGORIES = [
  "entityTypes",
  "fields",
  "relations",
  "events",
  "modifiers",
  "discourse",
  "units",
  "titles",
];


const SUPPORT_CATEGORIES = [
  "genericTerms",
];


const cache =
  new Map();


function getLexiconDirectory(
  locale
) {
  return path.join(
    __dirname,
    "..",
    "lexicons",
    locale
  );
}


function readJsonFile(
  filePath
) {
  const raw =
    fs.readFileSync(
      filePath,
      "utf8"
    );


  return JSON.parse(
    raw
  );
}


function validateEntry(
  entry,
  sourceFile
) {
  if (
    !entry ||
    typeof entry !==
    "object"
  ) {
    throw new Error(
      `Invalid lexicon entry in ${sourceFile}`
    );
  }


  if (
    !entry.conceptId
  ) {
    throw new Error(
      `Missing conceptId in ${sourceFile}`
    );
  }


  if (
    !hasConcept(
      entry.conceptId
    )
  ) {
    throw new Error(
      `Unknown concept "${entry.conceptId}" in ${sourceFile}`
    );
  }
}


function normalizeMatchableFile(
  data,
  sourceFile
) {
  if (
    !Array.isArray(
      data.entries
    )
  ) {
    throw new Error(
      `Lexicon file ${sourceFile} does not contain an entries array`
    );
  }


  for (
    const entry of
    data.entries
  ) {
    validateEntry(
      entry,
      sourceFile
    );
  }


  return data;
}


function loadMatchableCategory(
  locale,
  category
) {
  if (
    !MATCHABLE_CATEGORIES.includes(
      category
    )
  ) {
    throw new Error(
      `Unsupported matchable lexicon category: ${category}`
    );
  }


  const cacheKey =
    `${locale}:match:${category}`;


  if (
    cache.has(
      cacheKey
    )
  ) {
    return cache.get(
      cacheKey
    );
  }


  const filePath =
    path.join(
      getLexiconDirectory(
        locale
      ),
      `${category}.json`
    );


  if (
    !fs.existsSync(
      filePath
    )
  ) {
    throw new Error(
      `Lexicon file not found: ${filePath}`
    );
  }


  const data =
    normalizeMatchableFile(
      readJsonFile(
        filePath
      ),
      filePath
    );


  cache.set(
    cacheKey,
    data
  );


  return data;
}


function loadSupportCategory(
  locale,
  category
) {
  if (
    !SUPPORT_CATEGORIES.includes(
      category
    )
  ) {
    throw new Error(
      `Unsupported support lexicon category: ${category}`
    );
  }


  const cacheKey =
    `${locale}:support:${category}`;


  if (
    cache.has(
      cacheKey
    )
  ) {
    return cache.get(
      cacheKey
    );
  }


  const filePath =
    path.join(
      getLexiconDirectory(
        locale
      ),
      `${category}.json`
    );


  if (
    !fs.existsSync(
      filePath
    )
  ) {
    throw new Error(
      `Lexicon file not found: ${filePath}`
    );
  }


  const data =
    readJsonFile(
      filePath
    );


  cache.set(
    cacheKey,
    data
  );


  return data;
}


function loadLocale(
  locale
) {
  const result = {
    locale,

    categories: {},

    support: {},
  };


  for (
    const category of
    MATCHABLE_CATEGORIES
  ) {
    result.categories[
      category
    ] =
      loadMatchableCategory(
        locale,
        category
      );
  }


  for (
    const category of
    SUPPORT_CATEGORIES
  ) {
    result.support[
      category
    ] =
      loadSupportCategory(
        locale,
        category
      );
  }


  return result;
}


function clearLexiconCache() {
  cache.clear();
}


module.exports = {
  MATCHABLE_CATEGORIES,
  SUPPORT_CATEGORIES,

  loadMatchableCategory,
  loadSupportCategory,
  loadLocale,

  clearLexiconCache,
};