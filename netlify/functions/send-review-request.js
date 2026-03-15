/**
 * send-review-request.js
 * Netlify Function — Send a Google Business review request via SMS
 *
 * Sends an SMS to the project client with a personalized message
 * containing the office's Google Business review URL.
 * Logs the review request to Firestore for reputation tracking.
 *
 * Env vars required in Netlify dashboard:
 *   TWILIO_ACCOUNT_SID   = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN     = your_auth_token
 *   FIREBASE_SERVICE_ACCOUNT = { ...service account JSON, one line }
 */

const twilio = require("twilio");
const { getDb, admin } = require("./_firebase");

const ALLOWED_ORIGIN = process.env.SITE_URL || "https://job-dox.ai";

const headers = {
  "Access-Control-Allow-Origin":  ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function toE164(num) {
  const digits = String(num || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : null;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return {
    statusCode: 503, headers,
    body: JSON.stringify({ error: "Twilio credentials not configured." }),
  };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body" }) }; }

  const {
    to,                 // client phone number
    from,               // company Twilio number
    clientName,         // client name for personalization
    companyName,        // company name
    googleBusinessUrl,  // Google Business review URL for the office
    customMessage,      // optional custom message override
    // Logging fields
    companyId,
    projectId,
    projectName,
    officeId,
    officeName,
    sentBy,             // staff member ID
    sentByName,         // staff member name
  } = body;

  if (!to || !from || !googleBusinessUrl) return {
    statusCode: 400, headers,
    body: JSON.stringify({ error: "`to`, `from`, and `googleBusinessUrl` are required." }),
  };

  // Build the SMS message
  const greeting = clientName ? `Hi ${clientName.split(" ")[0]}, t` : "T";
  const co = companyName || "our team";
  const messageBody = customMessage ||
    `${greeting}hank you for choosing ${co}! We'd love to hear about your experience. Would you mind leaving us a quick review? It only takes a moment:\n\n${googleBusinessUrl}\n\nYour feedback helps us serve our community better. Thank you!`;

  const client = twilio(sid, token);
  const recipient = toE164(to);

  if (!recipient) return {
    statusCode: 400, headers,
    body: JSON.stringify({ error: "Invalid phone number." }),
  };

  let smsResult;
  try {
    const msg = await client.messages.create({
      from: toE164(from),
      to: recipient,
      body: messageBody,
    });
    smsResult = { sid: msg.sid, status: "sent" };
  } catch (e) {
    smsResult = { error: e.message, status: "failed" };
  }

  // Log review request to Firestore
  if (companyId) {
    try {
      const db = getDb();
      const ts = admin.firestore.FieldValue.serverTimestamp();

      // Save to reviewRequests collection
      await db.collection(`companies/${companyId}/reviewRequests`).add({
        projectId:        projectId || null,
        projectName:      projectName || null,
        officeId:         officeId || null,
        officeName:       officeName || null,
        clientName:       clientName || recipient,
        clientPhone:      recipient,
        googleBusinessUrl,
        sentBy:           sentBy || null,
        sentByName:       sentByName || null,
        smsStatus:        smsResult.status,
        twilioSid:        smsResult.sid || null,
        messageBody,
        status:           smsResult.status === "sent" ? "sent" : "failed",
        reviewRating:     null,
        reviewText:       null,
        reviewDetectedAt: null,
        createdAt:        ts,
      });

      // Also log to smsLogs for Message Center consistency
      await db.collection(`companies/${companyId}/smsLogs`).add({
        direction:   "outbound",
        to:          recipient,
        body:        messageBody,
        status:      smsResult.status,
        twilioSid:   smsResult.sid || null,
        contactName: clientName || recipient,
        staffName:   sentByName || null,
        staffId:     sentBy || null,
        projectId:   projectId || null,
        type:        "review_request",
        createdAt:   ts,
      });
    } catch (logErr) {
      console.error("Review request log write failed:", logErr.message);
    }
  }

  return {
    statusCode: smsResult.status === "sent" ? 200 : 502,
    headers,
    body: JSON.stringify({
      status: smsResult.status,
      sid:    smsResult.sid || null,
      error:  smsResult.error || null,
    }),
  };
};
