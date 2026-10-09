import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useTranslation,
} from "react-i18next";

import AppHeader from "../components/AppHeader";

import {
  API_URL,
} from "../config/api";

import {
  apiFetch,
} from "../utils/apiFetch";


function WorldsPage() {
  const {
    t,
    i18n,
  } =
    useTranslation();


  const navigate =
    useNavigate();


  const [
    worlds,
    setWorlds,
  ] =
    useState([]);


  const [
    showCreateForm,
    setShowCreateForm,
  ] =
    useState(false);


  const [
    name,
    setName,
  ] =
    useState("");


  const [
    description,
    setDescription,
  ] =
    useState("");


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    creating,
    setCreating,
  ] =
    useState(false);


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");


  // ====================================================
  // Load Worlds
  // ====================================================

  async function fetchWorlds() {
    try {
      setLoading(
        true
      );


      setErrorMessage(
        ""
      );


      const data =
        await apiFetch(
          API_URL.worlds
        );


      setWorlds(
        Array.isArray(
          data
        )
          ? data
          : []
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to fetch worlds:",
        error
      );


      setErrorMessage(
        error.message ||
        "Failed to fetch worlds"
      );
    } finally {
      setLoading(
        false
      );
    }
  }


  // ====================================================
  // Create World
  // ====================================================

  async function createWorld(
    event
  ) {
    event.preventDefault();


    const normalizedName =
      name.trim();


    if (
      !normalizedName ||
      creating
    ) {
      return;
    }


    try {
      setCreating(
        true
      );


      setErrorMessage(
        ""
      );


      const newWorld =
        await apiFetch(
          API_URL.worlds,
          {
            method:
              "POST",

            body: {
              name:
                normalizedName,

              description:
                description.trim(),

              icon:
                "🌍",
            },
          }
        );


      setWorlds(
        (
          currentWorlds
        ) => [
          newWorld,
          ...currentWorlds,
        ]
      );


      setName(
        ""
      );


      setDescription(
        ""
      );


      setShowCreateForm(
        false
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to create world:",
        error
      );


      setErrorMessage(
        error.message ||
        "Failed to create world"
      );
    } finally {
      setCreating(
        false
      );
    }
  }


  // ====================================================
  // Navigation
  // ====================================================

  function openWorld(
    worldId
  ) {
    navigate(
      `/world/${worldId}`
    );
  }


  // ====================================================
  // Initial Load
  // ====================================================

  useEffect(
    () => {
      fetchWorlds();
    },
    []
  );


  // ====================================================
  // Render
  // ====================================================

  return (
    <div className="app">
      <AppHeader />


      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>
              {t(
                "worlds.title"
              )}
            </h1>


            <p>
              {t(
                "worlds.subtitle"
              )}
            </p>
          </div>


          <button
            type="button"
            className="create-button"
            onClick={() => {
              setErrorMessage(
                ""
              );


              setShowCreateForm(
                true
              );
            }}
          >
            {t(
              "worlds.newWorld"
            )}
          </button>
        </div>


        {errorMessage && (
          <div
            className="error-message"
            style={{
              marginBottom:
                "16px",
            }}
          >
            {
              errorMessage
            }
          </div>
        )}


        {showCreateForm && (
          <div className="create-panel">
            <h2>
              {t(
                "worlds.createTitle"
              )}
            </h2>


            <form
              onSubmit={
                createWorld
              }
            >
              <label>
                {t(
                  "worlds.name"
                )}
              </label>


              <input
                type="text"
                placeholder={t(
                  "worlds.namePlaceholder"
                )}
                value={
                  name
                }
                disabled={
                  creating
                }
                onChange={(
                  event
                ) =>
                  setName(
                    event.target.value
                  )
                }
              />


              <label>
                {t(
                  "worlds.description"
                )}
              </label>


              <textarea
                placeholder={t(
                  "worlds.descriptionPlaceholder"
                )}
                value={
                  description
                }
                disabled={
                  creating
                }
                onChange={(
                  event
                ) =>
                  setDescription(
                    event.target.value
                  )
                }
              />


              <div className="form-buttons">
                <button
                  type="button"
                  className="cancel-button"
                  disabled={
                    creating
                  }
                  onClick={() => {
                    setShowCreateForm(
                      false
                    );


                    setErrorMessage(
                      ""
                    );
                  }}
                >
                  {t(
                    "worlds.cancel"
                  )}
                </button>


                <button
                  type="submit"
                  className="save-button"
                  disabled={
                    creating ||
                    !name.trim()
                  }
                >
                  {creating
                    ? "..."
                    : t(
                        "worlds.create"
                      )}
                </button>
              </div>
            </form>
          </div>
        )}


        {loading ? (
          <div className="empty-state">
            <p>
              Loading...
            </p>
          </div>
        ) : (
          <>
            <div className="world-grid">
              {worlds.map(
                (
                  world
                ) => (
                  <div
                    className="world-card"
                    key={
                      world._id
                    }
                    onClick={() =>
                      openWorld(
                        world._id
                      )
                    }
                  >
                    <div className="world-icon">
                      {world.icon ||
                        "🌍"}
                    </div>


                    <div className="world-info">
                      <h2>
                        {
                          world.name
                        }
                      </h2>


                      <p>
                        {world.description ||
                          t(
                            "worlds.noDescription"
                          )}
                      </p>


                      <span className="updated-time">
                        {t(
                          "worlds.updated"
                        )}{" "}

                        {new Date(
                          world.updatedAt
                        )
                          .toLocaleDateString(
                            i18n.language ===
                              "zh-CN"
                              ? "zh-CN"
                              : "en-US"
                          )}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>


            {worlds.length ===
              0 && (
              <div className="empty-state">
                <h2>
                  {t(
                    "worlds.emptyTitle"
                  )}
                </h2>


                <p>
                  {t(
                    "worlds.emptyDescription"
                  )}
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}


export default WorldsPage;