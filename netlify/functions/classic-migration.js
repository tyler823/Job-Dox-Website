/**
 * classic-migration.js
 * Netlify Function — Job-Dox Classic → Cortex one-time data migration engine.
 *
 * Actions (via ?action= query param):
 *   probe   — verify Classic API connectivity, return summary counts
 *   preview — structured preview of what will be migrated (no writes)
 *   execute — perform migration, write all data to Firestore
 *   status  — return current migration state document
 *
 * Env vars required:
 *   FIREBASE_SERVICE_ACCOUNT — Firebase Admin service account JSON
 */

const { getDb, admin } = require("./_firebase");

const ALLOWED_ORIGIN = process.env.SITE_URL || "https://job-dox.ai";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type, x-company-id, x-cortex-uid",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

/* ── helpers ── */
function ok(body) { return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(body) }; }
function err(code, msg) { return { statusCode: code, headers: CORS_HEADERS, body: JSON.stringify({ error: msg }) }; }

/** Fetch from Classic API with auth header. Never log the token. */
async function classicFetch(baseUrl, path, token) {
  const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Classic API ${res.status} at ${path}`);
  return res.json();
}

/** Paginated Classic API fetch — follows page/offset params if present. */
async function classicFetchAll(baseUrl, path, token) {
  let all = [];
  let page = 1;
  const sep = path.includes("?") ? "&" : "?";
  while (true) {
    const data = await classicFetch(baseUrl, `${path}${sep}page=${page}`, token);
    const rows = Array.isArray(data) ? data : data.data || data.results || data.rows || [];
    if (!rows.length) break;
    all = all.concat(rows);
    if (!data.nextPage && !data.hasMore) break;
    page++;
  }
  return all;
}

/** Generate a short unique id */
function uid() { return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`; }

/** Convert unix timestamp (seconds or ms) to ISO string */
function toISO(val) {
  if (!val) return null;
  const n = typeof val === "string" ? Number(val) : val;
  if (isNaN(n)) return val; // already a string date
  // If value is in seconds (< year 2100 in ms), convert to ms
  const ms = n < 1e12 ? n * 1000 : n;
  return new Date(ms).toISOString();
}

/** Validate user belongs to company */
async function validateAuth(db, companyId, uid) {
  const staffDoc = await db.collection("companies").doc(companyId).collection("staff").doc(uid).get();
  if (!staffDoc.exists) {
    // Also check if uid IS the companyId (account owner)
    if (uid === companyId) return true;
    return false;
  }
  return true;
}

/* ══════════════════════════════════════════════════════════════════
   HANDLER
══════════════════════════════════════════════════════════════════ */
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return err(405, "Method not allowed");
  }

  // ── Auth headers ──
  const companyId = event.headers["x-company-id"];
  const cortexUid = event.headers["x-cortex-uid"];
  if (!companyId || !cortexUid) {
    return err(401, "Missing x-company-id or x-cortex-uid headers");
  }

  const db = getDb();

  // ── Validate user belongs to company ──
  const valid = await validateAuth(db, companyId, cortexUid);
  if (!valid) {
    return err(403, "User does not belong to this company");
  }

  // ── Parse body ──
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return err(400, "Invalid JSON body");
  }

  const action = (event.queryStringParameters || {}).action || body.action;
  if (!action) return err(400, "Missing ?action= parameter");

  // ── Route to action ──
  try {
    switch (action) {
      case "probe":   return await handleProbe(db, companyId, body);
      case "preview": return await handlePreview(db, companyId, body);
      case "execute": return await handleExecute(db, companyId, cortexUid, body);
      case "status":  return await handleStatus(db, companyId);
      default:        return err(400, `Unknown action: ${action}`);
    }
  } catch (e) {
    console.error(`[classic-migration] ${action} error:`, e.message);
    return err(500, e.message || "Internal server error");
  }
};

/* ══════════════════════════════════════════════════════════════════
   ACTION: PROBE
   Verify Classic API connectivity, return summary counts.
══════════════════════════════════════════════════════════════════ */
async function handleProbe(db, companyId, body) {
  const { classicBaseUrl, classicToken } = body;
  if (!classicBaseUrl || !classicToken) {
    return err(400, "classicBaseUrl and classicToken are required");
  }

  // Check if already migrated
  const migDoc = await db.collection("companies").doc(companyId).collection("migration").doc("classic").get();
  if (migDoc.exists && migDoc.data().status === "complete") {
    return ok({
      alreadyMigrated: true,
      migrationDate: migDoc.data().completedAt,
      counts: migDoc.data().counts,
    });
  }

  // Try fetching summary data from Classic API
  let jobs = [], workTypes = [], statuses = [], projectTypes = [];
  try {
    jobs = await classicFetchAll(classicBaseUrl, "/api/jobs?active=1", classicToken);
  } catch (e) {
    return err(502, `Cannot connect to Classic API: ${e.message}`);
  }

  try { workTypes = await classicFetch(classicBaseUrl, "/api/config/worktypes", classicToken); } catch {}
  try { statuses = await classicFetch(classicBaseUrl, "/api/config/statuses", classicToken); } catch {}
  try { projectTypes = await classicFetch(classicBaseUrl, "/api/config/projecttypes", classicToken); } catch {}

  // Normalize arrays
  workTypes = Array.isArray(workTypes) ? workTypes : workTypes?.data || [];
  statuses = Array.isArray(statuses) ? statuses : statuses?.data || [];
  projectTypes = Array.isArray(projectTypes) ? projectTypes : projectTypes?.data || [];

  return ok({
    connected: true,
    counts: {
      jobs: jobs.length,
      workTypes: workTypes.length,
      statuses: statuses.length,
      projectTypes: projectTypes.length,
    },
  });
}

/* ══════════════════════════════════════════════════════════════════
   ACTION: PREVIEW
   Return structured JSON preview of what will be migrated.
══════════════════════════════════════════════════════════════════ */
async function handlePreview(db, companyId, body) {
  const { classicBaseUrl, classicToken } = body;
  if (!classicBaseUrl || !classicToken) {
    return err(400, "classicBaseUrl and classicToken are required");
  }

  let jobs = [], workTypes = [], statuses = [], projectTypes = [];

  try {
    jobs = await classicFetchAll(classicBaseUrl, "/api/jobs?active=1", classicToken);
  } catch (e) {
    return err(502, `Classic API error: ${e.message}`);
  }

  try { workTypes = await classicFetch(classicBaseUrl, "/api/config/worktypes", classicToken); } catch {}
  try { statuses = await classicFetch(classicBaseUrl, "/api/config/statuses", classicToken); } catch {}
  try { projectTypes = await classicFetch(classicBaseUrl, "/api/config/projecttypes", classicToken); } catch {}

  workTypes = Array.isArray(workTypes) ? workTypes : workTypes?.data || [];
  statuses = Array.isArray(statuses) ? statuses : statuses?.data || [];
  projectTypes = Array.isArray(projectTypes) ? projectTypes : projectTypes?.data || [];

  // Check already-migrated projects
  const migDoc = await db.collection("companies").doc(companyId).collection("migration").doc("classic").get();
  const completedIds = migDoc.exists ? migDoc.data().completedProjectIds || [] : [];

  const preview = {
    projects: jobs.map(j => ({
      classicJobId: j.jobID || j.id,
      name: j.name || j.jobName || "Untitled",
      address: j.address || "",
      status: j.status || "Unknown",
      workType: j.workType || "",
      alreadyMigrated: completedIds.includes(String(j.jobID || j.id)),
    })),
    workTypes: workTypes.map(w => ({ id: w.id || w.workTypeID, name: w.name || w.workTypeName || "" })),
    statuses: statuses.map(s => ({ id: s.id || s.statusID, name: s.name || s.statusName || "" })),
    projectTypes: projectTypes.map(p => ({ id: p.id || p.projectTypeID, name: p.name || p.projectTypeName || "" })),
    newProjectsCount: jobs.filter(j => !completedIds.includes(String(j.jobID || j.id))).length,
    skippedCount: jobs.filter(j => completedIds.includes(String(j.jobID || j.id))).length,
  };

  return ok(preview);
}

/* ══════════════════════════════════════════════════════════════════
   ACTION: STATUS
   Return current migration state document.
══════════════════════════════════════════════════════════════════ */
async function handleStatus(db, companyId) {
  const migDoc = await db.collection("companies").doc(companyId).collection("migration").doc("classic").get();
  if (!migDoc.exists) {
    return ok({ status: "none" });
  }
  return ok(migDoc.data());
}

/* ══════════════════════════════════════════════════════════════════
   ACTION: EXECUTE
   Perform the actual migration — write all data to Firestore.
══════════════════════════════════════════════════════════════════ */
async function handleExecute(db, companyId, cortexUid, body) {
  const { classicBaseUrl, classicToken } = body;
  if (!classicBaseUrl || !classicToken) {
    return err(400, "classicBaseUrl and classicToken are required");
  }

  // ── Rate limit: only 1 concurrent migration per company ──
  const migRef = db.collection("companies").doc(companyId).collection("migration").doc("classic");
  const migDoc = await migRef.get();
  if (migDoc.exists) {
    const s = migDoc.data().status;
    if (s === "running") return err(409, "A migration is already running for this company");
    if (s === "complete") return err(409, "Migration already completed. Cannot re-run.");
  }

  const startedAt = new Date().toISOString();
  const migState = {
    status: "running",
    startedAt,
    completedAt: null,
    classicBaseUrl: classicBaseUrl.replace(/\/+$/, ""),
    initiatedBy: cortexUid,
    counts: { projectsTotal: 0, projectsMigrated: 0, notesMigrated: 0, tasksMigrated: 0, documentsMigrated: 0, transactionsMigrated: 0, errors: 0 },
    errors: [],
    completedProjectIds: migDoc.exists ? migDoc.data().completedProjectIds || [] : [],
  };

  await migRef.set(migState);

  // ── Fetch all Classic data ──
  let jobs = [], workTypes = [], statuses = [], projectTypes = [];
  try {
    jobs = await classicFetchAll(classicBaseUrl, "/api/jobs?active=1", classicToken);
  } catch (e) {
    migState.status = "failed";
    migState.errors.push(`Failed to fetch jobs: ${e.message}`);
    await migRef.set(migState);
    return err(502, `Cannot fetch jobs from Classic API: ${e.message}`);
  }

  try { workTypes = await classicFetch(classicBaseUrl, "/api/config/worktypes", classicToken); } catch {}
  try { statuses = await classicFetch(classicBaseUrl, "/api/config/statuses", classicToken); } catch {}
  try { projectTypes = await classicFetch(classicBaseUrl, "/api/config/projecttypes", classicToken); } catch {}

  workTypes = Array.isArray(workTypes) ? workTypes : workTypes?.data || [];
  statuses = Array.isArray(statuses) ? statuses : statuses?.data || [];
  projectTypes = Array.isArray(projectTypes) ? projectTypes : projectTypes?.data || [];

  migState.counts.projectsTotal = jobs.length;
  await migRef.set(migState);

  // ── Step 1: Migrate config (work types, statuses, project types) ──
  const configRef = db.collection("companies").doc(companyId).collection("settings");
  const wtMapping = {};   // classicId → cortex name
  const stMapping = {};   // classicId → cortex name
  const ptMapping = {};   // classicId → cortex name

  // Load existing Cortex config to de-duplicate
  let existingWT = [], existingST = [], existingPT = [];
  try {
    const wtDoc = await configRef.doc("workTypes").get();
    existingWT = wtDoc.exists ? wtDoc.data().data || [] : [];
  } catch {}
  try {
    const stDoc = await configRef.doc("statuses").get();
    existingST = stDoc.exists ? stDoc.data().data || [] : [];
  } catch {}
  try {
    const ptDoc = await configRef.doc("projectTypes").get();
    existingPT = ptDoc.exists ? ptDoc.data().data || [] : [];
  } catch {}

  // Helper: de-dup and merge config arrays
  function mergeConfig(existing, incoming, idField, nameField) {
    const map = {};
    const merged = [...existing];
    for (const item of existing) {
      map[(item.name || item.label || "").toLowerCase()] = true;
    }
    for (const item of incoming) {
      const name = item[nameField] || item.name || "";
      const classicId = item[idField] || item.id || "";
      if (!name) continue;
      if (!map[name.toLowerCase()]) {
        merged.push({ name, source: "migrated", classicId: String(classicId) });
        map[name.toLowerCase()] = true;
      }
    }
    return merged;
  }

  const mergedWT = mergeConfig(existingWT, workTypes, "workTypeID", "workTypeName");
  const mergedST = mergeConfig(existingST, statuses, "statusID", "statusName");
  const mergedPT = mergeConfig(existingPT, projectTypes, "projectTypeID", "projectTypeName");

  try {
    await configRef.doc("workTypes").set({ data: mergedWT, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    await configRef.doc("statuses").set({ data: mergedST, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    await configRef.doc("projectTypes").set({ data: mergedPT, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  } catch (e) {
    addError(migState, `Config write failed: ${e.message}`);
  }

  // Build mapping from classic IDs to names
  for (const w of workTypes) { wtMapping[w.workTypeID || w.id] = w.workTypeName || w.name || ""; }
  for (const s of statuses) { stMapping[s.statusID || s.id] = s.statusName || s.name || ""; }
  for (const p of projectTypes) { ptMapping[p.projectTypeID || p.id] = p.projectTypeName || p.name || ""; }

  // ── Step 2: Migrate projects and their sub-data ──
  const projCol = db.collection("companies").doc(companyId).collection("projects");

  for (const job of jobs) {
    const classicJobId = String(job.jobID || job.id);

    // Idempotency check
    if (migState.completedProjectIds.includes(classicJobId)) {
      continue;
    }

    try {
      // Map job → Cortex project
      const projectData = {
        name: job.name || job.jobName || "Untitled Project",
        address: job.address || "",
        city: job.city || "",
        state: job.state || "",
        zip: job.zip || job.zipCode || "",
        status: stMapping[job.statusID] || job.status || "New Lead",
        type: ptMapping[job.projectTypeID] || job.projectType || "",
        budget: job.budget || 0,
        classicJobId,
        source: "migrated",
        archived: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        clientName: job.clientName || "",
        clientPhone: job.clientPhone || "",
        clientEmail: job.clientEmail || "",
        completedAt: toISO(job.completedDate) || null,
        // Cortex project fields that store sub-data inline
        fsContacts: [],
        fsScope: [],
        fsTasks: [],
        fsNotes: [],
        fsWorktypes: [],
        fsMediaFolders: [],
        fsMediaUploads: [],
        fsEmailSched: null,
        fsClientPortal: null,
        fsAssigned: [],
      };

      // Resolve work type
      const wt = wtMapping[job.workTypeID] || job.workType || "";
      if (wt) {
        projectData.fsWorktypes = [{ type: wt, status: "active", phase: "Initial Response", source: "migrated" }];
      }

      // ── Fetch sub-data for this job ──
      // Notes
      try {
        const classicNotes = await classicFetchAll(classicBaseUrl, `/api/jobs/${classicJobId}/notes`, classicToken);
        if (classicNotes.length) {
          projectData.fsNotes = classicNotes.map(n => ({
            id: uid(),
            content: n.data || n.text || n.content || "",
            date: toISO(n.date) || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            author: n.userName || `ClassicUser-${n.userID || "unknown"}`,
            category: n.type || "general",
            workTypeId: n.workTypeID ? String(n.workTypeID) : null,
            location: (n.lat && n.lon) ? { lat: Number(n.lat), lon: Number(n.lon) } : null,
            authorClassicId: n.userID ? String(n.userID) : null,
            source: "migrated",
            visibleToClient: true,
          }));
          migState.counts.notesMigrated += classicNotes.length;
        }
      } catch (e) {
        addError(migState, `Job ${classicJobId}: notes fetch failed — ${e.message}`);
      }

      // Tasks
      try {
        const classicTasks = await classicFetchAll(classicBaseUrl, `/api/jobs/${classicJobId}/tasks`, classicToken);
        if (classicTasks.length) {
          projectData.fsTasks = classicTasks.map(t => {
            let props = {};
            if (t.properties_v2) {
              try { props = typeof t.properties_v2 === "string" ? JSON.parse(t.properties_v2) : t.properties_v2; } catch {}
            }
            return {
              id: uid(),
              projId: null, // will be set after project creation
              title: props.title || t.title || t.name || "Untitled Task",
              assigned: props.assignee || t.assignee || "",
              assignedUserIds: [],
              due: props.dueDate || t.dueDate || "",
              priority: props.priority || t.priority || "med",
              type: "task",
              time: "",
              notes: props.notes || t.notes || "",
              status: (props.completed || t.completed) ? "done" : "open",
              created: toISO(t.createdAt) || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              comments: 0,
              commentThread: [],
              source: "migrated",
            };
          });
          migState.counts.tasksMigrated += classicTasks.length;
        }
      } catch (e) {
        addError(migState, `Job ${classicJobId}: tasks fetch failed — ${e.message}`);
      }

      // Documents
      try {
        const classicDocs = await classicFetchAll(classicBaseUrl, `/api/jobs/${classicJobId}/documents`, classicToken);
        if (classicDocs.length) {
          // Group document fields by docID if they come as separate records
          const docMap = {};
          for (const d of classicDocs) {
            const docId = d.docID || d.documentID || d.id;
            if (!docMap[docId]) {
              docMap[docId] = {
                id: uid(),
                name: d.documentName || d.name || d.title || "Document",
                type: d.documentType || d.type || "general",
                fields: [],
                source: "migrated",
                classicDocId: String(docId),
                createdAt: toISO(d.createdAt) || new Date().toISOString(),
              };
            }
            if (d.fieldName || d.field) {
              docMap[docId].fields.push({
                name: d.fieldName || d.field || "",
                value: d.fieldValue || d.value || "",
                type: d.fieldType || "text",
              });
            }
          }
          const docs = Object.values(docMap);
          migState.counts.documentsMigrated += docs.length;
          // Store documents as part of the project or in a separate collection
          // Following Cortex convention, add to project doc
          projectData.fsDocuments = docs;
        }
      } catch (e) {
        addError(migState, `Job ${classicJobId}: documents fetch failed — ${e.message}`);
      }

      // Scope
      try {
        const classicScope = await classicFetchAll(classicBaseUrl, `/api/jobs/${classicJobId}/scope`, classicToken);
        if (classicScope.length) {
          projectData.fsScope = classicScope.map(s => ({
            id: uid(),
            code: s.code || "",
            desc: s.description || s.desc || "",
            qty: s.quantity || s.qty || 0,
            unit: s.unit || "EA",
            price: s.price || s.unitPrice || 0,
            total: s.total || (s.quantity || 0) * (s.price || 0),
            source: "migrated",
          }));
        }
      } catch (e) {
        addError(migState, `Job ${classicJobId}: scope fetch failed — ${e.message}`);
      }

      // Financials → Contacts sub-collection pattern (stored with project for now)
      try {
        const classicFin = await classicFetchAll(classicBaseUrl, `/api/jobs/${classicJobId}/financials`, classicToken);
        if (classicFin.length) {
          // Store as transactions metadata on project
          projectData.fsTransactions = classicFin.map(f => ({
            id: uid(),
            type: f.type || (f.amount >= 0 ? "revenue" : "expense"),
            description: f.description || f.desc || "",
            amount: Number(f.amount) || 0,
            date: toISO(f.date) || new Date().toISOString(),
            category: f.category || "",
            vendor: f.vendor || f.vendorName || "",
            classicJobId,
            source: "migrated",
          }));
          migState.counts.transactionsMigrated += classicFin.length;
        }
      } catch (e) {
        addError(migState, `Job ${classicJobId}: financials fetch failed — ${e.message}`);
      }

      // Contacts
      try {
        if (job.clientName || job.clientPhone || job.clientEmail) {
          projectData.fsContacts = [{
            id: uid(),
            name: job.clientName || "",
            phone: job.clientPhone || "",
            email: job.clientEmail || "",
            role: "Client",
            source: "migrated",
          }];
        }
      } catch {}

      // ── Write project to Firestore ──
      const projDoc = await projCol.add(projectData);

      // Update task projIds to reference the new Firestore doc id
      if (projectData.fsTasks.length) {
        const updatedTasks = projectData.fsTasks.map(t => ({ ...t, projId: projDoc.id }));
        await projCol.doc(projDoc.id).update({ fsTasks: updatedTasks });
      }

      // Mark project as completed in migration state
      migState.completedProjectIds.push(classicJobId);
      migState.counts.projectsMigrated++;

      // Update migration state periodically (every project)
      await migRef.set(migState);

    } catch (e) {
      addError(migState, `Job ${classicJobId}: migration failed — ${e.message}`);
      migState.counts.errors++;
      await migRef.set(migState);
    }
  }

  // ── Finalize ──
  migState.status = migState.counts.errors > 0 && migState.counts.projectsMigrated === 0 ? "failed" : "complete";
  migState.completedAt = new Date().toISOString();
  await migRef.set(migState);

  return ok(migState);
}

/** Add error to migration state, capped at 100 */
function addError(state, msg) {
  if (state.errors.length < 100) {
    state.errors.push(msg);
  }
  state.counts.errors++;
}
