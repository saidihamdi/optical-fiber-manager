const express = require("express");
const path = require("path");
const fs = require("fs-extra");
const cors = require("cors");

class OpticalFiberServer {
  constructor() {
    this.app = express();
    this.port = 3000;
    this.setupMiddleware();
    this.setupRoutes();
    this.ensureDirectories();
  }

  setupMiddleware() {
    // NO SECURITY HEADERS FOR DEVELOPMENT
    this.app.use(cors());
    this.app.use(express.json({ limit: "50mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "50mb" }));
    this.app.use(express.static(path.join(__dirname, "../public")));
    this.app.use("/photos", express.static(path.join(__dirname, "../../data/photos")));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`📡 ${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Main route
    this.app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "../public/index.html"));
    });

    // Debug: Check if route files exist
    console.log("🔍 Checking route files...");

    const projectsPath = path.join(__dirname, "./routes/projects");
    const uploadPath = path.join(__dirname, "./routes/upload");
    const excelPath = path.join(__dirname, "./routes/excel");

    console.log("📁 Projects route path:", projectsPath);
    console.log("📁 Upload route path:", uploadPath);
    console.log("📁 Excel route path:", excelPath);

    // Check if files exist
    const fs = require("fs");
    console.log("📁 Projects file exists:", fs.existsSync(projectsPath + ".js"));
    console.log("📁 Upload file exists:", fs.existsSync(uploadPath + ".js"));
    console.log("📁 Excel file exists:", fs.existsSync(excelPath + ".js"));

    // Try to load routes with detailed error handling
    console.log("📁 Loading routes...");

    try {
      console.log("⏳ Loading projects routes...");
      const projectsRouter = require("./routes/projects");
      this.app.use("/api/projects", projectsRouter);
      console.log("✅ Projects routes loaded successfully");
    } catch (error) {
      console.error("❌ Error loading projects routes:", error.message);
      console.error("Stack:", error.stack);
    }

    try {
      console.log("⏳ Loading upload routes...");
      const uploadRouter = require("./routes/upload");
      console.log("📝 Upload router type:", typeof uploadRouter);
      console.log("📝 Upload router:", uploadRouter);
      this.app.use("/api/upload", uploadRouter);
      console.log("✅ Upload routes loaded successfully");
    } catch (error) {
      console.error("❌ Error loading upload routes:", error.message);
      console.error("Stack:", error.stack);
    }

    try {
      console.log("⏳ Loading excel routes...");
      const excelRouter = require("./routes/excel");
      this.app.use("/api/excel", excelRouter);
      console.log("✅ Excel routes loaded successfully");
    } catch (error) {
      console.error("❌ Error loading excel routes:", error.message);
      console.error("Stack:", error.stack);
    }

    try {
      console.log("⏳ Loading photos routes...");
      const photosRouter = require("./routes/photos");
      this.app.use("/api/photos", photosRouter);
      console.log("✅ Photos routes loaded successfully");
    } catch (error) {
      console.error("❌ Error loading photos routes:", error.message);
      console.error("Stack:", error.stack);
    }

    // Test route to verify server is working
    this.app.get("/api/test", (req, res) => {
      res.json({
        success: true,
        message: "Server is working",
        timestamp: new Date().toISOString(),
      });
    });

    // Health check
    this.app.get("/api/health", (req, res) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        message: "🔥 Optical Fiber Manager is running!",
      });
    });

    // List all registered routes (for debugging)
    this.app.get("/api/debug/routes", (req, res) => {
      const routes = [];
      this.app._router.stack.forEach((middleware) => {
        if (middleware.route) {
          routes.push({
            path: middleware.route.path,
            methods: Object.keys(middleware.route.methods),
          });
        } else if (middleware.name === "router") {
          middleware.handle.stack.forEach((handler) => {
            if (handler.route) {
              routes.push({
                path: handler.route.path,
                methods: Object.keys(handler.route.methods),
              });
            }
          });
        }
      });

      res.json({
        success: true,
        routes: routes,
      });
    });

    // 404 handler - MUST be after all routes
    this.app.use("*", (req, res) => {
      console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
      res.status(404).json({
        error: "Route not found",
        message: "The requested endpoint does not exist",
        path: req.originalUrl,
        method: req.method,
      });
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      console.error("❌ Server Error:", err);
      res.status(500).json({
        error: "Internal server error",
        message: err.message,
      });
    });
  }

  async ensureDirectories() {
    const directories = [
      path.join(__dirname, "../../data"),
      path.join(__dirname, "../../data/projects"),
      path.join(__dirname, "../../data/uploads"),
      path.join(__dirname, "../../data/photos"),
      path.join(__dirname, "../public"),
      path.join(__dirname, "../public/js"),
      path.join(__dirname, "../public/css"),
      path.join(__dirname, "../public/components"),
    ];

    try {
      for (const dir of directories) {
        await fs.ensureDir(dir);
      }
      console.log("📁 All required directories created successfully");
    } catch (error) {
      console.error("❌ Error creating directories:", error);
    }
  }

  async start() {
    try {
      const server = this.app.listen(this.port, () => {
        console.log("\n🚀 =====================================");
        console.log("🔥 OPTICAL FIBER MANAGER STARTED! 🔥");
        console.log("=====================================");
        console.log(`🌐 Server running at: http://localhost:${this.port}`);
        console.log(`📊 Health check: http://localhost:${this.port}/api/health`);
        console.log("🔧 Security: DISABLED for development");
        console.log("=====================================\n");
      });

      server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.log(`❌ Port ${this.port} is busy, trying ${this.port + 1}...`);
          this.port++;
          this.start();
        } else {
          console.error("❌ Server error:", err);
        }
      });

      process.on("SIGINT", () => {
        console.log("\n👋 Shutting down...");
        server.close(() => {
          console.log("✅ Server stopped");
          process.exit(0);
        });
      });
    } catch (error) {
      console.error("❌ Failed to start server:", error);
      process.exit(1);
    }
  }
}

const server = new OpticalFiberServer();
server.start();

module.exports = OpticalFiberServer;
