import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { useTranslation } from "react-i18next";

function EntityTypesPage() {
  const { worldId } = useParams();
  const navigate = useNavigate();

  const { t, i18n } = useTranslation();

  const [world, setWorld] = useState(null);

  const [entityTypes, setEntityTypes] =
    useState([]);

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");
  const [icon, setIcon] = useState("📄");


  async function fetchWorld() {
    try {
      const response = await fetch(
        `http://localhost:3000/api/worlds/${worldId}`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch world"
        );
      }

      const data = await response.json();

      setWorld(data);
    } catch (error) {
      console.error(error);
    }
  }


  async function fetchEntityTypes() {
    try {
      const response = await fetch(
        `http://localhost:3000/api/entity-types/world/${worldId}`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch entity types"
        );
      }

      const data = await response.json();

      setEntityTypes(data);
    } catch (error) {
      console.error(error);
    }
  }


  async function createEntityType(event) {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:3000/api/entity-types",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            worldId,
            name,
            description,
            icon,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to create entity type"
        );
      }

      const newEntityType =
        await response.json();

      setEntityTypes((current) => [
        ...current,
        newEntityType,
      ]);

      setName("");
      setDescription("");
      setIcon("📄");

      setShowCreateForm(false);
    } catch (error) {
      console.error(error);
    }
  }


  function changeLanguage(event) {
    const language = event.target.value;

    i18n.changeLanguage(language);

    localStorage.setItem(
      "worldforge-language",
      language
    );
  }


  useEffect(() => {
    fetchWorld();
    fetchEntityTypes();
  }, [worldId]);


  if (!world) {
    return (
      <div className="workspace-loading">
        {t("workspace.loading")}
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


          <button
            className="sidebar-item"
            onClick={() =>
              navigate(`/world/${worldId}`)
            }
          >
            {t("workspace.home")}
          </button>


          <button
            className="sidebar-item active"
          >
            {t("workspace.entityTypes")}
          </button>


          <button className="sidebar-item">
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

          <div className="entity-page-header">

            <div>

              <h1>
                {t("entityTypes.title")}
              </h1>

              <p>
                {t("entityTypes.subtitle")}
              </p>

            </div>


            <button
              className="create-button"
              onClick={() =>
                setShowCreateForm(true)
              }
            >
              {t("entityTypes.newType")}
            </button>

          </div>


          {showCreateForm && (

            <div className="create-panel">

              <h2>
                {t(
                  "entityTypes.createTitle"
                )}
              </h2>


              <form
                onSubmit={createEntityType}
              >

                <label>
                  {t("entityTypes.name")}
                </label>


                <input
                  type="text"
                  value={name}
                  placeholder={t(
                    "entityTypes.namePlaceholder"
                  )}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                />


                <label>
                  {t("entityTypes.icon")}
                </label>


                <input
                  type="text"
                  value={icon}
                  onChange={(event) =>
                    setIcon(
                      event.target.value
                    )
                  }
                />


                <label>
                  {t(
                    "entityTypes.description"
                  )}
                </label>


                <textarea
                  value={description}
                  placeholder={t(
                    "entityTypes.descriptionPlaceholder"
                  )}
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
                    {t(
                      "entityTypes.create"
                    )}
                  </button>

                </div>

              </form>

            </div>

          )}


          <div className="entity-type-grid">

            {entityTypes.map(
              (entityType) => (

                <div
                  className="entity-type-card"
                  key={entityType._id}
                >

                  <div className="entity-type-icon">
                    {entityType.icon ||
                      "📄"}
                  </div>


                  <div>

                    <h2>
                      {entityType.name}
                    </h2>

                    <p>
                      {entityType.description ||
                        t(
                          "entityTypes.noDescription"
                        )}
                    </p>

                  </div>

                </div>

              )
            )}

          </div>


          {entityTypes.length === 0 && (

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

        </main>

      </div>

    </div>
  );
}

export default EntityTypesPage;