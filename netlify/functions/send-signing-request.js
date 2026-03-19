/**
 * send-signing-request.js
 * Netlify Function — Send signature request emails/SMS to document signers
 *
 * Receives a list of signers, generates per-signer signing tokens,
 * stores them in Firestore, and sends notification via SMS (Twilio).
 * Email delivery requires an email provider (SendGrid, SES, etc.) —
 * see TODO below.
 *
 * Sequential signing: each signer receives a token. The signing page
 * checks Firestore to see if the previous signer has completed before
 * allowing access. This ensures only one signer at a time.
 *
 * Env vars required in Netlify dashboard:
 *   TWILIO_ACCOUNT_SID       = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN         = your_auth_token
 *   FIREBASE_SERVICE_ACCOUNT  = { ...service account JSON }
 *   SITE_URL                  = https://job-dox.com  (for signing links)
 *   SENDGRID_API_KEY          = (optional, for email delivery)
 */

const twilio = require("twilio");
const { getDb, admin } = require("./_firebase");
const crypto = require("crypto");

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

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body" }) }; }

  const {
    companyId,
    projectId,
    projectName,
    docId,
    docName,
    signers,      // [{ id, name, email, phone, role, status }]
    from,         // optional Twilio number for SMS
  } = body;

  if (!companyId || !docId || !signers?.length) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "An error occurred" }) };
  }

  const db = getDb();

  // ── Verify companyId exists in Firestore ──
  try {
    const companyDoc = await db.collection("companies").doc(companyId).get();
    if (!companyDoc.exists) {
      await db.collection("audit_logs").add({
        event: "unauthorized_access_attempt",
        function: "send-signing-request",
        companyId,
        success: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { statusCode: 403, headers, body: JSON.stringify({ error: "An error occurred" }) };
    }
  } catch (_) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "An error occurred" }) };
  }
  const ts = admin.firestore.FieldValue.serverTimestamp();
  const results = [];

  // Generate a signing token for each signer and store in Firestore
  for (let i = 0; i < signers.length; i++) {
    const signer = signers[i];
    const token  = generateToken();

    // Store signing session in Firestore
    // The signing page will validate this token and check sequential access
    await db.collection(`companies/${companyId}/signingRequests`).doc(token).set({
      companyId,
      projectId:   projectId || null,
      projectName: projectName || null,
      docId,
      docName:     docName || null,
      signerIdx:   i,
      signerName:  signer.name || "",
      signerEmail: signer.email || "",
      signerPhone: signer.phone || "",
      signerRole:  signer.role || "",
      status:      "pending",        // pending → active → completed
      // Sequential signing: signer can only access when all previous are "completed"
      order:       i,
      totalSigners: signers.length,
      token,
      createdAt:   ts,
      expiresAt:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 day expiry
    });

    const signingUrl = `${ALLOWED_ORIGIN}/sign/${token}`;
    let sendResult = { method: "none", status: "pending" };

    // ── Send SMS if Twilio is configured and signer has phone ──
    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const tAuth = process.env.TWILIO_AUTH_TOKEN;
    if (sid && tAuth && signer.phone && from) {
      const recipient = toE164(signer.phone);
      if (recipient) {
        try {
          const client = twilio(sid, tAuth);
          const smsBody = `${signer.name ? `Hi ${signer.name.split(" ")[0]}, y` : "Y"}our signature is requested on "${docName || "a document"}"${projectName ? ` for project ${projectName}` : ""}. Sign here: ${signingUrl}`;
          const msg = await client.messages.create({
            from: toE164(from),
            to:   recipient,
            body: smsBody,
          });
          sendResult = { method: "sms", status: "sent", sid: msg.sid };

          // Log to SMS history
          await db.collection(`companies/${companyId}/smsLogs`).add({
            direction:   "outbound",
            to:          recipient,
            body:        smsBody,
            status:      "sent",
            twilioSid:   msg.sid,
            contactName: signer.name || signer.email,
            projectId:   projectId || null,
            type:        "signing_request",
            createdAt:   ts,
          });
        } catch (e) {
          sendResult = { method: "sms", status: "failed", error: e.message };
        }
      }
    }

    // ── Send Email ──
    // TODO: Integrate email provider (SendGrid, AWS SES, etc.)
    // When configured, send an HTML email with the signing link.
    // For now, the signing URL is stored in Firestore and can be
    // copied/shared manually from the portal.
    //
    // Example SendGrid integration:
    //   const sgMail = require("@sendgrid/mail");
    //   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    //   await sgMail.send({
    //     to: signer.email,
    //     from: "noreply@job-dox.com",
    //     subject: `Signature requested: ${docName}`,
    //     html: `<p>Hi ${signer.name},</p>
    //            <p>Your signature is requested on <strong>${docName}</strong>.</p>
    //            <p><a href="${signingUrl}">Click here to sign</a></p>`,
    //   });

    if (signer.email && sendResult.method === "none") {
      sendResult = { method: "email", status: "pending", note: "Email provider not configured — signing URL saved to Firestore" };
    }

    results.push({
      signerEmail: signer.email,
      signerName:  signer.name,
      token,
      signingUrl,
      delivery: sendResult,
    });
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      sent:    results.filter(r => r.delivery.status === "sent").length,
      pending: results.filter(r => r.delivery.status === "pending").length,
      failed:  results.filter(r => r.delivery.status === "failed").length,
      results,
    }),
  };
};
