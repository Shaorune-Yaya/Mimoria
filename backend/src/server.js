const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "WorldForge API is running",
  });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`WorldForge API running at http://localhost:${PORT}`);
});