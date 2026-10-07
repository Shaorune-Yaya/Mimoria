function mergeEntryArrays(
  baseEntries,
  additionalEntries
) {
  return [
    ...(baseEntries || []),
    ...(additionalEntries || []),
  ];
}


function mergeMatchableCategory(
  baseCategory,
  additionalCategory
) {
  if (!baseCategory) {
    return additionalCategory;
  }


  if (!additionalCategory) {
    return baseCategory;
  }


  return {
    meta: {
      ...(baseCategory.meta || {}),
    },

    entries:
      mergeEntryArrays(
        baseCategory.entries,
        additionalCategory.entries
      ),
  };
}


function mergeSupportCategory(
  baseCategory,
  additionalCategory
) {
  if (!baseCategory) {
    return additionalCategory;
  }


  if (!additionalCategory) {
    return baseCategory;
  }


  const result = {
    ...(baseCategory || {}),
  };


  for (
    const [
      key,
      value,
    ] of
    Object.entries(
      additionalCategory
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


function mergeLexicons(
  baseLexicon,
  extraLexicon
) {
  const result = {
    locale:
      baseLexicon.locale,

    categories: {
      ...(baseLexicon.categories ||
        {}),
    },

    support: {
      ...(baseLexicon.support ||
        {}),
    },

    enabledPacks: [
      ...(baseLexicon
        .enabledPacks ||
        []),
    ],
  };


  for (
    const [
      category,
      categoryData,
    ] of
    Object.entries(
      extraLexicon.categories ||
        {}
    )
  ) {
    result.categories[
      category
    ] =
      mergeMatchableCategory(
        result.categories[
          category
        ],

        categoryData
      );
  }


  for (
    const [
      category,
      categoryData,
    ] of
    Object.entries(
      extraLexicon.support ||
        {}
    )
  ) {
    result.support[
      category
    ] =
      mergeSupportCategory(
        result.support[
          category
        ],

        categoryData
      );
  }


  if (
    extraLexicon.id
  ) {
    result.enabledPacks.push(
      extraLexicon.id
    );
  }


  result.enabledPacks = [
    ...new Set(
      result.enabledPacks
    ),
  ];


  return result;
}


module.exports = {
  mergeLexicons,
};