console.log("🔍 Upload.js file is being loaded!");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const sanitizeFilename = require("sanitize-filename");

// DEBUG MIDDLEWARE - Add this FIRST
router.use((req, res, next) => {
  console.log(`🔍 UPLOAD MIDDLEWARE: ${req.method} ${req.path}`);
  console.log(`🔍 UPLOAD PARAMS:`, req.params);
  console.log(`🔍 UPLOAD BODY:`, Object.keys(req.body || {}));
  console.log(`🔍 UPLOAD FILES:`, req.files ? Object.keys(req.files) : "none");
  next();
});

// Your existing constants
const PROJECTS_DIR = path.join(__dirname, "../../../data/projects");
const UPLOADS_DIR = path.join(__dirname, "../../../data/uploads");

// Your existing multer configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    console.log(`📁 MULTER DESTINATION: Ensuring ${UPLOADS_DIR}`);
    await fs.ensureDir(UPLOADS_DIR);
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = sanitizeFilename(file.originalname);
    const fileName = `${timestamp}-${sanitized}`;
    console.log(`📝 MULTER FILENAME: ${fileName}`);
    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  console.log(`🔍 MULTER FILE FILTER: ${file.originalname}`);
  const allowedExtensions = [".xlsx", ".xls"];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(fileExtension)) {
    console.log(`✅ MULTER FILE ACCEPTED: ${file.originalname}`);
    cb(null, true);
  } else {
    console.log(`❌ MULTER FILE REJECTED: ${file.originalname}`);
    cb(new Error("Only Excel files (.xlsx, .xls) are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1,
  },
});

// DEBUG: Test route
router.get("/test", (req, res) => {
  console.log("🧪 Upload test route accessed");
  res.json({
    success: true,
    message: "Upload routes are working!",
    timestamp: new Date().toISOString(),
  });
});

// DEBUG: Test route with project ID
router.get("/:projectId/test", (req, res) => {
  const projectId = req.params.projectId;
  console.log(`🧪 Upload test route for project: ${projectId}`);
  res.json({
    success: true,
    message: `Upload routes working for project: ${projectId}`,
    projectId: projectId,
  });
});

// Your main upload route with additional debugging
// Replace your upload POST route in upload.js with this fixed version

router.post(
  "/:projectId",
  (req, res, next) => {
    console.log(`🔥 UPLOAD POST ROUTE HIT: ${req.params.projectId}`);
    console.log(`🔥 CONTENT-TYPE: ${req.get("Content-Type")}`);
    console.log(`🔥 CONTENT-LENGTH: ${req.get("Content-Length")}`);
    next();
  },
  upload.single("excelFile"),
  async (req, res) => {
    console.log(`📤 UPLOAD HANDLER EXECUTING for project: ${req.params.projectId}`);

    try {
      const projectId = req.params.projectId;
      console.log(`📝 Looking up project with ID: ${projectId}`);

      if (!req.file) {
        console.log(`❌ No file in request`);
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      console.log(`📄 File received: ${req.file.originalname} (${req.file.size} bytes)`);

      // Find project by ID in all project folders (same logic as projects.js)
      const projectFolders = await fs.readdir(PROJECTS_DIR);
      let foundProject = null;
      let projectPath = null;
      let jsonFile = null;

      for (const folder of projectFolders) {
        const folderPath = path.join(PROJECTS_DIR, folder);
        const stat = await fs.stat(folderPath);

        if (stat.isDirectory()) {
          const jsonFilePath = path.join(folderPath, `${folder}.json`);

          if (await fs.pathExists(jsonFilePath)) {
            const projectData = await fs.readJson(jsonFilePath);
            if (projectData.id === projectId) {
              foundProject = projectData;
              projectPath = folderPath;
              jsonFile = jsonFilePath;
              console.log(`✅ Found project: ${foundProject.name} in folder: ${folder}`);
              break;
            }
          }
        }
      }

      if (!foundProject) {
        console.log(`❌ Project not found with ID: ${projectId}`);
        // Clean up uploaded file
        await fs.remove(req.file.path);
        return res.status(404).json({
          success: false,
          error: "Project not found",
        });
      }

      console.log(`✅ Project found: ${foundProject.name}`);
      console.log(`📁 Project path: ${projectPath}`);
      console.log(`📄 JSON file: ${jsonFile}`);

      // Move file to project input folder
      const inputDir = path.join(projectPath, "input");
      await fs.ensureDir(inputDir);

      const finalPath = path.join(inputDir, req.file.originalname);
      await fs.move(req.file.path, finalPath);

      console.log(`📁 File moved to: ${finalPath}`);

      // Update project data
      foundProject.excelFile = {
        originalName: req.file.originalname,
        path: finalPath,
        size: req.file.size,
        uploadedAt: new Date().toISOString(),
      };
      foundProject.updatedAt = new Date().toISOString();
      foundProject.status = "excel-uploaded";

      await fs.writeJson(jsonFile, foundProject, { spaces: 2 });

      console.log(`📄 Excel file uploaded for project: ${foundProject.name}`);

      res.json({
        success: true,
        file: {
          originalName: req.file.originalname,
          size: req.file.size,
          uploadedAt: foundProject.excelFile.uploadedAt,
        },
        message: "Excel file uploaded successfully",
      });
    } catch (error) {
      console.error(`❌ UPLOAD ERROR:`, error);

      // Clean up uploaded file on error
      if (req.file && req.file.path) {
        await fs.remove(req.file.path).catch(() => {});
      }

      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          error: "File too large",
          message: "Maximum file size is 50MB",
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to upload file",
        message: error.message,
      });
    }
  }
);

// Replace your upload status and delete routes in upload.js with these fixed versions

// Get upload status
router.get("/:projectId/status", async (req, res) => {
  try {
    const projectId = req.params.projectId;

    // Find project by ID in all project folders
    const projectFolders = await fs.readdir(PROJECTS_DIR);
    let foundProject = null;

    for (const folder of projectFolders) {
      const folderPath = path.join(PROJECTS_DIR, folder);
      const stat = await fs.stat(folderPath);

      if (stat.isDirectory()) {
        const jsonFile = path.join(folderPath, `${folder}.json`);

        if (await fs.pathExists(jsonFile)) {
          const projectData = await fs.readJson(jsonFile);
          if (projectData.id === projectId) {
            foundProject = projectData;
            break;
          }
        }
      }
    }

    if (!foundProject) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    res.json({
      success: true,
      hasExcelFile: !!foundProject.excelFile,
      excelFile: foundProject.excelFile || null,
      status: foundProject.status,
    });
  } catch (error) {
    console.error("❌ Error checking upload status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check upload status",
      message: error.message,
    });
  }
});

// Delete uploaded file
router.delete("/:projectId/file", async (req, res) => {
  try {
    const projectId = req.params.projectId;

    // Find project by ID in all project folders
    const projectFolders = await fs.readdir(PROJECTS_DIR);
    let foundProject = null;
    let projectPath = null;
    let jsonFile = null;

    for (const folder of projectFolders) {
      const folderPath = path.join(PROJECTS_DIR, folder);
      const stat = await fs.stat(folderPath);

      if (stat.isDirectory()) {
        const jsonFilePath = path.join(folderPath, `${folder}.json`);

        if (await fs.pathExists(jsonFilePath)) {
          const projectData = await fs.readJson(jsonFilePath);
          if (projectData.id === projectId) {
            foundProject = projectData;
            projectPath = folderPath;
            jsonFile = jsonFilePath;
            break;
          }
        }
      }
    }

    if (!foundProject) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    if (foundProject.excelFile && foundProject.excelFile.path) {
      await fs.remove(foundProject.excelFile.path);
      foundProject.excelFile = null;
      foundProject.status = "draft";
      foundProject.updatedAt = new Date().toISOString();

      await fs.writeJson(jsonFile, foundProject, { spaces: 2 });
    }

    console.log(`🗑️  Excel file removed from project: ${foundProject.name}`);

    res.json({
      success: true,
      message: "Excel file removed successfully",
    });
  } catch (error) {
    console.error("❌ Error removing file:", error);
    res.status(500).json({
      success: false,
      error: "Failed to remove file",
      message: error.message,
    });
  }
});

console.log("🔍 About to export upload router, type:", typeof router);
console.log("🔍 Router stack length:", router.stack?.length || 0);

module.exports = router;
