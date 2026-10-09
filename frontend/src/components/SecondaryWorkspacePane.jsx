import {
  lazy,
  Suspense,
} from "react";

import {
  useTranslation,
} from "react-i18next";

import {
  DOCKABLE_WORKSPACE_VIEWS,
  getWorkspaceView,
} from "../config/workspaceViews";


const EntityTypesPage =
  lazy(
    () =>
      import(
        "../pages/EntityTypesPage"
      )
  );


const EntitiesPage =
  lazy(
    () =>
      import(
        "../pages/EntitiesPage"
      )
  );


const DocumentsPage =
  lazy(
    () =>
      import(
        "../pages/DocumentsPage"
      )
  );


const SmartImportPage =
  lazy(
    () =>
      import(
        "../pages/SmartImportPage"
      )
  );


function SecondaryWorkspacePane({
  worldId,
  activeView,
  onChangeView,
  onClose,
}) {
  const { t } =
    useTranslation();


  const viewDefinition =
    getWorkspaceView(
      activeView
    );


  // ======================================================
  // Loading
  // ======================================================

  function renderLoading() {
    return (
      <div className="secondary-pane-empty">
        {t(
          "workspace.loading"
        )}
      </div>
    );
  }


  // ======================================================
  // Placeholder
  // ======================================================

  function renderPlaceholder({
    icon,
    title,
    description,
  }) {
    return (
      <div className="secondary-pane-placeholder">
        <div className="secondary-pane-placeholder-icon">
          {icon}
        </div>

        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>
      </div>
    );
  }


  // ======================================================
  // Content
  // ======================================================

  function renderContent() {
    if (
      !activeView
    ) {
      return renderPlaceholder({
        icon:
          "◧",

        title:
          t(
            "workspace.secondaryWorkspace"
          ),

        description:
          t(
            "workspace.secondaryEmpty",
            {
              defaultValue:
                "Drag a workspace from the left navigation or choose one above.",
            }
          ),
      });
    }


    switch (
      activeView
    ) {
      case "entity-types":
        return (
          <Suspense
            fallback={
              renderLoading()
            }
          >
            <EntityTypesPage
              embedded
            />
          </Suspense>
        );


      case "entities":
        return (
          <Suspense
            fallback={
              renderLoading()
            }
          >
            <EntitiesPage
              embedded
            />
          </Suspense>
        );


      case "documents":
        return (
          <Suspense
            fallback={
              renderLoading()
            }
          >
            <DocumentsPage
              embedded
            />
          </Suspense>
        );


      case "smart-import":
        return (
          <Suspense
            fallback={
              renderLoading()
            }
          >
            <SmartImportPage
              embedded
            />
          </Suspense>
        );


      case "timeline":
        return renderPlaceholder({
          icon:
            "◷",

          title:
            t(
              "workspace.timeline"
            ),

          description:
            t(
              "workspace.timelineComingSoon",
              {
                defaultValue:
                  "Timeline workspace is not implemented yet.",
              }
            ),
        });


      case "graph":
        return renderPlaceholder({
          icon:
            "◉",

          title:
            t(
              "workspace.graph"
            ),

          description:
            t(
              "workspace.graphComingSoon",
              {
                defaultValue:
                  "Relationship graph workspace is not implemented yet.",
              }
            ),
        });


      case "settings":
        return renderPlaceholder({
          icon:
            "⚙",

          title:
            t(
              "workspace.settings"
            ),

          description:
            t(
              "workspace.settingsComingSoon",
              {
                defaultValue:
                  "World settings workspace is not implemented yet.",
              }
            ),
        });


      default:
        return renderPlaceholder({
          icon:
            "◧",

          title:
            t(
              "workspace.secondaryWorkspace"
            ),

          description:
            t(
              "workspace.secondaryUnknown",
              {
                defaultValue:
                  "This workspace cannot be displayed here.",
              }
            ),
        });
    }
  }


  // ======================================================
  // Render
  // ======================================================

  return (
    <section className="workspace-secondary-pane">
      <div className="secondary-pane-header">
        <div className="secondary-pane-title">
          <span className="secondary-pane-title-icon">
            {viewDefinition?.icon ||
              "◧"}
          </span>

          <span>
            {viewDefinition
              ? t(
                  viewDefinition.labelKey
                )
              : t(
                  "workspace.secondaryWorkspace"
                )}
          </span>
        </div>


        <div className="secondary-pane-header-actions">
          <select
            className="secondary-pane-view-select"
            value={
              activeView ||
              ""
            }
            aria-label={t(
              "workspace.selectSecondaryView",
              {
                defaultValue:
                  "Secondary workspace view",
              }
            )}
            onChange={(event) =>
              onChangeView(
                event.target.value ||
                null
              )
            }
          >
            <option value="">
              {t(
                "workspace.secondaryEmptyOption",
                {
                  defaultValue:
                    "Empty",
                }
              )}
            </option>


            {DOCKABLE_WORKSPACE_VIEWS.map(
              (view) => (
                <option
                  key={
                    view.id
                  }
                  value={
                    view.id
                  }
                >
                  {view.icon}{" "}
                  {t(
                    view.labelKey
                  )}
                </option>
              )
            )}
          </select>


          <button
            type="button"
            className="secondary-pane-close"
            onClick={
              onClose
            }
            aria-label={t(
              "workspace.closeSecondary"
            )}
            title={t(
              "workspace.closeSecondary"
            )}
          >
            ×
          </button>
        </div>
      </div>


      <div className="secondary-pane-content secondary-pane-content-workspace">
        {renderContent()}
      </div>
    </section>
  );
}


export default SecondaryWorkspacePane;