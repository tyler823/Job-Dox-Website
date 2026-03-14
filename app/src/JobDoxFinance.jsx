/**
 * JobDoxFinance.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Financial intelligence layer for Job-Dox Portal.
 *
 * EXPORTS:
 *   FinancialTab          → replaces BudgetTab inside ProjectDetail
 *   FinancialHealthBadge  → compact badge for portfolio cards / list rows
 *   FinancialDashboard    → full portfolio-level page (new rail page)
 *
 * PORTAL CHANGES REQUIRED (see bottom of file for exact diff):
 *   1. Import this file at the top of JobDoxPortal.jsx
 *   2. Add "finance" to PROJ_TABS
 *   3. Route tab==="finance" to <FinancialTab>
 *   4. Sprinkle <FinancialHealthBadge> on portfolio cards
 *   5. Add page==="finance" route and rail button
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { loadProjEstimates } from "./EstimateDox.jsx";

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS & CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
// Lazy db getter — avoids calling getFirestore() before Firebase is initialized
let _db = null;
const getDb = () => { if (!_db) _db = getFirestore(); return _db; };
let _financeCompanyId = null; // Set when FinancialTab / FinancialDashboard mounts
let _fid = 9000;
const fuid = () => `f${++_fid}`;

const f$ = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n||0);
const f$c = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n||0);
const fPct = (a,b) => b>0 ? Math.min(100,Math.max(0,(a/b)*100)).toFixed(1) : "0.0";
const today = () => new Date().toISOString().split("T")[0];
const daysAgo = d => { if (!d) return 0; return Math.floor((Date.now()-new Date(d).getTime())/86400000); };

/* ── localStorage invoice helpers (mirrors portal — self-contained) ── */
const LS_INV_KEY = "jd_invoices";
function lsGetInvoices(projId) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_INV_KEY)) || [];
    return projId ? all.filter(i => i.projId === projId) : all;
  } catch { return []; }
}
function lsSaveAll(arr) {
  try { localStorage.setItem(LS_INV_KEY, JSON.stringify(arr)); } catch {}
  if (_financeCompanyId) {
    try { setDoc(doc(getDb(), "companies", _financeCompanyId, "settings", "invoices"), { data: JSON.parse(JSON.stringify(arr)), updatedAt: serverTimestamp() }, { merge: true }); } catch {}
  }
}
function lsUpdateInvoice(id, patch) {
  const all = (JSON.parse(localStorage.getItem(LS_INV_KEY)) || []).map(i => i.id === id ? {...i,...patch} : i);
  lsSaveAll(all);
  return all.filter(i => i.projId === (all.find(x=>x.id===id)?.projId));
}

/* ── Vendor bills mirror (shared with portal VendorManagerTab) ── */
const LS_VENDOR_BILLS = "jd_vendor_bills";
function lsLoadVendorBills()       { try { return JSON.parse(localStorage.getItem(LS_VENDOR_BILLS)) || []; } catch { return []; } }
function lsUpsertVendorBill(bill)  {
  const all = lsLoadVendorBills().filter(b => b.id !== bill.id);
  const updated = [...all, bill];
  try { localStorage.setItem(LS_VENDOR_BILLS, JSON.stringify(updated)); } catch {}
  if (_financeCompanyId) {
    try { setDoc(doc(getDb(), "companies", _financeCompanyId, "settings", "vendorBills"), { data: JSON.parse(JSON.stringify(updated)), updatedAt: serverTimestamp() }, { merge: true }); } catch {}
  }
}
function lsMarkVendorBillPaid(id, paid) {
  const all = lsLoadVendorBills().map(b => b.id === id ? {...b, status: paid ? "paid" : "approved"} : b);
  try { localStorage.setItem(LS_VENDOR_BILLS, JSON.stringify(all)); } catch {}
  if (_financeCompanyId) {
    try { setDoc(doc(getDb(), "companies", _financeCompanyId, "settings", "vendorBills"), { data: JSON.parse(JSON.stringify(all)), updatedAt: serverTimestamp() }, { merge: true }); } catch {}
  }
}

/* ── Vendor registry read (shared key with portal jd_vendors) ── */
function lsLoadVendors() { try { return JSON.parse(localStorage.getItem("jd_vendors")) || []; } catch { return []; } }

/* ── Budget Templates (global, mirrors Settings → Budget Categories) ── */
const LS_BUDGET_TEMPLATES = "jd_budget_templates";
const DEFAULT_BUDGET_TEMPLATES = [
  { id:"bc1",  name:"General Demo / Tear-out", color:"#f59e0b", workTypes:[], active:true },
  { id:"bc2",  name:"Structural / Framing",    color:"#8b5cf6", workTypes:[], active:true },
  { id:"bc3",  name:"Drywall",                 color:"#06b6d4", workTypes:[], active:true },
  { id:"bc4",  name:"Painting",                color:"#84cc16", workTypes:[], active:true },
  { id:"bc5",  name:"Flooring",                color:"#f97316", workTypes:[], active:true },
  { id:"bc6",  name:"Electrical",              color:"#eab308", workTypes:[], active:true },
  { id:"bc7",  name:"Plumbing",                color:"#3b82f6", workTypes:[], active:true },
  { id:"bc8",  name:"HVAC / Mechanical",       color:"#10b981", workTypes:[], active:true },
  { id:"bc9",  name:"Equipment",               color:"#ec4899", workTypes:[], active:true },
  { id:"bc10", name:"Contents",                color:"#6366f1", workTypes:[], active:true },
  { id:"bc11", name:"Labor",                   color:"#14b8a6", workTypes:[], active:true },
  { id:"bc12", name:"General Cleanup",         color:"#a3a3a3", workTypes:[], active:true },
  { id:"bc13", name:"Roofing",                 color:"#dc2626", workTypes:[], active:true },
  { id:"bc14", name:"Windows / Doors",         color:"#7c3aed", workTypes:[], active:true },
  { id:"bc15", name:"Insulation",              color:"#059669", workTypes:[], active:true },
  { id:"bc16", name:"Mitigation",              color:"#0891b2", workTypes:[], active:true },
];
function lsGetBudgetTemplates() {
  try { return JSON.parse(localStorage.getItem(LS_BUDGET_TEMPLATES)) || DEFAULT_BUDGET_TEMPLATES; } catch { return DEFAULT_BUDGET_TEMPLATES; }
}

/* ── Per-project budgets ── */
const LS_PROJECT_BUDGETS = "jd_project_budgets";
// Shape: { [projId]: { categories:[{id,name,color,budgeted,source,xactRCV,xactACV,xactDep,active}], xactimate:{filename,importDate}|null } }
function lsGetProjectBudget(projId) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_PROJECT_BUDGETS)) || {};
    return all[projId] || { categories:[], xactimate:null };
  } catch { return { categories:[], xactimate:null }; }
}
function lsSaveProjectBudget(projId, data) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_PROJECT_BUDGETS)) || {};
    all[projId] = data;
    localStorage.setItem(LS_PROJECT_BUDGETS, JSON.stringify(all));
    if (_financeCompanyId) {
      setDoc(doc(getDb(), "companies", _financeCompanyId, "settings", "projectBudgets"), { data: JSON.parse(JSON.stringify(all)), updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
    }
  } catch {}
}

/* ── Xactimate "Recap by Category" PDF Parser ── */
// Loads PDF.js from CDN if not already loaded, then extracts text from each page.
// The Recap by Category format lists lines like:
//   CATEGORY NAME          $12,450.00     $0.00    $12,450.00
// We parse: category name, RCV (col 1), Depreciation (col 2), ACV (col 3)
async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function parseXactimatePdf(file) {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page  = await pdf.getPage(p);
    const items = await page.getTextContent();
    // Group items by approximate Y position with tolerance bucketing
    // PDF text items on the same visual row can differ by 1-3 Y units
    const rawItems = items.items
      .filter(item => item.str && item.str.trim())
      .map(item => ({ x: item.transform[4], y: item.transform[5], text: item.str }));

    // Sort by Y descending (top to bottom in page coordinates)
    rawItems.sort((a, b) => b.y - a.y);

    // Bucket items into rows with Y-tolerance of 4 units
    const rows = [];
    let currentRow = [];
    let currentY = null;
    rawItems.forEach(item => {
      if (currentY === null || Math.abs(item.y - currentY) <= 4) {
        currentRow.push(item);
        if (currentY === null) currentY = item.y;
      } else {
        if (currentRow.length) rows.push(currentRow);
        currentRow = [item];
        currentY = item.y;
      }
    });
    if (currentRow.length) rows.push(currentRow);

    // Build text lines from rows (items sorted left-to-right)
    rows.forEach(row => {
      const sorted = row.sort((a, b) => a.x - b.x);
      const line = sorted.map(i => i.text.trim()).filter(Boolean).join("  ");
      if (line.trim()) fullText += line + "\n";
    });
    fullText += "--- PAGE BREAK ---\n";
  }

  // ── Parse the extracted text ──
  const lines = fullText.split("\n");
  const categories = [];
  const seen = new Set();

  // Broader section detection — check for recap/summary markers
  // Xactimate uses: "Recap by Category", "RECAP BY CATEGORY", "Category Summary",
  // "Estimate Summary", and sometimes split across text items
  let inSummary = false;
  let pastSummary = false; // track if we left the summary section

  // Also collect all lines that look like category+dollar data as fallback
  const fallbackCats = [];

  const parseCategoryLine = (line) => {
    // Extract all dollar amounts from this line
    const amounts = [];
    const re = /\$\s*([\d,]+(?:\.\d{2})?)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      amounts.push(parseFloat(m[1].replace(/,/g, "")));
    }
    if (amounts.length < 1) return null;

    // Category name = everything before the first dollar sign
    const dollarIdx = line.indexOf("$");
    const rawName = line.slice(0, dollarIdx).trim();
    if (!rawName || rawName.length < 2) return null;

    // Skip lines that are clearly totals/subtotals/overhead/profit summary rows
    if (/^(total|subtotal|grand\s*total|net\s*claim|line\s*item\s*total)/i.test(rawName)) return null;
    if (/^(o\s*&\s*p\s*items?\s*subtotal|non-?\s*o\s*&\s*p\s*items?\s*subtotal)/i.test(rawName)) return null;
    if (/^(overhead|profit)$/i.test(rawName)) return null;
    if (/^(material\s*sales\s*tax|sales\s*tax)/i.test(rawName)) return null;

    // Skip header-like lines
    if (/^(items?|description|qty|unit|price|rcv|acv|deprec)/i.test(rawName) && rawName.length < 15) return null;

    // Normalize: title-case and clean up
    const name = rawName.replace(/\s+/g, " ").trim()
      .split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

    if (!name || name.length < 2) return null;

    // Determine column interpretation:
    // Format A (RCV/Dep/ACV): 3 dollar amounts → RCV, Depreciation, ACV
    // Format B (Total/%): 1 dollar amount + optional percentage → Total only
    // Format C (Total/Tax/RCV/Dep/ACV): 4-5 dollar amounts
    const rcv = amounts[0] || 0;
    let dep = 0, acv = rcv;

    if (amounts.length >= 3) {
      // Could be RCV | Dep | ACV or Total | Tax | RCV...
      // Heuristic: if last amount < first, likely ACV (after depreciation)
      dep = amounts[1];
      acv = amounts[2];
      // If dep > rcv, columns might be in different order — use first as total
      if (dep > rcv) { dep = 0; acv = rcv; }
    } else if (amounts.length === 2) {
      // Could be Total + % (where % is extracted as dollar) or Total + Dep
      // If second amount is < 100 and no decimal > 2 digits, it's likely a percentage
      if (amounts[1] <= 100) {
        dep = 0; acv = rcv; // second is percentage, ignore
      } else {
        acv = amounts[1]; // second is ACV
      }
    }

    return { name, xactRCV: rcv, xactACV: acv, xactDep: dep };
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line === "--- PAGE BREAK ---") continue;

    // ── Section detection (flexible matching) ──
    // Match various Xactimate section headers, allowing for word spacing issues
    const lineLC = line.toLowerCase().replace(/\s+/g, " ");
    if (/recap\s*by\s*category/i.test(lineLC) ||
        /category\s*summary/i.test(lineLC) ||
        /estimate\s*summary/i.test(lineLC) ||
        /recap\s*by\s*cat/i.test(lineLC) ||
        /summary\s*by\s*category/i.test(lineLC) ||
        /category\s*recap/i.test(lineLC)) {
      inSummary = true;
      pastSummary = false;
      continue;
    }

    // Detect when we've left the recap section (new major section header)
    if (inSummary && !line.includes("$") &&
        (/^recap\s*by\s*(room|level|area)/i.test(lineLC) ||
         /^recap\s*of\s*tax/i.test(lineLC) ||
         /^line\s*item\s*detail/i.test(lineLC) ||
         /^(sketch|diagram|scope\s*of\s*work)/i.test(lineLC))) {
      pastSummary = true;
    }

    // ── O&P subsection headers — skip but stay in summary ──
    if (inSummary && /^(o\s*&\s*p\s*items?|non-?\s*o\s*&\s*p\s*items?)\s*$/i.test(line)) continue;

    // Skip pure separator/header lines
    if (/^[-=─═]+$/.test(line)) continue;
    if (line.length < 4) continue;

    // If we're in the summary section and haven't left it
    if (inSummary && !pastSummary) {
      const parsed = parseCategoryLine(line);
      if (parsed && !seen.has(parsed.name)) {
        seen.add(parsed.name);
        categories.push(parsed);
      }
    }

    // Always collect fallback data (any line with category name + dollar amount)
    if (line.includes("$")) {
      const parsed = parseCategoryLine(line);
      if (parsed && !fallbackCats.find(c => c.name === parsed.name)) {
        fallbackCats.push(parsed);
      }
    }
  }

  // If the section marker was never found, use fallback parsing
  // Filter fallback to only lines that look like actual category summaries
  if (categories.length === 0 && fallbackCats.length > 0) {
    // Heuristic: skip items that are clearly line-item details (very long names,
    // contain measurements, or have too many dollar amounts)
    const filtered = fallbackCats.filter(c => {
      if (c.name.length > 60) return false; // likely a line-item description
      if (/\d+\s*(sf|lf|sy|ea|hr)\b/i.test(c.name)) return false; // has units
      if (/^\d/.test(c.name)) return false; // starts with a number
      return true;
    });
    return filtered.length > 0 ? filtered : fallbackCats.slice(0, 30);
  }

  return categories;
}

// Convert a stored invoice into a synthetic AR transaction for totals/lists
function invoiceToTx(inv) {
  return {
    id:          `__inv__${inv.id}`,
    type:        "invoice",
    date:        inv.date ? inv.date.split("T")[0] : today(),
    amount:      inv.total || 0,
    description: `${inv.number || "Invoice"} — ${inv.projName || ""}`,
    category:    "Billing",
    status:      inv.status === "paid" ? "paid" : inv.status === "void" ? "void" : "sent",
    _invId:      inv.id,
    _isGenerated:true,
  };
}

// Work-type categories (mirrors WT_META in portal)
const WORK_TYPES = [
  "Water Mitigation","Fire & Smoke","Mold Remediation","Storm Damage",
  "Reconstruction","Demo","Contents","Equipment","Labor","Other"
];

// Transaction types
const TX_TYPES = {
  invoice:    { label:"Invoice",        color:"var(--blue)",   bg:"rgba(91,163,245,.12)"  },
  payment_in: { label:"Payment Received",color:"var(--green)", bg:"rgba(26,217,138,.12)"  },
  bill:       { label:"Vendor Bill",    color:"var(--amber)",  bg:"rgba(232,156,24,.12)"  },
  payment_out:{ label:"Payment Made",   color:"var(--purple)", bg:"rgba(167,139,250,.12)" },
  expense:    { label:"CC / Expense",   color:"var(--acc)",    bg:"rgba(228,53,49,.09)"   },
  payroll:    { label:"Payroll",        color:"var(--teal)",   bg:"rgba(34,211,238,.1)"   },
};

const TX_SIDE = {
  invoice:    "ar",
  payment_in: "ar",
  bill:       "ap",
  payment_out:"ap",
  expense:    "cost",
  payroll:    "cost",
};

// Financial health 4-level system
function computeHealth(data, proj) {
  if (!data || !data.budgets) return null;
  const totBudget = Object.values(data.budgets).reduce((s,b)=>s+(b.budgeted||0),0);
  if (totBudget <= 0) return null;

  const txs = data.transactions || [];
  const totalCosts = txs.filter(t=>TX_SIDE[t.type]==="cost"||TX_SIDE[t.type]==="ap")
                        .reduce((s,t)=>s+(t.amount||0),0);
  const totalInvoiced = txs.filter(t=>t.type==="invoice").reduce((s,t)=>s+(t.amount||0),0);
  const collected    = txs.filter(t=>t.type==="payment_in").reduce((s,t)=>s+(t.amount||0),0);
  const arBalance    = totalInvoiced - collected;

  const targetMarginAvg = Object.values(data.budgets).reduce((s,b,_,a)=>s+(b.targetMargin||30)/a.length,0);
  const targetCostCeiling = totalInvoiced * (1 - targetMarginAvg/100);
  const pressure = targetCostCeiling > 0 ? totalCosts / targetCostCeiling : totalCosts > 0 ? 99 : 0;

  let status, label, color;
  if (pressure >= 1.0 || totalCosts > totBudget) {
    status = "critical"; label = "● Critical"; color = "var(--acc)";
  } else if (pressure >= 0.85 || arBalance > totBudget * 0.6) {
    status = "warning";  label = "⚠ At Risk";  color = "var(--amber)";
  } else if (pressure >= 0.70) {
    status = "watch";    label = "⚡ Watch";    color = "var(--blue)";
  } else {
    status = "ok";       label = "✓ Healthy";  color = "var(--green)";
  }

  const grossMargin = totalInvoiced > 0 ? ((totalInvoiced - totalCosts) / totalInvoiced * 100) : 0;
  return { status, label, color, pressure, grossMargin, totalCosts, totalInvoiced, arBalance, totBudget };
}

/* ─────────────────────────────────────────────────────────────────────────────
   MINI COMPONENTS
───────────────────────────────────────────────────────────────────────────── */
function HealthPill({ status, label, color, sm }) {
  if (!status) return null;
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:4,
      background:`${color}18`,color,border:`1px solid ${color}40`,
      borderRadius:20,padding:sm?"1px 7px":"3px 9px",
      fontSize:sm?9:10,fontFamily:"var(--mono)",fontWeight:700,
      whiteSpace:"nowrap",flexShrink:0,
    }}>{label}</span>
  );
}

function MiniBar({ value, max, color, height=5 }) {
  const p = Math.min(100, Math.max(0, max>0 ? (value/max)*100 : 0));
  const col = color || (p>=85?"var(--acc)":p>=60?"var(--amber)":"var(--green)");
  return (
    <div style={{background:"rgba(255,255,255,.07)",borderRadius:9,overflow:"hidden",height,flex:1}}>
      <div style={{width:`${p}%`,height:"100%",background:col,borderRadius:9,transition:"width .3s"}}/>
    </div>
  );
}

function KpiCard({ label, value, sub, color, warn }) {
  return (
    <div className="kpi" style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9,
      ...(warn?{borderLeft:`3px solid ${color}`}:{})}}>
      <div className="kpi-val" style={{color:color||"var(--t1)"}}>{value}</div>
      <div className="kpi-lbl">{label}</div>
      {sub && <div style={{fontSize:9,color:"var(--t3)",marginTop:2,fontFamily:"var(--mono)"}}>{sub}</div>}
    </div>
  );
}

function SectionHead({ children, action }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
      <div className="sec" style={{marginBottom:0}}>{children}</div>
      {action}
    </div>
  );
}

function Pill({ children, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      border:`1px solid ${active && color ? color : "var(--br)"}`,
      borderRadius:20,padding:"3px 11px",fontSize:10,cursor:"pointer",fontFamily:"var(--ui)",
      background: active ? (color ? `${color}18` : "var(--acc-lo)") : "transparent",
      color: active ? (color||"var(--acc)") : "var(--t2)",fontWeight:active?700:400,
      transition:"all .12s",
    }}>{children}</button>
  );
}

function EmptyState({ icon, msg }) {
  return (
    <div style={{textAlign:"center",padding:"36px 0",color:"var(--t3)"}}>
      <div style={{fontSize:28,marginBottom:8}}>{icon}</div>
      <div style={{fontSize:12,fontFamily:"var(--mono)"}}>{msg}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FINANCIAL HEALTH BADGE  (exported — used on portfolio cards)
───────────────────────────────────────────────────────────────────────────── */
export function FinancialHealthBadge({ projId, companyId }) {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    if (!projId || !companyId) return;
    const ref = doc(getDb(), "companies", companyId, "jobFinancials", projId);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) setHealth(computeHealth(snap.data()));
    });
    return unsub;
  }, [projId, companyId]);
  if (!health || health.status === "ok") return null;
  return <HealthPill {...health} sm/>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADD TRANSACTION MODAL  (with receipt photo upload for cost-side entries)
───────────────────────────────────────────────────────────────────────────── */
function AddTransactionModal({ onSave, onClose, worktypes=[], defaultType, budgetCategories=[] }) {
  const [f, setF] = useState({
    type: defaultType || "invoice", date:today(), amount:"", description:"",
    category:"", budgetCatId:"", vendor:"", vendorId:"", status:"open", notes:"", receipts:[]
  });
  const u = (k,v) => setF(p=>({...p,[k]:v}));
  const wtOptions = worktypes.map(w=>w.type||w).filter(Boolean);
  const isCost = ["bill","payment_out","expense","payroll"].includes(f.type);
  const activeBudgetCats = budgetCategories.filter(c=>c.active);
  const vendorList = lsLoadVendors().filter(v => v.status !== "inactive");

  const handleReceipts = (e) => {
    const files = Array.from(e.target.files);
    Promise.all(files.map(file => new Promise(res => {
      const reader = new FileReader();
      reader.onload = ev => res({ name: file.name, dataUrl: ev.target.result, type: file.type });
      reader.readAsDataURL(file);
    }))).then(results => u("receipts", [...(f.receipts||[]), ...results]));
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal anim" style={{maxWidth:520}}>
        <div className="modal-hd">
          <div className="modal-ttl">Add Financial Entry</div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Type selector */}
          <div style={{marginBottom:14}}>
            <label className="lbl">Entry Type</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:5}}>
              {Object.entries(TX_TYPES).map(([k,v])=>(
                <Pill key={k} active={f.type===k} color={v.color} onClick={()=>u("type",k)}>
                  {v.label}
                </Pill>
              ))}
            </div>
          </div>

          <div className="g2" style={{gap:9,marginBottom:9}}>
            <div>
              <label className="lbl">Date</label>
              <input type="date" className="inp" value={f.date} onChange={e=>u("date",e.target.value)}/>
            </div>
            <div>
              <label className="lbl">Amount ($)</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"var(--t3)",fontSize:13}}>$</span>
                <input type="number" className="inp" value={f.amount} onChange={e=>u("amount",e.target.value)} style={{paddingLeft:20}} placeholder="0.00"/>
              </div>
            </div>
          </div>

          <div style={{marginBottom:9}}>
            <label className="lbl">Description</label>
            <input className="inp" value={f.description} onChange={e=>u("description",e.target.value)} placeholder={
              f.type==="invoice"?"Invoice #…":f.type==="bill"?"Bill from vendor…":"Description…"
            }/>
          </div>

          <div className="g2" style={{gap:9,marginBottom:9}}>
            <div>
              <label className="lbl">Work Type</label>
              <select className="sel" value={f.category} onChange={e=>u("category",e.target.value)}>
                <option value="">— General —</option>
                {(wtOptions.length ? wtOptions : WORK_TYPES).map(wt=>(
                  <option key={wt}>{wt}</option>
                ))}
              </select>
            </div>
            {(f.type==="bill"||f.type==="payment_out"||f.type==="expense") && (
              <div>
                <label className="lbl">Vendor / Payee</label>
                {vendorList.length > 0 ? (
                  <>
                    <select className="sel" style={{marginBottom:5}}
                      value={f.vendorId}
                      onChange={e=>{
                        const vRec = vendorList.find(v=>v.id===e.target.value);
                        u("vendorId", e.target.value);
                        if (vRec) {
                          const name = [vRec.firstName, vRec.lastName].filter(Boolean).join(" ") || vRec.company || "";
                          u("vendor", name);
                        } else if (!e.target.value) {
                          // cleared — don't wipe manual text
                        }
                      }}>
                      <option value="">— Select from registry or type below —</option>
                      {vendorList.map(v=>{
                        const name = [v.firstName,v.lastName].filter(Boolean).join(" ")||(v.company||"");
                        return <option key={v.id} value={v.id}>{name}{v.company&&name!==v.company?` (${v.company})`:""}</option>;
                      })}
                    </select>
                    <input className="inp" value={f.vendor} onChange={e=>{u("vendor",e.target.value);u("vendorId","");}}
                      placeholder="Or type vendor name manually…" style={{fontSize:11}}/>
                  </>
                ) : (
                  <input className="inp" value={f.vendor} onChange={e=>u("vendor",e.target.value)} placeholder="Company or person…"/>
                )}
              </div>
            )}
            {(f.type==="invoice"||f.type==="bill") && (
              <div>
                <label className="lbl">Status</label>
                <select className="sel" value={f.status} onChange={e=>u("status",e.target.value)}>
                  {f.type==="invoice"
                    ? ["draft","sent","partial","paid"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)
                    : ["received","approved","scheduled","paid"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)
                  }
                </select>
              </div>
            )}
          </div>

          {/* Budget category picker — shown for all cost-side entries if budget cats exist */}
          {isCost && activeBudgetCats.length > 0 && (
            <div style={{marginBottom:12}}>
              <label className="lbl">Budget Category</label>
              <select className="sel" value={f.budgetCatId} onChange={e=>u("budgetCatId",e.target.value)}>
                <option value="">— Unallocated —</option>
                {activeBudgetCats.map(c=>(
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div style={{fontSize:9,color:"var(--t3)",marginTop:3}}>Assigns this expense to a budget category for tracking.</div>
            </div>
          )}

          {/* Receipt / photo upload — for cost-side entries */}
          {isCost && (
            <div style={{marginBottom:12}}>
              <label className="lbl">Receipts / Photos</label>
              <label style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",
                background:"var(--s3)",border:"1px dashed var(--br-hi)",borderRadius:8,cursor:"pointer",
                fontSize:11,color:"var(--t2)",transition:"border-color .12s"}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{color:"var(--blue)",flexShrink:0}}>
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
                <span>Upload receipt photos or PDFs</span>
                <input type="file" accept="image/*,application/pdf" multiple style={{display:"none"}} onChange={handleReceipts}/>
              </label>
              {(f.receipts||[]).length > 0 && (
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                  {f.receipts.map((r,i)=>(
                    <div key={i} style={{position:"relative",borderRadius:7,overflow:"hidden",
                      border:"1px solid var(--br)",background:"var(--s3)"}}>
                      {r.type?.startsWith("image/")
                        ? <img src={r.dataUrl} alt={r.name} style={{width:64,height:64,objectFit:"cover",display:"block"}}/>
                        : <div style={{width:64,height:64,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3}}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{color:"var(--acc)"}}><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5z"/></svg>
                            <span style={{fontSize:8,color:"var(--t3)"}}>PDF</span>
                          </div>
                      }
                      <button onClick={()=>u("receipts",f.receipts.filter((_,j)=>j!==i))}
                        style={{position:"absolute",top:2,right:2,width:16,height:16,borderRadius:"50%",
                          background:"rgba(0,0,0,.6)",border:"none",color:"#fff",fontSize:9,cursor:"pointer",
                          display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{marginBottom:14}}>
            <label className="lbl">Notes (optional)</label>
            <textarea className="txa" value={f.notes} onChange={e=>u("notes",e.target.value)} style={{minHeight:44}}/>
          </div>

          <div style={{display:"flex",justifyContent:"flex-end",gap:7}}>
            <button className="btn btn-ghost btn-xs" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-xs" onClick={()=>{
              if (!f.amount||!f.description) return;
              onSave({...f, id:fuid(), amount:parseFloat(f.amount)||0, createdAt:new Date().toISOString()});
              onClose();
            }}>Save Entry</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   INVOICE PREVIEW MODAL  (full printable view of a generated invoice)
───────────────────────────────────────────────────────────────────────────── */
function InvoicePreviewModal({ inv, onClose }) {
  if (!inv) return null;
  const co   = inv.company || {};
  const adj  = inv.adjustments || {};
  const fmt  = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n||0);
  const fmtDate = d => { try { return new Date(d).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}); } catch { return d||""; }};

  const STATUS_COLORS = {
    unpaid:  { label:"UNPAID",   color:"var(--amber)" },
    paid:    { label:"PAID",     color:"var(--green)" },
    partial: { label:"PARTIAL",  color:"var(--blue)"  },
    void:    { label:"VOID",     color:"var(--t3)"    },
  };
  const sc = STATUS_COLORS[inv.status] || STATUS_COLORS.unpaid;

  const isComplex = inv.invoiceMode === "complex";
  const hasRooms  = inv.hasRooms && isComplex;

  // Room groupings
  const roomGroups = useMemo(() => {
    if (!hasRooms) return null;
    const groups = {};
    (inv.lineItems||[]).forEach(li => {
      const room = li.room || "General";
      if (!groups[room]) groups[room] = [];
      groups[room].push(li);
    });
    return groups;
  }, [inv, hasRooms]);

  const lineTotal = (inv.lineItems||[]).reduce((s,i)=>s+(i.qty||0)*(i.price||0),0);

  const TotalsBlock = () => (
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:20}}>
      <div style={{minWidth:260,background:"var(--s3)",borderRadius:9,border:"1px solid var(--br)",padding:"12px 16px"}}>
        {[
          ["Subtotal",                     lineTotal,          "var(--t2)", false],
          ...(adj.overhead>0 ? [[`Overhead / Profit (${adj.overhead}%)`, inv.overheadAmt||0, "var(--amber)", false]] : []),
          ...((adj.surcharges||[]).map(sc=>[`${sc.label} (${sc.pct}%)`, lineTotal*(sc.pct/100), "var(--amber)", false])),
          ...(adj.discount>0 ? [[`Discount`,  -(inv.discountAmt||0), "var(--acc)", false]] : []),
          ...(adj.taxRate>0  ? [[`${adj.taxName||"Tax"} (${adj.taxRate}%)`, inv.taxAmt||0, "var(--t2)", false]] : []),
        ].map(([l,v,c])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid var(--br)"}}>
            <span style={{fontSize:10,color:c}}>{l}</span>
            <span className="mono" style={{fontSize:11,color:c,fontWeight:600}}>{v<0?"-":""}{fmt(Math.abs(v))}</span>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",padding:"9px 0 2px",marginTop:4}}>
          <span style={{fontSize:13,fontWeight:800,color:"var(--t1)"}}>TOTAL DUE</span>
          <span className="mono" style={{fontSize:18,fontWeight:800,color:"var(--green)"}}>{fmt(inv.total||0)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()} style={{alignItems:"flex-start",paddingTop:32,overflowY:"auto"}}>
      <div className="modal anim modal-lg" style={{maxWidth:720,width:"100%"}}>
        <div className="modal-hd" style={{position:"sticky",top:0,zIndex:10,background:"var(--s2)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div className="modal-ttl">{inv.number || "Invoice"}</div>
            {isComplex && (
              <span style={{fontSize:9,background:"rgba(139,92,246,.15)",color:"var(--purple)",borderRadius:3,padding:"1px 6px",fontFamily:"var(--mono)"}}>
                COMPLEX{hasRooms?" · BY ROOM":""}
              </span>
            )}
            {!isComplex && (
              <span style={{fontSize:9,background:"rgba(91,163,245,.15)",color:"var(--blue)",borderRadius:3,padding:"1px 6px",fontFamily:"var(--mono)"}}>
                SIMPLE
              </span>
            )}
          </div>
          <div style={{display:"flex",gap:7,alignItems:"center"}}>
            <span style={{fontSize:9,fontWeight:700,fontFamily:"var(--mono)",color:sc.color,
              background:`${sc.color}18`,border:`1px solid ${sc.color}40`,borderRadius:4,padding:"2px 8px"}}>
              {sc.label}
            </span>
            <button className="btn btn-secondary btn-xs" onClick={()=>window.print()}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{marginRight:4}}><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
              Print
            </button>
            <button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body" style={{padding:28}}>
          {/* Header row */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,flexWrap:"wrap",gap:16}}>
            <div>
              {co.logo && <img src={co.logo} alt="" style={{height:48,objectFit:"contain",marginBottom:10,display:"block"}}/>}
              <div style={{fontWeight:800,fontSize:15,color:"var(--t1)"}}>{co.name||"Your Company"}</div>
              <div style={{fontSize:11,color:"var(--t3)",marginTop:3,lineHeight:1.75}}>
                {[co.address,co.city,co.state,co.zip].filter(Boolean).join(", ")}
                {co.phone && <><br/>{co.phone}</>}
                {co.email && <><br/>{co.email}</>}
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontWeight:800,fontSize:22,color:"var(--t1)",fontFamily:"var(--mono)",letterSpacing:-0.5}}>{inv.number||"INVOICE"}</div>
              <div style={{fontSize:11,color:"var(--t3)",marginTop:6,lineHeight:2}}>
                <div><span style={{color:"var(--t2)",fontWeight:600}}>Date:</span> {fmtDate(inv.date)}</div>
                <div><span style={{color:"var(--t2)",fontWeight:600}}>Due:</span> {fmtDate(inv.dueDate)}</div>
              </div>
              {inv.budgetCatName && (
                <div style={{marginTop:6,fontSize:9,background:"rgba(91,163,245,.1)",color:"var(--blue)",
                  borderRadius:5,padding:"2px 8px",display:"inline-block",fontFamily:"var(--mono)"}}>
                  Budget: {inv.budgetCatName}
                </div>
              )}
            </div>
          </div>

          {/* Bill to */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
            <div style={{padding:"12px 14px",background:"var(--s3)",borderRadius:9,border:"1px solid var(--br)"}}>
              <div className="mono" style={{fontSize:9,color:"var(--t3)",marginBottom:5,letterSpacing:.5}}>BILL TO</div>
              <div style={{fontWeight:700,fontSize:13,color:"var(--t1)"}}>{inv.clientName||"Client"}</div>
              <div style={{fontSize:11,color:"var(--t3)",marginTop:3,lineHeight:1.7}}>{inv.projAddress||""}</div>
            </div>
            <div style={{padding:"12px 14px",background:"var(--s3)",borderRadius:9,border:"1px solid var(--br)"}}>
              <div className="mono" style={{fontSize:9,color:"var(--t3)",marginBottom:5,letterSpacing:.5}}>PROJECT</div>
              <div style={{fontWeight:700,fontSize:13,color:"var(--t1)"}}>{inv.projName||""}</div>
              {inv.summary && <div style={{fontSize:10,color:"var(--t2)",marginTop:4,lineHeight:1.65}}>{inv.summary}</div>}
            </div>
          </div>

          {/* ── SIMPLE mode: just show total due ── */}
          {!isComplex && (
            <>
              <div style={{padding:"28px 20px",background:"var(--s3)",borderRadius:12,border:"1px solid var(--br)",
                textAlign:"center",marginBottom:20}}>
                <div className="mono" style={{fontSize:10,color:"var(--t3)",letterSpacing:1,marginBottom:8}}>TOTAL AMOUNT DUE</div>
                <div className="mono" style={{fontSize:36,fontWeight:800,color:"var(--green)"}}>{fmt(inv.total||0)}</div>
                <div style={{fontSize:11,color:"var(--t3)",marginTop:8}}>
                  Due by {fmtDate(inv.dueDate)}
                </div>
              </div>
              {inv.summary && (
                <div style={{padding:"10px 14px",background:"var(--s3)",borderRadius:9,border:"1px solid var(--br)",marginBottom:20}}>
                  <div className="mono" style={{fontSize:9,color:"var(--t3)",marginBottom:4}}>SCOPE SUMMARY</div>
                  <div style={{fontSize:11,color:"var(--t2)",lineHeight:1.7}}>{inv.summary}</div>
                </div>
              )}
            </>
          )}

          {/* ── COMPLEX mode: flat line items ── */}
          {isComplex && !hasRooms && (
            <div style={{marginBottom:20}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 60px 60px 80px 80px",gap:0,
                background:"var(--s3)",borderRadius:"7px 7px 0 0",padding:"7px 10px",
                borderBottom:"2px solid var(--br-hi)"}}>
                {["Description","Unit","Qty","Unit Price","Total"].map((h,i)=>(
                  <div key={h} className="mono" style={{fontSize:9,color:"var(--t3)",textAlign:i>1?"right":"left"}}>{h}</div>
                ))}
              </div>
              {(inv.lineItems||[]).map((it,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 60px 60px 80px 80px",gap:0,
                  padding:"7px 10px",borderBottom:"1px solid var(--br)",
                  background:i%2===0?"transparent":"rgba(255,255,255,.015)"}}>
                  <div style={{fontSize:11,color:"var(--t1)"}}>{it.desc}</div>
                  <div className="mono" style={{fontSize:10,color:"var(--t3)",textAlign:"center"}}>{it.unit}</div>
                  <div className="mono" style={{fontSize:10,color:"var(--t2)",textAlign:"right"}}>{it.qty}</div>
                  <div className="mono" style={{fontSize:10,color:"var(--t2)",textAlign:"right"}}>{fmt(it.price)}</div>
                  <div className="mono" style={{fontSize:11,fontWeight:700,color:"var(--t1)",textAlign:"right"}}>{fmt((it.qty||0)*(it.price||0))}</div>
                </div>
              ))}
              {(inv.lineItems||[]).length===0 && (
                <div style={{padding:"16px 10px",fontSize:11,color:"var(--t3)",textAlign:"center",border:"1px solid var(--br)",borderTop:"none"}}>No line items</div>
              )}
            </div>
          )}

          {/* ── COMPLEX + ROOMS mode: grouped by room ── */}
          {isComplex && hasRooms && (
            <div style={{marginBottom:20}}>
              {Object.entries(roomGroups||{}).map(([room,items])=>(
                <div key={room} style={{marginBottom:14,borderRadius:9,border:"1px solid var(--br)",overflow:"hidden"}}>
                  <div style={{background:"rgba(91,163,245,.08)",padding:"7px 11px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid var(--br)"}}>
                    <span style={{fontWeight:700,fontSize:12,color:"var(--blue)"}}>🏠 {room}</span>
                    <span className="mono" style={{fontSize:10,color:"var(--t2)",fontWeight:700}}>
                      {fmt(items.reduce((s,li)=>s+li.qty*li.price,0))}
                    </span>
                  </div>
                  <div style={{background:"var(--s3)",padding:"3px 11px 3px",display:"grid",gridTemplateColumns:"1fr 60px 60px 80px 80px",gap:0,borderBottom:"1px solid var(--br)"}}>
                    {["Description","Unit","Qty","Unit Price","Total"].map((h,i)=>(
                      <div key={h} className="mono" style={{fontSize:8,color:"var(--t3)",textAlign:i>1?"right":"left",padding:"3px 0"}}>{h}</div>
                    ))}
                  </div>
                  {items.map((it,i)=>(
                    <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 60px 60px 80px 80px",gap:0,
                      padding:"6px 11px",borderBottom:i<items.length-1?"1px solid var(--br)":"none",
                      background:i%2===0?"transparent":"rgba(255,255,255,.015)"}}>
                      <div style={{fontSize:11,color:"var(--t1)"}}>{it.desc}</div>
                      <div className="mono" style={{fontSize:10,color:"var(--t3)",textAlign:"center"}}>{it.unit}</div>
                      <div className="mono" style={{fontSize:10,color:"var(--t2)",textAlign:"right"}}>{it.qty}</div>
                      <div className="mono" style={{fontSize:10,color:"var(--t2)",textAlign:"right"}}>{fmt(it.price)}</div>
                      <div className="mono" style={{fontSize:11,fontWeight:700,color:"var(--t1)",textAlign:"right"}}>{fmt((it.qty||0)*(it.price||0))}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Totals block (always shown for complex) */}
          {isComplex && <TotalsBlock/>}

          {/* Terms */}
          {inv.terms && (
            <div style={{padding:"11px 14px",background:"var(--s3)",borderRadius:9,border:"1px solid var(--br)"}}>
              <div className="mono" style={{fontSize:9,color:"var(--t3)",marginBottom:6,letterSpacing:.5}}>TERMS &amp; CONDITIONS</div>
              <div style={{fontSize:10,color:"var(--t3)",lineHeight:1.75}}>{inv.terms}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   BUDGET BUILDER — per work type
───────────────────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
   XACTIMATE IMPORT MODAL
   Shows parsed Xactimate categories. User can:
   - Match each to an existing project category OR create a new one
   - Set the budget amount from RCV, ACV, or custom
   - Toggle categories on/off
───────────────────────────────────────────────────────────────────────────── */
function XactimateImportModal({ parsedCats=[], existingCats=[], filename, onApply, onClose }) {
  // For each parsed category: { name, xactRCV, xactACV, xactDep }
  // Build initial row state: try to match by name to existing
  const [rows, setRows] = useState(() => parsedCats.map(pc => {
    const match = existingCats.find(e => e.name.toLowerCase() === pc.name.toLowerCase());
    return {
      id:       match ? match.id : `xc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name:     pc.name,
      xactRCV:  pc.xactRCV,
      xactACV:  pc.xactACV,
      xactDep:  pc.xactDep,
      budgeted: pc.xactRCV,   // default to RCV
      source:   "rcv",        // rcv | acv | custom
      color:    match?.color || "#5ba3f5",
      active:   true,
      isNew:    !match,
    };
  }));

  const updRow = (i, k, v) => setRows(rs => rs.map((r,idx) => idx===i ? {...r,[k]:v} : r));

  const totRCV = rows.filter(r=>r.active).reduce((s,r)=>s+(r.xactRCV||0),0);
  const totBudgeted = rows.filter(r=>r.active).reduce((s,r)=>s+(r.budgeted||0),0);

  const handleApply = () => {
    const cats = rows.filter(r=>r.active).map(r => ({
      id:       r.id,
      name:     r.name,
      color:    r.color,
      budgeted: r.budgeted,
      source:   "xactimate",
      xactRCV:  r.xactRCV,
      xactACV:  r.xactACV,
      xactDep:  r.xactDep,
      active:   true,
    }));
    onApply(cats, filename);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"var(--s1)",border:"1px solid var(--br)",borderRadius:14,width:"100%",maxWidth:780,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
        {/* Header */}
        <div style={{padding:"16px 20px",borderBottom:"1px solid var(--br)",display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:700,color:"var(--t1)"}}>Import Xactimate Estimate</div>
            <div style={{fontSize:11,color:"var(--t3)",marginTop:2,fontFamily:"var(--mono)"}}>{filename}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:"var(--t3)"}}>Total RCV</div>
            <div style={{fontSize:15,fontWeight:800,color:"var(--green)",fontFamily:"var(--mono)"}}>{f$(totRCV)}</div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose} style={{marginLeft:8}}>✕</button>
        </div>

        {/* Info banner */}
        <div style={{padding:"10px 20px",background:"rgba(91,163,245,.07)",borderBottom:"1px solid var(--br)",fontSize:11,color:"var(--t2)"}}>
          {rows.length} categories found. Choose which to import and whether to budget by <strong>RCV</strong>, <strong>ACV</strong>, or a custom amount. These will be added to this project's budget.
        </div>

        {/* Column headers */}
        <div style={{display:"grid",gridTemplateColumns:"24px 1fr 90px 90px 110px 32px",gap:8,padding:"8px 20px",borderBottom:"1px solid var(--br)"}}>
          {["","Category","RCV","ACV","Budget As",""].map((h,i)=>(
            <div key={i} style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)",textAlign:i>=2?"right":"left"}}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        <div style={{overflowY:"auto",flex:1,padding:"4px 0"}}>
          {rows.map((r,i) => (
            <div key={r.id} style={{display:"grid",gridTemplateColumns:"24px 1fr 90px 90px 110px 32px",gap:8,
              padding:"8px 20px",borderBottom:"1px solid var(--br)",alignItems:"center",
              opacity:r.active?1:0.4,background:r.active?"transparent":"var(--s2)"}}>
              {/* Toggle */}
              <input type="checkbox" checked={r.active} onChange={e=>updRow(i,"active",e.target.checked)}
                style={{width:14,height:14,accentColor:"var(--blue)",cursor:"pointer"}}/>
              {/* Name + color */}
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="color" value={r.color} onChange={e=>updRow(i,"color",e.target.value)}
                  style={{width:18,height:18,border:"none",borderRadius:4,cursor:"pointer",padding:0,background:"none"}}/>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{r.name}</div>
                  {r.isNew && <div style={{fontSize:9,color:"var(--blue)",fontFamily:"var(--mono)"}}>NEW CATEGORY</div>}
                </div>
              </div>
              {/* RCV */}
              <div style={{textAlign:"right",fontFamily:"var(--mono)",fontSize:11,color:"var(--green)"}}>{f$(r.xactRCV)}</div>
              {/* ACV */}
              <div style={{textAlign:"right",fontFamily:"var(--mono)",fontSize:11,color:"var(--amber)"}}>
                {r.xactDep>0 ? f$(r.xactACV) : <span style={{color:"var(--t3)"}}>—</span>}
              </div>
              {/* Budget dropdown */}
              <div>
                <select className="sel" value={r.source} style={{fontSize:10,height:26}}
                  onChange={e=>{
                    const src = e.target.value;
                    updRow(i,"source",src);
                    if (src==="rcv") updRow(i,"budgeted",r.xactRCV);
                    else if (src==="acv") updRow(i,"budgeted",r.xactACV);
                  }}>
                  <option value="rcv">RCV {f$(r.xactRCV)}</option>
                  {r.xactDep>0 && <option value="acv">ACV {f$(r.xactACV)}</option>}
                  <option value="custom">Custom…</option>
                </select>
                {r.source==="custom" && (
                  <input type="number" className="inp" value={r.budgeted} min={0} style={{marginTop:3,height:24,fontSize:10}}
                    onChange={e=>updRow(i,"budgeted",parseFloat(e.target.value)||0)}/>
                )}
              </div>
              {/* Dep badge */}
              <div>
                {r.xactDep>0 && (
                  <div style={{fontSize:8,color:"var(--acc)",background:"rgba(239,68,68,.12)",borderRadius:3,padding:"2px 4px",fontFamily:"var(--mono)",textAlign:"center"}}>DEP</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{padding:"14px 20px",borderTop:"1px solid var(--br)",display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1,fontSize:11,color:"var(--t2)"}}>
            <span style={{fontWeight:700,color:"var(--t1)"}}>{rows.filter(r=>r.active).length}</span> categories · Budget total: <span style={{fontFamily:"var(--mono)",color:"var(--green)",fontWeight:700}}>{f$(totBudgeted)}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleApply}>Apply to Budget</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   XACTIMATE BUDGET TAB
   Full replacement for BudgetBuilder. Supports:
   - Upload & parse Xactimate PDF (Recap by Category)
   - Apply global category templates from Settings
   - Manual add/edit categories
   - Per-category progress bars vs actual AP spend
   - Budgeted amount editing
───────────────────────────────────────────────────────────────────────────── */
function XactimateBudgetTab({ proj, transactions=[], budgetData, onBudgetChange }) {
  const [importModal, setImportModal] = useState(null); // { parsedCats, filename }
  const [parsing,     setParsing]     = useState(false);
  const [parseErr,    setParseErr]    = useState("");
  const [editCatId,   setEditCatId]   = useState(null);
  const fileRef = useRef();

  const categories = budgetData?.categories || [];
  const xactimate  = budgetData?.xactimate  || null;

  // Compute actual spend per category from AP/cost transactions
  const actuals = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (t._isGenerated || t.auto) return;
      if (TX_SIDE[t.type]!=="cost" && TX_SIDE[t.type]!=="ap") return;
      const cat = t.budgetCatId || t.category || "__uncat__";
      map[cat] = (map[cat] || 0) + (t.amount || 0);
    });
    return map;
  }, [transactions]);

  const totBudgeted = categories.filter(c=>c.active).reduce((s,c)=>s+(c.budgeted||0),0);
  const totActual   = categories.filter(c=>c.active).reduce((s,c)=>s+(actuals[c.id]||actuals[c.name]||0),0);
  const uncatActual = actuals["__uncat__"] || 0;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.name.toLowerCase().endsWith(".pdf")) { setParseErr("Please upload a PDF file."); return; }
    setParsing(true); setParseErr("");
    try {
      const parsed = await parseXactimatePdf(file);
      if (!parsed.length) {
        setParseErr("No categories found. Make sure the PDF is an Xactimate estimate with category data and dollar amounts. Supported formats include Recap by Category, Category Summary, and line-item estimate PDFs.");
      } else {
        setImportModal({ parsedCats: parsed, filename: file.name });
      }
    } catch(err) {
      setParseErr("Failed to parse PDF: " + err.message);
    }
    setParsing(false);
  };

  const applyTemplate = () => {
    const templates = lsGetBudgetTemplates();
    // Filter to templates applicable to this project's work types (or all if no workTypes set)
    const projWT = (proj.worktypes||[]).map(w=>(w.type||w).toLowerCase());
    const relevant = templates.filter(t => {
      if (!t.active) return false;
      if (!t.workTypes?.length) return true; // universal
      return t.workTypes.some(wt => projWT.includes(wt.toLowerCase()));
    });
    if (!relevant.length) {
      setParseErr("No budget category templates defined yet. Add them in Settings → Budget Categories.");
      return;
    }
    const newCats = relevant.map(t => ({
      id:       t.id,
      name:     t.name,
      color:    t.color,
      budgeted: 0,
      source:   "manual",
      active:   true,
    }));
    const updated = { ...budgetData, categories: newCats };
    onBudgetChange(updated);
  };

  const handleXactApply = (cats, filename) => {
    // Merge with existing: update matching by id, append new
    const existing = categories.filter(c => !cats.find(nc => nc.id===c.id));
    const merged = [...cats, ...existing];
    const updated = {
      ...budgetData,
      categories: merged,
      xactimate: { filename, importDate: today() },
    };
    onBudgetChange(updated);
    setImportModal(null);
  };

  const updCat = (id, patch) => {
    const cats = categories.map(c => c.id===id ? {...c,...patch} : c);
    onBudgetChange({ ...budgetData, categories: cats });
  };

  const addManual = () => {
    const id = `mc-${Date.now()}`;
    const cats = [...categories, { id, name:"New Category", color:"#5ba3f5", budgeted:0, source:"manual", active:true }];
    onBudgetChange({ ...budgetData, categories: cats });
    setEditCatId(id);
  };

  const removeCat = (id) => {
    onBudgetChange({ ...budgetData, categories: categories.filter(c=>c.id!==id) });
  };

  return (
    <div>
      {/* Action bar */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>Budget Categories</div>
          {xactimate && (
            <div style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)",marginTop:2}}>
              Xactimate: {xactimate.filename} · imported {xactimate.importDate}
            </div>
          )}
        </div>
        <button className="btn btn-ghost btn-xs" onClick={applyTemplate}>
          📋 Apply Template
        </button>
        <button className="btn btn-ghost btn-xs" style={{color:"var(--blue)"}}
          onClick={()=>fileRef.current?.click()} disabled={parsing}>
          {parsing ? "⏳ Parsing…" : "📄 Import Xactimate PDF"}
        </button>
        <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}} onChange={handleFile}/>
        <button className="btn btn-primary btn-xs" onClick={addManual}>+ Add Category</button>
      </div>

      {parseErr && (
        <div style={{padding:"9px 13px",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",
          borderRadius:8,fontSize:11,color:"var(--acc)",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
          ⚠ {parseErr}
          <button style={{marginLeft:"auto",background:"none",border:"none",color:"var(--t3)",cursor:"pointer"}} onClick={()=>setParseErr("")}>✕</button>
        </div>
      )}

      {/* KPI row */}
      {categories.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginBottom:16}}>
          {[
            ["Total Budgeted", f$(totBudgeted), "var(--t1)"],
            ["Total Spent",    f$(totActual),   totActual>totBudgeted?"var(--acc)":"var(--amber)"],
            ["Remaining",      f$(totBudgeted-totActual), totBudgeted-totActual<0?"var(--acc)":"var(--green)"],
            ["Unallocated Spend", f$(uncatActual), uncatActual>0?"var(--amber)":"var(--t3)"],
          ].map(([l,v,c])=>(
            <div key={l} className="kpi" style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9}}>
              <div className="kpi-val" style={{color:c}}>{v}</div>
              <div className="kpi-lbl">{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Category list */}
      {categories.length===0 ? (
        <div style={{padding:"32px 20px",textAlign:"center",background:"var(--s2)",borderRadius:12,border:"1px dashed var(--br)"}}>
          <div style={{fontSize:13,color:"var(--t2)",marginBottom:8}}>No budget categories yet</div>
          <div style={{fontSize:11,color:"var(--t3)",marginBottom:16}}>Import an Xactimate PDF, apply a template from Settings, or add categories manually.</div>
          <div style={{display:"flex",justifyContent:"center",gap:10}}>
            <button className="btn btn-secondary btn-sm" onClick={()=>fileRef.current?.click()}>📄 Import Xactimate PDF</button>
            <button className="btn btn-ghost btn-sm" onClick={applyTemplate}>📋 Apply Template</button>
          </div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {categories.map(cat => {
            const actual  = actuals[cat.id] || actuals[cat.name] || 0;
            const p       = cat.budgeted > 0 ? Math.min((actual/cat.budgeted)*100, 999) : (actual>0?100:0);
            const barColor= p>=100?"var(--acc)":p>=80?"var(--amber)":cat.color||"var(--blue)";
            const isEdit  = editCatId === cat.id;

            return (
              <div key={cat.id} className="card" style={{padding:"12px 14px",opacity:cat.active?1:0.5}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  {/* Color swatch */}
                  <input type="color" value={cat.color||"#5ba3f5"} onChange={e=>updCat(cat.id,"color",e.target.value)}
                    title="Category color"
                    style={{width:20,height:20,border:"none",borderRadius:4,cursor:"pointer",padding:0,background:"none",flexShrink:0,marginTop:2}}/>

                  {/* Name + source badge */}
                  <div style={{flex:1,minWidth:0}}>
                    {isEdit ? (
                      <input className="inp" autoFocus value={cat.name} style={{fontSize:13,fontWeight:600,marginBottom:6}}
                        onChange={e=>updCat(cat.id,"name",e.target.value)}
                        onBlur={()=>setEditCatId(null)}
                        onKeyDown={e=>e.key==="Enter"&&setEditCatId(null)}/>
                    ) : (
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                        <span style={{fontWeight:600,fontSize:13,color:"var(--t1)",cursor:"pointer"}}
                          onClick={()=>setEditCatId(cat.id)}>{cat.name}</span>
                        {cat.source==="xactimate" && (
                          <span style={{fontSize:8,background:"rgba(91,163,245,.15)",color:"var(--blue)",
                            borderRadius:3,padding:"1px 5px",fontFamily:"var(--mono)"}}>XACTIMATE</span>
                        )}
                        {cat.xactDep>0 && (
                          <span style={{fontSize:8,background:"rgba(239,68,68,.12)",color:"var(--acc)",
                            borderRadius:3,padding:"1px 5px",fontFamily:"var(--mono)"}}>DEP {f$(cat.xactDep)}</span>
                        )}
                      </div>
                    )}
                    {/* Progress bar */}
                    <div style={{background:"var(--s3)",borderRadius:4,height:5,overflow:"hidden",marginBottom:4}}>
                      <div style={{height:"100%",width:`${Math.min(p,100)}%`,background:barColor,borderRadius:4,transition:"width .3s"}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--t3)"}}>
                      <span>{p.toFixed(0)}% utilized</span>
                      <span className="mono">{f$(actual)} spent of {f$(cat.budgeted)}</span>
                    </div>
                  </div>

                  {/* Budgeted amount input */}
                  <div style={{flexShrink:0,width:110}}>
                    <div style={{fontSize:9,color:"var(--t3)",marginBottom:3}}>Budgeted</div>
                    <div style={{position:"relative"}}>
                      <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",color:"var(--t3)",fontSize:11}}>$</span>
                      <input type="number" className="inp" value={cat.budgeted||""} min={0} style={{paddingLeft:16,fontSize:12,height:28}}
                        onChange={e=>updCat(cat.id,"budgeted",parseFloat(e.target.value)||0)}/>
                    </div>
                    {cat.xactRCV>0 && cat.source==="xactimate" && (
                      <div style={{fontSize:9,color:"var(--t3)",marginTop:2,fontFamily:"var(--mono)"}}>
                        RCV {f$(cat.xactRCV)}
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div style={{display:"flex",flexDirection:"column",gap:3,flexShrink:0}}>
                    <button className="btn btn-ghost btn-xs" title={cat.active?"Hide":"Show"}
                      onClick={()=>updCat(cat.id,"active",!cat.active)}
                      style={{fontSize:10,padding:"2px 6px"}}>{cat.active?"👁":"—"}</button>
                    <button className="btn btn-ghost btn-xs" style={{color:"var(--acc)",fontSize:10,padding:"2px 6px"}}
                      onClick={()=>removeCat(cat.id)} title="Remove">✕</button>
                  </div>
                </div>

                {/* Xactimate sub-values */}
                {cat.source==="xactimate" && cat.xactACV > 0 && cat.xactACV !== cat.xactRCV && (
                  <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid var(--br)",display:"flex",gap:20}}>
                    {[["RCV",cat.xactRCV,"var(--green)"],["Depreciation",cat.xactDep,"var(--acc)"],["ACV",cat.xactACV,"var(--amber)"]].map(([l,v,c])=>(
                      <div key={l}>
                        <div style={{fontSize:9,color:"var(--t3)"}}>{l}</div>
                        <div style={{fontFamily:"var(--mono)",fontSize:11,color:c,fontWeight:700}}>{f$(v)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unallocated spend warning */}
      {uncatActual > 0 && (
        <div style={{marginTop:12,padding:"10px 14px",background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.25)",
          borderRadius:9,fontSize:11,color:"var(--amber)"}}>
          ⚠ <strong>{f$(uncatActual)}</strong> in expenses have no budget category assigned. Tag transactions in the Payable tab to track them here.
        </div>
      )}

      {importModal && (
        <XactimateImportModal
          parsedCats={importModal.parsedCats}
          existingCats={categories}
          filename={importModal.filename}
          onApply={handleXactApply}
          onClose={()=>setImportModal(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   WORKTYPE BUDGET TAB
   Top-level budget view organized by project worktypes.
   Tabs: SUMMARY | ALL BUDGETS | [one tab per active worktype]
   When a worktype is turned on for a project, it automatically gets a budget.
───────────────────────────────────────────────────────────────────────────── */
function WorktypeBudgetTab({ proj, transactions=[], budgetData, onBudgetChange, invoices=[] }) {
  const activeWorktypes = (proj.worktypes||[]).filter(w => (w.status||"active") !== "off").map(w => w.type||w);
  const [activeTab, setActiveTab] = useState("summary");
  const [catFilter, setCatFilter] = useState("all"); // all | complete | on_hold

  const categories = budgetData?.categories || [];

  // Ensure each active worktype has budget categories — auto-apply templates
  useEffect(() => {
    if (!activeWorktypes.length) return;
    const templates = lsGetBudgetTemplates();
    let changed = false;
    const existing = [...(budgetData?.categories || [])];
    const existingWTs = new Set(existing.map(c => c.workType).filter(Boolean));

    activeWorktypes.forEach(wt => {
      if (existingWTs.has(wt)) return; // already has categories for this worktype
      // Find templates applicable to this worktype
      const relevant = templates.filter(t => {
        if (!t.active) return false;
        if (!t.workTypes?.length) return true;
        return t.workTypes.some(tw => tw.toLowerCase() === wt.toLowerCase());
      });
      if (relevant.length) {
        relevant.forEach(t => {
          const id = `${t.id}-${wt.replace(/\s+/g,"-").toLowerCase()}-${Date.now()}`;
          if (!existing.find(c => c.templateId === t.id && c.workType === wt)) {
            existing.push({
              id, templateId: t.id, name: t.name, color: t.color,
              budgeted: 0, estimated: 0, ohp: 0, targetCost: 0,
              bids: 0, vendors: 0, inHouse: 0,
              source: "template", active: true, workType: wt,
              status: "active", // active | complete | on_hold
            });
            changed = true;
          }
        });
      }
    });

    if (changed) {
      onBudgetChange({ ...budgetData, categories: existing });
    }
  }, [activeWorktypes.join(",")]);

  // Compute actuals per category
  const actuals = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (t._isGenerated || t.auto) return;
      if (TX_SIDE[t.type] !== "cost" && TX_SIDE[t.type] !== "ap") return;
      const cat = t.budgetCatId || t.category || "__uncat__";
      map[cat] = (map[cat] || 0) + (t.amount || 0);
    });
    return map;
  }, [transactions]);

  // Compute vendor spend per category
  const vendorSpend = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (t._isGenerated || t.auto) return;
      if (t.type !== "bill" && t.type !== "payment_out") return;
      const cat = t.budgetCatId || "__uncat__";
      map[cat] = (map[cat] || 0) + (t.amount || 0);
    });
    return map;
  }, [transactions]);

  // Invoiced amounts per worktype
  const invoicedByWT = useMemo(() => {
    const map = {};
    invoices.filter(i => i.status !== "void").forEach(inv => {
      const wt = inv.workType || inv.category || "__general__";
      map[wt] = (map[wt] || 0) + (inv.total || 0);
    });
    return map;
  }, [invoices]);

  // Payments collected per worktype
  const paidByWT = useMemo(() => {
    const map = {};
    invoices.filter(i => i.status === "paid").forEach(inv => {
      const wt = inv.workType || inv.category || "__general__";
      map[wt] = (map[wt] || 0) + (inv.total || 0);
    });
    return map;
  }, [invoices]);

  const updCat = (id, patch) => {
    const cats = categories.map(c => c.id === id ? { ...c, ...patch } : c);
    onBudgetChange({ ...budgetData, categories: cats });
  };

  const addCategoryToWT = (wt) => {
    const id = `mc-${Date.now()}`;
    const cats = [...categories, {
      id, name: "New Category", color: "#5ba3f5", budgeted: 0, estimated: 0,
      ohp: 0, targetCost: 0, bids: 0, vendors: 0, inHouse: 0,
      source: "manual", active: true, workType: wt, status: "active",
    }];
    onBudgetChange({ ...budgetData, categories: cats });
  };

  const removeCat = (id) => {
    onBudgetChange({ ...budgetData, categories: categories.filter(c => c.id !== id) });
  };

  // ── Styles ──
  const tabBarStyle = {
    display: "flex", background: "var(--s3)", border: "1px solid var(--br)",
    borderRadius: "8px 8px 0 0", overflow: "hidden",
  };
  const tabStyle = (active) => ({
    flex: 1, padding: "10px 16px", fontSize: 11, fontWeight: 700, fontFamily: "var(--mono)",
    textAlign: "center", cursor: "pointer", border: "none", letterSpacing: ".5px",
    background: active ? "var(--blue)" : "transparent",
    color: active ? "#fff" : "var(--t2)",
    transition: "all .15s",
  });
  const subTabBarStyle = {
    display: "flex", background: "var(--s2)", borderBottom: "1px solid var(--br)",
    borderLeft: "1px solid var(--br)", borderRight: "1px solid var(--br)",
    overflow: "hidden",
  };
  const subTabStyle = (active) => ({
    padding: "7px 18px", fontSize: 10, fontWeight: 700, fontFamily: "var(--mono)",
    cursor: "pointer", border: "none", letterSpacing: ".5px",
    background: active ? "var(--green)" : "transparent",
    color: active ? "#fff" : "var(--t3)",
    transition: "all .15s",
  });
  const thStyle = {
    padding: "8px 10px", fontSize: 10, fontWeight: 700, fontFamily: "var(--mono)",
    color: "var(--t3)", textAlign: "right", borderBottom: "2px solid var(--br)",
    background: "var(--s2)", whiteSpace: "nowrap",
  };
  const tdStyle = {
    padding: "9px 10px", fontSize: 12, fontFamily: "var(--mono)", fontWeight: 600,
    textAlign: "right", borderBottom: "1px solid var(--br)", color: "var(--t1)",
  };
  const sectionBoxStyle = {
    background: "var(--s2)", border: "1px solid var(--br)", borderRadius: 8,
    padding: "10px 14px", marginBottom: 10,
  };

  // ── ALL BUDGETS summary data ──
  const wtSummary = activeWorktypes.map(wt => {
    const wtCats = categories.filter(c => c.workType === wt);
    const estimated = wtCats.reduce((s, c) => s + (c.estimated || c.budgeted || 0), 0);
    const invoicedAmt = invoicedByWT[wt] || 0;
    const targetCost = wtCats.reduce((s, c) => s + (c.targetCost || 0), 0);
    const actualCosts = wtCats.reduce((s, c) => s + (actuals[c.id] || actuals[c.name] || 0), 0)
      + wtCats.reduce((s, c) => s + (c.inHouse || 0), 0);
    const remaining = estimated - actualCosts;
    const grossMargin = estimated > 0 ? ((estimated - actualCosts) / estimated * 100) : 0;
    const payments = paidByWT[wt] || 0;
    const owed = invoicedAmt - payments;
    return { wt, estimated, invoicedAmt, targetCost, actualCosts, remaining, grossMargin, payments, owed };
  });

  const jobTotal = wtSummary.reduce((acc, s) => ({
    estimated: acc.estimated + s.estimated,
    invoicedAmt: acc.invoicedAmt + s.invoicedAmt,
    targetCost: acc.targetCost + s.targetCost,
    actualCosts: acc.actualCosts + s.actualCosts,
    remaining: acc.remaining + s.remaining,
    payments: acc.payments + s.payments,
    owed: acc.owed + s.owed,
  }), { estimated: 0, invoicedAmt: 0, targetCost: 0, actualCosts: 0, remaining: 0, payments: 0, owed: 0 });
  jobTotal.grossMargin = jobTotal.estimated > 0 ? ((jobTotal.estimated - jobTotal.actualCosts) / jobTotal.estimated * 100) : 0;

  // ── Render sections shared across SUMMARY and worktype tabs ──
  const renderBottomSections = (wt) => {
    const wtInvoices = wt ? invoices.filter(i => (i.workType || i.category) === wt && i.status !== "void") : invoices.filter(i => i.status !== "void");
    const arDue = wtInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const arPaid = wtInvoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
    const arRemaining = arDue - arPaid;

    return (
      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Estimates */}
        <div style={sectionBoxStyle}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t1)", borderBottom: "1px solid var(--br)", paddingBottom: 6, marginBottom: 6 }}>Estimates</div>
          <div style={{ fontSize: 11, color: "var(--t3)", padding: "8px 0", textAlign: "center" }}>
            {wtInvoices.length === 0 ? "" : `${wtInvoices.length} estimate(s)`}
          </div>
        </div>

        {/* Accounts Payable */}
        <div style={sectionBoxStyle}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t1)", borderBottom: "1px solid var(--br)", paddingBottom: 6, marginBottom: 6 }}>Accounts, Payable</div>
          <div style={{ fontSize: 11, color: "var(--t3)", padding: "8px 0", textAlign: "center" }}></div>
        </div>

        {/* Accounts Receivable */}
        <div style={sectionBoxStyle}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t1)", borderBottom: "1px solid var(--br)", paddingBottom: 6, marginBottom: 6 }}>Accounts, Receivable</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "left" }}></th>
                  <th style={thStyle}>Due</th>
                  <th style={thStyle}>Paid</th>
                  <th style={thStyle}>Remaining</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...tdStyle, textAlign: "left", fontWeight: 700 }}>Total</td>
                  <td style={tdStyle}>{f$c(arDue)}</td>
                  <td style={tdStyle}>{f$c(arPaid)}</td>
                  <td style={tdStyle}>{f$c(arRemaining)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Payments + Commissions */}
        <div>
          <div style={sectionBoxStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--t1)" }}>Payments</span>
              <span style={{ fontSize: 11, color: "var(--t3)" }}>None Found</span>
            </div>
          </div>
          <div style={sectionBoxStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--t1)" }}>Commissions</span>
              <span style={{ fontSize: 11, color: "var(--t3)" }}>None Found</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Render worktype category table ──
  const renderWTTable = (wt) => {
    let wtCats = categories.filter(c => c.workType === wt);
    if (catFilter === "complete") wtCats = wtCats.filter(c => c.status === "complete");
    else if (catFilter === "on_hold") wtCats = wtCats.filter(c => c.status === "on_hold");

    const totals = wtCats.reduce((acc, c) => {
      const actual = actuals[c.id] || actuals[c.name] || 0;
      const vend = vendorSpend[c.id] || 0;
      return {
        est: acc.est + (c.estimated || c.budgeted || 0),
        ohp: acc.ohp + (c.ohp || 0),
        targetCost: acc.targetCost + (c.targetCost || 0),
        bids: acc.bids + (c.bids || 0),
        vendors: acc.vendors + vend,
        inHouse: acc.inHouse + (c.inHouse || 0),
        actual: acc.actual + actual + (c.inHouse || 0),
      };
    }, { est: 0, ohp: 0, targetCost: 0, bids: 0, vendors: 0, inHouse: 0, actual: 0 });
    const totRemaining = totals.est - totals.actual;
    const totGrossMargin = totals.est > 0 ? ((totals.est - totals.actual) / totals.est * 100) : 0;

    // Detect any warning: in-house costs with no estimate
    const hasWarning = (c) => (c.inHouse || 0) > 0 && !(c.estimated || c.budgeted);

    return (
      <div>
        {/* Sub filter tabs */}
        <div style={subTabBarStyle}>
          {[["all", "ALL CATEGORIES"], ["complete", "COMPLETE"], ["on_hold", "ON HOLD"]].map(([k, l]) => (
            <button key={k} style={subTabStyle(catFilter === k)} onClick={() => setCatFilter(k)}>{l}</button>
          ))}
        </div>

        {/* Category table */}
        <div style={{ border: "1px solid var(--br)", borderTop: "none", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "left", minWidth: 180 }}>Category</th>
                <th style={{ ...thStyle, minWidth: 80 }}>Est</th>
                <th style={{ ...thStyle, minWidth: 80 }}>Overhead &amp; Profit</th>
                <th style={{ ...thStyle, minWidth: 80 }}>Target Cost</th>
                <th style={{ ...thStyle, minWidth: 70 }}>Bids</th>
                <th style={{ ...thStyle, minWidth: 70 }}>Vendors</th>
                <th style={{ ...thStyle, minWidth: 80 }}>In-House</th>
                <th style={{ ...thStyle, minWidth: 20 }}></th>
                <th style={{ ...thStyle, minWidth: 80 }}>Remaining Funds</th>
                <th style={{ ...thStyle, minWidth: 60 }}>Gross Margin</th>
              </tr>
            </thead>
            <tbody>
              {wtCats.map(cat => {
                const est = cat.estimated || cat.budgeted || 0;
                const actual = (actuals[cat.id] || actuals[cat.name] || 0) + (cat.inHouse || 0);
                const remaining = est - actual;
                const gm = est > 0 ? ((est - actual) / est * 100) : 0;
                const vend = vendorSpend[cat.id] || 0;
                const warn = hasWarning(cat);
                // Show progress bar background in first column if budgeted
                const pct = est > 0 ? Math.min(100, (actual / est) * 100) : 0;

                return (
                  <tr key={cat.id} style={{ background: cat.status === "on_hold" ? "rgba(232,156,24,.05)" : "transparent" }}>
                    <td style={{ ...tdStyle, textAlign: "left", position: "relative" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {pct > 0 && (
                          <div style={{
                            position: "absolute", left: 0, top: 0, bottom: 0,
                            width: `${pct}%`, background: cat.color ? `${cat.color}15` : "rgba(91,163,245,.08)",
                            borderRight: pct < 100 ? "none" : undefined,
                          }} />
                        )}
                        <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                          {pct > 0 && (
                            <span style={{ fontSize: 9, color: cat.color || "var(--green)", fontWeight: 700, minWidth: 30 }}>
                              {pct.toFixed(0)}%
                            </span>
                          )}
                          <input className="inp" value={cat.name}
                            style={{ border: "none", background: "transparent", fontSize: 12, fontWeight: 600, padding: 0, color: "var(--t1)", width: "100%" }}
                            onChange={e => updCat(cat.id, { name: e.target.value })} />
                        </span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <input type="number" className="inp" value={cat.estimated || cat.budgeted || ""}
                        style={{ textAlign: "right", border: "none", background: "transparent", fontSize: 12, fontWeight: 600, padding: 0, width: 70 }}
                        onChange={e => updCat(cat.id, { estimated: parseFloat(e.target.value) || 0, budgeted: parseFloat(e.target.value) || 0 })} />
                    </td>
                    <td style={tdStyle}>
                      <input type="number" className="inp" value={cat.ohp || ""}
                        style={{ textAlign: "right", border: "none", background: "transparent", fontSize: 12, fontWeight: 600, padding: 0, width: 70 }}
                        onChange={e => updCat(cat.id, { ohp: parseFloat(e.target.value) || 0 })} />
                    </td>
                    <td style={tdStyle}>
                      <input type="number" className="inp" value={cat.targetCost || ""}
                        style={{ textAlign: "right", border: "none", background: "transparent", fontSize: 12, fontWeight: 600, padding: 0, width: 70 }}
                        onChange={e => updCat(cat.id, { targetCost: parseFloat(e.target.value) || 0 })} />
                    </td>
                    <td style={tdStyle}>
                      <input type="number" className="inp" value={cat.bids || ""}
                        style={{ textAlign: "right", border: "none", background: "transparent", fontSize: 12, fontWeight: 600, padding: 0, width: 60 }}
                        onChange={e => updCat(cat.id, { bids: parseFloat(e.target.value) || 0 })} />
                    </td>
                    <td style={tdStyle}>{f$c(vend)}</td>
                    <td style={tdStyle}>
                      <input type="number" className="inp" value={cat.inHouse || ""}
                        style={{ textAlign: "right", border: "none", background: "transparent", fontSize: 12, fontWeight: 600, padding: 0, width: 70 }}
                        onChange={e => updCat(cat.id, { inHouse: parseFloat(e.target.value) || 0 })} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center", padding: "9px 4px" }}>
                      {warn && <span title="In-house costs with no estimate" style={{ color: "var(--acc)", fontSize: 14 }}>&#9650;</span>}
                    </td>
                    <td style={{ ...tdStyle, color: remaining < 0 ? "var(--acc)" : "var(--t1)" }}>
                      {remaining < 0 ? `$${Math.abs(remaining).toFixed(2)}` : f$c(remaining)}
                      {remaining < 0 && <span style={{ color: "var(--acc)" }}> </span>}
                    </td>
                    <td style={tdStyle}>{gm.toFixed(0)}%</td>
                  </tr>
                );
              })}

              {/* Totals row */}
              <tr style={{ background: "var(--s3)" }}>
                <td style={{ ...tdStyle, textAlign: "left", fontWeight: 800, fontSize: 12 }}>Totals</td>
                <td style={{ ...tdStyle, fontWeight: 800 }}>{f$c(totals.est)}</td>
                <td style={{ ...tdStyle, fontWeight: 800 }}>{f$c(totals.ohp)}</td>
                <td style={{ ...tdStyle, fontWeight: 800 }}>{f$c(totals.targetCost)}</td>
                <td style={{ ...tdStyle, fontWeight: 800 }}>{f$c(totals.bids)}</td>
                <td style={{ ...tdStyle, fontWeight: 800 }}>{f$c(totals.vendors)}</td>
                <td style={{ ...tdStyle, fontWeight: 800 }}>{f$c(totals.inHouse)}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {totals.inHouse > 0 && totals.est === 0 && <span style={{ color: "var(--acc)", fontSize: 14 }}>&#9650;</span>}
                </td>
                <td style={{ ...tdStyle, fontWeight: 800, color: totRemaining < 0 ? "var(--acc)" : "var(--t1)" }}>
                  {totRemaining < 0 ? `-${f$c(Math.abs(totRemaining))}` : f$c(totRemaining)}
                </td>
                <td style={{ ...tdStyle, fontWeight: 800 }}>{totGrossMargin.toFixed(0)}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Add Category button */}
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-primary btn-sm" onClick={() => addCategoryToWT(wt)}
            style={{ background: "var(--green)", borderColor: "var(--green)", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            Add Category <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          </button>
        </div>

        {renderBottomSections(wt)}
      </div>
    );
  };

  // ── Quickbooks sync status ──
  const qbStatus = proj.qbSynced ? null : "Cannot Sync to Quickbooks";

  return (
    <div>
      {/* Quickbooks sync warning */}
      {qbStatus && (
        <div style={{
          display: "inline-block", background: "var(--green)", color: "#fff", padding: "6px 16px",
          borderRadius: 6, fontSize: 12, fontWeight: 700, marginBottom: 12,
        }}>
          {qbStatus}
        </div>
      )}

      {/* Top-level tab bar: SUMMARY | ALL BUDGETS | [worktypes...] */}
      <div style={tabBarStyle}>
        <button style={tabStyle(activeTab === "summary")} onClick={() => setActiveTab("summary")}>SUMMARY</button>
        <button style={tabStyle(activeTab === "all")} onClick={() => setActiveTab("all")}>ALL BUDGETS</button>
        {activeWorktypes.map(wt => (
          <button key={wt} style={tabStyle(activeTab === wt)} onClick={() => { setActiveTab(wt); setCatFilter("all"); }}>
            {wt.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── SUMMARY TAB ── */}
      {activeTab === "summary" && (
        <div style={{ border: "1px solid var(--br)", borderTop: "none", borderRadius: "0 0 8px 8px", padding: 16 }}>
          {/* Can embed the old XactimateBudgetTab for import/template tools */}
          <XactimateBudgetTab
            proj={proj}
            transactions={transactions}
            budgetData={budgetData}
            onBudgetChange={onBudgetChange}
          />
          {renderBottomSections(null)}
        </div>
      )}

      {/* ── ALL BUDGETS TAB ── */}
      {activeTab === "all" && (
        <div style={{ border: "1px solid var(--br)", borderTop: "none", borderRadius: "0 0 8px 8px", padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "left", minWidth: 160 }}>Budget Type</th>
                  <th style={{ ...thStyle, minWidth: 100 }}>Estimate Amount</th>
                  <th style={{ ...thStyle, minWidth: 100 }}>Invoiced Amount</th>
                  <th style={{ ...thStyle, minWidth: 90 }}>Target Cost</th>
                  <th style={{ ...thStyle, minWidth: 90 }}>Actual Costs</th>
                  <th style={{ ...thStyle, minWidth: 100 }}>Remaining Funds</th>
                  <th style={{ ...thStyle, minWidth: 80 }}>Gross Margin</th>
                  <th style={{ ...thStyle, minWidth: 80 }}>Payments</th>
                  <th style={{ ...thStyle, minWidth: 70 }}>Owed</th>
                </tr>
              </thead>
              <tbody>
                {wtSummary.map(s => (
                  <tr key={s.wt} style={{ cursor: "pointer" }} onClick={() => { setActiveTab(s.wt); setCatFilter("all"); }}>
                    <td style={{ ...tdStyle, textAlign: "left", fontWeight: 800, fontSize: 13 }}>{s.wt}</td>
                    <td style={tdStyle}>{f$c(s.estimated)}</td>
                    <td style={tdStyle}>{f$c(s.invoicedAmt)}</td>
                    <td style={tdStyle}>{f$c(s.targetCost)}</td>
                    <td style={tdStyle}>{f$c(s.actualCosts)}</td>
                    <td style={{ ...tdStyle, color: s.remaining < 0 ? "var(--acc)" : "var(--t1)" }}>
                      {s.remaining < 0 ? `-${f$c(Math.abs(s.remaining))}` : f$c(s.remaining)}
                    </td>
                    <td style={tdStyle}>{s.grossMargin.toFixed(0)}%</td>
                    <td style={tdStyle}>{f$c(s.payments)}</td>
                    <td style={tdStyle}>{f$c(s.owed)}</td>
                  </tr>
                ))}
                {/* Job Total row */}
                <tr style={{ background: "var(--s3)" }}>
                  <td style={{ ...tdStyle, textAlign: "left", fontWeight: 800, fontSize: 13 }}>Job Total</td>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{f$c(jobTotal.estimated)}</td>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{f$c(jobTotal.invoicedAmt)}</td>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{f$c(jobTotal.targetCost)}</td>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{f$c(jobTotal.actualCosts)}</td>
                  <td style={{ ...tdStyle, fontWeight: 800, color: jobTotal.remaining < 0 ? "var(--acc)" : "var(--t1)" }}>
                    {jobTotal.remaining < 0 ? `-${f$c(Math.abs(jobTotal.remaining))}` : f$c(jobTotal.remaining)}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{jobTotal.grossMargin.toFixed(0)}%</td>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{f$c(jobTotal.payments)}</td>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{f$c(jobTotal.owed)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ padding: 16 }}>
            {renderBottomSections(null)}
          </div>
        </div>
      )}

      {/* ── INDIVIDUAL WORKTYPE TABS ── */}
      {activeWorktypes.includes(activeTab) && (
        <div style={{ border: "1px solid var(--br)", borderTop: "none", borderRadius: "0 0 8px 8px", padding: 0 }}>
          {renderWTTable(activeTab)}
        </div>
      )}

      {/* No worktypes active message */}
      {activeWorktypes.length === 0 && activeTab !== "summary" && (
        <div style={{ padding: "32px 20px", textAlign: "center", background: "var(--s2)", border: "1px solid var(--br)",
          borderTop: "none", borderRadius: "0 0 8px 8px" }}>
          <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 8 }}>No work types active on this project</div>
          <div style={{ fontSize: 11, color: "var(--t3)" }}>Turn on work types in the Overview tab to enable budget tracking per work type.</div>
        </div>
      )}
    </div>
  );
}

function BudgetBuilder({ budgets, setBudgets, worktypes=[], transactions=[] }) {
  const activeTypes = worktypes.length
    ? [...new Set([...worktypes.map(w=>w.type||w), ...Object.keys(budgets)])]
    : WORK_TYPES.slice(0,7);

  const actuals = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      const cat = t.category || "Other";
      if (!map[cat]) map[cat] = 0;
      if (TX_SIDE[t.type]==="cost"||TX_SIDE[t.type]==="ap") map[cat] += t.amount||0;
    });
    return map;
  }, [transactions]);

  const setB = (wt,k,v) => setBudgets(prev=>({...prev,[wt]:{...(prev[wt]||{}), [k]:v}}));

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 100px 100px 80px 80px",gap:6,
        padding:"3px 9px",marginBottom:5}}>
        {["Work Type","Budgeted","Actual","Margin %","Used"].map((h,i)=>(
          <div key={i} className="mono" style={{fontSize:9,color:"var(--t3)",paddingLeft:i===0?6:0}}>{h}</div>
        ))}
      </div>

      {activeTypes.map(wt => {
        const b = budgets[wt] || { budgeted:0, targetMargin:30 };
        const actual = actuals[wt] || 0;
        const p = parseFloat(fPct(actual, b.budgeted));
        const barColor = p>=100?"var(--acc)":p>=80?"var(--amber)":"var(--green)";
        return (
          <div key={wt} style={{display:"grid",gridTemplateColumns:"1fr 100px 100px 80px 80px",gap:6,
            alignItems:"center",padding:"7px 9px",background:"var(--s2)",border:"1px solid var(--br)",
            borderRadius:7,marginBottom:3}}>
            <div style={{fontSize:12,fontWeight:600,color:"var(--t1)",paddingLeft:4}}>{wt}</div>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",color:"var(--t3)",fontSize:11}}>$</span>
              <input type="number" className="inp" style={{height:28,fontSize:11,paddingLeft:16}}
                value={b.budgeted||""} placeholder="0"
                onChange={e=>setB(wt,"budgeted",parseFloat(e.target.value)||0)}/>
            </div>
            <div className="mono" style={{fontSize:12,color:barColor,fontWeight:700,textAlign:"right"}}>
              {f$(actual)}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <input type="number" className="inp" style={{height:28,fontSize:11,width:"100%"}}
                value={b.targetMargin??30} min="0" max="100"
                onChange={e=>setB(wt,"targetMargin",parseFloat(e.target.value)||0)}/>
              <span style={{color:"var(--t3)",fontSize:11}}>%</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:3,paddingRight:4}}>
              <MiniBar value={actual} max={b.budgeted||1} color={barColor} height={4}/>
              <div className="mono" style={{fontSize:9,color:barColor,textAlign:"right"}}>{p.toFixed(0)}%</div>
            </div>
          </div>
        );
      })}

      <div style={{marginTop:11,padding:"10px 13px",background:"var(--s2)",border:"1px solid var(--br)",
        borderRadius:9,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:11,color:"var(--t2)"}}>Total Budget</span>
        <span className="mono" style={{fontWeight:700,fontSize:15,color:"var(--green)"}}>
          {f$(Object.values(budgets).reduce((s,b)=>s+(b.budgeted||0),0))}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ACCOUNTS RECEIVABLE  (shows generated invoices + manual AR entries)
───────────────────────────────────────────────────────────────────────────── */
function ARPanel({ transactions, invoices=[], onAdd, onInvoiceChange }) {
  const [previewInv, setPreviewInv] = useState(null);

  // Sort all invoices chronologically to assign version numbers (v1, v2, v3…)
  const invChron = useMemo(() =>
    [...invoices].sort((a,b) => new Date(a.createdAt||a.date) - new Date(b.createdAt||b.date)),
    [invoices]
  );
  const versionOf = useMemo(() => {
    const map = {};
    invChron.forEach((inv, i) => { map[inv.id] = i + 1; });
    return map;
  }, [invChron]);

  // Only show non-voided invoices in the main list
  const visInvoices = invoices.filter(inv => inv.status !== "void");
  const voidedInvoices = [...invoices]
    .filter(inv => inv.status === "void")
    .sort((a,b) => new Date(b.voidedAt||b.createdAt||b.date) - new Date(a.voidedAt||a.createdAt||a.date));

  // Manual AR entries (exclude synthetic __inv__ entries — shown in invoice cards)
  const manualAR = transactions.filter(t => TX_SIDE[t.type]==="ar" && !t._isGenerated)
                               .sort((a,b)=>b.date>a.date?1:-1);

  // Totals include all invoices
  const totalInvoiced = invoices.filter(i=>i.status!=="void").reduce((s,i)=>s+(i.total||0),0)
                      + manualAR.filter(t=>t.type==="invoice").reduce((s,t)=>s+t.amount,0);
  const collected    = invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+(i.total||0),0)
                     + manualAR.filter(t=>t.type==="payment_in").reduce((s,t)=>s+t.amount,0);
  const arBalance    = totalInvoiced - collected;

  const STATUS_C = {
    unpaid:  "var(--amber)",
    paid:    "var(--green)",
    partial: "var(--blue)",
    void:    "var(--t3)",
    // legacy manual invoice statuses
    draft:"var(--t3)",sent:"var(--blue)",
  };

  const markPaid = (inv) => {
    onInvoiceChange(inv.id, { status:"paid", paidAt: new Date().toISOString() });
  };
  // reason: "void" (clerical cancellation) | "revised" (superseded by a newer invoice)
  const voidInv = (inv, reason="void") => {
    onInvoiceChange(inv.id, { status:"void", voidReason: reason, voidedAt: new Date().toISOString() });
  };

  return (
    <div>
      {previewInv && <InvoicePreviewModal inv={previewInv} onClose={()=>setPreviewInv(null)}/>}

      <div className="g4" style={{gap:9,marginBottom:14}}>
        <KpiCard label="Total Invoiced" value={f$(totalInvoiced)} color="var(--blue)"/>
        <KpiCard label="Collected"      value={f$(collected)}     color="var(--green)"/>
        <KpiCard label="Outstanding AR" value={f$(arBalance)}     color={arBalance>0?"var(--amber)":"var(--t2)"} warn={arBalance>0}/>
        <KpiCard label="Collection Rate" value={totalInvoiced>0?`${fPct(collected,totalInvoiced)}%`:"—"} color="var(--teal)"/>
      </div>

      {/* Generated Invoices section */}
      {(visInvoices.length > 0 || voidedInvoices.length > 0) && (
        <div style={{marginBottom:20}}>
          <SectionHead action={
            <button className="btn btn-primary btn-xs" onClick={()=>onAdd("invoice")}>+ Manual Invoice</button>
          }>Generated Invoices</SectionHead>

          {visInvoices.map(inv => {
            const ver = versionOf[inv.id];
            return (
              <div key={inv.id} style={{display:"flex",alignItems:"center",gap:10,
                padding:"10px 13px",background:"var(--s2)",border:"1px solid var(--br)",
                borderRadius:9,marginBottom:5,borderLeft:`3px solid ${STATUS_C[inv.status]||"var(--amber)"}`}}>
                {/* Invoice icon + version badge */}
                <div style={{position:"relative",flexShrink:0}}>
                  <div style={{width:38,height:38,borderRadius:9,display:"flex",alignItems:"center",
                    justifyContent:"center",background:"rgba(91,163,245,.12)",fontSize:16}}>🧾</div>
                  {invoices.length > 1 && (
                    <div style={{position:"absolute",bottom:-4,right:-4,fontSize:8,fontWeight:800,
                      background:"var(--s3)",border:"1px solid var(--br)",borderRadius:3,
                      padding:"1px 4px",fontFamily:"var(--mono)",color:"var(--blue)",lineHeight:1}}>
                      v{ver}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                    <span style={{fontSize:12,fontWeight:700,color:"var(--t1)"}}>{inv.number||"Invoice"}</span>
                    <span style={{fontSize:9,fontWeight:700,fontFamily:"var(--mono)",
                      color:STATUS_C[inv.status]||"var(--amber)",
                      background:`${STATUS_C[inv.status]||"var(--amber)"}18`,
                      border:`1px solid ${STATUS_C[inv.status]||"var(--amber)"}40`,
                      borderRadius:4,padding:"1px 6px"}}>
                      {(inv.status||"unpaid").toUpperCase()}
                    </span>
                  </div>
                  <div className="mono" style={{fontSize:9,color:"var(--t3)",marginTop:2}}>
                    {inv.date ? new Date(inv.date).toLocaleDateString() : ""}
                    {inv.dueDate ? ` · Due ${new Date(inv.dueDate).toLocaleDateString()}` : ""}
                    {inv.clientName ? ` · ${inv.clientName}` : ""}
                  </div>
                  {inv.summary && (
                    <div style={{fontSize:10,color:"var(--t3)",marginTop:2,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:380}}>
                      {inv.summary}
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div style={{textAlign:"right",flexShrink:0,marginRight:6}}>
                  <div className="mono" style={{fontWeight:800,fontSize:14,color:"var(--blue)"}}>
                    {f$c(inv.total||0)}
                  </div>
                  <div style={{fontSize:9,color:"var(--t3)",marginTop:1}}>
                    {(inv.lineItems||[]).length} line item{(inv.lineItems||[]).length!==1?"s":""}
                  </div>
                </div>

                {/* Actions */}
                <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                  <button className="btn btn-secondary btn-xs" style={{fontSize:10}}
                    onClick={()=>setPreviewInv(inv)}>
                    View
                  </button>
                  {inv.status==="unpaid" && (
                    <button className="btn btn-xs" style={{fontSize:10,background:"rgba(26,217,138,.12)",
                      color:"var(--green)",border:"1px solid rgba(26,217,138,.3)"}}
                      onClick={()=>markPaid(inv)}>
                      Mark Paid
                    </button>
                  )}
                  {inv.status!=="void" && (
                    <>
                      <button className="btn btn-ghost btn-xs" style={{fontSize:10,color:"var(--amber)"}}
                        onClick={()=>{ if(window.confirm("Mark this invoice as Revised?\n\nThis voids it and flags it as superseded — use this when you've updated the scope and will generate a new invoice to replace it.")) voidInv(inv,"revised"); }}>
                        Mark Revised
                      </button>
                      <button className="btn btn-ghost btn-xs" style={{fontSize:10,color:"var(--t3)"}}
                        onClick={()=>{ if(window.confirm("Void this invoice? Use this for clerical cancellations.\n\nTo flag a superseded invoice, use 'Mark Revised' instead.")) voidInv(inv,"void"); }}>
                        Void
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Revision History — shows voided invoices with context */}
          {voidedInvoices.length > 0 && (
            <details style={{marginTop:8}}>
              <summary style={{fontSize:10,color:"var(--t3)",cursor:"pointer",padding:"5px 0",
                display:"flex",alignItems:"center",gap:6,userSelect:"none"}}>
                <span style={{fontSize:9,background:"rgba(255,255,255,.06)",border:"1px solid var(--br)",
                  borderRadius:3,padding:"1px 5px",fontFamily:"var(--mono)"}}>HISTORY</span>
                {voidedInvoices.filter(i=>i.voidReason==="revised").length > 0
                  ? `${voidedInvoices.filter(i=>i.voidReason==="revised").length} revised · ${voidedInvoices.filter(i=>i.voidReason!=="revised").length} voided`
                  : `${voidedInvoices.length} voided invoice${voidedInvoices.length!==1?"s":""}`
                }
              </summary>
              <div style={{marginTop:6,paddingLeft:8,borderLeft:"2px solid var(--br)"}}>
                {/* Timeline legend */}
                <div style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)",marginBottom:6,paddingLeft:4}}>
                  INVOICE REVISION HISTORY — oldest first
                </div>
                {[...voidedInvoices].reverse().map(inv => {
                  const ver = versionOf[inv.id];
                  const isRevised = inv.voidReason === "revised";
                  const badgeColor = isRevised ? "var(--amber)" : "var(--t3)";
                  const badgeLabel = isRevised ? "REVISED" : "VOID";
                  return (
                    <div key={inv.id} style={{display:"flex",alignItems:"center",gap:8,
                      padding:"7px 10px",background:"var(--s2)",border:"1px solid var(--br)",
                      borderRadius:7,marginBottom:4,opacity:0.7,
                      borderLeft:`3px solid ${badgeColor}40`}}>
                      {/* Version badge */}
                      {invoices.length > 1 && (
                        <div style={{fontSize:9,fontWeight:800,fontFamily:"var(--mono)",
                          color:"var(--t3)",background:"var(--s3)",border:"1px solid var(--br)",
                          borderRadius:3,padding:"2px 5px",flexShrink:0,minWidth:22,textAlign:"center"}}>
                          v{ver}
                        </div>
                      )}
                      {/* Number + status */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          <span style={{fontSize:11,fontWeight:600,color:"var(--t2)",
                            textDecoration:"line-through"}}>{inv.number||"Invoice"}</span>
                          <span style={{fontSize:8,fontWeight:800,fontFamily:"var(--mono)",color:badgeColor,
                            background:`${badgeColor}15`,border:`1px solid ${badgeColor}35`,
                            borderRadius:3,padding:"1px 5px"}}>
                            {badgeLabel}
                          </span>
                        </div>
                        <div className="mono" style={{fontSize:9,color:"var(--t3)",marginTop:1}}>
                          Created {inv.date ? new Date(inv.date).toLocaleDateString() : "—"}
                          {inv.voidedAt ? ` · ${isRevised?"Revised":"Voided"} ${new Date(inv.voidedAt).toLocaleDateString()}` : ""}
                          {inv.clientName ? ` · ${inv.clientName}` : ""}
                        </div>
                      </div>
                      <span className="mono" style={{fontSize:11,color:"var(--t3)",flexShrink:0,
                        textDecoration:"line-through"}}>{f$c(inv.total||0)}</span>
                      <button className="btn btn-ghost btn-xs" style={{fontSize:9,flexShrink:0}}
                        onClick={()=>setPreviewInv(inv)}>View</button>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Manual AR entries */}
      <SectionHead action={
        invoices.length===0 ? <button className="btn btn-primary btn-xs" onClick={()=>onAdd("invoice")}>+ Invoice / Payment</button> : null
      }>Manual AR Entries</SectionHead>

      {manualAR.length === 0
        ? <EmptyState icon="📄" msg={invoices.length>0?"No manual AR entries — use Scope/Invoice tab to generate invoices":"No invoices yet — add an invoice or generate one from the Scope/Invoice tab"}/>
        : manualAR.map(tx => (
          <div key={tx.id} className="row" style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:9,flexShrink:0,display:"flex",alignItems:"center",
              justifyContent:"center",background:TX_TYPES[tx.type]?.bg,color:TX_TYPES[tx.type]?.color,fontSize:14}}>
              {tx.type==="invoice"?"🧾":"💰"}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.description}</div>
              <div style={{fontSize:10,color:"var(--t3)",marginTop:1,fontFamily:"var(--mono)"}}>{tx.date}{tx.category?` · ${tx.category}`:""}</div>
            </div>
            {tx.status && (
              <span style={{fontSize:9,fontWeight:700,fontFamily:"var(--mono)",
                color:STATUS_C[tx.status]||"var(--t3)",background:`${STATUS_C[tx.status]||"var(--t3)"}18`,
                border:`1px solid ${STATUS_C[tx.status]||"var(--t3)"}40`,borderRadius:4,padding:"2px 6px"}}>
                {tx.status.toUpperCase()}
              </span>
            )}
            <div style={{textAlign:"right",flexShrink:0}}>
              <div className="mono" style={{fontWeight:700,fontSize:13,
                color:tx.type==="payment_in"?"var(--green)":"var(--blue)"}}>
                {tx.type==="payment_in"?"+":""}{f$(tx.amount)}
              </div>
              <div style={{fontSize:9,color:"var(--t3)",marginTop:1}}>{TX_TYPES[tx.type]?.label}</div>
            </div>
          </div>
        ))
      }
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ACCOUNTS PAYABLE
───────────────────────────────────────────────────────────────────────────── */
function APPanel({ transactions, onAdd }) {
  const apTxs = transactions.filter(t=>TX_SIDE[t.type]==="ap").sort((a,b)=>b.date>a.date?1:-1);
  const totalBilled = apTxs.filter(t=>t.type==="bill").reduce((s,t)=>s+t.amount,0);
  const paid        = apTxs.filter(t=>t.type==="payment_out").reduce((s,t)=>s+t.amount,0);
  const apBalance   = totalBilled - paid;
  const [, forceRefresh] = useState(0);

  const STATUS_C = { received:"var(--blue)",approved:"var(--purple)",scheduled:"var(--amber)",paid:"var(--green)" };

  return (
    <div>
      <div className="g4" style={{gap:9,marginBottom:14}}>
        <KpiCard label="Total AP"    value={f$(totalBilled)} color="var(--amber)"/>
        <KpiCard label="Paid Out"    value={f$(paid)}        color="var(--green)"/>
        <KpiCard label="Outstanding" value={f$(apBalance)}   color={apBalance>0?"var(--acc)":"var(--t2)"} warn={apBalance>0}/>
        <KpiCard label="Vendors"     value={[...new Set(apTxs.map(t=>t.vendor).filter(Boolean))].length} color="var(--purple)"/>
      </div>

      <SectionHead action={
        <button className="btn btn-primary btn-xs" onClick={()=>onAdd("bill")}>+ Bill / Payment</button>
      }>Accounts Payable</SectionHead>

      {apTxs.length === 0
        ? <EmptyState icon="📬" msg="No vendor bills yet — add a bill to track AP"/>
        : apTxs.map(tx => {
          const isPaid    = tx.status === "paid";
          const isLinked  = !!tx.vendorId;
          return (
            <div key={tx.id} className="row" style={{display:"flex",alignItems:"center",gap:10,
              opacity:isPaid?0.65:1}}>
              <div style={{width:36,height:36,borderRadius:9,flexShrink:0,display:"flex",alignItems:"center",
                justifyContent:"center",background:TX_TYPES[tx.type]?.bg,color:TX_TYPES[tx.type]?.color,fontSize:14}}>
                {tx.type==="bill"?"📬":"💸"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:12,fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",
                    whiteSpace:"nowrap",textDecoration:isPaid?"line-through":"none"}}>{tx.description}</span>
                  {isLinked && (
                    <span style={{fontSize:8,padding:"1px 5px",borderRadius:3,fontFamily:"var(--mono)",fontWeight:700,
                      background:"rgba(232,156,24,.15)",color:"#e89c18",flexShrink:0}}>LINKED</span>
                  )}
                  {(tx.receipts||[]).length > 0 && (
                    <div style={{display:"flex",gap:3,flexShrink:0}}>
                      {tx.receipts.slice(0,3).map((r,i)=>(
                        <a key={i} href={r.dataUrl} target="_blank" rel="noreferrer" title={r.name}>
                          {r.type?.startsWith("image/")
                            ? <img src={r.dataUrl} alt="" style={{width:22,height:22,borderRadius:4,objectFit:"cover",border:"1px solid var(--br)"}}/>
                            : <span style={{fontSize:8,padding:"2px 4px",background:"var(--s3)",borderRadius:4,
                                border:"1px solid var(--br)",color:"var(--acc)",fontFamily:"var(--mono)"}}>PDF</span>
                          }
                        </a>
                      ))}
                      {tx.receipts.length > 3 && <span style={{fontSize:9,color:"var(--t3)"}}>+{tx.receipts.length-3}</span>}
                    </div>
                  )}
                </div>
                <div style={{fontSize:10,color:"var(--t3)",marginTop:1,fontFamily:"var(--mono)"}}>
                  {tx.date}{tx.vendor?` · ${tx.vendor}`:""}{tx.category?` · ${tx.category}`:""}
                </div>
              </div>
              {tx.status && (
                <span style={{fontSize:9,fontWeight:700,fontFamily:"var(--mono)",
                  color:STATUS_C[tx.status]||"var(--t3)",background:`${STATUS_C[tx.status]||"var(--t3)"}18`,
                  border:`1px solid ${STATUS_C[tx.status]||"var(--t3)"}40`,borderRadius:4,padding:"2px 6px"}}>
                  {tx.status.toUpperCase()}
                </span>
              )}
              {/* Quick Mark Paid button for bills */}
              {tx.type === "bill" && (
                <button className={`btn btn-xs ${isPaid?"btn-ghost":""}`}
                  style={isPaid?{}:{background:"var(--green)",borderColor:"var(--green)",color:"#fff"}}
                  onClick={()=>{
                    // Update status in Firestore transactions is handled by parent but we mirror to LS
                    if (tx.vendorId) lsMarkVendorBillPaid(tx.id, !isPaid);
                    forceRefresh(n=>n+1);
                    // Note: full Firestore status update requires parent save — show visual immediately
                  }}
                  title={isPaid?"Marked Paid":"Mark as Paid"}>
                  {isPaid ? "✓ Paid" : "Mark Paid"}
                </button>
              )}
              <div style={{textAlign:"right",flexShrink:0}}>
                <div className="mono" style={{fontWeight:700,fontSize:13,
                  color:tx.type==="payment_out"?"var(--green)":"var(--acc)"}}>
                  {f$(tx.amount)}
                </div>
                <div style={{fontSize:9,color:"var(--t3)",marginTop:1}}>{TX_TYPES[tx.type]?.label}</div>
              </div>
            </div>
          );
        })
      }
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ALL TRANSACTIONS
───────────────────────────────────────────────────────────────────────────── */
function TransactionsPanel({ transactions, onAdd }) {
  const [filter, setFilter] = useState("all");
  // Exclude synthetic generated-invoice entries — those are managed in ARPanel
  const sorted = [...transactions].filter(t=>!t._isGenerated).sort((a,b)=>b.date>a.date?1:-1);
  const vis = filter==="all" ? sorted : sorted.filter(t=>TX_SIDE[t.type]===filter||t.type===filter);

  return (
    <div>
      <SectionHead action={
        <button className="btn btn-primary btn-xs" onClick={()=>onAdd("expense")}>+ Add Entry</button>
      }>All Transactions</SectionHead>

      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
        {[["all","All"],["ar","Receivable"],["ap","Payable"],["cost","Costs"]].map(([k,l])=>(
          <Pill key={k} active={filter===k} onClick={()=>setFilter(k)}>{l}</Pill>
        ))}
      </div>

      {vis.length===0
        ? <EmptyState icon="📊" msg="No transactions yet"/>
        : vis.map(tx=>(
          <div key={tx.id} style={{display:"flex",alignItems:"center",gap:10,
            padding:"8px 11px",background:"var(--s2)",border:"1px solid var(--br)",
            borderRadius:7,marginBottom:3,borderLeft:`3px solid ${TX_TYPES[tx.type]?.color||"var(--br)"}`}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                <span style={{fontSize:12,fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {tx.description}
                </span>
                {/* Receipt thumbnails */}
                {(tx.receipts||[]).length > 0 && (
                  <div style={{display:"flex",gap:3,alignItems:"center",flexShrink:0}}>
                    {tx.receipts.slice(0,3).map((r,i)=>(
                      <a key={i} href={r.dataUrl} target="_blank" rel="noreferrer" title={r.name}>
                        {r.type?.startsWith("image/")
                          ? <img src={r.dataUrl} alt="" style={{width:20,height:20,borderRadius:3,objectFit:"cover",border:"1px solid var(--br)",display:"block"}}/>
                          : <span style={{fontSize:8,padding:"1px 4px",background:"var(--s3)",borderRadius:3,
                              border:"1px solid var(--br)",color:"var(--acc)",fontFamily:"var(--mono)"}}>PDF</span>
                        }
                      </a>
                    ))}
                    {tx.receipts.length > 3 && <span style={{fontSize:9,color:"var(--t3)"}}>+{tx.receipts.length-3}</span>}
                  </div>
                )}
              </div>
              <div style={{fontSize:10,color:"var(--t3)",marginTop:1,fontFamily:"var(--mono)"}}>
                {tx.date}
                {tx.vendor?` · ${tx.vendor}`:""}
                {tx.category?` · ${tx.category}`:""}
              </div>
            </div>
            <span style={{fontSize:9,color:TX_TYPES[tx.type]?.color,background:TX_TYPES[tx.type]?.bg,
              border:`1px solid ${TX_TYPES[tx.type]?.color}40`,borderRadius:4,padding:"2px 6px",
              fontFamily:"var(--mono)",fontWeight:700,flexShrink:0}}>
              {TX_TYPES[tx.type]?.label}
            </span>
            <div className="mono" style={{fontWeight:700,fontSize:13,flexShrink:0,
              color:TX_SIDE[tx.type]==="ar"&&tx.type!=="invoice"?"var(--green)":
                   TX_SIDE[tx.type]==="ap"&&tx.type!=="bill"?"var(--green)":"var(--t1)"}}>
              {f$(tx.amount)}
            </div>
          </div>
        ))
      }
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   AI ANALYST PANEL
───────────────────────────────────────────────────────────────────────────── */
function AIAnalystPanel({ proj, data, health, companyId="" }) {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const abortRef = useRef(null);

  const txs = data?.transactions || [];
  const budgets = data?.budgets || {};
  const totalCosts    = txs.filter(t=>TX_SIDE[t.type]==="cost"||TX_SIDE[t.type]==="ap").reduce((s,t)=>s+t.amount,0);
  const totalInvoiced = txs.filter(t=>t.type==="invoice").reduce((s,t)=>s+t.amount,0);
  const collected     = txs.filter(t=>t.type==="payment_in").reduce((s,t)=>s+t.amount,0);
  const totalAP       = txs.filter(t=>t.type==="bill").reduce((s,t)=>s+t.amount,0);
  const totBudget     = Object.values(budgets).reduce((s,b)=>s+(b.budgeted||0),0);

  const analyze = async () => {
    setLoading(true); setError(""); setAnalysis("");
    const prompt = `You are a financial analyst for a restoration contractor company. Analyze this job's financials and give a concise, actionable report.

JOB: ${proj.name} (${proj.id}) | Type: ${proj.type} | Status: ${proj.status}

FINANCIAL SUMMARY:
- Total Budget: ${f$(totBudget)}
- Total Invoiced (AR): ${f$(totalInvoiced)}
- Collected: ${f$(collected)} | AR Balance: ${f$(totalInvoiced-collected)}
- Total Costs + AP: ${f$(totalCosts)}
- Vendor Bills (AP): ${f$(totalAP)}
- Gross Margin: ${totalInvoiced>0?((totalInvoiced-totalCosts)/totalInvoiced*100).toFixed(1)+"%" : "N/A"}
- Health Status: ${health?.label || "Unknown"}

BUDGET BY CATEGORY:
${Object.entries(budgets).map(([wt,b])=>`- ${wt}: Budgeted ${f$(b.budgeted)}, Target Margin ${b.targetMargin||30}%`).join("\n")}

RECENT TRANSACTIONS (last 10):
${txs.slice(-10).map(t=>`- ${t.date} | ${TX_TYPES[t.type]?.label} | ${f$(t.amount)} | ${t.description}`).join("\n")}

Provide:
1. **Financial Health Assessment** (2-3 sentences)
2. **Key Risks** (bullet points, be specific with dollar amounts)
3. **Recommended Actions** (prioritized, actionable)
4. **One-line Bottom Line** for the project manager

Be direct and specific. Flag anything that needs immediate attention.`;

    try {
      const json = await fetch("/.netlify/functions/finance-analyze", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt, mode:"job", companyId })
      }).then(r=>r.json());
      if (json.error === "cortex_coins_exhausted") {
        setError(json.message || "You've used all of your Cortex Coins for this billing cycle.");
        setLoading(false);
        return;
      }
      if (json.error) throw new Error(json.error);
      setAnalysis(json.text || "No analysis returned.");
    } catch(e) {
      setError(e.message || "Unable to reach AI analyst. Check your connection.");
    }
    setLoading(false);
  };

  // Parse markdown-ish bold text for display
  const renderAnalysis = (text) => {
    return text.split("\n").map((line,i)=>{
      const bold = line.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>");
      if (line.startsWith("**")&&line.endsWith("**")) {
        return <div key={i} style={{fontWeight:700,color:"var(--t1)",fontSize:13,marginTop:i>0?12:0,marginBottom:4}}
          dangerouslySetInnerHTML={{__html:bold}}/>;
      }
      if (line.startsWith("- ")) {
        return <div key={i} style={{display:"flex",gap:7,padding:"2px 0",fontSize:12,color:"var(--t2)"}}>
          <span style={{color:"var(--acc)",flexShrink:0}}>›</span>
          <span dangerouslySetInnerHTML={{__html:bold.slice(2)}}/>
        </div>;
      }
      if (line.trim()==="") return <div key={i} style={{height:6}}/>;
      return <div key={i} style={{fontSize:12,color:"var(--t2)",lineHeight:1.6}} dangerouslySetInnerHTML={{__html:bold}}/>;
    });
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:16,padding:"13px 15px",
        background:"rgba(167,139,250,.08)",border:"1px solid rgba(167,139,250,.2)",borderRadius:11}}>
        <div style={{width:38,height:38,borderRadius:10,background:"rgba(167,139,250,.18)",
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18}}>🧠</div>
        <div>
          <div style={{fontWeight:700,fontSize:13,color:"var(--t1)",marginBottom:3}}>AI Financial Analyst</div>
          <div style={{fontSize:11,color:"var(--t2)",lineHeight:1.5}}>
            Powered by Claude AI. Analyzes your budget, transactions, AR/AP balances, and margin
            health to surface risks and recommend actions.
          </div>
        </div>
      </div>

      {/* Quick snapshot */}
      <div className="g4" style={{gap:9,marginBottom:14}}>
        <KpiCard label="Health" value={health?.label||"—"} color={health?.color||"var(--t3)"} warn={health?.status==="critical"||health?.status==="warning"}/>
        <KpiCard label="Gross Margin" value={health?.grossMargin!=null?`${health.grossMargin.toFixed(1)}%`:"—"} color={health?.grossMargin>=30?"var(--green)":health?.grossMargin>=15?"var(--amber)":"var(--acc)"}/>
        <KpiCard label="Cost Pressure" value={health?.pressure!=null?`${(health.pressure*100).toFixed(0)}%`:"—"} color={health?.pressure>=1?"var(--acc)":health?.pressure>=0.85?"var(--amber)":"var(--green)"}/>
        <KpiCard label="AR Outstanding" value={f$(health?.arBalance||0)} color={(health?.arBalance||0)>0?"var(--blue)":"var(--t2)"}/>
      </div>

      <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",marginBottom:14,fontSize:13,padding:"10px"}}
        onClick={analyze} disabled={loading}>
        {loading ? "Analyzing…" : "🧠 Run AI Financial Analysis"}
      </button>

      {error && (
        <div style={{padding:"10px 13px",background:"var(--acc-lo)",border:"1px solid rgba(228,53,49,.25)",
          borderRadius:8,fontSize:12,color:"var(--acc)",marginBottom:12}}>{error}</div>
      )}

      {analysis && (
        <div className="card">
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:12}}>
            <span style={{fontSize:9,fontWeight:700,fontFamily:"var(--mono)",color:"var(--purple)",
              background:"rgba(167,139,250,.15)",border:"1px solid rgba(167,139,250,.3)",
              borderRadius:4,padding:"2px 7px"}}>AI ANALYSIS</span>
            <span style={{fontSize:10,color:"var(--t3)"}}>Generated {new Date().toLocaleTimeString()}</span>
          </div>
          <div style={{lineHeight:1.7}}>{renderAnalysis(analysis)}</div>
        </div>
      )}

      {!analysis && !loading && (
        <EmptyState icon="📈" msg="Click 'Run AI Financial Analysis' to get insights on this job"/>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   APPROVED ESTIMATES → INVOICE CONVERSION
───────────────────────────────────────────────────────────────────────────── */
function ApprovedEstimatesPanel({ proj, invoices=[], onInvoiceCreated }) {
  const [estimates, setEstimates] = useState(()=>loadProjEstimates(proj.id));
  useEffect(()=>{ setEstimates(loadProjEstimates(proj.id)); },[proj.id]);

  // Only show accepted/approved estimates that haven't already been converted
  const convertedEstIds = new Set(invoices.filter(i=>i._fromEstimateId).map(i=>i._fromEstimateId));
  const eligible = estimates.filter(e=>(e.status==="accepted"||e.status==="approved") && !convertedEstIds.has(e.id));

  if (eligible.length===0) return null;

  const tierTotal = t => (t?.items||[]).reduce((s,i)=>s+(i.total||i.price||0),0);

  const convert = (est) => {
    // Find the accepted/recommended tier, or the first one
    const tier = est.tiers?.find(t=>t.recommended) || est.tiers?.[0];
    if (!tier) return;
    const total = tierTotal(tier);
    const invNum = `INV-${Date.now().toString(36).toUpperCase()}`;
    const inv = {
      id:          `inv-est-${est.id}-${Date.now()}`,
      projId:      proj.id,
      projName:    proj.name||"",
      number:      invNum,
      clientName:  est.client||proj.client||"",
      clientEmail: proj.clientEmail||"",
      date:        new Date().toISOString(),
      dueDate:     new Date(Date.now()+30*86400000).toISOString(),
      summary:     `${est.name} — ${tier.label} Package (${tier.title})`,
      lineItems:   tier.items.map(item=>({
        id:item.id, description:item.name, qty:item.qty||1, rate:item.price, amount:item.total||item.price,
      })),
      subtotal:    total,
      total:       total,
      terms:       "Net 30",
      status:      "unpaid",
      invoiceMode: "simple",
      createdAt:   new Date().toISOString(),
      _fromEstimateId: est.id,
      _fromEstimateTier: tier.label,
    };
    onInvoiceCreated(inv);
  };

  return (
    <div style={{marginTop:18}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{fontSize:12,fontWeight:700,color:"var(--t1)",display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:14}}>📋</span> Approved Estimates
          <span style={{fontSize:9,fontWeight:700,fontFamily:"var(--mono)",background:"rgba(26,217,138,.12)",
            color:"var(--green)",borderRadius:3,padding:"1px 6px",border:"1px solid rgba(26,217,138,.25)"}}>
            {eligible.length} ready
          </span>
        </div>
      </div>
      <div style={{fontSize:10,color:"var(--t3)",marginBottom:10}}>
        These accepted estimates can be converted into invoices for billing.
      </div>
      {eligible.map(est=>{
        const tier = est.tiers?.find(t=>t.recommended) || est.tiers?.[0];
        const total = tier ? tierTotal(tier) : 0;
        return (
          <div key={est.id} style={{display:"flex",alignItems:"center",gap:10,
            padding:"10px 13px",background:"var(--s2)",border:"1px solid var(--br)",
            borderRadius:9,marginBottom:5,borderLeft:"3px solid var(--green)"}}>
            <div style={{width:38,height:38,borderRadius:9,display:"flex",alignItems:"center",
              justifyContent:"center",background:"rgba(26,217,138,.12)",fontSize:16}}>📋</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                <span style={{fontSize:12,fontWeight:700,color:"var(--t1)"}}>{est.name}</span>
                <span style={{fontSize:9,fontWeight:700,fontFamily:"var(--mono)",
                  color:"var(--green)",background:"rgba(26,217,138,.1)",
                  border:"1px solid rgba(26,217,138,.3)",borderRadius:4,padding:"1px 6px"}}>
                  {(est.status||"").toUpperCase()}
                </span>
                {tier && (
                  <span style={{fontSize:9,fontFamily:"var(--mono)",color:"var(--t3)"}}>
                    {tier.label} Package
                  </span>
                )}
              </div>
              <div className="mono" style={{fontSize:9,color:"var(--t3)",marginTop:2}}>
                {est.id} · {est.client} · {est.date}
              </div>
            </div>
            <div style={{textAlign:"right",flexShrink:0,marginRight:6}}>
              <div className="mono" style={{fontWeight:800,fontSize:14,color:"var(--green)"}}>
                {f$c(total)}
              </div>
              <div style={{fontSize:9,color:"var(--t3)",marginTop:1}}>
                {tier?.items?.length||0} line item{(tier?.items?.length||0)!==1?"s":""}
              </div>
            </div>
            <button className="btn btn-xs" style={{fontSize:10,background:"rgba(26,217,138,.12)",
              color:"var(--green)",border:"1px solid rgba(26,217,138,.3)",whiteSpace:"nowrap"}}
              onClick={()=>{ if(window.confirm(`Convert "${est.name}" (${tier?.label} — ${f$c(total)}) into an invoice?`)) convert(est); }}>
              Convert to Invoice
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FINANCIAL TAB  (exported)
───────────────────────────────────────────────────────────────────────────── */
export function FinancialTab({ proj, companyId, laborCost=0, invoices: _invoicesProp=[], onInvoiceVoid }) {
  useEffect(() => { if (companyId) _financeCompanyId = companyId; }, [companyId]);
  const [subTab, setSubTab] = useState("overview");
  const [data, setData]     = useState({ budgets:{}, transactions:[] });
  const [saving, setSaving] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [addTypeHint, setAddTypeHint] = useState("invoice");

  // ── Per-project budget (localStorage) ──
  const [projBudget, setProjBudget] = useState(() => lsGetProjectBudget(proj.id));
  const handleBudgetChange = useCallback((updated) => {
    lsSaveProjectBudget(proj.id, updated);
    setProjBudget(updated);
  }, [proj.id]);
  // Re-sync when navigating between projects
  useEffect(() => { setProjBudget(lsGetProjectBudget(proj.id)); }, [proj.id]);

  // ── Local invoice state (reads from localStorage, reactive to updates within this session) ──
  const [invoices, setInvoices] = useState(() => lsGetInvoices(proj.id));

  const handleInvoiceChange = (id, patch) => {
    const updated = lsUpdateInvoice(id, patch);
    setInvoices(lsGetInvoices(proj.id));
    // If voiding, also call portal callback if provided
    if (patch.status === "void" && onInvoiceVoid) onInvoiceVoid(id);
  };

  // Re-sync invoices when proj.id changes (navigating between projects)
  useEffect(() => {
    setInvoices(lsGetInvoices(proj.id));
  }, [proj.id]);

  // Firestore path
  const docRef = useMemo(()=>
    companyId ? doc(getDb(),"companies",companyId,"jobFinancials",proj.id) : null,
    [companyId, proj.id]
  );

  // Load financial data
  useEffect(() => {
    if (!docRef) return;
    const unsub = onSnapshot(docRef, snap => {
      if (snap.exists()) {
        setData({ budgets:{}, transactions:[], ...snap.data() });
      } else {
        const seedBudgets = {};
        (proj.worktypes||[]).forEach(wt => {
          seedBudgets[wt.type||wt] = { budgeted: wt.budget||0, targetMargin:30 };
        });
        setData({ budgets:seedBudgets, transactions:[] });
      }
    });
    return unsub;
  }, [docRef]);

  // Inject labor cost from shifts as a synthetic transaction
  const allTransactions = useMemo(() => {
    const base = data.transactions || [];
    // Merge in synthetic invoice entries for totals (AR sub-tab handles display separately)
    const invTxs = invoices.filter(i=>i.status!=="void").map(invoiceToTx);
    const withLabor = (() => {
      if (!laborCost) return base;
      const hasLabor = base.some(t=>t.id==="__labor__");
      if (hasLabor) return base.map(t=>t.id==="__labor__"?{...t,amount:laborCost}:t);
      return [...base, {id:"__labor__",type:"payroll",date:today(),description:"Labor (from Shift Reports)",amount:laborCost,category:"Labor",auto:true}];
    })();
    return [...withLabor, ...invTxs];
  }, [data.transactions, laborCost, invoices]);

  const health = useMemo(() => computeHealth({...data,transactions:allTransactions}), [data, allTransactions]);

  const save = useCallback(async (patch) => {
    if (!docRef) return;
    setSaving(true);
    try {
      await setDoc(docRef, { ...data, ...patch, updatedAt:serverTimestamp() }, { merge:true });
    } catch(e) { console.error(e); }
    setSaving(false);
  }, [docRef, data]);

  const addTransaction = useCallback((tx) => {
    const newTxs = [...(data.transactions||[]), tx].filter(t=>t.id!=="__labor__"||!tx.auto);
    save({ transactions: newTxs });
    // Mirror bill to vendor bills LS so VendorManagerTab can show it without Firestore subscription
    if (tx.type === "bill" && (tx.vendorId || tx.vendor)) {
      lsUpsertVendorBill({
        id:          tx.id,
        projId:      proj.id,
        projName:    proj.name || "",
        vendorId:    tx.vendorId || "",
        vendorName:  tx.vendor  || "",
        date:        tx.date,
        amount:      tx.amount,
        description: tx.description,
        status:      tx.status || "received",
        budgetCatId: tx.budgetCatId || "",
        category:    tx.category || "",
        notes:       tx.notes || "",
      });
    }
  }, [data.transactions, save, proj.id, proj.name]);

  const setBudgets = useCallback((fn) => {
    const newBudgets = typeof fn==="function" ? fn(data.budgets||{}) : fn;
    save({ budgets:newBudgets });
  }, [data.budgets, save]);

  const openAdd = (typeHint="invoice") => { setAddTypeHint(typeHint); setAddModal(true); };

  const SUBTABS = [
    { k:"overview", l:"Overview"     },
    { k:"budget",   l:"Budget"       },
    { k:"ar",       l:"Receivable"   },
    { k:"ap",       l:"Payable"      },
    { k:"txns",     l:"Transactions" },
    { k:"ai",       l:"AI Analyst"   },
  ];

  // Totals factor in localStorage invoices
  const totBudget     = Object.values(data.budgets||{}).reduce((s,b)=>s+(b.budgeted||0),0);
  const invTotal      = invoices.filter(i=>i.status!=="void").reduce((s,i)=>s+(i.total||0),0);
  const invPaid       = invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+(i.total||0),0);
  const manualInvoiced= (data.transactions||[]).filter(t=>t.type==="invoice").reduce((s,t)=>s+t.amount,0);
  const manualPaid    = (data.transactions||[]).filter(t=>t.type==="payment_in").reduce((s,t)=>s+t.amount,0);
  const totalInvoiced = invTotal + manualInvoiced;
  const collected     = invPaid  + manualPaid;
  const totalCosts    = allTransactions.filter(t=>TX_SIDE[t.type]==="cost"||TX_SIDE[t.type]==="ap").reduce((s,t)=>s+t.amount,0);
  const totalAP       = allTransactions.filter(t=>t.type==="bill").reduce((s,t)=>s+t.amount,0);

  return (
    <div className="scroll">
      {addModal && (
        <AddTransactionModal
          onSave={addTransaction}
          onClose={()=>setAddModal(false)}
          worktypes={proj.worktypes||[]}
          defaultType={addTypeHint}
          budgetCategories={projBudget.categories||[]}
        />
      )}

      <div style={{maxWidth:960,margin:"0 auto",paddingBottom:24}}>
        {/* Sub-tab bar */}
        <div style={{display:"flex",gap:4,borderBottom:"1px solid var(--br)",marginBottom:16,paddingBottom:0,overflowX:"auto"}}>
          {SUBTABS.map(t=>(
            <button key={t.k} onClick={()=>setSubTab(t.k)}
              className={`tab${subTab===t.k?" active":""}`}
              style={{whiteSpace:"nowrap",borderBottom:subTab===t.k?"2px solid var(--acc)":"2px solid transparent",marginBottom:"-1px"}}>
              {t.l}
              {t.k==="ar" && invoices.filter(i=>i.status==="unpaid").length>0 && (
                <span style={{marginLeft:4,fontSize:8,background:"rgba(232,156,24,.2)",color:"var(--amber)",
                  borderRadius:3,padding:"1px 5px",fontFamily:"var(--mono)"}}>
                  {invoices.filter(i=>i.status==="unpaid").length}
                </span>
              )}
              {t.k==="ai" && <span style={{marginLeft:4,fontSize:8,background:"rgba(167,139,250,.2)",color:"var(--purple)",borderRadius:3,padding:"1px 4px",fontFamily:"var(--mono)"}}>AI</span>}
            </button>
          ))}
          {saving && <span style={{marginLeft:"auto",fontSize:10,color:"var(--t3)",alignSelf:"center",fontFamily:"var(--mono)"}}>saving…</span>}
        </div>

        {/* ── OVERVIEW ── */}
        {subTab==="overview" && (
          <div>
            {health && health.status!=="ok" && (
              <div style={{padding:"11px 14px",background:`${health.color}10`,border:`1px solid ${health.color}35`,
                borderRadius:10,marginBottom:14,display:"flex",alignItems:"center",gap:11}}>
                <HealthPill {...health}/>
                <div style={{flex:1,fontSize:12,color:"var(--t1)"}}>
                  {health.status==="critical" && `Costs have exceeded the margin target. ${f$(Math.abs(totalCosts-totBudget))} over budget.`}
                  {health.status==="warning"  && `Costs are ${(health.pressure*100).toFixed(0)}% of the target ceiling. Monitor closely.`}
                  {health.status==="watch"    && `Costs are tracking toward the margin limit. No action needed yet.`}
                </div>
                <button className="btn btn-xs" onClick={()=>setSubTab("ai")}
                  style={{background:"rgba(167,139,250,.15)",color:"var(--purple)",border:"1px solid rgba(167,139,250,.3)"}}>
                  🧠 Analyze
                </button>
              </div>
            )}

            {/* Invoice summary banner when invoices exist */}
            {invoices.length > 0 && (
              <div style={{padding:"11px 14px",background:"rgba(91,163,245,.07)",border:"1px solid rgba(91,163,245,.2)",
                borderRadius:10,marginBottom:14,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <div>
                  <div style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)",marginBottom:2}}>GENERATED INVOICES</div>
                  <div className="mono" style={{fontSize:15,fontWeight:800,color:"var(--blue)"}}>{f$c(invTotal)}</div>
                </div>
                <div style={{width:1,height:32,background:"var(--br)"}}/>
                <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                  {[
                    [`${invoices.filter(i=>i.status==="unpaid").length} Unpaid`, "var(--amber)"],
                    [`${invoices.filter(i=>i.status==="paid").length} Paid`,     "var(--green)"],
                    [`${invoices.filter(i=>i.status==="void").length} Void`,     "var(--t3)"  ],
                  ].map(([l,c])=>(
                    <div key={l} style={{fontSize:11,color:c,fontWeight:600}}>{l}</div>
                  ))}
                </div>
                <button className="btn btn-secondary btn-xs" style={{marginLeft:"auto"}} onClick={()=>setSubTab("ar")}>
                  View Invoices →
                </button>
              </div>
            )}

            <div className="g4" style={{gap:9,marginBottom:14}}>
              <KpiCard label="Total Budget"   value={f$(totBudget)}     color="var(--t1)"/>
              <KpiCard label="Total Invoiced" value={f$(totalInvoiced)} color="var(--blue)"/>
              <KpiCard label="Costs / AP"     value={f$(totalCosts)}    color={totalCosts>totBudget?"var(--acc)":"var(--amber)"}
                warn={totalCosts>totBudget}/>
              <KpiCard label="AR Outstanding" value={f$(totalInvoiced-collected)} color="var(--green)"/>
            </div>

            <div className="g2" style={{gap:9,marginBottom:14}}>
              <div className="card">
                <div className="sec" style={{marginBottom:10}}>Budget Utilization</div>
                {Object.entries(data.budgets||{}).slice(0,6).map(([wt,b])=>{
                  const act = allTransactions.filter(t=>t.category===wt&&(TX_SIDE[t.type]==="cost"||TX_SIDE[t.type]==="ap")).reduce((s,t)=>s+t.amount,0);
                  const p = parseFloat(fPct(act,b.budgeted));
                  const col = p>=100?"var(--acc)":p>=80?"var(--amber)":"var(--green)";
                  return (
                    <div key={wt} style={{marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                        <span style={{color:"var(--t1)",fontWeight:600}}>{wt}</span>
                        <span className="mono" style={{color:col,fontSize:10}}>{f$(act)} / {f$(b.budgeted)}</span>
                      </div>
                      <MiniBar value={act} max={b.budgeted||1} color={col} height={5}/>
                    </div>
                  );
                })}
                {Object.keys(data.budgets||{}).length===0 && (
                  <div style={{textAlign:"center",padding:"16px 0",color:"var(--t3)",fontSize:12}}>
                    No budgets set — <button className="btn btn-ghost btn-xs" onClick={()=>setSubTab("budget")}>set up budget</button>
                  </div>
                )}
              </div>

              <div className="card">
                <div className="sec" style={{marginBottom:10}}>Cash Flow Summary</div>
                {[
                  ["Invoiced (AR)",      totalInvoiced,          "var(--blue)"],
                  ["Collected",          collected,              "var(--green)"],
                  ["AR Balance",         totalInvoiced-collected,"var(--teal)"],
                  ["Vendor Bills (AP)",  totalAP,                "var(--amber)"],
                  ["Other Costs",        totalCosts-totalAP,     "var(--acc)"],
                  ["Gross Margin",       totalInvoiced-totalCosts,totalInvoiced>totalCosts?"var(--green)":"var(--acc)"],
                ].map(([l,v,c])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid var(--br)"}}>
                    <span style={{fontSize:11,color:"var(--t2)"}}>{l}</span>
                    <span className="mono" style={{fontWeight:700,fontSize:12,color:c}}>{f$(v)}</span>
                  </div>
                ))}
                <div style={{marginTop:9,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,fontWeight:700,color:"var(--t1)"}}>Margin %</span>
                  <span className="mono" style={{fontWeight:700,fontSize:15,
                    color:health?.grossMargin>=30?"var(--green)":health?.grossMargin>=15?"var(--amber)":"var(--acc)"}}>
                    {health?.grossMargin!=null?`${health.grossMargin.toFixed(1)}%`:"—"}
                  </span>
                </div>
              </div>
            </div>

            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
              <button className="btn btn-secondary btn-xs" onClick={()=>openAdd("invoice")}>+ Manual Invoice</button>
              <button className="btn btn-secondary btn-xs" onClick={()=>openAdd("payment_in")}>+ Payment Received</button>
              <button className="btn btn-secondary btn-xs" onClick={()=>openAdd("bill")}>+ Vendor Bill</button>
              <button className="btn btn-secondary btn-xs" onClick={()=>openAdd("expense")}>+ CC / Expense</button>
            </div>
          </div>
        )}

        {/* ── BUDGET ── */}
        {subTab==="budget" && (
          <WorktypeBudgetTab
            proj={proj}
            transactions={allTransactions}
            budgetData={projBudget}
            onBudgetChange={handleBudgetChange}
            invoices={invoices}
          />
        )}

        {/* ── AR ── */}
        {subTab==="ar" && (
          <>
            <ARPanel
              transactions={allTransactions}
              invoices={invoices}
              onAdd={openAdd}
              onInvoiceChange={handleInvoiceChange}
            />
            <ApprovedEstimatesPanel proj={proj} invoices={invoices} onInvoiceCreated={(inv)=>{
              lsSaveAll([...lsGetInvoices(), inv]);
              setInvoices(lsGetInvoices(proj.id));
            }}/>
          </>
        )}

        {/* ── AP ── */}
        {subTab==="ap" && <APPanel transactions={allTransactions} onAdd={openAdd}/>}

        {/* ── TRANSACTIONS ── */}
        {subTab==="txns" && <TransactionsPanel transactions={allTransactions} onAdd={openAdd}/>}

        {/* ── AI ── */}
        {subTab==="ai" && <AIAnalystPanel proj={proj} data={{...data,transactions:allTransactions}} health={health} companyId={companyId}/>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FINANCIAL DASHBOARD  (exported — full portfolio-level page)
───────────────────────────────────────────────────────────────────────────── */
export function FinancialDashboard({ projects=[], companyId, onNavigate }) {
  useEffect(() => { if (companyId) _financeCompanyId = companyId; }, [companyId]);
  const [jobData, setJobData]   = useState({});  // { [projId]: financialData }
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [aiReport, setAiReport] = useState("");
  const [aiLoading, setAiLoad]  = useState(false);
  // Read all generated invoices from localStorage (jd_invoices) — these are written by the
  // portal's scope/invoice builder and are NOT stored in Firestore transactions.
  const [allLsInvoices, setAllLsInvoices] = useState(() => lsGetInvoices());

  // Load financials for all projects
  useEffect(() => {
    if (!companyId || !projects.length) { setLoading(false); return; }
    let loaded = 0;
    const unsubs = projects.map(p => {
      const ref = doc(getDb(),"companies",companyId,"jobFinancials",p.id);
      return onSnapshot(ref, snap => {
        setJobData(prev => ({ ...prev, [p.id]: snap.exists() ? snap.data() : null }));
        loaded++;
        if (loaded >= projects.length) setLoading(false);
      });
    });
    return () => unsubs.forEach(u=>u());
  }, [companyId, projects.length]);

  // Compute health for each project
  const healthMap = useMemo(() => {
    const map = {};
    projects.forEach(p => {
      map[p.id] = computeHealth(jobData[p.id], p);
    });
    return map;
  }, [jobData, projects]);

  // Aggregate stats
  const stats = useMemo(() => {
    const critical = projects.filter(p=>healthMap[p.id]?.status==="critical");
    const warning  = projects.filter(p=>healthMap[p.id]?.status==="warning");
    const watch    = projects.filter(p=>healthMap[p.id]?.status==="watch");
    const ok       = projects.filter(p=>healthMap[p.id]?.status==="ok");
    const noData   = projects.filter(p=>!healthMap[p.id]);

    // AR from Firestore manual transactions
    const firestoreAR = Object.values(jobData).reduce((s,d)=>{
      if (!d?.transactions) return s;
      const inv = d.transactions.filter(t=>t.type==="invoice").reduce((ss,t)=>ss+t.amount,0);
      const pay = d.transactions.filter(t=>t.type==="payment_in").reduce((ss,t)=>ss+t.amount,0);
      return s+(inv-pay);
    },0);

    // AR from jd_invoices localStorage — generated invoices from scope/invoice builder.
    // Outstanding = non-void invoices that haven't been fully paid.
    const lsAR = allLsInvoices.reduce((s,inv)=>{
      if (inv.status==="void" || inv.status==="paid") return s;
      return s+(inv.total||0);
    },0);

    const totalAR  = firestoreAR + lsAR;

    const totalAP  = Object.values(jobData).reduce((s,d)=>{
      if (!d?.transactions) return s;
      const bills = d.transactions.filter(t=>t.type==="bill").reduce((ss,t)=>ss+t.amount,0);
      const paid  = d.transactions.filter(t=>t.type==="payment_out").reduce((ss,t)=>ss+t.amount,0);
      return s+(bills-paid);
    },0);
    return { critical, warning, watch, ok, noData, totalAR, totalAP };
  }, [healthMap, jobData, projects, allLsInvoices]);

  // Filter projects
  const vis = useMemo(() => {
    if (filter==="all") return [...projects].sort((a,b)=>{
      const order = {critical:0,warning:1,watch:2,ok:3};
      return (order[healthMap[a.id]?.status]??4) - (order[healthMap[b.id]?.status]??4);
    });
    if (filter==="nodata") return projects.filter(p=>!healthMap[p.id]);
    return projects.filter(p=>healthMap[p.id]?.status===filter);
  }, [filter, projects, healthMap]);

  // Portfolio AI analysis
  const runPortfolioAI = async () => {
    setAiLoad(true); setAiReport("");
    const critList = stats.critical.map(p=>`${p.name} (${healthMap[p.id]?.grossMargin?.toFixed(1)||"?"}% margin)`).join(", ") || "none";
    const warnList = stats.warning.map(p=>p.name).join(", ") || "none";
    const prompt = `You are a financial analyst for a restoration contractor company. Give a brief portfolio-level financial briefing.

PORTFOLIO: ${projects.length} active projects
- CRITICAL (margin breached): ${stats.critical.length} — ${critList}
- AT RISK: ${stats.warning.length} — ${warnList}
- WATCH: ${stats.watch.length}
- HEALTHY: ${stats.ok.length}
- AR Outstanding: ${f$(stats.totalAR)}
- AP Outstanding: ${f$(stats.totalAP)}

Give a 3-4 sentence executive summary, then bullet-point the top 3 actions for the owner/admin.`;
    try {
      const json = await fetch("/.netlify/functions/finance-analyze", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt, mode:"portfolio", companyId })
      }).then(r=>r.json());
      if (json.error === "cortex_coins_exhausted") {
        setAiReport(json.message || "You've used all of your Cortex Coins for this billing cycle.");
      } else {
        setAiReport(json.text||"");
      }
    } catch { setAiReport("AI analysis unavailable."); }
    setAiLoad(false);
  };

  if (loading) return (
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:"var(--t3)"}}>
      <div style={{fontSize:24}}>📊</div>
      <div style={{fontFamily:"var(--mono)",fontSize:11}}>Loading financial data…</div>
    </div>
  );

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-ttl">Financial Dashboard</div>
          <div className="topbar-sub">PORTFOLIO · FINANCIAL INTELLIGENCE</div>
        </div>
        <button className="btn btn-primary btn-xs" onClick={runPortfolioAI} disabled={aiLoading}
          style={{background:"rgba(167,139,250,.2)",color:"var(--purple)",border:"1px solid rgba(167,139,250,.35)"}}>
          {aiLoading ? "Analyzing…" : "🧠 AI Portfolio Brief"}
        </button>
      </div>

      <div className="scroll">
        <div style={{maxWidth:1200,margin:"0 auto",padding:"16px 18px 32px"}}>

          {/* AI Report banner */}
          {aiReport && (
            <div style={{padding:"13px 16px",background:"rgba(167,139,250,.09)",border:"1px solid rgba(167,139,250,.25)",
              borderRadius:11,marginBottom:16,fontSize:12,color:"var(--t1)",lineHeight:1.7}}>
              <div style={{fontWeight:700,marginBottom:6,color:"var(--purple)"}}>🧠 AI Portfolio Briefing</div>
              {aiReport.split("\n").map((l,i)=>(
                <div key={i} style={{marginBottom:l.startsWith("-")?2:0}}>
                  {l.startsWith("- ")?<span style={{color:"var(--acc)"}}>› </span>:null}
                  {l.replace(/\*\*(.*?)\*\*/g,"$1").slice(l.startsWith("- ")?2:0)}
                </div>
              ))}
            </div>
          )}

          {/* KPI bar */}
          <div className="g4" style={{gap:9,marginBottom:16}}>
            <KpiCard label="● Critical"   value={stats.critical.length} color="var(--acc)"   warn={stats.critical.length>0}/>
            <KpiCard label="⚠ At Risk"    value={stats.warning.length}  color="var(--amber)" warn={stats.warning.length>0}/>
            <KpiCard label="AR Outstanding" value={f$(stats.totalAR)}   color="var(--blue)"/>
            <KpiCard label="AP Outstanding" value={f$(stats.totalAP)}   color={(stats.totalAP>stats.totalAR)?"var(--acc)":"var(--amber)"}/>
          </div>

          {/* Filter pills */}
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>
            {[
              ["all",      `All (${projects.length})`,        ""],
              ["critical", `Critical (${stats.critical.length})`, "var(--acc)"],
              ["warning",  `At Risk (${stats.warning.length})`,   "var(--amber)"],
              ["watch",    `Watch (${stats.watch.length})`,        "var(--blue)"],
              ["ok",       `Healthy (${stats.ok.length})`,         "var(--green)"],
              ["nodata",   `No Data (${stats.noData.length})`,     "var(--t3)"],
            ].map(([k,l,c])=>(
              <Pill key={k} active={filter===k} color={c||undefined} onClick={()=>setFilter(k)}>{l}</Pill>
            ))}
          </div>

          {/* Project list */}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {vis.map(proj => {
              const h = healthMap[proj.id];
              const d = jobData[proj.id];
              const lsInvForProj = allLsInvoices
                .filter(i => i.projId === proj.id && i.status !== "void")
                .reduce((s,i)=>s+(i.total||0),0);
              const inv = (d?.transactions?.filter(t=>t.type==="invoice").reduce((s,t)=>s+t.amount,0)||0) + lsInvForProj;
              const costs = d?.transactions?.filter(t=>TX_SIDE[t.type]==="cost"||TX_SIDE[t.type]==="ap").reduce((s,t)=>s+t.amount,0)||0;
              const budget = Object.values(d?.budgets||{}).reduce((s,b)=>s+(b.budgeted||0),0);

              return (
                <div key={proj.id} style={{
                  display:"grid",gridTemplateColumns:"3px 1fr auto",
                  background:"var(--s2)",border:`1px solid ${h ? `${h.color}40` : "var(--br)"}`,
                  borderRadius:10,overflow:"hidden",cursor:"pointer",transition:"all .12s",
                  boxShadow:h?.status==="critical"?`0 0 0 1px ${h.color}30`:"none",
                }} onClick={()=>onNavigate&&onNavigate(proj.id,"finance")}>
                  {/* Accent bar */}
                  <div style={{background:h?.color||"var(--br)",gridRow:"1/3"}}/>

                  {/* Main content */}
                  <div style={{padding:"11px 14px",display:"flex",flexWrap:"wrap",gap:10,alignItems:"center"}}>
                    <div style={{flex:1,minWidth:200}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                        <span style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>{proj.name}</span>
                        {h && <HealthPill {...h} sm/>}
                      </div>
                      <div className="mono" style={{fontSize:9,color:"var(--t3)"}}>{proj.id} · {proj.type} · {proj.status}</div>
                    </div>

                    {/* Financials inline */}
                    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                      {[
                        ["Budget",  f$(budget||proj.budget||0), "var(--t2)"],
                        ["Invoiced",f$(inv),                    "var(--blue)"],
                        ["Costs",   f$(costs),                  costs>(budget||proj.budget||0)?"var(--acc)":"var(--amber)"],
                        ["Margin",  h?.grossMargin!=null?`${h.grossMargin.toFixed(1)}%`:"—",
                          h?.grossMargin>=30?"var(--green)":h?.grossMargin>=15?"var(--amber)":"var(--acc)"],
                      ].map(([l,v,c])=>(
                        <div key={l} style={{textAlign:"center",minWidth:60}}>
                          <div className="mono" style={{fontSize:13,fontWeight:700,color:c}}>{v}</div>
                          <div style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)"}}>{l}</div>
                        </div>
                      ))}
                    </div>

                    {/* Cost pressure bar */}
                    {h && (
                      <div style={{minWidth:120,maxWidth:180,flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--t3)",marginBottom:3,fontFamily:"var(--mono)"}}>
                          <span>Cost Pressure</span>
                          <span style={{color:h.color}}>{(h.pressure*100).toFixed(0)}%</span>
                        </div>
                        <MiniBar value={h.pressure*100} max={100} color={h.color} height={5}/>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <div style={{display:"flex",alignItems:"center",paddingRight:14,color:"var(--t3)"}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                  </div>
                </div>
              );
            })}
            {vis.length===0 && <EmptyState icon="✅" msg="No projects in this filter"/>}
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PORTAL INTEGRATION GUIDE
   ═══════════════════════════════════════════════════════════════════════════════

   1. ADD IMPORT at top of JobDoxPortal.jsx (after existing imports):
      import { FinancialTab, FinancialHealthBadge, FinancialDashboard } from "./JobDoxFinance.jsx";

   2. ADD TAB to PROJ_TABS array (after "budget"):
      {key:"finance", label:"Finance", icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>},

   3. ADD TAB ROUTE inside ProjectDetail return, after {tab==="budget"...}:
      {tab==="finance" && <FinancialTab proj={proj} companyId={companyId} laborCost={laborCost}/>}

   4. ADD TAB PERMISSION filter (same block that filters budget):
      if (t.key==="finance" && !canViewBudget) return false;

   5. ADD HEALTH BADGE on portfolio card (inside proj-card, after the isClocked badge):
      <FinancialHealthBadge projId={proj.id} companyId={companyId}/>

   6. ADD FINANCE PAGE route in main App return, in the page routing block:
      } : page==="finance" ? (
        <FinancialDashboard
          projects={projects}
          companyId={companyId}
          onNavigate={handleNavigate}
        />
      ) : selected ? (

   7. ADD RAIL BUTTON (in the nav, after the Reports button):
      <button className={`rail-btn${page==="finance"?" active":""}`} data-tip="Financial Dashboard"
        onClick={()=>navTo("finance")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
      </button>

   8. NETLIFY FUNCTION (optional but recommended for AI — avoids exposing API key):
      Create netlify/functions/finance-analyze.js:
      ─────────────────────────────────────────────
      const Anthropic = require("@anthropic-ai/sdk");
      exports.handler = async (event) => {
        const { prompt } = JSON.parse(event.body);
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const msg = await client.messages.create({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          messages:[{role:"user",content:prompt}]
        });
        return { statusCode:200, body:JSON.stringify({text:msg.content[0].text}) };
      };
      ─────────────────────────────────────────────
      Then in AIAnalystPanel, replace the direct fetch with:
      const json = await callFn("finance-analyze", { prompt });
      setAnalysis(json.text);

═══════════════════════════════════════════════════════════════════════════════ */
