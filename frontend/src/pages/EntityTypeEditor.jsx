import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import {
  useTranslation,
} from "react-i18next";

import WorldLayout from "../components/WorldLayout";

import {
  API_URL,
} from "../config/api";

import {
  apiFetch,
} from "../utils/apiFetch";

import {
  useOnboarding,
} from "../onboarding/OnboardingContext";


function EntityTypeEditor() {
  const {
    worldId,
    entityTypeId,
  } =
    useParams();


  const {
    t,
  } =
    useTranslation();


  const {
    currentStep,

    nextStep,

    setTutorialFieldId,
  } =
    useOnboarding();


  // ====================================================
  // State
  // ====================================================

  const [
    world,
    setWorld,
  ] =
    useState(
      null
    );


  const [
    entityType,
    setEntityType,
  ] =
    useState(
      null
    );


  const [
    entityTypes,
    setEntityTypes,
  ] =
    useState(
      []
    );


  const [
    showFieldForm,
    setShowFieldForm,
  ] =
    useState(
      false
    );


  const [
    editingFieldId,
    setEditingFieldId,
  ] =
    useState(
      null
    );


  const [
    fieldLabel,
    setFieldLabel,
  ] =
    useState(
      ""
    );


  const [
    fieldType,
    setFieldType,
  ] =
    useState(
      "text"
    );


  const [
    fieldRequired,
    setFieldRequired,
  ] =
    useState(
      false
    );


  const [
    referenceEntityTypeId,
    setReferenceEntityTypeId,
  ] =
    useState(
      ""
    );


  const [
    selectOptions,
    setSelectOptions,
  ] =
    useState([
      "",
    ]);


  const [
    tutorialCreatedFieldId,
    setTutorialCreatedFieldId,
  ] =
    useState(
      null
    );


  // ====================================================
  // Fetch World
  // ====================================================

  async function fetchWorld() {
    try {
      const data =
        await apiFetch(
          `${API_URL.worlds}/${worldId}`
        );


      setWorld(
        data
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to fetch world:",
        error
      );
    }
  }


  // ====================================================
  // Fetch Entity Type
  // ====================================================

  async function fetchEntityType() {
    try {
      const data =
        await apiFetch(
          `${API_URL.entityTypes}/${entityTypeId}`
        );


      setEntityType(
        data
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to fetch entity type:",
        error
      );
    }
  }


  // ====================================================
  // Fetch Entity Types
  // ====================================================

  async function fetchEntityTypes() {
    try {
      const data =
        await apiFetch(
          `${API_URL.entityTypes}/world/${worldId}`
        );


      setEntityTypes(
        Array.isArray(
          data
        )
          ? data
          : []
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to fetch entity types:",
        error
      );


      setEntityTypes(
        []
      );
    }
  }


  // ====================================================
  // Reset Field Form
  // ====================================================

  function resetFieldForm() {
    setEditingFieldId(
      null
    );


    setFieldLabel(
      ""
    );


    setFieldType(
      "text"
    );


    setFieldRequired(
      false
    );


    setReferenceEntityTypeId(
      ""
    );


    setSelectOptions([
      "",
    ]);


    setShowFieldForm(
      false
    );
  }


  // ====================================================
  // Start Add Field
  // ====================================================

  function startAddField() {
    resetFieldForm();


    const isTutorialStep =
      currentStep?.id ===
      "open-add-field";


    if (
      isTutorialStep
    ) {
      setFieldLabel(
        t(
          "onboarding.tutorialFieldName"
        )
      );


      setFieldType(
        "number"
      );


      setFieldRequired(
        false
      );
    }


    setShowFieldForm(
      true
    );
  }


  // ====================================================
  // Advance After Tutorial Field Form Mounts
  // ====================================================

  useEffect(
    () => {
      if (
        !showFieldForm ||
        currentStep?.id !==
          "open-add-field"
      ) {
        return;
      }


      let cancelled =
        false;


      let frameId =
        null;


      let attempts =
        0;


      function waitForFieldForm() {
        if (
          cancelled
        ) {
          return;
        }


        const panel =
          document.querySelector(
            '[data-onboarding="field-form-panel"]'
          );


        if (
          panel
        ) {
          nextStep();

          return;
        }


        attempts +=
          1;


        if (
          attempts <
          60
        ) {
          frameId =
            window.requestAnimationFrame(
              waitForFieldForm
            );
        }
      }


      frameId =
        window.requestAnimationFrame(
          waitForFieldForm
        );


      return () => {
        cancelled =
          true;


        if (
          frameId !==
          null
        ) {
          window.cancelAnimationFrame(
            frameId
          );
        }
      };
    },
    [
      showFieldForm,
      currentStep?.id,
      nextStep,
    ]
  );


  // ====================================================
  // Edit Field
  // ====================================================

  function startEditField(
    field
  ) {
    setEditingFieldId(
      field._id
    );


    setFieldLabel(
      field.label
    );


    setFieldType(
      field.type
    );


    setFieldRequired(
      field.required ||
      false
    );


    setReferenceEntityTypeId(
      field.referenceEntityTypeId ||
      ""
    );


    setSelectOptions(
      field.options &&
        field.options.length >
          0
        ? [
            ...field.options,
          ]
        : [
            "",
          ]
    );


    setShowFieldForm(
      true
    );
  }


  // ====================================================
  // Select Options
  // ====================================================

  function updateSelectOption(
    index,
    value
  ) {
    setSelectOptions(
      (
        currentOptions
      ) => {
        const updatedOptions = [
          ...currentOptions,
        ];


        updatedOptions[
          index
        ] =
          value;


        return updatedOptions;
      }
    );
  }


  function addSelectOption() {
    setSelectOptions(
      (
        currentOptions
      ) => [
        ...currentOptions,
        "",
      ]
    );
  }


  function removeSelectOption(
    index
  ) {
    setSelectOptions(
      (
        currentOptions
      ) => {
        if (
          currentOptions.length ===
          1
        ) {
          return [
            "",
          ];
        }


        return currentOptions.filter(
          (
            _,
            optionIndex
          ) =>
            optionIndex !==
            index
        );
      }
    );
  }


  // ====================================================
  // Save Field
  // ====================================================

  async function saveField(
    event
  ) {
    event.preventDefault();


    if (
      !fieldLabel.trim()
    ) {
      return;
    }


    const isTutorialCreation =
      currentStep?.id ===
        "confirm-add-field" &&
      !editingFieldId;


    const previousFieldIds =
      new Set(
        (
          entityType?.fields ||
          []
        ).map(
          (
            field
          ) =>
            String(
              field._id
            )
        )
      );


    const body = {
      label:
        fieldLabel.trim(),

      type:
        fieldType,

      required:
        fieldRequired,

      referenceEntityTypeId:
        fieldType ===
        "entity-reference"
          ? referenceEntityTypeId ||
            null
          : null,

      options:
        fieldType ===
        "select"
          ? selectOptions
              .map(
                (
                  option
                ) =>
                  option.trim()
              )
              .filter(
                Boolean
              )
          : [],
    };


    try {
      const url =
        editingFieldId
          ? `${API_URL.entityTypes}/${entityTypeId}/fields/${editingFieldId}`
          : `${API_URL.entityTypes}/${entityTypeId}/fields`;


      const method =
        editingFieldId
          ? "PUT"
          : "POST";


      const updatedEntityType =
        await apiFetch(
          url,
          {
            method,

            body,
          }
        );


      setEntityType(
        updatedEntityType
      );


      if (
        isTutorialCreation
      ) {
        const createdField =
          (
            updatedEntityType
              ?.fields ||
            []
          ).find(
            (
              field
            ) =>
              !previousFieldIds.has(
                String(
                  field._id
                )
              )
          );


        if (
          createdField?._id
        ) {
          setTutorialCreatedFieldId(
            createdField._id
          );


          setTutorialFieldId(
            createdField._id
          );
        } else {
          console.warn(
            "Tutorial field was created, but its ID could not be resolved."
          );
        }
      }


      resetFieldForm();


      if (
        isTutorialCreation
      ) {
        nextStep();
      }
    } catch (
      error
    ) {
      console.error(
        "Failed to save field:",
        error
      );


      alert(
        error.message ||
        "Failed to save field"
      );
    }
  }


  // ====================================================
  // Delete Field
  // ====================================================

  async function deleteField(
    fieldId
  ) {
    const confirmed =
      window.confirm(
        t(
          "schema.deleteConfirm"
        )
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {
      const updatedEntityType =
        await apiFetch(
          `${API_URL.entityTypes}/${entityTypeId}/fields/${fieldId}`,
          {
            method:
              "DELETE",
          }
        );


      setEntityType(
        updatedEntityType
      );


      if (
        editingFieldId ===
        fieldId
      ) {
        resetFieldForm();
      }
    } catch (
      error
    ) {
      console.error(
        "Failed to delete field:",
        error
      );


      alert(
        error.message ||
        "Failed to delete field"
      );
    }
  }


  // ====================================================
  // Load
  // ====================================================

  useEffect(
    () => {
      fetchWorld();

      fetchEntityType();

      fetchEntityTypes();
    },
    [
      entityTypeId,
      worldId,
    ]
  );


  // ====================================================
  // Loading
  // ====================================================

  if (
    !world ||
    !entityType
  ) {
    return (
      <div className="workspace-loading">
        {t(
          "workspace.loading"
        )}
      </div>
    );
  }


  // ====================================================
  // Render
  // ====================================================

  return (
    <WorldLayout
      worldId={
        worldId
      }
      worldName={
        world.name
      }
      backTo={
        `/world/${worldId}/entity-types`
      }
    >
      <div className="schema-header">
        <div>
          <div className="schema-title-row">
            <span className="schema-icon">
              {
                entityType.icon
              }
            </span>

            <h1>
              {
                entityType.name
              }
            </h1>
          </div>


          <p>
            {entityType.description ||
              t(
                "entityTypes.noDescription"
              )}
          </p>
        </div>


        <button
          type="button"
          className="create-button"
          data-onboarding="add-field-button"
          onClick={
            startAddField
          }
        >
          {t(
            "schema.addField"
          )}
        </button>
      </div>


      <div
        className="schema-section"
        data-onboarding="schema-fields-section"
      >
        <h2>
          {t(
            "schema.fields"
          )}
        </h2>


        <p className="schema-help">
          {t(
            "schema.help"
          )}
        </p>


        <div className="schema-field-list">
          <div
            className="schema-field built-in-field"
            data-onboarding="built-in-name-field"
          >
            <div>
              <strong>
                {t(
                  "schema.nameField"
                )}
              </strong>
            </div>


            <span className="field-type-badge">
              {t(
                "fieldTypes.text"
              )}
            </span>
          </div>


          {entityType.fields.map(
            (
              field
            ) => {
              const isTutorialField =
                String(
                  tutorialCreatedFieldId ||
                  ""
                ) ===
                String(
                  field._id
                );


              return (
                <div
                  className="schema-field"
                  key={
                    field._id
                  }
                  data-onboarding={
                    isTutorialField
                      ? "tutorial-created-field"
                      : undefined
                  }
                >
                  <div>
                    <strong>
                      {
                        field.label
                      }
                    </strong>


                    {field.type ===
                      "select" &&
                      field.options
                        ?.length >
                        0 && (
                        <div className="field-options-preview">
                          {field.options.join(
                            " · "
                          )}
                        </div>
                      )}
                  </div>


                  <div className="field-meta">
                    {field.required && (
                      <span className="required-badge">
                        {t(
                          "schema.required"
                        )}
                      </span>
                    )}


                    <span className="field-type-badge">
                      {t(
                        `fieldTypes.${field.type}`
                      )}
                    </span>


                    <button
                      type="button"
                      className="small-action-button"
                      onClick={() =>
                        startEditField(
                          field
                        )
                      }
                    >
                      {t(
                        "schema.edit"
                      )}
                    </button>


                    <button
                      type="button"
                      className="small-action-button danger"
                      onClick={() =>
                        deleteField(
                          field._id
                        )
                      }
                    >
                      {t(
                        "schema.delete"
                      )}
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>


        {entityType.fields
          .length ===
          0 && (
          <div className="schema-empty">
            {t(
              "schema.empty"
            )}
          </div>
        )}
      </div>


      {showFieldForm && (
        <div
          className="create-panel schema-create-panel"
          data-onboarding="field-form-panel"
        >
          <h2>
            {editingFieldId
              ? t(
                  "schema.editField"
                )
              : t(
                  "schema.createField"
                )}
          </h2>


          <form
            onSubmit={
              saveField
            }
          >
            <label>
              {t(
                "schema.fieldName"
              )}
            </label>


            <input
              data-onboarding="tutorial-field-name"
              value={
                fieldLabel
              }
              placeholder={t(
                "schema.fieldNamePlaceholder"
              )}
              onChange={(
                event
              ) =>
                setFieldLabel(
                  event.target.value
                )
              }
            />


            <label>
              {t(
                "schema.fieldType"
              )}
            </label>


            <select
              className="field-select"
              data-onboarding="tutorial-field-type"
              value={
                fieldType
              }
              onChange={(
                event
              ) =>
                setFieldType(
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


            {fieldType ===
              "select" && (
              <div className="select-options-editor">
                <label>
                  {t(
                    "schema.options"
                  )}
                </label>


                {selectOptions.map(
                  (
                    option,
                    index
                  ) => (
                    <div
                      className="select-option-row"
                      key={
                        index
                      }
                    >
                      <input
                        value={
                          option
                        }
                        placeholder={`${t(
                          "schema.option"
                        )} ${
                          index +
                          1
                        }`}
                        onChange={(
                          event
                        ) =>
                          updateSelectOption(
                            index,
                            event.target.value
                          )
                        }
                      />


                      <button
                        type="button"
                        className="option-remove-button"
                        onClick={() =>
                          removeSelectOption(
                            index
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  )
                )}


                <button
                  type="button"
                  className="add-option-button"
                  onClick={
                    addSelectOption
                  }
                >
                  {t(
                    "schema.addOption"
                  )}
                </button>
              </div>
            )}


            {fieldType ===
              "entity-reference" && (
              <>
                <label>
                  {t(
                    "schema.referenceType"
                  )}
                </label>


                <select
                  className="field-select"
                  value={
                    referenceEntityTypeId
                  }
                  onChange={(
                    event
                  ) =>
                    setReferenceEntityTypeId(
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
                    (
                      type
                    ) => (
                      <option
                        key={
                          type._id
                        }
                        value={
                          type._id
                        }
                      >
                        {type.icon}{" "}
                        {type.name}
                      </option>
                    )
                  )}
                </select>
              </>
            )}


            <label
              className="checkbox-row"
              data-onboarding="tutorial-field-required"
            >
              <input
                type="checkbox"
                checked={
                  fieldRequired
                }
                onChange={(
                  event
                ) =>
                  setFieldRequired(
                    event.target.checked
                  )
                }
              />

              {t(
                "schema.requiredField"
              )}
            </label>


            <div className="form-buttons">
              <button
                type="button"
                className="cancel-button"
                onClick={
                  resetFieldForm
                }
              >
                {t(
                  "worlds.cancel"
                )}
              </button>


              <button
                type="submit"
                className="save-button"
                data-onboarding="confirm-add-field"
              >
                {editingFieldId
                  ? t(
                      "schema.saveChanges"
                    )
                  : t(
                      "schema.addField"
                    )}
              </button>
            </div>
          </form>
        </div>
      )}
    </WorldLayout>
  );
}


export default EntityTypeEditor;