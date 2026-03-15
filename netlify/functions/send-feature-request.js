/**
 * send-feature-request.js
 * Netlify Function — Send feature request email via SMTP (nodemailer)
 *
 * Env vars required in Netlify dashboard:
 *   SMTP_HOST     = smtp server host (e.g. smtp.gmail.com)
 *   SMTP_PORT     = smtp port (e.g. 587)
 *   SMTP_USER     = smtp username / email
 *   SMTP_PASS     = smtp password / app password
 *   SMTP_FROM     = sender address (e.g. noreply@job-dox.ai)
 */

const nodemailer = require("nodemailer");

const ALLOWED_ORIGIN = process.env.SITE_URL || "https://job-dox.ai";

const headers = {
  "Access-Control-Allow-Origin":  ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return {
      statusCode: 503, headers,
      body: JSON.stringify({ error: "SMTP credentials not configured. Add SMTP_HOST, SMTP_USER, and SMTP_PASS in Netlify environment variables." }),
    };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body" }) }; }

  const { userName, companyName, featureRequest } = body;

  if (!userName || !companyName || !featureRequest) {
    return {
      statusCode: 400, headers,
      body: JSON.stringify({ error: "`userName`, `companyName`, and `featureRequest` are required." }),
    };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || "587", 10),
    secure: parseInt(SMTP_PORT || "587", 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const subject = `FEATURE REQUEST from ${userName} with ${companyName}`;

  const html = `
    <h2>Feature Request</h2>
    <p><strong>From:</strong> ${userName}</p>
    <p><strong>Company:</strong> ${companyName}</p>
    <hr/>
    <p>${featureRequest.replace(/\n/g, "<br/>")}</p>
  `;

  try {
    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: "info@job-dox.ai",
      subject,
      html,
      text: `Feature Request\n\nFrom: ${userName}\nCompany: ${companyName}\n\n${featureRequest}`,
    });

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("Feature request email failed:", err.message);
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: "Failed to send email. Please try again later." }),
    };
  }
};
