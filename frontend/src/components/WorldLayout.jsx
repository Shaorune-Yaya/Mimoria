import AppHeader from "./AppHeader";
import WorldSidebar from "./WorldSidebar";

function WorldLayout({
  worldId,
  worldName,
  backTo = "/",
  secondarySidebar = null,
  children,
}) {
  return (
    <div className="workspace">
      <AppHeader
        showBackButton
        backTo={backTo}
        worldName={worldName}
      />

      <div className="workspace-body">
        <WorldSidebar
          worldId={worldId}
        />

        {secondarySidebar}

        <main className="workspace-main">
          {children}
        </main>
      </div>
    </div>
  );
}

export default WorldLayout;