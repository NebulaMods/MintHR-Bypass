const fs = require("fs");
const { logFilePath } = require("./vars");

module.exports = function ({ emailService }) {
  let sender = "";
  let recipientEmail = "";

  async function log(message, deliverMail = true, emailTitle = "Log") {
    console.log(message);
    if (deliverMail) {
      await sendMail(emailTitle, message);
    }
  }

  async function handleError(error, deliverMail = true) {
    console.error(error.message);
    appendErrorToLogFile(error);
    if (deliverMail) {
      await sendMail("Error", error.message);
    }
  }

  function appendErrorToLogFile(error) {
    const errorMessage = `${new Date().toISOString()} - ${error.message}\n`;
    fs.appendFileSync(logFilePath, errorMessage);
  }

  async function sendMail(subject, message) {
    await emailService.sendMail({
      subject,
      text: message,
      sender,
      recipient: recipientEmail,
    });
  }

  function setupLogger(senderEmail, recipient) {
    sender = senderEmail;
    recipientEmail = recipient;
  }

  return {
    log,
    handleError,
    setupLogger,
  };
};
