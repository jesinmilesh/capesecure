/**
 * Cape Secure Solutions — HTML Email Templates
 * 8 Professional Responsive Email Templates with Kanyakumari Theme Aesthetics:
 * Deep Ocean, Turquoise, Sunrise Gold.
 */

const { getCompanyConfig } = require('../../config/company');

function wrapEmailTemplate(contentHtml, title = 'Cape Secure Solutions') {
  const config = getCompanyConfig();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #03111f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f0f6fc; }
    table { border-collapse: collapse; }
    .email-wrapper { width: 100%; background-color: #03111f; padding: 30px 10px; }
    .email-container { max-width: 600px; margin: 0 auto; background: #061a2e; border: 1px solid rgba(0, 217, 255, 0.25); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
    .email-header { background: linear-gradient(135deg, #031b2a 0%, #063b5c 100%); padding: 24px 30px; border-bottom: 2px solid #00b8c8; }
    .brand-title { color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: -0.01em; margin: 0; }
    .brand-title span.cape { color: #f6b73c; }
    .brand-title span.secure { color: #00d9ff; }
    .brand-tagline { color: #72ddf7; font-size: 11px; margin-top: 4px; display: block; }
    .email-body { padding: 32px 30px; font-size: 14.5px; line-height: 1.65; color: #d1e2f2; }
    .email-body h1, .email-body h2 { color: #ffffff; margin-top: 0; font-size: 20px; }
    .info-card { background: rgba(3, 27, 42, 0.7); border: 1px solid rgba(0, 184, 200, 0.2); border-radius: 8px; padding: 18px 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #8aa7c2; font-size: 13px; }
    .info-value { color: #ffffff; font-weight: 600; font-size: 13.5px; }
    .btn-cta { display: inline-block; background: linear-gradient(135deg, #087e8b 0%, #00b8c8 100%); color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; margin: 18px 0; text-align: center; }
    .email-footer { background: #031221; padding: 24px 30px; text-align: center; font-size: 12px; color: #627d97; border-top: 1px solid rgba(255, 255, 255, 0.08); }
    .email-footer a { color: #00d9ff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <h1 class="brand-title"><span class="cape">CAPE</span><span class="secure">SECURE</span> SOLUTIONS</h1>
        <span class="brand-tagline">Where Three Seas Meet, Security Begins &bull; Kanyakumari, Tamil Nadu</span>
      </div>
      <div class="email-body">
        ${contentHtml}
      </div>
      <div class="email-footer">
        <p style="margin: 0 0 8px 0;"><strong>${config.companyName}</strong> &bull; ${config.location}</p>
        <p style="margin: 0 0 8px 0;">Email: <a href="mailto:${config.email}">${config.email}</a> | WhatsApp: ${config.whatsapp}</p>
        <p style="margin: 0;"><a href="${config.website}">${config.website}</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  wrapEmailTemplate
};
