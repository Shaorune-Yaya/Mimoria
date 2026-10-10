import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useOnboarding,
} from "../onboarding/OnboardingContext";


// ======================================================
// Helpers
// ======================================================

function getCandidateId(
  candidate
) {
  return (
    candidate?.id ||
    candidate?._id ||
    null
  );
}


function clonePayload(
  payload
) {
  try {
    return JSON.parse(
      JSON.stringify(
        payload ||
        {}
      )
    );
  } catch {
    return {
      ...(
        payload ||
        {}
      ),
    };
  }
}


function normalizeLocale(
  language
) {
  return String(
    language ||
    "en"
  )
    .toLowerCase()
    .startsWith(
      "zh"
    )
    ? "zh-CN"
    : "en";
}

function isMachineConceptLabel(
  value
) {
  const normalized =
    String(
      value || ""
    )
      .trim();

  return (
    normalized.startsWith(
      "field."
    ) ||
    normalized.startsWith(
      "relation."
    ) ||
    normalized.startsWith(
      "event."
    ) ||
    normalized.startsWith(
      "entityType."
    )
  );
}

// ======================================================
// Confidence Presentation
//
// Keep these thresholds synchronized with:
//
// backend/src/storyAnalysis/l3/storySuggestionGenerator.js
//
// Numeric confidence remains the source of truth.
// ======================================================

const CONFIDENCE_THRESHOLDS = {
  normal:
    0.72,

  lowConfidence:
    0.55,

  veryLowConfidence:
    0.38,
};


function getConfidenceValue(
  candidate
) {
  return Math.max(
    0,

    Math.min(
      1,

      Number(
        candidate
          ?.confidence ??
        0
      ) || 0
    )
  );
}


function getConfidenceTier(
  candidate
) {
  /*
   * New backend candidates already expose confidenceTier.
   *
   * Fallback to numeric confidence so:
   *
   * - old persisted candidates
   * - edited candidates
   * - development data
   *
   * still render correctly.
   */
  const explicitTier =
    candidate
      ?.confidenceTier;


  if (
    [
      "normal",
      "low-confidence",
      "very-low-confidence",
      "suppressed",
    ].includes(
      explicitTier
    )
  ) {
    return explicitTier;
  }


  const confidence =
    getConfidenceValue(
      candidate
    );


  if (
    confidence >=
    CONFIDENCE_THRESHOLDS
      .normal
  ) {
    return "normal";
  }


  if (
    confidence >=
    CONFIDENCE_THRESHOLDS
      .lowConfidence
  ) {
    return "low-confidence";
  }


  if (
    confidence >=
    CONFIDENCE_THRESHOLDS
      .veryLowConfidence
  ) {
    return "very-low-confidence";
  }


  return "suppressed";
}


function getConfidencePriority(
  candidate
) {
  switch (
    getConfidenceTier(
      candidate
    )
  ) {
    case "normal":
      return 10;

    case "low-confidence":
      return 20;

    case "very-low-confidence":
      return 30;

    default:
      return 40;
  }
}

function getDisplayValue(
  fieldConcept,
  value,
  t
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return "";
  }


  if (
    fieldConcept ===
      "field.gender"
  ) {
    const normalizedValue =
      String(
        value
      )
        .trim()
        .toLowerCase();


    if (
      normalizedValue ===
      "female"
    ) {
      return t(
        "documents.values.gender.female",
        {
          defaultValue:
            "Female",
        }
      );
    }


    if (
      normalizedValue ===
      "male"
    ) {
      return t(
        "documents.values.gender.male",
        {
          defaultValue:
            "Male",
        }
      );
    }
  }


  return String(
    value
  );
}

// ======================================================
// Component
// ======================================================

export default function StorySuggestionsPanel({
  candidates = [],

  entityTypes = [],

  analysisState =
    "idle",

  analysisError =
    "",

  actionCandidateId =
    null,

  language =
    "en",

  t,

  title = null,

  description = null,

  emptyText = null,

  getConceptLabel,

  getSuggestionKindLabel,

  onApply,

  onIgnore,

  onEdit,

  onTutorialEditNameChange =
    null,

  onTutorialEditOpened =
  null,

  onTutorialManualTypeChange =
    null,

  onClearError,
}) {
  const {
    active,
    currentStep,
    nextStep,
  } =
    useOnboarding();


  const [
    editingCandidateId,
    setEditingCandidateId,
  ] = useState(
    null
  );


  const [
    editPayload,
    setEditPayload,
  ] = useState(
    {}
  );


  const [
    entityTypeSelections,
    setEntityTypeSelections,
  ] = useState(
    {}
  );


  const [
    showVeryLowConfidence,
    setShowVeryLowConfidence,
  ] = useState(
    false
  );

  const locale =
    normalizeLocale(
      language
    );


  const recommendedTypeOptions = [
    "entityType.character",
    "entityType.person",

    "entityType.location",
    "entityType.city",
    "entityType.town",
    "entityType.village",
    "entityType.country",
    "entityType.region",
    "entityType.building",

    "entityType.organization",
    "entityType.faction",
    "entityType.guild",
    "entityType.corporation",
    "entityType.church",
    "entityType.religion",
    "entityType.school",

    "entityType.vehicle",
    "entityType.ship",
    "entityType.spacecraft",

    "entityType.planet",
    "entityType.world",
    ];  

  const pendingCount =
    useMemo(
      () =>
        candidates.filter(
          (
            candidate
          ) =>
            candidate.status ===
              "pending" &&
            getConfidenceTier(
              candidate
            ) !==
              "suppressed"
        ).length,

      [
        candidates,
      ]
    );


  const veryLowConfidenceCount =
    useMemo(
      () =>
        candidates.filter(
          (
            candidate
          ) =>
            getConfidenceTier(
              candidate
            ) ===
            "very-low-confidence"
        ).length,

      [
        candidates,
      ]
    );

  // ====================================================
  // Suggestion Display Order
  //
  // Priority:
  //
  // 1. Confidence tier
  //
  //    normal
  //    low-confidence
  //    very-low-confidence
  //
  // 2. Dependency / action order
  //
  //    create entity
  //    create schema
  //    field update
  //    relation
  //    event
  //
  // 3. Higher confidence first
  //
  // This prevents a malformed 58% Create Entity candidate
  // from appearing above a 98% high-quality field update.
  // ====================================================

  const orderedCandidates =
    useMemo(
      () => {
        const kindPriority = {
          "create-entity":
            10,

          "create-schema-field":
            20,

          "create-select-option":
            30,

          "field-update":
            40,

          "relation-update":
            50,

          "event-history":
            60,
        };


        return candidates
          .filter(
            (
              candidate
            ) =>
              getConfidenceTier(
                candidate
              ) !==
              "suppressed"
          )
          .map(
            (
              candidate,
              index
            ) => ({
              candidate,

              index,
            })
          )
          .sort(
            (
              left,
              right
            ) => {
              // ------------------------------------------
              // 1. Confidence Tier
              // ------------------------------------------

              const leftConfidencePriority =
                getConfidencePriority(
                  left.candidate
                );


              const rightConfidencePriority =
                getConfidencePriority(
                  right.candidate
                );


              if (
                leftConfidencePriority !==
                rightConfidencePriority
              ) {
                return (
                  leftConfidencePriority -
                  rightConfidencePriority
                );
              }


              // ------------------------------------------
              // 2. Dependency / Kind Priority
              // ------------------------------------------

              const leftKindPriority =
                kindPriority[
                  left
                    .candidate
                    .kind
                ] ??
                999;


              const rightKindPriority =
                kindPriority[
                  right
                    .candidate
                    .kind
                ] ??
                999;


              if (
                leftKindPriority !==
                rightKindPriority
              ) {
                return (
                  leftKindPriority -
                  rightKindPriority
                );
              }


              // ------------------------------------------
              // 3. Confidence
              // ------------------------------------------

              const confidenceDifference =
                getConfidenceValue(
                  right.candidate
                ) -
                getConfidenceValue(
                  left.candidate
                );


              if (
                Math.abs(
                  confidenceDifference
                ) >
                0.001
              ) {
                return confidenceDifference;
              }


              // ------------------------------------------
              // 4. Stable Analyzer Order
              // ------------------------------------------

              return (
                left.index -
                right.index
              );
            }
          )
          .map(
            (
              item
            ) =>
              item.candidate
          );
      },

      [
        candidates,
      ]
    );


  const visibleOrderedCandidates =
    useMemo(
      () =>
        orderedCandidates.filter(
          (
            candidate
          ) =>
            showVeryLowConfidence ||
            getConfidenceTier(
              candidate
            ) !==
              "very-low-confidence"
        ),

      [
        orderedCandidates,

        showVeryLowConfidence,
      ]
    );
    // ====================================================
    // Tutorial Targets
    //
    // Prefer the first pending Create Entity suggestion.
    //
    // This gives the tutorial a stable target for:
    // - correcting an AI-recognized entity name
    // - explaining recommended Entity Types
    // - explaining manual Entity Type selection
    // - finally applying the corrected suggestion
    // ====================================================

    const tutorialCreateEntityCandidateId =
      useMemo(
        () => {
          const candidate =
            orderedCandidates.find(
              (
                item
              ) =>
                item.status ===
                  "pending" &&
                item.kind ===
                  "create-entity"
            );


          return candidate
            ? getCandidateId(
                candidate
              )
            : null;
        },
        [
          orderedCandidates,
        ]
      );


    const tutorialIgnoreCandidateId =
      useMemo(
        () => {
          const candidate =
            orderedCandidates.find(
              (
                item
              ) =>
                item.status ===
                  "pending" &&
                getCandidateId(
                  item
                ) !==
                  tutorialCreateEntityCandidateId &&
                item.kind !==
                  "event-history"
            );


          return candidate
            ? getCandidateId(
                candidate
              )
            : null;
        },
        [
          orderedCandidates,
          tutorialCreateEntityCandidateId,
        ]
      );

  // ====================================================
  // Tutorial Apply Target
  //
  // Smart Import can render different Apply controls:
  //
  // - normal suggestion:
  //   Apply
  //
  // - create-entity:
  //   Use Recommended Type and Apply
  //
  // - create-entity with manual type:
  //   Use Selected Type and Apply
  //
  // The tutorial should highlight only ONE actionable
  // pending suggestion instead of every Apply button.
  // ====================================================

  const tutorialApplyCandidateId =
    useMemo(
      () => {
        const candidate =
          orderedCandidates.find(
            (
              item
            ) => {
              if (
                item.status !==
                "pending"
              ) {
                return false;
              }


              /*
              * Historical events cannot currently be
              * applied because Timeline is not available.
              */
              if (
                item.kind ===
                "event-history"
              ) {
                return false;
              }


              /*
              * Normal suggestions always expose the
              * standard Apply button.
              */
              if (
                item.kind !==
                "create-entity"
              ) {
                return true;
              }


              /*
              * Create Entity exposes the recommended-type
              * Apply button whenever Smart Import produced
              * a likely entity type.
              */
              if (
                item
                  ?.payload
                  ?.likelyTypeConcept
              ) {
                return true;
              }


              /*
              * Otherwise, see whether Mimoria already has
              * an Entity Type that can be selected.
              */
              return Boolean(
                getSelectedEntityTypeId(
                  item
                )
              );
            }
          );


        return candidate
          ? getCandidateId(
              candidate
            )
          : null;
      },
      [
        orderedCandidates,
        entityTypes,
        entityTypeSelections,
      ]
    );


  useEffect(() => {
    if (
      !editingCandidateId
    ) {
      return;
    }


    const stillExists =
      candidates.some(
        (candidate) =>
          getCandidateId(
            candidate
          ) ===
          editingCandidateId
      );


    if (
      !stillExists
    ) {
      setEditingCandidateId(
        null
      );

      setEditPayload(
        {}
      );
    }
  }, [
    candidates,
    editingCandidateId,
  ]);


  // ====================================================
  // Edit State
  // ====================================================

  function isEditing(
    candidate
  ) {
    return (
      getCandidateId(
        candidate
      ) ===
      editingCandidateId
    );
  }


  function startEditing(
    candidate
    ) {
    if (
        candidate.status !==
        "pending"
    ) {
        return;
    }


    if (
        onClearError
    ) {
        onClearError();
    }


    setEditingCandidateId(
        getCandidateId(
        candidate
        )
    );


    const payload =
        clonePayload(
        candidate.payload
        );


    /*
    * Initialize editable presentation values for a
    * recommended EntityType.
    *
    * These do not replace the semantic concept.
    */
    if (
        candidate.kind ===
        "create-entity"
    ) {
        const recommended =
        getRecommendedEntityType(
            candidate
        );


        if (
        payload
            .recommendedTypeName ===
        undefined
        ) {
        payload.recommendedTypeName =
            recommended
            ?.name ||
            getConceptLabel(
            payload
                .likelyTypeConcept
            ) ||
            "";
        }


        if (
        payload
            .recommendedTypeIcon ===
        undefined
        ) {
        payload.recommendedTypeIcon =
            recommended
            ?.icon ||
            "✦";
        }

        payload.recommendedFields =
          (
            Array.isArray(
              payload
                .recommendedFields
            )
              ? payload
                  .recommendedFields
              : []
          )
            .map(
              normalizeEditableRecommendedField
            );
    }


    setEditPayload(
      payload
    );


    /*
    * During onboarding, do not advance immediately when the
    * Edit button is clicked.
    *
    * Wait until React has actually rendered the edit form.
    */
    window.requestAnimationFrame(
      () => {
        window.requestAnimationFrame(
          () => {
            const editPanel =
              document.querySelector(
                '[data-onboarding="smart-import-edit-panel"]'
              );


            const editNameInput =
              document.querySelector(
                '[data-onboarding="smart-import-edit-name"]'
              );


            if (
              !editPanel ||
              !editNameInput
            ) {
              return;
            }


            if (
              onTutorialEditOpened
            ) {
              onTutorialEditOpened();

              return;
            }


            if (
              active &&
              currentStep?.id ===
                "smart-import-edit-suggestion"
            ) {
              nextStep();
            }
          }
        );
      }
    );
    }

  function cancelEditing() {
    setEditingCandidateId(
      null
    );

    setEditPayload(
      {}
    );
  }


  function updateEditField(
    key,
    value
  ) {
    setEditPayload(
      (current) => ({
        ...current,

        [key]:
          value,
      })
    );
  }

  function normalizeEditableRecommendedField(
    field = {}
  ) {
    const fieldConcept =
      String(
        field.fieldConcept ||
        ""
      )
        .trim();


    return {
      fieldConcept:
        fieldConcept ||
        null,

      label:
        String(
          field.label ||
          (
            fieldConcept
              ? getConceptLabel(
                  fieldConcept
                )
              : ""
          )
        )
          .trim(),

      type:
        field.type ||
        "text",

      required:
        field.required ===
        true,

      options:
        Array.isArray(
          field.options
        )
          ? field.options
          : [],

      referenceEntityTypeId:
        field
          .referenceEntityTypeId ||
        "",
    };
  }


  function updateRecommendedField(
    index,
    key,
    value
  ) {
    setEditPayload(
      (current) => {
        const fields =
          Array.isArray(
            current
              .recommendedFields
          )
            ? [
                ...current
                  .recommendedFields,
              ]
            : [];


        if (
          !fields[index]
        ) {
          return current;
        }


        fields[index] = {
          ...fields[index],

          [key]:
            value,
        };


        return {
          ...current,

          recommendedFields:
            fields,
        };
      }
    );
  }


  function removeRecommendedField(
    index
  ) {
    setEditPayload(
      (current) => ({
        ...current,

        recommendedFields:
          (
            Array.isArray(
              current
                .recommendedFields
            )
              ? current
                  .recommendedFields
              : []
          )
            .filter(
              (
                _field,
                fieldIndex
              ) =>
                fieldIndex !==
                index
            ),
      })
    );
  }


  function addRecommendedField() {
    setEditPayload(
      (current) => ({
        ...current,

        recommendedFields: [
          ...(
            Array.isArray(
              current
                .recommendedFields
            )
              ? current
                  .recommendedFields
              : []
          ),

          {
            fieldConcept:
              null,

            label:
              "",

            type:
              "text",

            required:
              false,

            options:
              [],

            referenceEntityTypeId:
              "",
          },
        ],
      })
    );
  }


  function updateRecommendedFieldOptions(
    index,
    rawValue
  ) {
    const options =
      String(
        rawValue || ""
      )
        .split(
          /[\n,，]/gu
        )
        .map(
          (item) =>
            item.trim()
        )
        .filter(
          Boolean
        );


    updateRecommendedField(
      index,
      "options",
      options
    );
  }

  // ====================================================
  // Canonical Dependency Helpers
  // ====================================================

  function getResolvedSubjectEntityId(
    candidate
  ) {
    return (
      candidate
        ?.payload
        ?.subjectEntityId ||

      candidate
        ?.subjectEntityId ||

      null
    );
  }


  function getResolvedObjectEntityId(
    candidate
  ) {
    return (
      candidate
        ?.payload
        ?.objectEntityId ||

      candidate
        ?.objectEntityId ||

      null
    );
  }


  function getResolvedTargetEntityId(
    candidate
  ) {
    return (
      candidate
        ?.payload
        ?.targetEntityId ||

      null
    );
  }


  function getCandidateDependencyState(
    candidate
  ) {
    if (
      !candidate
    ) {
      return {
        ready:
          false,

        reason:
          "missing-candidate",
      };
    }


    // --------------------------------------------------
    // Create Entity
    //
    // No existing Entity dependency.
    // --------------------------------------------------

    if (
      candidate.kind ===
      "create-entity"
    ) {
      return {
        ready:
          true,

        reason:
          null,
      };
    }


    // --------------------------------------------------
    // Schema changes
    //
    // These depend on EntityType/schema state rather than
    // an Entity instance, so they remain independently
    // applicable.
    // --------------------------------------------------

    if (
      candidate.kind ===
        "create-schema-field" ||
      candidate.kind ===
        "create-select-option"
    ) {
      return {
        ready:
          true,

        reason:
          null,
      };
    }


    // --------------------------------------------------
    // Field Update
    //
    // Must have resolved target Entity.
    // --------------------------------------------------

    if (
      candidate.kind ===
      "field-update"
    ) {
      const targetEntityId =
        getResolvedTargetEntityId(
          candidate
        );


      return {
        ready:
          Boolean(
            targetEntityId
          ),

        reason:
          targetEntityId
            ? null
            : "target-entity-missing",
      };
    }


    // --------------------------------------------------
    // Relation Update
    //
    // Both ends should resolve to existing canonical
    // entities before the relation can be written.
    // --------------------------------------------------

    if (
      candidate.kind ===
      "relation-update"
    ) {
      const subjectEntityId =
        getResolvedSubjectEntityId(
          candidate
        );


      const objectEntityId =
        getResolvedObjectEntityId(
          candidate
        );


      return {
        ready:
          Boolean(
            subjectEntityId &&
            objectEntityId
          ),

        reason:
          subjectEntityId &&
          objectEntityId
            ? null
            : "relation-entity-missing",
      };
    }


    // --------------------------------------------------
    // Timeline is currently unavailable anyway.
    // --------------------------------------------------

    if (
      candidate.kind ===
      "event-history"
    ) {
      return {
        ready:
          false,

        reason:
          "timeline-unavailable",
      };
    }


    return {
      ready:
        true,

      reason:
        null,
    };
  }

  // ====================================================
  // Entity Type Helpers
  // ====================================================

  function getRecommendedEntityType(
  candidate
) {
  const concept =
    String(
      candidate
        ?.payload
        ?.likelyTypeConcept ||
      ""
    )
      .trim();


  if (
    !concept
  ) {
    return null;
  }


  // ==================================================
  // Normalize Semantic Concept
  //
  // Examples:
  //
  // entityType.character
  // -> character
  //
  // entityType.person
  // -> person
  //
  // Keep the original full concept as well because
  // canonicalConcept stores the full semantic ID.
  // ==================================================

  const normalizedConcept =
    concept
      .toLowerCase();


  const shortConcept =
    normalizedConcept
      .replace(
        /^entitytype\./u,
        ""
      );


  // ==================================================
  // Semantic Families
  //
  // Some concepts are semantically interchangeable for
  // the purpose of reusing a user's existing schema.
  //
  // Example:
  //
  // entityType.person
  // entityType.character
  //
  // can both safely reuse an existing "角色" schema.
  // ==================================================

  const conceptFamilies = {
    character: [
      "entityType.character",
      "entityType.person",
    ],

    person: [
      "entityType.character",
      "entityType.person",
    ],

    location: [
      "entityType.location",
    ],

    region: [
      "entityType.region",
      "entityType.location",
    ],

    city: [
      "entityType.city",
      "entityType.location",
    ],

    town: [
      "entityType.town",
      "entityType.location",
    ],

    village: [
      "entityType.village",
      "entityType.location",
    ],

    country: [
      "entityType.country",
      "entityType.location",
    ],

    organization: [
      "entityType.organization",
    ],

    faction: [
      "entityType.faction",
      "entityType.organization",
    ],

    guild: [
      "entityType.guild",
      "entityType.organization",
    ],

    church: [
      "entityType.church",
      "entityType.organization",
    ],

    item: [
      "entityType.item",
    ],
  };


  const compatibleConcepts =
    new Set(
      (
        conceptFamilies[
          shortConcept
        ] ||
        [
          concept,
        ]
      )
        .map(
          (value) =>
            String(
              value
            )
              .trim()
              .toLowerCase()
        )
    );


  // ==================================================
  // 1. Exact / Compatible Canonical Concept
  //
  // This is the strongest match.
  // ==================================================

  const canonicalMatch =
    entityTypes.find(
      (
        entityType
      ) => {
        const entityTypeConcept =
          String(
            entityType
              ?.canonicalConcept ||
            ""
          )
            .trim()
            .toLowerCase();


        return (
          entityTypeConcept &&
          compatibleConcepts.has(
            entityTypeConcept
          )
        );
      }
    );


  if (
    canonicalMatch
  ) {
    return canonicalMatch;
  }


  // ==================================================
  // 2. Legacy User-Created Type Name Fallback
  //
  // Older Entity Types may not have canonicalConcept yet.
  //
  // Only use explicit semantic aliases here. Do not use
  // generic fuzzy matching.
  // ==================================================

  const fallbackNames = {
    character: [
      "character",
      "person",
      "角色",
      "人物",
      "人物角色",
    ],

    person: [
      "character",
      "person",
      "角色",
      "人物",
      "人物角色",
    ],

    location: [
      "location",
      "place",
      "地点",
      "位置",
      "地区",
      "区域",
    ],

    region: [
      "region",
      "location",
      "地区",
      "区域",
      "地点",
    ],

    city: [
      "city",
      "城市",
      "城镇",
    ],

    town: [
      "town",
      "城镇",
      "小镇",
    ],

    village: [
      "village",
      "村庄",
      "村落",
    ],

    country: [
      "country",
      "国家",
    ],

    organization: [
      "organization",
      "organisation",
      "组织",
      "机构",
      "势力",
    ],

    faction: [
      "faction",
      "组织",
      "势力",
    ],

    guild: [
      "guild",
      "公会",
      "协会",
      "组织",
    ],

    church: [
      "church",
      "教会",
      "教团",
      "组织",
    ],

    item: [
      "item",
      "object",
      "物品",
      "道具",
    ],
  };


  const names =
    fallbackNames[
      shortConcept
    ] ||
    [];


  if (
    names.length ===
    0
  ) {
    return null;
  }


  const aliasSet =
    new Set(
      names.map(
        (
          name
        ) =>
          String(
            name
          )
            .trim()
            .toLowerCase()
      )
    );


  const nameMatches =
    entityTypes.filter(
      (
        entityType
      ) => {
        /*
         * Do not reinterpret a schema that already has an
         * explicitly different semantic concept.
         */
        if (
          entityType
            ?.canonicalConcept
        ) {
          return false;
        }


        const entityTypeName =
          String(
            entityType
              ?.name ||
            ""
          )
            .trim()
            .toLowerCase();


        return aliasSet.has(
          entityTypeName
        );
      }
    );


  /*
   * Only automatically reuse an unambiguous legacy type.
   */
  if (
    nameMatches.length ===
    1
  ) {
    return nameMatches[0];
  }


  return null;
}


  function getSelectedEntityTypeId(
    candidate
  ) {
    const candidateId =
      getCandidateId(
        candidate
      );


    if (
      candidateId &&
      entityTypeSelections[
        candidateId
      ] !==
        undefined
    ) {
      return entityTypeSelections[
        candidateId
      ];
    }


    if (
      candidate
        ?.payload
        ?.entityTypeId
    ) {
      return String(
        candidate
          .payload
          .entityTypeId
      );
    }


    const recommended =
      getRecommendedEntityType(
        candidate
      );


    if (
      recommended?._id
    ) {
      return recommended._id;
    }


    return "";
  }


  function setSelectedEntityTypeId(
    candidate,
    value
  ) {
    const candidateId =
      getCandidateId(
        candidate
      );


    if (
      !candidateId
    ) {
      return;
    }


    setEntityTypeSelections(
      (current) => ({
        ...current,

        [candidateId]:
          value,
      })
    );


    /*
    * Tutorial:
    *
    * Advance only when the user actually selects
    * an Entity Type.
    */
    if (
      !value
    ) {
      return;
    }


    if (
      onTutorialManualTypeChange
    ) {
      onTutorialManualTypeChange(
        candidate,
        value
      );

      return;
    }


    if (
      active &&
      currentStep?.id ===
        "smart-import-manual-type"
    ) {
      window.setTimeout(
        () => {
          nextStep();
        },
        100
      );
    }
  }


  // ====================================================
  // Save Edit
  // ====================================================

  async function saveEdit(
    candidate
    ) {
    const patch =
        {};


    switch (
        candidate.kind
    ) {
        // ------------------------------------------------
        // Field
        // ------------------------------------------------

        case "field-update":
        patch.value =
            editPayload.value;

        break;


        // ------------------------------------------------
        // Relation
        // ------------------------------------------------

        case "relation-update":
        patch.subjectName =
            String(
            editPayload
                .subjectName ||
            ""
            )
            .trim();

        patch.objectName =
            String(
            editPayload
                .objectName ||
            ""
            )
            .trim();

        break;


        // ------------------------------------------------
        // Event
        // ------------------------------------------------

        case "event-history":
        patch.subjectName =
            String(
            editPayload
                .subjectName ||
            ""
            )
            .trim();

        patch.objectName =
            String(
            editPayload
                .objectName ||
            ""
            )
            .trim();

        break;


        // ------------------------------------------------
        // Entity
        // ------------------------------------------------

        case "create-entity":
        patch.name =
            String(
            editPayload
                .name ||
            ""
            )
            .trim();


        /*
        * Existing EntityType selection.
        *
        * Empty string means:
        * keep using the recommended type flow.
        */
        patch.entityTypeId =
            String(
            editPayload
                .entityTypeId ||
            ""
            )
            .trim();


        patch.likelyTypeConcept =
            String(
            editPayload
                .likelyTypeConcept ||
            ""
            )
            .trim();


        patch.recommendedTypeName =
            String(
            editPayload
                .recommendedTypeName ||
            ""
            )
            .trim();


        patch.recommendedTypeIcon =
            String(
            editPayload
                .recommendedTypeIcon ||
            ""
            )
            .trim();
        
        patch.recommendedFields =
          (
            Array.isArray(
              editPayload
                .recommendedFields
            )
              ? editPayload
                  .recommendedFields
              : []
          )
            .map(
              (field) => ({
                fieldConcept:
                  field.fieldConcept ||
                  null,

                label:
                  String(
                    field.label ||
                    ""
                  )
                    .trim(),

                type:
                  field.type ||
                  "text",

                required:
                  field.required ===
                  true,

                options:
                  Array.isArray(
                    field.options
                  )
                    ? field.options
                    : [],

                referenceEntityTypeId:
                  field
                    .type ===
                    "entity-reference"
                    ? field
                        .referenceEntityTypeId ||
                      null
                    : null,
              })
            );

        break;


        // ------------------------------------------------
        // Schema Field
        // ------------------------------------------------

        case "create-schema-field":
        patch.suggestedLabel =
            String(
            editPayload
                .suggestedLabel ||
            ""
            )
            .trim();

        patch.suggestedValueType =
            editPayload
            .suggestedValueType;

        break;


        // ------------------------------------------------
        // Select Option
        // ------------------------------------------------

        case "create-select-option":
        patch.value =
            String(
            editPayload.value ??
            ""
            )
            .trim();

        break;


        default:
        return;
    }


    const success =
        await onEdit(
        candidate,
        patch
        );


    if (
        success
    ) {
        cancelEditing();
    }
    }

  // ====================================================
  // Apply
  // ====================================================

  async function applyManualType(
    candidate
  ) {
    const entityTypeId =
      getSelectedEntityTypeId(
        candidate
      );


    if (
      !entityTypeId
    ) {
      return;
    }


    await onApply(
      candidate,
      {
        entityTypeId,
      }
    );
  }


  async function applyRecommendedType(
    candidate
  ) {
    await onApply(
      candidate,
      {
        useRecommendedEntityType:
          true,

        locale,
      }
    );
  }


  // ====================================================
  // Semantic Display
  // ====================================================

  function renderSemanticValue(
    concept
  ) {
    return (
      <div className="story-suggestion-semantic-value">
        {getConceptLabel(
          concept
        )}
      </div>
    );
  }


  // ====================================================
  // Edit UI
  // ====================================================

  function renderEditForm(
    candidate
  ) {
    switch (
      candidate.kind
    ) {
      // ------------------------------------------------
      // Field Update
      // ------------------------------------------------

      case "field-update":
        return (
          <div className="story-suggestion-edit-grid">
            <label>
              <span className="story-suggestion-label">
                {t(
                  "documents.editSuggestedValue"
                )}
              </span>

              <input
                type={
                  candidate
                    ?.payload
                    ?.fieldType ===
                  "number"
                    ? "number"
                    : "text"
                }
                value={
                  editPayload.value ??
                  ""
                }
                onChange={(
                  event
                ) =>
                  updateEditField(
                    "value",
                    event.target.value
                  )
                }
              />
            </label>
          </div>
        );


      // ------------------------------------------------
      // Relation
      // ------------------------------------------------

      case "relation-update":
        return (
          <div className="story-suggestion-edit-grid">
            <label>
              <span className="story-suggestion-label">
                {t(
                  "documents.editSubject"
                )}
              </span>

              <input
                type="text"
                value={
                  editPayload
                    .subjectName ??
                  ""
                }
                onChange={(
                  event
                ) =>
                  updateEditField(
                    "subjectName",
                    event.target.value
                  )
                }
              />
            </label>


            <div>
              <span className="story-suggestion-label">
                {t(
                  "documents.editRelation"
                )}
              </span>

              {renderSemanticValue(
                candidate
                  ?.payload
                  ?.relationConcept
              )}
            </div>


            <label>
              <span className="story-suggestion-label">
                {t(
                  "documents.editObject"
                )}
              </span>

              <input
                type="text"
                value={
                  editPayload
                    .objectName ??
                  ""
                }
                onChange={(
                  event
                ) =>
                  updateEditField(
                    "objectName",
                    event.target.value
                  )
                }
              />
            </label>
          </div>
        );


      // ------------------------------------------------
      // Historical Event
      // ------------------------------------------------

      case "event-history":
        return (
          <div className="story-suggestion-edit-grid">
            <label>
              <span className="story-suggestion-label">
                {t(
                  "documents.editSubject"
                )}
              </span>

              <input
                type="text"
                value={
                  editPayload
                    .subjectName ??
                  ""
                }
                onChange={(
                  event
                ) =>
                  updateEditField(
                    "subjectName",
                    event.target.value
                  )
                }
              />
            </label>


            <div>
              <span className="story-suggestion-label">
                {t(
                  "documents.editEvent"
                )}
              </span>

              {renderSemanticValue(
                candidate
                  ?.payload
                  ?.eventConcept
              )}
            </div>


            <label>
              <span className="story-suggestion-label">
                {t(
                  "documents.editObject"
                )}
              </span>

              <input
                type="text"
                value={
                  editPayload
                    .objectName ??
                  ""
                }
                onChange={(
                  event
                ) =>
                  updateEditField(
                    "objectName",
                    event.target.value
                  )
                }
              />
            </label>
          </div>
        );


      // ------------------------------------------------
      // Create Entity
      // ------------------------------------------------

      case "create-entity": {
        const selectedRecommendedConcept =
          editPayload
            .likelyTypeConcept ??
          "";


        const recommendedFields =
          Array.isArray(
            editPayload
              .recommendedFields
          )
            ? editPayload
                .recommendedFields
            : [];


        return (
          <div
            className="story-suggestion-edit-grid"
            data-onboarding="smart-import-edit-panel"
          >
            {/* Entity Name */}


            <label>
              <span className="story-suggestion-label">
                {t(
                  "documents.editEntityName"
                )}
              </span>


              <input
                type="text"
                data-onboarding="smart-import-edit-name"
                value={
                  editPayload.name ??
                  ""
                }
                onChange={(event) => {
                  const nextValue =
                    event.target.value;


                  updateEditField(
                    "name",
                    nextValue
                  );


                  if (
                    onTutorialEditNameChange
                  ) {
                    onTutorialEditNameChange(
                      nextValue
                    );
                  }
                }}
              />
            </label>


            {/* Recommended Semantic Type */}

            <label>
              <span className="story-suggestion-label">
                {t(
                  "documents.editRecommendedType"
                )}
              </span>

              <select
                value={
                  selectedRecommendedConcept
                }
                onChange={(event) => {
                  const concept =
                    event.target.value;


                  updateEditField(
                    "likelyTypeConcept",
                    concept
                  );


                  if (
                    concept
                  ) {
                    updateEditField(
                      "recommendedTypeName",
                      getConceptLabel(
                        concept
                      )
                    );
                  }
                }}
              >
                <option value="">
                  {t(
                    "documents.selectRecommendedType"
                  )}
                </option>

                {recommendedTypeOptions.map(
                  (concept) => (
                    <option
                      key={
                        concept
                      }
                      value={
                        concept
                      }
                    >
                      {getConceptLabel(
                        concept
                      )}
                    </option>
                  )
                )}
              </select>
            </label>


            {/* Recommended Type Name */}

            <label>
              <span className="story-suggestion-label">
                {t(
                  "documents.editRecommendedTypeName"
                )}
              </span>

              <input
                type="text"
                value={
                  editPayload
                    .recommendedTypeName ??
                  ""
                }
                placeholder={t(
                  "documents.editRecommendedTypeNamePlaceholder"
                )}
                onChange={(event) =>
                  updateEditField(
                    "recommendedTypeName",
                    event.target.value
                  )
                }
              />
            </label>


            {/* Recommended Icon */}

            <label>
              <span className="story-suggestion-label">
                {t(
                  "documents.editRecommendedIcon"
                )}
              </span>

              <input
                type="text"
                value={
                  editPayload
                    .recommendedTypeIcon ??
                  ""
                }
                placeholder="👤"
                onChange={(event) =>
                  updateEditField(
                    "recommendedTypeIcon",
                    event.target.value
                  )
                }
              />
            </label>


            {/* Recommended Fields */}

            <div className="story-recommended-fields-editor">
              <div className="story-recommended-fields-header">
                <div>
                  <span className="story-suggestion-label">
                    {t(
                      "documents.recommendedFields"
                    )}
                  </span>

                  <p className="story-recommended-fields-help">
                    {t(
                      "documents.recommendedFieldsHelp"
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  className="story-suggestion-secondary-button"
                  onClick={
                    addRecommendedField
                  }
                >
                  {t(
                    "documents.addRecommendedField"
                  )}
                </button>
              </div>


              {recommendedFields.length ===
              0 ? (
                <div className="story-recommended-fields-empty">
                  {t(
                    "documents.noRecommendedFields"
                  )}
                </div>
              ) : (
                <div className="story-recommended-fields-list">
                  {recommendedFields.map(
                    (
                      field,
                      index
                    ) => (
                      <div
                        key={
                          `${field.fieldConcept || "custom"}-${index}`
                        }
                        className="story-recommended-field-card"
                      >
                        <div className="story-recommended-field-main">
                          {/* Field Name */}

                          <label>
                            <span className="story-suggestion-label">
                              {t(
                                "documents.recommendedFieldName"
                              )}
                            </span>

                            <input
                              type="text"
                              value={
                                field.label ??
                                ""
                              }
                              onChange={(event) =>
                                updateRecommendedField(
                                  index,
                                  "label",
                                  event.target.value
                                )
                              }
                            />
                          </label>


                          {/* Field Type */}

                          <label>
                            <span className="story-suggestion-label">
                              {t(
                                "documents.recommendedFieldType"
                              )}
                            </span>

                            <select
                              value={
                                field.type ||
                                "text"
                              }
                              onChange={(event) =>
                                updateRecommendedField(
                                  index,
                                  "type",
                                  event.target.value
                                )
                              }
                            >
                              <option value="text">
                                {t(
                                  "fieldTypes.text"
                                )}
                              </option>

                              <option value="long-text">
                                {t(
                                  "fieldTypes.long-text"
                                )}
                              </option>

                              <option value="number">
                                {t(
                                  "fieldTypes.number"
                                )}
                              </option>

                              <option value="boolean">
                                {t(
                                  "fieldTypes.boolean"
                                )}
                              </option>

                              <option value="date">
                                {t(
                                  "fieldTypes.date"
                                )}
                              </option>

                              <option value="select">
                                {t(
                                  "fieldTypes.select"
                                )}
                              </option>

                              <option value="entity-reference">
                                {t(
                                  "fieldTypes.entity-reference"
                                )}
                              </option>
                            </select>
                          </label>


                          {/* Required */}

                          <label className="story-recommended-field-required">
                            <input
                              type="checkbox"
                              checked={
                                field.required ===
                                true
                              }
                              onChange={(event) =>
                                updateRecommendedField(
                                  index,
                                  "required",
                                  event.target.checked
                                )
                              }
                            />

                            <span>
                              {t(
                                "documents.recommendedFieldRequired"
                              )}
                            </span>
                          </label>


                          {/* Delete */}

                          <button
                            type="button"
                            className="story-suggestion-danger-button"
                            onClick={() =>
                              removeRecommendedField(
                                index
                              )
                            }
                          >
                            {t(
                              "documents.removeRecommendedField"
                            )}
                          </button>
                        </div>


                        {/* Select Options */}

                        {field.type ===
                          "select" && (
                          <label className="story-recommended-field-extra">
                            <span className="story-suggestion-label">
                              {t(
                                "documents.recommendedFieldOptions"
                              )}
                            </span>

                            <textarea
                              rows="3"
                              value={
                                (
                                  Array.isArray(
                                    field.options
                                  )
                                    ? field.options
                                    : []
                                )
                                  .join(
                                    "\n"
                                  )
                              }
                              placeholder={t(
                                "documents.recommendedFieldOptionsPlaceholder"
                              )}
                              onChange={(event) =>
                                updateRecommendedFieldOptions(
                                  index,
                                  event.target.value
                                )
                              }
                            />
                          </label>
                        )}


                        {/* Entity Reference Type */}

                        {field.type ===
                          "entity-reference" && (
                          <label className="story-recommended-field-extra">
                            <span className="story-suggestion-label">
                              {t(
                                "documents.recommendedFieldReferenceType"
                              )}
                            </span>

                            <select
                              value={
                                field
                                  .referenceEntityTypeId ||
                                ""
                              }
                              onChange={(event) =>
                                updateRecommendedField(
                                  index,
                                  "referenceEntityTypeId",
                                  event.target.value
                                )
                              }
                            >
                              <option value="">
                                {t(
                                  "schema.anyEntityType"
                                )}
                              </option>

                              {entityTypes.map(
                                (entityType) => (
                                  <option
                                    key={
                                      entityType._id
                                    }
                                    value={
                                      entityType._id
                                    }
                                  >
                                    {entityType.icon
                                      ? `${entityType.icon} `
                                      : ""}

                                    {entityType.name}
                                  </option>
                                )
                              )}
                            </select>
                          </label>
                        )}


                        {field.fieldConcept && (
                          <div className="story-recommended-field-concept">
                            {getConceptLabel(
                              field.fieldConcept
                            )}

                            <span>
                              {
                                field.fieldConcept
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>


            {/* Existing Entity Type */}

            <label>
              <span className="story-suggestion-label">
                {t(
                  "documents.entityTypeForSuggestion"
                )}
              </span>

              <select
                value={
                  editPayload
                    .entityTypeId ??
                  ""
                }
                onChange={(event) =>
                  updateEditField(
                    "entityTypeId",
                    event.target.value
                  )
                }
              >
                <option value="">
                  {t(
                    "documents.keepRecommendedEntityType"
                  )}
                </option>

                {entityTypes.map(
                  (entityType) => (
                    <option
                      key={
                        entityType._id
                      }
                      value={
                        entityType._id
                      }
                    >
                      {entityType.icon
                        ? `${entityType.icon} `
                        : ""}

                      {entityType.name}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>
        );
      }


      // ------------------------------------------------
      // Create Schema Field
      // ------------------------------------------------

      case "create-schema-field":
        return (
          <div className="story-suggestion-edit-grid">
            <label>
              <span className="story-suggestion-label">
                {t(
                  "documents.editFieldName"
                )}
              </span>

              <input
                type="text"
                value={
                  editPayload
                    .suggestedLabel ??
                  ""
                }
                onChange={(
                  event
                ) =>
                  updateEditField(
                    "suggestedLabel",
                    event.target.value
                  )
                }
              />
            </label>


            <label>
              <span className="story-suggestion-label">
                {t(
                  "documents.editFieldType"
                )}
              </span>

              <select
                value={
                  editPayload
                    .suggestedValueType ??
                  "text"
                }
                onChange={(
                  event
                ) =>
                  updateEditField(
                    "suggestedValueType",
                    event.target.value
                  )
                }
              >
                <option value="text">
                  {t(
                    "fieldTypes.text"
                  )}
                </option>

                <option value="long-text">
                  {t(
                    "fieldTypes.long-text"
                  )}
                </option>

                <option value="number">
                  {t(
                    "fieldTypes.number"
                  )}
                </option>

                <option value="boolean">
                  {t(
                    "fieldTypes.boolean"
                  )}
                </option>

                <option value="date">
                  {t(
                    "fieldTypes.date"
                  )}
                </option>

                <option value="select">
                  {t(
                    "fieldTypes.select"
                  )}
                </option>

                <option value="entity-reference">
                  {t(
                    "fieldTypes.entity-reference"
                  )}
                </option>
              </select>
            </label>
          </div>
        );


      // ------------------------------------------------
      // Create Select Option
      // ------------------------------------------------

      case "create-select-option":
        return (
          <div className="story-suggestion-edit-grid">
            <label>
              <span className="story-suggestion-label">
                {t(
                  "documents.editOptionValue"
                )}
              </span>

              <input
                type="text"
                value={
                  editPayload.value ??
                  ""
                }
                onChange={(
                  event
                ) =>
                  updateEditField(
                    "value",
                    event.target.value
                  )
                }
              />
            </label>
          </div>
        );


      default:
        return null;
    }
  }


  // ====================================================
  // Read-only Suggestion
  // ====================================================

  function renderSuggestionBody(
    candidate
  ) {
    const payload =
      candidate.payload ||
      {};


    switch (
      candidate.kind
    ) {
      // ------------------------------------------------
      // Field Update
      // ------------------------------------------------

      case "field-update":
        return (
          <div className="story-suggestion-relation">
            <strong>
              {
                payload
                  .targetEntityName ||
                "?"
              }
            </strong>

            <span className="story-suggestion-arrow">
              →
            </span>

            <span className="story-suggestion-label">
            {
                payload.fieldLabel &&
                !isMachineConceptLabel(
                payload.fieldLabel
                )
                ? payload.fieldLabel
                : getConceptLabel(
                    payload.fieldConcept ||
                    payload.fieldLabel
                    )
            }
            </span>

            <span className="story-suggestion-arrow">
              →
            </span>

            <strong>
              {
                getDisplayValue(
                  payload.fieldConcept,
                  payload.value,
                  t
                )
              }
            </strong>
          </div>
        );


      // ------------------------------------------------
      // Relation
      // ------------------------------------------------

      case "relation-update":
        return (
          <div className="story-suggestion-relation">
            <strong>
              {
                payload.subjectName ||
                "?"
              }
            </strong>

            <span className="story-suggestion-arrow">
              →
            </span>

            <span className="story-suggestion-label">
              {
                getConceptLabel(
                  payload.relationConcept
                )
              }
            </span>

            <span className="story-suggestion-arrow">
              →
            </span>

            <strong>
              {
                payload.objectName ||
                "?"
              }
            </strong>
          </div>
        );


      // ------------------------------------------------
      // Historical Event
      // ------------------------------------------------

      case "event-history":
        return (
          <div>
            <div className="story-suggestion-relation">
              <strong>
                {
                  payload.subjectName ||
                  "?"
                }
              </strong>

              <span className="story-suggestion-arrow">
                →
              </span>

              <span className="story-suggestion-label">
                {
                  getConceptLabel(
                    payload.eventConcept
                  )
                }
              </span>

              {payload.objectName && (
                <>
                  <span className="story-suggestion-arrow">
                    →
                  </span>

                  <strong>
                    {
                      payload.objectName
                    }
                  </strong>
                </>
              )}
            </div>


            <div className="story-suggestion-meta story-suggestion-meta-spaced">
              <span>
                {t(
                  "documents.timelineNotAvailable"
                )}
              </span>
            </div>
          </div>
        );


      // ------------------------------------------------
      // Create Entity
      // ------------------------------------------------

      case "create-entity": {
        const recommended =
          getRecommendedEntityType(
            candidate
          );


        const recommendedConcept =
          payload
            .likelyTypeConcept;


        const recommendedLabel =
            recommended
                ?.name ||
            payload
                .recommendedTypeName ||
            getConceptLabel(
                recommendedConcept
            );


        const selectedEntityTypeId =
          getSelectedEntityTypeId(
            candidate
          );


        return (
          <div className="story-create-entity">
            <div className="story-suggestion-relation">
              <span className="story-suggestion-label">
                {t(
                  "documents.createEntityName"
                )}
              </span>

              <strong>
                {
                  payload.name ||
                  "?"
                }
              </strong>
            </div>


            {recommendedConcept && (
              <div
                className="story-recommended-type"
                data-onboarding={
                  getCandidateId(
                    candidate
                  ) ===
                    tutorialCreateEntityCandidateId
                    ? "smart-import-recommended-type"
                    : undefined
                }
              >
                <div className="story-recommended-type-header">
                  <span className="story-suggestion-label">
                    {t(
                      "documents.recommendedEntityType"
                    )}
                  </span>
                </div>


                <div className="story-recommended-type-value">
                  <strong>
                    {
                    recommended?.icon ||
                    payload
                        .recommendedTypeIcon ||
                    "✦"
                    }

                    {" "}

                    {
                      recommendedLabel
                    }
                  </strong>


                  <span className="story-recommended-type-state">
                    {recommended
                      ? t(
                          "documents.recommendedTypeExists"
                        )
                      : t(
                          "documents.recommendedTypeMissing"
                        )}
                  </span>
                </div>


                {candidate.status ===
                  "pending" && (
                  <button
                    type="button"
                    className="story-suggestion-recommended-apply"
                    data-onboarding={
                      getCandidateId(
                        candidate
                      ) ===
                      tutorialApplyCandidateId
                        ? "smart-import-apply-button"
                        : undefined
                    }
                    disabled={
                      actionCandidateId ===
                      getCandidateId(
                        candidate
                      )
                    }
                    onClick={() =>
                      applyRecommendedType(
                        candidate
                      )
                    }
                  >
                    {recommended
                      ? t(
                          "documents.useRecommendedTypeAndApply",
                          {
                            type:
                              recommendedLabel,
                          }
                        )
                      : t(
                          "documents.createRecommendedTypeAndApply",
                          {
                            type:
                              recommendedLabel,
                          }
                        )}
                  </button>
                )}
              </div>
            )}


            <div className="story-manual-type">
              <div className="story-suggestion-label">
                {t(
                  "documents.orChooseExistingType"
                )}
              </div>


              <select
                className="story-suggestion-select"
                data-onboarding={
                  getCandidateId(
                    candidate
                  ) ===
                    tutorialCreateEntityCandidateId
                    ? "smart-import-manual-type-select"
                    : undefined
                }
                value={
                  selectedEntityTypeId
                }
                disabled={
                  candidate.status !==
                  "pending"
                }
                onChange={(
                  event
                ) =>
                  setSelectedEntityTypeId(
                    candidate,
                    event.target.value
                  )
                }
              >
                <option value="">
                  {t(
                    "documents.selectEntityType"
                  )}
                </option>


                {entityTypes.map(
                  (
                    entityType
                  ) => (
                    <option
                      key={
                        entityType._id
                      }
                      value={
                        entityType._id
                      }
                    >
                      {
                        entityType.icon
                          ? `${entityType.icon} `
                          : ""
                      }

                      {
                        entityType.name
                      }
                    </option>
                  )
                )}
              </select>


              {candidate.status ===
                "pending" &&
                selectedEntityTypeId && (
                <button
                  type="button"
                  className="story-suggestion-manual-apply"
                  data-onboarding={
                    getCandidateId(
                      candidate
                    ) ===
                    tutorialApplyCandidateId
                      ? "smart-import-apply-button"
                      : undefined
                  }
                  disabled={
                    actionCandidateId ===
                    getCandidateId(
                      candidate
                    )
                  }
                  onClick={() =>
                    applyManualType(
                      candidate
                    )
                  }
                >
                  {t(
                    "documents.useSelectedTypeAndApply"
                  )}
                </button>
              )}
            </div>
          </div>
        );
      }


      // ------------------------------------------------
      // Create Schema Field
      // ------------------------------------------------

      case "create-schema-field":
        return (
          <div className="story-suggestion-relation">
            <strong>
              {
                payload
                  .targetEntityTypeName ||
                "?"
              }
            </strong>

            <span className="story-suggestion-arrow">
              →
            </span>

            <span className="story-suggestion-label">
              {t(
                "documents.createFieldLabel"
              )}
            </span>

            <span className="story-suggestion-arrow">
              →
            </span>

            <strong>
              {
                payload
                  .suggestedLabel ||
                getConceptLabel(
                  payload
                    .fieldConcept
                )
              }
            </strong>
          </div>
        );


      // ------------------------------------------------
      // Create Select Option
      // ------------------------------------------------

      case "create-select-option":
        return (
          <div className="story-suggestion-relation">
            <strong>
              {
                payload.fieldLabel ||
                getConceptLabel(
                  payload.fieldConcept
                )
              }
            </strong>

            <span className="story-suggestion-arrow">
              →
            </span>

            <span className="story-suggestion-label">
              {t(
                "documents.addSelectOption"
              )}
            </span>

            <span className="story-suggestion-arrow">
              →
            </span>

            <strong>
              {
                String(
                  payload.value ??
                  ""
                )
              }
            </strong>
          </div>
        );


      default:
        return (
          <div className="story-suggestion-relation">
            <span className="story-suggestion-label">
              {
                candidate
                  .suggestionId ||
                candidate.kind ||
                "?"
              }
            </span>
          </div>
        );
    }
  }


  // ====================================================
  // Render
  // ====================================================

  if (
    analysisState !==
      "complete" &&
    analysisState !==
      "error"
  ) {
    return null;
  }


  return (
    <section className="story-suggestions">
      <div className="story-suggestions-header">
        <div>
          <h3>
            {title ||
              t(
                "documents.storySuggestionsTitle"
              )}
          </h3>

          <p>
            {description ||
              t(
                "documents.storySuggestionsDescription"
              )}
          </p>
        </div>


        <span className="story-suggestions-count">
          {
            pendingCount
          }
        </span>
      </div>


      {analysisError && (
        <div className="story-suggestions-error">
          {
            analysisError
          }
        </div>
      )}


      {!analysisError &&
        visibleOrderedCandidates.length ===
          0 &&
        veryLowConfidenceCount ===
          0 && (
          <div className="story-suggestions-empty">
            {emptyText ||
              t(
                "documents.storySuggestionsEmpty"
              )}
          </div>
        )}


      {(
        visibleOrderedCandidates.length >
          0 ||
        veryLowConfidenceCount >
          0
      ) && (
        <>
          {veryLowConfidenceCount >
            0 && (
            <div className="story-low-confidence-controls">
              <button
                type="button"
                className="story-low-confidence-toggle"
                onClick={() =>
                  setShowVeryLowConfidence(
                    (
                      current
                    ) =>
                      !current
                  )
                }
              >
                {showVeryLowConfidence
                  ? t(
                      "documents.hideVeryLowConfidence"
                    )
                  : t(
                      "documents.showVeryLowConfidence",
                      {
                        count:
                          veryLowConfidenceCount,
                      }
                    )}
              </button>
            </div>
          )}


          <div className="story-suggestions-list">
          {visibleOrderedCandidates.map(
            (
              candidate
            ) => {
              const candidateId =
                getCandidateId(
                  candidate
                );


              const working =
                actionCandidateId ===
                candidateId;


              const resolved =
                candidate.status !==
                "pending";


              const editing =
                isEditing(
                  candidate
                );

              const dependencyState =
                getCandidateDependencyState(
                  candidate
                );


              const applyBlocked =
                !dependencyState.ready;

              const sourceText =
                candidate
                  ?.source
                  ?.originalText ||
                "";


              return (
                <article
                  key={
                    candidateId ||
                    candidate
                      .suggestionId
                  }
                  data-onboarding={
                    candidateId ===
                      tutorialCreateEntityCandidateId
                      ? "smart-import-error-suggestion"
                      : undefined
                  }
                  className={[
                    "story-suggestion-card",

                    `status-${candidate.status}`,

                    `confidence-${getConfidenceTier(
                      candidate
                    )}`,

                    editing
                      ? "is-editing"
                      : "",
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      " "
                    )}
                >
                  <div className="story-suggestion-card-top">
                    <div className="story-suggestion-kind">
                      {
                        getSuggestionKindLabel(
                          candidate.kind
                        )
                      }
                    </div>


                    <div className="story-suggestion-card-badges">
                      {getConfidenceTier(
                        candidate
                      ) ===
                        "low-confidence" && (
                        <span className="story-confidence-badge low">
                          ⚠{" "}

                          {t(
                            "documents.lowConfidence"
                          )}
                        </span>
                      )}


                      {getConfidenceTier(
                        candidate
                      ) ===
                        "very-low-confidence" && (
                        <span className="story-confidence-badge very-low">
                          ⚠{" "}

                          {t(
                            "documents.veryLowConfidence"
                          )}
                        </span>
                      )}


                      {candidate
                        .editedByUser && (
                        <span className="story-suggestion-edited-badge">
                          {t(
                            "documents.suggestionEdited"
                          )}
                        </span>
                      )}
                    </div>
                  </div>


                  {editing
                    ? renderEditForm(
                        candidate
                      )
                    : renderSuggestionBody(
                        candidate
                      )}


                  {sourceText && (
                    <blockquote className="story-suggestion-source">
                      “

                      {
                        sourceText.length >
                          220
                          ? `${sourceText.slice(
                              0,
                              220
                            )}…`
                          : sourceText
                      }

                      ”
                    </blockquote>
                  )}


                  <div className="story-suggestion-meta">
                    <span>
                      {t(
                        "documents.confidence"
                      )}

                      {" "}

                      {
                        Math.round(
                          getConfidenceValue(
                            candidate
                          ) *
                            100
                        )
                      }

                      %


                      {getConfidenceTier(
                        candidate
                      ) ===
                        "low-confidence" && (
                        <span className="story-confidence-inline-note">
                          {" · "}

                          {t(
                            "documents.lowConfidenceHint"
                          )}
                        </span>
                      )}


                      {getConfidenceTier(
                        candidate
                      ) ===
                        "very-low-confidence" && (
                        <span className="story-confidence-inline-note very-low">
                          {" · "}

                          {t(
                            "documents.veryLowConfidenceHint"
                          )}
                        </span>
                      )}
                    </span>


                    {candidate.status ===
                      "accepted" && (
                      <span className="story-suggestion-status accepted">
                        ✓{" "}

                        {t(
                          "documents.suggestionApplied"
                        )}
                      </span>
                    )}


                    {candidate.status ===
                      "ignored" && (
                      <span className="story-suggestion-status ignored">
                        {t(
                          "documents.suggestionIgnored"
                        )}
                      </span>
                    )}
                  </div>

                  {!resolved &&
                    applyBlocked &&
                    candidate.kind !==
                      "event-history" && (
                      <div className="story-suggestion-dependency-warning">
                        {t(
                          candidate.kind ===
                            "relation-update"
                            ? "documents.relationDependencyMissing"
                            : "documents.entityDependencyMissing"
                        )}
                      </div>
                    )}

                  {!resolved && (
                    <div className="story-suggestion-actions">
                      {editing ? (
                        <>
                          <button
                            type="button"
                            className="story-suggestion-ignore"
                            disabled={
                              working
                            }
                            onClick={
                              cancelEditing
                            }
                          >
                            {t(
                              "documents.cancelSuggestionEdit"
                            )}
                          </button>


                          <button
                            type="button"
                            className="story-suggestion-apply"
                            data-onboarding={
                              candidateId ===
                                tutorialCreateEntityCandidateId
                                ? "smart-import-save-edit"
                                : undefined
                            }
                            disabled={
                              working
                            }
                            onClick={() =>
                              saveEdit(
                                candidate
                              )
                            }
                          >
                            {working
                              ? t(
                                  "documents.processingSuggestion"
                                )
                              : t(
                                  "documents.saveSuggestionEdit"
                                )}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="story-suggestion-edit"
                            data-onboarding={
                              candidateId ===
                                tutorialCreateEntityCandidateId
                                ? "smart-import-edit-suggestion"
                                : undefined
                            }
                            disabled={
                              working
                            }
                            onClick={() =>
                              startEditing(
                                candidate
                              )
                            }
                          >
                            {t(
                              "documents.editSuggestion"
                            )}
                          </button>


                          <button
                            type="button"
                            className="story-suggestion-ignore"
                            data-onboarding={
                              candidateId ===
                                tutorialIgnoreCandidateId
                                ? "smart-import-ignore-button"
                                : undefined
                            }
                            disabled={
                              working
                            }
                            onClick={() =>
                              onIgnore(
                                candidate
                              )
                            }
                          >
                            {t(
                              "documents.ignoreSuggestion"
                            )}
                          </button>


                          {candidate.kind !==
                            "create-entity" && (
                            <button
                              type="button"
                              className="story-suggestion-apply"
                              data-onboarding={
                                getCandidateId(
                                  candidate
                                ) ===
                                tutorialApplyCandidateId
                                  ? "smart-import-apply-button"
                                  : undefined
                              }
                              disabled={
                                  working ||
                                  applyBlocked ||
                                candidate.kind ===
                                  "event-history"
                              }
                              title={
                                candidate.kind ===
                                "event-history"
                                  ? t(
                                      "documents.timelineNotAvailable"
                                    )
                                  : ""
                              }
                              onClick={() =>
                                onApply(
                                  candidate,
                                  {}
                                )
                              }
                            >
                              {working
                                ? t(
                                    "documents.processingSuggestion"
                                  )
                                : candidate.kind ===
                                    "event-history"
                                  ? t(
                                      "documents.timelinePending"
                                    )
                                  : t(
                                      "documents.applySuggestion"
                                    )}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                   )}
                </article>
              );
            }
          )}
          </div>
        </>
      )}
    </section>
  );
}