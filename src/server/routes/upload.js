const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const sanitizeFilename = require("sanitize-filename");

const PROJECTS_DIR = path.join(__dirname, "../../../data/projects");
const UPLOADS_DIR = path.join(__dirname, "../../../data/uploads");

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.ensureDir(UPLOADS_DIR);
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate safe filename with timestamp
    const timestamp = Date.now();
    const sanitized = sanitizeFilename(file.originalname);
    cb(null, `${timestamp}-${sanitized}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Only allow Excel files
  const allowedExtensions = [".xlsx", ".xls"];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
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

// Upload Excel file for project
router.post("/:projectId", upload.single("excelFile"), async (req, res) => {
  try {
    const projectId = sanitizeFilename(req.params.projectId);
    const projectPath = path.join(PROJECTS_DIR, projectId);
    const jsonFile = path.join(projectPath, `${projectId}.json`);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    // Verify project exists
    if (!(await fs.pathExists(jsonFile))) {
      // Clean up uploaded file
      await fs.remove(req.file.path);
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    // Move file to project input folder
    const inputDir = path.join(projectPath, "input");
    await fs.ensureDir(inputDir);

    const finalPath = path.join(inputDir, req.file.originalname);
    await fs.move(req.file.path, finalPath);

    // Update project data
    const projectData = await fs.readJson(jsonFile);
    projectData.excelFile = {
      originalName: req.file.originalname,
      path: finalPath,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
    };
    projectData.updatedAt = new Date().toISOString();
    projectData.status = "excel-uploaded";

    await fs.writeJson(jsonFile, projectData, { spaces: 2 });

    console.log(`📄 Excel file uploaded for project: ${projectId}`);

    res.json({
      success: true,
      file: {
        originalName: req.file.originalname,
        size: req.file.size,
        uploadedAt: projectData.excelFile.uploadedAt,
      },
      message: "Excel file uploaded successfully",
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      await fs.remove(req.file.path).catch(() => {});
    }

    console.error("❌ Error uploading file:", error);

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
});

// Get upload status
router.get("/:projectId/status", async (req, res) => {
  try {
    const projectId = sanitizeFilename(req.params.projectId);
    const projectPath = path.join(PROJECTS_DIR, projectId);
    const jsonFile = path.join(projectPath, `${projectId}.json`);

    if (!(await fs.pathExists(jsonFile))) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    const projectData = await fs.readJson(jsonFile);

    res.json({
      success: true,
      hasExcelFile: !!projectData.excelFile,
      excelFile: projectData.excelFile || null,
      status: projectData.status,
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
    const projectId = sanitizeFilename(req.params.projectId);
    const projectPath = path.join(PROJECTS_DIR, projectId);
    const jsonFile = path.join(projectPath, `${projectId}.json`);

    if (!(await fs.pathExists(jsonFile))) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    const projectData = await fs.readJson(jsonFile);

    if (projectData.excelFile && projectData.excelFile.path) {
      await fs.remove(projectData.excelFile.path);
      projectData.excelFile = null;
      projectData.status = "draft";
      projectData.updatedAt = new Date().toISOString();

      await fs.writeJson(jsonFile, projectData, { spaces: 2 });
    }

    console.log(`🗑️  Excel file removed from project: ${projectId}`);

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

module.exports = router;
