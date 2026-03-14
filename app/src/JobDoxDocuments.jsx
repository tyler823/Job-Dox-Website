/**
 * JobDoxDocuments.jsx  v3  — PDF-overlay DocuSign-style document module
 * Drop into app/src/ alongside JobDoxPortal.jsx
 *
 * EXPORTS
 *   DocumentsTab            — replaces stub in JobDoxPortal.jsx
 *   LogoUploadSection       — add to GeneralSettingsTab company section
 *   DocumentTemplateCenter  — add to AdvToolsPanel
 */

import { useState, useRef, useEffect } from "react";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getApps } from "firebase/app";

const _docsDb = getApps().length > 0 ? getFirestore(getApps()[0]) : null;
let _docsCompanyId = null;
export function setDocsCompanyId(cid) { _docsCompanyId = cid; }

// ─── Storage (localStorage cache + Firestore persistence) ─────────────────────
const LS_TMPL = "jd_doc_templates";
const LS_DOCS = "jd_documents";
const LS_CO   = "jd_company_info";
const loadTemplates = () => { try { return JSON.parse(localStorage.getItem(LS_TMPL)) || []; } catch { return []; } };
const saveTemplates = v  => {
  try { localStorage.setItem(LS_TMPL, JSON.stringify(v)); } catch {}
  if (_docsDb && _docsCompanyId) { setDoc(doc(_docsDb, "companies", _docsCompanyId, "settings", "docTemplates"), { data: JSON.parse(JSON.stringify(v)), updatedAt: serverTimestamp() }, { merge: true }).catch(() => {}); }
};
const loadAllDocs   = () => { try { return JSON.parse(localStorage.getItem(LS_DOCS)) || []; } catch { return []; } };
const saveAllDocs   = v  => {
  try { localStorage.setItem(LS_DOCS, JSON.stringify(v)); } catch {}
  if (_docsDb && _docsCompanyId) { setDoc(doc(_docsDb, "companies", _docsCompanyId, "settings", "documents"), { data: JSON.parse(JSON.stringify(v)), updatedAt: serverTimestamp() }, { merge: true }).catch(() => {}); }
};
const loadCoInfo    = () => { try { return JSON.parse(localStorage.getItem(LS_CO))   || {}; } catch { return {}; } };
const saveCoInfo    = v  => {
  try { localStorage.setItem(LS_CO, JSON.stringify(v)); } catch {}
  if (_docsDb && _docsCompanyId) { setDoc(doc(_docsDb, "companies", _docsCompanyId, "settings", "companyInfo"), { data: JSON.parse(JSON.stringify(v)), updatedAt: serverTimestamp() }, { merge: true }).catch(() => {}); }
};

let _c = 9000;
const uid = () => `jd-${++_c}-${Math.random().toString(36).slice(2,6)}`;

// ─── PDF.js (loaded from CDN on first use) ────────────────────────────────────
const PDFJS_VER = "3.11.174";
let _pdfJsPromise = null;
const loadPdfJs = () => {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (_pdfJsPromise)   return _pdfJsPromise;
  _pdfJsPromise = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VER}/pdf.min.js`;
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VER}/pdf.worker.min.js`;
      res(window.pdfjsLib);
    };
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return _pdfJsPromise;
};

const getPdfPageCount = async (b64) => {
  const lib  = await loadPdfJs();
  const bin  = atob(b64.split(",")[1]);
  const buf  = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const pdf  = await lib.getDocument({ data: buf }).promise;
  return pdf.numPages;
};

// ─── SVG icons (matches portal Ic pattern) ────────────────────────────────────
const Di = {
  doc:      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>,
  pen:      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>,
  initials: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/></svg>,
  send:     <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>,
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
  template: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H5v-4h7v4zm7 0h-5v-4h5v4zm0-6H5V5h14v6z"/></svg>,
  warn:     <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>,
  info:     <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>,
  calendar: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg>,
  text:     <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/></svg>,
  checkbox: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.11 0-2 .89-2 2v14c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>,
  chev_r:   <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>,
  move:     <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/></svg>,
  phone:    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>,
};

const FIELD_ICONS = { signature: Di.pen, initials: Di.initials, text: Di.text, date: Di.calendar, checkbox: Di.checkbox };
const FIELD_COLORS = { signature:"var(--acc)", initials:"var(--blue)", text:"var(--green)", date:"var(--purple)", checkbox:"var(--amber)" };
const FIELD_DEFAULTS = { signature:{w:.36,h:.075}, initials:{w:.15,h:.075}, text:{w:.35,h:.04}, date:{w:.2,h:.04}, checkbox:{w:.025,h:.03} };

// ─── Auto-fill tokens ─────────────────────────────────────────────────────────
const TOKENS = {
  "project.name":        p    => p.name            || "",
  "project.date":        ()   => new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}),
  "project.address":     p    => p.address          || "",
  "project.clientName":  p    => p.clientName || p.client       || "",
  "project.clientPhone": p    => p.clientPhone || p.phone       || "",
  "project.workType":    p    => Array.isArray(p.worktypes) ? p.worktypes.map(w=>w.type||w).join(", ") : (p.type||""),
  "project.claimNumber": p    => p.claimNumber || p.claim       || "",
  "project.insuranceCo": p    => p.insuranceCo || p.carrier     || "",
  "company.name":        (_,c)=> c.name             || "",
  "company.phone":       (_,c)=> c.phone            || "",
  "company.email":       (_,c)=> c.email            || "",
  "company.address":     (_,c)=> [c.address,c.city,c.state,c.zip].filter(Boolean).join(", ") || "",
};

// ─── Status meta ──────────────────────────────────────────────────────────────
const STATUS_META = {
  draft:     { label:"Draft",               color:"var(--t3)",    bg:"rgba(128,128,128,.1)"  },
  pending:   { label:"Awaiting Signatures", color:"var(--amber)", bg:"rgba(232,156,24,.1)"   },
  partial:   { label:"Partially Signed",    color:"var(--blue)",  bg:"rgba(91,163,245,.1)"   },
  completed: { label:"Fully Executed",      color:"var(--green)", bg:"rgba(26,217,138,.1)"   },
  void:      { label:"Void",                color:"var(--acc)",   bg:"rgba(228,53,49,.08)"   },
};

const getDocStatus = doc => {
  if (doc.status === "void") return "void";
  if (!doc.signers?.length)  return "draft";
  const signed = doc.signers.filter(s => s.status === "signed").length;
  if (signed === 0)                return "pending";
  if (signed < doc.signers.length) return "partial";
  return "completed";
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spin = ({ size=12, color="var(--t3)" }) => (
  <div style={{ width:size, height:size, border:`2px solid ${color}44`, borderTopColor:color, borderRadius:"50%", animation:"jd-spin .7s linear infinite", display:"inline-block", flexShrink:0 }}/>
);

// ─────────────────────────────────────────────────────────────────────────────
// PDF PAGE CANVAS — renders one page of a PDF to a <canvas>
// ─────────────────────────────────────────────────────────────────────────────
function PdfPageCanvas({ pdfData, pageNum=1, width=700, onDims }) {
  const cvRef   = useRef();
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);

  useEffect(() => {
    if (!pdfData) return;
    let dead = false;
    setLoading(true); setErr(null);
    (async () => {
      try {
        const lib = await loadPdfJs();
        if (dead) return;
        const bin = atob(pdfData.split(",")[1]);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        const pdf  = await lib.getDocument({ data: buf }).promise;
        if (dead) return;
        const page = await pdf.getPage(pageNum);
        if (dead) return;
        const vp   = page.getViewport({ scale: 1 });
        const sc   = width / vp.width;
        const svp  = page.getViewport({ scale: sc });
        const cv   = cvRef.current;
        if (!cv) return;
        cv.width  = svp.width;
        cv.height = svp.height;
        await page.render({ canvasContext: cv.getContext("2d"), viewport: svp }).promise;
        if (!dead) { setLoading(false); if (onDims) onDims({ w: svp.width, h: svp.height }); }
      } catch (e) { if (!dead) { setLoading(false); setErr("PDF render failed"); } }
    })();
    return () => { dead = true; };
  }, [pdfData, pageNum, width]);

  return (
    <div style={{ position:"relative", display:"inline-block", minHeight:40 }}>
      <canvas ref={cvRef} style={{ display:"block" }}/>
      {loading && (
        <div style={{ position:"absolute", inset:0, background:"var(--s3)", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:3 }}>
          <Spin size={20} color="var(--t2)"/>
        </div>
      )}
      {err && (
        <div style={{ position:"absolute", inset:0, background:"var(--s3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"var(--acc)" }}>
          {err}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY HEADER — logo + name + address + contact above PDF pages
// ─────────────────────────────────────────────────────────────────────────────
function CompanyHeader({ width = 700 }) {
  const co = loadCoInfo();
  const hasInfo = co.name || co.logo || co.address || co.phone || co.email;
  if (!hasInfo) return null;

  const addressLine = [co.address, co.city, co.state, co.zip].filter(Boolean).join(", ");

  return (
    <div style={{
      width, background:"#fff", borderRadius:"3px 3px 0 0", padding:"16px 24px",
      display:"flex", alignItems:"center", gap:18,
      borderBottom:"2px solid #e2e5ea", boxSizing:"border-box",
      fontFamily:"'Segoe UI', Helvetica, Arial, sans-serif",
    }}>
      {co.logo && (
        <img src={co.logo} alt="Company logo"
          style={{ height:52, maxWidth:120, objectFit:"contain", flexShrink:0 }}/>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        {co.name && (
          <div style={{ fontWeight:700, fontSize:15, color:"#0d1117", lineHeight:1.3, marginBottom:2 }}>
            {co.name}
          </div>
        )}
        {addressLine && (
          <div style={{ fontSize:11, color:"#57606a", lineHeight:1.5 }}>
            {addressLine}
          </div>
        )}
        <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginTop:2 }}>
          {co.phone && (
            <span style={{ fontSize:10, color:"#57606a", display:"flex", alignItems:"center", gap:4 }}>
              {Di.phone} {co.phone}
            </span>
          )}
          {co.email && (
            <span style={{ fontSize:10, color:"#57606a", display:"flex", alignItems:"center", gap:4 }}>
              {Di.mail} {co.email}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD BOX — positioned overlay element on top of a PDF page
// ─────────────────────────────────────────────────────────────────────────────
function FieldBox({ field, dims, value, signerIdx, onTap, highlightPending, editorMode, selected, onSelect, onMove }) {
  const left   = field.x * dims.w;
  const top    = field.y * dims.h;
  const fw     = field.w * dims.w;
  const fh     = field.h * dims.h;
  const isMine = signerIdx !== null && field.signerIdx === signerIdx;
  const done   = !!value?.data || !!value?.text || value?.checked;
  const color  = FIELD_COLORS[field.type] || "var(--t2)";
  const pending = isMine && highlightPending && !done;
  const dragging = useRef(false);
  const dragStart = useRef({ mx:0, my:0, ox:0, oy:0 });

  const onDragStart = e => {
    if (!editorMode || !onMove) return;
    e.stopPropagation(); e.preventDefault();
    const ev = e.touches ? e.touches[0] : e;
    dragging.current = true;
    dragStart.current = { mx:ev.clientX, my:ev.clientY, ox:field.x, oy:field.y };
    const onDragMove = me => {
      if (!dragging.current) return;
      const mv = me.touches ? me.touches[0] : me;
      const dx = (mv.clientX - dragStart.current.mx) / dims.w;
      const dy = (mv.clientY - dragStart.current.my) / dims.h;
      const nx = Math.max(0, Math.min(1 - field.w, dragStart.current.ox + dx));
      const ny = Math.max(0, Math.min(1 - field.h, dragStart.current.oy + dy));
      onMove(field.id, { x: nx, y: ny });
    };
    const onDragEnd = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onDragMove);
      window.removeEventListener("mouseup", onDragEnd);
      window.removeEventListener("touchmove", onDragMove);
      window.removeEventListener("touchend", onDragEnd);
    };
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);
    window.addEventListener("touchmove", onDragMove, { passive:false });
    window.addEventListener("touchend", onDragEnd);
  };

  return (
    <div
      onClick={e => { e.stopPropagation(); editorMode ? onSelect?.(field.id) : (isMine && !done && onTap?.(field)); }}
      onMouseDown={editorMode ? onDragStart : undefined}
      onTouchStart={editorMode ? onDragStart : undefined}
      style={{
        position:"absolute", left, top, width:fw, height:fh, boxSizing:"border-box",
        border: done    ? `2px solid ${color}`
              : selected ? `2px solid var(--blue)`
              : `1.5px dashed ${color}${pending?"bb":"66"}`,
        background: selected ? "rgba(91,163,245,.15)"
                  : done     ? `${color}0a`
                  : pending  ? `${color}0d`
                  : `${color}05`,
        borderRadius: field.type==="checkbox" ? 3 : 5,
        display:"flex", alignItems:"center", justifyContent:"center",
        cursor: editorMode ? "grab" : (isMine && !done ? "pointer" : "default"),
        transition: dragging.current ? "none" : "border-color .12s, background .12s",
        ...(pending ? { boxShadow:`0 0 0 3px ${color}25` } : {}),
        overflow:"hidden",
        userSelect: editorMode ? "none" : undefined,
        touchAction: editorMode ? "none" : undefined,
      }}
    >
      {/* Filled state */}
      {done && value?.data && <img src={value.data} alt="" style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain" }}/>}
      {done && value?.text  && (
        <span style={{ fontSize:Math.max(8, fh*.42), color:"#0d1117", fontFamily:field.type==="signature"?"cursive":"var(--mono)", padding:"0 4px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"100%" }}>
          {value.text}
        </span>
      )}
      {done && value?.checked && <svg width="16" height="16" viewBox="0 0 24 24" fill={color}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>}

      {/* Empty state */}
      {!done && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:1, pointerEvents:"none", width:"100%", padding:"0 3px" }}>
          <span style={{ color:`${color}99`, lineHeight:1, display:"flex" }}>{FIELD_ICONS[field.type]}</span>
          {fh > 18 && (
            <span style={{ fontSize:Math.max(7, Math.min(9, fh*.22)), color:`${color}88`, fontFamily:"var(--mono)", textTransform:"uppercase", letterSpacing:".04em", textAlign:"center", lineHeight:1.2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"100%" }}>
              {field.label || field.type}{field.signerIdx!=null ? ` · S${field.signerIdx+1}` : ""}
            </span>
          )}
        </div>
      )}

      {/* Editor label + drag handle */}
      {editorMode && selected && (
        <div style={{ position:"absolute", top:-17, left:0, background:"var(--blue)", color:"#fff", fontSize:8, padding:"1px 6px", borderRadius:"3px 3px 0 0", whiteSpace:"nowrap", fontFamily:"var(--mono)", display:"flex", alignItems:"center", gap:4 }}>
          {Di.move} {field.type}{field.signerIdx!=null?` · signer ${field.signerIdx+1}`:""}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNATURE PAD
// ─────────────────────────────────────────────────────────────────────────────
function SignaturePad({ label="Sign here", height=130, onCapture, onClear }) {
  const cvRef   = useRef();
  const drawing = useRef(false);
  const lastPt  = useRef(null);
  const [hasSig, setHasSig] = useState(false);

  const getXY = (e, cv) => {
    const r = cv.getBoundingClientRect();
    const s = e.touches ? e.touches[0] : e;
    return { x: s.clientX - r.left, y: s.clientY - r.top };
  };

  const onStart = e => {
    e.preventDefault(); drawing.current = true;
    const cv = cvRef.current; const pt = getXY(e, cv); lastPt.current = pt;
    const ctx = cv.getContext("2d");
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 1, 0, Math.PI*2); ctx.fillStyle="#0d1117"; ctx.fill();
  };
  const onMove = e => {
    e.preventDefault(); if (!drawing.current) return;
    const cv = cvRef.current; const pt = getXY(e, cv);
    const ctx = cv.getContext("2d");
    ctx.beginPath(); ctx.moveTo(lastPt.current.x, lastPt.current.y); ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle="#0d1117"; ctx.lineWidth=2; ctx.lineCap="round"; ctx.stroke();
    lastPt.current = pt; setHasSig(true);
  };
  const onEnd = e => {
    e.preventDefault(); if (!drawing.current) return;
    drawing.current = false;
    if (hasSig && onCapture) onCapture(cvRef.current.toDataURL());
  };
  const clear = () => {
    cvRef.current.getContext("2d").clearRect(0, 0, cvRef.current.width, cvRef.current.height);
    setHasSig(false); if (onClear) onClear();
  };
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    cv.width = cv.offsetWidth; cv.height = height;
  }, [height]);

  return (
    <div>
      <label className="lbl">{label}</label>
      <div style={{ border:`1.5px solid ${hasSig?"var(--green)":"var(--br-hi)"}`, borderRadius:7, background:"#fff", position:"relative", height, transition:"border-color .15s" }}>
        <canvas ref={cvRef} style={{ display:"block", width:"100%", height:"100%", touchAction:"none", cursor:"crosshair" }}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}/>
        {!hasSig && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
            <span style={{ fontSize:11, color:"rgba(0,0,0,.3)", fontStyle:"italic", fontFamily:"var(--ui)" }}>Draw with finger or mouse</span>
          </div>
        )}
      </div>
      {hasSig && (
        <button onClick={clear} style={{ marginTop:5, fontSize:10, color:"var(--acc)", background:"none", border:"none", cursor:"pointer", padding:0, fontFamily:"var(--ui)", display:"flex", alignItems:"center", gap:4 }}>
          {Di.close} Clear
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE BUILDER MODAL
// Upload a real PDF, then click to place fields on top of it
// ─────────────────────────────────────────────────────────────────────────────
function TemplateBuilderModal({ existing, onSave, onClose }) {
  const blank = { id:uid(), name:"New Template", description:"", color:"#5ba3f5", pdfData:null, pageCount:1, fields:[] };
  const [tmpl,      setTmpl]    = useState(existing ? JSON.parse(JSON.stringify(existing)) : blank);
  const [selFld,    setSelFld]  = useState(null);
  const [addMode,   setAddMode] = useState(null);
  const [activePage,setActivePage] = useState(1);
  const [dims,      setDims]    = useState({});   // { [pageNum]: { w, h } }
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const wrapRef = useRef();

  const FIELD_TYPES = [
    { type:"signature", label:"Signature",  color:"var(--acc)"    },
    { type:"initials",  label:"Initials",   color:"var(--blue)"   },
    { type:"text",      label:"Text",       color:"var(--green)"  },
    { type:"date",      label:"Date",       color:"var(--purple)" },
    { type:"checkbox",  label:"Checkbox",   color:"var(--amber)"  },
  ];

  const handlePdfUpload = async e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 8*1024*1024) { alert("PDF must be under 8 MB."); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async ev => {
      const b64 = ev.target.result;
      const count = await getPdfPageCount(b64);
      setTmpl(t => ({ ...t, pdfData:b64, pageCount:count, name: t.name==="New Template" ? file.name.replace(".pdf","") : t.name }));
      setDims({});
      setUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCanvasClick = e => {
    if (!addMode || !wrapRef.current) return;
    const r   = wrapRef.current.getBoundingClientRect();
    const pgDims = dims[activePage];
    if (!pgDims) return;
    const x = (e.clientX - r.left) / pgDims.w;
    const y = (e.clientY - r.top)  / pgDims.h;
    const d = FIELD_DEFAULTS[addMode] || { w:.3, h:.05 };
    const f = { id:uid(), type:addMode, label:addMode==="signature"?"Signature":addMode==="initials"?"Initials":addMode==="text"?"Text Field":addMode==="date"?"Date":"Checkbox", page:activePage, x:Math.max(0,Math.min(1-d.w,x)), y:Math.max(0,Math.min(1-d.h,y)), ...d, signerIdx:(addMode==="signature"||addMode==="initials")?0:null, autoFill:null };
    setTmpl(t => ({ ...t, fields:[...t.fields, f] }));
    setSelFld(f.id); setAddMode(null);
  };

  const upd = (id, patch) => setTmpl(t => ({ ...t, fields:t.fields.map(f => f.id===id?{...f,...patch}:f) }));
  const del = id => { setTmpl(t => ({ ...t, fields:t.fields.filter(f=>f.id!==id) })); setSelFld(null); };

  const save = () => {
    if (!tmpl.pdfData) { alert("Please upload a PDF first."); return; }
    const all = loadTemplates();
    const idx = all.findIndex(t => t.id===tmpl.id);
    if (idx>=0) all[idx]=tmpl; else all.push(tmpl);
    saveTemplates(all); onSave(tmpl); onClose();
  };

  const sf = tmpl.fields.find(f => f.id===selFld);
  const pages = Array.from({ length: tmpl.pageCount }, (_, i) => i+1);
  const pageDims = dims[activePage] || { w:600, h:776 };

  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg anim" style={{ maxWidth:1000, width:"97vw", maxHeight:"96vh", display:"flex", flexDirection:"column" }}>
        <div className="modal-hd">
          <input value={tmpl.name} onChange={e => setTmpl(t=>({...t,name:e.target.value}))}
            style={{ fontWeight:800, fontSize:14, background:"none", border:"none", color:"var(--t1)", fontFamily:"var(--ui)", outline:"none", flex:1 }}/>
          <div style={{ display:"flex", gap:7 }}>
            <button className="btn btn-ghost btn-xs" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-xs" onClick={save}>Save Template</button>
          </div>
        </div>

        <div style={{ display:"flex", flex:1, minHeight:0, overflow:"hidden" }}>
          {/* LEFT — field type sidebar */}
          <div style={{ width:184, flexShrink:0, borderRight:"1px solid var(--br)", padding:"14px 11px", overflowY:"auto", background:"var(--s1)", display:"flex", flexDirection:"column", gap:4 }}>

            {/* PDF upload */}
            <div style={{ marginBottom:8 }}>
              <div className="sec" style={{ marginBottom:6 }}>PDF Template</div>
              <button className="btn btn-secondary btn-xs" style={{ width:"100%", justifyContent:"center" }} onClick={() => fileRef.current?.click()}>
                {uploading ? <Spin/> : Di.upload} {tmpl.pdfData ? "Replace PDF" : "Upload PDF"}
              </button>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display:"none" }} onChange={handlePdfUpload}/>
              {tmpl.pdfData && <div className="mono" style={{ fontSize:9, color:"var(--green)", marginTop:5 }}>{tmpl.pageCount} PAGE{tmpl.pageCount!==1?"S":""} LOADED</div>}
            </div>

            <div style={{ height:1, background:"var(--br)", margin:"4px 0" }}/>

            {/* Field types */}
            <div className="sec" style={{ marginBottom:4 }}>Place Fields</div>
            {!tmpl.pdfData && <div style={{ fontSize:10, color:"var(--t3)", lineHeight:1.5 }}>Upload a PDF first, then click to place fields on any page.</div>}
            {FIELD_TYPES.map(ft => (
              <button key={ft.type} onClick={() => tmpl.pdfData && setAddMode(addMode===ft.type?null:ft.type)}
                style={{ width:"100%", background:addMode===ft.type?"var(--acc-lo)":"var(--s3)", border:`1px solid ${addMode===ft.type?"var(--acc)":"var(--br)"}`, borderRadius:8, padding:"7px 10px", cursor:tmpl.pdfData?"pointer":"not-allowed", opacity:tmpl.pdfData?1:.4, display:"flex", alignItems:"center", gap:8, fontFamily:"var(--ui)", transition:"all .12s", color:addMode===ft.type?"var(--acc)":"var(--t2)" }}>
                <span style={{ color:addMode===ft.type?"var(--acc)":ft.color, flexShrink:0 }}>{FIELD_ICONS[ft.type]}</span>
                <span style={{ fontSize:11 }}>{ft.label}</span>
              </button>
            ))}

            {addMode && (
              <div style={{ marginTop:4, padding:"7px 9px", background:"rgba(232,156,24,.07)", border:"1px solid rgba(232,156,24,.2)", borderRadius:6, fontSize:10, color:"var(--amber)", lineHeight:1.5 }}>
                Click anywhere on the PDF to place a {addMode} field
              </div>
            )}

            {/* Field editor */}
            {sf && (
              <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ height:1, background:"var(--br)" }}/>
                <div className="sec" style={{ margin:0 }}>Field Settings</div>
                <div><label className="lbl">Label</label><input className="inp" value={sf.label||""} onChange={e=>upd(sf.id,{label:e.target.value})} style={{ fontSize:11 }}/></div>
                {(sf.type==="signature"||sf.type==="initials") && (
                  <div><label className="lbl">Signer</label>
                    <select className="sel" value={sf.signerIdx??0} onChange={e=>upd(sf.id,{signerIdx:parseInt(e.target.value)})} style={{ fontSize:11 }}>
                      {[0,1,2,3].map(i=><option key={i} value={i}>Signer {i+1}</option>)}
                    </select>
                  </div>
                )}
                {sf.type==="text" && (
                  <div><label className="lbl">Auto-fill from project</label>
                    <select className="sel" value={sf.autoFill||""} onChange={e=>upd(sf.id,{autoFill:e.target.value||null})} style={{ fontSize:10 }}>
                      <option value="">None (manual entry)</option>
                      {Object.keys(TOKENS).map(k=><option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
                  {[["x","X Pos %"],["y","Y Pos %"],["w","Width %"],["h","Height %"]].map(([k,l])=>(
                    <div key={k}><label className="lbl">{l}</label>
                      <input type="number" className="inp" step=".01" min="0" max="1" value={(sf[k]||0).toFixed(3)} onChange={e=>upd(sf.id,{[k]:parseFloat(e.target.value)||0})} style={{ fontSize:10 }}/>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:9, color:"var(--t3)", lineHeight:1.5, display:"flex", alignItems:"center", gap:4 }}>
                  {Di.move} Drag fields to reposition them
                </div>
                <button className="btn btn-ghost btn-xs" style={{ color:"var(--acc)" }} onClick={()=>del(sf.id)}>{Di.trash} Remove Field</button>
              </div>
            )}
          </div>

          {/* CENTER — PDF canvas */}
          <div style={{ flex:1, overflow:"auto", background:"#2a2d3a", padding:24, display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
            {!tmpl.pdfData && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flex:1, gap:12, color:"var(--t3)" }}>
                {Di.doc}
                <div style={{ fontSize:13, fontWeight:600, color:"var(--t2)" }}>No PDF uploaded yet</div>
                <div style={{ fontSize:11, color:"var(--t3)" }}>Upload a PDF from the sidebar to get started</div>
                <button className="btn btn-secondary" onClick={()=>fileRef.current?.click()}>{Di.upload} Upload PDF</button>
              </div>
            )}

            {/* Page tabs */}
            {tmpl.pdfData && tmpl.pageCount > 1 && (
              <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                {pages.map(p=>(
                  <button key={p} onClick={()=>setActivePage(p)} className={`chip${activePage===p?" on":""}`} style={{ fontSize:10 }}>Page {p}</button>
                ))}
              </div>
            )}

            {/* PDF + overlay */}
            {tmpl.pdfData && pages.map(p => (
              <div key={p} style={{ display: activePage===p ? "block" : "none" }}>
                <div ref={activePage===p ? wrapRef : null}
                  style={{ position:"relative", cursor:addMode?"crosshair":"default", display:"inline-block", borderRadius:3, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,.5)" }}
                  onClick={activePage===p ? handleCanvasClick : undefined}>
                  <PdfPageCanvas pdfData={tmpl.pdfData} pageNum={p} width={600} onDims={d=>setDims(prev=>({...prev,[p]:d}))}/>
                  {dims[p] && tmpl.fields.filter(f=>f.page===p).map(f=>(
                    <FieldBox key={f.id} field={f} dims={dims[p]||{w:600,h:776}} value={{}} signerIdx={null}
                      editorMode selected={selFld===f.id} onSelect={setSelFld} onMove={upd}/>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT — template meta */}
          <div style={{ width:160, flexShrink:0, borderLeft:"1px solid var(--br)", padding:"14px 11px", background:"var(--s1)", display:"flex", flexDirection:"column", gap:10 }}>
            <div><label className="lbl">Description</label><textarea className="txa" value={tmpl.description||""} onChange={e=>setTmpl(t=>({...t,description:e.target.value}))} style={{ fontSize:11, minHeight:60 }}/></div>
            <div><label className="lbl">Accent Color</label>
              <input type="color" value={tmpl.color||"#5ba3f5"} onChange={e=>setTmpl(t=>({...t,color:e.target.value}))} style={{ width:"100%", height:34, border:"1px solid var(--br)", borderRadius:7, background:"var(--s3)", cursor:"pointer", padding:2 }}/>
            </div>
            <div style={{ height:1, background:"var(--br)" }}/>
            <div className="mono" style={{ fontSize:9, color:"var(--t3)" }}>
              {tmpl.fields.length} field{tmpl.fields.length!==1?"s":""} placed<br/>
              {[...new Set(tmpl.fields.map(f=>f.signerIdx).filter(x=>x!=null))].length} signer{[...new Set(tmpl.fields.map(f=>f.signerIdx).filter(x=>x!=null))].length!==1?"s":""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOC COMPOSER — choose template, fill signers, create document
// ─────────────────────────────────────────────────────────────────────────────
function DocComposerModal({ proj, onSave, onClose }) {
  const allTemplates = loadTemplates();
  const co = loadCoInfo();

  const [step,    setStep]    = useState(allTemplates.length===0 ? "empty" : "choose");
  const [tmpl,    setTmpl]    = useState(null);
  const [docName, setDocName] = useState("");
  const [signers, setSigners] = useState(() => {
    const s = [];
    if (proj?.clientName||proj?.client) s.push({ id:uid(), name:proj.clientName||proj.client||"", email:proj.clientEmail||"", phone:proj.clientPhone||"", role:"Client", status:"pending" });
    if (co.name) s.push({ id:uid(), name:"", email:co.email||"", phone:co.phone||"", role:"Contractor", status:"pending" });
    return s;
  });

  const selectTemplate = t => {
    setTmpl(t);
    setDocName(`${t.name} — ${proj?.name||""}`);
    setStep("compose");
  };

  const signerIdxs = tmpl ? [...new Set(tmpl.fields.filter(f=>f.signerIdx!=null).map(f=>f.signerIdx))].sort() : [];

  // build auto-fill initial values
  const buildValues = () => {
    const v = {};
    tmpl?.fields?.forEach(f => {
      if (f.type==="text" && f.autoFill && TOKENS[f.autoFill]) v[f.id] = { text: TOKENS[f.autoFill](proj||{}, co) };
    });
    return v;
  };

  const save = (send=false) => {
    const doc = {
      id:uid(), templateId:tmpl.id, name:docName.trim()||"Untitled",
      projectId:proj?.id||null, projectName:proj?.name||"",
      status:send?"pending":"draft", createdAt:new Date().toISOString(),
      values:buildValues(), signers:signers.filter(s=>s.name.trim()),
    };
    const all = loadAllDocs(); saveAllDocs([...all, doc]);
    onSave(doc); onClose();
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg anim" style={{ maxWidth:700 }}>
        <div className="modal-hd">
          <div>
            <div className="modal-ttl">{step==="choose"?"New Document":tmpl?.name||"New Document"}</div>
            {proj?.name && <div className="mono" style={{ fontSize:9, color:"var(--t3)", marginTop:2 }}>{proj.name}</div>}
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{Di.close}</button>
        </div>

        <div className="modal-body">
          {step==="empty" && (
            <div className="empty" style={{ padding:32 }}>
              {Di.template}
              <div style={{ fontWeight:700, fontSize:14, color:"var(--t1)" }}>No templates yet</div>
              <div style={{ fontSize:11, color:"var(--t3)", maxWidth:320, textAlign:"center", lineHeight:1.65 }}>
                Create a template first by going to Advanced Tools → Document Templates, uploading a PDF, and placing signature fields on it.
              </div>
            </div>
          )}

          {step==="choose" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
              {allTemplates.map(t => (
                <button key={t.id} onClick={()=>selectTemplate(t)}
                  style={{ background:"var(--s3)", border:`1px solid var(--br)`, borderRadius:10, padding:14, cursor:"pointer", textAlign:"left", fontFamily:"var(--ui)", transition:"all .12s", display:"flex", flexDirection:"column", gap:6 }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--br-hi)";e.currentTarget.style.background="var(--s4)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--br)";e.currentTarget.style.background="var(--s3)";}}>
                  <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:`${t.color||"var(--blue)"}18`, color:t.color||"var(--blue)", display:"flex", alignItems:"center", justifyContent:"center" }}>{Di.doc}</div>
                    <div style={{ fontWeight:700, fontSize:12, color:"var(--t1)" }}>{t.name}</div>
                  </div>
                  {t.description && <div style={{ fontSize:10, color:"var(--t3)", lineHeight:1.5 }}>{t.description}</div>}
                  <div className="mono" style={{ fontSize:9, color:"var(--t3)" }}>{t.fields?.length||0} FIELDS · {t.pageCount||1} PAGE{(t.pageCount||1)!==1?"S":""}</div>
                </button>
              ))}
            </div>
          )}

          {step==="compose" && tmpl && (
            <>
              <div><label className="lbl">Document Title</label><input className="inp" value={docName} onChange={e=>setDocName(e.target.value)}/></div>
              {signerIdxs.length>0 && (
                <div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:9 }}>
                    <div className="sec" style={{ margin:0 }}>Signers — {signerIdxs.length} signature role{signerIdxs.length!==1?"s":""}</div>
                    <button className="btn btn-ghost btn-xs" onClick={()=>setSigners(s=>[...s,{id:uid(),name:"",email:"",phone:"",role:"",status:"pending"}])}>{Di.plus} Add</button>
                  </div>
                  {signerIdxs.map(idx=>{
                    const s=signers[idx]||{};
                    return (
                      <div key={idx} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 80px", gap:8, marginBottom:8, padding:"11px 12px", background:"var(--s3)", borderRadius:8, border:"1px solid var(--br)" }}>
                        <div><label className="lbl">Name — Signer {idx+1}</label><input className="inp" value={s.name||""} placeholder="Full name" onChange={e=>setSigners(ss=>ss.map((x,i)=>i===idx?{...x,name:e.target.value}:x))} style={{ fontSize:11 }}/></div>
                        <div><label className="lbl">Email</label><input className="inp" type="email" value={s.email||""} onChange={e=>setSigners(ss=>ss.map((x,i)=>i===idx?{...x,email:e.target.value}:x))} style={{ fontSize:11 }}/></div>
                        <div><label className="lbl">Phone</label><input className="inp" type="tel" value={s.phone||""} onChange={e=>setSigners(ss=>ss.map((x,i)=>i===idx?{...x,phone:e.target.value}:x))} style={{ fontSize:11 }}/></div>
                        <div><label className="lbl">Role</label><input className="inp" value={s.role||""} placeholder="Client" onChange={e=>setSigners(ss=>ss.map((x,i)=>i===idx?{...x,role:e.target.value}:x))} style={{ fontSize:11 }}/></div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ padding:"8px 11px", background:"rgba(91,163,245,.06)", border:"1px solid rgba(91,163,245,.18)", borderRadius:6, fontSize:10, color:"var(--blue)", lineHeight:1.6, display:"flex", gap:8, alignItems:"flex-start" }}>
                {Di.info} Each signer can sign in person on a tablet or receive a secure link via email or SMS. GPS coordinates are recorded with every signature.
              </div>
            </>
          )}
        </div>

        <div className="modal-ft">
          {step==="choose"
            ? <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            : <>
                <button className="btn btn-ghost" onClick={()=>setStep("choose")}>{Di.back} Back</button>
                <button className="btn btn-secondary" onClick={()=>save(false)}>Save as Draft</button>
                <button className="btn btn-primary"   onClick={()=>save(true)}>{Di.send} Save &amp; Send for Signing</button>
              </>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IN-PERSON SIGNING MODAL
// ─────────────────────────────────────────────────────────────────────────────
function SigningModal({ doc, signerIdx, onComplete, onClose }) {
  const tmpl     = loadTemplates().find(t => t.id===doc.templateId);
  const signer   = doc.signers?.[signerIdx];
  const myFields = tmpl?.fields?.filter(f=>f.signerIdx===signerIdx) || [];

  const [values,      setValues]   = useState({ ...doc.values });
  const [geo,         setGeo]      = useState(null);
  const [geoLoading,  setGeoLoad]  = useState(false);
  const [activeField, setActive]   = useState(null);
  const [sigData,     setSigData]  = useState(null);
  const [textDraft,   setTextDraft]= useState("");
  const [step,        setStep]     = useState("geo");
  const [activePage,  setActivePage] = useState(1);
  const [dims,        setDims]     = useState({});

  const pages    = tmpl ? Array.from({ length: tmpl.pageCount||1 }, (_,i)=>i+1) : [1];
  const unsigned = myFields.filter(f => !values[f.id]?.data && !values[f.id]?.text && !values[f.id]?.checked);
  const allDone  = unsigned.length === 0;

  const requestGeo = () => {
    setGeoLoad(true);
    if (!navigator.geolocation) { setGeo({ lat:"unavailable", lng:"unavailable" }); setGeoLoad(false); setStep("sign"); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setGeo({ lat:pos.coords.latitude.toFixed(6), lng:pos.coords.longitude.toFixed(6) }); setGeoLoad(false); setStep("sign"); },
      ()  => { setGeo({ lat:"unavailable", lng:"unavailable" }); setGeoLoad(false); setStep("sign"); },
      { enableHighAccuracy:true, timeout:8000 }
    );
  };

  const handleFieldTap = f => {
    if (!geo) { setStep("geo"); return; }
    setActive(f); setSigData(null); setTextDraft(values[f.id]?.text||"");
  };

  const applyValue = val => {
    if (!activeField) return;
    const ts = new Date().toLocaleDateString("en-US");
    setValues(v => ({ ...v, [activeField.id]: val }));
    // auto-fill date fields for this signer
    if (activeField.type==="signature"||activeField.type==="initials") {
      tmpl?.fields?.filter(f=>f.type==="date"&&f.signerIdx===signerIdx).forEach(df=>{
        setValues(v=>({...v,[df.id]:{text:ts}}));
      });
    }
    setActive(null);
  };

  const finalize = () => onComplete({ values, geo, signedAt:new Date().toISOString() });

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(6,7,13,.94)", backdropFilter:"blur(6px)", zIndex:2000, display:"flex", flexDirection:"column", alignItems:"center", overflowY:"auto", padding:20 }}>
      {/* Header */}
      <div style={{ width:"100%", maxWidth:860, display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, flexShrink:0 }}>
        <div>
          <div style={{ color:"var(--t1)", fontWeight:800, fontSize:16 }}>{doc.name}</div>
          <div className="mono" style={{ fontSize:9, color:"var(--t3)", marginTop:2 }}>
            SIGNING AS: {signer?.name?.toUpperCase()||`SIGNER ${signerIdx+1}`}
            {signer?.role && <span style={{ marginLeft:8 }}> · {signer.role.toUpperCase()}</span>}
          </div>
        </div>
        <button className="btn btn-ghost btn-xs" onClick={onClose}>Save &amp; Exit</button>
      </div>

      {/* Progress */}
      {myFields.length>0 && (
        <div style={{ width:"100%", maxWidth:860, display:"flex", gap:6, marginBottom:12, flexShrink:0, flexWrap:"wrap" }}>
          {myFields.map((f,i) => {
            const done = !!values[f.id]?.data||!!values[f.id]?.text||values[f.id]?.checked;
            return (
              <div key={f.id} style={{ display:"flex", alignItems:"center", gap:6, flex:"1 1 140px", background:done?"rgba(26,217,138,.08)":"rgba(255,255,255,.04)", border:`1px solid ${done?"rgba(26,217,138,.3)":"rgba(255,255,255,.1)"}`, borderRadius:8, padding:"6px 10px" }}>
                <div style={{ width:20, height:20, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:`1.5px solid ${done?"var(--green)":"rgba(255,255,255,.2)"}`, color:done?"var(--green)":"var(--t3)", fontSize:9, fontWeight:700, flexShrink:0 }}>
                  {done ? Di.check : i+1}
                </div>
                <span style={{ fontSize:10, color:done?"var(--green)":"var(--t2)" }}>{f.label||f.type}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* GEO step */}
      {step==="geo" && (
        <div className="card anim" style={{ maxWidth:420, width:"100%", padding:28, textAlign:"center" }}>
          <div style={{ display:"flex", justifyContent:"center", color:"var(--t2)", marginBottom:10 }}>{Di.pin}</div>
          <div style={{ fontWeight:700, fontSize:14, color:"var(--t1)", marginBottom:8 }}>Location Verification</div>
          <div style={{ fontSize:11, color:"var(--t2)", lineHeight:1.75, marginBottom:20 }}>
            Job-Dox records GPS coordinates with each signature to create a verifiable location record attached to this document.
          </div>
          {geoLoading
            ? <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, color:"var(--amber)", fontSize:11 }}><Spin color="var(--amber)"/> Requesting location...</div>
            : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <button className="btn btn-primary" onClick={requestGeo}>Allow Location Access</button>
                <button className="btn btn-ghost btn-xs" onClick={()=>{setGeo({lat:"unavailable",lng:"unavailable"});setStep("sign");}}>Skip — no GPS capture</button>
              </div>}
        </div>
      )}

      {/* FIELD INPUT popup */}
      {activeField && step==="sign" && (
        <div className="card anim" style={{ maxWidth:480, width:"100%", padding:22, marginBottom:14 }}>
          <div style={{ fontWeight:700, fontSize:13, color:"var(--t1)", marginBottom:12 }}>{activeField.label||activeField.type}</div>
          {geo?.lat!=="unavailable" && <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:12, background:"rgba(26,217,138,.08)", border:"1px solid rgba(26,217,138,.2)", borderRadius:6, padding:"5px 10px", fontSize:10, color:"var(--green)" }}>{Di.pin}<span className="mono">{geo.lat}, {geo.lng}</span></div>}

          {(activeField.type==="signature"||activeField.type==="initials") && (
            <>
              <SignaturePad label={activeField.type==="initials"?"Draw your initials":"Draw your full signature"} height={activeField.type==="initials"?80:120} onCapture={setSigData} onClear={()=>setSigData(null)}/>
              <div style={{ display:"flex", gap:8, marginTop:14 }}>
                <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setActive(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex:2, opacity:sigData?1:.4 }} disabled={!sigData} onClick={()=>applyValue({ data:sigData, timestamp:new Date().toLocaleDateString("en-US"), lat:geo?.lat, lng:geo?.lng })}>
                  {Di.check} Apply
                </button>
              </div>
            </>
          )}

          {(activeField.type==="text"||activeField.type==="date") && (
            <>
              {activeField.type==="date"
                ? <input type="date" className="inp" value={textDraft} onChange={e=>setTextDraft(e.target.value)}/>
                : <input className="inp" value={textDraft} onChange={e=>setTextDraft(e.target.value)} placeholder={activeField.label}/>}
              <div style={{ display:"flex", gap:8, marginTop:12 }}>
                <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setActive(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex:2 }} disabled={!textDraft.trim()} onClick={()=>applyValue({ text:textDraft.trim() })}>
                  {Di.check} Apply
                </button>
              </div>
            </>
          )}

          {activeField.type==="checkbox" && (
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setActive(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:2 }} onClick={()=>applyValue({ checked:true })}>
                {Di.check} Check
              </button>
            </div>
          )}
        </div>
      )}

      {/* PDF + overlay */}
      {step==="sign" && !activeField && tmpl && (
        <div style={{ width:"100%", maxWidth:860 }}>
          {pages.length>1 && (
            <div style={{ display:"flex", gap:5, marginBottom:10, flexWrap:"wrap" }}>
              {pages.map(p=>(
                <button key={p} onClick={()=>setActivePage(p)} className={`chip${activePage===p?" on":""}`} style={{ fontSize:10 }}>Page {p}</button>
              ))}
            </div>
          )}
          {pages.map(p=>(
            <div key={p} style={{ display:activePage===p?"block":"none", overflowX:"auto" }}>
              {p === 1 && <CompanyHeader width={720}/>}
              <div style={{ position:"relative", display:"inline-block", borderRadius: p===1 ? "0 0 3px 3px" : 3, overflow:"hidden", boxShadow:"0 8px 40px rgba(0,0,0,.5)" }}>
                <PdfPageCanvas pdfData={tmpl.pdfData} pageNum={p} width={720} onDims={d=>setDims(prev=>({...prev,[p]:d}))}/>
                {dims[p] && tmpl.fields.filter(f=>f.page===p).map(f=>(
                  <FieldBox key={f.id} field={f} dims={dims[p]} value={values[f.id]} signerIdx={signerIdx} onTap={handleFieldTap} highlightPending={!allDone}/>
                ))}
              </div>
            </div>
          ))}

          <div style={{ marginTop:14 }}>
            {!allDone
              ? <div style={{ padding:"10px 16px", background:"rgba(232,156,24,.1)", border:"1px solid rgba(232,156,24,.28)", borderRadius:8, color:"var(--amber)", fontSize:12, display:"flex", alignItems:"center", gap:8 }}>
                  {Di.warn} Tap the highlighted fields on the document above to complete signing
                </div>
              : <div style={{ textAlign:"center" }}>
                  <div style={{ padding:"11px 16px", background:"rgba(26,217,138,.1)", border:"1px solid rgba(26,217,138,.28)", borderRadius:8, color:"var(--green)", fontSize:13, fontWeight:700, marginBottom:12, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    {Di.check} All fields complete
                  </div>
                  <button className="btn btn-primary btn-lg" onClick={finalize}>{Di.check} Finalize and Submit</button>
                </div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEND REMOTE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function SendRemoteModal({ doc, onSend, onClose }) {
  const [method,  setMethod]  = useState("email");
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSend = async () => {
    setSending(true);
    // TODO: callFn("send-signing-request", { doc, method })
    await new Promise(r=>setTimeout(r,1000));
    setSent(true); setSending(false);
    setTimeout(() => { onSend(); onClose(); }, 1500);
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal anim" style={{ maxWidth:500 }}>
        <div className="modal-hd">
          <div><div className="modal-ttl">Send for Signing</div><div style={{ fontSize:11, color:"var(--t3)", marginTop:2 }}>{doc.name}</div></div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{Di.close}</button>
        </div>
        <div className="modal-body">
          <div><label className="lbl">Delivery Method</label>
            <div style={{ display:"flex", gap:7 }}>
              {[{k:"email",l:"Email",i:Di.mail},{k:"sms",l:"SMS",i:Di.sms},{k:"both",l:"Both",i:Di.send}].map(m=>(
                <button key={m.k} onClick={()=>setMethod(m.k)}
                  style={{ flex:1, padding:"9px 8px", borderRadius:7, border:`1.5px solid ${method===m.k?"var(--acc)":"var(--br)"}`, background:method===m.k?"var(--acc-lo)":"transparent", color:method===m.k?"var(--acc)":"var(--t2)", cursor:"pointer", fontSize:11, fontWeight:method===m.k?700:400, fontFamily:"var(--ui)", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  {m.i} {m.l}
                </button>
              ))}
            </div>
          </div>
          <div className="lbl" style={{ marginBottom:8 }}>Signers</div>
          {doc.signers?.map((s,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid var(--br)" }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:"var(--s3)", border:"1px solid var(--br)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"var(--blue)", fontSize:11, flexShrink:0 }}>{(s.name||"?")[0].toUpperCase()}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"var(--t1)" }}>{s.name}</div>
                <div style={{ fontSize:10, color:"var(--t3)", marginTop:1 }}>{s.role}{s.email&&` · ${s.email}`}{s.phone&&` · ${s.phone}`}</div>
              </div>
              <span className="mono" style={{ fontSize:9, background:s.status==="signed"?"rgba(26,217,138,.1)":"rgba(232,156,24,.1)", color:s.status==="signed"?"var(--green)":"var(--amber)", borderRadius:20, padding:"2px 9px" }}>
                {s.status==="signed"?"SIGNED":"PENDING"}
              </span>
            </div>
          ))}
          {sent && <div style={{ display:"flex", alignItems:"center", gap:9, background:"rgba(26,217,138,.08)", border:"1px solid rgba(26,217,138,.28)", borderRadius:8, padding:"10px 14px" }}><span style={{ color:"var(--green)" }}>{Di.check}</span><span style={{ fontSize:12, fontWeight:700, color:"var(--green)" }}>Requests sent</span></div>}
        </div>
        <div className="modal-ft">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSend} disabled={sending||sent}>
            {sending ? <><Spin/> Sending...</> : <>{Di.send} Send</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW MODAL
// ─────────────────────────────────────────────────────────────────────────────
function PreviewModal({ doc, onClose }) {
  const tmpl = loadTemplates().find(t=>t.id===doc.templateId);
  const [activePage,setActivePage] = useState(1);
  const [dims,setDims] = useState({});
  const pages = tmpl ? Array.from({ length: tmpl.pageCount||1 }, (_,i)=>i+1) : [];

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"var(--s1)", borderRadius:14, padding:20, maxWidth:820, width:"96vw", maxHeight:"92vh", overflow:"auto", border:"1px solid var(--br)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div>
            <div style={{ fontWeight:700, color:"var(--t1)", fontSize:14 }}>{doc.name}</div>
            <div className="mono" style={{ fontSize:9, color:"var(--t3)", marginTop:2 }}>CREATED {new Date(doc.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}).toUpperCase()}</div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{Di.close}</button>
        </div>

        {!tmpl ? (
          <div style={{ padding:20, textAlign:"center", color:"var(--t3)", fontSize:12 }}>Template no longer exists</div>
        ) : (
          <>
            {pages.length>1 && (
              <div style={{ display:"flex", gap:5, marginBottom:12, flexWrap:"wrap" }}>
                {pages.map(p=><button key={p} onClick={()=>setActivePage(p)} className={`chip${activePage===p?" on":""}`} style={{ fontSize:10 }}>Page {p}</button>)}
              </div>
            )}
            {pages.map(p=>(
              <div key={p} style={{ display:activePage===p?"block":"none", overflowX:"auto", marginBottom:14 }}>
                {p === 1 && <CompanyHeader width={740}/>}
                <div style={{ position:"relative", display:"inline-block", borderRadius: p===1 ? "0 0 3px 3px" : 3, overflow:"hidden", boxShadow:"0 4px 20px rgba(0,0,0,.3)" }}>
                  <PdfPageCanvas pdfData={tmpl.pdfData} pageNum={p} width={740} onDims={d=>setDims(prev=>({...prev,[p]:d}))}/>
                  {dims[p] && tmpl.fields.filter(f=>f.page===p).map(f=>(
                    <FieldBox key={f.id} field={f} dims={dims[p]} value={doc.values?.[f.id]}/>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {doc.signers?.some(s=>s.status==="signed") && (
          <div style={{ marginTop:4 }}>
            <div className="sec" style={{ marginBottom:9 }}>Audit Trail</div>
            {doc.signers.filter(s=>s.status==="signed").map((s,i)=>(
              <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"9px 11px", borderBottom:"1px solid var(--br)", background:"rgba(26,217,138,.03)", borderRadius:6, marginBottom:4 }}>
                <span style={{ color:"var(--green)", flexShrink:0, marginTop:1 }}>{Di.check}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:12, color:"var(--t1)" }}>{s.name} <span style={{ fontWeight:400, color:"var(--t3)" }}>({s.role})</span></div>
                  <div className="mono" style={{ fontSize:9, color:"var(--t3)", marginTop:2 }}>
                    SIGNED {s.signedAt?new Date(s.signedAt).toLocaleString("en-US"):""}
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
  const [templates,   setTemplates]   = useState(loadTemplates());
  const [editTmpl,    setEditTmpl]    = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);

  const reload = () => setTemplates(loadTemplates());

  const deleteTemplate = id => {
    if (!window.confirm("Delete this template? Any documents using it will lose their PDF.")) return;
    saveTemplates(loadTemplates().filter(t=>t.id!==id)); reload();
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {showBuilder && <TemplateBuilderModal existing={editTmpl} onSave={reload} onClose={()=>{setShowBuilder(false);setEditTmpl(null);reload();}}/>}

      <div style={{ padding:"15px 18px", borderBottom:"1px solid var(--br)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:14, color:"var(--t1)" }}>Document Templates</div>
          <div className="mono" style={{ fontSize:9, color:"var(--t3)", marginTop:1 }}>UPLOAD A PDF, PLACE SIGNATURE FIELDS</div>
        </div>
        <div style={{ display:"flex", gap:7 }}>
          {onClose && <button className="btn btn-ghost btn-xs" onClick={onClose}>{Di.close}</button>}
          <button className="btn btn-primary btn-xs" onClick={()=>{setEditTmpl(null);setShowBuilder(true);}}>{Di.plus} New Template</button>
        </div>
      </div>

      <div className="scroll">
        {templates.length===0 && (
          <div className="empty">
            {Di.template}
            <div style={{ fontWeight:700, fontSize:14, color:"var(--t1)" }}>No templates yet</div>
            <div style={{ fontSize:11, color:"var(--t3)", maxWidth:340, lineHeight:1.65, textAlign:"center" }}>
              Upload any PDF — a contract, work authorization, change order — then click to place signature, initials, text, and date fields exactly where you need them.
            </div>
            <button className="btn btn-primary" onClick={()=>{setEditTmpl(null);setShowBuilder(true);}}>{Di.plus} Create First Template</button>
          </div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:10, padding:18 }}>
          {templates.map(t=>(
            <div key={t.id} className="card" style={{ padding:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:36, height:36, borderRadius:9, background:`${t.color||"var(--blue)"}18`, color:t.color||"var(--blue)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{Di.doc}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:12, color:"var(--t1)" }}>{t.name}</div>
                  {t.description && <div style={{ fontSize:10, color:"var(--t3)", marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.description}</div>}
                </div>
              </div>
              <div style={{ display:"flex", gap:5, marginBottom:10, flexWrap:"wrap" }}>
                <span className="mono" style={{ fontSize:9, background:"rgba(91,163,245,.1)", color:"var(--blue)", borderRadius:20, padding:"2px 9px" }}>{t.fields?.length||0} FIELDS</span>
                <span className="mono" style={{ fontSize:9, background:"var(--s3)", color:"var(--t3)", borderRadius:20, padding:"2px 9px" }}>{t.pageCount||1} PAGE{(t.pageCount||1)!==1?"S":""}</span>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button className="btn btn-secondary btn-xs" style={{ flex:1 }} onClick={()=>{setEditTmpl(t);setShowBuilder(true);}}>{Di.eye} Edit</button>
                <button className="btn btn-ghost btn-xs" style={{ color:"var(--acc)" }} onClick={()=>deleteTemplate(t.id)}>{Di.trash}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGO UPLOAD SECTION  (for GeneralSettingsTab)
// ─────────────────────────────────────────────────────────────────────────────
export function LogoUploadSection({ coInfo, setCoInfo }) {
  const fileRef = useRef();
  const [saved, setSaved] = useState(false);

  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 2*1024*1024) { alert("Logo must be under 2MB."); return; }
    const r = new FileReader();
    r.onload = ev => {
      const u = { ...coInfo, logo:ev.target.result };
      setCoInfo(u); saveCoInfo(u); setSaved(true); setTimeout(()=>setSaved(false), 2500);
    };
    r.readAsDataURL(file); e.target.value = "";
  };

  return (
    <div style={{ marginBottom:16, padding:"14px 16px", background:"var(--s3)", borderRadius:9, border:"1px solid var(--br)" }}>
      <div style={{ fontWeight:700, fontSize:12, color:"var(--t1)", marginBottom:2 }}>Company Logo</div>
      <div style={{ fontSize:11, color:"var(--t3)", marginBottom:12, lineHeight:1.6 }}>Appears on documents and reports.</div>
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:90, height:56, borderRadius:7, border:`1.5px dashed ${coInfo?.logo?"var(--green)":"var(--br)"}`, background:"var(--s2)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
          {coInfo?.logo
            ? <img src={coInfo.logo} alt="" style={{ width:"100%", height:"100%", objectFit:"contain", padding:4 }}/>
            : <div style={{ fontSize:10, color:"var(--t3)", textAlign:"center", lineHeight:1.5 }}>No logo</div>}
        </div>
        <div>
          <div style={{ display:"flex", gap:7, marginBottom:6 }}>
            <button className="btn btn-secondary btn-xs" onClick={()=>fileRef.current?.click()}>{Di.upload} Upload Logo</button>
            {coInfo?.logo && <button className="btn btn-ghost btn-xs" style={{ color:"var(--acc)" }} onClick={()=>{const u={...coInfo,logo:""};setCoInfo(u);saveCoInfo(u);}}>Remove</button>}
            {saved && <span style={{ fontSize:11, color:"var(--green)", fontWeight:600, alignSelf:"center" }}>Saved</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" style={{ display:"none" }} onChange={handleFile}/>
          <div style={{ fontSize:10, color:"var(--t3)" }}>PNG, JPG or SVG · Max 2 MB</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS TAB  — main export
// ─────────────────────────────────────────────────────────────────────────────
export function DocumentsTab({ proj, docs:docsIn, setDocs:setDocsIn }) {
  const [localDocs, setLocalDocs] = useState(() => loadAllDocs().filter(d=>d.projectId===(proj?.id||null)));
  const allDocs = docsIn || localDocs;

  const pushDoc = updated => {
    const all = loadAllDocs();
    const idx = all.findIndex(d=>d.id===updated.id);
    if (idx>=0) all[idx]=updated; else all.push(updated);
    saveAllDocs(all);
    const pd = all.filter(d=>d.projectId===(proj?.id||null));
    setLocalDocs(pd); if (setDocsIn) setDocsIn(pd);
  };

  const [showCompose, setShowCompose] = useState(false);
  const [signing,     setSigning]    = useState(null);
  const [sendModal,   setSendModal]  = useState(null);
  const [preview,     setPreview]    = useState(null);
  const [filter,      setFilter]     = useState("all");

  const filtered = filter==="all" ? allDocs : allDocs.filter(d=>getDocStatus(d)===filter);

  const deleteDoc = id => {
    if (!window.confirm("Delete this document?")) return;
    const all = loadAllDocs().filter(d=>d.id!==id); saveAllDocs(all);
    const pd = all.filter(d=>d.projectId===(proj?.id||null));
    setLocalDocs(pd); if (setDocsIn) setDocsIn(pd);
  };

  const handleSignComplete = (docId, signerIdx, result) => {
    const doc = allDocs.find(d=>d.id===docId); if (!doc) return;
    const signers = doc.signers.map((s,i)=>i===signerIdx?{...s,status:"signed",signedAt:result.signedAt,lat:result.geo?.lat,lng:result.geo?.lng}:s);
    const done    = signers.every(s=>s.status==="signed");
    pushDoc({ ...doc, values:result.values, signers, status:done?"completed":"pending", ...(done?{completedAt:new Date().toISOString()}:{}) });
    setSigning(null);
  };

  const FILTERS = [{key:"all",label:"All"},{key:"draft",label:"Drafts"},{key:"pending",label:"Pending"},{key:"partial",label:"Partially Signed"},{key:"completed",label:"Completed"}];

  return (
    <div className="scroll">
      {showCompose && <DocComposerModal proj={proj} onSave={pushDoc} onClose={()=>setShowCompose(false)}/>}
      {signing    && <SigningModal doc={signing.doc} signerIdx={signing.idx} onComplete={r=>handleSignComplete(signing.doc.id,signing.idx,r)} onClose={()=>setSigning(null)}/>}
      {sendModal  && <SendRemoteModal doc={sendModal} onSend={()=>pushDoc({...sendModal,status:"pending"})} onClose={()=>setSendModal(null)}/>}
      {preview    && <PreviewModal doc={preview} onClose={()=>setPreview(null)}/>}

      <div style={{ maxWidth:900, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:13 }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div className="sec" style={{ margin:0 }}>Documents</div>
            {allDocs.length>0 && <span className="mono" style={{ fontSize:9, color:"var(--t3)" }}>{allDocs.length}</span>}
          </div>
          <button className="btn btn-primary btn-xs" onClick={()=>setShowCompose(true)}>{Di.plus} New Document</button>
        </div>

        {allDocs.length>1 && (
          <div style={{ display:"flex", gap:5, marginBottom:13, flexWrap:"wrap" }}>
            {FILTERS.map(f=><button key={f.key} onClick={()=>setFilter(f.key)} className={`chip${filter===f.key?" on":""}`}>{f.label}</button>)}
          </div>
        )}

        {allDocs.length===0 && (
          <div className="empty">
            <div style={{ color:"var(--t3)" }}>{Di.doc}</div>
            <div style={{ fontWeight:700, fontSize:14, color:"var(--t1)" }}>No documents yet</div>
            <div style={{ fontSize:11, color:"var(--t3)", maxWidth:340, lineHeight:1.65, textAlign:"center" }}>
              Create a PDF template first in Advanced Tools, then use it here to generate signable documents for this project.
            </div>
            <button className="btn btn-primary btn-xs" onClick={()=>setShowCompose(true)}>{Di.plus} New Document</button>
          </div>
        )}

        {filtered.map(doc => {
          const st     = getDocStatus(doc);
          const meta   = STATUS_META[st]||STATUS_META.draft;
          const tmpl   = loadTemplates().find(t=>t.id===doc.templateId);
          const signed = doc.signers?.filter(s=>s.status==="signed").length||0;
          const total  = doc.signers?.length||0;
          return (
            <div key={doc.id} className="row" style={{ marginBottom:6, padding:0, overflow:"hidden" }}>
              <div style={{ display:"flex", alignItems:"center", gap:11, padding:"11px 13px" }}>
                <div style={{ width:34, height:34, borderRadius:8, flexShrink:0, background:`${tmpl?.color||meta.color}18`, color:tmpl?.color||meta.color, display:"flex", alignItems:"center", justifyContent:"center" }}>{Di.doc}</div>
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
                {doc.signers?.length>0 && (
                  <div style={{ display:"flex", gap:3, flexShrink:0 }}>
                    {doc.signers.map((s,i)=>(
                      <div key={i} title={`${s.name}: ${s.status}`} style={{ width:24, height:24, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, flexShrink:0, background:s.status==="signed"?"rgba(26,217,138,.15)":"rgba(232,156,24,.12)", color:s.status==="signed"?"var(--green)":"var(--amber)", border:`1.5px solid ${s.status==="signed"?"rgba(26,217,138,.4)":"rgba(232,156,24,.3)"}` }}>
                        {(s.name||"?")[0].toUpperCase()}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                  <button className="btn btn-ghost btn-xs" title="Preview" onClick={()=>setPreview(doc)}>{Di.eye}</button>
                  {st!=="void"&&st!=="completed"&&total>0 && <button className="btn btn-secondary btn-xs" onClick={()=>setSigning({doc,idx:0})}>{Di.pen} Sign</button>}
                  {st!=="void"&&total>0&&signed<total && <button className="btn btn-ghost btn-xs" style={{ color:"var(--blue)" }} onClick={()=>setSendModal(doc)}>{Di.send} Send</button>}
                  {st==="draft" && <button className="btn btn-ghost btn-xs" style={{ color:"var(--t3)" }} onClick={()=>pushDoc({...doc,status:"void"})}>Void</button>}
                  <button className="btn btn-ghost btn-xs" style={{ color:"var(--acc)" }} onClick={()=>deleteDoc(doc.id)}>{Di.trash}</button>
                </div>
              </div>
              {st==="partial" && doc.signers?.map((s,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 13px", borderTop:"1px solid var(--br)", background:s.status==="signed"?"rgba(26,217,138,.03)":"rgba(232,156,24,.03)" }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:s.status==="signed"?"var(--green)":"var(--amber)", flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:"var(--t2)", flex:1 }}>{s.name||`Signer ${i+1}`}<span style={{ color:"var(--t3)", marginLeft:5 }}>({s.role})</span></span>
                  {s.status==="signed"
                    ? <span className="mono" style={{ fontSize:9, color:"var(--green)" }}>{Di.check} SIGNED {s.signedAt?new Date(s.signedAt).toLocaleDateString("en-US"):""}</span>
                    : <div style={{ display:"flex", gap:5 }}>
                        <button className="btn btn-ghost btn-xs" onClick={()=>setSigning({doc,idx:i})}>Sign Now</button>
                        <button className="btn btn-ghost btn-xs" onClick={()=>setSendModal(doc)}>Resend</button>
                      </div>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DocumentsTab;
