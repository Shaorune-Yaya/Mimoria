import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useTranslation,
} from "react-i18next";

import {
  useOnboarding,
} from "./OnboardingContext";


const TARGET_PADDING =
  8;

const TOOLTIP_GAP =
  14;

const VIEWPORT_PADDING =
  12;

const DESKTOP_TOOLTIP_WIDTH =
  340;

const MOBILE_TOOLTIP_MAX_WIDTH =
  380;

const MOBILE_BREAKPOINT =
  760;

const ULTRAWIDE_MEDIA_QUERY =
  "(min-width: 1800px) and (min-aspect-ratio: 21/10)";


// ======================================================
// Helpers
// ======================================================

function clamp(
  value,
  min,
  max
) {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}


function findTarget(
  selector
) {
  if (
    !selector
  ) {
    return null;
  }


  const elements =
    Array.from(
      document.querySelectorAll(
        selector
      )
    );


  /*
   * Desktop sidebar and mobile drawer can contain the
   * same onboarding selector.
   *
   * Always use a VISIBLE copy.
   */
  const visibleElement =
    elements.find(
      (
        element
      ) => {
        const rect =
          element.getBoundingClientRect();


        const style =
          window.getComputedStyle(
            element
          );


        return (
          rect.width >
            0 &&
          rect.height >
            0 &&
          style.display !==
            "none" &&
          style.visibility !==
            "hidden" &&
          Number(
            style.opacity
          ) !==
            0
        );
      }
    );


  if (
    !visibleElement
  ) {
    return null;
  }


  const rect =
    visibleElement
      .getBoundingClientRect();


  const top =
    Math.max(
      0,
      rect.top -
        TARGET_PADDING
    );


  const left =
    Math.max(
      0,
      rect.left -
        TARGET_PADDING
    );


  const right =
    Math.min(
      window.innerWidth,
      rect.right +
        TARGET_PADDING
    );


  const bottom =
    Math.min(
      window.innerHeight,
      rect.bottom +
        TARGET_PADDING
    );


  return {
    element:
      visibleElement,

    top,

    left,

    right,

    bottom,

    width:
      Math.max(
        0,
        right -
          left
      ),

    height:
      Math.max(
        0,
        bottom -
          top
      ),
  };
}


// ======================================================
// Overlay
// ======================================================

export default function OnboardingOverlay() {
  const {
    t,
  } =
    useTranslation();


  const location =
    useLocation();


  const navigate =
    useNavigate();


  const coachmarkRef =
    useRef(
      null
    );


  const {
    active,

    currentStep,

    stepIndex,

    steps,

    skipping,

    skipOnboarding,

    nextStep,
  } =
    useOnboarding();


  const [
    target,
    setTarget,
  ] =
    useState(
      null
    );


  const [
    focusTarget,
    setFocusTarget,
  ] =
    useState(
      null
    );


  const [
    coachmarkSize,
    setCoachmarkSize,
  ] =
    useState({
      width:
        DESKTOP_TOOLTIP_WIDTH,

      height:
        190,
    });


  // ====================================================
  // Clear Previous Target
  // ====================================================

  useEffect(
    () => {
      setTarget(
        null
      );


      setFocusTarget(
        null
      );
    },
    [
      currentStep?.id,
      location.pathname,
    ]
  );


  // ====================================================
  // Optional Route Navigation
  // ====================================================

  useEffect(
    () => {
      if (
        !active ||
        !currentStep?.path
      ) {
        return;
      }


      if (
        location.pathname !==
        currentStep.path
      ) {
        navigate(
          currentStep.path
        );
      }
    },
    [
      active,
      currentStep?.path,
      location.pathname,
      navigate,
    ]
  );

  // ====================================================
  // Ultrawide Tutorial Detection
  //
  // Mimoria exposes the secondary desktop workspace only
  // when BOTH conditions are true:
  //
  // - viewport width >= 1800px
  // - aspect ratio >= 21:10
  //
  // Tutorial steps marked:
  //
  // requiresUltrawide: true
  //
  // are therefore skipped automatically when that layout
  // is unavailable.
  //
  // This also watches viewport changes while the tutorial
  // step is active.
  // ====================================================

  useEffect(
    () => {
      if (
        !active ||
        !currentStep?.requiresUltrawide
      ) {
        return;
      }


      const mediaQuery =
        window.matchMedia(
          ULTRAWIDE_MEDIA_QUERY
        );


      let skipTimeoutId =
        null;


      function syncUltrawideStep() {
        /*
        * Ultrawide layout is available.
        *
        * Keep the current tutorial step active and let the
        * normal target tracker find its highlighted UI.
        */
        if (
          mediaQuery.matches
        ) {
          if (
            skipTimeoutId !==
            null
          ) {
            window.clearTimeout(
              skipTimeoutId
            );


            skipTimeoutId =
              null;
          }


          return;
        }


        /*
        * The real secondary workspace does not exist at
        * this viewport size.
        *
        * Advance instead of leaving the user on the
        * "finding target" screen.
        */
        if (
          skipTimeoutId !==
          null
        ) {
          return;
        }


        skipTimeoutId =
          window.setTimeout(
            () => {
              skipTimeoutId =
                null;


              nextStep();
            },
            60
          );
      }


      /*
      * Check immediately when the tutorial reaches this
      * step.
      */
      syncUltrawideStep();


      /*
      * Keep the tutorial synchronized if the browser is
      * resized while this step is active.
      */
      mediaQuery.addEventListener(
        "change",
        syncUltrawideStep
      );


      return () => {
        mediaQuery.removeEventListener(
          "change",
          syncUltrawideStep
        );


        if (
          skipTimeoutId !==
          null
        ) {
          window.clearTimeout(
            skipTimeoutId
          );
        }
      };
    },
    [
      active,
      currentStep?.id,
      currentStep?.requiresUltrawide,
      nextStep,
    ]
  );

  // ====================================================
  // Track Target
  // ====================================================

  useEffect(
    () => {
      if (
        !active ||
        !currentStep ||
        currentStep.type ===
          "welcome" ||
        !currentStep.selector
      ) {
        setTarget(
          null
        );


        setFocusTarget(
          null
        );


        return;
      }


      let cancelled =
        false;


      let frameId =
        null;


      function updateTarget() {
        if (
          cancelled
        ) {
          return;
        }


        setTarget(
          findTarget(
            currentStep.selector
          )
        );


        const focusSelector =
          currentStep.focusSelector ||
          currentStep.selector;


        setFocusTarget(
          findTarget(
            focusSelector
          )
        );
      }


      updateTarget();


      const observer =
        new MutationObserver(
          () => {
            if (
              frameId !==
              null
            ) {
              window.cancelAnimationFrame(
                frameId
              );
            }


            frameId =
              window.requestAnimationFrame(
                updateTarget
              );
          }
        );


      observer.observe(
        document.body,
        {
          childList:
            true,

          subtree:
            true,

          attributes:
            true,
        }
      );


      function handleViewportChange() {
        if (
          frameId !==
          null
        ) {
          window.cancelAnimationFrame(
            frameId
          );
        }


        frameId =
          window.requestAnimationFrame(
            updateTarget
          );
      }


      window.addEventListener(
        "resize",
        handleViewportChange
      );


      window.addEventListener(
        "scroll",
        handleViewportChange,
        true
      );


      const interval =
        window.setInterval(
          updateTarget,
          250
        );


      return () => {
        cancelled =
          true;


        observer.disconnect();


        window.clearInterval(
          interval
        );


        window.removeEventListener(
          "resize",
          handleViewportChange
        );


        window.removeEventListener(
          "scroll",
          handleViewportChange,
          true
        );


        if (
          frameId !==
          null
        ) {
          window.cancelAnimationFrame(
            frameId
          );
        }
      };
    },
    [
      active,
      currentStep?.id,
      currentStep?.selector,
      currentStep?.focusSelector,
      currentStep?.type,
      location.pathname,
    ]
  );


  // ====================================================
  // Measure Real Coachmark
  //
  // Do not rely on estimated height.
  // Chinese / English and mobile wrapping can produce
  // very different actual sizes.
  // ====================================================

  useEffect(
    () => {
      const element =
        coachmarkRef.current;


      if (
        !element
      ) {
        return;
      }


      function measure() {
        const rect =
          element
            .getBoundingClientRect();


        if (
          rect.width >
            0 &&
          rect.height >
            0
        ) {
          setCoachmarkSize({
            width:
              rect.width,

            height:
              rect.height,
          });
        }
      }


      measure();


      const observer =
        new ResizeObserver(
          measure
        );


      observer.observe(
        element
      );


      return () => {
        observer.disconnect();
      };
    },
    [
      currentStep?.id,
      target,
    ]
  );

  // ====================================================
  // Skip Onboarding
  //
  // Skip removes the temporary tutorial World through
  // OnboardingContext, then always returns the user to the
  // Worlds page so we never leave them on a deleted URL.
  // ====================================================

  async function handleSkipOnboarding() {
    await skipOnboarding();


    navigate(
      "/",
      {
        replace:
          true,
      }
    );
  }

  // ====================================================
  // Target Interaction
  // ====================================================

  function handleTargetInteraction(
    event
  ) {
    event.preventDefault();

    event.stopPropagation();


    if (
      !target?.element
    ) {
      return;
    }


    target.element.click();


    if (
      currentStep.advanceOn ===
      "external"
    ) {
      return;
    }


    if (
      currentStep.advanceOn ===
      "target-click"
    ) {
      window.setTimeout(
        () => {
          nextStep();
        },
        120
      );
    }
  }


  // ====================================================
  // Tooltip Position
  //
  // Mobile:
  // centered horizontally.
  //
  // Desktop / medium:
  // preserve the requested side where possible.
  //
  // When "right" cannot physically fit, keep the bubble
  // near the RIGHT side of the target instead of moving
  // it into the middle of the screen.
  // ====================================================

  const tooltipLayout =
  useMemo(
    () => {
      if (
        !target ||
        !focusTarget
      ) {
        return null;
      }


      const viewportWidth =
        window.innerWidth;


      const viewportHeight =
        window.innerHeight;


      const isMobile =
        viewportWidth <=
        MOBILE_BREAKPOINT;


      // ==================================================
      // Tooltip Width
      //
      // Mobile:
      // - centered
      // - never wider than the viewport
      // - do not unnecessarily stretch across the entire
      //   screen on larger phones
      //
      // Desktop:
      // - keep the compact desktop width
      // ==================================================

      const width =
        isMobile
          ? Math.min(
              MOBILE_TOOLTIP_MAX_WIDTH,
              viewportWidth -
                VIEWPORT_PADDING *
                  2
            )
          : Math.min(
              DESKTOP_TOOLTIP_WIDTH,
              viewportWidth -
                VIEWPORT_PADDING *
                  2
            );


      const height =
        coachmarkSize.height ||
        190;


      const requestedPlacement =
        currentStep?.placement ||
        "bottom";


      const targetCenterX =
        (
          target.left +
          target.right
        ) /
        2;


      const targetCenterY =
        (
          target.top +
          target.bottom
        ) /
        2;


      const availableRight =
        viewportWidth -
        target.right -
        VIEWPORT_PADDING;


      const availableLeft =
        target.left -
        VIEWPORT_PADDING;


      const availableBelow =
        viewportHeight -
        target.bottom -
        VIEWPORT_PADDING;


      const availableAbove =
        target.top -
        VIEWPORT_PADDING;


      let actualPlacement =
        requestedPlacement;


      let top =
        0;


      let left =
        0;


      // ==================================================
      // Mobile Position
      //
      // Mobile coach marks are centered horizontally.
      //
      // We only choose whether they should be above or
      // below the highlighted target.
      // ==================================================

      if (
        isMobile
      ) {
        left =
          (
            viewportWidth -
            width
          ) /
          2;


        /*
         * Prefer placing the bubble below the target.
         *
         * If there clearly is not enough space below,
         * move it above instead.
         */
        if (
          availableBelow >=
            height +
              TOOLTIP_GAP ||
          availableBelow >=
            availableAbove
        ) {
          actualPlacement =
            "bottom";


          top =
            target.bottom +
            TOOLTIP_GAP;
        } else {
          actualPlacement =
            "top";


          top =
            target.top -
            height -
            TOOLTIP_GAP;
        }
      }


      // ==================================================
      // Desktop / Medium Screen
      // Requested: Right
      // ==================================================

      else if (
        requestedPlacement ===
        "right"
      ) {
        if (
          availableRight >=
          width +
            TOOLTIP_GAP
        ) {
          /*
          * Preferred desktop / ultrawide layout.
          *
          * Instead of vertically centering the coach mark
          * against the target, align it closer to the target's
          * upper edge.
          *
          * This matches the corner-style arrow better.
          */
          actualPlacement =
            "right";


          left =
            target.right +
            TOOLTIP_GAP;


          top =
            target.top -
            4;
        } else if (
          availableBelow >=
          height +
            TOOLTIP_GAP
        ) {
          /*
          * No room directly to the right.
          *
          * Keep the coach mark aligned toward the target's
          * right edge rather than centering it.
          */
          actualPlacement =
            "bottom";


          left =
            target.right -
            width;


          top =
            target.bottom +
            TOOLTIP_GAP;
        } else if (
          availableAbove >=
          height +
            TOOLTIP_GAP
        ) {
          actualPlacement =
            "top";


          left =
            target.right -
            width;


          top =
            target.top -
            height -
            TOOLTIP_GAP;
        } else {
          actualPlacement =
            "left";


          left =
            target.left -
            width -
            TOOLTIP_GAP;


          top =
            target.top -
            4;
        }
      }


      // ==================================================
      // Desktop / Medium Screen
      // Requested: Left
      // ==================================================

      else if (
        requestedPlacement ===
        "left"
      ) {
        if (
          availableLeft >=
          width +
            TOOLTIP_GAP
        ) {
          actualPlacement =
            "left";


          left =
            target.left -
            width -
            TOOLTIP_GAP;


          top =
            target.top -
            18;
        } else if (
          availableBelow >=
          height +
            TOOLTIP_GAP
        ) {
          actualPlacement =
            "bottom";


          left =
            target.left;


          top =
            target.bottom +
            TOOLTIP_GAP;
        } else if (
          availableAbove >=
          height +
            TOOLTIP_GAP
        ) {
          actualPlacement =
            "top";


          left =
            target.left;


          top =
            target.top -
            height -
            TOOLTIP_GAP;
        } else {
          actualPlacement =
            "right";


          left =
            target.right +
            TOOLTIP_GAP;


          top =
            target.top -
            4;
        }
      }


      // ==================================================
      // Desktop / Medium Screen
      // Requested: Top
      // ==================================================

      else if (
        requestedPlacement ===
        "top"
      ) {
        if (
          availableAbove >=
          height +
            TOOLTIP_GAP
        ) {
          actualPlacement =
            "top";


          left =
            targetCenterX -
            width /
              2;


          top =
            target.top -
            height -
            TOOLTIP_GAP;
        } else {
          actualPlacement =
            "bottom";


          left =
            targetCenterX -
            width /
              2;


          top =
            target.bottom +
            TOOLTIP_GAP;
        }
      }


      // ==================================================
      // Desktop / Medium Screen
      // Requested: Bottom
      // ==================================================

      else {
        if (
          availableBelow >=
          height +
            TOOLTIP_GAP
        ) {
          actualPlacement =
            "bottom";


          left =
            targetCenterX -
            width /
              2;


          top =
            target.bottom +
            TOOLTIP_GAP;
        } else {
          actualPlacement =
            "top";


          left =
            targetCenterX -
            width /
              2;


          top =
            target.top -
            height -
            TOOLTIP_GAP;
        }
      }


      // ==================================================
      // Per-Step Fine Tuning
      // ==================================================

      top +=
        currentStep?.offsetY ||
        0;


      left +=
        currentStep?.offsetX ||
        0;


      // ==================================================
      // Keep Coach Mark Inside Viewport
      // ==================================================

      left =
        clamp(
          left,
          VIEWPORT_PADDING,
          Math.max(
            VIEWPORT_PADDING,
            viewportWidth -
              width -
              VIEWPORT_PADDING
          )
        );


      top =
        clamp(
          top,
          VIEWPORT_PADDING,
          Math.max(
            VIEWPORT_PADDING,
            viewportHeight -
              height -
              VIEWPORT_PADDING
          )
        );


      // ==================================================
      // Style
      // ==================================================

      const style = {
        top:
          `${top}px`,

        left:
          `${left}px`,

        width:
          `${width}px`,
      };


      // ==================================================
      // Dynamic Arrow Position
      //
      // Design rule:
      //
      // Mobile:
      // - horizontal arrow always stays near LEFT corner
      // - avoids awkward center / far-right arrows
      //
      // Desktop:
      // - arrows prefer corners
      // - right-aligned fallback -> upper-right
      // - left-aligned fallback -> upper-left
      // - otherwise use the nearest side of the target
      // ==================================================

      if (
          actualPlacement ===
            "top" ||
          actualPlacement ===
            "bottom"
        ) {
          let arrowX;


          /*
          * Determine where the highlighted target sits
          * relative to the final coach mark.
          *
          * We deliberately snap the arrow to a corner-like
          * position instead of placing it exactly in the
          * middle.
          */
          const bubbleCenterX =
            left +
            width /
              2;


          const targetIsOnRight =
            targetCenterX >=
            bubbleCenterX;


          if (
            isMobile
          ) {
            /*
            * Mobile:
            *
            * The coach mark itself stays centered, but the
            * arrow chooses the nearest corner:
            *
            * target on left  -> upper-left / lower-left
            * target on right -> upper-right / lower-right
            *
            * This fixes steps such as:
            *
            * - Confirm Create World
            * - Create Entity Type
            *
            * where the highlighted button sits on the right
            * side of the mobile screen.
            */
            arrowX =
              targetIsOnRight
                ? width - 30
                : 30;
          } else if (
            requestedPlacement ===
            "right"
          ) {
            arrowX =
              width -
              30;
          } else if (
            requestedPlacement ===
            "left"
          ) {
            arrowX =
              30;
          } else {
            /*
            * Desktop top / bottom placement:
            *
            * Also prefer a corner rather than the exact
            * center of the coach mark.
            */
            arrowX =
              targetIsOnRight
                ? width - 30
                : 30;
          }


          style[
            "--onboarding-arrow-x"
          ] =
            `${clamp(
              arrowX,
              24,
              width -
                24
            )}px`;
        }


      if (
        actualPlacement ===
          "left" ||
        actualPlacement ===
          "right"
      ) {
        /*
        * Side arrows stay near the upper corner instead of
        * tracking the exact vertical center of the target.
        */
        const arrowY =
          30;


        style[
          "--onboarding-arrow-y"
        ] =
          `${clamp(
            arrowY,
            24,
            height -
              24
          )}px`;
      }


      return {
        style,

        placement:
          actualPlacement,
      };
    },
    [
      target,
      focusTarget,
      coachmarkSize.height,
      currentStep?.placement,
      currentStep?.offsetX,
      currentStep?.offsetY,
    ]
  );


  // ====================================================
  // Inactive
  // ====================================================

  if (
    !active ||
    !currentStep
  ) {
    return null;
  }


  // ====================================================
  // Welcome
  // ====================================================

  if (
    currentStep.type ===
    "welcome"
  ) {
    return createPortal(
      <div className="onboarding-root">
        <div className="onboarding-welcome-backdrop" />

        <button
          type="button"
          className="onboarding-skip-button"
          disabled={
            skipping
          }
          onClick={
            handleSkipOnboarding
          }
        >
          {t(
            "onboarding.skip"
          )}
        </button>

        <div className="onboarding-welcome-card">
          <div className="onboarding-beta-badge">
            BETA
          </div>

          <h1>
            {t(
              currentStep.titleKey
            )}
          </h1>

          <p>
            {t(
              currentStep.descriptionKey
            )}
          </p>

          <div className="onboarding-welcome-actions">
            <button
              type="button"
              className="onboarding-primary-button"
              onClick={
                nextStep
              }
            >
              {t(
                "onboarding.start"
              )}
            </button>
          </div>
        </div>
      </div>,

      document.body
    );
  }


  // ====================================================
  // Waiting
  // ====================================================

  if (
    !target ||
    !focusTarget
  ) {
    return createPortal(
      <div className="onboarding-root">
        <div className="onboarding-welcome-backdrop" />

        <div className="onboarding-top-controls">
          <span className="onboarding-step-counter">
            {t(
              "onboarding.stepCounter",
              {
                current:
                  stepIndex +
                  1,

                total:
                  steps.length,
              }
            )}
          </span>

          <button
            type="button"
            className="onboarding-skip-button onboarding-skip-inline"
            disabled={
              skipping
            }
            onClick={
              handleSkipOnboarding
            }
          >
            {t(
              "onboarding.skip"
            )}
          </button>
        </div>

        <div className="onboarding-loading-card">
          {t(
            "onboarding.findingTarget"
          )}
        </div>
      </div>,

      document.body
    );
  }


  const passthrough =
    currentStep.interactionMode ===
    "passthrough";


  // ====================================================
  // Spotlight
  // ====================================================

  return createPortal(
    <div className="onboarding-root">

      {/* Visual blockers */}

      <div
        className="onboarding-blocker"
        style={{
          top: 0,
          left: 0,
          right: 0,

          height:
            `${focusTarget.top}px`,
        }}
      />

      <div
        className="onboarding-blocker"
        style={{
          top:
            `${focusTarget.top}px`,

          left: 0,

          width:
            `${focusTarget.left}px`,

          height:
            `${focusTarget.height}px`,
        }}
      />

      <div
        className="onboarding-blocker"
        style={{
          top:
            `${focusTarget.top}px`,

          left:
            `${focusTarget.right}px`,

          right: 0,

          height:
            `${focusTarget.height}px`,
        }}
      />

      <div
        className="onboarding-blocker"
        style={{
          top:
            `${focusTarget.bottom}px`,

          left: 0,
          right: 0,
          bottom: 0,
        }}
      />


      {/* Interaction blockers */}

      <div
        className="onboarding-interaction-blocker"
        style={{
          top: 0,
          left: 0,
          right: 0,

          height:
            `${target.top}px`,
        }}
      />

      <div
        className="onboarding-interaction-blocker"
        style={{
          top:
            `${target.top}px`,

          left: 0,

          width:
            `${target.left}px`,

          height:
            `${target.height}px`,
        }}
      />

      <div
        className="onboarding-interaction-blocker"
        style={{
          top:
            `${target.top}px`,

          left:
            `${target.right}px`,

          right: 0,

          height:
            `${target.height}px`,
        }}
      />

      <div
        className="onboarding-interaction-blocker"
        style={{
          top:
            `${target.bottom}px`,

          left: 0,
          right: 0,
          bottom: 0,
        }}
      />


      <div
        className="onboarding-focus-area"
        style={{
          top:
            `${focusTarget.top}px`,

          left:
            `${focusTarget.left}px`,

          width:
            `${focusTarget.width}px`,

          height:
            `${focusTarget.height}px`,
        }}
      />


      <div
        className="onboarding-spotlight"
        style={{
          top:
            `${target.top}px`,

          left:
            `${target.left}px`,

          width:
            `${target.width}px`,

          height:
            `${target.height}px`,
        }}
      />


      {!passthrough && (
        <button
          type="button"
          className="onboarding-target-interaction"
          style={{
            top:
              `${target.top}px`,

            left:
              `${target.left}px`,

            width:
              `${target.width}px`,

            height:
              `${target.height}px`,
          }}
          onClick={
            handleTargetInteraction
          }
          aria-label={t(
            "onboarding.clickHighlighted"
          )}
        />
      )}


      <div className="onboarding-top-controls">
        <span className="onboarding-step-counter">
          {t(
            "onboarding.stepCounter",
            {
              current:
                stepIndex +
                1,

              total:
                steps.length,
            }
          )}
        </span>

        <button
          type="button"
          className="onboarding-skip-button onboarding-skip-inline"
          disabled={
            skipping
          }
          onClick={
            handleSkipOnboarding
          }
        >
          {t(
            "onboarding.skip"
          )}
        </button>
      </div>


      <div
        ref={
          coachmarkRef
        }
        className={`onboarding-coachmark onboarding-coachmark--${tooltipLayout?.placement || "bottom"}`}
        style={
          tooltipLayout?.style
        }
        onPointerDown={(
          event
        ) => {
          event.stopPropagation();
        }}
        onClick={(
          event
        ) => {
          event.stopPropagation();
        }}
      >
        <div className="onboarding-coachmark-eyebrow">
          {t(
            "onboarding.guide"
          )}
        </div>

        <h2>
          {t(
            currentStep.titleKey
          )}
        </h2>

        <p>
          {t(
            currentStep.descriptionKey
          )}
        </p>


        {!passthrough &&
          (
            currentStep.advanceOn ===
              "target-click" ||
            currentStep.advanceOn ===
              "external"
          ) && (
            <div className="onboarding-click-hint">
              {t(
                "onboarding.clickHighlighted"
              )}
            </div>
          )}


        {currentStep.advanceOn !==
          "target-click" &&
          currentStep.advanceOn !==
            "external" && (
            <div className="onboarding-coachmark-actions">
              <button
                type="button"
                className="onboarding-primary-button"
                onClick={(
                  event
                ) => {
                  event.preventDefault();

                  event.stopPropagation();

                  nextStep();
                }}
              >
                {t(
                  "onboarding.next"
                )}
              </button>
            </div>
          )}
      </div>
    </div>,

    document.body
  );
}