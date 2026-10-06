import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useTranslation,
} from "react-i18next";

function WorldSidebar({
  worldId,
  variant = "desktop",
  onNavigate = null,
  onDockDragStart = null,
}) {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    t,
  } = useTranslation();

  const basePath =
    `/world/${worldId}`;

  function isExact(path) {
    return (
      location.pathname === path
    );
  }

  function isSection(path) {
    return (
      location.pathname === path ||
      location.pathname.startsWith(
        `${path}/`
      )
    );
  }

  function go(path) {
    navigate(path);

    if (onNavigate) {
      onNavigate();
    }
  }

  function handleDockDragStart(
    event,
    view
  ) {
    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "application/x-mimoria-workspace",
      view
    );

    event.dataTransfer.setData(
      "text/plain",
      view
    );

    if (onDockDragStart) {
      onDockDragStart(view);
    }
  }

  const className =
    variant === "drawer"
      ? "workspace-sidebar workspace-sidebar--drawer"
      : "workspace-sidebar workspace-sidebar--desktop";

  return (
    <aside className={className}>
      <div className="sidebar-section-title">
        {t(
          "workspace.library"
        )}
      </div>

      <button
        type="button"
        className={
          isExact(basePath)
            ? "sidebar-item active"
            : "sidebar-item"
        }
        onClick={() =>
          go(basePath)
        }
      >
        {t(
          "workspace.home"
        )}
      </button>

      <button
        type="button"
        draggable={
          variant ===
          "desktop"
        }
        className={
          isSection(
            `${basePath}/entity-types`
          )
            ? "sidebar-item active dockable-sidebar-item"
            : "sidebar-item dockable-sidebar-item"
        }
        onClick={() =>
          go(
            `${basePath}/entity-types`
          )
        }
        onDragStart={(event) =>
          handleDockDragStart(
            event,
            "entity-types"
          )
        }
      >
        {t(
          "workspace.entityTypes"
        )}

        <span className="sidebar-dock-hint">
          ⋮⋮
        </span>
      </button>

      <button
        type="button"
        className={
          isSection(
            `${basePath}/entities`
          )
            ? "sidebar-item active"
            : "sidebar-item"
        }
        onClick={() =>
          go(
            `${basePath}/entities`
          )
        }
      >
        {t(
          "workspace.entities"
        )}
      </button>

      <button
        type="button"
        draggable={
          variant ===
          "desktop"
        }
        className="sidebar-item dockable-sidebar-item"
        onDragStart={(event) =>
          handleDockDragStart(
            event,
            "documents"
          )
        }
      >
        {t(
          "workspace.documents"
        )}

        <span className="sidebar-dock-hint">
          ⋮⋮
        </span>
      </button>

      <div className="sidebar-divider" />

      <button
        type="button"
        draggable={
          variant ===
          "desktop"
        }
        className="sidebar-item dockable-sidebar-item"
        onDragStart={(event) =>
          handleDockDragStart(
            event,
            "timeline"
          )
        }
      >
        {t(
          "workspace.timeline"
        )}

        <span className="sidebar-dock-hint">
          ⋮⋮
        </span>
      </button>

      <button
        type="button"
        draggable={
          variant ===
          "desktop"
        }
        className="sidebar-item dockable-sidebar-item"
        onDragStart={(event) =>
          handleDockDragStart(
            event,
            "graph"
          )
        }
      >
        {t(
          "workspace.graph"
        )}

        <span className="sidebar-dock-hint">
          ⋮⋮
        </span>
      </button>

      <div className="sidebar-spacer" />

      <button
        type="button"
        className="sidebar-item"
        disabled
      >
        {t(
          "workspace.settings"
        )}
      </button>
    </aside>
  );
}

export default WorldSidebar;