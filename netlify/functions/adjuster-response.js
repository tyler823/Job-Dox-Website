/**
 * adjuster-response.js
 * Netlify Function — AI Adjuster Response Bot
 *
 * Receives an email/message from an adjuster or customer, project context,
 * and company industry, then uses the Anthropic API to craft a professional
 * rebuttal grounded in industry best practices.
 *
 * Env var required: ANTHROPIC_API_KEY
 */

const { getDb, verifyAndGetCompanyId, deductCortexCoinDirect } = require("./_firebase");

const ALLOWED_ORIGIN = process.env.SITE_URL || 'https://job-dox.ai';

/** Check & deduct a Cortex Coin for this company (direct Firestore). */
const deductCortexCoin = deductCortexCoinDirect;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Auth verification ──
  const companyId = await verifyAndGetCompanyId(event.headers["authorization"] || event.headers["Authorization"]);
  if (!companyId) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const {
    incomingMessage,       // The adjuster/customer email body to respond to
    incomingSubject,       // Subject line of the incoming email
    senderName,            // Who sent the email (adjuster name, customer name)
    senderRole,            // "adjuster", "customer", "carrier", etc.
    projectNotes,          // Array of daily notes from the project
    projectName,           // Project name/address
    projectType,           // Water Damage, Fire & Smoke, etc.
    companyName,           // The restoration company name
    companyIndustry,       // "Restoration", "Roofing", etc.
    conversationHistory,   // Previous messages in thread (optional)
    userName,              // The user composing the response
    customInstructions,    // Any additional user instructions for the AI
    userId,                // User ID for usage logging
    adjusterInstructions = '',   // Company-level adjuster response approach
    customerInstructions = '',   // Company-level customer communication approach
    contextDocuments = [],       // Array of {name, content} reference documents
  } = body;

  if (!incomingMessage || typeof incomingMessage !== 'string') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'incomingMessage is required' }) };
  }

  // ── Cortex Coins gate ──
  const coinCheck = await deductCortexCoin(companyId, 'adjuster-response', userId);
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'AI not configured. Add ANTHROPIC_API_KEY in Netlify environment variables.' }),
    };
  }

  // ── Build industry-specific knowledge context ──
  let industryContext = '';
  const industry = (companyIndustry || 'Restoration').toLowerCase();

  if (industry === 'restoration') {
    industryContext = `
INDUSTRY KNOWLEDGE — RESTORATION:
You have expert knowledge of the following authoritative sources. Reference them when applicable:

1. IICRC Standards (Institute of Inspection Cleaning and Restoration Certification):
   - S500: Standard for Professional Water Damage Restoration (water classification, categories, drying procedures, psychrometry)
   - S520: Standard for Professional Mold Remediation (containment, clearance testing, protocols)
   - S540: Standard for Professional Cleaning & Decontamination of HVAC Systems
   - S560: Standard for Professional Textile Inspection & Restoration
   - S600: Standard for Professional Assessment of Fire, Smoke, and Combustion
   - S700: Standard for Professional Carpet Cleaning
   - S790: Standard for Professional Trauma & Crime Scene Cleanup
   - S800: Standard for Professional Assessment of Mass Casualty Incidents

2. IICRC Reference Guides (R-series):
   - R520: Reference Guide for Professional Mold Remediation
   - R500: Reference Guide for Professional Water Damage Restoration

3. ReadyTraining.app best practices:
   - Proper documentation and photo protocols
   - Moisture mapping and monitoring procedures
   - Equipment placement justification (dehu CFM calculations, air mover ratios)
   - Drying goals and scientific drying principles
   - Industry-standard billing practices for restoration work
   - Proper communication with insurance adjusters and TPAs

4. Xactimate / Insurance Industry Standards:
   - Line item legitimacy and proper invoicing
   - Overhead & Profit (O&P) entitlements
   - Proper scope documentation
   - Program work vs non-program work distinctions
   - ACV vs RCV calculations and depreciation disputes
   - Supplement best practices

5. Common adjuster disputes and proper rebuttals:
   - Equipment charge disputes (drying ratios, placement necessity)
   - Scope of work disagreements (what's necessary vs excessive)
   - Line item challenges (Xactimate pricing, labor minimums)
   - Category/class classification disputes
   - Overhead & Profit disputes
   - After-hours / emergency rate disputes
   - Content manipulation vs replacement thresholds
   - Subcontractor markup disputes
`;
  } else if (industry === 'roofing') {
    industryContext = `
INDUSTRY KNOWLEDGE — ROOFING:
- Manufacturer installation specifications and warranty requirements
- Building code compliance (IRC, IBC)
- Insurance claim documentation for storm/hail damage
- Proper measurement and waste factor calculations
- Material upgrade justifications
- Scope disputes with adjusters regarding underlayment, drip edge, ice & water shield
`;
  } else {
    industryContext = `
INDUSTRY KNOWLEDGE — ${companyIndustry || 'General Contracting'}:
- Industry standard pricing and labor rates
- Building code compliance
- Scope of work best practices
- Insurance claim documentation standards
- Proper professional communication with adjusters and clients
`;
  }

  // ── Build project context ──
  let projectContext = '';
  if (projectName || projectType) {
    projectContext += `\nPROJECT CONTEXT:\n`;
    if (projectName) projectContext += `- Project: ${projectName}\n`;
    if (projectType) projectContext += `- Type: ${projectType}\n`;
  }
  if (projectNotes && projectNotes.length > 0) {
    projectContext += `\nPROJECT NOTES (field documentation from the job):\n`;
    projectNotes.slice(-20).forEach((note, i) => {
      const date = note.createdAt ? new Date(note.createdAt).toLocaleDateString() : '';
      projectContext += `[${date}] ${note.author?.name || 'Staff'}: ${note.text}\n`;
    });
  }

  // ── Build conversation context ──
  let threadContext = '';
  if (conversationHistory && conversationHistory.length > 0) {
    threadContext = '\nPREVIOUS MESSAGES IN THIS THREAD:\n';
    conversationHistory.slice(-10).forEach(msg => {
      const dir = msg.direction === 'outbound' ? `${companyName || 'Company'}` : (msg.from || 'Sender');
      threadContext += `---\nFrom: ${dir}\nSubject: ${msg.subject || ''}\n${msg.body || ''}\n`;
    });
  }

  // ── Build company-specific context block ──
  let companyContextBlock = '';
  if (adjusterInstructions || customerInstructions || contextDocuments.length > 0) {
    companyContextBlock = `\n\n--- COMPANY-SPECIFIC INSTRUCTIONS ---\n`;

    if (adjusterInstructions) {
      companyContextBlock += `\nADJUSTER RESPONSE APPROACH (follow these instructions):\n${adjusterInstructions}\n`;
    }

    if (customerInstructions) {
      companyContextBlock += `\nCUSTOMER COMMUNICATION APPROACH (follow these instructions):\n${customerInstructions}\n`;
    }

    if (contextDocuments.length > 0) {
      companyContextBlock += `\nREFERENCE DOCUMENTS:\n`;
      contextDocuments.forEach(doc => {
        companyContextBlock += `\n[${doc.name}]\n${doc.content}\n`;
      });
    }

    companyContextBlock += `\n--- END COMPANY INSTRUCTIONS ---\n`;
  }

  const systemPrompt = companyContextBlock + `You are an expert communication advisor for ${companyName || 'a professional contracting company'} in the ${companyIndustry || 'Restoration'} industry.

Your role is to craft professional, firm but courteous email responses to adjuster communications, customer complaints, and insurance disputes. Your responses should:

1. Be grounded in industry best practices and standards
2. Reference specific standards, codes, or guidelines when disputing claims
3. Maintain a professional, collaborative tone — never combative
4. Protect the company's legitimate scope of work and pricing
5. Use factual project documentation to support positions
6. Be ready to send with minimal editing — complete, formatted emails
7. Include specific technical references when the adjuster's position contradicts established standards

${industryContext}
${projectContext}
${threadContext}

RESPONSE FORMAT RULES:
- Write the email body only (no subject line unless asked)
- Use a professional greeting and sign-off
- Sign off as "${userName || 'The Team'}" from "${companyName || 'Our Company'}"
- Keep paragraphs concise but thorough
- When citing standards, be specific (e.g., "Per IICRC S500, Section 12.3...")
- If the adjuster's claim contradicts science or standards, politely but firmly explain why
- Suggest next steps or resolution paths when appropriate
${customInstructions ? `\nADDITIONAL INSTRUCTIONS FROM USER:\n${customInstructions}` : ''}`;

  const userPrompt = `Please formulate a professional response to the following ${senderRole || 'adjuster'} communication:

FROM: ${senderName || 'Unknown Sender'} (${senderRole || 'Adjuster'})
SUBJECT: ${incomingSubject || '(no subject)'}

MESSAGE:
${incomingMessage}

Craft a response that professionally addresses their points, defends the company's position using industry standards and the project documentation available, and moves toward a resolution.`;

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
        body: JSON.stringify({ error: "An error occurred" }),
      };
    }

    const aiData = await response.json();
    const responseText = aiData?.content?.[0]?.text || '';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ response: responseText, cortexCoins: coinCheck.coinData }),
    };

  } catch (err) {
    console.error('Fetch error calling Anthropic:', err);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "An error occurred" }),
    };
  }
};
