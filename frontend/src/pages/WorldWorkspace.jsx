import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import {
  useTranslation,
} from "react-i18next";

import WorldLayout from "../components/WorldLayout";
import { API_URL } from "../config/api";

function WorldWorkspace() {
  const { worldId } =
    useParams();

  const { t } =
    useTranslation();

  const [
    world,
    setWorld,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWorld();
  }, [worldId]);

  if (loading) {
    return (
      <div className="workspace-loading">
        {t(
          "workspace.loading"
        )}
      </div>
    );
  }

  if (!world) {
    return (
      <div className="workspace-loading">
        {t(
          "workspace.notFound"
        )}
      </div>
    );
  }

  return (
    <WorldLayout
      worldId={worldId}
      worldName={world.name}
    >
      <div className="workspace-welcome">
        <div className="workspace-world-icon">
          {world.icon ||
            "🌍"}
        </div>

        <h1>
          {world.name}
        </h1>

        <p>
          {world.description ||
            t(
              "worlds.noDescription"
            )}
        </p>

        <div className="workspace-placeholder">
          {t(
            "workspace.startMessage"
          )}
        </div>
      </div>
    </WorldLayout>
  );
}

export default WorldWorkspace;