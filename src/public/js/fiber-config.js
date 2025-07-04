/**
 * 🔧 MODIFIED FIBER CONFIGURATION MODULE
 * Now uses PBO/PBI headers instead of collapsible Tiroir/Module cards
 */

window.FiberConfig = {
  currentProject: null,
  projectData: null,
  currentFiber: null,
  isVoiceActive: false,
  pboData: {}, // New structure: grouped by BP values

  // ==================
  // INITIALIZATION
  // ==================

  async init(projectId) {
    console.log("🔧 Initializing fiber configuration for project:", projectId);

    try {
      await this.loadProject(projectId);
      this.processPBOData(); // New function to group by BP
      this.renderInterface();
      this.setupVoiceRecognition();
      this.setupEventListeners();
      console.log("✅ Fiber configuration initialized");
    } catch (error) {
      console.error("❌ Failed to initialize fiber configuration:", error);
      window.Components.showToast("error", "Error", "Failed to load project configuration");
    }
  },

  async loadProject(projectId) {
    // Load project details
    const projectResponse = await window.API.projects.get(projectId);
    this.currentProject = projectResponse.project;

    console.log("📊 Project loaded:", this.currentProject.name);
  },

  // ==================
  // NEW: PROCESS PBO DATA
  // ==================

  processPBOData() {
    console.log("🔄 Processing PBO/PBI data from rawData...");

    this.pboData = {};

    if (!this.currentProject.rawData || !Array.isArray(this.currentProject.rawData)) {
      console.warn("⚠️ No rawData found in project");
      return;
    }

    // Group fibers by BP (PBO/PBI) values
    this.currentProject.rawData.forEach((row, index) => {
      const bp = row.bp;
      const cd = row.cd; // fiber number

      if (!bp || bp === "NOT_SET" || !cd || cd === "NOT_SET") {
        return; // Skip invalid rows
      }

      // Initialize PBO/PBI if not exists
      if (!this.pboData[bp]) {
        this.pboData[bp] = {
          id: bp,
          type: bp.startsWith("PBO-") ? "PBO" : "PBI",
          tiroir: row.tiroir || "Unknown",
          module: row.module || "Unknown",
          siteCode: row.cc ? row.cc.split("-")[0] : "Unknown",
          fibers: {},
          totalFibers: 0,
        };
      }

      // Add fiber to this PBO/PBI
      const fiberId = `${bp}-${cd}`;
      this.pboData[bp].fibers[cd] = {
        id: fiberId,
        fiberNumber: parseInt(cd),
        bp: bp,
        oldStatus: row.k || "not-configured",
        oldDistance: row.m || 0,
        newStatus: "not-configured", // Default status
        excelRow: row.row || index + 3,
      };

      this.pboData[bp].totalFibers++;
    });

    console.log(`✅ Processed ${Object.keys(this.pboData).length} PBO/PBI units`);
  },

  // ==================
  // INTERFACE RENDERING
  // ==================

  renderInterface() {
    this.updateProjectHeader();
    this.renderStatesInterface();
  },

  updateProjectHeader() {
    // Update breadcrumb and title
    document.getElementById("project-name-breadcrumb").textContent = this.currentProject.name;
    document.getElementById("configure-project-name").textContent = this.currentProject.name;
    document.getElementById("configure-project-reference").textContent = this.currentProject.reference || "";

    // Update status badge
    const statusBadge = document.getElementById("configure-project-status");
    statusBadge.textContent = this.getStatusLabel(this.currentProject.status);
    statusBadge.className = `project-status-badge ${this.currentProject.status}`;

    // Update stats
    const totalFibers = this.calculateTotalFibers();
    const configuredFibers = this.getConfiguredFibersCount();
    const progress = totalFibers > 0 ? Math.round((configuredFibers / totalFibers) * 100) : 0;

    document.getElementById("configure-total-fibers").textContent = totalFibers;
    document.getElementById("configure-configured-fibers").textContent = configuredFibers;
    document.getElementById("configure-progress").textContent = `${progress}%`;
  },

  renderPBOList() {
    if (!this.pboData || Object.keys(this.pboData).length === 0) {
      return `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>No PBO/PBI Data</h3>
          <p>No fiber data available. Please ensure the Excel file was processed correctly.</p>
          <button class="btn-secondary" onclick="window.Navigation.showPage('projects')">
            <i class="fas fa-arrow-left"></i> Back to Projects
          </button>
        </div>
      `;
    }

    // Sort PBO/PBI by ID
    const sortedPBOs = Object.keys(this.pboData).sort();
    console.log(`🎨 Rendered ${sortedPBOs.length} PBO/PBI sections`);

    return sortedPBOs.map((pboId) => this.renderPBOSection(pboId, this.pboData[pboId])).join("");
  },

  renderPBOSection(pboId, pboInfo, isStatic = true) {
    const libreCount = this.getPBOLibreCount(pboId);
    const occupeeCount = this.getPBOOccupeeCount(pboId);
    const totalFibers = pboInfo.totalFibers;

    return `
      <div class="pbo-section ${isStatic ? "static" : "interactive"}" id="pbo-${pboId.replace(/[^a-zA-Z0-9]/g, "_")}">
        <div class="pbo-header">
          <div class="pbo-info">
            <div class="pbo-title">
              <span class="pbo-type-badge ${pboInfo.type.toLowerCase()}">${pboInfo.type}</span>
              <h3 class="pbo-id">${pboId}</h3>
            </div>
            <div class="pbo-meta">
              <span class="pbo-badges">
                <span class="meta-badge">${pboInfo.siteCode}</span>
                <span class="meta-badge">${pboInfo.tiroir}</span>
                <span class="meta-badge">Module ${pboInfo.module}</span>
              </span>
            </div>
          </div>
          
          <div class="pbo-stats">
            <div class="pbo-stat">
              <span class="stat-number">${totalFibers}</span>
              <span class="stat-label">Total Fibers</span>
            </div>
            <div class="pbo-stat">
              <span class="stat-number">${libreCount}</span>
              <span class="stat-label">Libre(s)</span>
            </div>
            <div class="pbo-stat">
              <span class="stat-number">${occupeeCount}</span>
              <span class="stat-label">Occupée(s)</span>
            </div>
              <div class="pbo-stat">
                <span class="stat-number">${totalFibers - libreCount - occupeeCount}</span>
                <span class="stat-label">NON<br>CONFIGURÉE(S)</span>
              </div>
          </div>

          ${
            !isStatic
              ? `
          <div class="pbo-actions">
            <button class="btn-voice-pbo" onclick="window.FiberConfig.startPBOVoice('${pboId}')">
              <i class="fas fa-microphone"></i> Voice
            </button>
            <button class="btn-clear-pbo" onclick="window.FiberConfig.clearPBO('${pboId}')">
              <i class="fas fa-eraser"></i> Clear
            </button>
          </div>
          `
              : ""
          }
        </div>
        
        <div class="fiber-grid-container">
          <div class="fiber-grid">
            ${this.renderPBOFibers(pboId, pboInfo, isStatic)}
          </div>
        </div>
      </div>
    `;
  },

  renderPBOFibers(pboId, pboInfo, isStatic = true) {
    const fiberNumbers = Object.keys(pboInfo.fibers)
      .map((num) => parseInt(num))
      .sort((a, b) => a - b);

    return fiberNumbers
      .map((fiberNum) => {
        const fiber = pboInfo.fibers[fiberNum];

        // For static display, use original Excel status
        let statusClass, displayStatus;
        if (isStatic) {
          // Map Excel K column values to display status
          switch (fiber.oldStatus?.toUpperCase()) {
            case "OK":
            case "NOK":
              statusClass = "excel-libre";
              displayStatus = "Libre";
              break;
            case "OCCUPE":
              statusClass = "excel-occupe";
              displayStatus = "Occupée";
              break;
            default:
              statusClass = "excel-unknown";
              displayStatus = "Unknown";
          }
        } else {
          // For interactive mode, use new status
          statusClass = fiber.newStatus || "not-configured";
          displayStatus = this.getStatusLabel(statusClass);
        }

        const isCurrentFiber = !isStatic && this.currentFiber && this.currentFiber.id === fiber.id;
        const clickHandler = isStatic ? "" : `onclick="window.FiberConfig.cycleFiberStatus('${fiber.id}')"`;
        const cursorClass = isStatic ? "static" : "interactive";

        return `
          <div class="fiber-item">
            <div class="fiber-port ${statusClass} ${isCurrentFiber ? "current" : ""} ${cursorClass}" 
                id="fiber-${fiber.id.replace(/[^a-zA-Z0-9]/g, "_")}" 
                data-fiber-id="${fiber.id}"
                ${clickHandler}
                title="Fiber ${fiberNum} - ${displayStatus}">
              ${fiberNum}
            </div>
            <div class="fiber-distance">${
              fiber.oldDistance === "NOT_SET" || !fiber.oldDistance ? "?" : fiber.oldDistance + " m"
            }</div>
          </div>
      `;
      })
      .join("");
  },

  // ==================
  // FIBER MANAGEMENT
  // ==================

  cycleFiberStatus(fiberId) {
    const fiber = this.findFiberById(fiberId);
    if (!fiber) return;

    const currentStatus = fiber.newStatus || "not-configured";
    let newStatus;

    // Cycle: not-configured → available → occupied → not-configured
    switch (currentStatus) {
      case "not-configured":
        newStatus = "available";
        break;
      case "available":
        newStatus = "occupied";
        break;
      case "occupied":
        newStatus = "not-configured";
        break;
      default:
        newStatus = "not-configured";
    }

    // Update fiber status
    fiber.newStatus = newStatus;

    // Update UI
    const element = document.getElementById(`fiber-${fiberId.replace(/[^a-zA-Z0-9]/g, "_")}`);
    if (element) {
      element.classList.remove("not-configured", "available", "occupied");
      element.classList.add(newStatus);
      element.title = `Fiber ${fiber.fiberNumber} - ${this.getStatusLabel(newStatus)}`;
    }

    // Update stats
    this.updatePBOStats(fiber.bp);
    this.updateProgress();

    console.log(`🔄 Fiber ${fiber.fiberNumber} status changed to: ${newStatus}`);
  },

  findFiberById(fiberId) {
    for (const pboId in this.pboData) {
      for (const fiberNum in this.pboData[pboId].fibers) {
        const fiber = this.pboData[pboId].fibers[fiberNum];
        if (fiber.id === fiberId) {
          return fiber;
        }
      }
    }
    return null;
  },

  // ==================
  // PBO ACTIONS
  // ==================

  startPBOVoice(pboId) {
    console.log(`🎤 Starting voice recognition for PBO: ${pboId}`);

    const pboInfo = this.pboData[pboId];
    if (!pboInfo) return;

    // Find first unconfigured fiber in this PBO
    const fiberNumbers = Object.keys(pboInfo.fibers)
      .map((num) => parseInt(num))
      .sort((a, b) => a - b);
    let firstUnconfigured = null;

    for (const fiberNum of fiberNumbers) {
      const fiber = pboInfo.fibers[fiberNum];
      if (fiber.newStatus === "not-configured") {
        firstUnconfigured = fiber;
        break;
      }
    }

    if (firstUnconfigured) {
      this.selectFiber(firstUnconfigured.id);
    }

    // Start voice recognition
    this.startVoiceRecognition();
    this.currentPBO = pboId;
  },

  clearPBO(pboId) {
    console.log(`🧹 Clearing all fibers in PBO: ${pboId}`);

    const pboInfo = this.pboData[pboId];
    if (!pboInfo) return;

    // Reset all fibers in this PBO
    for (const fiberNum in pboInfo.fibers) {
      const fiber = pboInfo.fibers[fiberNum];
      fiber.newStatus = "not-configured";

      const element = document.getElementById(`fiber-${fiber.id.replace(/[^a-zA-Z0-9]/g, "_")}`);
      if (element) {
        element.classList.remove("available", "occupied");
        element.classList.add("not-configured");
        element.title = `Fiber ${fiberNum} - Not Configured`;
      }
    }

    this.updatePBOStats(pboId);
    this.updateProgress();

    window.Components.showToast("success", "PBO Cleared", `All fibers in ${pboId} reset to not configured`);
  },

  // ==================
  // VOICE RECOGNITION
  // ==================

  setupVoiceRecognition() {
    if (!window.Voice || !window.Voice.isSupported) {
      console.warn("⚠️ Voice recognition not supported");
      return;
    }

    if (window.Voice.recognition) {
      window.Voice.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        console.log("🎤 Voice command:", transcript);

        if (transcript.includes("disponible")) {
          this.setCurrentFiberStatus("available");
          this.moveToNextFiberInPBO();
        } else if (transcript.includes("occupé")) {
          this.setCurrentFiberStatus("occupied");
          this.moveToNextFiberInPBO();
        }
      };
    }
  },

  startVoiceRecognition() {
    if (!window.Voice || !window.Voice.isSupported) {
      window.Components.showToast("warning", "Not Supported", "Voice recognition is not supported in this browser");
      return;
    }

    this.isVoiceActive = true;
    window.Voice.start();
    window.Components.showToast("info", "Voice Active", "Say 'disponible' or 'occupé' to configure fibers");
  },

  stopVoiceRecognition() {
    this.isVoiceActive = false;
    window.Voice.stop();
    this.currentPBO = null;
  },

  selectFiber(fiberId) {
    // Remove current class from previous fiber
    if (this.currentFiber) {
      const prevElement = document.getElementById(`fiber-${this.currentFiber.id.replace(/[^a-zA-Z0-9]/g, "_")}`);
      if (prevElement) {
        prevElement.classList.remove("current");
      }
    }

    // Set new current fiber
    this.currentFiber = this.findFiberById(fiberId);
    if (this.currentFiber) {
      const element = document.getElementById(`fiber-${fiberId.replace(/[^a-zA-Z0-9]/g, "_")}`);
      if (element) {
        element.classList.add("current");
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  },

  setCurrentFiberStatus(status) {
    if (!this.currentFiber) return;

    const fiberId = this.currentFiber.id;
    const element = document.getElementById(`fiber-${fiberId.replace(/[^a-zA-Z0-9]/g, "_")}`);

    if (element) {
      element.classList.remove("not-configured", "available", "occupied");
      element.classList.add(status);
      this.currentFiber.newStatus = status;
      element.title = `Fiber ${this.currentFiber.fiberNumber} - ${this.getStatusLabel(status)}`;
    }

    this.updatePBOStats(this.currentFiber.bp);
    this.updateProgress();
  },

  moveToNextFiberInPBO() {
    if (!this.currentFiber || !this.currentPBO) return;

    const pboInfo = this.pboData[this.currentPBO];
    const fiberNumbers = Object.keys(pboInfo.fibers)
      .map((num) => parseInt(num))
      .sort((a, b) => a - b);
    const currentIndex = fiberNumbers.indexOf(this.currentFiber.fiberNumber);

    if (currentIndex >= 0 && currentIndex < fiberNumbers.length - 1) {
      const nextFiberNum = fiberNumbers[currentIndex + 1];
      const nextFiber = pboInfo.fibers[nextFiberNum];
      this.selectFiber(nextFiber.id);
    } else {
      window.Components.showToast("info", "PBO Complete", `All fibers in ${this.currentPBO} processed!`);
      this.stopVoiceRecognition();
    }
  },

  // ==================
  // STATISTICS & UPDATES
  // ==================

  updateProgress() {
    const totalFibers = this.calculateTotalFibers();
    const configuredFibers = this.getConfiguredFibersCount();
    const progress = totalFibers > 0 ? Math.round((configuredFibers / totalFibers) * 100) : 0;

    document.getElementById("configure-total-fibers").textContent = totalFibers;
    document.getElementById("configure-configured-fibers").textContent = configuredFibers;
    document.getElementById("configure-progress").textContent = `${progress}%`;
  },

  updatePBOStats(pboId) {
    const configuredCount = this.getPBOConfiguredCount(pboId);
    const totalCount = this.pboData[pboId].totalFibers;
    const progress = totalCount > 0 ? Math.round((configuredCount / totalCount) * 100) : 0;

    // Update PBO stats in UI
    const pboElement = document.getElementById(`pbo-${pboId.replace(/[^a-zA-Z0-9]/g, "_")}`);
    if (pboElement) {
      const statElements = pboElement.querySelectorAll(".pbo-stat .stat-number");
      if (statElements.length >= 3) {
        statElements[1].textContent = configuredCount; // Configured count
        statElements[2].textContent = `${progress}%`; // Progress
      }
    }
  },

  // ==================
  // STATISTICS HELPERS FOR EXCEL DATA
  // ==================

  getPBOLibreCount(pboId) {
    const pboInfo = this.pboData[pboId];
    if (!pboInfo) return 0;

    let count = 0;
    for (const fiberNum in pboInfo.fibers) {
      const fiber = pboInfo.fibers[fiberNum];
      const status = fiber.oldStatus?.toUpperCase();
      if (status === "OK" || status === "NOK") {
        count++;
      }
    }
    return count;
  },

  getPBOOccupeeCount(pboId) {
    const pboInfo = this.pboData[pboId];
    if (!pboInfo) return 0;

    let count = 0;
    for (const fiberNum in pboInfo.fibers) {
      const fiber = pboInfo.fibers[fiberNum];
      const status = fiber.oldStatus?.toUpperCase();
      if (status === "OCCUPE") {
        count++;
      }
    }
    return count;
  },

  getTotalLibreCount() {
    let total = 0;
    for (const pboId in this.pboData) {
      total += this.getPBOLibreCount(pboId);
    }
    return total;
  },

  getTotalOccupeeCount() {
    let total = 0;
    for (const pboId in this.pboData) {
      total += this.getPBOOccupeeCount(pboId);
    }
    return total;
  },

  calculateTotalFibers() {
    let total = 0;
    for (const pboId in this.pboData) {
      total += this.pboData[pboId].totalFibers;
    }
    return total;
  },

  getConfiguredFibersCount() {
    let configured = 0;
    for (const pboId in this.pboData) {
      configured += this.getPBOConfiguredCount(pboId);
    }
    return configured;
  },

  getPBOConfiguredCount(pboId) {
    const pboInfo = this.pboData[pboId];
    if (!pboInfo) return 0;

    let count = 0;
    for (const fiberNum in pboInfo.fibers) {
      const fiber = pboInfo.fibers[fiberNum];
      if (fiber.newStatus !== "not-configured") {
        count++;
      }
    }
    return count;
  },

  // ==================
  // EVENT LISTENERS
  // ==================

  setupEventListeners() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.stopVoiceRecognition();
      } else if (e.key === "Space" && this.currentFiber) {
        e.preventDefault();
        const currentStatus = this.currentFiber.newStatus || "not-configured";
        const newStatus = currentStatus === "available" ? "occupied" : "available";
        this.setCurrentFiberStatus(newStatus);
      }
    });
  },

  // ==================
  // UTILITY METHODS
  // ==================

  getStatusLabel(status) {
    const labels = {
      "not-configured": "A Configurer",
      available: "Libre",
      occupied: "Occupée",
      draft: "Draft",
      "excel-uploaded": "File Uploaded",
      "excel-processed": "Data Processed",
      "in-progress": "In Progress",
      completed: "Completed",
    };
    return labels[status] || status;
  },

  async savePBOConfig() {
    try {
      console.log("💾 Saving PBO/PBI configuration...");

      // Build configuration from pboData
      const config = {};
      let totalConfigured = 0;
      let totalFibers = 0;

      for (const pboId in this.pboData) {
        const pboInfo = this.pboData[pboId];
        config[pboId] = {
          type: pboInfo.type,
          tiroir: pboInfo.tiroir,
          module: pboInfo.module,
          fibers: {},
        };

        for (const fiberNum in pboInfo.fibers) {
          const fiber = pboInfo.fibers[fiberNum];
          config[pboId].fibers[fiberNum] = fiber.newStatus;

          totalFibers++;
          if (fiber.newStatus !== "not-configured") {
            totalConfigured++;
          }
        }
      }

      // Update project
      await window.API.projects.update(this.currentProject.id, {
        pbo_config: config,
        configuredFibers: totalConfigured,
        totalFibers: totalFibers,
        status: totalConfigured > 0 ? "in-progress" : "excel-processed",
        updatedAt: new Date().toISOString(),
      });

      window.Components.showToast(
        "success",
        "Enregistré",
        `Configuration sauvegardée: ${totalConfigured} fibres configurées`
      );
    } catch (error) {
      console.error("❌ Error saving progress:", error);
      window.Components.showToast("error", "Erreur", "Échec de la sauvegarde");
    }
  },

  // Global actions
  async resetAll() {
    for (const pboId in this.pboData) {
      this.clearPBO(pboId);
    }
  },

  async setAllAvailable() {
    for (const pboId in this.pboData) {
      const pboInfo = this.pboData[pboId];
      for (const fiberNum in pboInfo.fibers) {
        const fiber = pboInfo.fibers[fiberNum];
        fiber.newStatus = "available";

        const element = document.getElementById(`fiber-${fiber.id.replace(/[^a-zA-Z0-9]/g, "_")}`);
        if (element) {
          element.classList.remove("not-configured", "occupied");
          element.classList.add("available");
        }
      }
      this.updatePBOStats(pboId);
    }
    this.updateProgress();
  },

  async setAllOccupied() {
    for (const pboId in this.pboData) {
      const pboInfo = this.pboData[pboId];
      for (const fiberNum in pboInfo.fibers) {
        const fiber = pboInfo.fibers[fiberNum];
        fiber.newStatus = "occupied";

        const element = document.getElementById(`fiber-${fiber.id.replace(/[^a-zA-Z0-9]/g, "_")}`);
        if (element) {
          element.classList.remove("not-configured", "available");
          element.classList.add("occupied");
        }
      }
      this.updatePBOStats(pboId);
    }
    this.updateProgress();
  },
  renderStatesInterface() {
    const container = document.getElementById("configure-content");

    container.innerHTML = `
      <div class="states-container">
        <!-- Etat Initial Section -->
        <div class="state-section" id="etat-initial-section">
          <div class="state-header" onclick="window.FiberConfig.toggleState('etat-initial')">
            <div class="state-title">
              <i class="fas fa-database state-icon"></i>
              <h2>Etat Initial</h2>
              <span class="state-count">(${Object.keys(this.pboData).length} PBO/PBI)</span>
            </div>
            <div class="state-stats">
              <span class="state-stat">
                <span class="stat-number">${this.calculateTotalFibers()}</span>
                <span class="stat-label">Total Fibers</span>
              </span>
              <span class="state-stat">
                <span class="stat-number">${this.getTotalLibreCount()}</span>
                <span class="stat-label">Libre(s)</span>
              </span>
              <span class="state-stat">
                <span class="stat-number">${this.getTotalOccupeeCount()}</span>
                <span class="stat-label">Occupée(s)</span>
              </span>
            </div>
            <div class="expand-arrow">
              <i class="fas fa-chevron-down"></i>
            </div>
          </div>
          
          <div class="state-content" id="etat-initial-content">
            <div class="pbo-list">
              ${this.renderPBOList()}
            </div>
          </div>
        </div>
  
        <!-- Etat ITE Technologies Section -->
        <div class="state-section" id="etat-ite-section">
          <div class="state-header" onclick="window.FiberConfig.toggleState('etat-ite')">
            <div class="state-title">
              <i class="fas fa-cogs state-icon"></i>
              <h2>Etat ITE Technologies</h2>
              <span class="state-count">(0 configurations)</span>
            </div>
            <div class="state-stats">
              <span class="state-stat">
                <span class="stat-number">0</span>
                <span class="stat-label">Configurations</span>
              </span>
              <span class="state-stat">
                <span class="stat-number">0%</span>
                <span class="stat-label">Progress</span>
              </span>
            </div>
            <div class="expand-arrow">
              <i class="fas fa-chevron-down"></i>
            </div>
          </div>
          
          <div class="state-content" id="etat-ite-content" style="display: none;">
            <div class="empty-ite-state">
              <i class="fas fa-tools"></i>
              <h3>Configuration ITE Technologies</h3>
              <p>Cette section sera utilisée pour les configurations spécifiques ITE Technologies.</p>
              <button class="btn-primary" onclick="window.FiberConfig.addITEConfiguration()">
                <i class="fas fa-plus"></i> Ajouter Configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    console.log("🎨 Rendered states interface");
  },

  toggleState(stateId) {
    const content = document.getElementById(`${stateId}-content`);
    const arrow = document.querySelector(`#${stateId}-section .expand-arrow i`);

    if (content.style.display === "none") {
      content.style.display = "block";
      arrow.classList.remove("fa-chevron-down");
      arrow.classList.add("fa-chevron-up");
    } else {
      content.style.display = "none";
      arrow.classList.remove("fa-chevron-up");
      arrow.classList.add("fa-chevron-down");
    }
  },

  addITEConfiguration() {
    window.Components.showToast("info", "Coming Soon", "ITE Technologies configuration will be available soon");
  },
};

console.log("🔧 Modified Fiber Configuration module loaded successfully");
