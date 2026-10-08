const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";


export const API_URL = {
  worlds:
    `${API_BASE_URL}/api/worlds`,

  entityTypes:
    `${API_BASE_URL}/api/entity-types`,

  entities:
    `${API_BASE_URL}/api/entities`,

  tree:
    `${API_BASE_URL}/api/tree`,

  documents:
    `${API_BASE_URL}/api/documents`,

  documentTree:
    `${API_BASE_URL}/api/document-tree`,

  relations:
    `${API_BASE_URL}/api/relations`,

  storySync:
    `${API_BASE_URL}/api/story-sync`,

  storySuggestions:
    `${API_BASE_URL}/api/story-suggestions`,

  health:
    `${API_BASE_URL}/api/health`,
};


export default API_BASE_URL;