import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import {
  DndContext,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";

import {
  useTranslation,
} from "react-i18next";

import WorldLayout from "../components/WorldLayout";
import { API_URL } from "../config/api";


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
  selectedEntityId,
  renderChildren,
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: node._id,
  });

  const {
    setNodeRef: setDropRef,
    isOver,
  } = useDroppable({
    id: node._id,
  });

  function setRefs(element) {
    setDragRef(element);
    setDropRef(element);
  }

  const style = {
    paddingLeft:
      `${8 + depth * 16}px`,

    opacity:
      isDragging
        ? 0.45
        : 1,

    transform:
      transform
        ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
        : undefined,
  };

  const isFolder =
    node.kind === "folder";

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

  return (
    <>
      <div
        ref={setRefs}
        className={
          isOver
            ? "explorer-row drop-target"
            : isSelected
              ? "explorer-row selected"
              : "explorer-row"
        }
        style={style}
        {...attributes}
      >
        <button
          type="button"
          className="explorer-toggle"
          onClick={(event) => {
            event.stopPropagation();

            if (hasChildren) {
              onToggle(
                node._id
              );
            }
          }}
          aria-label={
            expanded
              ? "Collapse"
              : "Expand"
          }
        >
          {hasChildren
            ? expanded
              ? "⌄"
              : "›"
            : ""}
        </button>

        <button
          type="button"
          className="explorer-node-main"
          onClick={() => {
            if (isFolder) {
              onToggle(
                node._id
              );
            } else {
              onEntityClick(
                entity
              );
            }
          }}
        >
          <span className="explorer-icon">
            {icon}
          </span>

          <span className="explorer-name">
            {displayName}
          </span>
        </button>

        <button
          type="button"
          className="explorer-add-child"
          onClick={(event) => {
            event.stopPropagation();

            onCreateFolder(
              node._id
            );
          }}
          title="New Folder"
          aria-label="Create folder inside this node"
        >
          +
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
    id: "TREE_ROOT",
  });

  return (
    <div
      ref={setNodeRef}
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

function EntitiesPage() {
  const { worldId } =
    useParams();

  const {
    t,
    i18n,
  } = useTranslation();


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
  ] = useState({});


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
      const response =
        await fetch(
          `${API_URL.worlds}/${worldId}`
        );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch world"
        );
      }

      const data =
        await response.json();

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
      const response =
        await fetch(
          `${API_URL.entityTypes}/world/${worldId}`
        );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch entity types"
        );
      }

      const data =
        await response.json();

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
      const response =
        await fetch(
          `${API_URL.entities}/world/${worldId}`
        );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch entities"
        );
      }

      const data =
        await response.json();

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
      const response =
        await fetch(
          `${API_URL.tree}/world/${worldId}`
        );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch tree"
        );
      }

      const data =
        await response.json();

      setTreeNodes(data);
    } catch (error) {
      console.error(
        "Failed to fetch tree:",
        error
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

    setFolderName("");
    setShowFolderForm(true);

    if (parentId) {
      setExpandedNodes(
        (current) => ({
          ...current,
          [parentId]: true,
        })
      );
    }
  }


  function closeFolderForm() {
    setShowFolderForm(false);
    setFolderName("");
    setFolderParentId(null);
  }


  async function createFolder(
    event
  ) {
    event.preventDefault();

    if (!folderName.trim()) {
      return;
    }

    try {
      const response =
        await fetch(
          `${API_URL.tree}/folders`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                worldId,

                name:
                  folderName.trim(),

                parentId:
                  folderParentId,
              }),
          }
        );

      if (!response.ok) {
        const data =
          await response.json();

        throw new Error(
          data.message ||
            "Failed to create folder"
        );
      }

      const createdFolder =
        await response.json();

      if (folderParentId) {
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

      alert(error.message);
    }
  }


  // ====================================================
  // Tree Movement
  // ====================================================

  async function moveTreeNode(
    nodeId,
    parentId
  ) {
    try {
      const response =
        await fetch(
          `${API_URL.tree}/${nodeId}/move`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                parentId,
              }),
          }
        );

      if (!response.ok) {
        const data =
          await response.json();

        throw new Error(
          data.message ||
            "Failed to move node"
        );
      }

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

      alert(error.message);
    }
  }


  function handleDragEnd(
    event
  ) {
    const {
      active,
      over,
    } = event;

    if (!over) {
      return;
    }

    const draggedId =
      String(active.id);

    const targetId =
      String(over.id);

    if (
      draggedId ===
      targetId
    ) {
      return;
    }

    if (
      targetId ===
      "TREE_ROOT"
    ) {
      moveTreeNode(
        draggedId,
        null
      );

      return;
    }

    moveTreeNode(
      draggedId,
      targetId
    );
  }


  // ====================================================
  // Tree Helpers
  // ====================================================

  function getChildren(
    parentId
  ) {
    return treeNodes
      .filter((node) => {
        if (!parentId) {
          return !node.parentId;
        }

        const nodeParentId =
          typeof node.parentId ===
          "object"
            ? node.parentId?._id
            : node.parentId;

        return (
          nodeParentId ===
          parentId
        );
      })
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
          !current[nodeId],
      })
    );
  }


  function renderTreeNodes(
    parentId = null,
    depth = 0
  ) {
    const children =
      getChildren(parentId);

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
            key={node._id}
            node={node}
            depth={depth}
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
            selectedEntityId={
              selectedDetailEntity
                ?._id
            }
            renderChildren={
              renderTreeNodes
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

      const response =
        await fetch(url);

      if (!response.ok) {
        throw new Error(
          "Failed to load reference options"
        );
      }

      const data =
        await response.json();

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
  // Entity Type Selection
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
  // Create Entity Values
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


  // ====================================================
  // Create Entity
  // ====================================================

  async function createEntity(
    event
  ) {
    event.preventDefault();

    if (
      !selectedEntityTypeId
    ) {
      return;
    }

    if (!name.trim()) {
      return;
    }

    try {
      const response =
        await fetch(
          API_URL.entities,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                worldId,

                entityTypeId:
                  selectedEntityTypeId,

                name:
                  name.trim(),

                values,
              }),
          }
        );

      if (!response.ok) {
        const errorData =
          await response.json();

        throw new Error(
          errorData.message ||
            "Failed to create entity"
        );
      }

      const newEntity =
        await response.json();

      setEntities(
        (current) => [
          newEntity,
          ...current,
        ]
      );

      // The backend automatically creates the TreeNode.
      await fetchTree();

      setSelectedDetailEntity(
        newEntity
      );

      closeCreateForm();
    } catch (error) {
      console.error(
        "Failed to create entity:",
        error
      );

      alert(error.message);
    }
  }


  function openCreateForm() {
    setSelectedDetailEntity(
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

    setSelectedDetailEntity(
      entity
    );
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
        ? entity.entityTypeId?._id
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

    return entity
      ? entity.name
      : "—";
  }


  function formatFieldValue(
    field,
    value
  ) {
    if (
      value === undefined ||
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
        ? t("entities.yes")
        : t("entities.no");
    }

    if (
      field.type ===
      "entity-reference"
    ) {
      return getReferencedEntityName(
        value
      );
    }

    return String(value);
  }


  // ====================================================
  // Edit Entity
  // ====================================================

  function startEditEntity() {
    if (!selectedDetailEntity) {
      return;
    }

    const type =
      getEntityTypeForEntity(
        selectedDetailEntity
      );

    setEditName(
      selectedDetailEntity.name
    );

    setEditValues(
      selectedDetailEntity.values
        ? {
            ...selectedDetailEntity.values,
          }
        : {}
    );

    setReferenceOptions({});

    setIsEditingEntity(true);

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
    setIsEditingEntity(false);
    setEditName("");
    setEditValues({});
    setReferenceOptions({});
  }

  function closeMobileSheet() {
    if (showCreateForm) {
      closeCreateForm();
      return;
    }

    if (isEditingEntity) {
      cancelEditEntity();
      return;
    }

    setSelectedDetailEntity(
      null
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
      const response =
        await fetch(
          `${API_URL.entities}/${selectedDetailEntity._id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                name:
                  editName.trim(),

                values:
                  editValues,
              }),
          }
        );

      if (!response.ok) {
        const errorData =
          await response.json();

        throw new Error(
          errorData.message ||
            "Failed to update entity"
        );
      }

      const updatedEntity =
        await response.json();

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

      setIsEditingEntity(false);
      setEditName("");
      setEditValues({});
      setReferenceOptions({});

      // Refresh the tree so renamed entities update immediately.
      await fetchTree();
    } catch (error) {
      console.error(
        "Failed to update entity:",
        error
      );

      alert(error.message);
    }
  }


  // ====================================================
  // Initial Load
  // ====================================================

  useEffect(() => {
    fetchWorld();
    fetchEntityTypes();
    fetchEntities();
    fetchTree();
  }, [worldId]);


  // ====================================================
  // Create Field Renderer
  // ====================================================

  function renderField(
    field
  ) {
    const value =
      values[field.key] ??
      "";

    if (
      field.type ===
      "text"
    ) {
      return (
        <input
          type="text"
          value={value}
          required={
            field.required
          }
          onChange={(event) =>
            updateValue(
              field.key,
              event.target.value
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
          value={value}
          required={
            field.required
          }
          onChange={(event) =>
            updateValue(
              field.key,
              event.target.value
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
          value={value}
          required={
            field.required
          }
          onChange={(event) =>
            updateValue(
              field.key,
              event.target.value
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
          value={value}
          required={
            field.required
          }
          onChange={(event) =>
            updateValue(
              field.key,
              event.target.value
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
                values[
                  field.key
                ]
              )
            }
            onChange={(event) =>
              updateValue(
                field.key,
                event.target.checked
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
          value={value}
          required={
            field.required
          }
          onChange={(event) =>
            updateValue(
              field.key,
              event.target.value
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
                key={option}
                value={option}
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
          value={value}
          required={
            field.required
          }
          onChange={(event) =>
            updateValue(
              field.key,
              event.target.value
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
                {entity.name}
              </option>
            )
          )}
        </select>
      );
    }

    return null;
  }


  // ====================================================
  // Edit Field Renderer
  // ====================================================

  function renderEditField(
    field
  ) {
    const value =
      editValues[
        field.key
      ] ?? "";

    if (
      field.type ===
      "text"
    ) {
      return (
        <input
          type="text"
          value={value}
          required={
            field.required
          }
          onChange={(event) =>
            updateEditValue(
              field.key,
              event.target.value
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
          value={value}
          required={
            field.required
          }
          onChange={(event) =>
            updateEditValue(
              field.key,
              event.target.value
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
          value={value}
          required={
            field.required
          }
          onChange={(event) =>
            updateEditValue(
              field.key,
              event.target.value
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
          value={value}
          required={
            field.required
          }
          onChange={(event) =>
            updateEditValue(
              field.key,
              event.target.value
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
                editValues[
                  field.key
                ]
              )
            }
            onChange={(event) =>
              updateEditValue(
                field.key,
                event.target.checked
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
          value={value}
          required={
            field.required
          }
          onChange={(event) =>
            updateEditValue(
              field.key,
              event.target.value
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
                key={option}
                value={option}
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
          value={value}
          required={
            field.required
          }
          onChange={(event) =>
            updateEditValue(
              field.key,
              event.target.value
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
                {entity.name}
              </option>
            )
          )}
        </select>
      );
    }

    return null;
  }


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


  // ====================================================
  // Explorer Sidebar
  // ====================================================

  const explorerSidebar = (
    <aside className="entity-tree-sidebar">
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
            onClick={() =>
              openFolderForm(
                null
              )
            }
            title={t(
              "tree.newFolder"
            )}
            aria-label={t(
              "tree.newFolder"
            )}
          >
            <span aria-hidden="true">
              📁
            </span>

            <span
              className="tree-add-symbol"
              aria-hidden="true"
            >
            
            </span>
          </button>

          <button
            type="button"
            className="tree-add-button"
            onClick={
              openCreateForm
            }
            title={t(
              "entities.newEntity"
            )}
            aria-label={t(
              "entities.newEntity"
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
                "tree.folderName"
              )}
              onChange={(event) =>
                setFolderName(
                  event.target.value
                )
              }
            />

            <button
              type="submit"
              aria-label="Create folder"
            >
              ✓
            </button>

            <button
              type="button"
              onClick={
                closeFolderForm
              }
              aria-label="Cancel"
            >
              ×
            </button>
          </div>
        </form>
      )}

      <DndContext
        onDragEnd={handleDragEnd}
        modifiers={[
          restrictToVerticalAxis,
          restrictToParentElement,
        ]}
      >
        <RootDropZone />

        <div className="entity-tree">
          {renderTreeNodes()}
        </div>
      </DndContext>
    </aside>
  );


  // ====================================================
  // Page
  // ====================================================

  return (
    <WorldLayout
      worldId={worldId}
      worldName={world.name}
      secondarySidebar={
        explorerSidebar
      }
      enableUltrawidePane
    >
      <div className="entity-page-header">
        <div>
          <h1>
            {showCreateForm
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
                    )}
          </h1>

          <p>
            {showCreateForm
              ? t(
                  "entities.createDescription"
                )
              : selectedDetailEntity &&
                  detailEntityType
                ? `${detailEntityType.icon || ""} ${detailEntityType.name}`
                : t(
                    "entities.subtitle"
                  )}
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
            aria-label="Close"
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
              onChange={(event) =>
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
                  value={name}
                  required
                  onChange={(event) =>
                    setName(
                      event.target.value
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
                        {field.label}

                        {field.required && (
                          <span className="required-star">
                            *
                          </span>
                        )}
                      </label>

                      {renderField(
                        field
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
          <div className="create-panel entity-create-panel entity-edit-panel">
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
                onChange={(event) =>
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
                      {field.label}

                      {field.required && (
                        <span className="required-star">
                          *
                        </span>
                      )}
                    </label>

                    {renderEditField(
                      field
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
                  startEditEntity
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

              {new Date(
                selectedDetailEntity.updatedAt
              ).toLocaleString(
                i18n.language ===
                  "zh-CN"
                  ? "zh-CN"
                  : "en-US"
              )}
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
    </WorldLayout>
  );
}

export default EntitiesPage;