const express = require("express");
const router = express.Router();
const fs = require("fs-extra");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const sanitizeFilename = require("sanitize-filename");

const PROJECTS_DIR = path.join(__dirname, "../../../data/projects");

// Get all projects
router.get("/", async (req, res) => {
  try {
    const projects = [];
    const projectFolders = await fs.readdir(PROJECTS_DIR);

    for (const folder of projectFolders) {
      const projectPath = path.join(PROJECTS_DIR, folder);
      const stat = await fs.stat(projectPath);

      if (stat.isDirectory()) {
        const jsonFile = path.join(projectPath, `${folder}.json`);

        if (await fs.pathExists(jsonFile)) {
          const projectData = await fs.readJson(jsonFile);
          projects.push({
            id: projectData.id || folder,
            name: projectData.name || folder,
            reference: projectData.reference,
            createdAt: projectData.createdAt || stat.birthtime,
            updatedAt: projectData.updatedAt || stat.mtime,
            status: projectData.status || "draft",
            excelFile: projectData.excelFile,
            totalFibers: projectData.totalFibers || 0,
            configuredFibers: projectData.configuredFibers || 0,
          });
        }
      }
    }

    // Sort by most recent first
    projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({
      success: true,
      projects,
      count: projects.length,
    });
  } catch (error) {
    console.error("❌ Error fetching projects:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch projects",
      message: error.message,
    });
  }
});

// Get specific project
router.get("/:id", async (req, res) => {
  try {
    const projectId = req.params.id;
    console.log(`🔍 Looking for project with ID: ${projectId}`);

    // Find project by ID in all project folders
    const projectFolders = await fs.readdir(PROJECTS_DIR);
    let foundProject = null;
    let projectPath = null;

    for (const folder of projectFolders) {
      const folderPath = path.join(PROJECTS_DIR, folder);
      const stat = await fs.stat(folderPath);

      if (stat.isDirectory()) {
        const jsonFile = path.join(folderPath, `${folder}.json`);

        if (await fs.pathExists(jsonFile)) {
          const projectData = await fs.readJson(jsonFile);
          if (projectData.id === projectId) {
            foundProject = projectData;
            projectPath = folderPath;
            break;
          }
        }
      }
    }

    if (!foundProject) {
      console.log(`❌ Project not found: ${projectId}`);
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    console.log(`✅ Found project: ${foundProject.name}`);
    res.json({
      success: true,
      project: foundProject,
    });
  } catch (error) {
    console.error("❌ Error fetching project:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch project",
      message: error.message,
    });
  }
});

// Create new project
router.post("/", async (req, res) => {
  try {
    const { reference, name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Project name is required",
      });
    }

    const projectId = uuidv4();
    const sanitizedName = sanitizeFilename(name);
    const projectPath = path.join(PROJECTS_DIR, sanitizedName);

    // Check if project folder already exists
    if (await fs.pathExists(projectPath)) {
      return res.status(409).json({
        success: false,
        error: "Project with this name already exists",
      });
    }

    // Create project structure
    await fs.ensureDir(projectPath);
    await fs.ensureDir(path.join(projectPath, "input"));

    const projectData = {
      id: projectId,
      name: sanitizedName,
      reference: reference || `PROJ-${Date.now()}`,
      description: description || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "draft",
      excelFile: null,
      data: {
        tiroirs: {},
        fibers: {},
        pbos: {},
        pbis: {},
      },
      progress: {
        totalFibers: 0,
        configuredFibers: 0,
        currentTiroir: null,
        currentModule: null,
        currentPBO: null,
      },
    };

    const jsonFile = path.join(projectPath, `${sanitizedName}.json`);
    await fs.writeJson(jsonFile, projectData, { spaces: 2 });

    console.log(`✅ Created new project: ${sanitizedName} with ID: ${projectId}`);

    res.status(201).json({
      success: true,
      project: projectData,
      message: "Project created successfully",
    });
  } catch (error) {
    console.error("❌ Error creating project:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create project",
      message: error.message,
    });
  }
});

// Update project
router.put("/:id", async (req, res) => {
  try {
    const projectId = req.params.id;
    console.log(`🔄 Updating project with ID: ${projectId}`);

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

    const updatedData = {
      ...foundProject,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeJson(jsonFile, updatedData, { spaces: 2 });

    console.log(`✅ Updated project: ${foundProject.name}`);

    res.json({
      success: true,
      project: updatedData,
      message: "Project updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating project:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update project",
      message: error.message,
    });
  }
});

// Delete project - FIXED VERSION
router.delete("/:id", async (req, res) => {
  try {
    const projectId = req.params.id;
    console.log(`🗑️ Deleting project with ID: ${projectId}`);

    // Find project by ID in all project folders
    const projectFolders = await fs.readdir(PROJECTS_DIR);
    let foundProject = null;
    let projectPath = null;

    for (const folder of projectFolders) {
      const folderPath = path.join(PROJECTS_DIR, folder);
      const stat = await fs.stat(folderPath);

      if (stat.isDirectory()) {
        const jsonFile = path.join(folderPath, `${folder}.json`);

        if (await fs.pathExists(jsonFile)) {
          const projectData = await fs.readJson(jsonFile);
          if (projectData.id === projectId) {
            foundProject = projectData;
            projectPath = folderPath;
            break;
          }
        }
      }
    }

    if (!foundProject) {
      console.log(`❌ Project not found for deletion: ${projectId}`);
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    // Delete the entire project folder
    await fs.remove(projectPath);

    console.log(`✅ Deleted project: ${foundProject.name} (${projectId})`);

    res.json({
      success: true,
      message: `Project "${foundProject.name}" deleted successfully`,
    });
  } catch (error) {
    console.error("❌ Error deleting project:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete project",
      message: error.message,
    });
  }
});

module.exports = router;
