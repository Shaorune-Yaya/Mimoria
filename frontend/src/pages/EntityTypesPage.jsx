import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
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


function EntityTypesPage() {
  const {
    worldId,
  } =
    useParams();


  const navigate =
    useNavigate();


  const {
    t,
  } =
    useTranslation();


  const [
    world,
    setWorld,
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
    showCreateForm,
    setShowCreateForm,
  ] =
    useState(
      false
    );


  const [
    name,
    setName,
  ] =
    useState(
      ""
    );


  const [
    description,
    setDescription,
  ] =
    useState(
      ""
    );


  const [
    icon,
    setIcon,
  ] =
    useState(
      "📄"
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      ""
    );


  const [
    creating,
    setCreating,
  ] =
    useState(
      false
    );


  // ====================================================
  // Load Page
  // ====================================================

  async function loadPage() {
    try {
      setLoading(
        true
      );


      setErrorMessage(
        ""
      );


      const [
        worldData,
        entityTypesData,
      ] =
        await Promise.all([
          apiFetch(
            `${API_URL.worlds}/${worldId}`
          ),

          apiFetch(
            `${API_URL.entityTypes}/world/${worldId}`
          ),
        ]);


      setWorld(
        worldData
      );


      setEntityTypes(
        Array.isArray(
          entityTypesData
        )
          ? entityTypesData
          : []
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to load Entity Types page:",
        error
      );


      setWorld(
        null
      );


      setErrorMessage(
        error.message ||
        "Failed to load entity types"
      );
    } finally {
      setLoading(
        false
      );
    }
  }


  // ====================================================
  // Create Entity Type
  // ====================================================

  async function createEntityType(
    event
  ) {
    event.preventDefault();


    const normalizedName =
      name.trim();


    if (
      !normalizedName ||
      creating
    ) {
      return;
    }


    try {
      setCreating(
        true
      );


      setErrorMessage(
        ""
      );


      const newEntityType =
        await apiFetch(
          API_URL.entityTypes,
          {
            method:
              "POST",

            body: {
              worldId,

              name:
                normalizedName,

              description:
                description.trim(),

              icon:
                icon ||
                "📄",
            },
          }
        );


      setEntityTypes(
        (
          current
        ) => [
          ...current,
          newEntityType,
        ]
      );


      setName(
        ""
      );


      setDescription(
        ""
      );


      setIcon(
        "📄"
      );


      setShowCreateForm(
        false
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to create entity type:",
        error
      );


      setErrorMessage(
        error.message ||
        "Failed to create entity type"
      );
    } finally {
      setCreating(
        false
      );
    }
  }


  // ====================================================
  // Navigation
  // ====================================================

  function openEntityType(
    entityTypeId
  ) {
    navigate(
      `/world/${worldId}/entity-types/${entityTypeId}`
    );
  }


  // ====================================================
  // Initial Load
  // ====================================================

  useEffect(
    () => {
      loadPage();
    },
    [
      worldId,
    ]
  );


  // ====================================================
  // Loading
  // ====================================================

  if (
    loading
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
  // Error
  // ====================================================

  if (
    !world
  ) {
    return (
      <div className="workspace-loading">
        {errorMessage ||
          t(
            "workspace.notFound"
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
    >
      <div className="page-header">
        <div>
          <h1>
            {t(
              "entityTypes.title"
            )}
          </h1>


          <p>
            {t(
              "entityTypes.subtitle"
            )}
          </p>
        </div>


        <button
          type="button"
          className="create-button"
          onClick={() => {
            setErrorMessage(
              ""
            );


            setShowCreateForm(
              true
            );
          }}
        >
          {t(
            "entityTypes.newType"
          )}
        </button>
      </div>


      {errorMessage && (
        <div
          className="error-message"
          style={{
            marginBottom:
              "16px",
          }}
        >
          {
            errorMessage
          }
        </div>
      )}


      {showCreateForm && (
        <div className="create-panel">
          <h2>
            {t(
              "entityTypes.createTitle"
            )}
          </h2>


          <form
            onSubmit={
              createEntityType
            }
          >
            <label>
              {t(
                "entityTypes.name"
              )}
            </label>


            <input
              type="text"
              value={
                name
              }
              disabled={
                creating
              }
              placeholder={t(
                "entityTypes.namePlaceholder"
              )}
              onChange={(
                event
              ) =>
                setName(
                  event.target.value
                )
              }
            />


            <label>
              {t(
                "entityTypes.icon"
              )}
            </label>


            <input
              type="text"
              value={
                icon
              }
              disabled={
                creating
              }
              onChange={(
                event
              ) =>
                setIcon(
                  event.target.value
                )
              }
            />


            <small>
              {t(
                "entityTypes.setEmoji"
              )}
            </small>


            <label>
              {t(
                "entityTypes.description"
              )}
            </label>


            <textarea
              value={
                description
              }
              disabled={
                creating
              }
              placeholder={t(
                "entityTypes.descriptionPlaceholder"
              )}
              onChange={(
                event
              ) =>
                setDescription(
                  event.target.value
                )
              }
            />


            <div className="form-buttons">
              <button
                type="button"
                className="cancel-button"
                disabled={
                  creating
                }
                onClick={() => {
                  setShowCreateForm(
                    false
                  );


                  setErrorMessage(
                    ""
                  );
                }}
              >
                {t(
                  "worlds.cancel"
                )}
              </button>


              <button
                type="submit"
                className="save-button"
                disabled={
                  creating ||
                  !name.trim()
                }
              >
                {creating
                  ? "..."
                  : t(
                      "entityTypes.create"
                    )}
              </button>
            </div>
          </form>
        </div>
      )}


      <div className="entity-type-grid">
        {entityTypes.map(
          (
            entityType
          ) => (
            <button
              type="button"
              className="entity-type-card"
              key={
                entityType._id
              }
              onClick={() =>
                openEntityType(
                  entityType._id
                )
              }
            >
              <div className="entity-type-icon">
                {entityType.icon ||
                  "📄"}
              </div>


              <div className="entity-type-info">
                <h2>
                  {
                    entityType.name
                  }
                </h2>


                <p>
                  {entityType.description ||
                    t(
                      "entityTypes.noDescription"
                    )}
                </p>
              </div>
            </button>
          )
        )}
      </div>


      {entityTypes.length ===
        0 && (
        <div className="empty-state">
          <h2>
            {t(
              "entityTypes.emptyTitle"
            )}
          </h2>


          <p>
            {t(
              "entityTypes.emptyDescription"
            )}
          </p>
        </div>
      )}
    </WorldLayout>
  );
}


export default EntityTypesPage;