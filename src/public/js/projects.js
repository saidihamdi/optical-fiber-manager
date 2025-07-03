/**
 * 📁 PROJECTS MODULE
 * Handles project listing and management
 */

window.Projects = {
  projects: [],
  filteredProjects: [],
  sortBy: "updatedAt",
  sortOrder: "desc",
  filterStatus: "all",

  // ==================
  // INITIALIZATION
  // ==================

  init() {
    console.log("📁 Initializing projects module...");
    this.setupEventListeners();
    this.setupHeaderButtons();
    console.log("✅ Projects module initialized");
  },

  setupHeaderButtons() {
    // Fix the "New Project" button in the header
    document.addEventListener("click", (e) => {
      // Check if it's a navigation button
      if (e.target.matches('button[onclick*="showPage"]') || e.target.closest('button[onclick*="showPage"]')) {
        e.preventDefault();
        console.log("🔗 Header: Creating new project");
        window.Navigation.showPage("create");
      }
    });
  },

  setupEventListeners() {
    // Sort and filter controls (will be added to projects page)
    document.addEventListener("change", (e) => {
      if (e.target.id === "project-sort") {
        this.setSortBy(e.target.value);
      }
      if (e.target.id === "project-filter") {
        this.setFilter(e.target.value);
      }
    });

    // Search functionality
    document.addEventListener("input", (e) => {
      if (e.target.id === "project-search") {
        this.searchProjects(e.target.value);
      }
    });
  },

  // ==================
  // DATA LOADING
  // ==================

  async loadProjects() {
    console.log("📁 Loading projects...");

    try {
      const response = await window.API.projects.getAll();
      this.projects = response.projects || [];
      this.filteredProjects = [...this.projects];

      this.applySorting();
      this.applyFiltering();
      this.renderProjects();

      console.log(`✅ Loaded ${this.projects.length} projects`);
    } catch (error) {
      console.error("❌ Error loading projects:", error);
      this.showError("Failed to load projects");
    }
  },

  // ==================
  // FILTERING & SORTING
  // ==================

  setSortBy(sortBy) {
    if (this.sortBy === sortBy) {
      this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
    } else {
      this.sortBy = sortBy;
      this.sortOrder = "desc";
    }

    this.applySorting();
    this.renderProjects();
  },

  setFilter(status) {
    this.filterStatus = status;
    this.applyFiltering();
    this.renderProjects();
  },

  searchProjects(query) {
    const searchTerm = query.toLowerCase().trim();

    if (searchTerm === "") {
      this.filteredProjects = [...this.projects];
    } else {
      this.filteredProjects = this.projects.filter(
        (project) =>
          project.name.toLowerCase().includes(searchTerm) || project.reference.toLowerCase().includes(searchTerm)
      );
    }

    this.applySorting();
    this.renderProjects();
  },

  applySorting() {
    this.filteredProjects.sort((a, b) => {
      let aVal = a[this.sortBy];
      let bVal = b[this.sortBy];

      // Handle dates
      if (this.sortBy.includes("At")) {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (this.sortOrder === "desc") {
        return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
      } else {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
    });
  },

  applyFiltering() {
    if (this.filterStatus !== "all") {
      this.filteredProjects = this.filteredProjects.filter((project) => project.status === this.filterStatus);
    }
  },

  // ==================
  // UI RENDERING
  // ==================

  renderProjects() {
    const container = document.getElementById("projects-container");
    if (!container) return;

    // Add search and filter controls if not present
    this.addProjectControls();

    if (this.filteredProjects.length === 0) {
      container.innerHTML = this.renderEmptyState();
      return;
    }

    container.innerHTML = this.filteredProjects
      .map((project, index) => this.renderProjectCard(project, index))
      .join("");

    // Add stagger animation
    this.addStaggerAnimation();

    // Add event listeners to project action buttons
    this.setupProjectActionListeners();
  },

  addProjectControls() {
    const pageHeader = document.querySelector("#projects-page .page-header");
    if (!pageHeader || document.getElementById("project-controls")) return;

    const controlsHTML = `
          <div id="project-controls" class="project-controls">
              <div class="search-filter-row">
                  <div class="search-box">
                      <i class="fas fa-search"></i>
                      <input type="text" id="project-search" placeholder="Search projects..." />
                  </div>
                  
                  <div class="filter-controls">
                      <select id="project-filter" class="form-select">
                          <option value="all">All Status</option>
                          <option value="draft">Draft</option>
                          <option value="excel-uploaded">File Uploaded</option>
                          <option value="excel-processed">Data Processed</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                      </select>
                      
                      <select id="project-sort" class="form-select">
                          <option value="updatedAt">Recently Updated</option>
                          <option value="createdAt">Recently Created</option>
                          <option value="name">Name (A-Z)</option>
                          <option value="reference">Reference</option>
                      </select>
                  </div>
              </div>
              
              <div class="projects-stats">
                  <span class="projects-count">
                      Showing ${this.filteredProjects.length} of ${this.projects.length} projects
                  </span>
              </div>
          </div>
      `;

    pageHeader.insertAdjacentHTML("afterend", controlsHTML);
  },

  renderProjectCard(project, index) {
    const progress = this.calculateProgress(project);
    const statusColor = window.Utils.getProjectStatusColor(project.status);

    return `
        <div class="project-card hover-lift" 
             style="animation-delay: ${index * 0.1}s;" 
             data-project-id="${project.id}"
             onclick="window.Projects.configureProject('${project.id}')">
            
            <div class="project-header">
                <div class="project-info">
                    <h3>${project.name}</h3>
                    <span class="project-reference">${project.reference}</span>
                </div>
                <span class="project-status ${project.status}" style="background-color: ${statusColor};">
                    ${this.getStatusLabel(project.status)}
                </span>
            </div>
            
            <div class="project-progress">
                <div class="progress-header">
                    <span class="progress-label">Configuration Progress</span>
                    <span class="progress-percentage">${progress}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
            
            <div class="project-stats">
                <div class="project-stat">
                    <span class="project-stat-number">${project.totalFibers || 0}</span>
                    <span class="project-stat-label">Total Fibers</span>
                </div>
                <div class="project-stat">
                    <span class="project-stat-number">${project.configuredFibers || 0}</span>
                    <span class="project-stat-label">Configured</span>
                </div>
                <div class="project-stat">
                    <span class="project-stat-number">${project.pbos || 0}</span>
                    <span class="project-stat-label">PBO(s)</span>
                </div>
                <div class="project-stat">
                    <span class="project-stat-number">${project.pbis || 0}</span>
                    <span class="project-stat-label">PBI(s)</span>
                </div>
            </div>
            
            <div class="project-meta">
                <div class="project-dates">
                    <small>
                        <i class="fas fa-calendar-plus"></i>
                        Created ${window.Utils.getRelativeTime(project.createdAt)}
                    </small>
                    <small>
                        <i class="fas fa-clock"></i>
                        Updated ${window.Utils.getRelativeTime(project.updatedAt)}
                    </small>
                </div>
            </div>
            
            <div class="project-actions">
                <button class="project-action" data-action="edit" data-project-id="${
                  project.id
                }" title="Edit Project" onclick="event.stopPropagation()">
                    <i class="fas fa-edit"></i>
                    Edit
                </button>
                <button class="project-action danger" data-action="delete" data-project-id="${
                  project.id
                }" title="Delete Project" onclick="event.stopPropagation()">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>
            </div>
        </div>
    `;
  },

  renderEmptyState() {
    const message =
      this.projects.length === 0
        ? "No projects found. Create your first project to get started."
        : "No projects match your current filters.";

    const showCreateButton = this.projects.length === 0;

    return `
          <div class="empty-state">
              <i class="fas fa-folder-open"></i>
              <h3>No Projects Found</h3>
              <p>${message}</p>
              ${
                showCreateButton
                  ? `
                  <button class="btn-primary" onclick="window.Navigation.showPage('create')">
                      <i class="fas fa-plus"></i> Create Your First Project
                  </button>
              `
                  : `
                  <button class="btn-secondary" onclick="window.Projects.clearFilters()">
                      <i class="fas fa-filter"></i> Clear Filters
                  </button>
              `
              }
          </div>
      `;
  },

  setupProjectActionListeners() {
    const actionButtons = document.querySelectorAll(".project-action[data-action]");
    actionButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent card click

        const action = button.getAttribute("data-action");
        const projectId = button.getAttribute("data-project-id");

        switch (action) {
          case "edit":
            this.editProject(projectId);
            break;
          case "delete":
            this.deleteProject(projectId);
            break;
        }
      });
    });
  },

  addStaggerAnimation() {
    const cards = document.querySelectorAll(".project-card");
    cards.forEach((card, index) => {
      window.Utils.animate(card, "animate__fadeInUp");
    });
  },

  // ==================
  // PROJECT ACTIONS
  // ==================

  viewProject(projectId) {
    console.log(`👁️ Viewing project: ${projectId}`);

    const project = this.projects.find((p) => p.id === projectId);
    if (!project) {
      window.Components.showToast("error", "Error", "Project not found");
      return;
    }

    // Create detailed project view modal
    const modalContent = `
          <div class="project-details">
              <div class="project-header-modal">
                  <div class="project-title">
                      <h2>${project.name}</h2>
                      <span class="project-status ${project.status}">${this.getStatusLabel(project.status)}</span>
                  </div>
                  <div class="project-reference">${project.reference || "No reference"}</div>
              </div>
              
              <div class="project-stats-grid">
                  <div class="stat-item">
                      <div class="stat-number">${project.totalFibers || 0}</div>
                      <div class="stat-label">Total Fibers</div>
                  </div>
                  <div class="stat-item">
                      <div class="stat-number">${project.configuredFibers || 0}</div>
                      <div class="stat-label">Configured</div>
                  </div>
                  <div class="stat-item">
                      <div class="stat-number">${project.pbos || 0}</div>
                      <div class="stat-label">PBOs</div>
                  </div>
                  <div class="stat-item">
                      <div class="stat-number">${project.pbis || 0}</div>
                      <div class="stat-label">PBIs</div>
                  </div>
                  <div class="stat-item">
                      <div class="stat-number">${project.tiroirs || 0}</div>
                      <div class="stat-label">Tiroirs</div>
                  </div>
                  <div class="stat-item">
                      <div class="stat-number">${this.calculateProgress(project)}%</div>
                      <div class="stat-label">Progress</div>
                  </div>
              </div>
              
              <div class="project-info-section">
                  <h3><i class="fas fa-info-circle"></i> Project Information</h3>
                  <div class="info-grid">
                      <div class="info-row">
                          <span class="info-label">Created:</span>
                          <span class="info-value">${window.Utils.formatDate(project.createdAt)}</span>
                      </div>
                      <div class="info-row">
                          <span class="info-label">Last Modified:</span>
                          <span class="info-value">${window.Utils.formatDate(project.updatedAt)}</span>
                      </div>
                      <div class="info-row">
                          <span class="info-label">Excel File:</span>
                          <span class="info-value">${project.excelFile ? "Uploaded" : "Not uploaded"}</span>
                      </div>
                  </div>
              </div>
              
              ${
                project.description
                  ? `
                  <div class="project-info-section">
                      <h3><i class="fas fa-file-text"></i> Description</h3>
                      <p class="description-text">${project.description}</p>
                  </div>
              `
                  : ""
              }
              
              <div class="project-actions-modal">
                  <button class="btn-primary" data-action="configure" data-project-id="${projectId}">
                      <i class="fas fa-cog"></i> Configure Fibers
                  </button>
                  <button class="btn-secondary" onclick="window.Components.closeModal()">
                      <i class="fas fa-times"></i> Close
                  </button>
              </div>
          </div>
          
          <style>
          .project-details { padding: 0; }
          .project-header-modal { text-align: center; margin-bottom: 2rem; }
          .project-title { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 0.5rem; }
          .project-title h2 { margin: 0; color: var(--text-primary); }
          .project-reference { color: var(--text-secondary); font-family: monospace; font-size: 0.9rem; }
          .project-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
          .stat-item { text-align: center; padding: 1rem; background: var(--bg-secondary); border-radius: 0.5rem; }
          .stat-number { font-size: 1.5rem; font-weight: 700; color: var(--primary-600); }
          .stat-label { font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; margin-top: 0.25rem; }
          .project-info-section { margin-bottom: 1.5rem; }
          .project-info-section h3 { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: var(--text-primary); }
          .info-grid { display: grid; gap: 0.75rem; }
          .info-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); }
          .info-label { font-weight: 600; color: var(--text-secondary); }
          .info-value { color: var(--text-primary); }
          .description-text { color: var(--text-secondary); line-height: 1.6; background: var(--bg-secondary); padding: 1rem; border-radius: 0.5rem; }
          .project-actions-modal { display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; }
          </style>
      `;

    window.Components.showModal(`Project Details`, modalContent, {
      width: "600px",
    });

    // Add event listeners after modal is created
    setTimeout(() => {
      const actionButtons = document.querySelectorAll("[data-action]");
      actionButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          const action = e.target.closest("button").getAttribute("data-action");
          const projectId = e.target.closest("button").getAttribute("data-project-id");

          window.Components.closeModal();

          if (action === "configure") {
            this.configureProject(projectId);
          } else if (action === "edit") {
            this.editProject(projectId);
          }
        });
      });
    }, 100);
  },

  editProject(projectId) {
    console.log(`⚙️ Opening fiber configuration for project: ${projectId}`);

    // Navigate to configure page and initialize
    window.Navigation.showPage("configure");

    // Initialize fiber configuration after page is shown
    setTimeout(() => {
      window.FiberConfig.init(projectId);
    }, 100);
  },

  configureProject(projectId) {
    console.log(`⚙️ Configuring project: ${projectId}`);
    // Navigate to fiber configuration page
    window.Components.showToast("info", "Coming Soon", "Fiber configuration functionality will be available soon");
  },

  async deleteProject(projectId) {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) {
      console.error("Project not found:", projectId);
      return;
    }

    // Show confirmation modal instead of browser confirm
    const confirmed = await this.showDeleteConfirmation(project);

    if (!confirmed) return;

    try {
      console.log(`🗑️ Deleting project: ${projectId}`);

      // Show loading state on the project card
      const projectCard = document.querySelector(`[data-project-id="${projectId}"]`);
      if (projectCard) {
        projectCard.style.opacity = "0.5";
        projectCard.style.pointerEvents = "none";
      }

      await window.API.projects.delete(projectId);

      // Remove from local arrays
      this.projects = this.projects.filter((p) => p.id !== projectId);
      this.filteredProjects = this.filteredProjects.filter((p) => p.id !== projectId);

      // Re-render projects
      this.renderProjects();

      // Update dashboard if needed
      if (window.Dashboard && window.Dashboard.loadData) {
        window.Dashboard.loadData();
      }

      window.Components.showToast("success", "Project Deleted", `${project.name} has been deleted successfully`);
    } catch (error) {
      console.error("❌ Error deleting project:", error);

      // Restore project card state
      const projectCard = document.querySelector(`[data-project-id="${projectId}"]`);
      if (projectCard) {
        projectCard.style.opacity = "1";
        projectCard.style.pointerEvents = "auto";
      }

      window.Components.showToast("error", "Delete Failed", "Failed to delete the project. Please try again.");
    }
  },

  async showDeleteConfirmation(project) {
    return new Promise((resolve) => {
      const modalContent = `
              <div class="delete-confirmation">
                  <div class="warning-icon">
                      <i class="fas fa-exclamation-triangle"></i>
                  </div>
                  <h3>Delete Project?</h3>
                  <p>Are you sure you want to delete <strong>"${project.name}"</strong>?</p>
                  <p class="warning-text">This action cannot be undone. All project data and Excel files will be permanently deleted.</p>
                  
                  <div class="project-info">
                      <div class="info-item">
                          <strong>Fibers:</strong> ${project.totalFibers || 0}
                      </div>
                      <div class="info-item">
                          <strong>Status:</strong> ${this.getStatusLabel(project.status)}
                      </div>
                      <div class="info-item">
                          <strong>Last Modified:</strong> ${window.Utils.getRelativeTime(project.updatedAt)}
                      </div>
                  </div>
                  
                  <div class="confirmation-actions">
                      <button class="btn-secondary" id="cancel-delete">
                          <i class="fas fa-times"></i> Cancel
                      </button>
                      <button class="btn-danger" id="confirm-delete">
                          <i class="fas fa-trash"></i> Delete Project
                      </button>
                  </div>
              </div>
              
              <style>
              .delete-confirmation { text-align: center; padding: 1rem; }
              .warning-icon { font-size: 3rem; color: #f59e0b; margin-bottom: 1rem; }
              .delete-confirmation h3 { color: var(--text-primary); margin-bottom: 1rem; }
              .delete-confirmation p { color: var(--text-secondary); margin-bottom: 1rem; }
              .warning-text { color: #ef4444; font-weight: 500; }
              .project-info { background: var(--bg-secondary); padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; text-align: left; }
              .info-item { margin-bottom: 0.5rem; }
              .confirmation-actions { display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; }
              .btn-danger { background: #ef4444; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: 600; }
              .btn-danger:hover { background: #dc2626; }
              </style>
          `;

      window.Components.showModal("Delete Project", modalContent, {
        showCloseButton: false,
        backdrop: true,
        keyboard: true,
      });

      // Add event listeners
      setTimeout(() => {
        const cancelBtn = document.getElementById("cancel-delete");
        const confirmBtn = document.getElementById("confirm-delete");

        if (cancelBtn) {
          cancelBtn.addEventListener("click", () => {
            window.Components.closeModal();
            resolve(false);
          });
        }

        if (confirmBtn) {
          confirmBtn.addEventListener("click", () => {
            window.Components.closeModal();
            resolve(true);
          });
        }
      }, 100);
    });
  },

  // ==================
  // UTILITY METHODS
  // ==================

  calculateProgress(project) {
    if (!project.totalFibers || project.totalFibers === 0) return 0;
    return Math.round(((project.configuredFibers || 0) / project.totalFibers) * 100);
  },

  getStatusLabel(status) {
    const labels = {
      draft: "Draft",
      "excel-uploaded": "File Uploaded",
      "excel-processed": "Data Processed",
      "in-progress": "In Progress",
      completed: "Completed",
    };
    return labels[status] || "Unknown";
  },

  clearFilters() {
    document.getElementById("project-search").value = "";
    document.getElementById("project-filter").value = "all";
    this.filterStatus = "all";
    this.filteredProjects = [...this.projects];
    this.applySorting();
    this.renderProjects();
  },

  async refresh() {
    console.log("🔄 Refreshing projects...");
    await this.loadProjects();
  },

  showError(message) {
    if (window.Components && window.Components.showToast) {
      window.Components.showToast("error", "Projects Error", message);
    }
  },
};

console.log("📁 Projects module loaded successfully");
