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

import "./styles/index.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<WorldsPage />}
        />

        <Route
          path="/world/:worldId"
          element={<WorldWorkspace />}
        />

        <Route
          path="/world/:worldId/entity-types"
          element={<EntityTypesPage />}
        />

        <Route
          path="/world/:worldId/entity-types/:entityTypeId"
          element={<EntityTypeEditor />}
        />

        <Route
          path="/world/:worldId/entities"
          element={<EntitiesPage />}
        />

        <Route
          path="/world/:worldId/documents"
          element={<DocumentsPage />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;