// Quick test script for our Optical Fiber Manager backend
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const path = require("path");

const BASE_URL = "http://localhost:3000";

class BackendTester {
  constructor() {
    this.testResults = [];
    this.projectId = null;
  }

  async runAllTests() {
    console.log("\n🧪 ===============================");
    console.log("🔥 BACKEND TESTING STARTED! 🔥");
    console.log("===============================\n");

    try {
      await this.testHealthCheck();
      await this.testCreateProject();
      await this.testGetAllProjects();
      await this.testGetSpecificProject();
      // await this.testFileUpload(); // Uncomment when you have an Excel file to test
      await this.testUpdateProject();

      this.showResults();
    } catch (error) {
      console.error("❌ Test suite failed:", error.message);

      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
    }
  }

  async testHealthCheck() {
    console.log("🏥 Testing health check...");

    try {
      const response = await axios.get(`${BASE_URL}/api/health`);

      if (response.status === 200 && response.data.status === "healthy") {
        this.logSuccess("Health check", "Server is healthy and responsive");
      } else {
        this.logError("Health check", "Unexpected response format");
      }
    } catch (error) {
      this.logError("Health check", `Server not responding: ${error.message}`);
      throw error; // Stop tests if server is down
    }
  }

  async testCreateProject() {
    console.log("📁 Testing project creation...");

    try {
      const projectData = {
        reference: "TEST-PROJ-001",
        name: "Test Project for Fiber Management",
      };

      const response = await axios.post(`${BASE_URL}/api/projects`, projectData);

      if (response.status === 201 && response.data.success) {
        this.projectId = response.data.project.name; // Use sanitized name as ID
        this.logSuccess("Create project", `Project created with ID: ${this.projectId}`);
      } else {
        this.logError("Create project", "Project creation failed");
      }
    } catch (error) {
      this.logError("Create project", error.response?.data?.error || error.message);
    }
  }

  async testGetAllProjects() {
    console.log("📋 Testing get all projects...");

    try {
      const response = await axios.get(`${BASE_URL}/api/projects`);

      if (response.status === 200 && response.data.success && Array.isArray(response.data.projects)) {
        this.logSuccess("Get all projects", `Found ${response.data.projects.length} projects`);

        // Show project details
        response.data.projects.forEach((project) => {
          console.log(`   📄 ${project.name} (${project.reference}) - ${project.status}`);
        });
      } else {
        this.logError("Get all projects", "Unexpected response format");
      }
    } catch (error) {
      this.logError("Get all projects", error.response?.data?.error || error.message);
    }
  }

  async testGetSpecificProject() {
    if (!this.projectId) {
      this.logError("Get specific project", "No project ID available");
      return;
    }

    console.log("🔍 Testing get specific project...");

    try {
      const response = await axios.get(`${BASE_URL}/api/projects/${this.projectId}`);

      if (response.status === 200 && response.data.success) {
        this.logSuccess("Get specific project", `Retrieved project: ${response.data.project.name}`);
      } else {
        this.logError("Get specific project", "Project retrieval failed");
      }
    } catch (error) {
      this.logError("Get specific project", error.response?.data?.error || error.message);
    }
  }

  async testFileUpload() {
    if (!this.projectId) {
      this.logError("File upload", "No project ID available");
      return;
    }

    console.log("📤 Testing file upload...");

    try {
      // Check if test Excel file exists
      const testFile = "./test-file.xlsx"; // You can create a dummy Excel file

      if (!fs.existsSync(testFile)) {
        this.logError("File upload", "Test Excel file not found. Create test-file.xlsx to test uploads.");
        return;
      }

      const form = new FormData();
      form.append("excelFile", fs.createReadStream(testFile));

      const response = await axios.post(`${BASE_URL}/api/upload/${this.projectId}`, form, {
        headers: {
          ...form.getHeaders(),
        },
      });

      if (response.status === 200 && response.data.success) {
        this.logSuccess("File upload", `File uploaded: ${response.data.file.originalName}`);

        // Test Excel processing
        await this.testExcelProcessing();
      } else {
        this.logError("File upload", "File upload failed");
      }
    } catch (error) {
      this.logError("File upload", error.response?.data?.error || error.message);
    }
  }

  async testExcelProcessing() {
    console.log("📊 Testing Excel processing...");

    try {
      const response = await axios.post(`${BASE_URL}/api/excel/${this.projectId}/process`);

      if (response.status === 200 && response.data.success) {
        this.logSuccess("Excel processing", `Processed ${response.data.stats.totalFibers} fibers`);
        console.log(`   📈 Stats: ${JSON.stringify(response.data.stats, null, 2)}`);
      } else {
        this.logError("Excel processing", "Excel processing failed");
      }
    } catch (error) {
      this.logError("Excel processing", error.response?.data?.error || error.message);
    }
  }

  async testUpdateProject() {
    if (!this.projectId) {
      this.logError("Update project", "No project ID available");
      return;
    }

    console.log("✏️  Testing project update...");

    try {
      const updateData = {
        status: "testing-complete",
        progress: {
          currentTiroir: "T1",
          currentModule: "A",
        },
      };

      const response = await axios.put(`${BASE_URL}/api/projects/${this.projectId}`, updateData);

      if (response.status === 200 && response.data.success) {
        this.logSuccess("Update project", "Project updated successfully");
      } else {
        this.logError("Update project", "Project update failed");
      }
    } catch (error) {
      this.logError("Update project", error.response?.data?.error || error.message);
    }
  }

  logSuccess(test, message) {
    console.log(`✅ ${test}: ${message}`);
    this.testResults.push({ test, status: "PASS", message });
  }

  logError(test, message) {
    console.log(`❌ ${test}: ${message}`);
    this.testResults.push({ test, status: "FAIL", message });
  }

  showResults() {
    console.log("\n📊 ===============================");
    console.log("🎯 TEST RESULTS SUMMARY");
    console.log("===============================");

    const passed = this.testResults.filter((r) => r.status === "PASS").length;
    const failed = this.testResults.filter((r) => r.status === "FAIL").length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / this.testResults.length) * 100)}%`);

    if (failed > 0) {
      console.log("\n🔍 Failed Tests:");
      this.testResults.filter((r) => r.status === "FAIL").forEach((r) => console.log(`   ❌ ${r.test}: ${r.message}`));
    }

    console.log("\n🚀 Testing complete! Your backend is ready to rock!");

    if (this.projectId) {
      console.log(`\n🗑️  To clean up, you can delete the test project:`);
      console.log(`curl -X DELETE ${BASE_URL}/api/projects/${this.projectId}`);
    }
  }
}

// Run the tests
async function runTests() {
  const tester = new BackendTester();
  await tester.runAllTests();
}

// Check if server is running first
console.log("🔍 Checking if server is running...");
console.log("💡 Make sure to start your server first with: npm start");
console.log("⏳ Starting tests in 3 seconds...\n");

setTimeout(runTests, 3000);

module.exports = BackendTester;
