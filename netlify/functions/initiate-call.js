/**
 * initiate-call.js
 * Netlify Function — Start an outbound call via Twilio
 *
 * Twilio calls the staff member's phone first. When they pick up,
 * it bridges them to the client and records the full conversation.
 * A Firestore call log doc is created immediately so the portal
 * can show "connecting…" in real time.
 *
 * Env vars required in Netlify dashboard:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, FIREBASE_SERVICE_ACCOUNT
 */

const twilio = require("twilio");
const { getDb, admin } = require("./_firebase");

const ALLOWED_ORIGIN = process.env.SITE_URL || "https://job-dox.ai";
const SITE_URL       = process.env.SITE_URL  || "https://job-dox.ai";

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
    body: JSON.stringify({ error: "Twilio credentials not configured." }),
  };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body" }) }; }

  const { staffPhone, clientPhone, clientName, staffName, staffId, companyId, projectId, twilioNumber } = body;

  if (!staffPhone || !clientPhone || !companyId || !twilioNumber) return {
    statusCode: 400, headers,
    body: JSON.stringify({ error: "staffPhone, clientPhone, companyId, and twilioNumber are required." }),
  };

  const staffE164  = toE164(staffPhone);
  const clientE164 = toE164(clientPhone);
  const fromNumber = toE164(twilioNumber);

  if (!staffE164 || !clientE164 || !fromNumber) return {
    statusCode: 400, headers,
    body: JSON.stringify({ error: "Invalid phone number format." }),
  };

  // Pre-create the call log doc so the portal shows "connecting…" immediately
  const db      = getDb();
  const callRef = db.collection(`companies/${companyId}/calls`).doc();

  await callRef.set({
    id:           callRef.id,
    type:         "outbound",
    clientName:   clientName  || clientPhone,
    clientPhone:  clientE164,
    staffName:    staffName   || "Staff",
    staffId:      staffId     || null,
    staffPhone:   staffE164,
    status:       "connecting",
    projectId:    projectId   || null,
    companyId,
    createdAt:    admin.firestore.FieldValue.serverTimestamp(),
    duration:     null,
    recordingUrl: null,
  });

  // Netlify function URLs for Twilio callbacks
  const base       = SITE_URL.replace(/\/$/, "");
  const callbackBase = `${base}/.netlify/functions`;

  const clientSafe = (clientName || "your client")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // TwiML: plays a brief notice to the staff member, then dials the client and records
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting you to ${clientSafe}. This call will be recorded.</Say>
  <Dial record="record-from-answer-dual"
        recordingStatusCallback="${callbackBase}/call-recording-ready?callDocId=${callRef.id}&amp;companyId=${companyId}"
        action="${callbackBase}/call-complete?callDocId=${callRef.id}&amp;companyId=${companyId}">
    <Number>${clientE164}</Number>
  </Dial>
</Response>`;

  try {
    const client = twilio(sid, token);
    const call   = await client.calls.create({
      to:   staffE164,
      from: fromNumber,
      twiml,
      statusCallback:       `${callbackBase}/call-complete?callDocId=${callRef.id}&companyId=${companyId}`,
      statusCallbackMethod: "POST",
      statusCallbackEvent:  ["completed", "no-answer", "busy", "failed"],
    });

    await callRef.update({ twilioCallSid: call.sid });

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ callDocId: callRef.id, twilioCallSid: call.sid }),
    };
  } catch (err) {
    await callRef.update({ status: "failed" }).catch(() => {});
    return {
      statusCode: 502, headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
