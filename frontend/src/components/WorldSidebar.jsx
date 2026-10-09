import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useTranslation,
} from "react-i18next";

import {
  WORKSPACE_VIEWS,
} from "../config/workspaceViews";


function WorldSidebar({
  worldId,
  variant = "desktop",
  onNavigate = null,
}) {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const { t } =
    useTranslation();

  const basePath =
    `/world/${worldId}`;


  // ======================================================
  // Navigation
  // ======================================================

  function isExact(
    path
  ) {
    return (
      location.pathname ===
      path
    );
  }


  function isSection(
    path
  ) {
    return (
      location.pathname ===
        path ||
      location.pathname.startsWith(
        `${path}/`
      )
    );
  }


  function goTo(
    path
  ) {
    navigate(
      path
    );


    if (
      onNavigate
    ) {
      onNavigate();
    }
  }


  // ======================================================
  // Workspace Drag
  // ======================================================

  function handleWorkspaceDragStart(
    event,
    viewId
  ) {
    if (
      variant ===
      "drawer"
    ) {
      event.preventDefault();

      return;
    }


    event.dataTransfer.effectAllowed =
      "move";


    event.dataTransfer.setData(
      "application/x-mimoria-workspace",
      viewId
    );


    event.dataTransfer.setData(
      "text/plain",
      viewId
    );
  }


  // ======================================================
  // Workspace Item
  // ======================================================

  function renderWorkspaceItem(
    view
  ) {
    const path =
      view.path
        ? `${basePath}/${view.path}`
        : null;


    const active =
      path
        ? isSection(
            path
          )
        : false;


    const canNavigate =
      view.mainRouteAvailable &&
      path;


    function handleDockDragStart(
      event
    ) {
      if (
        variant ===
        "drawer" ||
        !view.dockable
      ) {
        event.preventDefault();

        return;
      }


      event.stopPropagation();


      event.dataTransfer.effectAllowed =
        "move";


      event.dataTransfer.setData(
        "application/x-mimoria-workspace",
        view.id
      );


      event.dataTransfer.setData(
        "text/plain",
        view.id
      );
    }


    return (
      <div
        key={
          view.id
        }
        className={[
          "sidebar-item-row",

          active
            ? "active"
            : "",

          !canNavigate
            ? "pending"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <button
          type="button"
          data-onboarding={
            view.id ===
              "entity-types"
              ? "entity-types-nav"
              : view.id ===
                  "entities"
                ? "entities-nav"
                : view.id ===
                    "documents"
                  ? "documents-nav"
                  : view.id ===
                      "smart-import"
                    ? "smart-import-nav"
                    : undefined
          }
          className={[
            "sidebar-item",
            "sidebar-item-navigation",

            active
              ? "active"
              : "",

            !canNavigate
              ? "sidebar-item-pending"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-disabled={
            !canNavigate
          }
          onClick={() => {
            if (
              !canNavigate
            ) {
              return;
            }


            goTo(
              path
            );
          }}
        >
          <span className="sidebar-item-main">
            <span className="sidebar-item-icon">
              {view.icon}
            </span>

            <span className="sidebar-item-label">
              {t(
                view.labelKey
              )}
            </span>
          </span>
        </button>


        {view.dockable &&
          variant !==
            "drawer" && (
          <span
            className="sidebar-dock-handle"
            data-onboarding={
              view.id ===
                "entities"
                ? "entities-dock-handle"
                : view.id ===
                    "documents"
                  ? "documents-dock-handle"
                  : undefined
            }
            draggable
            role="button"
            tabIndex={0}
            title={t(
              "workspace.dragToDock",
              {
                defaultValue:
                  "Drag to secondary workspace",
              }
            )}
            aria-label={t(
              "workspace.dragToDock",
              {
                defaultValue:
                  "Drag to secondary workspace",
              }
            )}
            onDragStart={
              handleDockDragStart
            }
            onClick={(
              event
            ) => {
              /*
              * Dock handle should not navigate.
              */
              event.preventDefault();
              event.stopPropagation();
            }}
          >
          </span>
        )}
      </div>
    );
  }


  // ======================================================
  // Groups
  // ======================================================

  const mainViews =
    WORKSPACE_VIEWS.filter(
      (view) =>
        [
          "entity-types",
          "entities",
          "documents",
          "smart-import",
        ].includes(
          view.id
        )
    );


  const futureViews =
    WORKSPACE_VIEWS.filter(
      (view) =>
        [
          "timeline",
          "graph",
        ].includes(
          view.id
        )
    );


  const settingsView =
    WORKSPACE_VIEWS.find(
      (view) =>
        view.id ===
        "settings"
    );


  const sidebarClassName =
    variant ===
    "drawer"
      ? "workspace-sidebar workspace-sidebar--drawer"
      : "workspace-sidebar workspace-sidebar--desktop";


  // ======================================================
  // Render
  // ======================================================

  return (
    <aside
      className={
        sidebarClassName
      }
    >
      <div className="sidebar-section-title">
        {t(
          "workspace.library"
        )}
      </div>


      {/* Home is intentionally not dockable. */}

      <button
        type="button"
        className={
          isExact(
            basePath
          )
            ? "sidebar-item active"
            : "sidebar-item"
        }
        onClick={() =>
          goTo(
            basePath
          )
        }
      >
        <span className="sidebar-item-main">
          <span className="sidebar-item-icon">
           ⌂
          </span>

          <span>
            {t(
              "workspace.home"
            )}
          </span>
        </span>
      </button>


      {mainViews.map(
        renderWorkspaceItem
      )}


      <div className="sidebar-divider" />


      {futureViews.map(
        renderWorkspaceItem
      )}


      <div className="sidebar-spacer" />


      {settingsView &&
        renderWorkspaceItem(
          settingsView
        )}
    </aside>
  );
}


export default WorldSidebar;