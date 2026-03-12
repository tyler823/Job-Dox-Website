/**
 * inbound-call.js
 * Netlify Function — Twilio inbound call webhook
 *
 * Set this URL as your Twilio number's "A call comes in" webhook:
 *   https://job-dox.com/.netlify/functions/inbound-call
 *
 * Looks up the company by their Twilio number, plays the disclosure
 * message, then simultaneously rings everyone in the active call group.
 *
 * Env vars required in Netlify dashboard:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, FIREBASE_SERVICE_ACCOUNT
 */

const { getDb, admin } = require("./_firebase");

const SITE_URL = process.env.SITE_URL || "https://job-dox.com";

// Twilio sends form-encoded POST bodies, so we parse them manually
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

function xmlEscape(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

exports.handler = async (event) => {
  const twimlHeaders = {
    "Content-Type":                "text/xml",
    "Access-Control-Allow-Origin": "*",
  };

  const params       = parseFormBody(event.body);
  const calledNumber = params.To   || "";
  const callerNumber = params.From || "";
  const normalised   = toE164(calledNumber);
  const lookupKey    = (normalised || calledNumber).replace(/\+/g, "_");

  const db = getDb();

  // Find which company owns this Twilio number
  const numSnap = await db.collection("phoneNumbers").doc(lookupKey).get().catch(() => null);

  if (!numSnap || !numSnap.exists) {
    return {
      statusCode: 200, headers: twimlHeaders,
      body: `<?xml version="1.0" encoding="UTF-8"?>
<Response><Say voice="alice">This number is not yet configured. Goodbye.</Say><Hangup/></Response>`,
    };
  }

  const { companyId } = numSnap.data();

  // Load phone settings for this company
  const settingsSnap = await db.doc(`companies/${companyId}/settings/phone`).get().catch(() => null);
  const settings     = settingsSnap?.exists ? settingsSnap.data() : {};

  const disclosure    = settings.disclosureMessage ||
    "Thank you for calling. This call may be recorded for quality and training purposes.";
  const callGroups    = settings.callGroups || [];
  const activeGroupId = settings.activeCallGroupId || null;
  const activeGroup   = callGroups.find(g => g.id === activeGroupId) || callGroups[0] || null;

  // Collect phone numbers for all members of the active ring group
  const memberPhones = [];
  if (activeGroup?.memberIds?.length) {
    const staffSnap = await db.collection(`companies/${companyId}/staff`).get().catch(() => null);
    staffSnap?.forEach(doc => {
      const s = doc.data();
      if (activeGroup.memberIds.includes(doc.id) && s.phone) {
        const e164 = toE164(s.phone);
        if (e164) memberPhones.push(e164);
      }
    });
  }

  // Pre-create the inbound call log doc
  const base         = SITE_URL.replace(/\/$/, "");
  const callbackBase = `${base}/.netlify/functions`;
  const callRef      = db.collection(`companies/${companyId}/calls`).doc();

  await callRef.set({
    id:            callRef.id,
    type:          "inbound",
    clientPhone:   callerNumber,
    clientName:    "Inbound Caller",
    status:        "ringing",
    projectId:     null,
    companyId,
    callGroupName: activeGroup?.name || null,
    createdAt:     admin.firestore.FieldValue.serverTimestamp(),
    duration:      null,
    recordingUrl:  null,
  }).catch(() => {});

  const dialNumbers = memberPhones.length > 0
    ? memberPhones.map(p => `    <Number>${p}</Number>`).join("\n")
    : `    <Number>${normalised || calledNumber}</Number>`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${xmlEscape(disclosure)}</Say>
  <Dial record="record-from-answer-dual"
        timeout="30"
        recordingStatusCallback="${callbackBase}/call-recording-ready?callDocId=${callRef.id}&amp;companyId=${companyId}"
        action="${callbackBase}/call-complete?callDocId=${callRef.id}&amp;companyId=${companyId}">
${dialNumbers}
  </Dial>
  <Say voice="alice">We are sorry, no one is available to take your call. Please try again later.</Say>
</Response>`;

  return { statusCode: 200, headers: twimlHeaders, body: twiml };
};
