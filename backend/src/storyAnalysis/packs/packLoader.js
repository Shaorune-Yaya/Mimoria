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

const {
  getPackDefinition,
} = require(
  "./packRegistry"
);


const PACK_MATCHABLE_CATEGORIES = [
  "entityTypes",
  "fields",
  "relations",
  "events",
  "modifiers",
  "discourse",
  "units",
  "titles",
];


const PACK_SUPPORT_CATEGORIES = [
  "genericTerms",
];


const packCache =
  new Map();


// ======================================================
// Paths
// ======================================================

function getPacksRoot() {
  return path.join(
    __dirname,
    "..",
    "lexicons",
    "packs"
  );
}


function getPackLocaleDirectory(
  packId,
  locale
) {
  return path.join(
    getPacksRoot(),
    packId,
    locale
  );
}


function getPackNsfwLocaleDirectory(
  packId,
  locale
) {
  return path.join(
    getPacksRoot(),
    packId,
    "nsfw",
    locale
  );
}


// ======================================================
// JSON Helpers
// ======================================================

function readJsonFile(
  filePath
) {
  return JSON.parse(
    fs.readFileSync(
      filePath,
      "utf8"
    )
  );
}


function validateEntries(
  data,
  filePath
) {
  if (
    !Array.isArray(
      data.entries
    )
  ) {
    throw new Error(
      `Pack lexicon ${filePath} must contain an entries array`
    );
  }


  for (
    const entry of
    data.entries
  ) {
    if (
      !entry.conceptId
    ) {
      throw new Error(
        `Missing conceptId in ${filePath}`
      );
    }


    if (
      !hasConcept(
        entry.conceptId
      )
    ) {
      throw new Error(
        `Unknown concept "${entry.conceptId}" in ${filePath}`
      );
    }
  }


  return data;
}


// ======================================================
// Merge Helpers
// ======================================================

function mergeMatchableData(
  base,
  extra
) {
  if (!base) {
    return extra;
  }


  if (!extra) {
    return base;
  }


  return {
    meta: {
      ...(base.meta || {}),
      ...(extra.meta || {}),
    },

    entries: [
      ...(base.entries || []),
      ...(extra.entries || []),
    ],
  };
}


function mergeSupportData(
  base,
  extra
) {
  if (!base) {
    return extra;
  }


  if (!extra) {
    return base;
  }


  const result = {
    ...(base || {}),
  };


  for (
    const [
      key,
      value,
    ] of
    Object.entries(
      extra
    )
  ) {
    if (
      key ===
      "meta"
    ) {
      continue;
    }


    if (
      Array.isArray(
        value
      )
    ) {
      result[key] = [
        ...new Set([
          ...(Array.isArray(
            result[key]
          )
            ? result[key]
            : []),

          ...value,
        ]),
      ];
    } else {
      result[key] =
        value;
    }
  }


  return result;
}


// ======================================================
// Directory Loader
// ======================================================

function loadDirectoryIntoResult({
  directory,
  result,
}) {
  if (
    !fs.existsSync(
      directory
    )
  ) {
    return;
  }


  for (
    const category of
    PACK_MATCHABLE_CATEGORIES
  ) {
    const filePath =
      path.join(
        directory,
        `${category}.json`
      );


    if (
      !fs.existsSync(
        filePath
      )
    ) {
      continue;
    }


    const data =
      validateEntries(
        readJsonFile(
          filePath
        ),
        filePath
      );


    result.categories[
      category
    ] =
      mergeMatchableData(
        result.categories[
          category
        ],

        data
      );
  }


  for (
    const category of
    PACK_SUPPORT_CATEGORIES
  ) {
    const filePath =
      path.join(
        directory,
        `${category}.json`
      );


    if (
      !fs.existsSync(
        filePath
      )
    ) {
      continue;
    }


    const data =
      readJsonFile(
        filePath
      );


    result.support[
      category
    ] =
      mergeSupportData(
        result.support[
          category
        ],

        data
      );
  }
}


// ======================================================
// Public Loader
// ======================================================

function loadPackLocale(
  packId,
  locale,
  options = {}
) {
  const definition =
    getPackDefinition(
      packId
    );


  if (!definition) {
    throw new Error(
      `Unknown lexicon pack: ${packId}`
    );
  }


  if (
    !definition
      .supportedLocales
      .includes(
        locale
      )
  ) {
    return {
      id:
        packId,

      locale,

      nsfwEnabled:
        false,

      categories: {},

      support: {},
    };
  }


  const nsfwEnabled =
    options.nsfwEnabled ===
    true;


  const cacheKey =
    [
      packId,
      locale,
      nsfwEnabled
        ? "nsfw"
        : "safe",
    ].join(
      ":"
    );


  if (
    packCache.has(
      cacheKey
    )
  ) {
    return packCache.get(
      cacheKey
    );
  }


  const result = {
    id:
      packId,

    locale,

    nsfwEnabled,

    categories: {},

    support: {},
  };


  loadDirectoryIntoResult({
    directory:
      getPackLocaleDirectory(
        packId,
        locale
      ),

    result,
  });


  if (
    nsfwEnabled
  ) {
    loadDirectoryIntoResult({
      directory:
        getPackNsfwLocaleDirectory(
          packId,
          locale
        ),

      result,
    });
  }


  packCache.set(
    cacheKey,
    result
  );


  return result;
}


function clearPackCache() {
  packCache.clear();
}


module.exports = {
  PACK_MATCHABLE_CATEGORIES,
  PACK_SUPPORT_CATEGORIES,

  loadPackLocale,
  clearPackCache,
};