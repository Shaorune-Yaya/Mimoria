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
}) {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const { t } =
    useTranslation();

  const basePath =
    `/world/${worldId}`;

  function isExact(path) {
    return (
      location.pathname ===
      path
    );
  }

  function isSection(path) {
    return (
      location.pathname ===
        path ||
      location.pathname.startsWith(
        `${path}/`
      )
    );
  }

  function goTo(path) {
    navigate(path);

    if (onNavigate) {
      onNavigate();
    }
  }

  const sidebarClassName =
    variant === "drawer"
      ? "workspace-sidebar workspace-sidebar--drawer"
      : "workspace-sidebar workspace-sidebar--desktop";

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

      <button
        type="button"
        className={
          isExact(basePath)
            ? "sidebar-item active"
            : "sidebar-item"
        }
        onClick={() =>
          goTo(basePath)
        }
      >
        {t(
          "workspace.home"
        )}
      </button>

      <button
        type="button"
        className={
          isSection(
            `${basePath}/entity-types`
          )
            ? "sidebar-item active"
            : "sidebar-item"
        }
        onClick={() =>
          goTo(
            `${basePath}/entity-types`
          )
        }
      >
        {t(
          "workspace.entityTypes"
        )}
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
          goTo(
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
        className={
          isSection(
            `${basePath}/documents`
          )
            ? "sidebar-item active"
            : "sidebar-item"
        }
        onClick={() =>
          goTo(
            `${basePath}/documents`
          )
        }
      >
        {t(
          "workspace.documents"
        )}
      </button>

      <button
        type="button"
        className={
          isSection(
            `${basePath}/smart-import`
          )
            ? "sidebar-item active"
            : "sidebar-item"
        }
        onClick={() =>
          goTo(
            `${basePath}/smart-import`
          )
        }
      >
        {t(
          "workspace.smartImport",
          {
            defaultValue:
              "Smart Import",
          }
        )}
      </button>

      <div className="sidebar-divider" />

      <button
        type="button"
        className="sidebar-item"
        disabled
      >
        {t(
          "workspace.timeline"
        )}
      </button>

      <button
        type="button"
        className="sidebar-item"
        disabled
      >
        {t(
          "workspace.graph"
        )}
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