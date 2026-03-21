/**
 * cortex-generate.js
 * Netlify Function — CortexAI Workflow Generator
 *
 * Receives work type + company context from mindflow.html,
 * calls the Anthropic API server-side (key never exposed to browser),
 * returns structured JSON phases/tasks.
 *
 * Env var required in Netlify dashboard:
 *   ANTHROPIC_API_KEY = sk-ant-...
 */

const { getDb } = require("./_firebase");

const ALLOWED_ORIGIN = process.env.SITE_URL || 'https://job-dox.ai';

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
    console.warn('[cortex-generate] Cortex Coins check failed, allowing call:', err.message);
    return { allowed: true, coinData: null };
  }
}

exports.handler = async (event) => {
  // ── CORS ──
  const headers = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Parse request ──
  let context;
  try {
    context = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { workType, notes, roles = [], statuses = [], statusTriggers = [], companyId, userId, prompt, type, messages: conversationMessages, systemPrompt: copilotSystemPrompt } = context;

  // ── Verify companyId exists in Firestore ──
  if (!companyId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "An error occurred" }) };
  }
  try {
    const db = getDb();
    const companyDoc = await db.collection("companies").doc(companyId).get();
    if (!companyDoc.exists) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "An error occurred" }) };
    }
  } catch (_) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "An error occurred" }) };
  }

  // ── Guard: API key must exist ──
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'AI generation not configured. Add ANTHROPIC_API_KEY in Netlify environment variables.' }),
    };
  }

  // ── Cortex Coins gate ──
  const coinCheck = await deductCortexCoin(companyId, type === 'comparable' ? 'comparable-lookup' : 'cortex-generate', userId);
  if (!coinCheck.allowed) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        error: 'cortex_coins_exhausted',
        message: coinCheck.message,
        coinData: coinCheck.coinData,
      }),
    };
  }

  /* ════════════════════════════════════════════════════════════════
     COMPARABLE LOOKUP — ContentsDox AI item comparison
  ════════════════════════════════════════════════════════════════ */
  if (type === 'comparable') {
    if (!prompt || typeof prompt !== 'string') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'prompt is required for comparable lookups' }) };
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error('Anthropic API error (comparable):', response.status, errBody);
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ error: "An error occurred" }),
        };
      }

      const aiData = await response.json();
      const rawText = aiData?.content?.[0]?.text || '';

      // Strip markdown fences if present
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

      // Extract JSON from response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON in comparable response. Raw:', rawText);
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ error: "An error occurred" }),
        };
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (parseErr) {
        console.error('JSON parse error (comparable). Raw:', rawText);
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ error: "An error occurred" }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ result: JSON.stringify(parsed) }),
      };

    } catch (err) {
      console.error('Fetch error (comparable):', err);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "An error occurred" }),
      };
    }
  }

  /* ════════════════════════════════════════════════════════════════
     COPILOT — Conversational AI assistant with multi-turn history
  ════════════════════════════════════════════════════════════════ */
  if (type === 'copilot') {
    if (!conversationMessages || !Array.isArray(conversationMessages) || conversationMessages.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'messages array is required for copilot mode' }) };
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1024,
          system: copilotSystemPrompt || 'You are Cortex, a helpful project management assistant for restoration companies using Job-Dox.',
          messages: conversationMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error('Anthropic API error (copilot):', response.status, errBody);
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ error: "An error occurred" }),
        };
      }

      const aiData = await response.json();
      const content = aiData?.content?.[0]?.text || '';

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ content, coinData: coinCheck.coinData }),
      };

    } catch (err) {
      console.error('Fetch error (copilot):', err);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "An error occurred" }),
      };
    }
  }

  /* ════════════════════════════════════════════════════════════════
     WORKFLOW GENERATION — CortexAI SOP builder (original flow)
  ════════════════════════════════════════════════════════════════ */
  if (!workType || typeof workType !== 'string' || workType.length > 100) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'workType is required' }) };
  }

  // ── Build prompt ──
  const roleList     = roles.length     ? roles.join(', ')                            : 'Project Manager, Lead Technician, Field Technician, Estimator, QC Inspector, Billing Specialist';
  const statusList   = statuses.length  ? statuses.join(', ')                         : 'New Lead, Scoping, In Progress, Pending Approval, Completed';
  const triggerLines = statusTriggers.length
    ? statusTriggers.map(t => `  - When a task titled "${t.keyword}" is completed → move project to "${t.toStatus}"`).join('\n')
    : '  (none configured)';
  const notesSection = notes?.trim() ? `\nAdditional context from the user:\n${notes.trim()}\n` : '';

  const systemPrompt = `You are a workflow architect for a professional restoration company.
Your job is to generate detailed, phase-based standard operating procedures (SOPs) for restoration work types.
You have deep knowledge of IICRC standards (S500, S520, S540), OSHA regulations, insurance claim workflows, Xactimate estimating, and TPA (Third Party Administrator) protocols.

Always respond with ONLY valid JSON — no markdown, no explanation, no backticks.
The JSON must match this exact schema:
{
  "phases": [
    {
      "name": "Phase name",
      "desc": "Brief description of this phase",
      "dur": "Estimated duration e.g. '2-4 hrs' or '1-2 days'",
      "onCompleteStatus": null,
      "items": [
        {
          "title": "Task title",
          "priority": "Critical|High|Medium|Low",
          "role": "One of the provided roles",
          "durationMin": 30,
          "tags": ["tag1","tag2"],
          "desc": "Full task description",
          "checklist": ["Step 1","Step 2","Step 3"],
          "notes": "IICRC or compliance reference if applicable",
          "statusTrigger": "Status name to move project to when this task completes, or null"
        }
      ]
    }
  ]
}

Rules:
- Generate 5-7 phases that follow a logical restoration lifecycle
- Each phase should have 3-8 tasks (real, actionable, specific to the work type)
- Use only roles from the provided list
- statusTrigger must be null OR exactly one of the provided status names
- Match statusTriggers to the provided trigger keywords when relevant
- Checklists should have 4-8 concrete, numbered steps
- Include real IICRC/OSHA standard references in notes where applicable
- Duration estimates should be realistic for a professional crew
- Tags should be 1-4 lowercase words from: field, documentation, compliance, communication, billing, safety, equipment, measurement, insurance, photo`;

  const userPrompt = `Generate a complete SOP workflow for: ${workType}

Available staff roles: ${roleList}
Project statuses: ${statusList}
Status auto-trigger rules:
${triggerLines}
${notesSection}
Generate a thorough, professional ${workType} workflow that a restoration company can immediately use.`;

  // ── Call Anthropic API ──
  try {
    const abortController = new AbortController();
    const abortTimeout = setTimeout(() => abortController.abort(), 50000);
    let response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        signal: abortController.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
    } finally {
      clearTimeout(abortTimeout);
    }

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Anthropic API error:', response.status, errBody);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "An error occurred" }),
      };
    }

    const aiData = await response.json();
    const rawText = aiData?.content?.[0]?.text || '';

    // Strip any accidental markdown fences
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('JSON parse error. Raw AI output:', rawText);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "An error occurred" }),
      };
    }

    if (!parsed.phases || !Array.isArray(parsed.phases)) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "An error occurred" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsed),
    };

  } catch (err) {
    console.error('Fetch error calling Anthropic:', err);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'Failed to reach AI service. Check network or API key.' }),
    };
  }
};
