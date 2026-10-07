function normalizeText(
  value,
  locale = "en"
) {
  let text =
    String(
      value || ""
    );


  /*
   * Normalize full-width characters and other
   * Unicode compatibility variants.
   */
  text =
    text.normalize(
      "NFKC"
    );


  text =
    text.replace(
      /\u3000/g,
      " "
    );


  text =
    text.replace(
      /[\t\r]+/g,
      " "
    );


  text =
    text.replace(
      / {2,}/g,
      " "
    );


  text =
    text.trim();


  /*
   * Chinese does not require lowercase conversion,
   * while Latin-based matching benefits from it.
   */
  if (
    !String(
      locale
    ).toLowerCase()
      .startsWith(
        "zh"
      )
  ) {
    text =
      text.toLocaleLowerCase(
        locale
      );
  }


  return text;
}


function normalizeForComparison(
  value,
  locale = "en"
) {
  return normalizeText(
    value,
    locale
  )
    .replace(
      /[\s"'“”‘’`´]+/g,
      ""
    );
}


module.exports = {
  normalizeText,
  normalizeForComparison,
};