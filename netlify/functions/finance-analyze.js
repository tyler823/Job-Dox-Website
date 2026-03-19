/**
 * netlify/functions/finance-analyze.js
 * Uses plain fetch — no @anthropic-ai/sdk dependency required.
 * Reads ANTHROPIC_API_KEY from Netlify environment variables.
 */

const { getDb } = require("./_firebase");

/** Check & deduct a Cortex Coin for this company. */
async function deductCortexCoin(companyId, feature, userId) {
  if (!companyId) return { allowed: true, coinData: null };
  try {
    const baseUrl = process.env.URL || process.env.SITE_URL || 'https://job-dox.ai';
    const res = await fetch(`${baseUrl}/.netlify/functions/cortex-coins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, action: 'deduct', feature, userId }),
    });
    const data = await res.json();
    if (res.status === 403 || data.error === 'insufficient_coins') {
      return { allowed: false, message: data.message, coinData: data };
    }
    return { allowed: true, coinData: data };
  } catch (err) {
    console.warn('[finance-analyze] Cortex Coins check failed, allowing call:', err.message);
    return { allowed: true, coinData: null };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return respond(400, { error: "Invalid JSON body" }); }

  const { prompt, mode = "job", companyId, userId } = body;
  if (!prompt || typeof prompt !== "string") {
    return respond(400, { error: "Missing required field: prompt" });
  }

  // ── Verify companyId exists in Firestore ──
  if (!companyId) {
    return respond(400, { error: "An error occurred" });
  }
  try {
    const db = getDb();
    const companyDoc = await db.collection("companies").doc(companyId).get();
    if (!companyDoc.exists) {
      return respond(403, { error: "An error occurred" });
    }
  } catch (_) {
    return respond(500, { error: "An error occurred" });
  }

  // ── Cortex Coins gate ──
  const coinCheck = await deductCortexCoin(companyId, 'finance-analyze', userId);
  if (!coinCheck.allowed) {
    return respond(403, {
      error: 'cortex_coins_exhausted',
      message: coinCheck.message,
      coinData: coinCheck.coinData,
    });
  }

  const systemPrompt = mode === "portfolio"
    ? `You are a financial analyst for a restoration contractor company.
Give concise, direct portfolio-level briefings to the business owner.
Use dollar amounts where possible. Flag anything urgent immediately.
Be actionable — no fluff. Format using **bold** for section headers and - for bullets.`
    : `You are a financial analyst for a restoration contractor company.
Analyze individual job financials and give specific, actionable advice to the project manager.
Reference actual dollar amounts from the data. Flag margin risks, AR aging, and cost overruns directly.
Format using **bold** for section headers and - for bullets.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: mode === "portfolio" ? 600 : 1000,
        system:     systemPrompt,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      console.error("[finance-analyze] Anthropic error:", json);
      return respond(res.status, { error: "An error occurred" });
    }

    const text = json.content?.find(b => b.type === "text")?.text || "";
    return respond(200, { text, mode, cortexCoins: coinCheck.coinData });

  } catch (err) {
    console.error("[finance-analyze] error:", err);
    return respond(500, { error: "An error occurred" });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin":  "https://job-dox.ai",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control":                "no-store",
  };
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
    body: JSON.stringify(body),
  };
}
