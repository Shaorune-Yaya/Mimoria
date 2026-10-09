import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useTranslation,
} from "react-i18next";

import AppHeader from "../components/AppHeader";

import {
  useOnboarding,
} from "../onboarding/OnboardingContext";

import {
  API_URL,
} from "../config/api";

import {
  apiFetch,
} from "../utils/apiFetch";


function WorldsPage() {
  const {
    t,
    i18n,
  } =
    useTranslation();


  const navigate =
    useNavigate();


  const {
    startOnboarding,

    active,

    currentStep,

    nextStep,

    tutorialWorldId,

    setTutorialWorldId,
  } =
    useOnboarding();


  // ====================================================
  // State
  // ====================================================

  const [
    worlds,
    setWorlds,
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
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    creating,
    setCreating,
  ] =
    useState(
      false
    );


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      ""
    );


  const [
    openMenuWorldId,
    setOpenMenuWorldId,
  ] =
    useState(
      null
    );


  const [
    deleteWorldTarget,
    setDeleteWorldTarget,
  ] =
    useState(
      null
    );


  const [
    deleteConfirmation,
    setDeleteConfirmation,
  ] =
    useState(
      ""
    );


  const [
    deletingWorld,
    setDeletingWorld,
  ] =
    useState(
      false
    );


  const [
    deleteError,
    setDeleteError,
  ] =
    useState(
      ""
    );


  // ====================================================
  // Delete Confirmation
  // ====================================================

  const requiredDeletePhrase =
    t(
      "worlds.deleteConfirmationPhrase"
    );


  const deleteConfirmationMatches =
    useMemo(
      () => {
        const entered =
          deleteConfirmation
            .trim()
            .toLocaleLowerCase();


        const required =
          requiredDeletePhrase
            .trim()
            .toLocaleLowerCase();


        return (
          entered ===
          required
        );
      },
      [
        deleteConfirmation,
        requiredDeletePhrase,
      ]
    );


  // ====================================================
  // Load Worlds
  // ====================================================

  async function fetchWorlds() {
    try {
      setLoading(
        true
      );


      setErrorMessage(
        ""
      );


      const data =
        await apiFetch(
          API_URL.worlds
        );


      setWorlds(
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
        "Failed to fetch worlds:",
        error
      );


      setErrorMessage(
        error.message ||
        t(
          "worlds.loadFailed"
        )
      );
    } finally {
      setLoading(
        false
      );
    }
  }


  // ====================================================
  // Open Create World
  // ====================================================

  function openCreateWorld() {
    setErrorMessage(
      ""
    );


    const isTutorialStep =
      currentStep?.id ===
      "open-create-world";


    if (
      isTutorialStep
    ) {
      setName(
        t(
          "onboarding.tutorialWorldName"
        )
      );


      setDescription(
        t(
          "onboarding.tutorialWorldDescription"
        )
      );
    }


    setShowCreateForm(
      true
    );
  }


  // ====================================================
  // Advance From "Open Create World"
  // ====================================================

  useEffect(
    () => {
      if (
        !showCreateForm ||
        currentStep?.id !==
          "open-create-world"
      ) {
        return;
      }


      let cancelled =
        false;


      let frameId =
        null;


      let attempts =
        0;


      function waitForCreateButton() {
        if (
          cancelled
        ) {
          return;
        }


        const button =
          document.querySelector(
            '[data-onboarding="confirm-create-world"]'
          );


        if (
          button
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
              waitForCreateButton
            );
        }
      }


      frameId =
        window.requestAnimationFrame(
          waitForCreateButton
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
  // Create World
  // ====================================================

  async function createWorld(
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
      "confirm-create-world";


    try {
      setCreating(
        true
      );


      setErrorMessage(
        ""
      );


      const newWorld =
        await apiFetch(
          isTutorialCreation
            ? `${API_URL.worlds}/tutorial`
            : API_URL.worlds,

          {
            method:
              "POST",

            body: {
              name:
                normalizedName,

              description:
                description.trim(),

              icon:
                isTutorialCreation
                  ? "🌱"
                  : "🌍",

              language:
                i18n.language,
            },
          }
        );


      if (
        !newWorld?._id
      ) {
        throw new Error(
          "Created world did not return an ID."
        );
      }


      setWorlds(
        (
          currentWorlds
        ) => {
          const alreadyExists =
            currentWorlds.some(
              (
                world
              ) =>
                world._id ===
                newWorld._id
            );


          if (
            alreadyExists
          ) {
            return currentWorlds;
          }


          return [
            newWorld,
            ...currentWorlds,
          ];
        }
      );


      setName(
        ""
      );


      setDescription(
        ""
      );


      setShowCreateForm(
        false
      );


      if (
        isTutorialCreation
      ) {
        setTutorialWorldId(
          newWorld._id
        );


        nextStep();


        navigate(
          `/world/${newWorld._id}`
        );


        return;
      }
    } catch (
      error
    ) {
      console.error(
        "Failed to create world:",
        error
      );


      setErrorMessage(
        error.message ||
        t(
          "worlds.createFailed"
        )
      );
    } finally {
      setCreating(
        false
      );
    }
  }


  // ====================================================
  // Cancel Create
  // ====================================================

  function cancelCreateWorld() {
    setShowCreateForm(
      false
    );


    setName(
      ""
    );


    setDescription(
      ""
    );


    setErrorMessage(
      ""
    );
  }


  // ====================================================
  // World Menu
  // ====================================================

  function toggleWorldMenu(
    event,
    worldId
  ) {
    event.preventDefault();

    event.stopPropagation();


    setOpenMenuWorldId(
      (
        current
      ) =>
        current ===
        worldId
          ? null
          : worldId
    );
  }


  // ====================================================
  // Open Delete Dialog
  // ====================================================

  function openDeleteWorldDialog(
    event,
    world
  ) {
    event.preventDefault();

    event.stopPropagation();


    setOpenMenuWorldId(
      null
    );


    setDeleteWorldTarget(
      world
    );


    setDeleteConfirmation(
      ""
    );


    setDeleteError(
      ""
    );
  }


  // ====================================================
  // Close Delete Dialog
  // ====================================================

  function closeDeleteWorldDialog() {
    if (
      deletingWorld
    ) {
      return;
    }


    setDeleteWorldTarget(
      null
    );


    setDeleteConfirmation(
      ""
    );


    setDeleteError(
      ""
    );
  }


  // ====================================================
  // Tutorial Delete Confirmation
  //
  // When the tutorial reaches the typing step, advance
  // only after the required phrase has been entered.
  // ====================================================

  useEffect(
    () => {
      if (
        !active ||
        currentStep?.id !==
          "type-delete-world" ||
        !deleteConfirmationMatches
      ) {
        return;
      }


      nextStep();
    },
    [
      active,
      currentStep?.id,
      deleteConfirmationMatches,
      nextStep,
    ]
  );


  // ====================================================
  // Delete World
  // ====================================================

  async function deleteWorld() {
    if (
      !deleteWorldTarget?._id ||
      !deleteConfirmationMatches ||
      deletingWorld
    ) {
      return;
    }


    const worldId =
      deleteWorldTarget._id;


    const isTutorialWorld =
      String(
        tutorialWorldId ||
        ""
      ) ===
      String(
        worldId
      );


    const isTutorialDeleteStep =
      currentStep?.id ===
      "confirm-delete-world";


    try {
      setDeletingWorld(
        true
      );


      setDeleteError(
        ""
      );


      await apiFetch(
        `${API_URL.worlds}/${worldId}`,
        {
          method:
            "DELETE",
        }
      );


      setWorlds(
        (
          currentWorlds
        ) =>
          currentWorlds.filter(
            (
              world
            ) =>
              String(
                world._id
              ) !==
              String(
                worldId
              )
          )
      );


      if (
        isTutorialWorld
      ) {
        setTutorialWorldId(
          null
        );
      }


      setDeleteWorldTarget(
        null
      );


      setDeleteConfirmation(
        ""
      );


      setOpenMenuWorldId(
        null
      );


      if (
        isTutorialDeleteStep
      ) {
        nextStep();
      }
    } catch (
      error
    ) {
      console.error(
        "Failed to delete world:",
        error
      );


      setDeleteError(
        error.message ||
        t(
          "worlds.deleteFailed"
        )
      );
    } finally {
      setDeletingWorld(
        false
      );
    }
  }


  // ====================================================
  // Navigation
  // ====================================================

  function openWorld(
    worldId
  ) {
    navigate(
      `/world/${worldId}`
    );
  }


  // ====================================================
  // Initial Load
  // ====================================================

  useEffect(
    () => {
      fetchWorlds();
    },
    []
  );


  // ====================================================
  // Test Onboarding
  // ====================================================

  function startTestOnboarding() {
  setShowCreateForm(
    false
  );


  setName(
    ""
  );


  setDescription(
    ""
  );


  setErrorMessage(
    ""
  );


  setOpenMenuWorldId(
    null
  );


  setDeleteWorldTarget(
    null
  );


  startOnboarding([
    // ==================================================
    // Step 1
    // Welcome
    // ==================================================

    {
      id:
        "welcome",

      type:
        "welcome",

      titleKey:
        "onboarding.welcomeTitle",

      descriptionKey:
        "onboarding.welcomeDescription",
    },


    // ==================================================
    // Step 2
    // Create World Button
    // ==================================================

    {
      id:
        "open-create-world",

      selector:
        '[data-onboarding="new-world"]',

      titleKey:
        "onboarding.createWorldTitle",

      descriptionKey:
        "onboarding.createWorldDescription",

      placement:
        "right",

      advanceOn:
        "external",
    },


    // ==================================================
    // Step 3
    // Confirm Tutorial World
    // ==================================================

    {
      id:
        "confirm-create-world",

      selector:
        '[data-onboarding="confirm-create-world"]',

      focusSelector:
        '[data-onboarding="create-world-panel"]',

      titleKey:
        "onboarding.confirmWorldTitle",

      descriptionKey:
        "onboarding.confirmWorldDescription",

      placement:
        "right",

      arrowPlacement:
        "top",

      advanceOn:
        "external",
    },


    // ==================================================
    // Step 4
    // Entity Types Navigation
    // ==================================================

    {
      id:
        "entity-types-nav",

      selector:
        '[data-onboarding="entity-types-nav"]',

      titleKey:
        "onboarding.entityTypesTitle",

      descriptionKey:
        "onboarding.entityTypesDescription",

      placement:
        "right",

      advanceOn:
        "target-click",

      arrowPlacement:
        "left",
    },


    // ==================================================
    // Step 5
    // New Entity Type
    // ==================================================

    {
      id:
        "open-create-entity-type",

      selector:
        '[data-onboarding="new-entity-type"]',

      titleKey:
        "onboarding.createEntityTypeTitle",

      descriptionKey:
        "onboarding.createEntityTypeDescription",

      placement:
        "bottom",

      arrowPlacement:
        "top",

      advanceOn:
        "external",
    },


    // ==================================================
    // Step 6
    // Entity Type Name
    // ==================================================

    {
      id:
        "entity-type-name",

      selector:
        '[data-onboarding="entity-type-name"]',

      focusSelector:
        '[data-onboarding="create-entity-type-panel"]',

      titleKey:
        "onboarding.entityTypeNameTitle",

      descriptionKey:
        "onboarding.entityTypeNameDescription",

      placement:
        "right",

      arrowPlacement:
        "left",
    },


    // ==================================================
    // Step 7
    // Entity Type Icon
    // ==================================================

    {
      id:
        "entity-type-icon",

      selector:
        '[data-onboarding="entity-type-icon"]',

      focusSelector:
        '[data-onboarding="create-entity-type-panel"]',

      titleKey:
        "onboarding.entityTypeIconTitle",

      descriptionKey:
        "onboarding.entityTypeIconDescription",

      placement:
        "right",
      
      arrowPlacement:
        "left",
    },


    // ==================================================
    // Step 8
    // Entity Type Description
    // ==================================================

    {
      id:
        "entity-type-description",

      selector:
        '[data-onboarding="entity-type-description"]',

      focusSelector:
        '[data-onboarding="create-entity-type-panel"]',

      titleKey:
        "onboarding.entityTypeDescriptionTitle",

      descriptionKey:
        "onboarding.entityTypeDescriptionDescription",

      placement:
        "right",

      arrowPlacement:
        "left",
    },


    // ==================================================
    // Step 9
    // Confirm Entity Type Creation
    // ==================================================

    {
      id:
        "confirm-create-entity-type",

      selector:
        '[data-onboarding="confirm-create-entity-type"]',

      focusSelector:
        '[data-onboarding="create-entity-type-panel"]',

      titleKey:
        "onboarding.confirmEntityTypeTitle",

      descriptionKey:
        "onboarding.confirmEntityTypeDescription",

      placement:
        "right",

      advanceOn:
        "external",

      arrowPlacement:
        "left",

    },


    // ==================================================
    // Step 10
    // Open Newly Created Entity Type
    // ==================================================

    {
      id:
        "open-tutorial-entity-type",

      selector:
        '[data-onboarding="tutorial-entity-type-card"]',

      titleKey:
        "onboarding.openEntityTypeTitle",

      descriptionKey:
        "onboarding.openEntityTypeDescription",

      placement:
        "right",

      advanceOn:
        "target-click",
      
      arrowPlacement:
        "left",
    },

    // ==================================================
    // Step 11
    // Explain Fields
    // ==================================================

    {
      id:
        "schema-fields-overview",

      selector:
        '[data-onboarding="schema-fields-section"]',

      titleKey:
        "onboarding.fieldsOverviewTitle",

      descriptionKey:
        "onboarding.fieldsOverviewDescription",

      placement:
        "right",
    },


    // ==================================================
    // Step 12
    // Add Field
    // ==================================================

    {
      id:
        "open-add-field",

      selector:
        '[data-onboarding="add-field-button"]',

      titleKey:
        "onboarding.addFieldTitle",

      descriptionKey:
        "onboarding.addFieldDescription",

      placement:
        "bottom",

      advanceOn:
        "external",
    },


    // ==================================================
    // Step 13
    // Field Name
    // ==================================================

    {
      id:
        "field-name",

      selector:
        '[data-onboarding="tutorial-field-name"]',

      focusSelector:
        '[data-onboarding="field-form-panel"]',

      titleKey:
        "onboarding.fieldNameTitle",

      descriptionKey:
        "onboarding.fieldNameDescription",

      placement:
        "right",
    },


    // ==================================================
    // Step 14
    // Field Type
    // ==================================================

    {
      id:
        "field-type",

      selector:
        '[data-onboarding="tutorial-field-type"]',

      focusSelector:
        '[data-onboarding="field-form-panel"]',

      titleKey:
        "onboarding.fieldTypeTitle",

      descriptionKey:
        "onboarding.fieldTypeDescription",

      placement:
        "right",
    },


    // ==================================================
    // Step 15
    // Required
    // ==================================================

    {
      id:
        "field-required",

      selector:
        '[data-onboarding="tutorial-field-required"]',

      focusSelector:
        '[data-onboarding="field-form-panel"]',

      titleKey:
        "onboarding.fieldRequiredTitle",

      descriptionKey:
        "onboarding.fieldRequiredDescription",

      placement:
        "right",
    },


    // ==================================================
    // Step 16
    // Save Field
    // ==================================================

    {
      id:
        "confirm-add-field",

      selector:
        '[data-onboarding="confirm-add-field"]',

      focusSelector:
        '[data-onboarding="field-form-panel"]',

      titleKey:
        "onboarding.confirmFieldTitle",

      descriptionKey:
        "onboarding.confirmFieldDescription",

      placement:
        "right",

      advanceOn:
        "external",
    },


    // ==================================================
    // Step 17
    // Created Field
    // ==================================================

    {
      id:
        "tutorial-field-created",

      selector:
        '[data-onboarding="tutorial-created-field"]',

      titleKey:
        "onboarding.fieldCreatedTitle",

      descriptionKey:
        "onboarding.fieldCreatedDescription",

      placement:
        "right",
    },


    // ==================================================
    // Step 18
    // Entities
    // ==================================================

    {
      id:
        "entities-nav",

      selector:
        '[data-onboarding="entities-nav"]',

      titleKey:
        "onboarding.entitiesNextTitle",

      descriptionKey:
        "onboarding.entitiesNextDescription",

      placement:
        "right",

      advanceOn:
        "target-click",
    },

    // ==================================================
    // Step 19
    // Entities Overview
    // ==================================================

    {
      id:
        "entities-overview",

      selector:
        '[data-onboarding="entities-page-header"]',

      titleKey:
        "onboarding.entitiesOverviewTitle",

      descriptionKey:
        "onboarding.entitiesOverviewDescription",

      placement:
        "bottom",
    },


    // ==================================================
    // Step 20
    // New Entity
    // ==================================================

    {
      id:
        "open-create-entity",

      selector:
        '[data-onboarding="new-entity-button"]',

      titleKey:
        "onboarding.createEntityTitle",

      descriptionKey:
        "onboarding.createEntityDescription",

      placement:
        "right",

      advanceOn:
        "external",
    },


    // ==================================================
    // Step 21
    // Entity Type
    // ==================================================

    {
      id:
        "tutorial-entity-type",

      selector:
        '[data-onboarding="tutorial-entity-type"]',

      focusSelector:
        '[data-onboarding="create-entity-panel"]',

      titleKey:
        "onboarding.entityTypeSelectionTitle",

      descriptionKey:
        "onboarding.entityTypeSelectionDescription",

      placement:
        "right",
    },


    // ==================================================
    // Step 22
    // Entity Name
    // ==================================================

    {
      id:
        "tutorial-entity-name",

      selector:
        '[data-onboarding="tutorial-entity-name"]',

      focusSelector:
        '[data-onboarding="create-entity-panel"]',

      titleKey:
        "onboarding.entityNameTitle",

      descriptionKey:
        "onboarding.entityNameDescription",

      placement:
        "right",
    },


    // ==================================================
    // Step 23
    // Custom Field
    // ==================================================

    {
      id:
        "tutorial-entity-custom-field",

      selector:
        '[data-onboarding="tutorial-entity-custom-field"]',

      focusSelector:
        '[data-onboarding="create-entity-panel"]',

      titleKey:
        "onboarding.entityCustomFieldTitle",

      descriptionKey:
        "onboarding.entityCustomFieldDescription",

      placement:
        "right",
    },


    // ==================================================
    // Step 24
    // Create Entity
    // ==================================================

    {
      id:
        "confirm-create-entity",

      selector:
        '[data-onboarding="confirm-create-entity"]',

      focusSelector:
        '[data-onboarding="create-entity-panel"]',

      titleKey:
        "onboarding.confirmCreateEntityTitle",

      descriptionKey:
        "onboarding.confirmCreateEntityDescription",

      placement:
        "right",

      advanceOn:
        "external",
    },


    // ==================================================
    // Step 25
    // Entity Detail
    // ==================================================

    {
      id:
        "tutorial-entity-detail",

      selector:
        '[data-onboarding="tutorial-entity-detail"]',

      titleKey:
        "onboarding.entityDetailTitle",

      descriptionKey:
        "onboarding.entityDetailDescription",

      placement:
        "right",
    },


    // ==================================================
    // Step 26
    // Edit Entity
    // ==================================================

    {
      id:
        "open-edit-tutorial-entity",

      selector:
        '[data-onboarding="tutorial-entity-edit-button"]',

      titleKey:
        "onboarding.editEntityTitle",

      descriptionKey:
        "onboarding.editEntityDescription",

      placement:
        "left",

      advanceOn:
        "external",
    },


    // ==================================================
    // Step 27
    // Edit Custom Field
    // ==================================================

    {
      id:
        "tutorial-entity-edit-field",

      selector:
        '[data-onboarding="tutorial-entity-edit-field"]',

      focusSelector:
        '[data-onboarding="tutorial-entity-edit-panel"]',

      titleKey:
        "onboarding.editEntityFieldTitle",

      descriptionKey:
        "onboarding.editEntityFieldDescription",

      placement:
        "right",
    },


    // ==================================================
    // Step 28
    // Save Entity Edit
    // ==================================================

    {
      id:
        "confirm-edit-tutorial-entity",

      selector:
        '[data-onboarding="confirm-edit-tutorial-entity"]',

      focusSelector:
        '[data-onboarding="tutorial-entity-edit-panel"]',

      titleKey:
        "onboarding.saveEntityEditTitle",

      descriptionKey:
        "onboarding.saveEntityEditDescription",

      placement:
        "right",

      advanceOn:
        "external",
    },


    // ==================================================
    // Step 29
    // Entity Tree
    // ==================================================

    {
      id:
        "tutorial-entity-tree",

      selector:
        '[data-onboarding="selected-entity-tree-row"]',

      titleKey:
        "onboarding.entityTreeTitle",

      descriptionKey:
        "onboarding.entityTreeDescription",

      placement:
        "right",
    },

    // ==================================================
    // Step 30
    // Ultrawide Secondary Workspace
    // ==================================================

    {
      id:
        "secondary-workspace-overview",

      selector:
        '[data-onboarding="secondary-workspace"]',

      titleKey:
        "onboarding.secondaryWorkspaceTitle",

      descriptionKey:
        "onboarding.secondaryWorkspaceDescription",

      placement:
        "left",

      requiresUltrawide:
        true,
    },


    // ==================================================
    // Step 31
    // Workspace Splitter
    // ==================================================

    {
      id:
        "workspace-splitter",

      selector:
        '[data-onboarding="workspace-splitter"]',

      titleKey:
        "onboarding.workspaceSplitterTitle",

      descriptionKey:
        "onboarding.workspaceSplitterDescription",

      placement:
        "right",

      requiresUltrawide:
        true,
    },


    // ==================================================
    // Step 32
    // Dock Handle
    // ==================================================

    {
      id:
        "entities-dock-handle",

      selector:
        '[data-onboarding="entities-dock-handle"]',

      titleKey:
        "onboarding.dockHandleTitle",

      descriptionKey:
        "onboarding.dockHandleDescription",

      placement:
        "right",

      requiresUltrawide:
        true,
    },


    // ==================================================
    // Step 33
    // Docking Area
    // ==================================================

    {
      id:
        "workspace-docking-area",

      selector:
        '[data-onboarding="secondary-workspace"]',

      titleKey:
        "onboarding.dockingAreaTitle",

      descriptionKey:
        "onboarding.dockingAreaDescription",

      placement:
        "left",

      requiresUltrawide:
        true,
    },


    // ==================================================
    // Step 34
    // Documents
    // ==================================================

    {
      id:
        "documents-nav",

      selector:
        '[data-onboarding="documents-nav"]',

      titleKey:
        "onboarding.documentsNextTitle",

      descriptionKey:
        "onboarding.documentsNextDescription",

      placement:
        "right",

      advanceOn:
        "target-click",
    },

  ]);
}

  // ====================================================
  // Render
  // ====================================================

  return (
    <div className="app">
      <AppHeader />


      <button
        type="button"
        className="onboarding-debug-button"
        onClick={
          startTestOnboarding
        }
      >
        Test Onboarding
      </button>


      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>
              {t(
                "worlds.title"
              )}
            </h1>

            <p>
              {t(
                "worlds.subtitle"
              )}
            </p>
          </div>


          <button
            type="button"
            className="create-button"
            data-onboarding="new-world"
            onClick={
              openCreateWorld
            }
          >
            {t(
              "worlds.newWorld"
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
            data-onboarding="create-world-panel"
          >
            <h2>
              {t(
                "worlds.createTitle"
              )}
            </h2>


            <form
              onSubmit={
                createWorld
              }
            >
              <label
                htmlFor="world-name"
              >
                {t(
                  "worlds.name"
                )}
              </label>


              <input
                id="world-name"
                type="text"
                placeholder={t(
                  "worlds.namePlaceholder"
                )}
                value={
                  name
                }
                disabled={
                  creating
                }
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
              />


              <label
                htmlFor="world-description"
              >
                {t(
                  "worlds.description"
                )}
              </label>


              <textarea
                id="world-description"
                placeholder={t(
                  "worlds.descriptionPlaceholder"
                )}
                value={
                  description
                }
                disabled={
                  creating
                }
                onChange={(event) =>
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
                    cancelCreateWorld
                  }
                >
                  {t(
                    "worlds.cancel"
                  )}
                </button>


                <button
                  type="submit"
                  className="save-button"
                  data-onboarding="confirm-create-world"
                  disabled={
                    creating ||
                    !name.trim()
                  }
                >
                  {creating
                    ? "..."
                    : t(
                        "worlds.create"
                      )}
                </button>
              </div>
            </form>
          </div>
        )}


        {loading ? (
          <div className="empty-state">
            <p>
              {t(
                "worlds.loading"
              )}
            </p>
          </div>
        ) : (
          <>
            <div className="world-grid">
              {worlds.map(
                (
                  world
                ) => {
                  const isTutorialWorld =
                    String(
                      tutorialWorldId ||
                      ""
                    ) ===
                    String(
                      world._id
                    );


                  return (
                    <div
                      className="world-card"
                      key={
                        world._id
                      }
                      onClick={() =>
                        openWorld(
                          world._id
                        )
                      }
                    >
                      <div className="world-icon">
                        {world.icon ||
                          "🌍"}
                      </div>


                      <div className="world-info">
                        <h2>
                          {
                            world.name
                          }
                        </h2>


                        <p>
                          {world.description ||
                            t(
                              "worlds.noDescription"
                            )}
                        </p>


                        <span className="updated-time">
                          {t(
                            "worlds.updated"
                          )}{" "}

                          {new Date(
                            world.updatedAt
                          )
                            .toLocaleDateString(
                              i18n.language ===
                                "zh-CN"
                                ? "zh-CN"
                                : "en-US"
                            )}
                        </span>
                      </div>


                      <div className="world-card-actions">
                        <button
                          type="button"
                          className="world-more-button"
                          aria-label={t(
                            "worlds.moreActions"
                          )}
                          data-onboarding={
                            isTutorialWorld
                              ? "tutorial-world-menu"
                              : undefined
                          }
                          onClick={(
                            event
                          ) =>
                            toggleWorldMenu(
                              event,
                              world._id
                            )
                          }
                        >
                          ⋯
                        </button>


                        {openMenuWorldId ===
                          world._id && (
                          <div
                            className="world-context-menu"
                            onClick={(
                              event
                            ) =>
                              event.stopPropagation()
                            }
                          >
                            <button
                              type="button"
                              className="world-context-item danger"
                              data-onboarding={
                                isTutorialWorld
                                  ? "tutorial-world-delete"
                                  : undefined
                              }
                              onClick={(
                                event
                              ) =>
                                openDeleteWorldDialog(
                                  event,
                                  world
                                )
                              }
                            >
                              {t(
                                "worlds.delete"
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>


            {worlds.length ===
              0 && (
              <div className="empty-state">
                <h2>
                  {t(
                    "worlds.emptyTitle"
                  )}
                </h2>

                <p>
                  {t(
                    "worlds.emptyDescription"
                  )}
                </p>
              </div>
            )}
          </>
        )}
      </main>


      {deleteWorldTarget && (
        <div
          className="world-delete-backdrop"
          onMouseDown={
            closeDeleteWorldDialog
          }
        >
          <div
            className="world-delete-dialog"
            data-onboarding="delete-world-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-world-title"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="world-delete-header">
              <div>
                <h2
                  id="delete-world-title"
                >
                  {t(
                    "worlds.deleteTitle"
                  )}
                </h2>

                <p>
                  {t(
                    "worlds.deleteWarning"
                  )}
                </p>
              </div>


              <button
                type="button"
                className="world-delete-close"
                aria-label={t(
                  "worlds.closeDeleteDialog"
                )}
                disabled={
                  deletingWorld
                }
                onClick={
                  closeDeleteWorldDialog
                }
              >
                ×
              </button>
            </div>


            <div className="world-delete-target">
              <div className="world-delete-target-icon">
                {deleteWorldTarget.icon ||
                  "🌍"}
              </div>

              <div>
                <strong>
                  {
                    deleteWorldTarget.name
                  }
                </strong>

                <span>
                  {deleteWorldTarget.description ||
                    t(
                      "worlds.noDescription"
                    )}
                </span>
              </div>
            </div>


            <div className="world-delete-danger-note">
              {t(
                "worlds.deleteDataWarning"
              )}
            </div>


            <label
              className="world-delete-confirm-label"
              htmlFor="delete-world-confirmation"
            >
              {t(
                "worlds.typeToDelete",
                {
                  phrase:
                    requiredDeletePhrase,
                }
              )}
            </label>


            <input
              id="delete-world-confirmation"
              type="text"
              className="world-delete-confirm-input"
              data-onboarding="delete-world-confirmation-input"
              value={
                deleteConfirmation
              }
              disabled={
                deletingWorld
              }
              autoComplete="off"
              spellCheck="false"
              placeholder={
                requiredDeletePhrase
              }
              onChange={(
                event
              ) =>
                setDeleteConfirmation(
                  event.target.value
                )
              }
            />


            {deleteError && (
              <div className="world-delete-error">
                {
                  deleteError
                }
              </div>
            )}


            <div className="world-delete-actions">
              <button
                type="button"
                className="world-delete-cancel"
                disabled={
                  deletingWorld
                }
                onClick={
                  closeDeleteWorldDialog
                }
              >
                {t(
                  "worlds.cancel"
                )}
              </button>


              <button
                type="button"
                className="world-delete-confirm-button"
                data-onboarding="confirm-delete-world"
                disabled={
                  deletingWorld ||
                  !deleteConfirmationMatches
                }
                onClick={
                  deleteWorld
                }
              >
                {deletingWorld
                  ? t(
                      "worlds.deleting"
                    )
                  : t(
                      "worlds.deleteWorld"
                    )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default WorldsPage;