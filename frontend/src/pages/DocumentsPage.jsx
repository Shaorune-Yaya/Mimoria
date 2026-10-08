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
import DocumentEditor from "../components/DocumentEditor";
import StorySuggestionsPanel from "../components/StorySuggestionsPanel";

import { API_URL } from "../config/api";


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

  const isFolder =
    node.kind ===
    "folder";

  const isSelected =
    !isFolder &&
    selectedDocumentId ===
      node.documentId?._id;

  const isRenaming =
    editingNodeId ===
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
      isRenaming,
  });


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


  const style = {
    paddingLeft:
      `${8 + depth * 16}px`,

    opacity:
      isDragging
        ? 0.2
        : 1,
  };


  const icon =
    isFolder
      ? "📁"
      : "▤";


  const displayName =
    node.name ||
    t(
      "documents.untitled"
    );


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
        onContextMenu={(
          event
        ) =>
          onContextMenu(
            event,
            node
          )
        }
      >
        <div
          ref={
            setBeforeDropRef
          }
          className="explorer-drop-zone explorer-drop-zone-before"
        />


        {isFolder && (
          <div
            ref={
              setInsideDropRef
            }
            className="explorer-drop-zone explorer-drop-zone-inside"
          />
        )}


        <div
          ref={
            setAfterDropRef
          }
          className="explorer-drop-zone explorer-drop-zone-after"
        />


        <button
          type="button"
          className="explorer-toggle"
          onClick={(
            event
          ) => {
            event.stopPropagation();

            if (
              isFolder
            ) {
              onToggle(
                node._id
              );
            }
          }}
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
          {isFolder
            ? expanded
              ? "⌄"
              : "›"
            : ""}
        </button>


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
              onChange={(
                event
              ) =>
                onEditingNameChange(
                  event.target.value
                )
              }
              onClick={(
                event
              ) =>
                event.stopPropagation()
              }
              onDoubleClick={(
                event
              ) =>
                event.stopPropagation()
              }
              onBlur={
                onRenameCancel
              }
              onKeyDown={(
                event
              ) => {
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
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            className="explorer-node-main"
            onClick={() => {
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
            }}
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
              disabled={
                !isFolder
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
              onClick={(
                event
              ) => {
                event.stopPropagation();

                if (
                  isFolder
                ) {
                  onCreateDocument(
                    node._id
                  );
                }
              }}
            >
              {isFolder
                ? "+"
                : ""}
            </button>


            <button
              type="button"
              className="explorer-context-button"
              title={t(
                "documents.moreActions"
              )}
              aria-label={t(
                "documents.moreActions"
              )}
              onClick={(
                event
              ) => {
                event.stopPropagation();

                onContextMenu(
                  event,
                  node
                );
              }}
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


function DocumentsPage() {
  const {
    worldId,
  } = useParams();


  const {
    t,
    i18n,
  } = useTranslation();


  const menuRef =
    useRef(null);


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


  const [
    storySuggestions,
    setStorySuggestions,
  ] = useState([]);


  const [
    storyAnalysisState,
    setStoryAnalysisState,
  ] = useState(
    "idle"
  );


  const [
    storyAnalysisError,
    setStoryAnalysisError,
  ] = useState("");


  const [
    storyAnalysisMeta,
    setStoryAnalysisMeta,
  ] = useState({
    documentNeedsAnalysis:
      false,

    canonNeedsAnalysis:
      false,

    needsAnalysis:
      false,

    worldCanonVersion:
      null,

    lastAnalyzedCanonVersion:
      null,
  });


  const [
    storySuggestionActionId,
    setStorySuggestionActionId,
  ] = useState(null);


  const [
    entityTypes,
    setEntityTypes,
  ] = useState([]);

  const [
    editorSaveState,
    setEditorSaveState,
  ] = useState(
    "saved"
  );


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


  useEffect(() => {
    loadPage();
  }, [
    worldId,
  ]);


  useEffect(() => {
    loadEntityTypes();
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


  useEffect(() => {
    setStorySuggestions(
      []
    );


    setStoryAnalysisError(
      ""
    );


    setStoryAnalysisState(
      "idle"
    );


    setStoryAnalysisMeta({
      documentNeedsAnalysis:
        false,

      canonNeedsAnalysis:
        false,

      needsAnalysis:
        false,

      worldCanonVersion:
        null,

      lastAnalyzedCanonVersion:
        null,
    });


    if (
      !selectedDocument?._id
    ) {
      return;
    }


    if (
      selectedDocument
        .contentVersion !==
      selectedDocument
        .syncedVersion
    ) {
      return;
    }


    if (
      !selectedDocument
        .syncedVersion
    ) {
      return;
    }


    loadStorySuggestions(
      selectedDocument._id
    );
  }, [
    selectedDocument?._id,
    selectedDocument?.contentVersion,
    selectedDocument?.syncedVersion,
  ]);


  async function loadEntityTypes() {
    try {
      const response =
        await fetch(
          `${API_URL.entityTypes}/world/${worldId}`
        );


      if (
        !response.ok
      ) {
        throw new Error(
          t(
            "documents.entityTypesLoadFailed"
          )
        );
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
    } catch (loadError) {
      console.error(
        "Failed to load Entity Types for Story Suggestions:",
        loadError
      );


      setEntityTypes(
        []
      );
    }
  }


  async function loadPage() {
    try {
      setLoading(
        true
      );


      setError(
        ""
      );


      const [
        worldResponse,
        treeResponse,
      ] =
        await Promise.all([
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


      const safeTree =
        Array.isArray(
          treeData
        )
          ? treeData
          : [];


      setWorld(
        worldData
      );


      setTreeNodes(
        safeTree
      );


      setExpandedFolders(
        new Set(
          safeTree
            .filter(
              (node) =>
                node.kind ===
                "folder"
            )
            .map(
              (node) =>
                node._id
            )
        )
      );
    } catch (loadError) {
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


      const currentId =
        preferredDocumentId ||
        selectedDocument?._id;


      if (!currentId) {
        return;
      }


      const node =
        safeData.find(
          (item) =>
            item.kind ===
              "document" &&
            item.documentId?._id ===
              currentId
        );


      if (
        node?.documentId
      ) {
        setSelectedDocument(
          (current) => {
            if (
              current?._id ===
              node.documentId._id &&
              (current.contentVersion ??
                0) >
                (node.documentId
                  .contentVersion ??
                  0)
            ) {
              return current;
            }


            return node.documentId;
          }
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
          .get(
            key
          )
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
            (a.order ?? 0) -
            (b.order ?? 0)
        );
      }


      return map;
    }, [
      treeNodes,
    ]);


  function getChildren(
    parentId = null
  ) {
    const key =
      parentId
        ? String(
            parentId
          )
        : "root";


    return (
      nodesByParent.get(
        key
      ) || []
    );
  }


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


  async function selectDocument(
    node
  ) {
    if (
      node.kind !==
      "document"
    ) {
      return;
    }


    const documentId =
      node.documentId?._id;


    if (!documentId) {
      return;
    }


    setShowCreateDocument(
      false
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


    setSelectedDocument(
      node.documentId
    );


    try {
      const response =
        await fetch(
          `${API_URL.documents}/${documentId}`
        );


      if (
        !response.ok
      ) {
        return;
      }


      const freshDocument =
        await response.json();


      setSelectedDocument(
        (current) =>
          current?._id ===
          freshDocument._id
            ? freshDocument
            : current
      );
    } catch (loadError) {
      console.error(
        "Failed to refresh selected document:",
        loadError
      );
    }
  }


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
    } catch (moveError) {
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


    return {
      parentId,

      index:
        position ===
        "before"
          ? targetIndex
          : targetIndex + 1,
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


    if (!targetNode) {
      return;
    }


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
    } catch (createError) {
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
    } catch (createError) {
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


  function startRename(
    node
  ) {
    setEditingNodeId(
      node._id
    );


    setEditingName(
      node.name || ""
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


  async function renameNode(
    node
  ) {
    const name =
      editingName.trim();


    if (!name) {
      cancelRename();

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


        if (!documentId) {
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


      const updated =
        await response.json();


      cancelRename();


      if (
        node.kind ===
          "document" &&
        selectedDocument?._id ===
          node.documentId?._id
      ) {
        setSelectedDocument(
          (current) => ({
            ...current,

            title:
              updated.title ||
              name,
          })
        );
      }


      await refreshTree();
    } catch (renameError) {
      console.error(
        "Failed to rename document item:",
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
    if (!deleteTarget) {
      return;
    }


    try {
      let response;


      if (
        deleteTarget.kind ===
        "folder"
      ) {
        response =
          await fetch(
            `${API_URL.documentTree}/${deleteTarget._id}`,
            {
              method:
                "DELETE",
            }
          );
      } else {
        const documentId =
          deleteTarget
            .documentId?._id;


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
        deleteTarget.kind ===
          "document" &&
        selectedDocument?._id ===
          deleteTarget
            .documentId?._id
      ) {
        setSelectedDocument(
          null
        );
      }


      setDeleteTarget(
        null
      );


      await refreshTree();
    } catch (deleteError) {
      console.error(
        "Failed to delete document item:",
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


  function openContextMenu(
    event,
    node
  ) {
    event.preventDefault();


    const menuWidth =
      210;


    const menuHeight =
      node.kind ===
      "folder"
        ? 190
        : 110;


    const x =
      Math.min(
        event.clientX,
        window.innerWidth -
          menuWidth -
          8
      );


    const y =
      Math.min(
        event.clientY,
        window.innerHeight -
          menuHeight -
          8
      );


    setContextMenu({
      x:
        Math.max(
          8,
          x
        ),

      y:
        Math.max(
          8,
          y
        ),

      node,
    });
  }


  function getStoryCandidateId(
    candidate
  ) {
    return (
      candidate?.id ||
      candidate?._id ||
      null
    );
  }


  function getConceptLabel(
    concept
  ) {
    if (!concept) {
      return "";
    }


    const conceptKey =
      String(
        concept
      )
        .replace(
          /\./gu,
          "_"
        );


    const key =
      `documents.concepts.${conceptKey}`;


    return t(
      key,
      {
        defaultValue:
          String(
            concept
          )
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
        "documents.suggestionKinds.unknown"
    );
  }


  function replaceStorySuggestion(
    updatedCandidate
  ) {
    const updatedId =
      getStoryCandidateId(
        updatedCandidate
      );


    if (
      !updatedId
    ) {
      return;
    }


    setStorySuggestions(
      (current) =>
        current.map(
          (item) =>
            getStoryCandidateId(
              item
            ) ===
            updatedId
              ? updatedCandidate
              : item
        )
    );
  }


  async function loadStorySuggestions(
    documentId
  ) {
    if (!documentId) {
      return;
    }


    try {
      setStoryAnalysisError(
        ""
      );


      const response =
        await fetch(
          `${API_URL.storySuggestions}/documents/${documentId}`
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
              "documents.storySuggestionsLoadFailed"
            )
        );
      }


      const data =
        await response.json();


      setStorySuggestions(
        Array.isArray(
          data.candidates
        )
          ? data.candidates
          : []
      );


      setStoryAnalysisMeta({
        documentNeedsAnalysis:
          Boolean(
            data.documentNeedsAnalysis
          ),

        canonNeedsAnalysis:
          Boolean(
            data.canonNeedsAnalysis
          ),

        needsAnalysis:
          Boolean(
            data.needsAnalysis
          ),

        worldCanonVersion:
          data.worldCanonVersion ??
          null,

        lastAnalyzedCanonVersion:
          data.lastAnalyzedCanonVersion ??
          null,
      });


      setStoryAnalysisState(
        "complete"
      );
    } catch (error) {
      console.error(
        "Failed to load Story Suggestions:",
        error
      );


      setStoryAnalysisError(
        error.message ||
          t(
            "documents.storySuggestionsLoadFailed"
          )
      );


      setStoryAnalysisState(
        "error"
      );
    }
  }

  async function analyzeStory() {
    if (
      !selectedDocument?._id
    ) {
      return;
    }


    if (
      editorSaveState !==
      "saved"
    ) {
      return;
    }


    try {
      setStoryAnalysisState(
        "analyzing"
      );


      setStoryAnalysisError(
        ""
      );


      const response =
        await fetch(
          `${API_URL.storySuggestions}/documents/${selectedDocument._id}/analyze`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
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
              "documents.storyAnalysisFailed"
            )
        );
      }


      const data =
        await response.json();


      const analyzedDocument =
        data.document;


      const candidates =
        Array.isArray(
          data.candidates
        )
          ? data.candidates
          : [];


      setStorySuggestions(
        candidates
      );


      setStoryAnalysisState(
        "complete"
      );


      setStoryAnalysisMeta({
        documentNeedsAnalysis:
          Boolean(
            analyzedDocument
              ?.documentNeedsAnalysis
          ),

        canonNeedsAnalysis:
          Boolean(
            analyzedDocument
              ?.canonNeedsAnalysis
          ),

        needsAnalysis:
          Boolean(
            analyzedDocument
              ?.needsAnalysis
          ),

        worldCanonVersion:
          analyzedDocument
            ?.worldCanonVersion ??
          null,

        lastAnalyzedCanonVersion:
          analyzedDocument
            ?.lastAnalyzedCanonVersion ??
          null,
      });


      if (
        analyzedDocument
      ) {
        setSelectedDocument(
          (current) => {
            if (
              !current ||
              current._id !==
                analyzedDocument.id
            ) {
              return current;
            }


            return {
              ...current,

              contentVersion:
                analyzedDocument.contentVersion ??
                current.contentVersion,

              syncedVersion:
                analyzedDocument.syncedVersion ??
                current.syncedVersion,

              lastAnalyzedCanonVersion:
                analyzedDocument.lastAnalyzedCanonVersion ??
                current.lastAnalyzedCanonVersion,

              lastSyncedAt:
                analyzedDocument.lastSyncedAt ??
                current.lastSyncedAt,
            };
          }
        );


        setTreeNodes(
          (currentNodes) =>
            currentNodes.map(
              (node) => {
                if (
                  node.kind !==
                    "document" ||
                  node.documentId?._id !==
                    analyzedDocument.id
                ) {
                  return node;
                }


                return {
                  ...node,

                  documentId: {
                    ...node.documentId,

                    contentVersion:
                      analyzedDocument.contentVersion ??
                      node.documentId
                        ?.contentVersion,

                    syncedVersion:
                      analyzedDocument.syncedVersion ??
                      node.documentId
                        ?.syncedVersion,

                    lastAnalyzedCanonVersion:
                      analyzedDocument.lastAnalyzedCanonVersion ??
                      node.documentId
                        ?.lastAnalyzedCanonVersion,

                    lastSyncedAt:
                      analyzedDocument.lastSyncedAt ??
                      node.documentId
                        ?.lastSyncedAt,
                  },
                };
              }
            )
        );
      }
    } catch (error) {
      console.error(
        "Story analysis failed:",
        error
      );


      setStoryAnalysisError(
        error.message ||
          t(
            "documents.storyAnalysisFailed"
          )
      );


      setStoryAnalysisState(
        "error"
      );
    }
  }


  async function applyStorySuggestion(
    candidate,
    options = {}
  ) {
    const candidateId =
      getStoryCandidateId(
        candidate
      );


    if (
      !candidateId
    ) {
      return false;
    }


    if (
      candidate.kind ===
        "event-history"
    ) {
      setStoryAnalysisError(
        t(
          "documents.timelineNotAvailable"
        )
      );


      return false;
    }


    try {
      setStorySuggestionActionId(
        candidateId
      );


      setStoryAnalysisError(
        ""
      );


      const requestBody = {
        ...options,
      };


      const response =
        await fetch(
          `${API_URL.storySuggestions}/${candidateId}/apply`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                requestBody
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
        if (
          data.code ===
            "STORY_SYNC_APPLY_DEFERRED"
        ) {
          throw new Error(
            data.message ||
              t(
                "documents.suggestionDeferred"
              )
          );
        }


        throw new Error(
          data.message ||
            t(
              "documents.storySuggestionApplyFailed"
            )
        );
      }


      if (
        data.candidate
      ) {
        replaceStorySuggestion(
          data.candidate
        );
      }


      if (
        data.recommendedEntityType
      ) {
        await loadEntityTypes();
      }


      if (
        data.canonChanged
      ) {
        setStoryAnalysisMeta(
          (current) => ({
            ...current,

            canonNeedsAnalysis:
              true,

            needsAnalysis:
              true,

            worldCanonVersion:
              data.canonVersion ??
              current.worldCanonVersion,
          })
        );
      }


      return true;
    } catch (error) {
      console.error(
        "Failed to apply Story Suggestion:",
        error
      );


      setStoryAnalysisError(
        error.message ||
          t(
            "documents.storySuggestionApplyFailed"
          )
      );


      return false;
    } finally {
      setStorySuggestionActionId(
        null
      );
    }
  }


  async function editStorySuggestion(
    candidate,
    payloadPatch
  ) {
    const candidateId =
      getStoryCandidateId(
        candidate
      );


    if (
      !candidateId
    ) {
      return false;
    }


    try {
      setStorySuggestionActionId(
        candidateId
      );


      setStoryAnalysisError(
        ""
      );


      const response =
        await fetch(
          `${API_URL.storySuggestions}/${candidateId}`,
          {
            method:
              "PATCH",

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
              "documents.storySuggestionEditFailed"
            )
        );
      }


      if (
        data.candidate
      ) {
        replaceStorySuggestion(
          data.candidate
        );
      }


      return true;
    } catch (error) {
      console.error(
        "Failed to edit Story Suggestion:",
        error
      );


      setStoryAnalysisError(
        error.message ||
          t(
            "documents.storySuggestionEditFailed"
          )
      );


      return false;
    } finally {
      setStorySuggestionActionId(
        null
      );
    }
  }

  async function ignoreStorySuggestion(
    candidate
  ) {
    const candidateId =
      getStoryCandidateId(
        candidate
      );


    if (
      !candidateId
    ) {
      return;
    }


    try {
      setStorySuggestionActionId(
        candidateId
      );


      setStoryAnalysisError(
        ""
      );


      const response =
        await fetch(
          `${API_URL.storySuggestions}/${candidateId}/ignore`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({}),
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
              "documents.storySuggestionIgnoreFailed"
            )
        );
      }


      if (
        data.candidate
      ) {
        replaceStorySuggestion(
          data.candidate
        );
      }
    } catch (error) {
      console.error(
        "Failed to ignore Story Suggestion:",
        error
      );


      setStoryAnalysisError(
        error.message ||
          t(
            "documents.storySuggestionIgnoreFailed"
          )
      );
    } finally {
      setStorySuggestionActionId(
        null
      );
    }
  }


  function handleDocumentSaved(
    savedDocument
  ) {
    setSelectedDocument(
      (current) =>
        current?._id ===
        savedDocument._id
          ? savedDocument
          : current
    );


    setTreeNodes(
      (currentNodes) =>
        currentNodes.map(
          (node) => {
            if (
              node.kind !==
                "document" ||
              node.documentId?._id !==
                savedDocument._id
            ) {
              return node;
            }


            return {
              ...node,

              name:
                savedDocument.title,

              documentId:
                savedDocument,
            };
          }
        )
    );
  }


  function renderTree(
    parentId = null,
    depth = 0
  ) {
    const children =
      getChildren(
        parentId
      );


    return children.map(
      (node) => (
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
            expandedFolders.has(
              node._id
            )
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
            renameNode
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
      )
    );
  }


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
              aria-label={t(
                "documents.newFolder"
              )}
            >
              📁
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
              aria-label={t(
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
                {
                  error
                }
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
        dropAnimation={
          null
        }
      >
        {activeDocumentNode ? (
          <div className="explorer-drag-overlay">
            <span className="explorer-toggle">
              {activeDocumentNode
                .kind ===
              "folder"
                ? "›"
                : ""}
            </span>


            <div className="explorer-node-main">
              <span className="explorer-icon">
                {activeDocumentNode
                  .kind ===
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


  const documentNeedsAnalysis =
    Boolean(
      selectedDocument &&
      selectedDocument
        .contentVersion !==
        selectedDocument
          .syncedVersion
    );


  const canonNeedsAnalysis =
    Boolean(
      storyAnalysisMeta
        .canonNeedsAnalysis
    );


  const storyNeedsSync =
    Boolean(
      documentNeedsAnalysis ||
      canonNeedsAnalysis ||
      storyAnalysisMeta
        .needsAnalysis
    );


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

                  {documentNeedsAnalysis
                    ? t(
                        "documents.storyNeedsAnalysis"
                      )
                    : canonNeedsAnalysis
                      ? t(
                          "documents.canonNeedsAnalysis"
                        )
                      : t(
                          "documents.storyAnalyzed"
                        )}
                </div>


                <button
                  type="button"
                  className={[
                    "document-sync-button",

                    storyNeedsSync
                      ? "needs-analysis"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={
                    storyAnalysisState ===
                      "analyzing" ||
                    editorSaveState !==
                      "saved"
                  }
                  title={
                    editorSaveState !==
                    "saved"
                      ? t(
                          "documents.analyzeAfterSave"
                        )
                      : t(
                          "documents.analyzeStoryDescription"
                        )
                  }
                  onClick={
                    analyzeStory
                  }
                >
                  {storyAnalysisState ===
                  "analyzing"
                    ? "…"
                    : "◇"}

                  {" "}

                  {storyAnalysisState ===
                  "analyzing"
                    ? t(
                        "documents.analyzingStory"
                      )
                    : t(
                        "documents.analyzeStory"
                      )}
                </button>
              </div>


              <DocumentEditor
                key={
                  selectedDocument._id
                }
                document={
                  selectedDocument
                }
                onSaved={
                  handleDocumentSaved
                }
                onSaveStateChange={
                  setEditorSaveState
                }
              />


              <StorySuggestionsPanel
                candidates={
                  storySuggestions
                }
                entityTypes={
                  entityTypes
                }
                analysisState={
                  storyAnalysisState
                }
                analysisError={
                  storyAnalysisError
                }
                actionCandidateId={
                  storySuggestionActionId
                }
                language={
                  i18n.language
                }
                t={
                  t
                }
                getConceptLabel={
                  getConceptLabel
                }
                getSuggestionKindLabel={
                  getSuggestionKindLabel
                }
                onApply={
                  applyStorySuggestion
                }
                onIgnore={
                  ignoreStorySuggestion
                }
                onEdit={
                  editStorySuggestion
                }
                onClearError={() =>
                  setStoryAnalysisError(
                    ""
                  )
                }
              />


              <footer className="document-preview-footer">
                <span>
                  {t(
                    "documents.version"
                  )}{" "}

                  {
                    selectedDocument.contentVersion
                  }
                </span>


                <span>
                  {documentNeedsAnalysis
                    ? t(
                        "documents.analysisPending"
                      )
                    : canonNeedsAnalysis
                      ? t(
                          "documents.canonAnalysisPending"
                        )
                      : t(
                          "documents.analysisUpToDate"
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