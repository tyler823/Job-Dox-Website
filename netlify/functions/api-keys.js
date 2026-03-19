/**
 * api-keys.js
 * Netlify Function — API Key Management
 *
 * POST /api-keys   { action: "generate" | "list" | "revoke", ... }
 *
 * This function is called from the Job-Dox admin UI (authenticated via
 * Memberstack + Firebase) to manage API keys for a company.
 * Only users with permission >= 8 (Admin) can manage API keys.
 *
 * Firestore collection: /apiKeys/{keyId}
 *   {
 *     companyId, name, keyHash, keyPrefix,
 *     scopes: ["projects:read", "projects:write", ...],
 *     status: "active" | "revoked",
 *     createdBy, createdAt, lastUsedAt, requestCount,
 *     expiresAt (optional)
 *   }
 */

const { getDb } = require("./_firebase");
const { hashApiKey, generateApiKey, json, error } = require("./_api-helpers");

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return json(204, "");
  }

  if (event.httpMethod !== "POST") {
    return error(405, "method_not_allowed", "Use POST.");
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return error(400, "invalid_json", "Request body must be valid JSON.");
  }

  const { action, companyId, memberstackId } = body;
  console.log("[api-keys] action:", action, "companyId:", companyId, "memberstackId:", memberstackId);

  if (!companyId || !memberstackId) {
    console.log("[api-keys] REJECTED — missing companyId or memberstackId");
    return error(400, "missing_fields", "companyId and memberstackId are required.");
  }

  try {
    // Verify caller has admin permission (>= 8)
    const db = getDb();
    console.log("[api-keys] Firestore connected, checking staff permission…");
    const staffSnap = await db.doc(`companies/${companyId}/staff/${memberstackId}`).get();
    const staffExists = staffSnap.exists;
    const staffPerm = staffExists ? (staffSnap.data().permission || 0) : -1;
    console.log("[api-keys] staffExists:", staffExists, "permission:", staffPerm);
    if (!staffExists || staffPerm < 8) {
      console.log("[api-keys] REJECTED — insufficient permission");
      return error(403, "forbidden", "Unauthorized");
    }

    console.log("[api-keys] Permission OK, routing to action:", action);
    switch (action) {
      case "generate": return handleGenerate(db, body, staffSnap.data());
      case "list":     return handleList(db, companyId);
      case "revoke":   return handleRevoke(db, body);
      default:
        return error(400, "invalid_action", "action must be 'generate', 'list', or 'revoke'.");
    }
  } catch (err) {
    console.error("[api-keys] UNCAUGHT handler error:", err);
    return error(500, "internal_error", "An error occurred");
  }
};

// ── Generate a new API key ──────────────────────────────────────
async function handleGenerate(db, body, staffData) {
  console.log("[api-keys:generate] ENTERED handleGenerate");
  const { companyId, name, scopes, expiresInDays } = body;
  console.log("[api-keys:generate] name:", name, "scopes:", scopes, "expiresInDays:", expiresInDays);

  if (!name) {
    console.log("[api-keys:generate] REJECTED — missing name");
    return error(400, "missing_fields", "name is required for key generation.");
  }

  // Default scopes if not specified
  const validScopes = [
    "projects:read", "projects:write",
    "projects:read:docs",
    "contacts:read", "contacts:write",
    "staff:read",
    "events:read", "events:write",
    "webhooks:manage",
  ];
  const requestedScopes = (scopes || ["projects:read", "contacts:read", "staff:read", "events:read"])
    .filter(s => validScopes.includes(s));
  console.log("[api-keys:generate] requestedScopes:", requestedScopes);

  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 16) + "..."; // e.g. "jdx_live_a3f2b1..."
  console.log("[api-keys:generate] key generated, prefix:", keyPrefix);

  const keyData = {
    companyId,
    name,
    keyHash,
    keyPrefix,
    scopes: requestedScopes,
    status: "active",
    createdBy: staffData.name || body.memberstackId,
    createdAt: new Date(),
    lastUsedAt: null,
    requestCount: 0,
  };

  if (expiresInDays && expiresInDays > 0) {
    const expires = new Date();
    expires.setDate(expires.getDate() + expiresInDays);
    keyData.expiresAt = expires;
  }

  console.log("[api-keys:generate] Writing to Firestore apiKeys collection…");
  let docRef;
  try {
    docRef = await db.collection("apiKeys").add(keyData);
  } catch (writeErr) {
    console.error("[api-keys:generate] FIRESTORE WRITE FAILED:", writeErr);
    throw writeErr; // re-throw so the outer catch returns a 500
  }
  console.log("[api-keys:generate] SUCCESS — docRef.id:", docRef.id);

  return json(201, {
    ok: true,
    data: {
      id: docRef.id,
      name,
      // IMPORTANT: This is the ONLY time the full key is returned.
      // Store it securely — it cannot be retrieved again.
      apiKey: rawKey,
      prefix: keyPrefix,
      scopes: requestedScopes,
      expiresAt: keyData.expiresAt || null,
    },
    message: "API key created. Save this key securely — it will not be shown again.",
  });
}

// ── List all API keys for a company ─────────────────────────────
async function handleList(db, companyId) {
  const snap = await db.collection("apiKeys")
    .where("companyId", "==", companyId)
    .get();

  const keys = snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      prefix: data.keyPrefix,
      scopes: data.scopes,
      status: data.status,
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      lastUsedAt: data.lastUsedAt,
      requestCount: data.requestCount || 0,
      expiresAt: data.expiresAt || null,
    };
  });

  keys.sort((a, b) => {
    const tA = a.createdAt?._seconds || 0;
    const tB = b.createdAt?._seconds || 0;
    return tB - tA;
  });

  return json(200, { ok: true, data: keys });
}

// ── Revoke an API key ───────────────────────────────────────────
async function handleRevoke(db, body) {
  const { companyId, keyId } = body;

  if (!keyId) {
    return error(400, "missing_fields", "keyId is required.");
  }

  const keyRef = db.collection("apiKeys").doc(keyId);
  const keySnap = await keyRef.get();

  if (!keySnap.exists) {
    return error(404, "not_found", "API key not found.");
  }

  if (keySnap.data().companyId !== companyId) {
    return error(403, "forbidden", "This key does not belong to your company.");
  }

  await keyRef.update({ status: "revoked", revokedAt: new Date() });

  return json(200, { ok: true, message: "API key revoked." });
}
