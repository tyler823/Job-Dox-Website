/**
 * JobDoxPayroll.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Payroll & Labor Rate management module for Job-Dox Portal.
 *
 * EXPORTS:
 *   PayrollDashboard  → full page component for the "Payroll" rail button
 *
 * TABS:
 *   1. Payroll Report   — filterable shift report across all projects & staff
 *   2. Rate Settings    — set employee pay rates and job billing rates
 *
 * PERMISSIONS:
 *   - Visible to Director (L9) and Admin (L10) only
 *   - L8 (Sr. Manager) can view report but NOT edit rates
 *
 * PORTAL INTEGRATION:
 *   1. Import { PayrollDashboard } from "./JobDoxPayroll.jsx"
 *   2. Wire Payroll rail button: onClick={()=>navTo("payroll")}
 *   3. Add page==="payroll" route to render <PayrollDashboard>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getApps } from "firebase/app";

const _payrollDb = getApps().length > 0 ? getFirestore(getApps()[0]) : null;
let _payrollCompanyId = null;

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
const f$ = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(n||0);
const f$0 = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n||0);
const today = () => new Date().toISOString().split("T")[0];

function getDateRange(period) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  switch(period) {
    case "this_week": {
      const d = now.getDay();
      const start = new Date(now); start.setDate(now.getDate() - d);
      return { from: start.toISOString().split("T")[0], to: today() };
    }
    case "last_week": {
      const d = now.getDay();
      const end = new Date(now); end.setDate(now.getDate() - d - 1);
      const start = new Date(end); start.setDate(end.getDate() - 6);
      return { from: start.toISOString().split("T")[0], to: end.toISOString().split("T")[0] };
    }
    case "this_month":  return { from: new Date(y,m,1).toISOString().split("T")[0], to: today() };
    case "last_month":  return { from: new Date(y,m-1,1).toISOString().split("T")[0], to: new Date(y,m,0).toISOString().split("T")[0] };
    case "this_quarter":{
      const qm = Math.floor(m/3)*3;
      return { from: new Date(y,qm,1).toISOString().split("T")[0], to: today() };
    }
    case "this_year":   return { from: new Date(y,0,1).toISOString().split("T")[0], to: today() };
    case "custom":      return null;
    default:            return { from: new Date(y,m,1).toISOString().split("T")[0], to: today() };
  }
}

/* Parse a shift's clockIn string into a Date. Handles locale strings like "Mar 10, 03:15 PM" and ISO. */
function parseShiftDate(str) {
  if (!str) return null;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  // Try parsing "Mon DD, HH:MM AM" format with current year
  try {
    const withYear = str.replace(/,/, `, ${new Date().getFullYear()},`);
    const d2 = new Date(withYear);
    if (!isNaN(d2.getTime())) return d2;
  } catch {}
  return null;
}

function shiftDateStr(str) {
  const d = parseShiftDate(str);
  if (!d) return str || "—";
  return d.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}

/* ─────────────────────────────────────────────────────────────────────────────
   LOCALSTORAGE KEYS & HELPERS
───────────────────────────────────────────────────────────────────────────── */
const LS_PAYROLL_RATES = "jd_payroll_rates";

/* Default rate table — mirrors the RATE_TABLE in portal */
const DEFAULT_RATES = [
  { id:"pr1", position:"Lead Technician",  payRate:28, chargeRate:85,  qboPayrollItemRef:null },
  { id:"pr2", position:"Field Technician", payRate:22, chargeRate:65,  qboPayrollItemRef:null },
  { id:"pr3", position:"Project Manager",  payRate:42, chargeRate:95,  qboPayrollItemRef:null },
  { id:"pr4", position:"Estimator",        payRate:35, chargeRate:75,  qboPayrollItemRef:null },
  { id:"pr5", position:"Subcontractor",    payRate:0,  chargeRate:55,  qboPayrollItemRef:null },
  { id:"pr6", position:"Office Admin",     payRate:30, chargeRate:70,  qboPayrollItemRef:null },
  { id:"pr7", position:"Sales",            payRate:25, chargeRate:60,  qboPayrollItemRef:null },
];

/* ── Per-employee rate overrides (optional — falls back to position rate) ── */
const LS_EMPLOYEE_RATES = "jd_employee_rate_overrides";
function loadEmployeeRates() {
  try { return JSON.parse(localStorage.getItem(LS_EMPLOYEE_RATES)) || {}; } catch { return {}; }
}
function saveEmployeeRates(map) {
  try { localStorage.setItem(LS_EMPLOYEE_RATES, JSON.stringify(map)); } catch {}
  if (_payrollDb && _payrollCompanyId) {
    setDoc(doc(_payrollDb, "companies", _payrollCompanyId, "settings", "employeeRates"), { data: map, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
  }
}

/* ── QBO Integration Settings ── */
const LS_QBO_SETTINGS = "jd_qbo_settings";
function loadQboSettings() {
  try {
    return JSON.parse(localStorage.getItem(LS_QBO_SETTINGS)) || {
      connected: false,
      realmId: "",
      companyName: "",
      lastSyncAt: null,
      autoSyncEnabled: false,
      defaultBillableStatus: "Billable",        // Billable | NotBillable
      defaultPayType: "Regular",                 // Regular | Overtime | Holiday | PTO
      employeeIdMap: {},                         // { staffMemberId: qboEmployeeRefValue }
      customerIdMap: {},                         // { projectId: qboCustomerRefValue }
    };
  } catch { return { connected: false, realmId: "", companyName: "", lastSyncAt: null, autoSyncEnabled: false, defaultBillableStatus: "Billable", defaultPayType: "Regular", employeeIdMap: {}, customerIdMap: {} }; }
}
function saveQboSettings(settings) {
  try { localStorage.setItem(LS_QBO_SETTINGS, JSON.stringify(settings)); } catch {}
  if (_payrollDb && _payrollCompanyId) {
    setDoc(doc(_payrollDb, "companies", _payrollCompanyId, "settings", "qboSettings"), { data: settings, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
  }
}

function loadRates() {
  try { return JSON.parse(localStorage.getItem(LS_PAYROLL_RATES)) || DEFAULT_RATES; } catch { return DEFAULT_RATES; }
}
function saveRates(rates) {
  try { localStorage.setItem(LS_PAYROLL_RATES, JSON.stringify(rates)); } catch {}
  if (_payrollDb && _payrollCompanyId) {
    setDoc(doc(_payrollDb, "companies", _payrollCompanyId, "settings", "payrollRates"), { data: rates, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
  }
}

/* Build a lookup: position → { payRate, chargeRate } */
function ratesLookup(rates) {
  const map = {};
  rates.forEach(r => { map[r.position] = { payRate: r.payRate, chargeRate: r.chargeRate }; });
  return map;
}

/* ─────────────────────────────────────────────────────────────────────────────
   CSV EXPORT
───────────────────────────────────────────────────────────────────────────── */
function exportPayrollCSV(rows, filename) {
  const headers = ["Employee","Position","Project","Task","Date (YYYY-MM-DD)","Clock In","Clock Out","Clock In (ISO)","Clock Out (ISO)","Hours","Hours (Int)","Minutes","Pay Type","Billable","Pay Rate","Pay Cost","Billing Rate","Billing Cost","QBO Sync Status"];
  const csvRows = rows.map(r => [
    r.tech, r.position||"", r.projName||"", r.task||"",
    r.txnDate||"", r.clockIn||"", r.clockOut||"",
    r.clockInIso||"", r.clockOutIso||"",
    (r.hours||0).toFixed(2), r.hoursInt??Math.floor(r.hours||0), r.minutes??Math.round(((r.hours||0)-Math.floor(r.hours||0))*60),
    r.payType||"Regular", r.billableStatus||"Billable",
    (r.payRate||0).toFixed(2), (r.payCost||0).toFixed(2),
    (r.rate||0).toFixed(2), (r.laborCost||0).toFixed(2),
    r.qboSyncStatus||"not synced",
  ]);
  const csv = [headers, ...csvRows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type:"text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}_${today()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────────────────────────────────────────
   ICONS (inline SVGs matching portal style)
───────────────────────────────────────────────────────────────────────────── */
const Ic = {
  download: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>,
  plus:     <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  trash:    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>,
  edit:     <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>,
  filter:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>,
  people:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
  clock:    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z"/></svg>,
  dollar:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>,
  link:     <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>,
};

/* ─────────────────────────────────────────────────────────────────────────────
   AVATAR (same pattern as portal Av component)
───────────────────────────────────────────────────────────────────────────── */
function Av({ name="", size=28, color }) {
  const initials = name.split(" ").map(w=>w[0]||"").join("").slice(0,2).toUpperCase();
  const bg = color || `hsl(${[...name].reduce((h,c)=>h+c.charCodeAt(0),0)%360},55%,45%)`;
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:size*0.38,fontWeight:700,color:"#fff",flexShrink:0,fontFamily:"var(--ui)"}}>{initials}</div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   PAYROLL REPORT TAB
═════════════════════════════════════════════════════════════════════════════ */
function PayrollReportTab({ projects, globalStaff, projectShifts }) {
  const [period, setPeriod]       = useState("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]   = useState("");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [sortCol, setSortCol]     = useState("clockIn");
  const [sortDir, setSortDir]     = useState("desc");

  const rates = useMemo(() => loadRates(), []);
  const lookup = useMemo(() => ratesLookup(rates), [rates]);

  /* Build flat shift list across ALL projects */
  const allShifts = useMemo(() => {
    const rows = [];
    const projMap = {};
    projects.forEach(p => { projMap[p.id] = p.name || p.address || p.id; });

    Object.entries(projectShifts).forEach(([projId, shifts]) => {
      (shifts || []).forEach(sh => {
        const posRates = lookup[sh.position] || {};
        const payRate  = sh.payRate ?? posRates.payRate ?? 0;
        const rate     = sh.rate ?? posRates.chargeRate ?? 0;
        const hours    = sh.hours || 0;
        rows.push({
          ...sh,
          projId,
          projName:       projMap[projId] || projId,
          payRate,
          rate,
          payCost:        Math.round(hours * payRate * 100) / 100,
          laborCost:      sh.laborCost ?? Math.round(hours * rate * 100) / 100,
          // QBO-ready fields (preserve from shift or derive)
          clockInIso:     sh.clockInIso || null,
          clockOutIso:    sh.clockOutIso || null,
          txnDate:        sh.txnDate || (sh.clockInIso ? sh.clockInIso.split("T")[0] : null),
          hoursInt:       sh.hoursInt ?? Math.floor(hours),
          minutes:        sh.minutes ?? Math.round((hours - Math.floor(hours)) * 60),
          payType:        sh.payType || "Regular",
          billableStatus: sh.billableStatus || "Billable",
          qboSyncStatus:  sh.qboSyncStatus || null,
          qboTimeActivityId: sh.qboTimeActivityId || null,
          _date:          sh.clockInIso ? new Date(sh.clockInIso) : parseShiftDate(sh.clockIn),
        });
      });
    });
    return rows;
  }, [projects, projectShifts, lookup]);

  /* Date filter */
  const dateRange = useMemo(() => {
    if (period === "custom") return customFrom && customTo ? { from: customFrom, to: customTo } : null;
    return getDateRange(period);
  }, [period, customFrom, customTo]);

  const filtered = useMemo(() => {
    let rows = allShifts;
    // Date filter
    if (dateRange) {
      const from = new Date(dateRange.from + "T00:00:00");
      const to   = new Date(dateRange.to   + "T23:59:59");
      rows = rows.filter(r => {
        if (!r._date) return true; // keep shifts we can't parse — better visible than hidden
        return r._date >= from && r._date <= to;
      });
    }
    // Employee filter
    if (filterEmployee !== "all") {
      rows = rows.filter(r => r.tech === filterEmployee);
    }
    // Sort
    rows = [...rows].sort((a,b) => {
      let va, vb;
      switch(sortCol) {
        case "tech":     va = a.tech||""; vb = b.tech||""; break;
        case "project":  va = a.projName||""; vb = b.projName||""; break;
        case "hours":    va = a.hours||0; vb = b.hours||0; break;
        case "payCost":  va = a.payCost||0; vb = b.payCost||0; break;
        case "laborCost":va = a.laborCost||0; vb = b.laborCost||0; break;
        default:         va = a._date||new Date(0); vb = b._date||new Date(0); break;
      }
      if (typeof va === "string") return sortDir==="asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir==="asc" ? va-vb : vb-va;
    });
    return rows;
  }, [allShifts, dateRange, filterEmployee, sortCol, sortDir]);

  /* Unique employees for filter dropdown */
  const employees = useMemo(() => {
    const set = new Set(allShifts.map(s => s.tech).filter(Boolean));
    return [...set].sort();
  }, [allShifts]);

  /* KPI totals */
  const totals = useMemo(() => {
    const totalHours    = filtered.reduce((s,r) => s + (r.hours||0), 0);
    const totalPayCost  = filtered.reduce((s,r) => s + (r.payCost||0), 0);
    const totalBilling  = filtered.reduce((s,r) => s + (r.laborCost||0), 0);
    const margin        = totalBilling - totalPayCost;
    return { shifts: filtered.length, totalHours, totalPayCost, totalBilling, margin };
  }, [filtered]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d==="asc"?"desc":"asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const SortArrow = ({ col }) => sortCol===col ? <span style={{marginLeft:3,fontSize:9}}>{sortDir==="asc"?"▲":"▼"}</span> : null;

  /* ── Employee summary sub-table ── */
  const employeeSummary = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      if (!map[r.tech]) map[r.tech] = { tech: r.tech, position: r.position||"", hours:0, payCost:0, laborCost:0, shifts:0 };
      map[r.tech].hours     += r.hours||0;
      map[r.tech].payCost   += r.payCost||0;
      map[r.tech].laborCost += r.laborCost||0;
      map[r.tech].shifts    += 1;
    });
    return Object.values(map).sort((a,b) => b.hours - a.hours);
  }, [filtered]);

  return (
    <div style={{padding:20,overflow:"auto",flex:1}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>

        {/* ── KPI Bar ── */}
        <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
          {[
            ["Total Shifts", totals.shifts,                          "var(--t1)"],
            ["Total Hours",  totals.totalHours.toFixed(1)+"h",      "var(--blue)"],
            ["Pay Cost",     f$0(totals.totalPayCost),              "var(--amber)"],
            ["Billing Revenue", f$0(totals.totalBilling),           "var(--green)"],
            ["Labor Margin", f$0(totals.margin),                    totals.margin>=0?"var(--green)":"var(--acc)"],
          ].map(([l,v,c]) => (
            <div key={l} style={{flex:"1 1 150px",background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9,padding:"10px 14px"}}>
              <div style={{fontFamily:"var(--mono)",fontSize:18,fontWeight:700,color:c}}>{v}</div>
              <div style={{fontSize:9,color:"var(--t2)",textTransform:"uppercase",letterSpacing:".07em"}}>{l}</div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div style={{display:"flex",gap:10,alignItems:"flex-end",marginBottom:16,flexWrap:"wrap"}}>
          <div>
            <label style={{fontSize:10,color:"var(--t3)",display:"block",marginBottom:3,fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:".07em"}}>Period</label>
            <select value={period} onChange={e=>setPeriod(e.target.value)} style={selectStyle}>
              <option value="this_week">This Week</option>
              <option value="last_week">Last Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          {period === "custom" && (
            <>
              <div>
                <label style={{fontSize:10,color:"var(--t3)",display:"block",marginBottom:3,fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:".07em"}}>From</label>
                <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} style={inputStyle}/>
              </div>
              <div>
                <label style={{fontSize:10,color:"var(--t3)",display:"block",marginBottom:3,fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:".07em"}}>To</label>
                <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} style={inputStyle}/>
              </div>
            </>
          )}
          <div>
            <label style={{fontSize:10,color:"var(--t3)",display:"block",marginBottom:3,fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:".07em"}}>Employee</label>
            <select value={filterEmployee} onChange={e=>setFilterEmployee(e.target.value)} style={selectStyle}>
              <option value="all">All Employees</option>
              {employees.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <button
            onClick={() => exportPayrollCSV(filtered, "payroll_report")}
            style={{...btnStyle, background:"rgba(91,163,245,.1)", border:"1px solid rgba(91,163,245,.25)", color:"var(--blue)"}}
          >
            {Ic.download} Export CSV
          </button>
        </div>

        {/* ── Employee Summary ── */}
        {employeeSummary.length > 0 && (
          <div style={{marginBottom:18}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--t1)",marginBottom:8}}>Employee Summary</div>
            <div style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9,overflow:"hidden"}}>
              <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              <table style={{...tableStyle,minWidth:700,width:"100%"}}>
                <thead>
                  <tr>
                    <th style={thStyle}>Employee</th>
                    <th style={thStyle}>Position</th>
                    <th style={{...thStyle,textAlign:"right"}}>Shifts</th>
                    <th style={{...thStyle,textAlign:"right"}}>Hours</th>
                    <th style={{...thStyle,textAlign:"right"}}>Pay Cost</th>
                    <th style={{...thStyle,textAlign:"right"}}>Billing Revenue</th>
                    <th style={{...thStyle,textAlign:"right"}}>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeSummary.map(r => {
                    const margin = r.laborCost - r.payCost;
                    return (
                      <tr key={r.tech} style={{...trStyle,minHeight:44}}>
                        <td style={tdStyle}>
                          <div style={{display:"flex",alignItems:"center",gap:7}}>
                            <Av name={r.tech} size={24}/>
                            <span style={{fontWeight:600,fontSize:12,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:140}}>{r.tech}</span>
                          </div>
                        </td>
                        <td style={{...tdStyle,color:"var(--t2)",fontSize:11}}>{r.position}</td>
                        <td style={{...tdStyle,textAlign:"right",fontFamily:"var(--mono)",fontSize:12}}>{r.shifts}</td>
                        <td style={{...tdStyle,textAlign:"right",fontFamily:"var(--mono)",fontSize:12}}>{r.hours.toFixed(1)}h</td>
                        <td style={{...tdStyle,textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"var(--amber)"}}>{f$(r.payCost)}</td>
                        <td style={{...tdStyle,textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"var(--green)"}}>{f$(r.laborCost)}</td>
                        <td style={{...tdStyle,textAlign:"right",fontFamily:"var(--mono)",fontSize:12,fontWeight:700,color:margin>=0?"var(--green)":"var(--acc)"}}>{f$(margin)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:"var(--s3)"}}>
                    <td colSpan={2} style={{...tdStyle,fontWeight:700,fontSize:11}}>TOTALS</td>
                    <td style={{...tdStyle,textAlign:"right",fontFamily:"var(--mono)",fontSize:12,fontWeight:700}}>{totals.shifts}</td>
                    <td style={{...tdStyle,textAlign:"right",fontFamily:"var(--mono)",fontSize:12,fontWeight:700}}>{totals.totalHours.toFixed(1)}h</td>
                    <td style={{...tdStyle,textAlign:"right",fontFamily:"var(--mono)",fontSize:12,fontWeight:700,color:"var(--amber)"}}>{f$(totals.totalPayCost)}</td>
                    <td style={{...tdStyle,textAlign:"right",fontFamily:"var(--mono)",fontSize:12,fontWeight:700,color:"var(--green)"}}>{f$(totals.totalBilling)}</td>
                    <td style={{...tdStyle,textAlign:"right",fontFamily:"var(--mono)",fontSize:12,fontWeight:700,color:totals.margin>=0?"var(--green)":"var(--acc)"}}>{f$(totals.margin)}</td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Detailed Shift Table ── */}
        <div style={{fontSize:12,fontWeight:700,color:"var(--t1)",marginBottom:8}}>Shift Details</div>
        <div style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9,overflow:"hidden"}}>
          <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            <table style={{...tableStyle,minWidth:900,width:"100%"}}>
              <thead>
                <tr>
                  <th style={{...thStyle,cursor:"pointer"}} onClick={()=>toggleSort("tech")}>Employee<SortArrow col="tech"/></th>
                  <th style={thStyle}>Position</th>
                  <th style={{...thStyle,cursor:"pointer"}} onClick={()=>toggleSort("project")}>Project<SortArrow col="project"/></th>
                  <th style={thStyle}>Task</th>
                  <th style={{...thStyle,cursor:"pointer"}} onClick={()=>toggleSort("clockIn")}>Clock In<SortArrow col="clockIn"/></th>
                  <th style={thStyle}>Clock Out</th>
                  <th style={{...thStyle,textAlign:"right",cursor:"pointer"}} onClick={()=>toggleSort("hours")}>Hours<SortArrow col="hours"/></th>
                  <th style={{...thStyle,textAlign:"right"}}>Pay Rate</th>
                  <th style={{...thStyle,textAlign:"right",cursor:"pointer"}} onClick={()=>toggleSort("payCost")}>Pay Cost<SortArrow col="payCost"/></th>
                  <th style={{...thStyle,textAlign:"right"}}>Bill Rate</th>
                  <th style={{...thStyle,textAlign:"right",cursor:"pointer"}} onClick={()=>toggleSort("laborCost")}>Bill Total<SortArrow col="laborCost"/></th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Sync</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={13} style={{...tdStyle,textAlign:"center",color:"var(--t3)",padding:30}}>No shifts found for the selected filters.</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id+r.projId} style={{...trStyle,minHeight:44}}>
                    <td style={tdStyle}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <Av name={r.tech} size={22}/>
                        <span style={{fontWeight:600,fontSize:11,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:140}}>{r.tech}</span>
                      </div>
                    </td>
                    <td style={{...tdStyle,fontSize:11,color:"var(--t2)"}}>{r.position||"—"}</td>
                    <td style={{...tdStyle,fontSize:11,fontWeight:500,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.projName}</td>
                    <td style={{...tdStyle,fontSize:11,color:"var(--t2)",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.task||"—"}</td>
                    <td style={{...tdStyle,fontSize:10,fontFamily:"var(--mono)"}}>{r.clockIn||"—"}</td>
                    <td style={{...tdStyle,fontSize:10,fontFamily:"var(--mono)"}}>{r.clockOut||"—"}</td>
                    <td style={{...tdStyle,textAlign:"right",fontFamily:"var(--mono)",fontSize:12}}>{(r.hours||0).toFixed(1)}h</td>
                    <td style={{...tdStyle,textAlign:"right",fontFamily:"var(--mono)",fontSize:11,color:"var(--t2)"}}>${(r.payRate||0).toFixed(0)}/hr</td>
                    <td style={{...tdStyle,textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"var(--amber)"}}>{f$(r.payCost)}</td>
                    <td style={{...tdStyle,textAlign:"right",fontFamily:"var(--mono)",fontSize:11,color:"var(--t2)"}}>${(r.rate||0).toFixed(0)}/hr</td>
                    <td style={{...tdStyle,textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"var(--green)"}}>{f$(r.laborCost)}</td>
                    <td style={tdStyle}>
                      <span style={{fontSize:9,padding:"2px 6px",borderRadius:4,fontFamily:"var(--mono)",
                        background: r.payType==="Overtime" ? "rgba(232,156,24,.12)" : r.payType==="Holiday" ? "rgba(167,139,250,.12)" : r.payType==="PTO" ? "rgba(91,163,245,.12)" : "rgba(26,217,138,.08)",
                        color:      r.payType==="Overtime" ? "var(--amber)" : r.payType==="Holiday" ? "var(--purple)" : r.payType==="PTO" ? "var(--blue)" : "var(--green)",
                      }}>{r.payType||"Regular"}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{fontSize:9,padding:"2px 6px",borderRadius:4,fontFamily:"var(--mono)",
                        background: r.qboSyncStatus==="synced" ? "rgba(26,217,138,.1)" : r.qboSyncStatus==="error" ? "rgba(228,53,49,.1)" : "rgba(255,255,255,.06)",
                        color:      r.qboSyncStatus==="synced" ? "var(--green)" : r.qboSyncStatus==="error" ? "var(--acc)" : "var(--t3)",
                      }}>{r.qboSyncStatus==="synced" ? "Synced" : r.qboSyncStatus==="error" ? "Error" : "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr style={{background:"var(--s3)"}}>
                    <td colSpan={6} style={{...tdStyle,fontWeight:700,fontSize:11}}>TOTALS</td>
                    <td style={{...tdStyle,textAlign:"right",fontFamily:"var(--mono)",fontSize:12,fontWeight:700}}>{totals.totalHours.toFixed(1)}h</td>
                    <td style={tdStyle}/>
                    <td style={{...tdStyle,textAlign:"right",fontFamily:"var(--mono)",fontSize:12,fontWeight:700,color:"var(--amber)"}}>{f$(totals.totalPayCost)}</td>
                    <td style={tdStyle}/>
                    <td style={{...tdStyle,textAlign:"right",fontFamily:"var(--mono)",fontSize:12,fontWeight:700,color:"var(--green)"}}>{f$(totals.totalBilling)}</td>
                    <td colSpan={2} style={tdStyle}/>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}


/* ═════════════════════════════════════════════════════════════════════════════
   RATE SETTINGS TAB
═════════════════════════════════════════════════════════════════════════════ */
function RateSettingsTab({ canEditRates }) {
  const [rates, setRates] = useState(() => loadRates());
  const [adding, setAdding] = useState(false);
  const [newPos, setNewPos] = useState("");
  const [newPay, setNewPay] = useState("");
  const [newCharge, setNewCharge] = useState("");
  const [editId, setEditId] = useState(null);
  const [editPay, setEditPay] = useState("");
  const [editCharge, setEditCharge] = useState("");

  // Load from Firestore on mount (source of truth)
  useEffect(() => {
    if (!_payrollDb || !_payrollCompanyId) return;
    getDoc(doc(_payrollDb, "companies", _payrollCompanyId, "settings", "payrollRates")).then(snap => {
      if (snap.exists() && snap.data().data) {
        const v = snap.data().data;
        setRates(v);
        try { localStorage.setItem(LS_PAYROLL_RATES, JSON.stringify(v)); } catch {}
      }
    }).catch(() => {});
  }, []);

  const persist = useCallback((updated) => {
    setRates(updated);
    saveRates(updated);
  }, []);

  const addRate = () => {
    if (!newPos.trim()) return;
    const id = "pr" + Date.now();
    persist([...rates, { id, position: newPos.trim(), payRate: parseFloat(newPay)||0, chargeRate: parseFloat(newCharge)||0 }]);
    setNewPos(""); setNewPay(""); setNewCharge(""); setAdding(false);
  };

  const startEdit = (r) => {
    setEditId(r.id);
    setEditPay(String(r.payRate));
    setEditCharge(String(r.chargeRate));
  };

  const saveEdit = (id) => {
    persist(rates.map(r => r.id===id ? { ...r, payRate: parseFloat(editPay)||0, chargeRate: parseFloat(editCharge)||0 } : r));
    setEditId(null);
  };

  const removeRate = (id) => {
    persist(rates.filter(r => r.id !== id));
  };

  return (
    <div style={{padding:20,overflow:"auto",flex:1}}>
      <div style={{maxWidth:700,margin:"0 auto"}}>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>Employee Pay & Billing Rates</div>
            <div style={{fontSize:11,color:"var(--t2)",marginTop:2}}>Set the pay rate (what you pay staff) and billing rate (what you charge on invoices) for each position.</div>
          </div>
          {canEditRates && (
            <button onClick={()=>setAdding(v=>!v)} style={{...btnStyle, background:"var(--acc)",color:"#fff",boxShadow:"0 0 10px var(--acc-glo)"}}>
              {Ic.plus} Add Position
            </button>
          )}
        </div>

        {!canEditRates && (
          <div style={{background:"rgba(232,156,24,.08)",border:"1px solid rgba(232,156,24,.25)",borderRadius:8,padding:"9px 13px",marginBottom:14,fontSize:11,color:"var(--amber)"}}>
            You have view-only access to rate settings. Director (L9) or Admin (L10) permissions are required to edit rates.
          </div>
        )}

        {adding && canEditRates && (
          <div style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9,padding:14,marginBottom:14}}>
            <div className="g3" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:10}}>
              <div>
                <label style={lblStyle}>Position / Role</label>
                <input type="text" value={newPos} onChange={e=>setNewPos(e.target.value)} placeholder="e.g. Senior Technician" style={fieldStyle}/>
              </div>
              <div>
                <label style={lblStyle}>Pay Rate ($/hr)</label>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"var(--t3)",fontSize:13}}>$</span>
                  <input type="number" value={newPay} onChange={e=>setNewPay(e.target.value)} placeholder="0" style={{...fieldStyle,paddingLeft:20}}/>
                </div>
              </div>
              <div>
                <label style={lblStyle}>Billing Rate ($/hr)</label>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"var(--t3)",fontSize:13}}>$</span>
                  <input type="number" value={newCharge} onChange={e=>setNewCharge(e.target.value)} placeholder="0" style={{...fieldStyle,paddingLeft:20}}/>
                </div>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:7}}>
              <button onClick={()=>setAdding(false)} style={{...btnStyle,background:"var(--s3)",border:"1px solid var(--br)",color:"var(--t1)"}}>Cancel</button>
              <button onClick={addRate} style={{...btnStyle,background:"var(--acc)",color:"#fff"}}>Save</button>
            </div>
          </div>
        )}

        <div style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9,overflow:"hidden"}}>
          <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          <table style={{...tableStyle,minWidth:500,width:"100%"}}>
            <thead>
              <tr>
                <th style={thStyle}>Position / Role</th>
                <th style={{...thStyle,textAlign:"right"}}>Pay Rate</th>
                <th style={{...thStyle,textAlign:"right"}}>Billing Rate</th>
                <th style={{...thStyle,textAlign:"right"}}>Margin / hr</th>
                {canEditRates && <th style={{...thStyle,textAlign:"right",width:90}}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rates.length === 0 ? (
                <tr><td colSpan={canEditRates?5:4} style={{...tdStyle,textAlign:"center",color:"var(--t3)",padding:30}}>No rates configured. Click "Add Position" to get started.</td></tr>
              ) : rates.map(r => {
                const margin = r.chargeRate - r.payRate;
                const isEditing = editId === r.id;
                return (
                  <tr key={r.id} style={{...trStyle,minHeight:44}}>
                    <td style={tdStyle}>
                      <span style={{fontWeight:600,fontSize:12}}>{r.position}</span>
                    </td>
                    <td style={{...tdStyle,textAlign:"right"}}>
                      {isEditing && canEditRates ? (
                        <div style={{position:"relative",display:"inline-block"}}>
                          <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",color:"var(--t3)",fontSize:12}}>$</span>
                          <input type="number" value={editPay} onChange={e=>setEditPay(e.target.value)}
                            style={{...fieldStyle,width:80,paddingLeft:18,textAlign:"right",fontSize:12}}/>
                        </div>
                      ) : (
                        <span style={{fontFamily:"var(--mono)",fontSize:13,color:"var(--amber)"}}>${r.payRate.toFixed(0)}<span style={{fontSize:10,color:"var(--t3)"}}>/hr</span></span>
                      )}
                    </td>
                    <td style={{...tdStyle,textAlign:"right"}}>
                      {isEditing && canEditRates ? (
                        <div style={{position:"relative",display:"inline-block"}}>
                          <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",color:"var(--t3)",fontSize:12}}>$</span>
                          <input type="number" value={editCharge} onChange={e=>setEditCharge(e.target.value)}
                            style={{...fieldStyle,width:80,paddingLeft:18,textAlign:"right",fontSize:12}}/>
                        </div>
                      ) : (
                        <span style={{fontFamily:"var(--mono)",fontSize:13,color:"var(--green)"}}>${r.chargeRate.toFixed(0)}<span style={{fontSize:10,color:"var(--t3)"}}>/hr</span></span>
                      )}
                    </td>
                    <td style={{...tdStyle,textAlign:"right"}}>
                      <span style={{fontFamily:"var(--mono)",fontSize:13,fontWeight:700,color:margin>=0?"var(--green)":"var(--acc)"}}>${margin.toFixed(0)}<span style={{fontSize:10,fontWeight:400,color:"var(--t3)"}}>/hr</span></span>
                    </td>
                    {canEditRates && (
                      <td style={{...tdStyle,textAlign:"right"}}>
                        {isEditing ? (
                          <div style={{display:"flex",gap:5,justifyContent:"flex-end",flexWrap:"wrap"}}>
                            <button onClick={()=>setEditId(null)} style={{...btnXs,minWidth:48,background:"var(--s3)",border:"1px solid var(--br)",color:"var(--t2)"}}>Cancel</button>
                            <button onClick={()=>saveEdit(r.id)} style={{...btnXs,minWidth:42,background:"var(--acc)",color:"#fff"}}>Save</button>
                          </div>
                        ) : (
                          <div style={{display:"flex",gap:5,justifyContent:"flex-end",flexWrap:"wrap"}}>
                            <button onClick={()=>startEdit(r)} style={{...btnXs,minWidth:32,background:"var(--s3)",border:"1px solid var(--br)",color:"var(--t2)"}}>{Ic.edit}</button>
                            <button onClick={()=>removeRate(r.id)} style={{...btnXs,minWidth:32,background:"rgba(228,53,49,.08)",border:"1px solid rgba(228,53,49,.2)",color:"var(--acc)"}}>{Ic.trash}</button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>

        <div style={{marginTop:14,padding:"10px 13px",background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9,fontSize:11,color:"var(--t2)"}}>
          <strong style={{color:"var(--t1)"}}>How rates are used:</strong>
          <ul style={{margin:"6px 0 0 16px",lineHeight:1.6}}>
            <li><strong>Pay Rate</strong> — The hourly rate you pay the employee. Used to calculate payroll cost.</li>
            <li><strong>Billing Rate</strong> — The hourly rate charged to the job. Used when building invoices and calculating labor revenue on projects.</li>
            <li>When a staff member clocks in, their position's rates are automatically applied to the shift record.</li>
          </ul>
        </div>

      </div>
    </div>
  );
}


/* ═════════════════════════════════════════════════════════════════════════════
   QBO INTEGRATION SETTINGS TAB
═════════════════════════════════════════════════════════════════════════════ */
function QboSettingsTab({ globalStaff, projects, canEditRates }) {
  const [settings, setSettings] = useState(() => loadQboSettings());
  const [empRates, setEmpRates] = useState(() => loadEmployeeRates());
  const [editingEmp, setEditingEmp] = useState(null);
  const [editPayRate, setEditPayRate] = useState("");
  const [editChargeRate, setEditChargeRate] = useState("");

  const rates = useMemo(() => loadRates(), []);
  const lookup = useMemo(() => ratesLookup(rates), [rates]);

  // Load from Firestore on mount (source of truth)
  useEffect(() => {
    if (!_payrollDb || !_payrollCompanyId) return;
    getDoc(doc(_payrollDb, "companies", _payrollCompanyId, "settings", "qboSettings")).then(snap => {
      if (snap.exists() && snap.data().data) {
        const v = snap.data().data;
        setSettings(v);
        try { localStorage.setItem(LS_QBO_SETTINGS, JSON.stringify(v)); } catch {}
      }
    }).catch(() => {});
    getDoc(doc(_payrollDb, "companies", _payrollCompanyId, "settings", "employeeRates")).then(snap => {
      if (snap.exists() && snap.data().data) {
        const v = snap.data().data;
        setEmpRates(v);
        try { localStorage.setItem(LS_EMPLOYEE_RATES, JSON.stringify(v)); } catch {}
      }
    }).catch(() => {});
  }, []);

  const persistSettings = useCallback((updated) => {
    setSettings(updated);
    saveQboSettings(updated);
  }, []);

  const updateEmpQboId = (staffId, qboId) => {
    const next = { ...settings, employeeIdMap: { ...settings.employeeIdMap, [staffId]: qboId } };
    persistSettings(next);
  };

  const updateProjQboId = (projId, qboId) => {
    const next = { ...settings, customerIdMap: { ...settings.customerIdMap, [projId]: qboId } };
    persistSettings(next);
  };

  const saveEmpRateOverride = (staffName) => {
    const updated = { ...empRates, [staffName]: { payRate: parseFloat(editPayRate)||0, chargeRate: parseFloat(editChargeRate)||0 } };
    setEmpRates(updated);
    saveEmployeeRates(updated);
    setEditingEmp(null);
  };

  const clearEmpRateOverride = (staffName) => {
    const updated = { ...empRates };
    delete updated[staffName];
    setEmpRates(updated);
    saveEmployeeRates(updated);
  };

  return (
    <div style={{padding:20,overflow:"auto",flex:1}}>
      <div style={{maxWidth:800,margin:"0 auto"}}>

        {/* Connection Status */}
        <div style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9,padding:16,marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>QuickBooks Online Connection</div>
              <div style={{fontSize:11,color:"var(--t2)",marginTop:2}}>
                {settings.connected
                  ? `Connected to ${settings.companyName || "QBO"} (Realm: ${settings.realmId})`
                  : "Not connected — configure your QBO integration to sync time activities for payroll."}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:settings.connected?"var(--green)":"var(--t3)"}}/>
              <span style={{fontSize:11,fontFamily:"var(--mono)",color:settings.connected?"var(--green)":"var(--t3)"}}>
                {settings.connected ? "CONNECTED" : "DISCONNECTED"}
              </span>
            </div>
          </div>
          {settings.lastSyncAt && (
            <div style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)"}}>
              Last sync: {new Date(settings.lastSyncAt).toLocaleString()}
            </div>
          )}
          <div style={{marginTop:12,padding:"9px 12px",background:"var(--s3)",borderRadius:7,fontSize:11,color:"var(--t2)"}}>
            QBO OAuth2 connection will be configured via Settings when the integration is activated. This tab lets you pre-map your employees and projects to QBO entities so sync is seamless on day one.
          </div>
        </div>

        {/* Default Settings */}
        <div style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9,padding:16,marginBottom:18}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--t1)",marginBottom:10}}>Sync Defaults</div>
          <div className="g2" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
            <div>
              <label style={lblStyle}>Default Pay Type</label>
              <select value={settings.defaultPayType} disabled={!canEditRates}
                onChange={e => persistSettings({...settings, defaultPayType: e.target.value})} style={selectStyle}>
                <option value="Regular">Regular</option>
                <option value="Overtime">Overtime</option>
                <option value="Holiday">Holiday</option>
                <option value="PTO">PTO</option>
              </select>
            </div>
            <div>
              <label style={lblStyle}>Default Billable Status</label>
              <select value={settings.defaultBillableStatus} disabled={!canEditRates}
                onChange={e => persistSettings({...settings, defaultBillableStatus: e.target.value})} style={selectStyle}>
                <option value="Billable">Billable</option>
                <option value="NotBillable">Not Billable</option>
              </select>
            </div>
          </div>
        </div>

        {/* Employee ID Mapping + Per-Employee Rate Overrides */}
        <div style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9,padding:16,marginBottom:18}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--t1)",marginBottom:4}}>Employee Mapping</div>
          <div style={{fontSize:11,color:"var(--t2)",marginBottom:12}}>Map each staff member to their QBO Employee ID. Optionally set per-employee rate overrides that take priority over position-based rates.</div>
          <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          <table style={{...tableStyle,minWidth:500,width:"100%"}}>
            <thead>
              <tr>
                <th style={thStyle}>Employee</th>
                <th style={thStyle}>Position</th>
                <th style={{...thStyle,width:120}}>QBO Employee ID</th>
                <th style={{...thStyle,textAlign:"right"}}>Pay Rate</th>
                <th style={{...thStyle,textAlign:"right"}}>Bill Rate</th>
                {canEditRates && <th style={{...thStyle,textAlign:"right",width:80}}>Override</th>}
              </tr>
            </thead>
            <tbody>
              {globalStaff.length === 0 ? (
                <tr><td colSpan={canEditRates?6:5} style={{...tdStyle,textAlign:"center",color:"var(--t3)",padding:20}}>No staff members found.</td></tr>
              ) : globalStaff.map(s => {
                const name = `${s.firstName||""} ${s.lastName||""}`.trim() || s.email || s.id;
                const pos = s.systemRole || "Field Technician";
                const posRate = lookup[pos] || { payRate: 0, chargeRate: 0 };
                const override = empRates[name];
                const effectivePay = override ? override.payRate : posRate.payRate;
                const effectiveCharge = override ? override.chargeRate : posRate.chargeRate;
                const isEditing = editingEmp === name;
                return (
                  <tr key={s.id} style={{...trStyle,minHeight:44}}>
                    <td style={tdStyle}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <Av name={name} size={22}/>
                        <span style={{fontWeight:600,fontSize:11,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:140}}>{name}</span>
                      </div>
                    </td>
                    <td style={{...tdStyle,fontSize:11,color:"var(--t2)"}}>{pos}</td>
                    <td style={tdStyle}>
                      <input type="text" value={settings.employeeIdMap?.[s.id]||""} disabled={!canEditRates}
                        onChange={e => updateEmpQboId(s.id, e.target.value)}
                        placeholder="QBO Ref ID" style={{...fieldStyle,fontSize:10,padding:"4px 7px",fontFamily:"var(--mono)"}}/>
                    </td>
                    <td style={{...tdStyle,textAlign:"right"}}>
                      {isEditing ? (
                        <input type="number" value={editPayRate} onChange={e=>setEditPayRate(e.target.value)} style={{...fieldStyle,width:65,textAlign:"right",fontSize:11,padding:"3px 6px"}}/>
                      ) : (
                        <span style={{fontFamily:"var(--mono)",fontSize:12,color:override?"var(--amber)":"var(--t2)"}}>${effectivePay.toFixed(0)}/hr{override ? " *" : ""}</span>
                      )}
                    </td>
                    <td style={{...tdStyle,textAlign:"right"}}>
                      {isEditing ? (
                        <input type="number" value={editChargeRate} onChange={e=>setEditChargeRate(e.target.value)} style={{...fieldStyle,width:65,textAlign:"right",fontSize:11,padding:"3px 6px"}}/>
                      ) : (
                        <span style={{fontFamily:"var(--mono)",fontSize:12,color:override?"var(--green)":"var(--t2)"}}>${effectiveCharge.toFixed(0)}/hr{override ? " *" : ""}</span>
                      )}
                    </td>
                    {canEditRates && (
                      <td style={{...tdStyle,textAlign:"right"}}>
                        {isEditing ? (
                          <div style={{display:"flex",gap:4,justifyContent:"flex-end",flexWrap:"wrap"}}>
                            <button onClick={()=>setEditingEmp(null)} style={{...btnXs,minWidth:28,background:"var(--s3)",border:"1px solid var(--br)",color:"var(--t2)"}}>X</button>
                            <button onClick={()=>saveEmpRateOverride(name)} style={{...btnXs,minWidth:32,background:"var(--acc)",color:"#fff"}}>OK</button>
                          </div>
                        ) : (
                          <div style={{display:"flex",gap:4,justifyContent:"flex-end",flexWrap:"wrap"}}>
                            <button onClick={()=>{setEditingEmp(name);setEditPayRate(String(effectivePay));setEditChargeRate(String(effectiveCharge));}}
                              style={{...btnXs,minWidth:32,background:"var(--s3)",border:"1px solid var(--br)",color:"var(--t2)"}}>{Ic.edit}</button>
                            {override && <button onClick={()=>clearEmpRateOverride(name)} style={{...btnXs,minWidth:32,background:"rgba(228,53,49,.08)",border:"1px solid rgba(228,53,49,.2)",color:"var(--acc)"}}>{Ic.trash}</button>}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <div style={{marginTop:8,fontSize:10,color:"var(--t3)",fontStyle:"italic"}}>* = per-employee override (takes priority over position rate)</div>
        </div>

        {/* Project → QBO Customer Mapping */}
        <div style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9,padding:16}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--t1)",marginBottom:4}}>Project → QBO Customer Mapping</div>
          <div style={{fontSize:11,color:"var(--t2)",marginBottom:12}}>Map projects to QBO Customer/Job references. When shifts are synced, they'll be associated with the correct QBO customer for billing.</div>
          <div style={{maxHeight:300,overflowY:"auto"}}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Project</th>
                  <th style={thStyle}>Status</th>
                  <th style={{...thStyle,width:150}}>QBO Customer Ref</th>
                </tr>
              </thead>
              <tbody>
                {projects.filter(p => p.status !== "closed").slice(0, 50).map(p => (
                  <tr key={p.id} style={trStyle}>
                    <td style={{...tdStyle,fontSize:11,fontWeight:500}}>{p.name || p.address || p.id}</td>
                    <td style={tdStyle}>
                      <span style={{fontSize:9,padding:"2px 6px",borderRadius:4,fontFamily:"var(--mono)",background:"rgba(255,255,255,.06)",color:"var(--t2)"}}>{p.status||"—"}</span>
                    </td>
                    <td style={tdStyle}>
                      <input type="text" value={settings.customerIdMap?.[p.id]||""} disabled={!canEditRates}
                        onChange={e => updateProjQboId(p.id, e.target.value)}
                        placeholder="QBO Ref ID" style={{...fieldStyle,fontSize:10,padding:"4px 7px",fontFamily:"var(--mono)"}}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}


/* ═════════════════════════════════════════════════════════════════════════════
   PAYROLL DASHBOARD (main export)
═════════════════════════════════════════════════════════════════════════════ */
export function PayrollDashboard({ projects=[], globalStaff=[], projectShifts={}, permissionLevel=1, companyId="" }) {
  useEffect(() => { if (companyId) _payrollCompanyId = companyId; }, [companyId]);
  const [tab, setTab] = useState("report");
  const canEditRates = permissionLevel >= 9; // Director+ can edit

  return (
    <>
      {/* Topbar */}
      <div style={{background:"var(--s1)",borderBottom:"1px solid var(--br)",padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between",height:54,flexShrink:0,gap:10}}>
        <div>
          <div style={{fontWeight:700,fontSize:15,color:"var(--t1)"}}>Payroll</div>
          <div style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)",marginTop:1,letterSpacing:".05em",textTransform:"uppercase"}}>Staff Shifts &amp; Rate Management</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {Ic.people}
          <span style={{fontSize:11,color:"var(--t2)"}}>{globalStaff.length} staff</span>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{background:"var(--s1)",borderBottom:"1px solid var(--br)",padding:"0 18px",display:"flex",flexShrink:0,overflow:"auto"}}>
        {[
          { key:"report", label:"Payroll Report", icon:Ic.clock },
          { key:"rates",  label:"Rate Settings",  icon:Ic.dollar },
          { key:"qbo",    label:"QBO Integration", icon:Ic.link },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background:"none",border:"none",fontFamily:"var(--ui)",fontSize:12,padding:"12px 12px",cursor:"pointer",
              borderBottom: tab===t.key ? "2px solid var(--acc)" : "2px solid transparent",
              color: tab===t.key ? "var(--t1)" : "var(--t2)",
              fontWeight: tab===t.key ? 700 : 400,
              whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5,transition:"all .12s",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "report" ? (
        <PayrollReportTab projects={projects} globalStaff={globalStaff} projectShifts={projectShifts}/>
      ) : tab === "rates" ? (
        <RateSettingsTab canEditRates={canEditRates}/>
      ) : (
        <QboSettingsTab globalStaff={globalStaff} projects={projects} canEditRates={canEditRates}/>
      )}
    </>
  );
}


/* ─────────────────────────────────────────────────────────────────────────────
   SHARED INLINE STYLES (matching portal patterns)
───────────────────────────────────────────────────────────────────────────── */
const tableStyle = { width:"100%", borderCollapse:"collapse", fontSize:12 };
const thStyle    = { padding:"8px 12px", textAlign:"left", fontSize:10, fontFamily:"var(--mono)", color:"var(--t3)", textTransform:"uppercase", letterSpacing:".07em", borderBottom:"1px solid var(--br)", background:"var(--s1)" };
const tdStyle    = { padding:"8px 12px", borderBottom:"1px solid var(--br)" };
const trStyle    = { transition:"background .1s" };
const selectStyle= { background:"var(--s2)", border:"1px solid var(--br)", borderRadius:6, padding:"6px 10px", color:"var(--t1)", fontFamily:"var(--ui)", fontSize:11, outline:"none", cursor:"pointer" };
const inputStyle = { background:"var(--s2)", border:"1px solid var(--br)", borderRadius:6, padding:"6px 10px", color:"var(--t1)", fontFamily:"var(--mono)", fontSize:11, outline:"none", width:130 };
const btnStyle   = { border:"none", borderRadius:6, padding:"7px 14px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"var(--ui)", display:"inline-flex", alignItems:"center", gap:5, transition:"all .15s", whiteSpace:"nowrap" };
const btnXs      = { border:"none", borderRadius:5, padding:"3px 8px", fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"var(--ui)", display:"inline-flex", alignItems:"center", gap:3, transition:"all .12s" };
const fieldStyle = { width:"100%", background:"var(--s3)", border:"1px solid var(--br)", borderRadius:6, padding:"7px 10px", color:"var(--t1)", fontFamily:"var(--ui)", fontSize:12, outline:"none", boxSizing:"border-box" };
const lblStyle   = { fontSize:10, color:"var(--t3)", display:"block", marginBottom:3, fontFamily:"var(--mono)", textTransform:"uppercase", letterSpacing:".07em" };
