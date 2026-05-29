function buildEmailTemplate({name, title, message, href, appBaseUrl}) {
  const logoUrl = `${appBaseUrl}/apple-touch-icon-180.png`;
  const characterUrl = `${appBaseUrl}/images/srv%20characters%20(SVG)/Sir%20V.%20GID.png`;
  const appUrl = href ?
    `${appBaseUrl}/#${href.replace(/^\/?#?/, "")}` :
    `${appBaseUrl}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="padding:24px 28px 0 28px;text-align:center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <img src="${logoUrl}" alt="SRV" width="38" height="38" style="display:block;border-radius:8px;">
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:8px 18px;background-color:#6366f1;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Launch App</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:20px 28px 0 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #e5e7eb;width:100%;"></td>
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
              <p style="margin:0;font-size:16px;color:#4b5563;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Hi ${escapeHtml(name)},</p>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:8px 32px 0 32px;">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#1f2937;line-height:1.4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(title)}</h1>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding:10px 32px 0 32px;">
              <p style="margin:0;font-size:16px;color:#4b5563;line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(message)}</p>
            </td>
          </tr>

          <!-- CTA Button -->
          ${href ? `
          <tr>
            <td style="padding:24px 32px 0 32px;text-align:center;">
              <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 36px;background-color:#6366f1;color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;box-shadow:0 4px 12px rgba(99,102,241,0.35);">View Details</a>
            </td>
          </tr>
          ` : ""}

          <!-- Footer -->
          <tr>
            <td style="padding:32px 32px 28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #e5e7eb;padding-top:20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align:center;">
                          <a href="${appBaseUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;color:#6366f1;font-size:14px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">srvpinoy.com</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="text-align:center;padding-top:10px;">
                          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Need help? <a href="mailto:hello@srvpinoy.com" style="color:#6366f1;text-decoration:none;">hello@srvpinoy.com</a></p>
                        </td>
                      </tr>
                      <tr>
                        <td style="text-align:center;padding-top:6px;">
                          <p style="margin:0;font-size:12px;color:#d1d5db;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">This is an automated notification from SRV.</p>
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

  const text = `Hi ${name},
${title}

${message}

${href ? `View details: ${appUrl}\n\n` : ""}---
SRV — ${appBaseUrl}
Need help? hello@srvpinoy.com
This is an automated notification from SRV.`;

  return {html, text};
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
