/**
 * 📊 DASHBOARD MODULE
 * Handles dashboard data and statistics
 */

window.Dashboard = {
  data: {
    totalProjects: 0,
    totalFibers: 0,
    avgProgress: 0,
    recentProjects: [],
  },

  // ==================
  // INITIALIZATION
  // ==================

  init() {
    console.log("📊 Initializing dashboard...");
    this.setupEventListeners();
    console.log("✅ Dashboard initialized");
  },

  setupEventListeners() {
    // Refresh dashboard when becoming visible
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && window.Navigation.getCurrentPage() === "dashboard") {
        this.refresh();
      }
    });
  },

  // ==================
  // DATA LOADING
  // ==================

  async loadData() {
    console.log("📊 Loading dashboard data...");

    try {
      // Load projects data
      const projectsResponse = await window.API.projects.getAll();
      const projects = projectsResponse.projects || [];

      // Calculate statistics
      this.calculateStatistics(projects);

      // Update UI
      this.updateStatistics();
      this.updateRecentProjects(projects.slice(0, 5));

      console.log("✅ Dashboard data loaded successfully");
    } catch (error) {
      console.error("❌ Error loading dashboard data:", error);
      this.showError("Failed to load dashboard data");
    }
  },

  calculateStatistics(projects) {
    this.data.totalProjects = projects.length;

    let totalFibers = 0;
    let totalConfigured = 0;

    projects.forEach((project) => {
      totalFibers += project.totalFibers || 0;
      totalConfigured += project.configuredFibers || 0;
    });

    this.data.totalFibers = totalConfigured;
    this.data.avgProgress = totalFibers > 0 ? Math.round((totalConfigured / totalFibers) * 100) : 0;
    this.data.recentProjects = projects.slice(0, 5);
  },

  // ==================
  // UI UPDATES
  // ==================

  updateStatistics() {
    // Animate numbers counting up
    this.animateCounter("total-projects", this.data.totalProjects);
    this.animateCounter("total-fibers", this.data.totalFibers);
    this.animateCounter("avg-progress", this.data.avgProgress, "%");
  },

  animateCounter(elementId, targetValue, suffix = "") {
    const element = document.getElementById(elementId);
    if (!element) return;

    const startValue = 0;
    const duration = 1000; // 1 second
    const increment = targetValue / (duration / 16); // 60fps
    let currentValue = startValue;

    const counter = () => {
      currentValue += increment;
      if (currentValue >= targetValue) {
        currentValue = targetValue;
        element.textContent = Math.round(currentValue) + suffix;
        return;
      }
      element.textContent = Math.round(currentValue) + suffix;
      requestAnimationFrame(counter);
    };

    counter();
  },

  updateRecentProjects(projects) {
    const container = document.getElementById("recent-projects");
    if (!container) return;

    if (projects.length === 0) {
      container.innerHTML = `
          <div class="empty-state">
              <i class="fas fa-folder-open"></i>
              <h4>No Projects Yet</h4>
              <p>Create your first optical fiber project to get started.</p>
              <button class="btn-primary" id="dashboard-create-project">
                  <i class="fas fa-plus"></i> Create Project
              </button>
          </div>
      `;

      // Add event listener for the create project button
      setTimeout(() => {
        const createBtn = document.getElementById("dashboard-create-project");
        if (createBtn) {
          createBtn.addEventListener("click", () => {
            console.log("🔗 Dashboard: Creating new project");
            window.Navigation.showPage("create");
          });
        }
      }, 100);

      return;
    }

    // Rest of your existing code for when projects exist...
    container.innerHTML = projects
      .map(
        (project, index) => `
          <div class="project-card recent-project animate__animated animate__fadeInUp" 
               style="animation-delay: ${index * 0.1}s;" 
               onclick="window.Dashboard.viewProject('${project.id}')">
              <div class="project-header">
                  <div class="project-info">
                      <h4>${project.name}</h4>
                      <span class="project-reference">${project.reference}</span>
                  </div>
                  <span class="project-status ${project.status}">${this.getStatusLabel(project.status)}</span>
              </div>
              
              <div class="project-progress">
                  <div class="progress-header">
                      <span class="progress-label">Configuration Progress</span>
                      <span class="progress-percentage">${this.calculateProgress(project)}%</span>
                  </div>
                  <div class="progress-bar">
                      <div class="progress-fill" style="width: ${this.calculateProgress(project)}%"></div>
                  </div>
              </div>
              
              <div class="project-meta">
                  <small class="project-date">
                      <i class="fas fa-clock"></i>
                      Updated ${window.Utils.getRelativeTime(project.updatedAt)}
                  </small>
                  <small class="project-fibers">
                      <i class="fas fa-bezier-curve"></i>
                      ${project.totalFibers || 0} fibers
                  </small>
              </div>
          </div>
      `
      )
      .join("");
  },

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

  // ==================
  // ACTIONS
  // ==================

  viewProject(projectId) {
    console.log(`👁️ Viewing project: ${projectId}`);
    // Navigate to project view (to be implemented)
    window.Components.showToast("info", "Coming Soon", "Project viewing functionality will be available soon");
  },

  async refresh() {
    console.log("🔄 Refreshing dashboard...");

    // Show loading state
    this.showLoadingState();

    try {
      await this.loadData();
      this.hideLoadingState();
    } catch (error) {
      this.hideLoadingState();
      this.showError("Failed to refresh dashboard data");
    }
  },

  showLoadingState() {
    // Add loading states to stat cards
    const statNumbers = document.querySelectorAll(".stat-number");
    statNumbers.forEach((el) => {
      el.innerHTML =
        '<div class="loading-dots"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>';
    });

    // Show loading in recent projects
    const recentContainer = document.getElementById("recent-projects");
    if (recentContainer) {
      recentContainer.innerHTML = `
                <div class="loading-projects">
                    <div class="loading-spinner"></div>
                    <p>Loading recent projects...</p>
                </div>
            `;
    }
  },

  hideLoadingState() {
    // Loading state will be cleared when updateStatistics runs
  },

  showError(message) {
    if (window.Components && window.Components.showToast) {
      window.Components.showToast("error", "Dashboard Error", message);
    }
  },

  // ==================
  // DASHBOARD WIDGETS
  // ==================

  /**
   * Add a custom widget to dashboard
   */
  addWidget(widgetConfig) {
    const { id, title, content, position = "bottom" } = widgetConfig;

    const widget = window.Utils.createElement("div", {
      id: `widget-${id}`,
      className: "dashboard-widget animate__animated animate__fadeInUp",
      innerHTML: `
                <div class="widget-header">
                    <h3 class="widget-title">${title}</h3>
                    <button class="widget-close" onclick="window.Dashboard.removeWidget('${id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="widget-content">
                    ${content}
                </div>
            `,
    });

    const dashboardContent = document.querySelector("#dashboard-page");
    if (dashboardContent) {
      if (position === "top") {
        dashboardContent.insertBefore(widget, dashboardContent.firstChild);
      } else {
        dashboardContent.appendChild(widget);
      }
    }
  },

  /**
   * Remove a widget from dashboard
   */
  removeWidget(widgetId) {
    const widget = document.getElementById(`widget-${widgetId}`);
    if (widget) {
      window.Utils.animate(widget, "animate__fadeOut", () => {
        widget.remove();
      });
    }
  },

  // ==================
  // DASHBOARD INSIGHTS
  // ==================

  /**
   * Generate insights based on project data
   */
  generateInsights(projects) {
    const insights = [];

    if (projects.length === 0) {
      insights.push({
        type: "welcome",
        icon: "fa-rocket",
        title: "Welcome to Optical Fiber Manager!",
        message: "Create your first project to start managing your fiber optic installations.",
        action: "Create Project",
        actionCallback: () => window.Navigation.showPage("create"),
      });
      return insights;
    }

    // Progress insights
    const inProgressProjects = projects.filter((p) => p.status === "in-progress").length;
    if (inProgressProjects > 0) {
      insights.push({
        type: "info",
        icon: "fa-tasks",
        title: `${inProgressProjects} Project${inProgressProjects > 1 ? "s" : ""} In Progress`,
        message: "Continue configuring your fiber installations to complete these projects.",
        action: "View Projects",
        actionCallback: () => window.Navigation.showPage("projects"),
      });
    }

    // Completion insights
    const completedProjects = projects.filter((p) => p.status === "completed").length;
    const completionRate = projects.length > 0 ? Math.round((completedProjects / projects.length) * 100) : 0;

    if (completionRate >= 80) {
      insights.push({
        type: "success",
        icon: "fa-trophy",
        title: "Excellent Progress!",
        message: `You've completed ${completionRate}% of your projects. Great work!`,
        action: null,
      });
    } else if (completionRate >= 50) {
      insights.push({
        type: "warning",
        icon: "fa-chart-line",
        title: "Good Progress",
        message: `${completionRate}% of projects completed. Keep up the momentum!`,
        action: null,
      });
    }

    // Draft projects insight
    const draftProjects = projects.filter((p) => p.status === "draft").length;
    if (draftProjects > 2) {
      insights.push({
        type: "warning",
        icon: "fa-exclamation-triangle",
        title: `${draftProjects} Draft Projects`,
        message: "You have several draft projects. Consider uploading Excel files to continue.",
        action: "View Drafts",
        actionCallback: () => {
          window.Navigation.showPage("projects");
          // Set filter to drafts
          setTimeout(() => {
            const filterSelect = document.getElementById("project-filter");
            if (filterSelect) {
              filterSelect.value = "draft";
              filterSelect.dispatchEvent(new Event("change"));
            }
          }, 100);
        },
      });
    }

    return insights;
  },

  /**
   * Display insights on dashboard
   */
  displayInsights(insights) {
    if (insights.length === 0) return;

    const insightsHTML = `
            <div class="dashboard-insights">
                <h3><i class="fas fa-lightbulb"></i> Insights</h3>
                <div class="insights-list">
                    ${insights
                      .map(
                        (insight) => `
                        <div class="insight-item ${insight.type}">
                            <div class="insight-icon">
                                <i class="fas ${insight.icon}"></i>
                            </div>
                            <div class="insight-content">
                                <h4>${insight.title}</h4>
                                <p>${insight.message}</p>
                                ${
                                  insight.action
                                    ? `
                                    <button class="btn-secondary btn-sm" onclick="(${insight.actionCallback.toString()})()">
                                        ${insight.action}
                                    </button>
                                `
                                    : ""
                                }
                            </div>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `;

    // Add insights after stats grid
    const statsGrid = document.querySelector(".stats-grid");
    if (statsGrid) {
      statsGrid.insertAdjacentHTML("afterend", insightsHTML);
    }
  },

  // ==================
  // PERFORMANCE METRICS
  // ==================

  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics(projects) {
    const metrics = {
      avgProjectDuration: 0,
      fibersPerDay: 0,
      efficiency: 0,
      mostActiveDay: null,
    };

    if (projects.length === 0) return metrics;

    // Calculate average project duration
    const completedProjects = projects.filter((p) => p.status === "completed");
    if (completedProjects.length > 0) {
      const totalDuration = completedProjects.reduce((sum, project) => {
        const created = new Date(project.createdAt);
        const updated = new Date(project.updatedAt);
        return sum + (updated - created);
      }, 0);

      metrics.avgProjectDuration = Math.round(totalDuration / completedProjects.length / (1000 * 60 * 60 * 24)); // days
    }

    // Calculate fibers per day (mock calculation)
    const totalConfiguredFibers = projects.reduce((sum, p) => sum + (p.configuredFibers || 0), 0);
    const oldestProject = projects.reduce((oldest, project) => {
      const projectDate = new Date(project.createdAt);
      return projectDate < oldest ? projectDate : oldest;
    }, new Date());

    const daysSinceOldest = Math.max(1, Math.ceil((new Date() - oldestProject) / (1000 * 60 * 60 * 24)));
    metrics.fibersPerDay = Math.round(totalConfiguredFibers / daysSinceOldest);

    // Calculate efficiency (configured vs total)
    const totalFibers = projects.reduce((sum, p) => sum + (p.totalFibers || 0), 0);
    metrics.efficiency = totalFibers > 0 ? Math.round((totalConfiguredFibers / totalFibers) * 100) : 0;

    return metrics;
  },
};

console.log("📊 Dashboard module loaded successfully");
