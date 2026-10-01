import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import WorldsPage from "./pages/WorldsPage";
import WorldWorkspace from "./pages/WorldWorkspace";
import EntityTypesPage from "./pages/EntityTypesPage";

import "./App.css";

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

      </Routes>

    </BrowserRouter>
  );
}

export default App;