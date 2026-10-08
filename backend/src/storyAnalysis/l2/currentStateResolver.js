// ======================================================
// L2-D Current State Resolver
//
// Replays confirmed story events and derives the
// current canonical relation state.
//
// Important:
//
// - Negated events do not affect current state.
// - Intended events do not affect current state.
// - Uncertain events do not affect current state.
// - Story history is preserved.
// - No database writes happen here.
// ======================================================


// ======================================================
// Helpers
// ======================================================

function makeRelationKey({
  subjectHint,
  relationConcept,
  objectHint,
}) {
  return [
    subjectHint || "",
    relationConcept || "",
    objectHint || "",
  ].join(
    "::"
  );
}


function isConfirmedEvent(
  event
) {
  return (
    !event.negated &&
    !event.intended &&
    !event.uncertain
  );
}


function getMutationType(
  event
) {
  if (
    event.metadata
      ?.producesRelation
  ) {
    return "produce";
  }


  if (
    event.metadata
      ?.endsRelation
  ) {
    return "end";
  }


  return null;
}


// ======================================================
// Relation State
// ======================================================

function makeActiveRelation({
  event,
  relationConcept,
}) {
  return {
    candidateType:
      "relation-state",

    subjectHint:
      event.subjectHint,

    relationConcept,

    objectHint:
      event.objectHint,

    state:
      "active",

    confidence:
      event.confidence,

    startedBySequence:
      event.sequenceIndex,

    lastChangedBySequence:
      event.sequenceIndex,

    derivedFromEvents: [
      event.sequenceIndex,
    ],

    metadata: {
      sourceEventConcept:
        event.eventConcept,
    },
  };
}


// ======================================================
// History Entry
// ======================================================

function makeHistoryEntry({
  event,
  action,
  relationConcept,
  applied,
  reason = null,
}) {
  return {
    sequenceIndex:
      event.sequenceIndex,

    eventConcept:
      event.eventConcept,

    subjectHint:
      event.subjectHint,

    objectHint:
      event.objectHint,

    relationConcept,

    action,

    applied,

    reason,

    negated:
      event.negated,

    intended:
      event.intended,

    uncertain:
      event.uncertain,

    confidence:
      event.confidence,
  };
}


// ======================================================
// Produce Relation
// ======================================================

function applyProduce({
  event,
  relationConcept,
  activeRelations,
  history,
}) {
  if (
    !event.subjectHint
  ) {
    history.push(
      makeHistoryEntry({
        event,
        action:
          "produce",

        relationConcept,

        applied:
          false,

        reason:
          "missing-subject",
      })
    );


    return;
  }


  if (
    !event.objectHint
  ) {
    history.push(
      makeHistoryEntry({
        event,
        action:
          "produce",

        relationConcept,

        applied:
          false,

        reason:
          "missing-object",
      })
    );


    return;
  }


  const key =
    makeRelationKey({
      subjectHint:
        event.subjectHint,

      relationConcept,

      objectHint:
        event.objectHint,
    });


  const existing =
    activeRelations.get(
      key
    );


  if (
    existing
  ) {
    existing
      .derivedFromEvents
      .push(
        event.sequenceIndex
      );


    existing
      .lastChangedBySequence =
      event.sequenceIndex;


    existing.confidence =
      Math.max(
        existing.confidence,
        event.confidence
      );
  } else {
    activeRelations.set(
      key,

      makeActiveRelation({
        event,
        relationConcept,
      })
    );
  }


  history.push(
    makeHistoryEntry({
      event,

      action:
        "produce",

      relationConcept,

      applied:
        true,
    })
  );
}


// ======================================================
// End Relation
// ======================================================

function applyEnd({
  event,
  relationConcept,
  activeRelations,
  history,
  endedRelations,
}) {
  if (
    !event.subjectHint
  ) {
    history.push(
      makeHistoryEntry({
        event,

        action:
          "end",

        relationConcept,

        applied:
          false,

        reason:
          "missing-subject",
      })
    );


    return;
  }


  /*
   * We intentionally require an object here.
   *
   * If the story only says:
   *
   * "后来退出了"
   *
   * Event Assembly should resolve/inherit the target
   * before this layer.
   *
   * L2-D should not guess which relation to remove.
   */
  if (
    !event.objectHint
  ) {
    history.push(
      makeHistoryEntry({
        event,

        action:
          "end",

        relationConcept,

        applied:
          false,

        reason:
          "missing-object",
      })
    );


    return;
  }


  const key =
    makeRelationKey({
      subjectHint:
        event.subjectHint,

      relationConcept,

      objectHint:
        event.objectHint,
    });


  const existing =
    activeRelations.get(
      key
    );


  if (
    !existing
  ) {
    history.push(
      makeHistoryEntry({
        event,

        action:
          "end",

        relationConcept,

        applied:
          false,

        reason:
          "no-active-relation",
      })
    );


    return;
  }


  activeRelations.delete(
    key
  );


  endedRelations.push({
    ...existing,

    state:
      "ended",

    endedBySequence:
      event.sequenceIndex,

    lastChangedBySequence:
      event.sequenceIndex,

    confidence:
      Math.min(
        existing.confidence,
        event.confidence
      ),

    derivedFromEvents: [
      ...existing
        .derivedFromEvents,

      event.sequenceIndex,
    ],
  });


  history.push(
    makeHistoryEntry({
      event,

      action:
        "end",

      relationConcept,

      applied:
        true,
    })
  );
}


// ======================================================
// Resolve
// ======================================================

function resolveCurrentState(
  eventCandidates
) {
  const events =
    [...(
      eventCandidates ||
      []
    )]
      .sort(
        (
          a,
          b
        ) =>
          a.sequenceIndex -
          b.sequenceIndex
      );


  const activeRelations =
    new Map();


  const endedRelations =
    [];


  const history =
    [];


  const ignoredEvents =
    [];


  const nonRelationEvents =
    [];


  for (
    const event of
    events
  ) {
    const producesRelation =
      event.metadata
        ?.producesRelation ||
      null;


    const endsRelation =
      event.metadata
        ?.endsRelation ||
      null;


    /*
     * Modal / negated story events remain part of
     * story history, but cannot modify current canon.
     */
    if (
      !isConfirmedEvent(
        event
      )
    ) {
      let reason =
        "non-confirmed";


      if (
        event.negated
      ) {
        reason =
          "negated";
      } else if (
        event.intended
      ) {
        reason =
          "intended";
      } else if (
        event.uncertain
      ) {
        reason =
          "uncertain";
      }


      ignoredEvents.push({
        ...event,

        stateResolution: {
          applied:
            false,

          reason,
        },
      });


      continue;
    }


    /*
     * Historical event with no current relation
     * semantics.
     *
     * launch / travel / terraform / hack / etc.
     */
    if (
      !producesRelation &&
      !endsRelation
    ) {
      nonRelationEvents.push(
        event
      );


      continue;
    }


    if (
      producesRelation
    ) {
      applyProduce({
        event,

        relationConcept:
          producesRelation,

        activeRelations,
        history,
      });
    }


    if (
      endsRelation
    ) {
      applyEnd({
        event,

        relationConcept:
          endsRelation,

        activeRelations,
        history,
        endedRelations,
      });
    }
  }


  return {
    currentRelations:
      Array.from(
        activeRelations.values()
      )
        .sort(
          (
            a,
            b
          ) => {
            if (
              a.subjectHint !==
              b.subjectHint
            ) {
              return String(
                a.subjectHint
              )
                .localeCompare(
                  String(
                    b.subjectHint
                  )
                );
            }


            return String(
              a.relationConcept
            )
              .localeCompare(
                String(
                  b.relationConcept
                )
              );
          }
        ),

    endedRelations,

    relationHistory:
      history,

    ignoredEvents,

    nonRelationEvents,
  };
}


module.exports = {
  resolveCurrentState,
  isConfirmedEvent,
};