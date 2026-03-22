/**
 * ScheduledReports.jsx
 * Self-contained panel for creating/managing scheduled report configurations.
 * Reads/writes Firestore: companies/{companyId}/scheduledReports/{reportId}
 */

import { useState, useEffect, useCallback } from "react";
import {
  getFirestore, collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, Timestamp
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
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function ScheduledReports({ companyId, userEmail, userName, permissionLevel }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // "list" | "form"
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

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

  /* ── Load reports ── */
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
     RENDER — LIST VIEW
  ═══════════════════════════════════════════════════════════════════════ */
  return (
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
  );
}
