const { login, question } = require("./utils");

module.exports = function ({
  loggerService,
  configService,
  attendanceService,
}) {
  async function askCredentialsOrUseConfig() {
    const config = configService.getConfig();
    const hasCredentials = config && config.userName && config.password;

    return hasCredentials ? askTime() : askCredentials();
  }

  async function askCredentials() {
    const user = await question("Please enter your username: ");
    const pass = await question("Please enter your password: ");

    const loginResult = await attemptLogin(user, pass);

    if (loginResult) {
      await saveCredentialsIfDesired(user, pass);
      await askTime();
    } else {
      loggerService.handleError(new Error("Login failed."), false);
      await askCredentials();
    }
  }

  async function attemptLogin(user, pass) {
    const result = await login(user, pass);
    return result ? true : false;
  }

  async function saveCredentialsIfDesired(user, pass) {
    const answer = await question(
      "Do you want to save these credentials? (yes/no) "
    );

    if (answer.toLowerCase() === "yes") {
      const config = configService.getConfig();
      config.userName = user;
      config.password = pass;
      configService.saveConfig(config);
      loggerService.log("Credentials saved.", false);
    }
  }

  async function askTime() {
    const config = configService.getConfig();
    const preferredTime =
      config.preferredTime ||
      (await question(
        "What time would you like to run the app? (e.g., 8:00 AM) "
      ));

    const executeTime = attendanceService.getNextTargetTime(preferredTime);
    loggerService.log(`Scheduled to run at ${executeTime}`, false);

    attendanceService.markAttendanceAtPreferredTime(preferredTime);
    updatePreferredTimeInConfig(preferredTime);
  }

  function updatePreferredTimeInConfig(preferredTime) {
    const config = configService.getConfig();
    config.preferredTime = preferredTime;
    configService.saveConfig(config);
  }

  return {
    askCredentialsOrUseConfig,
    askCredentials,
    askTime,
  };
};
