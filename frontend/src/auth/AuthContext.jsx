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


          setUser(
            data?.user ||
            null
          );


          return (
            data?.user ||
            null
          );
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

        login,

        logout,

        refreshSession,
      }),
      [
        user,
        loading,
        login,
        logout,
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