import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { useTranslation } from "react-i18next";


function EntitiesPage() {
  const { worldId } = useParams();

  const navigate = useNavigate();

  const { t, i18n } =
    useTranslation();


  const [world, setWorld] =
    useState(null);

  const [entities, setEntities] =
    useState([]);

  const [entityTypes, setEntityTypes] =
    useState([]);


  // ==========================================
  // 创建 Entity
  // ==========================================

  const [
    showCreateForm,
    setShowCreateForm,
  ] = useState(false);

  const [
    selectedEntityTypeId,
    setSelectedEntityTypeId,
  ] = useState("");

  const [name, setName] =
    useState("");

  const [values, setValues] =
    useState({});

  const [
    referenceOptions,
    setReferenceOptions,
  ] = useState({});


  // ==========================================
  // 文件夹树
  // ==========================================

  const [
    expandedTypes,
    setExpandedTypes,
  ] = useState({});


  // ==========================================
  // 当前选中的实体
  // ==========================================

  const [
    selectedDetailEntity,
    setSelectedDetailEntity,
  ] = useState(null);


  // ==========================================
  // 当前创建用 Entity Type
  // ==========================================

  const selectedEntityType =
    entityTypes.find(
      (type) =>
        type._id ===
        selectedEntityTypeId
    );


  // ==========================================
  // World
  // ==========================================

  async function fetchWorld() {
    try {
      const response = await fetch(
        `http://localhost:3000/api/worlds/${worldId}`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch world"
        );
      }

      const data =
        await response.json();

      setWorld(data);
    } catch (error) {
      console.error(error);
    }
  }


  // ==========================================
  // Entity Types
  // ==========================================

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

      const data =
        await response.json();

      setEntityTypes(data);
    } catch (error) {
      console.error(error);
    }
  }


  // ==========================================
  // Entities
  // ==========================================

  async function fetchEntities() {
    try {
      const response = await fetch(
        `http://localhost:3000/api/entities/world/${worldId}`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch entities"
        );
      }

      const data =
        await response.json();

      setEntities(data);
    } catch (error) {
      console.error(error);
    }
  }


  // ==========================================
  // Entity Reference Options
  // ==========================================

  async function loadReferenceOptions(
    field
  ) {
    if (
      field.type !==
      "entity-reference"
    ) {
      return;
    }

    try {
      let url;

      if (
        field.referenceEntityTypeId
      ) {
        url =
          `http://localhost:3000/api/entities/world/${worldId}/type/${field.referenceEntityTypeId}`;
      } else {
        url =
          `http://localhost:3000/api/entities/world/${worldId}`;
      }

      const response =
        await fetch(url);

      if (!response.ok) {
        throw new Error(
          "Failed to load reference options"
        );
      }

      const data =
        await response.json();

      setReferenceOptions(
        (current) => ({
          ...current,

          [field.key]: data,
        })
      );
    } catch (error) {
      console.error(error);
    }
  }


  // ==========================================
  // 选择 Entity Type
  // ==========================================

  function selectEntityType(
    entityTypeId
  ) {
    setSelectedEntityTypeId(
      entityTypeId
    );

    setName("");
    setValues({});
    setReferenceOptions({});

    const type =
      entityTypes.find(
        (item) =>
          item._id ===
          entityTypeId
      );

    if (type) {
      type.fields.forEach(
        (field) => {
          if (
            field.type ===
            "entity-reference"
          ) {
            loadReferenceOptions(
              field
            );
          }
        }
      );
    }
  }


  // ==========================================
  // 修改动态字段值
  // ==========================================

  function updateValue(
    fieldKey,
    value
  ) {
    setValues(
      (current) => ({
        ...current,

        [fieldKey]: value,
      })
    );
  }


  // ==========================================
  // 创建 Entity
  // ==========================================

  async function createEntity(
    event
  ) {
    event.preventDefault();

    if (!selectedEntityTypeId) {
      return;
    }

    if (!name.trim()) {
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:3000/api/entities",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            worldId,

            entityTypeId:
              selectedEntityTypeId,

            name,

            values,
          }),
        }
      );

      if (!response.ok) {
        const errorData =
          await response.json();

        throw new Error(
          errorData.message ||
            "Failed to create entity"
        );
      }

      const newEntity =
        await response.json();

      setEntities(
        (current) => [
          newEntity,
          ...current,
        ]
      );

      // 自动展开刚创建实体所属的分类
      setExpandedTypes(
        (current) => ({
          ...current,

          [selectedEntityTypeId]:
            true,
        })
      );

      // 创建完成以后直接显示这个实体详情
      setSelectedDetailEntity(
        newEntity
      );

      closeCreateForm();
    } catch (error) {
      console.error(error);

      alert(error.message);
    }
  }


  // ==========================================
  // 创建模式
  // ==========================================

  function openCreateForm() {
    // 进入创建模式时，
    // 取消当前 Detail
    setSelectedDetailEntity(null);

    setShowCreateForm(true);

    setSelectedEntityTypeId("");
    setName("");
    setValues({});
    setReferenceOptions({});
  }


  function closeCreateForm() {
    setShowCreateForm(false);

    setSelectedEntityTypeId("");
    setName("");
    setValues({});
    setReferenceOptions({});
  }


  // ==========================================
  // Entity Tree
  // ==========================================

  function toggleEntityType(
    entityTypeId
  ) {
    setExpandedTypes(
      (current) => ({
        ...current,

        [entityTypeId]:
          !current[
            entityTypeId
          ],
      })
    );
  }


  function getEntitiesByType(
    entityTypeId
  ) {
    return entities.filter(
      (entity) => {
        const typeId =
          typeof entity.entityTypeId ===
          "object"
            ? entity
                .entityTypeId
                ._id
            : entity.entityTypeId;

        return (
          typeId ===
          entityTypeId
        );
      }
    );
  }


  // ==========================================
  // Detail
  // ==========================================

  function openEntityDetail(
    entity
  ) {
    // 如果正在创建，
    // 点击左边 Entity 后退出创建模式
    setShowCreateForm(false);

    setSelectedEntityTypeId("");
    setName("");
    setValues({});
    setReferenceOptions({});

    setSelectedDetailEntity(
      entity
    );
  }


  function getEntityTypeForEntity(
    entity
  ) {
    if (!entity) {
      return null;
    }

    const entityTypeId =
      typeof entity.entityTypeId ===
      "object"
        ? entity.entityTypeId._id
        : entity.entityTypeId;

    return entityTypes.find(
      (type) =>
        type._id ===
        entityTypeId
    );
  }


  // ==========================================
  // Entity Reference ID → Name
  // ==========================================

  function getReferencedEntityName(
    entityId
  ) {
    if (!entityId) {
      return "—";
    }

    const entity =
      entities.find(
        (item) =>
          item._id === entityId
      );

    return entity
      ? entity.name
      : "—";
  }


  // ==========================================
  // 格式化 Detail 字段
  // ==========================================

  function formatFieldValue(
    field,
    value
  ) {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return "—";
    }

    if (
      field.type ===
      "boolean"
    ) {
      return value
        ? t("entities.yes")
        : t("entities.no");
    }

    if (
      field.type ===
      "entity-reference"
    ) {
      return getReferencedEntityName(
        value
      );
    }

    return String(value);
  }


  // ==========================================
  // Language
  // ==========================================

  function changeLanguage(
    event
  ) {
    const language =
      event.target.value;

    i18n.changeLanguage(
      language
    );

    localStorage.setItem(
      "worldforge-language",
      language
    );
  }


  // ==========================================
  // Initial Load
  // ==========================================

  useEffect(() => {
    fetchWorld();
    fetchEntityTypes();
    fetchEntities();
  }, [worldId]);


  // ==========================================
  // Schema Driven Input
  // ==========================================

  function renderField(
    field
  ) {
    const value =
      values[field.key] ?? "";


    // Text
    if (
      field.type === "text"
    ) {
      return (
        <input
          type="text"
          value={value}
          required={
            field.required
          }
          onChange={(event) =>
            updateValue(
              field.key,
              event.target.value
            )
          }
        />
      );
    }


    // Long Text
    if (
      field.type ===
      "long-text"
    ) {
      return (
        <textarea
          value={value}
          required={
            field.required
          }
          onChange={(event) =>
            updateValue(
              field.key,
              event.target.value
            )
          }
        />
      );
    }


    // Number
    if (
      field.type === "number"
    ) {
      return (
        <input
          type="number"
          value={value}
          required={
            field.required
          }
          onChange={(event) =>
            updateValue(
              field.key,
              event.target.value
            )
          }
        />
      );
    }


    // Date
    if (
      field.type === "date"
    ) {
      return (
        <input
          type="date"
          value={value}
          required={
            field.required
          }
          onChange={(event) =>
            updateValue(
              field.key,
              event.target.value
            )
          }
        />
      );
    }


    // Boolean
    if (
      field.type ===
      "boolean"
    ) {
      return (
        <label
          className=
            "checkbox-row entity-checkbox"
        >

          <input
            type="checkbox"
            checked={
              values[
                field.key
              ] || false
            }
            onChange={(
              event
            ) =>
              updateValue(
                field.key,
                event.target
                  .checked
              )
            }
          />

          {t(
            "entities.yes"
          )}

        </label>
      );
    }


    // Dropdown
    if (
      field.type === "select"
    ) {
      return (
        <select
          className=
            "field-select"
          value={value}
          required={
            field.required
          }
          onChange={(event) =>
            updateValue(
              field.key,
              event.target.value
            )
          }
        >

          <option value="">
            {t(
              "entities.selectOption"
            )}
          </option>

          {field.options?.map(
            (option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            )
          )}

        </select>
      );
    }


    // Entity Reference
    if (
      field.type ===
      "entity-reference"
    ) {
      const options =
        referenceOptions[
          field.key
        ] || [];

      return (
        <select
          className=
            "field-select"
          value={value}
          required={
            field.required
          }
          onChange={(event) =>
            updateValue(
              field.key,
              event.target.value
            )
          }
        >

          <option value="">
            {t(
              "entities.selectEntity"
            )}
          </option>

          {options.map(
            (entity) => (
              <option
                key={
                  entity._id
                }
                value={
                  entity._id
                }
              >
                {
                  entity.name
                }
              </option>
            )
          )}

        </select>
      );
    }


    return null;
  }


  // ==========================================
  // Loading
  // ==========================================

  if (!world) {
    return (
      <div
        className=
          "workspace-loading"
      >
        {t(
          "workspace.loading"
        )}
      </div>
    );
  }


  // 当前 Detail 的 Schema
  const detailEntityType =
    getEntityTypeForEntity(
      selectedDetailEntity
    );


  // ==========================================
  // Render
  // ==========================================

  return (
    <div className="workspace">

      {/* ======================================
          TOP BAR
      ====================================== */}

      <header
        className=
          "workspace-topbar"
      >

        <div
          className=
            "workspace-topbar-left"
        >

          <button
            className=
              "back-button"
            onClick={() =>
              navigate("/")
            }
          >
            ←
          </button>


          <div className="logo">
            {t("app.name")}
          </div>


          <div
            className=
              "world-title-divider"
          >
            /
          </div>


          <div
            className=
              "workspace-world-name"
          >
            {world.name}
          </div>

        </div>


        <div
          className=
            "language-selector"
        >

          <select
            value={
              i18n.language
            }
            onChange={
              changeLanguage
            }
          >

            <option value="en">
              English
            </option>

            <option
              value="zh-CN"
            >
              简体中文
            </option>

          </select>

        </div>

      </header>


      <div
        className=
          "workspace-body"
      >

        {/* ======================================
            PRIMARY SIDEBAR
        ====================================== */}

        <aside
          className=
            "workspace-sidebar"
        >

          <div
            className=
              "sidebar-section-title"
          >
            {t(
              "workspace.library"
            )}
          </div>


          <button
            className=
              "sidebar-item"
            onClick={() =>
              navigate(
                `/world/${worldId}`
              )
            }
          >
            {t(
              "workspace.home"
            )}
          </button>


          <button
            className=
              "sidebar-item"
            onClick={() =>
              navigate(
                `/world/${worldId}/entity-types`
              )
            }
          >
            {t(
              "workspace.entityTypes"
            )}
          </button>


          <button
            className=
              "sidebar-item active"
          >
            {t(
              "workspace.entities"
            )}
          </button>


          <button
            className=
              "sidebar-item"
          >
            {t(
              "workspace.documents"
            )}
          </button>


          <div
            className=
              "sidebar-divider"
          />


          <button
            className=
              "sidebar-item"
          >
            {t(
              "workspace.timeline"
            )}
          </button>


          <button
            className=
              "sidebar-item"
          >
            {t(
              "workspace.graph"
            )}
          </button>


          <div
            className=
              "sidebar-spacer"
          />


          <button
            className=
              "sidebar-item"
          >
            {t(
              "workspace.settings"
            )}
          </button>

        </aside>


        {/* ======================================
            ENTITY TREE SIDEBAR
        ====================================== */}

        <aside
          className=
            "entity-tree-sidebar"
        >

          <div
            className=
              "entity-tree-header"
          >

            <span>
              {t(
                "entities.title"
              )}
            </span>


            <button
              className=
                "tree-add-button"
              onClick={
                openCreateForm
              }
              title={t(
                "entities.newEntity"
              )}
            >
              +
            </button>

          </div>


          <div
            className=
              "entity-tree"
          >

            {entityTypes.map(
              (type) => {

                const typeEntities =
                  getEntitiesByType(
                    type._id
                  );

                const isExpanded =
                  expandedTypes[
                    type._id
                  ] || false;


                return (
                  <div
                    className=
                      "tree-type"
                    key={
                      type._id
                    }
                  >

                    {/* 分类 */}

                    <button
                      className=
                        "tree-type-row"
                      onClick={() =>
                        toggleEntityType(
                          type._id
                        )
                      }
                    >

                      <span
                        className=
                          "tree-arrow"
                      >
                        {isExpanded
                          ? "⌄"
                          : "›"}
                      </span>


                      <span
                        className=
                          "tree-type-icon"
                      >
                        {type.icon ||
                          "📄"}
                      </span>


                      <span
                        className=
                          "tree-type-name"
                      >
                        {
                          type.name
                        }
                      </span>


                      <span
                        className=
                          "tree-count"
                      >
                        {
                          typeEntities
                            .length
                        }
                      </span>

                    </button>


                    {/* 分类下 Entity */}

                    {isExpanded && (

                      <div
                        className=
                          "tree-children"
                      >

                        {typeEntities.map(
                          (
                            entity
                          ) => (

                            <button
                              className={
                                selectedDetailEntity
                                  ?._id ===
                                entity._id
                                  ? "tree-entity-row selected"
                                  : "tree-entity-row"
                              }
                              key={
                                entity._id
                              }
                              onClick={() =>
                                openEntityDetail(
                                  entity
                                )
                              }
                            >

                              <span
                                className=
                                  "tree-file-mark"
                              >
                                •
                              </span>


                              <span>
                                {
                                  entity.name
                                }
                              </span>

                            </button>

                          )
                        )}


                        {typeEntities
                          .length ===
                          0 && (

                          <div
                            className=
                              "tree-empty"
                          >
                            {t(
                              "entities.noEntitiesInType"
                            )}
                          </div>

                        )}

                      </div>

                    )}

                  </div>
                );
              }
            )}

          </div>

        </aside>


        {/* ======================================
            RIGHT WORKSPACE
        ====================================== */}

        <main
          className=
            "workspace-main"
        >

          {/* ==================================
              PAGE HEADER
          ================================== */}

          <div
            className=
              "entity-page-header"
          >

            <div>

              <h1>

                {showCreateForm
                  ? t(
                      "entities.createTitle"
                    )
                  : selectedDetailEntity
                    ? selectedDetailEntity
                        .name
                    : t(
                        "entities.title"
                      )}

              </h1>


              <p>

                {showCreateForm
                  ? t(
                      "entities.createDescription"
                    )
                  : selectedDetailEntity &&
                      detailEntityType
                    ? `${detailEntityType.icon || ""} ${detailEntityType.name}`
                    : t(
                        "entities.subtitle"
                      )}

              </p>

            </div>


            {!showCreateForm && (

              <button
                className=
                  "create-button"
                onClick={
                  openCreateForm
                }
              >
                {t(
                  "entities.newEntity"
                )}
              </button>

            )}

          </div>


          {/* ==================================
              CREATE ENTITY
          ================================== */}

          {showCreateForm && (

            <div
              className=
                "create-panel entity-create-panel"
            >

              <form
                onSubmit={
                  createEntity
                }
              >

                <label>
                  {t(
                    "entities.entityType"
                  )}
                </label>


                <select
                  className=
                    "field-select"
                  value={
                    selectedEntityTypeId
                  }
                  onChange={(
                    event
                  ) =>
                    selectEntityType(
                      event.target
                        .value
                    )
                  }
                >

                  <option value="">
                    {t(
                      "entities.selectType"
                    )}
                  </option>


                  {entityTypes.map(
                    (type) => (

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


                {selectedEntityType && (

                  <>

                    <div
                      className=
                        "entity-form-divider"
                    />


                    <div
                      className=
                        "selected-type-heading"
                    >

                      <span>
                        {
                          selectedEntityType
                            .icon
                        }
                      </span>

                      <strong>
                        {
                          selectedEntityType
                            .name
                        }
                      </strong>

                    </div>


                    {/* Name */}

                    <label>

                      {t(
                        "schema.nameField"
                      )}

                      <span
                        className=
                          "required-star"
                      >
                        *
                      </span>

                    </label>


                    <input
                      type="text"
                      value={name}
                      required
                      onChange={(
                        event
                      ) =>
                        setName(
                          event.target
                            .value
                        )
                      }
                    />


                    {/* Dynamic Fields */}

                    {selectedEntityType
                      .fields.map(
                        (field) => (

                          <div
                            className=
                              "dynamic-field"
                            key={
                              field._id
                            }
                          >

                            <label>

                              {
                                field.label
                              }

                              {field.required && (

                                <span
                                  className=
                                    "required-star"
                                >
                                  *
                                </span>

                              )}

                            </label>


                            {renderField(
                              field
                            )}

                          </div>

                        )
                      )}

                  </>

                )}


                <div
                  className=
                    "form-buttons"
                >

                  <button
                    type="button"
                    className=
                      "cancel-button"
                    onClick={
                      closeCreateForm
                    }
                  >
                    {t(
                      "worlds.cancel"
                    )}
                  </button>


                  <button
                    type="submit"
                    className=
                      "save-button"
                    disabled={
                      !selectedEntityTypeId
                    }
                  >
                    {t(
                      "entities.create"
                    )}
                  </button>

                </div>

              </form>

            </div>

          )}


          {/* ==================================
              ENTITY DETAIL
          ================================== */}

          {!showCreateForm &&
            selectedDetailEntity &&
            detailEntityType && (

            <div
              className=
                "entity-detail-panel"
            >

              {/* Detail Header */}

              <div
                className=
                  "entity-detail-panel-header"
              >

                <div
                  className=
                    "entity-detail-title"
                >

                  <div
                    className=
                      "entity-detail-icon"
                  >
                    {
                      detailEntityType
                        .icon
                    }
                  </div>


                  <div>

                    <h2>
                      {
                        selectedDetailEntity
                          .name
                      }
                    </h2>

                    <span>
                      {
                        detailEntityType
                          .name
                      }
                    </span>

                  </div>

                </div>

              </div>


              {/* Detail Fields */}

              <div
                className=
                  "entity-detail-panel-body"
              >

                {detailEntityType
                  .fields.length ===
                  0 && (

                  <div
                    className=
                      "detail-empty"
                  >
                    {t(
                      "entities.noCustomFields"
                    )}
                  </div>

                )}


                {detailEntityType
                  .fields.map(
                    (field) => {

                      const rawValue =
                        selectedDetailEntity
                          .values?.[
                            field.key
                          ];


                      return (

                        <div
                          className={
                            field.type ===
                            "long-text"
                              ? "detail-field detail-field-long"
                              : "detail-field"
                          }
                          key={
                            field._id
                          }
                        >

                          <div
                            className=
                              "detail-field-label"
                          >
                            {
                              field.label
                            }
                          </div>


                          <div
                            className=
                              "detail-field-value"
                          >
                            {formatFieldValue(
                              field,
                              rawValue
                            )}
                          </div>

                        </div>

                      );
                    }
                  )}

              </div>


              {/* Detail Footer */}

              <div
                className=
                  "entity-detail-panel-footer"
              >

                {t(
                  "entities.lastUpdated"
                )}{" "}

                {new Date(
                  selectedDetailEntity
                    .updatedAt
                ).toLocaleString(
                  i18n.language ===
                    "zh-CN"
                    ? "zh-CN"
                    : "en-US"
                )}

              </div>

            </div>

          )}


          {/* ==================================
              NOTHING SELECTED
          ================================== */}

          {!showCreateForm &&
            !selectedDetailEntity && (

            <div
              className=
                "entity-browser-message"
            >

              <h2>
                {t(
                  "entities.browserTitle"
                )}
              </h2>


              <p>
                {t(
                  "entities.browserDescription"
                )}
              </p>

            </div>

          )}

        </main>

      </div>

    </div>
  );
}


export default EntitiesPage;