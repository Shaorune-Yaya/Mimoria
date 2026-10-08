// ======================================================
// L2-C Event Assembler
//
// Converts L1 event evidence into structured events.
//
// Responsibilities:
//
// - Event detection
// - Event ambiguity resolution
// - Subject extraction / inheritance
// - Object extraction
// - Negation / intention / uncertainty scope
// - Event ordering
//
// Does NOT write canonical state.
// ======================================================


const {
  segmentClauses,
  getMatchesInsideClause,
  isChineseLocale,
  isEnglishLocale,
} = require(
  "./clauseSegmenter"
);

const {
  filterSpecificEvidence,
} = require(
  "./evidenceFilter"
);


// ======================================================
// Entity Type Groups
// ======================================================

const LOCATION_ENTITY_TYPES =
  new Set([
    "entityType.location",
    "entityType.country",
    "entityType.kingdom",
    "entityType.empire",
    "entityType.city",
    "entityType.port",
    "entityType.town",
    "entityType.village",
    "entityType.region",
    "entityType.province",
    "entityType.continent",
    "entityType.planet",
    "entityType.world",
    "entityType.dimension",
    "entityType.island",
    "entityType.mountain",
    "entityType.forest",
    "entityType.river",
    "entityType.lake",
    "entityType.ocean",
    "entityType.desert",
    "entityType.building",
    "entityType.landmark",
    "entityType.ruin",
    "entityType.dungeon",

    "entityType.star",
    "entityType.starSystem",
    "entityType.spaceStation",
    "entityType.colony",
  ]);


const ORGANIZATION_ENTITY_TYPES =
  new Set([
    "entityType.organization",
    "entityType.faction",
    "entityType.government",
    "entityType.politicalParty",
    "entityType.guild",
    "entityType.corporation",
    "entityType.military",
    "entityType.militaryUnit",
    "entityType.order",
    "entityType.religion",
    "entityType.church",
    "entityType.cult",
    "entityType.school",
    "entityType.secretSociety",
    "entityType.criminalOrganization",
  ]);


// ======================================================
// Event Groups
// ======================================================

const NO_OBJECT_EVENTS =
  new Set([
    "event.birth",
    "event.death",

    "event.launch",

    "event.awakenAI",
    "event.shutdownAI",
  ]);


const OPTIONAL_OBJECT_EVENTS =
  new Set([
    "event.leave",
    "event.depart",

    "event.land",
    "event.ftlJump",

    "event.augment",
    "event.clone",

    "event.uploadMind",
    "event.downloadMind",
  ]);


// ======================================================
// Factory
// ======================================================

function makeEventCandidate({
  eventConcept,

  subjectHint,
  objectHint,

  negated,
  intended,
  uncertain,

  start,
  end,

  sourceText,

  confidence,

  sequenceIndex,

  evidence = [],

  metadata = {},
}) {
  return {
    candidateType:
      "event",

    eventConcept,

    subjectHint:
      subjectHint ||
      null,

    objectHint:
      objectHint ||
      null,

    negated:
      Boolean(
        negated
      ),

    intended:
      Boolean(
        intended
      ),

    uncertain:
      Boolean(
        uncertain
      ),

    start,
    end,

    sourceText,

    confidence,

    sequenceIndex,

    extractor:
      "event-assembler",

    evidence,

    metadata,
  };
}


// ======================================================
// Chinese Text Helpers
// ======================================================
function stripChineseDiscoursePrefix(
  value
) {
  let result =
    String(
      value || ""
    )
      .trim();


  result =
    result.replace(
      /^(?:一开始|最初|起初|后来|随后|然后|接着|最终|最后|之后|同时)+/u,
      ""
    );


  result =
    result.replace(
      /^(?:又|再|还|也|并且|并)+/u,
      ""
    );


  return result.trim();
}

function stripChineseDiscourseSuffix(
  value
) {
  return String(
    value || ""
  )
    .replace(
      /(?:一开始|最初|起初|后来|随后|然后|接着|最终|最后|之后|同时)$/u,
      ""
    )
    .trim();
}


function stripChineseAuxiliaryPhrase(
  value
) {
  const normalized =
    String(
      value || ""
    )
      .trim();


  if (
    /^(?:开始|开始进行|进行|继续|继续进行|尝试|试图|决定|准备|计划|打算|成功|再次|重新|终于|突然|立即|立刻)$/u.test(
      normalized
    )
  ) {
    return "";
  }


  return normalized;
}


function cleanChineseSubject(
  value
) {
  let result =
    String(
      value || ""
    )
      .trim();


  /*
   * 后来又加入...
   * -> ""
   *
   * 后来牙牙加入...
   * -> 牙牙
   */
  result =
    stripChineseDiscoursePrefix(
      result
    );


  result =
    result.replace(
      /^(?:但是|但|而|并且|并|又|再|还|则)+/u,
      ""
    );


  result =
    stripChineseDiscourseSuffix(
      result
    );


  /*
   * 联邦在新伊甸建立殖民地
   * -> subject = 联邦
   */
  const locationAdjunct =
    result.match(
      /^(.{1,30}?)(?:在|于)[^，；。！？]{1,30}$/u
    );


  if (
    locationAdjunct
  ) {
    result =
      locationAdjunct[1];
  }


  result =
    stripChineseAuxiliaryPhrase(
      result
    );


  result =
    result.replace(
      /(?:的|之)$/u,
      ""
    );


  return result.trim();
}


function cleanChineseObject(
  value
) {
  let result =
    String(
      value || ""
    )
      .trim();


  result =
    result.replace(
      /^(?:了|到|至|向|往|前往|进入|加入|于|在|给|对|把|将)+/u,
      ""
    );


  result =
    result.replace(
      /(?:了|中|内|里)$/u,
      ""
    );


  return (
    result.trim() ||
    null
  );
}


// ======================================================
// English Helpers
// ======================================================

function cleanEnglishObject(
  value
) {
  let result =
    String(
      value || ""
    )
      .trim();


  result =
    result.replace(
      /^(?:to|into|in|at|on|from|with|of)\s+/iu,
      ""
    );


  result =
    result.replace(
      /^(?:a|an|the)\s+/iu,
      ""
    );


  return (
    result.trim() ||
    null
  );
}


// ======================================================
// Subject Detection - Chinese
// ======================================================

function resolveChineseSubject({
  clause,
  eventMatch,
  previousSubject,
}) {
  const relativeStart =
    eventMatch.start -
    clause.start;


  const before =
    clause.text.slice(
      0,
      relativeStart
    );


  const pieces =
    before.split(
      /[，；。！？]/u
    );


  let local =
    pieces[
      pieces.length -
      1
    ]
      .trim();


  /*
   * Remove modality immediately before event.
   */
  local =
    local.replace(
      /(?:并没有|没有|没|未曾|从未|并未|不曾|不|计划|打算|准备|想要|希望|可能|也许|或许|大概|似乎|据说)+$/u,
      ""
    )
      .trim();


  /*
   * Remove discourse words even when they are attached
   * to the end of a real subject:
   */
  local =
    stripChineseDiscoursePrefix(
        local
    );


    local =
    stripChineseDiscourseSuffix(
        local
    );


  /*
   * Remove verbal material that may sit between subject
   * and the event trigger.
   */
  const verbBoundary =
    local.search(
      /(?:率领|带领|驾驶|操作|命令|决定|开始|继续|尝试|成功|曾经|已经|接受|进行了)/u
    );


  if (
    verbBoundary >
      0
  ) {
    local =
      local.slice(
        0,
        verbBoundary
      );
  } else if (
    verbBoundary ===
      0
  ) {
    local =
      "";
  }


  local =
    cleanChineseSubject(
      local
    );


  if (
    !local ||
    local.length >
      30
  ) {
    return (
      previousSubject ||
      null
    );
  }


  return local;
}


// ======================================================
// Subject Detection - English
// ======================================================

function resolveEnglishSubject({
  clause,
  eventMatch,
  previousSubject,
}) {
  const relativeStart =
    eventMatch.start -
    clause.start;


  const before =
    clause.text.slice(
      0,
      relativeStart
    );


  const pieces =
    before.split(
      /[,;]/u
    );


  let local =
    pieces[
      pieces.length -
      1
    ]
      .trim();


  const pronoun =
    local.match(
      /^(?:then\s+|later\s+|finally\s+)?(he|she|it|they)\b/iu
    );


  if (
    pronoun
  ) {
    return (
      previousSubject ||
      pronoun[1]
    );
  }


  local =
    local.replace(
      /^(?:then|later|afterward|afterwards|finally|eventually|subsequently|and)\s+/iu,
      ""
    );


  local =
    local.replace(
      /\b(?:did not|didn't|never|not|plans? to|planned to|intends? to|intended to|wants? to|wanted to|may|might|possibly|probably)\s*$/iu,
      ""
    )
      .trim();


  const articleSubject =
    local.match(
      /(?:^|\s)(The\s+[A-Z][A-Za-z0-9'’-]*(?:\s+[A-Z][A-Za-z0-9'’-]*){0,3})\s*$/u
    );


  if (
    articleSubject
  ) {
    return articleSubject[1];
  }


  const proper =
    local.match(
      /([A-Z][A-Za-z0-9'’-]*(?:\s+[A-Z][A-Za-z0-9'’-]*){0,3})\s*$/u
    );


  if (
    proper
  ) {
    return proper[1];
  }


  return (
    previousSubject ||
    null
  );
}


// ======================================================
// Generic Subject Resolver
// ======================================================

function resolveSubject({
  clause,
  eventMatch,
  locale,
  previousSubject,
}) {
  if (
    isChineseLocale(
      locale
    )
  ) {
    return resolveChineseSubject({
      clause,
      eventMatch,
      previousSubject,
    });
  }


  if (
    isEnglishLocale(
      locale
    )
  ) {
    return resolveEnglishSubject({
      clause,
      eventMatch,
      previousSubject,
    });
  }


  return (
    previousSubject ||
    null
  );
}


// ======================================================
// Modifier Scope
// ======================================================

function modifierApplies({
  clause,
  eventMatch,
  matches,
  conceptId,
  windowBefore,
  windowAfter = 2,
}) {
  return matches.some(
    (match) => {
      if (
        match.conceptId !==
        conceptId
      ) {
        return false;
      }


      const beforeDistance =
        eventMatch.start -
        match.end;


      const afterDistance =
        match.start -
        eventMatch.end;


      if (
        beforeDistance >=
          0 &&
        beforeDistance <=
          windowBefore
      ) {
        return true;
      }


      if (
        afterDistance >=
          0 &&
        afterDistance <=
          windowAfter
      ) {
        return true;
      }


      return false;
    }
  );
}


// ======================================================
// Event Ambiguity Resolution
// ======================================================

function getEntityMatchesNearObject({
  matches,
  eventMatch,
  limitEnd,
}) {
  return matches.filter(
    (match) => {
      if (
        match.concept
          ?.kind !==
        "entity-type"
      ) {
        return false;
      }


      return (
        match.start >=
          eventMatch.end &&
        match.start <
          limitEnd
      );
    }
  );
}


function eventObjectLooksLikeLocation({
  matches,
  eventMatch,
  clause,
}) {
  const nearby =
    getEntityMatchesNearObject({
      matches,
      eventMatch,
      limitEnd:
        Math.min(
          clause.end,
          eventMatch.end +
            20
        ),
    });


  return nearby.some(
    (match) =>
      LOCATION_ENTITY_TYPES.has(
        match.conceptId
      )
  );
}


function eventObjectLooksLikeOrganization({
  matches,
  eventMatch,
  clause,
}) {
  const nearby =
    getEntityMatchesNearObject({
      matches,
      eventMatch,
      limitEnd:
        Math.min(
          clause.end,
          eventMatch.end +
            20
        ),
    });


  return nearby.some(
    (match) =>
      ORGANIZATION_ENTITY_TYPES.has(
        match.conceptId
      )
  );
}


function resolveAmbiguousEvents({
  eventMatches,
  matches,
  clause,
  previousEvent,
}) {
  const groups =
    new Map();


  for (
    const event of
    eventMatches
  ) {
    const key = [
      event.start,
      event.end,
    ].join(":");


    if (
      !groups.has(
        key
      )
    ) {
      groups.set(
        key,
        []
      );
    }


    groups
      .get(
        key
      )
      .push(
        event
      );
  }


  const result =
    [];


  const orderedGroups =
    Array.from(
      groups.values()
    )
      .sort(
        (
          a,
          b
        ) =>
          a[0].start -
          b[0].start
      );


  let previousResolvedConcept =
    previousEvent
      ?.eventConcept ||
    null;


  for (
    const group of
    orderedGroups
  ) {
    if (
      group.length ===
      1
    ) {
      result.push(
        group[0]
      );


      previousResolvedConcept =
        group[0]
          .conceptId;


      continue;
    }


    const leave =
      group.find(
        (event) =>
          event.conceptId ===
          "event.leave"
      );


    const depart =
      group.find(
        (event) =>
          event.conceptId ===
          "event.depart"
      );


    if (
      leave &&
      depart
    ) {
      const location =
        eventObjectLooksLikeLocation({
          matches,

          eventMatch:
            depart,

          clause,
        });


      const organization =
        eventObjectLooksLikeOrganization({
          matches,

          eventMatch:
            leave,

          clause,
        });


      /*
       * 离开银月城
       * left the city
       */
      if (
        location &&
        !organization
      ) {
        result.push(
          depart
        );


        previousResolvedConcept =
          depart.conceptId;


        continue;
      }


      /*
       * left the Guild
       */
      if (
        organization
      ) {
        result.push(
          leave
        );


        previousResolvedConcept =
          leave.conceptId;


        continue;
      }


      /*
       * Alice joined the Guild,
       * later left...
       *
       * The immediately preceding semantic event was
       * membership join, so "left" means membership
       * termination rather than physical departure.
       */
      if (
        previousResolvedConcept ===
          "event.join"
      ) {
        result.push(
          leave
        );


        previousResolvedConcept =
          leave.conceptId;


        continue;
      }


      /*
       * Otherwise physical departure is safer.
       */
      result.push(
        depart
      );


      previousResolvedConcept =
        depart.conceptId;


      continue;
    }


    group.sort(
      (
        a,
        b
      ) => {
        if (
          a.confidence !==
          b.confidence
        ) {
          return (
            b.confidence -
            a.confidence
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


    result.push(
      group[0]
    );


    previousResolvedConcept =
      group[0]
        .conceptId;
  }


  return result.sort(
    (
      a,
      b
    ) =>
      a.start -
      b.start
  );
}


// ======================================================
// Object Extraction Helpers
// ======================================================

function findNextEventStart(
  eventMatches,
  currentMatch
) {
  const next =
    eventMatches.find(
      (event) =>
        event.start >
        currentMatch.start
    );


  return (
    next?.start ??
    null
  );
}


// ======================================================
// Special Chinese Object Patterns
// ======================================================

function extractChinesePreEventObject({
  clause,
  eventMatch,
}) {
  const before =
    clause.text.slice(
      0,
      eventMatch.start -
        clause.start
    );


  /*
   * 联邦在新伊甸建立殖民地
   */
  if (
    eventMatch.conceptId ===
    "event.colonize"
  ) {
    const match =
      before.match(
        /(?:在|于)([^，；。！？]{1,30})$/u
      );


    if (
      match
    ) {
      return cleanChineseObject(
        match[1]
      );
    }
  }


  return null;
}


function extractChineseObject({
  text,
  clause,
  eventMatch,
  eventMatches,
}) {
  if (
    NO_OBJECT_EVENTS.has(
      eventMatch.conceptId
    )
  ) {
    return null;
  }


  const preEventObject =
    extractChinesePreEventObject({
      clause,
      eventMatch,
    });


  if (
    preEventObject
  ) {
    return preEventObject;
  }


  const nextEventStart =
    findNextEventStart(
      eventMatches,
      eventMatch
    );


  const maxEnd =
    nextEventStart
      ? Math.min(
          nextEventStart,
          clause.end
        )
      : clause.end;


  let after =
    text.slice(
      eventMatch.end,
      maxEnd
    );


  after =
    after.split(
      /[，。！？；、]/u
    )[0];


  after =
    after.split(
      /(?:后来|随后|然后|接着|最终|最后|之后|但是|但|而|并且|并)/u
    )[0];


  return cleanChineseObject(
    after
  );
}


// ======================================================
// English Object Extraction
// ======================================================

function extractEnglishObject({
  text,
  clause,
  eventMatch,
  eventMatches,
}) {
  if (
    NO_OBJECT_EVENTS.has(
      eventMatch.conceptId
    )
  ) {
    return null;
  }


  const nextEventStart =
    findNextEventStart(
      eventMatches,
      eventMatch
    );


  const maxEnd =
    nextEventStart
      ? Math.min(
          nextEventStart,
          clause.end
        )
      : clause.end;


  let after =
    text.slice(
      eventMatch.end,
      maxEnd
    );


  after =
    after.split(
      /[,.;!?]/u
    )[0];


  after =
    after.split(
      /\s+(?:and|then|later|finally|but|while|afterward|afterwards)\s+/iu
    )[0];


  return cleanEnglishObject(
    after
  );
}


function extractObject({
  text,
  clause,
  eventMatch,
  eventMatches,
  locale,
}) {
  if (
    isChineseLocale(
      locale
    )
  ) {
    return extractChineseObject({
      text,
      clause,
      eventMatch,
      eventMatches,
    });
  }


  if (
    isEnglishLocale(
      locale
    )
  ) {
    return extractEnglishObject({
      text,
      clause,
      eventMatch,
      eventMatches,
    });
  }


  return null;
}


// ======================================================
// Confidence
// ======================================================

function calculateEventConfidence({
  eventMatch,
  subjectHint,
  objectHint,
  negated,
  intended,
  uncertain,
}) {
  let confidence =
    eventMatch.confidence;


  if (
    subjectHint
  ) {
    confidence +=
      0.05;
  }


  if (
    objectHint
  ) {
    confidence +=
      0.05;
  }


  if (
    negated ||
    intended ||
    uncertain
  ) {
    confidence +=
      0.02;
  }


  return Math.min(
    1,
    confidence
  );
}


// ======================================================
// Main
// ======================================================

function assembleEvents({
  text,
  locale,
  lexicalAnalysis,
}) {
  const clauses =
    segmentClauses(
      text,
      locale
    );


  const events =
    [];


  let discourseSubject =
    null;

  let previousEvent =
    null;

  let sequenceIndex =
    0;


  for (
    const clause of
    clauses
  ) {
    const rawMatches =
      getMatchesInsideClause(
        lexicalAnalysis.matches,
        clause
      );


    const matches =
      filterSpecificEvidence(
        rawMatches
      );


    let eventMatches =
      matches
        .filter(
          (match) =>
            match.concept
              ?.kind ===
            "event"
        )
        .sort(
          (
            a,
            b
          ) =>
            a.start -
            b.start
        );


    /*
     * Resolve same-span semantic ambiguity.
     */
    eventMatches =
      resolveAmbiguousEvents({
        eventMatches,
        matches,
        clause,
        previousEvent,
      });


    if (
      eventMatches.length ===
      0
    ) {
      continue;
    }


    for (
      const eventMatch of
      eventMatches
    ) {
      let subjectHint =
        resolveSubject({
          clause,
          eventMatch,
          locale,

          previousSubject:
            discourseSubject,
        });


      if (
        subjectHint
      ) {
        discourseSubject =
          subjectHint;
      }


      let objectHint =
        extractObject({
          text,
          clause,
          eventMatch,
          eventMatches,
          locale,
        });


      /*
       * Membership ellipsis:
       *
       * 牙牙加入民主党，后来退出。
       */
      if (
        !objectHint &&
        eventMatch.conceptId ===
          "event.leave" &&
        previousEvent &&
        previousEvent.subjectHint ===
          subjectHint
      ) {
        objectHint =
          previousEvent.objectHint ||
          null;
      }


      /*
       * Terraform after colonization:
       *
       * 联邦在新伊甸建立殖民地，
       * 随后开始进行行星改造。
       *
       * The location can be inherited.
       */
      if (
        !objectHint &&
        eventMatch.conceptId ===
          "event.terraform" &&
        previousEvent
          ?.eventConcept ===
          "event.colonize"
      ) {
        objectHint =
          previousEvent.objectHint ||
          null;
      }


      const negated =
        modifierApplies({
          clause,
          eventMatch,
          matches,

          conceptId:
            "modifier.negation",

          windowBefore:
            isChineseLocale(
              locale
            )
              ? 6
              : 18,
        });


      const intended =
        modifierApplies({
          clause,
          eventMatch,
          matches,

          conceptId:
            "modifier.intention",

          windowBefore:
            isChineseLocale(
              locale
            )
              ? 8
              : 22,
        });


      const uncertain =
        modifierApplies({
          clause,
          eventMatch,
          matches,

          conceptId:
            "modifier.uncertainty",

          windowBefore:
            isChineseLocale(
              locale
            )
              ? 8
              : 20,
        });


      const confidence =
        calculateEventConfidence({
          eventMatch,
          subjectHint,
          objectHint,
          negated,
          intended,
          uncertain,
        });


      const candidate =
        makeEventCandidate({
          eventConcept:
            eventMatch.conceptId,

          subjectHint,

          objectHint,

          negated,
          intended,
          uncertain,

          start:
            eventMatch.start,

          end:
            eventMatch.end,

          sourceText:
            text.slice(
              eventMatch.start,
              eventMatch.end
            ),

          confidence,

          sequenceIndex,

          evidence: [
            eventMatch,
          ],

          metadata: {
            producesRelation:
              eventMatch.concept
                ?.producesRelation ||
              null,

            endsRelation:
              eventMatch.concept
                ?.endsRelation ||
              null,

            objectInherited:
              Boolean(
                objectHint &&
                previousEvent &&
                objectHint ===
                  previousEvent.objectHint &&
                (
                  eventMatch.conceptId ===
                    "event.leave" ||
                  eventMatch.conceptId ===
                    "event.terraform"
                )
              ),
          },
        });


      events.push(
        candidate
      );


      previousEvent =
        candidate;


      sequenceIndex +=
        1;
    }
  }


  return {
    clauses,
    events,
  };
}


module.exports = {
  assembleEvents,
};