import {
  useEffect,
  useRef,
  useState,
} from "react";

import AppHeader from "./AppHeader";
import WorldSidebar from "./WorldSidebar";
import SecondaryWorkspacePane from "./SecondaryWorkspacePane";

const MIN_SPLIT_PERCENT = 25;
const MAX_SPLIT_PERCENT = 75;

const DEFAULT_MOBILE_SHEET_HEIGHT = 36;
const MIN_MOBILE_SHEET_HEIGHT = 28;
const MAX_MOBILE_SHEET_HEIGHT = 92;

function WorldLayout({
  worldId,
  worldName,
  backTo = "/",
  secondarySidebar = null,
  enableUltrawidePane = false,
  children,
}) {
  const workspaceSplitRef =
    useRef(null);

  // ======================================================
  // Mobile Navigation Drawer
  // ======================================================

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  // ======================================================
  // Desktop / Ultrawide Splitter
  // ======================================================

  const [
    splitPercent,
    setSplitPercent,
  ] = useState(() => {
    const saved =
      Number(
        localStorage.getItem(
          "mimoria-workspace-split"
        )
      );

    if (
      Number.isFinite(saved) &&
      saved >=
        MIN_SPLIT_PERCENT &&
      saved <=
        MAX_SPLIT_PERCENT
    ) {
      return saved;
    }

    return 50;
  });

  const [
    isResizing,
    setIsResizing,
  ] = useState(false);

  // ======================================================
  // Mobile Bottom Sheet
  // ======================================================

  const [
    mobileSheetHeight,
    setMobileSheetHeight,
  ] = useState(
    DEFAULT_MOBILE_SHEET_HEIGHT
  );

  const [
    isMobileSheetResizing,
    setIsMobileSheetResizing,
  ] = useState(false);

  // ======================================================
  // Secondary Workspace
  // ======================================================

  const [
    dockTargetActive,
    setDockTargetActive,
  ] = useState(false);

  const [
    secondaryView,
    setSecondaryView,
  ] = useState(() => {
    return (
      localStorage.getItem(
        "mimoria-secondary-pane-view"
      ) ||
      "entity-types"
    );
  });

  const [
    secondaryPaneOpen,
    setSecondaryPaneOpen,
  ] = useState(true);

  // ======================================================
  // Layout Classes
  // ======================================================

  const bodyClassName = [
    "workspace-body",

    secondarySidebar
      ? "has-secondary-sidebar"
      : "",

    enableUltrawidePane
      ? "has-ultrawide-pane"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  // ======================================================
  // Mobile Drawer
  // ======================================================

  function closeMobileMenu() {
    setMobileMenuOpen(
      false
    );
  }

  // ======================================================
  // Secondary Workspace View
  // ======================================================

  function setWorkspaceView(
    view
  ) {
    setSecondaryView(
      view
    );

    if (view) {
      localStorage.setItem(
        "mimoria-secondary-pane-view",
        view
      );
    } else {
      localStorage.removeItem(
        "mimoria-secondary-pane-view"
      );
    }
  }

  // ======================================================
  // Desktop Split Resize
  // ======================================================

  function beginResize(
    event
  ) {
    event.preventDefault();

    setIsResizing(
      true
    );
  }

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    function handlePointerMove(
      event
    ) {
      const container =
        workspaceSplitRef
          .current;

      if (!container) {
        return;
      }

      const rect =
        container.getBoundingClientRect();

      const rawPercent =
        ((event.clientX -
          rect.left) /
          rect.width) *
        100;

      const nextPercent =
        Math.min(
          MAX_SPLIT_PERCENT,
          Math.max(
            MIN_SPLIT_PERCENT,
            rawPercent
          )
        );

      setSplitPercent(
        nextPercent
      );
    }

    function handlePointerUp() {
      setIsResizing(
        false
      );

      localStorage.setItem(
        "mimoria-workspace-split",
        String(
          splitPercent
        )
      );
    }

    window.addEventListener(
      "pointermove",
      handlePointerMove
    );

    window.addEventListener(
      "pointerup",
      handlePointerUp
    );

    document.body.classList.add(
      "workspace-is-resizing"
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      window.removeEventListener(
        "pointerup",
        handlePointerUp
      );

      document.body.classList.remove(
        "workspace-is-resizing"
      );
    };
  }, [
    isResizing,
    splitPercent,
  ]);

  // ======================================================
  // Mobile Bottom Sheet Resize
  // ======================================================

  function beginMobileSheetResize(
    event
  ) {
    if (
      window.innerWidth >
      760
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setIsMobileSheetResizing(
      true
    );
  }

  useEffect(() => {
    if (
      !isMobileSheetResizing
    ) {
      return;
    }

    function handlePointerMove(
      event
    ) {
      const viewportHeight =
        window.innerHeight;

      if (
        viewportHeight <= 0
      ) {
        return;
      }

      const rawHeight =
        ((viewportHeight -
          event.clientY) /
          viewportHeight) *
        100;

      const nextHeight =
        Math.min(
          MAX_MOBILE_SHEET_HEIGHT,
          Math.max(
            MIN_MOBILE_SHEET_HEIGHT,
            rawHeight
          )
        );

      setMobileSheetHeight(
        nextHeight
      );
    }

    function handlePointerUp() {
      setIsMobileSheetResizing(
        false
      );
    }

    window.addEventListener(
      "pointermove",
      handlePointerMove,
      {
        passive: false,
      }
    );

    window.addEventListener(
      "pointerup",
      handlePointerUp
    );

    window.addEventListener(
      "pointercancel",
      handlePointerUp
    );

    document.body.classList.add(
      "mobile-sheet-is-resizing"
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      window.removeEventListener(
        "pointerup",
        handlePointerUp
      );

      window.removeEventListener(
        "pointercancel",
        handlePointerUp
      );

      document.body.classList.remove(
        "mobile-sheet-is-resizing"
      );
    };
  }, [
    isMobileSheetResizing,
  ]);

  // ======================================================
  // Docking
  // ======================================================

  function handleDockDragOver(
    event
  ) {
    if (
      !event.dataTransfer.types.includes(
        "application/x-mimoria-workspace"
      )
    ) {
      return;
    }

    event.preventDefault();

    event.dataTransfer.dropEffect =
      "move";

    setDockTargetActive(
      true
    );
  }

  function handleDockDragLeave(
    event
  ) {
    if (
      event.currentTarget.contains(
        event.relatedTarget
      )
    ) {
      return;
    }

    setDockTargetActive(
      false
    );
  }

  function handleDockDrop(
    event
  ) {
    event.preventDefault();

    const view =
      event.dataTransfer.getData(
        "application/x-mimoria-workspace"
      ) ||
      event.dataTransfer.getData(
        "text/plain"
      );

    setDockTargetActive(
      false
    );

    if (!view) {
      return;
    }

    setWorkspaceView(
      view
    );

    setSecondaryPaneOpen(
      true
    );
  }

  function closeSecondaryPane() {
    setSecondaryPaneOpen(
      false
    );
  }

  function reopenSecondaryPane() {
    setSecondaryPaneOpen(
      true
    );
  }

  // ======================================================
  // Render
  // ======================================================

  return (
    <div className="workspace">
      <AppHeader
        showBackButton
        showMenuButton
        backTo={backTo}
        worldName={
          worldName
        }
        onMenuClick={() =>
          setMobileMenuOpen(
            true
          )
        }
      />

      {mobileMenuOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={
            closeMobileMenu
          }
        >
          <div
            className="mobile-drawer"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <WorldSidebar
              worldId={
                worldId
              }
              variant="drawer"
              onNavigate={
                closeMobileMenu
              }
            />
          </div>
        </div>
      )}

      <div
        className={
          bodyClassName
        }
      >
        <WorldSidebar
          worldId={
            worldId
          }
        />

        {secondarySidebar}

        <div
          className={
            secondaryPaneOpen
              ? "workspace-split-area secondary-open"
              : "workspace-split-area"
          }
          ref={
            workspaceSplitRef
          }
          style={{
            "--primary-pane-percent":
              `${splitPercent}%`,

            "--mobile-sheet-height":
              `${mobileSheetHeight}dvh`,
          }}
        >
          <div
            className={
              isMobileSheetResizing
                ? "mobile-sheet-resize-handle active"
                : "mobile-sheet-resize-handle"
            }
            onPointerDown={
              beginMobileSheetResize
            }
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize panel"
          >
            <div className="mobile-sheet-resize-pill" />
          </div>

          <main className="workspace-main workspace-primary-pane">
            {children}
          </main>

          {enableUltrawidePane && (
            <>
              {secondaryPaneOpen && (
                <div
                  className={
                    isResizing
                      ? "workspace-splitter active"
                      : "workspace-splitter"
                  }
                  onPointerDown={
                    beginResize
                  }
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize workspace panes"
                >
                  <div className="workspace-splitter-handle" />
                </div>
              )}

              {secondaryPaneOpen ? (
                <div
                  className={
                    dockTargetActive
                      ? "workspace-secondary-wrapper dock-target-active"
                      : "workspace-secondary-wrapper"
                  }
                  onDragOver={
                    handleDockDragOver
                  }
                  onDragLeave={
                    handleDockDragLeave
                  }
                  onDrop={
                    handleDockDrop
                  }
                >
                  <SecondaryWorkspacePane
                    worldId={
                      worldId
                    }
                    activeView={
                      secondaryView
                    }
                    onChangeView={
                      setWorkspaceView
                    }
                    onClose={
                      closeSecondaryPane
                    }
                  />

                  {dockTargetActive && (
                    <div className="workspace-dock-overlay">
                      <div className="workspace-dock-zone">
                        <span className="workspace-dock-icon">
                          ▣
                        </span>

                        <strong>
                          Dock to right
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className="workspace-secondary-reopen"
                  onClick={
                    reopenSecondaryPane
                  }
                  title="Open secondary workspace"
                >
                  ◧
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default WorldLayout;