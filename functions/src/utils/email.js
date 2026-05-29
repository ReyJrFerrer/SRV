const nodemailer = require("nodemailer");

const smtpConfig = {
  host: process.env.SMTP_HOST || "smtp.hostinger.com",
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "hello@srvpinoy.com",
    pass: process.env.SMTP_PASS,
  },
};

const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

const transporter = nodemailer.createTransport(smtpConfig);

/**
 * Send an email via SMTP.
 * @param {Object} params
 * @param {string} params.to
 * @param {string} params.subject
 * @param {string} [params.text]
 * @param {string} [params.html]
 * @param {string} [params.fromName]
 * @param {string} [params.replyTo]
 */
async function sendEmail({to, subject, text, html, fromName, replyTo}) {
  const mailOptions = {
    from: `"${fromName || "SRV"}" <${fromEmail}>`,
    to,
    subject,
    text,
    ...(html && {html}),
    ...(replyTo && {replyTo}),
  };

  console.log(`Email: Sending "${subject}" to ${to}...`);
  await transporter.sendMail(mailOptions);
  console.log(`Email: Sent "${subject}" to ${to} successfully.`);
}

module.exports = {sendEmail};
