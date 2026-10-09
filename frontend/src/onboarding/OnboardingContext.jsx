import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import {
  API_URL,
} from "../config/api";

import {
  apiFetch,
} from "../utils/apiFetch";


// ======================================================
// Context
// ======================================================

const OnboardingContext =
  createContext(
    null
  );


// ======================================================
// Provider
// ======================================================

export function OnboardingProvider({
  children,
}) {
  // ====================================================
  // Tutorial World
  // ====================================================

  const [
    tutorialWorldId,
    setTutorialWorldIdState,
  ] =
    useState(
      () =>
        localStorage.getItem(
          "mimoria-onboarding-world-id"
        ) ||
        null
    );


  const setTutorialWorldId =
    useCallback(
      (
        worldId
      ) => {
        const normalized =
          worldId
            ? String(
                worldId
              )
            : null;


        setTutorialWorldIdState(
          normalized
        );


        if (
          normalized
        ) {
          localStorage.setItem(
            "mimoria-onboarding-world-id",
            normalized
          );
        } else {
          localStorage.removeItem(
            "mimoria-onboarding-world-id"
          );
        }
      },
      []
    );


  // ====================================================
  // Tutorial Entity Type
  // ====================================================

  const [
    tutorialEntityTypeId,
    setTutorialEntityTypeIdState,
  ] =
    useState(
      () =>
        localStorage.getItem(
          "mimoria-onboarding-entity-type-id"
        ) ||
        null
    );


  const setTutorialEntityTypeId =
    useCallback(
      (
        entityTypeId
      ) => {
        const normalized =
          entityTypeId
            ? String(
                entityTypeId
              )
            : null;


        setTutorialEntityTypeIdState(
          normalized
        );


        if (
          normalized
        ) {
          localStorage.setItem(
            "mimoria-onboarding-entity-type-id",
            normalized
          );
        } else {
          localStorage.removeItem(
            "mimoria-onboarding-entity-type-id"
          );
        }
      },
      []
    );


  // ====================================================
  // Tutorial Field
  // ====================================================

  const [
    tutorialFieldId,
    setTutorialFieldIdState,
  ] =
    useState(
      () =>
        localStorage.getItem(
          "mimoria-onboarding-field-id"
        ) ||
        null
    );


  const setTutorialFieldId =
    useCallback(
      (
        fieldId
      ) => {
        const normalized =
          fieldId
            ? String(
                fieldId
              )
            : null;


        setTutorialFieldIdState(
          normalized
        );


        if (
          normalized
        ) {
          localStorage.setItem(
            "mimoria-onboarding-field-id",
            normalized
          );
        } else {
          localStorage.removeItem(
            "mimoria-onboarding-field-id"
          );
        }
      },
      []
    );


  // ====================================================
  // Tutorial Entity
  // ====================================================

  const [
    tutorialEntityId,
    setTutorialEntityIdState,
  ] =
    useState(
      () =>
        localStorage.getItem(
          "mimoria-onboarding-entity-id"
        ) ||
        null
    );


  const setTutorialEntityId =
    useCallback(
      (
        entityId
      ) => {
        const normalized =
          entityId
            ? String(
                entityId
              )
            : null;


        setTutorialEntityIdState(
          normalized
        );


        if (
          normalized
        ) {
          localStorage.setItem(
            "mimoria-onboarding-entity-id",
            normalized
          );
        } else {
          localStorage.removeItem(
            "mimoria-onboarding-entity-id"
          );
        }
      },
      []
    );


  // ====================================================
  // Guide State
  // ====================================================

  const [
    active,
    setActive,
  ] =
    useState(
      false
    );


  const [
    stepIndex,
    setStepIndex,
  ] =
    useState(
      0
    );


  const [
    steps,
    setSteps,
  ] =
    useState(
      []
    );


  const [
    skipping,
    setSkipping,
  ] =
    useState(
      false
    );


  // ====================================================
  // Reset Guide State
  // ====================================================

  const resetGuideState =
    useCallback(
      () => {
        setActive(
          false
        );


        setStepIndex(
          0
        );


        setSteps(
          []
        );
      },
      []
    );


  // ====================================================
  // Start
  // ====================================================

  const startOnboarding =
    useCallback(
      (
        onboardingSteps,
        {
          startIndex =
            0,
        } = {}
      ) => {
        if (
          !Array.isArray(
            onboardingSteps
          ) ||
          onboardingSteps.length ===
            0
        ) {
          return;
        }


        const safeIndex =
          Math.min(
            Math.max(
              Number(
                startIndex
              ) ||
              0,
              0
            ),
            onboardingSteps.length -
              1
          );


        setSteps(
          onboardingSteps
        );


        setStepIndex(
          safeIndex
        );


        setActive(
          true
        );
      },
      []
    );


  // ====================================================
  // Stop
  //
  // This closes the guide only.
  //
  // It does NOT delete tutorial data.
  //
  // Use skipOnboarding when the user explicitly chooses
  // "Skip Guide".
  // ====================================================

  const stopOnboarding =
    useCallback(
      () => {
        resetGuideState();
      },
      [
        resetGuideState,
      ]
    );


  // ====================================================
  // Skip
  //
  // Explicitly skipping onboarding should remove the
  // temporary tutorial World.
  //
  // The backend World DELETE route is responsible for
  // removing the World and its related tutorial data.
  //
  // Local tutorial IDs are always cleared afterward.
  // ====================================================

  const skipOnboarding =
    useCallback(
      async () => {
        if (
          skipping
        ) {
          return;
        }


        const worldId =
          tutorialWorldId;


        try {
          setSkipping(
            true
          );


          /*
           * Hide onboarding immediately.
           *
           * The user should not remain trapped behind the
           * overlay while the cleanup request is running.
           */
          resetGuideState();


          if (
            worldId
          ) {
            try {
              await apiFetch(
                `${API_URL.worlds}/${worldId}`,
                {
                  method:
                    "DELETE",
                }
              );
            } catch (
              error
            ) {
              /*
               * A failed cleanup request should never keep
               * the user inside onboarding.
               *
               * Log the issue and continue clearing local
               * tutorial state.
               */
              console.error(
                "Failed to delete tutorial world while skipping onboarding:",
                error
              );
            }
          }
        } finally {
          /*
           * Always clear every tutorial reference.
           *
           * This prevents stale IDs from being reused if
           * the user later starts onboarding again.
           */
          setTutorialWorldId(
            null
          );


          setTutorialEntityTypeId(
            null
          );


          setTutorialFieldId(
            null
          );


          setTutorialEntityId(
            null
          );


          setSkipping(
            false
          );
        }
      },
      [
        skipping,
        tutorialWorldId,
        resetGuideState,
        setTutorialWorldId,
        setTutorialEntityTypeId,
        setTutorialFieldId,
        setTutorialEntityId,
      ]
    );


  // ====================================================
  // Next
  // ====================================================

  const nextStep =
    useCallback(
      () => {
        setStepIndex(
          (
            current
          ) => {
            const lastIndex =
              steps.length -
              1;


            if (
              current >=
              lastIndex
            ) {
              setActive(
                false
              );


              return current;
            }


            return current +
              1;
          }
        );
      },
      [
        steps.length,
      ]
    );


  // ====================================================
  // Previous
  // ====================================================

  const previousStep =
    useCallback(
      () => {
        setStepIndex(
          (
            current
          ) =>
            Math.max(
              0,
              current - 1
            )
        );
      },
      []
    );


  // ====================================================
  // Go To
  // ====================================================

  const goToStep =
    useCallback(
      (
        index
      ) => {
        if (
          !Number.isInteger(
            index
          ) ||
          index <
            0 ||
          index >=
            steps.length
        ) {
          return;
        }


        setStepIndex(
          index
        );
      },
      [
        steps.length,
      ]
    );


  // ====================================================
  // Value
  // ====================================================

  const value =
    useMemo(
      () => ({
        active,

        steps,

        stepIndex,

        currentStep:
          steps[
            stepIndex
          ] ||
          null,

        tutorialWorldId,

        setTutorialWorldId,

        tutorialEntityTypeId,

        setTutorialEntityTypeId,

        tutorialFieldId,

        setTutorialFieldId,

        tutorialEntityId,

        setTutorialEntityId,

        skipping,

        startOnboarding,

        stopOnboarding,

        skipOnboarding,

        nextStep,

        previousStep,

        goToStep,
      }),
      [
        active,
        steps,
        stepIndex,
        tutorialWorldId,
        setTutorialWorldId,
        tutorialEntityTypeId,
        setTutorialEntityTypeId,
        tutorialFieldId,
        setTutorialFieldId,
        tutorialEntityId,
        setTutorialEntityId,
        skipping,
        startOnboarding,
        stopOnboarding,
        skipOnboarding,
        nextStep,
        previousStep,
        goToStep,
      ]
    );


  return (
    <OnboardingContext.Provider
      value={
        value
      }
    >
      {children}
    </OnboardingContext.Provider>
  );
}


// ======================================================
// Hook
// ======================================================

export function useOnboarding() {
  const context =
    useContext(
      OnboardingContext
    );


  if (
    !context
  ) {
    throw new Error(
      "useOnboarding must be used inside OnboardingProvider."
    );
  }


  return context;
}