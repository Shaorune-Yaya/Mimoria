import {
  useEffect,
  useMemo,
  useState,
} from "react";


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

  onClearError,
}) {
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
          (candidate) =>
            candidate.status ===
            "pending"
        ).length,

      [
        candidates,
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
  // Entity Type Helpers
  // ====================================================

  function getRecommendedEntityType(
    candidate
  ) {
    const concept =
      candidate
        ?.payload
        ?.likelyTypeConcept;


    if (
      !concept
    ) {
      return null;
    }


    return (
      entityTypes.find(
        (entityType) =>
          entityType
            ?.canonicalConcept ===
          concept
      ) ||
      null
    );
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
          <div className="story-suggestion-edit-grid">
            {/* Entity Name */}

            <label>
              <span className="story-suggestion-label">
                {t(
                  "documents.editEntityName"
                )}
              </span>

              <input
                type="text"
                value={
                  editPayload.name ??
                  ""
                }
                onChange={(event) =>
                  updateEditField(
                    "name",
                    event.target.value
                  )
                }
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
                String(
                  payload.value ??
                  ""
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
              <div className="story-recommended-type">
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
        candidates.length ===
          0 && (
          <div className="story-suggestions-empty">
            {emptyText ||
              t(
                "documents.storySuggestionsEmpty"
              )}
          </div>
        )}


      {candidates.length >
        0 && (
        <div className="story-suggestions-list">
          {candidates.map(
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
                  className={[
                    "story-suggestion-card",

                    `status-${candidate.status}`,

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


                    {candidate
                      .editedByUser && (
                      <span className="story-suggestion-edited-badge">
                        {t(
                          "documents.suggestionEdited"
                        )}
                      </span>
                    )}
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
                          (
                            candidate
                              .confidence ??
                            0
                          ) *
                            100
                        )
                      }

                      %
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
                              disabled={
                                working ||
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
      )}
    </section>
  );
}