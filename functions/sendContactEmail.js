const functions = require("firebase-functions");
const nodemailer = require("nodemailer");

/**
 * Cloud Function to handle contact form submissions
 * Sends email using SMTP configuration from environment variables
 */
exports.sendContactEmail = functions.https.onCall(async (data) => {
  functions.logger.info("Received contact form submission.", {
    name: data.name,
    email: data.email,
    subject: data.subject,
    messageLength: data.message?.length || 0,
  });

  // Validate required fields
  const {name, email, subject, message} = data.data;

  if (!name || !email || !subject || !message) {
    functions.logger.warn("Validation failed: Missing required fields.", data);
    throw new functions.https.HttpsError(
      "invalid-argument",
      "All fields are required.",
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    functions.logger.warn("Validation failed: Invalid email format.", {email});
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Please enter a valid email address.",
    );
  }

  // Basic spam protection - limit message length
  if (message.length > 2000) {
    functions.logger.warn("Validation failed: Message too long.", {
      length: message.length,
    });
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Message is too long.",
    );
  }
  functions.logger.info("Input validation passed.");
  // Get SMTP configuration from environment variables
  const smtpConfig = {
    host: process.env.SMTP_HOST || "smtp.hostinger.com",
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || "hello@srvpinoy.com",
      pass: process.env.SMTP_PASS,
    },
  };

  const toEmail = process.env.CONTACT_EMAIL || "hello@srvpinoy.com";
  const fromName = process.env.FROM_NAME || "SRV Contact Form";
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

  // Create transporter
  const transporter = nodemailer.createTransport(smtpConfig);

  // Email content
  const emailSubject = `Contact Form Submission: ${subject}`;
  const emailBody = `
New contact form submission from SRV website:

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
This message was sent from the SRV contact form.
Reply directly to this email to respond to the sender.
  `.trim();

  // Email options
  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: toEmail,
    replyTo: email,
    subject: emailSubject,
    text: emailBody,
  };

  try {
    functions.logger.info(`Attempting to send email to ${toEmail}...`);
    // Send email
    await transporter.sendMail(mailOptions);

    functions.logger.info("Email sent successfully.", {to: toEmail, from: email});

    return {
      status: "success",
      message: "Thank you for your message! We'll get back to you soon.",
    };
  } catch (error) {
    functions.logger.error("Error sending contact email:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Sorry, there was an error sending your message. Please try again or contact us directly.",
    );
  }
});
