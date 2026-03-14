/**
 * netlify/functions/reports-analyze.js
 * AI-powered reports analysis for Job-Dox Reports module.
 * Uses plain fetch — no @anthropic-ai/sdk dependency required.
 * Reads ANTHROPIC_API_KEY from Netlify environment variables.
 */

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
    console.warn('[reports-analyze] Cortex Coins check failed, allowing call:', err.message);
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

  const { prompt, mode = "reports", companyId, userId } = body;
  if (!prompt || typeof prompt !== "string") {
    return respond(400, { error: "Missing required field: prompt" });
  }

  // ── Cortex Coins gate ──
  const coinCheck = await deductCortexCoin(companyId, 'reports-analyze', userId);
  if (!coinCheck.allowed) {
    return respond(403, {
      error: 'cortex_coins_exhausted',
      message: coinCheck.message,
      coinData: coinCheck.coinData,
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return respond(503, { error: "AI analysis not configured. Add ANTHROPIC_API_KEY in Netlify environment variables." });
  }

  const systemPrompt = `You are a business intelligence analyst for a professional restoration contractor company (water damage, fire, mold, storm, reconstruction, etc.).

You analyze project data to provide actionable insights. Your responses should be:
- Data-driven with specific numbers and percentages
- Actionable — tell them what to DO, not just what the data shows
- Concise — use bullet points and bold headers
- Focused on profitability, efficiency, and growth opportunities

Format using **bold** for section headers and - for bullet points.
Keep responses under 800 words. Lead with the most important insight.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system:     systemPrompt,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      console.error("[reports-analyze] Anthropic error:", json);
      return respond(res.status, { error: json.error?.message || "Anthropic API error" });
    }

    const text = json.content?.find(b => b.type === "text")?.text || "";
    return respond(200, { text, mode, cortexCoins: coinCheck.coinData });

  } catch (err) {
    console.error("[reports-analyze] error:", err);
    return respond(500, { error: err.message || "Analysis failed" });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin":  "*",
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
