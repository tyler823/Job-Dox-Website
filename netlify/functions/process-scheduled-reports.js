/**
 * process-scheduled-reports.js
 * Netlify Scheduled Function — runs every 30 minutes via cron.
 *
 * Finds due scheduled reports across all companies, generates report data
 * from Firestore, saves to generatedReports, writes notifications, and
 * advances the nextRunAt for each processed schedule.
 *
 * Uses Firebase Admin SDK exclusively (server-side, bypasses client rules).
 */

const { getDb, admin } = require("./_firebase");

const FieldValue = admin.firestore.FieldValue;

/* ── Schedule config for Netlify ── */
exports.config = {
  schedule: "*/30 * * * *",
};

exports.handler = async () => {
  const db = getDb();
  const now = new Date();
  console.log(`[scheduled-reports] Running at ${now.toISOString()}`);

  // 1. Find due reports via collection group query
  let dueSnap;
  try {
    dueSnap = await db.collectionGroup("scheduledReports")
      .where("enabled", "==", true)
      .where("nextRunAt", "<=", admin.firestore.Timestamp.fromDate(now))
      .limit(50)
      .get();
  } catch (err) {
    console.error("[scheduled-reports] Failed to query due reports:", err.message);
    return { statusCode: 500 };
  }

  if (dueSnap.empty) {
    console.log("[scheduled-reports] No due reports found.");
    return { statusCode: 200 };
  }

  console.log(`[scheduled-reports] Found ${dueSnap.size} due report(s).`);

  let processed = 0;
  let failed = 0;

  for (const schedDoc of dueSnap.docs) {
    try {
      const sched = schedDoc.data();
      const schedId = schedDoc.id;
      const companyId = sched.companyId;

      if (!companyId) {
        console.warn(`[scheduled-reports] Skipping ${schedId}: no companyId`);
        failed++;
        continue;
      }

      // 2. Generate report data
      const reportData = await generateReportData(db, companyId, sched.reportType);

      // 3. Save generated report
      const genRef = await db.collection("companies").doc(companyId)
        .collection("generatedReports").add({
          scheduledReportId: schedId,
          reportType: sched.reportType,
          reportName: sched.name || "Scheduled Report",
          generatedAt: FieldValue.serverTimestamp(),
          data: reportData,
          read: false,
          companyId: companyId,
        });

      // 4. Write notification
      await db.collection("companies").doc(companyId)
        .collection("notifications").add({
          type: "scheduled_report",
          title: sched.name || "Scheduled Report",
          message: `Your ${sched.name || "scheduled report"} is ready to view.`,
          generatedReportId: genRef.id,
          reportType: sched.reportType,
          createdAt: FieldValue.serverTimestamp(),
          read: false,
          companyId: companyId,
        });

      // 5. Update scheduledReport: lastRunAt + new nextRunAt
      const oldNextRunAt = sched.nextRunAt?.toDate
        ? sched.nextRunAt.toDate()
        : new Date(sched.nextRunAt);
      const newNextRunAt = advanceNextRun(oldNextRunAt, sched.frequency);

      await schedDoc.ref.update({
        lastRunAt: FieldValue.serverTimestamp(),
        nextRunAt: admin.firestore.Timestamp.fromDate(newNextRunAt),
      });

      processed++;
      console.log(`[scheduled-reports] Processed: ${sched.name} (${companyId})`);
    } catch (err) {
      failed++;
      console.error(`[scheduled-reports] Error processing ${schedDoc.id}:`, err.message);
    }
  }

  console.log(`[scheduled-reports] Done. processed=${processed} failed=${failed}`);
  return { statusCode: 200 };
};

/* ═══════════════════════════════════════════════════════════════════════════
   REPORT DATA GENERATORS
═══════════════════════════════════════════════════════════════════════════ */

async function generateReportData(db, companyId, reportType) {
  switch (reportType) {
    case "project_status":     return genProjectStatus(db, companyId);
    case "revenue_summary":    return genRevenueSummary(db, companyId);
    case "work_type_analysis": return genWorkTypeAnalysis(db, companyId);
    case "staff_performance":  return genStaffPerformance(db, companyId);
    case "overdue_tasks":      return genOverdueTasks(db, companyId);
    case "active_projects":    return genActiveProjects(db, companyId);
    default:
      return { error: `Unknown report type: ${reportType}` };
  }
}

async function genProjectStatus(db, companyId) {
  const snap = await db.collection("companies").doc(companyId)
    .collection("projects").where("archived", "!=", true).get();

  const statusCounts = {};
  snap.docs.forEach(d => {
    const status = d.data().status || "unknown";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  return {
    totalProjects: snap.size,
    statusBreakdown: statusCounts,
    generatedAt: new Date().toISOString(),
  };
}

async function genRevenueSummary(db, companyId) {
  const snap = await db.collection("companies").doc(companyId)
    .collection("projects").get();

  let totalInvoiced = 0;
  let totalCollected = 0;
  let projectsWithUnpaid = 0;

  snap.docs.forEach(d => {
    const data = d.data();
    const inv = Number(data.invoiceTotal) || 0;
    const paid = Number(data.amountPaid) || 0;
    totalInvoiced += inv;
    totalCollected += paid;
    if (inv > 0 && paid < inv) projectsWithUnpaid++;
  });

  return {
    totalInvoiced,
    totalCollected,
    totalOutstanding: totalInvoiced - totalCollected,
    projectsWithUnpaidInvoices: projectsWithUnpaid,
    generatedAt: new Date().toISOString(),
  };
}

async function genWorkTypeAnalysis(db, companyId) {
  const snap = await db.collection("companies").doc(companyId)
    .collection("projects").where("archived", "!=", true).get();

  const wtCounts = {};
  snap.docs.forEach(d => {
    const wts = d.data().workTypes;
    if (Array.isArray(wts)) {
      wts.forEach(wt => {
        const name = typeof wt === "string" ? wt : (wt.label || wt.name || String(wt));
        wtCounts[name] = (wtCounts[name] || 0) + 1;
      });
    }
  });

  const sorted = Object.entries(wtCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([workType, count]) => ({ workType, count }));

  return {
    workTypes: sorted,
    totalActiveProjects: snap.size,
    generatedAt: new Date().toISOString(),
  };
}

async function genStaffPerformance(db, companyId) {
  const projSnap = await db.collection("companies").doc(companyId)
    .collection("projects").get();

  let totalTasks = 0;
  let completedTasks = 0;
  let overdueTasks = 0;
  const todayStr = new Date().toISOString().split("T")[0];

  for (const projDoc of projSnap.docs) {
    try {
      const taskSnap = await projDoc.ref.collection("tasks").get();
      taskSnap.docs.forEach(t => {
        const task = t.data();
        totalTasks++;
        if (task.completed || task.status === "done") {
          completedTasks++;
        } else {
          const due = task.dueDate || task.due;
          if (due && due < todayStr) overdueTasks++;
        }
      });
    } catch {
      // skip projects with no tasks subcollection
    }
  }

  const completionRate = totalTasks > 0
    ? ((completedTasks / totalTasks) * 100).toFixed(1)
    : "0.0";

  return {
    totalTasks,
    completedTasks,
    overdueTasks,
    completionRate: Number(completionRate),
    generatedAt: new Date().toISOString(),
  };
}

async function genOverdueTasks(db, companyId) {
  const projSnap = await db.collection("companies").doc(companyId)
    .collection("projects").get();

  const todayStr = new Date().toISOString().split("T")[0];
  const todayMs = Date.now();
  const overdue = [];

  for (const projDoc of projSnap.docs) {
    const projData = projDoc.data();
    const projName = projData.name || projData.address || projDoc.id;
    try {
      const taskSnap = await projDoc.ref.collection("tasks").get();
      taskSnap.docs.forEach(t => {
        const task = t.data();
        if (task.completed || task.status === "done") return;
        const due = task.dueDate || task.due;
        if (!due || due >= todayStr) return;
        const daysOverdue = Math.floor((todayMs - new Date(due).getTime()) / 86400000);
        overdue.push({
          projectName: projName,
          taskTitle: task.title || task.name || "Untitled",
          assignedTo: task.assignedTo || task.assignedUserName || "",
          daysOverdue,
          dueDate: due,
        });
      });
    } catch {
      // skip
    }
  }

  overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);

  return {
    overdueTasks: overdue.slice(0, 20),
    totalOverdue: overdue.length,
    generatedAt: new Date().toISOString(),
  };
}

async function genActiveProjects(db, companyId) {
  const snap = await db.collection("companies").doc(companyId)
    .collection("projects").where("archived", "!=", true).get();

  const nowMs = Date.now();
  const projects = [];

  for (const d of snap.docs) {
    const data = d.data();
    const createdAt = data.createdAt?.toDate
      ? data.createdAt.toDate()
      : data.createdAt?.seconds
        ? new Date(data.createdAt.seconds * 1000)
        : data.created ? new Date(data.created) : null;

    let taskCount = 0;
    try {
      const tSnap = await d.ref.collection("tasks").get();
      taskCount = tSnap.size;
    } catch {
      // no tasks subcollection
    }

    projects.push({
      name: data.name || data.address || d.id,
      status: data.status || "unknown",
      clientName: data.clientName || data.client || "",
      address: data.address || "",
      taskCount,
      daysSinceCreated: createdAt ? Math.floor((nowMs - createdAt.getTime()) / 86400000) : null,
    });
  }

  projects.sort((a, b) => (a.daysSinceCreated ?? 9999) - (b.daysSinceCreated ?? 9999));

  return {
    projects: projects.slice(0, 25),
    totalActive: snap.size,
    generatedAt: new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   DATE ADVANCE HELPER
═══════════════════════════════════════════════════════════════════════════ */

function advanceNextRun(oldDate, frequency) {
  const next = new Date(oldDate.getTime());
  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      next.setDate(next.getDate() + 1);
  }
  // If the calculated next run is still in the past, keep advancing
  const now = new Date();
  while (next <= now) {
    switch (frequency) {
      case "daily":   next.setDate(next.getDate() + 1); break;
      case "weekly":  next.setDate(next.getDate() + 7); break;
      case "monthly": next.setMonth(next.getMonth() + 1); break;
      default:        next.setDate(next.getDate() + 1);
    }
  }
  return next;
}
