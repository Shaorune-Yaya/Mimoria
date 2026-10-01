import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";

function EntityTypeEditor() {
  const {
    worldId,
    entityTypeId,
  } = useParams();

  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [entityType, setEntityType] =
    useState(null);

  const [entityTypes, setEntityTypes] =
    useState([]);

  const [showFieldForm, setShowFieldForm] =
    useState(false);

  const [editingFieldId, setEditingFieldId] =
    useState(null);

  const [fieldLabel, setFieldLabel] =
    useState("");

  const [fieldType, setFieldType] =
    useState("text");

  const [fieldRequired, setFieldRequired] =
    useState(false);

  const [
    referenceEntityTypeId,
    setReferenceEntityTypeId,
  ] = useState("");

  const [selectOptions, setSelectOptions] =
    useState([""]);


  async function fetchEntityType() {
    try {
      const response = await fetch(
        `http://localhost:3000/api/entity-types/${entityTypeId}`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch entity type"
        );
      }

      const data = await response.json();

      setEntityType(data);
    } catch (error) {
      console.error(error);
    }
  }


  async function fetchEntityTypes() {
    try {
      const response = await fetch(
        `http://localhost:3000/api/entity-types/world/${worldId}`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch entity types"
        );
      }

      const data = await response.json();

      setEntityTypes(data);
    } catch (error) {
      console.error(error);
    }
  }


  function resetFieldForm() {
    setEditingFieldId(null);
    setFieldLabel("");
    setFieldType("text");
    setFieldRequired(false);
    setReferenceEntityTypeId("");
    setSelectOptions([""]);
    setShowFieldForm(false);
  }


  function startAddField() {
    resetFieldForm();
    setShowFieldForm(true);
  }


  function startEditField(field) {
    setEditingFieldId(field._id);

    setFieldLabel(field.label);
    setFieldType(field.type);
    setFieldRequired(field.required || false);

    setReferenceEntityTypeId(
      field.referenceEntityTypeId || ""
    );

    setSelectOptions(
      field.options && field.options.length > 0
        ? field.options
        : [""]
    );

    setShowFieldForm(true);
  }


  function updateSelectOption(index, value) {
    setSelectOptions((currentOptions) => {
      const updatedOptions = [
        ...currentOptions,
      ];

      updatedOptions[index] = value;

      return updatedOptions;
    });
  }


  function addSelectOption() {
    setSelectOptions((currentOptions) => [
      ...currentOptions,
      "",
    ]);
  }


  function removeSelectOption(index) {
    setSelectOptions((currentOptions) => {
      if (currentOptions.length === 1) {
        return [""];
      }

      return currentOptions.filter(
        (_, optionIndex) =>
          optionIndex !== index
      );
    });
  }


  async function saveField(event) {
    event.preventDefault();

    if (!fieldLabel.trim()) {
      return;
    }

    const body = {
      label: fieldLabel,

      type: fieldType,

      required: fieldRequired,

      referenceEntityTypeId:
        fieldType === "entity-reference"
          ? referenceEntityTypeId || null
          : null,

      options:
        fieldType === "select"
          ? selectOptions
              .map((option) => option.trim())
              .filter(Boolean)
          : [],
    };

    try {
      let response;

      if (editingFieldId) {
        response = await fetch(
          `http://localhost:3000/api/entity-types/${entityTypeId}/fields/${editingFieldId}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(body),
          }
        );
      } else {
        response = await fetch(
          `http://localhost:3000/api/entity-types/${entityTypeId}/fields`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(body),
          }
        );
      }

      if (!response.ok) {
        const errorData =
          await response.json();

        throw new Error(
          errorData.message ||
            "Failed to save field"
        );
      }

      const updatedEntityType =
        await response.json();

      setEntityType(updatedEntityType);

      resetFieldForm();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }


  async function deleteField(fieldId) {
    const confirmed = window.confirm(
      t("schema.deleteConfirm")
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3000/api/entity-types/${entityTypeId}/fields/${fieldId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData =
          await response.json();

        throw new Error(
          errorData.message ||
            "Failed to delete field"
        );
      }

      const updatedEntityType =
        await response.json();

      setEntityType(updatedEntityType);

      if (editingFieldId === fieldId) {
        resetFieldForm();
      }
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

    function changeLanguage(event) {
    const language = event.target.value;

    i18n.changeLanguage(language);

    localStorage.setItem(
        "worldforge-language",
        language
    );
    }

  useEffect(() => {
    fetchEntityType();
    fetchEntityTypes();
  }, [entityTypeId, worldId]);


  if (!entityType) {
    return (
      <div className="workspace-loading">
        {t("workspace.loading")}
      </div>
    );
  }


  return (
    <div className="workspace">

      <header className="workspace-topbar">

        <div className="workspace-topbar-left">

          <button
            className="back-button"
            onClick={() =>
              navigate(
                `/world/${worldId}/entity-types`
              )
            }
          >
            ←
          </button>

          <div className="logo">
            {t("app.name")}
          </div>

          <div className="world-title-divider">
            /
          </div>

          <div className="workspace-world-name">
            {entityType.icon}{" "}
            {entityType.name}
          </div>

        </div>

        <div className="language-selector">

          <select
            value={i18n.language}
            onChange={changeLanguage}
          >

            <option value="en">
              English
            </option>

            <option value="zh-CN">
              简体中文
            </option>

          </select>

        </div>

      </header>


      <div className="workspace-body">

        <aside className="workspace-sidebar">

          <div className="sidebar-section-title">
            {t("workspace.library")}
          </div>

          <button
            className="sidebar-item"
            onClick={() =>
              navigate(`/world/${worldId}`)
            }
          >
            {t("workspace.home")}
          </button>

          <button
            className="sidebar-item active"
            onClick={() =>
              navigate(
                `/world/${worldId}/entity-types`
              )
            }
          >
            {t("workspace.entityTypes")}
          </button>

          <button className="sidebar-item"
            onClick={() =>
                navigate(
                `/world/${worldId}/entities`
                )
            }
          >
            {t("workspace.entities")}
          </button>

          <button className="sidebar-item">
            {t("workspace.documents")}
          </button>

          <div className="sidebar-divider" />

          <button className="sidebar-item">
            {t("workspace.timeline")}
          </button>

          <button className="sidebar-item">
            {t("workspace.graph")}
          </button>

        </aside>


        <main className="workspace-main">

          <div className="schema-header">

            <div>

              <div className="schema-title-row">

                <span className="schema-icon">
                  {entityType.icon}
                </span>

                <h1>
                  {entityType.name}
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
              className="create-button"
              onClick={startAddField}
            >
              {t("schema.addField")}
            </button>

          </div>


          <div className="schema-section">

            <h2>
              {t("schema.fields")}
            </h2>

            <p className="schema-help">
              {t("schema.help")}
            </p>


            <div className="schema-field-list">

              <div className="schema-field built-in-field">

                <div>
                  <strong>
                    {t("schema.nameField")}
                  </strong>
                </div>

                <span className="field-type-badge">
                  {t("fieldTypes.text")}
                </span>

              </div>


              {entityType.fields.map(
                (field) => (

                  <div
                    className="schema-field"
                    key={field._id}
                  >

                    <div>
                      <strong>
                        {field.label}
                      </strong>

                      {field.type ===
                        "select" &&
                        field.options?.length >
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
                          {t("schema.required")}
                        </span>
                      )}

                      <span className="field-type-badge">
                        {t(
                          `fieldTypes.${field.type}`
                        )}
                      </span>

                      <button
                        className="small-action-button"
                        onClick={() =>
                          startEditField(field)
                        }
                      >
                        {t("schema.edit")}
                      </button>

                      <button
                        className="small-action-button danger"
                        onClick={() =>
                          deleteField(field._id)
                        }
                      >
                        {t("schema.delete")}
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>


            {entityType.fields.length === 0 && (

              <div className="schema-empty">
                {t("schema.empty")}
              </div>

            )}

          </div>


          {showFieldForm && (

            <div className="create-panel schema-create-panel">

              <h2>
                {editingFieldId
                  ? t("schema.editField")
                  : t("schema.createField")}
              </h2>


              <form onSubmit={saveField}>

                <label>
                  {t("schema.fieldName")}
                </label>

                <input
                  value={fieldLabel}
                  placeholder={t(
                    "schema.fieldNamePlaceholder"
                  )}
                  onChange={(event) =>
                    setFieldLabel(
                      event.target.value
                    )
                  }
                />


                <label>
                  {t("schema.fieldType")}
                </label>

                <select
                  className="field-select"
                  value={fieldType}
                  onChange={(event) =>
                    setFieldType(
                      event.target.value
                    )
                  }
                >

                  <option value="text">
                    {t("fieldTypes.text")}
                  </option>

                  <option value="long-text">
                    {t(
                      "fieldTypes.long-text"
                    )}
                  </option>

                  <option value="number">
                    {t("fieldTypes.number")}
                  </option>

                  <option value="boolean">
                    {t(
                      "fieldTypes.boolean"
                    )}
                  </option>

                  <option value="date">
                    {t("fieldTypes.date")}
                  </option>

                  <option value="select">
                    {t("fieldTypes.select")}
                  </option>

                  <option value="entity-reference">
                    {t(
                      "fieldTypes.entity-reference"
                    )}
                  </option>

                </select>


                {fieldType === "select" && (

                  <div className="select-options-editor">

                    <label>
                      {t("schema.options")}
                    </label>

                    {selectOptions.map(
                      (option, index) => (

                        <div
                          className="select-option-row"
                          key={index}
                        >

                          <input
                            value={option}
                            placeholder={`${t(
                              "schema.option"
                            )} ${index + 1}`}
                            onChange={(event) =>
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
                      onClick={addSelectOption}
                    >
                      {t("schema.addOption")}
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
                      onChange={(event) =>
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
                        (type) => (

                          <option
                            key={type._id}
                            value={type._id}
                          >
                            {type.icon}{" "}
                            {type.name}
                          </option>

                        )
                      )}

                    </select>
                  </>

                )}


                <label className="checkbox-row">

                  <input
                    type="checkbox"
                    checked={fieldRequired}
                    onChange={(event) =>
                      setFieldRequired(
                        event.target.checked
                      )
                    }
                  />

                  {t("schema.requiredField")}

                </label>


                <div className="form-buttons">

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={resetFieldForm}
                  >
                    {t("worlds.cancel")}
                  </button>

                  <button
                    type="submit"
                    className="save-button"
                  >
                    {editingFieldId
                      ? t("schema.saveChanges")
                      : t("schema.addField")}
                  </button>

                </div>

              </form>

            </div>

          )}

        </main>

      </div>

    </div>
  );
}

export default EntityTypeEditor;