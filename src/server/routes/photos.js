// Create this new file: src/server/routes/photos.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const sanitizeFilename = require("sanitize-filename");

const PROJECTS_DIR = path.join(__dirname, "../../../data/projects");
const PHOTOS_DIR = path.join(__dirname, "../../../data/photos");

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const projectId = req.params.projectId;
    const tiroirId = req.body.tiroirId;

    // Find project name by ID
    const projectFolders = await fs.readdir(PROJECTS_DIR);
    let projectName = null;

    for (const folder of projectFolders) {
      const jsonFile = path.join(PROJECTS_DIR, folder, `${folder}.json`);
      if (await fs.pathExists(jsonFile)) {
        const projectData = await fs.readJson(jsonFile);
        if (projectData.id === projectId) {
          projectName = folder;
          break;
        }
      }
    }

    if (!projectName) {
      return cb(new Error("Project not found"), null);
    }

    const photoDir = path.join(PHOTOS_DIR, projectName, `tiroir-${tiroirId}`);
    await fs.ensureDir(photoDir);
    cb(null, photoDir);
  },

  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = sanitizeFilename(file.originalname);
    const fileName = `${timestamp}-${sanitized}`;
    cb(null, fileName);
  },
});

const photoFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter: photoFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Max 5 files at once
  },
});

// Upload photos to tiroir
router.post("/:projectId", upload.single("photo"), async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const tiroirId = req.body.tiroirId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No photo uploaded",
      });
    }

    console.log(`📸 Photo uploaded for project ${projectId}, tiroir ${tiroirId}: ${req.file.filename}`);

    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      tiroirId: tiroirId,
    });
  } catch (error) {
    console.error("❌ Photo upload error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload photo",
      message: error.message,
    });
  }
});

// Serve photos statically
router.get("/:projectName/tiroir-:tiroirId/:filename", async (req, res) => {
  try {
    const { projectName, tiroirId, filename } = req.params;
    const photoPath = path.join(PHOTOS_DIR, projectName, `tiroir-${tiroirId}`, filename);

    if (await fs.pathExists(photoPath)) {
      res.sendFile(photoPath);
    } else {
      res.status(404).json({
        success: false,
        error: "Photo not found",
      });
    }
  } catch (error) {
    console.error("❌ Error serving photo:", error);
    res.status(500).json({
      success: false,
      error: "Failed to serve photo",
    });
  }
});

// Delete photo
router.delete("/:projectId/tiroir-:tiroirId/:filename", async (req, res) => {
  try {
    const { projectId, tiroirId, filename } = req.params;

    // Find project name
    const projectFolders = await fs.readdir(PROJECTS_DIR);
    let projectName = null;

    for (const folder of projectFolders) {
      const jsonFile = path.join(PROJECTS_DIR, folder, `${folder}.json`);
      if (await fs.pathExists(jsonFile)) {
        const projectData = await fs.readJson(jsonFile);
        if (projectData.id === projectId) {
          projectName = folder;
          break;
        }
      }
    }

    if (!projectName) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    const photoPath = path.join(PHOTOS_DIR, projectName, `tiroir-${tiroirId}`, filename);

    if (await fs.pathExists(photoPath)) {
      await fs.remove(photoPath);
      console.log(`🗑️ Photo deleted: ${filename}`);

      res.json({
        success: true,
        message: "Photo deleted successfully",
      });
    } else {
      res.status(404).json({
        success: false,
        error: "Photo not found",
      });
    }
  } catch (error) {
    console.error("❌ Error deleting photo:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete photo",
      message: error.message,
    });
  }
});

module.exports = router;
