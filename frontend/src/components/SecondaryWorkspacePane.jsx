import {
  useEffect,
  useState,
} from "react";

import {
  useTranslation,
} from "react-i18next";

import {
  API_URL,
} from "../config/api";

function SecondaryWorkspacePane({
  worldId,
  onClose,
}) {
  const { t } =
    useTranslation();

  const [
    entityTypes,
    setEntityTypes,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  async function fetchEntityTypes() {
    try {
      setLoading(true);

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

      setEntityTypes(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load entity types:",
        error
      );

      setEntityTypes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEntityTypes();
  }, [worldId]);

  return (
    <section className="workspace-secondary-pane">
      <div className="secondary-pane-header">
        <div className="secondary-pane-title">
          {t(
            "workspace.entityTypes"
          )}
        </div>

        <div className="secondary-pane-header-actions">
          <div className="secondary-pane-fixed-view">
            {t(
              "workspace.secondaryWorkspace"
            )}
          </div>

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

      <div className="secondary-pane-content">
        {loading ? (
          <div className="secondary-pane-empty">
            {t(
              "workspace.loading"
            )}
          </div>
        ) : entityTypes.length ===
          0 ? (
          <div className="secondary-pane-empty">
            {t(
              "entityTypes.emptyTitle"
            )}
          </div>
        ) : (
          <div className="secondary-entity-type-list">
            {entityTypes.map(
              (type) => (
                <div
                  className="secondary-entity-type-item"
                  key={
                    type._id
                  }
                >
                  <span>
                    {type.icon ||
                      "📄"}
                  </span>

                  <div>
                    <strong>
                      {
                        type.name
                      }
                    </strong>

                    {type.description && (
                      <p>
                        {
                          type.description
                        }
                      </p>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default SecondaryWorkspacePane;