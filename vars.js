const configFilePath = "config.json";
const loginUrl = "https://[REPLACE_ME].minthrm.com/Site";
const attendanceUrl = "https://[REPLACE_ME].minthrm.com/SiteMain";
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
  loginUrl,
  attendanceUrl,
  attendanceFilePath,
  logFilePath,
  DEFAULT_CONFIG,
};
