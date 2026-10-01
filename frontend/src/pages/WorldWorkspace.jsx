import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

function WorldWorkspace() {
  const { worldId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [world, setWorld] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchWorld() {
    try {
      const response = await fetch(
        `http://localhost:3000/api/worlds/${worldId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch world");
      }

      const data = await response.json();
      setWorld(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function changeLanguage(event) {
    const language = event.target.value;

    i18n.changeLanguage(language);
    localStorage.setItem("worldforge-language", language);
  }

  useEffect(() => {
    fetchWorld();
  }, [worldId]);

  if (loading) {
    return (
      <div className="workspace-loading">
        {t("workspace.loading")}
      </div>
    );
  }

  if (!world) {
    return (
      <div className="workspace-loading">
        {t("workspace.notFound")}
      </div>
    );
  }

  return (
    <div className="workspace">
      <header className="workspace-topbar">
        <div className="workspace-topbar-left">
          <button
            className="back-button"
            onClick={() => navigate("/")}
          >
            ←
          </button>

          <div className="logo">
            {t("app.name")}
          </div>

          <div className="world-title-divider">
            /
          </div>

          <div className="workspace-world-name">
            {world.name}
          </div>
        </div>

        <div className="language-selector">
          <select
            value={i18n.language}
            onChange={changeLanguage}
          >
            <option value="en">
              English
            </option>

            <option value="zh-CN">
              简体中文
            </option>
          </select>
        </div>
      </header>

      <div className="workspace-body">
        <aside className="workspace-sidebar">
          <div className="sidebar-section-title">
            {t("workspace.library")}
          </div>

          <button className="sidebar-item active">
            {t("workspace.home")}
          </button>

          <button className="sidebar-item"
            onClick={() =>
                navigate(
                `/world/${worldId}/entity-types`
                )
            }
            >
            {t("workspace.entityTypes")}
          </button>

          <button className="sidebar-item"
            onClick={() =>
                navigate(
                `/world/${worldId}/entities`
                )
            }
          >
            {t("workspace.entities")}
          </button>

          <button className="sidebar-item">
            {t("workspace.documents")}
          </button>

          <div className="sidebar-divider" />

          <button className="sidebar-item">
            {t("workspace.timeline")}
          </button>

          <button className="sidebar-item">
            {t("workspace.graph")}
          </button>

          <div className="sidebar-spacer" />

          <button className="sidebar-item">
            {t("workspace.settings")}
          </button>
        </aside>

        <main className="workspace-main">
          <div className="workspace-welcome">
            <div className="workspace-world-icon">
              {world.icon || "🌍"}
            </div>

            <h1>
              {world.name}
            </h1>

            <p>
              {world.description ||
                t("worlds.noDescription")}
            </p>

            <div className="workspace-placeholder">
              {t("workspace.startMessage")}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default WorldWorkspace;