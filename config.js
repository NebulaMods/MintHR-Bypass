const fs = require("fs");
const { configFilePath, DEFAULT_CONFIG } = require("./vars");

let currentConfig = { ...DEFAULT_CONFIG };

module.exports = function ({ loggerService, emailService }) {
  function _initializeServices() {
    if (currentConfig.emailService) {
      emailService.setupTransporter({
        service: currentConfig.emailService,
        email: currentConfig.email,
        password: currentConfig.emailPass,
        smtpHost: currentConfig.smtpHost,
        smtpPort: currentConfig.smtpPort,
      });

      loggerService.setupLogger(
        currentConfig.email,
        currentConfig.recipientEmail
      );
    }
  }

  function _loadFromFile() {
    if (fs.existsSync(configFilePath)) {
      return JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
    }
    return null;
  }

  function _saveToFile(cfg) {
    fs.writeFileSync(configFilePath, JSON.stringify(cfg));
  }

  // Public functions
  function applyConfig(cfg) {
    currentConfig = { ...currentConfig, ...cfg };
    _initializeServices();
  }

  function loadConfig() {
    try {
      const cfgFromFile = _loadFromFile();
      if (cfgFromFile) {
        applyConfig(cfgFromFile);
        return cfgFromFile;
      }
      return null;
    } catch (error) {
      loggerService.handleError(error, false);
      return error;
    }
  }

  function saveConfig(cfg) {
    try {
      _saveToFile(cfg);
    } catch (error) {
      loggerService.handleError(error, false);
    }
  }

  function isValidConfig(cfg) {
    if (!cfg) return false;

    const requiredFields = ["userName", "password", "preferredTime"];
    return requiredFields.every((field) => cfg[field]);
  }

  function getConfig() {
    return { ...currentConfig };
  }

  return {
    applyConfig,
    loadConfig,
    saveConfig,
    isValidConfig,
    getConfig,
  };
};
