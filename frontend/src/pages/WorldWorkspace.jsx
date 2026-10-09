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

import {
  API_URL,
} from "../config/api";

import {
  apiFetch,
} from "../utils/apiFetch";


function WorldWorkspace() {
  const {
    worldId,
  } =
    useParams();


  const {
    t,
  } =
    useTranslation();


  const [
    world,
    setWorld,
  ] =
    useState(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      ""
    );


  // ====================================================
  // Load World
  // ====================================================

  async function fetchWorld() {
    try {
      setLoading(
        true
      );


      setErrorMessage(
        ""
      );


      const data =
        await apiFetch(
          `${API_URL.worlds}/${worldId}`
        );


      setWorld(
        data
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to fetch world:",
        error
      );


      setWorld(
        null
      );


      setErrorMessage(
        error.message ||
        t(
          "workspace.notFound"
        )
      );
    } finally {
      setLoading(
        false
      );
    }
  }


  // ====================================================
  // Initial Load
  // ====================================================

  useEffect(
    () => {
      fetchWorld();
    },
    [
      worldId,
    ]
  );


  // ====================================================
  // Loading
  // ====================================================

  if (
    loading
  ) {
    return (
      <div className="workspace-loading">
        {t(
          "workspace.loading"
        )}
      </div>
    );
  }


  // ====================================================
  // Error / Not Found
  // ====================================================

  if (
    !world
  ) {
    return (
      <div className="workspace-loading">
        {errorMessage ||
          t(
            "workspace.notFound"
          )}
      </div>
    );
  }


  // ====================================================
  // Render
  // ====================================================

  return (
    <WorldLayout
      worldId={
        worldId
      }
      worldName={
        world.name
      }
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