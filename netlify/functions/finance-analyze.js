/**
 * netlify/functions/finance-analyze.js
 * ─────────────────────────────────────────────────────────────────
 * AI financial analyst endpoint for Job-Dox Finance module.
 * Called by JobDoxFinance.jsx — both per-job analysis and
 * portfolio-level briefings.
 *
 * Required env var in Netlify dashboard:
 *   ANTHROPIC_API_KEY=sk-ant-...
 * ─────────────────────────────────────────────────────────────────
 */

const Anthropic = require("@anthropic-ai/sdk");

exports.handler = async (event) => {
  /* ── CORS preflight ── */
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, { error: "Invalid JSON body" });
  }

  const { prompt, mode = "job" } = body;
  if (!prompt || typeof prompt !== "string") {
    return respond(400, { error: "Missing required field: prompt" });
  }

  /* ── Anthropic call ── */
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const systemPrompt = mode === "portfolio"
      ? `You are a financial analyst for a restoration contractor company.
         Your job is to give concise, direct portfolio-level briefings to the business owner.
         Use dollar amounts where possible. Flag anything urgent immediately.
         Be actionable — no fluff. Format using **bold** for section headers and - for bullets.`
      : `You are a financial analyst for a restoration contractor company.
         Analyze individual job financials and give specific, actionable advice to the project manager.
         Reference actual dollar amounts from the data. Flag margin risks, AR aging, and cost overruns directly.
         Format using **bold** for section headers and - for bullets.`;

    const message = await client.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: mode === "portfolio" ? 600 : 1000,
      system:     systemPrompt,
      messages:   [{ role: "user", content: prompt }],
    });

    const text = message.content?.find(b => b.type === "text")?.text || "";
    return respond(200, { text, mode, tokens: message.usage?.output_tokens });

  } catch (err) {
    console.error("[finance-analyze]", err);
    const status = err.status || 500;
    return respond(status, { error: err.message || "Analysis failed" });
  }
};

/* ── Helpers ── */
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
