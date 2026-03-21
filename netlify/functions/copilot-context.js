/**
 * copilot-context.js
 * Netlify Function — Builds a full company data snapshot for the Cortex Copilot.
 * All Firestore reads are scoped to companies/{companyId}/.
 */

const { getDb } = require("./_firebase");

const ALLOWED_ORIGIN = process.env.SITE_URL || "https://job-dox.ai";

/* ── helpers ─────────────────────────────────────────── */

function fmtDate(v) {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  if (v.toDate) return v.toDate().toISOString().slice(0, 10);
  if (v.seconds) return new Date(v.seconds * 1000).toISOString().slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function fmtDateTime(v) {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 16).replace("T", " ");
  if (v.toDate) return v.toDate().toISOString().slice(0, 16).replace("T", " ");
  if (v.seconds) return new Date(v.seconds * 1000).toISOString().slice(0, 16).replace("T", " ");
  if (v instanceof Date) return v.toISOString().slice(0, 16).replace("T", " ");
  return String(v).slice(0, 16);
}

function trunc(str, len) {
  if (!str) return "";
  const s = String(str);
  return s.length > len ? s.slice(0, len) + "…" : s;
}

function pick(doc, fields) {
  const d = doc.data ? doc.data() : doc;
  const out = {};
  for (const f of fields) out[f] = d[f] ?? "";
  return out;
}

/* ── main handler ────────────────────────────────────── */

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const headers = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { companyId } = body;
  if (!companyId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "companyId is required" }) };
  }

  const db = getDb();
  const companyRef = db.collection("companies").doc(companyId);

  /* ═══════════════════════════════════════════════════════
     Parallel top-level fetches with Promise.allSettled
  ═══════════════════════════════════════════════════════ */

  const [
    projectsResult,
    staffResult,
    officesResult,
    vendorsResult,
    callsResult,
    smsResult,
    billingResult,
    settingsResult,
    reviewsResult,
  ] = await Promise.allSettled([
    // A. Projects
    (async () => {
      try {
        const snap = await companyRef.collection("projects").get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch { return null; }
    })(),
    // B. Staff
    (async () => {
      try {
        const snap = await companyRef.collection("staff").get();
        return snap.docs.map(d => pick(d, ["name", "email", "phone", "role", "permissionLevel", "officeId", "title"]));
      } catch { return null; }
    })(),
    // C. Offices
    (async () => {
      try {
        const snap = await companyRef.collection("offices").get();
        return snap.docs.map(d => pick(d, ["name", "address", "googleReviewUrl", "color"]));
      } catch { return null; }
    })(),
    // D. Vendors — try settings/vendors first, then top-level vendors
    (async () => {
      try {
        const settingsDoc = await companyRef.collection("settings").doc("vendors").get();
        if (settingsDoc.exists) {
          const data = settingsDoc.data();
          // Could be an array of vendors or an object with a vendors array
          if (Array.isArray(data.vendors)) return data.vendors;
          if (Array.isArray(data)) return data;
          // Return all entries as vendor list
          return Object.values(data).filter(v => v && typeof v === "object");
        }
      } catch { /* fall through */ }
      try {
        const snap = await companyRef.collection("vendors").get();
        if (!snap.empty) return snap.docs.map(d => pick(d, ["name", "specialty", "coiStatus", "coiExpiry"]));
      } catch { /* fall through */ }
      return null;
    })(),
    // E. Calls (last 20)
    (async () => {
      try {
        const snap = await companyRef.collection("calls").orderBy("createdAt", "desc").limit(20).get();
        return snap.docs.map(d => pick(d, ["direction", "status", "duration", "fromName", "toName", "createdAt", "projectId", "hasTranscript", "summary"]));
      } catch { return null; }
    })(),
    // F. SMS Logs (last 20)
    (async () => {
      try {
        const snap = await companyRef.collection("smsLogs").orderBy("createdAt", "desc").limit(20).get();
        return snap.docs.map(d => pick(d, ["direction", "from", "to", "body", "createdAt", "projectId"]));
      } catch { return null; }
    })(),
    // G. Billing
    (async () => {
      try {
        const snap = await companyRef.collection("billing").doc("cortexCoins").get();
        if (!snap.exists) return null;
        return pick(snap, ["plan", "coinsUsed", "coinsAllowed", "usedThisCycle", "totalAvailable", "baseAllowance", "cycleStart", "cycleEnd", "rolloverCoins"]);
      } catch { return null; }
    })(),
    // H. Settings — general
    (async () => {
      try {
        const snap = await companyRef.collection("settings").doc("general").get();
        if (!snap.exists) return null;
        return pick(snap, ["companyName", "industry", "workTypes", "statuses", "projectTypes"]);
      } catch { return null; }
    })(),
    // I. Review Requests (last 10)
    (async () => {
      try {
        const snap = await companyRef.collection("reviewRequests").orderBy("createdAt", "desc").limit(10).get();
        return snap.docs.map(d => pick(d, ["projectId", "clientName", "sentAt", "status"]));
      } catch { return null; }
    })(),
  ]);

  /* ── extract values (null if failed) ── */
  const val = (r) => (r.status === "fulfilled" ? r.value : null);

  const allProjects = val(projectsResult);
  const staff       = val(staffResult);
  const offices     = val(officesResult);
  const vendors     = val(vendorsResult);
  const calls       = val(callsResult);
  const smsLogs     = val(smsResult);
  const billing     = val(billingResult);
  const settings    = val(settingsResult);
  const reviews     = val(reviewsResult);

  /* ═══════════════════════════════════════════════════════
     Fetch project subcollections (tasks, notes, shifts, estimates, contacts)
  ═══════════════════════════════════════════════════════ */

  const projectDetails = [];

  if (allProjects && allProjects.length > 0) {
    const subResults = await Promise.allSettled(
      allProjects.map(async (proj) => {
        const projRef = companyRef.collection("projects").doc(proj.id);

        const [tasksR, notesR, shiftsR, estimatesR, contactsR] = await Promise.allSettled([
          (async () => {
            try {
              const s = await projRef.collection("tasks").get();
              return s.docs.map(d => pick(d, ["title", "assignedTo", "status", "dueDate", "priority"]));
            } catch { return null; }
          })(),
          (async () => {
            try {
              const s = await projRef.collection("dailyNotes").orderBy("createdAt", "desc").limit(5).get();
              return s.docs.map(d => pick(d, ["text", "author", "createdAt"]));
            } catch { return null; }
          })(),
          (async () => {
            try {
              const s = await projRef.collection("shifts").get();
              return s.docs.map(d => pick(d, ["staffName", "clockIn", "clockOut", "hours", "rate", "payType"]));
            } catch { return null; }
          })(),
          (async () => {
            try {
              const s = await projRef.collection("estimates").get();
              return s.docs.map(d => pick(d, ["items", "totalGood", "totalBetter", "totalBest", "accepted"]));
            } catch { return null; }
          })(),
          (async () => {
            try {
              const s = await projRef.collection("contacts").get();
              return s.docs.map(d => pick(d, ["name", "role", "email", "phone"]));
            } catch { return null; }
          })(),
        ]);

        let tasks    = val(tasksR);
        let notes    = val(notesR);
        let shifts   = val(shiftsR);
        let estimates = val(estimatesR);
        let contacts = val(contactsR);

        // Truncation: if >30 subcollection docs combined, limit each to 10 most recent
        const totalSub = (tasks?.length || 0) + (notes?.length || 0) + (shifts?.length || 0) +
                         (estimates?.length || 0) + (contacts?.length || 0);
        if (totalSub > 30) {
          if (tasks && tasks.length > 10) tasks = tasks.slice(0, 10);
          if (notes && notes.length > 10) notes = notes.slice(0, 10);
          if (shifts && shifts.length > 10) shifts = shifts.slice(0, 10);
          if (estimates && estimates.length > 10) estimates = estimates.slice(0, 10);
          if (contacts && contacts.length > 10) contacts = contacts.slice(0, 10);
        }

        return { proj, tasks, notes, shifts, estimates, contacts };
      })
    );

    for (const r of subResults) {
      if (r.status === "fulfilled" && r.value) projectDetails.push(r.value);
    }
  }

  /* ═══════════════════════════════════════════════════════
     Build the plain-text snapshot string
  ═══════════════════════════════════════════════════════ */

  const lines = [];
  const unavail = (label) => `${label} // [UNAVAILABLE]`;

  // ── Header ──
  lines.push("=== CORTEX COMPANY SNAPSHOT ===");
  if (settings) {
    lines.push(`Company: ${settings.companyName || "Unknown"}`);
    lines.push(`Industry: ${settings.industry || "Restoration"}`);
  } else {
    lines.push(unavail("Company: Unknown"));
  }

  if (billing) {
    const coinsUsed = billing.coinsUsed || billing.usedThisCycle || 0;
    const coinsAllowed = billing.coinsAllowed || billing.totalAvailable || billing.baseAllowance || 300;
    lines.push(`Plan: ${billing.plan || "Standard"} | Coins: ${coinsUsed} used / ${coinsAllowed} allowed | Rollover: ${billing.rolloverCoins || 0}`);
    lines.push(`Cycle: ${fmtDate(billing.cycleStart)} to ${fmtDate(billing.cycleEnd)}`);
  } else {
    lines.push(unavail("Billing info"));
  }

  if (settings) {
    const wt = Array.isArray(settings.workTypes) ? settings.workTypes.join(", ") : (settings.workTypes || "");
    const st = Array.isArray(settings.statuses) ? settings.statuses.join(", ") : (settings.statuses || "");
    lines.push(`Work Types: ${wt || "Not configured"}`);
    lines.push(`Statuses: ${st || "Not configured"}`);
  }

  // Offices
  if (offices && offices.length > 0) {
    lines.push(`Offices: ${offices.map(o => `${o.name || "Office"} — ${o.address || "No address"}`).join(" | ")}`);
  } else if (offices === null) {
    lines.push(unavail("Offices"));
  }

  // ── Staff ──
  if (staff) {
    lines.push("");
    lines.push(`=== STAFF (${staff.length} total) ===`);
    for (const s of staff) {
      lines.push(`- ${s.name || "Unnamed"} | ${s.title || "No title"} | Level ${s.permissionLevel || "?"} | ${s.role || "No role"} | Office: ${s.officeId || "—"}`);
    }
  } else {
    lines.push("");
    lines.push(unavail("=== STAFF ==="));
  }

  // ── Projects ──
  const totalProjectCount = projectDetails.length;
  lines.push("");
  lines.push(`=== PROJECTS (${totalProjectCount} total) ===`);

  for (const { proj, tasks, notes, shifts, estimates, contacts } of projectDetails) {
    const p = proj;
    lines.push(`--- PROJECT ${p.projectNumber || p.id}: ${p.name || "Untitled"} ---`);
    lines.push(`Status: ${p.status || "Unknown"} | Type: ${p.projectType || "—"}`);
    const wt = Array.isArray(p.workTypes) ? p.workTypes.join(", ") : (p.workTypes || "");
    lines.push(`Work Types: ${wt || "—"}`);
    lines.push(`Client: ${p.clientName || "—"} | Address: ${p.address || "—"}`);
    lines.push(`Created: ${fmtDate(p.createdAt)}`);

    // Contacts
    if (contacts && contacts.length > 0) {
      lines.push(`Contacts: ${contacts.map(c => `${c.name || "?"} (${c.role || "?"})`).join(", ")}`);
    }

    // Tasks
    if (tasks) {
      const openTasks = tasks.filter(t => t.status && !["complete", "completed", "done", "closed"].includes(String(t.status).toLowerCase()));
      const completeTasks = tasks.length - openTasks.length;
      lines.push(`Tasks: ${openTasks.length} open / ${completeTasks} complete`);
      if (openTasks.length > 0) {
        lines.push("  Open tasks:");
        for (const t of openTasks) {
          lines.push(`  - ${t.title || "Untitled"} assigned to ${t.assignedTo || "unassigned"} due ${fmtDate(t.dueDate) || "no date"}`);
        }
      }
    } else {
      lines.push(unavail("Tasks"));
    }

    // Shifts
    if (shifts) {
      const totalHours = shifts.reduce((sum, s) => sum + (Number(s.hours) || 0), 0);
      const estCost = shifts.reduce((sum, s) => sum + ((Number(s.hours) || 0) * (Number(s.rate) || 0)), 0);
      lines.push(`Shifts: ${shifts.length} shifts | ${totalHours.toFixed(1)} total hours | Est. labor cost: $${estCost.toFixed(2)}`);
      for (const s of shifts) {
        lines.push(`  ${s.staffName || "?"}: ${fmtDateTime(s.clockIn)} to ${fmtDateTime(s.clockOut)} (${s.hours || 0}hrs @ $${s.rate || 0}/hr ${s.payType || ""})`);
      }
    } else {
      lines.push(unavail("Shifts"));
    }

    // Estimates
    if (estimates && estimates.length > 0) {
      const accepted = estimates.find(e => e.accepted);
      if (accepted) {
        const tier = accepted.accepted;
        const total = tier === "good" ? accepted.totalGood : tier === "better" ? accepted.totalBetter : tier === "best" ? accepted.totalBest : "?";
        lines.push(`Estimate: Accepted: ${tier} at $${total}`);
      } else {
        lines.push("Estimate: No accepted estimate");
      }
    } else {
      lines.push("Estimate: No accepted estimate");
    }

    // Daily Notes
    if (notes && notes.length > 0) {
      lines.push("Latest Notes:");
      for (const n of notes) {
        lines.push(`  ${fmtDate(n.createdAt)} ${n.author || "?"}: ${trunc(n.text, 150)}`);
      }
    }
  }

  // ── Vendors ──
  lines.push("");
  if (vendors && vendors.length > 0) {
    lines.push(`=== VENDORS (${vendors.length} total) ===`);
    for (const v of vendors) {
      lines.push(`- ${v.name || "?"} | ${v.specialty || "—"} | COI: ${v.coiStatus || "?"} (expires ${fmtDate(v.coiExpiry) || "?"})`);
    }
  } else if (vendors === null) {
    lines.push(unavail("=== VENDORS ==="));
  } else {
    lines.push("=== VENDORS (0 total) ===");
  }

  // ── Calls ──
  lines.push("");
  if (calls && calls.length > 0) {
    lines.push(`=== RECENT CALLS (last ${calls.length}) ===`);
    for (const c of calls) {
      let line = `- [${c.direction || "?"}] ${c.fromName || "?"} → ${c.toName || "?"} | ${c.status || "?"} | ${c.duration || 0}s | ${fmtDate(c.createdAt)}`;
      if (c.hasTranscript && c.summary) line += `\n  Summary: ${trunc(c.summary, 100)}`;
      if (c.projectId) line += `\n  Linked to project: ${c.projectId}`;
      lines.push(line);
    }
  } else if (calls === null) {
    lines.push(unavail("=== RECENT CALLS ==="));
  } else {
    lines.push("=== RECENT CALLS (0) ===");
  }

  // ── SMS ──
  lines.push("");
  if (smsLogs && smsLogs.length > 0) {
    lines.push(`=== RECENT SMS (last ${smsLogs.length}) ===`);
    for (const s of smsLogs) {
      lines.push(`- [${s.direction || "?"}] ${s.from || "?"} → ${s.to || "?"}: ${trunc(s.body, 80)} (${fmtDate(s.createdAt)})`);
    }
  } else if (smsLogs === null) {
    lines.push(unavail("=== RECENT SMS ==="));
  } else {
    lines.push("=== RECENT SMS (0) ===");
  }

  // ── Review Requests ──
  lines.push("");
  if (reviews && reviews.length > 0) {
    lines.push(`=== REVIEW REQUESTS (last ${reviews.length}) ===`);
    for (const r of reviews) {
      lines.push(`- ${r.clientName || "?"} | Sent: ${fmtDate(r.sentAt)} | Status: ${r.status || "?"}`);
    }
  } else if (reviews === null) {
    lines.push(unavail("=== REVIEW REQUESTS ==="));
  } else {
    lines.push("=== REVIEW REQUESTS (0) ===");
  }

  lines.push("");
  lines.push("=== END SNAPSHOT ===");

  /* ── Truncation pass if over 14,000 chars ── */

  let companySnapshot = lines.join("\n");

  if (companySnapshot.length > 14000) {
    // Pass 1: limit projects to 20 most recent
    if (projectDetails.length > 20) {
      // Sort by createdAt descending and rebuild
      projectDetails.sort((a, b) => {
        const da = a.proj.createdAt?.seconds || 0;
        const db2 = b.proj.createdAt?.seconds || 0;
        return db2 - da;
      });
      projectDetails.length = 20;
    }
    // Rebuild calls/sms to 10
    // Rebuild snapshot with truncated data
    companySnapshot = rebuildSnapshot(settings, billing, offices, staff, projectDetails, vendors, calls?.slice(0, 10) || calls, smsLogs?.slice(0, 10) || smsLogs, reviews, totalProjectCount);
  }

  if (companySnapshot.length > 14000) {
    // Pass 2: limit tasks to 3 open, shifts to 5
    for (const pd of projectDetails) {
      if (pd.tasks) {
        const open = pd.tasks.filter(t => t.status && !["complete", "completed", "done", "closed"].includes(String(t.status).toLowerCase()));
        pd.tasks = [...open.slice(0, 3), ...pd.tasks.filter(t => !open.includes(t)).slice(0, 2)];
      }
      if (pd.shifts && pd.shifts.length > 5) pd.shifts = pd.shifts.slice(0, 5);
    }
    companySnapshot = rebuildSnapshot(settings, billing, offices, staff, projectDetails, vendors, calls?.slice(0, 10) || calls, smsLogs?.slice(0, 10) || smsLogs, reviews, totalProjectCount);
  }

  if (companySnapshot.length > 14000) {
    // Pass 3: limit notes to 2 per project
    for (const pd of projectDetails) {
      if (pd.notes && pd.notes.length > 2) pd.notes = pd.notes.slice(0, 2);
    }
    companySnapshot = rebuildSnapshot(settings, billing, offices, staff, projectDetails, vendors, calls?.slice(0, 10) || calls, smsLogs?.slice(0, 10) || smsLogs, reviews, totalProjectCount);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ snapshot: companySnapshot }),
  };
};

/* ═══════════════════════════════════════════════════════
   rebuildSnapshot — reconstructs the snapshot string from data
═══════════════════════════════════════════════════════ */

function rebuildSnapshot(settings, billing, offices, staff, projectDetails, vendors, calls, smsLogs, reviews, totalProjectCount) {
  const lines = [];
  const unavail = (label) => `${label} // [UNAVAILABLE]`;

  lines.push("=== CORTEX COMPANY SNAPSHOT ===");
  if (settings) {
    lines.push(`Company: ${settings.companyName || "Unknown"}`);
    lines.push(`Industry: ${settings.industry || "Restoration"}`);
  } else {
    lines.push(unavail("Company: Unknown"));
  }

  if (billing) {
    const coinsUsed = billing.coinsUsed || billing.usedThisCycle || 0;
    const coinsAllowed = billing.coinsAllowed || billing.totalAvailable || billing.baseAllowance || 300;
    lines.push(`Plan: ${billing.plan || "Standard"} | Coins: ${coinsUsed} used / ${coinsAllowed} allowed | Rollover: ${billing.rolloverCoins || 0}`);
    lines.push(`Cycle: ${fmtDate(billing.cycleStart)} to ${fmtDate(billing.cycleEnd)}`);
  } else {
    lines.push(unavail("Billing info"));
  }

  if (settings) {
    const wt = Array.isArray(settings.workTypes) ? settings.workTypes.join(", ") : (settings.workTypes || "");
    const st = Array.isArray(settings.statuses) ? settings.statuses.join(", ") : (settings.statuses || "");
    lines.push(`Work Types: ${wt || "Not configured"}`);
    lines.push(`Statuses: ${st || "Not configured"}`);
  }

  if (offices && offices.length > 0) {
    lines.push(`Offices: ${offices.map(o => `${o.name || "Office"} — ${o.address || "No address"}`).join(" | ")}`);
  } else if (offices === null) {
    lines.push(unavail("Offices"));
  }

  if (staff) {
    lines.push("");
    lines.push(`=== STAFF (${staff.length} total) ===`);
    for (const s of staff) {
      lines.push(`- ${s.name || "Unnamed"} | ${s.title || "No title"} | Level ${s.permissionLevel || "?"} | ${s.role || "No role"} | Office: ${s.officeId || "—"}`);
    }
  } else {
    lines.push("");
    lines.push(unavail("=== STAFF ==="));
  }

  const showCount = projectDetails.length;
  lines.push("");
  if (showCount < totalProjectCount) {
    lines.push(`=== PROJECTS (showing ${showCount} of ${totalProjectCount} projects — ask about specific projects by name or number) ===`);
  } else {
    lines.push(`=== PROJECTS (${totalProjectCount} total) ===`);
  }

  for (const { proj, tasks, notes, shifts, estimates, contacts } of projectDetails) {
    const p = proj;
    lines.push(`--- PROJECT ${p.projectNumber || p.id}: ${p.name || "Untitled"} ---`);
    lines.push(`Status: ${p.status || "Unknown"} | Type: ${p.projectType || "—"}`);
    const wt = Array.isArray(p.workTypes) ? p.workTypes.join(", ") : (p.workTypes || "");
    lines.push(`Work Types: ${wt || "—"}`);
    lines.push(`Client: ${p.clientName || "—"} | Address: ${p.address || "—"}`);
    lines.push(`Created: ${fmtDate(p.createdAt)}`);

    if (contacts && contacts.length > 0) {
      lines.push(`Contacts: ${contacts.map(c => `${c.name || "?"} (${c.role || "?"})`).join(", ")}`);
    }

    if (tasks) {
      const openTasks = tasks.filter(t => t.status && !["complete", "completed", "done", "closed"].includes(String(t.status).toLowerCase()));
      const completeTasks = tasks.length - openTasks.length;
      lines.push(`Tasks: ${openTasks.length} open / ${completeTasks} complete`);
      if (openTasks.length > 0) {
        lines.push("  Open tasks:");
        for (const t of openTasks) {
          lines.push(`  - ${t.title || "Untitled"} assigned to ${t.assignedTo || "unassigned"} due ${fmtDate(t.dueDate) || "no date"}`);
        }
      }
    } else {
      lines.push(unavail("Tasks"));
    }

    if (shifts) {
      const totalHours = shifts.reduce((sum, s) => sum + (Number(s.hours) || 0), 0);
      const estCost = shifts.reduce((sum, s) => sum + ((Number(s.hours) || 0) * (Number(s.rate) || 0)), 0);
      lines.push(`Shifts: ${shifts.length} shifts | ${totalHours.toFixed(1)} total hours | Est. labor cost: $${estCost.toFixed(2)}`);
      for (const s of shifts) {
        lines.push(`  ${s.staffName || "?"}: ${fmtDateTime(s.clockIn)} to ${fmtDateTime(s.clockOut)} (${s.hours || 0}hrs @ $${s.rate || 0}/hr ${s.payType || ""})`);
      }
    } else {
      lines.push(unavail("Shifts"));
    }

    if (estimates && estimates.length > 0) {
      const accepted = estimates.find(e => e.accepted);
      if (accepted) {
        const tier = accepted.accepted;
        const total = tier === "good" ? accepted.totalGood : tier === "better" ? accepted.totalBetter : tier === "best" ? accepted.totalBest : "?";
        lines.push(`Estimate: Accepted: ${tier} at $${total}`);
      } else {
        lines.push("Estimate: No accepted estimate");
      }
    } else {
      lines.push("Estimate: No accepted estimate");
    }

    if (notes && notes.length > 0) {
      lines.push("Latest Notes:");
      for (const n of notes) {
        lines.push(`  ${fmtDate(n.createdAt)} ${n.author || "?"}: ${trunc(n.text, 150)}`);
      }
    }
  }

  lines.push("");
  if (vendors && vendors.length > 0) {
    lines.push(`=== VENDORS (${vendors.length} total) ===`);
    for (const v of vendors) {
      lines.push(`- ${v.name || "?"} | ${v.specialty || "—"} | COI: ${v.coiStatus || "?"} (expires ${fmtDate(v.coiExpiry) || "?"})`);
    }
  } else if (vendors === null) {
    lines.push(unavail("=== VENDORS ==="));
  } else {
    lines.push("=== VENDORS (0 total) ===");
  }

  lines.push("");
  if (calls && calls.length > 0) {
    lines.push(`=== RECENT CALLS (last ${calls.length}) ===`);
    for (const c of calls) {
      let line = `- [${c.direction || "?"}] ${c.fromName || "?"} → ${c.toName || "?"} | ${c.status || "?"} | ${c.duration || 0}s | ${fmtDate(c.createdAt)}`;
      if (c.hasTranscript && c.summary) line += `\n  Summary: ${trunc(c.summary, 100)}`;
      if (c.projectId) line += `\n  Linked to project: ${c.projectId}`;
      lines.push(line);
    }
  } else if (calls === null) {
    lines.push(unavail("=== RECENT CALLS ==="));
  } else {
    lines.push("=== RECENT CALLS (0) ===");
  }

  lines.push("");
  if (smsLogs && smsLogs.length > 0) {
    lines.push(`=== RECENT SMS (last ${smsLogs.length}) ===`);
    for (const s of smsLogs) {
      lines.push(`- [${s.direction || "?"}] ${s.from || "?"} → ${s.to || "?"}: ${trunc(s.body, 80)} (${fmtDate(s.createdAt)})`);
    }
  } else if (smsLogs === null) {
    lines.push(unavail("=== RECENT SMS ==="));
  } else {
    lines.push("=== RECENT SMS (0) ===");
  }

  lines.push("");
  if (reviews && reviews.length > 0) {
    lines.push(`=== REVIEW REQUESTS (last ${reviews.length}) ===`);
    for (const r of reviews) {
      lines.push(`- ${r.clientName || "?"} | Sent: ${fmtDate(r.sentAt)} | Status: ${r.status || "?"}`);
    }
  } else if (reviews === null) {
    lines.push(unavail("=== REVIEW REQUESTS ==="));
  } else {
    lines.push("=== REVIEW REQUESTS (0) ===");
  }

  lines.push("");
  lines.push("=== END SNAPSHOT ===");

  return lines.join("\n");
}
