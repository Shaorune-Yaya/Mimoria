function EmbeddedWorkspaceLayout({
  secondarySidebar = null,
  children,
}) {
  return (
    <div
      className={[
        "embedded-workspace-layout",

        secondarySidebar
          ? "has-explorer"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {secondarySidebar && (
        <div className="embedded-workspace-explorer">
          {secondarySidebar}
        </div>
      )}

      <main className="embedded-workspace-main">
        {children}
      </main>
    </div>
  );
}


export default EmbeddedWorkspaceLayout;