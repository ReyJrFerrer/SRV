function buildEmailTemplate({name, title, message, href, appBaseUrl, bookingDetails}) {
  const logoUrl = `${appBaseUrl}/apple-touch-icon-180.png`;
  const characterUrl = `${appBaseUrl}/images/srv%20characters%20(SVG)/Sir%20V.%20GID.png`;
  const appUrl = href ?
    `${appBaseUrl}/#${href.replace(/^\/?#?/, "")}` :
    `${appBaseUrl}`;

  const yellow = "#fbbf24";
  const yellowDark = "#d97706";
  const darkText = "#1f2937";
  const grayText = "#4b5563";
  const lightGray = "#9ca3af";
  const borderColor = "#e5e7eb";

  const hasBooking = bookingDetails && bookingDetails.serviceName;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

          <!-- Yellow accent bar -->
          <tr>
            <td style="height:4px;background-color:${yellow};width:100%;"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:20px 28px 0 28px;text-align:center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <img src="${logoUrl}" alt="SRV" width="40" height="40" style="display:block;border-radius:10px;">
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:8px 18px;background-color:${yellow};color:${darkText};font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Open App</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero Image -->
          <tr>
            <td style="padding:24px 28px 0 28px;text-align:center;">
              <img src="${characterUrl}" alt="" width="160" height="160" style="display:block;margin:0 auto;max-width:100%;">
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:20px 32px 4px 32px;">
              <p style="margin:0;font-size:16px;color:${grayText};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Hi ${escapeHtml(name)},</p>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:8px 32px 0 32px;">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:${darkText};line-height:1.4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(title)}</h1>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding:10px 32px 0 32px;">
              <p style="margin:0;font-size:16px;color:${grayText};line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(message)}</p>
            </td>
          </tr>

          ${hasBooking ? buildBookingDetailsHtml(bookingDetails, yellow, yellowDark, darkText, grayText, borderColor) : ""}

          <!-- CTA Button -->
          ${href ? `
          <tr>
            <td style="padding:24px 32px 0 32px;text-align:center;">
              <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 36px;background-color:${yellow};color:${darkText};font-weight:700;font-size:16px;text-decoration:none;border-radius:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;box-shadow:0 4px 12px rgba(251,191,36,0.35);">View Details</a>
            </td>
          </tr>
          ` : ""}

          <!-- Footer -->
          <tr>
            <td style="padding:32px 32px 28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid ${borderColor};padding-top:20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align:center;">
                          <a href="${appBaseUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;color:${yellowDark};font-size:14px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">srvpinoy.com</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="text-align:center;padding-top:10px;">
                          <p style="margin:0;font-size:13px;color:${lightGray};line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Need help? <a href="mailto:hello@srvpinoy.com" style="color:${yellowDark};text-decoration:none;">hello@srvpinoy.com</a></p>
                        </td>
                      </tr>
                      <tr>
                        <td style="text-align:center;padding-top:6px;">
                          <p style="margin:0;font-size:12px;color:${lightGray};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">This is an automated notification from SRV.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = buildTextVersion({name, title, message, href, appBaseUrl, bookingDetails, appUrl});

  return {html, text};
}

function buildBookingDetailsHtml(details, yellow, yellowDark, darkText, grayText, borderColor) {
  const packagesHtml =
    details.packageNames && details.packageNames.length > 0 ? `
                      <tr>
                        <td style="padding:4px 0 0 0;">
                          <p style="margin:0;font-size:13px;color:${grayText};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"><strong style="color:${darkText};">Package:</strong> ${escapeHtml(details.packageNames.join(", "))}</p>
                        </td>
                      </tr>` : "";

  const dateHtml = details.date ? `
                      <tr>
                        <td style="padding:4px 0 0 0;">
                          <p style="margin:0;font-size:13px;color:${grayText};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"><strong style="color:${darkText};">Date:</strong> ${escapeHtml(details.date)}</p>
                        </td>
                      </tr>` : "";

  const timeHtml = details.timeRange ? `
                      <tr>
                        <td style="padding:4px 0 0 0;">
                          <p style="margin:0;font-size:13px;color:${grayText};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"><strong style="color:${darkText};">Time:</strong> ${escapeHtml(details.timeRange)}</p>
                        </td>
                      </tr>` : "";

  const locationHtml = details.location ? `
                      <tr>
                        <td style="padding:4px 0 0 0;">
                          <p style="margin:0;font-size:13px;color:${grayText};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"><strong style="color:${darkText};">Location:</strong> ${escapeHtml(details.location)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0 0 0;text-align:left;">
                          <a href="${details.mapsUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:6px 14px;background-color:${yellow};color:${darkText};font-weight:600;font-size:12px;text-decoration:none;border-radius:6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">View on Google Maps</a>
                        </td>
                      </tr>` : "";

  const priceHtml = details.price ? `
                      <tr>
                        <td style="padding:4px 0 0 0;">
                          <p style="margin:0;font-size:13px;color:${grayText};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"><strong style="color:${darkText};">Price:</strong> <span style="color:${darkText};font-weight:700;">${escapeHtml(details.price)}</span></p>
                        </td>
                      </tr>` : "";

  let contactHtml = "";
  if (details.contactInfo) {
    const {role, name: contactName, phone, email} = details.contactInfo;
    contactHtml = `
                      <tr>
                        <td style="padding:12px 0 0 0;border-top:1px solid ${borderColor};">
                          <p style="margin:0;font-size:13px;color:${grayText};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"><strong style="color:${darkText};">${escapeHtml(role)} Contact</strong></p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0 0 0;">
                          <p style="margin:0;font-size:13px;color:${darkText};font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(contactName)}</p>
                        </td>
                      </tr>
                      ${phone ? `
                      <tr>
                        <td style="padding:2px 0 0 0;">
                          <p style="margin:0;font-size:13px;color:${grayText};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">&#128222; ${escapeHtml(phone)}</p>
                        </td>
                      </tr>` : ""}
                     `;
  }

  return `
          <!-- Booking Details -->
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fefce8;border-radius:10px;border:1px solid ${borderColor};">
                <tr>
                  <td style="padding:16px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:10px;">
                          <p style="margin:0;font-size:14px;font-weight:700;color:${darkText};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Booking Details</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0 0 0;">
                          <p style="margin:0;font-size:13px;color:${grayText};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"><strong style="color:${darkText};">Service:</strong> ${escapeHtml(details.serviceName)}</p>
                        </td>
                      </tr>
                      ${packagesHtml}
                      ${dateHtml}
                      ${timeHtml}
                      ${locationHtml}
                      ${priceHtml}
                      ${contactHtml}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
  `;
}

function buildTextVersion({name, title, message, href, appBaseUrl, bookingDetails, appUrl}) {
  let text = `Hi ${name},

${title}

${message}`;

  if (bookingDetails && bookingDetails.serviceName) {
    text += `\n\n--- Booking Details ---\n`;
    text += `Service: ${bookingDetails.serviceName}\n`;
    if (bookingDetails.packageNames && bookingDetails.packageNames.length > 0) {
      text += `Package: ${bookingDetails.packageNames.join(", ")}\n`;
    }
    if (bookingDetails.date) text += `Date: ${bookingDetails.date}\n`;
    if (bookingDetails.timeRange) text += `Time: ${bookingDetails.timeRange}\n`;
    if (bookingDetails.location) {
      text += `Location: ${bookingDetails.location}\n`;
      if (bookingDetails.mapsUrl) text += `Maps: ${bookingDetails.mapsUrl}\n`;
    }
    if (bookingDetails.price) text += `Price: ${bookingDetails.price}\n`;
    if (bookingDetails.contactInfo) {
      const {role, name: contactName, phone, email} = bookingDetails.contactInfo;
      text += `\n${role} Contact:\n`;
      text += `  Name: ${contactName}\n`;
      if (phone) text += `  Phone: ${phone}\n`;
      if (email) text += `  Email: ${email}\n`;
    }
  }

  if (href) {
    text += `\nView details: ${appUrl}\n`;
  }

  text += `\n---\nSRV — ${appBaseUrl}\nNeed help? hello@srvpinoy.com\nThis is an automated notification from SRV.`;

  return text;
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = {buildEmailTemplate};
