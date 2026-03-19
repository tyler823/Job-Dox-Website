/**
 * api-v1.js
 * Netlify Function — Job-Dox Open API v1
 *
 * Single entry point for all external API requests.
 * Routes: /.netlify/functions/api-v1/<resource>[/<id>][/<sub-resource>]
 *
 * Authentication: Bearer token (API key) or X-Api-Key header.
 * All requests are scoped to the company that owns the API key.
 *
 * ── Endpoints ────────────────────────────────────────────────────
 *
 *  GET    /projects                    List projects
 *  POST   /projects                    Create a project
 *  GET    /projects/:id                Get a single project
 *  PATCH  /projects/:id                Update a project
 *  GET    /projects/:id/contacts       List project contacts
 *  POST   /projects/:id/contacts       Add a project contact
 *  GET    /projects/:id/notes          List daily notes
 *  GET    /projects/:id/tasks          List tasks
 *  POST   /projects/:id/tasks          Create a task
 *  GET    /projects/:id/documents      List documents
 *
 *  GET    /staff                       List company staff
 *
 *  GET    /events                      List recent events
 *  POST   /events                      Emit a custom event
 *
 *  GET    /webhooks                    List registered webhooks
 *  POST   /webhooks                    Register a new webhook
 *  DELETE /webhooks/:id                Delete a webhook
 *  POST   /webhooks/:id/test          Send a test payload
 *
 *  GET    /company                     Get company info
 */

const { getDb } = require("./_firebase");
const {
  CORS_HEADERS, authenticateRequest, success, created, error,
  parseBody, getQueryParams, parsePath,
} = require("./_api-helpers");

const BASE_PATH = "/.netlify/functions/api-v1";

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  // Authenticate
  const auth = await authenticateRequest(event);
  if (auth.error) return auth.error;

  const { companyId, keyDoc } = auth;
  const method   = event.httpMethod;
  const segments = parsePath(event.rawUrl.split("?")[0], BASE_PATH);
  const body     = parseBody(event);
  const params   = getQueryParams(event);
  const db       = getDb();

  // ── Route ─────────────────────────────────────────────────────
  const resource = segments[0] || "";

  try {
    switch (resource) {
      case "projects":  return await handleProjects(db, companyId, keyDoc, method, segments, body, params);
      case "staff":     return await handleStaff(db, companyId, keyDoc, method, segments, params);
      case "events":    return await handleEvents(db, companyId, keyDoc, method, segments, body, params);
      case "webhooks":  return await handleWebhooks(db, companyId, keyDoc, method, segments, body);
      case "company":   return await handleCompany(db, companyId, keyDoc, method);
      default:
        return error(404, "not_found", `Unknown resource: /${resource}. Available: /projects, /staff, /events, /webhooks, /company`);
    }
  } catch (err) {
    console.error("API Error:", err);
    return error(500, "internal_error", "An unexpected error occurred.");
  }
};

// ── Scope check helper ──────────────────────────────────────────
function requireScope(keyDoc, scope) {
  if (!keyDoc.scopes || !keyDoc.scopes.includes(scope)) {
    return error(403, "insufficient_scope", `This API key lacks the "${scope}" scope.`);
  }
  return null;
}

// ════════════════════════════════════════════════════════════════
//  PROJECTS
// ════════════════════════════════════════════════════════════════

async function handleProjects(db, companyId, keyDoc, method, segments, body, params) {
  const projectId    = segments[1];
  const subResource  = segments[2];

  // GET /projects
  if (!projectId && method === "GET") {
    const scopeErr = requireScope(keyDoc, "projects:read");
    if (scopeErr) return scopeErr;
    return await listProjects(db, companyId, params);
  }

  // POST /projects
  if (!projectId && method === "POST") {
    const scopeErr = requireScope(keyDoc, "projects:write");
    if (scopeErr) return scopeErr;
    return await createProject(db, companyId, body);
  }

  // GET /projects/:id
  if (projectId && !subResource && method === "GET") {
    const scopeErr = requireScope(keyDoc, "projects:read");
    if (scopeErr) return scopeErr;
    return await getProject(db, companyId, projectId);
  }

  // PATCH /projects/:id
  if (projectId && !subResource && method === "PATCH") {
    const scopeErr = requireScope(keyDoc, "projects:write");
    if (scopeErr) return scopeErr;
    return await updateProject(db, companyId, projectId, body);
  }

  // Sub-resources
  if (projectId && subResource) {
    switch (subResource) {
      case "contacts": return await handleProjectContacts(db, companyId, keyDoc, method, projectId, body, params);
      case "notes":    return await handleProjectNotes(db, companyId, keyDoc, method, projectId, params);
      case "tasks":    return await handleProjectTasks(db, companyId, keyDoc, method, projectId, body, params);
      case "documents":return await handleProjectDocuments(db, companyId, keyDoc, method, projectId, params);
      default:
        return error(404, "not_found", `Unknown sub-resource: /projects/:id/${subResource}`);
    }
  }

  return error(405, "method_not_allowed", `${method} not supported on this endpoint.`);
}

async function listProjects(db, companyId, params) {
  const pageSize = Math.min(parseInt(params.limit) || 50, 100);
  let q = db.collection(`companies/${companyId}/projects`).orderBy("createdAt", "desc").limit(pageSize);

  if (params.status) {
    q = db.collection(`companies/${companyId}/projects`)
      .where("status", "==", params.status)
      .orderBy("createdAt", "desc")
      .limit(pageSize);
  }

  if (params.after) {
    const cursorSnap = await db.doc(`companies/${companyId}/projects/${params.after}`).get();
    if (cursorSnap.exists) {
      q = q.startAfter(cursorSnap);
    }
  }

  const snap = await q.get();
  const projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const nextCursor = projects.length === pageSize ? projects[projects.length - 1].id : null;

  return success(projects, { pagination: { limit: pageSize, nextCursor } });
}

async function createProject(db, companyId, body) {
  const { name, type, status, address, clientName, clientPhone, clientEmail, officeId } = body;
  if (!name) return error(400, "missing_fields", "name is required.");

  const project = {
    name,
    type: type || "Other",
    status: status || "new_lead",
    address: address || "",
    clientName: clientName || "",
    clientPhone: clientPhone || "",
    clientEmail: clientEmail || "",
    officeId: officeId || null,
    source: "api",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const docRef = await db.collection(`companies/${companyId}/projects`).add(project);

  // Emit event so automations can fire
  await db.collection(`companies/${companyId}/events`).add({
    type: "project.created",
    source: "api",
    projectId: docRef.id,
    payload: { name, type: project.type },
    createdAt: new Date(),
  });

  return created({ id: docRef.id, ...project });
}

async function getProject(db, companyId, projectId) {
  const snap = await db.doc(`companies/${companyId}/projects/${projectId}`).get();
  if (!snap.exists) return error(404, "not_found", "Project not found.");
  return success({ id: snap.id, ...snap.data() });
}

async function updateProject(db, companyId, projectId, body) {
  const ref = db.doc(`companies/${companyId}/projects/${projectId}`);
  const snap = await ref.get();
  if (!snap.exists) return error(404, "not_found", "Project not found.");

  const oldData = snap.data();
  const allowedFields = ["name", "type", "status", "address", "clientName", "clientPhone", "clientEmail", "officeId"];
  const updates = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }
  updates.updatedAt = new Date();

  await ref.update(updates);

  // Emit status change event if status changed
  if (updates.status && updates.status !== oldData.status) {
    await db.collection(`companies/${companyId}/events`).add({
      type: "project.status_changed",
      source: "api",
      projectId,
      payload: { oldStatus: oldData.status, newStatus: updates.status },
      createdAt: new Date(),
    });
  }

  return success({ id: projectId, ...oldData, ...updates });
}

// ── Project Contacts ────────────────────────────────────────────

async function handleProjectContacts(db, companyId, keyDoc, method, projectId, body, params) {
  if (method === "GET") {
    const scopeErr = requireScope(keyDoc, "contacts:read");
    if (scopeErr) return scopeErr;

    const snap = await db.collection(`companies/${companyId}/projects/${projectId}/contacts`)
      .orderBy("createdAt", "desc").limit(100).get();
    return success(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  if (method === "POST") {
    const scopeErr = requireScope(keyDoc, "contacts:write");
    if (scopeErr) return scopeErr;

    const { name, phone, email, role } = body;
    if (!name) return error(400, "missing_fields", "name is required for a contact.");

    const contact = { name, phone: phone || "", email: email || "", role: role || "other", createdAt: new Date() };
    const docRef = await db.collection(`companies/${companyId}/projects/${projectId}/contacts`).add(contact);
    return created({ id: docRef.id, ...contact });
  }

  return error(405, "method_not_allowed", `${method} not supported.`);
}

// ── Project Notes ───────────────────────────────────────────────

async function handleProjectNotes(db, companyId, keyDoc, method, projectId, params) {
  if (method !== "GET") return error(405, "method_not_allowed", "Only GET is supported for notes.");

  const scopeErr = requireScope(keyDoc, "projects:read");
  if (scopeErr) return scopeErr;

  const snap = await db.collection(`companies/${companyId}/projects/${projectId}/dailyNotes`)
    .orderBy("createdAt", "desc").limit(parseInt(params.limit) || 50).get();
  return success(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

// ── Project Tasks ───────────────────────────────────────────────

async function handleProjectTasks(db, companyId, keyDoc, method, projectId, body, params) {
  if (method === "GET") {
    const scopeErr = requireScope(keyDoc, "projects:read");
    if (scopeErr) return scopeErr;

    const snap = await db.collection(`companies/${companyId}/projects/${projectId}/tasks`)
      .orderBy("createdAt", "desc").limit(100).get();
    return success(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  if (method === "POST") {
    const scopeErr = requireScope(keyDoc, "projects:write");
    if (scopeErr) return scopeErr;

    const { title, description, assignee, status } = body;
    if (!title) return error(400, "missing_fields", "title is required.");

    const task = {
      title,
      description: description || "",
      assignee: assignee || null,
      status: status || "pending",
      source: "api",
      createdAt: new Date(),
    };
    const docRef = await db.collection(`companies/${companyId}/projects/${projectId}/tasks`).add(task);
    return created({ id: docRef.id, ...task });
  }

  return error(405, "method_not_allowed", `${method} not supported.`);
}

// ── Project Documents ───────────────────────────────────────────

async function handleProjectDocuments(db, companyId, keyDoc, method, projectId, params) {
  if (method !== "GET") return error(405, "method_not_allowed", "Only GET is supported for documents.");

  const scopeErr = requireScope(keyDoc, "projects:read");
  if (scopeErr) return scopeErr;

  const snap = await db.collection(`companies/${companyId}/projects/${projectId}/documents`)
    .orderBy("createdAt", "desc").limit(100).get();
  return success(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

// ════════════════════════════════════════════════════════════════
//  STAFF
// ════════════════════════════════════════════════════════════════

async function handleStaff(db, companyId, keyDoc, method, segments, params) {
  if (method !== "GET") return error(405, "method_not_allowed", "Only GET is supported for staff.");

  const scopeErr = requireScope(keyDoc, "staff:read");
  if (scopeErr) return scopeErr;

  const staffId = segments[1];

  if (staffId) {
    const snap = await db.doc(`companies/${companyId}/staff/${staffId}`).get();
    if (!snap.exists) return error(404, "not_found", "Staff member not found.");
    const data = snap.data();
    // Never expose pay rates via API
    delete data.payRate;
    delete data.hourlyRate;
    return success({ id: snap.id, ...data });
  }

  const snap = await db.collection(`companies/${companyId}/staff`).orderBy("name").get();
  const staff = snap.docs.map(d => {
    const data = d.data();
    delete data.payRate;
    delete data.hourlyRate;
    return { id: d.id, ...data };
  });
  return success(staff);
}

// ════════════════════════════════════════════════════════════════
//  EVENTS
// ════════════════════════════════════════════════════════════════

async function handleEvents(db, companyId, keyDoc, method, segments, body, params) {
  if (method === "GET") {
    const scopeErr = requireScope(keyDoc, "events:read");
    if (scopeErr) return scopeErr;

    const pageSize = Math.min(parseInt(params.limit) || 50, 100);
    let q = db.collection(`companies/${companyId}/events`).orderBy("createdAt", "desc").limit(pageSize);

    if (params.type) {
      q = db.collection(`companies/${companyId}/events`)
        .where("type", "==", params.type)
        .orderBy("createdAt", "desc")
        .limit(pageSize);
    }

    const snap = await q.get();
    return success(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  if (method === "POST") {
    const scopeErr = requireScope(keyDoc, "events:write");
    if (scopeErr) return scopeErr;

    const { type, projectId, payload } = body;
    if (!type) return error(400, "missing_fields", "type is required.");

    const eventData = {
      type,
      source: "api",
      projectId: projectId || null,
      payload: payload || {},
      createdAt: new Date(),
    };

    const docRef = await db.collection(`companies/${companyId}/events`).add(eventData);
    return created({ id: docRef.id, ...eventData });
  }

  return error(405, "method_not_allowed", `${method} not supported.`);
}

// ════════════════════════════════════════════════════════════════
//  WEBHOOKS
// ════════════════════════════════════════════════════════════════

async function handleWebhooks(db, companyId, keyDoc, method, segments, body) {
  const scopeErr = requireScope(keyDoc, "webhooks:manage");
  if (scopeErr) return scopeErr;

  const webhookId   = segments[1];
  const subAction   = segments[2]; // "test"

  // GET /webhooks — list all
  if (!webhookId && method === "GET") {
    const snap = await db.collection(`companies/${companyId}/webhooks`)
      .orderBy("createdAt", "desc").get();
    return success(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  // POST /webhooks — register new
  if (!webhookId && method === "POST") {
    const { url, events, name, secret } = body;
    if (!url) return error(400, "missing_fields", "url is required.");
    if (!events || !Array.isArray(events) || events.length === 0) {
      return error(400, "missing_fields", "events array is required (e.g., ['project.created', 'project.status_changed']).");
    }

    const webhook = {
      url,
      events,
      name: name || "Unnamed Webhook",
      secret: secret || require("crypto").randomBytes(32).toString("hex"),
      status: "active",
      createdAt: new Date(),
      lastTriggeredAt: null,
      failureCount: 0,
    };

    const docRef = await db.collection(`companies/${companyId}/webhooks`).add(webhook);
    return created({ id: docRef.id, ...webhook });
  }

  // DELETE /webhooks/:id
  if (webhookId && !subAction && method === "DELETE") {
    const ref = db.doc(`companies/${companyId}/webhooks/${webhookId}`);
    const snap = await ref.get();
    if (!snap.exists) return error(404, "not_found", "Webhook not found.");
    await ref.delete();
    return success({ deleted: true });
  }

  // POST /webhooks/:id/test — send test event
  if (webhookId && subAction === "test" && method === "POST") {
    const snap = await db.doc(`companies/${companyId}/webhooks/${webhookId}`).get();
    if (!snap.exists) return error(404, "not_found", "Webhook not found.");

    const webhook = snap.data();
    const testPayload = {
      event: "webhook.test",
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook from Job-Dox API.",
        companyId,
      },
    };

    try {
      const https = require("https");
      const http = require("http");
      const url = new URL(webhook.url);
      const transport = url.protocol === "https:" ? https : http;

      const payloadStr = JSON.stringify(testPayload);
      const signature = require("crypto")
        .createHmac("sha256", webhook.secret)
        .update(payloadStr)
        .digest("hex");

      await new Promise((resolve, reject) => {
        const req = transport.request(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-JobDox-Signature": signature,
            "X-JobDox-Event": "webhook.test",
          },
        }, (res) => {
          res.resume();
          resolve(res.statusCode);
        });
        req.on("error", reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error("Timeout")); });
        req.write(payloadStr);
        req.end();
      });

      return success({ sent: true, url: webhook.url });
    } catch (err) {
      return success({ sent: false, error: "An error occurred" });
    }
  }

  return error(405, "method_not_allowed", `${method} not supported.`);
}

// ════════════════════════════════════════════════════════════════
//  COMPANY
// ════════════════════════════════════════════════════════════════

async function handleCompany(db, companyId, keyDoc, method) {
  if (method !== "GET") return error(405, "method_not_allowed", "Only GET is supported.");

  const scopeErr = requireScope(keyDoc, "projects:read");
  if (scopeErr) return scopeErr;

  // Get basic company info from offices
  const officesSnap = await db.collection(`companies/${companyId}/offices`).get();
  const offices = officesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  return success({
    companyId,
    offices,
    apiKeyName: keyDoc.name,
    apiKeyScopes: keyDoc.scopes,
  });
}
