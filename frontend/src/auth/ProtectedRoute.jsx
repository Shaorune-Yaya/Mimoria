import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  useAuth,
} from "./AuthContext";


export default function ProtectedRoute({
  children,
}) {
  const {
    authenticated,
    loading,
  } =
    useAuth();


  const location =
    useLocation();


  if (
    loading
  ) {
    return (
      <div className="app">
        <main className="main-content">
          <div className="empty-state">
            <p>
              Loading...
            </p>
          </div>
        </main>
      </div>
    );
  }


  if (
    !authenticated
  ) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    );
  }


  return children;
}