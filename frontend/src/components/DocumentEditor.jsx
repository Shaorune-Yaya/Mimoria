import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  EditorContent,
  useEditor,
} from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";

import Placeholder from "@tiptap/extension-placeholder";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  useTranslation,
} from "react-i18next";

import {
  API_URL,
} from "../config/api";

import {
  apiFetch,
} from "../utils/apiFetch";

import EntityMentionHighlighter, {
  ENTITY_MENTION_REFRESH_META,
} from "../extensions/EntityMentionHighlighter";


const AUTOSAVE_DELAY =
  1000;


// ======================================================
// Environment Helpers
// ======================================================

function isTouchEnvironment() {
  if (
    typeof window ===
    "undefined"
  ) {
    return false;
  }


  const narrowScreen =
    window.innerWidth <=
    760;


  const coarsePointer =
    window.matchMedia(
      "(pointer: coarse)"
    ).matches;


  const noHover =
    window.matchMedia(
      "(hover: none)"
    ).matches;


  return (
    narrowScreen ||
    coarsePointer ||
    noHover
  );
}


// ======================================================
// Toolbar Button
// ======================================================

function ToolbarButton({
  active = false,
  disabled = false,
  title,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      className={[
        "document-editor-tool",

        active
          ? "active"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={
        disabled
      }
      title={
        title
      }
      aria-label={
        title
      }
      onMouseDown={(
        event
      ) => {
        /*
         * Toolbar buttons should not destroy the
         * current editor selection.
         */
        event.preventDefault();
      }}
      onClick={
        onClick
      }
    >
      {children}
    </button>
  );
}


// ======================================================
// Document Editor
// ======================================================

function DocumentEditor({
  document,
  onSaved,
  onSaveStateChange,
}) {
  const {
    worldId,
  } = useParams();


  const navigate =
    useNavigate();


  const {
    t,
  } = useTranslation();


  // ====================================================
  // Save State
  // ====================================================

  const [
    saveState,
    setSaveState,
  ] = useState(
    "saved"
  );


  const [
    saveError,
    setSaveError,
  ] = useState("");

    // ====================================================
    // Report Save State to Parent
    // ====================================================

    useEffect(() => {
    if (
        typeof onSaveStateChange ===
        "function"
    ) {
        onSaveStateChange(
        saveState
        );
    }
    }, [
    saveState,
    onSaveStateChange,
    ]);
    
  // ====================================================
  // Responsive Input State
  // ====================================================

  const [
    touchMode,
    setTouchMode,
  ] = useState(
    () =>
      isTouchEnvironment()
  );


  // ====================================================
  // Entity Mentions
  // ====================================================

  const entitiesRef =
    useRef([]);


  const [
    mentionTooltip,
    setMentionTooltip,
  ] = useState(null);


  // ====================================================
  // Save Refs
  // ====================================================

  const saveTimerRef =
    useRef(null);


  const currentDocumentIdRef =
    useRef(
      document._id
    );


  const revisionRef =
    useRef(0);


  const mountedRef =
    useRef(true);


  const latestSnapshotRef =
    useRef(null);


  // ====================================================
  // Watch Responsive Mode
  // ====================================================

  useEffect(() => {
    function updateInputMode() {
      setTouchMode(
        isTouchEnvironment()
      );
    }


    updateInputMode();


    window.addEventListener(
      "resize",
      updateInputMode
    );


    return () => {
      window.removeEventListener(
        "resize",
        updateInputMode
      );
    };
  }, []);


  // ====================================================
  // Save Helpers
  // ====================================================

  function clearSaveTimer() {
    if (
      saveTimerRef.current
    ) {
      clearTimeout(
        saveTimerRef.current
      );


      saveTimerRef.current =
        null;
    }
  }


  function createSnapshot(
    editorInstance
  ) {
    return {
      content:
        editorInstance.getJSON(),

      plainText:
        editorInstance.getText({
          blockSeparator:
            "\n",
        }),
    };
  }


  async function saveSnapshot(
  documentId,
  snapshot,
  revision,
  {
    silent = false,
  } = {}
) {
  if (
    !documentId ||
    !snapshot
  ) {
    return;
  }


  try {
    if (
      !silent &&
      mountedRef.current &&
      currentDocumentIdRef.current ===
        documentId
    ) {
      setSaveState(
        "saving"
      );


      setSaveError(
        ""
      );
    }


    const data =
      await apiFetch(
        `${API_URL.documents}/${documentId}/content`,
        {
          method:
            "PUT",

          body: {
            content:
              snapshot.content,

            plainText:
              snapshot.plainText,
          },

          keepalive:
            silent,
        }
      );


    const savedDocument =
      data.document;


    if (
      savedDocument &&
      onSaved
    ) {
      onSaved(
        savedDocument
      );
    }


    if (
      !silent &&
      mountedRef.current &&
      currentDocumentIdRef.current ===
        documentId
    ) {
      if (
        revisionRef.current ===
        revision
      ) {
        setSaveState(
          "saved"
        );


        latestSnapshotRef.current =
          null;
      } else {
        setSaveState(
          "dirty"
        );
      }
    }
  } catch (
    error
  ) {
    console.error(
      "Failed to auto-save document:",
      error
    );


    if (
      !silent &&
      mountedRef.current &&
      currentDocumentIdRef.current ===
        documentId
    ) {
      setSaveState(
        "error"
      );


      setSaveError(
        error.message ||
        t(
          "documents.saveFailed"
        )
      );
    }
  }
}


  function scheduleSave(
    editorInstance
  ) {
    const documentId =
      currentDocumentIdRef.current;


    revisionRef.current +=
      1;


    const revision =
      revisionRef.current;


    const snapshot =
      createSnapshot(
        editorInstance
      );


    latestSnapshotRef.current =
      {
        documentId,
        revision,
        snapshot,
      };


    setSaveState(
      "dirty"
    );


    setSaveError(
      ""
    );


    clearSaveTimer();


    saveTimerRef.current =
      setTimeout(
        () => {
          saveTimerRef.current =
            null;


          saveSnapshot(
            documentId,
            snapshot,
            revision
          );
        },

        AUTOSAVE_DELAY
      );
  }


  function flushPendingSave() {
    clearSaveTimer();


    const pending =
      latestSnapshotRef.current;


    if (!pending) {
      return;
    }


    if (
      pending.documentId !==
      currentDocumentIdRef.current
    ) {
      return;
    }


    saveSnapshot(
      pending.documentId,
      pending.snapshot,
      pending.revision
    );
  }


  // ====================================================
  // Entity Navigation
  // ====================================================

  function openEntity(
    entity
  ) {
    if (
      !entity?._id ||
      !worldId
    ) {
      return;
    }


    setMentionTooltip(
      null
    );


    localStorage.setItem(
      `mimoria:world:${worldId}:selected-entity`,
      String(
        entity._id
      )
    );


    navigate(
      `/world/${worldId}/entities`
    );
  }


  // ====================================================
  // Tooltip Position
  // ====================================================

  function createTooltip(
    element,
    entity
    ) {
    if (
        !element ||
        !entity
    ) {
        return null;
    }


    const editorRoot =
        element.closest(
        ".document-editor"
        );


    if (
        !editorRoot
    ) {
        return null;
    }


    const mentionRect =
        element.getBoundingClientRect();

    const editorRect =
        editorRoot.getBoundingClientRect();


    const currentTouchMode =
        isTouchEnvironment();


    const tooltipWidth =
        currentTouchMode
        ? 290
        : 270;


    const estimatedHeight =
        currentTouchMode
        ? 170
        : 120;


    /*
    * Convert viewport coordinates into coordinates
    * relative to .document-editor.
    */
    let left =
        mentionRect.left -
        editorRect.left;


    let top =
        mentionRect.bottom -
        editorRect.top +
        6;


    /*
    * Keep the popup inside the editor horizontally.
    */
    const availableWidth =
        editorRoot.clientWidth;


    const horizontalMargin =
        currentTouchMode
        ? 8
        : 6;


    left =
        Math.max(
        horizontalMargin,
        Math.min(
            left,
            availableWidth -
            tooltipWidth -
            horizontalMargin
        )
        );


    /*
    * If there is not enough room below the Entity,
    * place the popup immediately above it.
    */
    const availableBelow =
        editorRoot.clientHeight -
        top;


    if (
        availableBelow <
        estimatedHeight
    ) {
        top =
        mentionRect.top -
        editorRect.top -
        estimatedHeight -
        6;
    }


    top =
        Math.max(
        6,
        top
        );


    return {
        entity,
        left,
        top,
    };
    }


  // ====================================================
  // Entity Mention Click
  // ====================================================

  function handleEntityMentionClick(
    entity,
    details
  ) {
    /*
     * IMPORTANT:
     *
     * Never use touchMode state to decide whether a
     * mention should navigate.
     *
     * TipTap may retain the callback created during
     * editor initialization.
     *
     * Checking the browser environment NOW avoids
     * stale React closure problems completely.
     */
    const currentTouchMode =
      isTouchEnvironment();


    if (
      currentTouchMode
    ) {
      const tooltip =
        createTooltip(
          details?.element,
          entity
        );


      if (
        tooltip
      ) {
        setMentionTooltip(
          tooltip
        );
      }


      /*
       * Absolutely no navigation happens here on
       * mobile / touch devices.
       */
      return;
    }


    /*
     * Desktop click opens the Entity immediately.
     */
    openEntity(
      entity
    );
  }


  // ====================================================
  // TipTap
  // ====================================================

  const editor =
    useEditor({
      extensions: [
        StarterKit,

        Placeholder.configure({
          placeholder:
            t(
              "documents.editorPlaceholder"
            ),
        }),

        EntityMentionHighlighter.configure({
          getEntities:
            () =>
              entitiesRef.current,

          onEntityClick:
            handleEntityMentionClick,
        }),
      ],


      content:
        document.content,


      editorProps: {
        attributes: {
          class:
            "document-editor-content",
        },
      },


      onUpdate({
        editor:
          editorInstance,
      }) {
        scheduleSave(
          editorInstance
        );
      },
    });


  // ====================================================
  // Load Entities
  // ====================================================

  useEffect(() => {
    if (
      !worldId ||
      !editor
    ) {
      return;
    }


    let cancelled =
      false;


    async function loadEntities() {
      try {
        const data =
          await apiFetch(
            `${API_URL.entities}/world/${worldId}`
          );


        if (
          cancelled
        ) {
          return;
        }


        entitiesRef.current =
          Array.isArray(
            data
          )
            ? data
            : [];


        if (
          !editor.isDestroyed
        ) {
          editor.view.dispatch(
            editor.state.tr.setMeta(
              ENTITY_MENTION_REFRESH_META,
              true
            )
          );
        }
      } catch (error) {
        console.error(
          "Failed to load Entity mentions:",
          error
        );


        if (
          cancelled
        ) {
          return;
        }


        entitiesRef.current =
          [];


        if (
          !editor.isDestroyed
        ) {
          editor.view.dispatch(
            editor.state.tr.setMeta(
              ENTITY_MENTION_REFRESH_META,
              true
            )
          );
        }
      }
    }


    loadEntities();


    return () => {
      cancelled =
        true;
    };
  }, [
    worldId,
    editor,
  ]);


  // ====================================================
  // Change Document
  // ====================================================

  useEffect(() => {
    if (!editor) {
      return;
    }


    clearSaveTimer();


    currentDocumentIdRef.current =
      document._id;


    revisionRef.current =
      0;


    latestSnapshotRef.current =
      null;


    setSaveState(
      "saved"
    );


    setSaveError(
      ""
    );


    setMentionTooltip(
      null
    );


    editor.commands.setContent(
      document.content || {
        type:
          "doc",

        content: [
          {
            type:
              "paragraph",

            content:
              [],
          },
        ],
      },
      {
        emitUpdate:
          false,
      }
    );


    editor.view.dispatch(
      editor.state.tr.setMeta(
        ENTITY_MENTION_REFRESH_META,
        true
      )
    );
  }, [
    document._id,
    editor,
  ]);


  // ====================================================
  // Final Save
  // ====================================================

  useEffect(() => {
    mountedRef.current =
      true;


    function handleBeforeUnload() {
      const pending =
        latestSnapshotRef.current;


      if (!pending) {
        return;
      }


      saveSnapshot(
        pending.documentId,
        pending.snapshot,
        pending.revision,
        {
          silent:
            true,
        }
      );
    }


    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );


    return () => {
      mountedRef.current =
        false;


      clearSaveTimer();


      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );


      const pending =
        latestSnapshotRef.current;


      if (pending) {
        saveSnapshot(
          pending.documentId,
          pending.snapshot,
          pending.revision,
          {
            silent:
              true,
          }
        );
      }
    };
  }, []);


  // ====================================================
  // Desktop Hover
  // ====================================================

  function handleEditorMouseOver(
    event
  ) {
    /*
     * Never create hover popups on mobile / touch.
     */
    if (
      isTouchEnvironment()
    ) {
      return;
    }


    const target =
      event.target;


    if (
      !target ||
      typeof target.closest !==
        "function"
    ) {
      return;
    }


    const mentionElement =
      target.closest(
        ".entity-mention[data-entity-id]"
      );


    if (
      !mentionElement
    ) {
      return;
    }


    const entityId =
      mentionElement.dataset
        .entityId;


    const entity =
      entitiesRef.current.find(
        (item) =>
          String(
            item._id
          ) ===
          String(
            entityId
          )
      );


    if (!entity) {
      return;
    }


    const tooltip =
      createTooltip(
        mentionElement,
        entity
      );


    if (
      tooltip
    ) {
      setMentionTooltip(
        tooltip
      );
    }
  }


  function handleEditorMouseOut(
    event
  ) {
    if (
      isTouchEnvironment()
    ) {
      return;
    }


    const target =
      event.target;


    if (
      !target ||
      typeof target.closest !==
        "function"
    ) {
      return;
    }


    const mentionElement =
      target.closest(
        ".entity-mention"
      );


    if (
      !mentionElement
    ) {
      return;
    }


    if (
      event.relatedTarget &&
      mentionElement.contains(
        event.relatedTarget
      )
    ) {
      return;
    }


    setMentionTooltip(
      null
    );
  }


  // ====================================================
  // Close Mobile Popup When Tapping Elsewhere
  // ====================================================

  useEffect(() => {
    if (
      !mentionTooltip
    ) {
      return;
    }


    function handleOutsidePointer(
      event
    ) {
      if (
        !isTouchEnvironment()
      ) {
        return;
      }


      const target =
        event.target;


      if (
        target?.closest?.(
          ".entity-mention-tooltip"
        )
      ) {
        return;
      }


      if (
        target?.closest?.(
          ".entity-mention"
        )
      ) {
        return;
      }


      setMentionTooltip(
        null
      );
    }


    window.document.addEventListener(
    "pointerdown",
    handleOutsidePointer
    );


    return () => {
    window.document.removeEventListener(
    "pointerdown",
    handleOutsidePointer
    );
    };
  }, [
    mentionTooltip,
  ]);


  // ====================================================
  // Loading
  // ====================================================

  if (!editor) {
    return (
      <div className="document-editor-loading">
        {t(
          "documents.editorLoading"
        )}
      </div>
    );
  }


  // ====================================================
  // Save Label
  // ====================================================

  const saveLabel = {
    dirty:
      t(
        "documents.unsaved"
      ),

    saving:
      t(
        "documents.saving"
      ),

    saved:
      t(
        "documents.saved"
      ),

    error:
      t(
        "documents.saveError"
      ),
  }[
    saveState
  ];


  // ====================================================
  // Render
  // ====================================================

  return (
      <div
        className="document-editor"
        data-onboarding="document-editor"
      >

      {/* ==================================================
          Toolbar
          ================================================== */}

      <div
        className="document-editor-toolbar"
        data-onboarding="document-editor-toolbar"
      >

        <div className="document-editor-toolbar-group">

          <ToolbarButton
            active={
              editor.isActive(
                "bold"
              )
            }
            title={t(
              "documents.toolbarBold"
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleBold()
                .run()
            }
          >
            <strong>
              B
            </strong>
          </ToolbarButton>


          <ToolbarButton
            active={
              editor.isActive(
                "italic"
              )
            }
            title={t(
              "documents.toolbarItalic"
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleItalic()
                .run()
            }
          >
            <em>
              I
            </em>
          </ToolbarButton>


          <ToolbarButton
            active={
              editor.isActive(
                "strike"
              )
            }
            title={t(
              "documents.toolbarStrike"
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleStrike()
                .run()
            }
          >
            <span className="document-editor-strike-label">
              S
            </span>
          </ToolbarButton>

        </div>


        <div className="document-editor-toolbar-divider" />


        <div className="document-editor-toolbar-group">

          <ToolbarButton
            active={
              editor.isActive(
                "paragraph"
              )
            }
            title={t(
              "documents.toolbarParagraph"
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .setParagraph()
                .run()
            }
          >
            ¶
          </ToolbarButton>


          <ToolbarButton
            active={
              editor.isActive(
                "heading",
                {
                  level:
                    1,
                }
              )
            }
            title={t(
              "documents.toolbarHeading1"
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleHeading({
                  level:
                    1,
                })
                .run()
            }
          >
            H1
          </ToolbarButton>


          <ToolbarButton
            active={
              editor.isActive(
                "heading",
                {
                  level:
                    2,
                }
              )
            }
            title={t(
              "documents.toolbarHeading2"
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleHeading({
                  level:
                    2,
                })
                .run()
            }
          >
            H2
          </ToolbarButton>

        </div>


        <div className="document-editor-toolbar-divider" />


        <div className="document-editor-toolbar-group">

          <ToolbarButton
            active={
              editor.isActive(
                "bulletList"
              )
            }
            title={t(
              "documents.toolbarBulletList"
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleBulletList()
                .run()
            }
          >
            •
          </ToolbarButton>


          <ToolbarButton
            active={
              editor.isActive(
                "orderedList"
              )
            }
            title={t(
              "documents.toolbarOrderedList"
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleOrderedList()
                .run()
            }
          >
            1.
          </ToolbarButton>


          <ToolbarButton
            active={
              editor.isActive(
                "blockquote"
              )
            }
            title={t(
              "documents.toolbarQuote"
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleBlockquote()
                .run()
            }
          >
            “
          </ToolbarButton>

        </div>


        <div className="document-editor-toolbar-spacer" />


        <div className="document-editor-toolbar-group">

          <ToolbarButton
            disabled={
              !editor
                .can()
                .chain()
                .focus()
                .undo()
                .run()
            }
            title={t(
              "documents.toolbarUndo"
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .undo()
                .run()
            }
          >
            ↶
          </ToolbarButton>


          <ToolbarButton
            disabled={
              !editor
                .can()
                .chain()
                .focus()
                .redo()
                .run()
            }
            title={t(
              "documents.toolbarRedo"
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .redo()
                .run()
            }
          >
            ↷
          </ToolbarButton>

        </div>

      </div>


      {/* ==================================================
          Editor
          ================================================== */}

      <div
        className="document-editor-scroll"
        data-onboarding="document-editor-content"
        onBlurCapture={(
          event
        ) => {
          if (
            event.currentTarget.contains(
              event.relatedTarget
            )
          ) {
            return;
          }


          flushPendingSave();
        }}
        onMouseOver={
          handleEditorMouseOver
        }
        onMouseOut={
          handleEditorMouseOut
        }
        onScroll={() => {
          /*
           * Desktop hover popup is tied to a visual
           * position, so hide it while scrolling.
           *
           * Mobile popup stays open.
           */
          if (
            !isTouchEnvironment()
          ) {
            setMentionTooltip(
              null
            );
          }
        }}
      >
        <EditorContent
          editor={
            editor
          }
        />
      </div>


      {/* ==================================================
          Save Status
          ================================================== */}

      <footer
        className="document-editor-statusbar"
        data-onboarding="document-save-status"
      >

        <div
          className={[
            "document-save-state",
            `state-${saveState}`,
          ].join(" ")}
          title={
            saveError || ""
          }
        >
          <span className="document-save-state-dot" />

          <span>
            {
              saveLabel
            }
          </span>
        </div>


        {saveState ===
          "error" &&
          saveError && (
            <span className="document-save-error">
              {
                saveError
              }
            </span>
          )}


        <div className="document-editor-status-spacer" />


        <span>
          {t(
            "documents.autoSaveEnabled"
          )}
        </span>

      </footer>


      {/* ==================================================
          Entity Tooltip
          ================================================== */}

      {mentionTooltip && (
        <div
          className={[
            "entity-mention-tooltip",

            touchMode
              ? "touch-mode"
              : "desktop-mode",
          ].join(" ")}
          style={{
            left:
              mentionTooltip.left,

            top:
              mentionTooltip.top,
          }}
        >

          <div className="entity-mention-tooltip-icon">
            {
              mentionTooltip
                .entity
                .entityTypeId
                ?.icon ||
              "◆"
            }
          </div>


          <div className="entity-mention-tooltip-content">

            <strong>
              {
                mentionTooltip
                  .entity
                  .name
              }
            </strong>


            <div className="entity-mention-tooltip-type">
              {t(
                "documents.entityMentionType"
              )}

              {" · "}

              {
                mentionTooltip
                  .entity
                  .entityTypeId
                  ?.name ||
                t(
                  "documents.entityMentionUnknownType"
                )
              }
            </div>


            {mentionTooltip
              .entity
              .entityTypeId
              ?.description && (
              <p>
                {
                  mentionTooltip
                    .entity
                    .entityTypeId
                    .description
                }
              </p>
            )}


            {!touchMode && (
              <span className="entity-mention-tooltip-hint">
                {t(
                  "documents.entityMentionOpenHint"
                )}
              </span>
            )}


            {touchMode && (
              <button
                type="button"
                className="entity-mention-tooltip-open"
                onPointerDown={(
                  event
                ) => {
                  /*
                   * Keep the global outside-pointer
                   * handler from closing the popup
                   * before the button click occurs.
                   */
                  event.stopPropagation();
                }}
                onClick={() => {
                  openEntity(
                    mentionTooltip
                      .entity
                  );
                }}
              >
                {t(
                  "documents.entityMentionOpen"
                )}
              </button>
            )}

          </div>

        </div>
      )}

    </div>
  );
}


export default DocumentEditor;