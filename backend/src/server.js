const dns =
  require(
    "dns"
  );

const express =
  require(
    "express"
  );

const cors =
  require(
    "cors"
  );

const cookieParser =
  require(
    "cookie-parser"
  );

const mongoose =
  require(
    "mongoose"
  );

const dotenv =
  require(
    "dotenv"
  );


// ======================================================
// Environment
// ======================================================

dotenv.config();


// ======================================================
// DNS
// ======================================================

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);


// ======================================================
// Routes
// ======================================================

const worldRoutes =
  require(
    "./routes/worldRoutes"
  );

const entityTypeRoutes =
  require(
    "./routes/entityTypeRoutes"
  );

const entityRoutes =
  require(
    "./routes/entityRoutes"
  );

const treeRoutes =
  require(
    "./routes/treeRoutes"
  );

const documentRoutes =
  require(
    "./routes/documentRoutes"
  );

const documentTreeRoutes =
  require(
    "./routes/documentTreeRoutes"
  );

const relationRoutes =
  require(
    "./routes/relationRoutes"
  );

const storySyncRoutes =
  require(
    "./routes/storySyncRoutes"
  );

const storySuggestionRoutes =
  require(
    "./routes/storySuggestionRoutes"
  );

const {
  router:
    authRoutes,
} = require(
  "./routes/authRoutes"
);


// ======================================================
// Application
// ======================================================

const app =
  express();


const PORT =
  process.env.PORT ||
  3000;


// ======================================================
// Middleware
// ======================================================

app.use(
  cors({
    origin:
      process.env
        .FRONTEND_ORIGIN ||
      "http://localhost:5173",

    credentials:
      true,
  })
);


app.use(
  express.json({
    limit:
      "2mb",
  })
);


app.use(
  cookieParser()
);


// ======================================================
// Authentication API
// ======================================================

app.use(
  "/api/auth",
  authRoutes
);


// ======================================================
// Existing API Routes
//
// These still use getDevUser() during the migration.
// They will be protected by requireAuth in a later step.
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


app.use(
  "/api/story-suggestions",
  storySuggestionRoutes
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


    if (
      !process.env
        .JWT_SECRET
    ) {
      throw new Error(
        "JWT_SECRET is missing from the environment configuration"
      );
    }


    if (
      !process.env
        .EMAIL_CODE_SECRET
    ) {
      throw new Error(
        "EMAIL_CODE_SECRET is missing from the environment configuration"
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

        console.log(
          `Email mode: ${process.env.EMAIL_MODE || "console"}`
        );
      }
    );
  } catch (
    error
  ) {
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