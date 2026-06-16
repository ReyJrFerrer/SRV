const functions = require("firebase-functions");
const {sendEmail} = require("./src/utils/email");

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

  const toEmail = process.env.CONTACT_EMAIL || "hello@srvpinoy.com";
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

  try {
    functions.logger.info(`Attempting to send email to ${toEmail}...`);
    await sendEmail({
      to: toEmail,
      subject: emailSubject,
      text: emailBody,
      fromName: "SRV Contact Form",
      replyTo: email,
    });

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
