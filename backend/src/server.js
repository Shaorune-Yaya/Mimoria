const dns = require("dns");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

const worldRoutes = require(
  "./routes/worldRoutes"
);

const entityTypeRoutes = require(
  "./routes/entityTypeRoutes"
);

const entityRoutes = require(
  "./routes/entityRoutes"
);

const treeRoutes = require(
  "./routes/treeRoutes"
);

const documentRoutes = require(
  "./routes/documentRoutes"
);

const documentTreeRoutes = require(
  "./routes/documentTreeRoutes"
);

const relationRoutes = require(
  "./routes/relationRoutes"
);

const storySyncRoutes = require(
  "./routes/storySyncRoutes"
);


// Load environment variables before starting the application.
dotenv.config();


// Use public DNS servers for MongoDB Atlas SRV resolution.
dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);


const app =
  express();

const PORT =
  process.env.PORT ||
  3000;


// ======================================================
// Middleware
// ======================================================

app.use(
  cors()
);

app.use(
  express.json()
);


// ======================================================
// API Routes
// ======================================================

app.use(
  "/api/worlds",
  worldRoutes
);

app.use(
  "/api/entity-types",
  entityTypeRoutes
);

app.use(
  "/api/entities",
  entityRoutes
);

app.use(
  "/api/tree",
  treeRoutes
);

app.use(
  "/api/documents",
  documentRoutes
);

app.use(
  "/api/document-tree",
  documentTreeRoutes
);

app.use(
  "/api/relations",
  relationRoutes
);

app.use(
  "/api/story-sync",
  storySyncRoutes
);


// ======================================================
// Health Check
// ======================================================

app.get(
  "/api/health",
  (
    req,
    res
  ) => {
    res.json({
      status:
        "ok",

      application:
        "Mimoria",

      message:
        "Mimoria API is running",

      database:
        mongoose.connection
          .readyState ===
        1
          ? "connected"
          : "disconnected",
    });
  }
);


// ======================================================
// Server Startup
// ======================================================

async function startServer() {
  try {
    if (
      !process.env
        .MONGODB_URI
    ) {
      throw new Error(
        "MONGODB_URI is missing from the environment configuration"
      );
    }


    await mongoose.connect(
      process.env
        .MONGODB_URI
    );


    console.log(
      "MongoDB connected"
    );


    app.listen(
      PORT,
      () => {
        console.log(
          `Mimoria API running at http://localhost:${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      "Failed to start Mimoria API:"
    );

    console.error(
      error
    );


    process.exit(
      1
    );
  }
}


startServer();