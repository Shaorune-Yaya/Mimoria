import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import WorldsPage from "./pages/WorldsPage";
import WorldWorkspace from "./pages/WorldWorkspace";
import EntityTypesPage from "./pages/EntityTypesPage";
import EntityTypeEditor from "./pages/EntityTypeEditor";
import EntitiesPage from "./pages/EntitiesPage";
import DocumentsPage from "./pages/DocumentsPage";
import SmartImportPage from "./pages/SmartImportPage";
import LoginPage from "./pages/LoginPage";

import {
  AuthProvider,
} from "./auth/AuthContext";

import ProtectedRoute from "./auth/ProtectedRoute";

import "./styles/index.css";


function Protected({
  children,
}) {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <LoginPage />
            }
          />


          <Route
            path="/"
            element={
              <Protected>
                <WorldsPage />
              </Protected>
            }
          />


          <Route
            path="/world/:worldId"
            element={
              <Protected>
                <WorldWorkspace />
              </Protected>
            }
          />


          <Route
            path="/world/:worldId/entity-types"
            element={
              <Protected>
                <EntityTypesPage />
              </Protected>
            }
          />


          <Route
            path="/world/:worldId/entity-types/:entityTypeId"
            element={
              <Protected>
                <EntityTypeEditor />
              </Protected>
            }
          />


          <Route
            path="/world/:worldId/entities"
            element={
              <Protected>
                <EntitiesPage />
              </Protected>
            }
          />


          <Route
            path="/world/:worldId/documents"
            element={
              <Protected>
                <DocumentsPage />
              </Protected>
            }
          />


          <Route
            path="/world/:worldId/smart-import"
            element={
              <Protected>
                <SmartImportPage />
              </Protected>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}


export default App;