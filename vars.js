const configFilePath = "config.json";
const url = "https://[REPLACE_ME].minthrm.com";
const attendanceFilePath = "attendance-log.txt";
const logFilePath = "log.txt";

const DEFAULT_CONFIG = {
  userName: "",
  password: "",
  emailService: null,
  email: null,
  emailPass: null,
  smtpHost: null,
  smtpPort: null,
  recipientEmail: null,
  preferredTime: null,
};

module.exports = {
  configFilePath,
  url,
  attendanceFilePath,
  logFilePath,
  DEFAULT_CONFIG,
};
