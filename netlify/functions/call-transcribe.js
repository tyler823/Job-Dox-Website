/**
 * call-transcribe.js
 * Netlify Function — Call Transcriber with Keyword Detection & Auto Project Creation
 *
 * When a company has Call Transcriber enabled, this function:
 *  1. Downloads the Twilio recording audio
 *  2. Sends it to Anthropic Claude for transcription + keyword extraction
 *  3. Detects customer name, event type, phone number, and address from the call
 *  4. Checks existing projects to avoid duplicates (by name, phone, address)
 *  5. Creates a new project if the customer is new
 *  6. Deducts a Cortex Coin for the AI usage
 *
 * Called by call-recording-ready.js when transcription is enabled.
 *
 * Env vars required:
 *   FIREBASE_SERVICE_ACCOUNT, ANTHROPIC_API_KEY,
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
 */

const { getDb, admin, verifyAndGetCompanyId, deductCortexCoinDirect } = require("./_firebase");

const ALLOWED_ORIGIN = process.env.SITE_URL || "https://job-dox.ai";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };
}

function respond(code, body) {
  return { statusCode: code, headers: corsHeaders(), body: JSON.stringify(body) };
}

/** Deduct a Cortex Coin for this company (direct Firestore). */
async function deductCortexCoin(companyId, userId) {
  return deductCortexCoinDirect(companyId, "call-transcribe", userId);
}

/**
 * Download a Twilio recording as a base64-encoded WAV/MP3 buffer.
 * Twilio requires Basic auth with account SID + auth token.
 */
async function downloadRecording(recordingUrl) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Twilio credentials not configured.");

  // Ensure we request the .mp3 version
  const url = recordingUrl.endsWith(".mp3") ? recordingUrl : `${recordingUrl}.mp3`;

  const res = await fetch(url, {
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
    },
  });

  if (!res.ok) throw new Error(`Failed to download recording: ${res.status}`);

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer);
}

/**
 * Call Anthropic to transcribe and extract structured data from a call recording.
 * Uses the audio input capability to process the MP3 directly.
 */
async function transcribeAndExtract(audioBuffer, companyContext) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured.");

  const base64Audio = audioBuffer.toString("base64");

  const { customWorkTypes = [], customProjectTypes = [], keywords = [] } = companyContext;

  const keywordSection = keywords.length > 0
    ? `\nThe company has configured these keywords to listen for: ${keywords.join(", ")}\nFlag any of these keywords that appear in the conversation.`
    : "";

  const workTypeSection = customWorkTypes.length > 0
    ? `Available work/event types: ${customWorkTypes.join(", ")}`
    : "Common event types: Water Damage, Fire Damage, Mold Remediation, Storm Damage, Roofing, Plumbing, HVAC, General Restoration";

  const projectTypeSection = customProjectTypes.length > 0
    ? `Available project/loss types: ${customProjectTypes.join(", ")}`
    : "";

  const systemPrompt = `You are a call transcription analyst for a professional service company (restoration, roofing, or similar trade).
Your job is to:
1. Transcribe the phone call recording accurately
2. Extract key customer and project details from the conversation
3. Determine if the caller is requesting a new service/project

${workTypeSection}
${projectTypeSection}
${keywordSection}

Respond with ONLY valid JSON matching this schema:
{
  "transcript": "Full transcription of the call",
  "summary": "2-3 sentence summary of the call",
  "customerName": "Customer's full name or null if not mentioned",
  "customerPhone": "Customer's phone number or null if not mentioned",
  "customerEmail": "Customer's email or null if not mentioned",
  "projectAddress": "Project/service address or null if not mentioned",
  "projectCity": "City or null",
  "projectState": "State or null",
  "projectZip": "ZIP code or null",
  "eventType": "Type of event/work needed (from available types) or null",
  "projectType": "Type of loss/project or null",
  "insuranceClaim": "Insurance claim number or null",
  "insuranceCarrier": "Insurance company name or null",
  "dateOfLoss": "Date of loss/incident or null",
  "isNewProjectRequest": true/false,
  "confidence": "high" | "medium" | "low",
  "detectedKeywords": ["keyword1", "keyword2"],
  "notes": "Any additional context or important details from the call"
}

Rules:
- Be accurate with the transcription — capture what was actually said
- Only populate fields that were clearly mentioned in the conversation
- Set isNewProjectRequest to true ONLY if the caller is clearly requesting new service
- Set confidence based on how clear and complete the extracted information is
- detectedKeywords should only include keywords from the configured list that appeared in the call
- If no keywords list was provided, leave detectedKeywords empty`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: "Please transcribe this phone call recording and extract the customer/project details.",
          },
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "audio/mpeg",
              data: base64Audio,
            },
          },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("[call-transcribe] Anthropic API error:", response.status, errBody);
    throw new Error(`AI service error: ${response.status}`);
  }

  const aiData = await response.json();
  const rawText = aiData?.content?.[0]?.text || "";

  // Strip accidental markdown fences
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    console.error("[call-transcribe] JSON parse error. Raw:", rawText);
    throw new Error("AI returned malformed JSON.");
  }
}

/**
 * Check if a matching customer/project already exists.
 * Checks by: customer name, phone number, and project address.
 * Returns the matching project if found, null if customer is new.
 */
async function findExistingCustomer(db, companyId, extracted) {
  const { customerName, customerPhone, projectAddress } = extracted;
  const projectsRef = db.collection(`companies/${companyId}/projects`);

  // Only check active (non-archived) projects
  const snap = await projectsRef.where("archived", "!=", true).get().catch(() => null);
  if (!snap || snap.empty) {
    // If that query fails (archived field may not exist), try without filter
    const allSnap = await projectsRef.get().catch(() => null);
    if (!allSnap || allSnap.empty) return null;
    return matchProject(allSnap, customerName, customerPhone, projectAddress);
  }

  return matchProject(snap, customerName, customerPhone, projectAddress);
}

function matchProject(snap, customerName, customerPhone, projectAddress) {
  const normalize = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizePhone = (s) => (s || "").replace(/\D/g, "").slice(-10);

  for (const doc of snap.docs) {
    const p = doc.data();
    if (p.archived) continue;

    // Check phone match (most reliable)
    if (customerPhone && p.clientPhone) {
      if (normalizePhone(customerPhone) === normalizePhone(p.clientPhone)) {
        return { id: doc.id, ...p, matchedBy: "phone" };
      }
    }

    // Check name match
    if (customerName && p.client) {
      if (normalize(customerName) === normalize(p.client)) {
        return { id: doc.id, ...p, matchedBy: "name" };
      }
    }

    // Check address match
    if (projectAddress && p.address) {
      if (normalize(projectAddress) === normalize(p.address)) {
        return { id: doc.id, ...p, matchedBy: "address" };
      }
    }
  }

  return null;
}

/**
 * Generate the next project number in JD-YYYY-NNN format.
 */
async function getNextProjectNumber(db, companyId) {
  const year = new Date().getFullYear();
  const prefix = `JD-${year}-`;

  const snap = await db.collection(`companies/${companyId}/projects`)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  let maxNum = 0;
  snap.forEach(doc => {
    const pn = doc.data().projectNumber || "";
    if (pn.startsWith(prefix)) {
      const num = parseInt(pn.replace(prefix, ""), 10);
      if (num > maxNum) maxNum = num;
    }
  });

  return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
}

/**
 * Create a new project from transcription data.
 */
async function createProject(db, companyId, extracted, callDocId) {
  const projectNumber = await getNextProjectNumber(db, companyId);

  const projectData = {
    projectNumber,
    name: extracted.customerName
      ? `${extracted.customerName} - ${extracted.eventType || "New Project"}`
      : `Call Project - ${extracted.eventType || new Date().toLocaleDateString()}`,
    type: extracted.eventType || "",
    address: extracted.projectAddress || "",
    city: extracted.projectCity || "",
    state: extracted.projectState || "",
    zip: extracted.projectZip || "",
    client: extracted.customerName || "Unknown Caller",
    clientPhone: extracted.customerPhone || "",
    clientEmail: extracted.customerEmail || "",
    carrier: extracted.insuranceCarrier || "",
    claim: extracted.insuranceClaim || "",
    dateOfLoss: extracted.dateOfLoss || "",
    status: "New Lead",
    notes: `Auto-created from call transcription.\n${extracted.summary || ""}`,
    sourceCallId: callDocId,
    createdVia: "call-transcriber",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection(`companies/${companyId}/projects`).add(projectData);
  return { id: ref.id, ...projectData, projectNumber };
}

// ── Main handler ──
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  // ── Auth verification ──
  const companyId = await verifyAndGetCompanyId(event.headers["authorization"] || event.headers["Authorization"]);
  if (!companyId) {
    return respond(401, { error: "Unauthorized" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, { error: "Invalid JSON body" });
  }

  const { callDocId, recordingUrl, userId = "" } = body;

  if (!callDocId || !recordingUrl) {
    return respond(400, { error: "callDocId and recordingUrl are required." });
  }

  const db = getDb();

  try {
    // 1. Check if transcription is enabled for this company
    const phoneSettingsSnap = await db.doc(`companies/${companyId}/settings/phone`).get();
    const phoneSettings = phoneSettingsSnap.exists ? phoneSettingsSnap.data() : {};

    if (!phoneSettings.callTranscriberEnabled) {
      return respond(200, { skipped: true, reason: "Call Transcriber is not enabled for this company." });
    }

    // 2. Deduct Cortex Coin
    const coinCheck = await deductCortexCoin(companyId, userId);
    if (!coinCheck.allowed) {
      // Save a note on the call doc that transcription was skipped due to coins
      await db.doc(`companies/${companyId}/calls/${callDocId}`).update({
        transcriptionSkipped: true,
        transcriptionSkipReason: "insufficient_coins",
      }).catch(() => {});
      return respond(403, {
        error: "cortex_coins_exhausted",
        message: coinCheck.message,
      });
    }

    // 3. Load company context for better keyword detection
    const companySnap = await db.doc(`companies/${companyId}`).get().catch(() => null);
    const companyData = companySnap?.exists ? companySnap.data() : {};

    const companyContext = {
      customWorkTypes: phoneSettings.transcriberWorkTypes || [],
      customProjectTypes: phoneSettings.transcriberProjectTypes || [],
      keywords: phoneSettings.transcriberKeywords || [],
    };

    // 4. Download recording from Twilio
    const audioBuffer = await downloadRecording(recordingUrl);

    // 5. Transcribe and extract with Anthropic
    const extracted = await transcribeAndExtract(audioBuffer, companyContext);

    // 6. Save transcription to call doc
    const transcriptionData = {
      transcript: extracted.transcript || "",
      transcriptSummary: extracted.summary || "",
      transcriptExtracted: {
        customerName: extracted.customerName || null,
        customerPhone: extracted.customerPhone || null,
        customerEmail: extracted.customerEmail || null,
        projectAddress: extracted.projectAddress || null,
        projectCity: extracted.projectCity || null,
        projectState: extracted.projectState || null,
        projectZip: extracted.projectZip || null,
        eventType: extracted.eventType || null,
        projectType: extracted.projectType || null,
        insuranceClaim: extracted.insuranceClaim || null,
        insuranceCarrier: extracted.insuranceCarrier || null,
        dateOfLoss: extracted.dateOfLoss || null,
        isNewProjectRequest: extracted.isNewProjectRequest || false,
        confidence: extracted.confidence || "low",
        detectedKeywords: extracted.detectedKeywords || [],
        notes: extracted.notes || "",
      },
      transcribedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.doc(`companies/${companyId}/calls/${callDocId}`).update(transcriptionData);

    // 7. Auto-create project if enabled and this looks like a new project request
    let createdProject = null;
    let existingMatch = null;

    if (phoneSettings.transcriberAutoCreateProject && extracted.isNewProjectRequest) {
      // Check for existing customer first
      existingMatch = await findExistingCustomer(db, companyId, extracted);

      if (existingMatch) {
        // Customer exists — link call to existing project instead
        await db.doc(`companies/${companyId}/calls/${callDocId}`).update({
          projectId: existingMatch.id,
          autoLinkedToExisting: true,
          matchedBy: existingMatch.matchedBy,
        });
      } else if (extracted.confidence !== "low") {
        // New customer with sufficient confidence — create project
        createdProject = await createProject(db, companyId, extracted, callDocId);

        // Link the call to the new project
        await db.doc(`companies/${companyId}/calls/${callDocId}`).update({
          projectId: createdProject.id,
          autoCreatedProject: true,
        });
      }
    }

    return respond(200, {
      success: true,
      transcript: extracted.transcript,
      summary: extracted.summary,
      extracted: transcriptionData.transcriptExtracted,
      existingMatch: existingMatch
        ? { id: existingMatch.id, name: existingMatch.name, matchedBy: existingMatch.matchedBy }
        : null,
      createdProject: createdProject
        ? { id: createdProject.id, projectNumber: createdProject.projectNumber, name: createdProject.name }
        : null,
      coinData: coinCheck.coinData || null,
    });

  } catch (err) {
    console.error("[call-transcribe] error:", err);

    // Save error state on call doc
    await db.doc(`companies/${companyId}/calls/${callDocId}`).update({
      transcriptionError: err.message,
      transcriptionSkipped: true,
    }).catch(() => {});

    return respond(502, { error: "An error occurred" });
  }
};
