/**
 * JobDoxTimeOff.jsx — Company Calendar & Time-Off Management
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
         doc, setDoc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";

let _db = null;
const getDb = () => { if (!_db) _db = getFirestore(); return _db; };

const todayStr = () => new Date().toISOString().split("T")[0];
const fmtDate = d => {
  if (!d) return "\u2014";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
};
const fmtDateShort = d => {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric" });
};
const daysBetween = (a, b) => {
  if (!a || !b) return 0;
  return Math.round((new Date(b+"T00:00:00") - new Date(a+"T00:00:00")) / 86400000) + 1;
};
const isSameMonth = (d, year, month) => {
  const dt = new Date(d + "T00:00:00");
  return dt.getFullYear() === year && dt.getMonth() === month;
};

const PTO_TYPES = [
  { key:"vacation",    label:"Vacation",        color:"#5ba3f5", icon:"\u2600" },
  { key:"sick",        label:"Sick Leave",      color:"#f97316", icon:"\ud83e\udd12" },
  { key:"personal",    label:"Personal Day",    color:"#a78bfa", icon:"\ud83d\udc64" },
  { key:"bereavement", label:"Bereavement",     color:"#6b7280", icon:"\ud83d\udd4a" },
  { key:"holiday",     label:"Company Holiday", color:"#1ad98a", icon:"\ud83c\udf89" },
  { key:"other",       label:"Other",           color:"#22d3ee", icon:"\ud83d\udccb" },
];
const ptoColor = k => PTO_TYPES.find(t=>t.key===k)?.color || "var(--t3)";
const ptoLabel = k => PTO_TYPES.find(t=>t.key===k)?.label || k;
const ptoIcon  = k => PTO_TYPES.find(t=>t.key===k)?.icon  || "\ud83d\udccb";

const STATUS_DEFS = {
  pending:  { label:"Pending",   color:"#e89c18", bg:"rgba(232,156,24,.12)",  border:"rgba(232,156,24,.3)" },
  approved: { label:"Approved",  color:"#1ad98a", bg:"rgba(26,217,138,.12)",  border:"rgba(26,217,138,.3)" },
  denied:   { label:"Denied",    color:"#e43531", bg:"rgba(228,53,49,.12)",   border:"rgba(228,53,49,.3)" },
  cancelled:{ label:"Cancelled", color:"#6b7280", bg:"rgba(107,114,128,.12)", border:"rgba(107,114,128,.3)" },
};

const DEFAULT_CONFIG = {
  accrualMode: "company",
  companyAccrualRate: 10,
  yearStartMonth: 0,
  positionRates: {},
  approverMemberIds: [],
  carryoverEnabled: false,
  maxCarryoverDays: 5,
};

/* ── Firestore helpers ── */
function fsListenRequests(cid, cb) {
  const q = query(collection(getDb(), "companies", cid, "timeoff-requests"), orderBy("createdAt","desc"));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
}
async function fsAddRequest(cid, data) {
  return addDoc(collection(getDb(), "companies", cid, "timeoff-requests"), { ...data, createdAt: serverTimestamp() });
}
async function fsUpdateRequest(cid, rid, fields) {
  return updateDoc(doc(getDb(), "companies", cid, "timeoff-requests", rid), fields);
}
async function fsGetConfig(cid) {
  const snap = await getDoc(doc(getDb(), "companies", cid, "timeoff-config", "settings"));
  return snap.exists() ? snap.data() : null;
}
async function fsSaveConfig(cid, cfg) {
  return setDoc(doc(getDb(), "companies", cid, "timeoff-config", "settings"), cfg, { merge:true });
}

/* ── SVG Icons ── */
const TIc = {
  calendar:<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg>,
  check:<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>,
  close:<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
  plus:<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  chev_l:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>,
  chev_r:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>,
  settings:<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>,
  trash:<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>,
  alert:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>,
  person:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>,
  group:<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
  clock:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z"/></svg>,
};

/* ── Balance calculator ── */
function calcBalance(staff, requests, config) {
  const role = staff?.systemRole || staff?.title || "";
  const yearlyRate = config.accrualMode === "position" && config.positionRates[role]
    ? config.positionRates[role] : (config.companyAccrualRate || 10);
  const now = new Date();
  const ys = new Date(now.getFullYear(), config.yearStartMonth||0, 1);
  const ye = new Date(now.getFullYear()+1, config.yearStartMonth||0, 1);
  const elapsed = Math.max(0, (now - ys) / 86400000);
  const totalDays = (ye - ys) / 86400000;
  const accrued = Math.min(yearlyRate, +(yearlyRate * elapsed / totalDays).toFixed(1));
  const ysStr = ys.toISOString().split("T")[0];
  const used = requests
    .filter(r => r.status==="approved" && r.staffId===staff?.id && r.startDate>=ysStr)
    .reduce((s,r) => s + daysBetween(r.startDate, r.endDate), 0);
  return { yearlyRate, accrued, used, available: +(accrued - used).toFixed(1), pctUsed: yearlyRate>0 ? Math.round(used/yearlyRate*100) : 0 };
}

/* ══════════════════════════════════════════════════════════════════
   MINI CALENDAR
══════════════════════════════════════════════════════════════════ */
function MiniCalendar({ year, month, onMonthChange, requests, onDayClick, selectedDate }) {
  const first = new Date(year, month, 1).getDay();
  const dim   = new Date(year, month+1, 0).getDate();
  const prev  = new Date(year, month, 0).getDate();
  const today = todayStr();
  const DOW = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const MN  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const dateMap = useMemo(() => {
    const m = {};
    (requests||[]).filter(r=>r.status==="approved"||r.status==="pending").forEach(r => {
      const s = new Date(r.startDate+"T00:00:00"), e = new Date(r.endDate+"T00:00:00");
      for (let d = new Date(s); d<=e; d.setDate(d.getDate()+1)) {
        m[d.toISOString().split("T")[0]] = true;
      }
    });
    return m;
  }, [requests]);

  const cells = [];
  for (let i=first-1; i>=0; i--) cells.push({ day:prev-i, other:true });
  for (let d=1; d<=dim; d++) {
    const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    cells.push({ day:d, date:ds, today:ds===today, has:!!dateMap[ds], sel:ds===selectedDate });
  }
  const rem = 7 - (cells.length % 7);
  if (rem < 7) for (let d=1; d<=rem; d++) cells.push({ day:d, other:true });

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <button onClick={()=>onMonthChange(-1)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--t2)",padding:4}}>{TIc.chev_l}</button>
        <span style={{fontWeight:700,fontSize:13,color:"var(--t1)"}}>{MN[month]} {year}</span>
        <button onClick={()=>onMonthChange(1)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--t2)",padding:4}}>{TIc.chev_r}</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,width:"100%"}}>
        {DOW.map(d=><div key={d} style={{fontSize:9,color:"var(--t3)",textAlign:"center",padding:"3px 0",fontFamily:"var(--mono)"}}>{d}</div>)}
        {cells.map((c,i)=>(
          <button key={i} onClick={()=>c.date&&onDayClick&&onDayClick(c.date)}
            style={{width:32,height:32,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:11,cursor:c.other?"default":"pointer",border:"none",fontFamily:"var(--ui)",position:"relative",
              background:c.sel?"var(--acc)":c.today?"var(--acc-lo)":"transparent",
              color:c.sel?"#fff":c.today?"var(--acc)":c.other?"var(--t3)":"var(--t2)",
              fontWeight:(c.today||c.sel)?700:400, opacity:c.other?.3:1}}>
            {c.day}
            {c.has&&!c.sel&&<span style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:"var(--blue)"}}/>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   REQUEST FORM MODAL
══════════════════════════════════════════════════════════════════ */
function RequestModal({ onClose, onSubmit, globalStaff, currentMemberId }) {
  const [form, setForm] = useState({ type:"vacation", startDate:todayStr(), endDate:todayStr(), notes:"" });
  const days = daysBetween(form.startDate, form.endDate);
  const valid = form.startDate && form.endDate && days > 0;

  const submit = () => {
    if (!valid) return;
    const me = globalStaff.find(s=>s.id===currentMemberId);
    onSubmit({ ...form, staffId:currentMemberId, staffName:me?`${me.firstName||""} ${me.lastName||""}`.trim():"Unknown",
      staffRole:me?.systemRole||me?.title||"", status:"pending", daysRequested:days });
    onClose();
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()} style={{zIndex:550}}>
      <div className="modal modal-sm">
        <div className="modal-hd">
          <div className="modal-ttl">Request Time Off</div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{TIc.close}</button>
        </div>
        <div className="modal-body">
          <div>
            <label className="lbl">Type</label>
            <select className="sel" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
              {PTO_TYPES.filter(t=>t.key!=="holiday").map(t=>(<option key={t.key} value={t.key}>{t.icon} {t.label}</option>))}
            </select>
          </div>
          <div className="g2">
            <div><label className="lbl">Start Date</label><input type="date" className="inp" value={form.startDate} onChange={e=>setForm(p=>({...p,startDate:e.target.value}))}/></div>
            <div><label className="lbl">End Date</label><input type="date" className="inp" value={form.endDate} min={form.startDate} onChange={e=>setForm(p=>({...p,endDate:e.target.value}))}/></div>
          </div>
          {valid&&<div style={{background:"var(--s3)",borderRadius:8,padding:"8px 12px",fontSize:11,color:"var(--t2)",display:"flex",alignItems:"center",gap:8}}>
            {TIc.clock}<span><strong style={{color:"var(--t1)"}}>{days} day{days!==1?"s":""}</strong> requested ({fmtDateShort(form.startDate)} \u2013 {fmtDateShort(form.endDate)})</span>
          </div>}
          <div><label className="lbl">Notes (optional)</label><textarea className="txa" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Reason or additional details..." rows={3}/></div>
        </div>
        <div className="modal-ft">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!valid} onClick={submit}>{TIc.check} Submit Request</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   APPROVAL DETAIL MODAL
══════════════════════════════════════════════════════════════════ */
function ApprovalModal({ request, onClose, onApprove, onDeny, balance }) {
  const [denyReason, setDenyReason] = useState("");
  const [showDeny, setShowDeny] = useState(false);
  if (!request) return null;
  const st = STATUS_DEFS[request.status] || STATUS_DEFS.pending;

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()} style={{zIndex:560}}>
      <div className="modal modal-sm">
        <div className="modal-hd">
          <div className="modal-ttl">Time-Off Request Details</div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{TIc.close}</button>
        </div>
        <div className="modal-body">
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid var(--br)"}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:"var(--acc-lo)",color:"var(--acc)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14}}>
              {(request.staffName||"?")[0]}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>{request.staffName}</div>
              <div style={{fontSize:10,color:"var(--t3)"}}>{request.staffRole||"Employee"}</div>
            </div>
            <span style={{display:"inline-flex",alignItems:"center",gap:4,borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:600,background:st.bg,border:`1px solid ${st.border}`,color:st.color}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:st.color}}/>{st.label}
            </span>
          </div>
          <div className="g2" style={{marginTop:4}}>
            <div><div className="lbl">Type</div><div style={{fontSize:12,color:"var(--t1)",display:"flex",alignItems:"center",gap:6}}><span style={{color:ptoColor(request.type)}}>{ptoIcon(request.type)}</span> {ptoLabel(request.type)}</div></div>
            <div><div className="lbl">Duration</div><div style={{fontSize:12,fontWeight:700,color:"var(--t1)"}}>{request.daysRequested||daysBetween(request.startDate,request.endDate)} day{(request.daysRequested||1)!==1?"s":""}</div></div>
          </div>
          <div className="g2">
            <div><div className="lbl">Start</div><div style={{fontSize:12,color:"var(--t1)"}}>{fmtDate(request.startDate)}</div></div>
            <div><div className="lbl">End</div><div style={{fontSize:12,color:"var(--t1)"}}>{fmtDate(request.endDate)}</div></div>
          </div>
          {request.notes&&<div><div className="lbl">Notes</div><div style={{fontSize:11,color:"var(--t2)",background:"var(--s3)",borderRadius:7,padding:"8px 11px"}}>{request.notes}</div></div>}

          {balance&&(
            <div style={{background:"var(--s1)",border:"1px solid var(--br)",borderRadius:10,padding:12,marginTop:4}}>
              <div className="lbl" style={{marginBottom:8}}>PTO Balance</div>
              <div style={{display:"flex",gap:16}}>
                <div style={{flex:1,textAlign:"center"}}><div style={{fontFamily:"var(--mono)",fontSize:18,fontWeight:700,color:"var(--green)"}}>{balance.available}</div><div style={{fontSize:9,color:"var(--t3)",marginTop:2}}>AVAILABLE</div></div>
                <div style={{flex:1,textAlign:"center"}}><div style={{fontFamily:"var(--mono)",fontSize:18,fontWeight:700,color:"var(--t1)"}}>{balance.used}</div><div style={{fontSize:9,color:"var(--t3)",marginTop:2}}>USED</div></div>
                <div style={{flex:1,textAlign:"center"}}><div style={{fontFamily:"var(--mono)",fontSize:18,fontWeight:700,color:"var(--blue)"}}>{balance.accrued}</div><div style={{fontSize:9,color:"var(--t3)",marginTop:2}}>ACCRUED</div></div>
                <div style={{flex:1,textAlign:"center"}}><div style={{fontFamily:"var(--mono)",fontSize:18,fontWeight:700,color:"var(--t2)"}}>{balance.yearlyRate}</div><div style={{fontSize:9,color:"var(--t3)",marginTop:2}}>YEARLY</div></div>
              </div>
              {balance.available<0&&<div style={{marginTop:8,padding:"6px 10px",borderRadius:6,background:"rgba(228,53,49,.1)",border:"1px solid rgba(228,53,49,.25)",fontSize:10,color:"var(--acc)",display:"flex",alignItems:"center",gap:6}}>{TIc.alert} This would exceed available PTO by {Math.abs(balance.available)} day{Math.abs(balance.available)!==1?"s":""}</div>}
              {balance.available>=0&&balance.available<=2&&<div style={{marginTop:8,padding:"6px 10px",borderRadius:6,background:"rgba(232,156,24,.1)",border:"1px solid rgba(232,156,24,.25)",fontSize:10,color:"var(--amber)",display:"flex",alignItems:"center",gap:6}}>{TIc.alert} Only {balance.available} day{balance.available!==1?"s":""} remaining</div>}
            </div>
          )}

          {showDeny&&<div><label className="lbl">Reason for Denial</label><textarea className="txa" value={denyReason} onChange={e=>setDenyReason(e.target.value)} placeholder="Provide a reason..." rows={2}/></div>}
          {request.reviewerNote&&<div><div className="lbl">Reviewer Note</div><div style={{fontSize:11,color:"var(--t2)",background:"var(--s3)",borderRadius:7,padding:"8px 11px"}}>{request.reviewerNote}</div></div>}
        </div>
        {request.status==="pending"&&(
          <div className="modal-ft">
            {!showDeny ? (<>
              <button className="btn btn-ghost" onClick={()=>setShowDeny(true)}>Deny</button>
              <button className="btn btn-green" onClick={()=>onApprove(request.id)}>{TIc.check} Approve</button>
            </>) : (<>
              <button className="btn btn-ghost" onClick={()=>setShowDeny(false)}>Back</button>
              <button className="btn btn-danger" onClick={()=>onDeny(request.id,denyReason)}>{TIc.close} Confirm Deny</button>
            </>)}
          </div>
        )}
        {request.status!=="pending"&&<div className="modal-ft"><button className="btn btn-ghost" onClick={onClose}>Close</button></div>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CONFIG / SETTINGS MODAL
══════════════════════════════════════════════════════════════════ */
function ConfigModal({ onClose, config, onSave, globalStaff }) {
  const [form, setForm] = useState({ ...DEFAULT_CONFIG, ...config });
  const [newRole, setNewRole] = useState("");
  const [newRate, setNewRate] = useState("");
  const staffRoles = [...new Set(globalStaff.map(s=>s.systemRole||s.title).filter(Boolean))];

  const addRate = () => {
    if (!newRole.trim()||!newRate) return;
    setForm(p=>({...p,positionRates:{...p.positionRates,[newRole.trim()]:Number(newRate)}}));
    setNewRole(""); setNewRate("");
  };
  const removeRate = r => { const n={...form.positionRates}; delete n[r]; setForm(p=>({...p,positionRates:n})); };
  const toggleApprover = id => {
    setForm(p => {
      const list = [...(p.approverMemberIds||[])];
      const idx = list.indexOf(id);
      if (idx>=0) list.splice(idx,1); else list.push(id);
      return {...p, approverMemberIds:list};
    });
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()} style={{zIndex:560}}>
      <div className="modal">
        <div className="modal-hd">
          <div className="modal-ttl">{TIc.settings} PTO Settings</div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{TIc.close}</button>
        </div>
        <div className="modal-body" style={{maxHeight:"70vh"}}>
          <div>
            <label className="lbl">Accrual Mode</label>
            <select className="sel" value={form.accrualMode} onChange={e=>setForm(p=>({...p,accrualMode:e.target.value}))}>
              <option value="company">Company-Wide (same rate for everyone)</option>
              <option value="position">Per Position (different rate per role)</option>
            </select>
          </div>
          {form.accrualMode==="company"&&(
            <div><label className="lbl">Days Per Year (Company Default)</label>
            <input type="number" className="inp" min={0} max={365} value={form.companyAccrualRate} onChange={e=>setForm(p=>({...p,companyAccrualRate:Number(e.target.value)}))}/></div>
          )}
          {form.accrualMode==="position"&&(
            <div>
              <label className="lbl">Position Accrual Rates (days/year)</label>
              <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
                {Object.entries(form.positionRates).map(([role,rate])=>(
                  <div key={role} style={{display:"flex",alignItems:"center",gap:8,background:"var(--s3)",borderRadius:7,padding:"6px 10px"}}>
                    <span style={{flex:1,fontSize:12,color:"var(--t1)"}}>{role}</span>
                    <span style={{fontFamily:"var(--mono)",fontSize:12,fontWeight:700,color:"var(--blue)"}}>{rate} days</span>
                    <button onClick={()=>removeRate(role)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--acc)",display:"flex"}}>{TIc.trash}</button>
                  </div>
                ))}
                {Object.keys(form.positionRates).length===0&&<div style={{fontSize:11,color:"var(--t3)",padding:8}}>No position rates configured. Fallback: 10 days/year.</div>}
              </div>
              <div style={{display:"flex",gap:8,marginTop:8}}>
                <select className="sel" value={newRole} onChange={e=>setNewRole(e.target.value)} style={{flex:2}}>
                  <option value="">Select role...</option>
                  {staffRoles.filter(r=>!form.positionRates[r]).map(r=><option key={r} value={r}>{r}</option>)}
                </select>
                <input type="number" className="inp" placeholder="Days" min={0} max={365} value={newRate} onChange={e=>setNewRate(e.target.value)} style={{flex:1}}/>
                <button className="btn btn-secondary btn-xs" onClick={addRate}>{TIc.plus} Add</button>
              </div>
            </div>
          )}
          <div>
            <label className="lbl">PTO Year Starts</label>
            <select className="sel" value={form.yearStartMonth} onChange={e=>setForm(p=>({...p,yearStartMonth:Number(e.target.value)}))}>
              {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m,i)=>(<option key={i} value={i}>{m}</option>))}
            </select>
          </div>
          <div className="g2">
            <div><label className="lbl">Allow Carryover</label>
              <select className="sel" value={form.carryoverEnabled?"yes":"no"} onChange={e=>setForm(p=>({...p,carryoverEnabled:e.target.value==="yes"}))}>
                <option value="no">No \u2014 PTO resets each year</option><option value="yes">Yes \u2014 unused days carry over</option>
              </select>
            </div>
            {form.carryoverEnabled&&<div><label className="lbl">Max Carryover Days</label><input type="number" className="inp" min={0} max={365} value={form.maxCarryoverDays} onChange={e=>setForm(p=>({...p,maxCarryoverDays:Number(e.target.value)}))}/></div>}
          </div>
          <div>
            <label className="lbl">PTO Approver(s)</label>
            <div style={{fontSize:10,color:"var(--t3)",marginBottom:6}}>Select staff who can approve/deny requests. If none selected, all Level 7+ managers can approve.</div>
            <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:200,overflowY:"auto"}}>
              {globalStaff.filter(s=>s.status==="active"||!s.status).map(s=>{
                const nm = `${s.firstName||""} ${s.lastName||""}`.trim()||s.email||"Unknown";
                const on = (form.approverMemberIds||[]).includes(s.id);
                return (
                  <button key={s.id} onClick={()=>toggleApprover(s.id)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:7,border:"1px solid var(--br)",
                      background:on?"var(--acc-lo)":"var(--s3)",cursor:"pointer",textAlign:"left",borderColor:on?"rgba(228,53,49,.3)":"var(--br)"}}>
                    <div style={{width:22,height:22,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",background:on?"var(--acc)":"var(--s4)",color:on?"#fff":"var(--t3)",fontSize:9}}>{on?TIc.check:" "}</div>
                    <div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:"var(--t1)"}}>{nm}</div><div style={{fontSize:9,color:"var(--t3)"}}>{s.systemRole||s.title||"\u2014"}</div></div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="modal-ft">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={()=>{onSave(form);onClose();}}>{TIc.check} Save Settings</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   BALANCES VIEW
══════════════════════════════════════════════════════════════════ */
function BalancesView({ globalStaff, requests, config }) {
  const balances = useMemo(() =>
    globalStaff.filter(s=>s.status==="active"||!s.status)
      .map(s=>({ staff:s, name:`${s.firstName||""} ${s.lastName||""}`.trim()||s.email||"Unknown", ...calcBalance(s,requests,config) }))
      .sort((a,b)=>a.available-b.available)
  , [globalStaff, requests, config]);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:4,padding:"0 10px",marginBottom:4,minWidth:480}}>
        <div className="lbl">Employee</div><div className="lbl" style={{textAlign:"center"}}>Yearly</div>
        <div className="lbl" style={{textAlign:"center"}}>Accrued</div><div className="lbl" style={{textAlign:"center"}}>Used</div>
        <div className="lbl" style={{textAlign:"center"}}>Available</div>
      </div>
      {balances.map(b=>(
        <div key={b.staff.id} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:4,padding:"8px 10px",background:"var(--s2)",border:"1px solid var(--br)",borderRadius:8,alignItems:"center",minWidth:480}}>
          <div><div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{b.name}</div><div style={{fontSize:9,color:"var(--t3)"}}>{b.staff.systemRole||b.staff.title||"\u2014"}</div></div>
          <div style={{textAlign:"center",fontFamily:"var(--mono)",fontSize:12,color:"var(--t2)"}}>{b.yearlyRate}</div>
          <div style={{textAlign:"center",fontFamily:"var(--mono)",fontSize:12,color:"var(--blue)"}}>{b.accrued}</div>
          <div style={{textAlign:"center",fontFamily:"var(--mono)",fontSize:12,color:"var(--t1)"}}>{b.used}</div>
          <div style={{textAlign:"center"}}><span style={{fontFamily:"var(--mono)",fontSize:12,fontWeight:700,padding:"2px 8px",borderRadius:12,
            color:b.available<=0?"var(--acc)":b.available<=2?"var(--amber)":"var(--green)",
            background:b.available<=0?"rgba(228,53,49,.12)":b.available<=2?"rgba(232,156,24,.1)":"rgba(26,217,138,.1)"}}>{b.available}</span></div>
        </div>
      ))}
      {balances.length===0&&<div style={{textAlign:"center",padding:30,color:"var(--t3)",fontSize:12}}>No active staff members found.</div>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HOLIDAY MODAL
══════════════════════════════════════════════════════════════════ */
function HolidayModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ name:"", startDate:todayStr(), endDate:todayStr() });
  const valid = form.name.trim() && form.startDate && form.endDate && daysBetween(form.startDate,form.endDate)>0;
  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()} style={{zIndex:560}}>
      <div className="modal modal-sm">
        <div className="modal-hd"><div className="modal-ttl">Add Company Holiday</div><button className="btn btn-ghost btn-xs" onClick={onClose}>{TIc.close}</button></div>
        <div className="modal-body">
          <div><label className="lbl">Holiday Name</label><input className="inp" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Christmas Day"/></div>
          <div className="g2">
            <div><label className="lbl">Start Date</label><input type="date" className="inp" value={form.startDate} onChange={e=>setForm(p=>({...p,startDate:e.target.value}))}/></div>
            <div><label className="lbl">End Date</label><input type="date" className="inp" value={form.endDate} min={form.startDate} onChange={e=>setForm(p=>({...p,endDate:e.target.value}))}/></div>
          </div>
        </div>
        <div className="modal-ft"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-green" disabled={!valid} onClick={()=>{onSubmit(form);onClose();}}>{TIc.check} Add Holiday</button></div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN EXPORT — TimeOffPanel
══════════════════════════════════════════════════════════════════ */
export function TimeOffPanel({ onClose, companyId, globalStaff=[], currentMemberId="", permissionLevel=1 }) {
  const [requests, setRequests] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [tab, setTab] = useState("calendar");
  const [showRequest, setShowRequest] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showHoliday, setShowHoliday] = useState(false);
  const [reviewReq, setReviewReq] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [calYear, setCalYear] = useState(()=>new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(()=>new Date().getMonth());
  const [filterStatus, setFilterStatus] = useState("all");

  const isApprover = useMemo(()=>{
    if (permissionLevel>=10) return true;
    if (config.approverMemberIds?.length>0) return config.approverMemberIds.includes(currentMemberId);
    return permissionLevel>=7;
  },[config,currentMemberId,permissionLevel]);
  const isAdmin = permissionLevel>=8;

  useEffect(()=>{
    if (!companyId) return;
    fsGetConfig(companyId).then(c=>{ if(c) setConfig(p=>({...DEFAULT_CONFIG,...c})); }).catch(()=>{});
  },[companyId]);

  useEffect(()=>{
    if (!companyId) return;
    return fsListenRequests(companyId, setRequests);
  },[companyId]);

  const changeMonth = useCallback(delta=>{
    setCalMonth(p=>{
      let m=p+delta, y=calYear;
      if(m<0){m=11;setCalYear(y-1);} if(m>11){m=0;setCalYear(y+1);}
      return m;
    });
  },[calYear]);

  const handleSubmit = useCallback(async data=>{
    if(!companyId) return; await fsAddRequest(companyId, data);
  },[companyId]);

  const handleApprove = useCallback(async rid=>{
    if(!companyId) return;
    const me=globalStaff.find(s=>s.id===currentMemberId);
    await fsUpdateRequest(companyId,rid,{status:"approved",reviewedBy:currentMemberId,reviewerName:me?`${me.firstName||""} ${me.lastName||""}`.trim():"Approver",reviewedAt:new Date().toISOString()});
    setReviewReq(null);
  },[companyId,currentMemberId,globalStaff]);

  const handleDeny = useCallback(async(rid,reason)=>{
    if(!companyId) return;
    const me=globalStaff.find(s=>s.id===currentMemberId);
    await fsUpdateRequest(companyId,rid,{status:"denied",reviewedBy:currentMemberId,reviewerName:me?`${me.firstName||""} ${me.lastName||""}`.trim():"Approver",reviewerNote:reason||"",reviewedAt:new Date().toISOString()});
    setReviewReq(null);
  },[companyId,currentMemberId,globalStaff]);

  const handleCancel = useCallback(async rid=>{
    if(!companyId) return; await fsUpdateRequest(companyId,rid,{status:"cancelled"});
  },[companyId]);

  const handleSaveConfig = useCallback(async cfg=>{
    if(!companyId) return; await fsSaveConfig(companyId,cfg); setConfig(cfg);
  },[companyId]);

  const handleAddHoliday = useCallback(async data=>{
    if(!companyId) return;
    await fsAddRequest(companyId,{type:"holiday",startDate:data.startDate,endDate:data.endDate,
      staffId:"__company__",staffName:data.name,staffRole:"Company Holiday",status:"approved",
      daysRequested:daysBetween(data.startDate,data.endDate),notes:`Company Holiday: ${data.name}`,isHoliday:true});
  },[companyId]);

  const pendingCount = useMemo(()=>requests.filter(r=>r.status==="pending").length,[requests]);
  const myRequests = useMemo(()=>requests.filter(r=>r.staffId===currentMemberId),[requests,currentMemberId]);
  const myBalance = useMemo(()=>{
    const me=globalStaff.find(s=>s.id===currentMemberId);
    return me ? calcBalance(me,requests,config) : null;
  },[globalStaff,currentMemberId,requests,config]);

  const selectedEvents = useMemo(()=>{
    if(!selectedDate) return [];
    return requests.filter(r=>(r.status==="approved"||r.status==="pending")&&r.startDate<=selectedDate&&r.endDate>=selectedDate);
  },[requests,selectedDate]);

  const filteredReqs = useMemo(()=>{
    let list = tab==="approvals" ? requests.filter(r=>r.status==="pending")
             : tab==="requests" ? myRequests : requests;
    if(filterStatus!=="all") list=list.filter(r=>r.status===filterStatus);
    return list;
  },[requests,myRequests,tab,filterStatus]);

  const getBalance = useCallback(req=>{
    const s=globalStaff.find(x=>x.id===req?.staffId);
    return s ? calcBalance(s,requests,config) : null;
  },[globalStaff,requests,config]);

  const TABS = [
    {key:"calendar",label:"Calendar",icon:TIc.calendar},
    {key:"requests",label:"My Requests",icon:TIc.clock},
    {key:"balances",label:"Balances",icon:TIc.group},
    ...(isApprover?[{key:"approvals",label:"Approvals",icon:TIc.check,badge:pendingCount}]:[]),
  ];

  const MN=["January","February","March","April","May","June","July","August","September","October","November","December"];

  /* ── Event card renderer (reused in calendar views) ── */
  const EventCard = ({r, clickable}) => {
    const st=STATUS_DEFS[r.status]||STATUS_DEFS.pending;
    return (
      <div onClick={()=>clickable&&isApprover&&r.status==="pending"&&setReviewReq(r)}
        style={{background:"var(--s2)",border:"1px solid var(--br)",borderLeft:`3px solid ${ptoColor(r.type)}`,
          borderRadius:8,padding:"10px 14px",marginBottom:6,cursor:clickable&&isApprover&&r.status==="pending"?"pointer":"default"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:14}}>{ptoIcon(r.type)}</span>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:"var(--t1)"}}>{r.staffName||"Employee"}</div>
              <div style={{fontSize:10,color:"var(--t3)"}}>{ptoLabel(r.type)} {"\u00b7"} {fmtDateShort(r.startDate)}\u2013{fmtDateShort(r.endDate)} {"\u00b7"} {r.daysRequested||daysBetween(r.startDate,r.endDate)} day{(r.daysRequested||1)!==1?"s":""}</div>
            </div>
          </div>
          <span style={{fontSize:9,fontWeight:600,padding:"2px 8px",borderRadius:12,background:st.bg,border:`1px solid ${st.border}`,color:st.color}}>{st.label}</span>
        </div>
        {r.notes&&<div style={{fontSize:10,color:"var(--t3)",marginTop:6}}>{r.notes}</div>}
      </div>
    );
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()} style={{zIndex:510}}>
      <div style={{background:"var(--s1)",border:"1px solid var(--br)",borderRadius:14,
        width:"min(960px,96vw)",height:"min(720px,92vh)",display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Header */}
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--br)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:"var(--acc-lo)",color:"var(--acc)",display:"flex",alignItems:"center",justifyContent:"center"}}>{TIc.calendar}</div>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:"var(--t1)"}}>Company Calendar & Time Off</div>
              <div style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)",letterSpacing:".05em",marginTop:1}}>PTO MANAGEMENT</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:6}}>
            {isAdmin&&<button className="btn btn-ghost btn-xs" onClick={()=>setShowConfig(true)}>{TIc.settings} Settings</button>}
            {isAdmin&&<button className="btn btn-ghost btn-xs" onClick={()=>setShowHoliday(true)} style={{color:"var(--green)"}}>{TIc.plus} Holiday</button>}
            <button className="btn btn-primary btn-xs" onClick={()=>setShowRequest(true)}>{TIc.plus} Request Time Off</button>
            <button className="btn btn-ghost btn-xs" onClick={onClose}>{TIc.close}</button>
          </div>
        </div>

        {/* KPI Bar */}
        {myBalance&&(
          <div style={{display:"flex",flexWrap:"wrap",background:"var(--s2)",borderBottom:"1px solid var(--br)",flexShrink:0}}>
            <div style={{flex:1,minWidth:120,padding:"10px 16px",borderRight:"1px solid var(--br)"}}><div style={{fontFamily:"var(--mono)",fontSize:18,fontWeight:700,color:"var(--green)",marginBottom:2}}>{myBalance.available}</div><div style={{fontSize:9,color:"var(--t2)",textTransform:"uppercase",letterSpacing:".07em"}}>Days Available</div></div>
            <div style={{flex:1,minWidth:120,padding:"10px 16px",borderRight:"1px solid var(--br)"}}><div style={{fontFamily:"var(--mono)",fontSize:18,fontWeight:700,color:"var(--t1)",marginBottom:2}}>{myBalance.used}</div><div style={{fontSize:9,color:"var(--t2)",textTransform:"uppercase",letterSpacing:".07em"}}>Days Used</div></div>
            <div style={{flex:1,minWidth:120,padding:"10px 16px",borderRight:"1px solid var(--br)"}}><div style={{fontFamily:"var(--mono)",fontSize:18,fontWeight:700,color:"var(--blue)",marginBottom:2}}>{myBalance.accrued}</div><div style={{fontSize:9,color:"var(--t2)",textTransform:"uppercase",letterSpacing:".07em"}}>Accrued YTD</div></div>
            <div style={{flex:1,minWidth:120,padding:"10px 16px"}}><div style={{fontFamily:"var(--mono)",fontSize:18,fontWeight:700,color:"var(--t2)",marginBottom:2}}>{myBalance.yearlyRate}</div><div style={{fontSize:9,color:"var(--t2)",textTransform:"uppercase",letterSpacing:".07em"}}>Yearly Allowance</div></div>
          </div>
        )}

        {/* PTO Alert Banners */}
        {myBalance&&myBalance.available<=2&&myBalance.available>0&&(
          <div style={{padding:"8px 18px",background:"rgba(232,156,24,.08)",borderBottom:"1px solid rgba(232,156,24,.2)",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <span style={{color:"var(--amber)"}}>{TIc.alert}</span>
            <span style={{fontSize:11,color:"var(--amber)"}}>You have only <strong>{myBalance.available} day{myBalance.available!==1?"s":""}</strong> of PTO remaining this year.</span>
          </div>
        )}
        {myBalance&&myBalance.available<=0&&(
          <div style={{padding:"8px 18px",background:"rgba(228,53,49,.08)",borderBottom:"1px solid rgba(228,53,49,.2)",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <span style={{color:"var(--acc)"}}>{TIc.alert}</span>
            <span style={{fontSize:11,color:"var(--acc)"}}>You have <strong>exceeded</strong> your available PTO. Contact your manager before requesting additional time off.</span>
          </div>
        )}

        {/* Tabs */}
        <div style={{display:"flex",background:"var(--s1)",borderBottom:"1px solid var(--br)",padding:"0 18px",flexShrink:0,overflowX:"auto"}}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>{setTab(t.key);setFilterStatus("all");}}
              style={{background:"none",border:"none",fontFamily:"var(--ui)",fontSize:12,padding:"12px 12px",cursor:"pointer",
                borderBottom:tab===t.key?"2px solid var(--acc)":"2px solid transparent",
                color:tab===t.key?"var(--t1)":"var(--t2)",fontWeight:tab===t.key?700:400,
                whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5,transition:"all .12s"}}>
              <span style={{opacity:.7}}>{t.icon}</span> {t.label}
              {t.badge>0&&<span style={{fontSize:8,background:"var(--acc)",color:"#fff",borderRadius:9,padding:"1px 5px",fontFamily:"var(--mono)"}}>{t.badge}</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{flex:1,overflow:"hidden",display:"flex",flexWrap:"wrap"}}>
          {/* CALENDAR TAB */}
          {tab==="calendar"&&(<>
            <div style={{flex:"1 1 280px",minWidth:240,maxWidth:280,borderRight:"1px solid var(--br)",background:"var(--s1)",display:"flex",flexDirection:"column",padding:16}}>
              <MiniCalendar year={calYear} month={calMonth} onMonthChange={changeMonth} requests={requests} onDayClick={setSelectedDate} selectedDate={selectedDate}/>
              <div style={{marginTop:16,paddingTop:12,borderTop:"1px solid var(--br)"}}>
                <div className="lbl" style={{marginBottom:8}}>Legend</div>
                {PTO_TYPES.map(t=>(
                  <div key={t.key} style={{display:"flex",alignItems:"center",gap:8,padding:"3px 0"}}>
                    <span style={{width:8,height:8,borderRadius:"50%",background:t.color,flexShrink:0}}/>
                    <span style={{fontSize:10,color:"var(--t2)"}}>{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:16}}>
              {selectedDate ? (<div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div><div style={{fontSize:15,fontWeight:700,color:"var(--t1)"}}>{fmtDate(selectedDate)}</div>
                  <div style={{fontSize:10,color:"var(--t3)",marginTop:2}}>{selectedEvents.length} event{selectedEvents.length!==1?"s":""}</div></div>
                  <button className="btn btn-ghost btn-xs" onClick={()=>setSelectedDate(null)}>View All</button>
                </div>
                {selectedEvents.length===0&&<div style={{textAlign:"center",padding:40,color:"var(--t3)",fontSize:12}}>No time-off events on this day.</div>}
                {selectedEvents.map(r=><EventCard key={r.id} r={r} clickable/>)}
              </div>) : (<div>
                <div style={{fontSize:15,fontWeight:700,color:"var(--t1)",marginBottom:12}}>{MN[calMonth]} {calYear}</div>
                {requests.filter(r=>(r.status==="approved"||r.status==="pending")&&(isSameMonth(r.startDate,calYear,calMonth)||isSameMonth(r.endDate,calYear,calMonth)))
                  .sort((a,b)=>a.startDate.localeCompare(b.startDate))
                  .map(r=><EventCard key={r.id} r={r} clickable/>)}
                {requests.filter(r=>(r.status==="approved"||r.status==="pending")&&(isSameMonth(r.startDate,calYear,calMonth)||isSameMonth(r.endDate,calYear,calMonth))).length===0&&
                  <div style={{textAlign:"center",padding:40,color:"var(--t3)",fontSize:12}}>No time-off events this month.</div>}
              </div>)}
            </div>
          </>)}

          {/* MY REQUESTS TAB */}
          {tab==="requests"&&(
            <div style={{flex:1,overflowY:"auto",padding:16}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>My Time-Off Requests</div>
                <select className="sel" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{fontSize:10,padding:"4px 8px",width:"auto"}}>
                  <option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="denied">Denied</option><option value="cancelled">Cancelled</option>
                </select>
              </div>
              {filteredReqs.length===0&&(
                <div style={{textAlign:"center",padding:40}}>
                  <div style={{fontSize:32,marginBottom:8}}>{"\ud83d\udcc5"}</div>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--t1)",marginBottom:4}}>No requests yet</div>
                  <div style={{fontSize:11,color:"var(--t3)",marginBottom:16}}>Submit a time-off request to get started.</div>
                  <button className="btn btn-primary btn-xs" onClick={()=>setShowRequest(true)}>{TIc.plus} Request Time Off</button>
                </div>
              )}
              {filteredReqs.map(r=>{
                const st=STATUS_DEFS[r.status]||STATUS_DEFS.pending;
                return (
                  <div key={r.id} style={{background:"var(--s2)",border:"1px solid var(--br)",borderLeft:`3px solid ${ptoColor(r.type)}`,borderRadius:8,padding:"12px 14px",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:16}}>{ptoIcon(r.type)}</span>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:"var(--t1)"}}>{ptoLabel(r.type)}</div>
                          <div style={{fontSize:10,color:"var(--t3)"}}>{fmtDate(r.startDate)} \u2013 {fmtDate(r.endDate)} {"\u00b7"} {r.daysRequested||daysBetween(r.startDate,r.endDate)} day{(r.daysRequested||1)!==1?"s":""}</div>
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:9,fontWeight:600,padding:"2px 8px",borderRadius:12,background:st.bg,border:`1px solid ${st.border}`,color:st.color}}>{st.label}</span>
                        {r.status==="pending"&&<button className="btn btn-ghost btn-xs" style={{color:"var(--acc)"}} onClick={()=>handleCancel(r.id)}>Cancel</button>}
                      </div>
                    </div>
                    {r.notes&&<div style={{fontSize:10,color:"var(--t3)",marginTop:6}}>{r.notes}</div>}
                    {r.reviewerNote&&<div style={{fontSize:10,color:"var(--t2)",marginTop:6,padding:"6px 8px",background:"var(--s3)",borderRadius:6}}><strong>Reviewer:</strong> {r.reviewerNote}</div>}
                    {r.reviewerName&&r.status!=="pending"&&<div style={{fontSize:9,color:"var(--t3)",marginTop:4}}>Reviewed by {r.reviewerName}{r.reviewedAt?` on ${fmtDate(r.reviewedAt.split("T")[0])}`:""}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* BALANCES TAB */}
          {tab==="balances"&&(
            <div style={{flex:1,overflowY:"auto",padding:16}}>
              <div style={{fontSize:13,fontWeight:700,color:"var(--t1)",marginBottom:12}}>Employee PTO Balances</div>
              <BalancesView globalStaff={globalStaff} requests={requests} config={config}/>
            </div>
          )}

          {/* APPROVALS TAB */}
          {tab==="approvals"&&(
            <div style={{flex:1,overflowY:"auto",padding:16}}>
              <div style={{fontSize:13,fontWeight:700,color:"var(--t1)",marginBottom:12}}>Pending Approvals ({pendingCount})</div>
              {filteredReqs.length===0&&(
                <div style={{textAlign:"center",padding:40}}>
                  <div style={{fontSize:32,marginBottom:8}}>{"\u2705"}</div>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--t1)",marginBottom:4}}>All caught up!</div>
                  <div style={{fontSize:11,color:"var(--t3)"}}>No pending time-off requests to review.</div>
                </div>
              )}
              {filteredReqs.map(r=>{
                const bal=getBalance(r);
                const exceeds=bal&&(bal.available-(r.daysRequested||daysBetween(r.startDate,r.endDate)))<0;
                return (
                  <div key={r.id} onClick={()=>setReviewReq(r)}
                    style={{background:"var(--s2)",border:"1px solid var(--br)",borderLeft:`3px solid ${ptoColor(r.type)}`,borderRadius:8,padding:"12px 14px",marginBottom:8,cursor:"pointer"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:36,height:36,borderRadius:"50%",background:"var(--acc-lo)",color:"var(--acc)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,flexShrink:0}}>{(r.staffName||"?")[0]}</div>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:"var(--t1)"}}>{r.staffName}</div>
                          <div style={{fontSize:10,color:"var(--t3)"}}>{ptoLabel(r.type)} {"\u00b7"} {fmtDateShort(r.startDate)}\u2013{fmtDateShort(r.endDate)} {"\u00b7"} {r.daysRequested||daysBetween(r.startDate,r.endDate)} day{(r.daysRequested||1)!==1?"s":""}</div>
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        {exceeds&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:8,background:"rgba(228,53,49,.12)",border:"1px solid rgba(228,53,49,.25)",color:"var(--acc)",display:"flex",alignItems:"center",gap:3}}>{TIc.alert} Exceeds PTO</span>}
                        {bal&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:8,background:"var(--s3)",color:"var(--t2)",fontFamily:"var(--mono)"}}>{bal.available}d avail</span>}
                        <span style={{color:"var(--acc)"}}>{TIc.chev_r}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showRequest&&<RequestModal onClose={()=>setShowRequest(false)} onSubmit={handleSubmit} globalStaff={globalStaff} currentMemberId={currentMemberId}/>}
      {showConfig&&<ConfigModal onClose={()=>setShowConfig(false)} config={config} onSave={handleSaveConfig} globalStaff={globalStaff}/>}
      {showHoliday&&<HolidayModal onClose={()=>setShowHoliday(false)} onSubmit={handleAddHoliday}/>}
      {reviewReq&&<ApprovalModal request={reviewReq} onClose={()=>setReviewReq(null)} onApprove={handleApprove} onDeny={handleDeny} balance={getBalance(reviewReq)}/>}
    </div>
  );
}

export default TimeOffPanel;
