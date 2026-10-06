import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  useTranslation,
} from "react-i18next";

import WorldLayout from "../components/WorldLayout";
import { API_URL } from "../config/api";

function EntityTypesPage() {
  const { worldId } =
    useParams();

  const navigate =
    useNavigate();

  const { t } =
    useTranslation();

  const [
    world,
    setWorld,
  ] = useState(null);

  const [
    entityTypes,
    setEntityTypes,
  ] = useState([]);

  const [
    showCreateForm,
    setShowCreateForm,
  ] = useState(false);

  const [
    name,
    setName,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    icon,
    setIcon,
  ] = useState("📄");

  async function fetchWorld() {
    try {
      const response =
        await fetch(
          `${API_URL.worlds}/${worldId}`
        );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch world"
        );
      }

      const data =
        await response.json();

      setWorld(data);
    } catch (error) {
      console.error(
        "Failed to fetch world:",
        error
      );
    }
  }

  async function fetchEntityTypes() {
    try {
      const response =
        await fetch(
          `${API_URL.entityTypes}/world/${worldId}`
        );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch entity types"
        );
      }

      const data =
        await response.json();

      setEntityTypes(data);
    } catch (error) {
      console.error(
        "Failed to fetch entity types:",
        error
      );
    }
  }

  async function createEntityType(
    event
  ) {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    try {
      const response =
        await fetch(
          API_URL.entityTypes,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              worldId,
              name: name.trim(),
              description:
                description.trim(),
              icon,
            }),
          }
        );

      if (!response.ok) {
        const errorData =
          await response.json();

        throw new Error(
          errorData.message ||
            "Failed to create entity type"
        );
      }

      const newEntityType =
        await response.json();

      setEntityTypes(
        (current) => [
          ...current,
          newEntityType,
        ]
      );

      setName("");
      setDescription("");
      setIcon("📄");
      setShowCreateForm(false);
    } catch (error) {
      console.error(
        "Failed to create entity type:",
        error
      );

      alert(error.message);
    }
  }

  useEffect(() => {
    fetchWorld();
    fetchEntityTypes();
  }, [worldId]);

  if (!world) {
    return (
      <div className="workspace-loading">
        {t(
          "workspace.loading"
        )}
      </div>
    );
  }

  return (
    <WorldLayout
      worldId={worldId}
      worldName={world.name}
    >
      <div className="entity-page-header">
        <div>
          <h1>
            {t(
              "entityTypes.title"
            )}
          </h1>

          <p>
            {t(
              "entityTypes.subtitle"
            )}
          </p>
        </div>

        <button
          className="create-button"
          onClick={() =>
            setShowCreateForm(
              true
            )
          }
        >
          {t(
            "entityTypes.newType"
          )}
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
            onSubmit={
              createEntityType
            }
          >
            <label>
              {t(
                "entityTypes.name"
              )}
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
              {t(
                "entityTypes.icon"
              )}
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
                  setShowCreateForm(
                    false
                  )
                }
              >
                {t(
                  "worlds.cancel"
                )}
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
              onClick={() =>
                navigate(
                  `/world/${worldId}/entity-types/${entityType._id}`
                )
              }
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

      {entityTypes.length ===
        0 && (
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
    </WorldLayout>
  );
}

export default EntityTypesPage;