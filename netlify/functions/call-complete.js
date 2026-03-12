/**
 * call-complete.js
 * Netlify Function — Twilio call status callback
 *
 * Twilio hits this endpoint when a call ends (completed, no-answer, busy, failed).
 * Updates the Firestore call log doc with final status and duration.
 * Not called directly by the portal — only by Twilio.
 *
 * Env vars required: FIREBASE_SERVICE_ACCOUNT
 */

const { getDb, admin } = require("./_firebase");

exports.handler = async (event) => {
  // Twilio sends form-encoded POST
  function parseFormBody(raw) {
    const out = {};
    if (!raw) return out;
    raw.split("&").forEach(pair => {
      const [k, v] = pair.split("=").map(decodeURIComponent);
      out[k] = v;
    });
    return out;
  }

  const params     = parseFormBody(event.body);
  const qs         = event.queryStringParameters || {};
  const callDocId  = qs.callDocId  || params.callDocId;
  const companyId  = qs.companyId  || params.companyId;

  if (callDocId && companyId) {
    try {
      const db = getDb();
      await db.doc(`companies/${companyId}/calls/${callDocId}`).update({
        status:     params.CallStatus   || "completed",
        duration:   parseInt(params.CallDuration || "0", 10),
        answeredBy: params.AnsweredBy   || null,
        endedAt:    admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error("call-complete update failed:", err.message);
    }
  }

  // Twilio expects a 204 or a TwiML response — 204 is fine here
  return { statusCode: 204, body: "" };
};
