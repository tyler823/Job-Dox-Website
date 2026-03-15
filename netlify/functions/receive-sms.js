/**
 * receive-sms.js
 * Netlify Function — Twilio inbound SMS webhook
 *
 * Set this URL as your Twilio number's "A message comes in" webhook:
 *   https://job-dox.ai/.netlify/functions/receive-sms
 *
 * Looks up the company by their Twilio number, logs the inbound
 * message to Firestore, and returns a valid TwiML response.
 *
 * Env vars required in Netlify dashboard:
 *   FIREBASE_SERVICE_ACCOUNT = { ...service account JSON, one line }
 */

const { getDb, admin } = require("./_firebase");

const twimlHeaders = {
  "Content-Type":                "text/xml",
  "Access-Control-Allow-Origin": "*",
};

function parseFormBody(raw) {
  const out = {};
  if (!raw) return out;
  raw.split("&").forEach(pair => {
    const [k, v] = pair.split("=").map(decodeURIComponent);
    out[k] = v;
  });
  return out;
}

function toE164(num) {
  const digits = String(num || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : null;
}

exports.handler = async (event) => {
  // Twilio sends POST with form-encoded body
  const params     = parseFormBody(event.body);
  const toNumber   = params.To   || "";
  const fromNumber = params.From || "";
  const body       = params.Body || "";
  const numMedia   = parseInt(params.NumMedia || "0", 10);
  const messageSid = params.MessageSid || "";

  const normalised = toE164(toNumber);
  const lookupKey  = (normalised || toNumber).replace(/\+/g, "_");

  const db = getDb();

  // Find which company owns this Twilio number
  const numSnap = await db.collection("phoneNumbers").doc(lookupKey).get().catch(() => null);

  if (!numSnap || !numSnap.exists) {
    console.warn(`[receive-sms] No company found for number ${toNumber} (key: ${lookupKey})`);
    return {
      statusCode: 200,
      headers: twimlHeaders,
      body: `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    };
  }

  const { companyId } = numSnap.data();

  // Collect media URLs if MMS
  const mediaUrls = [];
  for (let i = 0; i < numMedia; i++) {
    const url = params[`MediaUrl${i}`];
    if (url) mediaUrls.push(url);
  }

  // Log inbound message to Firestore
  try {
    await db.collection(`companies/${companyId}/smsLogs`).add({
      direction:   "inbound",
      from:        fromNumber,
      to:          toNumber,
      body:        body,
      mediaUrls:   mediaUrls.length > 0 ? mediaUrls : null,
      numMedia:    numMedia,
      twilioSid:   messageSid,
      companyId:   companyId,
      createdAt:   admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (logErr) {
    console.error("[receive-sms] Firestore log write failed:", logErr.message);
  }

  console.log(`[receive-sms] Inbound SMS from ${fromNumber} to ${toNumber} (company: ${companyId}): ${body.substring(0, 100)}`);

  // Return empty TwiML (no auto-reply for now)
  return {
    statusCode: 200,
    headers: twimlHeaders,
    body: `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
  };
};
