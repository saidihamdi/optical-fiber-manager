/**
 * 🎤 VOICE RECOGNITION MODULE
 * Handles French voice recognition for fiber configuration
 */

window.Voice = {
  recognition: null,
  isListening: false,
  isSupported: false,

  // ==================
  // INITIALIZATION
  // ==================

  init() {
    console.log("🎤 Initializing voice recognition...");

    this.checkSupport();
    this.setupRecognition();

    console.log(`✅ Voice recognition ${this.isSupported ? "supported" : "not supported"}`);
  },

  checkSupport() {
    this.isSupported = "webkitSpeechRecognition" in window || "SpeechRecognition" in window;

    if (!this.isSupported) {
      console.warn("⚠️ Speech recognition not supported in this browser");
    }
  },

  setupRecognition() {
    if (!this.isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // Configure recognition
    this.recognition.lang = "fr-FR"; // French language
    this.recognition.continuous = false; // Stop after each result
    this.recognition.interimResults = false; // Only final results
  },

  // ==================
  // VOICE CONTROL
  // ==================

  toggle() {
    if (this.isListening) {
      this.stop();
      return false;
    } else {
      return this.start();
    }
  },

  start() {
    if (!this.isSupported) {
      this.showUnsupportedMessage();
      return false;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      this.updateUI();
      return true;
    } catch (error) {
      console.error("❌ Failed to start voice recognition:", error);
      return false;
    }
  },

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.updateUI();
    }
  },

  // ==================
  // UI UPDATES
  // ==================

  updateUI() {
    const voiceFab = document.getElementById("voice-fab");
    if (voiceFab) {
      if (this.isListening) {
        voiceFab.classList.add("active");
        voiceFab.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        voiceFab.title = "Arrêter reconnaissance vocale";
      } else {
        voiceFab.classList.remove("active");
        voiceFab.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceFab.title = "Démarrer reconnaissance vocale";
      }
    }
  },

  showUnsupportedMessage() {
    if (window.Components) {
      window.Components.showToast("warning", "Not Supported", "Voice recognition is not supported in this browser.");
    }
  },
};

console.log("🎤 Voice recognition module loaded successfully");
