import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useTranslation } from "react-i18next";

function WorldSidebar({
  worldId,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const { t } =
    useTranslation();

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

  return (
    <aside className="workspace-sidebar">
      <div className="sidebar-section-title">
        {t("workspace.library")}
      </div>

      <button
        className={
          isExact(basePath)
            ? "sidebar-item active"
            : "sidebar-item"
        }
        onClick={() =>
          navigate(basePath)
        }
      >
        {t("workspace.home")}
      </button>

      <button
        className={
          isSection(
            `${basePath}/entity-types`
          )
            ? "sidebar-item active"
            : "sidebar-item"
        }
        onClick={() =>
          navigate(
            `${basePath}/entity-types`
          )
        }
      >
        {t(
          "workspace.entityTypes"
        )}
      </button>

      <button
        className={
          isSection(
            `${basePath}/entities`
          )
            ? "sidebar-item active"
            : "sidebar-item"
        }
        onClick={() =>
          navigate(
            `${basePath}/entities`
          )
        }
      >
        {t(
          "workspace.entities"
        )}
      </button>

      <button
        className={
          isSection(
            `${basePath}/documents`
          )
            ? "sidebar-item active"
            : "sidebar-item"
        }
        onClick={() =>
          navigate(
            `${basePath}/documents`
          )
        }
      >
        {t(
          "workspace.documents"
        )}
      </button>

      <div className="sidebar-divider" />

      <button
        className="sidebar-item"
        disabled
      >
        {t(
          "workspace.timeline"
        )}
      </button>

      <button
        className="sidebar-item"
        disabled
      >
        {t(
          "workspace.graph"
        )}
      </button>

      <div className="sidebar-spacer" />

      <button
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