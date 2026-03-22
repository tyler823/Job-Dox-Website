/**
 * export-company-data.js
 * Netlify Function — Export all Firestore data for a given company.
 *
 * Used by Job-Dox employees via Support Mode to export a company's
 * complete dataset as a downloadable JSON object.
 *
 * Security: Only @job-dox.com email addresses may call this endpoint.
 * Every attempt is logged to console for audit trail.
 *
 * Request (POST):
 *   { "companyId": "mem_xxxxxxxx", "requesterEmail": "tyler@job-dox.com" }
 *
 * Env vars: FIREBASE_SERVICE_ACCOUNT
 */

const { getDb } = require("./_firebase");

const ALLOWED_ORIGINS = ["https://job-dox.ai", "http://localhost:5173"];

function corsHeaders(origin) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

function respond(statusCode, body, origin) {
  return { statusCode, headers: corsHeaders(origin), body: JSON.stringify(body) };
}

/**
 * Read all documents from a subcollection. Returns [] if the collection
 * is empty or does not exist. Logs and returns [] on error.
 */
async function readSubcollection(db, path) {
  try {
    const snap = await db.collection(path).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error(`[export-company-data] Error reading ${path}:`, err.message);
    return [];
  }
}

/**
 * Read apiKeys subcollection with field filtering — only safe fields are returned.
 */
async function readApiKeys(db, companyPath) {
  try {
    const snap = await db.collection(`${companyPath}/apiKeys`).get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name ?? null,
        prefix: data.prefix ?? null,
        scopes: data.scopes ?? null,
        createdAt: data.createdAt ?? null,
        active: data.active ?? null,
      };
    });
  } catch (err) {
    console.error(`[export-company-data] Error reading ${companyPath}/apiKeys:`, err.message);
    return [];
  }
}

const PROJECT_SUBCOLLECTIONS = [
  "tasks",
  "notes",
  "shifts",
  "contacts",
  "media",
  "documents",
  "scope",
  "budget",
  "calls",
  "messages",
];

/**
 * Read all projects and their nested subcollections.
 */
async function readProjects(db, companyPath) {
  try {
    const snap = await db.collection(`${companyPath}/projects`).get();
    const projects = [];

    for (const doc of snap.docs) {
      const project = { id: doc.id, ...doc.data() };
      const projectPath = `${companyPath}/projects/${doc.id}`;

      for (const sub of PROJECT_SUBCOLLECTIONS) {
        project[sub] = await readSubcollection(db, `${projectPath}/${sub}`);
      }

      projects.push(project);
    }

    return projects;
  } catch (err) {
    console.error(`[export-company-data] Error reading ${companyPath}/projects:`, err.message);
    return [];
  }
}

exports.handler = async (event) => {
  const origin = event.headers["origin"] || event.headers["Origin"] || "";

  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" }, origin);
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return respond(400, { error: "Invalid JSON body" }, origin);
    }

    const { companyId, requesterEmail } = body;

    // Audit log every attempt
    console.log(`[export-company-data] Export attempt — requesterEmail: ${requesterEmail}, companyId: ${companyId}`);

    // Security: require @job-dox.com email
    if (!requesterEmail || !requesterEmail.endsWith("@job-dox.com")) {
      return respond(403, { error: "Unauthorized" }, origin);
    }

    if (!companyId) {
      return respond(400, { error: "companyId is required" }, origin);
    }

    const db = getDb();
    const companyPath = `companies/${companyId}`;
    const data = {};

    // Projects (with nested subcollections)
    data.projects = await readProjects(db, companyPath);

    // Top-level subcollections
    const topLevelCollections = [
      "staff",
      "invites",
      "offices",
      "settings",
      "vendors",
      "priceLists",
      "templates",
      "coins",
      "marketdox",
    ];

    for (const name of topLevelCollections) {
      data[name] = await readSubcollection(db, `${companyPath}/${name}`);
    }

    // apiKeys — filtered fields only
    data.apiKeys = await readApiKeys(db, companyPath);

    return respond(200, {
      exportedAt: new Date().toISOString(),
      companyId,
      exportedBy: requesterEmail,
      data,
    }, origin);
  } catch (err) {
    console.error("[export-company-data] Unexpected error:", err);
    return respond(500, { error: err.message || "Internal server error" }, origin);
  }
};
