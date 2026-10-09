import {
  useEffect,
  useRef,
  useState,
} from "react";

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

import {
  useTranslation,
} from "react-i18next";

import WorldLayout from "../components/WorldLayout";
import EmbeddedWorkspaceLayout from "../components/EmbeddedWorkspaceLayout";
import { API_URL } from "../config/api";
import { apiFetch } from "../utils/apiFetch";


// ======================================================
// Local UI State Helpers
// ======================================================

function getExpandedStorageKey(
  worldId
) {
  return `mimoria:world:${worldId}:expanded-nodes`;
}

function getSelectedEntityStorageKey(
  worldId
) {
  return `mimoria:world:${worldId}:selected-entity`;
}

function getExplorerScrollStorageKey(
  worldId
) {
  return `mimoria:world:${worldId}:explorer-scroll`;
}

function loadExpandedNodes(
  worldId
) {
  try {
    const saved =
      localStorage.getItem(
        getExpandedStorageKey(
          worldId
        )
      );

    if (!saved) {
      return {};
    }

    const parsed =
      JSON.parse(saved);

    if (
      !parsed ||
      typeof parsed !==
        "object" ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    return parsed;
  } catch (error) {
    console.error(
      "Failed to load expanded tree state:",
      error
    );

    return {};
  }
}

function loadSelectedEntityId(
  worldId
) {
  return (
    localStorage.getItem(
      getSelectedEntityStorageKey(
        worldId
      )
    ) || null
  );
}

function loadExplorerScroll(
  worldId
) {
  const saved =
    Number(
      localStorage.getItem(
        getExplorerScrollStorageKey(
          worldId
        )
      )
    );

  if (
    !Number.isFinite(saved) ||
    saved < 0
  ) {
    return 0;
  }

  return saved;
}


// ======================================================
// Tree Row
// ======================================================

function TreeRow({
  node,
  depth,
  expanded,
  hasChildren,
  onToggle,
  onEntityClick,
  onCreateFolder,
  onContextMenu,
  selectedEntityId,
  renderChildren,

  renamingNodeId,
  renameValue,
  onRenameValueChange,
  onRenameSubmit,
  onRenameCancel,

  activeNodeId,
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
      renamingNodeId ===
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


  const {
    setNodeRef:
      setInsideDropRef,

    isOver:
      isInsideOver,
  } = useDroppable({
    id:
      `inside:${node._id}`,

    disabled:
      isActive,
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
        ? 0.35
        : 1,
  };


  const isFolder =
    node.kind ===
    "folder";

  const entity =
    node.entityId;


  const displayName =
    isFolder
      ? node.name
      : entity?.name ||
        "Missing Entity";


  const icon =
    isFolder
      ? "📁"
      : entity
          ?.entityTypeId
          ?.icon ||
        "📄";


  const isSelected =
    !isFolder &&
    selectedEntityId ===
      entity?._id;


  const isRenaming =
    isFolder &&
    renamingNodeId ===
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
        style={style}
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


        {/* Drop inside this node. */}

        <div
          ref={
            setInsideDropRef
          }
          className="explorer-drop-zone explorer-drop-zone-inside"
        />


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
                hasChildren
              ) {
                onToggle(
                  node._id
                );
              }
            }
          }
          aria-label={
            expanded
              ? "Collapse"
              : "Expand"
          }
        >
          {
            hasChildren
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
                renameValue
              }
              onChange={
                (event) =>
                  onRenameValueChange(
                    event.target
                      .value
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
                    event
                      .preventDefault();

                    onRenameSubmit(
                      node._id
                    );
                  }

                  if (
                    event.key ===
                    "Escape"
                  ) {
                    event
                      .preventDefault();

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
                  onEntityClick(
                    entity
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

                  onCreateFolder(
                    node._id
                  );
                }
              }
              title="New Folder"
              aria-label="Create folder inside this node"
            >
              +
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
              title="More Actions"
              aria-label="More Actions"
            >
              ⋯
            </button>


            <button
              type="button"
              className="explorer-drag-handle"
              {...listeners}
              title="Drag"
              aria-label="Drag tree node"
            >
              ⋮⋮
            </button>
          </>
        )}
      </div>


      {expanded &&
        hasChildren &&
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

function RootDropZone() {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id:
      "root:end",
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
      Root
    </div>
  );
}


// ======================================================
// Entities Page
// ======================================================

function EntitiesPage({
  embedded = false,
})  {
  const {
    worldId,
  } = useParams();

  const {
    t,
    i18n,
  } = useTranslation();


  // ====================================================
  // Refs
  // ====================================================

  const explorerSidebarRef =
    useRef(null);

  const explorerScrollRestoredRef =
    useRef(false);

  const desiredExplorerScrollRef =
    useRef(
      loadExplorerScroll(
        worldId
      )
    );


  // ====================================================
  // Base Data
  // ====================================================

  const [
    world,
    setWorld,
  ] = useState(null);

  const [
    entities,
    setEntities,
  ] = useState([]);

  const [
    entityTypes,
    setEntityTypes,
  ] = useState([]);


  // ====================================================
  // Create Entity
  // ====================================================

  const [
    showCreateForm,
    setShowCreateForm,
  ] = useState(false);

  const [
    selectedEntityTypeId,
    setSelectedEntityTypeId,
  ] = useState("");

  const [
    name,
    setName,
  ] = useState("");

  const [
    values,
    setValues,
  ] = useState({});

  const [
    referenceOptions,
    setReferenceOptions,
  ] = useState({});


  // ====================================================
  // Explorer Tree
  // ====================================================

  const [
    treeNodes,
    setTreeNodes,
  ] = useState([]);

  const [
    expandedNodes,
    setExpandedNodes,
  ] = useState(
    () =>
      loadExpandedNodes(
        worldId
      )
  );

  const [
    activeNodeId,
    setActiveNodeId,
  ] = useState(null);

  const activeTreeNode =
    activeNodeId
      ? treeNodes.find(
          (node) =>
            node._id ===
            activeNodeId
        )
      : null;

  // ====================================================
  // Saved Selection
  // ====================================================

  const [
    pendingSelectedEntityId,
    setPendingSelectedEntityId,
  ] = useState(
    () =>
      loadSelectedEntityId(
        worldId
      )
  );


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
  // Entity Detail / Edit
  // ====================================================

  const [
    selectedDetailEntity,
    setSelectedDetailEntity,
  ] = useState(null);

  const [
    isEditingEntity,
    setIsEditingEntity,
  ] = useState(false);

  const [
    editName,
    setEditName,
  ] = useState("");

  const [
    editValues,
    setEditValues,
  ] = useState({});


  // ====================================================
  // Context Menu / Rename
  // ====================================================

  const [
    contextMenu,
    setContextMenu,
  ] = useState(null);

  const [
    renamingNodeId,
    setRenamingNodeId,
  ] = useState(null);

  const [
    renameFolderName,
    setRenameFolderName,
  ] = useState("");


  const selectedEntityType =
    entityTypes.find(
      (type) =>
        type._id ===
        selectedEntityTypeId
    );


  // ====================================================
  // Data Loading
  // ====================================================

  async function fetchWorld() {
    try {
      const data =
        await apiFetch(
          `${API_URL.worlds}/${worldId}`
        );

      setWorld(data);
    } catch (error) {
      console.error(
        "Failed to fetch world:",
        error
      );
    }
  }


  async function fetchEntityTypes() {
    try {
      const data =
        await apiFetch(
          `${API_URL.entityTypes}/world/${worldId}`
        );

      setEntityTypes(data);
    } catch (error) {
      console.error(
        "Failed to fetch entity types:",
        error
      );
    }
  }


  async function fetchEntities() {
    try {
      const data =
        await apiFetch(
          `${API_URL.entities}/world/${worldId}`
        );

      setEntities(data);
    } catch (error) {
      console.error(
        "Failed to fetch entities:",
        error
      );
    }
  }


  async function fetchTree() {
    try {
      const data =
        await apiFetch(
          `${API_URL.tree}/world/${worldId}`
        );

      setTreeNodes(data);
    } catch (error) {
      console.error(
        "Failed to fetch tree:",
        error
      );
    }
  }


  // ====================================================
  // Explorer UI Persistence
  // ====================================================

  function handleExplorerScroll(
    event
  ) {
    const scrollTop =
      event.currentTarget
        .scrollTop;

    localStorage.setItem(
      getExplorerScrollStorageKey(
        worldId
      ),
      String(scrollTop)
    );
  }


  // Reload saved state if the route changes
  // from one World to another without remounting.
  useEffect(() => {
    const savedExpanded =
      loadExpandedNodes(
        worldId
      );

    const savedSelectedId =
      loadSelectedEntityId(
        worldId
      );

    const savedScroll =
      loadExplorerScroll(
        worldId
      );


    setExpandedNodes(
      savedExpanded
    );

    setPendingSelectedEntityId(
      savedSelectedId
    );


    setSelectedDetailEntity(
      null
    );

    setIsEditingEntity(
      false
    );


    desiredExplorerScrollRef.current =
      savedScroll;

    explorerScrollRestoredRef.current =
      false;
  }, [
    worldId,
  ]);


  // Save expanded folder state.
  useEffect(() => {
    try {
      localStorage.setItem(
        getExpandedStorageKey(
          worldId
        ),
        JSON.stringify(
          expandedNodes
        )
      );
    } catch (error) {
      console.error(
        "Failed to save expanded tree state:",
        error
      );
    }
  }, [
    worldId,
    expandedNodes,
  ]);


  // Restore the previously selected Entity
  // after Entity data has loaded.
  useEffect(() => {
    if (
      !pendingSelectedEntityId
    ) {
      return;
    }

    if (
      entities.length ===
      0
    ) {
      return;
    }


    const savedEntity =
      entities.find(
        (entity) =>
          entity._id ===
          pendingSelectedEntityId
      );


    if (savedEntity) {
      setSelectedDetailEntity(
        savedEntity
      );
    } else {
      localStorage.removeItem(
        getSelectedEntityStorageKey(
          worldId
        )
      );
    }


    setPendingSelectedEntityId(
      null
    );
  }, [
    entities,
    pendingSelectedEntityId,
    worldId,
  ]);


  // Save current Entity selection.
  useEffect(() => {
    if (
      selectedDetailEntity
        ?._id
    ) {
      localStorage.setItem(
        getSelectedEntityStorageKey(
          worldId
        ),
        selectedDetailEntity._id
      );

      return;
    }


    // Do not remove the saved selection while
    // we are still waiting for Entity data to load.
    if (
      pendingSelectedEntityId
    ) {
      return;
    }


    localStorage.removeItem(
      getSelectedEntityStorageKey(
        worldId
      )
    );
  }, [
    worldId,
    selectedDetailEntity,
    pendingSelectedEntityId,
  ]);


  // Restore Explorer scroll position once the
  // tree has rendered.
  useEffect(() => {
    if (
      explorerScrollRestoredRef
        .current
    ) {
      return;
    }

    if (
      treeNodes.length ===
      0
    ) {
      return;
    }


    const element =
      explorerSidebarRef.current;


    if (!element) {
      return;
    }


    const desiredScroll =
      desiredExplorerScrollRef
        .current;


    requestAnimationFrame(
      () => {
        requestAnimationFrame(
          () => {
            element.scrollTop =
              desiredScroll;

            explorerScrollRestoredRef.current =
              true;
          }
        );
      }
    );
  }, [
    treeNodes,
    expandedNodes,
  ]);


  // ====================================================
  // Folder Creation
  // ====================================================

  function openFolderForm(
    parentId = null
  ) {
    setFolderParentId(
      parentId
    );

    setFolderName("");

    setShowFolderForm(
      true
    );


    if (parentId) {
      setExpandedNodes(
        (current) => ({
          ...current,

          [parentId]:
            true,
        })
      );
    }
  }


  function closeFolderForm() {
    setShowFolderForm(
      false
    );

    setFolderName("");

    setFolderParentId(
      null
    );
  }


  async function createFolder(
    event
  ) {
    event.preventDefault();


    if (
      !folderName.trim()
    ) {
      return;
    }


    try {
      const createdFolder =
        await apiFetch(
          `${API_URL.tree}/folders`,
          {
            method:
              "POST",

            body: {
              worldId,

              name:
                folderName.trim(),

              parentId:
                folderParentId,
            },
          }
        );


      if (
        folderParentId
      ) {
        setExpandedNodes(
          (current) => ({
            ...current,

            [folderParentId]:
              true,
          })
        );
      }


      setExpandedNodes(
        (current) => ({
          ...current,

          [createdFolder._id]:
            true,
        })
      );


      closeFolderForm();

      await fetchTree();
    } catch (error) {
      console.error(
        "Failed to create folder:",
        error
      );

      alert(
        error.message
      );
    }
  }


  // ====================================================
  // Context Menu
  // ====================================================

  function closeContextMenu() {
    setContextMenu(
      null
    );
  }


  function openContextMenu(
    event,
    node
  ) {
    event.preventDefault();
    event.stopPropagation();


    const menuWidth =
      190;

    const menuHeight =
      140;


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
      nodeId:
        node._id,

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
    });
  }


  // ====================================================
  // Folder Rename
  // ====================================================

  function startRenameFolder(
    node
  ) {
    if (
      !node ||
      node.kind !==
        "folder"
    ) {
      return;
    }


    setRenamingNodeId(
      node._id
    );

    setRenameFolderName(
      node.name || ""
    );

    closeContextMenu();
  }


  function cancelRenameFolder() {
    setRenamingNodeId(
      null
    );

    setRenameFolderName(
      ""
    );
  }


  async function submitRenameFolder(
    nodeId
  ) {
    const cleanedName =
      renameFolderName.trim();


    if (!cleanedName) {
      cancelRenameFolder();

      return;
    }


    try {
      await apiFetch(
        `${API_URL.tree}/${nodeId}`,
        {
          method:
            "PUT",

          body: {
            name:
              cleanedName,
          },
        }
      );


      cancelRenameFolder();

      await fetchTree();
    } catch (error) {
      console.error(
        "Failed to rename folder:",
        error
      );

      alert(
        error.message
      );
    }
  }


  // ====================================================
  // Delete Folder
  // ====================================================

  async function deleteFolder(
    node
  ) {
    if (
      !node ||
      node.kind !==
        "folder"
    ) {
      return;
    }


    closeContextMenu();


    const confirmed =
      window.confirm(
        i18n.language.startsWith(
          "zh"
        )
          ? `确定删除文件夹“${node.name}”吗？其中内容会移动到上一级，不会删除实体。`
          : `Delete folder "${node.name}"? Its contents will move one level up.`
      );


    if (!confirmed) {
      return;
    }


    try {
      await apiFetch(
        `${API_URL.tree}/${node._id}`,
        {
          method:
            "DELETE",
        }
      );


      setExpandedNodes(
        (current) => {
          const updated = {
            ...current,
          };

          delete updated[
            node._id
          ];

          return updated;
        }
      );


      await fetchTree();
    } catch (error) {
      console.error(
        "Failed to delete folder:",
        error
      );

      alert(
        error.message
      );
    }
  }


  // ====================================================
  // Delete Entity
  // ====================================================

  async function deleteEntityNode(
    node
  ) {
    const entity =
      node?.entityId;


    if (!entity?._id) {
      return;
    }


    closeContextMenu();


    const confirmed =
      window.confirm(
        i18n.language.startsWith(
          "zh"
        )
          ? `确定删除实体“${entity.name}”吗？这个操作无法撤销。`
          : `Delete entity "${entity.name}"? This cannot be undone.`
      );


    if (!confirmed) {
      return;
    }


    try {
      await apiFetch(
        `${API_URL.entities}/${entity._id}`,
        {
          method:
            "DELETE",
        }
      );


      setEntities(
        (current) =>
          current.filter(
            (item) =>
              item._id !==
              entity._id
          )
      );


      if (
        selectedDetailEntity
          ?._id ===
        entity._id
      ) {
        setSelectedDetailEntity(
          null
        );

        setPendingSelectedEntityId(
          null
        );

        localStorage.removeItem(
          getSelectedEntityStorageKey(
            worldId
          )
        );

        setIsEditingEntity(
          false
        );

        setEditName("");

        setEditValues({});

        setReferenceOptions({});
      }


      await fetchTree();
    } catch (error) {
      console.error(
        "Failed to delete entity:",
        error
      );

      alert(
        error.message
      );
    }
  }


  // ====================================================
  // Tree Helpers
  // ====================================================

  function getNodeParentId(
    node
  ) {
    if (
      !node?.parentId
    ) {
      return null;
    }


    return (
      typeof node.parentId ===
      "object"
        ? node.parentId?._id ||
          null
        : node.parentId
    );
  }


  function getChildren(
    parentId
  ) {
    return treeNodes
      .filter(
        (node) =>
          getNodeParentId(
            node
          ) ===
          parentId
      )
      .sort(
        (a, b) =>
          (a.order || 0) -
          (b.order || 0)
      );
  }


  function toggleTreeNode(
    nodeId
  ) {
    setExpandedNodes(
      (current) => ({
        ...current,

        [nodeId]:
          !current[
            nodeId
          ],
      })
    );
  }


  // ====================================================
  // Move / Reorder Tree Node
  // ====================================================

  async function moveTreeNode(
    nodeId,
    parentId,
    index = null
  ) {
    try {
      await apiFetch(
        `${API_URL.tree}/${nodeId}/move`,
        {
          method:
            "PUT",

          body: {
            parentId,
            index,
          },
        }
      );


      if (parentId) {
        setExpandedNodes(
          (current) => ({
            ...current,

            [parentId]:
              true,
          })
        );
      }


      await fetchTree();
    } catch (error) {
      console.error(
        "Failed to move tree node:",
        error
      );

      alert(
        error.message
      );
    }
  }


  // ====================================================
  // Drag Start
  // ====================================================

  function handleDragStart(
    event
  ) {
    setActiveNodeId(
      String(
        event.active.id
      )
    );

    closeContextMenu();
  }


  // ====================================================
  // Drag Cancel
  // ====================================================

  function handleDragCancel() {
    setActiveNodeId(
      null
    );
  }


  // ====================================================
  // Drag End
  // ====================================================

  function handleDragEnd(
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


    // ==================================================
    // Drop into Root
    // ==================================================

    if (
      dropId ===
      "root:end"
    ) {
      moveTreeNode(
        draggedId,
        null,
        null
      );

      return;
    }


    // ==================================================
    // Parse Drop Zone
    // ==================================================

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


    const mode =
      dropId.substring(
        0,
        separatorIndex
      );


    const targetId =
      dropId.substring(
        separatorIndex + 1
      );


    if (
      !targetId ||
      draggedId ===
        targetId
    ) {
      return;
    }


    const targetNode =
      treeNodes.find(
        (node) =>
          node._id ===
          targetId
      );


    if (!targetNode) {
      return;
    }


    // ==================================================
    // Drop Inside
    // ==================================================

    if (
      mode ===
      "inside"
    ) {
      moveTreeNode(
        draggedId,
        targetId,
        null
      );

      return;
    }


    // ==================================================
    // Drop Before / After
    // ==================================================

    if (
      mode !==
        "before" &&
      mode !==
        "after"
    ) {
      return;
    }


    const destinationParentId =
      getNodeParentId(
        targetNode
      );


    const destinationSiblings =
      getChildren(
        destinationParentId
      ).filter(
        (node) =>
          node._id !==
          draggedId
      );


    const targetIndex =
      destinationSiblings
        .findIndex(
          (node) =>
            node._id ===
            targetId
        );


    if (
      targetIndex ===
      -1
    ) {
      return;
    }


    const insertionIndex =
      mode ===
      "after"
        ? targetIndex + 1
        : targetIndex;


    moveTreeNode(
      draggedId,
      destinationParentId,
      insertionIndex
    );
  }


  // ====================================================
  // Render Tree
  // ====================================================

  function renderTreeNodes(
    parentId = null,
    depth = 0
  ) {
    const children =
      getChildren(
        parentId
      );


    return children.map(
      (node) => {
        const nodeChildren =
          getChildren(
            node._id
          );


        const hasChildren =
          nodeChildren.length >
          0;


        const expanded =
          expandedNodes[
            node._id
          ] || false;


        return (
          <TreeRow
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
            hasChildren={
              hasChildren
            }
            onToggle={
              toggleTreeNode
            }
            onEntityClick={
              openEntityDetail
            }
            onCreateFolder={
              openFolderForm
            }
            onContextMenu={
              openContextMenu
            }
            selectedEntityId={
              selectedDetailEntity
                ?._id
            }
            renderChildren={
              renderTreeNodes
            }
            renamingNodeId={
              renamingNodeId
            }
            renameValue={
              renameFolderName
            }
            onRenameValueChange={
              setRenameFolderName
            }
            onRenameSubmit={
              submitRenameFolder
            }
            onRenameCancel={
              cancelRenameFolder
            }
            activeNodeId={
              activeNodeId
            }
          />
        );
      }
    );
  }


  // ====================================================
  // Entity Reference Options
  // ====================================================

  async function loadReferenceOptions(
    field
  ) {
    if (
      field.type !==
      "entity-reference"
    ) {
      return;
    }


    try {
      let url;


      if (
        field.referenceEntityTypeId
      ) {
        url =
          `${API_URL.entities}/world/${worldId}/type/${field.referenceEntityTypeId}`;
      } else {
        url =
          `${API_URL.entities}/world/${worldId}`;
      }


      const data =
        await apiFetch(
          url
        );


      setReferenceOptions(
        (current) => ({
          ...current,

          [field.key]:
            data,
        })
      );
    } catch (error) {
      console.error(
        "Failed to load reference options:",
        error
      );
    }
  }


  // ====================================================
  // Select Entity Type
  // ====================================================

  function selectEntityType(
    entityTypeId
  ) {
    setSelectedEntityTypeId(
      entityTypeId
    );

    setName("");

    setValues({});

    setReferenceOptions({});


    const type =
      entityTypes.find(
        (item) =>
          item._id ===
          entityTypeId
      );


    if (!type) {
      return;
    }


    type.fields.forEach(
      (field) => {
        if (
          field.type ===
          "entity-reference"
        ) {
          loadReferenceOptions(
            field
          );
        }
      }
    );
  }


  // ====================================================
  // Values
  // ====================================================

  function updateValue(
    fieldKey,
    value
  ) {
    setValues(
      (current) => ({
        ...current,

        [fieldKey]:
          value,
      })
    );
  }


  function updateEditValue(
    fieldKey,
    value
  ) {
    setEditValues(
      (current) => ({
        ...current,

        [fieldKey]:
          value,
      })
    );
  }


  // ====================================================
  // Create Entity
  // ====================================================

  async function createEntity(
    event
  ) {
    event.preventDefault();


    if (
      !selectedEntityTypeId ||
      !name.trim()
    ) {
      return;
    }


    try {
      const newEntity =
        await apiFetch(
          API_URL.entities,
          {
            method:
              "POST",

            body: {
              worldId,

              entityTypeId:
                selectedEntityTypeId,

              name:
                name.trim(),

              values,
            },
          }
        );


      setEntities(
        (current) => [
          newEntity,
          ...current,
        ]
      );


      await fetchTree();


      setSelectedDetailEntity(
        newEntity
      );


      setPendingSelectedEntityId(
        null
      );


      closeCreateForm();
    } catch (error) {
      console.error(
        "Failed to create entity:",
        error
      );

      alert(
        error.message
      );
    }
  }


  function openCreateForm() {
    setSelectedDetailEntity(
      null
    );

    setPendingSelectedEntityId(
      null
    );

    setIsEditingEntity(
      false
    );

    setEditName("");

    setEditValues({});

    setShowCreateForm(
      true
    );

    setSelectedEntityTypeId(
      ""
    );

    setName("");

    setValues({});

    setReferenceOptions({});
  }


  function closeCreateForm() {
    setShowCreateForm(
      false
    );

    setSelectedEntityTypeId(
      ""
    );

    setName("");

    setValues({});

    setReferenceOptions({});
  }


  // ====================================================
  // Entity Detail
  // ====================================================

  function openEntityDetail(
    entity
  ) {
    if (!entity) {
      return;
    }


    setShowCreateForm(
      false
    );

    setIsEditingEntity(
      false
    );

    setEditName("");

    setEditValues({});

    setSelectedEntityTypeId(
      ""
    );

    setName("");

    setValues({});

    setReferenceOptions({});

    setPendingSelectedEntityId(
      null
    );

    setSelectedDetailEntity(
      entity
    );

    closeContextMenu();
  }


  function getEntityTypeForEntity(
    entity
  ) {
    if (!entity) {
      return null;
    }


    const entityTypeId =
      typeof entity.entityTypeId ===
      "object"
        ? entity
            .entityTypeId
            ?._id
        : entity.entityTypeId;


    return entityTypes.find(
      (type) =>
        type._id ===
        entityTypeId
    );
  }


  function getReferencedEntityName(
    entityId
  ) {
    if (!entityId) {
      return "—";
    }


    const entity =
      entities.find(
        (item) =>
          item._id ===
          entityId
      );


    return (
      entity
        ? entity.name
        : "—"
    );
  }


  function formatFieldValue(
    field,
    value
  ) {
    if (
      value ===
        undefined ||
      value === null ||
      value === ""
    ) {
      return "—";
    }


    if (
      field.type ===
      "boolean"
    ) {
      return value
        ? t(
            "entities.yes"
          )
        : t(
            "entities.no"
          );
    }


    if (
      field.type ===
      "entity-reference"
    ) {
      return (
        getReferencedEntityName(
          value
        )
      );
    }


    return String(
      value
    );
  }


  // ====================================================
  // Edit Entity
  // ====================================================

  function startEditEntity(
    entityOverride = null
  ) {
    const targetEntity =
      entityOverride ||
      selectedDetailEntity;


    if (!targetEntity) {
      return;
    }


    const type =
      getEntityTypeForEntity(
        targetEntity
      );


    setShowCreateForm(
      false
    );

    setPendingSelectedEntityId(
      null
    );

    setSelectedDetailEntity(
      targetEntity
    );


    setEditName(
      targetEntity.name
    );


    setEditValues(
      targetEntity.values
        ? {
            ...targetEntity.values,
          }
        : {}
    );


    setReferenceOptions({});

    setIsEditingEntity(
      true
    );

    closeContextMenu();


    if (type) {
      type.fields.forEach(
        (field) => {
          if (
            field.type ===
            "entity-reference"
          ) {
            loadReferenceOptions(
              field
            );
          }
        }
      );
    }
  }


  function cancelEditEntity() {
    setIsEditingEntity(
      false
    );

    setEditName("");

    setEditValues({});

    setReferenceOptions({});
  }


  async function saveEntityEdit(
    event
  ) {
    event.preventDefault();


    if (
      !selectedDetailEntity ||
      !editName.trim()
    ) {
      return;
    }


    try {
      const updatedEntity =
        await apiFetch(
          `${API_URL.entities}/${selectedDetailEntity._id}`,
          {
            method:
              "PUT",

            body: {
              name:
                editName.trim(),

              values:
                editValues,
            },
          }
        );


      setSelectedDetailEntity(
        updatedEntity
      );


      setEntities(
        (current) =>
          current.map(
            (entity) =>
              entity._id ===
              updatedEntity._id
                ? updatedEntity
                : entity
          )
      );


      setIsEditingEntity(
        false
      );

      setEditName("");

      setEditValues({});

      setReferenceOptions({});


      await fetchTree();
    } catch (error) {
      console.error(
        "Failed to update entity:",
        error
      );

      alert(
        error.message
      );
    }
  }


  // ====================================================
  // Mobile Sheet
  // ====================================================

  function closeMobileSheet() {
    if (
      showCreateForm
    ) {
      closeCreateForm();

      return;
    }


    if (
      isEditingEntity
    ) {
      cancelEditEntity();

      return;
    }


    setPendingSelectedEntityId(
      null
    );

    setSelectedDetailEntity(
      null
    );
  }


  // ====================================================
  // Dynamic Form Field Renderer
  // ====================================================

  function renderDynamicField(
    field,
    currentValues,
    updateFunction
  ) {
    const value =
      currentValues[
        field.key
      ] ?? "";


    if (
      field.type ===
      "text"
    ) {
      return (
        <input
          type="text"
          value={
            value
          }
          required={
            field.required
          }
          onChange={
            (event) =>
              updateFunction(
                field.key,
                event.target
                  .value
              )
          }
        />
      );
    }


    if (
      field.type ===
      "long-text"
    ) {
      return (
        <textarea
          value={
            value
          }
          required={
            field.required
          }
          onChange={
            (event) =>
              updateFunction(
                field.key,
                event.target
                  .value
              )
          }
        />
      );
    }


    if (
      field.type ===
      "number"
    ) {
      return (
        <input
          type="number"
          value={
            value
          }
          required={
            field.required
          }
          onChange={
            (event) =>
              updateFunction(
                field.key,
                event.target
                  .value
              )
          }
        />
      );
    }


    if (
      field.type ===
      "date"
    ) {
      return (
        <input
          type="date"
          value={
            value
          }
          required={
            field.required
          }
          onChange={
            (event) =>
              updateFunction(
                field.key,
                event.target
                  .value
              )
          }
        />
      );
    }


    if (
      field.type ===
      "boolean"
    ) {
      return (
        <label className="checkbox-row entity-checkbox">
          <input
            type="checkbox"
            checked={
              Boolean(
                currentValues[
                  field.key
                ]
              )
            }
            onChange={
              (event) =>
                updateFunction(
                  field.key,
                  event.target
                    .checked
                )
            }
          />

          {t(
            "entities.yes"
          )}
        </label>
      );
    }


    if (
      field.type ===
      "select"
    ) {
      return (
        <select
          className="field-select"
          value={
            value
          }
          required={
            field.required
          }
          onChange={
            (event) =>
              updateFunction(
                field.key,
                event.target
                  .value
              )
          }
        >
          <option value="">
            {t(
              "entities.selectOption"
            )}
          </option>

          {field.options?.map(
            (option) => (
              <option
                key={
                  option
                }
                value={
                  option
                }
              >
                {option}
              </option>
            )
          )}
        </select>
      );
    }


    if (
      field.type ===
      "entity-reference"
    ) {
      const options =
        referenceOptions[
          field.key
        ] || [];


      return (
        <select
          className="field-select"
          value={
            value
          }
          required={
            field.required
          }
          onChange={
            (event) =>
              updateFunction(
                field.key,
                event.target
                  .value
              )
          }
        >
          <option value="">
            {t(
              "entities.selectEntity"
            )}
          </option>

          {options.map(
            (entity) => (
              <option
                key={
                  entity._id
                }
                value={
                  entity._id
                }
              >
                {
                  entity.name
                }
              </option>
            )
          )}
        </select>
      );
    }


    return null;
  }


  // ====================================================
  // Initial Load
  // ====================================================

  useEffect(() => {
    fetchWorld();

    fetchEntityTypes();

    fetchEntities();

    fetchTree();
  }, [
    worldId,
  ]);


  // ====================================================
  // Close Context Menu
  // ====================================================

  useEffect(() => {
    if (!contextMenu) {
      return undefined;
    }


    function handlePointerDown() {
      closeContextMenu();
    }


    function handleKeyDown(
      event
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        closeContextMenu();
      }
    }


    function handleViewportChange() {
      closeContextMenu();
    }


    window.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    window.addEventListener(
      "resize",
      handleViewportChange
    );

    window.addEventListener(
      "blur",
      handleViewportChange
    );


    return () => {
      window.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );

      window.removeEventListener(
        "resize",
        handleViewportChange
      );

      window.removeEventListener(
        "blur",
        handleViewportChange
      );
    };
  }, [
    contextMenu,
  ]);


  // ====================================================
  // Loading
  // ====================================================

  if (!world) {
    return (
      <div className="workspace-loading">
        {t(
          "workspace.loading"
        )}
      </div>
    );
  }


  const detailEntityType =
    getEntityTypeForEntity(
      selectedDetailEntity
    );


  const contextMenuNode =
    contextMenu
      ? treeNodes.find(
          (node) =>
            node._id ===
            contextMenu.nodeId
        )
      : null;


  // ====================================================
  // Explorer Sidebar
  // ====================================================

  const explorerSidebar = (
    <aside
      ref={
        explorerSidebarRef
      }
      className="entity-tree-sidebar"
      onScroll={
        handleExplorerScroll
      }
    >
      <div className="entity-tree-header">
        <span>
          {t(
            "entities.title"
          )}
        </span>

        <div className="tree-header-actions">
          <button
            type="button"
            className="tree-add-button"
            onClick={
              () =>
                openFolderForm(
                  null
                )
            }
            title={
              t(
                "tree.newFolder"
              )
            }
          >
            📁
          </button>

          <button
            type="button"
            className="tree-add-button"
            onClick={
              openCreateForm
            }
            title={
              t(
                "entities.newEntity"
              )
            }
          >
            +
          </button>
        </div>
      </div>


      {/* Folder Creation */}

      {showFolderForm && (
        <form
          className="folder-create-form"
          onSubmit={
            createFolder
          }
        >
          <div className="folder-create-parent">
            {
              folderParentId
                ? t(
                    "tree.createInside"
                  )
                : t(
                    "tree.createAtRoot"
                  )
            }
          </div>

          <div className="folder-create-row">
            <input
              autoFocus
              value={
                folderName
              }
              placeholder={
                t(
                  "tree.folderName"
                )
              }
              onChange={
                (event) =>
                  setFolderName(
                    event.target
                      .value
                  )
              }
            />

            <button
              type="submit"
            >
              ✓
            </button>

            <button
              type="button"
              onClick={
                closeFolderForm
              }
            >
              ×
            </button>
          </div>
        </form>
      )}


      {/* Tree */}

      <DndContext
        collisionDetection={
          pointerWithin
        }
        onDragStart={
          handleDragStart
        }
        onDragCancel={
          handleDragCancel
        }
        onDragEnd={
          handleDragEnd
        }
        modifiers={[
          restrictToVerticalAxis,
        ]}
      >
        <RootDropZone />

        <div className="entity-tree">
          {
            renderTreeNodes()
          }
        </div>

        <DragOverlay
          dropAnimation={null}
        >
          {activeTreeNode ? (
            <div className="explorer-drag-overlay">
              <span className="explorer-toggle">
                {activeTreeNode.kind ===
                "folder"
                  ? "›"
                  : ""}
              </span>

              <div className="explorer-node-main">
                <span className="explorer-icon">
                  {activeTreeNode.kind ===
                  "folder"
                    ? "📁"
                    : activeTreeNode
                        .entityId
                        ?.entityTypeId
                        ?.icon ||
                      "📄"}
                </span>

                <span className="explorer-name">
                  {activeTreeNode.kind ===
                  "folder"
                    ? activeTreeNode.name
                    : activeTreeNode
                        .entityId
                        ?.name ||
                      "Missing Entity"}
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>


      {/* Context Menu */}

      {contextMenu &&
        contextMenuNode && (
          <div
            className="explorer-context-menu"
            style={{
              left:
                `${contextMenu.x}px`,

              top:
                `${contextMenu.y}px`,
            }}
            onPointerDown={
              (event) =>
                event
                  .stopPropagation()
            }
            onContextMenu={
              (event) =>
                event
                  .preventDefault()
            }
          >
            {contextMenuNode.kind ===
            "folder" ? (
              <>
                <button
                  type="button"
                  className="explorer-context-item"
                  onClick={
                    () => {
                      closeContextMenu();

                      openFolderForm(
                        contextMenuNode._id
                      );
                    }
                  }
                >
                  <span>
                    📁
                  </span>

                  <span>
                    {
                      i18n.language.startsWith(
                        "zh"
                      )
                        ? "新建子文件夹"
                        : "New Folder"
                    }
                  </span>
                </button>


                <button
                  type="button"
                  className="explorer-context-item"
                  onClick={
                    () =>
                      startRenameFolder(
                        contextMenuNode
                      )
                  }
                >
                  <span>
                    ✎
                  </span>

                  <span>
                    {
                      i18n.language.startsWith(
                        "zh"
                      )
                        ? "重命名"
                        : "Rename"
                    }
                  </span>
                </button>


                <div className="explorer-context-divider" />


                <button
                  type="button"
                  className="explorer-context-item danger"
                  onClick={
                    () =>
                      deleteFolder(
                        contextMenuNode
                      )
                  }
                >
                  <span>
                    ×
                  </span>

                  <span>
                    {
                      i18n.language.startsWith(
                        "zh"
                      )
                        ? "删除文件夹"
                        : "Delete Folder"
                    }
                  </span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="explorer-context-item"
                  onClick={
                    () =>
                      openEntityDetail(
                        contextMenuNode.entityId
                      )
                  }
                >
                  <span>
                    ◉
                  </span>

                  <span>
                    {
                      i18n.language.startsWith(
                        "zh"
                      )
                        ? "打开"
                        : "Open"
                    }
                  </span>
                </button>


                <button
                  type="button"
                  className="explorer-context-item"
                  onClick={
                    () =>
                      startEditEntity(
                        contextMenuNode.entityId
                      )
                  }
                >
                  <span>
                    ✎
                  </span>

                  <span>
                    {
                      i18n.language.startsWith(
                        "zh"
                      )
                        ? "修改"
                        : "Edit"
                    }
                  </span>
                </button>


                <div className="explorer-context-divider" />


                <button
                  type="button"
                  className="explorer-context-item danger"
                  onClick={
                    () =>
                      deleteEntityNode(
                        contextMenuNode
                      )
                  }
                >
                  <span>
                    ×
                  </span>

                  <span>
                    {
                      i18n.language.startsWith(
                        "zh"
                      )
                        ? "删除实体"
                        : "Delete Entity"
                    }
                  </span>
                </button>
              </>
            )}
          </div>
        )}
    </aside>
  );


  // ====================================================
  // Render
  // ====================================================

  const LayoutComponent =
  embedded
    ? EmbeddedWorkspaceLayout
    : WorldLayout;

  return (
    <LayoutComponent
      worldId={worldId}
      worldName={world.name}
      secondarySidebar={
        explorerSidebar
      }
      enableUltrawidePane={
        !embedded
      }
    >
      {/* ==================================================
          Page Header
          ================================================== */}

      <div className="entity-page-header">
        <div>
          <h1>
            {
              showCreateForm
                ? t(
                    "entities.createTitle"
                  )
                : isEditingEntity
                  ? t(
                      "entities.editTitle"
                    )
                  : selectedDetailEntity
                    ? selectedDetailEntity.name
                    : t(
                        "entities.title"
                      )
            }
          </h1>

          <p>
            {
              showCreateForm
                ? t(
                    "entities.createDescription"
                  )
                : selectedDetailEntity &&
                    detailEntityType
                  ? `${detailEntityType.icon || ""} ${detailEntityType.name}`
                  : t(
                      "entities.subtitle"
                    )
            }
          </p>
        </div>


        {!showCreateForm &&
          !isEditingEntity && (
            <button
              className="create-button"
              onClick={
                openCreateForm
              }
            >
              {t(
                "entities.newEntity"
              )}
            </button>
          )}


        <button
          type="button"
          className="mobile-sheet-close"
          onClick={
            closeMobileSheet
          }
        >
          ×
        </button>
      </div>


      {/* ==================================================
          Create Entity
          ================================================== */}

      {showCreateForm && (
        <div className="create-panel entity-create-panel">
          <form
            onSubmit={
              createEntity
            }
          >
            <label>
              {t(
                "entities.entityType"
              )}
            </label>

            <select
              className="field-select"
              value={
                selectedEntityTypeId
              }
              onChange={
                (event) =>
                  selectEntityType(
                    event.target.value
                  )
              }
            >
              <option value="">
                {t(
                  "entities.selectType"
                )}
              </option>

              {entityTypes.map(
                (type) => (
                  <option
                    key={
                      type._id
                    }
                    value={
                      type._id
                    }
                  >
                    {type.icon}{" "}
                    {type.name}
                  </option>
                )
              )}
            </select>


            {selectedEntityType && (
              <>
                <div className="entity-form-divider" />

                <div className="selected-type-heading">
                  <span>
                    {
                      selectedEntityType.icon
                    }
                  </span>

                  <strong>
                    {
                      selectedEntityType.name
                    }
                  </strong>
                </div>


                <label>
                  {t(
                    "schema.nameField"
                  )}

                  <span className="required-star">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  value={
                    name
                  }
                  required
                  onChange={
                    (event) =>
                      setName(
                        event.target
                          .value
                      )
                  }
                />


                {selectedEntityType.fields.map(
                  (field) => (
                    <div
                      className="dynamic-field"
                      key={
                        field._id
                      }
                    >
                      <label>
                        {
                          field.label
                        }

                        {field.required && (
                          <span className="required-star">
                            *
                          </span>
                        )}
                      </label>

                      {renderDynamicField(
                        field,
                        values,
                        updateValue
                      )}
                    </div>
                  )
                )}
              </>
            )}


            <div className="form-buttons">
              <button
                type="button"
                className="cancel-button"
                onClick={
                  closeCreateForm
                }
              >
                {t(
                  "worlds.cancel"
                )}
              </button>

              <button
                type="submit"
                className="save-button"
                disabled={
                  !selectedEntityTypeId
                }
              >
                {t(
                  "entities.create"
                )}
              </button>
            </div>
          </form>
        </div>
      )}


      {/* ==================================================
          Edit Entity
          ================================================== */}

      {!showCreateForm &&
        isEditingEntity &&
        selectedDetailEntity &&
        detailEntityType && (
          <div className="create-panel entity-edit-panel">
            <form
              onSubmit={
                saveEntityEdit
              }
            >
              <div className="selected-type-heading">
                <span>
                  {
                    detailEntityType.icon
                  }
                </span>

                <strong>
                  {
                    detailEntityType.name
                  }
                </strong>
              </div>


              <label>
                {t(
                  "schema.nameField"
                )}

                <span className="required-star">
                  *
                </span>
              </label>

              <input
                type="text"
                value={
                  editName
                }
                required
                onChange={
                  (event) =>
                    setEditName(
                      event.target.value
                    )
                }
              />


              {detailEntityType.fields.map(
                (field) => (
                  <div
                    className="dynamic-field"
                    key={
                      field._id
                    }
                  >
                    <label>
                      {
                        field.label
                      }

                      {field.required && (
                        <span className="required-star">
                          *
                        </span>
                      )}
                    </label>

                    {renderDynamicField(
                      field,
                      editValues,
                      updateEditValue
                    )}
                  </div>
                )
              )}


              <div className="form-buttons">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={
                    cancelEditEntity
                  }
                >
                  {t(
                    "worlds.cancel"
                  )}
                </button>

                <button
                  type="submit"
                  className="save-button"
                >
                  {t(
                    "entities.saveChanges"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}


      {/* ==================================================
          Entity Detail
          ================================================== */}

      {!showCreateForm &&
        !isEditingEntity &&
        selectedDetailEntity &&
        detailEntityType && (
          <div className="entity-detail-panel">
            <div className="entity-detail-panel-header">
              <div className="entity-detail-title">
                <div className="entity-detail-icon">
                  {
                    detailEntityType.icon
                  }
                </div>

                <div>
                  <h2>
                    {
                      selectedDetailEntity.name
                    }
                  </h2>

                  <span>
                    {
                      detailEntityType.name
                    }
                  </span>
                </div>
              </div>


              <button
                type="button"
                className="small-action-button"
                onClick={
                  () =>
                    startEditEntity(
                      selectedDetailEntity
                    )
                }
              >
                {t(
                  "entities.edit"
                )}
              </button>
            </div>


            <div className="entity-detail-panel-body">
              {detailEntityType
                .fields.length ===
                0 && (
                <div className="detail-empty">
                  {t(
                    "entities.noCustomFields"
                  )}
                </div>
              )}


              {detailEntityType.fields.map(
                (field) => {
                  const rawValue =
                    selectedDetailEntity
                      .values?.[
                        field.key
                      ];


                  return (
                    <div
                      className={
                        field.type ===
                        "long-text"
                          ? "detail-field detail-field-long"
                          : "detail-field"
                      }
                      key={
                        field._id
                      }
                    >
                      <div className="detail-field-label">
                        {
                          field.label
                        }
                      </div>

                      <div className="detail-field-value">
                        {formatFieldValue(
                          field,
                          rawValue
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>


            <div className="entity-detail-panel-footer">
              {t(
                "entities.lastUpdated"
              )}{" "}

              {
                new Date(
                  selectedDetailEntity.updatedAt
                ).toLocaleString(
                  i18n.language ===
                    "zh-CN"
                    ? "zh-CN"
                    : "en-US"
                )
              }
            </div>
          </div>
        )}


      {/* ==================================================
          Empty Browser
          ================================================== */}

      {!showCreateForm &&
        !isEditingEntity &&
        !selectedDetailEntity && (
          <div className="entity-browser-message">
            <h2>
              {t(
                "entities.browserTitle"
              )}
            </h2>

            <p>
              {t(
                "entities.browserDescription"
              )}
            </p>
          </div>
        )}
    </LayoutComponent>
  );
}


export default EntitiesPage;