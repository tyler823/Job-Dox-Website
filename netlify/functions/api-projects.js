/**
 * api-projects.js
 * Netlify Function — Standalone Projects endpoint for external integrations.
 *
 * GET /.netlify/functions/api-projects
 *   Reads the x-api-key header, resolves the owning company,
 *   and returns that company's projects.
 *
 * Authentication: X-Api-Key or Authorization: Bearer <key>
 * Rate limited: 60 req/min per key (via _api-helpers.js)
 */

const { getDb } = require("./_firebase");
const {
  CORS_HEADERS, authenticateRequest, success, error, getQueryParams,
} = require("./_api-helpers");

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return error(405, "method_not_allowed", "Only GET is supported.");
  }

  // Authenticate via API key
  const auth = await authenticateRequest(event);
  if (auth.error) return auth.error;

  const { companyId, keyDoc } = auth;

  // Scope check
  if (!keyDoc.scopes || !keyDoc.scopes.includes("projects:read")) {
    return error(403, "insufficient_scope", 'This API key lacks the "projects:read" scope.');
  }

  const db = getDb();
  const params = getQueryParams(event);

  try {
    const pageSize = Math.min(parseInt(params.limit) || 50, 100);
    let q = db.collection(`companies/${companyId}/projects`)
      .orderBy("createdAt", "desc")
      .limit(pageSize);

    if (params.status) {
      q = db.collection(`companies/${companyId}/projects`)
        .where("status", "==", params.status)
        .orderBy("createdAt", "desc")
        .limit(pageSize);
    }

    const snap = await q.get();
    const projects = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || "",
        type: data.type || "",
        status: data.status || "",
        address: data.address || "",
        clientName: data.clientName || "",
        clientPhone: data.clientPhone || "",
        clientEmail: data.clientEmail || "",
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      };
    });

    return success(projects, {
      pagination: {
        limit: pageSize,
        count: projects.length,
      },
    });
  } catch (err) {
    console.error("api-projects error:", err);
    return error(500, "internal_error", "An unexpected error occurred.");
  }
};
