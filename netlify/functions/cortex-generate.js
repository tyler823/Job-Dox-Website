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

const ALLOWED_ORIGIN = process.env.SITE_URL || 'https://job-dox.com';

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

  const { workType, notes, roles = [], statuses = [], statusTriggers = [] } = context;

  if (!workType || typeof workType !== 'string' || workType.length > 100) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'workType is required' }) };
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
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Anthropic API error:', response.status, errBody);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: `AI service error: ${response.status}` }),
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
        body: JSON.stringify({ error: 'AI returned malformed JSON. Try again.' }),
      };
    }

    if (!parsed.phases || !Array.isArray(parsed.phases)) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'AI response missing phases array.' }),
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
