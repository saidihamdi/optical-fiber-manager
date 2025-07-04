/**
 * 🔧 FIBER CONFIGURATION MODULE
 * Handles fiber status configuration with voice recognition
 */

window.FiberConfig = {
  currentProject: null,
  projectData: null,
  currentFiber: null,
  isVoiceActive: false,
  currentModule: null,

  // ==================
  // INITIALIZATION
  // ==================

  async init(projectId) {
    console.log("🔧 Initializing fiber configuration for project:", projectId);

    try {
      await this.loadProject(projectId);
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

    // Load simplified tiroirs data from NEW API
    const tiroirResponse = await window.API.get(`/api/excel/${projectId}/tiroirs`);
    this.projectData = {
      tiroirs: {},
      fibers: {}, // Initialize fibers storage
    };

    // Convert array to object structure that the existing code expects
    if (tiroirResponse.tiroirs) {
      tiroirResponse.tiroirs.forEach((tiroir) => {
        this.projectData.tiroirs[tiroir.id] = {
          id: tiroir.id,
          name: tiroir.name,
          siteCode: tiroir.siteCode,
          modules: {},
        };

        // Add modules to the tiroir
        tiroir.modules.forEach((module) => {
          this.projectData.tiroirs[tiroir.id].modules[module.id] = {
            id: module.id,
            name: module.name,
            fibers: {}, // Will be generated on-the-fly as 24 fibers per module
          };
        });
      });
    }

    console.log("📊 Project loaded:", this.currentProject.name);
    console.log("📊 Tiroirs loaded from new API:", Object.keys(this.projectData.tiroirs));
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
    const totalFibers = this.calculateTotalFibers();
    const configuredFibers = this.getConfiguredFibersCount();
    const progress = totalFibers > 0 ? Math.round((configuredFibers / totalFibers) * 100) : 0;

    document.getElementById("configure-total-fibers").textContent = totalFibers;
    document.getElementById("configure-configured-fibers").textContent = configuredFibers;
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
    const tiroirStats = this.calculateTiroirStats(tiroirId);
    const photos = this.getTiroirPhotos(tiroirId);

    return `
      <div class="tiroir-card" id="tiroir-${tiroirId}">
        <div class="tiroir-header" onclick="window.FiberConfig.toggleTiroir('${tiroirId}')">
          <div class="tiroir-title">
            <div class="tiroir-icon">
              <i class="fas fa-server"></i>
            </div>
            <div class="tiroir-info">
              <h2>Tiroir ${tiroirId}</h2>
              <p class="tiroir-description">${tiroir.siteCode} - ${tiroirStats.totalFibers} fibers</p>
            </div>
          </div>
          
          <div class="tiroir-photos">
            ${photos
              .map(
                (photo) => `
              <div class="photo-thumbnail" onclick="event.stopPropagation(); window.FiberConfig.viewPhoto('${photo}', '${tiroirId}')">
                <img src="/photos/${this.currentProject.name}/tiroir-${tiroirId}/${photo}" alt="Photo">
              </div>
            `
              )
              .join("")}
            <button class="add-photo-btn" onclick="event.stopPropagation(); window.FiberConfig.addPhoto('${tiroirId}')" title="Ajouter photo">
              <i class="fas fa-camera-plus"></i>
            </button>
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
          
          <div class="expand-arrow">
            <i class="fas fa-chevron-down"></i>
          </div>
        </div>
        
        <div class="tiroir-content" id="tiroir-content-${tiroirId}" style="display: none;">
          ${this.renderModules(tiroir, tiroirId)}
        </div>
      </div>
    `;
  },

  getTiroirPhotos(tiroirId) {
    if (!this.currentProject.tiroir_cfg) return [];
    if (!this.currentProject.tiroir_cfg[tiroirId]) return [];
    return this.currentProject.tiroir_cfg[tiroirId].photos || [];
  },

  addPhoto(tiroirId) {
    console.log(`📸 Adding photo to Tiroir ${tiroirId}`);

    // Create file input
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;

    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      try {
        for (const file of files) {
          await this.uploadPhoto(tiroirId, file);
        }

        // Refresh tiroir display
        this.renderInterface();
        window.Components.showToast(
          "success",
          "Photos ajoutées",
          `${files.length} photo(s) ajoutée(s) au Tiroir ${tiroirId}`
        );
      } catch (error) {
        console.error("Error uploading photos:", error);
        window.Components.showToast("error", "Erreur", "Échec de l'upload des photos");
      }
    };

    input.click();
  },

  async uploadPhoto(tiroirId, file) {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("tiroirId", tiroirId);

    // Upload to backend
    const response = await fetch(`/api/photos/${this.currentProject.id}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const result = await response.json();

    // Update local project data
    if (!this.currentProject.tiroir_cfg) {
      this.currentProject.tiroir_cfg = {};
    }
    if (!this.currentProject.tiroir_cfg[tiroirId]) {
      this.currentProject.tiroir_cfg[tiroirId] = { photos: [], modules: {} };
    }
    if (!this.currentProject.tiroir_cfg[tiroirId].photos) {
      this.currentProject.tiroir_cfg[tiroirId].photos = [];
    }

    this.currentProject.tiroir_cfg[tiroirId].photos.push(result.filename);
  },

  viewPhoto(photoName, tiroirId) {
    // ADD tiroirId parameter
    const imageUrl = `/photos/${this.currentProject.name}/tiroir-${tiroirId}/${photoName}`;

    const modalContent = `
      <div class="photo-viewer">
        <img src="${imageUrl}" alt="Tiroir Photo" style="max-width: 100%; max-height: 80vh;">
        <div class="photo-actions">
          <button class="btn-secondary" onclick="window.Components.closeModal()">
            <i class="fas fa-times"></i> Fermer
          </button>
          <button class="btn-danger" onclick="window.FiberConfig.deletePhoto('${photoName}', '${tiroirId}')">
            <i class="fas fa-trash"></i> Supprimer
          </button>
        </div>
      </div>
    `;

    window.Components.showModal("Photo Tiroir", modalContent, { width: "80%" });
  },

  async deletePhoto(photoName) {
    // Implementation for photo deletion
    console.log(`🗑️ Deleting photo: ${photoName}`);
  },

  renderModules(tiroir, tiroirId) {
    const modules = tiroir.modules || {};

    return `
      <div class="modules-container">
        ${Object.keys(modules)
          .sort()
          .map((moduleId) => {
            const module = modules[moduleId];

            // Always create 24 fibers (1-24)
            const allFibers = [];
            for (let i = 1; i <= 24; i++) {
              allFibers.push({
                id: `${tiroirId}-${moduleId}-${i}`,
                fiberNumber: i,
                tiroir: tiroirId,
                module: moduleId,
                newStatus: "not-configured",
              });
            }

            const occupiedCount = this.getFiberCountByStatus(tiroirId, moduleId, "occupied");
            const availableCount = this.getFiberCountByStatus(tiroirId, moduleId, "available");
            const notConfiguredCount = this.getFiberCountByStatus(tiroirId, moduleId, "not-configured");

            return `
              <div class="module-card" id="module-${tiroirId}-${moduleId}">
                <div class="module-header" onclick="window.FiberConfig.toggleModule('${tiroirId}', '${moduleId}')">
                  <div class="module-title">
                    <div class="module-icon">
                      <i class="fas fa-th-large"></i>
                    </div>
                    <div class="module-info">
                      <h3>Module ${moduleId}</h3>
                      <p class="module-description">24 fibers</p>
                    </div>
                  </div>
                  
                  <div class="module-stats">
                    <div class="module-stat">
                      <span class="stat-number" style="color: #ef4444;">${occupiedCount}</span>
                      <span class="stat-label">Occupée</span>
                    </div>
                    <div class="module-stat">
                      <span class="stat-number" style="color: #22c55e;">${availableCount}</span>
                      <span class="stat-label">Libre</span>
                    </div>
                    <div class="module-stat">
                      <span class="stat-number" style="color: #6b7280;">${notConfiguredCount}</span>
                      <span class="stat-label">A Configurer</span>
                    </div>
                  </div>
                  
                  <div class="expand-arrow">
                    <i class="fas fa-chevron-down"></i>
                  </div>
                </div>
                
                <div class="module-content" id="module-content-${tiroirId}-${moduleId}" style="display: none;">
                  <div class="module-workspace">
                    <div class="fiber-grid-container">
                      <div class="fiber-grid-24">
                        ${allFibers.map((fiber) => this.renderFiber(fiber)).join("")}
                      </div>
                    </div>
                    
                    <div class="module-controls">
                      <div class="voice-controls">
                        <button class="btn-voice-control start" onclick="window.FiberConfig.startModuleVoice('${tiroirId}', '${moduleId}')">
                          <i class="fas fa-microphone"></i>
                          Start Voice
                        </button>
                        <button class="btn-voice-control stop" onclick="window.FiberConfig.stopModuleVoice('${tiroirId}', '${moduleId}')" style="display: none;">
                          <i class="fas fa-microphone-slash"></i>
                          Stop Voice
                        </button>
                        <button class="btn-voice-control pause" onclick="window.FiberConfig.pauseModuleVoice('${tiroirId}', '${moduleId}')" style="display: none;">
                          <i class="fas fa-pause"></i>
                          Pause
                        </button>
                      </div>
                      
                      <div class="module-actions">
                        <button class="btn-module-action clear" onclick="window.FiberConfig.clearModule('${tiroirId}', '${moduleId}')">
                          <i class="fas fa-eraser"></i>
                          Clear All
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  },

  renderFiber(fiber) {
    const storedFiber = this.findFiberById(fiber.id);
    const statusClass = storedFiber ? storedFiber.newStatus : "not-configured";
    const currentClass = this.currentFiber && this.currentFiber.id === fiber.id ? "current" : "";

    return `
      <div class="fiber-port ${statusClass} ${currentClass}" 
           id="fiber-${fiber.id}" 
           data-fiber-id="${fiber.id}"
           onclick="window.FiberConfig.cycleFiberStatus('${fiber.id}')"
           title="Fiber ${fiber.fiberNumber} - ${this.getStatusLabel(statusClass)}">
        ${fiber.fiberNumber}
      </div>
    `;
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
    const element = document.getElementById(`fiber-${fiberId}`);
    if (element) {
      element.classList.remove("not-configured", "available", "occupied");
      element.classList.add(newStatus);
      element.title = `Fiber ${fiber.fiberNumber} - ${this.getStatusLabel(newStatus)}`;
    }

    // Update counters
    this.updateProgress();

    const parts = fiberId.split("-");
    if (parts.length >= 3) {
      const tiroirId = parts[0];
      const moduleId = parts[1];
      this.updateModuleStats(tiroirId, moduleId);
      this.updateTiroirStats(tiroirId);
    }

    console.log(`🔄 Fiber ${fiber.fiberNumber} status changed to: ${newStatus}`);
  },

  findFiberById(fiberId) {
    // Check if fiber already exists
    if (this.projectData.fibers[fiberId]) {
      return this.projectData.fibers[fiberId];
    }

    // Create new fiber if not found
    const parts = fiberId.split("-");
    if (parts.length >= 3) {
      const tiroirId = parts[0];
      const moduleId = parts[1];
      const fiberNumber = parseInt(parts[2]);

      const fiber = {
        id: fiberId,
        fiberNumber: fiberNumber,
        tiroir: tiroirId,
        module: moduleId,
        newStatus: "not-configured",
      };

      this.projectData.fibers[fiberId] = fiber;
      return fiber;
    }

    return null;
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
          setTimeout(() => {
            window.Voice.recognition.start();
          }, 100);
        }
      };
    }
  },

  startModuleVoice(tiroirId, moduleId) {
    console.log(`🎤 Starting voice recognition for Tiroir ${tiroirId}, Module ${moduleId}`);

    // Find first unconfigured fiber in this module
    const moduleElement = document.getElementById(`module-content-${tiroirId}-${moduleId}`);
    const fibers = moduleElement.querySelectorAll(".fiber-port");

    let firstUnconfigured = null;
    for (const fiberElement of fibers) {
      if (fiberElement.classList.contains("not-configured")) {
        firstUnconfigured = fiberElement.getAttribute("data-fiber-id");
        break;
      }
    }

    if (firstUnconfigured) {
      this.selectFiber(firstUnconfigured);
    }

    // Update button visibility
    document.querySelector(`#module-${tiroirId}-${moduleId} .btn-voice-control.start`).style.display = "none";
    document.querySelector(`#module-${tiroirId}-${moduleId} .btn-voice-control.stop`).style.display = "inline-flex";
    document.querySelector(`#module-${tiroirId}-${moduleId} .btn-voice-control.pause`).style.display = "inline-flex";

    // Start voice recognition
    this.startVoiceRecognition();
    this.currentModule = { tiroirId, moduleId };
  },

  stopModuleVoice(tiroirId, moduleId) {
    console.log(`🎤 Stopping voice recognition for Tiroir ${tiroirId}, Module ${moduleId}`);

    // Update button visibility
    document.querySelector(`#module-${tiroirId}-${moduleId} .btn-voice-control.start`).style.display = "inline-flex";
    document.querySelector(`#module-${tiroirId}-${moduleId} .btn-voice-control.stop`).style.display = "none";
    document.querySelector(`#module-${tiroirId}-${moduleId} .btn-voice-control.pause`).style.display = "none";

    this.stopVoiceRecognition();
    this.currentModule = null;
  },

  pauseModuleVoice(tiroirId, moduleId) {
    console.log(`⏸️ Pausing voice recognition for Tiroir ${tiroirId}, Module ${moduleId}`);
    this.stopVoiceRecognition();
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
  },

  selectFiber(fiberId) {
    // Remove current class from previous fiber
    if (this.currentFiber) {
      const prevElement = document.getElementById(`fiber-${this.currentFiber.id}`);
      if (prevElement) {
        prevElement.classList.remove("current");
      }
    }

    // Set new current fiber
    this.currentFiber = this.findFiberById(fiberId);
    if (this.currentFiber) {
      const element = document.getElementById(`fiber-${fiberId}`);
      if (element) {
        element.classList.add("current");
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  },

  setCurrentFiberStatus(status) {
    if (!this.currentFiber) return;

    const fiberId = this.currentFiber.id;
    const element = document.getElementById(`fiber-${fiberId}`);

    if (element) {
      element.classList.remove("not-configured", "available", "occupied");
      element.classList.add(status);
      this.currentFiber.newStatus = status;
      element.title = `Fiber ${this.currentFiber.fiberNumber} - ${this.getStatusLabel(status)}`;
    }

    this.updateProgress();
  },

  moveToNextFiber() {
    if (!this.currentFiber || !this.currentModule) return;

    const { tiroirId, moduleId } = this.currentModule;
    const moduleElement = document.getElementById(`module-content-${tiroirId}-${moduleId}`);
    const fiberElements = Array.from(moduleElement.querySelectorAll(".fiber-port"));

    const currentIndex = fiberElements.findIndex((el) => el.getAttribute("data-fiber-id") === this.currentFiber.id);

    if (currentIndex >= 0 && currentIndex < fiberElements.length - 1) {
      const nextFiberId = fiberElements[currentIndex + 1].getAttribute("data-fiber-id");
      this.selectFiber(nextFiberId);
    } else {
      window.Components.showToast("info", "Module Complete", `All fibers in Module ${moduleId} processed!`);
      this.stopModuleVoice(tiroirId, moduleId);
    }
  },

  // ==================
  // MODULE ACTIONS
  // ==================

  clearModule(tiroirId, moduleId) {
    console.log(`🧹 Clearing all fibers in Tiroir ${tiroirId}, Module ${moduleId}`);

    const moduleElement = document.getElementById(`module-content-${tiroirId}-${moduleId}`);
    const fiberElements = moduleElement.querySelectorAll(".fiber-port");

    fiberElements.forEach((element) => {
      const fiberId = element.getAttribute("data-fiber-id");
      const fiber = this.findFiberById(fiberId);

      if (fiber) {
        fiber.newStatus = "not-configured";
        element.classList.remove("available", "occupied");
        element.classList.add("not-configured");
        element.title = `Fiber ${fiber.fiberNumber} - Not Configured`;
      }
    });

    this.updateProgress();
    this.updateModuleStats(tiroirId, moduleId);
    this.updateTiroirStats(tiroirId);

    window.Components.showToast(
      "success",
      "Module Cleared",
      `All fibers in Module ${moduleId} reset to not configured`
    );
  },

  // ==================
  // ALL TIROIR ACTIONS
  // ==================
  async resetAll() {
    // Create all fibers first
    this.createAllFibers();

    Object.values(this.projectData.fibers).forEach((fiber) => {
      fiber.newStatus = "not-configured";
      const element = document.getElementById(`fiber-${fiber.id}`);
      if (element) {
        element.classList.remove("available", "occupied");
        element.classList.add("not-configured");
      }
    });
    this.updateAllStats();
  },

  createAllFibers() {
    Object.keys(this.projectData.tiroirs).forEach((tiroirId) => {
      Object.keys(this.projectData.tiroirs[tiroirId].modules).forEach((moduleId) => {
        for (let i = 1; i <= 24; i++) {
          const fiberId = `${tiroirId}-${moduleId}-${i}`;
          this.findFiberById(fiberId); // This creates the fiber if it doesn't exist
        }
      });
    });
  },

  async setAllAvailable() {
    Object.values(this.projectData.fibers).forEach((fiber) => {
      fiber.newStatus = "available";
      const element = document.getElementById(`fiber-${fiber.id}`);
      if (element) {
        element.classList.remove("not-configured", "occupied");
        element.classList.add("available");
      }
    });
    this.updateAllStats();
  },

  async setAllOccupied() {
    Object.values(this.projectData.fibers).forEach((fiber) => {
      fiber.newStatus = "occupied";
      const element = document.getElementById(`fiber-${fiber.id}`);
      if (element) {
        element.classList.remove("not-configured", "available");
        element.classList.add("occupied");
      }
    });
    this.updateAllStats();
  },

  updateAllStats() {
    this.updateProgress();
    Object.keys(this.projectData.tiroirs).forEach((tiroirId) => {
      this.updateTiroirStats(tiroirId);
      Object.keys(this.projectData.tiroirs[tiroirId].modules).forEach((moduleId) => {
        this.updateModuleStats(tiroirId, moduleId);
      });
    });
  },

  // ==================
  // UI TOGGLES
  // ==================

  toggleTiroir(tiroirId) {
    const content = document.getElementById(`tiroir-content-${tiroirId}`);
    const arrow = document.querySelector(`#tiroir-${tiroirId} .expand-arrow i`);

    if (content.style.display === "none") {
      content.style.display = "block";
      arrow.classList.remove("fa-chevron-down");
      arrow.classList.add("fa-chevron-up");

      content.style.maxHeight = "0";
      content.style.overflow = "hidden";
      content.style.transition = "max-height 0.3s ease-out";

      setTimeout(() => {
        content.style.maxHeight = content.scrollHeight + "px";
      }, 10);

      setTimeout(() => {
        content.style.maxHeight = "none";
        content.style.overflow = "visible";
      }, 300);
    } else {
      content.style.maxHeight = content.scrollHeight + "px";
      content.style.overflow = "hidden";
      content.style.transition = "max-height 0.3s ease-out";

      setTimeout(() => {
        content.style.maxHeight = "0";
      }, 10);

      setTimeout(() => {
        content.style.display = "none";
        arrow.classList.remove("fa-chevron-up");
        arrow.classList.add("fa-chevron-down");
      }, 300);
    }
  },

  toggleModule(tiroirId, moduleId) {
    const content = document.getElementById(`module-content-${tiroirId}-${moduleId}`);
    const arrow = document.querySelector(`#module-${tiroirId}-${moduleId} .expand-arrow i`);

    if (content.style.display === "none") {
      content.style.display = "block";
      arrow.classList.remove("fa-chevron-down");
      arrow.classList.add("fa-chevron-up");

      content.style.maxHeight = "0";
      content.style.overflow = "hidden";
      content.style.transition = "max-height 0.3s ease-out";

      setTimeout(() => {
        content.style.maxHeight = content.scrollHeight + "px";
      }, 10);

      setTimeout(() => {
        content.style.maxHeight = "none";
        content.style.overflow = "visible";
      }, 300);
    } else {
      content.style.maxHeight = content.scrollHeight + "px";
      content.style.overflow = "hidden";
      content.style.transition = "max-height 0.3s ease-out";

      setTimeout(() => {
        content.style.maxHeight = "0";
      }, 10);

      setTimeout(() => {
        content.style.display = "none";
        arrow.classList.remove("fa-chevron-up");
        arrow.classList.add("fa-chevron-down");
      }, 300);
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

  updateModuleStats(tiroirId, moduleId) {
    const occupiedCount = this.getFiberCountByStatus(tiroirId, moduleId, "occupied");
    const availableCount = this.getFiberCountByStatus(tiroirId, moduleId, "available");
    const notConfiguredCount = this.getFiberCountByStatus(tiroirId, moduleId, "not-configured");

    const statsElements = document.querySelectorAll(`#module-${tiroirId}-${moduleId} .module-stat .stat-number`);
    if (statsElements.length >= 3) {
      statsElements[0].textContent = occupiedCount;
      statsElements[1].textContent = availableCount;
      statsElements[2].textContent = notConfiguredCount;
    }
  },

  updateTiroirStats(tiroirId) {
    const stats = this.calculateTiroirStats(tiroirId);
    const statElements = document.querySelectorAll(`#tiroir-${tiroirId} .tiroir-stat-number`);

    if (statElements.length >= 3) {
      statElements[0].textContent = stats.totalFibers;
      statElements[1].textContent = stats.configuredFibers;
      statElements[2].textContent = `${stats.progress}%`;
    }
  },

  // ==================
  // CALCULATION HELPERS
  // ==================

  calculateTotalFibers() {
    let total = 0;
    Object.values(this.projectData.tiroirs).forEach((tiroir) => {
      total += Object.keys(tiroir.modules).length * 24; // 24 fibers per module
    });
    return total;
  },

  getConfiguredFibersCount() {
    return Object.values(this.projectData.fibers).filter((fiber) => fiber.newStatus !== "not-configured").length;
  },

  getFiberCountByStatus(tiroirId, moduleId, status) {
    let count = 0;
    for (let i = 1; i <= 24; i++) {
      const fiberId = `${tiroirId}-${moduleId}-${i}`;
      const fiber = this.projectData.fibers[fiberId];
      const fiberStatus = fiber ? fiber.newStatus : "not-configured";
      if (fiberStatus === status) count++;
    }
    return count;
  },

  calculateTiroirStats(tiroirId) {
    const tiroir = this.projectData.tiroirs[tiroirId];
    const totalModules = Object.keys(tiroir.modules).length;
    const totalFibers = totalModules * 24;

    let configuredFibers = 0;
    Object.keys(tiroir.modules).forEach((moduleId) => {
      configuredFibers += this.getFiberCountByStatus(tiroirId, moduleId, "occupied");
      configuredFibers += this.getFiberCountByStatus(tiroirId, moduleId, "available");
    });

    const progress = totalFibers > 0 ? Math.round((configuredFibers / totalFibers) * 100) : 0;

    return {
      totalFibers,
      configuredFibers,
      progress,
    };
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
      } else if (e.key === "ArrowRight" || e.key === "Tab") {
        e.preventDefault();
        this.moveToNextFiber();
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
  async saveTiroirConfig() {
    try {
      console.log("💾 Saving fiber configuration and photos...");

      // Build tiroir_cfg structure
      const tiroir_cfg = {};

      // Process each tiroir
      Object.keys(this.projectData.tiroirs).forEach((tiroirId) => {
        tiroir_cfg[tiroirId] = {
          photos: this.getTiroirPhotos(tiroirId),
          modules: {},
        };

        // Process each module in tiroir
        Object.keys(this.projectData.tiroirs[tiroirId].modules).forEach((moduleId) => {
          tiroir_cfg[tiroirId].modules[moduleId] = {
            fibers: {},
          };

          // Get all 24 fiber statuses
          for (let i = 1; i <= 24; i++) {
            const fiberId = `${tiroirId}-${moduleId}-${i}`;
            const fiber = this.projectData.fibers[fiberId];
            tiroir_cfg[tiroirId].modules[moduleId].fibers[i] = fiber ? fiber.newStatus : "not-configured";
          }
        });
      });

      // Calculate stats
      const configuredCount = Object.values(this.projectData.fibers).filter(
        (f) => f.newStatus !== "not-configured"
      ).length;
      const totalCount = this.calculateTotalFibers();

      // Update project
      await window.API.projects.update(this.currentProject.id, {
        tiroir_cfg: tiroir_cfg,
        configuredFibers: configuredCount,
        totalFibers: totalCount,
        status: configuredCount > 0 ? "in-progress" : "excel-processed",
        updatedAt: new Date().toISOString(),
      });

      window.Components.showToast(
        "success",
        "Enregistré",
        `Configuration sauvegardée: ${configuredCount} fibres configurées`
      );
    } catch (error) {
      console.error("❌ Error saving progress:", error);
      window.Components.showToast("error", "Erreur", "Échec de la sauvegarde");
    }
  },
};

console.log("🔧 Fiber Configuration module loaded successfully");
console.log("🔧 Fiber Configuration module loaded successfully");
