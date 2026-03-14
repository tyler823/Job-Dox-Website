/**
 * _api-helpers.js
 * Shared helpers for the Job-Dox Open API.
 * Prefixed with _ so Netlify doesn't treat it as a function endpoint.
 *
 * Provides:
 *   - API key validation & company resolution
 *   - Rate limiting (per API key)
 *   - CORS headers for external integrations
 *   - Standard JSON response helpers
 */

const crypto = require("crypto");
const { getDb } = require("./_firebase");

// ── Constants ───────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX       = 60;        // 60 requests per minute per key
const API_VERSION          = "2026-03-01";

// In-memory rate limit store (resets on cold start — fine for serverless)
const rateLimitStore = new Map();

// ── CORS Headers ────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "X-API-Version": API_VERSION,
};

// ── Response Helpers ────────────────────────────────────────────
function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function success(data, meta = {}) {
  return json(200, { ok: true, data, ...meta });
}

function created(data) {
  return json(201, { ok: true, data });
}

function error(statusCode, code, message) {
  return json(statusCode, { ok: false, error: { code, message } });
}

// ── API Key Validation ──────────────────────────────────────────
/**
 * Hash an API key for secure storage comparison.
 * We store SHA-256 hashes in Firestore, never the raw key.
 */
function hashApiKey(rawKey) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Generate a new API key. Format: jdx_live_<32 random hex chars>
 */
function generateApiKey() {
  const random = crypto.randomBytes(32).toString("hex");
  return `jdx_live_${random}`;
}

/**
 * Validate an API key from the request and return the company context.
 * Checks the `Authorization: Bearer <key>` header or `X-Api-Key` header.
 *
 * Returns { companyId, keyDoc } on success, or an error response object.
 */
async function authenticateRequest(event) {
  const authHeader = event.headers["authorization"] || event.headers["Authorization"] || "";
  const xApiKey    = event.headers["x-api-key"] || event.headers["X-Api-Key"] || "";

  let rawKey = "";
  if (authHeader.startsWith("Bearer ")) {
    rawKey = authHeader.slice(7).trim();
  } else if (xApiKey) {
    rawKey = xApiKey.trim();
  }

  if (!rawKey || !rawKey.startsWith("jdx_live_")) {
    return { error: error(401, "unauthorized", "Missing or invalid API key. Use Authorization: Bearer jdx_live_... or X-Api-Key header.") };
  }

  const hash = hashApiKey(rawKey);
  const db   = getDb();

  // Look up the key by hash
  const snap = await db.collection("apiKeys").where("keyHash", "==", hash).limit(1).get();
  if (snap.empty) {
    return { error: error(401, "unauthorized", "Invalid API key.") };
  }

  const keyDoc = { id: snap.docs[0].id, ...snap.docs[0].data() };

  // Check if key is active
  if (keyDoc.status !== "active") {
    return { error: error(403, "key_revoked", "This API key has been revoked.") };
  }

  // Check expiration
  if (keyDoc.expiresAt && keyDoc.expiresAt.toDate() < new Date()) {
    return { error: error(403, "key_expired", "This API key has expired.") };
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(keyDoc.id);
  if (!rateLimitResult.allowed) {
    return {
      error: json(429, {
        ok: false,
        error: { code: "rate_limited", message: `Rate limit exceeded. Max ${RATE_LIMIT_MAX} requests per minute.` },
        retryAfter: rateLimitResult.retryAfter,
      }),
    };
  }

  // Update last used timestamp (fire and forget — don't await)
  db.collection("apiKeys").doc(keyDoc.id).update({
    lastUsedAt: new Date(),
    requestCount: (keyDoc.requestCount || 0) + 1,
  }).catch(() => {});

  return { companyId: keyDoc.companyId, keyDoc };
}

// ── Rate Limiting ───────────────────────────────────────────────
function checkRateLimit(keyId) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  if (!rateLimitStore.has(keyId)) {
    rateLimitStore.set(keyId, []);
  }

  const timestamps = rateLimitStore.get(keyId).filter(t => t > windowStart);
  rateLimitStore.set(keyId, timestamps);

  if (timestamps.length >= RATE_LIMIT_MAX) {
    const oldestInWindow = timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter };
  }

  timestamps.push(now);
  return { allowed: true, remaining: RATE_LIMIT_MAX - timestamps.length };
}

// ── Request Parsing ─────────────────────────────────────────────
function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

function getQueryParams(event) {
  return event.queryStringParameters || {};
}

/**
 * Simple path router for Netlify functions.
 * Given a base path like "/api/v1", extracts the remaining segments.
 * e.g., path "/api/v1/projects/abc123" → ["projects", "abc123"]
 */
function parsePath(rawPath, basePath) {
  const path = rawPath.replace(basePath, "").replace(/^\/+|\/+$/g, "");
  return path ? path.split("/") : [];
}

module.exports = {
  CORS_HEADERS,
  API_VERSION,
  json,
  success,
  created,
  error,
  hashApiKey,
  generateApiKey,
  authenticateRequest,
  parseBody,
  getQueryParams,
  parsePath,
};
