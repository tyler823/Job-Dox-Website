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

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS & CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const db = getFirestore();
let _fid = 9000;
const fuid = () => `f${++_fid}`;

const f$ = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n||0);
const f$c = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n||0);
const fPct = (a,b) => b>0 ? Math.min(100,Math.max(0,(a/b)*100)).toFixed(1) : "0.0";
const today = () => new Date().toISOString().split("T")[0];
const daysAgo = d => { if (!d) return 0; return Math.floor((Date.now()-new Date(d).getTime())/86400000); };

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
    const ref = doc(db, "companies", companyId, "jobFinancials", projId);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) setHealth(computeHealth(snap.data()));
    });
    return unsub;
  }, [projId, companyId]);
  if (!health || health.status === "ok") return null;
  return <HealthPill {...health} sm/>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADD TRANSACTION MODAL
───────────────────────────────────────────────────────────────────────────── */
function AddTransactionModal({ onSave, onClose, worktypes=[] }) {
  const [f, setF] = useState({
    type:"invoice", date:today(), amount:"", description:"",
    category:"", vendor:"", status:"open", notes:""
  });
  const u = (k,v) => setF(p=>({...p,[k]:v}));
  const wtOptions = worktypes.map(w=>w.type||w).filter(Boolean);

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
              <label className="lbl">Category / Work Type</label>
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
                <input className="inp" value={f.vendor} onChange={e=>u("vendor",e.target.value)} placeholder="Company or person…"/>
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
   BUDGET BUILDER — per work type
───────────────────────────────────────────────────────────────────────────── */
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
   ACCOUNTS RECEIVABLE
───────────────────────────────────────────────────────────────────────────── */
function ARPanel({ transactions, onAdd }) {
  const arTxs = transactions.filter(t=>TX_SIDE[t.type]==="ar").sort((a,b)=>b.date>a.date?1:-1);
  const totalInvoiced = arTxs.filter(t=>t.type==="invoice").reduce((s,t)=>s+t.amount,0);
  const collected    = arTxs.filter(t=>t.type==="payment_in").reduce((s,t)=>s+t.amount,0);
  const arBalance    = totalInvoiced - collected;

  const STATUS_C = { draft:"var(--t3)",sent:"var(--blue)",partial:"var(--amber)",paid:"var(--green)" };

  return (
    <div>
      <div className="g4" style={{gap:9,marginBottom:14}}>
        <KpiCard label="Total Invoiced" value={f$(totalInvoiced)} color="var(--blue)"/>
        <KpiCard label="Collected"      value={f$(collected)}     color="var(--green)"/>
        <KpiCard label="Outstanding AR" value={f$(arBalance)}     color={arBalance>0?"var(--amber)":"var(--t2)"} warn={arBalance>0}/>
        <KpiCard label="Collection Rate" value={totalInvoiced>0?`${fPct(collected,totalInvoiced)}%`:"—"} color="var(--teal)"/>
      </div>

      <SectionHead action={
        <button className="btn btn-primary btn-xs" onClick={()=>onAdd("invoice")}>+ Invoice / Payment</button>
      }>Accounts Receivable</SectionHead>

      {arTxs.length === 0
        ? <EmptyState icon="📄" msg="No invoices yet — add an invoice to start tracking AR"/>
        : arTxs.map(tx => (
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
        : apTxs.map(tx => (
          <div key={tx.id} className="row" style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:9,flexShrink:0,display:"flex",alignItems:"center",
              justifyContent:"center",background:TX_TYPES[tx.type]?.bg,color:TX_TYPES[tx.type]?.color,fontSize:14}}>
              {tx.type==="bill"?"📬":"💸"}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.description}</div>
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
            <div style={{textAlign:"right",flexShrink:0}}>
              <div className="mono" style={{fontWeight:700,fontSize:13,
                color:tx.type==="payment_out"?"var(--green)":"var(--acc)"}}>
                {f$(tx.amount)}
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
   ALL TRANSACTIONS
───────────────────────────────────────────────────────────────────────────── */
function TransactionsPanel({ transactions, onAdd }) {
  const [filter, setFilter] = useState("all");
  const sorted = [...transactions].sort((a,b)=>b.date>a.date?1:-1);
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
              <div style={{fontSize:12,fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {tx.description}
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
function AIAnalystPanel({ proj, data, health }) {
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
        body: JSON.stringify({ prompt, mode:"job" })
      }).then(r=>r.json());
      if (json.error) throw new Error(json.error);
      setAnalysis(json.text || "No analysis returned.");
    } catch(e) {
      setError("Unable to reach AI analyst. Check your connection.");
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
   FINANCIAL TAB  (exported — replaces / supplements BudgetTab)
───────────────────────────────────────────────────────────────────────────── */
export function FinancialTab({ proj, companyId, laborCost=0 }) {
  const [subTab, setSubTab] = useState("overview");
  const [data, setData]     = useState({ budgets:{}, transactions:[] });
  const [saving, setSaving] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [addTypeHint, setAddTypeHint] = useState("invoice");

  // Firestore path
  const docRef = useMemo(()=>
    companyId ? doc(db,"companies",companyId,"jobFinancials",proj.id) : null,
    [companyId, proj.id]
  );

  // Load financial data
  useEffect(() => {
    if (!docRef) return;
    const unsub = onSnapshot(docRef, snap => {
      if (snap.exists()) {
        setData({ budgets:{}, transactions:[], ...snap.data() });
      } else {
        // Seed from project budget if available
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
    if (!laborCost) return base;
    const hasLabor = base.some(t=>t.id==="__labor__");
    if (hasLabor) return base.map(t=>t.id==="__labor__"?{...t,amount:laborCost}:t);
    return [...base, {id:"__labor__",type:"payroll",date:today(),description:"Labor (from Shift Reports)",amount:laborCost,category:"Labor",auto:true}];
  }, [data.transactions, laborCost]);

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
  }, [data.transactions, save]);

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

  const totBudget     = Object.values(data.budgets||{}).reduce((s,b)=>s+(b.budgeted||0),0);
  const totalInvoiced = allTransactions.filter(t=>t.type==="invoice").reduce((s,t)=>s+t.amount,0);
  const collected     = allTransactions.filter(t=>t.type==="payment_in").reduce((s,t)=>s+t.amount,0);
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
              <button className="btn btn-secondary btn-xs" onClick={()=>openAdd("invoice")}>+ Invoice</button>
              <button className="btn btn-secondary btn-xs" onClick={()=>openAdd("payment_in")}>+ Payment Received</button>
              <button className="btn btn-secondary btn-xs" onClick={()=>openAdd("bill")}>+ Vendor Bill</button>
              <button className="btn btn-secondary btn-xs" onClick={()=>openAdd("expense")}>+ CC / Expense</button>
            </div>
          </div>
        )}

        {/* ── BUDGET ── */}
        {subTab==="budget" && (
          <div>
            <SectionHead action={
              <button className="btn btn-primary btn-xs" onClick={()=>save({budgets:data.budgets})}>
                Save Budget
              </button>
            }>Budget by Work Type</SectionHead>
            <BudgetBuilder
              budgets={data.budgets||{}}
              setBudgets={setBudgets}
              worktypes={proj.worktypes||[]}
              transactions={allTransactions}
            />
          </div>
        )}

        {/* ── AR ── */}
        {subTab==="ar" && <ARPanel transactions={allTransactions} onAdd={openAdd}/>}

        {/* ── AP ── */}
        {subTab==="ap" && <APPanel transactions={allTransactions} onAdd={openAdd}/>}

        {/* ── TRANSACTIONS ── */}
        {subTab==="txns" && <TransactionsPanel transactions={allTransactions} onAdd={openAdd}/>}

        {/* ── AI ── */}
        {subTab==="ai" && <AIAnalystPanel proj={proj} data={{...data,transactions:allTransactions}} health={health}/>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FINANCIAL DASHBOARD  (exported — full portfolio-level page)
───────────────────────────────────────────────────────────────────────────── */
export function FinancialDashboard({ projects=[], companyId, onNavigate }) {
  const [jobData, setJobData]   = useState({});  // { [projId]: financialData }
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [aiReport, setAiReport] = useState("");
  const [aiLoading, setAiLoad]  = useState(false);

  // Load financials for all projects
  useEffect(() => {
    if (!companyId || !projects.length) { setLoading(false); return; }
    let loaded = 0;
    const unsubs = projects.map(p => {
      const ref = doc(db,"companies",companyId,"jobFinancials",p.id);
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
    const totalAR  = Object.values(jobData).reduce((s,d)=>{
      if (!d?.transactions) return s;
      const inv = d.transactions.filter(t=>t.type==="invoice").reduce((ss,t)=>ss+t.amount,0);
      const pay = d.transactions.filter(t=>t.type==="payment_in").reduce((ss,t)=>ss+t.amount,0);
      return s+(inv-pay);
    },0);
    const totalAP  = Object.values(jobData).reduce((s,d)=>{
      if (!d?.transactions) return s;
      const bills = d.transactions.filter(t=>t.type==="bill").reduce((ss,t)=>ss+t.amount,0);
      const paid  = d.transactions.filter(t=>t.type==="payment_out").reduce((ss,t)=>ss+t.amount,0);
      return s+(bills-paid);
    },0);
    return { critical, warning, watch, ok, noData, totalAR, totalAP };
  }, [healthMap, jobData, projects]);

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
        body: JSON.stringify({ prompt, mode:"portfolio" })
      }).then(r=>r.json());
      setAiReport(json.text||"");
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
              const inv = d?.transactions?.filter(t=>t.type==="invoice").reduce((s,t)=>s+t.amount,0)||0;
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
