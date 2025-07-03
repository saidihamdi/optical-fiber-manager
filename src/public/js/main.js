/**
 * 🚀 OPTICAL FIBER MANAGER - MAIN APPLICATION
 * Entry point for the application
 */

class OpticalFiberApp {
  constructor() {
    this.currentPage = "dashboard";
    this.isLoading = true;
    this.theme = localStorage.getItem("theme") || "light";

    this.init();
  }

  async init() {
    console.log("🚀 Initializing Optical Fiber Manager...");

    try {
      // Set initial theme
      this.setTheme(this.theme);

      // Initialize all modules
      await this.initializeModules();

      // Setup event listeners
      this.setupEventListeners();

      // Load initial data
      await this.loadInitialData();

      // Hide loading screen and show app
      this.hideLoadingScreen();

      console.log("✅ Application initialized successfully!");
    } catch (error) {
      console.error("❌ Failed to initialize application:", error);
      this.showError("Failed to initialize application. Please refresh the page.");
    }
  }

  async initializeModules() {
    console.log("🔧 Initializing modules...");

    // Initialize API
    if (window.API) {
      await window.API.init();
    }

    // Initialize navigation
    if (window.Navigation) {
      window.Navigation.init();
    }

    // Initialize dashboard
    if (window.Dashboard) {
      window.Dashboard.init();
    }

    // Initialize projects
    if (window.Projects) {
      window.Projects.init();
    }

    // Initialize voice recognition
    if (window.Voice) {
      window.Voice.init();
    }

    // Initialize components
    if (window.Components) {
      window.Components.init();
    }
  }

  setupEventListeners() {
    console.log("🎧 Setting up event listeners...");

    // Theme toggle
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => this.toggleTheme());
    }

    // Notifications
    const notifications = document.getElementById("notifications");
    if (notifications) {
      notifications.addEventListener("click", () => this.showNotifications());
    }

    // Voice FAB
    const voiceFab = document.getElementById("voice-fab");
    if (voiceFab) {
      voiceFab.addEventListener("click", () => this.toggleVoiceRecognition());
    }

    // Refresh projects
    const refreshBtn = document.getElementById("refresh-projects");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.refreshProjects());
    }

    // Global keyboard shortcuts
    document.addEventListener("keydown", (e) => this.handleKeyboardShortcuts(e));

    // Window events
    window.addEventListener("beforeunload", () => this.cleanup());
    window.addEventListener("online", () => this.handleOnline());
    window.addEventListener("offline", () => this.handleOffline());
  }

  async loadInitialData() {
    console.log("📊 Loading initial data...");

    try {
      // Load dashboard data
      if (window.Dashboard && window.Dashboard.loadData) {
        await window.Dashboard.loadData();
      }

      // Load projects
      if (window.Projects && window.Projects.loadProjects) {
        await window.Projects.loadProjects();
      }
    } catch (error) {
      console.error("❌ Error loading initial data:", error);
      // Don't throw - app can still work without initial data
    }
  }

  hideLoadingScreen() {
    console.log("🎭 Hiding loading screen...");

    const loadingScreen = document.getElementById("loading-screen");
    const app = document.getElementById("app");

    if (loadingScreen && app) {
      // Add exit animation
      loadingScreen.classList.add("animate__fadeOut");

      setTimeout(() => {
        loadingScreen.style.display = "none";
        app.style.display = "flex";
        app.classList.add("animate__fadeIn");
        this.isLoading = false;

        // Trigger page entrance animation
        this.animatePageEntrance();
      }, 500);
    }
  }

  animatePageEntrance() {
    const activePage = document.querySelector(".page-content.active");
    if (activePage) {
      activePage.classList.add("animate__animated", "animate__fadeInUp");
    }

    // Animate stats cards with stagger
    const statsCards = document.querySelectorAll(".stat-card");
    statsCards.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add("animate__animated", "animate__fadeInUp");
      }, index * 100);
    });
  }

  setTheme(theme) {
    console.log(`🎨 Setting theme to: ${theme}`);

    document.documentElement.setAttribute("data-theme", theme);
    this.theme = theme;
    localStorage.setItem("theme", theme);

    // Update theme toggle icon
    const themeIcon = document.querySelector("#theme-toggle i");
    if (themeIcon) {
      themeIcon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
    }
  }

  toggleTheme() {
    const newTheme = this.theme === "light" ? "dark" : "light";
    this.setTheme(newTheme);

    // Show toast notification
    this.showToast("success", "Theme Changed", `Switched to ${newTheme} theme`);
  }

  showNotifications() {
    console.log("🔔 Showing notifications...");

    // Create simple notifications modal
    const notifications = [
      {
        title: "Welcome!",
        message: "Your Optical Fiber Manager is ready to use.",
        time: "2 minutes ago",
        type: "info",
      },
      {
        title: "System Update",
        message: "All components are up to date.",
        time: "1 hour ago",
        type: "success",
      },
      {
        title: "Backup Reminder",
        message: "Consider backing up your project data.",
        time: "3 hours ago",
        type: "warning",
      },
    ];

    if (window.Components && window.Components.showModal) {
      window.Components.showModal("Notifications", this.createNotificationsHTML(notifications));
    }
  }

  createNotificationsHTML(notifications) {
    return `
            <div class="notifications-list">
                ${notifications
                  .map(
                    (notif) => `
                    <div class="notification-item ${notif.type}">
                        <div class="notification-content">
                            <h4>${notif.title}</h4>
                            <p>${notif.message}</p>
                            <small>${notif.time}</small>
                        </div>
                        <i class="fas fa-${this.getNotificationIcon(notif.type)}"></i>
                    </div>
                `
                  )
                  .join("")}
            </div>
            <style>
                .notifications-list { max-height: 400px; overflow-y: auto; }
                .notification-item { 
                    display: flex; 
                    padding: 1rem; 
                    border-bottom: 1px solid var(--border-color);
                    gap: 1rem;
                }
                .notification-content { flex: 1; }
                .notification-content h4 { margin: 0 0 0.5rem 0; color: var(--text-primary); }
                .notification-content p { margin: 0 0 0.5rem 0; color: var(--text-secondary); }
                .notification-content small { color: var(--text-secondary); opacity: 0.7; }
                .notification-item i { font-size: 1.25rem; margin-top: 0.25rem; }
                .notification-item.success i { color: var(--fiber-green); }
                .notification-item.warning i { color: var(--fiber-yellow); }
                .notification-item.info i { color: var(--primary-500); }
            </style>
        `;
  }

  getNotificationIcon(type) {
    switch (type) {
      case "success":
        return "check-circle";
      case "warning":
        return "exclamation-triangle";
      case "error":
        return "times-circle";
      default:
        return "info-circle";
    }
  }

  toggleVoiceRecognition() {
    console.log("🎤 Toggling voice recognition...");

    if (window.Voice && window.Voice.toggle) {
      window.Voice.toggle();
    } else {
      this.showToast("info", "Voice Recognition", "Voice recognition will be available when configuring fibers");
    }
  }

  async refreshProjects() {
    console.log("🔄 Refreshing projects...");

    const refreshBtn = document.getElementById("refresh-projects");
    if (refreshBtn) {
      const originalHTML = refreshBtn.innerHTML;
      refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
      refreshBtn.disabled = true;
    }

    try {
      if (window.Projects && window.Projects.loadProjects) {
        await window.Projects.loadProjects();
      }

      if (window.Dashboard && window.Dashboard.loadData) {
        await window.Dashboard.loadData();
      }

      this.showToast("success", "Refreshed", "Projects data updated successfully");
    } catch (error) {
      console.error("❌ Error refreshing projects:", error);
      this.showToast("error", "Error", "Failed to refresh projects data");
    } finally {
      if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        refreshBtn.disabled = false;
      }
    }
  }

  handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "1":
          e.preventDefault();
          if (window.Navigation) window.Navigation.showPage("dashboard");
          break;
        case "2":
          e.preventDefault();
          if (window.Navigation) window.Navigation.showPage("projects");
          break;
        case "3":
          e.preventDefault();
          if (window.Navigation) window.Navigation.showPage("create");
          break;
        case "d":
          e.preventDefault();
          this.toggleTheme();
          break;
        case "r":
          e.preventDefault();
          this.refreshProjects();
          break;
      }
    }

    // Escape key
    if (e.key === "Escape") {
      // Close modals
      if (window.Components && window.Components.closeModal) {
        window.Components.closeModal();
      }
    }
  }

  handleOnline() {
    console.log("🌐 Connection restored");
    this.showToast("success", "Online", "Connection restored");
  }

  handleOffline() {
    console.log("📡 Connection lost");
    this.showToast("warning", "Offline", "Working in offline mode");
  }

  showToast(type, title, message) {
    if (window.Components && window.Components.showToast) {
      window.Components.showToast(type, title, message);
    } else {
      console.log(`${type.toUpperCase()}: ${title} - ${message}`);
    }
  }

  showError(message) {
    this.showToast("error", "Error", message);
  }

  cleanup() {
    console.log("🧹 Cleaning up application...");

    // Save any pending data
    if (window.Projects && window.Projects.saveAll) {
      window.Projects.saveAll();
    }

    // Stop voice recognition
    if (window.Voice && window.Voice.stop) {
      window.Voice.stop();
    }
  }
}

// Initialize application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("🎬 DOM loaded, starting application...");
  window.App = new OpticalFiberApp();
});

// Global error handler
window.addEventListener("error", (e) => {
  console.error("💥 Global error:", e.error);
  if (window.App) {
    window.App.showError("An unexpected error occurred. Please refresh the page.");
  }
});

// Global unhandled promise rejection handler
window.addEventListener("unhandledrejection", (e) => {
  console.error("💥 Unhandled promise rejection:", e.reason);
  if (window.App) {
    window.App.showError("An unexpected error occurred. Please refresh the page.");
  }
});
