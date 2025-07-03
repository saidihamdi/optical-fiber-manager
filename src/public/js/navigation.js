/**
 * 🧭 NAVIGATION MODULE
 * Handles page navigation and routing
 */

window.Navigation = {
  currentPage: "dashboard",
  pages: ["dashboard", "projects", "create", "configure", "about"],

  // ==================
  // INITIALIZATION
  // ==================

  init() {
    console.log("🧭 Initializing navigation...");

    this.setupEventListeners();
    this.initializeRouting();

    console.log("✅ Navigation initialized");
  },

  setupEventListeners() {
    // Navigation menu items
    const navItems = document.querySelectorAll(".nav-item[data-page]");
    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        const page = e.currentTarget.getAttribute("data-page");
        this.showPage(page);
      });
    });

    // Browser back/forward buttons
    window.addEventListener("popstate", (e) => {
      const page = e.state?.page || "dashboard";
      this.showPage(page, false); // Don't push to history
    });
  },

  initializeRouting() {
    // Check URL hash for initial page
    const hash = window.location.hash.slice(1);
    if (hash && this.pages.includes(hash)) {
      this.showPage(hash, false);
    } else {
      this.showPage("dashboard", false);
    }
  },

  // ==================
  // PAGE NAVIGATION
  // ==================

  showPage(pageId, pushToHistory = true) {
    if (!this.pages.includes(pageId)) {
      console.error(`❌ Invalid page: ${pageId}`);
      return false;
    }

    console.log(`📄 Navigating to: ${pageId}`);

    // Don't navigate if already on the same page
    if (this.currentPage === pageId) {
      return true;
    }

    // Hide current page
    this.hidePage(this.currentPage);

    // Show new page
    this.displayPage(pageId);

    // Update navigation state
    this.updateNavigation(pageId);

    // Update URL
    if (pushToHistory) {
      this.updateURL(pageId);
    }

    // Update current page
    this.currentPage = pageId;

    // Trigger page-specific initialization
    this.initializePage(pageId);

    return true;
  },

  hidePage(pageId) {
    const currentPageElement = document.getElementById(`${pageId}-page`);
    if (currentPageElement) {
      currentPageElement.classList.remove("active");

      // Add exit animation
      window.Utils.animate(currentPageElement, "animate__fadeOutLeft", () => {
        currentPageElement.style.display = "none";
      });
    }
  },

  displayPage(pageId) {
    const newPageElement = document.getElementById(`${pageId}-page`);
    if (newPageElement) {
      newPageElement.style.display = "block";
      newPageElement.classList.add("active");

      // Add entrance animation
      window.Utils.animate(newPageElement, "animate__fadeInRight");

      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },

  updateNavigation(pageId) {
    // Update nav menu active state
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
      item.classList.remove("active");
      if (item.getAttribute("data-page") === pageId) {
        item.classList.add("active");
      }
    });
  },

  updateURL(pageId) {
    const url = `${window.location.pathname}#${pageId}`;
    window.history.pushState({ page: pageId }, "", url);
  },

  initializePage(pageId) {
    console.log(`🎬 Initializing page: ${pageId}`);

    switch (pageId) {
      case "dashboard":
        if (window.Dashboard && window.Dashboard.refresh) {
          window.Dashboard.refresh();
        }
        break;

      case "projects":
        if (window.Projects && window.Projects.refresh) {
          window.Projects.refresh();
        }
        break;

      case "create":
        this.initializeCreatePage();
        break;

      case "about":
        this.initializeAboutPage();
        break;
    }
  },

  // ==================
  // PAGE SPECIFIC INITIALIZATION
  // ==================

  initializeCreatePage() {
    console.log("🎨 Initializing create project page...");

    const createWizard = document.getElementById("create-wizard");
    if (createWizard && window.Components && window.Components.createProjectWizard) {
      createWizard.innerHTML = "";
      window.Components.createProjectWizard(createWizard);
    }
  },

  initializeAboutPage() {
    console.log("ℹ️ Initializing about page...");

    // Add any about page specific functionality here
    // For example, version checking, system info, etc.

    // Animate feature list
    const featureItems = document.querySelectorAll(".feature-list li");
    featureItems.forEach((item, index) => {
      setTimeout(() => {
        window.Utils.animate(item, "animate__fadeInLeft");
      }, index * 100);
    });

    // Animate tech badges
    const techBadges = document.querySelectorAll(".tech-badge");
    techBadges.forEach((badge, index) => {
      setTimeout(() => {
        window.Utils.animate(badge, "animate__bounceIn");
      }, index * 150 + 500);
    });
  },

  // ==================
  // NAVIGATION UTILITIES
  // ==================

  /**
   * Get current page
   */
  getCurrentPage() {
    return this.currentPage;
  },

  /**
   * Check if on specific page
   */
  isOnPage(pageId) {
    return this.currentPage === pageId;
  },

  /**
   * Go back to previous page
   */
  goBack() {
    window.history.back();
  },

  /**
   * Go forward to next page
   */
  goForward() {
    window.history.forward();
  },

  /**
   * Refresh current page
   */
  refresh() {
    this.initializePage(this.currentPage);
  },

  /**
   * Navigate with confirmation if unsaved changes
   */
  async navigateWithConfirmation(pageId, hasUnsavedChanges = false) {
    if (hasUnsavedChanges) {
      const confirmed = await this.showConfirmationDialog(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to leave this page?",
        "Leave Page",
        "Stay"
      );

      if (!confirmed) {
        return false;
      }
    }

    return this.showPage(pageId);
  },

  /**
   * Show confirmation dialog
   */
  async showConfirmationDialog(title, message, confirmText = "Confirm", cancelText = "Cancel") {
    return new Promise((resolve) => {
      if (window.Components && window.Components.showConfirmModal) {
        window.Components.showConfirmModal(title, message, confirmText, cancelText, resolve);
      } else {
        // Fallback to browser confirm
        resolve(confirm(`${title}\n\n${message}`));
      }
    });
  },

  /**
   * Show loading state for page navigation
   */
  showPageLoading(pageId) {
    const pageElement = document.getElementById(`${pageId}-page`);
    if (pageElement) {
      const loadingHTML = `
                <div class="page-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading ${window.Utils.capitalize(pageId)}...</p>
                </div>
            `;
      pageElement.innerHTML = loadingHTML;
    }
  },

  /**
   * Hide loading state for page
   */
  hidePageLoading(pageId) {
    const loadingElement = document.querySelector(`#${pageId}-page .page-loading`);
    if (loadingElement) {
      loadingElement.remove();
    }
  },

  // ==================
  // BREADCRUMB NAVIGATION
  // ==================

  breadcrumb: {
    stack: [],

    push(pageId, title, data = null) {
      this.stack.push({ pageId, title, data, timestamp: Date.now() });
      this.update();
    },

    pop() {
      if (this.stack.length > 1) {
        const previous = this.stack[this.stack.length - 2];
        this.stack.pop();
        this.update();
        return previous;
      }
      return null;
    },

    clear() {
      this.stack = [];
      this.update();
    },

    update() {
      const breadcrumbContainer = document.getElementById("breadcrumb");
      if (!breadcrumbContainer) return;

      if (this.stack.length <= 1) {
        breadcrumbContainer.style.display = "none";
        return;
      }

      breadcrumbContainer.style.display = "flex";
      breadcrumbContainer.innerHTML = this.stack
        .map((item, index) => {
          const isLast = index === this.stack.length - 1;
          const separator = isLast ? "" : '<i class="fas fa-chevron-right"></i>';

          return `
                        <span class="breadcrumb-item ${isLast ? "active" : "clickable"}" 
                              data-page="${item.pageId}">
                            ${item.title}
                        </span>
                        ${separator}
                    `;
        })
        .join("");

      // Add click handlers for breadcrumb navigation
      const clickableItems = breadcrumbContainer.querySelectorAll(".breadcrumb-item.clickable");
      clickableItems.forEach((item) => {
        item.addEventListener("click", () => {
          const pageId = item.getAttribute("data-page");
          window.Navigation.showPage(pageId);
        });
      });
    },
  },

  // ==================
  // MOBILE NAVIGATION
  // ==================

  mobile: {
    isMenuOpen: false,

    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen;
      const navMenu = document.querySelector(".nav-menu");
      const menuToggle = document.querySelector(".menu-toggle");

      if (navMenu) {
        navMenu.classList.toggle("mobile-open", this.isMenuOpen);
      }

      if (menuToggle) {
        menuToggle.classList.toggle("active", this.isMenuOpen);
      }
    },

    closeMenu() {
      this.isMenuOpen = false;
      const navMenu = document.querySelector(".nav-menu");
      const menuToggle = document.querySelector(".menu-toggle");

      if (navMenu) {
        navMenu.classList.remove("mobile-open");
      }

      if (menuToggle) {
        menuToggle.classList.remove("active");
      }
    },

    init() {
      // Add mobile menu toggle if on mobile
      if (window.innerWidth <= 768) {
        this.addMobileMenuToggle();
      }

      // Close menu when clicking nav items on mobile
      const navItems = document.querySelectorAll(".nav-item");
      navItems.forEach((item) => {
        item.addEventListener("click", () => {
          if (window.innerWidth <= 768) {
            this.closeMenu();
          }
        });
      });

      // Handle window resize
      window.addEventListener("resize", () => {
        if (window.innerWidth > 768) {
          this.closeMenu();
        }
      });
    },

    addMobileMenuToggle() {
      const navContent = document.querySelector(".nav-content");
      if (navContent && !document.querySelector(".menu-toggle")) {
        const toggleButton = window.Utils.createElement("button", {
          className: "menu-toggle",
          innerHTML: '<i class="fas fa-bars"></i>',
          onClick: () => this.toggleMenu(),
        });

        navContent.appendChild(toggleButton);
      }
    },
  },
};

console.log("🧭 Navigation module loaded successfully");
