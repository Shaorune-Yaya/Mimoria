import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

const AuthContext =
  createContext(
    null
  );


// ======================================================
// Provider
// ======================================================

export function AuthProvider({
  children,
}) {
  const [
    user,
    setUser,
  ] =
    useState(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  // ====================================================
  // Refresh Session
  // ====================================================

  const refreshSession =
    useCallback(
      async () => {
        try {
          const data =
            await apiFetch(
              `${API_URL.auth}/me`
            );


          const nextUser =
            data?.user ||
            null;


          setUser(
            nextUser
          );


          return nextUser;
        } catch (
          error
        ) {
          if (
            error.status ===
            401
          ) {
            setUser(
              null
            );


            return null;
          }


          console.error(
            "Failed to refresh auth session:",
            error
          );


          setUser(
            null
          );


          return null;
        }
      },
      []
    );


  // ====================================================
  // Register
  // ====================================================

  const register =
    useCallback(
      async ({
        email,
        username,
        password,
        inviteCode,
        displayName,
      }) => {
        return apiFetch(
          `${API_URL.auth}/register`,
          {
            method:
              "POST",

            body: {
              email,
              username,
              password,
              inviteCode,

              ...(displayName
                ? {
                    displayName,
                  }
                : {}),
            },
          }
        );
      },
      []
    );


  // ====================================================
  // Verify Email
  // ====================================================

  const verifyEmail =
    useCallback(
      async ({
        email,
        code,
      }) => {
        const data =
          await apiFetch(
            `${API_URL.auth}/verify-email`,
            {
              method:
                "POST",

              body: {
                email,
                code,
              },
            }
          );


        if (
          data?.authenticated &&
          data?.user
        ) {
          setUser(
            data.user
          );
        }


        return data;
      },
      []
    );


  // ====================================================
  // Resend Verification
  // ====================================================

  const resendVerification =
    useCallback(
      async ({
        email,
      }) => {
        return apiFetch(
          `${API_URL.auth}/resend-verification`,
          {
            method:
              "POST",

            body: {
              email,
            },
          }
        );
      },
      []
    );


  // ====================================================
// Forgot Password
// ====================================================

const requestPasswordReset =
  useCallback(
    async ({
      email,
    }) => {
      return apiFetch(
        `${API_URL.auth}/forgot-password`,
        {
          method:
            "POST",

          body: {
            email,
          },
        }
      );
    },
    []
  );


// ====================================================
// Reset Password
// ====================================================

const resetPassword =
  useCallback(
    async ({
      email,
      code,
      newPassword,
    }) => {
      return apiFetch(
        `${API_URL.auth}/reset-password`,
        {
          method:
            "POST",

          body: {
            email,
            code,
            newPassword,
          },
        }
      );
    },
    []
  );


  // ====================================================
  // Change Password
  // ====================================================

  const changePassword =
    useCallback(
      async ({
        currentPassword,
        newPassword,
      }) => {
        return apiFetch(
          `${API_URL.auth}/change-password`,
          {
            method:
              "POST",

            body: {
              currentPassword,
              newPassword,
            },
          }
        );
      },
      []
    );


  // ====================================================
  // Login
  // ====================================================

  const login =
    useCallback(
      async ({
        identifier,
        password,
      }) => {
        const data =
          await apiFetch(
            `${API_URL.auth}/login`,
            {
              method:
                "POST",

              body: {
                identifier,
                password,
              },
            }
          );


        const loggedInUser =
          data?.user ||
          null;


        setUser(
          loggedInUser
        );


        return data;
      },
      []
    );


  // ====================================================
  // Logout
  // ====================================================

  const logout =
    useCallback(
      async () => {
        try {
          await apiFetch(
            `${API_URL.auth}/logout`,
            {
              method:
                "POST",
            }
          );
        } catch (
          error
        ) {
          console.error(
            "Logout request failed:",
            error
          );
        } finally {
          setUser(
            null
          );
        }
      },
      []
    );


  // ====================================================
  // Initial Session Check
  // ====================================================

  useEffect(
    () => {
      let active =
        true;


      async function initialize() {
        try {
          const data =
            await apiFetch(
              `${API_URL.auth}/me`
            );


          if (
            active
          ) {
            setUser(
              data?.user ||
              null
            );
          }
        } catch (
          error
        ) {
          if (
            active
          ) {
            setUser(
              null
            );
          }


          if (
            error.status !==
            401
          ) {
            console.error(
              "Initial auth check failed:",
              error
            );
          }
        } finally {
          if (
            active
          ) {
            setLoading(
              false
            );
          }
        }
      }


      initialize();


      return () => {
        active =
          false;
      };
    },
    []
  );


  // ====================================================
  // Context Value
  // ====================================================

  const value =
    useMemo(
      () => ({
        user,

        loading,

        authenticated:
          Boolean(
            user
          ),

        register,

        verifyEmail,

        resendVerification,

        login,

        logout,

        refreshSession,

        requestPasswordReset,

        resetPassword,

        changePassword,
      }),
      [
        user,
        loading,
        register,
        verifyEmail,
        resendVerification,
        login,
        logout,
        requestPasswordReset,
        resetPassword,
        changePassword,
        refreshSession,
      ]
    );


  return (
    <AuthContext.Provider
      value={
        value
      }
    >
      {children}
    </AuthContext.Provider>
  );
}


// ======================================================
// Hook
// ======================================================

export function useAuth() {
  const context =
    useContext(
      AuthContext
    );


  if (
    !context
  ) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }


  return context;
}