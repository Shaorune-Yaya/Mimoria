const {
  filterSpecificEvidence,
} = require(
  "./evidenceFilter"
);

const {
  segmentClauses,
  getMatchesInsideClause,
  getCandidatesInsideClause,

  isChineseLocale,
  isEnglishLocale,
} = require(
  "./clauseSegmenter"
);

const {
  cleanStringValue,
  normalizeFieldValue,
} = require(
  "./valueNormalizer"
);


// ======================================================
// Constants
// ======================================================

const DIRECT_VALUE_EXPRESSIONS =
  new Map([
    /*
     * Furry
     */
    [
      "field.bodyForm",
      new Set([
        "anthro",
        "feral",
        "kemonomimi",
        "taur",
        "拟人型",
        "拟人兽",
        "四足型",
        "四足",
        "兽型",
      ]),
    ],

    [
      "field.legType",
      new Set([
        "趾行",
        "跖行",
        "蹄行",
        "曲腿",
        "直腿",
        "兽腿",

        "digitigrade",
        "digi",
        "plantigrade",
        "unguligrade",
      ]),
    ],

    [
      "field.eyeColor",
      new Set([
        "异色瞳",
        "双色瞳",
        "异瞳",
      ]),
    ],

    [
      "field.appearance",
      new Set([
        "日系",
        "萌系",
        "kemono",
        "kig",
        "toony",
        "realistic",
        "semi-realistic",
      ]),
    ],

    /*
     * Sci-Fi
     */
    [
      "field.consciousnessLevel",
      new Set([
        "自我意识",
        "自主意识",
        "sentient",
        "sapient",
        "self-aware",
      ]),
    ],

    [
      "field.ftlMethod",
      new Set([
        "ftl",
        "warp drive",
        "hyperdrive",
        "jump drive",
        "hyperspace",

        "曲率引擎",
        "曲率航行",
        "跃迁引擎",
        "跃迁",
        "超空间",
        "虫洞",
        "星门",
      ]),
    ],

        [
      "field.cybernetics",
      new Set([
        "义体",
        "义体系统",
        "神经接口",
        "机械义肢",
        "脑机接口",

        "cyberware",
        "cybernetic implant",
        "cybernetic implants",
        "neural implant",
        "neural implants",
      ]),
    ],

    [
      "field.augmentation",
      new Set([
        "身体强化",
        "人体改造",
        "基因改造",
        "基因编辑",
        "生物强化",
        "纳米改造",

        "augmentation",
        "genetic modification",
        "gene modification",
        "gene editing",
        "bioengineering",
      ]),
    ],
  ]);


// ======================================================
// Candidate Helpers
// ======================================================

function makeFieldCandidate({
  subjectHint,
  fieldConcept,
  value,
  normalizedValue,

  sourceText,

  start,
  end,

  confidence,

  extractor,

  evidence = [],
  metadata = {},
}) {
  return {
    candidateType:
      "field-value",

    subjectHint:
      subjectHint ||
      null,

    fieldConcept,

    value,

    normalizedValue:
      normalizedValue ??
      value,

    sourceText,

    start,

    end,

    confidence,

    extractor,

    evidence,

    metadata,
  };
}


function candidateKey(
  candidate
) {
  return [
    candidate.candidateType,
    candidate.subjectHint ||
      "",
    candidate.fieldConcept,
    candidate.start,
    candidate.end,
    JSON.stringify(
      candidate.normalizedValue
    ),
  ].join(
    "::"
  );
}


function deduplicateCandidates(
  candidates
) {
  const map =
    new Map();


  for (
    const candidate of
    candidates
  ) {
    const key =
      candidateKey(
        candidate
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
  )
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
          b.confidence -
          a.confidence
        );
      }
    );
}

// ======================================================
// Relation Candidate
// ======================================================

function makeRelationCandidate({
  subjectHint,

  relationConcept,

  objectHint,

  sourceText,

  start,

  end,

  confidence,

  extractor,

  evidence = [],

  metadata = {},
}) {
  if (
    !relationConcept ||
    !objectHint
  ) {
    return null;
  }


  return {
    candidateType:
      "relation",

    subjectHint:
      subjectHint ||
      null,

    relationConcept,

    objectHint,

    sourceText,

    start,

    end,

    confidence,

    extractor,

    evidence,

    metadata,
  };
}


// ======================================================
// Relation Object Cleaning
// ======================================================

function cleanChineseRelationObject(
  value
) {
  let result =
    String(
      value || ""
    )
      .trim();


  result =
    result.replace(
      /^(?:于|在|向|往|至|到|为|是|一个|一座|一个名为|名为)+/u,
      ""
    );


  /*
   * Stop before another grammatical unit.
   *
   * 来自北境的炼金术师
   * -> 北境
   *
   * 隶属于银月协会，目前...
   * -> 银月协会
   */
  result =
    result.split(
      /(?:的(?=[\p{Script=Han}A-Za-z0-9·_-]{2,})|，|。|！|？|；|、|并且|并|而且|同时|但是|但|目前|现在|后来|随后|最终)/u
    )[0];


  result =
    result
      .replace(
        /(?:的|了)$/u,
        ""
      )
      .trim();


  return (
    result ||
    null
  );
}


function cleanEnglishRelationObject(
  value
) {
  let result =
    String(
      value || ""
    )
      .trim();


  result =
    result.replace(
      /^(?:to|in|at|from|for|with|the|a|an)\s+/iu,
      ""
    );


  result =
    result.split(
      /[,.;!?]|\s+(?:and|but|while|although|however|currently|later|then)\s+/iu
    )[0];


  return (
    result.trim() ||
    null
  );
}


// ======================================================
// Relation Object Extraction
// ======================================================
function isHardRelationObjectBoundary(
  match,
  relationMatch
) {
  if (
    !match ||
    match.start <
      relationMatch.end
  ) {
    return false;
  }


  const kind =
    match.concept
      ?.kind;


  // ----------------------------------------------------
  // Another relation / event definitely starts a new
  // semantic unit.
  // ----------------------------------------------------

  if (
    kind ===
      "relation" ||
    kind ===
      "event"
  ) {
    return true;
  }


  // ----------------------------------------------------
  // A role expression commonly starts the next predicate.
  //
  // Example:
  //
  // 来自北境的炼金术师
  //
  // "炼金术师" should stop the location object.
  // ----------------------------------------------------

  if (
    kind ===
    "role-signal"
  ) {
    return true;
  }


  // ----------------------------------------------------
  // IMPORTANT:
  //
  // EntityType suffix evidence is usually part of the
  // entity name itself.
  //
  // 北境
  //   境 -> entityType.region
  //
  // 银月协会
  //     协会 -> entityType.organization / guild
  //
  // Therefore a suffix MUST NOT terminate the object span.
  // ----------------------------------------------------

  if (
    kind ===
    "entity-type"
  ) {
    return (
      match.evidenceType !==
      "suffix"
    );
  }


  return false;
}

function extractRelationObjectHint({
  clause,

  relationMatch,

  clauseMatches,

  locale,
}) {
  const relativeEnd =
    relationMatch.end -
    clause.start;


  if (
    relativeEnd <
      0 ||
    relativeEnd >
      clause.text.length
  ) {
    return null;
  }


  let absoluteLimit =
    clause.end;


  /*
   * Lexicon-aware boundary.
   *
   * If another semantic expression begins after this
   * relation, prefer stopping there rather than blindly
   * consuming the rest of the sentence.
   *
   * Example:
   *
   * 来自 北境 的 炼金术师
   *
   * "炼金术师" is a role signal.
   */
  const followingStructuralMatch =
    clauseMatches
      .filter(
        (match) =>
          isHardRelationObjectBoundary(
            match,
            relationMatch
          )
      )
      .sort(
        (
          a,
          b
        ) =>
          a.start -
          b.start
      )[0];


    if (
      followingStructuralMatch &&
      followingStructuralMatch.start >
        relationMatch.end
    ) {
      absoluteLimit =
        Math.min(
          absoluteLimit,
          followingStructuralMatch.start
        );
    }


  const relativeLimit =
    Math.max(
      relativeEnd,

      absoluteLimit -
        clause.start
    );


  let raw =
    clause.text.slice(
      relativeEnd,
      relativeLimit
    );


  /*
   * If lexicon boundary made the value too aggressive,
   * retain the text up to punctuation.
   */
  if (
    !raw.trim()
  ) {
    raw =
      clause.text.slice(
        relativeEnd
      );
  }


  if (
    isChineseLocale(
      locale
    )
  ) {
    return cleanChineseRelationObject(
      raw
    );
  }


  if (
    isEnglishLocale(
      locale
    )
  ) {
    return cleanEnglishRelationObject(
      raw
    );
  }


  return (
    raw.trim() ||
    null
  );
}


// ======================================================
// Lexicon-driven Semantic Relations
//
// IMPORTANT:
//
// We do NOT hard-code "来自 = relation.from".
//
// The lexicon already maps expressions to canonical
// concepts. This layer only converts that semantic lexical
// evidence into a structured subject-relation-object fact.
// ======================================================

function extractSemanticRelations({
  clause,

  clauseMatches,

  locale,
}) {
  const results =
    [];


  const relationMatches =
    clauseMatches.filter(
      (match) =>
        match.concept
          ?.kind ===
        "relation"
    );


  for (
    const match of
    relationMatches
  ) {
    const relationConcept =
      match.conceptId ||
      null;


    if (
      !relationConcept
    ) {
      continue;
    }


    const subjectHint =
      resolveSubjectHint({
        locale,

        clause,

        clauseMatches,

        triggerStart:
          match.start,
      });


    const objectHint =
      extractRelationObjectHint({
        clause,

        relationMatch:
          match,

        clauseMatches,

        locale,
      });


    if (
      !objectHint
    ) {
      continue;
    }


    const candidate =
      makeRelationCandidate({
        subjectHint,

        relationConcept,

        objectHint,

        sourceText:
          clause.text,

        start:
          match.start,

        end:
          Math.min(
            clause.end,
            match.end +
              objectHint.length
          ),

        confidence:
          Math.min(
            0.98,

            (
              match.confidence ??
              0.75
            ) +
              0.06
          ),

        extractor:
          "pattern.semantic-relation",

        evidence: [
          match,
        ],

        metadata: {
          lexiconDriven:
            true,

          expression:
            match.expression ||
            null,
        },
      });


    if (
      candidate
    ) {
      results.push(
        candidate
      );
    }
  }


  return results;
}

// ======================================================
// Relation -> Preferred Field Representation
//
// Mimoria prefers reusing / extending an existing schema
// before exposing a graph relation when the same fact can
// naturally live on the subject Entity.
//
// Examples:
//
// 来自北境
// -> field.hometown = 北境
//
// 隶属于银月协会
// -> field.affiliation = 银月协会
//
// 居住在银港
// -> field.residence = 银港
//
// The original relation candidate is still preserved
// internally. StorySuggestionGenerator decides later
// whether the relation needs to be shown to the user.
// ======================================================

const RELATION_FIELD_PREFERENCES = {
  "relation.from":
    "field.hometown",

  "relation.origin":
    "field.hometown",

  "relation.member_of":
    "field.affiliation",

  "relation.works_for":
    "field.affiliation",

  "relation.affiliated_with":
    "field.affiliation",

  "relation.lives_in":
    "field.residence",

  "relation.resides_in":
    "field.residence",
};


function createFieldCandidateFromRelation(
  relationCandidate
) {
  if (
    !relationCandidate
  ) {
    return null;
  }


  const fieldConcept =
    RELATION_FIELD_PREFERENCES[
      relationCandidate
        .relationConcept
    ];


  if (
    !fieldConcept ||
    !relationCandidate
      .subjectHint ||
    !relationCandidate
      .objectHint
  ) {
    return null;
  }


  return makeFieldCandidate({
    subjectHint:
      relationCandidate
        .subjectHint,

    fieldConcept,

    value:
      relationCandidate
        .objectHint,

    normalizedValue:
      relationCandidate
        .objectHint,

    sourceText:
      relationCandidate
        .sourceText,

    start:
      relationCandidate
        .start,

    end:
      relationCandidate
        .end,

    confidence:
      Math.max(
        0,
        (
          relationCandidate
            .confidence ??
          0.75
        ) -
          0.02
      ),

    extractor:
      "pattern.relation-preferred-field",

    evidence:
      relationCandidate
        .evidence ||
      [],

    metadata: {
      derivedFromRelation:
        true,

      relationConcept:
        relationCandidate
          .relationConcept,

      representationPreference:
        "field-first",

      relationObjectHint:
        relationCandidate
          .objectHint,
    },
  });
}


function createPreferredFieldCandidatesFromRelations(
  relationCandidates = []
) {
  return relationCandidates
    .map(
      createFieldCandidateFromRelation
    )
    .filter(
      Boolean
    );
}

// ======================================================
// Subject Hints
// ======================================================

function cleanChineseSubject(
  value
) {
  let result =
    String(
      value || ""
    )
      .trim();


  result =
    result.replace(
      /^(我的|你的|他的|她的|它的|这个|那个|该|一名|一位)+/u,
      ""
    );


  result =
    result.replace(
      /^(后来|随后|然后|最终|最后|现在|目前)+/u,
      ""
    );


  result =
    result.replace(
      /(后来|随后|然后|最终|最后|现在|目前)$/u,
      ""
    );


  /*
   * Possessive marker:
   *
   * 伊甸的意识等级
   * -> 伊甸
   */
  result =
    result.replace(
      /(?:的|之)$/u,
      ""
    );


  return result.trim();
}


function resolveChineseSubjectHint({
  clause,
  clauseMatches,
  triggerStart,
}) {
  const relativeTrigger =
    Math.max(
      0,
      triggerStart -
        clause.start
    );


  const before =
    clause.text.slice(
      0,
      relativeTrigger
    );


  /*
   * Prefer a name immediately following an
   * entity-type / role expression.
   *
   * 我的兽设夜岚是...
   *       ↑ 夜岚
   *
   * 人工智能伊甸在...
   *         ↑ 伊甸
   */
  const structuralMatches =
    clauseMatches
      .filter(
        (match) =>
          (
            match.concept
              ?.kind ===
              "entity-type" ||
            match.concept
              ?.kind ===
              "role-signal"
          ) &&
          match.end <=
            triggerStart
      )
      .sort(
        (
          a,
          b
        ) =>
          b.end -
          a.end
      );


  for (
    const match of
    structuralMatches
  ) {
    const relativeEnd =
      match.end -
      clause.start;


    let after =
      clause.text.slice(
        relativeEnd,
        relativeTrigger
      );


    after =
      after.split(
        /(?:是|为|在|于|从|向|往|前往|拥有|使用|安装|接受|出生|来自|位于|加入|离开|搬到|搬至|搬往|搬入|搬出|搬离|搬迁|迁往|迁至|迁入|迁出|迁居|移动到|移动至|后来|随后|最终|最后)/u
      )[0];


    after =
      cleanChineseSubject(
        after
      );


    if (
      /^[\p{Script=Han}A-Za-z0-9·_-]{1,20}$/u.test(
        after
      )
    ) {
      return after;
    }
  }


  let fallback =
    before.split(
      /(?:是|为|在|于|从|向|往|前往|拥有|使用|安装|接受|出生|来自|位于|加入|离开|搬到|搬至|搬往|搬入|搬出|搬离|搬迁|迁往|迁至|迁入|迁出|迁居|移动到|移动至)/u
    )[0];


  fallback =
    cleanChineseSubject(
      fallback
    );


  if (
    /^[\p{Script=Han}A-Za-z0-9·_-]{1,20}$/u.test(
      fallback
    )
  ) {
    return fallback;
  }


  return null;
}


function resolveEnglishSubjectHint({
  clause,
  clauseMatches,
  triggerStart,
}) {
  /*
   * Entity type followed by a proper name:
   *
   * artificial intelligence Eden
   * android Alice
   * Captain Marcus
   */
  const structural =
    clauseMatches
      .filter(
        (match) =>
          (
            match.concept
              ?.kind ===
              "entity-type" ||
            match.concept
              ?.kind ===
              "role-signal"
          ) &&
          match.end <=
            triggerStart
      )
      .sort(
        (
          a,
          b
        ) =>
          b.end -
          a.end
      );


  for (
    const match of
    structural
  ) {
    const after =
      clause.text.slice(
        match.end -
          clause.start,
        triggerStart -
          clause.start
      );


    const nameMatch =
      after.match(
        /^\s*([A-Z][A-Za-z0-9'’-]*(?:\s+[A-Z][A-Za-z0-9'’-]*){0,2})/u
      );


    if (
      nameMatch
    ) {
      return nameMatch[1];
    }
  }


  const before =
    clause.text.slice(
      0,
      triggerStart -
        clause.start
    );


  /*
   * Luna is a wolf...
   * Alice is 24...
   * Mira has cyberware...
   */
  const subjectVerbPattern =
    before.match(
      /^\s*([A-Z][A-Za-z0-9'’-]*(?:\s+[A-Z][A-Za-z0-9'’-]*){0,2})\s+(?:is|was|are|were|has|have|had|uses|used|received|underwent|became|comes|came|lives|lived)\s+(?:a|an|the)?\s*$/iu
    );


  if (
    subjectVerbPattern
  ) {
    return subjectVerbPattern[1];
  }


  /*
   * Her body type...
   * His species...
   */
  const pronounPattern =
    before.match(
      /(?:^|\s)(He|She|It|They|His|Her|Its|Their)\b[^.!?;]*$/u
    );


  if (
    pronounPattern
  ) {
    return pronounPattern[1];
  }


  /*
   * Very simple sentence subject.
   */
  const simpleSubject =
    before.match(
      /^\s*([A-Z][A-Za-z0-9'’-]*(?:\s+[A-Z][A-Za-z0-9'’-]*){0,2})\b/u
    );


  return (
    simpleSubject?.[1] ||
    null
  );
}


function resolveSubjectHint({
  locale,
  clause,
  clauseMatches,
  triggerStart,
}) {
  if (
    isChineseLocale(
      locale
    )
  ) {
    return resolveChineseSubjectHint({
      clause,
      clauseMatches,
      triggerStart,
    });
  }


  if (
    isEnglishLocale(
      locale
    )
  ) {
    return resolveEnglishSubjectHint({
      clause,
      clauseMatches,
      triggerStart,
    });
  }


  return null;
}


// ======================================================
// Value Range Helpers
// ======================================================

function getChineseValueAfter({
  clause,
  absoluteStart,
  maxLength = 30,
}) {
  const relativeStart =
    absoluteStart -
    clause.start;


  let value =
    clause.text.slice(
      relativeStart,
      Math.min(
        clause.text.length,
        relativeStart +
          maxLength
      )
    );


  value =
    value.replace(
      /^(?:是|为|叫|有|拥有|使用|采用|属于|设置为|设为|：|:|=)+/u,
      ""
    );


  value =
    value.split(
      /[，。！？；、]/u
    )[0];


  value =
    value.split(
      /(?:并且|并|而且|同时|但是|但|然而|以及|还有)/u
    )[0];


  return cleanStringValue(
    value
  );
}


function getEnglishValueAfter({
  clause,
  absoluteStart,
  maxLength = 60,
}) {
  const relativeStart =
    absoluteStart -
    clause.start;


  let value =
    clause.text.slice(
      relativeStart,
      Math.min(
        clause.text.length,
        relativeStart +
          maxLength
      )
    );


  value =
    value.replace(
      /^(?:\s*(?:is|are|was|were|has|have|uses|use|using|with|of|:|=)\s*)+/iu,
      ""
    );


  value =
    value.split(
      /[,.;!?]/u
    )[0];


  value =
    value.split(
      /\s+(?:and|but|while|although|however)\s+/iu
    )[0];


  return cleanStringValue(
    value
  );
}


// ======================================================
// Special Pattern: Age
// ======================================================

function extractAge({
  text,
  clause,
  clauseMatches,
  locale,
}) {
  const results =
    [];


  if (
    isChineseLocale(
      locale
    )
  ) {
    const pattern =
      /(\d{1,4})\s*岁/u;


    const match =
      pattern.exec(
        clause.text
      );


    if (!match) {
      return results;
    }


    const start =
      clause.start +
      match.index;


    const subjectHint =
      resolveSubjectHint({
        locale,
        clause,
        clauseMatches,
        triggerStart:
          start,
      });


    const normalizedValue =
      normalizeFieldValue(
        "field.age",
        match[1]
      );


    results.push(
      makeFieldCandidate({
        subjectHint,

        fieldConcept:
          "field.age",

        value:
          match[1],

        normalizedValue,

        sourceText:
          match[0],

        start,

        end:
          start +
          match[0].length,

        confidence:
          0.98,

        extractor:
          "pattern.age.zh",

        metadata: {
          unit:
            "year",
        },
      })
    );


    return results;
  }


  if (
    isEnglishLocale(
      locale
    )
  ) {
    const patterns = [
      /(\d{1,4})\s+years?\s+old/iu,
      /aged\s+(\d{1,4})/iu,
    ];


    for (
      const pattern of
      patterns
    ) {
      const match =
        pattern.exec(
          clause.text
        );


      if (!match) {
        continue;
      }


      const start =
        clause.start +
        match.index;


      results.push(
        makeFieldCandidate({
          subjectHint:
            resolveSubjectHint({
              locale,
              clause,
              clauseMatches,
              triggerStart:
                start,
            }),

          fieldConcept:
            "field.age",

          value:
            match[1],

          normalizedValue:
            normalizeFieldValue(
              "field.age",
              match[1]
            ),

          sourceText:
            match[0],

          start,

          end:
            start +
            match[0].length,

          confidence:
            0.98,

          extractor:
            "pattern.age.en",

          metadata: {
            unit:
              "year",
          },
        })
      );


      break;
    }
  }


  return results;
}


// ======================================================
// Special Pattern: Birthplace
// ======================================================

function extractBirthplace({
  clause,
  clauseMatches,
  locale,
}) {
  const results =
    [];


  const pattern =
    isChineseLocale(
      locale
    )
      ? /(?:出生于|出生在|生于)\s*([^，。！？；]{1,30})/u
      : /(?:was\s+born\s+in|born\s+in)\s+([^,.;!?]{1,50})/iu;


  const match =
    pattern.exec(
      clause.text
    );


  if (!match) {
    return results;
  }


  const wholeStart =
    clause.start +
    match.index;


  const rawValue =
    cleanStringValue(
      match[1]
    );


  results.push(
    makeFieldCandidate({
      subjectHint:
        resolveSubjectHint({
          locale,
          clause,
          clauseMatches,

          triggerStart:
            wholeStart,
        }),

      fieldConcept:
        "field.birthplace",

      value:
        rawValue,

      normalizedValue:
        rawValue,

      sourceText:
        match[0],

      start:
        wholeStart,

      end:
        wholeStart +
        match[0].length,

      confidence:
        0.98,

      extractor:
        isChineseLocale(
          locale
        )
          ? "pattern.birthplace.zh"
          : "pattern.birthplace.en",
    })
  );


  return results;
}


// ======================================================
// Species
// ======================================================

function extractSpecies({
  text,
  clause,
  clauseMatches,
  clauseCompounds,
  speciesEvidence,
  locale,
}) {
  const results =
    [];


  /*
   * Compound species is the strongest evidence.
   *
   * 夜岚是一只虎鲸猫
   * -> 虎鲸猫
   */
  for (
    const compound of
    clauseCompounds
  ) {
    results.push(
      makeFieldCandidate({
        subjectHint:
          resolveSubjectHint({
            locale,
            clause,
            clauseMatches,

            triggerStart:
              compound.start,
          }),

        fieldConcept:
          "field.species",

        value:
          compound.text,

        normalizedValue:
          compound.text,

        sourceText:
          compound.text,

        start:
          compound.start,

        end:
          compound.end,

        confidence:
          compound.confidence,

        extractor:
          "pattern.species.compound",

        metadata: {
          hybrid:
            true,

          speciesComponents:
            compound.components.map(
              (component) =>
                component
                  .normalizedValue
            ),
        },

        evidence: [
          compound,
        ],
      })
    );
  }


  /*
   * Do not also emit the individual species atoms
   * that are already inside a compound.
   */
  const compoundRanges =
    clauseCompounds.map(
      (compound) => [
        compound.start,
        compound.end,
      ]
    );


  const clauseSpecies =
    speciesEvidence.filter(
      (item) =>
        item.start >=
          clause.start &&
        item.end <=
          clause.end
    );


  for (
    const species of
    clauseSpecies
  ) {
    const insideCompound =
      compoundRanges.some(
        (
          [
            start,
            end,
          ]
        ) =>
          species.start >=
            start &&
          species.end <=
            end
      );


    if (
      insideCompound
    ) {
      continue;
    }


    /*
     * We currently require some nearby species syntax
     * to avoid treating every animal mention as the
     * subject's species.
     */
    const relativeStart =
      species.start -
      clause.start;


    const before =
      clause.text.slice(
        Math.max(
          0,
          relativeStart -
            16
        ),
        relativeStart
      );


    const validContext =
      isChineseLocale(
        locale
      )
        ? /(?:是|为|属于|兽种|物种|种族|是一只|是一头|是一名|原型是)\s*$/u.test(
            before
          )
        : /(?:is|was|species is|species:|a|an)\s+$/iu.test(
            before
          );


    if (
      !validContext
    ) {
      continue;
    }


    results.push(
      makeFieldCandidate({
        subjectHint:
          resolveSubjectHint({
            locale,
            clause,
            clauseMatches,

            triggerStart:
              species.start,
          }),

        fieldConcept:
          "field.species",

        value:
          species.surface,

        normalizedValue:
          species.normalizedValue,

        sourceText:
          species.surface,

        start:
          species.start,

        end:
          species.end,

        confidence:
          Math.min(
            0.95,
            species.confidence +
              0.1
          ),

        extractor:
          "pattern.species.simple",

        evidence: [
          species,
        ],

        metadata: {
          hybrid:
            false,
        },
      })
    );
  }


  return results;
}


// ======================================================
// Role -> Occupation / Rank
// ======================================================

function extractRoles({
  clause,
  clauseMatches,
  locale,
}) {
  const results =
    [];


  const roleMatches =
    clauseMatches.filter(
      (match) =>
        match.concept
          ?.kind ===
        "role-signal"
    );


  for (
    const match of
    roleMatches
  ) {
    const fieldConcept =
      match.concept
        ?.fieldConcept ||
      match.concept
        ?.mapsToField ||
      (
        match.conceptId ===
        "role.military"
          ? "field.rank"
          : "field.occupation"
      );


    results.push(
      makeFieldCandidate({
        subjectHint:
          resolveSubjectHint({
            locale,
            clause,
            clauseMatches,

            triggerStart:
              match.start,
          }),

        fieldConcept,

        value:
          match.expression,

        normalizedValue:
          match.expression,

        sourceText:
          match.expression,

        start:
          match.start,

        end:
          match.end,

        confidence:
          match.confidence,

        extractor:
          "pattern.role",

        evidence: [
          match,
        ],
      })
    );
  }


  return results;
}


// ======================================================
// Direct Value Expressions
// ======================================================

function extractDirectValues({
  clause,
  clauseMatches,
  locale,
}) {
  const results =
    [];


  for (
    const match of
    clauseMatches
  ) {
    if (
      match.concept
        ?.kind !==
      "field"
    ) {
      continue;
    }

        /*
     * Suppress a generic field lexical match when it
     * is completely contained by a larger field match.
     *
     * Example:
     *
     * 意识等级
     * ├─ field.consciousnessLevel
     * └─ 等级 -> field.rank
     *
     * Keep consciousnessLevel.
     */
    const containedByMoreSpecificField =
      clauseMatches.some(
        (other) => {
          if (
            other ===
            match
          ) {
            return false;
          }


          if (
            other.concept
              ?.kind !==
            "field"
          ) {
            return false;
          }


          const contains =
            other.start <=
              match.start &&
            other.end >=
              match.end;


          const longer =
            (
              other.end -
              other.start
            ) >
            (
              match.end -
              match.start
            );


          return (
            contains &&
            longer
          );
        }
      );


    if (
      containedByMoreSpecificField
    ) {
      continue;
    }

    const allowed =
      DIRECT_VALUE_EXPRESSIONS.get(
        match.conceptId
      );


    if (!allowed) {
      continue;
    }


    const lower =
      String(
        match.expression
      )
        .toLowerCase();


    if (
      !allowed.has(
        lower
      ) &&
      !allowed.has(
        match.expression
      )
    ) {
      continue;
    }


    results.push(
      makeFieldCandidate({
        subjectHint:
          resolveSubjectHint({
            locale,
            clause,
            clauseMatches,

            triggerStart:
              match.start,
          }),

        fieldConcept:
          match.conceptId,

        value:
          match.expression,

        normalizedValue:
          match.expression,

        sourceText:
          match.expression,

        start:
          match.start,

        end:
          match.end,

        confidence:
          match.confidence,

        extractor:
          "pattern.direct-value",

        evidence: [
          match,
        ],
      })
    );
  }


  return results;
}


// ======================================================
// Generic Label -> Value
// ======================================================

function extractLabeledFields({
  clause,
  clauseMatches,
  locale,
}) {
  const results =
    [];


  for (
    const match of
    clauseMatches
  ) {
    if (
      match.concept
        ?.kind !==
      "field"
    ) {
      continue;
    }


    /*
     * These are handled by more specific extractors.
     */
    if (
      [
        "field.age",
        "field.birthplace",
        "field.species",
      ].includes(
        match.conceptId
      )
    ) {
      continue;
    }


    const relativeEnd =
      match.end -
      clause.start;


    const following =
      clause.text.slice(
        relativeEnd,
        Math.min(
          clause.text.length,
          relativeEnd +
            40
        )
      );


    /*
     * Only treat a lexical field match as a LABEL
     * if syntax directly after it looks like assignment.
     *
     * 主色是蓝色
     * 宜居度很高
     * model: XR-5
     */
    let hasAssignment =
      false;


    if (
      isChineseLocale(
        locale
      )
    ) {
      hasAssignment =
        /^(?:\s*(?:是|为|叫|有|：|:|=|很|较|比较|约为|大约为))/u.test(
          following
        );
    } else {
      hasAssignment =
        /^(?:\s*(?:is|are|was|were|has|have|:|=))/iu.test(
          following
        );
    }


    if (
      !hasAssignment
    ) {
      continue;
    }


    const rawValue =
      isChineseLocale(
        locale
      )
        ? getChineseValueAfter({
            clause,

            absoluteStart:
              match.end,
          })
        : getEnglishValueAfter({
            clause,

            absoluteStart:
              match.end,
          });


    if (
      !rawValue ||
      rawValue.length >
        50
    ) {
      continue;
    }


    const normalizedValue =
      normalizeFieldValue(
        match.conceptId,
        rawValue
      );


    if (
      normalizedValue ===
      null
    ) {
      continue;
    }


    results.push(
      makeFieldCandidate({
        subjectHint:
          resolveSubjectHint({
            locale,
            clause,
            clauseMatches,

            triggerStart:
              match.start,
          }),

        fieldConcept:
          match.conceptId,

        value:
          rawValue,

        normalizedValue,

        sourceText:
          clause.text.slice(
            match.start -
              clause.start
          ),

        start:
          match.start,

        end:
          match.end +
          rawValue.length,

        confidence:
          Math.min(
            0.95,
            match.confidence +
              0.08
          ),

        extractor:
          "pattern.field-label",

        evidence: [
          match,
        ],
      })
    );
  }


  return results;
}


// ======================================================
// Gravity: "1.2G表面重力"
// ======================================================

function extractGravityPrefix({
  clause,
  clauseMatches,
  locale,
}) {
  if (
    !isChineseLocale(
      locale
    )
  ) {
    return [];
  }


  const results =
    [];


  const gravityMatches =
    clauseMatches.filter(
      (match) =>
        match.conceptId ===
        "field.gravity"
    );


  for (
    const match of
    gravityMatches
  ) {
    const relativeStart =
      match.start -
      clause.start;


    const before =
      clause.text.slice(
        Math.max(
          0,
          relativeStart -
            12
        ),
        relativeStart
      );


    const numberMatch =
      before.match(
        /(\d+(?:\.\d+)?)\s*[gG]\s*$/u
      );


    if (
      !numberMatch
    ) {
      continue;
    }


    const rawValue =
      `${numberMatch[1]}G`;


    const valueStart =
      match.start -
      numberMatch[0]
        .length;


    results.push(
      makeFieldCandidate({
        subjectHint:
          resolveSubjectHint({
            locale,
            clause,
            clauseMatches,

            triggerStart:
              valueStart,
          }),

        fieldConcept:
          "field.gravity",

        value:
          rawValue,

        normalizedValue:
          normalizeFieldValue(
            "field.gravity",
            rawValue
          ),

        sourceText:
          `${rawValue}${match.expression}`,

        start:
          valueStart,

        end:
          match.end,

        confidence:
          0.98,

        extractor:
          "pattern.gravity-prefix",

        evidence: [
          match,
        ],
      })
    );
  }


  return results;
}


// ======================================================
// Main
// ======================================================

function extractPatternCandidates({
  text,
  locale,
  lexicalAnalysis,
}) {
  const results =
    [];


  const clauses =
    segmentClauses(
      text,
      locale
    );


  for (
    const clause of
    clauses
  ) {
    const rawClauseMatches =
      getMatchesInsideClause(
        lexicalAnalysis
          .matches,
        clause
      );


    const clauseMatches =
      filterSpecificEvidence(
        rawClauseMatches
      );


    const clauseCompounds =
      getCandidatesInsideClause(
        lexicalAnalysis
          .compoundSpeciesCandidates,
        clause
      );

    const semanticRelations =
      extractSemanticRelations({
        clause,

        clauseMatches,

        locale,
      });


    results.push(
      ...semanticRelations
    );


    results.push(
      ...createPreferredFieldCandidatesFromRelations(
        semanticRelations
      )
    );

    results.push(
      ...extractAge({
        text,
        clause,
        clauseMatches,
        locale,
      })
    );


    results.push(
      ...extractBirthplace({
        clause,
        clauseMatches,
        locale,
      })
    );


    results.push(
      ...extractSpecies({
        text,
        clause,
        clauseMatches,
        clauseCompounds,

        speciesEvidence:
          lexicalAnalysis
            .speciesEvidence,

        locale,
      })
    );


    results.push(
      ...extractRoles({
        clause,
        clauseMatches,
        locale,
      })
    );


    results.push(
      ...extractDirectValues({
        clause,
        clauseMatches,
        locale,
      })
    );


    results.push(
      ...extractLabeledFields({
        clause,
        clauseMatches,
        locale,
      })
    );


    results.push(
      ...extractGravityPrefix({
        clause,
        clauseMatches,
        locale,
      })
    );
  }


  return {
    clauses,

    candidates:
      deduplicateCandidates(
        results
      ),
  };
}


module.exports = {
  extractPatternCandidates,
};