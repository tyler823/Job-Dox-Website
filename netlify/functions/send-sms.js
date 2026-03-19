/**
 * send-sms.js
 * Netlify Function — Send SMS or MMS via Twilio
 *
 * Handles both staff task-comment notifications and customer messages.
 * Logs every outbound message to Firestore for the Message Center.
 *
 * Env vars required in Netlify dashboard:
 *   TWILIO_ACCOUNT_SID   = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN    = your_auth_token
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
  if (event.httpMethod !== "POST")    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return {
    statusCode: 503, headers,
    body: JSON.stringify({ error: "An error occurred" }),
  };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body" }) }; }

  const {
    to,           // string or array of strings
    messageBody,  // the text content (named messageBody to avoid shadowing `body`)
    mediaUrl,     // optional — triggers MMS with staff photo
    from,         // company's Twilio number (e.g. "+19185551234")
    // optional logging fields
    companyId,
    contactName,
    staffName,
    staffId,
    projectId,
  } = body;

  if (!to || !messageBody || !from) return {
    statusCode: 400, headers,
    body: JSON.stringify({ error: "An error occurred" }),
  };

  // ── Verify companyId exists in Firestore ──
  if (companyId) {
    try {
      const db = getDb();
      const companyDoc = await db.collection("companies").doc(companyId).get();
      if (!companyDoc.exists) {
        await db.collection("audit_logs").add({
          event: "unauthorized_access_attempt",
          function: "send-sms",
          companyId,
          success: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { statusCode: 403, headers, body: JSON.stringify({ error: "An error occurred" }) };
      }
    } catch (_) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "An error occurred" }) };
    }
  }

  const client     = twilio(sid, token);
  const recipients = (Array.isArray(to) ? to : [to]).map(toE164).filter(Boolean);

  const results = await Promise.all(recipients.map(recipient => {
    const payload = { from: toE164(from), to: recipient, body: messageBody };
    if (mediaUrl && mediaUrl.trim()) payload.mediaUrl = [mediaUrl];
    return client.messages.create(payload)
      .then(m  => ({ to: recipient, sid: m.sid, status: "sent" }))
      .catch(e => ({ to: recipient, error: e.message, status: "failed" }));
  }));

  // ── Log to Firestore for Message Center ──
  if (companyId) {
    try {
      const db = getDb();
      const logWrites = recipients.map((recipient, i) => {
        const result = results[i];
        return db.collection(`companies/${companyId}/smsLogs`).add({
          direction:   "outbound",
          to:          recipient,
          body:        messageBody,
          status:      result.status,
          twilioSid:   result.sid || null,
          contactName: contactName || recipient,
          staffName:   staffName   || null,
          staffId:     staffId     || null,
          projectId:   projectId   || null,
          createdAt:   admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await Promise.all(logWrites);
    } catch (logErr) {
      // Non-fatal — log failure shouldn't block the SMS response
      console.error("SMS log write failed:", logErr.message);
    }
  }

  return {
    statusCode: 200, headers,
    body: JSON.stringify({
      sent:    results.filter(r => r.status === "sent").length,
      failed:  results.filter(r => r.status === "failed").length,
      results,
    }),
  };
};
