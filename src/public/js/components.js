/**
 * 🧩 COMPONENTS MODULE
 * Reusable UI components and interactions
 */

window.Components = {
  // ==================
  // INITIALIZATION
  // ==================

  init() {
    console.log("🧩 Initializing components...");
    this.initializeToastContainer();
    this.initializeModalContainer();
    console.log("✅ Components initialized");
  },

  initializeToastContainer() {
    if (!document.getElementById("toast-container")) {
      const container = window.Utils.createElement("div", {
        id: "toast-container",
        className: "toast-container",
      });
      document.body.appendChild(container);
    }
  },

  initializeModalContainer() {
    if (!document.getElementById("modal-container")) {
      const container = window.Utils.createElement("div", {
        id: "modal-container",
        className: "modal-container",
      });
      document.body.appendChild(container);
    }
  },

  // ==================
  // TOAST NOTIFICATIONS
  // ==================

  showToast(type = "info", title, message, duration = 5000) {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toastId = window.Utils.generateId("toast");
    const iconMap = {
      success: "fa-check-circle",
      error: "fa-times-circle",
      warning: "fa-exclamation-triangle",
      info: "fa-info-circle",
    };

    const toast = window.Utils.createElement("div", {
      id: toastId,
      className: `toast ${type}`,
      innerHTML: `
                <div class="toast-icon">
                    <i class="fas ${iconMap[type] || iconMap.info}"></i>
                </div>
                <div class="toast-content">
                    <div class="toast-title">${title}</div>
                    <div class="toast-message">${message}</div>
                </div>
                <button class="toast-close">
                    <i class="fas fa-times"></i>
                </button>
            `,
    });

    // Add close functionality
    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", () => this.hideToast(toastId));

    // Add to container
    toastContainer.appendChild(toast);

    // Trigger show animation
    setTimeout(() => toast.classList.add("show"), 100);

    // Auto-hide after duration
    if (duration > 0) {
      setTimeout(() => this.hideToast(toastId), duration);
    }

    return toastId;
  },

  hideToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }
  },

  // ==================
  // MODAL DIALOGS
  // ==================

  showModal(title, content, options = {}) {
    const modalContainer = document.getElementById("modal-container");
    if (!modalContainer) return;

    const { width = "auto", height = "auto", showCloseButton = true, backdrop = true, keyboard = true } = options;

    const modal = window.Utils.createElement("div", {
      className: "modal",
      style: `width: ${width}; height: ${height};`,
      innerHTML: `
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    ${showCloseButton ? '<button class="modal-close"><i class="fas fa-times"></i></button>' : ""}
                </div>
                <div class="modal-content">
                    ${content}
                </div>
            `,
    });

    // Show modal
    modalContainer.appendChild(modal);
    modalContainer.classList.add("active");

    // Add event listeners
    if (showCloseButton) {
      const closeBtn = modal.querySelector(".modal-close");
      closeBtn.addEventListener("click", () => this.closeModal());
    }

    if (backdrop) {
      modalContainer.addEventListener("click", (e) => {
        if (e.target === modalContainer) {
          this.closeModal();
        }
      });
    }

    if (keyboard) {
      const keyHandler = (e) => {
        if (e.key === "Escape") {
          this.closeModal();
          document.removeEventListener("keydown", keyHandler);
        }
      };
      document.addEventListener("keydown", keyHandler);
    }
  },

  closeModal() {
    const modalContainer = document.getElementById("modal-container");
    if (modalContainer) {
      modalContainer.classList.remove("active");
      setTimeout(() => {
        modalContainer.innerHTML = "";
      }, 300);
    }
  },

  // ==================
  // PROJECT WIZARD - FIXED VERSION
  // ==================

  createProjectWizard(container) {
    // Define wizard configuration
    const wizardConfig = {
      steps: [
        { id: "basic", title: "Project Info", number: 1 },
        { id: "upload", title: "Upload Excel", number: 2 },
        { id: "process", title: "Process Data", number: 3 },
        { id: "complete", title: "Complete", number: 4 },
      ],
      currentStep: 0,
      projectData: {},
    };

    // Render function that maintains state
    const renderWizard = () => {
      container.innerHTML = `
        <div class="wizard-container">
          <div class="wizard-header">
            <h2 class="wizard-title">Create New Project</h2>
            <p class="wizard-subtitle">Set up your optical fiber project in a few simple steps</p>
          </div>
          
          <div class="wizard-steps">
            ${wizardConfig.steps
              .map(
                (step, index) => `
              <div class="wizard-step ${index === wizardConfig.currentStep ? "active" : ""} ${
                  index < wizardConfig.currentStep ? "completed" : ""
                }">
                <div class="step-number">${step.number}</div>
                <div class="step-title">${step.title}</div>
              </div>
            `
              )
              .join("")}
          </div>
          
          <div class="wizard-content" id="wizard-step-content">
            ${this.renderWizardStep(wizardConfig.steps[wizardConfig.currentStep].id, wizardConfig.projectData)}
          </div>
          
          <div class="wizard-actions">
            <div class="wizard-nav">
              <button class="btn-secondary" id="wizard-prev" ${wizardConfig.currentStep === 0 ? "disabled" : ""}>
                <i class="fas fa-arrow-left"></i> Previous
              </button>
              <button class="btn-primary" id="wizard-next">
                ${wizardConfig.currentStep === wizardConfig.steps.length - 1 ? "Finish" : "Next"} 
                <i class="fas fa-arrow-right"></i>
              </button>
            </div>
            
            <button class="btn-secondary" id="save-draft">
              <i class="fas fa-save"></i> Save Draft
            </button>
          </div>
        </div>
      `;

      // Setup event listeners AFTER HTML is created
      this.setupWizardEventListeners(wizardConfig, renderWizard);
    };

    // Initial render
    renderWizard();
  },

  setupWizardEventListeners(wizardConfig, renderWizard) {
    console.log("🔧 Setting up wizard event listeners...");

    // Previous button
    const prevBtn = document.getElementById("wizard-prev");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        console.log("⬅️ Previous button clicked");
        if (wizardConfig.currentStep > 0) {
          wizardConfig.currentStep--;
          renderWizard();
        }
      });
      console.log("✅ Previous button listener attached");
    }

    // Next button
    const nextBtn = document.getElementById("wizard-next");
    if (nextBtn) {
      nextBtn.addEventListener("click", async () => {
        console.log("➡️ Next button clicked");
        if (await this.validateWizardStep(wizardConfig.steps[wizardConfig.currentStep].id, wizardConfig.projectData)) {
          if (wizardConfig.currentStep < wizardConfig.steps.length - 1) {
            wizardConfig.currentStep++;
            renderWizard();
          } else {
            this.completeWizard(wizardConfig.projectData);
          }
        }
      });
      console.log("✅ Next button listener attached");
    }

    // Save draft button
    const saveDraftBtn = document.getElementById("save-draft");
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener("click", () => {
        console.log("💾 Save draft clicked");
        this.saveProjectDraft(wizardConfig.projectData);
      });
      console.log("✅ Save draft button listener attached");
    }

    // Step-specific listeners
    this.setupStepEventListeners(wizardConfig.steps[wizardConfig.currentStep].id, wizardConfig.projectData);
  },

  renderWizardStep(stepId, projectData) {
    switch (stepId) {
      case "basic":
        return `
          <div class="step-basic">
            <h3>Project Information</h3>
            <div class="form-group">
              <label class="form-label" for="project-name">Project Name *</label>
              <input type="text" class="form-input" id="project-name" 
                     placeholder="Enter project name" value="${projectData.name || ""}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="project-description">Description</label>
              <textarea class="form-textarea" id="project-description" 
                        placeholder="Optional project description">${projectData.description || ""}</textarea>
            </div>
          </div>
        `;

      case "upload":
        return `
          <div class="step-upload">
            <h3>Upload Excel File</h3>
            <p>Upload your "base rop" Excel file containing the fiber data.</p>
            
            <div class="file-upload-area" id="file-upload-area">
              <div class="file-upload-icon">
                <i class="fas fa-file-excel"></i>
              </div>
              <div class="file-upload-text">
                Click to select or drag and drop your Excel file
              </div>
              <div class="file-upload-hint">
                Supported formats: .xlsx, .xls (Max size: 50MB)
              </div>
              <input type="file" id="excel-file-input" accept=".xlsx,.xls" style="display: none;">
            </div>
            
            <div id="file-info" style="display: none;" class="file-info">
              <div class="file-selected">
                <div class="file-details">
                  <i class="fas fa-file-excel"></i>
                  <div class="file-text">
                    <span id="file-name"></span>
                    <span id="file-size"></span>
                  </div>
                </div>
                <button class="btn-remove-file" id="remove-file" title="Remove file">
                  <i class="fas fa-times"></i>
                  Remove
                </button>
              </div>
            </div>
          </div>
        `;

      case "process":
        return `
          <div class="step-process">
            <h3>Processing Excel Data</h3>
            <div id="processing-status">
              <div class="loading-spinner"></div>
              <p>Reading and processing your Excel file...</p>
            </div>
            
            <div id="processing-results" style="display: none;">
              <div class="processing-success">
                <div class="success-checkmark"></div>
                <h4>Processing Complete!</h4>
                <div class="processing-stats" id="processing-stats">
                  <!-- Stats will be inserted here -->
                </div>
              </div>
            </div>
          </div>
        `;

      case "complete":
        return `
          <div class="step-complete">
            <div class="completion-success">
              <div class="success-checkmark"></div>
              <h3>Project Created Successfully!</h3>
              <p>Your optical fiber project has been set up and is ready for configuration.</p>
              
              <div class="project-summary">
                <h4>Project Summary</h4>
                <div class="summary-item">
                  <strong>Name:</strong> ${projectData.name || "N/A"}
                </div>
                <div class="summary-item">
                  <strong>Total Fibers:</strong> ${projectData.totalFibers || 0}
                </div>
              </div>
              
              <div class="completion-actions">
                <button class="btn-primary" data-action="start-configuration">
                  <i class="fas fa-cog"></i> Start Configuration
                </button>
                <button class="btn-secondary" data-action="view-project">
                  <i class="fas fa-eye"></i> View Project
                </button>
              </div>
            </div>
          </div>
        `;
    }
  },

  setupStepEventListeners(stepId, projectData) {
    switch (stepId) {
      case "basic":
        const nameInput = document.getElementById("project-name");
        const descInput = document.getElementById("project-description");

        if (nameInput) {
          nameInput.addEventListener("input", (e) => {
            projectData.name = e.target.value;
          });
        }

        if (descInput) {
          descInput.addEventListener("input", (e) => {
            projectData.description = e.target.value;
          });
        }
        break;

      case "upload":
        this.setupFileUpload(projectData);
        break;

      case "process":
        this.processExcelFile(projectData);
        break;

      case "complete":
        const actionButtons = document.querySelectorAll("[data-action]");
        actionButtons.forEach((button) => {
          button.addEventListener("click", (e) => {
            const action = e.target.getAttribute("data-action");
            this.handleCompletionAction(action, projectData);
          });
        });
        break;
    }
  },

  setupFileUpload(projectData) {
    const uploadArea = document.getElementById("file-upload-area");
    const fileInput = document.getElementById("excel-file-input");

    if (uploadArea && fileInput) {
      uploadArea.addEventListener("click", () => fileInput.click());

      // Drag and drop
      uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadArea.classList.add("dragover");
      });

      uploadArea.addEventListener("dragleave", () => {
        uploadArea.classList.remove("dragover");
      });

      uploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadArea.classList.remove("dragover");

        const files = e.dataTransfer.files;
        if (files.length > 0) {
          this.handleFileSelection(files[0], projectData);
        }
      });

      fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
          this.handleFileSelection(e.target.files[0], projectData);
        }
      });

      // Remove file button
      const removeBtn = document.getElementById("remove-file");
      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          projectData.excelFile = null;
          document.getElementById("file-info").style.display = "none";
          uploadArea.style.display = "block";
          fileInput.value = "";
        });
      }
    }
  },

  handleFileSelection(file, projectData) {
    const validation = window.API.validateExcelFile(file);

    if (!validation.valid) {
      this.showToast("error", "Invalid File", validation.errors.join(", "));
      return;
    }

    projectData.excelFile = file;

    const fileInfo = document.getElementById("file-info");
    const fileName = document.getElementById("file-name");
    const fileSize = document.getElementById("file-size");

    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = window.Utils.formatFileSize(file.size);
    if (fileInfo) fileInfo.style.display = "block";

    const uploadArea = document.getElementById("file-upload-area");
    if (uploadArea) uploadArea.style.display = "none";

    this.showToast("success", "File Selected", `${file.name} ready for upload`);
  },

  async validateWizardStep(stepId, projectData) {
    switch (stepId) {
      case "basic":
        const validation = window.API.validateProjectData(projectData);
        if (!validation.valid) {
          this.showToast("error", "Validation Error", validation.errors.join(", "));
          return false;
        }
        break;

      case "upload":
        if (!projectData.excelFile) {
          this.showToast("error", "File Required", "Please select an Excel file to continue");
          return false;
        }
        break;
    }

    return true;
  },

  // Replace your processExcelFile function in components.js with this version
  // that includes better error handling and debugging

  async processExcelFile(projectData) {
    try {
      console.log("🔥 Creating project with data:", projectData);

      // Add timestamp to make name unique if there's a conflict
      let projectName = projectData.name;
      let attempt = 0;
      let createResponse;

      while (attempt < 3) {
        try {
          createResponse = await window.API.projects.create({
            name: attempt === 0 ? projectName : `${projectName}-${attempt}`,
            reference: `PROJ-${Date.now()}`,
            description: projectData.description,
          });
          break; // Success, exit loop
        } catch (error) {
          if (error.message.includes("409") || error.message.includes("already exists")) {
            attempt++;
            console.log(`Project name conflict, trying: ${projectName}-${attempt}`);
            continue; // Try again with modified name
          } else {
            throw error; // Different error, re-throw
          }
        }
      }

      if (!createResponse) {
        throw new Error("Could not create project after multiple attempts. Please use a different name.");
      }

      projectData.projectId = createResponse.project.id;
      console.log("✅ Project created with ID:", projectData.projectId);

      // WAIT A MOMENT for project to be fully created
      console.log("⏳ Waiting for project to be fully initialized...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // VERIFY PROJECT EXISTS before uploading
      console.log("🔍 Verifying project exists before upload...");
      try {
        const verifyResponse = await window.API.projects.get(projectData.projectId);
        console.log("✅ Project verification successful:", verifyResponse.project.name);
      } catch (error) {
        console.error("❌ Project verification failed:", error);
        throw new Error("Project was created but cannot be verified. Please try again.");
      }

      console.log("📤 Starting Excel file upload...");
      console.log("📄 File details:", {
        name: projectData.excelFile.name,
        size: projectData.excelFile.size,
        type: projectData.excelFile.type,
      });

      // Upload with detailed error handling
      let uploadResponse;
      try {
        uploadResponse = await window.API.upload.excel(projectData.projectId, projectData.excelFile);
        console.log("✅ Upload successful:", uploadResponse);
      } catch (uploadError) {
        console.error("❌ Upload failed:", uploadError);
        console.error("📋 Upload error details:", {
          message: uploadError.message,
          stack: uploadError.stack,
          projectId: projectData.projectId,
          fileName: projectData.excelFile.name,
        });

        // Try to get more details about the error
        if (uploadError.message.includes("404")) {
          throw new Error(
            `Upload failed: Project ${projectData.projectId} not found on server. The project may not have been created properly.`
          );
        } else if (uploadError.message.includes("413")) {
          throw new Error("Upload failed: File is too large (max 50MB)");
        } else if (uploadError.message.includes("400")) {
          throw new Error("Upload failed: Invalid file format. Please use .xlsx or .xls files only.");
        } else {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
      }

      console.log("⚙️ Starting Excel file processing...");
      let processResponse;
      try {
        processResponse = await window.API.excel.process(projectData.projectId);
        console.log("✅ Processing successful:", processResponse.stats);
      } catch (processError) {
        console.error("❌ Processing failed:", processError);
        throw new Error(`Excel processing failed: ${processError.message}`);
      }

      // Update project data with stats
      projectData.totalFibers = processResponse.stats.totalFibers;
      projectData.tiroirs = processResponse.stats.tiroirs;
      projectData.pbos = processResponse.stats.pbos;
      projectData.pbis = processResponse.stats.pbis;

      // Update the project with the processed stats
      try {
        await window.API.projects.update(projectData.projectId, {
          totalFibers: processResponse.stats.totalFibers,
          pbos: processResponse.stats.pbos,
          pbis: processResponse.stats.pbis,
          tiroirs: processResponse.stats.tiroirs,
          status: "excel-processed",
        });
        console.log("✅ Project updated with stats");
      } catch (updateError) {
        console.error("❌ Failed to update project with stats:", updateError);
        // Don't throw here - the main process succeeded
      }

      console.log("🎉 Processing complete:", processResponse.stats);
      this.showProcessingResults(processResponse.stats);
    } catch (error) {
      console.error("💥 Processing error:", error);

      // Clean up project if it was created but process failed
      if (projectData.projectId) {
        console.log("🧹 Cleaning up failed project...");
        try {
          await window.API.projects.delete(projectData.projectId);
          console.log("✅ Failed project cleaned up");
        } catch (cleanupError) {
          console.error("❌ Failed to clean up project:", cleanupError);
        }
      }

      this.showProcessingError(error);
    }
  },

  showProcessingResults(stats) {
    const statusElement = document.getElementById("processing-status");
    const resultsElement = document.getElementById("processing-results");
    const statsElement = document.getElementById("processing-stats");

    if (statusElement) statusElement.style.display = "none";
    if (resultsElement) resultsElement.style.display = "block";

    if (statsElement) {
      statsElement.innerHTML = `
        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-number">${stats.totalFibers}</div>
            <div class="stat-label">Total Fibers</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${stats.tiroirs}</div>
            <div class="stat-label">Tiroirs</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${stats.pbos}</div>
            <div class="stat-label">PBO(s)</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${stats.pbis}</div>
            <div class="stat-label">PBI(s)</div>
          </div>
        </div>
      `;
    }
  },

  showProcessingError(error) {
    const statusElement = document.getElementById("processing-status");
    if (statusElement) {
      let errorMessage = window.API.formatError(error);

      // Provide user-friendly error messages
      if (error.message.includes("409") || error.message.includes("already exists")) {
        errorMessage = "A project with this name already exists. Please use a different name.";
      } else if (error.message.includes("network") || error.message.includes("fetch")) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message.includes("file") || error.message.includes("upload")) {
        errorMessage = "File upload failed. Please check your Excel file and try again.";
      }

      statusElement.innerHTML = `
        <div class="processing-error">
          <i class="fas fa-exclamation-triangle"></i>
          <h4>Processing Failed</h4>
          <p>${errorMessage}</p>
          <div class="error-actions">
            <button class="btn-secondary" onclick="window.Navigation.showPage('create')">
              <i class="fas fa-arrow-left"></i> Back to Start
            </button>
            <button class="btn-primary" onclick="location.reload()">
              <i class="fas fa-redo"></i> Try Again
            </button>
          </div>
        </div>
      `;
    }
  },

  handleCompletionAction(action, projectData) {
    switch (action) {
      case "start-configuration":
        this.showToast("info", "Coming Soon", "Fiber configuration interface will be available soon");
        break;
      case "view-project":
        window.Navigation.showPage("projects");
        break;
    }
  },

  completeWizard(projectData) {
    this.showToast("success", "Project Created", "Your project has been created successfully!");

    setTimeout(() => {
      if (window.Navigation) {
        window.Navigation.showPage("projects");
      }
    }, 2000);
  },

  saveProjectDraft(projectData) {
    const draftKey = `draft_${Date.now()}`;
    window.Utils.storage.set(draftKey, projectData);
    this.showToast("info", "Draft Saved", "Project draft saved locally");
  },
};

console.log("🧩 Components module loaded successfully");
