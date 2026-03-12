/**
 * JobDoxDocuments.jsx
 * Document Builder Module for Job-Dox Portal
 *
 * EXPORTS
 *  DocumentsTab           — replaces existing DocumentsTab stub in JobDoxPortal.jsx
 *  LogoUploadSection      — drop into GeneralSettingsTab company info section
 *  DocumentTemplateCenter — add to AdvToolsPanel TOOLS array
 */

import { useState, useRef, useEffect } from "react";

// ─── STORAGE ────────────────────────────────────────────────────────────────
const LS_TMPL = "jd_doc_templates";
const LS_DOCS = "jd_documents";
const LS_CO   = "jd_company_info";

const loadTemplates  = () => { try { return JSON.parse(localStorage.getItem(LS_TMPL)) || []; } catch { return []; } };
const saveTemplates  = v  => { try { localStorage.setItem(LS_TMPL, JSON.stringify(v)); } catch {} };
const loadAllDocs    = () => { try { return JSON.parse(localStorage.getItem(LS_DOCS)) || []; } catch { return []; } };
const saveAllDocs    = v  => { try { localStorage.setItem(LS_DOCS, JSON.stringify(v)); } catch {} };
const loadCoInfo     = () => { try { return JSON.parse(localStorage.getItem(LS_CO))   || {}; } catch { return {}; } };
const saveCoInfo     = v  => { try { localStorage.setItem(LS_CO,   JSON.stringify(v)); } catch {} };

let _c = 9000;
const uid = () => `jd-${++_c}-${Math.random().toString(36).slice(2,6)}`;

// ─── SVG ICONS (same pattern as portal Ic object) ───────────────────────────
const Di = {
  doc:      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>,
  pen:      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>,
  initials: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/></svg>,
  send:     <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>,
  sign:     <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.56 3a1 1 0 0 0-.7.29l-1.3 1.3 2.83 2.83 1.3-1.3a1 1 0 0 0 0-1.42L18.27 3.3A1 1 0 0 0 17.56 3zM14.14 6l-9.3 9.3a.5.5 0 0 0-.12.21L3 21l5.5-1.72a.5.5 0 0 0 .2-.12L18 9.86 14.14 6z"/></svg>,
  eye:      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>,
  pin:      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>,
  check:    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>,
  trash:    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>,
  close:    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
  plus:     <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  back:     <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>,
  upload:   <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>,
  mail:     <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>,
  sms:      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>,
  calendar: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg>,
  text:     <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/></svg>,
  template: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H5v-4h7v4zm7 0h-5v-4h5v4zm0-6H5V5h14v6z"/></svg>,
  heading:  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4v3h5.5v12h3V7H19V4z"/></svg>,
  para:     <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 1.07V9h3c2.21 0 4 1.79 4 4s-1.79 4-4 4h-3v6h-2V9H8v14H6V9H3V7h10V1.07c.34.08.67.19 1 .31.33-.12.66-.23 1-.31z"/></svg>,
  checkbox: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.11 0-2 .89-2 2v14c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>,
  chev_r:   <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>,
  warn:     <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>,
  info:     <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>,
};

// ─── AUTO-FILL TOKEN ENGINE ──────────────────────────────────────────────────
const TOKENS = {
  "project.name":        p     => p.name             || "",
  "project.date":        ()    => new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}),
  "project.address":     p     => p.address           || "",
  "project.clientName":  p     => p.clientName || p.client      || "",
  "project.clientPhone": p     => p.clientPhone || p.phone      || "",
  "project.workType":    p     => Array.isArray(p.worktypes) ? p.worktypes.map(w=>w.type||w).join(", ") : (p.type||""),
  "project.claimNumber": p     => p.claimNumber || p.claim      || "",
  "project.insuranceCo": p     => p.insuranceCo || p.carrier    || "",
  "project.adjuster":    p     => p.adjuster          || "",
  "company.name":        (_,c) => c.name              || "",
  "company.address":     (_,c) => c.address           || "",
  "company.city":        (_,c) => c.city              || "",
  "company.state":       (_,c) => c.state             || "",
  "company.zip":         (_,c) => c.zip               || "",
  "company.phone":       (_,c) => c.phone             || "",
  "company.email":       (_,c) => c.email             || "",
};

const fillTokens = (text, proj, co) =>
  (text || "").replace(/\{\{([^}]+)\}\}/g, (m, key) => {
    const fn = TOKENS[key.trim()];
    return fn ? fn(proj||{}, co||{}) : m;
  });

// ─── BUILT-IN TEMPLATES ──────────────────────────────────────────────────────
const DEFAULT_TEMPLATES = [
  {
    id:"tmpl-work-auth", name:"Work Authorization", type:"work-auth",
    description:"Authorizes work to begin on the property", color:"#5ba3f5",
    fields:[
      { id:"h1", type:"heading",   label:"", content:"WORK AUTHORIZATION", x:5, y:4, w:90, h:4, autoFill:null, signerIdx:null },
      { id:"p1", type:"paragraph", label:"", content:"This Work Authorization is entered into as of {{project.date}} between {{company.name}} (\"Contractor\") and the property owner(s) at {{project.address}} (\"Client\").\n\nClient authorizes Contractor to perform {{project.workType}} services at the above property. Client agrees to provide full access and cooperate in performance of said services. Payment terms are net 30 from completion unless otherwise agreed.", x:5, y:11, w:90, h:28, autoFill:null, signerIdx:null },
      { id:"t1", type:"text",      label:"Client Name",       content:"", x:5,  y:44, w:42, h:5, autoFill:"project.clientName",  signerIdx:null },
      { id:"t2", type:"text",      label:"Property Address",  content:"", x:52, y:44, w:43, h:5, autoFill:"project.address",     signerIdx:null },
      { id:"t3", type:"text",      label:"Claim Number",      content:"", x:5,  y:53, w:42, h:5, autoFill:"project.claimNumber", signerIdx:null },
      { id:"t4", type:"text",      label:"Insurance Carrier", content:"", x:52, y:53, w:43, h:5, autoFill:"project.insuranceCo", signerIdx:null },
      { id:"s1", type:"signature", label:"Client Signature",     content:"", x:5,  y:71, w:38, h:10, autoFill:null, signerIdx:0 },
      { id:"d1", type:"date",      label:"Date",                 content:"", x:47, y:71, w:25, h:10, autoFill:null, signerIdx:0 },
      { id:"i1", type:"initials",  label:"Initials",             content:"", x:76, y:71, w:19, h:10, autoFill:null, signerIdx:0 },
      { id:"s2", type:"signature", label:"Contractor Signature", content:"", x:5,  y:86, w:38, h:10, autoFill:null, signerIdx:1 },
      { id:"d2", type:"date",      label:"Date",                 content:"", x:47, y:86, w:25, h:10, autoFill:null, signerIdx:1 },
    ],
  },
  {
    id:"tmpl-change-order", name:"Change Order", type:"change-order",
    description:"Documents scope changes and cost adjustments", color:"#e89c18",
    fields:[
      { id:"h1", type:"heading",   label:"", content:"CHANGE ORDER", x:5, y:4, w:90, h:4, autoFill:null, signerIdx:null },
      { id:"p1", type:"paragraph", label:"", content:"Project: {{project.name}}\nProperty: {{project.address}}\nDate: {{project.date}}\nContractor: {{company.name}}\n\nThis Change Order documents modifications to the original Work Authorization. The parties agree that the scope, cost, and/or schedule shall be amended as described below. Upon execution by all parties this Change Order is incorporated into the original agreement.", x:5, y:11, w:90, h:24, autoFill:null, signerIdx:null },
      { id:"t1", type:"text", label:"Description of Change",    content:"", x:5,  y:39, w:90, h:6, autoFill:null, signerIdx:null },
      { id:"t2", type:"text", label:"Additional Cost ($)",      content:"", x:5,  y:49, w:42, h:5, autoFill:null, signerIdx:null },
      { id:"t3", type:"text", label:"Revised Completion Date",  content:"", x:52, y:49, w:43, h:5, autoFill:null, signerIdx:null },
      { id:"s1", type:"signature", label:"Client Approval",     content:"", x:5,  y:66, w:38, h:10, autoFill:null, signerIdx:0 },
      { id:"d1", type:"date",      label:"Date",                content:"", x:47, y:66, w:25, h:10, autoFill:null, signerIdx:0 },
      { id:"i1", type:"initials",  label:"Initials",            content:"", x:76, y:66, w:19, h:10, autoFill:null, signerIdx:0 },
      { id:"s2", type:"signature", label:"Contractor Approval", content:"", x:5,  y:81, w:38, h:10, autoFill:null, signerIdx:1 },
      { id:"d2", type:"date",      label:"Date",                content:"", x:47, y:81, w:25, h:10, autoFill:null, signerIdx:1 },
    ],
  },
  {
    id:"tmpl-contract", name:"Service Contract", type:"contract",
    description:"Full service agreement with terms and conditions", color:"#1ad98a",
    fields:[
      { id:"h1", type:"heading",   label:"", content:"SERVICE CONTRACT AGREEMENT", x:5, y:4, w:90, h:4, autoFill:null, signerIdx:null },
      { id:"p1", type:"paragraph", label:"", content:"This Agreement is entered into as of {{project.date}} between {{company.name}}, {{company.address}}, {{company.city}}, {{company.state}} {{company.zip}}, Phone: {{company.phone}} (\"Contractor\") and the undersigned property owner(s) (\"Client\").\n\nPROPERTY: {{project.address}}\n\nSCOPE: Contractor agrees to perform {{project.workType}} services as outlined in the attached Scope of Work and in accordance with applicable industry standards and local codes.\n\nPAYMENT: Client agrees to pay the amount specified in the Scope of Work. A 50% deposit is due upon signing with balance due upon substantial completion.\n\nINSURANCE: Contractor maintains general liability and workers compensation insurance. Certificates available upon request.\n\nWARRANTY: Contractor warrants workmanship for one (1) year from the date of substantial completion.", x:5, y:11, w:90, h:46, autoFill:null, signerIdx:null },
      { id:"t1", type:"text",      label:"Client Name",   content:"", x:5,  y:61, w:42, h:5, autoFill:"project.clientName",  signerIdx:null },
      { id:"t2", type:"text",      label:"Client Phone",  content:"", x:52, y:61, w:43, h:5, autoFill:"project.clientPhone", signerIdx:null },
      { id:"s1", type:"signature", label:"Client Signature",     content:"", x:5,  y:72, w:38, h:10, autoFill:null, signerIdx:0 },
      { id:"d1", type:"date",      label:"Date",                 content:"", x:47, y:72, w:25, h:10, autoFill:null, signerIdx:0 },
      { id:"i1", type:"initials",  label:"Initials",             content:"", x:76, y:72, w:19, h:10, autoFill:null, signerIdx:0 },
      { id:"s2", type:"signature", label:"Contractor Signature", content:"", x:5,  y:86, w:38, h:10, autoFill:null, signerIdx:1 },
      { id:"d2", type:"date",      label:"Date",                 content:"", x:47, y:86, w:25, h:10, autoFill:null, signerIdx:1 },
    ],
  },
];

// ─── STATUS META ─────────────────────────────────────────────────────────────
const STATUS_META = {
  draft:     { label:"Draft",               color:"var(--t3)",    bg:"rgba(128,128,128,.1)"  },
  pending:   { label:"Awaiting Signatures", color:"var(--amber)", bg:"rgba(232,156,24,.1)"   },
  partial:   { label:"Partially Signed",    color:"var(--blue)",  bg:"rgba(91,163,245,.1)"   },
  completed: { label:"Fully Executed",      color:"var(--green)", bg:"rgba(26,217,138,.1)"   },
  void:      { label:"Void",                color:"var(--acc)",   bg:"rgba(228,53,49,.08)"   },
};

function getDocStatus(doc) {
  if (doc.status === "void")  return "void";
  if (!doc.signers?.length)   return "draft";
  const signed = doc.signers.filter(s => s.status === "signed").length;
  if (signed === 0)                       return "pending";
  if (signed < doc.signers.length)        return "partial";
  return "completed";
}

// ─── SPINNER helper ──────────────────────────────────────────────────────────
const Spin = () => (
  <div style={{ width:11, height:11, border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"jd-spin .7s linear infinite", display:"inline-block" }}/>
);

// ─────────────────────────────────────────────────────────────────────────────
// SIGNATURE PAD
// ─────────────────────────────────────────────────────────────────────────────
function SignaturePad({ label="Sign here", height=120, onCapture, onClear }) {
  const cvRef   = useRef();
  const drawing = useRef(false);
  const lastPt  = useRef(null);
  const [hasSig, setHasSig] = useState(false);

  const getXY = (e, cv) => {
    const r   = cv.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };

  const onStart = e => {
    e.preventDefault();
    drawing.current = true;
    const cv  = cvRef.current;
    const pt  = getXY(e, cv);
    lastPt.current = pt;
    const ctx = cv.getContext("2d");
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 1, 0, Math.PI*2);
    ctx.fillStyle = "#0d1117"; ctx.fill();
  };

  const onMove = e => {
    e.preventDefault();
    if (!drawing.current) return;
    const cv  = cvRef.current;
    const pt  = getXY(e, cv);
    const ctx = cv.getContext("2d");
    ctx.beginPath(); ctx.moveTo(lastPt.current.x, lastPt.current.y); ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = "#0d1117"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
    lastPt.current = pt;
    setHasSig(true);
  };

  const onEnd = e => {
    e.preventDefault();
    if (!drawing.current) return;
    drawing.current = false;
    if (hasSig && onCapture) onCapture(cvRef.current.toDataURL());
  };

  const clear = () => {
    const cv = cvRef.current;
    cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
    setHasSig(false);
    if (onClear) onClear();
  };

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    cv.width = cv.offsetWidth;
    cv.height = height;
  }, [height]);

  return (
    <div>
      <label className="lbl">{label}</label>
      <div style={{ border:`1.5px solid ${hasSig?"var(--green)":"var(--br-hi)"}`, borderRadius:7, background:"#fff", position:"relative", height, transition:"border-color .15s" }}>
        <canvas
          ref={cvRef}
          style={{ display:"block", width:"100%", height:"100%", touchAction:"none", cursor:"crosshair" }}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
        />
        {!hasSig && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
            <span style={{ fontSize:11, color:"rgba(0,0,0,.28)", fontStyle:"italic", fontFamily:"var(--ui)" }}>Draw signature with finger or mouse</span>
          </div>
        )}
      </div>
      {hasSig && (
        <button onClick={clear} style={{ marginTop:5, fontSize:10, color:"var(--acc)", background:"none", border:"none", cursor:"pointer", padding:0, fontFamily:"var(--ui)", display:"flex", alignItems:"center", gap:4 }}>
          {Di.close} Clear and redo
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOC PAGE  — renders the white letter-size document
// ─────────────────────────────────────────────────────────────────────────────
function DocPage({ template, values={}, signerIdx=null, onFieldTap, width=740, highlightPending=false }) {
  const height = width * (1100/850);
  const co     = loadCoInfo();
  const px     = (pct, tot) => (pct/100)*tot;

  return (
    <div style={{ width, height, background:"#fff", borderRadius:3, boxShadow:"0 4px 32px rgba(0,0,0,.22)", position:"relative", overflow:"hidden", fontSize:width/78, fontFamily:"var(--ui)" }}>

      {/* Company header band */}
      <div style={{ position:"absolute", top:px(1.5,height), left:px(5,width), right:px(5,width), display:"flex", alignItems:"center", gap:14, borderBottom:"2px solid #e43531", paddingBottom:9 }}>
        {co.logo
          ? <img src={co.logo} alt="" style={{ height:42, maxWidth:130, objectFit:"contain", flexShrink:0 }}/>
          : <div style={{ height:42, minWidth:90, background:"#e43531", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"#fff", padding:"0 10px", letterSpacing:".06em", flexShrink:0 }}>
              {(co.name||"YOUR CO").toUpperCase().slice(0,8)}
            </div>}
        <div style={{ flex:1 }}>
          <div style={{ fontSize:width/62, fontWeight:800, color:"#0d1117" }}>{co.name||"Your Company Name"}</div>
          <div style={{ fontSize:width/88, color:"#6b7280", marginTop:1 }}>
            {[co.address,co.city,co.state,co.zip].filter(Boolean).join(", ")}{co.phone&&` · ${co.phone}`}
          </div>
        </div>
        <div style={{ textAlign:"right", fontSize:width/98, color:"#6b7280", fontFamily:"var(--mono)" }}>
          <div>{new Date().toLocaleDateString("en-US")}</div>
          <div style={{ color:"#e43531", fontWeight:700, marginTop:2, letterSpacing:".04em" }}>JOB-DOX</div>
        </div>
      </div>

      {/* Fields */}
      {(template?.fields||[]).map(f => {
        const left = px(f.x,width), top = px(f.y,height), fw = px(f.w,width), fh = px(f.h,height);
        const val  = values[f.id];
        const isMine = signerIdx!==null && f.signerIdx===signerIdx;
        const done   = !!val?.data || !!val?.text;

        if (f.type==="heading") return (
          <div key={f.id} style={{ position:"absolute", left, top, width:fw, height:fh, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ fontSize:width/46, fontWeight:900, color:"#0d1117", letterSpacing:".09em", textAlign:"center" }}>{f.content}</div>
          </div>
        );

        if (f.type==="paragraph") return (
          <div key={f.id} style={{ position:"absolute", left, top, width:fw, height:fh, overflow:"hidden" }}>
            <div style={{ fontSize:width/82, color:"#374151", lineHeight:1.75, whiteSpace:"pre-wrap" }}>{val?.text||f.content}</div>
          </div>
        );

        if (f.type==="text"||f.type==="date") return (
          <div key={f.id} style={{ position:"absolute", left, top, width:fw }}>
            <div style={{ fontSize:width/102, color:"#6b7280", marginBottom:2, fontFamily:"var(--mono)", letterSpacing:".05em", textTransform:"uppercase" }}>{f.label}</div>
            <div style={{ borderBottom:"1.5px solid #d1d5db", padding:"2px 4px", fontSize:width/74, color:"#0d1117", minHeight:fh*.55 }}>{val?.text||""}</div>
          </div>
        );

        if (f.type==="signature"||f.type==="initials") {
          const isSig    = f.type==="signature";
          const baseClr  = isSig ? "#e43531" : "#3b82f6";
          const pending  = isMine && highlightPending && !done;
          return (
            <div
              key={f.id}
              onClick={() => onFieldTap&&onFieldTap(f)}
              style={{ position:"absolute", left, top, width:fw, height:fh,
                border: done ? `1.5px solid ${isSig?"#1ad98a":"#3b82f6"}` : `1.5px dashed ${baseClr}99`,
                background: done ? (isSig?"rgba(26,217,138,.04)":"rgba(59,130,246,.04)") : `${baseClr}05`,
                borderRadius:4, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                cursor:onFieldTap?"pointer":"default", transition:"all .12s",
                ...(pending ? { boxShadow:`0 0 0 2px ${baseClr}40` } : {}),
              }}>
              {done && val?.data
                ? <img src={val.data} alt="" style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain" }}/>
                : done && val?.text
                  ? <div style={{ fontSize:width/58, fontFamily:"cursive", color:"#0d1117" }}>{val.text}</div>
                  : <>
                      <div style={{ color:baseClr, opacity:.7, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {isSig
                          ? <svg width={fh*.3} height={fh*.3} viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                          : <svg width={fh*.28} height={fh*.28} viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/></svg>}
                      </div>
                      <div style={{ fontSize:width/105, color:`${baseClr}cc`, fontFamily:"var(--mono)", letterSpacing:".05em", textTransform:"uppercase", marginTop:3, textAlign:"center", lineHeight:1.3 }}>
                        {f.label||(isSig?"Signature":"Initials")}
                      </div>
                    </>}
            </div>
          );
        }

        if (f.type==="checkbox") return (
          <div key={f.id} onClick={() => onFieldTap&&onFieldTap(f)}
            style={{ position:"absolute", left, top, width:20, height:20, border:"2px solid #d1d5db", background:"#fff", borderRadius:3, display:"flex", alignItems:"center", justifyContent:"center", cursor:onFieldTap?"pointer":"default" }}>
            {val?.checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="#e43531"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>}
          </div>
        );

        return null;
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IN-PERSON SIGNING MODAL
// ─────────────────────────────────────────────────────────────────────────────
function SigningModal({ doc, signerIdx, onComplete, onClose }) {
  const allTemplates = [...DEFAULT_TEMPLATES, ...loadTemplates()];
  const template     = allTemplates.find(t => t.id===doc.templateId) || null;
  const signer       = doc.signers?.[signerIdx];
  const myFields     = template?.fields?.filter(f => f.signerIdx===signerIdx && (f.type==="signature"||f.type==="initials")) || [];

  const [values,      setValues]      = useState({ ...doc.values });
  const [geo,         setGeo]         = useState(null);
  const [geoLoading,  setGeoLoading]  = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [sigData,     setSigData]     = useState(null);
  const [step,        setStep]        = useState("geo"); // geo | sign | review

  const unsigned  = myFields.filter(f => !values[f.id]?.data && !values[f.id]?.text);
  const allSigned = unsigned.length === 0;

  const requestGeo = () => {
    setGeoLoading(true);
    if (!navigator.geolocation) { setGeo({ lat:"unavailable", lng:"unavailable" }); setGeoLoading(false); setStep("review"); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setGeo({ lat:pos.coords.latitude.toFixed(6), lng:pos.coords.longitude.toFixed(6) }); setGeoLoading(false); setStep("review"); },
      ()  => { setGeo({ lat:"unavailable", lng:"unavailable" }); setGeoLoading(false); setStep("review"); },
      { enableHighAccuracy:true, timeout:8000 }
    );
  };

  const handleFieldTap = f => {
    if (!geo) { setStep("geo"); return; }
    setActiveField(f); setSigData(null); setStep("sign");
  };

  const applySignature = () => {
    if (!sigData||!activeField) return;
    const ts = new Date().toLocaleDateString("en-US");
    setValues(v => ({ ...v, [activeField.id]:{ data:sigData, timestamp:ts, lat:geo?.lat, lng:geo?.lng } }));
    template?.fields?.filter(f => f.type==="date"&&f.signerIdx===signerIdx).forEach(df => {
      setValues(v => ({ ...v, [df.id]:{ text:ts } }));
    });
    setActiveField(null); setSigData(null); setStep("review");
  };

  const finalize = () => onComplete({ values, geo, signedAt:new Date().toISOString() });

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(6,7,13,.92)", backdropFilter:"blur(6px)", zIndex:2000, display:"flex", flexDirection:"column", alignItems:"center", overflowY:"auto", padding:20 }}>
      {/* Header */}
      <div style={{ width:"100%", maxWidth:840, display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexShrink:0 }}>
        <div>
          <div style={{ color:"var(--t1)", fontWeight:800, fontSize:16 }}>{doc.name}</div>
          <div className="mono" style={{ fontSize:9, color:"var(--t3)", marginTop:2 }}>
            SIGNING AS: {signer?.name?.toUpperCase()||`SIGNER ${signerIdx+1}`}
            {signer?.role && <span style={{ marginLeft:8, color:"var(--t2)" }}> · {signer.role.toUpperCase()}</span>}
          </div>
        </div>
        <button className="btn btn-ghost btn-xs" onClick={onClose}>Save &amp; Exit</button>
      </div>

      {/* Field progress pills */}
      {myFields.length > 0 && (
        <div style={{ width:"100%", maxWidth:840, display:"flex", gap:7, marginBottom:16, flexShrink:0, flexWrap:"wrap" }}>
          {myFields.map((f, i) => {
            const done = !!values[f.id]?.data||!!values[f.id]?.text;
            return (
              <div key={f.id} style={{ display:"flex", alignItems:"center", gap:7, flex:1, minWidth:120, background:done?"rgba(26,217,138,.08)":"rgba(255,255,255,.04)", border:`1px solid ${done?"rgba(26,217,138,.3)":"rgba(255,255,255,.1)"}`, borderRadius:8, padding:"7px 11px" }}>
                <div style={{ width:22, height:22, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:`1.5px solid ${done?"var(--green)":"rgba(255,255,255,.25)"}`, color:done?"var(--green)":"var(--t3)", fontSize:10, fontWeight:700, flexShrink:0 }}>
                  {done ? Di.check : i+1}
                </div>
                <span style={{ fontSize:11, color:done?"var(--green)":"var(--t2)" }}>{f.label||f.type}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* GEO step */}
      {step==="geo" && (
        <div className="card anim" style={{ maxWidth:420, width:"100%", padding:28, textAlign:"center" }}>
          <div style={{ display:"flex", justifyContent:"center", color:"var(--t2)", marginBottom:8 }}>{Di.pin}</div>
          <div style={{ fontWeight:700, fontSize:14, color:"var(--t1)", marginBottom:8 }}>Location Verification</div>
          <div style={{ fontSize:11, color:"var(--t2)", lineHeight:1.75, marginBottom:20 }}>
            Job-Dox captures GPS coordinates where each signature is collected, creating a verifiable time-stamped location record attached to the document.
          </div>
          {geoLoading
            ? <div style={{ fontSize:11, color:"var(--amber)", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
                <div style={{ width:12, height:12, border:"2px solid rgba(232,156,24,.3)", borderTopColor:"var(--amber)", borderRadius:"50%", animation:"jd-spin .7s linear infinite" }}/> Requesting location...
              </div>
            : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <button className="btn btn-primary" onClick={requestGeo}>Allow Location Access</button>
                <button className="btn btn-ghost btn-xs" onClick={() => { setGeo({ lat:"unavailable", lng:"unavailable" }); setStep("review"); }}>Skip — location will not be captured</button>
              </div>}
        </div>
      )}

      {/* SIGN step */}
      {step==="sign" && activeField && (
        <div className="card anim" style={{ maxWidth:480, width:"100%", padding:24 }}>
          <div style={{ fontWeight:700, fontSize:13, color:"var(--t1)", marginBottom:12 }}>{activeField.label||(activeField.type==="initials"?"Initials":"Signature")}</div>
          {geo?.lat!=="unavailable" && (
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:12, background:"rgba(26,217,138,.08)", border:"1px solid rgba(26,217,138,.2)", borderRadius:6, padding:"5px 10px", fontSize:10, color:"var(--green)" }}>
              {Di.pin}<span className="mono">{geo.lat}, {geo.lng}</span>
            </div>
          )}
          <SignaturePad label={activeField.type==="initials"?"Draw your initials":"Draw your full signature"} height={activeField.type==="initials"?90:130} onCapture={setSigData} onClear={() => setSigData(null)}/>
          <div style={{ display:"flex", gap:8, marginTop:16 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => { setActiveField(null); setStep("review"); }}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:2, opacity:sigData?1:.4 }} disabled={!sigData} onClick={applySignature}>
              {Di.check} Apply {activeField.type==="initials"?"Initials":"Signature"}
            </button>
          </div>
        </div>
      )}

      {/* REVIEW step */}
      {step==="review" && (
        <div style={{ width:"100%", maxWidth:800 }}>
          <div style={{ overflowX:"auto" }}>
            <DocPage template={template} values={values} signerIdx={signerIdx} onFieldTap={handleFieldTap} width={740} highlightPending={!allSigned}/>
          </div>
          {!allSigned && (
            <div style={{ marginTop:14, padding:"10px 16px", background:"rgba(232,156,24,.1)", border:"1px solid rgba(232,156,24,.28)", borderRadius:8, color:"var(--amber)", fontSize:12, textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {Di.warn} Tap the highlighted fields above to complete signing
            </div>
          )}
          {allSigned && (
            <div style={{ marginTop:14, textAlign:"center" }}>
              <div style={{ padding:"12px 18px", background:"rgba(26,217,138,.1)", border:"1px solid rgba(26,217,138,.28)", borderRadius:8, color:"var(--green)", fontSize:13, fontWeight:700, marginBottom:12, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                {Di.check} All fields signed — ready to finalize
              </div>
              <button className="btn btn-primary btn-lg" onClick={finalize}>{Di.check} Finalize and Submit</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEND FOR REMOTE SIGNING MODAL
// ─────────────────────────────────────────────────────────────────────────────
function SendRemoteModal({ doc, onSend, onClose }) {
  const [method,  setMethod]  = useState("email");
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSend = async () => {
    setSending(true);
    // TODO: replace with real callFn("send-signing-request", { doc, method })
    await new Promise(r => setTimeout(r, 1000));
    setSent(true); setSending(false);
    setTimeout(() => { onSend(); onClose(); }, 1500);
  };

  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal anim" style={{ maxWidth:500 }}>
        <div className="modal-hd">
          <div>
            <div className="modal-ttl">Send for Signing</div>
            <div style={{ fontSize:11, color:"var(--t3)", marginTop:2 }}>{doc.name}</div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{Di.close}</button>
        </div>

        <div className="modal-body">
          <div style={{ padding:"10px 12px", background:"rgba(91,163,245,.06)", border:"1px solid rgba(91,163,245,.18)", borderRadius:7, fontSize:11, color:"var(--t2)", lineHeight:1.7 }}>
            Each signer receives a unique secure link. Signatures are captured with timestamp and GPS. Multiple signers can receive requests simultaneously.
          </div>

          <div>
            <label className="lbl">Delivery Method</label>
            <div style={{ display:"flex", gap:7 }}>
              {[{k:"email",label:"Email",icon:Di.mail},{k:"sms",label:"SMS",icon:Di.sms},{k:"both",label:"Both",icon:Di.send}].map(m => (
                <button key={m.k} onClick={() => setMethod(m.k)} style={{ flex:1, padding:"9px 8px", borderRadius:7, border:`1.5px solid ${method===m.k?"var(--acc)":"var(--br)"}`, background:method===m.k?"var(--acc-lo)":"transparent", color:method===m.k?"var(--acc)":"var(--t2)", cursor:"pointer", fontSize:11, fontWeight:method===m.k?700:400, fontFamily:"var(--ui)", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="lbl">Signers — {doc.signers?.length||0}</div>
            {doc.signers?.map((s,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid var(--br)" }}>
                <div style={{ width:30, height:30, borderRadius:"50%", background:"var(--s3)", border:"1px solid var(--br)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"var(--blue)", fontSize:12, flexShrink:0 }}>
                  {(s.name||"?")[0].toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"var(--t1)" }}>{s.name}</div>
                  <div style={{ fontSize:10, color:"var(--t3)", marginTop:1 }}>{s.role}{s.email&&` · ${s.email}`}{s.phone&&` · ${s.phone}`}</div>
                </div>
                <span className="mono" style={{ fontSize:9, color:s.status==="signed"?"var(--green)":"var(--amber)", background:s.status==="signed"?"rgba(26,217,138,.1)":"rgba(232,156,24,.1)", borderRadius:20, padding:"2px 9px" }}>
                  {s.status==="signed"?"SIGNED":"PENDING"}
                </span>
              </div>
            ))}
          </div>

          {sent && (
            <div style={{ display:"flex", alignItems:"center", gap:9, background:"rgba(26,217,138,.08)", border:"1px solid rgba(26,217,138,.28)", borderRadius:8, padding:"10px 14px" }}>
              <span style={{ color:"var(--green)" }}>{Di.check}</span>
              <span style={{ fontSize:12, fontWeight:700, color:"var(--green)" }}>Signing requests sent successfully</span>
            </div>
          )}
        </div>

        <div className="modal-ft">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSend} disabled={sending||sent}>
            {sending ? <><Spin/> Sending...</> : <>{Di.send} Send {method==="email"?"Email":method==="sms"?"SMS":"Email + SMS"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOC COMPOSER MODAL
// ─────────────────────────────────────────────────────────────────────────────
function DocComposerModal({ proj, startTemplate, onSave, onClose }) {
  const allTemplates = [...DEFAULT_TEMPLATES, ...loadTemplates()];
  const co           = loadCoInfo();

  const [step,    setStep]    = useState(startTemplate ? "compose" : "choose");
  const [tmpl,    setTmpl]    = useState(startTemplate || null);
  const [docName, setDocName] = useState(startTemplate ? `${startTemplate.name} — ${proj?.name||""}` : "");
  const [signers, setSigners] = useState(() => {
    const s = [];
    if (proj?.clientName||proj?.client) s.push({ id:uid(), name:proj.clientName||proj.client||"", email:proj.clientEmail||"", phone:proj.clientPhone||"", role:"Client", status:"pending" });
    if (co.name) s.push({ id:uid(), name:"", email:co.email||"", phone:co.phone||"", role:"Contractor", status:"pending" });
    return s;
  });

  const initValues = t => {
    const v = {};
    t?.fields?.forEach(f => {
      if (f.autoFill && TOKENS[f.autoFill]) v[f.id] = { text: TOKENS[f.autoFill](proj||{}, co) };
      else if (f.type==="paragraph")         v[f.id] = { text: fillTokens(f.content, proj||{}, co) };
    });
    return v;
  };

  const [values, setValues] = useState(() => initValues(startTemplate));

  const selectTemplate = t => {
    setTmpl(t);
    setDocName(`${t.name} — ${proj?.name||""}`);
    setValues(initValues(t));
    setStep("compose");
  };

  const signerIdxs = [...new Set((tmpl?.fields||[]).filter(f => f.signerIdx!==null&&f.signerIdx!==undefined).map(f=>f.signerIdx))].sort();

  const save = (send=false) => {
    const doc = {
      id:uid(), templateId:tmpl?.id||null,
      name:docName.trim()||"Untitled Document",
      projectId:proj?.id||null, projectName:proj?.name||"",
      status:send?"pending":"draft", createdAt:new Date().toISOString(),
      values, signers:signers.filter(s=>s.name.trim()),
    };
    const all = loadAllDocs();
    saveAllDocs([...all, doc]);
    onSave(doc); onClose();
  };

  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg anim" style={{ maxWidth:720 }}>
        <div className="modal-hd">
          <div>
            <div className="modal-ttl">{step==="choose"?"Choose a Template":tmpl?.name||"New Document"}</div>
            {proj?.name && <div className="mono" style={{ fontSize:9, color:"var(--t3)", marginTop:2 }}>{proj.name}</div>}
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{Di.close}</button>
        </div>

        <div className="modal-body">
          {/* STEP 1 — template picker */}
          {step==="choose" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
              {allTemplates.map(t => (
                <button key={t.id} onClick={() => selectTemplate(t)}
                  style={{ background:"var(--s3)", border:"1px solid var(--br)", borderRadius:10, padding:14, cursor:"pointer", textAlign:"left", transition:"all .12s", display:"flex", flexDirection:"column", gap:5, fontFamily:"var(--ui)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="var(--br-hi)"; e.currentTarget.style.background="var(--s4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="var(--br)";    e.currentTarget.style.background="var(--s3)"; }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:28, height:28, borderRadius:7, background:`${t.color||"var(--blue)"}18`, color:t.color||"var(--blue)", display:"flex", alignItems:"center", justifyContent:"center" }}>{Di.doc}</div>
                    <div style={{ fontWeight:700, fontSize:12, color:"var(--t1)" }}>{t.name}</div>
                  </div>
                  <div style={{ fontSize:10, color:"var(--t3)", lineHeight:1.5 }}>{t.description}</div>
                  <div className="mono" style={{ fontSize:9, color:"var(--t3)", marginTop:2 }}>{t.fields?.length||0} FIELDS</div>
                </button>
              ))}
            </div>
          )}

          {/* STEP 2 — compose */}
          {step==="compose" && tmpl && (
            <>
              <div>
                <label className="lbl">Document Title</label>
                <input className="inp" value={docName} onChange={e => setDocName(e.target.value)}/>
              </div>

              {tmpl.fields?.some(f => f.type==="text"||f.type==="paragraph") && (
                <div>
                  <div className="sec" style={{ marginBottom:9 }}>Auto-Filled Fields — Review and Edit</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
                    {tmpl.fields.filter(f => f.type==="text"||f.type==="paragraph").map(f => (
                      <div key={f.id} style={f.type==="paragraph"?{gridColumn:"1/-1"}:{}}>
                        <label className="lbl">{f.label||"Body Text"}</label>
                        {f.type==="paragraph"
                          ? <textarea className="txa" value={values[f.id]?.text||""} onChange={e => setValues(v => ({...v,[f.id]:{...v[f.id],text:e.target.value}}))} style={{ minHeight:80, fontSize:11 }}/>
                          : <input   className="inp" value={values[f.id]?.text||""} onChange={e => setValues(v => ({...v,[f.id]:{...v[f.id],text:e.target.value}}))} style={{ fontSize:11 }}/>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {signerIdxs.length > 0 && (
                <div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:9 }}>
                    <div className="sec" style={{ margin:0 }}>Signers — {signerIdxs.length} slot{signerIdxs.length!==1?"s":""}</div>
                    <button className="btn btn-ghost btn-xs" onClick={() => setSigners(s => [...s, { id:uid(), name:"", email:"", phone:"", role:"", status:"pending" }])}>
                      {Di.plus} Add Signer
                    </button>
                  </div>
                  {signerIdxs.map(idx => {
                    const s = signers[idx]||{};
                    return (
                      <div key={idx} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 90px", gap:8, marginBottom:8, padding:"11px 12px", background:"var(--s3)", borderRadius:8, border:"1px solid var(--br)" }}>
                        {[["Name","","name","text","Full name"],["Email","","email","email",""],["Phone","","phone","tel",""],["Role","","role","text","Client"]].map(([lbl,,key,type,ph]) => (
                          <div key={key}>
                            <label className="lbl">{lbl}{key==="name"?` — Signer ${idx+1}`:""}</label>
                            <input className="inp" type={type} value={s[key]||""} placeholder={ph} onChange={e => setSigners(ss => ss.map((x,i) => i===idx?{...x,[key]:e.target.value}:x))} style={{ fontSize:11 }}/>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  <div style={{ padding:"8px 11px", background:"rgba(91,163,245,.06)", border:"1px solid rgba(91,163,245,.18)", borderRadius:6, fontSize:10, color:"var(--blue)", lineHeight:1.6, display:"flex", gap:7, alignItems:"flex-start" }}>
                    {Di.info} Each signer can sign in person on a tablet or receive a secure link via email or SMS. Every signature records date, time, and GPS coordinates.
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-ft">
          {step==="choose"
            ? <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            : <>
                <button className="btn btn-ghost" onClick={() => setStep("choose")}>{Di.back} Back</button>
                <button className="btn btn-secondary" onClick={() => save(false)}>Save as Draft</button>
                <button className="btn btn-primary"   onClick={() => save(true)}>{Di.send} Save and Send for Signing</button>
              </>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE BUILDER MODAL
// ─────────────────────────────────────────────────────────────────────────────
function TemplateBuilderModal({ existing, onSave, onClose }) {
  const blank   = { id:uid(), name:"New Template", type:"custom", description:"", color:"#5ba3f5", fields:[] };
  const [tmpl,    setTmpl]    = useState(existing ? JSON.parse(JSON.stringify(existing)) : blank);
  const [selFld,  setSelFld]  = useState(null);
  const [addMode, setAddMode] = useState(null);
  const cvRef = useRef();

  const FIELD_TYPES = [
    { type:"signature", label:"Signature",   icon:Di.pen,      color:"var(--acc)"    },
    { type:"initials",  label:"Initials",    icon:Di.initials, color:"var(--blue)"   },
    { type:"text",      label:"Text Field",  icon:Di.text,     color:"var(--t2)"     },
    { type:"date",      label:"Date Field",  icon:Di.calendar, color:"var(--purple)" },
    { type:"checkbox",  label:"Checkbox",    icon:Di.checkbox, color:"var(--green)"  },
    { type:"heading",   label:"Heading",     icon:Di.heading,  color:"var(--t1)"     },
    { type:"paragraph", label:"Body Text",   icon:Di.para,     color:"var(--t2)"     },
  ];

  const DEFAULTS = { signature:{w:36,h:10}, initials:{w:16,h:10}, text:{w:40,h:5}, date:{w:22,h:5}, checkbox:{w:3,h:3}, heading:{w:84,h:5}, paragraph:{w:88,h:20} };

  const placeField = e => {
    if (!addMode||!cvRef.current) return;
    const r = cvRef.current.getBoundingClientRect();
    const x = ((e.clientX-r.left)/r.width*100).toFixed(1);
    const y = ((e.clientY-r.top)/r.height*100).toFixed(1);
    const d = DEFAULTS[addMode]||{w:30,h:8};
    const f = { id:uid(), type:addMode, label:addMode==="signature"?"Signature":addMode==="initials"?"Initials":addMode==="heading"?"DOCUMENT TITLE":addMode==="paragraph"?"Paragraph text":"Field", content:"", x:parseFloat(x), y:parseFloat(y), ...d, autoFill:null, signerIdx:(addMode==="signature"||addMode==="initials")?0:null };
    setTmpl(t => ({ ...t, fields:[...t.fields,f] }));
    setAddMode(null); setSelFld(f.id);
  };

  const upd = (id, patch) => setTmpl(t => ({ ...t, fields:t.fields.map(f => f.id===id?{...f,...patch}:f) }));
  const del = id => { setTmpl(t => ({ ...t, fields:t.fields.filter(f=>f.id!==id) })); setSelFld(null); };

  const save = () => {
    const all = loadTemplates();
    const idx = all.findIndex(t => t.id===tmpl.id);
    if (idx>=0) all[idx]=tmpl; else all.push(tmpl);
    saveTemplates(all); onSave(tmpl); onClose();
  };

  const sf = tmpl.fields.find(f => f.id===selFld);

  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg anim" style={{ maxWidth:960, width:"96vw", maxHeight:"95vh", display:"flex", flexDirection:"column" }}>
        <div className="modal-hd">
          <input value={tmpl.name} onChange={e => setTmpl(t => ({...t,name:e.target.value}))}
            style={{ fontWeight:800, fontSize:14, background:"none", border:"none", color:"var(--t1)", fontFamily:"var(--ui)", outline:"none", flex:1 }}/>
          <div style={{ display:"flex", gap:7 }}>
            <button className="btn btn-ghost btn-xs" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-xs" onClick={save}>Save Template</button>
          </div>
        </div>

        <div style={{ display:"flex", overflow:"hidden", flex:1, minHeight:0 }}>
          {/* Sidebar */}
          <div style={{ width:190, flexShrink:0, borderRight:"1px solid var(--br)", padding:"14px 11px", overflowY:"auto", background:"var(--s1)", display:"flex", flexDirection:"column", gap:4 }}>
            <label className="lbl" style={{ marginBottom:6 }}>Field Types</label>
            {FIELD_TYPES.map(ft => (
              <button key={ft.type} onClick={() => setAddMode(addMode===ft.type?null:ft.type)}
                style={{ width:"100%", background:addMode===ft.type?"var(--acc-lo)":"var(--s3)", border:`1px solid ${addMode===ft.type?"var(--acc)":"var(--br)"}`, borderRadius:8, padding:"8px 10px", cursor:"pointer", display:"flex", alignItems:"center", gap:8, textAlign:"left", fontFamily:"var(--ui)", transition:"all .12s", color:addMode===ft.type?"var(--acc)":"var(--t2)" }}>
                <span style={{ color:addMode===ft.type?"var(--acc)":ft.color, flexShrink:0 }}>{ft.icon}</span>
                <span style={{ fontSize:11 }}>{ft.label}</span>
              </button>
            ))}
            {addMode && (
              <div style={{ marginTop:8, padding:"7px 9px", background:"rgba(232,156,24,.07)", border:"1px solid rgba(232,156,24,.2)", borderRadius:6, fontSize:10, color:"var(--amber)", lineHeight:1.5 }}>
                Click on the canvas to place the field
              </div>
            )}

            {sf && (
              <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ height:1, background:"var(--br)" }}/>
                <div className="sec" style={{ margin:0 }}>Field Settings</div>
                <div><label className="lbl">Label</label><input className="inp" value={sf.label||""} onChange={e => upd(sf.id,{label:e.target.value})} style={{ fontSize:11 }}/></div>
                {(sf.type==="heading"||sf.type==="paragraph") && (
                  <div><label className="lbl">Content</label><textarea className="txa" value={sf.content||""} onChange={e => upd(sf.id,{content:e.target.value})} style={{ minHeight:70, fontSize:10 }}/></div>
                )}
                {(sf.type==="signature"||sf.type==="initials") && (
                  <div><label className="lbl">Signer</label>
                    <select className="sel" value={sf.signerIdx??0} onChange={e => upd(sf.id,{signerIdx:parseInt(e.target.value)})} style={{ fontSize:11 }}>
                      {[0,1,2,3].map(i => <option key={i} value={i}>Signer {i+1}</option>)}
                    </select>
                  </div>
                )}
                {sf.type==="text" && (
                  <div><label className="lbl">Auto-Fill Token</label>
                    <select className="sel" value={sf.autoFill||""} onChange={e => upd(sf.id,{autoFill:e.target.value||null})} style={{ fontSize:10 }}>
                      <option value="">None</option>
                      {Object.keys(TOKENS).map(k => <option key={k} value={k}>{`{{${k}}}`}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
                  {[["x","X %"],["y","Y %"],["w","W %"],["h","H %"]].map(([k,l]) => (
                    <div key={k}><label className="lbl">{l}</label><input type="number" className="inp" value={sf[k]||0} onChange={e => upd(sf.id,{[k]:parseFloat(e.target.value)||0})} style={{ fontSize:10 }}/></div>
                  ))}
                </div>
                <button className="btn btn-ghost btn-xs" style={{ color:"var(--acc)" }} onClick={() => del(sf.id)}>{Di.trash} Remove Field</button>
              </div>
            )}
          </div>

          {/* Canvas */}
          <div style={{ flex:1, overflow:"auto", padding:20, background:"#c8cbd4", display:"flex", justifyContent:"center" }}>
            <div ref={cvRef} style={{ position:"relative", width:560, flexShrink:0, cursor:addMode?"crosshair":"default" }} onClick={placeField}>
              <DocPage template={tmpl} values={{}} width={560}/>
              {tmpl.fields.map(f => {
                const W = 560, H = 560*(1100/850);
                return (
                  <div key={f.id} onClick={e => { e.stopPropagation(); setSelFld(f.id); }}
                    style={{ position:"absolute", left:(f.x/100)*W, top:(f.y/100)*H, width:(f.w/100)*W, height:(f.h/100)*H, zIndex:10, outline:selFld===f.id?"2px solid var(--blue)":"1.5px dashed rgba(91,163,245,.5)", background:selFld===f.id?"rgba(91,163,245,.08)":"transparent", borderRadius:3, cursor:"pointer", boxSizing:"border-box" }}>
                    <div style={{ position:"absolute", top:-14, left:0, fontSize:8, background:"rgba(59,130,246,.92)", color:"#fff", borderRadius:3, padding:"1px 5px", whiteSpace:"nowrap", fontFamily:"var(--mono)", lineHeight:1.5 }}>
                      {f.type}{f.signerIdx!=null?` · signer ${f.signerIdx+1}`:""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW MODAL
// ─────────────────────────────────────────────────────────────────────────────
function PreviewModal({ doc, onClose }) {
  const allTemplates = [...DEFAULT_TEMPLATES, ...loadTemplates()];
  const template     = allTemplates.find(t => t.id===doc.templateId) || null;
  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"var(--s1)", borderRadius:14, padding:20, maxWidth:820, width:"96vw", maxHeight:"92vh", overflow:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div>
            <div style={{ fontWeight:700, color:"var(--t1)", fontSize:14 }}>{doc.name}</div>
            <div className="mono" style={{ fontSize:9, color:"var(--t3)", marginTop:2 }}>
              CREATED {new Date(doc.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}).toUpperCase()}
            </div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{Di.close}</button>
        </div>
        <div style={{ overflowX:"auto" }}>
          <DocPage template={template} values={doc.values||{}} width={740}/>
        </div>
        {doc.signers?.some(s => s.status==="signed") && (
          <div style={{ marginTop:16 }}>
            <div className="sec" style={{ marginBottom:9 }}>Signature Audit Trail</div>
            {doc.signers.filter(s => s.status==="signed").map((s,i) => (
              <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"10px 13px", borderBottom:"1px solid var(--br)" }}>
                <span style={{ color:"var(--green)", flexShrink:0, marginTop:1 }}>{Di.check}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:12, color:"var(--t1)" }}>{s.name} <span style={{ fontWeight:400, color:"var(--t3)" }}>({s.role})</span></div>
                  <div className="mono" style={{ fontSize:9, color:"var(--t3)", marginTop:2 }}>
                    SIGNED {s.signedAt ? new Date(s.signedAt).toLocaleString("en-US") : ""}
                    {s.lat&&s.lat!=="unavailable" && <span style={{ marginLeft:10, color:"var(--blue)" }}>{Di.pin} {s.lat}, {s.lng}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT TEMPLATE CENTER  (for AdvToolsPanel)
// ─────────────────────────────────────────────────────────────────────────────
export function DocumentTemplateCenter({ onClose }) {
  const [templates,   setTemplates]   = useState([...DEFAULT_TEMPLATES, ...loadTemplates()]);
  const [editTmpl,    setEditTmpl]    = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);

  const reload = () => setTemplates([...DEFAULT_TEMPLATES, ...loadTemplates()]);

  const deleteCustom = id => {
    if (!window.confirm("Delete this template?")) return;
    saveTemplates(loadTemplates().filter(t => t.id!==id));
    reload();
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {showBuilder && (
        <TemplateBuilderModal existing={editTmpl} onSave={reload} onClose={() => { setShowBuilder(false); setEditTmpl(null); reload(); }}/>
      )}

      <div style={{ padding:"15px 18px", borderBottom:"1px solid var(--br)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:14, color:"var(--t1)" }}>Document Templates</div>
          <div className="mono" style={{ fontSize:9, color:"var(--t3)", marginTop:1 }}>CREATE AND MANAGE REUSABLE TEMPLATES</div>
        </div>
        <div style={{ display:"flex", gap:7 }}>
          {onClose && <button className="btn btn-ghost btn-xs" onClick={onClose}>{Di.close}</button>}
          <button className="btn btn-primary btn-xs" onClick={() => { setEditTmpl(null); setShowBuilder(true); }}>
            {Di.plus} New Template
          </button>
        </div>
      </div>

      <div className="scroll">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:10, padding:18 }}>
          {templates.map(t => {
            const isDefault = DEFAULT_TEMPLATES.some(d => d.id===t.id);
            return (
              <div key={t.id} className="card" style={{ padding:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:`${t.color||"var(--blue)"}18`, color:t.color||"var(--blue)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {Di.doc}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:12, color:"var(--t1)" }}>{t.name}</div>
                    {t.description && <div style={{ fontSize:10, color:"var(--t3)", marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.description}</div>}
                  </div>
                </div>
                <div style={{ display:"flex", gap:5, marginBottom:10, flexWrap:"wrap" }}>
                  <span className="mono" style={{ fontSize:9, background:"rgba(91,163,245,.1)", color:"var(--blue)", borderRadius:20, padding:"2px 9px" }}>{t.fields?.length||0} FIELDS</span>
                  {isDefault && <span className="mono" style={{ fontSize:9, background:"rgba(26,217,138,.1)", color:"var(--green)", borderRadius:20, padding:"2px 9px" }}>BUILT-IN</span>}
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button className="btn btn-secondary btn-xs" style={{ flex:1 }} onClick={() => { setEditTmpl(t); setShowBuilder(true); }}>
                    {Di.eye} {isDefault?"Preview":"Edit"}
                  </button>
                  {!isDefault && (
                    <button className="btn btn-ghost btn-xs" style={{ color:"var(--acc)" }} onClick={() => deleteCustom(t.id)}>{Di.trash}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGO UPLOAD SECTION  (for GeneralSettingsTab)
// ─────────────────────────────────────────────────────────────────────────────
export function LogoUploadSection({ coInfo, setCoInfo }) {
  const fileRef  = useRef();
  const [saved, setSaved] = useState(false);

  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2*1024*1024) { alert("Logo must be under 2MB."); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const updated = { ...coInfo, logo:ev.target.result };
      setCoInfo(updated); saveCoInfo(updated);
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeLogo = () => { const u = { ...coInfo, logo:"" }; setCoInfo(u); saveCoInfo(u); };

  return (
    <div style={{ marginBottom:16, padding:"14px 16px", background:"var(--s3)", borderRadius:9, border:"1px solid var(--br)" }}>
      <div style={{ fontWeight:700, fontSize:12, color:"var(--t1)", marginBottom:2 }}>Company Logo</div>
      <div style={{ fontSize:11, color:"var(--t3)", marginBottom:12, lineHeight:1.6 }}>
        Your logo appears at the top of every generated document. PNG recommended for best print quality.
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:90, height:56, borderRadius:7, border:`1.5px dashed ${coInfo?.logo?"var(--green)":"var(--br)"}`, background:"var(--s2)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
          {coInfo?.logo
            ? <img src={coInfo.logo} alt="Company logo" style={{ width:"100%", height:"100%", objectFit:"contain", padding:4 }}/>
            : <div style={{ fontSize:10, color:"var(--t3)", textAlign:"center", lineHeight:1.5 }}>No logo<br/>uploaded</div>}
        </div>
        <div>
          <div style={{ display:"flex", gap:7, marginBottom:6 }}>
            <button className="btn btn-secondary btn-xs" onClick={() => fileRef.current?.click()}>{Di.upload} Upload Logo</button>
            {coInfo?.logo && <button className="btn btn-ghost btn-xs" style={{ color:"var(--acc)" }} onClick={removeLogo}>Remove</button>}
            {saved && <span style={{ fontSize:11, color:"var(--green)", fontWeight:600, alignSelf:"center" }}>Saved</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" style={{ display:"none" }} onChange={handleFile}/>
          <div style={{ fontSize:10, color:"var(--t3)" }}>PNG, JPG or SVG · Max 2 MB · Recommended 400 x 160 px</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS TAB  (main export — replaces the 23-line stub)
// ─────────────────────────────────────────────────────────────────────────────
export function DocumentsTab({ proj, docs:docsIn, setDocs:setDocsIn }) {
  const [localDocs, setLocalDocs] = useState(() =>
    loadAllDocs().filter(d => d.projectId===(proj?.id||null))
  );

  const allDocs = docsIn || localDocs;

  const pushDoc = updated => {
    const all  = loadAllDocs();
    const idx  = all.findIndex(d => d.id===updated.id);
    if (idx>=0) all[idx]=updated; else all.push(updated);
    saveAllDocs(all);
    const projDocs = all.filter(d => d.projectId===(proj?.id||null));
    setLocalDocs(projDocs);
    if (setDocsIn) setDocsIn(projDocs);
  };

  const [showCompose, setShowCompose] = useState(false);
  const [startTmpl,   setStartTmpl]  = useState(null);
  const [signing,     setSigning]    = useState(null);
  const [sendModal,   setSendModal]  = useState(null);
  const [preview,     setPreview]    = useState(null);
  const [filter,      setFilter]     = useState("all");

  const filtered = filter==="all" ? allDocs : allDocs.filter(d => getDocStatus(d)===filter);

  const deleteDoc = id => {
    if (!window.confirm("Delete this document?")) return;
    const all      = loadAllDocs().filter(d => d.id!==id);
    saveAllDocs(all);
    const projDocs = all.filter(d => d.projectId===(proj?.id||null));
    setLocalDocs(projDocs);
    if (setDocsIn) setDocsIn(projDocs);
  };

  const voidDoc = id => pushDoc({ ...allDocs.find(d => d.id===id), status:"void" });

  const handleSignComplete = (docId, signerIdx, result) => {
    const doc     = allDocs.find(d => d.id===docId);
    if (!doc) return;
    const signers = doc.signers.map((s,i) => i===signerIdx ? { ...s, status:"signed", signedAt:result.signedAt, lat:result.geo?.lat, lng:result.geo?.lng } : s);
    const done    = signers.every(s => s.status==="signed");
    pushDoc({ ...doc, values:result.values, signers, status:done?"completed":"pending", ...(done?{completedAt:new Date().toISOString()}:{}) });
    setSigning(null);
  };

  const FILTERS = [
    {key:"all",label:"All"},{key:"draft",label:"Drafts"},{key:"pending",label:"Pending"},
    {key:"partial",label:"Partially Signed"},{key:"completed",label:"Fully Executed"},
  ];

  return (
    <div className="scroll">
      {showCompose && <DocComposerModal proj={proj} startTemplate={startTmpl} onSave={pushDoc} onClose={() => { setShowCompose(false); setStartTmpl(null); }}/>}
      {signing    && <SigningModal doc={signing.doc} signerIdx={signing.idx} onComplete={r => handleSignComplete(signing.doc.id, signing.idx, r)} onClose={() => setSigning(null)}/>}
      {sendModal  && <SendRemoteModal doc={sendModal} onSend={() => pushDoc({ ...sendModal, status:"pending" })} onClose={() => setSendModal(null)}/>}
      {preview    && <PreviewModal doc={preview} onClose={() => setPreview(null)}/>}

      <div style={{ maxWidth:900, margin:"0 auto" }}>

        {/* Top bar */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:13 }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div className="sec" style={{ margin:0 }}>Documents</div>
            {allDocs.length>0 && <span className="mono" style={{ fontSize:9, color:"var(--t3)" }}>{allDocs.length}</span>}
          </div>
          <button className="btn btn-primary btn-xs" onClick={() => { setStartTmpl(null); setShowCompose(true); }}>
            {Di.plus} New Document
          </button>
        </div>

        {/* Filter chips */}
        {allDocs.length>1 && (
          <div style={{ display:"flex", gap:5, marginBottom:13, flexWrap:"wrap" }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} className={`chip${filter===f.key?" on":""}`}>{f.label}</button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {allDocs.length===0 && (
          <div className="empty">
            <div style={{ color:"var(--t3)", display:"flex", justifyContent:"center" }}>{Di.doc}</div>
            <div style={{ fontWeight:700, fontSize:14, color:"var(--t1)" }}>No documents yet</div>
            <div style={{ fontSize:11, color:"var(--t3)", maxWidth:340, lineHeight:1.65, textAlign:"center" }}>
              Create contracts, work authorizations, and change orders with built-in e-signatures and GPS capture.
            </div>
            <div style={{ display:"flex", gap:7, flexWrap:"wrap", justifyContent:"center", marginTop:6 }}>
              {DEFAULT_TEMPLATES.map(t => (
                <button key={t.id} className="btn btn-secondary btn-xs" onClick={() => { setStartTmpl(t); setShowCompose(true); }}>{t.name}</button>
              ))}
            </div>
          </div>
        )}

        {/* Document rows */}
        {filtered.map(doc => {
          const st    = getDocStatus(doc);
          const meta  = STATUS_META[st]||STATUS_META.draft;
          const tmpl  = [...DEFAULT_TEMPLATES,...loadTemplates()].find(t => t.id===doc.templateId);
          const signed = doc.signers?.filter(s=>s.status==="signed").length||0;
          const total  = doc.signers?.length||0;

          return (
            <div key={doc.id} className="row" style={{ marginBottom:6, padding:0, overflow:"hidden" }}>
              <div style={{ display:"flex", alignItems:"center", gap:11, padding:"11px 13px" }}>
                {/* Icon */}
                <div style={{ width:34, height:34, borderRadius:8, flexShrink:0, background:`${tmpl?.color||meta.color}18`, color:tmpl?.color||meta.color, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {Di.doc}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:700, fontSize:12, color:"var(--t1)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{doc.name}</span>
                    <span className="mono" style={{ fontSize:9, background:meta.bg, color:meta.color, borderRadius:20, padding:"2px 9px", flexShrink:0 }}>
                      <span style={{ width:5, height:5, borderRadius:"50%", background:meta.color, display:"inline-block", marginRight:4 }}/>
                      {meta.label.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize:10, color:"var(--t3)", marginTop:3, display:"flex", gap:10, flexWrap:"wrap" }}>
                    <span>{new Date(doc.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
                    {total>0 && <span>Signatures: <strong style={{ color:signed===total?"var(--green)":signed>0?"var(--amber)":"var(--t2)" }}>{signed}/{total}</strong></span>}
                    {doc.completedAt && <span style={{ color:"var(--green)" }}>Executed {new Date(doc.completedAt).toLocaleDateString("en-US")}</span>}
                  </div>
                </div>

                {/* Signer avatars */}
                {doc.signers?.length>0 && (
                  <div style={{ display:"flex", gap:3, flexShrink:0 }}>
                    {doc.signers.map((s,i) => (
                      <div key={i} title={`${s.name}: ${s.status}`} style={{ width:24, height:24, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, flexShrink:0, background:s.status==="signed"?"rgba(26,217,138,.15)":"rgba(232,156,24,.12)", color:s.status==="signed"?"var(--green)":"var(--amber)", border:`1.5px solid ${s.status==="signed"?"rgba(26,217,138,.4)":"rgba(232,156,24,.3)"}` }}>
                        {(s.name||"?")[0].toUpperCase()}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                  <button className="btn btn-ghost btn-xs" title="Preview" onClick={() => setPreview(doc)}>{Di.eye}</button>
                  {st!=="void"&&st!=="completed"&&total>0 && (
                    <button className="btn btn-secondary btn-xs" onClick={() => setSigning({ doc, idx:0 })}>{Di.sign} Sign</button>
                  )}
                  {st!=="void"&&total>0&&signed<total && (
                    <button className="btn btn-ghost btn-xs" style={{ color:"var(--blue)" }} onClick={() => setSendModal(doc)}>{Di.send} Send</button>
                  )}
                  {st==="draft" && <button className="btn btn-ghost btn-xs" style={{ color:"var(--t3)" }} onClick={() => voidDoc(doc.id)}>Void</button>}
                  <button className="btn btn-ghost btn-xs" style={{ color:"var(--acc)" }} title="Delete" onClick={() => deleteDoc(doc.id)}>{Di.trash}</button>
                </div>
              </div>

              {/* Per-signer status bar (partial docs) */}
              {st==="partial" && doc.signers?.map((s,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 13px", borderTop:"1px solid var(--br)", background:s.status==="signed"?"rgba(26,217,138,.03)":"rgba(232,156,24,.03)" }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:s.status==="signed"?"var(--green)":"var(--amber)", flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:"var(--t2)", flex:1 }}>
                    {s.name||`Signer ${i+1}`}
                    <span style={{ color:"var(--t3)", marginLeft:5 }}>({s.role})</span>
                  </span>
                  {s.status==="signed"
                    ? <div className="mono" style={{ fontSize:9, color:"var(--green)", display:"flex", alignItems:"center", gap:6 }}>
                        {Di.check} SIGNED {s.signedAt?new Date(s.signedAt).toLocaleDateString("en-US"):""}
                        {s.lat&&s.lat!=="unavailable" && <span style={{ color:"var(--blue)", marginLeft:6 }}>{Di.pin} {s.lat}, {s.lng}</span>}
                      </div>
                    : <div style={{ display:"flex", gap:5 }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => setSigning({ doc, idx:i })}>Sign Now</button>
                        <button className="btn btn-ghost btn-xs" onClick={() => setSendModal(doc)}>Resend Link</button>
                      </div>}
                </div>
              ))}
            </div>
          );
        })}

        {/* Info banner */}
        {allDocs.length>0 && (
          <div style={{ marginTop:18, padding:"11px 14px", background:"rgba(91,163,245,.05)", border:"1px solid rgba(91,163,245,.16)", borderRadius:8, display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ color:"var(--blue)", flexShrink:0, marginTop:1 }}>{Di.info}</span>
            <div style={{ fontSize:11, color:"var(--t2)", lineHeight:1.7 }}>
              <strong style={{ color:"var(--blue)" }}>Signing Options —</strong> Use <strong>Sign</strong> for in-person tablet signing. Use <strong>Send</strong> to deliver a secure link via email or SMS. All signatures record date, time, and GPS coordinates.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentsTab;
