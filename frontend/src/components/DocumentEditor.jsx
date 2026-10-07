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
  useTranslation,
} from "react-i18next";

import { API_URL } from "../config/api";


const AUTOSAVE_DELAY =
  1000;


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
         * Prevent toolbar clicks from stealing
         * focus from the editor selection.
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


function DocumentEditor({
  document,
  onSaved,
}) {
  const {
    t,
  } = useTranslation();

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

      const response =
        await fetch(
          `${API_URL.documents}/${documentId}/content`,
          {
            method:
              "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                content:
                  snapshot.content,

                plainText:
                  snapshot.plainText,
              }),

            /*
             * Allows a final save request to continue
             * while navigating away from the page.
             */
            keepalive:
              silent,
          }
        );

      if (
        !response.ok
      ) {
        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        throw new Error(
          data.message ||
            t(
              "documents.saveFailed"
            )
        );
      }

      const data =
        await response.json();

      const savedDocument =
        data.document;

      /*
       * Always tell the parent that this specific
       * document was saved. The parent will only
       * replace the currently selected document
       * when the IDs still match.
       */
      if (
        savedDocument &&
        onSaved
      ) {
        onSaved(
          savedDocument
        );
      }

      /*
       * A newer edit may have happened while the
       * request was in flight. In that case the
       * editor should remain in the "unsaved" state.
       */
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
        } else {
          setSaveState(
            "dirty"
          );
        }
      }
    } catch (error) {
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


  /*
   * Change the editor content only when switching
   * to a different document.
   *
   * Auto-save updates the document object frequently,
   * but must not reset the cursor or selection.
   */
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
  }, [
    document._id,
    editor,
  ]);


  /*
   * Save immediately when the editor loses focus.
   * This also protects edits when the user clicks
   * another document before the debounce timer fires.
   */
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


  useEffect(() => {
    mountedRef.current =
      true;

    function handleBeforeUnload() {
      const pending =
        latestSnapshotRef.current;

      if (!pending) {
        return;
      }

      /*
       * Use a keepalive fetch for the last pending
       * snapshot when the browser is closing/reloading.
       */
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


  if (!editor) {
    return (
      <div className="document-editor-loading">
        {t(
          "documents.editorLoading"
        )}
      </div>
    );
  }


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


  return (
    <div className="document-editor">
      <div className="document-editor-toolbar">
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
              !editor.can()
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
              !editor.can()
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


      <div
        className="document-editor-scroll"
        onBlurCapture={
          (event) => {
            /*
             * Ignore focus moving between controls
             * inside the editor itself.
             */
            if (
              event.currentTarget.contains(
                event.relatedTarget
              )
            ) {
              return;
            }

            flushPendingSave();
          }
        }
      >
        <EditorContent
          editor={
            editor
          }
        />
      </div>


      <footer className="document-editor-statusbar">
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
    </div>
  );
}


export default DocumentEditor;