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

import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

import {
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";

import WorldLayout from "../components/WorldLayout";
import { API_URL } from "../config/api";


// ======================================================
// Document Tree Row
// ======================================================

function DocumentTreeRow({
  node,
  depth,
  expanded,
  selectedDocumentId,
  activeNodeId,

  onToggle,
  onSelectDocument,
  onCreateDocument,
  onContextMenu,

  editingNodeId,
  editingName,
  onEditingNameChange,
  onRenameSubmit,
  onRenameCancel,

  t,
  renderChildren,
}) {
  const isActive =
    activeNodeId ===
    node._id;

  const {
    attributes,
    listeners,
    setNodeRef:
      setDragRef,
    isDragging,
  } = useDraggable({
    id:
      node._id,

    disabled:
      editingNodeId ===
      node._id,
  });


  // ====================================================
  // Three Independent Drop Zones
  // ====================================================

  const {
    setNodeRef:
      setBeforeDropRef,

    isOver:
      isBeforeOver,
  } = useDroppable({
    id:
      `before:${node._id}`,

    disabled:
      isActive,
  });


  const isFolder =
    node.kind ===
    "folder";


  const {
    setNodeRef:
      setInsideDropRef,

    isOver:
      isInsideOver,
  } = useDroppable({
    id:
      `inside:${node._id}`,

    disabled:
      isActive ||
      !isFolder,
  });


  const {
    setNodeRef:
      setAfterDropRef,

    isOver:
      isAfterOver,
  } = useDroppable({
    id:
      `after:${node._id}`,

    disabled:
      isActive,
  });


  // ====================================================
  // Display
  // ====================================================

  const style = {
    paddingLeft:
      `${
        8 +
        depth * 16
      }px`,

    opacity:
      isDragging
        ? 0.45
        : 1,
  };


  const displayName =
    node.name ||
    t(
      "documents.untitled"
    );


  const icon =
    isFolder
      ? "📁"
      : "▤";


  const isSelected =
    !isFolder &&
    selectedDocumentId ===
      node.documentId?._id;


  const isRenaming =
    editingNodeId ===
    node._id;


  const rowClassName = [
    "explorer-row",

    isSelected
      ? "selected"
      : "",

    isBeforeOver
      ? "drop-before"
      : "",

    isInsideOver
      ? "drop-inside-target"
      : "",

    isAfterOver
      ? "drop-after"
      : "",
  ]
    .filter(Boolean)
    .join(" ");


  return (
    <>
      <div
        ref={
          setDragRef
        }
        className={
          rowClassName
        }
        style={
          style
        }
        {...attributes}
        onContextMenu={
          (event) =>
            onContextMenu(
              event,
              node
            )
        }
      >
        {/* Drop above this node. */}

        <div
          ref={
            setBeforeDropRef
          }
          className="explorer-drop-zone explorer-drop-zone-before"
        />


        {/* Drop inside folders only. */}

        {isFolder && (
          <div
            ref={
              setInsideDropRef
            }
            className="explorer-drop-zone explorer-drop-zone-inside"
          />
        )}


        {/* Drop below this node. */}

        <div
          ref={
            setAfterDropRef
          }
          className="explorer-drop-zone explorer-drop-zone-after"
        />


        {/* Expand / collapse */}

        <button
          type="button"
          className="explorer-toggle"
          onClick={
            (event) => {
              event.stopPropagation();

              if (
                isFolder
              ) {
                onToggle(
                  node._id
                );
              }
            }
          }
          aria-label={
            expanded
              ? t(
                  "documents.collapse"
                )
              : t(
                  "documents.expand"
                )
          }
        >
          {
            isFolder
              ? expanded
                ? "⌄"
                : "›"
              : ""
          }
        </button>


        {/* Inline rename */}

        {isRenaming ? (
          <div className="explorer-rename-wrap">
            <span className="explorer-icon">
              {icon}
            </span>

            <input
              autoFocus
              className="explorer-rename-input"
              value={
                editingName
              }
              onChange={
                (event) =>
                  onEditingNameChange(
                    event.target.value
                  )
              }
              onClick={
                (event) =>
                  event
                    .stopPropagation()
              }
              onDoubleClick={
                (event) =>
                  event
                    .stopPropagation()
              }
              onBlur={
                onRenameCancel
              }
              onKeyDown={
                (event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    event.preventDefault();

                    onRenameSubmit(
                      node
                    );
                  }

                  if (
                    event.key ===
                    "Escape"
                  ) {
                    event.preventDefault();

                    onRenameCancel();
                  }
                }
              }
            />
          </div>
        ) : (
          <button
            type="button"
            className="explorer-node-main"
            onClick={
              () => {
                if (
                  isFolder
                ) {
                  onToggle(
                    node._id
                  );
                } else {
                  onSelectDocument(
                    node
                  );
                }
              }
            }
          >
            <span className="explorer-icon">
              {icon}
            </span>

            <span className="explorer-name">
              {
                displayName
              }
            </span>
          </button>
        )}


        {!isRenaming && (
          <>
            <button
              type="button"
              className="explorer-add-child"
              onClick={
                (event) => {
                  event
                    .stopPropagation();

                  if (
                    isFolder
                  ) {
                    onCreateDocument(
                      node._id
                    );
                  }
                }
              }
              title={
                isFolder
                  ? t(
                      "documents.newDocumentInside"
                    )
                  : ""
              }
              aria-label={
                isFolder
                  ? t(
                      "documents.newDocumentInside"
                    )
                  : ""
              }
              disabled={
                !isFolder
              }
            >
              {isFolder
                ? "+"
                : ""}
            </button>


            <button
              type="button"
              className="explorer-context-button"
              onClick={
                (event) => {
                  event
                    .stopPropagation();

                  onContextMenu(
                    event,
                    node
                  );
                }
              }
              title={t(
                "documents.moreActions"
              )}
              aria-label={t(
                "documents.moreActions"
              )}
            >
              ⋯
            </button>


            <button
              type="button"
              className="explorer-drag-handle"
              {...listeners}
              title={t(
                "documents.drag"
              )}
              aria-label={t(
                "documents.drag"
              )}
            >
              ⋮⋮
            </button>
          </>
        )}
      </div>


      {isFolder &&
        expanded &&
        renderChildren(
          node._id,
          depth + 1
        )}
    </>
  );
}

// ======================================================
// Root Drop Zone
// ======================================================

function DocumentRootDropZone({
  t,
}) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id:
      "document-root:end",
  });

  return (
    <div
      ref={
        setNodeRef
      }
      className={
        isOver
          ? "tree-root-drop-zone active"
          : "tree-root-drop-zone"
      }
    >
      {t(
        "documents.root"
      )}
    </div>
  );
}


// ======================================================
// Documents Page
// ======================================================

function DocumentsPage() {
  const {
    worldId,
  } = useParams();

  const {
    t,
  } = useTranslation();

  const menuRef =
    useRef(null);

  // ====================================================
  // Base Data
  // ====================================================

  const [
    world,
    setWorld,
  ] = useState(null);

  const [
    treeNodes,
    setTreeNodes,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  // ====================================================
  // Document Workspace
  // ====================================================

  const [
    selectedDocument,
    setSelectedDocument,
  ] = useState(null);

  const [
    showCreateDocument,
    setShowCreateDocument,
  ] = useState(false);

  const [
    documentTitle,
    setDocumentTitle,
  ] = useState("");

  const [
    documentParentId,
    setDocumentParentId,
  ] = useState(null);

  // ====================================================
  // Explorer
  // ====================================================

  const [
    expandedFolders,
    setExpandedFolders,
  ] = useState(
    () => new Set()
  );

  const [
    activeNodeId,
    setActiveNodeId,
  ] = useState(null);

  const activeDocumentNode =
  activeNodeId
    ? treeNodes.find(
        (node) =>
          node._id ===
          activeNodeId
      )
    : null;

  // ====================================================
  // Folder Creation
  // ====================================================

  const [
    showFolderForm,
    setShowFolderForm,
  ] = useState(false);

  const [
    folderName,
    setFolderName,
  ] = useState("");

  const [
    folderParentId,
    setFolderParentId,
  ] = useState(null);

  // ====================================================
  // Rename / Delete / Context Menu
  // ====================================================

  const [
    editingNodeId,
    setEditingNodeId,
  ] = useState(null);

  const [
    editingName,
    setEditingName,
  ] = useState("");

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState(null);

  const [
    contextMenu,
    setContextMenu,
  ] = useState(null);

  const [
    actionError,
    setActionError,
  ] = useState("");

  // ====================================================
  // Initial Loading
  // ====================================================

  useEffect(() => {
    loadPage();
  }, [
    worldId,
  ]);

  useEffect(() => {
    function handleOutsideClick(
      event
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target
        )
      ) {
        setContextMenu(
          null
        );
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
      setLoading(
        true
      );

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

      if (
        !worldResponse.ok
      ) {
        throw new Error(
          t(
            "workspace.notFound"
          )
        );
      }

      if (
        !treeResponse.ok
      ) {
        throw new Error(
          t(
            "documents.loadError"
          )
        );
      }

      const worldData =
        await worldResponse.json();

      const treeData =
        await treeResponse.json();

      const safeTreeData =
        Array.isArray(
          treeData
        )
          ? treeData
          : [];

      setWorld(
        worldData
      );

      setTreeNodes(
        safeTreeData
      );

      setExpandedFolders(
        (current) => {
          const next =
            new Set(
              current
            );

          for (
            const node of
            safeTreeData
          ) {
            if (
              node.kind ===
              "folder"
            ) {
              next.add(
                node._id
              );
            }
          }

          return next;
        }
      );
    } catch (
      loadError
    ) {
      console.error(
        "Failed to load Documents:",
        loadError
      );

      setError(
        loadError.message ||
          t(
            "documents.loadError"
          )
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  async function refreshTree(
    preferredDocumentId =
      null
  ) {
    try {
      const response =
        await fetch(
          `${API_URL.documentTree}/world/${worldId}`
        );

      if (
        !response.ok
      ) {
        throw new Error(
          t(
            "documents.loadError"
          )
        );
      }

      const data =
        await response.json();

      const safeData =
        Array.isArray(
          data
        )
          ? data
          : [];

      setTreeNodes(
        safeData
      );

      const targetDocumentId =
        preferredDocumentId ||
        selectedDocument?._id;

      if (
        !targetDocumentId
      ) {
        return;
      }

      const node =
        safeData.find(
          (item) =>
            item.kind ===
              "document" &&
            item.documentId?._id ===
              targetDocumentId
        );

      if (
        node?.documentId
      ) {
        setSelectedDocument(
          node.documentId
        );
      } else {
        setSelectedDocument(
          null
        );
      }
    } catch (
      refreshError
    ) {
      console.error(
        "Failed to refresh Documents:",
        refreshError
      );

      setActionError(
        refreshError.message ||
          t(
            "documents.loadError"
          )
      );
    }
  }

  // ====================================================
  // Tree Helpers
  // ====================================================

  function getParentId(
    node
  ) {
    if (
      !node?.parentId
    ) {
      return null;
    }

    if (
      typeof node.parentId ===
      "object"
    ) {
      return (
        node.parentId._id ||
        null
      );
    }

    return node.parentId;
  }

  function getChildren(
    parentId = null
  ) {
    return treeNodes
      .filter(
        (node) => {
          const nodeParentId =
            getParentId(
              node
            );

          if (
            parentId ===
            null
          ) {
            return (
              nodeParentId ===
              null
            );
          }

          return (
            String(
              nodeParentId
            ) ===
            String(
              parentId
            )
          );
        }
      )
      .sort(
        (a, b) =>
          (a.order ?? 0) -
          (b.order ?? 0)
      );
  }

  const nodesByParent =
    useMemo(() => {
      const map =
        new Map();

      for (
        const node of
        treeNodes
      ) {
        const parentId =
          getParentId(
            node
          );

        const key =
          parentId
            ? String(
                parentId
              )
            : "root";

        if (
          !map.has(
            key
          )
        ) {
          map.set(
            key,
            []
          );
        }

        map
          .get(key)
          .push(
            node
          );
      }

      for (
        const children of
        map.values()
      ) {
        children.sort(
          (a, b) =>
            (a.order ??
              0) -
            (b.order ??
              0)
        );
      }

      return map;
    }, [
      treeNodes,
    ]);

  function toggleFolder(
    folderId
  ) {
    setExpandedFolders(
      (current) => {
        const next =
          new Set(
            current
          );

        if (
          next.has(
            folderId
          )
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

    setShowCreateDocument(
      false
    );

    setSelectedDocument(
      node.documentId
    );

    setContextMenu(
      null
    );

    setDeleteTarget(
      null
    );
  }

  // ====================================================
  // Drag & Drop
  // ====================================================

  async function moveDocumentNode(
    nodeId,
    parentId,
    index
  ) {
    try {
      setActionError(
        ""
      );

      const response =
        await fetch(
          `${API_URL.documentTree}/${nodeId}/move`,
          {
            method:
              "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                parentId,
                index,
              }),
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
              "documents.moveFailed"
            )
        );
      }

      if (
        parentId
      ) {
        setExpandedFolders(
          (current) => {
            const next =
              new Set(
                current
              );

            next.add(
              parentId
            );

            return next;
          }
        );
      }

      await refreshTree();
    } catch (
      moveError
    ) {
      console.error(
        "Failed to move document node:",
        moveError
      );

      setActionError(
        moveError.message ||
          t(
            "documents.moveFailed"
          )
      );
    }
  }

  function calculateInsertIndex(
    draggedId,
    targetNode,
    position
  ) {
    const parentId =
      getParentId(
        targetNode
      );

    const siblings =
      getChildren(
        parentId
      ).filter(
        (node) =>
          node._id !==
          draggedId
      );

    const targetIndex =
      siblings.findIndex(
        (node) =>
          node._id ===
          targetNode._id
      );

    if (
      targetIndex ===
      -1
    ) {
      return {
        parentId,
        index:
          siblings.length,
      };
    }

    if (
      position ===
      "before"
    ) {
      return {
        parentId,
        index:
          targetIndex,
      };
    }

    return {
      parentId,
      index:
        targetIndex + 1,
    };
  }

  async function handleDragEnd(
    event
  ) {
    const {
      active,
      over,
    } = event;

    setActiveNodeId(
      null
    );

    if (!over) {
      return;
    }

    const draggedId =
      String(
        active.id
      );

    const dropId =
      String(
        over.id
      );

    if (
      dropId ===
      "document-root:end"
    ) {
      const rootSiblings =
        getChildren(
          null
        ).filter(
          (node) =>
            node._id !==
            draggedId
        );

      await moveDocumentNode(
        draggedId,
        null,
        rootSiblings.length
      );

      return;
    }

    const separatorIndex =
      dropId.indexOf(
        ":"
      );

    if (
      separatorIndex ===
      -1
    ) {
      return;
    }

    const position =
      dropId.slice(
        0,
        separatorIndex
      );

    const targetNodeId =
      dropId.slice(
        separatorIndex +
          1
      );

    if (
      ![
        "before",
        "inside",
        "after",
      ].includes(
        position
      )
    ) {
      return;
    }

    if (
      targetNodeId ===
      draggedId
    ) {
      return;
    }

    const targetNode =
      treeNodes.find(
        (node) =>
          node._id ===
          targetNodeId
      );

    if (
      !targetNode
    ) {
      return;
    }

    // --------------------------------------------------
    // Drop Inside Folder
    // --------------------------------------------------

    if (
      position ===
      "inside"
    ) {
      if (
        targetNode.kind !==
        "folder"
      ) {
        return;
      }

      const children =
        getChildren(
          targetNode._id
        ).filter(
          (node) =>
            node._id !==
            draggedId
        );

      await moveDocumentNode(
        draggedId,
        targetNode._id,
        children.length
      );

      return;
    }

    // --------------------------------------------------
    // Drop Before / After
    // --------------------------------------------------

    const destination =
      calculateInsertIndex(
        draggedId,
        targetNode,
        position
      );

    await moveDocumentNode(
      draggedId,
      destination.parentId,
      destination.index
    );
  }

  function handleDragStart(
    event
  ) {
    setActiveNodeId(
      String(
        event.active.id
      )
    );

    setContextMenu(
      null
    );
  }

  function handleDragCancel() {
    setActiveNodeId(
      null
    );
  }

  // ====================================================
  // Create Document
  // ====================================================

  function openCreateDocument(
    parentId = null
  ) {
    setSelectedDocument(
      null
    );

    setDocumentTitle(
      ""
    );

    setDocumentParentId(
      parentId
    );

    setShowCreateDocument(
      true
    );

    setDeleteTarget(
      null
    );

    setContextMenu(
      null
    );

    setActionError(
      ""
    );

    if (
      parentId
    ) {
      setExpandedFolders(
        (current) => {
          const next =
            new Set(
              current
            );

          next.add(
            parentId
          );

          return next;
        }
      );
    }
  }

  function closeCreateDocument() {
    setShowCreateDocument(
      false
    );

    setDocumentTitle(
      ""
    );

    setDocumentParentId(
      null
    );
  }

  async function createDocument(
    event
  ) {
    event.preventDefault();

    const title =
      documentTitle.trim();

    if (!title) {
      return;
    }

    try {
      setActionError(
        ""
      );

      const response =
        await fetch(
          API_URL.documents,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                worldId,
                title,

                parentId:
                  documentParentId,
              }),
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
              "documents.createFailed"
            )
        );
      }

      const newDocument =
        await response.json();

      if (
        documentParentId
      ) {
        setExpandedFolders(
          (current) => {
            const next =
              new Set(
                current
              );

            next.add(
              documentParentId
            );

            return next;
          }
        );
      }

      closeCreateDocument();

      setSelectedDocument(
        newDocument
      );

      await refreshTree(
        newDocument._id
      );
    } catch (
      createError
    ) {
      console.error(
        "Failed to create document:",
        createError
      );

      setActionError(
        createError.message ||
          t(
            "documents.createFailed"
          )
      );
    }
  }

  // ====================================================
  // Folder Creation
  // ====================================================

  function openFolderForm(
    parentId = null
  ) {
    setFolderParentId(
      parentId
    );

    setFolderName(
      ""
    );

    setShowFolderForm(
      true
    );

    setActionError(
      ""
    );

    if (
      parentId
    ) {
      setExpandedFolders(
        (current) => {
          const next =
            new Set(
              current
            );

          next.add(
            parentId
          );

          return next;
        }
      );
    }
  }

  function closeFolderForm() {
    setShowFolderForm(
      false
    );

    setFolderName(
      ""
    );

    setFolderParentId(
      null
    );
  }

  async function createFolder(
    event
  ) {
    event.preventDefault();

    const name =
      folderName.trim();

    if (!name) {
      return;
    }

    try {
      setActionError(
        ""
      );

      const response =
        await fetch(
          `${API_URL.documentTree}/folders`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                worldId,
                name,

                parentId:
                  folderParentId,
              }),
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
              "documents.createFolderFailed"
            )
        );
      }

      const folder =
        await response.json();

      setExpandedFolders(
        (current) => {
          const next =
            new Set(
              current
            );

          next.add(
            folder._id
          );

          if (
            folderParentId
          ) {
            next.add(
              folderParentId
            );
          }

          return next;
        }
      );

      closeFolderForm();

      await refreshTree();
    } catch (
      createError
    ) {
      console.error(
        "Failed to create document folder:",
        createError
      );

      setActionError(
        createError.message ||
          t(
            "documents.createFolderFailed"
          )
      );
    }
  }

  // ====================================================
  // Rename
  // ====================================================

  function startRename(
    node
  ) {
    setEditingNodeId(
      node._id
    );

    setEditingName(
      node.name
    );

    setContextMenu(
      null
    );

    setDeleteTarget(
      null
    );

    setActionError(
      ""
    );
  }

  function cancelRename() {
    setEditingNodeId(
      null
    );

    setEditingName(
      ""
    );
  }

  async function submitRename(
    node
  ) {
    const name =
      editingName.trim();

    if (!name) {
      return;
    }

    try {
      setActionError(
        ""
      );

      let response;

      if (
        node.kind ===
        "folder"
      ) {
        response =
          await fetch(
            `${API_URL.documentTree}/${node._id}/name`,
            {
              method:
                "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  name,
                }),
            }
          );
      } else {
        const documentId =
          node.documentId?._id;

        if (
          !documentId
        ) {
          return;
        }

        response =
          await fetch(
            `${API_URL.documents}/${documentId}/title`,
            {
              method:
                "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  title:
                    name,
                }),
            }
          );
      }

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
              "documents.renameFailed"
            )
        );
      }

      cancelRename();

      await refreshTree();
    } catch (
      renameError
    ) {
      console.error(
        "Failed to rename document node:",
        renameError
      );

      setActionError(
        renameError.message ||
          t(
            "documents.renameFailed"
          )
      );
    }
  }

  // ====================================================
  // Delete
  // ====================================================

  function requestDelete(
    node
  ) {
    setDeleteTarget(
      node
    );

    setContextMenu(
      null
    );

    setActionError(
      ""
    );
  }

  function cancelDelete() {
    setDeleteTarget(
      null
    );
  }

  async function confirmDelete() {
    if (
      !deleteTarget
    ) {
      return;
    }

    const node =
      deleteTarget;

    try {
      setActionError(
        ""
      );

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

        if (
          !documentId
        ) {
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

      setDeleteTarget(
        null
      );

      await refreshTree();
    } catch (
      deleteError
    ) {
      console.error(
        "Failed to delete document node:",
        deleteError
      );

      setActionError(
        deleteError.message ||
          t(
            "documents.deleteFailed"
          )
      );
    }
  }

  // ====================================================
  // Context Menu
  // ====================================================

  function openContextMenu(
    event,
    node
  ) {
    event.preventDefault();
    event.stopPropagation();

    const menuWidth =
      200;

    const menuHeight =
      node.kind ===
      "folder"
        ? 210
        : 130;

    const x =
      Math.max(
        8,
        Math.min(
          event.clientX,
          window.innerWidth -
            menuWidth -
            8
        )
      );

    const y =
      Math.max(
        8,
        Math.min(
          event.clientY,
          window.innerHeight -
            menuHeight -
            8
        )
      );

    setContextMenu({
      node,
      x,
      y,
    });
  }

  // ====================================================
  // Tree Render
  // ====================================================

  function renderTree(
    parentId = null,
    depth = 0
  ) {
    const key =
      parentId
        ? String(
            parentId
          )
        : "root";

    const children =
      nodesByParent.get(
        key
      ) || [];

    return children.map(
      (node) => {
        const isFolder =
          node.kind ===
          "folder";

        const expanded =
          isFolder &&
          expandedFolders.has(
            node._id
          );

        return (
          <DocumentTreeRow
            key={
              node._id
            }
            node={
              node
            }
            depth={
              depth
            }
            expanded={
              expanded
            }
            selectedDocumentId={
              selectedDocument?._id
            }
            activeNodeId={
              activeNodeId
            }
            onToggle={
              toggleFolder
            }
            onSelectDocument={
              selectDocument
            }
            onCreateDocument={
              openCreateDocument
            }
            onContextMenu={
              openContextMenu
            }
            editingNodeId={
              editingNodeId
            }
            editingName={
              editingName
            }
            onEditingNameChange={
              setEditingName
            }
            onRenameSubmit={
              submitRename
            }
            onRenameCancel={
              cancelRename
            }
            t={
              t
            }
            renderChildren={
              renderTree
            }
          />
        );
      }
    );
  }

  // ====================================================
  // Explorer Sidebar
  // ====================================================

  const explorerSidebar = (
    <DndContext
      collisionDetection={
        pointerWithin
      }
      modifiers={[
        restrictToVerticalAxis,
      ]}
      onDragStart={
        handleDragStart
      }
      onDragEnd={
        handleDragEnd
      }
      onDragCancel={
        handleDragCancel
      }
    >
      <aside className="entity-tree-sidebar documents-tree-sidebar">
        <div className="entity-tree-header">
          <span>
            {t(
              "documents.title"
            )}
          </span>

          <div className="tree-header-actions">
            <button
              type="button"
              className="tree-add-button"
              onClick={() =>
                openFolderForm(
                  null
                )
              }
              title={t(
                "documents.newFolder"
              )}
            >
              <span aria-hidden="true">
                📁
              </span>
            </button>

            <button
              type="button"
              className="tree-add-button"
              onClick={() =>
                openCreateDocument(
                  null
                )
              }
              title={t(
                "documents.newDocument"
              )}
            >
              +
            </button>
          </div>
        </div>

        {showFolderForm && (
          <form
            className="folder-create-form"
            onSubmit={
              createFolder
            }
          >
            <div className="folder-create-parent">
              {folderParentId
                ? t(
                    "tree.createInside"
                  )
                : t(
                    "tree.createAtRoot"
                  )}
            </div>

            <div className="folder-create-row">
              <input
                autoFocus
                value={
                  folderName
                }
                placeholder={t(
                  "documents.folderName"
                )}
                onChange={(
                  event
                ) =>
                  setFolderName(
                    event.target.value
                  )
                }
              />

              <button
                type="submit"
                disabled={
                  !folderName.trim()
                }
                aria-label={t(
                  "documents.confirm"
                )}
              >
                ✓
              </button>

              <button
                type="button"
                onClick={
                  closeFolderForm
                }
                aria-label={t(
                  "documents.cancel"
                )}
              >
                ×
              </button>
            </div>
          </form>
        )}

        {deleteTarget && (
          <div className="documents-delete-confirm">
            <div className="documents-delete-confirm-title">
              {deleteTarget.kind ===
              "folder"
                ? t(
                    "documents.deleteFolderConfirm"
                  )
                : t(
                    "documents.deleteDocumentConfirm"
                  )}
            </div>

            <div className="documents-delete-target">
              {deleteTarget.kind ===
              "folder"
                ? "📁"
                : "▤"}{" "}
              {
                deleteTarget.name
              }
            </div>

            <div className="documents-delete-actions">
              <button
                type="button"
                className="documents-delete-cancel"
                onClick={
                  cancelDelete
                }
              >
                {t(
                  "documents.cancel"
                )}
              </button>

              <button
                type="button"
                className="documents-delete-confirm-button"
                onClick={
                  confirmDelete
                }
              >
                {t(
                  "documents.confirmDelete"
                )}
              </button>
            </div>
          </div>
        )}

        {actionError && (
          <div className="documents-action-error">
            {
              actionError
            }
          </div>
        )}

        <DocumentRootDropZone
          t={
            t
          }
        />

        <div className="entity-tree">
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
            renderTree()}
        </div>
      </aside>
        <DragOverlay
          dropAnimation={null}
        >
          {activeDocumentNode ? (
            <div className="explorer-drag-overlay">
              <span className="explorer-toggle">
                {activeDocumentNode.kind ===
                "folder"
                  ? "›"
                  : ""}
              </span>

              <div className="explorer-node-main">
                <span className="explorer-icon">
                  {activeDocumentNode.kind ===
                  "folder"
                    ? "📁"
                    : "▤"}
                </span>

                <span className="explorer-name">
                  {
                    activeDocumentNode.name
                  }
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
    </DndContext>
  );

  // ====================================================
  // Workspace
  // ====================================================

  const storyNeedsSync =
    selectedDocument &&
    selectedDocument
      .contentVersion >
      selectedDocument
        .syncedVersion;

  function closeMobileWorkspace() {
    if (
      showCreateDocument
    ) {
      closeCreateDocument();

      return;
    }

    setSelectedDocument(
      null
    );
  }

  if (
    loading &&
    !world
  ) {
    return (
      <div className="workspace-loading">
        {t(
          "workspace.loading"
        )}
      </div>
    );
  }

  return (
    <>
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
        secondarySidebar={
          explorerSidebar
        }
        enableUltrawidePane
      >
        <div className="documents-page-header">
          <div>
            <h1>
              {showCreateDocument
                ? t(
                    "documents.createTitle"
                  )
                : selectedDocument
                  ? selectedDocument.title
                  : t(
                      "documents.title"
                    )}
            </h1>

            <p>
              {showCreateDocument
                ? t(
                    "documents.createDescription"
                  )
                : selectedDocument
                  ? t(
                      "documents.documentWorkspaceDescription"
                    )
                  : t(
                      "documents.browserDescription"
                    )}
            </p>
          </div>

          {!showCreateDocument &&
            !selectedDocument && (
              <button
                type="button"
                className="create-button"
                onClick={() =>
                  openCreateDocument(
                    null
                  )
                }
              >
                {t(
                  "documents.newDocument"
                )}
              </button>
            )}

          <button
            type="button"
            className="mobile-sheet-close documents-mobile-close"
            onClick={
              closeMobileWorkspace
            }
            aria-label={t(
              "documents.close"
            )}
          >
            ×
          </button>
        </div>

        {showCreateDocument && (
          <div className="create-panel documents-create-panel">
            <form
              onSubmit={
                createDocument
              }
            >
              <label>
                {t(
                  "documents.documentName"
                )}

                <span className="required-star">
                  *
                </span>
              </label>

              <input
                autoFocus
                type="text"
                value={
                  documentTitle
                }
                required
                placeholder={t(
                  "documents.documentNamePlaceholder"
                )}
                onChange={(
                  event
                ) =>
                  setDocumentTitle(
                    event.target.value
                  )
                }
              />

              {documentParentId && (
                <div className="documents-create-location">
                  {t(
                    "documents.createInsideSelectedFolder"
                  )}
                </div>
              )}

              <div className="form-buttons">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={
                    closeCreateDocument
                  }
                >
                  {t(
                    "documents.cancel"
                  )}
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={
                    !documentTitle.trim()
                  }
                >
                  {t(
                    "documents.create"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {!showCreateDocument &&
          selectedDocument && (
            <div className="document-preview">
              <div className="document-preview-toolbar">
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
              </div>

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

        {!showCreateDocument &&
          !selectedDocument && (
            <div className="documents-browser-message">
              <h2>
                {t(
                  "documents.browserTitle"
                )}
              </h2>

              <p>
                {t(
                  "documents.browserDescription"
                )}
              </p>
            </div>
          )}
      </WorldLayout>

      {contextMenu && (
        <div
          ref={
            menuRef
          }
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
                  openCreateDocument(
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
                onClick={() => {
                  openFolderForm(
                    contextMenu
                      .node
                      ._id
                  );

                  setContextMenu(
                    null
                  );
                }}
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
              startRename(
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
              requestDelete(
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