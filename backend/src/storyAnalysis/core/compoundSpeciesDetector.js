// ======================================================
// Compound Species Detector
//
// Consumes normalized species evidence.
//
// Examples:
//
// 狼龙
// 虎鲸猫
// 狼狐龙
//
// wolf-dragon
// fox/wolf
// wolf x dragon
// wolf dragon hybrid
//
// This module creates L1 evidence only.
// ======================================================


const CHINESE_EXPLICIT_CONNECTORS =
  new Set([
    "+",
    "/",
    "／",
    "-",
    "－",
    "×",
    "x",
    "X",
  ]);


const CHINESE_WORD_CONNECTORS =
  new Set([
    "和",
    "与",
    "及",
    "加",
  ]);


const ENGLISH_EXPLICIT_CONNECTORS =
  new Set([
    "-",
    "–",
    "—",
    "/",
    "\\",
    "+",
    "×",
    "x",
    "X",
    "&",
  ]);


// ======================================================
// Locale
// ======================================================

function isChineseLocale(
  locale
) {
  return String(
    locale || ""
  )
    .toLowerCase()
    .startsWith(
      "zh"
    );
}


function isEnglishLocale(
  locale
) {
  return String(
    locale || ""
  )
    .toLowerCase()
    .startsWith(
      "en"
    );
}


// ======================================================
// Hybrid Marker
// ======================================================

function getHybridMatches(
  matches
) {
  return (
    matches ||
    []
  )
    .filter(
      (match) =>
        match.conceptId ===
        "modifier.hybrid"
    );
}


function hasNearbyHybridMarker({
  hybridMatches,
  start,
  end,
  distance = 12,
}) {
  return hybridMatches.some(
    (match) => {
      if (
        match.end <
        start
      ) {
        return (
          start -
          match.end <=
          distance
        );
      }


      if (
        match.start >
        end
      ) {
        return (
          match.start -
          end <=
          distance
        );
      }


      return true;
    }
  );
}


// ======================================================
// Species Evidence Cleanup
// ======================================================

function removeNestedSpeciesEvidence(
  evidence
) {
  const sorted =
    [...evidence]
      .sort(
        (
          a,
          b
        ) => {
          if (
            a.start !==
            b.start
          ) {
            return (
              a.start -
              b.start
            );
          }


          return (
            (
              b.end -
              b.start
            ) -
            (
              a.end -
              a.start
            )
          );
        }
      );


  const result =
    [];


  for (
    const candidate of
    sorted
  ) {
    const covered =
      result.some(
        (existing) =>
          candidate.start >=
            existing.start &&
          candidate.end <=
            existing.end
      );


    if (
      covered
    ) {
      continue;
    }


    result.push(
      candidate
    );
  }


  return result;
}


// ======================================================
// Chinese
// ======================================================

function isAllowedChineseGap({
  gap,
  explicitHybrid,
}) {
  if (
    gap ===
    ""
  ) {
    return true;
  }


  if (
    CHINESE_EXPLICIT_CONNECTORS.has(
      gap
    )
  ) {
    return true;
  }


  if (
    CHINESE_WORD_CONNECTORS.has(
      gap
    )
  ) {
    return explicitHybrid;
  }


  return false;
}


function detectChinese({
  text,
  speciesEvidence,
  hybridMatches,
}) {
  const results =
    [];


  for (
    let startIndex =
      0;
    startIndex <
      speciesEvidence.length;
    startIndex +=
      1
  ) {
    const components = [
      speciesEvidence[
        startIndex
      ],
    ];


    let previous =
      components[0];


    for (
      let index =
        startIndex +
        1;
      index <
        speciesEvidence.length;
      index +=
        1
    ) {
      const current =
        speciesEvidence[
          index
        ];


      if (
        current.start <
        previous.end
      ) {
        continue;
      }


      const gap =
        text.slice(
          previous.end,
          current.start
        );


      if (
        gap.length >
        2
      ) {
        break;
      }


      const explicitHybrid =
        hasNearbyHybridMarker({
          hybridMatches,

          start:
            components[0]
              .start,

          end:
            current.end,

          distance:
            6,
        });


      if (
        !isAllowedChineseGap({
          gap,
          explicitHybrid,
        })
      ) {
        break;
      }


      components.push(
        current
      );

      previous =
        current;


      if (
        components.length >=
        5
      ) {
        break;
      }
    }


    if (
      components.length <
      2
    ) {
      continue;
    }


    const first =
      components[0];

    const last =
      components[
        components.length -
        1
      ];


    const explicitHybrid =
      hasNearbyHybridMarker({
        hybridMatches,

        start:
          first.start,

        end:
          last.end,

        distance:
          6,
      });


    const purelyAdjacent =
      components.every(
        (
          component,
          index
        ) => {
          if (
            index ===
            0
          ) {
            return true;
          }


          return (
            component.start ===
            components[
              index -
              1
            ].end
          );
        }
      );


    let confidence =
      0.82;


    if (
      purelyAdjacent
    ) {
      confidence +=
        0.08;
    }


    if (
      explicitHybrid
    ) {
      confidence +=
        0.08;
    }


    results.push({
      kind:
        "compound-species",

      text:
        text.slice(
          first.start,
          last.end
        ),

      start:
        first.start,

      end:
        last.end,

      locale:
        "zh-CN",

      hybrid:
        true,

      confidence:
        Math.min(
          1,
          confidence
        ),

      components:
        components.map(
          (component) => ({
            text:
              text.slice(
                component.start,
                component.end
              ),

            normalizedValue:
              component
                .normalizedValue,

            start:
              component.start,

            end:
              component.end,

            confidence:
              component.confidence,

            conceptId:
              "field.species",
          })
        ),

      evidence: {
        explicitHybridMarker:
          explicitHybrid,

        purelyAdjacent,
      },
    });
  }


  return results;
}


// ======================================================
// English
// ======================================================

function normalizeEnglishGap(
  gap
) {
  return String(
    gap || ""
  )
    .trim();
}


function isAllowedEnglishGap({
  gap,
  explicitHybrid,
}) {
  const normalized =
    normalizeEnglishGap(
      gap
    );


  if (
    ENGLISH_EXPLICIT_CONNECTORS.has(
      normalized
    )
  ) {
    return true;
  }


  /*
   * wolf dragon hybrid
   *
   * Whitespace-only compounds require an explicit
   * hybrid marker.
   */
  if (
    normalized ===
    ""
  ) {
    return explicitHybrid;
  }


  if (
    [
      "and",
      "with",
    ].includes(
      normalized
        .toLowerCase()
    )
  ) {
    return explicitHybrid;
  }


  return false;
}


function detectEnglish({
  text,
  speciesEvidence,
  hybridMatches,
}) {
  const results =
    [];


  for (
    let startIndex =
      0;
    startIndex <
      speciesEvidence.length;
    startIndex +=
      1
  ) {
    const components = [
      speciesEvidence[
        startIndex
      ],
    ];


    let previous =
      components[0];


    for (
      let index =
        startIndex +
        1;
      index <
        speciesEvidence.length;
      index +=
        1
    ) {
      const current =
        speciesEvidence[
          index
        ];


      if (
        current.start <
        previous.end
      ) {
        continue;
      }


      const gap =
        text.slice(
          previous.end,
          current.start
        );


      if (
        gap.length >
        8
      ) {
        break;
      }


      const explicitHybrid =
        hasNearbyHybridMarker({
          hybridMatches,

          start:
            components[0]
              .start,

          end:
            current.end,

          distance:
            14,
        });


      if (
        !isAllowedEnglishGap({
          gap,
          explicitHybrid,
        })
      ) {
        break;
      }


      components.push(
        current
      );

      previous =
        current;


      if (
        components.length >=
        5
      ) {
        break;
      }
    }


    if (
      components.length <
      2
    ) {
      continue;
    }


    const first =
      components[0];

    const last =
      components[
        components.length -
        1
      ];


    const explicitHybrid =
      hasNearbyHybridMarker({
        hybridMatches,

        start:
          first.start,

        end:
          last.end,

        distance:
          14,
      });


    const connectorText =
      text.slice(
        first.end,
        last.start
      );


    const explicitConnector =
      /[-–—/+×xX\\&]/u.test(
        connectorText
      );


    let confidence =
      0.78;


    if (
      explicitConnector
    ) {
      confidence +=
        0.1;
    }


    if (
      explicitHybrid
    ) {
      confidence +=
        0.1;
    }


    results.push({
      kind:
        "compound-species",

      text:
        text.slice(
          first.start,
          last.end
        ),

      start:
        first.start,

      end:
        last.end,

      locale:
        "en",

      hybrid:
        true,

      confidence:
        Math.min(
          1,
          confidence
        ),

      components:
        components.map(
          (component) => ({
            text:
              text.slice(
                component.start,
                component.end
              ),

            normalizedValue:
              component
                .normalizedValue,

            start:
              component.start,

            end:
              component.end,

            confidence:
              component.confidence,

            conceptId:
              "field.species",
          })
        ),

      evidence: {
        explicitHybridMarker:
          explicitHybrid,

        explicitConnector,
      },
    });
  }


  return results;
}


// ======================================================
// Candidate Cleanup
// ======================================================

function removeExactDuplicates(
  candidates
) {
  const map =
    new Map();


  for (
    const candidate of
    candidates
  ) {
    const key = [
      candidate.start,
      candidate.end,
      candidate.text
        .toLowerCase(),
    ].join(
      "::"
    );


    const current =
      map.get(
        key
      );


    if (
      !current ||
      candidate.confidence >
        current.confidence
    ) {
      map.set(
        key,
        candidate
      );
    }
  }


  return Array.from(
    map.values()
  );
}


/*
 * Remove sub-compounds fully contained inside
 * a larger compound.
 *
 * 狼狐龙
 * ├─ 狼狐龙  KEEP
 * └─ 狐龙    DROP
 *
 * fox/wolf
 * remains one candidate.
 */
function removeContainedCompounds(
  candidates
) {
  return candidates.filter(
    (
      candidate,
      candidateIndex
    ) => {
      for (
        let index =
          0;
        index <
          candidates.length;
        index +=
          1
      ) {
        if (
          index ===
          candidateIndex
        ) {
          continue;
        }


        const other =
          candidates[index];


        const contained =
          candidate.start >=
            other.start &&
          candidate.end <=
            other.end;


        const otherLarger =
          (
            other.end -
            other.start
          ) >
          (
            candidate.end -
            candidate.start
          );


        const otherHasMoreComponents =
          other.components.length >
          candidate.components.length;


        if (
          contained &&
          otherLarger &&
          otherHasMoreComponents
        ) {
          return false;
        }
      }


      return true;
    }
  );
}


// ======================================================
// Public API
// ======================================================

function detectCompoundSpecies({
  text,
  speciesEvidence,
  matches,
  locale,
}) {
  if (
    !text ||
    !Array.isArray(
      speciesEvidence
    )
  ) {
    return [];
  }


  const cleanedSpecies =
    removeNestedSpeciesEvidence(
      speciesEvidence
    );


  if (
    cleanedSpecies.length <
    2
  ) {
    return [];
  }


  const hybridMatches =
    getHybridMatches(
      matches
    );


  let candidates =
    [];


  if (
    isChineseLocale(
      locale
    )
  ) {
    candidates =
      detectChinese({
        text,

        speciesEvidence:
          cleanedSpecies,

        hybridMatches,
      });
  } else if (
    isEnglishLocale(
      locale
    )
  ) {
    candidates =
      detectEnglish({
        text,

        speciesEvidence:
          cleanedSpecies,

        hybridMatches,
      });
  }


  return removeContainedCompounds(
    removeExactDuplicates(
      candidates
    )
  )
    .sort(
      (
        a,
        b
      ) =>
        a.start -
        b.start
    );
}


module.exports = {
  detectCompoundSpecies,
};