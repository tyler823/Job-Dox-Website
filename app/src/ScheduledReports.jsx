/**
 * ScheduledReports.jsx
 * Self-contained panel for creating/managing scheduled report configurations
 * and viewing generated reports.
 * Reads/writes Firestore: companies/{companyId}/scheduledReports/{reportId}
 *                         companies/{companyId}/generatedReports/{reportId}
 */

import { useState, useEffect, useCallback } from "react";
import {
  getFirestore, collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit as fsLimit, Timestamp, where
} from "firebase/firestore";
import { getApps } from "firebase/app";

const _db = getApps().length > 0 ? getFirestore(getApps()[0]) : null;

/* ── Constants ── */
const REPORT_TYPES = [
  { value: "project_status",     label: "Project Status Summary" },
  { value: "revenue_summary",    label: "Revenue & Financial Summary" },
  { value: "work_type_analysis", label: "Work Type Breakdown" },
  { value: "staff_performance",  label: "Staff & Task Performance" },
  { value: "overdue_tasks",      label: "Overdue Tasks Report" },
  { value: "active_projects",    label: "Active Projects Overview" },
];

const FREQUENCIES = ["daily", "weekly", "monthly"];

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const TIME_OPTIONS = [
  { value: "06:00", label: "6:00 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "12:00", label: "12:00 PM (Noon)" },
  { value: "17:00", label: "5:00 PM" },
  { value: "20:00", label: "8:00 PM" },
];

/* ── Helpers ── */
const reportTypeLabel = (val) => REPORT_TYPES.find(r => r.value === val)?.label || val;

const ordinalSuffix = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const timeLabel = (val) => TIME_OPTIONS.find(t => t.value === val)?.label || val;

function scheduleSummary(freq, dayOfWeek, dayOfMonth, timeOfDay) {
  const time = timeLabel(timeOfDay);
  if (freq === "daily") return `Daily at ${time}`;
  if (freq === "weekly") {
    const day = dayOfWeek ? dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1) : "Monday";
    return `Every ${day} at ${time}`;
  }
  if (freq === "monthly") {
    return `Monthly on the ${ordinalSuffix(dayOfMonth || 1)} at ${time}`;
  }
  return "";
}

function formatDate(d) {
  if (!d) return null;
  const dt = d.toDate ? d.toDate() : new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatGenDate(d) {
  if (!d) return "";
  const dt = d.toDate ? d.toDate() : new Date(d);
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    + " at " + dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const f$ = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

function calcNextRunAt(frequency, timeOfDay, dayOfWeek, dayOfMonth) {
  const now = new Date();
  const [hours, minutes] = (timeOfDay || "08:00").split(":").map(Number);

  let next;

  if (frequency === "daily") {
    next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    if (next.getTime() - now.getTime() < 10 * 60 * 1000) {
      next.setDate(next.getDate() + 1);
    }
  } else if (frequency === "weekly") {
    const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    const targetDay = dayMap[dayOfWeek || "monday"];
    next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    const currentDay = next.getDay();
    let diff = targetDay - currentDay;
    if (diff < 0) diff += 7;
    next.setDate(next.getDate() + diff);
    if (next.getTime() - now.getTime() < 10 * 60 * 1000) {
      next.setDate(next.getDate() + 7);
    }
  } else if (frequency === "monthly") {
    const dom = dayOfMonth || 1;
    next = new Date(now.getFullYear(), now.getMonth(), dom, hours, minutes, 0, 0);
    if (next.getTime() - now.getTime() < 10 * 60 * 1000) {
      next.setMonth(next.getMonth() + 1);
    }
  }

  return next;
}

/* ── Icons (inline SVG) ── */
const IcPencil = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IcTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const IcArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);

const IcClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════════
   GENERATED REPORT DATA RENDERERS
═══════════════════════════════════════════════════════════════════════════ */
function RenderReportData({ reportType, data }) {
  if (!data) return <div style={{ color: "var(--t3)", fontSize: 11 }}>No data available.</div>;

  if (reportType === "project_status") {
    const bd = data.statusBreakdown || {};
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)", marginBottom: 8 }}>
          Total Projects: {data.totalProjects || 0}
        </div>
        <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid var(--br)", color: "var(--t3)", fontSize: 9, textTransform: "uppercase" }}>Status</th>
            <th style={{ textAlign: "right", padding: "4px 8px", borderBottom: "1px solid var(--br)", color: "var(--t3)", fontSize: 9, textTransform: "uppercase" }}>Count</th>
          </tr></thead>
          <tbody>
            {Object.entries(bd).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
              <tr key={status}>
                <td style={{ padding: "4px 8px", color: "var(--t1)" }}>{status}</td>
                <td style={{ padding: "4px 8px", textAlign: "right", fontFamily: "var(--mono)", color: "var(--t2)" }}>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (reportType === "revenue_summary") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { label: "TOTAL INVOICED", val: f$(data.totalInvoiced) },
          { label: "TOTAL COLLECTED", val: f$(data.totalCollected) },
          { label: "OUTSTANDING", val: f$(data.totalOutstanding) },
          { label: "PROJECTS W/ UNPAID", val: data.projectsWithUnpaidInvoices || 0 },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: "var(--s3)", borderRadius: 8, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)", fontFamily: "var(--mono)" }}>{kpi.val}</div>
            <div className="lbl" style={{ marginTop: 4, marginBottom: 0 }}>{kpi.label}</div>
          </div>
        ))}
      </div>
    );
  }

  if (reportType === "work_type_analysis") {
    const wts = data.workTypes || [];
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)", marginBottom: 8 }}>
          Active Projects: {data.totalActiveProjects || 0}
        </div>
        {wts.length === 0 ? (
          <div style={{ color: "var(--t3)", fontSize: 11 }}>No work types found.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {wts.map((wt, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--br)", fontSize: 11 }}>
                <span style={{ color: "var(--t1)" }}>{wt.workType}</span>
                <span style={{ fontFamily: "var(--mono)", color: "var(--t2)" }}>{wt.count} project{wt.count !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (reportType === "staff_performance") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { label: "TOTAL TASKS", val: data.totalTasks || 0 },
          { label: "COMPLETED", val: data.completedTasks || 0 },
          { label: "OVERDUE", val: data.overdueTasks || 0 },
          { label: "COMPLETION RATE", val: `${data.completionRate || 0}%` },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: "var(--s3)", borderRadius: 8, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)", fontFamily: "var(--mono)" }}>{kpi.val}</div>
            <div className="lbl" style={{ marginTop: 4, marginBottom: 0 }}>{kpi.label}</div>
          </div>
        ))}
      </div>
    );
  }

  if (reportType === "overdue_tasks") {
    const tasks = data.overdueTasks || [];
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)", marginBottom: 8 }}>
          Total Overdue: {data.totalOverdue || 0}
        </div>
        {tasks.length === 0 ? (
          <div style={{ color: "var(--t3)", fontSize: 11 }}>No overdue tasks.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {tasks.map((t, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid var(--br)", fontSize: 11, gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "var(--t1)", fontWeight: 600 }}>{t.taskTitle}</div>
                  <div style={{ color: "var(--t3)", fontSize: 10 }}>{t.projectName}{t.assignedTo ? ` — ${t.assignedTo}` : ""}</div>
                </div>
                <span style={{ fontFamily: "var(--mono)", color: "var(--red, #ef4444)", fontSize: 10, whiteSpace: "nowrap" }}>{t.daysOverdue}d overdue</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (reportType === "active_projects") {
    const projs = data.projects || [];
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)", marginBottom: 8 }}>
          Total Active: {data.totalActive || 0}
        </div>
        {projs.length === 0 ? (
          <div style={{ color: "var(--t3)", fontSize: 11 }}>No active projects.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {projs.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid var(--br)", fontSize: 11, gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "var(--t1)", fontWeight: 600 }}>{p.name}</div>
                  <div style={{ color: "var(--t3)", fontSize: 10 }}>{p.clientName}{p.status ? ` — ${p.status}` : ""}</div>
                </div>
                <span style={{ fontFamily: "var(--mono)", color: "var(--t2)", fontSize: 10, whiteSpace: "nowrap" }}>
                  {p.taskCount} task{p.taskCount !== 1 ? "s" : ""}{p.daysSinceCreated != null ? ` · ${p.daysSinceCreated}d` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <div style={{ color: "var(--t3)", fontSize: 11 }}>Unknown report type.</div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function ScheduledReports({ companyId, userEmail, userName, permissionLevel, onUnreadCount }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // "list" | "form"
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [innerTab, setInnerTab] = useState("schedules"); // "schedules" | "generated"

  // Generated reports state
  const [genReports, setGenReports] = useState([]);
  const [genLoading, setGenLoading] = useState(false);
  const [expandedReport, setExpandedReport] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Form state
  const emptyForm = {
    name: "",
    reportType: "project_status",
    frequency: "daily",
    dayOfWeek: "monday",
    dayOfMonth: 1,
    timeOfDay: "08:00",
    recipientEmail: userEmail || "",
    enabled: true,
  };
  const [form, setForm] = useState(emptyForm);

  const canManage = (permissionLevel || 0) >= 5;
  const colRef = _db && companyId ? collection(_db, "companies", companyId, "scheduledReports") : null;
  const genColRef = _db && companyId ? collection(_db, "companies", companyId, "generatedReports") : null;

  /* ── Load scheduled reports ── */
  const loadReports = useCallback(async () => {
    if (!colRef) { setLoading(false); return; }
    try {
      const q = query(colRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load scheduled reports:", err);
    }
    setLoading(false);
  }, [colRef]);

  useEffect(() => { loadReports(); }, [loadReports]);

  /* ── Load generated reports ── */
  const loadGenReports = useCallback(async () => {
    if (!genColRef) return;
    setGenLoading(true);
    try {
      const q = query(genColRef, orderBy("generatedAt", "desc"), fsLimit(20));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGenReports(list);
      const uc = list.filter(r => !r.read).length;
      setUnreadCount(uc);
      if (onUnreadCount) onUnreadCount(uc);
    } catch (err) {
      console.error("Failed to load generated reports:", err);
    }
    setGenLoading(false);
  }, [genColRef, onUnreadCount]);

  /* Load unread count on mount (for badge) */
  useEffect(() => { loadGenReports(); }, [loadGenReports]);

  /* Reload generated reports when tab switches to "generated" */
  useEffect(() => {
    if (innerTab === "generated") loadGenReports();
  }, [innerTab, loadGenReports]);

  /* ── Mark report as read ── */
  const markRead = async (report) => {
    if (!_db || !companyId || report.read) return;
    try {
      await updateDoc(doc(_db, "companies", companyId, "generatedReports", report.id), { read: true });
      setGenReports(prev => prev.map(r => r.id === report.id ? { ...r, read: true } : r));
      const newCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newCount);
      if (onUnreadCount) onUnreadCount(newCount);
    } catch (err) {
      console.error("Mark read failed:", err);
    }
  };

  /* ── View/expand a generated report ── */
  const toggleExpand = (report) => {
    if (expandedReport === report.id) {
      setExpandedReport(null);
    } else {
      setExpandedReport(report.id);
      if (!report.read) markRead(report);
    }
  };

  /* ── Toggle enabled ── */
  const toggleEnabled = async (report) => {
    if (!_db || !companyId) return;
    const ref = doc(_db, "companies", companyId, "scheduledReports", report.id);
    const newEnabled = !report.enabled;
    try {
      await updateDoc(ref, { enabled: newEnabled });
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, enabled: newEnabled } : r));
    } catch (err) {
      console.error("Toggle failed:", err);
    }
  };

  /* ── Delete ── */
  const handleDelete = async (report) => {
    if (!_db || !companyId) return;
    if (!window.confirm(`Delete "${report.name}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(_db, "companies", companyId, "scheduledReports", report.id));
      setReports(prev => prev.filter(r => r.id !== report.id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  /* ── Open form for new / edit ── */
  const openNew = () => {
    setForm({ ...emptyForm, recipientEmail: userEmail || "" });
    setEditingId(null);
    setView("form");
  };

  const openEdit = (report) => {
    setForm({
      name: report.name || "",
      reportType: report.reportType || "project_status",
      frequency: report.frequency || "daily",
      dayOfWeek: report.dayOfWeek || "monday",
      dayOfMonth: report.dayOfMonth || 1,
      timeOfDay: report.timeOfDay || "08:00",
      recipientEmail: report.recipientEmail || userEmail || "",
      enabled: report.enabled !== false,
    });
    setEditingId(report.id);
    setView("form");
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!colRef || !form.name.trim()) return;
    setSaving(true);

    const nextRunAt = calcNextRunAt(form.frequency, form.timeOfDay, form.dayOfWeek, form.dayOfMonth);

    const data = {
      name: form.name.trim(),
      reportType: form.reportType,
      frequency: form.frequency,
      dayOfWeek: form.frequency === "weekly" ? form.dayOfWeek : null,
      dayOfMonth: form.frequency === "monthly" ? form.dayOfMonth : null,
      timeOfDay: form.timeOfDay,
      recipientEmail: form.recipientEmail.trim() || userEmail || "",
      enabled: form.enabled,
      nextRunAt: Timestamp.fromDate(nextRunAt),
      companyId: companyId,
      createdByName: userName || "",
    };

    try {
      if (editingId) {
        await updateDoc(doc(_db, "companies", companyId, "scheduledReports", editingId), data);
      } else {
        data.createdAt = Timestamp.now();
        data.lastRunAt = null;
        await addDoc(colRef, data);
      }
      await loadReports();
      setView("list");
      setEditingId(null);
    } catch (err) {
      console.error("Save failed:", err);
    }
    setSaving(false);
  };

  const updateField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER — FORM VIEW
  ═══════════════════════════════════════════════════════════════════════ */
  if (view === "form") {
    return (
      <div style={{ maxWidth: 560 }}>
        <button
          className="btn btn-secondary"
          onClick={() => { setView("list"); setEditingId(null); }}
          style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}
        >
          <IcArrowLeft /> Back to Scheduled Reports
        </button>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", marginBottom: 2 }}>
            {editingId ? "Edit Scheduled Report" : "New Scheduled Report"}
          </div>

          {/* Report Name */}
          <div>
            <label className="lbl">Report Name</label>
            <input
              className="inp"
              placeholder="e.g. Weekly Revenue Summary"
              value={form.name}
              onChange={e => updateField("name", e.target.value)}
            />
          </div>

          {/* Report Type */}
          <div>
            <label className="lbl">Report Type</label>
            <select className="sel" value={form.reportType} onChange={e => updateField("reportType", e.target.value)}>
              {REPORT_TYPES.map(rt => (
                <option key={rt.value} value={rt.value}>{rt.label}</option>
              ))}
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label className="lbl">Frequency</label>
            <div style={{ display: "flex", gap: 0 }}>
              {FREQUENCIES.map(f => (
                <button
                  key={f}
                  className={form.frequency === f ? "btn btn-primary" : "btn btn-secondary"}
                  onClick={() => updateField("frequency", f)}
                  style={{ borderRadius: f === "daily" ? "7px 0 0 7px" : f === "monthly" ? "0 7px 7px 0" : 0, flex: 1 }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Day of Week (weekly only) */}
          {form.frequency === "weekly" && (
            <div>
              <label className="lbl">Day of Week</label>
              <select className="sel" value={form.dayOfWeek} onChange={e => updateField("dayOfWeek", e.target.value)}>
                {DAYS_OF_WEEK.map(d => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Day of Month (monthly only) */}
          {form.frequency === "monthly" && (
            <div>
              <label className="lbl">Day of Month</label>
              <select className="sel" value={form.dayOfMonth} onChange={e => updateField("dayOfMonth", Number(e.target.value))}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{ordinalSuffix(n)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Time of Day */}
          <div>
            <label className="lbl">Time of Day</label>
            <select className="sel" value={form.timeOfDay} onChange={e => updateField("timeOfDay", e.target.value)}>
              {TIME_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Recipient Email */}
          <div>
            <label className="lbl">Recipient Email</label>
            <input
              className="inp"
              type="email"
              value={form.recipientEmail}
              onChange={e => updateField("recipientEmail", e.target.value)}
            />
          </div>

          {/* Enabled checkbox */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--t1)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={e => updateField("enabled", e.target.checked)}
            />
            Active (uncheck to pause this schedule)
          </label>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Saving..." : "Save Schedule"}
            </button>
            <button className="btn btn-secondary" onClick={() => { setView("list"); setEditingId(null); }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER — MAIN VIEW (tabs: Schedules / Generated Reports)
  ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* Inner tab bar */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "1px solid var(--br)" }}>
        <button
          onClick={() => setInnerTab("schedules")}
          style={{
            padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
            background: "transparent", color: innerTab === "schedules" ? "var(--acc)" : "var(--t2)",
            borderBottom: innerTab === "schedules" ? "2px solid var(--acc)" : "2px solid transparent",
            fontFamily: "var(--ui)",
          }}
        >
          Schedules
        </button>
        <button
          onClick={() => setInnerTab("generated")}
          style={{
            padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
            background: "transparent", color: innerTab === "generated" ? "var(--acc)" : "var(--t2)",
            borderBottom: innerTab === "generated" ? "2px solid var(--acc)" : "2px solid transparent",
            fontFamily: "var(--ui)", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          Generated Reports
          {unreadCount > 0 && (
            <span style={{
              background: "var(--acc)", color: "#fff", borderRadius: 20, padding: "1px 7px",
              fontSize: 9, fontWeight: 700, minWidth: 16, textAlign: "center",
            }}>
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Generated Reports Tab ── */}
      {innerTab === "generated" && (
        <div>
          {genLoading ? (
            <div style={{ color: "var(--t3)", fontSize: 12, padding: "20px 0" }}>Loading...</div>
          ) : genReports.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--t2)", fontSize: 13 }}>
              No generated reports yet. Reports will appear here once your schedules run.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {genReports.map(gr => (
                <div key={gr.id} className="card">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: expandedReport === gr.id ? 12 : 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, color: "var(--t1)", fontSize: 13 }}>{gr.reportName}</span>
                        {!gr.read && (
                          <span style={{
                            background: "var(--green)", color: "#fff", borderRadius: 4, padding: "1px 6px",
                            fontSize: 9, fontWeight: 700,
                          }}>NEW</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--t3)", fontFamily: "var(--mono)", marginBottom: 2 }}>
                        {reportTypeLabel(gr.reportType)}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--t3)" }}>
                        {formatGenDate(gr.generatedAt)}
                      </div>
                    </div>
                    <button className="btn btn-secondary" onClick={() => toggleExpand(gr)} style={{ fontSize: 11, padding: "5px 12px" }}>
                      {expandedReport === gr.id ? "Hide" : "View Report"}
                    </button>
                  </div>
                  {expandedReport === gr.id && (
                    <div style={{ borderTop: "1px solid var(--br)", paddingTop: 12 }}>
                      <RenderReportData reportType={gr.reportType} data={gr.data} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Schedules Tab ── */}
      {innerTab === "schedules" && (
        <div>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)" }}>Scheduled Reports</div>
            {canManage && (
              <button className="btn btn-primary" onClick={openNew} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                + New Schedule
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ color: "var(--t3)", fontSize: 12, padding: "20px 0" }}>Loading...</div>
          ) : reports.length === 0 ? (
            /* Empty state */
            <div style={{ textAlign: "center", padding: "48px 16px" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}><IcClock /></div>
              <div style={{ color: "var(--t2)", fontSize: 13, maxWidth: 360, margin: "0 auto 20px" }}>
                No scheduled reports yet. Create one to automatically receive business updates in your inbox.
              </div>
              {canManage && (
                <button className="btn btn-primary" onClick={openNew}>
                  + Create Your First Report
                </button>
              )}
            </div>
          ) : (
            /* Report cards */
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {reports.map(r => (
                <div key={r.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "var(--t1)", fontSize: 13, marginBottom: 2 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 4 }}>{reportTypeLabel(r.reportType)}</div>
                    <div style={{ fontSize: 11, color: "var(--t2)", display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                      <IcClock /> {scheduleSummary(r.frequency, r.dayOfWeek, r.dayOfMonth, r.timeOfDay)}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--t3)", fontFamily: "var(--mono)" }}>{r.recipientEmail}</div>
                    <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 2 }}>
                      {r.lastRunAt ? `Last run: ${formatDate(r.lastRunAt)}` : "Never run yet"}
                    </div>
                  </div>

                  {/* Toggle pill */}
                  <button
                    onClick={() => toggleEnabled(r)}
                    style={{
                      background: r.enabled ? "var(--green)" : "var(--s3)",
                      color: r.enabled ? "#fff" : "var(--t3)",
                      border: "none",
                      borderRadius: 12,
                      padding: "4px 12px",
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "var(--ui)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.enabled ? "Enabled" : "Disabled"}
                  </button>

                  {/* Edit / Delete */}
                  {canManage && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-secondary" onClick={() => openEdit(r)} title="Edit" style={{ padding: "6px 8px" }}>
                        <IcPencil />
                      </button>
                      <button className="btn btn-secondary" onClick={() => handleDelete(r)} title="Delete" style={{ padding: "6px 8px", color: "var(--red, #ef4444)" }}>
                        <IcTrash />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
