/**
 * JobDoxReports.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Reporting & Analytics module for Job-Dox Portal.
 *
 * EXPORTS:
 *   ReportsDashboard  → full page component for the "Reports" rail button
 *
 * REPORT TABS:
 *   1. Revenue In Period   — revenue by date range with breakdowns
 *   2. WIP (Work In Progress) — active jobs with budget vs actual
 *   3. Referral Reports    — lead source / referral tracking
 *   4. Sales Pipeline      — filterable pipeline by worktype, employee, status
 *   5. Whiteboard          — project × worktype grid with status colors
 *   6. AI Analytics        — Anthropic-powered insights (zip codes, profitability)
 *
 * PORTAL INTEGRATION:
 *   1. Import { ReportsDashboard } from "./JobDoxReports.jsx"
 *   2. Wire Reports rail button: onClick={()=>navTo("reports")}
 *   3. Add page==="reports" route to render <ReportsDashboard>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
const f$ = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n||0);
const fPct = (a,b) => b>0 ? ((a/b)*100).toFixed(1) : "0.0";
const daysAgo = d => { if (!d) return 0; return Math.floor((Date.now()-new Date(d).getTime())/86400000); };
const today = () => new Date().toISOString().split("T")[0];

/* Netlify function caller */
const NETLIFY = "/.netlify/functions";
async function callFn(name, data) {
  const res = await fetch(`${NETLIFY}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `${name} failed (${res.status})`);
  return json;
}

/* localStorage invoice helpers (same keys as portal/finance) */
function lsGetInvoices(projId) {
  try {
    const all = JSON.parse(localStorage.getItem("jd_invoices")) || [];
    return projId ? all.filter(i => i.projId === projId) : all;
  } catch { return []; }
}

function lsLoadVendorBills() {
  try { return JSON.parse(localStorage.getItem("jd_vendor_bills")) || []; } catch { return []; }
}

function lsGetProjectBudget(projId) {
  try {
    const all = JSON.parse(localStorage.getItem("jd_project_budgets")) || {};
    return all[projId] || { categories:[], xactimate:null };
  } catch { return { categories:[], xactimate:null }; }
}

function lsProjRead(projId, key) {
  try { return JSON.parse(localStorage.getItem(`jd_proj_${key}_${projId}`)); } catch { return null; }
}

/* Date range helper */
function getDateRange(period) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  switch(period) {
    case "this_month":  return { from: new Date(y,m,1).toISOString().split("T")[0], to: today() };
    case "last_month":  return { from: new Date(y,m-1,1).toISOString().split("T")[0], to: new Date(y,m,0).toISOString().split("T")[0] };
    case "this_quarter":{
      const qm = Math.floor(m/3)*3;
      return { from: new Date(y,qm,1).toISOString().split("T")[0], to: today() };
    }
    case "this_year":   return { from: new Date(y,0,1).toISOString().split("T")[0], to: today() };
    case "last_year":   return { from: new Date(y-1,0,1).toISOString().split("T")[0], to: new Date(y-1,11,31).toISOString().split("T")[0] };
    case "custom":      return null;
    default:            return { from: new Date(y,m,1).toISOString().split("T")[0], to: today() };
  }
}

/* CSV export helper */
function exportCSV(projects, filename) {
  const headers = ["Name","Type","Status","Address","ZIP","Carrier","Created","Revenue","Invoiced","Costs","Margin","Margin%","Age (days)"];
  const rows = projects.map(p => [
    p.name || p.address || p.id,
    p.type || "",
    p.status || "",
    p.address || "",
    p.zip || (p.address?.match(/\d{5}/)||[""])[0],
    p.carrier || "",
    p.createdDate || "",
    p.revenue || 0,
    p.totalInvoiced || 0,
    p.totalBillsPaid || 0,
    p.margin || 0,
    p.marginPct?.toFixed(1) || "0.0",
    p.projectAge || 0,
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type:"text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}_${today()}.csv`; a.click();
  URL.revokeObjectURL(url);
}


/* ─────────────────────────────────────────────────────────────────────────────
   DATA ENRICHMENT — build enriched project data from portal state
───────────────────────────────────────────────────────────────────────────── */
function enrichProjects(projects) {
  return projects.map(p => {
    const invoices = lsGetInvoices(p.id);
    const bills    = lsLoadVendorBills().filter(b => b.projId === p.id);
    const budget   = lsGetProjectBudget(p.id);
    const worktypes = lsProjRead(p.id, "worktypes") || p.worktypes || [];

    const totalInvoiced = invoices.reduce((s,i) => s + (parseFloat(i.total)||0), 0);
    const totalPaid     = invoices.filter(i=>i.status==="paid").reduce((s,i) => s + (parseFloat(i.total)||0), 0);
    const totalBillsPaid= bills.filter(b=>b.status==="paid").reduce((s,b) => s + (parseFloat(b.amount)||0), 0);
    const totalBudgeted = budget.categories.reduce((s,c) => s + (parseFloat(c.budgeted)||0), 0);

    const createdDate = p.createdAt?.toDate ? p.createdAt.toDate().toISOString().split("T")[0]
                      : p.createdAt?.seconds ? new Date(p.createdAt.seconds*1000).toISOString().split("T")[0]
                      : p.created || "";

    return {
      ...p,
      invoices, bills, budget, worktypes,
      totalInvoiced, totalPaid, totalBillsPaid, totalBudgeted,
      createdDate,
      revenue: totalPaid,
      margin: totalPaid - totalBillsPaid,
      marginPct: totalPaid > 0 ? ((totalPaid - totalBillsPaid)/totalPaid*100) : 0,
      projectAge: daysAgo(createdDate),
    };
  });
}


/* ─────────────────────────────────────────────────────────────────────────────
   ICONS (minimal set for reports)
───────────────────────────────────────────────────────────────────────────── */
const RIc = {
  revenue:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  wip:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  referral: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
  pipeline: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  board:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  ai:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1.27c.34-.6.99-1 1.73-1a2 2 0 110 4c-.74 0-1.39-.4-1.73-1H21a7 7 0 01-7 7v1.27c.6.34 1 .99 1 1.73a2 2 0 11-4 0c0-.74.4-1.39 1-1.73V23a7 7 0 01-7-7H3.73c-.34.6-.99 1-1.73 1a2 2 0 110-4c.74 0 1.39.4 1.73 1H5a7 7 0 017-7V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"/></svg>,
  download: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  filter:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  equip:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
  star:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
};


/* ─────────────────────────────────────────────────────────────────────────────
   CSS
───────────────────────────────────────────────────────────────────────────── */
const RPT_CSS = `
.rpt-dash{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg);}
.rpt-topbar{background:var(--s1);border-bottom:1px solid var(--br);padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:54px;flex-shrink:0;}
.rpt-topbar-ttl{font-weight:700;font-size:15px;color:var(--t1);}
.rpt-topbar-sub{font-size:9px;color:var(--t3);font-family:var(--mono);margin-top:1px;letter-spacing:.05em;}
.rpt-body{flex:1;overflow-y:auto;padding:20px;animation:jd-fade .2s ease both;}

.rpt-tabs{display:flex;gap:2px;background:var(--s2);border-radius:9px;padding:3px;border:1px solid var(--br);}
.rpt-tab{border:none;background:transparent;color:var(--t2);font-family:var(--ui);font-size:11px;font-weight:600;padding:7px 14px;border-radius:7px;cursor:pointer;transition:all .12s;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;}
.rpt-tab:hover{color:var(--t1);background:var(--s3);}
.rpt-tab.active{background:var(--acc);color:#fff;box-shadow:0 0 10px var(--acc-glo);}

.rpt-card{background:var(--s2);border:1px solid var(--br);border-radius:11px;padding:16px;margin-bottom:14px;}
.rpt-card-hd{font-weight:700;font-size:13px;color:var(--t1);margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;}
.rpt-kpi-row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;}
.rpt-kpi{background:var(--s2);border:1px solid var(--br);border-radius:9px;padding:14px 18px;min-width:160px;flex:1;}
.rpt-kpi-label{font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;font-family:var(--mono);margin-bottom:4px;}
.rpt-kpi-val{font-size:22px;font-weight:700;color:var(--t1);font-family:var(--mono);}
.rpt-kpi-sub{font-size:10px;color:var(--t2);margin-top:2px;}

.rpt-filter-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px;}
.rpt-filter-row label{font-size:10px;color:var(--t3);font-weight:600;text-transform:uppercase;letter-spacing:.05em;}
.rpt-sel{background:var(--s3);border:1px solid var(--br);border-radius:6px;padding:5px 10px;font-size:11px;color:var(--t1);font-family:var(--ui);cursor:pointer;}
.rpt-inp{background:var(--s3);border:1px solid var(--br);border-radius:6px;padding:5px 10px;font-size:11px;color:var(--t1);font-family:var(--ui);}

.rpt-tbl{width:100%;border-collapse:collapse;font-size:11px;}
.rpt-tbl th{text-align:left;font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;font-family:var(--mono);padding:8px 10px;border-bottom:2px solid var(--br);font-weight:600;white-space:nowrap;}
.rpt-tbl td{padding:8px 10px;border-bottom:1px solid var(--br);color:var(--t1);vertical-align:middle;}
.rpt-tbl tr:hover td{background:var(--s3);}
.rpt-tbl .mono{font-family:var(--mono);font-size:11px;}

.rpt-bar{height:6px;border-radius:3px;background:var(--s3);overflow:hidden;min-width:60px;}
.rpt-bar-fill{height:100%;border-radius:3px;transition:width .3s ease;}
.rpt-pill{display:inline-block;padding:2px 8px;border-radius:4px;font-size:9px;font-weight:700;letter-spacing:.04em;white-space:nowrap;}
.rpt-export-btn{border:1px solid var(--br);background:var(--s3);border-radius:6px;padding:5px 12px;font-size:10px;color:var(--t2);cursor:pointer;font-family:var(--ui);font-weight:600;transition:all .12s;display:inline-flex;align-items:center;gap:5px;}
.rpt-export-btn:hover{border-color:var(--blue);color:var(--blue);}

.ai-panel{background:var(--s2);border:1px solid var(--br);border-radius:11px;overflow:hidden;}
.ai-panel-hd{padding:14px 16px;border-bottom:1px solid var(--br);display:flex;align-items:center;gap:10px;}
.ai-panel-body{padding:16px;min-height:120px;}
.ai-prompt-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;}
.ai-prompt-chip{border:1px solid var(--br);background:var(--s3);border-radius:6px;padding:6px 12px;font-size:10px;color:var(--t2);cursor:pointer;transition:all .12s;font-family:var(--ui);font-weight:500;}
.ai-prompt-chip:hover{border-color:var(--acc);color:var(--acc);background:var(--acc-lo);}
.ai-prompt-chip.active{border-color:var(--acc);color:#fff;background:var(--acc);}
.ai-result{font-size:12px;line-height:1.7;color:var(--t1);white-space:pre-wrap;}
.ai-result strong{color:var(--acc);}
.ai-loading{display:flex;align-items:center;gap:8px;color:var(--t2);font-size:11px;padding:20px 0;}
.ai-dot{width:6px;height:6px;border-radius:50%;background:var(--acc);animation:jd-ping 1s ease infinite;}
`;


/* ─────────────────────────────────────────────────────────────────────────────
   REPORT TAB DEFINITIONS
───────────────────────────────────────────────────────────────────────────── */
const REPORT_TABS = [
  { key:"revenue",  label:"Revenue",    icon: RIc.revenue  },
  { key:"wip",      label:"WIP",        icon: RIc.wip      },
  { key:"referral", label:"Referrals",  icon: RIc.referral },
  { key:"pipeline", label:"Pipeline",   icon: RIc.pipeline },
  { key:"board",    label:"Whiteboard", icon: RIc.board    },
  { key:"ai",       label:"AI Insights",icon: RIc.ai       },
  { key:"equip",    label:"Equip Mismatch",icon: RIc.equip },
  { key:"reputation", label:"Reputation", icon: RIc.star },
];


/* ═══════════════════════════════════════════════════════════════════════════
   DEFAULT STATUSES (fallback if none passed from portal)
═══════════════════════════════════════════════════════════════════════════ */
const DEFAULT_STATUSES = [
  { key:"new_lead",         label:"New Lead",          color:"#5ba3f5" },
  { key:"active",           label:"Active",            color:"#1ad98a" },
  { key:"mitigation",       label:"Mitigation",        color:"#e89c18" },
  { key:"reconstruction",   label:"Reconstruction",    color:"#a78bfa" },
  { key:"pending_approval", label:"Pending Approval",  color:"#f97316" },
  { key:"completed",        label:"Completed",         color:"#404866" },
  { key:"closed",           label:"Closed",            color:"#404866" },
  { key:"on_hold",          label:"On Hold",           color:"#e43531" },
];



/* ═══════════════════════════════════════════════════════════════════════════
   1. REVENUE IN PERIOD
═══════════════════════════════════════════════════════════════════════════ */
function RevenueReport({ data, statuses, customWorkTypes, customProjectTypes }) {
  const [period, setPeriod]         = useState("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [groupBy, setGroupBy]       = useState("type");

  const range = period === "custom" ? { from: customFrom, to: customTo } : getDateRange(period);

  const filtered = useMemo(() => {
    if (!range?.from) return data;
    return data.filter(p => p.createdDate && p.createdDate >= range.from && p.createdDate <= (range.to || today()));
  }, [data, range?.from, range?.to]);

  const totals = useMemo(() => ({
    revenue:  filtered.reduce((s,p) => s + p.revenue, 0),
    invoiced: filtered.reduce((s,p) => s + p.totalInvoiced, 0),
    costs:    filtered.reduce((s,p) => s + p.totalBillsPaid, 0),
    margin:   filtered.reduce((s,p) => s + p.margin, 0),
    count:    filtered.length,
  }), [filtered]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const key = groupBy === "type"    ? (p.type || "Untyped")
                : groupBy === "status"  ? (p.status || "Unknown")
                : groupBy === "carrier" ? (p.carrier || "No Carrier")
                : (p.zip || p.address?.match(/\d{5}/)?.[0] || "No ZIP");
      if (!map[key]) map[key] = { key, projects:[], revenue:0, invoiced:0, costs:0, margin:0 };
      map[key].projects.push(p);
      map[key].revenue  += p.revenue;
      map[key].invoiced += p.totalInvoiced;
      map[key].costs    += p.totalBillsPaid;
      map[key].margin   += p.margin;
    });
    return Object.values(map).sort((a,b) => b.revenue - a.revenue);
  }, [filtered, groupBy]);

  return (
    <div>
      {/* Filters */}
      <div className="rpt-filter-row">
        <label>Period</label>
        <select className="rpt-sel" value={period} onChange={e=>setPeriod(e.target.value)}>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_quarter">This Quarter</option>
          <option value="this_year">This Year</option>
          <option value="last_year">Last Year</option>
          <option value="custom">Custom Range</option>
        </select>
        {period==="custom" && <>
          <input type="date" className="rpt-inp" value={customFrom} onChange={e=>setCustomFrom(e.target.value)}/>
          <span style={{color:"var(--t3)",fontSize:10}}>to</span>
          <input type="date" className="rpt-inp" value={customTo} onChange={e=>setCustomTo(e.target.value)}/>
        </>}
        <label style={{marginLeft:12}}>Group By</label>
        <select className="rpt-sel" value={groupBy} onChange={e=>setGroupBy(e.target.value)}>
          <option value="type">Project Type</option>
          <option value="status">Status</option>
          <option value="carrier">Carrier</option>
          <option value="zip">ZIP Code</option>
        </select>
        <button className="rpt-export-btn" onClick={()=>exportCSV(filtered,"revenue_report")}>{RIc.download} Export CSV</button>
      </div>

      {/* KPI Cards */}
      <div className="rpt-kpi-row">
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Total Revenue</div>
          <div className="rpt-kpi-val" style={{color:"var(--green)"}}>{f$(totals.revenue)}</div>
          <div className="rpt-kpi-sub">{totals.count} projects</div>
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Total Invoiced</div>
          <div className="rpt-kpi-val">{f$(totals.invoiced)}</div>
          <div className="rpt-kpi-sub">Outstanding: {f$(totals.invoiced - totals.revenue)}</div>
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Total Costs</div>
          <div className="rpt-kpi-val" style={{color:"var(--amber)"}}>{f$(totals.costs)}</div>
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Gross Margin</div>
          <div className="rpt-kpi-val" style={{color: totals.margin >= 0 ? "var(--green)" : "var(--acc)"}}>{f$(totals.margin)}</div>
          <div className="rpt-kpi-sub">{fPct(totals.margin, totals.revenue)}% margin</div>
        </div>
      </div>

      {/* Grouped breakdown table */}
      <div className="rpt-card">
        <div className="rpt-card-hd">Revenue by {groupBy === "type" ? "Project Type" : groupBy === "status" ? "Status" : groupBy === "carrier" ? "Carrier" : "ZIP Code"}</div>
        <table className="rpt-tbl">
          <thead>
            <tr>
              <th>{groupBy === "type" ? "Type" : groupBy === "status" ? "Status" : groupBy === "carrier" ? "Carrier" : "ZIP"}</th>
              <th>Projects</th>
              <th>Revenue</th>
              <th>Invoiced</th>
              <th>Costs</th>
              <th>Margin</th>
              <th style={{width:120}}>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(g => {
              const statusObj = statuses.find(s => s.label === g.key || s.key === g.key);
              return (
                <tr key={g.key}>
                  <td>
                    {statusObj
                      ? <span className="rpt-pill" style={{background:`${statusObj.color}22`,color:statusObj.color}}>{g.key}</span>
                      : <span style={{fontWeight:600}}>{g.key}</span>}
                  </td>
                  <td className="mono">{g.projects.length}</td>
                  <td className="mono" style={{fontWeight:700}}>{f$(g.revenue)}</td>
                  <td className="mono">{f$(g.invoiced)}</td>
                  <td className="mono">{f$(g.costs)}</td>
                  <td className="mono" style={{color: g.margin >= 0 ? "var(--green)" : "var(--acc)"}}>{f$(g.margin)}</td>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div className="rpt-bar" style={{flex:1}}>
                        <div className="rpt-bar-fill" style={{width:`${fPct(g.revenue, totals.revenue)}%`,background:"var(--blue)"}}/>
                      </div>
                      <span className="mono" style={{fontSize:9,color:"var(--t3)"}}>{fPct(g.revenue, totals.revenue)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {grouped.length === 0 && <tr><td colSpan={7} style={{textAlign:"center",color:"var(--t3)",padding:30}}>No projects in this period</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Project detail table */}
      <div className="rpt-card">
        <div className="rpt-card-hd">Project Details</div>
        <table className="rpt-tbl">
          <thead>
            <tr><th>Project</th><th>Type</th><th>Status</th><th>Created</th><th>Revenue</th><th>Invoiced</th><th>Margin</th></tr>
          </thead>
          <tbody>
            {filtered.sort((a,b)=>b.revenue-a.revenue).map(p => {
              const so = statuses.find(s=>s.key===p.status);
              return (
                <tr key={p.id}>
                  <td style={{fontWeight:600}}>{p.name || p.address || p.id}</td>
                  <td><span className="rpt-pill" style={{background:"var(--s3)",color:"var(--t2)"}}>{p.type||"—"}</span></td>
                  <td><span className="rpt-pill" style={{background:`${so?.color||"var(--t3)"}22`,color:so?.color||"var(--t3)"}}>{p.status||"—"}</span></td>
                  <td className="mono">{p.createdDate}</td>
                  <td className="mono" style={{fontWeight:700}}>{f$(p.revenue)}</td>
                  <td className="mono">{f$(p.totalInvoiced)}</td>
                  <td className="mono" style={{color: p.margin >= 0 ? "var(--green)" : "var(--acc)"}}>{f$(p.margin)} <span style={{fontSize:9,color:"var(--t3)"}}>({fPct(p.margin,p.revenue)}%)</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   3. REFERRAL REPORTS
═══════════════════════════════════════════════════════════════════════════ */
function ReferralReport({ data, statuses }) {
  const [period, setPeriod]         = useState("this_year");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");

  const range = period === "custom" ? { from: customFrom, to: customTo } : getDateRange(period);

  const filtered = useMemo(() => {
    if (!range?.from) return data;
    return data.filter(p => p.createdDate && p.createdDate >= range.from && p.createdDate <= (range.to || today()));
  }, [data, range?.from, range?.to]);

  // Group by referral source — use referralSource / leadSource / carrier as best proxy
  const bySource = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const src = p.referralSource || p.leadSource || p.carrier || "Direct / Unknown";
      if (!map[src]) map[src] = { source: src, projects:[], revenue:0, conversionCount:0 };
      map[src].projects.push(p);
      map[src].revenue += p.revenue;
      if (p.status === "completed" || p.status === "closed") map[src].conversionCount++;
    });
    Object.values(map).forEach(s => { s.avgRevenue = s.projects.length > 0 ? s.revenue / s.projects.length : 0; });
    return Object.values(map).sort((a,b) => b.revenue - a.revenue);
  }, [filtered]);

  const totalRevenue  = bySource.reduce((s,r) => s + r.revenue, 0);
  const totalProjects = bySource.reduce((s,r) => s + r.projects.length, 0);

  return (
    <div>
      <div className="rpt-filter-row">
        <label>Period</label>
        <select className="rpt-sel" value={period} onChange={e=>setPeriod(e.target.value)}>
          <option value="this_month">This Month</option>
          <option value="this_quarter">This Quarter</option>
          <option value="this_year">This Year</option>
          <option value="last_year">Last Year</option>
          <option value="custom">Custom Range</option>
        </select>
        {period==="custom" && <>
          <input type="date" className="rpt-inp" value={customFrom} onChange={e=>setCustomFrom(e.target.value)}/>
          <span style={{color:"var(--t3)",fontSize:10}}>to</span>
          <input type="date" className="rpt-inp" value={customTo} onChange={e=>setCustomTo(e.target.value)}/>
        </>}
        <button className="rpt-export-btn" onClick={()=>exportCSV(filtered,"referral_report")}>{RIc.download} Export CSV</button>
      </div>

      <div className="rpt-kpi-row">
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Total Sources</div>
          <div className="rpt-kpi-val">{bySource.length}</div>
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Total Projects</div>
          <div className="rpt-kpi-val">{totalProjects}</div>
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Total Revenue</div>
          <div className="rpt-kpi-val" style={{color:"var(--green)"}}>{f$(totalRevenue)}</div>
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Avg Revenue / Source</div>
          <div className="rpt-kpi-val">{f$(bySource.length > 0 ? totalRevenue / bySource.length : 0)}</div>
        </div>
      </div>

      <div className="rpt-card">
        <div className="rpt-card-hd">Referral Source Performance</div>
        <table className="rpt-tbl">
          <thead>
            <tr>
              <th>Source</th>
              <th>Projects</th>
              <th>Revenue</th>
              <th>Avg Job Size</th>
              <th>Completed</th>
              <th>Conversion</th>
              <th style={{width:120}}>Revenue Share</th>
            </tr>
          </thead>
          <tbody>
            {bySource.map(s => (
              <tr key={s.source}>
                <td style={{fontWeight:600}}>{s.source}</td>
                <td className="mono">{s.projects.length}</td>
                <td className="mono" style={{fontWeight:700}}>{f$(s.revenue)}</td>
                <td className="mono">{f$(s.avgRevenue)}</td>
                <td className="mono">{s.conversionCount}</td>
                <td className="mono">{fPct(s.conversionCount, s.projects.length)}%</td>
                <td>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div className="rpt-bar" style={{flex:1}}>
                      <div className="rpt-bar-fill" style={{width:`${fPct(s.revenue, totalRevenue)}%`,background:"var(--purple)"}}/>
                    </div>
                    <span className="mono" style={{fontSize:9,color:"var(--t3)"}}>{fPct(s.revenue, totalRevenue)}%</span>
                  </div>
                </td>
              </tr>
            ))}
            {bySource.length === 0 && <tr><td colSpan={7} style={{textAlign:"center",color:"var(--t3)",padding:30}}>No referral data available</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Top referrers — project breakdown */}
      <div className="rpt-card">
        <div className="rpt-card-hd">Top Referral Sources — Project Breakdown</div>
        {bySource.slice(0,5).map(s => (
          <div key={s.source} style={{marginBottom:12}}>
            <div style={{fontWeight:600,fontSize:12,color:"var(--t1)",marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
              {s.source}
              <span style={{fontSize:9,color:"var(--t3)",fontWeight:400}}>{s.projects.length} projects — {f$(s.revenue)} total</span>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {s.projects.map(p => {
                const so = statuses.find(st=>st.key===p.status);
                return (
                  <div key={p.id} style={{background:"var(--s3)",border:"1px solid var(--br)",borderRadius:6,padding:"5px 9px",fontSize:10}}>
                    <div style={{fontWeight:600,color:"var(--t1)"}}>{p.name || p.address || p.id}</div>
                    <div style={{display:"flex",gap:6,marginTop:2}}>
                      <span className="rpt-pill" style={{background:`${so?.color||"var(--t3)"}22`,color:so?.color||"var(--t3)"}}>{p.status}</span>
                      <span style={{fontFamily:"var(--mono)",color:"var(--t2)"}}>{f$(p.revenue)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {bySource.length === 0 && <div style={{color:"var(--t3)",fontSize:11,padding:20,textAlign:"center"}}>No referral sources found</div>}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   2. WIP (WORK IN PROGRESS)
═══════════════════════════════════════════════════════════════════════════ */
function WIPReport({ data, statuses }) {
  const active = useMemo(() =>
    data.filter(p => !["completed","closed"].includes(p.status))
        .sort((a,b) => b.totalBudgeted - a.totalBudgeted),
    [data]
  );

  const totals = useMemo(() => ({
    budgeted: active.reduce((s,p) => s + p.totalBudgeted, 0),
    invoiced: active.reduce((s,p) => s + p.totalInvoiced, 0),
    paid:     active.reduce((s,p) => s + p.totalPaid, 0),
    costs:    active.reduce((s,p) => s + p.totalBillsPaid, 0),
    count:    active.length,
  }), [active]);

  return (
    <div>
      <div className="rpt-kpi-row">
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Active Projects</div>
          <div className="rpt-kpi-val">{totals.count}</div>
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Total Budget</div>
          <div className="rpt-kpi-val">{f$(totals.budgeted)}</div>
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Total Invoiced</div>
          <div className="rpt-kpi-val">{f$(totals.invoiced)}</div>
          <div className="rpt-kpi-sub">{fPct(totals.invoiced, totals.budgeted)}% of budget</div>
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Collected</div>
          <div className="rpt-kpi-val" style={{color:"var(--green)"}}>{f$(totals.paid)}</div>
          <div className="rpt-kpi-sub">AR: {f$(totals.invoiced - totals.paid)}</div>
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Costs Paid</div>
          <div className="rpt-kpi-val" style={{color:"var(--amber)"}}>{f$(totals.costs)}</div>
        </div>
      </div>

      <div className="rpt-card">
        <div className="rpt-card-hd">
          Work In Progress Detail
          <button className="rpt-export-btn" onClick={()=>exportCSV(active,"wip_report")}>{RIc.download} Export CSV</button>
        </div>
        <table className="rpt-tbl">
          <thead>
            <tr>
              <th>Project</th>
              <th>Status</th>
              <th>Age (days)</th>
              <th>Budget</th>
              <th>Invoiced</th>
              <th>Collected</th>
              <th>Costs</th>
              <th style={{width:120}}>Budget Used</th>
              <th>Est. Margin</th>
            </tr>
          </thead>
          <tbody>
            {active.map(p => {
              const budgetPct = p.totalBudgeted > 0 ? (p.totalBillsPaid/p.totalBudgeted*100) : 0;
              const estMargin = p.totalBudgeted - p.totalBillsPaid;
              const so = statuses.find(s=>s.key===p.status);
              return (
                <tr key={p.id}>
                  <td style={{fontWeight:600}}>{p.name || p.address || p.id}</td>
                  <td><span className="rpt-pill" style={{background:`${so?.color||"var(--t3)"}22`,color:so?.color||"var(--t3)"}}>{so?.label||p.status||"—"}</span></td>
                  <td className="mono">{p.projectAge}d</td>
                  <td className="mono">{f$(p.totalBudgeted)}</td>
                  <td className="mono">{f$(p.totalInvoiced)}</td>
                  <td className="mono" style={{color:"var(--green)"}}>{f$(p.totalPaid)}</td>
                  <td className="mono">{f$(p.totalBillsPaid)}</td>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div className="rpt-bar" style={{flex:1}}>
                        <div className="rpt-bar-fill" style={{
                          width:`${Math.min(100,budgetPct)}%`,
                          background: budgetPct > 90 ? "var(--acc)" : budgetPct > 70 ? "var(--amber)" : "var(--green)"
                        }}/>
                      </div>
                      <span className="mono" style={{fontSize:9,color:"var(--t3)"}}>{budgetPct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="mono" style={{color: estMargin >= 0 ? "var(--green)" : "var(--acc)"}}>{f$(estMargin)}</td>
                </tr>
              );
            })}
            {active.length === 0 && <tr><td colSpan={9} style={{textAlign:"center",color:"var(--t3)",padding:30}}>No active projects</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   5. WHITEBOARD TOOL
═══════════════════════════════════════════════════════════════════════════ */
function WhiteboardReport({ data, statuses, customWorkTypes }) {
  const [sortBy, setSortBy]             = useState("name");
  const [filterStatus, setFilterStatus] = useState("active");

  // Collect all unique worktypes across company config + projects
  const allWT = useMemo(() => {
    const map = new Map();
    customWorkTypes.forEach(w => map.set(w.name, { name:w.name, color:w.color }));
    data.forEach(p => (p.worktypes||[]).forEach(w => {
      const n = w.name||w.type||w;
      if (!map.has(n)) map.set(n, { name:n, color:w.color||"var(--t3)" });
    }));
    return [...map.values()];
  }, [data, customWorkTypes]);

  // Filter & sort
  const filtered = useMemo(() => {
    let f = data;
    if (filterStatus === "active") f = f.filter(p => !["completed","closed"].includes(p.status));
    else if (filterStatus !== "all") f = f.filter(p => p.status === filterStatus);

    if (sortBy === "name")    return [...f].sort((a,b) => (a.name||a.address||"").localeCompare(b.name||b.address||""));
    if (sortBy === "age")     return [...f].sort((a,b) => b.projectAge - a.projectAge);
    if (sortBy === "revenue") return [...f].sort((a,b) => b.revenue - a.revenue);
    if (sortBy === "status")  return [...f].sort((a,b) => {
      const ai = statuses.findIndex(s=>s.key===a.status);
      const bi = statuses.findIndex(s=>s.key===b.status);
      return ai - bi;
    });
    return f;
  }, [data, filterStatus, sortBy, statuses]);

  // Look up worktype status for a given project
  const getWTInfo = (proj, wtName) => {
    const wts = proj.worktypes || [];
    const match = wts.find(w => (w.name||w.type||w) === wtName);
    if (!match) return null;
    const statusKey = match.status || proj.status || "unknown";
    const so = statuses.find(s => s.key === statusKey);
    return {
      label: so?.label || statusKey,
      color: so?.color || match.statusColor || "var(--t3)",
      lastUpdated: match.lastUpdated || match.updatedAt || null,
    };
  };

  // Calculate idle days from last update
  const getIdleDays = (proj) => {
    const u = proj.updatedAt;
    if (!u) return proj.projectAge;
    if (typeof u === "object" && u.seconds) return daysAgo(new Date(u.seconds*1000).toISOString());
    if (typeof u === "object" && u.toDate)  return daysAgo(u.toDate().toISOString());
    return daysAgo(u);
  };

  const getTimeInStatus = (wtInfo) => {
    if (!wtInfo?.lastUpdated) return "—";
    const lu = wtInfo.lastUpdated;
    const d = typeof lu === "object" && lu.seconds ? daysAgo(new Date(lu.seconds*1000).toISOString())
            : typeof lu === "object" && lu.toDate   ? daysAgo(lu.toDate().toISOString())
            : daysAgo(lu);
    return `${d}d`;
  };

  const gridCols = `200px 70px 80px ${allWT.map(()=>"minmax(90px,1fr)").join(" ")}`;

  return (
    <div>
      <div className="rpt-filter-row">
        <label>Show</label>
        <select className="rpt-sel" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="active">Active Projects Only</option>
          <option value="all">All Projects</option>
          {statuses.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <label style={{marginLeft:12}}>Sort By</label>
        <select className="rpt-sel" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
          <option value="name">Name</option>
          <option value="age">Age (Oldest First)</option>
          <option value="revenue">Revenue</option>
          <option value="status">Status</option>
        </select>
        <button className="rpt-export-btn" onClick={()=>exportCSV(filtered,"whiteboard")}>{RIc.download} Export CSV</button>
      </div>

      <div className="rpt-kpi-row">
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Projects Shown</div>
          <div className="rpt-kpi-val">{filtered.length}</div>
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Work Types Tracked</div>
          <div className="rpt-kpi-val">{allWT.length}</div>
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Avg Project Age</div>
          <div className="rpt-kpi-val">{filtered.length > 0 ? Math.round(filtered.reduce((s,p)=>s+p.projectAge,0)/filtered.length) : 0}d</div>
        </div>
      </div>

      {/* Whiteboard grid */}
      <div className="rpt-card" style={{overflowX:"auto",padding:0}}>
        <div style={{minWidth:(allWT.length+3)*110}}>
          {/* Header */}
          <div style={{display:"grid",gridTemplateColumns:gridCols,gap:1,background:"var(--br)"}}>
            <div style={{background:"var(--s1)",padding:"8px 10px",fontWeight:700,fontSize:9,color:"var(--t3)",textTransform:"uppercase",letterSpacing:".06em",fontFamily:"var(--mono)",position:"sticky",top:0,zIndex:2}}>Project</div>
            <div style={{background:"var(--s1)",padding:"8px 6px",fontWeight:700,fontSize:9,color:"var(--t3)",textTransform:"uppercase",letterSpacing:".06em",fontFamily:"var(--mono)",textAlign:"center"}}>Idle</div>
            <div style={{background:"var(--s1)",padding:"8px 6px",fontWeight:700,fontSize:9,color:"var(--t3)",textTransform:"uppercase",letterSpacing:".06em",fontFamily:"var(--mono)",textAlign:"center"}}>Age</div>
            {allWT.map(wt => (
              <div key={wt.name} style={{background:"var(--s1)",padding:"8px 6px",fontWeight:700,fontSize:9,color:wt.color,textTransform:"uppercase",letterSpacing:".06em",fontFamily:"var(--mono)",textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{wt.name}</div>
            ))}
          </div>

          {/* Rows */}
          {filtered.map(proj => {
            const idle = getIdleDays(proj);
            return (
              <div key={proj.id} style={{display:"grid",gridTemplateColumns:gridCols,gap:1,background:"var(--br)"}}>
                <div style={{background:"var(--s2)",padding:"6px 10px",display:"flex",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:600,color:"var(--t1)",fontSize:11,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:180}}>{proj.name || proj.address || proj.id}</div>
                    <div style={{fontSize:8,color:"var(--t3)"}}>{proj.type} · {f$(proj.revenue)}</div>
                  </div>
                </div>
                <div style={{background:"var(--s2)",padding:"6px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontFamily:"var(--mono)",fontSize:9,color: idle > 14 ? "var(--acc)" : idle > 7 ? "var(--amber)" : "var(--green)"}}>{idle}d</span>
                </div>
                <div style={{background:"var(--s2)",padding:"6px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--t2)"}}>{proj.projectAge}d</span>
                </div>
                {allWT.map(wt => {
                  const info = getWTInfo(proj, wt.name);
                  if (!info) return (
                    <div key={wt.name} style={{background:"var(--s2)",padding:"6px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <span style={{fontSize:9,color:"var(--t3)"}}>—</span>
                    </div>
                  );
                  return (
                    <div key={wt.name} style={{background:"var(--s2)",padding:"4px 6px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
                      <span style={{display:"inline-block",padding:"2px 7px",borderRadius:4,fontSize:8,fontWeight:700,letterSpacing:".04em",textAlign:"center",width:"100%",background:`${info.color}22`,color:info.color}}>{info.label}</span>
                      <span style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--t3)"}}>{getTimeInStatus(info)}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{padding:40,textAlign:"center",color:"var(--t3)",fontSize:12,background:"var(--s2)"}}>No projects match current filters</div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="rpt-card" style={{marginTop:14}}>
        <div className="rpt-card-hd">Status Color Legend</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {statuses.map(s => (
            <div key={s.key} style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{width:12,height:12,borderRadius:3,background:s.color,display:"inline-block"}}/>
              <span style={{fontSize:10,color:"var(--t1)"}}>{s.label}</span>
            </div>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{width:12,height:12,borderRadius:3,background:"var(--t3)",display:"inline-block"}}/>
            <span style={{fontSize:10,color:"var(--t2)"}}>Not Assigned</span>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   4. SALES PIPELINE
═══════════════════════════════════════════════════════════════════════════ */
function PipelineReport({ data, statuses, customWorkTypes, customProjectTypes, globalStaff }) {
  const [filterWT, setFilterWT]       = useState("all");
  const [filterPT, setFilterPT]       = useState("all");
  const [filterStaff, setFilterStaff] = useState("all");

  const filtered = useMemo(() => {
    let f = data;
    if (filterWT !== "all") f = f.filter(p => (p.worktypes||[]).some(w => (w.name||w.type||w) === filterWT));
    if (filterPT !== "all") f = f.filter(p => p.type === filterPT);
    if (filterStaff !== "all") {
      f = f.filter(p => {
        const assigned = lsProjRead(p.id, "assigned") || p.assignedStaff || [];
        return assigned.includes(filterStaff) || assigned.some(a => (a.id || a) === filterStaff);
      });
    }
    return f;
  }, [data, filterWT, filterPT, filterStaff]);

  // Group into pipeline columns by status
  const columns = useMemo(() => {
    const cols = statuses.map(s => ({
      ...s,
      projects: filtered.filter(p => p.status === s.key),
      revenue: 0,
    }));
    cols.forEach(c => { c.revenue = c.projects.reduce((s,p) => s + p.revenue, 0); });
    return cols;
  }, [filtered, statuses]);

  // Collect unique worktypes and project types for filter dropdowns
  const allWT = useMemo(() => {
    const set = new Set();
    data.forEach(p => (p.worktypes||[]).forEach(w => set.add(w.name||w.type||w)));
    return [...set].sort();
  }, [data]);
  const allPT = useMemo(() => [...new Set(data.map(p=>p.type).filter(Boolean))].sort(), [data]);

  const totalPipelineRevenue = columns.reduce((s,c) => s + c.revenue, 0);

  return (
    <div>
      <div className="rpt-filter-row">
        <label>{RIc.filter} Filters</label>
        <select className="rpt-sel" value={filterWT} onChange={e=>setFilterWT(e.target.value)}>
          <option value="all">All Work Types</option>
          {allWT.map(w => <option key={w} value={w}>{w}</option>)}
          {customWorkTypes.filter(w => !allWT.includes(w.name)).map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
        </select>
        <select className="rpt-sel" value={filterPT} onChange={e=>setFilterPT(e.target.value)}>
          <option value="all">All Project Types</option>
          {allPT.map(t => <option key={t} value={t}>{t}</option>)}
          {customProjectTypes.filter(t => !allPT.includes(t.name)).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
        <select className="rpt-sel" value={filterStaff} onChange={e=>setFilterStaff(e.target.value)}>
          <option value="all">All Staff / Salesmen</option>
          {globalStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="rpt-kpi-row">
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Pipeline Projects</div>
          <div className="rpt-kpi-val">{filtered.length}</div>
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Pipeline Revenue</div>
          <div className="rpt-kpi-val" style={{color:"var(--green)"}}>{f$(totalPipelineRevenue)}</div>
        </div>
        {columns.filter(c=>c.projects.length>0).slice(0,3).map(c => (
          <div className="rpt-kpi" key={c.key}>
            <div className="rpt-kpi-label">{c.label}</div>
            <div className="rpt-kpi-val" style={{color:c.color}}>{c.projects.length}</div>
            <div className="rpt-kpi-sub">{f$(c.revenue)}</div>
          </div>
        ))}
      </div>

      {/* Kanban columns */}
      <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:10}}>
        {columns.map(col => (
          <div key={col.key} style={{minWidth:220,flex:1,background:"var(--s1)",border:"1px solid var(--br)",borderRadius:9,overflow:"hidden"}}>
            <div style={{padding:"10px 12px",borderBottom:"1px solid var(--br)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontWeight:700,fontSize:11,display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:col.color,display:"inline-block"}}/>
                {col.label}
                <span style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)"}}>{col.projects.length}</span>
              </div>
              <div style={{fontSize:10,fontWeight:600,fontFamily:"var(--mono)",color:"var(--t2)"}}>{f$(col.revenue)}</div>
            </div>
            <div style={{maxHeight:500,overflowY:"auto",padding:"2px 0"}}>
              {col.projects.sort((a,b)=>b.revenue-a.revenue).map(p => (
                <div key={p.id} style={{margin:6,padding:10,background:"var(--s2)",border:"1px solid var(--br)",borderRadius:7,cursor:"default",transition:"all .1s"}}>
                  <div style={{fontWeight:600,fontSize:11,color:"var(--t1)",marginBottom:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name || p.address || p.id}</div>
                  <div style={{fontSize:9,color:"var(--t3)"}}>
                    {p.type || "Untyped"} {p.carrier ? `· ${p.carrier}` : ""}
                  </div>
                  {(p.worktypes||[]).length > 0 && (
                    <div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:3}}>
                      {p.worktypes.slice(0,3).map((w,i) => (
                        <span key={i} className="rpt-pill" style={{background:`${w.color||"var(--t3)"}22`,color:w.color||"var(--t3)",fontSize:8}}>{w.name||w.type||w}</span>
                      ))}
                    </div>
                  )}
                  <div style={{fontSize:11,fontWeight:700,fontFamily:"var(--mono)",color:"var(--t1)",marginTop:4}}>{f$(p.revenue)}</div>
                  <div style={{fontSize:9,color:"var(--t3)",display:"flex",alignItems:"center",gap:3}}>{RIc.filter} {p.projectAge}d old</div>
                </div>
              ))}
              {col.projects.length === 0 && (
                <div style={{padding:16,textAlign:"center",fontSize:10,color:"var(--t3)"}}>No projects</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Revenue by worktype × status matrix */}
      <div className="rpt-card" style={{marginTop:16}}>
        <div className="rpt-card-hd">Revenue by Work Type &amp; Status</div>
        {(() => {
          const wtMap = {};
          filtered.forEach(p => {
            const wts = (p.worktypes||[]).length > 0 ? p.worktypes : [{name: p.type || "Untyped"}];
            wts.forEach(w => {
              const wn = w.name || w.type || w;
              if (!wtMap[wn]) wtMap[wn] = { name: wn, color: w.color, byStatus:{}, total:0 };
              const sk = p.status || "unknown";
              if (!wtMap[wn].byStatus[sk]) wtMap[wn].byStatus[sk] = { revenue:0, count:0 };
              wtMap[wn].byStatus[sk].revenue += p.revenue;
              wtMap[wn].byStatus[sk].count++;
              wtMap[wn].total += p.revenue;
            });
          });
          const rows = Object.values(wtMap).sort((a,b)=>b.total-a.total);
          return (
            <table className="rpt-tbl">
              <thead>
                <tr>
                  <th>Work Type</th>
                  {statuses.map(s => <th key={s.key} style={{color:s.color}}>{s.label}</th>)}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.name}>
                    <td><span className="rpt-pill" style={{background:`${r.color||"var(--t3)"}22`,color:r.color||"var(--t3)"}}>{r.name}</span></td>
                    {statuses.map(s => {
                      const cell = r.byStatus[s.key];
                      return <td key={s.key} className="mono">{cell ? `${f$(cell.revenue)} (${cell.count})` : "—"}</td>;
                    })}
                    <td className="mono" style={{fontWeight:700}}>{f$(r.total)}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={statuses.length+2} style={{textAlign:"center",color:"var(--t3)",padding:20}}>No data</td></tr>}
              </tbody>
            </table>
          );
        })()}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   6. AI ANALYTICS (Anthropic Claude)
═══════════════════════════════════════════════════════════════════════════ */
const AI_PROMPTS = [
  { key:"zip", label:"Most Profitable ZIP Codes", build: data =>
    `Analyze these restoration projects and identify the most profitable ZIP codes. For each ZIP, show: number of projects, total revenue, average revenue per project, and profitability ranking. Identify patterns — are certain ZIPs more profitable due to carriers, job types, or sizes?\n\nProject data:\n${JSON.stringify(data.map(p=>({name:p.name,address:p.address,zip:p.zip||p.address?.match(/\\d{5}/)?.[0]||"N/A",type:p.type,status:p.status,revenue:p.revenue,margin:p.margin,carrier:p.carrier})),null,2)}`
  },
  { key:"leads", label:"Most Profitable Lead Types", build: data =>
    `Analyze these restoration projects and determine which types of project leads are most profitable. Group by project type and analyze: average revenue, average margin, conversion rate (completed/total), typical job duration, and which carriers associate with the most profitable jobs.\n\nProject data:\n${JSON.stringify(data.map(p=>({name:p.name,type:p.type,status:p.status,revenue:p.revenue,margin:p.margin,marginPct:p.marginPct,carrier:p.carrier,projectAge:p.projectAge,totalBudgeted:p.totalBudgeted})),null,2)}`
  },
  { key:"trends", label:"Revenue Trends & Forecast", build: data =>
    `Analyze the revenue trends for this restoration company. Look at project creation dates and revenue to identify: seasonal patterns, growth trends, average monthly revenue, and provide a forecast for next quarter. Identify strongest/weakest months and suggest strategies.\n\nProject data:\n${JSON.stringify(data.map(p=>({name:p.name,type:p.type,createdDate:p.createdDate,revenue:p.revenue,margin:p.margin,status:p.status})),null,2)}`
  },
  { key:"efficiency", label:"Operational Efficiency", build: data =>
    `Analyze operational efficiency for this restoration company. Look at project duration vs revenue to find: which projects take too long relative to size, which types are most efficient (best revenue per day), where there are bottlenecks (stuck in certain statuses), and overall efficiency metrics.\n\nProject data:\n${JSON.stringify(data.map(p=>({name:p.name,type:p.type,status:p.status,revenue:p.revenue,totalBudgeted:p.totalBudgeted,totalBillsPaid:p.totalBillsPaid,projectAge:p.projectAge,margin:p.margin})),null,2)}`
  },
];

function AIAnalytics({ data, companyId }) {
  const [activePrompt, setActivePrompt] = useState(null);
  const [result, setResult]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [customQ, setCustomQ] = useState("");

  const runAnalysis = useCallback(async (promptKey) => {
    setActivePrompt(promptKey);
    setResult("");
    setError("");
    setLoading(true);

    let promptText;
    if (promptKey === "custom") {
      if (!customQ.trim()) { setError("Enter a question first."); setLoading(false); return; }
      promptText = `The user asks: "${customQ}"\n\nAnalyze based on this restoration company project data:\n${JSON.stringify(data.map(p=>({name:p.name,type:p.type,status:p.status,address:p.address,zip:p.zip||p.address?.match(/\\d{5}/)?.[0]||"N/A",carrier:p.carrier,revenue:p.revenue,margin:p.margin,marginPct:p.marginPct,totalBudgeted:p.totalBudgeted,projectAge:p.projectAge,createdDate:p.createdDate})),null,2)}`;
    } else {
      const preset = AI_PROMPTS.find(p => p.key === promptKey);
      promptText = preset.build(data);
    }

    try {
      const res = await callFn("reports-analyze", { prompt: promptText, mode: "reports", companyId });
      setResult(res.text || "No response from AI.");
    } catch (err) {
      const msg = err.message || "";
      if (msg === "cortex_coins_exhausted") {
        setError("You've used all of your Cortex Coins for this billing cycle. AI features are paused until your next cycle begins.");
      } else {
        setError(msg || "AI analysis failed. Check your API key configuration.");
      }
    } finally {
      setLoading(false);
    }
  }, [data, customQ]);

  // Simple markdown-to-HTML for bold and bullets
  const renderMD = (text) => text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.*)/gm, "<span style='display:block;padding-left:12px;margin:2px 0'>• $1</span>")
    .replace(/\n/g, "<br/>");

  return (
    <div>
      <div className="rpt-kpi-row" style={{marginBottom:8}}>
        <div className="rpt-kpi" style={{flex:"unset",minWidth:"unset",padding:"10px 14px"}}>
          <div className="rpt-kpi-label">Projects Analyzed</div>
          <div className="rpt-kpi-val" style={{fontSize:16}}>{data.length}</div>
        </div>
        <div className="rpt-kpi" style={{flex:"unset",minWidth:"unset",padding:"10px 14px"}}>
          <div className="rpt-kpi-label">Total Revenue</div>
          <div className="rpt-kpi-val" style={{fontSize:16,color:"var(--green)"}}>{f$(data.reduce((s,p)=>s+p.revenue,0))}</div>
        </div>
      </div>

      <div className="ai-panel">
        <div className="ai-panel-hd">
          {RIc.ai}
          <div>
            <div style={{fontWeight:700,fontSize:13,color:"var(--t1)"}}>AI Business Intelligence</div>
            <div style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)"}}>Powered by Claude — analyzes your project data</div>
          </div>
        </div>
        <div className="ai-panel-body">
          {/* Quick analysis presets */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:9,color:"var(--t3)",textTransform:"uppercase",letterSpacing:".06em",fontFamily:"var(--mono)",marginBottom:6}}>Quick Analysis</div>
            <div className="ai-prompt-row">
              {AI_PROMPTS.map(p => (
                <button key={p.key} className={`ai-prompt-chip${activePrompt===p.key?" active":""}`} onClick={()=>runAnalysis(p.key)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom question */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:9,color:"var(--t3)",textTransform:"uppercase",letterSpacing:".06em",fontFamily:"var(--mono)",marginBottom:6}}>Ask a Custom Question</div>
            <div style={{display:"flex",gap:8}}>
              <input className="rpt-inp" value={customQ} onChange={e=>setCustomQ(e.target.value)}
                placeholder="e.g. Which carriers have the highest average job size?"
                style={{flex:1}}
                onKeyDown={e => e.key === "Enter" && customQ.trim() && runAnalysis("custom")}
              />
              <button className="rpt-export-btn" onClick={()=>customQ.trim() && runAnalysis("custom")} style={{padding:"5px 16px"}}>
                {RIc.ai} Analyze
              </button>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="ai-loading">
              <div className="ai-dot"/><div className="ai-dot" style={{animationDelay:".2s"}}/><div className="ai-dot" style={{animationDelay:".4s"}}/>
              Analyzing {data.length} projects...
            </div>
          )}

          {/* Error */}
          {error && <div style={{color:"var(--acc)",fontSize:11,padding:"10px 0"}}>{error}</div>}

          {/* Result */}
          {result && !loading && (
            <div className="ai-result" dangerouslySetInnerHTML={{__html: renderMD(result)}}/>
          )}

          {/* Empty state */}
          {!loading && !result && !error && (
            <div style={{color:"var(--t3)",fontSize:11,padding:"20px 0",textAlign:"center"}}>
              Select a quick analysis above or ask a custom question about your project data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   7. EQUIPMENT REVENUE MISMATCH
   Compares deployed equipment revenue vs IICRC S500-recommended equipment.
   Billing day rule: ≥4 hours on site = 1 billing day.
   E.g. 52 hours = 3 billing days (24+24+4).
═══════════════════════════════════════════════════════════════════════════ */

/* IICRC S500 recommendations (simplified from S500-2021 Chapter 12):
   - Air movers: 1 per 10–16 LF of wall (approx 1 per 50 SF of affected floor)
   - LGR Dehumidifiers: 1 per 1,000–1,200 CF (≈ 1 per ~125 SF at 8ft ceiling)
   - Air scrubbers: 1 per containment zone or per 500 SF of affected area
   These are standard IICRC guidelines; actual needs vary by class/category of loss */
const S500_RULES = {
  fan:      { sfPer: 50,   label: "Air Movers",           note: "1 per 50 SF of affected floor area (IICRC S500 §12.3)" },
  dehu:     { sfPer: 125,  label: "LGR Dehumidifiers",    note: "1 per ~125 SF (1,000 CF at 8ft ceiling) (IICRC S500 §12.4)" },
  "dehu-des":{ sfPer: 200, label: "Desiccant Dehus",      note: "1 per ~200 SF for low-humidity environments (IICRC S500 §12.4)" },
  scrubber: { sfPer: 500,  label: "HEPA Air Scrubbers",   note: "1 per containment zone or per 500 SF (IICRC S500 §12.5)" },
};

/* Convert hours on site to billing days: ≥4 hours of any day = full billing day */
function hoursToBillingDays(hours) {
  if (!hours || hours <= 0) return 0;
  const fullDays = Math.floor(hours / 24);
  const remainderHours = hours % 24;
  return fullDays + (remainderHours >= 4 ? 1 : 0);
}

/* Read DryDox equipment data for a project from localStorage */
function loadDryDoxData(projId) {
  // Equipment stored in DryDox state — check lsProj pattern
  const equipment = lsProjRead(projId, "drydox_equipment") || [];
  const rooms     = lsProjRead(projId, "drydox_rooms") || [];
  const logs      = lsProjRead(projId, "drydox_logs") || [];
  const billingDays = lsProjRead(projId, "drydox_billing_days") || 3;
  const flags     = lsProjRead(projId, "drydox_flags") || [];
  return { equipment, rooms, logs, billingDays, flags };
}

/* Look up a price list item rate */
function getEquipRate(plItemId, priceLists) {
  for (const pl of priceLists) {
    const item = (pl.items || []).find(i => i.id === plItemId);
    if (item) return { rate: item.price || 0, desc: item.desc, unit: item.unit, plName: pl.name };
  }
  return { rate: 0, desc: "", unit: "day", plName: "" };
}

/* Equipment type labels */
const EQUIP_LABELS = {
  fan:"Air Mover", dehu:"LGR Dehumidifier", "dehu-des":"Desiccant Dehu",
  scrubber:"HEPA Air Scrubber", negair:"Negative Air Machine", ozone:"Ozone Generator",
  fogger:"Thermal Fogger", mat:"Drying Mat", injectidry:"InjectiDry System",
  thermal:"Thermal Camera", other:"Other Equipment",
};

function EquipmentMismatchReport({ data, priceLists }) {
  const [expandedProj, setExpandedProj] = useState(null);

  // Build mismatch analysis for each project that has DryDox data
  const analysis = useMemo(() => {
    return data.map(proj => {
      const dd = loadDryDoxData(proj.id);
      if (!dd.equipment.length && !dd.rooms.length) return null;

      const totalSF = dd.rooms.reduce((s, r) => s + ((r.widthFt || 0) * (r.depthFt || 0)), 0);
      const billingDays = dd.billingDays || 3;

      // --- ACTUAL deployed equipment ---
      const deployed = {};
      let actualRevenue = 0;
      const equipDetails = dd.equipment.map(eq => {
        const type = eq.type || "other";
        const dIn  = parseInt(eq.dayIn) || 1;
        const dOut = parseInt(eq.dayOut) || 0;
        const days = dOut > 0 ? Math.max(1, dOut - dIn + 1) : Math.max(1, billingDays - dIn + 1);
        const { rate, desc } = getEquipRate(eq.plItemId, priceLists);
        const total = days * rate;
        actualRevenue += total;

        if (!deployed[type]) deployed[type] = { count: 0, totalDays: 0, revenue: 0 };
        deployed[type].count++;
        deployed[type].totalDays += days;
        deployed[type].revenue += total;

        const room = dd.rooms.find(r => r.id === eq.roomId);
        return { ...eq, type, days, rate, total, desc: desc || EQUIP_LABELS[type] || type, roomLabel: room?.label || "—" };
      });

      // --- S500 RECOMMENDED equipment ---
      let recommendedRevenue = 0;
      const recommendations = {};
      Object.entries(S500_RULES).forEach(([type, rule]) => {
        if (totalSF <= 0) return;
        const recommended = Math.max(1, Math.ceil(totalSF / rule.sfPer));
        const actualCount = deployed[type]?.count || 0;
        // Find the best matching price for this equipment type from available price lists
        let bestRate = 0;
        for (const pl of priceLists) {
          for (const item of (pl.items || [])) {
            const code = (item.code || "").toLowerCase();
            const desc = (item.desc || "").toLowerCase();
            if (
              (type === "fan" && (code.startsWith("am") || desc.includes("air mover"))) ||
              (type === "dehu" && (code.startsWith("dh") || desc.includes("lgr dehumidifier")) && !desc.includes("desiccant")) ||
              (type === "dehu-des" && (code.startsWith("dd") || desc.includes("desiccant"))) ||
              (type === "scrubber" && (code.startsWith("as") || desc.includes("air scrubber")))
            ) {
              if (item.price > bestRate) bestRate = item.price;
            }
          }
        }
        const recRevenue = recommended * billingDays * bestRate;
        recommendedRevenue += recRevenue;
        recommendations[type] = {
          label: rule.label,
          note: rule.note,
          recommended,
          actual: actualCount,
          diff: recommended - actualCount,
          ratePerDay: bestRate,
          recRevenue,
          actualRevenue: deployed[type]?.revenue || 0,
          revenueDiff: recRevenue - (deployed[type]?.revenue || 0),
        };
      });

      // --- FLAGS / mismatch reasons from user comments ---
      const flags = dd.flags || [];

      return {
        proj,
        totalSF,
        billingDays,
        equipDetails,
        deployed,
        recommendations,
        actualRevenue,
        recommendedRevenue,
        revenueDiff: recommendedRevenue - actualRevenue,
        flags,
        hasData: true,
      };
    }).filter(Boolean);
  }, [data, priceLists]);

  // Totals
  const totals = useMemo(() => ({
    projects:       analysis.length,
    actualRevenue:  analysis.reduce((s, a) => s + a.actualRevenue, 0),
    recRevenue:     analysis.reduce((s, a) => s + a.recommendedRevenue, 0),
    diff:           analysis.reduce((s, a) => s + a.revenueDiff, 0),
  }), [analysis]);

  return (
    <div>
      {/* KPIs */}
      <div className="rpt-kpi-row">
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Projects w/ Equipment</div>
          <div className="rpt-kpi-val">{totals.projects}</div>
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Actual Equipment Revenue</div>
          <div className="rpt-kpi-val">{f$(totals.actualRevenue)}</div>
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">S500-Recommended Revenue</div>
          <div className="rpt-kpi-val" style={{color:"var(--blue)"}}>{f$(totals.recRevenue)}</div>
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Revenue Gap</div>
          <div className="rpt-kpi-val" style={{color: totals.diff > 0 ? "var(--acc)" : "var(--green)"}}>
            {totals.diff > 0 ? `−${f$(totals.diff)}` : f$(Math.abs(totals.diff))}
          </div>
          <div className="rpt-kpi-sub">{totals.diff > 0 ? "Under-deployed vs S500" : "At or above S500"}</div>
        </div>
      </div>

      {/* Billing day rule callout */}
      <div className="rpt-card" style={{background:"var(--s1)",borderLeft:"3px solid var(--blue)",padding:"10px 14px",marginBottom:14}}>
        <div style={{fontSize:11,color:"var(--t1)",fontWeight:600,marginBottom:2}}>Billing Day Rule</div>
        <div style={{fontSize:10,color:"var(--t2)"}}>
          Equipment on site for ≥4 hours of any calendar day counts as a full billing day. Example: a fan on site for 52 hours = <strong style={{color:"var(--t1)"}}>3 billing days</strong> (24h + 24h + 4h).
        </div>
      </div>

      {/* S500 reference */}
      <div className="rpt-card" style={{background:"var(--s1)",borderLeft:"3px solid var(--amber)",padding:"10px 14px",marginBottom:14}}>
        <div style={{fontSize:11,color:"var(--t1)",fontWeight:600,marginBottom:4}}>IICRC S500 Equipment Standards</div>
        {Object.values(S500_RULES).map(rule => (
          <div key={rule.label} style={{fontSize:10,color:"var(--t2)",marginBottom:2}}>
            <strong style={{color:"var(--t1)"}}>{rule.label}:</strong> {rule.note}
          </div>
        ))}
      </div>

      {/* Project-by-project mismatch table */}
      <div className="rpt-card">
        <div className="rpt-card-hd">Equipment Revenue Mismatch by Project</div>
        <table className="rpt-tbl">
          <thead>
            <tr>
              <th>Project</th>
              <th>Area (SF)</th>
              <th>Days</th>
              <th>Actual Revenue</th>
              <th>S500 Revenue</th>
              <th>Gap</th>
              <th style={{width:120}}>Gap %</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {analysis.sort((a, b) => b.revenueDiff - a.revenueDiff).map(a => {
              const gapPct = a.recommendedRevenue > 0 ? (a.revenueDiff / a.recommendedRevenue * 100) : 0;
              const expanded = expandedProj === a.proj.id;
              return (
                <>
                  <tr key={a.proj.id} style={{cursor:"pointer"}} onClick={() => setExpandedProj(expanded ? null : a.proj.id)}>
                    <td style={{fontWeight:600}}>{a.proj.name || a.proj.address || a.proj.id}</td>
                    <td className="mono">{a.totalSF.toLocaleString()} SF</td>
                    <td className="mono">{a.billingDays}d</td>
                    <td className="mono">{f$(a.actualRevenue)}</td>
                    <td className="mono" style={{color:"var(--blue)"}}>{f$(a.recommendedRevenue)}</td>
                    <td className="mono" style={{color: a.revenueDiff > 0 ? "var(--acc)" : "var(--green)",fontWeight:700}}>
                      {a.revenueDiff > 0 ? `−${f$(a.revenueDiff)}` : `+${f$(Math.abs(a.revenueDiff))}`}
                    </td>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div className="rpt-bar" style={{flex:1}}>
                          <div className="rpt-bar-fill" style={{
                            width:`${Math.min(100,Math.abs(gapPct))}%`,
                            background: a.revenueDiff > 0 ? "var(--acc)" : "var(--green)"
                          }}/>
                        </div>
                        <span className="mono" style={{fontSize:9,color:"var(--t3)"}}>{Math.abs(gapPct).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{fontSize:10,color:"var(--t3)"}}>{expanded ? "▲" : "▼"}</td>
                  </tr>

                  {/* Expanded detail */}
                  {expanded && (
                    <tr key={`${a.proj.id}-detail`}>
                      <td colSpan={8} style={{padding:0,background:"var(--s1)"}}>
                        <div style={{padding:"12px 16px"}}>

                          {/* Equipment type comparison grid */}
                          <div style={{fontWeight:700,fontSize:11,color:"var(--t1)",marginBottom:8}}>S500 Recommendation vs Deployed</div>
                          <table className="rpt-tbl" style={{marginBottom:12}}>
                            <thead>
                              <tr>
                                <th>Equipment Type</th>
                                <th>S500 Rec.</th>
                                <th>Deployed</th>
                                <th>Difference</th>
                                <th>Rate/Day</th>
                                <th>Rec. Revenue</th>
                                <th>Actual Revenue</th>
                                <th>Revenue Gap</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(a.recommendations).map(([type, rec]) => (
                                <tr key={type}>
                                  <td style={{fontWeight:600}}>{rec.label}</td>
                                  <td className="mono" style={{color:"var(--blue)"}}>{rec.recommended}</td>
                                  <td className="mono">{rec.actual}</td>
                                  <td className="mono" style={{
                                    color: rec.diff > 0 ? "var(--acc)" : rec.diff < 0 ? "var(--green)" : "var(--t2)",
                                    fontWeight:700
                                  }}>
                                    {rec.diff > 0 ? `−${rec.diff} short` : rec.diff < 0 ? `+${Math.abs(rec.diff)} extra` : "Match"}
                                  </td>
                                  <td className="mono">{f$(rec.ratePerDay)}</td>
                                  <td className="mono" style={{color:"var(--blue)"}}>{f$(rec.recRevenue)}</td>
                                  <td className="mono">{f$(rec.actualRevenue)}</td>
                                  <td className="mono" style={{color: rec.revenueDiff > 0 ? "var(--acc)" : "var(--green)",fontWeight:600}}>
                                    {rec.revenueDiff > 0 ? `−${f$(rec.revenueDiff)}` : `+${f$(Math.abs(rec.revenueDiff))}`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* Deployed equipment detail */}
                          {a.equipDetails.length > 0 && (
                            <>
                              <div style={{fontWeight:700,fontSize:11,color:"var(--t1)",marginBottom:6}}>Deployed Equipment Detail</div>
                              <table className="rpt-tbl" style={{marginBottom:12}}>
                                <thead>
                                  <tr><th>Equipment</th><th>Room</th><th>Day In</th><th>Day Out</th><th>Billing Days</th><th>Rate/Day</th><th>Revenue</th></tr>
                                </thead>
                                <tbody>
                                  {a.equipDetails.map(eq => (
                                    <tr key={eq.id}>
                                      <td>{eq.brand || eq.desc} <span style={{fontSize:9,color:"var(--t3)"}}>({EQUIP_LABELS[eq.type] || eq.type})</span></td>
                                      <td>{eq.roomLabel}</td>
                                      <td className="mono">Day {eq.dayIn}</td>
                                      <td className="mono">{parseInt(eq.dayOut) ? `Day ${eq.dayOut}` : "Active"}</td>
                                      <td className="mono">{eq.days}d</td>
                                      <td className="mono">{f$(eq.rate)}</td>
                                      <td className="mono" style={{fontWeight:600}}>{f$(eq.total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </>
                          )}

                          {/* Mismatch flags / user comments */}
                          {a.flags.length > 0 && (
                            <>
                              <div style={{fontWeight:700,fontSize:11,color:"var(--t1)",marginBottom:6}}>Mismatch Reasons (Technician Notes)</div>
                              {a.flags.map((flag, i) => (
                                <div key={i} style={{background:"var(--s2)",border:"1px solid var(--br)",borderLeft:`3px solid ${flag.severity === "high" ? "var(--acc)" : flag.severity === "medium" ? "var(--amber)" : "var(--blue)"}`,borderRadius:6,padding:"8px 12px",marginBottom:6}}>
                                  <div style={{fontSize:10,fontWeight:600,color:"var(--t1)"}}>{flag.equipType ? (EQUIP_LABELS[flag.equipType] || flag.equipType) : "General"}</div>
                                  <div style={{fontSize:10,color:"var(--t2)",marginTop:2}}>{flag.comment || flag.reason || "No reason provided"}</div>
                                  {flag.author && <div style={{fontSize:9,color:"var(--t3)",marginTop:3}}>— {flag.author}{flag.date ? ` · ${flag.date}` : ""}</div>}
                                </div>
                              ))}
                            </>
                          )}

                          {/* No flags — show generic note */}
                          {a.flags.length === 0 && a.revenueDiff > 0 && (
                            <div style={{background:"var(--s2)",border:"1px solid var(--br)",borderLeft:"3px solid var(--amber)",borderRadius:6,padding:"8px 12px",fontSize:10,color:"var(--t2)"}}>
                              No mismatch notes recorded. Technicians can flag reasons for under-deployment in the DryDox equipment tab (e.g., "homeowner refused equipment in bedroom", "limited access", "insurance scope limitation").
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {analysis.length === 0 && (
              <tr><td colSpan={8} style={{textAlign:"center",color:"var(--t3)",padding:30}}>
                No projects with DryDox equipment data found. Deploy equipment in the DryDox tab on any project to see mismatch analysis.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary by equipment type across all projects */}
      {analysis.length > 0 && (
        <div className="rpt-card">
          <div className="rpt-card-hd">Company-Wide Equipment Gap Summary</div>
          <table className="rpt-tbl">
            <thead>
              <tr><th>Equipment Type</th><th>Total Rec.</th><th>Total Deployed</th><th>Gap (Units)</th><th>Total Rec. Revenue</th><th>Total Actual Revenue</th><th>Revenue Gap</th></tr>
            </thead>
            <tbody>
              {Object.entries(S500_RULES).map(([type, rule]) => {
                const totalRec    = analysis.reduce((s, a) => s + (a.recommendations[type]?.recommended || 0), 0);
                const totalActual = analysis.reduce((s, a) => s + (a.recommendations[type]?.actual || 0), 0);
                const totalRecRev = analysis.reduce((s, a) => s + (a.recommendations[type]?.recRevenue || 0), 0);
                const totalActRev = analysis.reduce((s, a) => s + (a.recommendations[type]?.actualRevenue || 0), 0);
                const diff = totalRec - totalActual;
                const revDiff = totalRecRev - totalActRev;
                return (
                  <tr key={type}>
                    <td style={{fontWeight:600}}>{rule.label}</td>
                    <td className="mono" style={{color:"var(--blue)"}}>{totalRec}</td>
                    <td className="mono">{totalActual}</td>
                    <td className="mono" style={{color: diff > 0 ? "var(--acc)" : "var(--green)",fontWeight:700}}>
                      {diff > 0 ? `−${diff}` : diff < 0 ? `+${Math.abs(diff)}` : "—"}
                    </td>
                    <td className="mono" style={{color:"var(--blue)"}}>{f$(totalRecRev)}</td>
                    <td className="mono">{f$(totalActRev)}</td>
                    <td className="mono" style={{color: revDiff > 0 ? "var(--acc)" : "var(--green)",fontWeight:700}}>
                      {revDiff > 0 ? `−${f$(revDiff)}` : `+${f$(Math.abs(revDiff))}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   8. REPUTATION MANAGEMENT
   Shows review requests, ratings, and which projects lack reviews.
═══════════════════════════════════════════════════════════════════════════ */
function ReputationReport({ data, reviewRequests=[], offices=[] }) {
  const [fOffice, setFOffice]   = useState("All");
  const [fStatus, setFStatus]   = useState("All");
  const [fPeriod, setFPeriod]   = useState("all_time");
  const [expanded, setExpanded] = useState(null);

  // Filter review requests
  const filtered = useMemo(() => {
    let list = [...reviewRequests];
    if (fOffice !== "All") list = list.filter(r => r.officeId === fOffice);
    if (fStatus !== "All") list = list.filter(r => r.status === fStatus);
    if (fPeriod !== "all_time") {
      const range = getDateRange(fPeriod);
      if (range) {
        const from = new Date(range.from).getTime();
        const to   = new Date(range.to).getTime() + 86400000;
        list = list.filter(r => {
          const ts = r.createdAt?.toDate ? r.createdAt.toDate().getTime()
                   : r.createdAt?.seconds ? r.createdAt.seconds * 1000
                   : 0;
          return ts >= from && ts < to;
        });
      }
    }
    return list;
  }, [reviewRequests, fOffice, fStatus, fPeriod]);

  // KPIs
  const totalSent       = filtered.length;
  const totalReceived   = filtered.filter(r => r.status === "review_received").length;
  const totalNoResponse = filtered.filter(r => r.status === "sent").length;
  const totalFailed     = filtered.filter(r => r.status === "failed").length;
  const responseRate    = totalSent > 0 ? ((totalReceived / totalSent) * 100).toFixed(1) : "0.0";

  // Ratings breakdown
  const withRating = filtered.filter(r => r.reviewRating != null);
  const avgRating  = withRating.length > 0
    ? (withRating.reduce((s, r) => s + (r.reviewRating || 0), 0) / withRating.length).toFixed(1)
    : "—";
  const ratingDist = [5,4,3,2,1].map(n => ({
    stars: n,
    count: withRating.filter(r => Math.round(r.reviewRating) === n).length,
  }));
  const maxRatingCount = Math.max(1, ...ratingDist.map(r => r.count));

  // Projects with no review requests
  const projectsWithRequests = new Set(reviewRequests.map(r => r.projectId).filter(Boolean));
  const completedStatuses = ["completed","closed"];
  const projectsNoRequest = data.filter(p =>
    completedStatuses.includes(p.status) && !projectsWithRequests.has(p.id)
  );

  // Projects with request sent but no review received
  const sentButNoReview = [...new Map(
    filtered.filter(r => r.status === "sent")
      .map(r => [r.projectId, r])
  ).values()];

  // Office breakdown
  const officeStats = useMemo(() => {
    const map = {};
    for (const o of offices) {
      map[o.id] = { name: o.name, color: o.color || "#22d3ee", sent: 0, received: 0, totalRating: 0, ratingCount: 0, hasUrl: !!o.googleBusinessUrl };
    }
    for (const r of reviewRequests) {
      if (r.officeId && map[r.officeId]) {
        map[r.officeId].sent++;
        if (r.status === "review_received") {
          map[r.officeId].received++;
          if (r.reviewRating != null) {
            map[r.officeId].totalRating += r.reviewRating;
            map[r.officeId].ratingCount++;
          }
        }
      }
    }
    return Object.entries(map).map(([id, v]) => ({
      id, ...v,
      avgRating: v.ratingCount > 0 ? (v.totalRating / v.ratingCount).toFixed(1) : "—",
      responseRate: v.sent > 0 ? ((v.received / v.sent) * 100).toFixed(0) : "0",
    }));
  }, [offices, reviewRequests]);

  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return d.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  };

  const starDisplay = (rating) => {
    if (rating == null) return "—";
    const full  = Math.floor(rating);
    const stars = "★".repeat(full) + "☆".repeat(5 - full);
    return <span style={{color:"#f59e0b",letterSpacing:1}}>{stars} <span style={{color:"var(--t2)",fontFamily:"var(--mono)",fontSize:10}}>{Number(rating).toFixed(1)}</span></span>;
  };

  return (
    <div>
      {/* Filters */}
      <div className="rpt-filter-row">
        <label>{RIc.filter} Filters</label>
        <select className="rpt-sel" value={fOffice} onChange={e=>setFOffice(e.target.value)}>
          <option value="All">All Offices</option>
          {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select className="rpt-sel" value={fStatus} onChange={e=>setFStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="sent">Sent — Awaiting Review</option>
          <option value="review_received">Review Received</option>
          <option value="failed">Failed to Send</option>
        </select>
        <select className="rpt-sel" value={fPeriod} onChange={e=>setFPeriod(e.target.value)}>
          <option value="all_time">All Time</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_quarter">This Quarter</option>
          <option value="this_year">This Year</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="rpt-kpi-row">
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Requests Sent</div>
          <div className="rpt-kpi-val">{totalSent}</div>
          {totalFailed > 0 && <div className="rpt-kpi-sub" style={{color:"var(--acc)"}}>{totalFailed} failed</div>}
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Reviews Received</div>
          <div className="rpt-kpi-val" style={{color:"var(--green)"}}>{totalReceived}</div>
          <div className="rpt-kpi-sub">{responseRate}% response rate</div>
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Awaiting Response</div>
          <div className="rpt-kpi-val" style={{color:"var(--amber)"}}>{totalNoResponse}</div>
        </div>
        <div className="rpt-kpi">
          <div className="rpt-kpi-label">Avg Rating</div>
          <div className="rpt-kpi-val" style={{color:"#f59e0b"}}>{avgRating === "—" ? "—" : `${avgRating} ★`}</div>
          <div className="rpt-kpi-sub">{withRating.length} rated</div>
        </div>
      </div>

      {/* Rating Distribution */}
      {withRating.length > 0 && (
        <div className="rpt-card">
          <div className="rpt-card-hd">Rating Distribution</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {ratingDist.map(r => (
              <div key={r.stars} style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:11,fontWeight:600,color:"#f59e0b",width:44,textAlign:"right"}}>
                  {r.stars} ★
                </span>
                <div className="rpt-bar" style={{flex:1}}>
                  <div className="rpt-bar-fill" style={{
                    width: `${(r.count / maxRatingCount) * 100}%`,
                    background: r.stars >= 4 ? "var(--green)" : r.stars === 3 ? "var(--amber)" : "var(--acc)",
                  }}/>
                </div>
                <span style={{fontSize:10,fontFamily:"var(--mono)",color:"var(--t2)",width:30}}>{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Office Breakdown */}
      {offices.length > 0 && (
        <div className="rpt-card">
          <div className="rpt-card-hd">Performance by Office</div>
          <table className="rpt-tbl">
            <thead>
              <tr>
                <th>Office</th>
                <th>Review Link</th>
                <th>Sent</th>
                <th>Received</th>
                <th>Response Rate</th>
                <th>Avg Rating</th>
              </tr>
            </thead>
            <tbody>
              {officeStats.map(o => (
                <tr key={o.id}>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:o.color,flexShrink:0}}/>
                      <span style={{fontWeight:600}}>{o.name}</span>
                    </div>
                  </td>
                  <td>
                    {o.hasUrl
                      ? <span style={{color:"#4285f4",fontSize:10,fontWeight:600}}>★ Configured</span>
                      : <span style={{color:"var(--t3)",fontSize:10}}>Not set</span>}
                  </td>
                  <td className="mono">{o.sent}</td>
                  <td className="mono" style={{color:o.received>0?"var(--green)":"var(--t3)"}}>{o.received}</td>
                  <td className="mono">{o.responseRate}%</td>
                  <td>{o.avgRating === "—" ? <span style={{color:"var(--t3)"}}>—</span> : starDisplay(parseFloat(o.avgRating))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Request Log */}
      <div className="rpt-card">
        <div className="rpt-card-hd">
          Review Request Log
          <span style={{fontSize:10,color:"var(--t3)",fontWeight:400}}>{filtered.length} requests</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{textAlign:"center",padding:"30px 0",color:"var(--t3)"}}>
            <div style={{fontSize:13,fontWeight:600,color:"var(--t2)",marginBottom:6}}>No review requests yet</div>
            <div style={{fontSize:11}}>Send your first review request from any project using the ★ Review button.</div>
          </div>
        ) : (
          <table className="rpt-tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Project</th>
                <th>Client</th>
                <th>Office</th>
                <th>Sent By</th>
                <th>Status</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <>
                  <tr key={r.id || i} style={{cursor:"pointer"}} onClick={()=>setExpanded(expanded===i?null:i)}>
                    <td className="mono" style={{fontSize:10}}>{formatDate(r.createdAt)}</td>
                    <td style={{fontWeight:600,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.projectName || "—"}</td>
                    <td>{r.clientName || r.clientPhone || "—"}</td>
                    <td>
                      {r.officeName
                        ? <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,
                            background:"rgba(34,211,238,.08)",border:"1px solid rgba(34,211,238,.18)",color:"var(--teal)"}}>{r.officeName}</span>
                        : <span style={{color:"var(--t3)"}}>—</span>}
                    </td>
                    <td style={{fontSize:10,color:"var(--t2)"}}>{r.sentByName || "—"}</td>
                    <td>
                      {r.status === "review_received" ? (
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:"rgba(26,217,138,.1)",border:"1px solid rgba(26,217,138,.25)",color:"var(--green)",fontWeight:600}}>Received</span>
                      ) : r.status === "sent" ? (
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:"rgba(232,156,24,.1)",border:"1px solid rgba(232,156,24,.25)",color:"var(--amber)",fontWeight:600}}>Awaiting</span>
                      ) : (
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:"rgba(228,53,49,.08)",border:"1px solid rgba(228,53,49,.2)",color:"var(--acc)",fontWeight:600}}>Failed</span>
                      )}
                    </td>
                    <td>{starDisplay(r.reviewRating)}</td>
                  </tr>
                  {expanded === i && (
                    <tr key={`${r.id || i}-exp`}>
                      <td colSpan={7} style={{background:"var(--s1)",padding:"12px 16px"}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,fontSize:11}}>
                          <div>
                            <div style={{fontWeight:700,color:"var(--t1)",marginBottom:4}}>Review Details</div>
                            <div style={{color:"var(--t2)",lineHeight:1.8}}>
                              <div><strong>Phone:</strong> {r.clientPhone || "—"}</div>
                              <div><strong>Google URL:</strong> <span style={{wordBreak:"break-all",fontSize:10,fontFamily:"var(--mono)"}}>{r.googleBusinessUrl || "—"}</span></div>
                              {r.reviewDetectedAt && <div><strong>Review Date:</strong> {formatDate(r.reviewDetectedAt)}</div>}
                            </div>
                          </div>
                          <div>
                            {r.reviewText && (
                              <>
                                <div style={{fontWeight:700,color:"var(--t1)",marginBottom:4}}>Review Feedback</div>
                                <div style={{color:"var(--t2)",lineHeight:1.7,fontStyle:"italic"}}>"{r.reviewText}"</div>
                              </>
                            )}
                            {r.messageBody && (
                              <>
                                <div style={{fontWeight:700,color:"var(--t1)",marginBottom:4,marginTop:r.reviewText?10:0}}>Message Sent</div>
                                <div style={{color:"var(--t3)",lineHeight:1.5,fontSize:10,whiteSpace:"pre-wrap",maxHeight:100,overflow:"auto"}}>{r.messageBody}</div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Projects Missing Review Requests */}
      {projectsNoRequest.length > 0 && (
        <div className="rpt-card">
          <div className="rpt-card-hd" style={{color:"var(--amber)"}}>
            Completed Projects Without Review Requests
            <span style={{fontSize:10,color:"var(--t3)",fontWeight:400}}>{projectsNoRequest.length} projects</span>
          </div>
          <table className="rpt-tbl">
            <thead>
              <tr><th>Project</th><th>Client</th><th>Type</th><th>Completed</th><th>Office</th></tr>
            </thead>
            <tbody>
              {projectsNoRequest.slice(0, 25).map(p => {
                const off = offices.find(o => o.id === p.officeId);
                return (
                  <tr key={p.id}>
                    <td style={{fontWeight:600}}>{p.name || p.address || p.id}</td>
                    <td>{p.client || "—"}</td>
                    <td style={{fontSize:10}}>{p.type || "—"}</td>
                    <td className="mono" style={{fontSize:10}}>{p.createdDate || "—"}</td>
                    <td>
                      {off
                        ? <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:`${off.color}18`,border:`1px solid ${off.color}35`,color:off.color}}>{off.name}</span>
                        : <span style={{color:"var(--t3)",fontSize:10}}>Unassigned</span>}
                    </td>
                  </tr>
                );
              })}
              {projectsNoRequest.length > 25 && (
                <tr><td colSpan={5} style={{textAlign:"center",color:"var(--t3)",fontSize:10,padding:10}}>
                  + {projectsNoRequest.length - 25} more projects
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Sent But No Review */}
      {sentButNoReview.length > 0 && (
        <div className="rpt-card">
          <div className="rpt-card-hd" style={{color:"var(--acc)"}}>
            Requests Sent — No Review Detected
            <span style={{fontSize:10,color:"var(--t3)",fontWeight:400}}>{sentButNoReview.length} projects</span>
          </div>
          <table className="rpt-tbl">
            <thead>
              <tr><th>Project</th><th>Client</th><th>Sent Date</th><th>Office</th><th>Days Waiting</th></tr>
            </thead>
            <tbody>
              {sentButNoReview.map((r, i) => {
                const sentDate = r.createdAt?.toDate ? r.createdAt.toDate()
                               : r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000)
                               : null;
                const daysWaiting = sentDate ? Math.floor((Date.now() - sentDate.getTime()) / 86400000) : "—";
                return (
                  <tr key={r.id || i}>
                    <td style={{fontWeight:600}}>{r.projectName || "—"}</td>
                    <td>{r.clientName || r.clientPhone || "—"}</td>
                    <td className="mono" style={{fontSize:10}}>{formatDate(r.createdAt)}</td>
                    <td>
                      {r.officeName
                        ? <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:"rgba(34,211,238,.08)",border:"1px solid rgba(34,211,238,.18)",color:"var(--teal)"}}>{r.officeName}</span>
                        : <span style={{color:"var(--t3)"}}>—</span>}
                    </td>
                    <td className="mono" style={{color: daysWaiting > 14 ? "var(--acc)" : daysWaiting > 7 ? "var(--amber)" : "var(--t2)", fontWeight:600}}>
                      {daysWaiting}{typeof daysWaiting === "number" ? "d" : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   MAIN EXPORT — ReportsDashboard
═══════════════════════════════════════════════════════════════════════════ */
export function ReportsDashboard({ projects=[], companyId="", onNavigate, globalStaff=[], customWorkTypes=[], customStatuses=[], customProjectTypes=[], priceLists=[], reviewRequests=[], offices=[] }) {
  const [tab, setTab] = useState("revenue");

  // Inject CSS once
  useEffect(() => {
    if (document.getElementById("rpt-css")) return;
    const style = document.createElement("style");
    style.id = "rpt-css";
    style.textContent = RPT_CSS;
    document.head.appendChild(style);
    return () => { const el = document.getElementById("rpt-css"); if (el) el.remove(); };
  }, []);

  // Enrich projects with financial data
  const data = useMemo(() => enrichProjects(projects), [projects]);
  const statuses = customStatuses.length > 0 ? customStatuses : DEFAULT_STATUSES;

  return (
    <div className="rpt-dash">
      {/* Top bar */}
      <div className="rpt-topbar">
        <div>
          <div className="rpt-topbar-ttl">Reports &amp; Analytics</div>
          <div className="rpt-topbar-sub">{data.length} PROJECTS · {f$(data.reduce((s,p)=>s+p.revenue,0))} TOTAL REVENUE</div>
        </div>
        <div className="rpt-tabs">
          {REPORT_TABS.map(t => (
            <button key={t.key} className={`rpt-tab${tab===t.key?" active":""}`} onClick={()=>setTab(t.key)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="rpt-body">
        {tab === "revenue"  && <RevenueReport data={data} statuses={statuses} customWorkTypes={customWorkTypes} customProjectTypes={customProjectTypes}/>}
        {tab === "wip"      && <WIPReport data={data} statuses={statuses}/>}
        {tab === "referral" && <ReferralReport data={data} statuses={statuses}/>}
        {tab === "pipeline" && <PipelineReport data={data} statuses={statuses} customWorkTypes={customWorkTypes} customProjectTypes={customProjectTypes} globalStaff={globalStaff}/>}
        {tab === "board"    && <WhiteboardReport data={data} statuses={statuses} customWorkTypes={customWorkTypes}/>}
        {tab === "ai"       && <AIAnalytics data={data} companyId={companyId}/>}
        {tab === "equip"    && <EquipmentMismatchReport data={data} priceLists={priceLists}/>}
        {tab === "reputation" && <ReputationReport data={data} reviewRequests={reviewRequests} offices={offices}/>}
      </div>
    </div>
  );
}

export default ReportsDashboard;
