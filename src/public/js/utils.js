/**
 * 🛠️ UTILITY FUNCTIONS
 * Common helper functions used throughout the application
 */

window.Utils = {
  // ==================
  // DOM UTILITIES
  // ==================

  /**
   * Safely query an element
   */
  $(selector) {
    return document.querySelector(selector);
  },

  /**
   * Safely query multiple elements
   */
  $$(selector) {
    return document.querySelectorAll(selector);
  },

  /**
   * Create element with properties
   */
  createElement(tag, props = {}, children = []) {
    const element = document.createElement(tag);

    // Set properties
    Object.entries(props).forEach(([key, value]) => {
      if (key === "className") {
        element.className = value;
      } else if (key === "innerHTML") {
        element.innerHTML = value;
      } else if (key.startsWith("on") && typeof value === "function") {
        element.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        element.setAttribute(key, value);
      }
    });

    // Add children
    children.forEach((child) => {
      if (typeof child === "string") {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    });

    return element;
  },

  /**
   * Add animation class and remove after completion
   */
  animate(element, animationClass, callback) {
    if (!element) return;

    element.classList.add("animate__animated", animationClass);

    const handleAnimationEnd = () => {
      element.classList.remove("animate__animated", animationClass);
      element.removeEventListener("animationend", handleAnimationEnd);
      if (callback) callback();
    };

    element.addEventListener("animationend", handleAnimationEnd);
  },

  /**
   * Smooth scroll to element
   */
  scrollTo(element, offset = 0) {
    if (!element) return;

    const top = element.offsetTop - offset;
    window.scrollTo({
      top,
      behavior: "smooth",
    });
  },

  // ==================
  // STRING UTILITIES
  // ==================

  /**
   * Capitalize first letter
   */
  capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * Convert to kebab-case
   */
  kebabCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase();
  },

  /**
   * Convert to camelCase
   */
  camelCase(str) {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, "");
  },

  /**
   * Truncate string with ellipsis
   */
  truncate(str, length = 50) {
    if (!str || str.length <= length) return str;
    return str.substring(0, length) + "...";
  },

  /**
   * Generate random ID
   */
  generateId(prefix = "id") {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // ==================
  // DATE UTILITIES
  // ==================

  /**
   * Format date for display
   */
  formatDate(date, options = {}) {
    if (!date) return "";

    const d = new Date(date);
    const defaultOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };

    return d.toLocaleDateString("en-US", { ...defaultOptions, ...options });
  },

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  getRelativeTime(date) {
    if (!date) return "";

    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return this.formatDate(date, { year: "numeric", month: "short", day: "numeric" });
  },

  // ==================
  // NUMBER UTILITIES
  // ==================

  /**
   * Format number with commas
   */
  formatNumber(num) {
    if (num == null) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },

  /**
   * Format percentage
   */
  formatPercentage(num, decimals = 0) {
    if (num == null) return "0%";
    return `${num.toFixed(decimals)}%`;
  },

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  /**
   * Clamp number between min and max
   */
  clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  },

  // ==================
  // ARRAY UTILITIES
  // ==================

  /**
   * Group array by key
   */
  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  },

  /**
   * Sort array by key
   */
  sortBy(array, key, direction = "asc") {
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (direction === "desc") {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    });
  },

  /**
   * Remove duplicates from array
   */
  unique(array, key) {
    if (!key) return [...new Set(array)];

    const seen = new Set();
    return array.filter((item) => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  },

  // ==================
  // OBJECT UTILITIES
  // ==================

  /**
   * Deep clone object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map((item) => this.deepClone(item));
    if (typeof obj === "object") {
      const cloned = {};
      Object.keys(obj).forEach((key) => {
        cloned[key] = this.deepClone(obj[key]);
      });
      return cloned;
    }
  },

  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  },

  /**
   * Get nested object value safely
   */
  get(obj, path, defaultValue = null) {
    const keys = path.split(".");
    let result = obj;

    for (const key of keys) {
      if (result == null || typeof result !== "object") {
        return defaultValue;
      }
      result = result[key];
    }

    return result !== undefined ? result : defaultValue;
  },

  // ==================
  // VALIDATION UTILITIES
  // ==================

  /**
   * Validate email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate project reference
   */
  isValidProjectReference(ref) {
    // Allow alphanumeric, hyphens, underscores
    const refRegex = /^[a-zA-Z0-9_-]+$/;
    return ref && ref.length >= 3 && ref.length <= 50 && refRegex.test(ref);
  },

  /**
   * Validate file extension
   */
  isValidExcelFile(filename) {
    const excelExtensions = [".xlsx", ".xls"];
    return excelExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
  },

  // ==================
  // STORAGE UTILITIES
  // ==================

  /**
   * Local storage with JSON support
   */
  storage: {
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error("Error saving to localStorage:", error);
        return false;
      }
    },

    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.error("Error reading from localStorage:", error);
        return defaultValue;
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error("Error removing from localStorage:", error);
        return false;
      }
    },

    clear() {
      try {
        localStorage.clear();
        return true;
      } catch (error) {
        console.error("Error clearing localStorage:", error);
        return false;
      }
    },
  },

  // ==================
  // ASYNC UTILITIES
  // ==================

  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function
   */
  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Sleep/delay function
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * Retry function with exponential backoff
   */
  async retry(fn, retries = 3, delay = 1000) {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        await this.sleep(delay);
        return this.retry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  },

  // ==================
  // EVENT UTILITIES
  // ==================

  /**
   * Custom event emitter
   */
  createEventEmitter() {
    const events = {};

    return {
      on(event, callback) {
        if (!events[event]) events[event] = [];
        events[event].push(callback);
      },

      off(event, callback) {
        if (events[event]) {
          events[event] = events[event].filter((cb) => cb !== callback);
        }
      },

      emit(event, data) {
        if (events[event]) {
          events[event].forEach((callback) => callback(data));
        }
      },

      once(event, callback) {
        const onceCallback = (data) => {
          callback(data);
          this.off(event, onceCallback);
        };
        this.on(event, onceCallback);
      },
    };
  },

  // ==================
  // COLOR UTILITIES
  // ==================

  /**
   * Get fiber status color
   */
  getFiberStatusColor(status) {
    switch (status) {
      case "available":
        return "#22c55e";
      case "occupied":
        return "#ef4444";
      case "not-configured":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  },

  /**
   * Get project status color
   */
  getProjectStatusColor(status) {
    switch (status) {
      case "completed":
        return "#22c55e";
      case "in-progress":
        return "#f97316";
      case "excel-processed":
        return "#3b82f6";
      case "excel-uploaded":
        return "#f59e0b";
      case "draft":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  },

  // ==================
  // PERFORMANCE UTILITIES
  // ==================

  /**
   * Measure execution time
   */
  measureTime(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
  },

  /**
   * Check if device has touch support
   */
  isTouchDevice() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  },

  /**
   * Check if browser supports certain features
   */
  browserSupport: {
    webSpeech: "webkitSpeechRecognition" in window || "SpeechRecognition" in window,
    fileApi: "FileReader" in window,
    localStorage: (() => {
      try {
        localStorage.setItem("test", "test");
        localStorage.removeItem("test");
        return true;
      } catch {
        return false;
      }
    })(),
  },
};

console.log("🛠️ Utils module loaded successfully");
