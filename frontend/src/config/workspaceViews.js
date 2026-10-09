export const WORKSPACE_VIEWS = [
  {
    id: "entity-types",
    labelKey: "workspace.entityTypes",
    icon: "▦",
    path: "entity-types",
    mainRouteAvailable: true,
    dockable: true,
  },

  {
    id: "entities",
    labelKey: "workspace.entities",
    icon: "◆",
    path: "entities",
    mainRouteAvailable: true,
    dockable: true,
  },

  {
    id: "documents",
    labelKey: "workspace.documents",
    icon: "▤",
    path: "documents",
    mainRouteAvailable: true,
    dockable: true,
  },

  {
    id: "smart-import",
    labelKey: "workspace.smartImport",
    icon: "✦",
    path: "smart-import",
    mainRouteAvailable: true,
    dockable: true,
  },

  {
    id: "timeline",
    labelKey: "workspace.timeline",
    icon: "◷",
    path: null,
    mainRouteAvailable: false,
    dockable: true,
  },

  {
    id: "graph",
    labelKey: "workspace.graph",
    icon: "◉",
    path: null,
    mainRouteAvailable: false,
    dockable: true,
  },

  {
    id: "settings",
    labelKey: "workspace.settings",
    icon: "⚙",
    path: null,
    mainRouteAvailable: false,
    dockable: true,
  },
];


export const DOCKABLE_WORKSPACE_VIEWS =
  WORKSPACE_VIEWS.filter(
    (view) =>
      view.dockable
  );


export function getWorkspaceView(
  viewId
) {
  return (
    WORKSPACE_VIEWS.find(
      (view) =>
        view.id ===
        viewId
    ) ||
    null
  );
}


export function isDockableWorkspaceView(
  viewId
) {
  return DOCKABLE_WORKSPACE_VIEWS.some(
    (view) =>
      view.id ===
      viewId
  );
}