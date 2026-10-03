/**
 * CapeSecure - Brevo SMS & Notification Serverless Handler
 * Vercel Serverless Function: /api/send-sms
 * Dispatches transactional SMS confirmations and lead notifications via Brevo API.
 * Configured securely via Vercel Environment Variables: BREVO_API_KEY
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const BREVO_SENDER = process.env.BREVO_SENDER || "CapeSecure";
const ADMIN_EMAIL = process.env.BREVO_ADMIN_EMAIL || "capesecuresolutions@gmail.com";
const ADMIN_PHONE = process.env.BREVO_ADMIN_PHONE || "";

/**
 * Normalizes a phone number to international E.164 without leading plus.
 * E.g., "9876543210" -> "919876543210"
 */
function normalizePhone(phone) {
  if (!phone) return "";
  let digits = String(phone).replace(/\D/g, "");
  if (digits.length === 10) {
    digits = "91" + digits; // Default to India (+91)
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = "91" + digits.slice(1);
  }
  return digits;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  if (!BREVO_API_KEY) {
    console.error("BREVO_API_KEY environment variable is not configured on Vercel.");
    return res.status(500).json({
      success: false,
      error: "BREVO_API_KEY environment variable is not configured. Please add it to Vercel Project Settings."
    });
  }

  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const {
      type = "contact", // "quote" or "contact"
      name = "Valued Client",
      phone = "",
      email = "",
      subject = "",
      message = "",
      budget = "",
      businessName = "",
      requirements = []
    } = data;

    const normalizedPhone = normalizePhone(phone);
    const results = { sms: null, adminSms: null, email: null };

    // 1. Send Transactional SMS to Client via Brevo
    if (normalizedPhone && normalizedPhone.length >= 10) {
      const clientContent =
        type === "quote"
          ? `CapeSecure: Hello ${name.split(" ")[0]}, thank you for requesting a project quote! Our engineering team will review your requirements and reach out shortly.`
          : `CapeSecure: Hello ${name.split(" ")[0]}, we received your message! Our team will get in touch with you promptly.`;

      const smsRes = await fetch("https://api.brevo.com/v3/transactionalSMS/send", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": BREVO_API_KEY,
          "content-type": "application/json",
          "user-agent": "CapeSecure-Web/1.0"
        },
        body: JSON.stringify({
          type: "transactional",
          sender: BREVO_SENDER,
          recipient: normalizedPhone,
          content: clientContent
        })
      });

      const smsData = await smsRes.json().catch(() => ({}));
      results.sms = { ok: smsRes.ok, data: smsData };
    }

    // 2. Optionally Send Admin Alert SMS if admin phone is configured
    if (ADMIN_PHONE) {
      const adminNormPhone = normalizePhone(ADMIN_PHONE);
      if (adminNormPhone) {
        const adminContent = `CapeSecure ALERT: New ${type.toUpperCase()} from ${name} (${phone}). Budget: ${budget || "N/A"}. Review inbox.`;
        const adminSmsRes = await fetch("https://api.brevo.com/v3/transactionalSMS/send", {
          method: "POST",
          headers: {
            accept: "application/json",
            "api-key": BREVO_API_KEY,
            "content-type": "application/json",
            "user-agent": "CapeSecure-Web/1.0"
          },
          body: JSON.stringify({
            type: "transactional",
            sender: BREVO_SENDER,
            recipient: adminNormPhone,
            content: adminContent
          })
        });
        results.adminSms = { ok: adminSmsRes.ok };
      }
    }

    // 3. Send Notification Email to CapeSecure Team via Brevo SMTP API
    try {
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #06111c; color: #f0f6fc; border-radius: 8px;">
          <h2 style="color: #00d9ff; margin-top: 0; border-bottom: 1px solid #1a3654; padding-bottom: 12px;">
            New ${type === "quote" ? "Project Quote Request" : "Direct Contact Message"}
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px; color: #f0f6fc;">
            <tr><td style="padding: 8px 0; color: #8ba3be; width: 140px;"><strong>Client Name:</strong></td><td>${name}</td></tr>
            <tr><td style="padding: 8px 0; color: #8ba3be;"><strong>Phone / WhatsApp:</strong></td><td><a href="tel:${phone}" style="color: #00d9ff;">${phone}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #8ba3be;"><strong>Email:</strong></td><td><a href="mailto:${email}" style="color: #00d9ff;">${email || "Not provided"}</a></td></tr>
            ${businessName ? `<tr><td style="padding: 8px 0; color: #8ba3be;"><strong>Business Name:</strong></td><td>${businessName}</td></tr>` : ""}
            ${subject ? `<tr><td style="padding: 8px 0; color: #8ba3be;"><strong>Inquiry Subject:</strong></td><td>${subject}</td></tr>` : ""}
            ${budget ? `<tr><td style="padding: 8px 0; color: #8ba3be;"><strong>Selected Budget:</strong></td><td style="color: #f6b73c; font-weight: bold;">${budget}</td></tr>` : ""}
            ${requirements && requirements.length ? `<tr><td style="padding: 8px 0; color: #8ba3be;"><strong>Requirements:</strong></td><td>${requirements.join(", ")}</td></tr>` : ""}
          </table>
          <div style="margin-top: 20px; padding: 16px; background: #0a1c2b; border-left: 3px solid #00d9ff; border-radius: 4px;">
            <strong style="color: #8ba3be; display: block; margin-bottom: 6px;">Client Message / Brief:</strong>
            <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${message || "No notes provided."}</p>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #587391; text-align: center;">
            Sent automatically by CapeSecure Web Platform • Powered by Brevo API
          </p>
        </div>
      `;

      const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": BREVO_API_KEY,
          "content-type": "application/json",
          "user-agent": "CapeSecure-Web/1.0"
        },
        body: JSON.stringify({
          sender: { name: "CapeSecure Web Platform", email: ADMIN_EMAIL },
          to: [{ email: ADMIN_EMAIL, name: "CapeSecure Team" }],
          subject: `[CapeSecure Lead] New ${type === "quote" ? "Quote" : "Inquiry"} from ${name}`,
          htmlContent: emailHtml
        })
      });

      const emailData = await emailRes.json().catch(() => ({}));
      results.email = { ok: emailRes.ok, data: emailData };
    } catch (e) {
      results.email = { ok: false, error: e.message };
    }

    return res.status(200).json({
      success: true,
      message: "Lead processed successfully with Brevo SMS dispatch.",
      results
    });
  } catch (error) {
    console.error("Brevo SMS handler error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
}
