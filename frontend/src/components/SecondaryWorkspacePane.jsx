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
  activeView,
  onChangeView,
  onClose,
}) {
  const {
    t,
  } = useTranslation();

  const [
    entityTypes,
    setEntityTypes,
  ] = useState([]);

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
        "Failed to load entity types:",
        error
      );
    }
  }

  useEffect(() => {
    if (
      activeView ===
      "entity-types"
    ) {
      fetchEntityTypes();
    }
  }, [
    activeView,
    worldId,
  ]);

  const titleMap = {
    "entity-types":
      t(
        "workspace.entityTypes"
      ),

    documents:
      t(
        "workspace.documents"
      ),

    timeline:
      t(
        "workspace.timeline"
      ),

    graph:
      t(
        "workspace.graph"
      ),
  };

  function renderContent() {
    if (
      !activeView
    ) {
      return (
        <div className="secondary-pane-empty">
          <strong>
            Dock another view here
          </strong>

          <p>
            Drag a workspace tool
            from the navigation
            sidebar into this pane.
          </p>
        </div>
      );
    }

    if (
      activeView ===
      "entity-types"
    ) {
      return (
        <div className="secondary-entity-type-list">
          {entityTypes.length ===
          0 ? (
            <div className="secondary-pane-empty">
              {t(
                "entityTypes.emptyTitle"
              )}
            </div>
          ) : (
            entityTypes.map(
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
                      {type.name}
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
            )
          )}
        </div>
      );
    }

    if (
      activeView ===
      "timeline"
    ) {
      return (
        <div className="secondary-pane-placeholder">
          <div className="secondary-pane-placeholder-icon">
            ◷
          </div>

          <h3>
            {t(
              "workspace.timeline"
            )}
          </h3>

          <p>
            Timeline workspace
            will appear here.
          </p>
        </div>
      );
    }

    if (
      activeView ===
      "graph"
    ) {
      return (
        <div className="secondary-pane-placeholder">
          <div className="secondary-pane-placeholder-icon">
            ◉
          </div>

          <h3>
            {t(
              "workspace.graph"
            )}
          </h3>

          <p>
            Relationship graph
            will appear here.
          </p>
        </div>
      );
    }

    return (
      <div className="secondary-pane-placeholder">
        <div className="secondary-pane-placeholder-icon">
          ▤
        </div>

        <h3>
          {t(
            "workspace.documents"
          )}
        </h3>

        <p>
          Document workspace
          will appear here.
        </p>
      </div>
    );
  }

  return (
    <section className="workspace-secondary-pane">
      <div className="secondary-pane-header">
        <div className="secondary-pane-title">
          {activeView
            ? titleMap[
                activeView
              ]
            : "Secondary Workspace"}
        </div>

        <div className="secondary-pane-header-actions">
          <select
            className="secondary-pane-view-select"
            value={
              activeView || ""
            }
            onChange={(event) =>
              onChangeView(
                event.target.value ||
                  null
              )
            }
          >
            <option value="">
              Empty
            </option>

            <option value="entity-types">
              {t(
                "workspace.entityTypes"
              )}
            </option>

            <option value="documents">
              {t(
                "workspace.documents"
              )}
            </option>

            <option value="timeline">
              {t(
                "workspace.timeline"
              )}
            </option>

            <option value="graph">
              {t(
                "workspace.graph"
              )}
            </option>
          </select>

          <button
            type="button"
            className="secondary-pane-close"
            onClick={
              onClose
            }
            aria-label="Close secondary pane"
          >
            ×
          </button>
        </div>
      </div>

      <div className="secondary-pane-content">
        {renderContent()}
      </div>
    </section>
  );
}

export default SecondaryWorkspacePane;