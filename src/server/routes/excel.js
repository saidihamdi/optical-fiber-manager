const express = require("express");
const router = express.Router();
const fs = require("fs-extra");
const path = require("path");
const XLSX = require("xlsx");
const sanitizeFilename = require("sanitize-filename");

const PROJECTS_DIR = path.join(__dirname, "../../../data/projects");

// Replace your excel routes in excel.js with these fixed versions

// Process Excel file and extract data
router.post("/:projectId/process", async (req, res) => {
  try {
    const projectId = req.params.projectId;
    console.log(`📊 Processing Excel file for project ID: ${projectId}`);

    // Find project by ID in all project folders (same logic as other routes)
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
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    if (!foundProject.excelFile || !foundProject.excelFile.path) {
      return res.status(400).json({
        success: false,
        error: "No Excel file found for this project",
      });
    }

    console.log(`📊 Processing Excel file: ${foundProject.excelFile.originalName}`);

    // Read Excel file
    const workbook = XLSX.readFile(foundProject.excelFile.path);
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];

    // Parse data starting from row 3
    const processedData = await parseExcelData(worksheet);

    // Update project with processed data
    foundProject.data = processedData.data;
    foundProject.progress = {
      totalFibers: processedData.stats.totalFibers,
      configuredFibers: 0,
      currentTiroir: null,
      currentModule: null,
      currentPBO: null,
    };
    foundProject.rawData = processedData.rawData;
    foundProject.status = "excel-processed";
    foundProject.updatedAt = new Date().toISOString();

    await fs.writeJson(jsonFile, foundProject, { spaces: 2 });

    console.log(`✅ Excel processing completed for project: ${foundProject.name}`);
    console.log(
      `📈 Stats: ${processedData.stats.totalFibers} fibers, ${processedData.stats.tiroirs} tiroirs, ${processedData.stats.pbos} PBOs`
    );

    res.json({
      success: true,
      data: processedData.data,
      stats: processedData.stats,
      message: "Excel file processed successfully",
    });
  } catch (error) {
    console.error("❌ Error processing Excel file:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process Excel file",
      message: error.message,
    });
  }
});

// Get processed data
router.get("/:projectId/data", async (req, res) => {
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
      data: foundProject.data || {},
      progress: foundProject.progress || {},
      stats: calculateStats(foundProject.data || {}),
    });
  } catch (error) {
    console.error("❌ Error fetching Excel data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch Excel data",
      message: error.message,
    });
  }
});

// Parse Excel data according to specifications
async function parseExcelData(worksheet) {
  const data = {
    tiroirs: {},
    pbos: {},
    pbis: {},
    fibers: {},
  };

  const rawData = [];
  let row = 3; // Start from row 3 as specified

  while (true) {
    const ccCell = worksheet[`CC${row}`];

    // Stop when CC column is empty
    if (!ccCell || !ccCell.v) {
      break;
    }

    const bpCell = worksheet[`BP${row}`];
    const cdCell = worksheet[`CD${row}`];
    const kCell = worksheet[`K${row}`];
    const mCell = worksheet[`M${row}`];

    if (bpCell && bpCell.v && cdCell && cdCell.v) {
      const rowData = {
        row: row,
        bp: bpCell.v.toString(),
        cc: ccCell.v.toString(),
        cd: cdCell.v.toString(),
        k: kCell ? kCell.v : "",
        m: mCell ? mCell.v : "",
      };

      rawData.push(rowData);
      processRowData(rowData, data);
    }

    row++;
  }

  const stats = calculateStats(data);

  return {
    data,
    rawData,
    stats,
  };
}

function processRowData(rowData, data) {
  const { bp, cc, cd, k, m, row } = rowData;

  // Parse BP (PBO/PBI)
  let pboId,
    isPBI = false;

  if (bp.startsWith("PBO-")) {
    // Extract ID after last dash
    const parts = bp.split("-");
    pboId = parts[parts.length - 1];
  } else if (bp.startsWith("BE-")) {
    // Use entire value as ID for BPI
    pboId = bp;
    isPBI = true;
  } else {
    return; // Skip unknown formats
  }

  // Parse CC (Module)
  const ccParts = cc.split("-");
  if (ccParts.length < 4) return;

  const siteCode = ccParts[0]; // B2, B3, etc.
  const tiroirId = ccParts[1]; // T1, T2, etc.
  const moduleId = ccParts[3]; // A, B, C, etc.

  // Initialize structures
  if (!data.tiroirs[tiroirId]) {
    data.tiroirs[tiroirId] = {
      id: tiroirId,
      siteCode: siteCode,
      modules: {},
      pbos: new Set(),
      pbis: new Set(),
    };
  }

  if (!data.tiroirs[tiroirId].modules[moduleId]) {
    data.tiroirs[tiroirId].modules[moduleId] = {
      id: moduleId,
      pbos: new Set(),
      pbis: new Set(),
      fibers: {},
    };
  }

  // Store PBO/PBI data
  const pboData = {
    id: pboId,
    type: isPBI ? "PBI" : "PBO",
    tiroir: tiroirId,
    module: moduleId,
    fibers: {},
    siteCode: siteCode,
  };

  if (isPBI) {
    data.pbis[pboId] = pboData;
    data.tiroirs[tiroirId].pbis.add(pboId);
    data.tiroirs[tiroirId].modules[moduleId].pbis.add(pboId);
  } else {
    data.pbos[pboId] = pboData;
    data.tiroirs[tiroirId].pbos.add(pboId);
    data.tiroirs[tiroirId].modules[moduleId].pbos.add(pboId);
  }

  // Store fiber data
  const fiberId = `${pboId}-${cd}`;
  const fiberData = {
    id: fiberId,
    pboId: pboId,
    fiberNumber: parseInt(cd),
    tiroir: tiroirId,
    module: moduleId,
    oldStatus: k,
    oldDistance: m,
    newStatus: "not-configured", // grey
    newDistance: null,
    excelRow: row,
  };

  data.fibers[fiberId] = fiberData;

  // Add to PBO/PBI
  if (isPBI) {
    data.pbis[pboId].fibers[cd] = fiberData;
    data.tiroirs[tiroirId].modules[moduleId].fibers[fiberId] = fiberData;
  } else {
    data.pbos[pboId].fibers[cd] = fiberData;
    data.tiroirs[tiroirId].modules[moduleId].fibers[fiberId] = fiberData;
  }
}

function calculateStats(data) {
  const totalFibers = Object.keys(data.fibers || {}).length;
  const tiroirs = Object.keys(data.tiroirs || {}).length;
  const pbos = Object.keys(data.pbos || {}).length;
  const pbis = Object.keys(data.pbis || {}).length;

  let configuredFibers = 0;
  Object.values(data.fibers || {}).forEach((fiber) => {
    if (fiber.newStatus !== "not-configured") {
      configuredFibers++;
    }
  });

  return {
    totalFibers,
    configuredFibers,
    tiroirs,
    pbos,
    pbis,
    progressPercentage: totalFibers > 0 ? Math.round((configuredFibers / totalFibers) * 100) : 0,
  };
}

module.exports = router;
