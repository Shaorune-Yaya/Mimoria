import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function WorldsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [worlds, setWorlds] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function fetchWorlds() {
    try {
      const response = await fetch("http://localhost:3000/api/worlds");

      if (!response.ok) {
        throw new Error("Failed to fetch worlds");
      }

      const data = await response.json();
      setWorlds(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function createWorld(event) {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/worlds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          icon: "🌍",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create world");
      }

      const newWorld = await response.json();

      setWorlds((currentWorlds) => [
        newWorld,
        ...currentWorlds,
      ]);

      setName("");
      setDescription("");
      setShowCreateForm(false);
    } catch (error) {
      console.error(error);
    }
  }

  function changeLanguage(event) {
    const language = event.target.value;

    i18n.changeLanguage(language);
    localStorage.setItem("worldforge-language", language);
  }

  function openWorld(worldId) {
    navigate(`/world/${worldId}`);
  }

  useEffect(() => {
    fetchWorlds();
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">
          {t("app.name")}
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

      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>
              {t("worlds.title")}
            </h1>

            <p>
              {t("worlds.subtitle")}
            </p>
          </div>

          <button
            className="create-button"
            onClick={() => setShowCreateForm(true)}
          >
            {t("worlds.newWorld")}
          </button>
        </div>

        {showCreateForm && (
          <div className="create-panel">
            <h2>
              {t("worlds.createTitle")}
            </h2>

            <form onSubmit={createWorld}>
              <label>
                {t("worlds.name")}
              </label>

              <input
                type="text"
                placeholder={t("worlds.namePlaceholder")}
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
              />

              <label>
                {t("worlds.description")}
              </label>

              <textarea
                placeholder={t("worlds.descriptionPlaceholder")}
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
              />

              <div className="form-buttons">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() =>
                    setShowCreateForm(false)
                  }
                >
                  {t("worlds.cancel")}
                </button>

                <button
                  type="submit"
                  className="save-button"
                >
                  {t("worlds.create")}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="world-grid">
          {worlds.map((world) => (
            <div
              className="world-card"
              key={world._id}
              onClick={() => openWorld(world._id)}
            >
              <div className="world-icon">
                {world.icon || "🌍"}
              </div>

              <div className="world-info">
                <h2>
                  {world.name}
                </h2>

                <p>
                  {world.description ||
                    t("worlds.noDescription")}
                </p>

                <span className="updated-time">
                  {t("worlds.updated")}{" "}
                  {new Date(
                    world.updatedAt
                  ).toLocaleDateString(
                    i18n.language === "zh-CN"
                      ? "zh-CN"
                      : "en-US"
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>

        {worlds.length === 0 && (
          <div className="empty-state">
            <h2>
              {t("worlds.emptyTitle")}
            </h2>

            <p>
              {t("worlds.emptyDescription")}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default WorldsPage;