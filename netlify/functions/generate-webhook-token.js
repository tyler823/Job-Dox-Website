/**
 * generate-webhook-token.js
 * Netlify Function — Generate or retrieve a company's unique webhook URL
 *
 * Called from the MarketDox Setup Modal when a company first connects.
 * Generates a cryptographically random token and stores it in Firestore.
 * If a token already exists, returns the existing one (idempotent).
 *
 * POST /api/generate-webhook-token
 * Body: { companyId: string }
 * Returns: { webhookUrl: string }
 */

const { getDb } = require("./_firebase");
const crypto = require("crypto");

const ALLOWED_ORIGIN = process.env.SITE_URL || "https://job-dox.ai";
const SITE_URL = process.env.SITE_URL || "https://job-dox.ai";

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { companyId } = body;
  if (!companyId || typeof companyId !== "string") {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "companyId is required" }) };
  }

  let db;
  try {
    db = getDb();
  } catch (e) {
    console.error("[generate-webhook-token] Firebase init error:", e.message);
    return { statusCode: 503, headers, body: JSON.stringify({ error: "Service unavailable" }) };
  }

  try {
    const docRef = db.collection("company_settings").doc(companyId);
    const existing = await docRef.get();

    // If token already exists, return it (idempotent)
    if (existing.exists && existing.data().webhookToken) {
      const token = existing.data().webhookToken;
      const webhookUrl = `${SITE_URL}/api/marketing-data/${companyId}/${token}`;
      return { statusCode: 200, headers, body: JSON.stringify({ webhookUrl }) };
    }

    // Generate a new cryptographically random token
    const token = crypto.randomBytes(32).toString("hex");

    await docRef.set({
      webhookToken: token,
      tokenCreatedAt: new Date().toISOString(),
    }, { merge: true });

    const webhookUrl = `${SITE_URL}/api/marketing-data/${companyId}/${token}`;
    return { statusCode: 200, headers, body: JSON.stringify({ webhookUrl }) };
  } catch (e) {
    console.error("[generate-webhook-token] Error:", e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Failed to generate token" }) };
  }
};
