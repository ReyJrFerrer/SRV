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
