import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useTranslation,
} from "react-i18next";

import {
  useParams,
} from "react-router-dom";

import WorldLayout from "../components/WorldLayout";
import StorySuggestionsPanel from "../components/StorySuggestionsPanel";

import {
  API_URL,
} from "../config/api";


// ======================================================
// Helpers
// ======================================================

function getCandidateId(
  candidate
) {
  return (
    candidate?.id ||
    candidate?._id ||
    null
  );
}


function normalizeLocale(
  language
) {
  return String(
    language ||
    "en"
  )
    .toLowerCase()
    .startsWith(
      "zh"
    )
    ? "zh-CN"
    : "en";
}


// ======================================================
// Component
// ======================================================

export default function SmartImportPage() {
  const {
    worldId,
  } =
    useParams();


  const {
    t,
    i18n,
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
    entityTypes,
    setEntityTypes,
  ] =
    useState(
      []
    );


  const [
    text,
    setText,
  ] =
    useState(
      ""
    );


  const [
    candidates,
    setCandidates,
  ] =
    useState(
      []
    );


  const [
    analysisState,
    setAnalysisState,
  ] =
    useState(
      "idle"
    );


  const [
    analysisError,
    setAnalysisError,
  ] =
    useState(
      ""
    );


  const [
    actionCandidateId,
    setActionCandidateId,
  ] =
    useState(
      null
    );


  const [
    analysisMeta,
    setAnalysisMeta,
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
    pageError,
    setPageError,
  ] =
    useState(
      ""
    );


  const locale =
    normalizeLocale(
      i18n.language
    );


  const pendingCount =
    useMemo(
      () =>
        candidates.filter(
          (
            candidate
          ) =>
            candidate.status ===
            "pending"
        ).length,

      [
        candidates,
      ]
    );


  // ====================================================
  // Initial Load
  // ====================================================

  useEffect(() => {
    loadPage();
  }, [
    worldId,
  ]);


  async function loadPage() {
    try {
      setLoading(
        true
      );

      setPageError(
        ""
      );


      const [
        worldResponse,
        entityTypesResponse,
      ] =
        await Promise.all([
          fetch(
            `${API_URL.worlds}/${worldId}`,
            {
              credentials:
                "include",
            }
          ),

          fetch(
            `${API_URL.entityTypes}/world/${worldId}`,
            {
              credentials:
                "include",
            }
          ),
        ]);


      if (
        !worldResponse.ok
      ) {
        const data =
          await worldResponse
            .json()
            .catch(
              () => ({})
            );


        throw new Error(
          data.message ||
          t(
            "workspace.notFound"
          )
        );
      }


      if (
        !entityTypesResponse.ok
      ) {
        const data =
          await entityTypesResponse
            .json()
            .catch(
              () => ({})
            );


        throw new Error(
          data.message ||
          t(
            "smartImport.entityTypesLoadFailed",
            {
              defaultValue:
                "Failed to load entity types.",
            }
          )
        );
      }


      const [
        worldData,
        entityTypesData,
      ] =
        await Promise.all([
          worldResponse.json(),
          entityTypesResponse.json(),
        ]);


      setWorld(
        worldData
      );


      setEntityTypes(
        Array.isArray(
          entityTypesData
        )
          ? entityTypesData
          : []
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to load Smart Import:",
        error
      );


      setPageError(
        error.message ||
        t(
          "smartImport.loadFailed",
          {
            defaultValue:
              "Failed to load Smart Import.",
          }
        )
      );
    } finally {
      setLoading(
        false
      );
    }
  }


  async function refreshEntityTypes() {
    try {
      const response =
        await fetch(
          `${API_URL.entityTypes}/world/${worldId}`,
          {
            credentials:
              "include",
          }
        );


      if (
        !response.ok
      ) {
        return;
      }


      const data =
        await response.json();


      setEntityTypes(
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
        "Failed to refresh Entity Types:",
        error
      );
    }
  }


  // ====================================================
  // Analyze
  // ====================================================

  async function analyzeText() {
    const normalizedText =
      text.trim();


    if (
      !normalizedText
    ) {
      setAnalysisError(
        t(
          "smartImport.textRequired",
          {
            defaultValue:
              "Paste some structured world information first.",
          }
        )
      );

      setAnalysisState(
        "error"
      );

      return;
    }


    try {
      setAnalysisState(
        "analyzing"
      );

      setAnalysisError(
        ""
      );

      setCandidates(
        []
      );

      setAnalysisMeta(
        null
      );


      const response =
        await fetch(
          `${API_URL.smartImport}/world/${worldId}/analyze`,
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                text:
                  normalizedText,

                locale:
                  "auto",

                forceLocale:
                  false,

                enabledPacks: [
                  "furry",
                  "sciFi",
                ],

                nsfwEnabled:
                  false,
              }),
          }
        );


      const data =
        await response
          .json()
          .catch(
            () => ({})
          );


      if (
        !response.ok
      ) {
        throw new Error(
          data.message ||
          t(
            "smartImport.analysisFailed",
            {
              defaultValue:
                "Smart Import analysis failed.",
            }
          )
        );
      }


      setCandidates(
        Array.isArray(
          data.candidates
        )
          ? data.candidates
          : []
      );


      setAnalysisMeta(
        data.analysis ||
        null
      );


      setAnalysisState(
        "complete"
      );
    } catch (
      error
    ) {
      console.error(
        "Smart Import analysis failed:",
        error
      );


      setAnalysisError(
        error.message ||
        t(
          "smartImport.analysisFailed",
          {
            defaultValue:
              "Smart Import analysis failed.",
          }
        )
      );


      setAnalysisState(
        "error"
      );
    }
  }


  // ====================================================
  // Candidate State
  // ====================================================

  function replaceCandidate(
    nextCandidate
  ) {
    const nextId =
      getCandidateId(
        nextCandidate
      );


    if (
      !nextId
    ) {
      return;
    }


    setCandidates(
      (
        current
      ) =>
        current.map(
          (
            candidate
          ) =>
            getCandidateId(
              candidate
            ) ===
            nextId
              ? nextCandidate
              : candidate
        )
    );
  }


  // ====================================================
  // Apply
  // ====================================================

  async function applySuggestion(
    candidate,
    options = {}
  ) {
    const candidateId =
      getCandidateId(
        candidate
      );


    if (
      !candidateId
    ) {
      return false;
    }


    try {
      setActionCandidateId(
        candidateId
      );

      setAnalysisError(
        ""
      );


      const response =
        await fetch(
          `${API_URL.smartImport}/${candidateId}/apply`,
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                options ||
                {}
              ),
          }
        );


      const data =
        await response
          .json()
          .catch(
            () => ({})
          );


      if (
        !response.ok
      ) {
        throw new Error(
          data.message ||
          t(
            "smartImport.applyFailed",
            {
              defaultValue:
                "Failed to apply suggestion.",
            }
          )
        );
      }


      if (
        data.candidate
      ) {
        replaceCandidate(
          data.candidate
        );
      }


      /*
       * Applying a suggestion can create or modify an
       * EntityType, so refresh the type list used by the
       * create-entity controls.
       */
      await refreshEntityTypes();


      return true;
    } catch (
      error
    ) {
      console.error(
        "Failed to apply Smart Import suggestion:",
        error
      );


      setAnalysisError(
        error.message ||
        t(
          "smartImport.applyFailed",
          {
            defaultValue:
              "Failed to apply suggestion.",
          }
        )
      );


      return false;
    } finally {
      setActionCandidateId(
        null
      );
    }
  }


  // ====================================================
  // Edit
  // ====================================================

  async function editSuggestion(
    candidate,
    payloadPatch
  ) {
    const candidateId =
      getCandidateId(
        candidate
      );


    if (
      !candidateId
    ) {
      return false;
    }


    try {
      setActionCandidateId(
        candidateId
      );

      setAnalysisError(
        ""
      );


      const response =
        await fetch(
          `${API_URL.smartImport}/${candidateId}`,
          {
            method:
              "PATCH",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                payload:
                  payloadPatch,
              }),
          }
        );


      const data =
        await response
          .json()
          .catch(
            () => ({})
          );


      if (
        !response.ok
      ) {
        throw new Error(
          data.message ||
          t(
            "smartImport.editFailed",
            {
              defaultValue:
                "Failed to edit suggestion.",
            }
          )
        );
      }


      if (
        data.candidate
      ) {
        replaceCandidate(
          data.candidate
        );
      }


      return true;
    } catch (
      error
    ) {
      console.error(
        "Failed to edit Smart Import suggestion:",
        error
      );


      setAnalysisError(
        error.message ||
        t(
          "smartImport.editFailed",
          {
            defaultValue:
              "Failed to edit suggestion.",
          }
        )
      );


      return false;
    } finally {
      setActionCandidateId(
        null
      );
    }
  }


  // ====================================================
  // Ignore
  // ====================================================

  async function ignoreSuggestion(
    candidate
  ) {
    const candidateId =
      getCandidateId(
        candidate
      );


    if (
      !candidateId
    ) {
      return false;
    }


    try {
      setActionCandidateId(
        candidateId
      );

      setAnalysisError(
        ""
      );


      const response =
        await fetch(
          `${API_URL.smartImport}/${candidateId}/ignore`,
          {
            method:
              "POST",

            credentials:
              "include",
          }
        );


      const data =
        await response
          .json()
          .catch(
            () => ({})
          );


      if (
        !response.ok
      ) {
        throw new Error(
          data.message ||
          t(
            "smartImport.ignoreFailed",
            {
              defaultValue:
                "Failed to ignore suggestion.",
            }
          )
        );
      }


      if (
        data.candidate
      ) {
        replaceCandidate(
          data.candidate
        );
      }


      return true;
    } catch (
      error
    ) {
      console.error(
        "Failed to ignore Smart Import suggestion:",
        error
      );


      setAnalysisError(
        error.message ||
        t(
          "smartImport.ignoreFailed",
          {
            defaultValue:
              "Failed to ignore suggestion.",
          }
        )
      );


      return false;
    } finally {
      setActionCandidateId(
        null
      );
    }
  }


  // ====================================================
  // Labels
  // ====================================================

  function getConceptLabel(
    concept
  ) {
    if (
      !concept
    ) {
      return "";
    }


    const conceptString =
      String(
        concept
      );


    const conceptKey =
      conceptString.replace(
        /\./gu,
        "_"
      );


    const translationKey =
      `documents.concepts.${conceptKey}`;


    return t(
      translationKey,
      {
        defaultValue:
          conceptString
            .replace(
              /^(?:field|relation|event|entityType)\./u,
              ""
            )
            .replace(
              /_/gu,
              " "
            ),
      }
    );
  }


  function getSuggestionKindLabel(
    kind
  ) {
    const keyMap = {
      "field-update":
        "documents.suggestionKinds.fieldUpdate",

      "relation-update":
        "documents.suggestionKinds.relationUpdate",

      "event-history":
        "documents.suggestionKinds.eventHistory",

      "create-entity":
        "documents.suggestionKinds.createEntity",

      "create-schema-field":
        "documents.suggestionKinds.createSchemaField",

      "create-select-option":
        "documents.suggestionKinds.createSelectOption",
    };


    return t(
      keyMap[kind] ||
      "documents.suggestionKinds.unknown",
      {
        defaultValue:
          kind ||
          "Suggestion",
      }
    );
  }


  // ====================================================
  // Render
  // ====================================================

  if (
    loading
  ) {
    return (
      <WorldLayout
        worldId={
          worldId
        }
        worldName={
          t(
            "app.name"
          )
        }
      >
        <div
          style={{
            padding:
              "24px",
          }}
        >
          {t(
            "smartImport.loading",
            {
              defaultValue:
                "Loading Smart Import...",
            }
          )}
        </div>
      </WorldLayout>
    );
  }


  return (
    <WorldLayout
      worldId={
        worldId
      }
      worldName={
        world?.name ||
        t(
          "app.name"
        )
      }
    >
      <div
        className="smart-import-page"
        style={{
          width:
            "100%",

          maxWidth:
            "1180px",

          margin:
            "0 auto",

          padding:
            "24px",

          boxSizing:
            "border-box",
        }}
      >
        <div
          style={{
            marginBottom:
              "22px",
          }}
        >
          <h1
            style={{
              margin:
                "0 0 8px",
            }}
          >
            {t(
              "smartImport.title",
              {
                defaultValue:
                  "Smart Import",
              }
            )}
          </h1>

          <p
            style={{
              margin:
                0,

              opacity:
                0.75,

              lineHeight:
                1.6,
            }}
          >
            {t(
              "smartImport.description",
              {
                defaultValue:
                  "Paste character profiles, locations, organizations, or other structured world notes. Mimoria will turn recognized information into suggestions that you review before anything changes.",
              }
            )}
          </p>
        </div>


        {pageError && (
          <div
            className="story-suggestions-error"
            style={{
              marginBottom:
                "16px",
            }}
          >
            {
              pageError
            }
          </div>
        )}


        <section
          style={{
            display:
              "grid",

            gap:
              "14px",

            marginBottom:
              "22px",
          }}
        >
          <label>
            <div
              style={{
                fontWeight:
                  600,

                marginBottom:
                  "8px",
              }}
            >
              {t(
                "smartImport.inputLabel",
                {
                  defaultValue:
                    "Structured world information",
                }
              )}
            </div>


            <textarea
              value={
                text
              }
              onChange={(
                event
              ) =>
                setText(
                  event.target.value
                )
              }
              maxLength={
                50000
              }
              placeholder={t(
                "smartImport.placeholder",
                {
                  defaultValue:
                    "Example: Alice is a 24-year-old alchemist from Silverport. She is a member of the Black Rose Church.",
                }
              )}
              style={{
                width:
                  "100%",

                minHeight:
                  "220px",

                resize:
                  "vertical",

                boxSizing:
                  "border-box",

                font:
                  "inherit",

                lineHeight:
                  1.6,

                padding:
                  "14px",

                borderRadius:
                  "10px",
              }}
            />
          </label>


          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "space-between",

              gap:
                "12px",

              flexWrap:
                "wrap",
            }}
          >
            <span
              style={{
                opacity:
                  0.65,

                fontSize:
                  "0.9rem",
              }}
            >
              {
                text.length
              }
              {" / 50000"}
            </span>


            <div
              style={{
                display:
                  "flex",

                gap:
                  "8px",
              }}
            >
              <button
                type="button"
                className="cancel-button"
                disabled={
                  analysisState ===
                  "analyzing"
                }
                onClick={() => {
                  setText(
                    ""
                  );

                  setCandidates(
                    []
                  );

                  setAnalysisMeta(
                    null
                  );

                  setAnalysisError(
                    ""
                  );

                  setAnalysisState(
                    "idle"
                  );
                }}
              >
                {t(
                  "smartImport.clear",
                  {
                    defaultValue:
                      "Clear",
                  }
                )}
              </button>


              <button
                type="button"
                className="create-button"
                disabled={
                  analysisState ===
                    "analyzing" ||
                  !text.trim()
                }
                onClick={
                  analyzeText
                }
              >
                {analysisState ===
                "analyzing"
                  ? t(
                      "smartImport.analyzing",
                      {
                        defaultValue:
                          "Analyzing...",
                      }
                    )
                  : t(
                      "smartImport.analyze",
                      {
                        defaultValue:
                          "Analyze & Build Suggestions",
                      }
                    )}
              </button>
            </div>
          </div>
        </section>


        {analysisMeta && (
          <div
            style={{
              display:
                "flex",

              gap:
                "16px",

              flexWrap:
                "wrap",

              marginBottom:
                "16px",

              opacity:
                0.75,

              fontSize:
                "0.9rem",
            }}
          >
            <span>
              {t(
                "smartImport.pendingCount",
                {
                  defaultValue:
                    "{{count}} pending",
                  count:
                    pendingCount,
                }
              )}
            </span>

            <span>
              {t(
                "smartImport.alreadyCanonicalCount",
                {
                  defaultValue:
                    "{{count}} already matched Canon",
                  count:
                    analysisMeta
                      .canonicalSatisfiedCount ||
                    0,
                }
              )}
            </span>
          </div>
        )}


        <StorySuggestionsPanel
          candidates={
            candidates
          }
          entityTypes={
            entityTypes
          }
          analysisState={
            analysisState
          }
          analysisError={
            analysisError
          }
          actionCandidateId={
            actionCandidateId
          }
          language={
            i18n.language
          }
          t={
            t
          }
          title={t(
            "smartImport.suggestionsTitle",
            {
              defaultValue:
                "Import Suggestions",
            }
          )}
          description={t(
            "smartImport.suggestionsDescription",
            {
              defaultValue:
                "Review each recognized change before applying it to this world's Canon.",
            }
          )}
          emptyText={t(
            "smartImport.suggestionsEmpty",
            {
              defaultValue:
                "No new structured changes were found.",
            }
          )}
          getConceptLabel={
            getConceptLabel
          }
          getSuggestionKindLabel={
            getSuggestionKindLabel
          }
          onApply={
            applySuggestion
          }
          onIgnore={
            ignoreSuggestion
          }
          onEdit={
            editSuggestion
          }
          onClearError={() =>
            setAnalysisError(
              ""
            )
          }
        />
      </div>
    </WorldLayout>
  );
}
