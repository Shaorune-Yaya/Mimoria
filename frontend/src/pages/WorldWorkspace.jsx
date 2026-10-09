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


        <div className="workspace-home-content">
  <div className="workspace-beta-notice">
    <div className="workspace-beta-notice-header">
      <span className="workspace-beta-badge">
        BETA
      </span>

      <div>
        <h2>
          {t(
            "workspace.betaTitle"
          )}
        </h2>

        <p>
          {t(
            "workspace.betaDescription"
          )}
        </p>
      </div>
    </div>
  </div>


    <div className="workspace-progress-grid">
      <section className="workspace-progress-card">
        <div className="workspace-progress-card-header">
          <span className="workspace-progress-icon ready">
            ✓
          </span>

          <h3>
            {t(
              "workspace.availableNow"
            )}
          </h3>
        </div>

        <ul className="workspace-progress-list">
          <li>
            {t(
              "workspace.progressEntityTypes"
            )}
          </li>

          <li>
            {t(
              "workspace.progressEntities"
            )}
          </li>

          <li>
            {t(
              "workspace.progressDocuments"
            )}
          </li>

          <li>
            {t(
              "workspace.progressSmartImport"
            )}
          </li>

          <li>
            {t(
              "workspace.progressDocking"
            )}
          </li>

          <li>
            {t(
              "workspace.progressAccounts"
            )}
          </li>
        </ul>
      </section>


      <section className="workspace-progress-card">
        <div className="workspace-progress-card-header">
          <span className="workspace-progress-icon development">
            ◷
          </span>

          <h3>
            {t(
              "workspace.inDevelopment"
            )}
          </h3>
        </div>

        <ul className="workspace-progress-list">
          <li>
            {t(
              "workspace.progressTimeline"
            )}
          </li>

          <li>
            {t(
              "workspace.progressGraph"
            )}
          </li>

          <li>
            {t(
              "workspace.progressProfileEditing"
            )}
          </li>

          <li>
            {t(
              "workspace.progressAiFeatures"
            )}
          </li>
        </ul>
      </section>


      <section className="workspace-progress-card">
        <div className="workspace-progress-card-header">
          <span className="workspace-progress-icon planned">
            →
          </span>

          <h3>
            {t(
              "workspace.upNext"
            )}
          </h3>
        </div>

        <ul className="workspace-progress-list">
          <li>
            {t(
              "workspace.progressOnboarding"
            )}
          </li>

          <li>
            {t(
              "workspace.progressWorkflow"
            )}
          </li>

          <li>
            {t(
              "workspace.progressCloudBeta"
            )}
          </li>
        </ul>
      </section>
    </div>
  </div>
      </div>
    </WorldLayout>
  );
}


export default WorldWorkspace;