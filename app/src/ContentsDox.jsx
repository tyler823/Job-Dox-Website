/**
 * ContentsDox.jsx
 * ─────────────────────────────────────────────────────────────────
 * Contents inventory + Schedule of Loss tool for Job-Dox Portal.
 *
 * Props:
 *   proj      – current project object from portal state
 *   companyId – Memberstack member ID (Firestore root key)
 *   db        – Firestore instance (passed from portal — do NOT re-init)
 *
 * Firestore paths:
 *   companies/{companyId}/projects/{proj.id}/contentsItems/{itemId}
 *   companies/{companyId}/projects/{proj.id}  ← contentsMeta field on project doc
 *
 * AI comparable search routes through /.netlify/functions/cortex-generate
 * Photos: React state only (v1). Firebase Storage is the v2 upgrade path.
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  collection, onSnapshot, setDoc, deleteDoc, doc, updateDoc, getDoc
} from "firebase/firestore";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject
} from "firebase/storage";

/* ═══════════════════════════════════════════════════════════════
   CSS — scoped to .cdox-* classes, injected once on mount
═══════════════════════════════════════════════════════════════ */
const CDOX_CSS = `
/* ── ContentsDox inner styles (portal-embedded) ── */
.cdox-scroll  { flex:1; overflow-y:auto; padding:20px; }
.cdox-mono    { font-family:var(--mono)!important; }
.cdox-lbl     { font-family:var(--mono)!important; font-size:9px; color:var(--t3);
                letter-spacing:.08em; text-transform:uppercase; display:block; margin-bottom:5px; }
.cdox-inp     { width:100%; background:var(--s3); border:1px solid var(--br); border-radius:7px;
                padding:8px 11px; font-size:12px; color:var(--t1); outline:none; font-family:var(--ui);
                box-sizing:border-box; min-width:0; }
.cdox-inp:focus { border-color:var(--acc); box-shadow:0 0 0 2px var(--acc-lo); }
.cdox-inp::placeholder { color:var(--t3); }
.cdox-sel     { width:100%; background:var(--s3); border:1px solid var(--br); border-radius:7px;
                padding:8px 11px; font-size:12px; color:var(--t1); outline:none; cursor:pointer; font-family:var(--ui); }
.cdox-txa     { width:100%; background:var(--s3); border:1px solid var(--br); border-radius:7px;
                padding:8px 11px; font-size:12px; color:var(--t1); outline:none; resize:vertical;
                min-height:60px; font-family:var(--ui); }
.cdox-card    { background:var(--s2); border:1px solid var(--br); border-radius:10px; padding:18px; }
.cdox-kpi     { background:var(--s2); border:1px solid var(--br); border-radius:8px; padding:12px 14px; }
.cdox-chip    { border-radius:20px; padding:4px 12px; font-size:11px; cursor:pointer;
                font-family:var(--ui); border:1px solid var(--br); background:transparent;
                color:var(--t3); transition:all .12s; white-space:nowrap; }
.cdox-chip.on { background:var(--acc); border-color:var(--acc); color:#fff; font-weight:600; }
.cdox-chip-sm { border-radius:20px; padding:3px 10px; font-size:10px; cursor:pointer;
                font-family:var(--ui); border:1px solid var(--br); background:transparent;
                color:var(--t3); transition:all .12s; }
.cdox-chip-sm.on { border-color:var(--acc); color:var(--t1); background:var(--acc-lo); }

/* Item rows */
.cdox-item-row        { background:var(--s2); border:1px solid var(--br); border-radius:8px;
                        margin-bottom:4px; overflow:hidden; transition:border-color .12s; }
.cdox-item-row:hover  { border-color:var(--br-hi); }
.cdox-item-hd         { display:grid;
                        grid-template-columns:28px 1fr 100px 90px 42px 90px 90px 22px;
                        gap:8px; align-items:center; padding:9px 12px; cursor:pointer; }
.cdox-item-body       { border-top:1px solid var(--br); padding:16px 14px; }
.cdox-item-num        { width:24px; height:24px; border-radius:5px; background:var(--s3);
                        color:var(--t3); display:flex; align-items:center; justify-content:center;
                        font-size:10px; font-family:var(--mono)!important; flex-shrink:0; }

/* Comparable research section */
.cdox-comp-section    { border-top:1px solid var(--br); padding-top:14px; margin-top:14px; }
.cdox-comp-hd         { display:flex; align-items:center; justify-content:space-between;
                        margin-bottom:12px; gap:8px; flex-wrap:wrap; }
.cdox-ai-card         { background:rgba(167,139,250,.06); border:1px solid rgba(167,139,250,.22);
                        border-radius:9px; padding:14px; margin-bottom:12px; animation:cdox-fadein .2s ease; }
.cdox-ai-comp-row     { background:var(--s3); border-radius:7px; padding:9px 11px;
                        display:flex; align-items:center; justify-content:space-between;
                        gap:8px; flex-wrap:wrap; margin-bottom:5px; }
.cdox-ai-comp-row:last-child { margin-bottom:0; }
.cdox-err-card        { background:rgba(228,53,49,.07); border:1px solid rgba(228,53,49,.2);
                        border-radius:8px; padding:10px 14px; margin-bottom:12px;
                        font-size:11px; color:var(--acc); }
.cdox-comp-fields     { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:8px; overflow:hidden; }
.cdox-comp-fields > div { min-width:0; }

/* Photo thumbnails */
.cdox-photo-grid   { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
.cdox-photo-thumb  { position:relative; width:60px; height:60px; border-radius:6px;
                     overflow:hidden; border:1px solid var(--br); flex-shrink:0; }
.cdox-photo-add    { width:60px; height:60px; border-radius:6px; border:1.5px dashed var(--br);
                     background:transparent; color:var(--t3); cursor:pointer;
                     display:flex; align-items:center; justify-content:center;
                     flex-shrink:0; transition:all .15s; flex-direction:column; gap:3px; }
.cdox-photo-add:hover { border-color:var(--acc); color:var(--acc); }
.cdox-photo-add span  { font-size:8px; font-family:var(--ui); letter-spacing:.03em; }

/* Add item button */
.cdox-add-btn { width:100%; background:transparent; border:1.5px dashed var(--br); border-radius:8px;
                padding:12px; color:var(--t3); font-size:12px; font-weight:600; cursor:pointer;
                font-family:var(--ui); margin-top:6px; transition:all .15s;
                display:flex; align-items:center; justify-content:center; gap:6px; }
.cdox-add-btn:hover { border-color:var(--acc); color:var(--acc); }

/* Valuation row */
.cdox-val-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:10px; }

/* Bar */
.cdox-bar-track { height:5px; background:var(--s4); border-radius:3px; overflow:hidden; margin-top:4px; }
.cdox-bar-fill  { height:100%; border-radius:3px; transition:width .4s; }

/* Spinner / animations */
@keyframes cdox-spin    { to{transform:rotate(360deg);} }
@keyframes cdox-fadein  { from{opacity:0;transform:translateY(4px);} to{opacity:1;transform:none;} }
.cdox-spin { animation:cdox-spin .7s linear infinite; display:inline-block; }

/* Mobile overrides */
@media(max-width:768px){
  .cdox-scroll      { padding:10px; }
  .cdox-item-hd     { grid-template-columns:24px 1fr 70px 22px; gap:6px; padding:8px 10px; }
  .cdox-item-hd-cat,
  .cdox-item-hd-disp,
  .cdox-item-hd-qty,
  .cdox-item-hd-rcv { display:none; }
  .cdox-item-hd-total { display:block!important; }
  .cdox-item-body   { padding:10px; }
  .cdox-kpi-bar     { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .cdox-g3          { grid-template-columns:1fr 1fr!important; }
  .cdox-g4          { grid-template-columns:1fr 1fr!important; }
  .cdox-val-row     { grid-template-columns:1fr 1fr!important; }
  .cdox-comp-fields { grid-template-columns:1fr!important; }
  .cdox-comp-hd     { flex-direction:column; align-items:flex-start; }
}
@media(max-width:480px){
  .cdox-g3,.cdox-g4,.cdox-val-row { grid-template-columns:1fr!important; }
  .cdox-comp-fields { grid-template-columns:1fr!important; }
}
`;

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */
const CATEGORIES = [
  "Electronics","Furniture","Appliances","Clothing & Apparel",
  "Jewelry & Watches","Art & Collectibles","Kitchen & Cookware",
  "Tools & Hardware","Sporting Goods","Musical Instruments",
  "Books & Media","Toys & Games","Office Equipment","Other"
];
const DISPOSITIONS = ["Non-Salvage","Salvageable","Restorable","Unknown"];
const CONDITIONS   = ["New","Excellent","Good","Fair","Poor"];
const LOSS_TYPES   = ["Fire","Water","Smoke","Mold","Wind","Theft","Other"];
const DISP_COLOR   = {
  "Non-Salvage":"var(--acc)","Salvageable":"var(--green)",
  "Restorable":"var(--blue)","Unknown":"var(--amber)"
};
const DISP_HEX = {
  "Non-Salvage":"#e43531","Salvageable":"#1ad98a",
  "Restorable":"#5ba3f5","Unknown":"#e89c18"
};

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════ */
let _cid = Date.now();
const uid  = () => `c${_cid++}`;
const fmt$ = n  => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n||0);

const shopUrl = it =>
  `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(
    [it.brand, it.model, it.name].filter(Boolean).join(" ")
  )}`;

function blankItem(room = "") {
  return {
    id: uid(), room, name: "", brand: "", model: "", serialNumber: "",
    category: "Electronics", condition: "Good", disposition: "Non-Salvage",
    quantity: 1, purchaseYear: "", purchasePrice: "", ageYears: "", ageMonths: "",
    depPct: "", description: "", rcv: "", acv: "",
    photos: [],
    comparable: "",        // URL to comparable listing
    comparableDesc: "",    // Description of comparable item
    comparableValue: "",   // Price of comparable item
    rcvSource: "",         // Retailer / source name
    replacementInvoiceAmt: "", balanceOfClaim: ""
  };
}

const calcAcv = (rcv, depPct) => {
  const r = parseFloat(rcv) || 0, d = parseFloat(depPct) || 0;
  return r > 0 ? Math.max(0, r - r * (d / 100)) : 0;
};

/* ═══════════════════════════════════════════════════════════════
   AI COMPARABLE FETCH — calls Netlify proxy
═══════════════════════════════════════════════════════════════ */
async function fetchComparable(item) {
  const ageStr = [
    item.ageYears  ? `${item.ageYears} yr`  : "",
    item.ageMonths ? `${item.ageMonths} mo` : ""
  ].filter(Boolean).join(" ") || "Unknown";

  const prompt = `You are a contents claims specialist helping document an insurance Schedule of Loss. Estimate the current replacement cost value (RCV) for the item below and suggest 2-3 specific comparable replacement products with real retailer search links.

ITEM:
- Name: ${item.name || "Unknown item"}
- Brand: ${item.brand || "Unknown brand"}
- Model: ${item.model || "Unknown model"}
- Category: ${item.category}
- Pre-loss Condition: ${item.condition}
- Age: ${ageStr}
- Original Purchase Price: ${item.purchasePrice ? `$${item.purchasePrice}` : "Unknown"}

Return ONLY a valid JSON object — no markdown, no backticks, no explanation before or after, just the raw JSON:
{
  "estimatedRCV": <number>,
  "rationale": "<1-2 sentence explanation of your pricing basis using current market data>",
  "comparables": [
    {
      "name": "<specific model name of a real comparable product>",
      "price": <number>,
      "retailer": "<retailer name e.g. Amazon, Best Buy, Home Depot, Walmart>",
      "searchUrl": "<https://www.amazon.com/s?k=url+encoded+search+terms or similar real retailer search URL>"
    }
  ]
}`;

  const res = await fetch("/.netlify/functions/cortex-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, type: "comparable" })
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  // Handle various response shapes from the proxy
  let text = "";
  if (typeof data === "string") {
    text = data;
  } else if (data.result && typeof data.result === "string") {
    text = data.result;
  } else if (Array.isArray(data.content)) {
    text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
  } else if (data.text) {
    text = data.text;
  } else if (data.response) {
    text = data.response;
  } else if (data.message) {
    text = data.message;
  } else {
    text = JSON.stringify(data);
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in response");
  return JSON.parse(match[0]);
}

/* ═══════════════════════════════════════════════════════════════
   SMALL ATOMS
═══════════════════════════════════════════════════════════════ */
function Fld({ label, value, onChange, placeholder, type = "text", prefix, min, max, disabled, style }) {
  return (
    <div>
      {label && <label className="cdox-lbl">{label}</label>}
      <div style={{ position: "relative" }}>
        {prefix && (
          <span style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            color: "var(--t3)", fontSize: 12, pointerEvents: "none"
          }}>{prefix}</span>
        )}
        <input
          type={type} value={value} min={min} max={max} disabled={disabled}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="cdox-inp"
          style={{ ...(prefix ? { paddingLeft: 22 } : {}), ...style }}
        />
      </div>
    </div>
  );
}

function Sel({ label, value, options, onChange }) {
  return (
    <div>
      {label && <label className="cdox-lbl">{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} className="cdox-sel">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Kpi({ label, value, color }) {
  return (
    <div className="cdox-kpi">
      <div className="cdox-lbl" style={{ marginBottom: 5 }}>{label}</div>
      <div className="cdox-mono" style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ICONS
═══════════════════════════════════════════════════════════════ */
const Ico = {
  chevron: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>,
  trash:   <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>,
  copy:    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>,
  search:  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>,
  pdf:     <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg>,
  plus:    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  camera:  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z"/></svg>,
  link:    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>,
  ai:      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/></svg>,
  check:   <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>,
  emptyBox:<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{opacity:.12}}><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>,
  shopBag: <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm0 10c-1.66 0-3-1.34-3-3h2c0 .55.45 1 1 1s1-.45 1-1h2c0 1.66-1.34 3-3 3z"/></svg>,
};

/* ═══════════════════════════════════════════════════════════════
   ITEM ROW
═══════════════════════════════════════════════════════════════ */
function ItemRow({ item, index, onUpdate, onRemove, onDuplicate, companyId, projId, db }) {
  const [open, setOpen]               = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [aiResult, setAiResult]       = useState(null);
  const [aiError, setAiError]         = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileRef = useRef();
  const set = (f, v) => onUpdate(item.id, f, v);

  // Auto-calc ACV when RCV or depPct change
  useEffect(() => {
    if (item.rcv && item.depPct) {
      const computed = calcAcv(item.rcv, item.depPct).toFixed(2);
      if (!item.acv || Math.abs(parseFloat(item.acv) - parseFloat(computed)) > 0.05) {
        set("acv", computed);
      }
    }
  }, [item.rcv, item.depPct]); // eslint-disable-line

  const handlePhotos = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = "";
    if (!files.length) return;

    // If Storage is available, upload and persist URLs
    if (companyId && projId) {
      setPhotoUploading(true);
      try {
        const storage = getStorage(db.app);
        const newPhotos = [];
        for (const file of files) {
          const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const path = `companies/${companyId}/projects/${projId}/items/${item.id}/${safeName}`;
          const ref = storageRef(storage, path);
          await uploadBytes(ref, file);
          const url = await getDownloadURL(ref);
          newPhotos.push({ url, path, name: file.name });
        }
        onUpdate(item.id, "photos", [...item.photos, ...newPhotos]);
      } catch (err) {
        console.error("Photo upload failed:", err);
        setAiError("Photo upload failed. Check your Firebase Storage configuration.");
      }
      setPhotoUploading(false);
    } else {
      // Fallback: base64 in-memory only (no persistence)
      files.forEach(f => {
        const r = new FileReader();
        r.onload = ev => onUpdate(item.id, "photos", [...item.photos, { dataUrl: ev.target.result, name: f.name }]);
        r.readAsDataURL(f);
      });
    }
  };

  // ── AI comparable lookup ──────────────────────────────────────
  const findComparable = async () => {
    if (!item.name && !item.brand && !item.model) {
      setAiError("Please enter the item name, brand, or model before searching.");
      return;
    }
    setLookupLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const result = await fetchComparable(item);
      setAiResult(result);
    } catch (e) {
      setAiError("Could not retrieve AI estimate. Check your connection or try again. You can still enter a comparable URL manually below.");
    }
    setLookupLoading(false);
  };

  const acceptComparable = (comp) => {
    set("comparable",      comp.searchUrl || "");
    set("comparableDesc",  comp.name      || "");
    set("comparableValue", comp.price     || "");
    set("rcvSource",       comp.retailer  || "");
  };

  const fetchPriceFromUrl = async (url) => {
    if (!url) return;
    setPriceLoading(true);
    try {
      const res = await fetch("/.netlify/functions/extract-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (data.price && data.price > 0) {
        set("comparableValue", String(data.price));
      }
      if (data.title && !item.comparableDesc) {
        set("comparableDesc", data.title);
      }
      if (data.source) {
        set("rcvSource", data.source);
      }
      if (!data.price) {
        setAiError("Could not automatically extract price from that URL. You can enter it manually below.");
      }
    } catch {
      setAiError("Could not reach the price extraction service. Enter the price manually.");
    }
    setPriceLoading(false);
  };

  const useAsRcv = (val) => {
    if (val) set("rcv", String(val));
  };

  // ── Derived ──────────────────────────────────────────────────
  const rcv       = parseFloat(item.rcv)  || 0;
  const lineTotal = rcv * (item.quantity  || 1);
  const depAmt    = rcv * ((parseFloat(item.depPct) || 0) / 100);
  const acv       = parseFloat(item.acv)  || (rcv - depAmt);
  const dc        = DISP_COLOR[item.disposition] || "var(--t2)";

  return (
    <div className="cdox-item-row">
      {/* ── Collapsed header ── */}
      <div className="cdox-item-hd" onClick={() => setOpen(v => !v)}>
        <div className="cdox-item-num">{String(index + 1).padStart(2, "0")}</div>
        <div style={{ overflow: "hidden", minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--t1)" }}>
            {item.name || <span style={{ color: "var(--t3)", fontStyle: "italic", fontWeight: 400 }}>Untitled item</span>}
          </div>
          <div style={{ color: "var(--t3)", fontSize: 10, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {[item.brand, item.model].filter(Boolean).join(" · ") || "No brand / model"}
          </div>
        </div>
        <div className="cdox-item-hd-cat"    style={{ fontSize: 10, color: "var(--t2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.category}</div>
        <div className="cdox-item-hd-disp"   style={{ background: dc + "22", color: dc, borderRadius: 20, padding: "2px 8px", fontSize: 9, fontWeight: 600, textAlign: "center", whiteSpace: "nowrap" }}>{item.disposition}</div>
        <div className="cdox-item-hd-qty cdox-mono" style={{ textAlign: "center", color: "var(--t3)", fontSize: 10 }}>×{item.quantity}</div>
        <div className="cdox-item-hd-rcv cdox-mono" style={{ color: "var(--t1)", fontSize: 11, textAlign: "right" }}>{fmt$(rcv)}</div>
        <div className="cdox-item-hd-total cdox-mono" style={{ color: lineTotal > 0 ? "var(--green)" : "var(--t3)", fontSize: 12, fontWeight: 700, textAlign: "right" }}>{fmt$(lineTotal)}</div>
        <div style={{ color: "var(--t3)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", display: "flex", justifyContent: "center" }}>{Ico.chevron}</div>
      </div>

      {/* ── Expanded body ── */}
      {open && (
        <div className="cdox-item-body">

          {/* SECTION 1 — Basic info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }} className="cdox-g3">
            <Fld label="Item Name *"   value={item.name}  onChange={v => set("name", v)}  placeholder="e.g. Samsung 65″ QLED TV"/>
            <Fld label="Brand"         value={item.brand} onChange={v => set("brand", v)} placeholder="e.g. Samsung"/>
            <Fld label="Model Number"  value={item.model} onChange={v => set("model", v)} placeholder="e.g. QN65Q80C"/>
          </div>

          {/* SECTION 2 — Details */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }} className="cdox-g4">
            <Fld label="Serial Number" value={item.serialNumber} onChange={v => set("serialNumber", v)} placeholder="S/N"/>
            <Sel label="Category"   value={item.category}   options={CATEGORIES}  onChange={v => set("category", v)}/>
            <Sel label="Condition"  value={item.condition}  options={CONDITIONS}   onChange={v => set("condition", v)}/>
            <Fld label="Quantity"   value={item.quantity}   onChange={v => set("quantity", Math.max(1, parseInt(v) || 1))} type="number" min={1}/>
          </div>

          {/* SECTION 3 — Disposition, room, purchase year */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }} className="cdox-g3">
            <Sel label="Disposition"    value={item.disposition}  options={DISPOSITIONS}  onChange={v => set("disposition", v)}/>
            <Fld label="Room"           value={item.room}         onChange={v => set("room", v)}          placeholder="e.g. Living Room"/>
            <Fld label="Purchase Year"  value={item.purchaseYear} onChange={v => set("purchaseYear", v)}  placeholder="2021" type="number"/>
          </div>

          {/* ══ SECTION 4 — COMPARABLE RESEARCH ══ */}
          <div className="cdox-comp-section">
            <div className="cdox-comp-hd">
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(167,139,250,.15)", border: "1px solid rgba(167,139,250,.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--purple)", flexShrink: 0 }}>
                  {Ico.ai}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--purple)" }}>Comparable Research</div>
                  <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", letterSpacing: ".06em" }}>AI ESTIMATE · SOURCE URL · VALUE</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => window.open(shopUrl(item), "_blank")}
                  title="Open Google Shopping search in new tab"
                >
                  {Ico.shopBag} Google Shopping
                </button>
                <button
                  className="btn btn-xs"
                  style={{ background: "rgba(167,139,250,.1)", border: "1px solid rgba(167,139,250,.28)", color: "var(--purple)" }}
                  onClick={findComparable}
                  disabled={lookupLoading}
                >
                  {lookupLoading
                    ? <><span className="cdox-spin" style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(167,139,250,.3)", borderTopColor: "var(--purple)" }}/> Searching…</>
                    : <>{Ico.ai} AI Find Comparable</>
                  }
                </button>
              </div>
            </div>

            {/* Error state */}
            {aiError && (
              <div className="cdox-err-card">{aiError}</div>
            )}

            {/* AI Result card */}
            {aiResult && (
              <div className="cdox-ai-card">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 9, color: "var(--purple)", fontFamily: "var(--mono)", letterSpacing: ".08em" }}>AI ESTIMATED RCV</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "var(--green)", fontFamily: "var(--mono)" }}>{fmt$(aiResult.estimatedRCV)}</div>
                  <button
                    className="btn btn-green btn-xs"
                    onClick={() => useAsRcv(aiResult.estimatedRCV)}
                  >
                    {Ico.check} Use as RCV
                  </button>
                </div>
                {aiResult.rationale && (
                  <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 10, lineHeight: 1.6, fontStyle: "italic" }}>
                    {aiResult.rationale}
                  </div>
                )}
                {aiResult.comparables?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", letterSpacing: ".06em", marginBottom: 6 }}>COMPARABLE PRODUCTS</div>
                    {aiResult.comparables.map((comp, ci) => (
                      <div key={ci} className="cdox-ai-comp-row">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t1)", marginBottom: 1 }}>{comp.name}</div>
                          <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)" }}>{comp.retailer}</div>
                        </div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: "var(--green)", flexShrink: 0 }}>{fmt$(comp.price)}</div>
                        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                          {comp.searchUrl && (
                            <button className="btn btn-ghost btn-xs" onClick={() => window.open(comp.searchUrl, "_blank")}>
                              {Ico.link} View
                            </button>
                          )}
                          <button className="btn btn-secondary btn-xs" onClick={() => acceptComparable(comp)}>
                            {Ico.check} Use
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Manual comparable fields */}
            <div style={{ marginBottom: 10 }}>
              <label className="cdox-lbl">Comparable Item Description</label>
              <input
                value={item.comparableDesc}
                onChange={e => set("comparableDesc", e.target.value)}
                placeholder="e.g. Samsung 65″ QLED TV QN65Q80D — current model equivalent"
                className="cdox-inp"
                style={{ fontSize: 11 }}
              />
            </div>

            <div className="cdox-comp-fields">
              <div>
                <label className="cdox-lbl">Comparable Source URL</label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    value={item.comparable}
                    onChange={e => set("comparable", e.target.value)}
                    placeholder="Paste product listing URL here"
                    className="cdox-inp"
                    style={{ fontSize: 11, flex: 1 }}
                  />
                  {item.comparable && (
                    <button
                      className="btn btn-xs"
                      style={{ background: "rgba(90,163,245,.1)", border: "1px solid rgba(90,163,245,.28)", color: "var(--blue)", flexShrink: 0, whiteSpace: "nowrap" }}
                      onClick={() => fetchPriceFromUrl(item.comparable)}
                      disabled={priceLoading}
                    >
                      {priceLoading
                        ? <><span className="cdox-spin" style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(90,163,245,.3)", borderTopColor: "var(--blue)" }}/> Fetching…</>
                        : <>{Ico.search} Fetch Price</>
                      }
                    </button>
                  )}
                </div>
                {item.comparable && (
                  <a href={item.comparable} target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--blue)", fontSize: 10, marginTop: 4, maxWidth: "100%", overflow: "hidden" }}>
                    {Ico.link}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: "calc(100% - 18px)" }}>
                      {(() => { try { return new URL(item.comparable).hostname; } catch { return item.comparable; } })()}
                    </span>
                  </a>
                )}
              </div>
              <div>
                <label className="cdox-lbl">Comparable Item Price</label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--t3)", fontSize: 11 }}>$</span>
                    <input
                      type="number"
                      value={item.comparableValue}
                      onChange={e => set("comparableValue", e.target.value)}
                      placeholder="0.00"
                      className="cdox-inp"
                      style={{ fontSize: 11, paddingLeft: 20 }}
                    />
                  </div>
                  {item.comparableValue && parseFloat(item.comparableValue) > 0 && (
                    <button className="btn btn-green btn-xs" onClick={() => useAsRcv(item.comparableValue)} style={{ flexShrink: 0 }}>
                      → RCV
                    </button>
                  )}
                </div>
              </div>
            </div>

            {item.rcvSource && (
              <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 4, fontFamily: "var(--mono)" }}>
                SOURCE: {item.rcvSource}
              </div>
            )}
          </div>

          {/* ══ SECTION 5 — VALUATION ══ */}
          <div style={{ borderTop: "1px solid var(--br)", paddingTop: 14, marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t1)", marginBottom: 10 }}>Valuation</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }} className="cdox-g4">
              <Fld label="Age — Years"  value={item.ageYears}    onChange={v => set("ageYears", v)}    placeholder="3"    type="number" min={0}/>
              <Fld label="Age — Months" value={item.ageMonths}   onChange={v => set("ageMonths", v)}   placeholder="5"    type="number" min={0} max={11}/>
              <Fld label="Purchase Price" value={item.purchasePrice} onChange={v => set("purchasePrice", v)} prefix="$" type="number" placeholder="0.00"/>
              <Fld label="RCV — Replacement Cost" value={item.rcv} onChange={v => set("rcv", v)} prefix="$" type="number" placeholder="0.00"/>
              <div>
                <label className="cdox-lbl">Depreciation %</label>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <input
                    type="number" value={item.depPct}
                    onChange={e => set("depPct", e.target.value)}
                    placeholder="0" min={0} max={100}
                    className="cdox-inp" style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 11, color: "var(--t3)", flexShrink: 0 }}>%</span>
                </div>
                {rcv > 0 && item.depPct && (
                  <div className="cdox-mono" style={{ fontSize: 9, color: "var(--t3)", marginTop: 2 }}>−{fmt$(depAmt)}</div>
                )}
              </div>
              <Fld label="ACV — Actual Cash Value" value={item.acv} onChange={v => set("acv", v)} prefix="$" type="number" placeholder="Auto-calc"/>
            </div>

            {/* Quick valuation summary bar */}
            {(rcv > 0 || acv > 0) && (
              <div style={{ display: "flex", gap: 12, background: "var(--s3)", borderRadius: 8, padding: "10px 14px", marginBottom: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", marginBottom: 2 }}>RCV × {item.quantity || 1}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--acc)", fontFamily: "var(--mono)" }}>{fmt$(lineTotal)}</div>
                </div>
                {item.depPct && (
                  <div>
                    <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", marginBottom: 2 }}>DEPRECIATION</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--amber)", fontFamily: "var(--mono)" }}>−{fmt$(depAmt * (item.quantity || 1))}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", marginBottom: 2 }}>ACV × {item.quantity || 1}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--blue)", fontFamily: "var(--mono)" }}>{fmt$(acv * (item.quantity || 1))}</div>
                </div>
              </div>
            )}

            {/* Replacement invoice + balance of claim */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Fld label="Replacement Invoice Amount" value={item.replacementInvoiceAmt} onChange={v => set("replacementInvoiceAmt", v)} prefix="$" type="number" placeholder="0.00"/>
              <Fld label="Balance of Claim"           value={item.balanceOfClaim}        onChange={v => set("balanceOfClaim", v)}        prefix="$" type="number" placeholder="0.00"/>
            </div>
          </div>

          {/* ══ SECTION 6 — PRE-LOSS NOTES ══ */}
          <div style={{ borderTop: "1px solid var(--br)", paddingTop: 14, marginTop: 14 }}>
            <label className="cdox-lbl">Description / Pre-Loss Condition Notes</label>
            <textarea
              value={item.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Age, special features, condition notes, serial number location, any modifications or upgrades..."
              className="cdox-txa"
            />
          </div>

          {/* ══ SECTION 7 — PHOTOS ══ */}
          <div style={{ borderTop: "1px solid var(--br)", paddingTop: 14, marginTop: 14 }}>
            <label className="cdox-lbl">Photos ({item.photos.length}){item.photos.some(p => p.url) ? "" : item.photos.length > 0 ? " — session only; export PDF to preserve" : ""}</label>
            <div className="cdox-photo-grid">
              {item.photos.map((p, pi) => (
                <div key={pi} className="cdox-photo-thumb">
                  <img src={p.url || p.dataUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                  <button
                    onClick={async () => {
                      if (p.path) {
                        try { const s = getStorage(db.app); await deleteObject(storageRef(s, p.path)); } catch {}
                      }
                      set("photos", item.photos.filter((_, i) => i !== pi));
                    }}
                    style={{ position: "absolute", top: 2, right: 2, width: 15, height: 15, borderRadius: "50%",
                      background: "rgba(0,0,0,.75)", border: "none", color: "#fff", fontSize: 11,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >×</button>
                </div>
              ))}
              <button className="cdox-photo-add" onClick={() => fileRef.current.click()} disabled={photoUploading}>
                {photoUploading
                  ? <><span className="cdox-spin" style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--br)", borderTopColor: "var(--acc)" }}/><span>Uploading…</span></>
                  : <>{Ico.camera}<span>Add Photo</span></>
                }
              </button>
              {/* capture="environment" triggers rear camera on mobile */}
              <input ref={fileRef} type="file" accept="image/*" multiple capture="environment"
                style={{ display: "none" }} onChange={handlePhotos}/>
            </div>
          </div>

          {/* ══ SECTION 8 — ACTIONS ══ */}
          <div style={{ display: "flex", gap: 6, justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--br)", paddingTop: 12, marginTop: 14 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-ghost btn-xs" onClick={() => onDuplicate(item.id)}>{Ico.copy} Duplicate</button>
              <button className="btn btn-danger btn-xs" onClick={() => onRemove(item.id)}>{Ico.trash} Remove Item</button>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "var(--green)", fontFamily: "var(--mono)", letterSpacing: ".04em", display: "flex", alignItems: "center", gap: 4 }}>
                {Ico.check} Auto-saved
              </span>
              <button
                className="btn btn-green btn-xs"
                style={{ fontWeight: 700, padding: "6px 18px", fontSize: 12 }}
                onClick={() => setOpen(false)}
              >
                {Ico.check} Done Editing
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PDF BUILDER — Schedule of Loss for adjuster
═══════════════════════════════════════════════════════════════ */
function buildSOL(meta, items, companyName = "", companyLogo = "") {
  const tPurchase = items.reduce((s, i) => s + (parseFloat(i.purchasePrice) || 0) * (i.quantity || 1), 0);
  const tRCV      = items.reduce((s, i) => s + (parseFloat(i.rcv)           || 0) * (i.quantity || 1), 0);
  const tDepAmt   = items.reduce((s, i) => {
    const r = (parseFloat(i.rcv) || 0) * (i.quantity || 1);
    return s + r * ((parseFloat(i.depPct) || 0) / 100);
  }, 0);
  const tACV = items.reduce((s, i) => {
    const r   = parseFloat(i.rcv)    || 0;
    const dep = r * ((parseFloat(i.depPct) || 0) / 100);
    const acv = parseFloat(i.acv)    || (r - dep);
    return s + acv * (i.quantity || 1);
  }, 0);
  const tInvAmt  = items.reduce((s, i) => s + (parseFloat(i.replacementInvoiceAmt) || 0), 0);
  const tBalance = items.reduce((s, i) => s + (parseFloat(i.balanceOfClaim)        || 0), 0);

  // Group by room
  const rooms = [...new Set(items.map(i => i.room || "(No Room)"))];
  let rowNum = 0;

  const tableRows = rooms.map(room => {
    const roomItems  = items.filter(i => (i.room || "(No Room)") === room);
    const roomRCV    = roomItems.reduce((s, i) => s + (parseFloat(i.rcv) || 0) * (i.quantity || 1), 0);
    const roomHeader = `
      <tr>
        <td colspan="11" style="background:#f0f2f7;padding:7px 9px;font-size:10px;font-weight:700;
          color:#374151;border-bottom:1px solid #dde1eb;letter-spacing:.04em;">
          📦 ${room}
          <span style="float:right;color:#6b7280;font-weight:400;font-family:monospace;">${roomItems.length} item${roomItems.length !== 1 ? "s" : ""} · RCV ${fmt$(roomRCV)}</span>
        </td>
      </tr>`;

    const itemRows = roomItems.map(it => {
      rowNum++;
      const r   = parseFloat(it.rcv)    || 0;
      const dep = r * ((parseFloat(it.depPct) || 0) / 100);
      const acv = parseFloat(it.acv)    || (r - dep);
      const dispColor = DISP_HEX[it.disposition] || "#6b7280";
      const hasComp   = it.comparableDesc || it.comparable || it.comparableValue;

      return `<tr style="border-bottom:1px solid #f0f0f4;">
        <td style="padding:6px 8px;font-size:10px;color:#9ca3af;font-family:monospace;white-space:nowrap;vertical-align:top;">${rowNum}</td>
        <td style="padding:6px 8px;font-size:10px;vertical-align:top;max-width:160px;">
          <div style="font-weight:700;color:#111;margin-bottom:1px;">${it.name || "—"}</div>
          <div style="color:#6b7280;font-size:9px;">${[it.brand, it.model].filter(Boolean).join(" · ") || ""}</div>
          ${it.serialNumber ? `<div style="color:#9ca3af;font-size:9px;font-family:monospace;">S/N: ${it.serialNumber}</div>` : ""}
          ${it.description  ? `<div style="color:#6b7280;font-size:9px;margin-top:2px;font-style:italic;">${it.description.substring(0, 80)}${it.description.length > 80 ? "…" : ""}</div>` : ""}
        </td>
        <td style="padding:6px 8px;font-size:10px;vertical-align:top;max-width:180px;">
          ${hasComp ? `
            ${it.comparableDesc ? `<div style="font-size:10px;font-weight:600;color:#111;margin-bottom:2px;">${it.comparableDesc}</div>` : ""}
            ${it.comparableValue && parseFloat(it.comparableValue) > 0 ? `<div style="font-size:9px;font-family:monospace;color:#059669;margin-bottom:2px;">Comp. Price: ${fmt$(it.comparableValue)}</div>` : ""}
            ${it.rcvSource ? `<div style="font-size:9px;color:#6b7280;">Source: ${it.rcvSource}</div>` : ""}
            ${it.comparable ? `<a href="${it.comparable}" style="color:#2563eb;font-size:9px;word-break:break-all;">View Comparable ↗</a>` : ""}
          ` : `<span style="color:#d1d5db;font-size:9px;">—</span>`}
        </td>
        <td style="padding:6px 8px;font-size:10px;text-align:center;font-family:monospace;vertical-align:top;">${it.quantity || 1}</td>
        <td style="padding:6px 8px;font-size:9px;text-align:center;font-family:monospace;white-space:nowrap;vertical-align:top;color:#6b7280;">
          ${it.ageYears || ""}${it.ageMonths ? `y ${it.ageMonths}m` : (it.ageYears ? "y" : "—")}
        </td>
        <td style="padding:6px 8px;font-size:10px;font-family:monospace;text-align:right;vertical-align:top;white-space:nowrap;">
          ${it.purchasePrice ? fmt$(it.purchasePrice) : "—"}
        </td>
        <td style="padding:6px 8px;font-size:10px;font-family:monospace;text-align:right;color:#e43531;font-weight:700;vertical-align:top;white-space:nowrap;">
          ${r ? fmt$(r) : "—"}
        </td>
        <td style="padding:6px 8px;font-size:10px;text-align:center;vertical-align:top;">
          ${it.depPct ? (it.depPct + "%") : "—"}
        </td>
        <td style="padding:6px 8px;font-size:10px;font-family:monospace;text-align:right;vertical-align:top;white-space:nowrap;">
          ${dep ? fmt$(dep) : "—"}
        </td>
        <td style="padding:6px 8px;font-size:10px;font-family:monospace;text-align:right;color:#2563eb;font-weight:700;vertical-align:top;white-space:nowrap;">
          ${acv ? fmt$(acv) : "—"}
        </td>
        <td style="padding:6px 8px;font-size:9px;text-align:center;vertical-align:top;">
          <span style="display:inline-block;padding:2px 6px;border-radius:20px;font-size:8px;font-weight:700;
            background:${dispColor}22;color:${dispColor};">${it.disposition}</span>
        </td>
      </tr>`;
    }).join("");

    return roomHeader + itemRows;
  }).join("");

  // Photo appendix
  const photoPages = items
    .filter(i => i.photos.length > 0)
    .map(it => `
      <div style="page-break-inside:avoid;margin-bottom:18px;">
        <div style="font-size:11px;font-weight:700;margin-bottom:6px;color:#374151;">
          #${items.indexOf(it) + 1} — ${it.name || "Untitled"} · ${it.room || "No Room"}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${it.photos.map(p => `<img src="${p.url || p.dataUrl}" style="width:140px;height:105px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb;"/>`).join("")}
        </div>
      </div>`
    ).join("");

  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Schedule of Loss${meta.claimNumber ? " — " + meta.claimNumber : ""}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Outfit',sans-serif;color:#111;font-size:11px;}
  @media print{
    .noprint{display:none!important;}
    @page{margin:12mm 10mm;}
    table{page-break-inside:auto;}
    tr{page-break-inside:avoid;}
  }
  table{border-collapse:collapse;width:100%;}
  th{background:#1a1f2e;color:#fff;padding:6px 8px;font-size:8px;text-align:left;
     letter-spacing:.05em;text-transform:uppercase;vertical-align:bottom;}
  th.r{text-align:right;}
  th.c{text-align:center;}
  tbody tr:nth-child(even){background:#fafbfd;}
</style>
</head>
<body style="padding:24px;max-width:1100px;margin:0 auto;">

  <!-- ── PRINT BUTTON ── -->
  <div class="noprint" style="margin-bottom:16px;display:flex;gap:8px;">
    <button onclick="window.print()" style="background:#e43531;color:#fff;border:none;border-radius:6px;
      padding:8px 18px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;">
      🖨 Print / Save as PDF
    </button>
    <button onclick="window.close()" style="background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;
      border-radius:6px;padding:8px 14px;font-size:12px;cursor:pointer;font-family:'Outfit',sans-serif;">
      Close
    </button>
  </div>

  <!-- ── HEADER ── -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;
    margin-bottom:20px;padding-bottom:14px;border-bottom:3px solid #e43531;">
    <div style="display:flex;align-items:flex-start;gap:14px;">
      ${companyLogo ? `<img src="${companyLogo}" style="height:52px;max-width:120px;object-fit:contain;flex-shrink:0;" alt="Company Logo"/>` : ""}
      <div>
        <div style="font-size:8px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
          color:#e43531;margin-bottom:5px;">CONTENTSDOX</div>
        <div style="font-size:24px;font-weight:800;color:#0d1b2a;letter-spacing:-.4px;">
          SCHEDULE OF LOSS
        </div>
        <div style="font-size:10px;color:#6b7280;margin-top:4px;">
          REPORT DATE: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </div>
        ${companyName ? `<div style="font-size:11px;color:#374151;margin-top:3px;font-weight:600;">${companyName}</div>` : ""}
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:8px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;">Claim Number</div>
      <div style="font-size:16px;font-weight:800;margin-bottom:6px;font-family:monospace;">${meta.claimNumber || "—"}</div>
      <div style="font-size:8px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;">Date of Loss</div>
      <div style="font-size:12px;font-weight:600;margin-bottom:5px;">${meta.dateOfLoss || "—"}</div>
      <div style="font-size:8px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;">Loss Type</div>
      <div style="font-size:12px;font-weight:700;">${meta.lossType || "—"}</div>
    </div>
  </div>

  <!-- ── CLAIM DETAILS GRID ── -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;
    margin-bottom:16px;padding:12px 14px;background:#f9fafb;
    border:1px solid #e5e7eb;border-radius:8px;">
    ${[
      ["Insured Name",       meta.insuredName],
      ["Loss Address",       meta.lossAddress],
      ["Insurance Carrier",  meta.carrier],
      ["Adjuster Name",      meta.adjusterName],
      ["Prepared By",        meta.preparedBy],
      ["Job Name",           meta.jobName],
    ].map(([l, v]) => `
      <div>
        <div style="font-size:7px;text-transform:uppercase;letter-spacing:1.2px;
          color:#9ca3af;margin-bottom:2px;">${l}</div>
        <div style="font-size:12px;font-weight:600;color:#111;">${v || "—"}</div>
      </div>`
    ).join("")}
  </div>

  <!-- ── KPI SUMMARY ── -->
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:18px;">
    ${[
      ["Total Items",   items.length,                                               "#0d1b2a"],
      ["Non-Salvage",   items.filter(i => i.disposition === "Non-Salvage").length,  "#e43531"],
      ["Total Purchase",fmt$(tPurchase),                                            "#374151"],
      ["Total RCV",     fmt$(tRCV),                                                 "#e43531"],
      ["Total ACV",     fmt$(tACV),                                                 "#2563eb"],
    ].map(([l, v, c]) => `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;
        padding:10px 12px;border-top:3px solid ${c};">
        <div style="font-size:7px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:4px;">${l}</div>
        <div style="font-size:17px;font-weight:800;color:${c};font-family:monospace;">${v}</div>
      </div>`
    ).join("")}
  </div>

  <!-- ── INVENTORY TABLE ── -->
  <div style="font-size:12px;font-weight:700;margin-bottom:6px;color:#0d1b2a;">Contents Inventory</div>
  <table style="margin-bottom:22px;font-size:10px;">
    <thead>
      <tr>
        <th style="width:28px;">#</th>
        <th>Description</th>
        <th>Comparable Source</th>
        <th class="c" style="width:36px;">Qty</th>
        <th class="c" style="width:52px;">Age</th>
        <th class="r" style="width:80px;">Purchase Price</th>
        <th class="r" style="width:80px;">Replacement Cost (RCV)</th>
        <th class="c" style="width:44px;">Dep %</th>
        <th class="r" style="width:72px;">Dep. Amount</th>
        <th class="r" style="width:80px;">Actual Cash Value (ACV)</th>
        <th class="c" style="width:80px;">Disposition</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
    <tfoot>
      <tr style="background:#1a1f2e;color:#fff;font-weight:700;">
        <td colspan="3" style="padding:9px 8px;font-size:10px;font-weight:700;color:#fff;">TOTALS</td>
        <td colspan="2"></td>
        <td style="padding:9px 8px;font-family:monospace;text-align:right;color:#e5e7eb;">${fmt$(tPurchase)}</td>
        <td style="padding:9px 8px;font-family:monospace;text-align:right;color:#fca5a5;font-weight:800;">${fmt$(tRCV)}</td>
        <td></td>
        <td style="padding:9px 8px;font-family:monospace;text-align:right;color:#e5e7eb;">${fmt$(tDepAmt)}</td>
        <td style="padding:9px 8px;font-family:monospace;text-align:right;color:#93c5fd;font-weight:800;">${fmt$(tACV)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <!-- ── DISPOSITION SUMMARY ── -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px;">
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;">
      <div style="font-size:11px;font-weight:700;margin-bottom:10px;color:#0d1b2a;">By Disposition</div>
      ${DISPOSITIONS.map(d => {
        const sub = items.filter(i => i.disposition === d);
        if (!sub.length) return "";
        const val = sub.reduce((s, i) => s + (parseFloat(i.rcv) || 0) * (i.quantity || 1), 0);
        const pct = tRCV > 0 ? (val / tRCV * 100).toFixed(0) : 0;
        const c   = DISP_HEX[d] || "#6b7280";
        return `<div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px;">
            <span style="font-weight:600;color:${c};">${d}</span>
            <span style="color:#6b7280;font-family:monospace;">${sub.length} items · ${fmt$(val)}</span>
          </div>
          <div style="height:4px;background:#e5e7eb;border-radius:2px;">
            <div style="height:4px;background:${c};border-radius:2px;width:${pct}%;"></div>
          </div>
        </div>`;
      }).join("")}
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;">
      <div style="font-size:11px;font-weight:700;margin-bottom:10px;color:#0d1b2a;">By Room</div>
      ${rooms.map(r => {
        const sub = items.filter(i => (i.room || "(No Room)") === r);
        const val = sub.reduce((s, i) => s + (parseFloat(i.rcv) || 0) * (i.quantity || 1), 0);
        const pct = tRCV > 0 ? (val / tRCV * 100).toFixed(0) : 0;
        return `<div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px;">
            <span style="font-weight:600;">${r}</span>
            <span style="color:#6b7280;font-family:monospace;">${sub.length} items · ${fmt$(val)}</span>
          </div>
          <div style="height:4px;background:#e5e7eb;border-radius:2px;">
            <div style="height:4px;background:#e43531;border-radius:2px;width:${pct}%;"></div>
          </div>
        </div>`;
      }).join("")}
    </div>
  </div>

  <!-- ── FRAUD STATEMENT + SIGNATURE ── -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px;align-items:end;">
    <div style="font-size:9px;color:#6b7280;line-height:1.7;background:#fffbeb;
      border:1px solid #fde68a;border-radius:6px;padding:10px 12px;">
      Any person who, fraudulently or willfully makes false, misleading, or exaggerated
      statements or who conceals information for the purpose of presenting a claim is acting
      in violation of the Statutory Conditions of their policy. This would lead to a denial
      of the entire claim and may result in criminal prosecution.
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div>
        <div style="border-bottom:1px solid #374151;height:52px;"></div>
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.06em;
          color:#9ca3af;margin-top:5px;text-align:center;">DATE</div>
      </div>
      <div>
        <div style="border-bottom:1px solid #374151;height:52px;"></div>
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.06em;
          color:#9ca3af;margin-top:5px;text-align:center;">SIGNATURE OF INSURED</div>
      </div>
    </div>
  </div>

  <!-- ── FOOTER ── -->
  <div style="display:flex;justify-content:space-between;align-items:center;
    font-size:9px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px;">
    <span>Powered by Job-Dox ContentsDox</span>
    <span>Insured Initials ____________</span>
    <span>Generated ${new Date().toLocaleString()}</span>
  </div>

  ${photoPages ? `
  <div style="page-break-before:always;padding-top:24px;">
    <div style="font-size:8px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
      color:#e43531;margin-bottom:5px;">JOB-DOX · CONTENTSDOX</div>
    <div style="font-size:16px;font-weight:800;color:#0d1b2a;margin-bottom:14px;">
      PHOTO DOCUMENTATION
    </div>
    ${photoPages}
  </div>` : ""}

</body></html>`;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
// ── Read company info from localStorage (shared with portal) ──
function loadCoInfo() {
  try { return JSON.parse(localStorage.getItem("jd_company_info")) || {}; } catch { return {}; }
}

// ── Push document record to portal Documents tab ──
function pushDocToPortal(projId, docRecord, projName) {
  const LS = "jd_proj_docs";
  try {
    const all = JSON.parse(localStorage.getItem(LS)) || {};
    const docs = (all[projId] || []).filter(d => d.id !== docRecord.id);
    all[projId] = [...docs, docRecord];
    localStorage.setItem(LS, JSON.stringify(all));
  } catch {}
  // Push activity
  try {
    const acts = JSON.parse(localStorage.getItem("jd_activities")) || [];
    acts.unshift({
      id: `act-${Date.now()}`,
      actionType: "document",
      action: `Document added: ${docRecord.name || "Schedule of Loss"}`,
      proj: projName || projId,
      projId: projId || null,
      user: "ContentsDox",
      ts: new Date().toISOString(),
    });
    localStorage.setItem("jd_activities", JSON.stringify(acts.slice(0, 200)));
  } catch {}
}

export default function ContentsDox({ proj, companyId, db, onDocGenerated }) {
  // ── CSS injection ──────────────────────────────────────────────
  useEffect(() => {
    const id = "cdox-inner-styles";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id   = id;
    el.textContent = CDOX_CSS;
    document.head.appendChild(el);
    return () => { try { document.getElementById(id)?.remove(); } catch (_) {} };
  }, []);

  // ── State ──────────────────────────────────────────────────────
  const [tab,     setTab]     = useState("inventory");
  const [items,   setItems]   = useState([]);
  const [meta,    setMeta]    = useState({
    jobName:      proj?.name        || "",
    claimNumber:  proj?.claimNumber || "",
    insuredName:  proj?.clientName  || "",
    lossAddress:  proj?.address     || "",
    dateOfLoss:   "",
    carrier:      "",
    adjusterName: "",
    preparedBy:   "",
    lossType:     "Fire"
  });
  const [activeRoom, setRoom]    = useState("All");
  const [filterDisp, setFD]      = useState("All");
  const [loading,    setLoading] = useState(true);
  const [saving,     setSaving]  = useState(false);

  const metaRef = useRef(meta);
  metaRef.current = meta;

  // ── Firebase: load items ───────────────────────────────────────
  useEffect(() => {
    if (!db || !companyId || !proj?.id) { setLoading(false); return; }
    const colRef = collection(db, "companies", companyId, "projects", proj.id, "contentsItems");
    const unsub  = onSnapshot(colRef, snap => {
      const loaded = snap.docs.map(d => {
        const data = d.data();
        return {
          ...blankItem(), ...data, id: d.id,
          photos: Array.isArray(data.photos) ? data.photos : []
        };
      });
      setItems(loaded);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [db, companyId, proj?.id]);

  // ── Firebase: load meta ────────────────────────────────────────
  useEffect(() => {
    if (!db || !companyId || !proj?.id) return;
    getDoc(doc(db, "companies", companyId, "projects", proj.id)).then(d => {
      if (d.exists() && d.data().contentsMeta) {
        setMeta(m => ({ ...m, ...d.data().contentsMeta }));
      }
    });
  }, [db, companyId, proj?.id]);

  // ── Firebase: save item ────────────────────────────────────────
  const saveItem = useCallback(async (item) => {
    if (!db || !companyId || !proj?.id) return;
    setSaving(true);
    // Keep Storage-backed photos (url+path), strip base64 dataUrl photos
    const persistedPhotos = (item.photos || [])
      .filter(p => p.url && p.path)
      .map(({ url, path, name }) => ({ url, path, name }));
    const { photos, ...data } = item;
    await setDoc(
      doc(db, "companies", companyId, "projects", proj.id, "contentsItems", item.id),
      { ...data, photos: persistedPhotos }
    );
    setSaving(false);
  }, [db, companyId, proj?.id]);

  // ── Firebase: save meta ────────────────────────────────────────
  const saveMeta = useCallback(async (newMeta) => {
    if (!db || !companyId || !proj?.id) return;
    await updateDoc(
      doc(db, "companies", companyId, "projects", proj.id),
      { contentsMeta: newMeta }
    ).catch(() =>
      setDoc(
        doc(db, "companies", companyId, "projects", proj.id),
        { contentsMeta: newMeta },
        { merge: true }
      )
    );
  }, [db, companyId, proj?.id]);

  // ── Item operations ────────────────────────────────────────────
  const add = () => {
    const item = blankItem(activeRoom === "All" ? "" : activeRoom);
    setItems(p => [...p, item]);
    saveItem(item);
  };

  const upd = useCallback((id, f, v) => {
    setItems(p => {
      const next    = p.map(i => i.id === id ? { ...i, [f]: v } : i);
      const updated = next.find(i => i.id === id);
      if (updated) saveItem(updated);
      return next;
    });
  }, [saveItem]);

  const del = async (id) => {
    setItems(p => p.filter(i => i.id !== id));
    if (db && companyId && proj?.id) {
      await deleteDoc(doc(db, "companies", companyId, "projects", proj.id, "contentsItems", id));
    }
  };

  const dup = (id) => {
    const src = items.find(i => i.id === id);
    if (!src) return;
    const c = { ...src, id: uid(), photos: [] };
    setItems(p => {
      const idx = p.indexOf(src);
      const n   = [...p];
      n.splice(idx + 1, 0, c);
      return n;
    });
    saveItem(c);
  };

  const mv = (k, v) => {
    const next = { ...meta, [k]: v };
    setMeta(next);
    saveMeta(next);
  };

  // ── Derived values ─────────────────────────────────────────────
  const rooms = [...new Set(items.map(i => i.room || "(No Room)"))];
  const vis   = items.filter(i => {
    const rm = activeRoom === "All" || (i.room || "(No Room)") === activeRoom;
    const dp = filterDisp === "All" || i.disposition === filterDisp;
    return rm && dp;
  });
  const tRCV  = items.reduce((s, i) => s + (parseFloat(i.rcv) || 0) * (i.quantity || 1), 0);
  const tACV  = items.reduce((s, i) => {
    const r   = parseFloat(i.rcv)  || 0;
    const dep = r * ((parseFloat(i.depPct) || 0) / 100);
    return s + (parseFloat(i.acv) || (r - dep)) * (i.quantity || 1);
  }, 0);
  const nSalv  = items.filter(i => i.disposition === "Non-Salvage").length;
  const wPhoto = items.filter(i => i.photos.length > 0).length;

  // ── Export PDF ─────────────────────────────────────────────────
  const exportPDF = () => {
    const co = loadCoInfo();
    const html = buildSOL(meta, items, co.name || "", co.logo || "");
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();

    // Push a document record to the portal Documents tab
    if (proj?.id) {
      const docName = `Schedule of Loss${meta.claimNumber ? " — " + meta.claimNumber : ""}`;
      pushDocToPortal(proj.id, {
        id:     `sol-${Date.now()}`,
        type:   "report",
        name:   docName,
        date:   new Date().toISOString(),
        status: "on-file",
        source: "ContentsDox",
        html,
        itemCount: items.length,
        totalRCV: items.reduce((s, i) => s + (parseFloat(i.rcv) || 0) * (i.quantity || 1), 0),
      }, proj.name);
      if (onDocGenerated) onDocGenerated();
    }
  };

  // ── Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, color: "var(--t3)", gap: 10 }}>
        <svg className="cdox-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" strokeOpacity=".25"/>
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
        </svg>
        Loading contents inventory…
      </div>
    );
  }

  return (
    <div className="cdox-scroll">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* ── Tab strip + PDF export ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {[
              ["inventory", "Inventory"],
              ["meta",      "Claim Details"],
              ["summary",   "Summary"],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                style={{
                  background:  tab === k ? "var(--acc-lo)" : "transparent",
                  border:      tab === k ? "1px solid rgba(228,53,49,.3)" : "1px solid var(--br)",
                  borderRadius: 6, padding: "5px 14px", fontSize: 11,
                  fontWeight:  tab === k ? 700 : 500,
                  color:       tab === k ? "var(--acc)" : "var(--t2)",
                  cursor: "pointer", fontFamily: "var(--ui)", transition: "all .12s"
                }}
              >{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {saving && <span style={{ fontSize: 10, color: "var(--t3)" }}>Saving…</span>}
            <button className="btn btn-primary btn-xs" onClick={exportPDF}>{Ico.pdf} Export Schedule of Loss</button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            TAB: INVENTORY
        ════════════════════════════════════════════════════════ */}
        {tab === "inventory" && (
          <>
            {/* KPI bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 14 }} className="cdox-kpi-bar">
              <Kpi label="Total Items"  value={items.length}  color="var(--t1)"/>
              <Kpi label="Non-Salvage"  value={nSalv}         color="var(--acc)"/>
              <Kpi label="With Photos"  value={wPhoto}        color="var(--blue)"/>
              <Kpi label="Total RCV"    value={fmt$(tRCV)}     color="var(--green)"/>
              <Kpi label="Total ACV"    value={fmt$(tACV)}     color="var(--amber)"/>
            </div>

            {/* Room filter chips + disposition filter */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 4, flexWrap: "nowrap", overflowX: "auto", paddingBottom: 2 }}>
                {["All", ...rooms].map(r => (
                  <button
                    key={r}
                    className={`cdox-chip${activeRoom === r ? " on" : ""}`}
                    onClick={() => setRoom(r)}
                  >{r}</button>
                ))}
                <button
                  onClick={() => {
                    const n = prompt("New room name:");
                    if (n && n.trim()) {
                      setItems(p => [...p, blankItem(n.trim())]);
                      setRoom(n.trim());
                    }
                  }}
                  style={{ background: "transparent", border: "1px dashed var(--br)", borderRadius: 20,
                    padding: "4px 12px", fontSize: 11, color: "var(--t3)", cursor: "pointer",
                    fontFamily: "var(--ui)", whiteSpace: "nowrap", flexShrink: 0 }}
                >+ Room</button>
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", letterSpacing: ".08em" }}>FILTER</span>
                {["All", ...DISPOSITIONS].map(d => (
                  <button
                    key={d}
                    className={`cdox-chip-sm${filterDisp === d ? " on" : ""}`}
                    onClick={() => setFD(d)}
                  >{d}</button>
                ))}
              </div>
            </div>

            {/* Column headers — desktop only */}
            <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 100px 90px 42px 90px 90px 22px",
              gap: 8, padding: "4px 12px", marginBottom: 4 }}>
              {["#", "Item", "Category", "Disposition", "Qty", "Unit RCV", "Total", ""].map((h, i) => (
                <div key={i} style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", letterSpacing: ".06em" }}>{h}</div>
              ))}
            </div>

            {/* Item list */}
            {vis.length === 0
              ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                  padding: 48, border: "1.5px dashed var(--br)", borderRadius: 10, textAlign: "center" }}>
                  {Ico.emptyBox}
                  <div style={{ fontSize: 11, color: "var(--t2)", fontFamily: "var(--mono)" }}>NO ITEMS YET</div>
                  <div style={{ fontSize: 12, color: "var(--t3)" }}>
                    Add your first item. On mobile, tap the camera icon inside each item to document it on-site.
                  </div>
                </div>
              )
              : vis.map(it => (
                <ItemRow
                  key={it.id}
                  item={it}
                  index={items.indexOf(it)}
                  onUpdate={upd}
                  onRemove={del}
                  onDuplicate={dup}
                  companyId={companyId}
                  projId={proj?.id}
                  db={db}
                />
              ))
            }

            <button className="cdox-add-btn" onClick={add}>
              {Ico.plus} Add Item{activeRoom !== "All" ? ` to ${activeRoom}` : ""}
            </button>

            {/* Totals footer */}
            {items.length > 0 && (
              <div className="cdox-card" style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div style={{ fontSize: 10, color: "var(--t3)", fontFamily: "var(--mono)" }}>
                  {items.length} ITEMS · {rooms.length} ROOM{rooms.length !== 1 ? "S" : ""} · {nSalv} NON-SALVAGE
                </div>
                <div style={{ display: "flex", gap: 24 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", marginBottom: 2 }}>TOTAL ACV</div>
                    <div style={{ fontSize: 17, color: "var(--amber)", fontWeight: 700, fontFamily: "var(--mono)" }}>{fmt$(tACV)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", marginBottom: 2 }}>TOTAL RCV</div>
                    <div style={{ fontSize: 22, color: "var(--green)", fontWeight: 700, fontFamily: "var(--mono)" }}>{fmt$(tRCV)}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════
            TAB: CLAIM DETAILS
        ════════════════════════════════════════════════════════ */}
        {tab === "meta" && (
          <div className="cdox-card">
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 18, color: "var(--t1)" }}>Claim & Job Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }} className="cdox-g3">
              <Fld label="Job Name"          value={meta.jobName}      onChange={v => mv("jobName", v)}      placeholder="e.g. Smith Residence Fire Loss"/>
              <Fld label="Claim Number"      value={meta.claimNumber}  onChange={v => mv("claimNumber", v)}  placeholder="e.g. CLM-2025-00123"/>
              <Fld label="Date of Loss"      value={meta.dateOfLoss}   onChange={v => mv("dateOfLoss", v)}   type="date"/>
              <Fld label="Insured Name"      value={meta.insuredName}  onChange={v => mv("insuredName", v)}  placeholder="Full name of policyholder"/>
              <Fld label="Loss Address"      value={meta.lossAddress}  onChange={v => mv("lossAddress", v)}  placeholder="Street address of loss"/>
              <Sel label="Loss Type"         value={meta.lossType}     options={LOSS_TYPES}                  onChange={v => mv("lossType", v)}/>
              <Fld label="Insurance Carrier" value={meta.carrier}      onChange={v => mv("carrier", v)}      placeholder="e.g. State Farm"/>
              <Fld label="Adjuster Name"     value={meta.adjusterName} onChange={v => mv("adjusterName", v)} placeholder="Adjuster full name"/>
              <Fld label="Prepared By"       value={meta.preparedBy}   onChange={v => mv("preparedBy", v)}   placeholder="Your name / company"/>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-primary btn-xs" onClick={exportPDF}>{Ico.pdf} Export Schedule of Loss</button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            TAB: SUMMARY
        ════════════════════════════════════════════════════════ */}
        {tab === "summary" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="cdox-g2">

            {/* By Disposition */}
            <div className="cdox-card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--t1)" }}>By Disposition</div>
              {DISPOSITIONS.map(d => {
                const sub = items.filter(i => i.disposition === d);
                const val = sub.reduce((s, i) => s + (parseFloat(i.rcv) || 0) * (i.quantity || 1), 0);
                const pct = tRCV > 0 ? (val / tRCV * 100).toFixed(1) : 0;
                const c   = DISP_COLOR[d];
                return (
                  <div key={d} style={{ marginBottom: 11 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                      <span style={{ color: c, fontWeight: 600 }}>{d}</span>
                      <span style={{ color: "var(--t2)", fontSize: 11, fontFamily: "var(--mono)" }}>
                        {sub.length} items · {fmt$(val)}
                      </span>
                    </div>
                    <div className="cdox-bar-track">
                      <div className="cdox-bar-fill" style={{ background: c, width: `${pct}%` }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* By Room */}
            <div className="cdox-card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--t1)" }}>By Room</div>
              {rooms.length === 0
                ? <div style={{ color: "var(--t3)", fontSize: 12 }}>No rooms defined yet.</div>
                : rooms.map(r => {
                  const sub = items.filter(i => (i.room || "(No Room)") === r);
                  const val = sub.reduce((s, i) => s + (parseFloat(i.rcv) || 0) * (i.quantity || 1), 0);
                  const pct = tRCV > 0 ? (val / tRCV * 100).toFixed(1) : 0;
                  return (
                    <div key={r} style={{ marginBottom: 11 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                        <span style={{ color: "var(--t1)" }}>{r}</span>
                        <span style={{ color: "var(--t2)", fontSize: 11, fontFamily: "var(--mono)" }}>
                          {sub.length} items · {fmt$(val)}
                        </span>
                      </div>
                      <div className="cdox-bar-track">
                        <div className="cdox-bar-fill" style={{ background: "var(--acc)", width: `${pct}%` }}/>
                      </div>
                    </div>
                  );
                })
              }
            </div>

            {/* By Category */}
            <div className="cdox-card" style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--t1)" }}>By Category</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }} className="cdox-g3">
                {CATEGORIES.map(cat => {
                  const sub = items.filter(i => i.category === cat);
                  if (!sub.length) return null;
                  const val = sub.reduce((s, i) => s + (parseFloat(i.rcv) || 0) * (i.quantity || 1), 0);
                  return (
                    <div key={cat} style={{ background: "var(--s3)", borderRadius: 8, padding: "10px 13px",
                      display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "var(--t1)" }}>{cat}</div>
                        <div style={{ color: "var(--t3)", fontSize: 10 }}>{sub.length} item{sub.length !== 1 ? "s" : ""}</div>
                      </div>
                      <div style={{ color: "var(--green)", fontSize: 13, fontWeight: 700, fontFamily: "var(--mono)" }}>{fmt$(val)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary totals + export */}
            <div className="cdox-card" style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
              <div style={{ display: "flex", gap: 28 }}>
                <div>
                  <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", marginBottom: 3 }}>TOTAL ITEMS</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--t1)", fontFamily: "var(--mono)" }}>{items.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", marginBottom: 3 }}>TOTAL ACV</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--amber)", fontFamily: "var(--mono)" }}>{fmt$(tACV)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", marginBottom: 3 }}>TOTAL RCV</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "var(--green)", fontFamily: "var(--mono)" }}>{fmt$(tRCV)}</div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={exportPDF}>
                {Ico.pdf} Export Schedule of Loss PDF
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
