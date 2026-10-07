import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useTranslation,
} from "react-i18next";

import {
  useParams,
} from "react-router-dom";

import WorldLayout from "../components/WorldLayout";
import { API_URL } from "../config/api";

function DocumentsPage() {
  const { worldId } =
    useParams();

  const { t } =
    useTranslation();

  const menuRef =
    useRef(null);

  const [world, setWorld] =
    useState(null);

  const [treeNodes, setTreeNodes] =
    useState([]);

  const [
    selectedDocument,
    setSelectedDocument,
  ] = useState(null);

  const [
    expandedFolders,
    setExpandedFolders,
  ] = useState(() => new Set());

  const [
    contextMenu,
    setContextMenu,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadPage();
  }, [worldId]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target
        )
      ) {
        setContextMenu(null);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  async function loadPage() {
    try {
      setLoading(true);
      setError("");

      const [
        worldResponse,
        treeResponse,
      ] = await Promise.all([
        fetch(
          `${API_URL.worlds}/${worldId}`
        ),

        fetch(
          `${API_URL.documentTree}/world/${worldId}`
        ),
      ]);

      if (!worldResponse.ok) {
        throw new Error(
          t("workspace.notFound")
        );
      }

      if (!treeResponse.ok) {
        throw new Error(
          t("documents.loadError")
        );
      }

      const worldData =
        await worldResponse.json();

      const treeData =
        await treeResponse.json();

      setWorld(worldData);

      const safeTreeData =
        Array.isArray(treeData)
          ? treeData
          : [];

      setTreeNodes(
        safeTreeData
      );

      setExpandedFolders(
        (previous) => {
          const next =
            new Set(previous);

          for (
            const node of safeTreeData
          ) {
            if (
              node.kind === "folder"
            ) {
              next.add(node._id);
            }
          }

          return next;
        }
      );

      if (selectedDocument) {
        const updatedNode =
          safeTreeData.find(
            (node) =>
              node.kind ===
                "document" &&
              node.documentId?._id ===
                selectedDocument._id
          );

        if (updatedNode?.documentId) {
          setSelectedDocument(
            updatedNode.documentId
          );
        } else {
          setSelectedDocument(
            null
          );
        }
      }
    } catch (loadError) {
      console.error(
        "Failed to load Documents page:",
        loadError
      );

      setError(
        loadError.message ||
          t(
            "documents.loadError"
          )
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshTree() {
    try {
      const response =
        await fetch(
          `${API_URL.documentTree}/world/${worldId}`
        );

      if (!response.ok) {
        throw new Error(
          t(
            "documents.loadError"
          )
        );
      }

      const data =
        await response.json();

      const safeData =
        Array.isArray(data)
          ? data
          : [];

      setTreeNodes(safeData);

      if (selectedDocument) {
        const updatedNode =
          safeData.find(
            (node) =>
              node.kind ===
                "document" &&
              node.documentId?._id ===
                selectedDocument._id
          );

        if (
          updatedNode?.documentId
        ) {
          setSelectedDocument(
            updatedNode.documentId
          );
        } else {
          setSelectedDocument(
            null
          );
        }
      }
    } catch (refreshError) {
      console.error(
        "Failed to refresh document tree:",
        refreshError
      );

      setError(
        refreshError.message ||
          t(
            "documents.loadError"
          )
      );
    }
  }

  const nodesByParent =
    useMemo(() => {
      const map =
        new Map();

      for (
        const node of treeNodes
      ) {
        const parentKey =
          node.parentId
            ? String(
                node.parentId
              )
            : "root";

        if (
          !map.has(parentKey)
        ) {
          map.set(
            parentKey,
            []
          );
        }

        map
          .get(parentKey)
          .push(node);
      }

      for (
        const children of map.values()
      ) {
        children.sort(
          (a, b) =>
            (a.order ?? 0) -
            (b.order ?? 0)
        );
      }

      return map;
    }, [treeNodes]);

  function selectDocument(
    node
  ) {
    if (
      node.kind !==
      "document"
    ) {
      return;
    }

    if (
      !node.documentId ||
      typeof node.documentId !==
        "object"
    ) {
      return;
    }

    setSelectedDocument(
      node.documentId
    );

    setContextMenu(null);
  }

  function toggleFolder(
    folderId
  ) {
    setExpandedFolders(
      (previous) => {
        const next =
          new Set(previous);

        if (
          next.has(folderId)
        ) {
          next.delete(
            folderId
          );
        } else {
          next.add(
            folderId
          );
        }

        return next;
      }
    );
  }

  function openContextMenu(
    event,
    node
  ) {
    event.preventDefault();
    event.stopPropagation();

    const menuWidth = 190;
    const menuHeight = 220;

    const maxX =
      window.innerWidth -
      menuWidth -
      8;

    const maxY =
      window.innerHeight -
      menuHeight -
      8;

    setContextMenu({
      node,
      x: Math.min(
        event.clientX,
        maxX
      ),
      y: Math.min(
        event.clientY,
        maxY
      ),
    });
  }

  async function createDocument(
    parentId = null
  ) {
    setContextMenu(null);

    const title =
      window.prompt(
        t(
          "documents.documentName"
        ),
        t(
          "documents.untitled"
        )
      );

    if (
      title === null
    ) {
      return;
    }

    const trimmedTitle =
      title.trim();

    if (
      !trimmedTitle
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          API_URL.documents,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              worldId,
              title:
                trimmedTitle,
              parentId,
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          t(
            "documents.createFailed"
          )
        );
      }

      const newDocument =
        await response.json();

      if (parentId) {
        setExpandedFolders(
          (previous) => {
            const next =
              new Set(
                previous
              );

            next.add(
              parentId
            );

            return next;
          }
        );
      }

      await refreshTree();

      setSelectedDocument(
        newDocument
      );
    } catch (createError) {
      console.error(
        "Failed to create document:",
        createError
      );

      window.alert(
        createError.message ||
          t(
            "documents.createFailed"
          )
      );
    }
  }

  async function createFolder(
    parentId = null
  ) {
    setContextMenu(null);

    const name =
      window.prompt(
        t(
          "documents.folderName"
        ),
        t(
          "documents.newFolder"
        )
      );

    if (
      name === null
    ) {
      return;
    }

    const trimmedName =
      name.trim();

    if (!trimmedName) {
      return;
    }

    try {
      const response =
        await fetch(
          `${API_URL.documentTree}/folders`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              worldId,
              name:
                trimmedName,
              parentId,
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          t(
            "documents.createFolderFailed"
          )
        );
      }

      const folder =
        await response.json();

      if (parentId) {
        setExpandedFolders(
          (previous) => {
            const next =
              new Set(
                previous
              );

            next.add(
              parentId
            );

            next.add(
              folder._id
            );

            return next;
          }
        );
      } else {
        setExpandedFolders(
          (previous) => {
            const next =
              new Set(
                previous
              );

            next.add(
              folder._id
            );

            return next;
          }
        );
      }

      await refreshTree();
    } catch (createError) {
      console.error(
        "Failed to create folder:",
        createError
      );

      window.alert(
        createError.message ||
          t(
            "documents.createFolderFailed"
          )
      );
    }
  }

  async function renameNode(
    node
  ) {
    setContextMenu(null);

    const newName =
      window.prompt(
        t(
          "documents.rename"
        ),
        node.name
      );

    if (
      newName === null
    ) {
      return;
    }

    const trimmedName =
      newName.trim();

    if (!trimmedName) {
      return;
    }

    try {
      let response;

      if (
        node.kind ===
        "folder"
      ) {
        response =
          await fetch(
            `${API_URL.documentTree}/${node._id}/name`,
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  name:
                    trimmedName,
                }),
            }
          );
      } else {
        const documentId =
          node.documentId?._id;

        if (!documentId) {
          return;
        }

        response =
          await fetch(
            `${API_URL.documents}/${documentId}/title`,
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  title:
                    trimmedName,
                }),
            }
          );
      }

      if (!response.ok) {
        throw new Error(
          t(
            "documents.renameFailed"
          )
        );
      }

      await refreshTree();
    } catch (renameError) {
      console.error(
        "Failed to rename document node:",
        renameError
      );

      window.alert(
        renameError.message ||
          t(
            "documents.renameFailed"
          )
      );
    }
  }

  async function deleteNode(
    node
  ) {
    setContextMenu(null);

    const confirmed =
      window.confirm(
        node.kind ===
          "folder"
          ? t(
              "documents.deleteFolderConfirm"
            )
          : t(
              "documents.deleteDocumentConfirm"
            )
      );

    if (!confirmed) {
      return;
    }

    try {
      let response;

      if (
        node.kind ===
        "folder"
      ) {
        response =
          await fetch(
            `${API_URL.documentTree}/${node._id}`,
            {
              method:
                "DELETE",
            }
          );
      } else {
        const documentId =
          node.documentId?._id;

        if (!documentId) {
          return;
        }

        response =
          await fetch(
            `${API_URL.documents}/${documentId}`,
            {
              method:
                "DELETE",
            }
          );
      }

      if (!response.ok) {
        throw new Error(
          t(
            "documents.deleteFailed"
          )
        );
      }

      if (
        node.kind ===
          "document" &&
        selectedDocument?._id ===
          node.documentId?._id
      ) {
        setSelectedDocument(
          null
        );
      }

      if (
        node.kind ===
        "folder"
      ) {
        setExpandedFolders(
          (previous) => {
            const next =
              new Set(
                previous
              );

            next.delete(
              node._id
            );

            return next;
          }
        );
      }

      await refreshTree();
    } catch (deleteError) {
      console.error(
        "Failed to delete document node:",
        deleteError
      );

      window.alert(
        deleteError.message ||
          t(
            "documents.deleteFailed"
          )
      );
    }
  }

  function renderTree(
    parentId = null,
    depth = 0
  ) {
    const parentKey =
      parentId
        ? String(parentId)
        : "root";

    const children =
      nodesByParent.get(
        parentKey
      ) || [];

    if (
      children.length === 0
    ) {
      return null;
    }

    return children.map(
      (node) => {
        const isFolder =
          node.kind ===
          "folder";

        const isExpanded =
          isFolder &&
          expandedFolders.has(
            node._id
          );

        const isSelected =
          node.kind ===
            "document" &&
          selectedDocument?._id ===
            node.documentId?._id;

        return (
          <div
            key={
              node._id
            }
          >
            <div
              className={
                isSelected
                  ? "documents-tree-row selected"
                  : "documents-tree-row"
              }
              style={{
                paddingLeft:
                  8 +
                  depth *
                    18,
              }}
              onClick={() => {
                if (
                  isFolder
                ) {
                  toggleFolder(
                    node._id
                  );
                } else {
                  selectDocument(
                    node
                  );
                }
              }}
              onContextMenu={(
                event
              ) =>
                openContextMenu(
                  event,
                  node
                )
              }
            >
              <button
                type="button"
                className="documents-tree-main"
              >
                <span className="documents-tree-icon">
                  {isFolder
                    ? isExpanded
                      ? "▾"
                      : "▸"
                    : "▤"}
                </span>

                <span className="documents-tree-name">
                  {node.name}
                </span>
              </button>

              <button
                type="button"
                className="documents-tree-menu-button"
                aria-label={t(
                  "documents.moreActions"
                )}
                onClick={(
                  event
                ) => {
                  openContextMenu(
                    event,
                    node
                  );
                }}
              >
                ⋯
              </button>
            </div>

            {isFolder &&
              isExpanded &&
              renderTree(
                node._id,
                depth + 1
              )}
          </div>
        );
      }
    );
  }

  const storyNeedsSync =
    selectedDocument &&
    selectedDocument
      .contentVersion >
      selectedDocument
        .syncedVersion;

  const documentsExplorer = (
    <aside className="documents-explorer">
      <div className="documents-explorer-header">
        <div>
          <div className="documents-explorer-title">
            {t(
              "documents.title"
            )}
          </div>

          <div className="documents-explorer-subtitle">
            {t(
              "documents.subtitle"
            )}
          </div>
        </div>

        <div className="documents-header-actions">
          <button
            type="button"
            className="documents-explorer-add"
            title={t(
              "documents.newDocument"
            )}
            onClick={() =>
              createDocument(
                null
              )
            }
          >
            +
          </button>

          <button
            type="button"
            className="documents-explorer-folder-add"
            title={t(
              "documents.newFolder"
            )}
            onClick={() =>
              createFolder(
                null
              )
            }
          >
            📁
          </button>
        </div>
      </div>

      <div className="documents-explorer-body">
        {loading && (
          <div className="documents-explorer-message">
            {t(
              "documents.loading"
            )}
          </div>
        )}

        {!loading &&
          error && (
            <div className="documents-explorer-message error">
              {error}
            </div>
          )}

        {!loading &&
          !error &&
          treeNodes.length ===
            0 && (
            <div className="documents-explorer-message">
              {t(
                "documents.emptyTree"
              )}
            </div>
          )}

        {!loading &&
          !error &&
          treeNodes.length >
            0 &&
          renderTree()}
      </div>
    </aside>
  );

  return (
    <>
      <WorldLayout
        worldId={
          worldId
        }
        worldName={
          world?.name ||
          t("app.name")
        }
        secondarySidebar={
          documentsExplorer
        }
      >
        <div className="documents-workspace">
          {!selectedDocument && (
            <div className="documents-empty-state">
              <div className="documents-empty-icon">
                ▤
              </div>

              <h1>
                {t(
                  "documents.selectTitle"
                )}
              </h1>

              <p>
                {t(
                  "documents.selectDescription"
                )}
              </p>

              <p className="documents-empty-note">
                {t(
                  "documents.comingSoon"
                )}
              </p>
            </div>
          )}

          {selectedDocument && (
            <div className="document-preview">
              <header className="document-preview-header">
                <div>
                  <h1>
                    {selectedDocument.title ||
                      t(
                        "documents.untitled"
                      )}
                  </h1>

                  <div className="document-preview-meta">
                    {t(
                      "documents.version"
                    )}{" "}
                    {
                      selectedDocument.contentVersion
                    }
                    {" · "}

                    {storyNeedsSync
                      ? t(
                          "documents.storyOutOfSync"
                        )
                      : t(
                          "documents.storySynced"
                        )}
                  </div>
                </div>

                <button
                  type="button"
                  className="document-sync-button"
                  disabled
                  title={t(
                    "documents.syncComingSoon"
                  )}
                >
                  ↻{" "}
                  {t(
                    "documents.sync"
                  )}
                </button>
              </header>

              <div className="document-preview-body">
                {selectedDocument.plainText ? (
                  <p className="document-preview-text">
                    {
                      selectedDocument.plainText
                    }
                  </p>
                ) : (
                  <p className="document-preview-placeholder">
                    {t(
                      "documents.emptyDocument"
                    )}
                  </p>
                )}
              </div>

              <footer className="document-preview-footer">
                <span>
                  {t(
                    "documents.saved"
                  )}
                </span>

                <span>
                  {storyNeedsSync
                    ? t(
                        "documents.syncPending"
                      )
                    : t(
                        "documents.syncUpToDate"
                      )}
                </span>
              </footer>
            </div>
          )}
        </div>
      </WorldLayout>

      {contextMenu && (
        <div
          ref={menuRef}
          className="documents-context-menu"
          style={{
            left:
              contextMenu.x,
            top:
              contextMenu.y,
          }}
        >
          {contextMenu.node
            .kind ===
            "folder" && (
            <>
              <button
                type="button"
                onClick={() =>
                  createDocument(
                    contextMenu
                      .node
                      ._id
                  )
                }
              >
                {t(
                  "documents.newDocumentInside"
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  createFolder(
                    contextMenu
                      .node
                      ._id
                  )
                }
              >
                {t(
                  "documents.newFolderInside"
                )}
              </button>

              <div className="documents-context-divider" />
            </>
          )}

          <button
            type="button"
            onClick={() =>
              renameNode(
                contextMenu.node
              )
            }
          >
            {t(
              "documents.rename"
            )}
          </button>

          <div className="documents-context-divider" />

          <button
            type="button"
            className="danger"
            onClick={() =>
              deleteNode(
                contextMenu.node
              )
            }
          >
            {t(
              "documents.delete"
            )}
          </button>
        </div>
      )}
    </>
  );
}

export default DocumentsPage;