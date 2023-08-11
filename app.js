const { question } = require("./utils");
const ioc = require("./ioc");
const emailFactory = require("./email");
const loggerFactory = require("./logger");
const configFactory = require("./config");
const attendanceFactory = require("./attendance");
const credentialsFactory = require("./credentials");
const { exit } = require("process");

registerServices();

const emailService = getService("email");
const loggerService = getService("logger");
const configService = getService("config");
const credentialsService = getService("credentials");

init();

function registerServices() {
  ioc.register("email", emailFactory);
  ioc.register("logger", () =>
    loggerFactory({ emailService: getService("email") })
  );
  ioc.register("config", () =>
    configFactory({
      loggerService: getService("logger"),
      emailService: getService("email"),
    })
  );
  ioc.register("attendance", () =>
    attendanceFactory({
      loggerService: getService("logger"),
      configService: getService("config"),
    })
  );
  ioc.register("credentials", () =>
    credentialsFactory({
      loggerService: getService("logger"),
      configService: getService("config"),
      attendanceService: getService("attendance"),
    })
  );
}

function getService(serviceName) {
  return ioc.resolve(serviceName);
}

async function init() {
  try {
    const loadedConfig = await configService.loadConfig();
    const autoLoadConfig = process.argv.includes("--autoload");

    if (loadedConfig) {
      await handleLoadedConfig(loadedConfig, autoLoadConfig);
    } else {
      await askEmailSettings();
    }
  } catch (error) {
    await loggerService.handleError(error, false);
    exit(1);
  }
}

async function handleLoadedConfig(loadedConfig, autoLoadConfig) {
  if (autoLoadConfig && configService.isValidConfig(loadedConfig)) {
    configService.applyConfig(loadedConfig);
    await credentialsService.askCredentialsOrUseConfig();
    return;
  }

  const answer = await question(
    "Configuration found. Do you want to load it? (yes/no) "
  );
  if (answer.toLowerCase() === "yes") {
    configService.applyConfig(loadedConfig);
    credentialsService.askCredentialsOrUseConfig();
  } else {
    await askEmailSettings();
  }
}

async function askEmailSettings() {
  const shouldConfigureEmail = await question(
    "Do you want to configure email settings? (yes/no): "
  );

  if (shouldConfigureEmail.toLowerCase() !== "yes") {
    await credentialsService.askCredentialsOrUseConfig();
    return;
  }

  const emailConfig = await gatherEmailConfig();
  await validateAndSaveEmailConfig(emailConfig);
}

async function gatherEmailConfig() {
  const service = await question(
    "Please enter your email service (e.g. 'gmail' or 'smtps'): "
  );
  let smtpConfig = {};

  if (service === "smtps") {
    smtpConfig.smtpHost = await question("Enter SMTPS host: ");
    smtpConfig.smtpPort = parseInt(
      await question("Enter SMTPS port (usually 465 or 587): ")
    );
  }

  return {
    emailService: service,
    email: await question("Please enter your email: "),
    emailPass: await question("Please enter your email password: "),
    recipientEmail: await question(
      "Please enter the recipient's email address: "
    ),
    ...smtpConfig,
  };
}

async function validateAndSaveEmailConfig(emailConfig) {
  try {
    setupEmailService(emailConfig);
    await emailService.sendTestEmail(
      emailConfig.email,
      emailConfig.recipientEmail
    );

    loggerService.setupLogger(emailConfig.email, emailConfig.recipientEmail);

    const answer = await question(
      "Do you want to save these email settings? (yes/no) "
    );
    if (answer.toLowerCase() === "yes") {
      saveEmailConfig(emailConfig);
      loggerService.log("Email settings saved.", false);
    }

    await credentialsService.askCredentialsOrUseConfig();
  } catch (error) {
    loggerService.handleError(error, false);
    await askEmailSettings();
  }
}

function setupEmailService(emailConfig) {
  emailService.setupTransporter({
    service: emailConfig.emailService,
    email: emailConfig.email,
    password: emailConfig.emailPass,
    smtpHost: emailConfig.smtpHost,
    smtpPort: emailConfig.smtpPort,
  });
}

function saveEmailConfig(emailConfig) {
  const config = configService.getConfig();
  Object.assign(config, emailConfig);
  configService.saveConfig(config);
}
