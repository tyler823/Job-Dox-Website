/**
 * save-phone-settings.js
 * Netlify Function — Save company phone/call settings to Firestore
 *
 * Called by the portal's Settings → Phone & Calls tab.
 * Stores the Twilio number, disclosure message, call groups, and
 * active group. Also writes the phoneNumbers reverse-lookup doc
 * so inbound calls can be routed to the right company.
 *
 * Env vars required in Netlify dashboard:
 *   FIREBASE_SERVICE_ACCOUNT
 */

const { getDb, admin, verifyAndGetCompanyId } = require("./_firebase");

const ALLOWED_ORIGIN = process.env.SITE_URL || "https://job-dox.com";

const headers = {
  "Access-Control-Allow-Origin":  ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

  // ── Auth verification ──
  const companyId = await verifyAndGetCompanyId(event.headers["authorization"] || event.headers["Authorization"]);
  if (!companyId) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body" }) }; }

  const {
    twilioNumber, disclosureMessage, callGroups, activeCallGroupId,
    // Call Transcriber settings
    callTranscriberEnabled, transcriberAutoCreateProject,
    transcriberKeywords, transcriberWorkTypes, transcriberProjectTypes,
  } = body;

  const db      = getDb();
  const payload = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

  if (twilioNumber       !== undefined) payload.twilioNumber       = twilioNumber;
  if (disclosureMessage  !== undefined) payload.disclosureMessage  = disclosureMessage;
  if (callGroups         !== undefined) payload.callGroups         = callGroups;
  if (activeCallGroupId  !== undefined) payload.activeCallGroupId  = activeCallGroupId;

  // Call Transcriber fields
  if (callTranscriberEnabled       !== undefined) payload.callTranscriberEnabled       = callTranscriberEnabled;
  if (transcriberAutoCreateProject !== undefined) payload.transcriberAutoCreateProject = transcriberAutoCreateProject;
  if (transcriberKeywords          !== undefined) payload.transcriberKeywords          = transcriberKeywords;
  if (transcriberWorkTypes         !== undefined) payload.transcriberWorkTypes         = transcriberWorkTypes;
  if (transcriberProjectTypes      !== undefined) payload.transcriberProjectTypes      = transcriberProjectTypes;

  try {
    await db.doc(`companies/${companyId}/settings/phone`).set(payload, { merge: true });

    // Keep reverse-lookup in sync so inbound calls route to the right company
    if (twilioNumber) {
      const e164 = toE164(twilioNumber);
      const key  = (e164 || twilioNumber).replace(/\+/g, "_");
      await db.doc(`phoneNumbers/${key}`).set({
        companyId,
        twilioNumber: e164 || twilioNumber,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("save-phone-settings error:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "An error occurred" }) };
  }
};
