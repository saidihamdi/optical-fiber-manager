/**
 * 🔧 FIBER CONFIGURATION MODULE
 * Handles fiber status configuration with voice recognition
 */

window.FiberConfig = {
  currentProject: null,
  projectData: null,
  currentFiber: null,
  isVoiceActive: false,
  voiceRecognition: null,

  // ==================
  // INITIALIZATION
  // ==================

  async init(projectId) {
    console.log("🔧 Initializing fiber configuration for project:", projectId);

    try {
      // Load project data
      await this.loadProject(projectId);

      // Render the interface
      this.renderInterface();

      // Setup voice recognition
      this.setupVoiceRecognition();

      // Setup event listeners
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

    // Load Excel data
    const dataResponse = await window.API.excel.getData(projectId);
    this.projectData = dataResponse.data;

    console.log("📊 Project loaded:", this.currentProject.name);
    console.log("📊 Data loaded:", this.projectData);
  },

  // ==================
  // INTERFACE RENDERING
  // ==================

  renderInterface() {
    this.updateProjectHeader();
    this.renderTiroirs();
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
    document.getElementById("configure-total-fibers").textContent = this.currentProject.totalFibers || 0;
    document.getElementById("configure-configured-fibers").textContent = this.currentProject.configuredFibers || 0;

    const progress = this.calculateProgress();
    document.getElementById("configure-progress").textContent = `${progress}%`;
  },

  renderTiroirs() {
    const container = document.getElementById("configure-content");

    if (!this.projectData.tiroirs || Object.keys(this.projectData.tiroirs).length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>No Configuration Data</h3>
                    <p>Project data is not available. Please ensure the Excel file was processed correctly.</p>
                    <button class="btn-secondary" onclick="window.Navigation.showPage('projects')">
                        <i class="fas fa-arrow-left"></i> Back to Projects
                    </button>
                </div>
            `;
      return;
    }

    const tiroirKeys = Object.keys(this.projectData.tiroirs).sort();

    container.innerHTML = tiroirKeys
      .map((tiroirId) => {
        const tiroir = this.projectData.tiroirs[tiroirId];
        return this.renderTiroir(tiroirId, tiroir);
      })
      .join("");
  },

  renderTiroir(tiroirId, tiroir) {
    const tiroirStats = this.calculateTiroirStats(tiroir);

    return `
            <div class="tiroir-section" id="tiroir-${tiroirId}">
                <div class="tiroir-header">
                    <div class="tiroir-title">
                        <div class="tiroir-icon">
                            <i class="fas fa-server"></i>
                        </div>
                        <div>
                            <h2>Tiroir ${tiroirId}</h2>
                            <p class="tiroir-description">${tiroir.siteCode} - ${tiroirStats.totalFibers} fibers</p>
                        </div>
                    </div>
                    
                    <div class="tiroir-stats">
                        <div class="tiroir-stat">
                            <div class="tiroir-stat-number">${tiroirStats.totalFibers}</div>
                            <div class="tiroir-stat-label">Total</div>
                        </div>
                        <div class="tiroir-stat">
                            <div class="tiroir-stat-number">${tiroirStats.configuredFibers}</div>
                            <div class="tiroir-stat-label">Configured</div>
                        </div>
                        <div class="tiroir-stat">
                            <div class="tiroir-stat-number">${tiroirStats.progress}%</div>
                            <div class="tiroir-stat-label">Progress</div>
                        </div>
                    </div>
                </div>
                
                <div class="modules-grid">
                    ${this.renderModules(tiroir)}
                </div>
            </div>
        `;
  },

  renderModules(tiroir) {
    const modules = {};

    // Convert Sets to arrays before iteration
    const pboArray = Array.from(tiroir.pbos || []);
    const pbiArray = Array.from(tiroir.pbis || []);

    [...pboArray, ...pbiArray].forEach((endpointId) => {
      const endpoint = this.projectData.pbos[endpointId] || this.projectData.pbis[endpointId];
      if (endpoint) {
        const moduleId = endpoint.module;
        if (!modules[moduleId]) {
          modules[moduleId] = {
            id: moduleId,
            endpoints: [],
          };
        }
        modules[moduleId].endpoints.push(endpoint);
      }
    });

    return Object.keys(modules)
      .sort()
      .map((moduleId) => {
        return this.renderModule(moduleId, modules[moduleId]);
      })
      .join("");
  },

  renderModule(moduleId, module) {
    return `
            <div class="module-section" id="module-${moduleId}">
                <div class="module-header">
                    <div class="module-title">
                        <h3>Module ${moduleId}</h3>
                        <span class="module-type ${module.endpoints[0]?.type?.toLowerCase() || "pbo"}">${
      module.endpoints[0]?.type || "PBO"
    }</span>
                    </div>
                </div>
                
                ${module.endpoints.map((endpoint) => this.renderEndpoint(endpoint)).join("")}
            </div>
        `;
  },

  renderEndpoint(endpoint) {
    const fibers = Object.values(endpoint.fibers || {}).sort((a, b) => a.fiberNumber - b.fiberNumber);

    return `
            <div class="endpoint-section" id="endpoint-${endpoint.id}">
                <div class="endpoint-header">
                    <h4>${endpoint.type} ${endpoint.id}</h4>
                    <div class="distance-control">
                        <label>Distance:</label>
                        <input type="number" class="distance-input" value="${endpoint.distance || ""}" 
                               placeholder="meters" onchange="window.FiberConfig.updateDistance('${
                                 endpoint.id
                               }', this.value)">
                        <span>m</span>
                    </div>
                </div>
                
                <div class="fiber-grid">
                    ${fibers.map((fiber) => this.renderFiber(fiber)).join("")}
                </div>
            </div>
        `;
  },

  renderFiber(fiber) {
    const statusClass = fiber.newStatus || "not-configured";
    const currentClass = this.currentFiber && this.currentFiber.id === fiber.id ? "current" : "";

    return `
            <div class="fiber-port ${statusClass} ${currentClass}" 
                 id="fiber-${fiber.id}" 
                 data-fiber-id="${fiber.id}"
                 onclick="window.FiberConfig.selectFiber('${fiber.id}')"
                 title="Fiber ${fiber.fiberNumber} - ${this.getStatusLabel(statusClass)}">
                ${fiber.fiberNumber}
            </div>
        `;
  },

  // ==================
  // VOICE RECOGNITION
  // ==================

  setupVoiceRecognition() {
    if (!window.Voice || !window.Voice.isSupported) {
      console.warn("⚠️ Voice recognition not supported");
      return;
    }

    // Setup voice recognition for fiber configuration
    if (window.Voice.recognition) {
      window.Voice.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        console.log("🎤 Voice command:", transcript);

        if (transcript.includes("disponible")) {
          this.setCurrentFiberStatus("available");
          this.moveToNextFiber();
        } else if (transcript.includes("occupé")) {
          this.setCurrentFiberStatus("occupied");
          this.moveToNextFiber();
        }
      };

      window.Voice.recognition.onerror = (event) => {
        console.error("🎤 Voice recognition error:", event.error);
        this.stopVoiceRecognition();
      };

      window.Voice.recognition.onend = () => {
        if (this.isVoiceActive) {
          // Restart if we're still in voice mode
          setTimeout(() => {
            window.Voice.recognition.start();
          }, 100);
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

    // Update UI
    document.getElementById("voice-indicator").classList.add("listening");
    document.getElementById("voice-status-text").textContent = "Listening for commands...";
    document.getElementById("start-voice-btn").style.display = "none";
    document.getElementById("stop-voice-btn").style.display = "flex";

    window.Components.showToast("info", "Voice Active", "Say 'disponible' or 'occupé' to configure fibers");
  },

  stopVoiceRecognition() {
    this.isVoiceActive = false;
    window.Voice.stop();

    // Update UI
    document.getElementById("voice-indicator").classList.remove("listening");
    document.getElementById("voice-status-text").textContent = "Voice Recognition Ready";
    document.getElementById("start-voice-btn").style.display = "flex";
    document.getElementById("stop-voice-btn").style.display = "none";
  },

  // ==================
  // FIBER MANAGEMENT
  // ==================

  selectFiber(fiberId) {
    // Remove current class from previous fiber
    if (this.currentFiber) {
      const prevElement = document.getElementById(`fiber-${this.currentFiber.id}`);
      if (prevElement) {
        prevElement.classList.remove("current");
      }
    }

    // Find and set new current fiber
    this.currentFiber = this.findFiberById(fiberId);
    if (this.currentFiber) {
      const element = document.getElementById(`fiber-${fiberId}`);
      if (element) {
        element.classList.add("current");
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      console.log("🔍 Selected fiber:", this.currentFiber.fiberNumber);

      // Update voice status
      if (this.isVoiceActive) {
        document.getElementById(
          "voice-status-text"
        ).textContent = `Ready for Fiber ${this.currentFiber.fiberNumber} - Say "disponible" or "occupé"`;
      }
    }
  },

  setCurrentFiberStatus(status) {
    if (!this.currentFiber) return;

    const fiberId = this.currentFiber.id;
    const element = document.getElementById(`fiber-${fiberId}`);

    if (element) {
      // Remove old status classes
      element.classList.remove("not-configured", "available", "occupied");
      // Add new status class
      element.classList.add(status);

      // Update fiber data
      this.currentFiber.newStatus = status;

      // Update title
      element.title = `Fiber ${this.currentFiber.fiberNumber} - ${this.getStatusLabel(status)}`;

      console.log(`✅ Fiber ${this.currentFiber.fiberNumber} set to ${status}`);

      // Show feedback
      window.Components.showToast(
        "success",
        "Status Updated",
        `Fiber ${this.currentFiber.fiberNumber} set to ${this.getStatusLabel(status)}`
      );
    }

    // Update progress counters
    this.updateProgress();
  },

  moveToNextFiber() {
    if (!this.currentFiber) return;

    const allFibers = this.getAllFibers();
    const currentIndex = allFibers.findIndex((f) => f.id === this.currentFiber.id);

    if (currentIndex >= 0 && currentIndex < allFibers.length - 1) {
      const nextFiber = allFibers[currentIndex + 1];
      this.selectFiber(nextFiber.id);
    } else {
      // End of fibers
      window.Components.showToast("info", "Complete", "All fibers processed!");
      this.stopVoiceRecognition();
    }
  },

  updateDistance(endpointId, distance) {
    console.log(`📏 Setting distance for ${endpointId}: ${distance}m`);

    // Find endpoint in data
    const endpoint = this.projectData.pbos[endpointId] || this.projectData.pbis[endpointId];
    if (endpoint) {
      endpoint.distance = distance;
      window.Components.showToast(
        "success",
        "Distance Updated",
        `${endpoint.type} ${endpoint.id} distance set to ${distance}m`
      );
    }
  },

  // ==================
  // BULK ACTIONS
  // ==================

  async resetAll() {
    const confirmed = await this.showConfirmation(
      "Reset All Fibers",
      "Are you sure you want to reset all fiber statuses to not configured?"
    );

    if (confirmed) {
      const allFibers = this.getAllFibers();
      allFibers.forEach((fiber) => {
        fiber.newStatus = "not-configured";
        const element = document.getElementById(`fiber-${fiber.id}`);
        if (element) {
          element.className = "fiber-port not-configured";
          element.title = `Fiber ${fiber.fiberNumber} - Not Configured`;
        }
      });

      this.updateProgress();
      window.Components.showToast("success", "Reset Complete", "All fibers reset to not configured");
    }
  },

  async setAllAvailable() {
    const confirmed = await this.showConfirmation(
      "Set All Available",
      "Are you sure you want to set all fibers to available?"
    );

    if (confirmed) {
      const allFibers = this.getAllFibers();
      allFibers.forEach((fiber) => {
        fiber.newStatus = "available";
        const element = document.getElementById(`fiber-${fiber.id}`);
        if (element) {
          element.className = "fiber-port available";
          element.title = `Fiber ${fiber.fiberNumber} - Available`;
        }
      });

      this.updateProgress();
      window.Components.showToast("success", "Update Complete", "All fibers set to available");
    }
  },

  async setAllOccupied() {
    const confirmed = await this.showConfirmation(
      "Set All Occupied",
      "Are you sure you want to set all fibers to occupied?"
    );

    if (confirmed) {
      const allFibers = this.getAllFibers();
      allFibers.forEach((fiber) => {
        fiber.newStatus = "occupied";
        const element = document.getElementById(`fiber-${fiber.id}`);
        if (element) {
          element.className = "fiber-port occupied";
          element.title = `Fiber ${fiber.fiberNumber} - Occupied`;
        }
      });

      this.updateProgress();
      window.Components.showToast("success", "Update Complete", "All fibers set to occupied");
    }
  },

  async saveProgress() {
    try {
      console.log("💾 Saving fiber configuration progress...");

      // Collect all fiber statuses and distances
      const updates = {
        fibers: {},
        distances: {},
      };

      // Collect fiber statuses
      const allFibers = this.getAllFibers();
      allFibers.forEach((fiber) => {
        if (fiber.newStatus && fiber.newStatus !== "not-configured") {
          updates.fibers[fiber.id] = fiber.newStatus;
        }
      });

      // Collect distances
      Object.values(this.projectData.pbos || {}).forEach((pbo) => {
        if (pbo.distance) {
          updates.distances[pbo.id] = pbo.distance;
        }
      });
      Object.values(this.projectData.pbis || {}).forEach((pbi) => {
        if (pbi.distance) {
          updates.distances[pbi.id] = pbi.distance;
        }
      });

      // Update project status
      const configuredCount = Object.keys(updates.fibers).length;
      const progressPercentage = Math.round((configuredCount / allFibers.length) * 100);

      await window.API.projects.update(this.currentProject.id, {
        configuredFibers: configuredCount,
        status: progressPercentage > 0 ? "in-progress" : "excel-processed",
        fiberConfiguration: updates,
        updatedAt: new Date().toISOString(),
      });

      window.Components.showToast(
        "success",
        "Progress Saved",
        `${configuredCount} fiber configurations saved successfully`
      );

      console.log("✅ Progress saved successfully");
    } catch (error) {
      console.error("❌ Error saving progress:", error);
      window.Components.showToast("error", "Save Failed", "Failed to save configuration progress");
    }
  },

  // ==================
  // EVENT LISTENERS
  // ==================

  setupEventListeners() {
    // Voice control buttons
    document.getElementById("start-voice-btn").addEventListener("click", () => {
      this.startVoiceRecognition();
    });

    document.getElementById("stop-voice-btn").addEventListener("click", () => {
      this.stopVoiceRecognition();
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.stopVoiceRecognition();
      } else if (e.key === "Space" && this.currentFiber) {
        e.preventDefault();
        // Toggle fiber status
        const currentStatus = this.currentFiber.newStatus || "not-configured";
        const newStatus = currentStatus === "available" ? "occupied" : "available";
        this.setCurrentFiberStatus(newStatus);
      } else if (e.key === "ArrowRight" || e.key === "Tab") {
        e.preventDefault();
        this.moveToNextFiber();
      }
    });
  },

  // ==================
  // UTILITY METHODS
  // ==================

  findFiberById(fiberId) {
    const allFibers = this.getAllFibers();
    return allFibers.find((f) => f.id === fiberId);
  },

  getAllFibers() {
    const fibers = [];

    // Collect all fibers from PBOs and PBIs
    Object.values(this.projectData.pbos || {}).forEach((pbo) => {
      Object.values(pbo.fibers || {}).forEach((fiber) => fibers.push(fiber));
    });

    Object.values(this.projectData.pbis || {}).forEach((pbi) => {
      Object.values(pbi.fibers || {}).forEach((fiber) => fibers.push(fiber));
    });

    return fibers.sort((a, b) => {
      // Sort by tiroir, then module, then fiber number
      if (a.tiroir !== b.tiroir) return a.tiroir.localeCompare(b.tiroir);
      if (a.module !== b.module) return a.module.localeCompare(b.module);
      return a.fiberNumber - b.fiberNumber;
    });
  },

  calculateProgress() {
    const allFibers = this.getAllFibers();
    const configuredFibers = allFibers.filter((f) => f.newStatus && f.newStatus !== "not-configured");
    return allFibers.length > 0 ? Math.round((configuredFibers.length / allFibers.length) * 100) : 0;
  },

  calculateTiroirStats(tiroir) {
    const fibers = [];

    const pboArray = Array.from(tiroir.pbos || []);
    const pbiArray = Array.from(tiroir.pbis || []);

    [...pboArray, ...pbiArray].forEach((endpointId) => {
      const endpoint = this.projectData.pbos[endpointId] || this.projectData.pbis[endpointId];
      if (endpoint && endpoint.fibers) {
        Object.values(endpoint.fibers).forEach((fiber) => fibers.push(fiber));
      }
    });

    const configuredFibers = fibers.filter((f) => f.newStatus && f.newStatus !== "not-configured");
    const progress = fibers.length > 0 ? Math.round((configuredFibers.length / fibers.length) * 100) : 0;

    return {
      totalFibers: fibers.length,
      configuredFibers: configuredFibers.length,
      progress,
    };
  },

  updateProgress() {
    const progress = this.calculateProgress();
    document.getElementById("configure-progress").textContent = `${progress}%`;

    const configuredCount = this.getAllFibers().filter((f) => f.newStatus && f.newStatus !== "not-configured").length;
    document.getElementById("configure-configured-fibers").textContent = configuredCount;

    // Update tiroir progress
    Object.keys(this.projectData.tiroirs).forEach((tiroirId) => {
      const tiroir = this.projectData.tiroirs[tiroirId];
      const stats = this.calculateTiroirStats(tiroir);

      const statElements = document.querySelectorAll(`#tiroir-${tiroirId} .tiroir-stat-number`);
      if (statElements.length >= 2) {
        statElements[1].textContent = stats.configuredFibers;
        statElements[2].textContent = `${stats.progress}%`;
      }
    });
  },

  getStatusLabel(status) {
    const labels = {
      "not-configured": "Not Configured",
      available: "Available",
      occupied: "Occupied",
      draft: "Draft",
      "excel-uploaded": "File Uploaded",
      "excel-processed": "Data Processed",
      "in-progress": "In Progress",
      completed: "Completed",
    };
    return labels[status] || status;
  },

  async showConfirmation(title, message) {
    return new Promise((resolve) => {
      const modalContent = `
                <div class="confirmation-dialog">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="confirmation-actions">
                        <button class="btn-secondary" id="cancel-action">Cancel</button>
                        <button class="btn-primary" id="confirm-action">Confirm</button>
                    </div>
                </div>
                <style>
                .confirmation-dialog { text-align: center; padding: 1rem; }
                .confirmation-dialog h3 { margin-bottom: 1rem; color: var(--text-primary); }
                .confirmation-dialog p { margin-bottom: 2rem; color: var(--text-secondary); }
                .confirmation-actions { display: flex; gap: 1rem; justify-content: center; }
                </style>
            `;

      window.Components.showModal(title, modalContent);

      setTimeout(() => {
        document.getElementById("cancel-action").addEventListener("click", () => {
          window.Components.closeModal();
          resolve(false);
        });
        document.getElementById("confirm-action").addEventListener("click", () => {
          window.Components.closeModal();
          resolve(true);
        });
      }, 100);
    });
  },
};

console.log("🔧 Fiber Configuration module loaded successfully");
