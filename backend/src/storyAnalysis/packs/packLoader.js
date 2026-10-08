const fs =
  require("fs");

const path =
  require("path");

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

const PACKS_ROOT =
  __dirname;


function getPackRoot(
  packId
) {
  return path.join(
    PACKS_ROOT,
    packId
  );
}


function getPackSharedDirectory(
  packId
) {
  return path.join(
    getPackRoot(
      packId
    ),
    "shared"
  );
}


function getPackLocaleDirectory(
  packId,
  locale
) {
  return path.join(
    getPackRoot(
      packId
    ),
    locale
  );
}


function getPackNsfwSharedDirectory(
  packId
) {
  return path.join(
    getPackRoot(
      packId
    ),
    "nsfw",
    "shared"
  );
}


function getPackNsfwLocaleDirectory(
  packId,
  locale
) {
  return path.join(
    getPackRoot(
      packId
    ),
    "nsfw",
    locale
  );
}


// ======================================================
// File Helpers
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


function validateMatchableFile(
  data,
  filePath
) {
  if (
    !data ||
    !Array.isArray(
      data.entries
    )
  ) {
    throw new Error(
      `Pack lexicon file must contain an entries array: ${filePath}`
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
        `Missing conceptId in: ${filePath}`
      );
    }


    if (
      !hasConcept(
        entry.conceptId
      )
    ) {
      throw new Error(
        `Unknown concept "${entry.conceptId}" in: ${filePath}`
      );
    }
  }


  return data;
}


// ======================================================
// Merge Helpers
// ======================================================

function mergeMatchableCategory(
  current,
  incoming
) {
  if (!current) {
    return {
      ...incoming,

      entries: [
        ...(incoming.entries ||
          []),
      ],
    };
  }


  return {
    meta: {
      ...(current.meta ||
        {}),
      ...(incoming.meta ||
        {}),
    },

    entries: [
      ...(current.entries ||
        []),
      ...(incoming.entries ||
        []),
    ],
  };
}


function mergeSupportCategory(
  current,
  incoming
) {
  if (!current) {
    return {
      ...incoming,
    };
  }


  const result = {
    ...current,
  };


  for (
    const [
      key,
      value,
    ] of
    Object.entries(
      incoming
    )
  ) {
    if (
      key ===
      "meta"
    ) {
      result.meta = {
        ...(result.meta ||
          {}),
        ...(value ||
          {}),
      };

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

      continue;
    }


    result[key] =
      value;
  }


  return result;
}


// ======================================================
// Directory Loader
// ======================================================

function loadDirectory({
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
      validateMatchableFile(
        readJsonFile(
          filePath
        ),
        filePath
      );


    result.categories[
      category
    ] =
      mergeMatchableCategory(
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
      mergeSupportCategory(
        result.support[
          category
        ],
        data
      );
  }
}


// ======================================================
// Public
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


  const nsfwEnabled =
    options.nsfwEnabled ===
    true;


  const cacheKey = [
    packId,
    locale,
    nsfwEnabled
      ? "nsfw"
      : "safe",
  ].join(":");


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


  /*
   * Order matters:
   *
   * shared
   * -> locale
   * -> nsfw shared
   * -> nsfw locale
   */
  loadDirectory({
    directory:
      getPackSharedDirectory(
        packId
      ),

    result,
  });


  loadDirectory({
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
    loadDirectory({
      directory:
        getPackNsfwSharedDirectory(
          packId
        ),

      result,
    });


    loadDirectory({
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


function getPackDebugInfo(
  packId,
  locale
) {
  return {
    packsRoot:
      PACKS_ROOT,

    packRoot:
      getPackRoot(
        packId
      ),

    sharedDirectory:
      getPackSharedDirectory(
        packId
      ),

    sharedExists:
      fs.existsSync(
        getPackSharedDirectory(
          packId
        )
      ),

    localeDirectory:
      getPackLocaleDirectory(
        packId,
        locale
      ),

    localeExists:
      fs.existsSync(
        getPackLocaleDirectory(
          packId,
          locale
        )
      ),

    nsfwSharedDirectory:
      getPackNsfwSharedDirectory(
        packId
      ),

    nsfwSharedExists:
      fs.existsSync(
        getPackNsfwSharedDirectory(
          packId
        )
      ),

    nsfwLocaleDirectory:
      getPackNsfwLocaleDirectory(
        packId,
        locale
      ),

    nsfwLocaleExists:
      fs.existsSync(
        getPackNsfwLocaleDirectory(
          packId,
          locale
        )
      ),
  };
}


module.exports = {
  PACK_MATCHABLE_CATEGORIES,
  PACK_SUPPORT_CATEGORIES,

  loadPackLocale,
  clearPackCache,
  getPackDebugInfo,
};