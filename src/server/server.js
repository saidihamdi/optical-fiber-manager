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

    // API routes
    this.app.use("/api/projects", require("./routes/projects"));
    this.app.use("/api/upload", require("./routes/upload"));
    this.app.use("/api/excel", require("./routes/excel"));

    // Health check
    this.app.get("/api/health", (req, res) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        message: "🔥 Optical Fiber Manager is running!",
      });
    });

    // 404 handler
    this.app.use("*", (req, res) => {
      res.status(404).json({
        error: "Route not found",
        message: "The requested endpoint does not exist",
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
