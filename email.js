const nodemailer = require("nodemailer");

module.exports = function () {
  let transporter = null;

  function createMailOptions(subject, text, sender, recipient) {
    return {
      from: sender,
      to: recipient,
      subject,
      text,
    };
  }

  async function sendMail({ subject, text, sender, recipient }) {
    if (!transporter) {
      throw new Error(
        "Transporter not initialized. Ensure you have called `setupTransporter` before sending emails."
      );
    }

    const mailOptions = createMailOptions(subject, text, sender, recipient);

    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      throw new Error(`Error sending email: ${error.message}`);
    }
  }

  async function sendTestEmail(sender, recipient) {
    return sendMail({
      subject: "Test Email",
      text: "This is a test email to validate the provided email settings.",
      sender,
      recipient,
    });
  }

  function setupTransporter({
    service,
    email,
    password,
    smtpHost = null,
    smtpPort = null,
  }) {
    const transportOptions = {
      auth: {
        user: email,
        pass: password,
      },
    };

    if (service === "smtps") {
      transportOptions.host = smtpHost;
      transportOptions.port = smtpPort;
      transportOptions.secure = true;
    } else {
      transportOptions.service = service;
    }

    transporter = nodemailer.createTransport(transportOptions);
  }

  return {
    sendMail,
    sendTestEmail,
    setupTransporter,
  };
};
