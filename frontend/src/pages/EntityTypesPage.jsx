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

import EmbeddedWorkspaceLayout from "../components/EmbeddedWorkspaceLayout";

import {
  API_URL,
} from "../config/api";

import {
  apiFetch,
} from "../utils/apiFetch";

import {
  useOnboarding,
} from "../onboarding/OnboardingContext";


function EntityTypesPage({
  embedded = false,
}) {
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


  const {
    currentStep,

    nextStep,

    tutorialEntityTypeId,

    setTutorialEntityTypeId,
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
  // Open Create Entity Type
  // ====================================================

  function openCreateEntityType() {
    setErrorMessage(
      ""
    );


    const isTutorialStep =
      currentStep?.id ===
      "open-create-entity-type";


    if (
      isTutorialStep
    ) {
      setName(
        t(
          "onboarding.tutorialEntityTypeName"
        )
      );


      setIcon(
        "👤"
      );


      setDescription(
        t(
          "onboarding.tutorialEntityTypeDescription"
        )
      );
    }


    setShowCreateForm(
      true
    );
  }


  // ====================================================
  // Advance After Create Form Mounts
  //
  // Step:
  // open-create-entity-type
  //
  // The tutorial only moves forward once the actual form
  // exists in the DOM.
  // ====================================================

  useEffect(
    () => {
      if (
        !showCreateForm ||
        currentStep?.id !==
          "open-create-entity-type"
      ) {
        return;
      }


      let cancelled =
        false;


      let frameId =
        null;


      let attempts =
        0;


      function waitForForm() {
        if (
          cancelled
        ) {
          return;
        }


        const panel =
          document.querySelector(
            '[data-onboarding="create-entity-type-panel"]'
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
              waitForForm
            );
        }
      }


      frameId =
        window.requestAnimationFrame(
          waitForForm
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
      showCreateForm,
      currentStep?.id,
      nextStep,
    ]
  );


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


    const isTutorialCreation =
      currentStep?.id ===
      "confirm-create-entity-type";


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


      if (
        !newEntityType?._id
      ) {
        throw new Error(
          "Created entity type did not return an ID."
        );
      }


      setEntityTypes(
        (
          current
        ) => [
          ...current,
          newEntityType,
        ]
      );


      if (
        isTutorialCreation
      ) {
        setTutorialEntityTypeId(
          newEntityType._id
        );
      }


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


      if (
        isTutorialCreation
      ) {
        nextStep();
      }
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
  // Cancel Create Entity Type
  // ====================================================

  function cancelCreateEntityType() {
    setShowCreateForm(
      false
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


    setErrorMessage(
      ""
    );
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
  // Layout
  // ====================================================

  const LayoutComponent =
    embedded
      ? EmbeddedWorkspaceLayout
      : WorldLayout;


  // ====================================================
  // Render
  // ====================================================

  return (
    <LayoutComponent
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
          data-onboarding="new-entity-type"
          onClick={
            openCreateEntityType
          }
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
        <div
          className="create-panel"
          data-onboarding="create-entity-type-panel"
        >
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
              data-onboarding="entity-type-name"
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
              data-onboarding="entity-type-icon"
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
              data-onboarding="entity-type-description"
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
                onClick={
                  cancelCreateEntityType
                }
              >
                {t(
                  "worlds.cancel"
                )}
              </button>


              <button
                type="submit"
                className="save-button"
                data-onboarding="confirm-create-entity-type"
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
          ) => {
            const isTutorialEntityType =
              String(
                tutorialEntityTypeId ||
                ""
              ) ===
              String(
                entityType._id
              );


            return (
              <button
                type="button"
                className="entity-type-card"
                key={
                  entityType._id
                }
                data-onboarding={
                  isTutorialEntityType
                    ? "tutorial-entity-type-card"
                    : undefined
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
            );
          }
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
    </LayoutComponent>
  );
}


export default EntityTypesPage;