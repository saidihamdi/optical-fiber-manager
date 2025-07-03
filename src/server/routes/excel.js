const express = require("express");
const router = express.Router();
const fs = require("fs-extra");
const path = require("path");
const XLSX = require("xlsx");
const sanitizeFilename = require("sanitize-filename");

const PROJECTS_DIR = path.join(__dirname, "../../../data/projects");

// Process Excel file and extract data
router.post("/:projectId/process", async (req, res) => {
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

    if (!projectData.excelFile || !projectData.excelFile.path) {
      return res.status(400).json({
        success: false,
        error: "No Excel file found for this project",
      });
    }

    console.log(`📊 Processing Excel file for project: ${projectId}`);

    // Read Excel file
    const workbook = XLSX.readFile(projectData.excelFile.path);
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];

    // Parse data starting from row 3
    const processedData = await parseExcelData(worksheet);

    // Update project with processed data
    projectData.data = processedData.data;
    projectData.progress = {
      totalFibers: processedData.stats.totalFibers,
      configuredFibers: 0,
      currentTiroir: null,
      currentModule: null,
      currentPBO: null,
    };
    projectData.rawData = processedData.rawData;
    projectData.status = "excel-processed";
    projectData.updatedAt = new Date().toISOString();

    await fs.writeJson(jsonFile, projectData, { spaces: 2 });

    console.log(`✅ Excel processing completed for project: ${projectId}`);
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
      data: projectData.data || {},
      progress: projectData.progress || {},
      stats: calculateStats(projectData.data || {}),
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
