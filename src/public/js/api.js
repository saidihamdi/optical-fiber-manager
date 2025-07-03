/**
 * 🌐 API MODULE
 * Handles all communication with the backend server
 */

window.API = {
  baseURL: window.location.origin,

  // ==================
  // INITIALIZATION
  // ==================

  async init() {
    console.log("🌐 Initializing API module...");

    // Test server connection
    try {
      await this.healthCheck();
      console.log("✅ Server connection established");
    } catch (error) {
      console.error("❌ Server connection failed:", error);
      throw new Error("Cannot connect to server");
    }
  },

  // ==================
  // CORE HTTP METHODS
  // ==================

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`📡 ${config.method || "GET"} ${endpoint}`);

      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ ${config.method || "GET"} ${endpoint} - Success`);
      return data;
    } catch (error) {
      console.error(`❌ ${config.method || "GET"} ${endpoint} - Error:`, error);
      throw error;
    }
  },

  async get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  },

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  },

  async uploadFile(endpoint, formData) {
    const url = `${this.baseURL}${endpoint}`;

    try {
      console.log(`📤 UPLOAD ${endpoint}`);

      const response = await fetch(url, {
        method: "POST",
        body: formData, // Don't set Content-Type for FormData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ UPLOAD ${endpoint} - Success`);
      return data;
    } catch (error) {
      console.error(`❌ UPLOAD ${endpoint} - Error:`, error);
      throw error;
    }
  },

  // ==================
  // HEALTH CHECK
  // ==================

  async healthCheck() {
    return this.get("/api/health");
  },

  // ==================
  // PROJECT ENDPOINTS
  // ==================

  projects: {
    // Get all projects
    async getAll() {
      return window.API.get("/api/projects");
    },

    // Get specific project
    async get(projectId) {
      return window.API.get(`/api/projects/${encodeURIComponent(projectId)}`);
    },

    // Create new project
    async create(projectData) {
      return window.API.post("/api/projects", projectData);
    },

    // Update project
    async update(projectId, updateData) {
      return window.API.put(`/api/projects/${encodeURIComponent(projectId)}`, updateData);
    },

    // Delete project
    async delete(projectId) {
      return window.API.delete(`/api/projects/${encodeURIComponent(projectId)}`);
    },
  },

  // ==================
  // FILE UPLOAD ENDPOINTS
  // ==================

  upload: {
    // Upload Excel file
    async excel(projectId, file) {
      const formData = new FormData();
      formData.append("excelFile", file);

      return window.API.uploadFile(`/api/upload/${encodeURIComponent(projectId)}`, formData);
    },

    // Get upload status
    async getStatus(projectId) {
      return window.API.get(`/api/upload/${encodeURIComponent(projectId)}/status`);
    },

    // Delete uploaded file
    async deleteFile(projectId) {
      return window.API.delete(`/api/upload/${encodeURIComponent(projectId)}/file`);
    },
  },

  // ==================
  // EXCEL PROCESSING ENDPOINTS
  // ==================

  excel: {
    // Process uploaded Excel file
    async process(projectId) {
      return window.API.post(`/api/excel/${encodeURIComponent(projectId)}/process`);
    },

    // Get processed Excel data
    async getData(projectId) {
      return window.API.get(`/api/excel/${encodeURIComponent(projectId)}/data`);
    },
  },

  // ==================
  // UTILITY METHODS
  // ==================

  /**
   * Validate project data before sending
   */
  validateProjectData(projectData) {
    const errors = [];

    if (!projectData.name || projectData.name.trim().length < 3) {
      errors.push("Project name must be at least 3 characters long");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate Excel file before upload
   */
  validateExcelFile(file) {
    const errors = [];

    if (!file) {
      errors.push("No file selected");
      return { valid: false, errors };
    }

    if (!window.Utils.isValidExcelFile(file.name)) {
      errors.push("File must be an Excel file (.xlsx or .xls)");
    }

    if (file.size > 50 * 1024 * 1024) {
      // 50MB
      errors.push("File size must be less than 50MB");
    }

    if (file.size === 0) {
      errors.push("File appears to be empty");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Format API errors for display
   */
  formatError(error) {
    if (typeof error === "string") {
      return error;
    }

    if (error.message) {
      return error.message;
    }

    return "An unexpected error occurred";
  },
};

console.log("🌐 API module loaded successfully");
