/**
 * JobDoxDocuments.jsx  v4  -- PDF-overlay DocuSign-style document module
 * REWRITTEN: proper Firestore paths, public signing, end-to-end flow
 *
 * EXPORTS
 *   DocumentsTab            -- project documents tab (Part 2 + 4)
 *   LogoUploadSection       -- company logo upload for settings
 *   DocumentTemplateCenter  -- template management (Part 1)
 *   PdfQuickSignModal       -- quick-sign any PDF
 *   PublicSigningPage       -- public signing page (Part 3)
 *   setDocsCompanyId        -- set the active company ID
 */

import { useState, useRef, useEffect } from "react";
import {
  getFirestore, doc, getDoc, setDoc, addDoc, deleteDoc, updateDoc,
  collection, query, where, getDocs, serverTimestamp, collectionGroup
} from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import JobDoxInPersonSign from './JobDoxInPersonSign';
import { getFirebaseIdToken } from "./firebase.js";

// Firebase config — same as shared/firebase.js, needed for standalone signing page
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAFwSEDPqKgAUbwbh_2KZNwLDdGCZEiq3E",
  authDomain:        "cortex-717c6.firebaseapp.com",
  projectId:         "cortex-717c6",
  storageBucket:     "cortex-717c6.firebasestorage.app",
  messagingSenderId: "496631882511",
  appId:             "1:496631882511:web:3f7be61bcbb83a6ab4d47a",
};

// Lazy Firestore getter — initializes Firebase if needed (for public signing page)
function getDb() {
  if (getApps().length === 0) {
    initializeApp(FIREBASE_CONFIG);
  }
  return getFirestore(getApps()[0]);
}

let _docsCompanyId = null;
export function setDocsCompanyId(cid) { _docsCompanyId = cid; }

const NETLIFY = "/.netlify/functions";
async function callFn(name, data) {
  const headers = { "Content-Type": "application/json" };
  const token = await getFirebaseIdToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(NETLIFY + "/" + name, {
    method: "POST", headers,
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || name + " failed");
  return json;
}

// -- localStorage cache helpers (jd_* prefix) --
const LS_CO = "jd_company_info";
const loadCoInfo = () => { try { return JSON.parse(localStorage.getItem(LS_CO)) || {}; } catch { return {}; } };
const saveCoInfo = v => {
  try { localStorage.setItem(LS_CO, JSON.stringify(v)); } catch {}
  if (_docsCompanyId) {
    setDoc(doc(getDb(), "companies", _docsCompanyId, "settings", "companyInfo"),
      { data: JSON.parse(JSON.stringify(v)), updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
  }
};

let _c = 9000;
const uid = () => "jd-" + (++_c) + "-" + Math.random().toString(36).slice(2, 8);
const uuid = () => crypto.randomUUID ? crypto.randomUUID() : uid();

// -- PDF.js (loaded from CDN) --
const PDFJS_VER = "3.11.174";
let _pdfJsPromise = null;
const loadPdfJs = () => {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (_pdfJsPromise) return _pdfJsPromise;
  _pdfJsPromise = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + PDFJS_VER + "/pdf.min.js";
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + PDFJS_VER + "/pdf.worker.min.js";
      res(window.pdfjsLib);
    };
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return _pdfJsPromise;
};

const getPdfPageCount = async (b64) => {
  const lib = await loadPdfJs();
  const bin = atob(b64.split(",")[1]);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const pdf = await lib.getDocument({ data: buf }).promise;
  return pdf.numPages;
};

// ─── SVG Icons ───────────────────────────────────────────────────────────────
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
  move:     <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/></svg>,
  phone:    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>,
  download: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>,
  copy:     <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>,
};

const FIELD_ICONS = { signature: Di.pen, initials: Di.initials, textInput: Di.text, date: Di.calendar, checkbox: Di.checkbox };
const FIELD_COLORS = { signature: "var(--acc)", initials: "var(--blue)", textInput: "var(--green)", date: "var(--purple)", checkbox: "var(--amber)" };
const FIELD_DEFAULTS = { signature: { w: .36, h: .075 }, initials: { w: .15, h: .075 }, textInput: { w: .35, h: .04 }, date: { w: .2, h: .04 }, checkbox: { w: .025, h: .03 } };

// ─── PART 5: Data Mapping Keys ───────────────────────────────────────────────
const DATA_KEYS = [
  { key: "project.name",           label: "Project Name" },
  { key: "project.address",        label: "Project Address" },
  { key: "project.contactName",    label: "Contact Name" },
  { key: "project.contactPhone",   label: "Contact Phone" },
  { key: "project.contactEmail",   label: "Contact Email" },
  { key: "project.insuranceClaim", label: "Insurance Claim #" },
  { key: "project.workType",       label: "Work Type" },
  { key: "project.startDate",      label: "Project Start Date" },
  { key: "company.name",           label: "Company Name" },
  { key: "date.today",             label: "Today's Date" },
  { key: "custom",                 label: "Custom (manual)" },
];

function resolveDataKey(key, proj, co) {
  if (!key || key === "custom") return "";
  const p = proj || {};
  const c = co || {};
  switch (key) {
    case "project.name":           return p.name || "";
    case "project.address":        return p.address || "";
    case "project.contactName":    return p.client || p.clientName || "";
    case "project.contactPhone":   return p.clientPhone || p.phone || "";
    case "project.contactEmail":   return p.clientEmail || "";
    case "project.insuranceClaim": return p.claim || p.claimNumber || "";
    case "project.workType":       return Array.isArray(p.worktypes) ? p.worktypes.map(w => w.type || w).join(", ") : (p.type || "");
    case "project.startDate":      return p.startDate || "";
    case "company.name":           return c.name || "";
    case "date.today":             return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    default: return "";
  }
}

// ─── Status meta ─────────────────────────────────────────────────────────────
const STATUS_META = {
  draft:   { label: "Draft",   color: "var(--t3)",    bg: "rgba(128,128,128,.1)" },
  sent:    { label: "Sent",    color: "var(--amber)",  bg: "rgba(232,156,24,.1)" },
  signed:  { label: "Signed",  color: "var(--green)",  bg: "rgba(26,217,138,.1)" },
  expired: { label: "Expired", color: "var(--acc)",    bg: "rgba(228,53,49,.08)" },
};

// ─── Spinner ─────────────────────────────────────────────────────────────────
const Spin = ({ size = 12, color = "var(--t3)" }) => (
  <div style={{ width: size, height: size, border: `2px solid ${color}44`, borderTopColor: color, borderRadius: "50%", animation: "jd-spin .7s linear infinite", display: "inline-block", flexShrink: 0 }} />
);

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE HELPERS — PART 1: Proper template & document storage
// Templates: companies/{companyId}/documentTemplates/{templateId}
// Documents: companies/{companyId}/projects/{projectId}/documents/{documentId}
// ─────────────────────────────────────────────────────────────────────────────

async function fsLoadTemplates(companyId) {
  if (!companyId) return [];
  try {
    const snap = await getDocs(collection(getDb(), "companies", companyId, "documentTemplates"));
    return snap.docs.map(d => ({ templateId: d.id, ...d.data() }));
  } catch (e) { console.warn("[Docs] Failed to load templates:", e); return []; }
}

async function fsSaveTemplate(companyId, tmpl) {
  if (!companyId) return null;
  const data = {
    name: tmpl.name || "Untitled",
    description: tmpl.description || "",
    color: tmpl.color || "#5ba3f5",
    pdfBase64: tmpl.pdfData || tmpl.pdfBase64 || "",
    pageCount: tmpl.pageCount || 1,
    fields: (tmpl.fields || []).map(f => ({
      fieldId: f.fieldId || f.id || uid(),
      type: f.type,
      page: f.page || 1,
      x: f.x, y: f.y, width: f.w ?? f.width, height: f.h ?? f.height,
      dataKey: f.dataKey || f.autoFill || null,
      label: f.label || f.type,
      required: f.required !== false,
      signerRole: f.signerRole || (f.signerIdx === 0 ? "customer" : f.signerIdx === 1 ? "staff" : "customer"),
    })),
    updatedAt: serverTimestamp(),
  };
  if (tmpl.templateId && tmpl.templateId !== "new") {
    const ref = doc(getDb(), "companies", companyId, "documentTemplates", tmpl.templateId);
    await setDoc(ref, data, { merge: true });
    return tmpl.templateId;
  } else {
    data.createdAt = serverTimestamp();
    const ref = await addDoc(collection(getDb(), "companies", companyId, "documentTemplates"), data);
    return ref.id;
  }
}

async function fsDeleteTemplate(companyId, templateId) {
  if (!companyId || !templateId) return;
  await deleteDoc(doc(getDb(), "companies", companyId, "documentTemplates", templateId));
}

async function fsLoadProjectDocuments(companyId, projectId) {
  if (!companyId || !projectId) return [];
  try {
    const snap = await getDocs(collection(getDb(), "companies", companyId, "projects", projectId, "documents"));
    return snap.docs.map(d => ({ documentId: d.id, ...d.data() }));
  } catch (e) { console.warn("[Docs] Failed to load project documents:", e); return []; }
}

async function fsSaveProjectDocument(companyId, projectId, docData) {
  if (!companyId || !projectId) return null;
  const data = { ...docData, updatedAt: serverTimestamp() };
  delete data.documentId; // Don't store the ID inside the document
  if (docData.documentId) {
    const ref = doc(getDb(), "companies", companyId, "projects", projectId, "documents", docData.documentId);
    await setDoc(ref, data, { merge: true });
    return docData.documentId;
  } else {
    data.createdAt = serverTimestamp();
    const ref = await addDoc(collection(getDb(), "companies", companyId, "projects", projectId, "documents"), data);
    return ref.id;
  }
}

async function fsDeleteProjectDocument(companyId, projectId, documentId) {
  if (!companyId || !projectId || !documentId) return;
  await deleteDoc(doc(getDb(), "companies", companyId, "projects", projectId, "documents", documentId));
}

// Look up document by signingToken using collectionGroup query
async function fsLookupBySigningToken(token) {
  if (!token) return null;
  try {
    const q = query(collectionGroup(getDb(), "documents"), where("signingToken", "==", token));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    const pathParts = d.ref.path.split("/");
    // path: companies/{companyId}/projects/{projectId}/documents/{documentId}
    return {
      documentId: d.id,
      companyId: pathParts[1],
      projectId: pathParts[3],
      ...d.data(),
    };
  } catch (e) {
    console.warn("[Docs] Token lookup failed:", e);
    return null;
  }
}

// Also try the top-level signingRequests collection as fallback
async function fsLookupSigningRequest(token) {
  if (!token) return null;
  try {
    const q = query(collectionGroup(getDb(), "signingRequests"), where("token", "==", token));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF PAGE CANVAS — renders one page of a PDF to a <canvas>
// ─────────────────────────────────────────────────────────────────────────────
function PdfPageCanvas({ pdfData, pageNum = 1, width = 700, onDims }) {
  const cvRef = useRef();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!pdfData) return;
    let dead = false;
    setLoading(true); setErr(null);
    (async () => {
      try {
        const lib = await loadPdfJs();
        if (dead) return;
        const raw = pdfData.includes(",") ? pdfData.split(",")[1] : pdfData;
        const bin = atob(raw);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        const pdf = await lib.getDocument({ data: buf }).promise;
        if (dead) return;
        const page = await pdf.getPage(pageNum);
        if (dead) return;
        const vp = page.getViewport({ scale: 1 });
        const sc = width / vp.width;
        const svp = page.getViewport({ scale: sc });
        const cv = cvRef.current;
        if (!cv) return;
        cv.width = svp.width;
        cv.height = svp.height;
        await page.render({ canvasContext: cv.getContext("2d"), viewport: svp }).promise;
        if (!dead) { setLoading(false); if (onDims) onDims({ w: svp.width, h: svp.height }); }
      } catch (e) { if (!dead) { setLoading(false); setErr("PDF render failed"); } }
    })();
    return () => { dead = true; };
  }, [pdfData, pageNum, width]);

  return (
    <div style={{ position: "relative", display: "inline-block", minHeight: 40 }}>
      <canvas ref={cvRef} style={{ display: "block" }} />
      {loading && (
        <div style={{ position: "absolute", inset: 0, background: "var(--s3)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3 }}>
          <Spin size={20} color="var(--t2)" />
        </div>
      )}
      {err && (
        <div style={{ position: "absolute", inset: 0, background: "var(--s3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--acc)" }}>
          {err}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY HEADER
// ─────────────────────────────────────────────────────────────────────────────
function CompanyHeader({ width = 700, coInfo }) {
  const co = coInfo || loadCoInfo();
  const hasInfo = co.name || co.logo || co.address || co.phone || co.email;
  if (!hasInfo) return null;
  const addressLine = [co.address, co.city, co.state, co.zip].filter(Boolean).join(", ");
  return (
    <div style={{
      width, background: "#fff", borderRadius: "3px 3px 0 0", padding: "16px 24px",
      display: "flex", alignItems: "center", gap: 18,
      borderBottom: "2px solid #e2e5ea", boxSizing: "border-box",
      fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif",
    }}>
      {co.logo && <img src={co.logo} alt="Company logo" style={{ height: 52, maxWidth: 120, objectFit: "contain", flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        {co.name && <div style={{ fontWeight: 700, fontSize: 15, color: "#0d1117", lineHeight: 1.3, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{co.name}</div>}
        {addressLine && <div style={{ fontSize: 11, color: "#57606a", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{addressLine}</div>}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 2 }}>
          {co.phone && <span style={{ fontSize: 10, color: "#57606a", display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{Di.phone} {co.phone}</span>}
          {co.email && <span style={{ fontSize: 10, color: "#57606a", display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{Di.mail} {co.email}</span>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD BOX — positioned overlay element on top of a PDF page
// ─────────────────────────────────────────────────────────────────────────────
function FieldBox({ field, dims, value, isMine, onTap, highlightPending, editorMode, selected, onSelect, onMove }) {
  const fw = (field.width ?? field.w ?? 0.3) * dims.w;
  const fh = (field.height ?? field.h ?? 0.05) * dims.h;
  const left = field.x * dims.w;
  const top = field.y * dims.h;
  const done = !!value?.data || !!value?.text || value?.checked;
  const color = FIELD_COLORS[field.type] || "var(--t2)";
  const pending = isMine && highlightPending && !done;
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });

  const onDragStart = e => {
    if (!editorMode || !onMove) return;
    e.stopPropagation(); e.preventDefault();
    const ev = e.touches ? e.touches[0] : e;
    dragging.current = true;
    dragStart.current = { mx: ev.clientX, my: ev.clientY, ox: field.x, oy: field.y };
    const onDragMove = me => {
      if (!dragging.current) return;
      const mv = me.touches ? me.touches[0] : me;
      const dx = (mv.clientX - dragStart.current.mx) / dims.w;
      const dy = (mv.clientY - dragStart.current.my) / dims.h;
      const nx = Math.max(0, Math.min(1 - (field.width ?? field.w ?? 0.3), dragStart.current.ox + dx));
      const ny = Math.max(0, Math.min(1 - (field.height ?? field.h ?? 0.05), dragStart.current.oy + dy));
      onMove(field.fieldId || field.id, { x: nx, y: ny });
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
    window.addEventListener("touchmove", onDragMove, { passive: false });
    window.addEventListener("touchend", onDragEnd);
  };

  return (
    <div
      onClick={e => { e.stopPropagation(); editorMode ? onSelect?.(field.fieldId || field.id) : (isMine && !done && onTap?.(field)); }}
      onMouseDown={editorMode ? onDragStart : undefined}
      onTouchStart={editorMode ? onDragStart : undefined}
      style={{
        position: "absolute", left, top, width: fw, height: fh, boxSizing: "border-box",
        border: done ? `2px solid ${color}` : selected ? `2px solid var(--blue)` : `1.5px dashed ${color}${pending ? "bb" : "66"}`,
        background: selected ? "rgba(91,163,245,.15)" : done ? `${color}0a` : pending ? `${color}0d` : `${color}05`,
        borderRadius: field.type === "checkbox" ? 3 : 5,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: editorMode ? "grab" : (isMine && !done ? "pointer" : "default"),
        transition: dragging.current ? "none" : "border-color .12s, background .12s",
        ...(pending ? { boxShadow: `0 0 0 3px ${color}25` } : {}),
        overflow: "hidden", userSelect: editorMode ? "none" : undefined, touchAction: editorMode ? "none" : undefined,
      }}
    >
      {done && value?.data && <img src={value.data} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />}
      {done && value?.text && (
        <span style={{ fontSize: Math.max(8, fh * .42), color: "#0d1117", fontFamily: field.type === "signature" ? "cursive" : "var(--mono)", padding: "0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
          {value.text}
        </span>
      )}
      {done && value?.checked && <svg width="16" height="16" viewBox="0 0 24 24" fill={color}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>}
      {!done && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, pointerEvents: "none", width: "100%", padding: "0 3px" }}>
          <span style={{ color: `${color}99`, lineHeight: 1, display: "flex" }}>{FIELD_ICONS[field.type]}</span>
          {fh > 18 && (
            <span style={{ fontSize: Math.max(7, Math.min(9, fh * .22)), color: `${color}88`, fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".04em", textAlign: "center", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
              {field.label || field.type}
            </span>
          )}
        </div>
      )}
      {editorMode && selected && (
        <div style={{ position: "absolute", top: -17, left: 0, background: "var(--blue)", color: "#fff", fontSize: 8, padding: "1px 6px", borderRadius: "3px 3px 0 0", whiteSpace: "nowrap", fontFamily: "var(--mono)", display: "flex", alignItems: "center", gap: 4 }}>
          {Di.move} {field.type} · {field.signerRole || "customer"}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNATURE PAD
// ─────────────────────────────────────────────────────────────────────────────
function SignaturePad({ label = "Sign here", height = 130, onCapture, onClear }) {
  const cvRef = useRef();
  const drawing = useRef(false);
  const lastPt = useRef(null);
  const [hasSig, setHasSig] = useState(false);

  const getXY = (e, cv) => {
    const r = cv.getBoundingClientRect();
    const s = e.touches ? e.touches[0] : e;
    return { x: s.clientX - r.left, y: s.clientY - r.top };
  };

  const onStart = e => {
    e.preventDefault(); drawing.current = true;
    const cv = cvRef.current; const pt = getXY(e, cv);
    lastPt.current = pt;
    const ctx = cv.getContext("2d");
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 1, 0, Math.PI * 2); ctx.fillStyle = "#0d1117"; ctx.fill();
  };
  const onMove = e => {
    e.preventDefault(); if (!drawing.current) return;
    const cv = cvRef.current; const pt = getXY(e, cv);
    const ctx = cv.getContext("2d");
    ctx.beginPath(); ctx.moveTo(lastPt.current.x, lastPt.current.y); ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = "#0d1117"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
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
      <div style={{ border: `1.5px solid ${hasSig ? "var(--green)" : "var(--br-hi)"}`, borderRadius: 7, background: "#fff", position: "relative", height, transition: "border-color .15s" }}>
        <canvas ref={cvRef} style={{ display: "block", width: "100%", height: "100%", touchAction: "none", cursor: "crosshair" }}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} />
        {!hasSig && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <span style={{ fontSize: 11, color: "rgba(0,0,0,.3)", fontStyle: "italic", fontFamily: "var(--ui)" }}>Draw with finger or mouse</span>
          </div>
        )}
      </div>
      {hasSig && (
        <button onClick={clear} style={{ marginTop: 5, fontSize: 10, color: "var(--acc)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--ui)", display: "flex", alignItems: "center", gap: 4 }}>
          {Di.close} Clear
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE BUILDER MODAL — PART 1
// Upload a real PDF, then click to place fields on top of it
// Fields use: type, page, x, y, width, height, dataKey, label, required, signerRole
// ─────────────────────────────────────────────────────────────────────────────
function TemplateBuilderModal({ existing, companyId, onSave, onClose }) {
  const blank = { templateId: "new", name: "New Template", description: "", color: "#5ba3f5", pdfData: null, pageCount: 1, fields: [] };
  const init = existing ? {
    ...existing,
    pdfData: existing.pdfBase64 || existing.pdfData || null,
    fields: (existing.fields || []).map(f => ({
      ...f, id: f.fieldId || f.id || uid(),
      w: f.width ?? f.w, h: f.height ?? f.h,
    })),
  } : blank;
  const [tmpl, setTmpl] = useState(init);
  const [selFld, setSelFld] = useState(null);
  const [addMode, setAddMode] = useState(null);
  const [activePage, setActivePage] = useState(1);
  const [dims, setDims] = useState({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const wrapRef = useRef();

  const FIELD_TYPES = [
    { type: "signature", label: "Signature", color: "var(--acc)" },
    { type: "initials", label: "Initials", color: "var(--blue)" },
    { type: "textInput", label: "Text", color: "var(--green)" },
    { type: "date", label: "Date", color: "var(--purple)" },
    { type: "checkbox", label: "Checkbox", color: "var(--amber)" },
  ];

  const handlePdfUpload = async e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 8 * 1024 * 1024) { alert("PDF must be under 8 MB."); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async ev => {
      const b64 = ev.target.result;
      const count = await getPdfPageCount(b64);
      setTmpl(t => ({ ...t, pdfData: b64, pageCount: count, name: t.name === "New Template" ? file.name.replace(".pdf", "") : t.name }));
      setDims({});
      setUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCanvasClick = e => {
    if (!addMode || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const pgDims = dims[activePage];
    if (!pgDims) return;
    const x = (e.clientX - r.left) / pgDims.w;
    const y = (e.clientY - r.top) / pgDims.h;
    const d = FIELD_DEFAULTS[addMode] || { w: .3, h: .05 };
    const f = {
      id: uid(), fieldId: uid(), type: addMode,
      label: addMode === "signature" ? "Signature" : addMode === "initials" ? "Initials" : addMode === "textInput" ? "Text Field" : addMode === "date" ? "Date" : "Checkbox",
      page: activePage,
      x: Math.max(0, Math.min(1 - d.w, x)),
      y: Math.max(0, Math.min(1 - d.h, y)),
      w: d.w, h: d.h, width: d.w, height: d.h,
      signerRole: (addMode === "signature" || addMode === "initials") ? "customer" : "both",
      dataKey: null, required: true,
    };
    setTmpl(t => ({ ...t, fields: [...t.fields, f] }));
    setSelFld(f.id); setAddMode(null);
  };

  const upd = (id, patch) => setTmpl(t => ({ ...t, fields: t.fields.map(f => (f.id === id || f.fieldId === id) ? { ...f, ...patch } : f) }));
  const del = id => { setTmpl(t => ({ ...t, fields: t.fields.filter(f => f.id !== id && f.fieldId !== id) })); setSelFld(null); };

  const save = async () => {
    if (!tmpl.pdfData) { alert("Please upload a PDF first."); return; }
    setSaving(true);
    try {
      const savedId = await fsSaveTemplate(companyId, tmpl);
      onSave({ ...tmpl, templateId: savedId });
      onClose();
    } catch (e) {
      alert("Failed to save template: " + e.message);
    }
    setSaving(false);
  };

  const sf = tmpl.fields.find(f => f.id === selFld || f.fieldId === selFld);
  const pages = Array.from({ length: tmpl.pageCount }, (_, i) => i + 1);
  const pageDims = dims[activePage] || { w: 600, h: 776 };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg anim" style={{ maxWidth: 1000, width: "97vw", maxHeight: "96vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-hd">
          <input value={tmpl.name} onChange={e => setTmpl(t => ({ ...t, name: e.target.value }))}
            style={{ fontWeight: 800, fontSize: 14, background: "none", border: "none", color: "var(--t1)", fontFamily: "var(--ui)", outline: "none", flex: 1 }} />
          <div style={{ display: "flex", gap: 7 }}>
            <button className="btn btn-ghost btn-xs" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-xs" onClick={save} disabled={saving}>
              {saving ? <><Spin /> Saving...</> : "Save Template"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: window.innerWidth < 700 ? "column" : "row", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* LEFT — field type sidebar */}
          <div style={{ width: window.innerWidth < 700 ? "100%" : 184, flexShrink: 0, borderRight: window.innerWidth < 700 ? "none" : "1px solid var(--br)", borderBottom: window.innerWidth < 700 ? "1px solid var(--br)" : "none", padding: "14px 11px", overflowY: "auto", background: "var(--s1)", display: "flex", flexDirection: window.innerWidth < 700 ? "row" : "column", flexWrap: window.innerWidth < 700 ? "wrap" : "nowrap", gap: 4 }}>
            <div style={{ marginBottom: 8 }}>
              <div className="sec" style={{ marginBottom: 6 }}>PDF Template</div>
              <button className="btn btn-secondary btn-xs" style={{ width: "100%", justifyContent: "center", minHeight: 44 }} onClick={() => fileRef.current?.click()}>
                {uploading ? <Spin /> : Di.upload} {tmpl.pdfData ? "Replace PDF" : "Upload PDF"}
              </button>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handlePdfUpload} />
              {tmpl.pdfData && <div className="mono" style={{ fontSize: 9, color: "var(--green)", marginTop: 5 }}>{tmpl.pageCount} PAGE{tmpl.pageCount !== 1 ? "S" : ""} LOADED</div>}
            </div>

            <div style={{ height: 1, background: "var(--br)", margin: "4px 0" }} />

            <div className="sec" style={{ marginBottom: 4 }}>Place Fields</div>
            {!tmpl.pdfData && <div style={{ fontSize: 10, color: "var(--t3)", lineHeight: 1.5 }}>Upload a PDF first, then click to place fields on any page.</div>}
            {FIELD_TYPES.map(ft => (
              <button key={ft.type} onClick={() => tmpl.pdfData && setAddMode(addMode === ft.type ? null : ft.type)}
                style={{ width: "100%", background: addMode === ft.type ? "var(--acc-lo)" : "var(--s3)", border: `1px solid ${addMode === ft.type ? "var(--acc)" : "var(--br)"}`, borderRadius: 8, padding: "7px 10px", cursor: tmpl.pdfData ? "pointer" : "not-allowed", opacity: tmpl.pdfData ? 1 : .4, display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--ui)", transition: "all .12s", color: addMode === ft.type ? "var(--acc)" : "var(--t2)" }}>
                <span style={{ color: addMode === ft.type ? "var(--acc)" : ft.color, flexShrink: 0 }}>{FIELD_ICONS[ft.type]}</span>
                <span style={{ fontSize: 11 }}>{ft.label}</span>
              </button>
            ))}

            {addMode && (
              <div style={{ marginTop: 4, padding: "7px 9px", background: "rgba(232,156,24,.07)", border: "1px solid rgba(232,156,24,.2)", borderRadius: 6, fontSize: 10, color: "var(--amber)", lineHeight: 1.5 }}>
                Click anywhere on the PDF to place a {addMode} field
              </div>
            )}

            {/* Field editor */}
            {sf && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ height: 1, background: "var(--br)" }} />
                <div className="sec" style={{ margin: 0 }}>Field Settings</div>
                <div><label className="lbl">Label</label><input className="inp" value={sf.label || ""} onChange={e => upd(sf.id, { label: e.target.value })} style={{ fontSize: 11 }} /></div>
                <div><label className="lbl">Signer Role</label>
                  <select className="sel" value={sf.signerRole || "customer"} onChange={e => upd(sf.id, { signerRole: e.target.value })} style={{ fontSize: 11 }}>
                    <option value="customer">Customer</option>
                    <option value="staff">Staff</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                {(sf.type === "textInput" || sf.type === "date") && (
                  <div><label className="lbl">Auto-fill (Data Key)</label>
                    <select className="sel" value={sf.dataKey || "custom"} onChange={e => upd(sf.id, { dataKey: e.target.value })} style={{ fontSize: 10 }}>
                      {DATA_KEYS.map(dk => <option key={dk.key} value={dk.key}>{dk.label}</option>)}
                    </select>
                  </div>
                )}
                <div><label className="lbl">Required</label>
                  <select className="sel" value={sf.required !== false ? "yes" : "no"} onChange={e => upd(sf.id, { required: e.target.value === "yes" })} style={{ fontSize: 11 }}>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                  {[["x", "X Pos %"], ["y", "Y Pos %"], ["w", "Width %"], ["h", "Height %"]].map(([k, l]) => (
                    <div key={k}><label className="lbl">{l}</label>
                      <input type="number" className="inp" step=".01" min="0" max="1" value={(sf[k] || 0).toFixed(3)} onChange={e => upd(sf.id, { [k]: parseFloat(e.target.value) || 0, ...(k === "w" ? { width: parseFloat(e.target.value) || 0 } : {}), ...(k === "h" ? { height: parseFloat(e.target.value) || 0 } : {}) })} style={{ fontSize: 10 }} />
                    </div>
                  ))}
                </div>
                <button className="btn btn-ghost btn-xs" style={{ color: "var(--acc)" }} onClick={() => del(sf.id)}>{Di.trash} Remove Field</button>
              </div>
            )}
          </div>

          {/* CENTER — PDF canvas */}
          <div style={{ flex: 1, overflow: "auto", background: "#2a2d3a", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            {!tmpl.pdfData && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 12, color: "var(--t3)" }}>
                {Di.doc}
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t2)" }}>No PDF uploaded yet</div>
                <button className="btn btn-secondary" style={{minHeight:44}} onClick={() => fileRef.current?.click()}>{Di.upload} Upload PDF</button>
              </div>
            )}
            {tmpl.pdfData && tmpl.pageCount > 1 && (
              <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                {pages.map(p => <button key={p} onClick={() => setActivePage(p)} className={`chip${activePage === p ? " on" : ""}`} style={{ fontSize: 10 }}>Page {p}</button>)}
              </div>
            )}
            {tmpl.pdfData && pages.map(p => (
              <div key={p} style={{ display: activePage === p ? "block" : "none" }}>
                <div ref={activePage === p ? wrapRef : null}
                  style={{ position: "relative", cursor: addMode ? "crosshair" : "default", display: "inline-block", borderRadius: 3, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,.5)" }}
                  onClick={activePage === p ? handleCanvasClick : undefined}>
                  <PdfPageCanvas pdfData={tmpl.pdfData} pageNum={p} width={Math.min(600, window.innerWidth - 40)} onDims={d => setDims(prev => ({ ...prev, [p]: d }))} />
                  {dims[p] && tmpl.fields.filter(f => f.page === p).map(f => (
                    <FieldBox key={f.id} field={f} dims={dims[p] || { w: 600, h: 776 }} value={{}} isMine={false}
                      editorMode selected={selFld === f.id} onSelect={setSelFld} onMove={upd} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT — template meta */}
          <div style={{ width: window.innerWidth < 700 ? "100%" : 160, flexShrink: 0, borderLeft: window.innerWidth < 700 ? "none" : "1px solid var(--br)", borderTop: window.innerWidth < 700 ? "1px solid var(--br)" : "none", padding: "14px 11px", background: "var(--s1)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label className="lbl">Description</label><textarea className="txa" value={tmpl.description || ""} onChange={e => setTmpl(t => ({ ...t, description: e.target.value }))} style={{ fontSize: 11, minHeight: 60 }} /></div>
            <div><label className="lbl">Accent Color</label>
              <input type="color" value={tmpl.color || "#5ba3f5"} onChange={e => setTmpl(t => ({ ...t, color: e.target.value }))} style={{ width: "100%", height: 34, border: "1px solid var(--br)", borderRadius: 7, background: "var(--s3)", cursor: "pointer", padding: 2 }} />
            </div>
            <div style={{ height: 1, background: "var(--br)" }} />
            <div className="mono" style={{ fontSize: 9, color: "var(--t3)" }}>
              {tmpl.fields.length} field{tmpl.fields.length !== 1 ? "s" : ""} placed<br />
              {[...new Set(tmpl.fields.map(f => f.signerRole).filter(Boolean))].length} signer role{[...new Set(tmpl.fields.map(f => f.signerRole).filter(Boolean))].length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD DOCUMENT MODAL — PART 2
// Option A: Use a Template
// Option B: Upload PDF Directly
// ─────────────────────────────────────────────────────────────────────────────
function AddDocumentModal({ proj, companyId, onSave, onClose }) {
  const [step, setStep] = useState("choose"); // choose | templateList | compose | upload | uploadFields
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tmpl, setTmpl] = useState(null);
  const [docName, setDocName] = useState("");
  const [saving, setSaving] = useState(false);
  const co = loadCoInfo();

  // Upload direct state
  const [uploadPdf, setUploadPdf] = useState(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadFields, setUploadFields] = useState([]);
  const [uploadDims, setUploadDims] = useState({});
  const [uploadPage, setUploadPage] = useState(1);
  const [uploadPageCount, setUploadPageCount] = useState(1);
  const [addMode, setAddMode] = useState(null);
  const [selFld, setSelFld] = useState(null);
  const wrapRef = useRef();
  const fileRef = useRef();

  useEffect(() => {
    if (step === "templateList" && companyId) {
      setLoading(true);
      fsLoadTemplates(companyId).then(t => { setTemplates(t); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [step, companyId]);

  const selectTemplate = t => {
    setTmpl(t);
    setDocName(`${t.name} — ${proj?.name || ""}`);
    setStep("compose");
  };

  const createFromTemplate = async () => {
    if (!tmpl || !companyId || !proj?.id) return;
    setSaving(true);
    try {
      const signingToken = uuid();
      const fields = (tmpl.fields || []).map(f => {
        const field = { ...f, fieldId: f.fieldId || uid() };
        if (f.dataKey && f.dataKey !== "custom") {
          field.prefillValue = resolveDataKey(f.dataKey, proj, co);
        }
        return field;
      });
      const docData = {
        name: docName.trim() || "Untitled",
        templateId: tmpl.templateId,
        templateName: tmpl.name,
        pdfBase64: tmpl.pdfBase64 || tmpl.pdfData || "",
        pageCount: tmpl.pageCount || 1,
        fields,
        status: "draft",
        signingToken,
        signingUrl: `https://job-dox.ai/sign/${signingToken}`,
        projectId: proj.id,
        projectName: proj.name || "",
        companyId,
        values: {},
        createdAt: new Date().toISOString(),
      };
      // Pre-fill values
      fields.forEach(f => {
        if (f.prefillValue) {
          docData.values[f.fieldId] = { text: f.prefillValue };
        }
      });
      const docId = await fsSaveProjectDocument(companyId, proj.id, docData);
      onSave({ ...docData, documentId: docId });
      onClose();
    } catch (e) {
      alert("Failed to create document: " + e.message);
    }
    setSaving(false);
  };

  // Upload PDF directly handlers
  const handleUploadPdf = async e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("PDF must be under 10 MB."); return; }
    const reader = new FileReader();
    reader.onload = async ev => {
      const b64 = ev.target.result;
      const count = await getPdfPageCount(b64);
      setUploadPdf(b64);
      setUploadPageCount(count);
      setUploadName(file.name.replace(/\.pdf$/i, ""));
      setStep("uploadFields");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleUploadCanvasClick = e => {
    if (!addMode || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const pgDims = uploadDims[uploadPage];
    if (!pgDims) return;
    const x = (e.clientX - r.left) / pgDims.w;
    const y = (e.clientY - r.top) / pgDims.h;
    const d = FIELD_DEFAULTS[addMode] || { w: .3, h: .05 };
    const f = {
      id: uid(), fieldId: uid(), type: addMode,
      label: addMode === "signature" ? "Signature" : addMode,
      page: uploadPage,
      x: Math.max(0, Math.min(1 - d.w, x)),
      y: Math.max(0, Math.min(1 - d.h, y)),
      w: d.w, h: d.h, width: d.w, height: d.h,
      signerRole: "customer", dataKey: null, required: true,
    };
    setUploadFields(prev => [...prev, f]);
    setSelFld(f.id); setAddMode(null);
  };

  const saveDirectUpload = async () => {
    if (!uploadPdf || !companyId || !proj?.id) return;
    if (uploadFields.filter(f => f.type === "signature").length === 0) {
      alert("Please place at least one signature field on the document.");
      return;
    }
    setSaving(true);
    try {
      const signingToken = uuid();
      const docData = {
        name: uploadName.trim() || "Uploaded Document",
        templateId: null,
        templateName: "Direct Upload",
        pdfBase64: uploadPdf,
        pageCount: uploadPageCount,
        fields: uploadFields,
        status: "draft",
        signingToken,
        signingUrl: `https://job-dox.ai/sign/${signingToken}`,
        projectId: proj.id,
        projectName: proj.name || "",
        companyId,
        values: {},
        createdAt: new Date().toISOString(),
      };
      const docId = await fsSaveProjectDocument(companyId, proj.id, docData);
      onSave({ ...docData, documentId: docId });
      onClose();
    } catch (e) {
      alert("Failed to save document: " + e.message);
    }
    setSaving(false);
  };

  const uploadPages = Array.from({ length: uploadPageCount }, (_, i) => i + 1);

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg anim" style={{ maxWidth: step === "uploadFields" ? 900 : 600, width: "97vw", maxHeight: "96vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-hd">
          <div>
            <div className="modal-ttl">{step === "choose" ? "Add Document" : step === "templateList" ? "Choose Template" : step === "compose" ? tmpl?.name : "Place Signature Fields"}</div>
            {proj?.name && <div className="mono" style={{ fontSize: 9, color: "var(--t3)", marginTop: 2 }}>{proj.name}</div>}
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{Di.close}</button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflow: "auto" }}>
          {/* Step: choose method */}
          {step === "choose" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button onClick={() => setStep("templateList")}
                style={{ background: "var(--s3)", border: "1px solid var(--br)", borderRadius: 12, padding: 24, cursor: "pointer", textAlign: "center", fontFamily: "var(--ui)", transition: "all .12s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--acc)"; e.currentTarget.style.background = "var(--acc-lo)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--br)"; e.currentTarget.style.background = "var(--s3)"; }}>
                <div style={{ color: "var(--acc)", marginBottom: 8 }}>{Di.template}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t1)", marginBottom: 4 }}>Use a Template</div>
                <div style={{ fontSize: 10, color: "var(--t3)", lineHeight: 1.5 }}>Select from your saved document templates with pre-configured fields</div>
              </button>
              <button onClick={() => { fileRef.current?.click(); }}
                style={{ background: "var(--s3)", border: "1px solid var(--br)", borderRadius: 12, padding: 24, cursor: "pointer", textAlign: "center", fontFamily: "var(--ui)", transition: "all .12s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.background = "rgba(91,163,245,.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--br)"; e.currentTarget.style.background = "var(--s3)"; }}>
                <div style={{ color: "var(--blue)", marginBottom: 8 }}>{Di.upload}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t1)", marginBottom: 4 }}>Upload PDF Directly</div>
                <div style={{ fontSize: 10, color: "var(--t3)", lineHeight: 1.5 }}>Upload a PDF and mark signature areas on it</div>
              </button>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleUploadPdf} />
            </div>
          )}

          {/* Step: template list */}
          {step === "templateList" && (
            <>
              {loading && <div style={{ textAlign: "center", padding: 32 }}><Spin size={20} color="var(--t2)" /></div>}
              {!loading && templates.length === 0 && (
                <div className="empty" style={{ padding: 32 }}>
                  {Di.template}
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--t1)" }}>No templates yet</div>
                  <div style={{ fontSize: 11, color: "var(--t3)", maxWidth: 320, textAlign: "center", lineHeight: 1.65 }}>
                    Create a template first in Settings → Advanced Tools → Document Templates.
                  </div>
                </div>
              )}
              {!loading && templates.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                  {templates.map(t => (
                    <button key={t.templateId} onClick={() => selectTemplate(t)}
                      style={{ background: "var(--s3)", border: "1px solid var(--br)", borderRadius: 10, padding: 14, cursor: "pointer", textAlign: "left", fontFamily: "var(--ui)", transition: "all .12s", display: "flex", flexDirection: "column", gap: 6 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--br-hi)"; e.currentTarget.style.background = "var(--s4)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--br)"; e.currentTarget.style.background = "var(--s3)"; }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${t.color || "var(--blue)"}18`, color: t.color || "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>{Di.doc}</div>
                        <div style={{ fontWeight: 700, fontSize: 12, color: "var(--t1)" }}>{t.name}</div>
                      </div>
                      {t.description && <div style={{ fontSize: 10, color: "var(--t3)", lineHeight: 1.5 }}>{t.description}</div>}
                      <div className="mono" style={{ fontSize: 9, color: "var(--t3)" }}>{t.fields?.length || 0} FIELDS · {t.pageCount || 1} PAGE{(t.pageCount || 1) !== 1 ? "S" : ""}</div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Step: compose from template */}
          {step === "compose" && tmpl && (
            <>
              <div><label className="lbl">Document Title</label><input className="inp" value={docName} onChange={e => setDocName(e.target.value)} /></div>
              <div style={{ padding: "8px 11px", background: "rgba(91,163,245,.06)", border: "1px solid rgba(91,163,245,.18)", borderRadius: 6, fontSize: 10, color: "var(--blue)", lineHeight: 1.6, display: "flex", gap: 8, alignItems: "flex-start", marginTop: 8 }}>
                {Di.info} This document will be created as a draft. Project data fields will be auto-populated. Use "Send for Signature" to share the signing link.
              </div>
            </>
          )}

          {/* Step: upload field placement */}
          {step === "uploadFields" && uploadPdf && (
            <div style={{ display: "flex", flexDirection: window.innerWidth < 600 ? "column" : "row", gap: 12 }}>
              <div style={{ width: window.innerWidth < 600 ? "100%" : 160, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                <div><label className="lbl">Document Name</label><input className="inp" value={uploadName} onChange={e => setUploadName(e.target.value)} style={{ fontSize: 11 }} /></div>
                <div style={{ height: 1, background: "var(--br)" }} />
                <div className="sec" style={{ marginBottom: 2 }}>Place Fields</div>
                {[{ type: "signature", label: "Signature", color: "var(--acc)" }, { type: "textInput", label: "Text", color: "var(--green)" }, { type: "date", label: "Date", color: "var(--purple)" }, { type: "checkbox", label: "Checkbox", color: "var(--amber)" }].map(ft => (
                  <button key={ft.type} onClick={() => setAddMode(addMode === ft.type ? null : ft.type)}
                    style={{ width: "100%", background: addMode === ft.type ? "var(--acc-lo)" : "var(--s3)", border: `1px solid ${addMode === ft.type ? "var(--acc)" : "var(--br)"}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--ui)", fontSize: 11, color: addMode === ft.type ? "var(--acc)" : "var(--t2)" }}>
                    <span style={{ color: addMode === ft.type ? "var(--acc)" : ft.color }}>{FIELD_ICONS[ft.type]}</span> {ft.label}
                  </button>
                ))}
                {addMode && <div style={{ fontSize: 10, color: "var(--amber)", lineHeight: 1.5 }}>Click on the PDF to place</div>}
                {uploadFields.length > 0 && (
                  <div className="mono" style={{ fontSize: 9, color: "var(--green)", marginTop: 4 }}>{uploadFields.length} field{uploadFields.length !== 1 ? "s" : ""} placed</div>
                )}
              </div>
              <div style={{ flex: 1, overflow: "auto", background: "#2a2d3a", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                {uploadPageCount > 1 && (
                  <div style={{ display: "flex", gap: 5 }}>
                    {uploadPages.map(p => <button key={p} onClick={() => setUploadPage(p)} className={`chip${uploadPage === p ? " on" : ""}`} style={{ fontSize: 10 }}>Page {p}</button>)}
                  </div>
                )}
                {uploadPages.map(p => (
                  <div key={p} style={{ display: uploadPage === p ? "block" : "none" }}>
                    <div ref={uploadPage === p ? wrapRef : null}
                      style={{ position: "relative", cursor: addMode ? "crosshair" : "default", display: "inline-block", borderRadius: 3, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,.4)" }}
                      onClick={uploadPage === p ? handleUploadCanvasClick : undefined}>
                      <PdfPageCanvas pdfData={uploadPdf} pageNum={p} width={Math.min(500, window.innerWidth - 40)} onDims={d => setUploadDims(prev => ({ ...prev, [p]: d }))} />
                      {uploadDims[p] && uploadFields.filter(f => f.page === p).map(f => (
                        <FieldBox key={f.id} field={f} dims={uploadDims[p]} value={{}} isMine={false}
                          editorMode selected={selFld === f.id} onSelect={setSelFld}
                          onMove={(id, patch) => setUploadFields(fs => fs.map(ff => ff.id === id ? { ...ff, ...patch } : ff))} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-ft">
          {step === "choose" && <button className="btn btn-ghost" onClick={onClose}>Cancel</button>}
          {step === "templateList" && (
            <>
              <button className="btn btn-ghost" onClick={() => setStep("choose")}>{Di.back} Back</button>
            </>
          )}
          {step === "compose" && (
            <>
              <button className="btn btn-ghost" onClick={() => setStep("templateList")}>{Di.back} Back</button>
              <button className="btn btn-primary" onClick={createFromTemplate} disabled={saving}>
                {saving ? <><Spin /> Creating...</> : <>{Di.doc} Create Document</>}
              </button>
            </>
          )}
          {step === "uploadFields" && (
            <>
              <button className="btn btn-ghost" onClick={() => setStep("choose")}>{Di.back} Back</button>
              <button className="btn btn-primary" onClick={saveDirectUpload} disabled={saving || uploadFields.filter(f => f.type === "signature").length === 0}>
                {saving ? <><Spin /> Saving...</> : <>{Di.doc} Save Document</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW MODAL — view document with all fields
// ─────────────────────────────────────────────────────────────────────────────
function PreviewModal({ docData, onClose }) {
  const [activePage, setActivePage] = useState(1);
  const [dims, setDims] = useState({});
  const pages = Array.from({ length: docData.pageCount || 1 }, (_, i) => i + 1);
  const pdfData = docData.pdfBase64 || docData.pdfData;

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--s1)", borderRadius: 14, padding: 20, maxWidth: 820, width: "96vw", maxHeight: "92vh", overflow: "auto", border: "1px solid var(--br)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, color: "var(--t1)", fontSize: 14 }}>{docData.name}</div>
            <div className="mono" style={{ fontSize: 9, color: "var(--t3)", marginTop: 2 }}>
              {docData.templateName || "Direct Upload"} · {(docData.status || "draft").toUpperCase()}
            </div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{Di.close}</button>
        </div>
        {!pdfData ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--t3)", fontSize: 12 }}>No PDF data available</div>
        ) : (
          <>
            {pages.length > 1 && (
              <div style={{ display: "flex", gap: 5, marginBottom: 12, flexWrap: "wrap" }}>
                {pages.map(p => <button key={p} onClick={() => setActivePage(p)} className={`chip${activePage === p ? " on" : ""}`} style={{ fontSize: 10 }}>Page {p}</button>)}
              </div>
            )}
            {pages.map(p => (
              <div key={p} style={{ display: activePage === p ? "block" : "none", overflowX: "auto", marginBottom: 14 }}>
                {p === 1 && <CompanyHeader width={Math.min(740, window.innerWidth - 40)} />}
                <div style={{ position: "relative", display: "inline-block", borderRadius: p === 1 ? "0 0 3px 3px" : 3, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,.3)" }}>
                  <PdfPageCanvas pdfData={pdfData} pageNum={p} width={Math.min(740, window.innerWidth - 40)} onDims={d => setDims(prev => ({ ...prev, [p]: d }))} />
                  {dims[p] && (docData.fields || []).filter(f => f.page === p).map(f => (
                    <FieldBox key={f.fieldId || f.id} field={f} dims={dims[p]} value={docData.values?.[f.fieldId || f.id]} isMine={false} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEND FOR SIGNATURE MODAL — copy link + SMS via Twilio
// ─────────────────────────────────────────────────────────────────────────────
function SendSignatureModal({ docData, companyId, proj, onClose }) {
  const [copied, setCopied] = useState(false);
  const [phone, setPhone] = useState(proj?.clientPhone || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [smsError, setSmsError] = useState(null);

  const signingUrl = docData.signingUrl || `https://job-dox.ai/sign/${docData.signingToken}`;

  const copyLink = () => {
    navigator.clipboard?.writeText(signingUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };

  const sendSms = async () => {
    if (!phone.trim()) return;
    setSending(true); setSmsError(null);
    try {
      // Read Twilio number from phone settings in localStorage
      let fromNumber = "";
      try { const ps = JSON.parse(localStorage.getItem("jd_phone_settings") || "{}"); fromNumber = ps.twilioNumber || ""; } catch {}
      if (!fromNumber) {
        // Try reading from Firestore phone settings doc
        try {
          const psSnap = await getDoc(doc(getDb(), "companies", companyId, "settings", "phone"));
          if (psSnap.exists()) fromNumber = psSnap.data().twilioNumber || "";
        } catch {}
      }
      if (!fromNumber) throw new Error("No Twilio number configured. Set it in Settings → Phone & Calls.");
      await callFn("send-sms", {
        companyId,
        to: phone.trim(),
        messageBody: `Your signature is requested on "${docData.name}". Sign here: ${signingUrl}`,
        from: fromNumber,
        contactName: proj?.client || proj?.clientName || "Customer",
        projectId: proj?.id,
      });
      setSent(true);
    } catch (e) {
      setSmsError(e.message);
    }
    setSending(false);
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal anim" style={{ width: '100%', maxWidth: 480 }}>
        <div className="modal-hd">
          <div><div className="modal-ttl">Send for Signature</div><div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{docData.name}</div></div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{Di.close}</button>
        </div>
        <div className="modal-body">
          {/* Copy link */}
          <div style={{ marginBottom: 14 }}>
            <label className="lbl">Signing Link</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input className="inp" value={signingUrl} readOnly style={{ fontSize: 10, flex: 1 }} />
              <button className="btn btn-secondary btn-xs" onClick={copyLink}>
                {copied ? <>{Di.check} Copied</> : <>{Di.copy} Copy</>}
              </button>
            </div>
          </div>
          {/* SMS */}
          <div>
            <label className="lbl">Send via SMS</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input className="inp" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" style={{ flex: 1, fontSize: 11 }} />
              <button className="btn btn-primary btn-xs" onClick={sendSms} disabled={sending || sent || !phone.trim()}>
                {sending ? <Spin /> : sent ? <>{Di.check} Sent</> : <>{Di.sms} Send SMS</>}
              </button>
            </div>
            {smsError && <div style={{ fontSize: 10, color: "var(--acc)", marginTop: 4 }}>{smsError}</div>}
            {sent && <div style={{ fontSize: 10, color: "var(--green)", marginTop: 4 }}>SMS sent successfully</div>}
          </div>
        </div>
        <div className="modal-ft">
          <button className="btn btn-ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT TEMPLATE CENTER  (for AdvToolsPanel) — PART 1
// ─────────────────────────────────────────────────────────────────────────────
export function DocumentTemplateCenter({ onClose }) {
  const [templates, setTemplates] = useState([]);
  const [editTmpl, setEditTmpl] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    if (!_docsCompanyId) return;
    setLoading(true);
    fsLoadTemplates(_docsCompanyId).then(t => { setTemplates(t); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const deleteTemplate = async id => {
    if (!window.confirm("Delete this template? Documents already created from it will keep their PDF.")) return;
    try {
      await fsDeleteTemplate(_docsCompanyId, id);
      reload();
    } catch (e) { alert("Failed to delete: " + e.message); }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {showBuilder && (
        <TemplateBuilderModal
          existing={editTmpl}
          companyId={_docsCompanyId}
          onSave={() => reload()}
          onClose={() => { setShowBuilder(false); setEditTmpl(null); reload(); }}
        />
      )}

      <div style={{ padding: "15px 18px", borderBottom: "1px solid var(--br)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--t1)" }}>Document Templates</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--t3)", marginTop: 1 }}>UPLOAD A PDF, PLACE SIGNATURE FIELDS</div>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          {onClose && <button className="btn btn-ghost btn-xs" onClick={onClose}>{Di.close}</button>}
          <button className="btn btn-primary btn-xs" onClick={() => { setEditTmpl(null); setShowBuilder(true); }}>{Di.plus} New Template</button>
        </div>
      </div>

      <div className="scroll">
        {loading && <div style={{ textAlign: "center", padding: 40 }}><Spin size={20} color="var(--t2)" /></div>}
        {!loading && templates.length === 0 && (
          <div className="empty">
            {Di.template}
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--t1)" }}>No templates yet</div>
            <div style={{ fontSize: 11, color: "var(--t3)", maxWidth: 340, lineHeight: 1.65, textAlign: "center" }}>
              Upload any PDF — a contract, work authorization, change order — then click to place signature, initials, text, and date fields exactly where you need them.
            </div>
            <button className="btn btn-primary" onClick={() => { setEditTmpl(null); setShowBuilder(true); }}>{Di.plus} Create First Template</button>
          </div>
        )}
        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 500 ? "1fr" : "repeat(auto-fill,minmax(260px,1fr))", gap: 10, padding: 18 }}>
            {templates.map(t => (
              <div key={t.templateId} className="card" style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: `${t.color || "var(--blue)"}18`, color: t.color || "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Di.doc}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "var(--t1)" }}>{t.name}</div>
                    {t.description && <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
                  <span className="mono" style={{ fontSize: 9, background: "rgba(91,163,245,.1)", color: "var(--blue)", borderRadius: 20, padding: "2px 9px" }}>{t.fields?.length || 0} FIELDS</span>
                  <span className="mono" style={{ fontSize: 9, background: "var(--s3)", color: "var(--t3)", borderRadius: 20, padding: "2px 9px" }}>{t.pageCount || 1} PAGE{(t.pageCount || 1) !== 1 ? "S" : ""}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="btn btn-secondary btn-xs" style={{ flex: 1 }} onClick={() => { setEditTmpl(t); setShowBuilder(true); }}>{Di.eye} Edit</button>
                  <button className="btn btn-ghost btn-xs" style={{ color: "var(--acc)" }} onClick={() => deleteTemplate(t.templateId)}>{Di.trash}</button>
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
// LOGO UPLOAD SECTION  (for GeneralSettingsTab)
// ─────────────────────────────────────────────────────────────────────────────
export function LogoUploadSection({ coInfo, setCoInfo }) {
  const fileRef = useRef();
  const [saved, setSaved] = useState(false);

  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Logo must be under 2MB."); return; }
    const r = new FileReader();
    r.onload = ev => {
      const u = { ...coInfo, logo: ev.target.result };
      setCoInfo(u); saveCoInfo(u); setSaved(true); setTimeout(() => setSaved(false), 2500);
    };
    r.readAsDataURL(file); e.target.value = "";
  };

  return (
    <div style={{ marginBottom: 16, padding: "14px 16px", background: "var(--s3)", borderRadius: 9, border: "1px solid var(--br)" }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: "var(--t1)", marginBottom: 2 }}>Company Logo</div>
      <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 12, lineHeight: 1.6 }}>Appears on documents and reports.</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 90, height: 56, borderRadius: 7, border: `1.5px dashed ${coInfo?.logo ? "var(--green)" : "var(--br)"}`, background: "var(--s2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
          {coInfo?.logo
            ? <img src={coInfo.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
            : <div style={{ fontSize: 10, color: "var(--t3)", textAlign: "center", lineHeight: 1.5 }}>No logo</div>}
        </div>
        <div>
          <div style={{ display: "flex", gap: 7, marginBottom: 6 }}>
            <button className="btn btn-secondary btn-xs" style={{minHeight:44}} onClick={() => fileRef.current?.click()}>{Di.upload} Upload Logo</button>
            {coInfo?.logo && <button className="btn btn-ghost btn-xs" style={{ color: "var(--acc)" }} onClick={() => { const u = { ...coInfo, logo: "" }; setCoInfo(u); saveCoInfo(u); }}>Remove</button>}
            {saved && <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 600, alignSelf: "center" }}>Saved</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" style={{ display: "none" }} onChange={handleFile} />
          <div style={{ fontSize: 10, color: "var(--t3)" }}>PNG, JPG or SVG · Max 2 MB</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF QUICK-SIGN MODAL — sign any PDF without a template
// ─────────────────────────────────────────────────────────────────────────────
export function PdfQuickSignModal({ pdfData, docName = "Document", signerName = "", signerEmail = "", existingSignatures = [], onSave, onClose }) {
  const [pageCount, setPageCount] = useState(1);
  const [activePage, setActivePage] = useState(1);
  const [dims, setDims] = useState({});
  const [sigData, setSigData] = useState(null);
  const [placedSigs, setPlacedSigs] = useState([]);
  const [placingMode, setPlacingMode] = useState(false);
  const [geo, setGeo] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoAsked, setGeoAsked] = useState(false);
  const [nameInput, setNameInput] = useState(signerName);
  const [emailInput, setEmailInput] = useState(signerEmail);
  const wrapRef = useRef();

  useEffect(() => {
    if (!pdfData) return;
    getPdfPageCount(pdfData).then(n => setPageCount(n)).catch(() => {});
  }, [pdfData]);

  const requestGeo = () => {
    setGeoLoading(true);
    if (!navigator.geolocation) { setGeo({ lat: "unavailable", lng: "unavailable" }); setGeoLoading(false); setGeoAsked(true); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setGeo({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }); setGeoLoading(false); setGeoAsked(true); },
      () => { setGeo({ lat: "unavailable", lng: "unavailable" }); setGeoLoading(false); setGeoAsked(true); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleCanvasClick = e => {
    if (!placingMode || !sigData || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const pgDims = dims[activePage];
    if (!pgDims) return;
    const x = (e.clientX - r.left) / pgDims.w;
    const y = (e.clientY - r.top) / pgDims.h;
    const sig = {
      id: uid(), page: activePage,
      x: Math.max(0, Math.min(0.65, x)), y: Math.max(0, Math.min(0.92, y)),
      w: 0.35, h: 0.075,
      data: sigData, timestamp: new Date().toISOString(),
      lat: geo?.lat || "unavailable", lng: geo?.lng || "unavailable",
      signerName: nameInput || "", signerEmail: emailInput || "",
    };
    setPlacedSigs(prev => [...prev, sig]);
    setPlacingMode(false);
  };

  const removeSig = id => setPlacedSigs(prev => prev.filter(s => s.id !== id));

  const handleSave = () => {
    if (placedSigs.length === 0) { alert("Please place at least one signature on the PDF."); return; }
    onSave({ signatures: placedSigs, signedAt: new Date().toISOString(), geo, signerName: nameInput || "", signerEmail: emailInput || "" });
  };

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  if (!pdfData) return null;

  return (
    <div className="overlay" style={{ position: "fixed", inset: 0, background: "rgba(6,7,13,.94)", backdropFilter: "blur(6px)", zIndex: 2000, display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto", padding: 20 }}>
      <div className="modal modal-lg" style={{ width: "100%", maxWidth: 860, display: "flex", flexDirection: "column", alignItems: "center", background: "transparent", border: "none", boxShadow: "none", boxSizing: "border-box" }}>
      <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexShrink: 0 }}>
        <div>
          <div style={{ color: "var(--t1)", fontWeight: 800, fontSize: 16 }}>Sign: {docName}</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--t3)", marginTop: 2 }}>DRAW YOUR SIGNATURE BELOW, THEN CLICK ON THE PDF TO PLACE IT</div>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{Di.close} Cancel</button>
          <button className="btn btn-primary btn-xs" onClick={handleSave} disabled={placedSigs.length === 0}>{Di.check} Save Signed Document</button>
        </div>
      </div>
      {!geoAsked && (
        <div className="card anim" style={{ maxWidth: 420, width: "100%", padding: 28, textAlign: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "center", color: "var(--t2)", marginBottom: 10 }}>{Di.pin}</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--t1)", marginBottom: 8 }}>Location Verification</div>
          <div style={{ fontSize: 11, color: "var(--t2)", lineHeight: 1.75, marginBottom: 20 }}>
            Job-Dox can record GPS coordinates with your signature for verification purposes.
          </div>
          {geoLoading
            ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--amber)", fontSize: 11 }}><Spin color="var(--amber)" /> Requesting location...</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-primary" onClick={requestGeo}>Allow Location Access</button>
              <button className="btn btn-ghost btn-xs" onClick={() => { setGeo({ lat: "unavailable", lng: "unavailable" }); setGeoAsked(true); }}>Skip</button>
            </div>}
        </div>
      )}
      {geoAsked && (
        <>
          <div style={{ width: "100%", maxWidth: 860, marginBottom: 14, background: "var(--s2)", borderRadius: 10, border: "1px solid var(--br)", padding: 16 }}>
            <SignaturePad label="Draw your signature" height={100} onCapture={d => setSigData(d)} onClear={() => setSigData(null)} />
            {sigData && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                <button className={`btn ${placingMode ? "btn-primary" : "btn-secondary"} btn-xs`} onClick={() => setPlacingMode(!placingMode)}>
                  {placingMode ? "Click on PDF to place ↓" : `Place Signature on PDF`}
                </button>
              </div>
            )}
          </div>
          {placedSigs.length > 0 && (
            <div style={{ width: "100%", maxWidth: 860, marginBottom: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {placedSigs.map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(26,217,138,.08)", border: "1px solid rgba(26,217,138,.28)", borderRadius: 8, padding: "5px 10px" }}>
                  <span style={{ color: "var(--green)", fontSize: 10, fontWeight: 700 }}>{Di.check} Signature {i + 1} — Page {s.page}</span>
                  <button onClick={() => removeSig(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--acc)", fontSize: 10, padding: 0 }}>{Di.close}</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ width: "100%", maxWidth: 860 }}>
            {pages.map(p => (
              <div key={p} style={{ display: activePage === p ? "block" : "none", overflowX: "auto" }}>
                <div ref={activePage === p ? wrapRef : null}
                  style={{ position: "relative", cursor: placingMode ? "crosshair" : "default", display: "inline-block", borderRadius: 3, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,.5)" }}
                  onClick={activePage === p ? handleCanvasClick : undefined}>
                  <PdfPageCanvas pdfData={pdfData} pageNum={p} width={Math.min(720, window.innerWidth - 40)} onDims={d => setDims(prev => ({ ...prev, [p]: d }))} />
                  {dims[p] && placedSigs.filter(s => s.page === p).map(s => (
                    <div key={s.id} style={{ position: "absolute", left: s.x * dims[p].w, top: s.y * dims[p].h, width: s.w * dims[p].w, height: s.h * dims[p].h, border: "2px solid var(--green)", borderRadius: 5, background: "rgba(26,217,138,.05)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      <img src={s.data} alt="Signature" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS TAB — PART 4 — main export for project documents panel
// Shows documents with status badges, send/view/download actions
// ─────────────────────────────────────────────────────────────────────────────
export function DocumentsTab({ proj, companyId, embedded }) {
  const cid = companyId || _docsCompanyId;
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [preview, setPreview] = useState(null);
  const [sendModal, setSendModal] = useState(null);
  const [filter, setFilter] = useState("all");
  const [inPersonSignDoc, setInPersonSignDoc] = useState(null);

  const reload = () => {
    if (!cid || !proj?.id) { setLoading(false); return; }
    setLoading(true);
    fsLoadProjectDocuments(cid, proj.id).then(d => { setDocs(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [cid, proj?.id]);

  const deleteDocument = async (docId) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await fsDeleteProjectDocument(cid, proj.id, docId);
      reload();
    } catch (e) { alert("Failed to delete: " + e.message); }
  };

  const downloadPdf = async (docData) => {
    try {
      const res = await callFn("flatten-pdf", {
        companyId: cid,
        projectId: proj?.id,
        documentId: docData.documentId,
      });
      if (res.pdfBase64) {
        const link = document.createElement("a");
        link.href = res.pdfBase64;
        link.download = (docData.name || "document") + "-signed.pdf";
        link.click();
      } else {
        // Fallback: download raw PDF
        const pdfData = docData.pdfBase64 || docData.pdfData;
        if (pdfData) {
          const link = document.createElement("a");
          link.href = pdfData;
          link.download = (docData.name || "document") + ".pdf";
          link.click();
        }
      }
    } catch {
      // Fallback: download raw PDF without flatten
      const pdfData = docData.pdfBase64 || docData.pdfData;
      if (pdfData) {
        const link = document.createElement("a");
        link.href = pdfData;
        link.download = (docData.name || "document") + ".pdf";
        link.click();
      }
    }
  };

  const filtered = filter === "all" ? docs : docs.filter(d => (d.status || "draft") === filter);
  const FILTERS = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "sent", label: "Sent" },
    { key: "signed", label: "Signed" },
  ];

  return (
    <div className={embedded ? "" : "scroll"}>
      {showAdd && <AddDocumentModal proj={proj} companyId={cid} onSave={() => reload()} onClose={() => { setShowAdd(false); reload(); }} />}
      {preview && <PreviewModal docData={preview} onClose={() => setPreview(null)} />}
      {sendModal && <SendSignatureModal docData={sendModal} companyId={cid} proj={proj} onClose={() => { setSendModal(null); reload(); }} />}

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div className="sec" style={{ margin: 0 }}>Documents</div>
            {docs.length > 0 && <span className="mono" style={{ fontSize: 9, color: "var(--t3)" }}>{docs.length}</span>}
          </div>
          <button className="btn btn-primary btn-xs" style={{minHeight:44}} onClick={() => setShowAdd(true)}>{Di.plus} Add Document</button>
        </div>

        {docs.length > 1 && (
          <div style={{ display: "flex", gap: 5, marginBottom: 13, flexWrap: "wrap" }}>
            {FILTERS.map(f => <button key={f.key} onClick={() => setFilter(f.key)} className={`chip${filter === f.key ? " on" : ""}`}>{f.label}</button>)}
          </div>
        )}

        {loading && <div style={{ textAlign: "center", padding: 40 }}><Spin size={20} color="var(--t2)" /></div>}

        {!loading && docs.length === 0 && (
          <div className="empty">
            <div style={{ color: "var(--t3)" }}>{Di.doc}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--t1)" }}>No documents yet</div>
            <div style={{ fontSize: 11, color: "var(--t3)", maxWidth: 340, lineHeight: 1.65, textAlign: "center" }}>
              Add a document from a template or upload a PDF directly to get started with digital signatures.
            </div>
            <button className="btn btn-primary btn-xs" onClick={() => setShowAdd(true)}>{Di.plus} Add Document</button>
          </div>
        )}

        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        {!loading && filtered.map(docData => {
          const st = docData.status || "draft";
          const meta = STATUS_META[st] || STATUS_META.draft;
          return (
            <div key={docData.documentId} className="row" style={{ marginBottom: 6, padding: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: `${meta.color}18`, color: meta.color, display: "flex", alignItems: "center", justifyContent: "center" }}>{Di.doc}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{docData.name}</span>
                    <span className="mono" style={{ fontSize: 9, background: meta.bg, color: meta.color, borderRadius: 20, padding: "2px 9px", flexShrink: 0 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.color, display: "inline-block", marginRight: 4 }} />
                      {meta.label.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span>{docData.templateName || "Direct Upload"}</span>
                    <span>{docData.createdAt ? new Date(docData.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</span>
                    {docData.signedAt && <span style={{ color: "var(--green)" }}>Signed {new Date(docData.signedAt).toLocaleDateString("en-US")}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                  {st !== "signed" && (
                    <button className="btn btn-secondary btn-xs" onClick={() => setSendModal(docData)}>{Di.send} Send</button>
                  )}
                  <button className="btn btn-ghost btn-xs" title="Preview" onClick={() => setPreview(docData)}>{Di.eye}</button>
                  {st === "draft" && docData.fields?.some(f => (f.signerRole === "customer" || f.signerRole === "both") && (f.type === "signature" || f.type === "initials")) && (
                    <button className="btn btn-secondary btn-xs" onClick={() => setInPersonSignDoc(docData)}>{Di.pen} Sign In Person</button>
                  )}
                  <button className="btn btn-ghost btn-xs" title="Download" onClick={() => downloadPdf(docData)}>{Di.download}</button>
                  <button className="btn btn-ghost btn-xs" style={{ color: "var(--acc)" }} onClick={() => deleteDocument(docData.documentId)}>{Di.trash}</button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
      {inPersonSignDoc && (
        <JobDoxInPersonSign
          document={inPersonSignDoc}
          project={proj}
          companyId={cid}
          onComplete={(savedDoc) => {
            setDocs(prev => prev.map(d => d.documentId === savedDoc.documentId ? savedDoc : d));
            setInPersonSignDoc(null);
          }}
          onCancel={() => setInPersonSignDoc(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC SIGNING PAGE — PART 3
// Accessible at /sign/{signingToken} — no login required
// ─────────────────────────────────────────────────────────────────────────────
export function PublicSigningPage({ token }) {
  const [loading, setLoading] = useState(true);
  const [docData, setDocData] = useState(null);
  const [error, setError] = useState(null);
  const [values, setValues] = useState({});
  const [activeField, setActiveField] = useState(null);
  const [sigData, setSigData] = useState(null);
  const [textDraft, setTextDraft] = useState("");
  const [activePage, setActivePage] = useState(1);
  const [dims, setDims] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Load document by token
  useEffect(() => {
    if (!token) { setError("No signing token provided."); setLoading(false); return; }
    (async () => {
      try {
        const result = await fsLookupBySigningToken(token);
        if (!result) {
          setError("This signing link is invalid or has expired.");
          setLoading(false);
          return;
        }
        if (result.status === "signed") {
          setError("This document has already been signed.");
          setLoading(false);
          return;
        }
        setDocData(result);
        // Pre-fill values from document
        const v = {};
        (result.fields || []).forEach(f => {
          const fid = f.fieldId || f.id;
          if (result.values?.[fid]) {
            v[fid] = result.values[fid];
          } else if (f.prefillValue) {
            v[fid] = { text: f.prefillValue };
          } else if (f.type === "date") {
            v[fid] = { text: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) };
          }
        });
        setValues(v);
        setLoading(false);
      } catch (e) {
        setError("Failed to load document: " + e.message);
        setLoading(false);
      }
    })();
  }, [token]);

  const pdfData = docData?.pdfBase64 || docData?.pdfData;
  const fields = docData?.fields || [];
  const pages = docData ? Array.from({ length: docData.pageCount || 1 }, (_, i) => i + 1) : [];

  const requiredFields = fields.filter(f => f.required !== false);
  const allRequiredDone = requiredFields.every(f => {
    const v = values[f.fieldId || f.id];
    return !!v?.data || !!v?.text || v?.checked;
  });

  const handleFieldTap = f => {
    setActiveField(f);
    setSigData(null);
    setTextDraft(values[f.fieldId || f.id]?.text || "");
  };

  const applyValue = val => {
    if (!activeField) return;
    const fid = activeField.fieldId || activeField.id;
    setValues(v => ({ ...v, [fid]: val }));
    setActiveField(null);
  };

  const handleSubmit = async () => {
    if (!allRequiredDone || !docData) return;
    setSubmitting(true);
    try {
      // Get signer IP via Netlify function
      let signerIp = "unavailable";
      try {
        const ipRes = await fetch("/.netlify/functions/get-ip");
        const ipJson = await ipRes.json();
        signerIp = ipJson.ip || "unavailable";
      } catch {}

      // Update document in Firestore
      const ref = doc(getDb(), "companies", docData.companyId, "projects", docData.projectId, "documents", docData.documentId);
      await updateDoc(ref, {
        values: values,
        status: "signed",
        signedAt: serverTimestamp(),
        signerIp,
        signerUserAgent: navigator.userAgent,
        updatedAt: serverTimestamp(),
      });

      setSubmitted(true);
    } catch (e) {
      alert("Failed to submit: " + e.message);
    }
    setSubmitting(false);
  };

  // Confirmation screen
  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: "#06070d", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 500, width: "100%" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(26,217,138,.15)", border: "2px solid rgba(26,217,138,.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#1ad98a" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
          </div>
          <div style={{ fontWeight: 800, fontSize: 22, color: "#eef1f8", marginBottom: 8 }}>Thank You</div>
          <div style={{ fontSize: 14, color: "#8b95b0", lineHeight: 1.7, marginBottom: 20 }}>
            Your document has been signed successfully. A copy will be available to the sending company.
          </div>
          <div style={{ fontSize: 11, color: "#404866", marginTop: 20 }}>Powered by Job-Dox</div>
        </div>
      </div>
    );
  }

  // Loading / error states
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#06070d", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ textAlign: "center", color: "#8b95b0" }}>
          <Spin size={24} color="#8b95b0" />
          <div style={{ marginTop: 12, fontSize: 13 }}>Loading document...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#06070d", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 400, color: "#8b95b0" }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: .3 }}>📄</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#eef1f8", marginBottom: 8 }}>Document Not Available</div>
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>{error}</div>
          <div style={{ fontSize: 11, color: "#404866", marginTop: 20 }}>Powered by Job-Dox</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#06070d", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 12px", fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 800, marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: "#eef1f8" }}>{docData.name}</div>
        <div style={{ fontSize: 11, color: "#404866", marginTop: 2, fontFamily: "'Space Mono', monospace" }}>
          {docData.projectName && `PROJECT: ${docData.projectName} · `}PLEASE REVIEW AND SIGN BELOW
        </div>
      </div>

      {/* Field input popup */}
      {activeField && (
        <div style={{ width: "100%", maxWidth: 800, marginBottom: 14, background: "#10121e", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#eef1f8", marginBottom: 12 }}>{activeField.label || activeField.type}</div>

          {(activeField.type === "signature" || activeField.type === "initials") && (
            <>
              <SignaturePad
                label={activeField.type === "initials" ? "Draw your initials" : "Draw your full signature"}
                height={activeField.type === "initials" ? 80 : 120}
                onCapture={setSigData} onClear={() => setSigData(null)}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={() => setActiveField(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "transparent", color: "#8b95b0", cursor: "pointer", fontSize: 12, fontFamily: "'Outfit', sans-serif" }}>Cancel</button>
                <button disabled={!sigData} onClick={() => applyValue({ data: sigData, timestamp: new Date().toISOString() })}
                  style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: sigData ? "#e43531" : "#1c2035", color: "#fff", cursor: sigData ? "pointer" : "default", fontSize: 12, fontWeight: 700, fontFamily: "'Outfit', sans-serif", opacity: sigData ? 1 : .4 }}>
                  Apply
                </button>
              </div>
            </>
          )}

          {(activeField.type === "textInput" || activeField.type === "date") && (
            <>
              {activeField.type === "date"
                ? <input type="date" value={textDraft} onChange={e => setTextDraft(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "#0c0e18", color: "#eef1f8", fontSize: 13, fontFamily: "'Outfit', sans-serif", outline: "none" }} />
                : <input value={textDraft} onChange={e => setTextDraft(e.target.value)} placeholder={activeField.label}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "#0c0e18", color: "#eef1f8", fontSize: 13, fontFamily: "'Outfit', sans-serif", outline: "none" }} />
              }
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => setActiveField(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "transparent", color: "#8b95b0", cursor: "pointer", fontSize: 12, fontFamily: "'Outfit', sans-serif" }}>Cancel</button>
                <button disabled={!textDraft.trim()} onClick={() => applyValue({ text: textDraft.trim() })}
                  style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: textDraft.trim() ? "#e43531" : "#1c2035", color: "#fff", cursor: textDraft.trim() ? "pointer" : "default", fontSize: 12, fontWeight: 700, fontFamily: "'Outfit', sans-serif", opacity: textDraft.trim() ? 1 : .4 }}>
                  Apply
                </button>
              </div>
            </>
          )}

          {activeField.type === "checkbox" && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => setActiveField(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "transparent", color: "#8b95b0", cursor: "pointer", fontSize: 12, fontFamily: "'Outfit', sans-serif" }}>Cancel</button>
              <button onClick={() => applyValue({ checked: true })}
                style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "#e43531", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
                Check
              </button>
            </div>
          )}
        </div>
      )}

      {/* PDF + overlay */}
      {pdfData && !activeField && (
        <div style={{ width: "100%", maxWidth: 800 }}>
          {pages.length > 1 && (
            <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
              {pages.map(p => (
                <button key={p} onClick={() => setActivePage(p)}
                  style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${activePage === p ? "#e43531" : "rgba(255,255,255,.1)"}`, background: activePage === p ? "rgba(228,53,49,.1)" : "transparent", color: activePage === p ? "#e43531" : "#8b95b0", cursor: "pointer", fontSize: 10, fontFamily: "'Outfit', sans-serif" }}>
                  Page {p}
                </button>
              ))}
            </div>
          )}
          {pages.map(p => (
            <div key={p} style={{ display: activePage === p ? "block" : "none", overflowX: "auto" }}>
              <div style={{ position: "relative", display: "inline-block", borderRadius: 3, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,.5)" }}>
                <PdfPageCanvas pdfData={pdfData} pageNum={p} width={Math.min(780, window.innerWidth - 40)} onDims={d => setDims(prev => ({ ...prev, [p]: d }))} />
                {dims[p] && fields.filter(f => f.page === p).map(f => (
                  <FieldBox key={f.fieldId || f.id} field={f} dims={dims[p]} value={values[f.fieldId || f.id]}
                    isMine={true} onTap={handleFieldTap} highlightPending={!allRequiredDone} />
                ))}
              </div>
            </div>
          ))}

          {/* Submit button */}
          <div style={{ marginTop: 16, textAlign: "center" }}>
            {!allRequiredDone ? (
              <div style={{ padding: "12px 16px", background: "rgba(232,156,24,.08)", border: "1px solid rgba(232,156,24,.25)", borderRadius: 10, color: "#e89c18", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
                Tap the highlighted fields above to complete signing
              </div>
            ) : (
              <>
                <div style={{ padding: "12px 16px", background: "rgba(26,217,138,.08)", border: "1px solid rgba(26,217,138,.25)", borderRadius: 10, color: "#1ad98a", fontSize: 13, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                  All required fields complete
                </div>
                <button onClick={handleSubmit} disabled={submitting}
                  style={{ padding: "14px 40px", borderRadius: 10, border: "none", background: "#e43531", color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 800, fontFamily: "'Outfit', sans-serif", transition: "opacity .15s", opacity: submitting ? .6 : 1 }}>
                  {submitting ? "Submitting..." : "Submit & Sign"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: 30, fontSize: 10, color: "#404866", textAlign: "center" }}>
        Powered by <strong style={{ color: "#8b95b0" }}>Job-Dox</strong> · Secure Digital Signatures
      </div>
    </div>
  );
}
