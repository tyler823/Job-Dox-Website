/**
 * call-recording-ready.js
 * Netlify Function — Twilio recording status callback
 *
 * Twilio hits this endpoint 1-2 minutes after a call ends,
 * once the .mp3 recording has been processed and is ready to play.
 * Saves the recording URL to the Firestore call log doc so the
 * portal's Call Log and Message Center can show a Play button.
 * Not called directly by the portal — only by Twilio.
 *
 * Env vars required: FIREBASE_SERVICE_ACCOUNT
 */

const { getDb, admin } = require("./_firebase");

exports.handler = async (event) => {
  function parseFormBody(raw) {
    const out = {};
    if (!raw) return out;
    raw.split("&").forEach(pair => {
      const [k, v] = pair.split("=").map(decodeURIComponent);
      out[k] = v;
    });
    return out;
  }

  const params    = parseFormBody(event.body);
  const qs        = event.queryStringParameters || {};
  const callDocId = qs.callDocId || params.callDocId;
  const companyId = qs.companyId || params.companyId;

  const recordingUrl      = params.RecordingUrl      || "";
  const recordingDuration = params.RecordingDuration || "0";
  const recordingSid      = params.RecordingSid      || null;

  if (callDocId && companyId && recordingUrl) {
    try {
      const db  = getDb();
      // Append .mp3 for direct browser playback — Twilio serves both formats
      const url = recordingUrl.endsWith(".mp3") ? recordingUrl : `${recordingUrl}.mp3`;

      await db.doc(`companies/${companyId}/calls/${callDocId}`).update({
        recordingUrl:      url,
        recordingSid,
        recordingDuration: parseInt(recordingDuration, 10),
        recordingReadyAt:  admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error("call-recording-ready update failed:", err.message);
    }
  }

  return { statusCode: 204, body: "" };
};
