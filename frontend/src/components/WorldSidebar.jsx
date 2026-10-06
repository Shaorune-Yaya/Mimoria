import {
  useLocation,
  useNavigate,
} from "react-router-dom";

<<<<<<< HEAD
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
=======
import { useTranslation } from "react-i18next";

function WorldSidebar({
  worldId,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
>>>>>>> fa2ef0a5320c91de7599683e93ad00e0e3b5342d

  const basePath =
    `/world/${worldId}`;

  function isExact(path) {
<<<<<<< HEAD
    return (
      location.pathname === path
    );
=======
    return location.pathname === path;
>>>>>>> fa2ef0a5320c91de7599683e93ad00e0e3b5342d
  }

  function isSection(path) {
    return (
      location.pathname === path ||
      location.pathname.startsWith(
        `${path}/`
      )
    );
  }

<<<<<<< HEAD
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
=======
  return (
    <aside className="workspace-sidebar">
      <div className="sidebar-section-title">
        {t("workspace.library")}
      </div>

      <button
>>>>>>> fa2ef0a5320c91de7599683e93ad00e0e3b5342d
        className={
          isExact(basePath)
            ? "sidebar-item active"
            : "sidebar-item"
        }
        onClick={() =>
<<<<<<< HEAD
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
=======
          navigate(basePath)
        }
      >
        {t("workspace.home")}
      </button>

      <button
>>>>>>> fa2ef0a5320c91de7599683e93ad00e0e3b5342d
        className={
          isSection(
            `${basePath}/entity-types`
          )
<<<<<<< HEAD
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
=======
            ? "sidebar-item active"
            : "sidebar-item"
        }
        onClick={() =>
          navigate(
            `${basePath}/entity-types`
          )
        }
      >
        {t("workspace.entityTypes")}
      </button>

      <button
>>>>>>> fa2ef0a5320c91de7599683e93ad00e0e3b5342d
        className={
          isSection(
            `${basePath}/entities`
          )
            ? "sidebar-item active"
            : "sidebar-item"
        }
        onClick={() =>
<<<<<<< HEAD
          go(
=======
          navigate(
>>>>>>> fa2ef0a5320c91de7599683e93ad00e0e3b5342d
            `${basePath}/entities`
          )
        }
      >
<<<<<<< HEAD
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
=======
        {t("workspace.entities")}
      </button>

      <button
        className="sidebar-item"
        disabled
      >
        {t("workspace.documents")}
>>>>>>> fa2ef0a5320c91de7599683e93ad00e0e3b5342d
      </button>

      <div className="sidebar-divider" />

      <button
<<<<<<< HEAD
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
=======
        className="sidebar-item"
        disabled
      >
        {t("workspace.timeline")}
      </button>

      <button
        className="sidebar-item"
        disabled
      >
        {t("workspace.graph")}
>>>>>>> fa2ef0a5320c91de7599683e93ad00e0e3b5342d
      </button>

      <div className="sidebar-spacer" />

      <button
<<<<<<< HEAD
        type="button"
        className="sidebar-item"
        disabled
      >
        {t(
          "workspace.settings"
        )}
=======
        className="sidebar-item"
        disabled
      >
        {t("workspace.settings")}
>>>>>>> fa2ef0a5320c91de7599683e93ad00e0e3b5342d
      </button>
    </aside>
  );
}

export default WorldSidebar;