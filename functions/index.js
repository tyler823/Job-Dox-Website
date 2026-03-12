const functions  = require("firebase-functions");
const admin      = require("firebase-admin");
const twilio     = require("twilio");

admin.initializeApp();
const db = admin.firestore();

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function getTwilio() {
  const { sid, token } = functions.config().twilio;
  if (!sid || !token) throw new functions.https.HttpsError(
    "failed-precondition",
    "Twilio credentials not configured. Run: firebase functions:config:set twilio.sid=... twilio.token=..."
  );
  return twilio(sid, token);
}

function toE164(num) {
  const digits = String(num || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : null;
}

function callbackBase() {
  const region    = functions.config().project?.region || "us-central1";
  const projectId = process.env.GCLOUD_PROJECT;
  return `https://${region}-${projectId}.cloudfunctions.net`;
}

/* ─────────────────────────────────────────────────────────────
   1.  SEND SMS / MMS
       Handles staff task comments AND customer notifications.
       data: { to (string | string[]), body, mediaUrl?, from? }
───────────────────────────────────────────────────────────── */
exports.sendSMS = functions.https.onCall(async (data) => {
  const client = getTwilio();
  const { to, body, mediaUrl, from } = data;
  const fromNumber = from || functions.config().twilio.default_from;

  if (!to || !body) throw new functions.https.HttpsError("invalid-argument", "`to` and `body` are required.");

  const recipients = (Array.isArray(to) ? to : [to]).map(toE164).filter(Boolean);

  const results = await Promise.all(recipients.map(recipient => {
    const payload = { from: fromNumber, to: recipient, body };
    if (mediaUrl && mediaUrl.trim()) payload.mediaUrl = [mediaUrl];
    return client.messages.create(payload)
      .then(m  => ({ to: recipient, sid: m.sid, status: "sent" }))
      .catch(e => ({ to: recipient, error: e.message, status: "failed" }));
  }));

  return {
    sent:    results.filter(r => r.status === "sent").length,
    failed:  results.filter(r => r.status === "failed").length,
    results,
  };
});


/* ─────────────────────────────────────────────────────────────
   2.  INITIATE OUTBOUND CALL
       Twilio calls the staff member's cell first.
       When they answer, it bridges them to the client and records.

       data: {
         staffPhone, clientPhone, clientName, staffName,
         companyId, projectId?, twilioNumber
       }
───────────────────────────────────────────────────────────── */
exports.initiateCall = functions.https.onCall(async (data) => {
  const client = getTwilio();
  const { staffPhone, clientPhone, clientName, staffName, companyId, projectId, twilioNumber } = data;

  if (!staffPhone || !clientPhone || !companyId || !twilioNumber) {
    throw new functions.https.HttpsError("invalid-argument",
      "staffPhone, clientPhone, companyId, and twilioNumber are required.");
  }

  const staffE164  = toE164(staffPhone);
  const clientE164 = toE164(clientPhone);
  const fromNumber = toE164(twilioNumber);

  if (!staffE164 || !clientE164) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid phone number format.");
  }

  const base = callbackBase();

  // Pre-create the call log doc so the portal shows "connecting…" immediately
  const callRef = db.collection(`companies/${companyId}/calls`).doc();
  await callRef.set({
    id:           callRef.id,
    type:         "outbound",
    clientName:   clientName  || clientPhone,
    clientPhone:  clientE164,
    staffName:    staffName   || "Staff",
    staffPhone:   staffE164,
    status:       "connecting",
    projectId:    projectId || null,
    companyId,
    createdAt:    admin.firestore.FieldValue.serverTimestamp(),
    duration:     null,
    recordingUrl: null,
  });

  // TwiML that runs when the staff member picks up:
  // says a quick notice, dials the client, records the whole thing
  const clientSafe = (clientName || "your client").replace(/[<>&]/g,
    c => ({ "<":"&lt;",">":"&gt;","&":"&amp;" }[c]));

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting you to ${clientSafe}. This call may be recorded.</Say>
  <Dial record="record-from-answer-dual"
        recordingStatusCallback="${base}/callRecordingReady?callDocId=${callRef.id}&amp;companyId=${companyId}"
        action="${base}/callComplete?callDocId=${callRef.id}&amp;companyId=${companyId}">
    <Number>${clientE164}</Number>
  </Dial>
</Response>`;

  const call = await client.calls.create({
    to:   staffE164,
    from: fromNumber,
    twiml,
    statusCallback:       `${base}/callComplete?callDocId=${callRef.id}&companyId=${companyId}`,
    statusCallbackMethod: "POST",
    statusCallbackEvent:  ["completed", "no-answer", "busy", "failed"],
  });

  await callRef.update({ twilioCallSid: call.sid });

  return { callDocId: callRef.id, twilioCallSid: call.sid };
});


/* ─────────────────────────────────────────────────────────────
   3.  INBOUND CALL HANDLER  (HTTP webhook — set as your
       Twilio number's "A call comes in" URL)

       Plays the company's disclosure message, then
       simultaneously rings all members of the active call group.
───────────────────────────────────────────────────────────── */
exports.handleInboundCall = functions.https.onRequest(async (req, res) => {
  const calledNumber = req.body.To   || req.query.To   || "";
  const callerNumber = req.body.From || req.query.From || "";
  const normalised   = toE164(calledNumber);
  const lookupKey    = (normalised || calledNumber).replace(/\+/g, "_");

  // Find company by Twilio number
  const numSnap = await db.collection("phoneNumbers").doc(lookupKey).get();

  if (!numSnap.exists) {
    return res.type("text/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response><Say>This number is not configured. Goodbye.</Say><Hangup/></Response>`);
  }

  const { companyId } = numSnap.data();
  const settingsSnap  = await db.doc(`companies/${companyId}/settings/phone`).get();
  const settings      = settingsSnap.exists ? settingsSnap.data() : {};

  const disclosure     = settings.disclosureMessage ||
    "Thank you for calling. This call may be recorded for quality purposes.";
  const callGroups     = settings.callGroups || [];
  const activeGroupId  = settings.activeCallGroupId || null;
  const activeGroup    = callGroups.find(g => g.id === activeGroupId) || callGroups[0] || null;

  // Collect phone numbers for the active ring group
  const memberPhones = [];
  if (activeGroup?.memberIds?.length) {
    const staffSnap = await db.collection(`companies/${companyId}/staff`).get();
    staffSnap.forEach(doc => {
      const s = doc.data();
      if (activeGroup.memberIds.includes(doc.id) && s.phone) {
        const e164 = toE164(s.phone);
        if (e164) memberPhones.push(e164);
      }
    });
  }

  // Create the inbound call log doc
  const base    = callbackBase();
  const callRef = db.collection(`companies/${companyId}/calls`).doc();

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
  });

  const dialNumbers = memberPhones.length > 0
    ? memberPhones.map(p => `    <Number>${p}</Number>`).join("\n")
    : `    <Number>${normalised || calledNumber}</Number>`;

  const disclosureSafe = disclosure.replace(/[<>&]/g,
    c => ({ "<":"&lt;",">":"&gt;","&":"&amp;" }[c]));

  res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${disclosureSafe}</Say>
  <Dial record="record-from-answer-dual"
        timeout="30"
        recordingStatusCallback="${base}/callRecordingReady?callDocId=${callRef.id}&amp;companyId=${companyId}"
        action="${base}/callComplete?callDocId=${callRef.id}&amp;companyId=${companyId}">
${dialNumbers}
  </Dial>
  <Say voice="alice">We're sorry, no one is available. Please try again later.</Say>
</Response>`);
});


/* ─────────────────────────────────────────────────────────────
   4.  CALL COMPLETE  (HTTP — Twilio status callback)
       Updates call doc with final status + duration.
───────────────────────────────────────────────────────────── */
exports.callComplete = functions.https.onRequest(async (req, res) => {
  const { callDocId, companyId } = req.query;
  const { CallStatus, CallDuration, AnsweredBy } = req.body;

  if (callDocId && companyId) {
    await db.doc(`companies/${companyId}/calls/${callDocId}`).update({
      status:     CallStatus   || "completed",
      duration:   parseInt(CallDuration || "0", 10),
      answeredBy: AnsweredBy   || null,
      endedAt:    admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
  }
  res.sendStatus(204);
});


/* ─────────────────────────────────────────────────────────────
   5.  CALL RECORDING READY  (HTTP — Twilio recording callback)
       Fires when the .mp3 is processed and the URL is available.
───────────────────────────────────────────────────────────── */
exports.callRecordingReady = functions.https.onRequest(async (req, res) => {
  const { callDocId, companyId } = req.query;
  const { RecordingUrl, RecordingDuration, RecordingSid } = req.body;

  if (callDocId && companyId && RecordingUrl) {
    const url = RecordingUrl.endsWith(".mp3") ? RecordingUrl : `${RecordingUrl}.mp3`;
    await db.doc(`companies/${companyId}/calls/${callDocId}`).update({
      recordingUrl:      url,
      recordingSid:      RecordingSid || null,
      recordingDuration: parseInt(RecordingDuration || "0", 10),
    }).catch(() => {});
  }
  res.sendStatus(204);
});


/* ─────────────────────────────────────────────────────────────
   6.  SAVE PHONE SETTINGS  (callable)
       Stores settings and writes/updates the reverse-lookup doc
       so inbound calls know which company to route to.

       data: { companyId, twilioNumber, disclosureMessage,
               callGroups, activeCallGroupId }
───────────────────────────────────────────────────────────── */
exports.savePhoneSettings = functions.https.onCall(async (data) => {
  const { companyId, twilioNumber, disclosureMessage, callGroups, activeCallGroupId } = data;
  if (!companyId) throw new functions.https.HttpsError("invalid-argument", "companyId is required.");

  const payload = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
  if (twilioNumber       !== undefined) payload.twilioNumber       = twilioNumber;
  if (disclosureMessage  !== undefined) payload.disclosureMessage  = disclosureMessage;
  if (callGroups         !== undefined) payload.callGroups         = callGroups;
  if (activeCallGroupId  !== undefined) payload.activeCallGroupId  = activeCallGroupId;

  await db.doc(`companies/${companyId}/settings/phone`).set(payload, { merge: true });

  // Keep reverse-lookup in sync
  if (twilioNumber) {
    const key = (toE164(twilioNumber) || twilioNumber).replace(/\+/g, "_");
    await db.doc(`phoneNumbers/${key}`).set({
      companyId,
      twilioNumber: toE164(twilioNumber),
    }, { merge: true });
  }

  return { ok: true };
});
