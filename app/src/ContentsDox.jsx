/**
 * ContentsDox.jsx
 * ─────────────────────────────────────────────────────────────────
 * Contents inventory + Schedule of Loss tool for Job-Dox Portal.
 *
 * Props:
 *   proj          – current project object from portal state
 *   companyId     – Memberstack member ID (Firestore root key)
 *   db            – Firestore instance (passed from portal — do NOT re-init)
 *   onPushToScope – callback(lineItems[]) for SERVICES only (NOT RCV/ACV)
 *
 * Firestore paths:
 *   companies/{companyId}/projects/{proj.id}/contentsItems/{itemId}
 *   companies/{companyId}/projects/{proj.id}  ← contentsMeta field on project doc
 *
 * Photos: React state only (v1). Firebase Storage is the v2 upgrade path.
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  collection, onSnapshot, setDoc, deleteDoc, doc, updateDoc, getDoc
} from "firebase/firestore";

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
                padding:8px 11px; font-size:12px; color:var(--t1); outline:none; font-family:var(--ui); }
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

/* Item rows — desktop table */
.cdox-item-row        { background:var(--s2); border:1px solid var(--br); border-radius:8px;
                        margin-bottom:4px; overflow:hidden; transition:border-color .12s; }
.cdox-item-row:hover  { border-color:var(--br-hi); }
.cdox-item-hd         { display:grid;
                        grid-template-columns:28px 1fr 100px 90px 42px 90px 90px 22px;
                        gap:8px; align-items:center; padding:9px 12px; cursor:pointer; }
.cdox-item-body       { border-top:1px solid var(--br); padding:14px 12px; }
.cdox-item-num        { width:24px; height:24px; border-radius:5px; background:var(--s3);
                        color:var(--t3); display:flex; align-items:center; justify-content:center;
                        font-size:10px; font-family:var(--mono)!important; flex-shrink:0; }

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

/* Bar */
.cdox-bar-track { height:5px; background:var(--s4); border-radius:3px; overflow:hidden; margin-top:4px; }
.cdox-bar-fill  { height:100%; border-radius:3px; transition:width .4s; }

/* Services row */
.cdox-svc-row { display:grid; grid-template-columns:1fr 60px 70px 80px 28px;
                gap:6px; align-items:center; padding:6px 10px;
                background:var(--s2); border:1px solid var(--br); border-radius:7px; margin-bottom:4px; }

/* Spinner */
@keyframes cdox-spin { to{transform:rotate(360deg);} }
.cdox-spin { animation:cdox-spin .7s linear infinite; display:inline-block; }

/* Mobile — card layout replaces table */
@media(max-width:768px){
  .cdox-scroll { padding:10px; }
  .cdox-item-hd { grid-template-columns:24px 1fr 70px 22px; gap:6px; padding:8px 10px; }
  .cdox-item-hd-cat,
  .cdox-item-hd-disp,
  .cdox-item-hd-qty,
  .cdox-item-hd-rcv { display:none; }
  .cdox-item-hd-total { display:block!important; }
  .cdox-item-body { padding:10px; }
  .cdox-kpi-bar  { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .cdox-g3       { grid-template-columns:1fr 1fr!important; }
  .cdox-g4       { grid-template-columns:1fr 1fr!important; }
  .cdox-age-grid { grid-template-columns:1fr 1fr!important; }
  .cdox-svc-row  { grid-template-columns:1fr 50px 62px 70px 24px; font-size:11px; }
}
@media(max-width:480px){
  .cdox-g3,.cdox-g4 { grid-template-columns:1fr!important; }
  .cdox-age-grid     { grid-template-columns:1fr 1fr!important; }
}
`;

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */
const CATEGORIES   = ["Electronics","Furniture","Appliances","Clothing & Apparel",
                      "Jewelry & Watches","Art & Collectibles","Kitchen & Cookware",
                      "Tools & Hardware","Sporting Goods","Musical Instruments",
                      "Books & Media","Toys & Games","Office Equipment","Other"];
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
const uid    = () => `c${_cid++}`;
const fmt$   = n  => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n||0);
const shopUrl = it => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(
  [it.brand,it.model,it.name].filter(Boolean).join(" "))}`;

function blankItem(room="") {
  return {
    id:uid(), room, name:"", brand:"", model:"", serialNumber:"",
    category:"Electronics", condition:"Good", disposition:"Non-Salvage",
    quantity:1, purchaseYear:"", purchasePrice:"", ageYears:"", ageMonths:"",
    depPct:"", description:"", rcv:"", acv:"",
    photos:[], comparable:"", rcvSource:"", lookupState:null,
    replacementInvoiceAmt:"", balanceOfClaim:""
  };
}
function blankSvc() {
  return { id:uid(), desc:"", unit:"EA", qty:1, price:"" };
}

// Compute ACV from RCV and depPct
const calcAcv = (rcv, depPct) => {
  const r = parseFloat(rcv)||0, d = parseFloat(depPct)||0;
  return r > 0 ? Math.max(0, r - r*(d/100)) : 0;
};

/* ═══════════════════════════════════════════════════════════════
   SMALL ATOMS
═══════════════════════════════════════════════════════════════ */
function Fld({ label, value, onChange, placeholder, type="text", prefix, min, disabled }) {
  return (
    <div>
      {label && <label className="cdox-lbl">{label}</label>}
      <div style={{position:"relative"}}>
        {prefix && <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",
          color:"var(--t3)",fontSize:12,pointerEvents:"none"}}>{prefix}</span>}
        <input type={type} value={value} min={min} disabled={disabled}
          onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          className="cdox-inp" style={prefix?{paddingLeft:22}:{}}/>
      </div>
    </div>
  );
}
function Sel({ label, value, options, onChange }) {
  return (
    <div>
      {label && <label className="cdox-lbl">{label}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)} className="cdox-sel">
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function Kpi({ label, value, color }) {
  return (
    <div className="cdox-kpi">
      <div className="cdox-lbl" style={{marginBottom:5}}>{label}</div>
      <div className="cdox-mono" style={{fontSize:18,fontWeight:700,color}}>{value}</div>
    </div>
  );
}

const Ico = {
  chevron: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>,
  trash:   <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>,
  copy:    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>,
  search:  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>,
  pdf:     <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg>,
  plus:    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  camera:  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z"/></svg>,
  push:    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>,
  save:    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>,
  link:    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>,
  emptyBox:<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{opacity:.12}}><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>,
};

/* ═══════════════════════════════════════════════════════════════
   ITEM ROW
═══════════════════════════════════════════════════════════════ */
function ItemRow({ item, index, onUpdate, onRemove, onDuplicate }) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef();
  const set = (f,v) => onUpdate(item.id, f, v);

  // Auto-calc ACV when RCV or depPct changes
  useEffect(() => {
    if (item.rcv && item.depPct && !item.acv) {
      set("acv", calcAcv(item.rcv, item.depPct).toFixed(2));
    }
  }, [item.rcv, item.depPct]); // eslint-disable-line

  const handlePhotos = e => {
    Array.from(e.target.files).forEach(f => {
      const r = new FileReader();
      r.onload = ev => onUpdate(item.id, "photos", [...item.photos, {dataUrl:ev.target.result,name:f.name}]);
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };

  const rcv       = parseFloat(item.rcv)||0;
  const lineTotal = rcv * (item.quantity||1);
  const depAmt    = rcv * ((parseFloat(item.depPct)||0)/100);
  const acv       = parseFloat(item.acv) || (rcv - depAmt);
  const dc        = DISP_COLOR[item.disposition] || "var(--t2)";

  return (
    <div className="cdox-item-row">
      <div className="cdox-item-hd" onClick={()=>setOpen(v=>!v)}>
        <div className="cdox-item-num">{String(index+1).padStart(2,"0")}</div>
        <div style={{overflow:"hidden",minWidth:0}}>
          <div style={{fontWeight:600,fontSize:12,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:"var(--t1)"}}>
            {item.name || <span style={{color:"var(--t3)",fontStyle:"italic",fontWeight:400}}>Untitled item</span>}
          </div>
          <div style={{color:"var(--t3)",fontSize:10,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {[item.brand,item.model].filter(Boolean).join(" · ")||"No brand / model"}
          </div>
        </div>
        {/* Hidden on mobile via CSS class */}
        <div className="cdox-item-hd-cat" style={{fontSize:10,color:"var(--t2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.category}</div>
        <div className="cdox-item-hd-disp" style={{background:dc+"22",color:dc,borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:600,textAlign:"center",whiteSpace:"nowrap"}}>{item.disposition}</div>
        <div className="cdox-item-hd-qty cdox-mono" style={{textAlign:"center",color:"var(--t3)",fontSize:10}}>×{item.quantity}</div>
        <div className="cdox-item-hd-rcv cdox-mono" style={{color:"var(--t1)",fontSize:11,textAlign:"right"}}>{fmt$(rcv)}</div>
        <div className="cdox-item-hd-total cdox-mono" style={{color:lineTotal>0?"var(--green)":"var(--t3)",fontSize:12,fontWeight:700,textAlign:"right"}}>{fmt$(lineTotal)}</div>
        <div style={{color:"var(--t3)",transform:open?"rotate(180deg)":"none",transition:"transform .15s",display:"flex",justifyContent:"center"}}>{Ico.chevron}</div>
      </div>

      {open && (
        <div className="cdox-item-body">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}} className="cdox-g3">
            <Fld label="Item Name *" value={item.name} onChange={v=>set("name",v)} placeholder="e.g. Samsung 65″ QLED TV"/>
            <Fld label="Brand" value={item.brand} onChange={v=>set("brand",v)} placeholder="e.g. Samsung"/>
            <Fld label="Model Number" value={item.model} onChange={v=>set("model",v)} placeholder="e.g. QN65Q80C"/>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:10}} className="cdox-g4">
            <Fld label="Serial Number" value={item.serialNumber} onChange={v=>set("serialNumber",v)} placeholder="S/N"/>
            <Sel label="Category" value={item.category} options={CATEGORIES} onChange={v=>set("category",v)}/>
            <Sel label="Condition" value={item.condition} options={CONDITIONS} onChange={v=>set("condition",v)}/>
            <Fld label="Quantity" value={item.quantity} onChange={v=>set("quantity",Math.max(1,parseInt(v)||1))} type="number" min={1}/>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}} className="cdox-g3">
            <Sel label="Disposition" value={item.disposition} options={DISPOSITIONS} onChange={v=>set("disposition",v)}/>
            <Fld label="Room" value={item.room} onChange={v=>set("room",v)} placeholder="e.g. Living Room"/>
            <Fld label="Purchase Year" value={item.purchaseYear} onChange={v=>set("purchaseYear",v)} placeholder="2021" type="number"/>
          </div>

          {/* Age + Financials */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr",gap:10,marginBottom:10}} className="cdox-g4">
            <Fld label="Age — Years" value={item.ageYears} onChange={v=>set("ageYears",v)} placeholder="3" type="number" min={0}/>
            <Fld label="Age — Months" value={item.ageMonths} onChange={v=>set("ageMonths",v)} placeholder="5" type="number" min={0} max={11}/>
            <Fld label="Purchase Price" value={item.purchasePrice} onChange={v=>set("purchasePrice",v)} prefix="$" type="number" placeholder="0.00"/>
            <Fld label="RCV — Replacement Cost" value={item.rcv} onChange={v=>set("rcv",v)} prefix="$" type="number" placeholder="0.00"/>
            <div>
              <label className="cdox-lbl">Depreciation %</label>
              <div style={{display:"flex",gap:5,alignItems:"center"}}>
                <input type="number" value={item.depPct} onChange={e=>set("depPct",e.target.value)}
                  placeholder="0" min={0} max={100} className="cdox-inp" style={{flex:1}}/>
                <span style={{fontSize:11,color:"var(--t3)",flexShrink:0}}>%</span>
              </div>
              {rcv>0&&item.depPct&&<div className="cdox-mono" style={{fontSize:9,color:"var(--t3)",marginTop:2}}>−{fmt$(depAmt)}</div>}
            </div>
            <Fld label="ACV — Actual Cash Value" value={item.acv} onChange={v=>set("acv",v)} prefix="$" type="number" placeholder="Auto-calc"/>
          </div>

          {/* Comparable URL */}
          <div style={{marginBottom:10}}>
            <label className="cdox-lbl">Comparable Source URL</label>
            <div style={{display:"flex",gap:6}}>
              <input value={item.comparable} onChange={e=>set("comparable",e.target.value)}
                placeholder="Paste a comparable listing URL to document your pricing source"
                className="cdox-inp" style={{flex:1,fontSize:11}}/>
              <button className="btn btn-ghost btn-xs" onClick={()=>window.open(shopUrl(item),"_blank")}>
                {Ico.search} Find
              </button>
            </div>
            {item.comparable && (
              <a href={item.comparable} target="_blank" rel="noreferrer"
                style={{display:"flex",alignItems:"center",gap:4,color:"var(--blue)",fontSize:10,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {Ico.link} {item.comparable}
              </a>
            )}
          </div>

          {/* Notes */}
          <div style={{marginBottom:12}}>
            <label className="cdox-lbl">Description / Pre-Loss Condition Notes</label>
            <textarea value={item.description} onChange={e=>set("description",e.target.value)}
              placeholder="Age, special features, pre-loss condition notes, serial number location..."
              className="cdox-txa"/>
          </div>

          {/* Photos */}
          <div style={{marginBottom:14}}>
            <label className="cdox-lbl">Photos ({item.photos.length}) — session only; export PDF to preserve</label>
            <div className="cdox-photo-grid">
              {item.photos.map((p,pi)=>(
                <div key={pi} className="cdox-photo-thumb">
                  <img src={p.dataUrl} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  <button onClick={()=>set("photos",item.photos.filter((_,i)=>i!==pi))}
                    style={{position:"absolute",top:2,right:2,width:15,height:15,borderRadius:"50%",
                    background:"rgba(0,0,0,.75)",border:"none",color:"#fff",fontSize:11,
                    cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                </div>
              ))}
              <button className="cdox-photo-add" onClick={()=>fileRef.current.click()}>
                {Ico.camera}
                <span>Add Photo</span>
              </button>
              {/* capture="environment" triggers camera on mobile */}
              <input ref={fileRef} type="file" accept="image/*" multiple capture="environment"
                style={{display:"none"}} onChange={handlePhotos}/>
            </div>
          </div>

          <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost btn-xs" onClick={()=>onDuplicate(item.id)}>{Ico.copy} Duplicate</button>
            <button className="btn btn-danger btn-xs" onClick={()=>onRemove(item.id)}>{Ico.trash} Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PDF BUILDER — Encircle-style Schedule of Loss
═══════════════════════════════════════════════════════════════ */
function buildSOL(meta, items, companyName="") {
  const tPurchase = items.reduce((s,i)=>s+(parseFloat(i.purchasePrice)||0)*(i.quantity||1),0);
  const tRCV      = items.reduce((s,i)=>s+(parseFloat(i.rcv)||0)*(i.quantity||1),0);
  const tDepAmt   = items.reduce((s,i)=>{
    const r=(parseFloat(i.rcv)||0)*(i.quantity||1);
    return s + r*((parseFloat(i.depPct)||0)/100);
  },0);
  const tACV      = items.reduce((s,i)=>{
    const r=(parseFloat(i.rcv)||0), dep=r*((parseFloat(i.depPct)||0)/100);
    const acv=parseFloat(i.acv)||(r-dep);
    return s+acv*(i.quantity||1);
  },0);
  const tInvAmt   = items.reduce((s,i)=>s+(parseFloat(i.replacementInvoiceAmt)||0),0);
  const tBalance  = items.reduce((s,i)=>s+(parseFloat(i.balanceOfClaim)||0),0);

  // Group items by room
  const rooms = [...new Set(items.map(i=>i.room||"(No Room)"))];
  let rowNum = 0;
  const tableRows = rooms.map(room => {
    const roomItems = items.filter(i=>(i.room||"(No Room)")===room);
    const roomHeader = `<tr><td colspan="13" style="background:#f3f4f6;padding:6px 8px;font-size:11px;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb;">${room}</td></tr>`;
    const itemRows = roomItems.map(it => {
      rowNum++;
      const r   = parseFloat(it.rcv)||0;
      const dep = r*((parseFloat(it.depPct)||0)/100);
      const acv = parseFloat(it.acv)||(r-dep);
      const dispColor = DISP_HEX[it.disposition]||"#6b7280";
      return `<tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:5px 7px;font-size:10px;color:#9ca3af;font-family:monospace;white-space:nowrap;">${rowNum}</td>
        <td style="padding:5px 7px;font-size:10px;font-weight:600;max-width:140px;">
          ${it.name||"—"}
          ${it.comparable?`<br><a href="${it.comparable}" style="color:#2563eb;font-size:9px;font-weight:400;">Comparable</a>`:""}
        </td>
        <td style="padding:5px 7px;font-size:10px;">${it.brand||"—"}</td>
        <td style="padding:5px 7px;font-size:10px;">${it.model||"—"}</td>
        <td style="padding:5px 7px;font-size:10px;text-align:center;font-family:monospace;">${it.quantity||1}</td>
        <td style="padding:5px 7px;font-size:9px;text-align:center;font-family:monospace;white-space:nowrap;">${it.ageYears||""}${it.ageMonths?`/${it.ageMonths}`:""}</td>
        <td style="padding:5px 7px;font-size:10px;font-family:monospace;text-align:right;">${it.purchasePrice?fmt$(it.purchasePrice):""}</td>
        <td style="padding:5px 7px;font-size:10px;font-family:monospace;text-align:right;color:#e43531;font-weight:700;">${r?fmt$(r):""}</td>
        <td style="padding:5px 7px;font-size:10px;text-align:center;">${it.depPct?(it.depPct+"%"):""}</td>
        <td style="padding:5px 7px;font-size:10px;font-family:monospace;text-align:right;">${dep?fmt$(dep):""}</td>
        <td style="padding:5px 7px;font-size:10px;font-family:monospace;text-align:right;color:#2563eb;font-weight:700;">${acv?fmt$(acv):""}</td>
        <td style="padding:5px 7px;font-size:10px;font-family:monospace;text-align:right;">${it.replacementInvoiceAmt?fmt$(it.replacementInvoiceAmt):""}</td>
        <td style="padding:5px 7px;font-size:10px;font-family:monospace;text-align:right;">${it.balanceOfClaim?fmt$(it.balanceOfClaim):"$0.00"}</td>
      </tr>`;
    }).join("");
    return roomHeader + itemRows;
  }).join("");

  // Photo appendix
  const photoPages = items.filter(i=>i.photos.length>0).map(it=>`
    <div style="page-break-inside:avoid;margin-bottom:18px;">
      <div style="font-size:11px;font-weight:700;margin-bottom:6px;">#${items.indexOf(it)+1} — ${it.name||"Untitled"} · ${it.room||"No Room"}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">${it.photos.map(p=>`<img src="${p.dataUrl}" style="width:140px;height:105px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb;"/>`).join("")}</div>
    </div>`).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Schedule of Loss${meta.claimNumber?" — "+meta.claimNumber:""}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Outfit',sans-serif;color:#111;font-size:11px;}
  @media print{.noprint{display:none!important;} @page{margin:12mm 10mm;}}
  table{border-collapse:collapse;width:100%;}
  th{background:#1a1f2e;color:#fff;padding:6px 7px;font-size:9px;text-align:left;letter-spacing:.04em;text-transform:uppercase;}
  th.r{text-align:right;} th.c{text-align:center;}
</style>
</head><body style="padding:28px;max-width:1100px;margin:0 auto;">

  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;padding-bottom:14px;border-bottom:3px solid #e43531;">
    <div>
      <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#e43531;margin-bottom:5px;">JOB-DOX · CONTENTSDOX</div>
      <div style="font-size:22px;font-weight:800;color:#0d1b2a;letter-spacing:-.3px;">SCHEDULE OF LOSS</div>
      <div style="font-size:11px;color:#6b7280;margin-top:3px;">REPORT DATE: ${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>
      ${companyName?`<div style="font-size:11px;color:#374151;margin-top:2px;font-weight:600;">${companyName}</div>`:""}
    </div>
    <div style="text-align:right;">
      <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">Claim ID</div>
      <div style="font-size:14px;font-weight:700;margin-bottom:5px;">${meta.claimNumber||"—"}</div>
      <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">Claim Date / Date of Loss</div>
      <div style="font-size:12px;font-weight:600;margin-bottom:5px;">${meta.dateOfLoss||"—"}</div>
      <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">Insured</div>
      <div style="font-size:12px;font-weight:700;">${meta.insuredName||"—"}</div>
    </div>
  </div>

  <!-- JOB DETAILS GRID -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:18px;padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:7px;">
    ${[["Insured",meta.insuredName],["Loss Address",meta.lossAddress],["Insurance Carrier",meta.carrier],
       ["Adjuster",meta.adjusterName],["Prepared By",meta.preparedBy],["Loss Type",meta.lossType]
    ].map(([l,v])=>`<div><div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:2px;">${l}</div><div style="font-size:12px;font-weight:600;">${v||"—"}</div></div>`).join("")}
  </div>

  <!-- KPI SUMMARY -->
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:18px;">
    ${[["Total Items",items.length,"#0d1b2a"],["Non-Salvage",items.filter(i=>i.disposition==="Non-Salvage").length,"#e43531"],
       ["Total Purchase",fmt$(tPurchase),"#374151"],["Total RCV",fmt$(tRCV),"#e43531"],["Total ACV",fmt$(tACV),"#2563eb"]
    ].map(([l,v,c])=>`<div style="background:#fff;border:1px solid #e5e7eb;border-radius:7px;padding:10px 12px;border-top:3px solid ${c};"><div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:3px;">${l}</div><div style="font-size:16px;font-weight:800;color:${c};">${v}</div></div>`).join("")}
  </div>

  <!-- INVENTORY TABLE -->
  <div style="font-size:12px;font-weight:700;margin-bottom:6px;color:#0d1b2a;">Contents Inventory</div>
  <table style="margin-bottom:22px;">
    <thead><tr>
      <th>No.</th><th>Description</th><th>Brand</th><th>Model</th>
      <th class="c">QTY</th><th class="c">Age Y/M</th>
      <th class="r">Purchase Price</th><th class="r">Replacement Cost Value</th>
      <th class="c">Dep. %</th><th class="r">Dep. Amount</th>
      <th class="r">Actual Cash Value</th><th class="r">Replacement Invoice Amt</th>
      <th class="r">Balance of Claim</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
    <tfoot>
      <tr style="background:#f3f4f6;font-weight:700;border-top:2px solid #0d1b2a;">
        <td colspan="6" style="padding:8px 7px;font-size:10px;font-weight:700;">TOTALS</td>
        <td style="padding:8px 7px;font-family:monospace;text-align:right;">${fmt$(tPurchase)}</td>
        <td style="padding:8px 7px;font-family:monospace;text-align:right;color:#e43531;font-weight:800;">${fmt$(tRCV)}</td>
        <td></td>
        <td style="padding:8px 7px;font-family:monospace;text-align:right;">${fmt$(tDepAmt)}</td>
        <td style="padding:8px 7px;font-family:monospace;text-align:right;color:#2563eb;font-weight:800;">${fmt$(tACV)}</td>
        <td style="padding:8px 7px;font-family:monospace;text-align:right;">${fmt$(tInvAmt)}</td>
        <td style="padding:8px 7px;font-family:monospace;text-align:right;">${fmt$(tBalance)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- FRAUD STATEMENT + SIGNATURE -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px;align-items:end;">
    <div style="font-size:9px;color:#6b7280;line-height:1.6;">
      Any person who, fraudulently or willfully makes false, misleading, or exaggerated 
      statements or who conceals information for the purpose of presenting a claim is acting 
      in violation of the Statutory Conditions of their policy. This would lead to a denial 
      of the entire claim and may result in criminal prosecution.
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div>
        <div style="border-bottom:1px solid #374151;height:48px;"></div>
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-top:4px;text-align:center;">DATE</div>
      </div>
      <div>
        <div style="border-bottom:1px solid #374151;height:48px;"></div>
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-top:4px;text-align:center;">SIGNATURE OF INSURED</div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="display:flex;justify-content:space-between;align-items:center;font-size:9px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px;">
    <span>Powered by Job-Dox ContentsDox</span>
    <span>Insured Initials ____________</span>
    <span>Page 1 of 1</span>
  </div>

  ${photoPages ? `<div style="page-break-before:always;padding-top:28px;">
    <div style="font-size:12px;font-weight:700;margin-bottom:14px;color:#0d1b2a;">Photo Documentation</div>
    ${photoPages}
  </div>` : ""}

  <script>window.print();</script>
</body></html>`;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function ContentsDox({ proj, companyId, db, onPushToScope }) {
  // ── CSS injection ──────────────────────────────────────────────
  useEffect(() => {
    const id = "cdox-inner-styles";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = CDOX_CSS;
    document.head.appendChild(el);
    return () => { try { document.getElementById(id)?.remove(); } catch(_){} };
  }, []);

  // ── State ──────────────────────────────────────────────────────
  const [tab,     setTab]     = useState("inventory");
  const [items,   setItems]   = useState([]);
  const [services,setServices]= useState([]);
  const [meta,    setMeta]    = useState({
    jobName: proj?.name||"", claimNumber: proj?.claimNumber||"",
    insuredName: proj?.clientName||"", lossAddress: proj?.address||"",
    dateOfLoss: "", carrier: "", adjusterName: "",
    preparedBy: "", lossType: "Fire"
  });
  const [activeRoom, setRoom]  = useState("All");
  const [filterDisp, setFD]    = useState("All");
  const [loading,    setLoading]= useState(true);
  const [saving,     setSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState(null);

  const metaRef = useRef(meta);
  metaRef.current = meta;

  // ── Firebase: load items ───────────────────────────────────────
  useEffect(() => {
    if (!db || !companyId || !proj?.id) { setLoading(false); return; }
    const colRef = collection(db, "companies", companyId, "projects", proj.id, "contentsItems");
    const unsub = onSnapshot(colRef, snap => {
      const loaded = snap.docs.map(d => ({
        ...blankItem(), ...d.data(), id: d.id, photos: [] // photos not in Firestore v1
      }));
      setItems(loaded);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [db, companyId, proj?.id]);

  // ── Firebase: load meta from project doc ──────────────────────
  useEffect(() => {
    if (!db || !companyId || !proj?.id) return;
    getDoc(doc(db,"companies",companyId,"projects",proj.id)).then(d => {
      if (d.exists() && d.data().contentsMeta) {
        setMeta(m => ({...m, ...d.data().contentsMeta}));
      }
    });
  }, [db, companyId, proj?.id]);

  // ── Firebase: save item (debounced) ───────────────────────────
  const saveItem = useCallback(async (item) => {
    if (!db || !companyId || !proj?.id) return;
    setSaving(true);
    const { photos, ...data } = item; // exclude photos from Firestore
    await setDoc(doc(db,"companies",companyId,"projects",proj.id,"contentsItems",item.id), data);
    setSaving(false);
  }, [db, companyId, proj?.id]);

  // ── Firebase: save meta (debounced) ───────────────────────────
  const saveMeta = useCallback(async (newMeta) => {
    if (!db || !companyId || !proj?.id) return;
    await updateDoc(doc(db,"companies",companyId,"projects",proj.id),
      { contentsMeta: newMeta }).catch(() =>
      setDoc(doc(db,"companies",companyId,"projects",proj.id),
        { contentsMeta: newMeta }, { merge:true })
    );
  }, [db, companyId, proj?.id]);

  // ── Item operations ───────────────────────────────────────────
  const add = () => {
    const item = blankItem(activeRoom==="All"?"":activeRoom);
    setItems(p=>[...p,item]);
    saveItem(item);
  };

  const upd = useCallback((id,f,v) => {
    setItems(p => {
      const next = p.map(i => i.id===id ? {...i,[f]:v} : i);
      const updated = next.find(i=>i.id===id);
      if (updated) saveItem(updated);
      return next;
    });
  }, [saveItem]);

  const del = async (id) => {
    setItems(p=>p.filter(i=>i.id!==id));
    if (db && companyId && proj?.id) {
      await deleteDoc(doc(db,"companies",companyId,"projects",proj.id,"contentsItems",id));
    }
  };

  const dup = (id) => {
    const src = items.find(i=>i.id===id);
    if (!src) return;
    const c = {...src, id:uid(), photos:[]};
    setItems(p=>{const i=p.indexOf(src); const n=[...p]; n.splice(i+1,0,c); return n;});
    saveItem(c);
  };

  const mv = (k,v) => {
    const next = {...meta,[k]:v};
    setMeta(next);
    saveMeta(next);
  };

  // ── Derived values ─────────────────────────────────────────────
  const rooms  = [...new Set(items.map(i=>i.room||"(No Room)"))];
  const vis    = items.filter(i=>{
    const rm = activeRoom==="All"||(i.room||"(No Room)")===activeRoom;
    const dp = filterDisp==="All"||i.disposition===filterDisp;
    return rm&&dp;
  });
  const tRCV   = items.reduce((s,i)=>s+(parseFloat(i.rcv)||0)*(i.quantity||1),0);
  const tACV   = items.reduce((s,i)=>{
    const r=parseFloat(i.rcv)||0, dep=r*((parseFloat(i.depPct)||0)/100);
    return s+(parseFloat(i.acv)||(r-dep))*(i.quantity||1);
  },0);
  const nSalv  = items.filter(i=>i.disposition==="Non-Salvage").length;
  const wPhoto = items.filter(i=>i.photos.length>0).length;

  const svcTotal = services.reduce((s,sv)=>s+(parseFloat(sv.price)||0)*(sv.qty||1),0);

  // ── Services (price list items for scope push) ─────────────────
  const addSvc  = () => setServices(p=>[...p,blankSvc()]);
  const updSvc  = (id,f,v) => setServices(p=>p.map(s=>s.id===id?{...s,[f]:v}:s));
  const delSvc  = (id) => setServices(p=>p.filter(s=>s.id!==id));

  // ── Push SERVICES to scope (NOT RCV/ACV) ──────────────────────
  const pushServices = () => {
    if (!onPushToScope || !services.length) return;
    const lineItems = services.map(s=>({
      id: uid(), desc: s.desc, unit: s.unit||"EA",
      qty: s.qty||1, price: parseFloat(s.price)||0,
      source: "contentsdox",
    }));
    onPushToScope(lineItems);
    setPushStatus(`✓ Pushed ${lineItems.length} contents service line${lineItems.length!==1?"s":""} to Scope`);
    setTimeout(()=>setPushStatus(null), 4000);
  };

  // ── Export PDF ─────────────────────────────────────────────────
  const exportPDF = () => {
    const w = window.open("","_blank");
    w.document.write(buildSOL(meta, items));
    w.document.close();
  };

  if (loading) {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,color:"var(--t3)",gap:10}}>
        <svg className="cdox-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
        Loading contents inventory…
      </div>
    );
  }

  return (
    <div className="cdox-scroll">
      <div style={{maxWidth:1200,margin:"0 auto"}}>

        {/* ── Local topbar strip ── */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[["inventory","Inventory"],["meta","Claim Details"],["summary","Summary"],["services","Services"]].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)}
                style={{background:tab===k?"var(--acc-lo)":"transparent",
                  border:tab===k?"1px solid rgba(228,53,49,.3)":"1px solid var(--br)",
                  borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:tab===k?700:500,
                  color:tab===k?"var(--acc)":"var(--t2)",cursor:"pointer",fontFamily:"var(--ui)",
                  transition:"all .12s"}}>
                {l}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {saving && <span style={{fontSize:10,color:"var(--t3)"}}>Saving…</span>}
            <button className="btn btn-secondary btn-xs" onClick={exportPDF}>{Ico.pdf} Export PDF</button>
          </div>
        </div>

        {/* ═══ INVENTORY TAB ═══ */}
        {tab==="inventory" && (
          <>
            {/* KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}} className="cdox-kpi-bar">
              <Kpi label="Total Items"  value={items.length}      color="var(--t1)"/>
              <Kpi label="Non-Salvage"  value={nSalv}             color="var(--acc)"/>
              <Kpi label="With Photos"  value={wPhoto}            color="var(--blue)"/>
              <Kpi label="Total RCV"    value={fmt$(tRCV)}         color="var(--green)"/>
              <Kpi label="Total ACV"    value={fmt$(tACV)}         color="var(--amber)"/>
            </div>

            {/* Room + disposition filters */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",gap:4,flexWrap:"nowrap",overflowX:"auto",paddingBottom:2}}>
                {["All",...rooms].map(r=>(
                  <button key={r} className={`cdox-chip${activeRoom===r?" on":""}`} onClick={()=>setRoom(r)}>{r}</button>
                ))}
                <button onClick={()=>{const n=prompt("New room name:");if(n&&n.trim()){setItems(p=>[...p,blankItem(n.trim())]);setRoom(n.trim());}}}
                  style={{background:"transparent",border:"1px dashed var(--br)",borderRadius:20,padding:"4px 12px",
                    fontSize:11,color:"var(--t3)",cursor:"pointer",fontFamily:"var(--ui)",whiteSpace:"nowrap",flexShrink:0}}>+ Room</button>
              </div>
              <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
                <span style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)",letterSpacing:".08em"}}>FILTER</span>
                {["All",...DISPOSITIONS].map(d=>(
                  <button key={d} className={`cdox-chip-sm${filterDisp===d?" on":""}`} onClick={()=>setFD(d)}>{d}</button>
                ))}
              </div>
            </div>

            {/* Column headers — desktop only */}
            <div style={{display:"grid",gridTemplateColumns:"28px 1fr 100px 90px 42px 90px 90px 22px",
              gap:8,padding:"4px 12px",marginBottom:4}}>
              {["#","Item","Category","Disposition","Qty","Unit RCV","Total",""].map((h,i)=>(
                <div key={i} style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)",letterSpacing:".06em"}}>{h}</div>
              ))}
            </div>

            {vis.length===0
              ? <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,padding:48,
                  border:"1.5px dashed var(--br)",borderRadius:10,textAlign:"center"}}>
                  {Ico.emptyBox}
                  <div style={{fontSize:11,color:"var(--t2)",fontFamily:"var(--mono)"}}>NO ITEMS YET</div>
                  <div style={{fontSize:12,color:"var(--t3)"}}>Add your first item below. Works great on mobile — tap + camera icon to photo each item.</div>
                </div>
              : vis.map(it=>(
                  <ItemRow key={it.id} item={it}
                    index={items.indexOf(it)}
                    onUpdate={upd} onRemove={del} onDuplicate={dup}/>
                ))
            }

            <button className="cdox-add-btn" onClick={add}>
              {Ico.plus} Add Item{activeRoom!=="All"?` to ${activeRoom}`:""}
            </button>

            {items.length>0 && (
              <div className="cdox-card" style={{marginTop:14,display:"flex",justifyContent:"space-between",
                alignItems:"center",flexWrap:"wrap",gap:10}}>
                <div style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)"}}>
                  {items.length} ITEMS · {rooms.length} ROOM{rooms.length!==1?"S":""} · {nSalv} NON-SALVAGE
                </div>
                <div style={{display:"flex",gap:24}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)",marginBottom:2}}>TOTAL ACV</div>
                    <div style={{fontSize:17,color:"var(--amber)",fontWeight:700,fontFamily:"var(--mono)"}}>{fmt$(tACV)}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)",marginBottom:2}}>TOTAL RCV</div>
                    <div style={{fontSize:21,color:"var(--green)",fontWeight:700,fontFamily:"var(--mono)"}}>{fmt$(tRCV)}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ CLAIM DETAILS TAB ═══ */}
        {tab==="meta" && (
          <div className="cdox-card">
            <div style={{fontSize:14,fontWeight:700,marginBottom:18,color:"var(--t1)"}}>Claim & Job Details</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}} className="cdox-g3">
              <Fld label="Job Name" value={meta.jobName} onChange={v=>mv("jobName",v)} placeholder="e.g. Smith Residence Fire Loss"/>
              <Fld label="Claim Number" value={meta.claimNumber} onChange={v=>mv("claimNumber",v)} placeholder="e.g. CLM-2025-00123"/>
              <Fld label="Date of Loss" value={meta.dateOfLoss} onChange={v=>mv("dateOfLoss",v)} type="date"/>
              <Fld label="Insured Name" value={meta.insuredName} onChange={v=>mv("insuredName",v)} placeholder="Full name of policyholder"/>
              <Fld label="Loss Address" value={meta.lossAddress} onChange={v=>mv("lossAddress",v)} placeholder="Street address of loss"/>
              <Sel label="Loss Type" value={meta.lossType} options={LOSS_TYPES} onChange={v=>mv("lossType",v)}/>
              <Fld label="Insurance Carrier" value={meta.carrier} onChange={v=>mv("carrier",v)} placeholder="e.g. State Farm"/>
              <Fld label="Adjuster Name" value={meta.adjusterName} onChange={v=>mv("adjusterName",v)} placeholder="Adjuster full name"/>
              <Fld label="Prepared By" value={meta.preparedBy} onChange={v=>mv("preparedBy",v)} placeholder="Your name / company"/>
            </div>
            <div style={{marginTop:16,display:"flex",justifyContent:"flex-end"}}>
              <button className="btn btn-primary btn-xs" onClick={exportPDF}>{Ico.pdf} Export Schedule of Loss</button>
            </div>
          </div>
        )}

        {/* ═══ SUMMARY TAB ═══ */}
        {tab==="summary" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}} className="cdox-g2">
            <div className="cdox-card">
              <div style={{fontSize:13,fontWeight:700,marginBottom:14,color:"var(--t1)"}}>By Disposition</div>
              {DISPOSITIONS.map(d=>{
                const sub=items.filter(i=>i.disposition===d);
                const val=sub.reduce((s,i)=>s+(parseFloat(i.rcv)||0)*(i.quantity||1),0);
                const pct=tRCV>0?(val/tRCV*100).toFixed(1):0;
                const c=DISP_COLOR[d];
                return (
                  <div key={d} style={{marginBottom:11}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}>
                      <span style={{color:c,fontWeight:600}}>{d}</span>
                      <span style={{color:"var(--t2)",fontSize:11,fontFamily:"var(--mono)"}}>{sub.length} items · {fmt$(val)}</span>
                    </div>
                    <div className="cdox-bar-track"><div className="cdox-bar-fill" style={{background:c,width:`${pct}%`}}/></div>
                  </div>
                );
              })}
            </div>
            <div className="cdox-card">
              <div style={{fontSize:13,fontWeight:700,marginBottom:14,color:"var(--t1)"}}>By Room</div>
              {rooms.length===0
                ? <div style={{color:"var(--t3)",fontSize:12}}>No rooms defined yet.</div>
                : rooms.map(r=>{
                    const sub=items.filter(i=>(i.room||"(No Room)")===r);
                    const val=sub.reduce((s,i)=>s+(parseFloat(i.rcv)||0)*(i.quantity||1),0);
                    const pct=tRCV>0?(val/tRCV*100).toFixed(1):0;
                    return (
                      <div key={r} style={{marginBottom:11}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}>
                          <span style={{color:"var(--t1)"}}>{r}</span>
                          <span style={{color:"var(--t2)",fontSize:11,fontFamily:"var(--mono)"}}>{sub.length} items · {fmt$(val)}</span>
                        </div>
                        <div className="cdox-bar-track"><div className="cdox-bar-fill" style={{background:"var(--acc)",width:`${pct}%`}}/></div>
                      </div>
                    );
                  })
              }
            </div>
            <div className="cdox-card" style={{gridColumn:"1/-1"}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:14,color:"var(--t1)"}}>By Category</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}} className="cdox-g3">
                {CATEGORIES.map(cat=>{
                  const sub=items.filter(i=>i.category===cat);
                  if(!sub.length) return null;
                  const val=sub.reduce((s,i)=>s+(parseFloat(i.rcv)||0)*(i.quantity||1),0);
                  return (
                    <div key={cat} style={{background:"var(--s3)",borderRadius:8,padding:"10px 13px",
                      display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontWeight:600,fontSize:12,color:"var(--t1)"}}>{cat}</div>
                        <div style={{color:"var(--t3)",fontSize:10}}>{sub.length} item{sub.length!==1?"s":""}</div>
                      </div>
                      <div style={{color:"var(--green)",fontSize:13,fontWeight:700,fontFamily:"var(--mono)"}}>{fmt$(val)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{gridColumn:"1/-1",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button className="btn btn-primary" onClick={exportPDF}>{Ico.pdf} Export Schedule of Loss PDF</button>
            </div>
          </div>
        )}

        {/* ═══ SERVICES TAB (scope push) ═══ */}
        {tab==="services" && (
          <>
            {/* Explainer */}
            <div style={{background:"rgba(91,163,245,.07)",border:"1px solid rgba(91,163,245,.2)",
              borderRadius:9,padding:"12px 16px",marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--blue)",marginBottom:4}}>Contents Services → Scope / Invoice</div>
              <div style={{fontSize:11,color:"var(--t2)",lineHeight:1.6}}>
                Add the <strong>services your company performs</strong> for contents — pack-out labor, box/wrap
                materials, cleaning, storage fees, pack-back. These are your billable line items.
                <br/>
                <span style={{color:"var(--t3)"}}>⚠ Insurance replacement values (RCV/ACV) do not flow here — they are for the Schedule of Loss PDF only.</span>
              </div>
            </div>

            {/* Column headers */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 60px 70px 80px 28px",
              gap:6,padding:"4px 10px",marginBottom:4}}>
              {["Description","Unit","Qty","Unit Price",""].map((h,i)=>(
                <div key={i} style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)"}}>{h}</div>
              ))}
            </div>

            {services.length===0
              ? <div style={{border:"1.5px dashed var(--br)",borderRadius:9,padding:"32px",
                  textAlign:"center",color:"var(--t3)",fontSize:12"}}>
                  No services added yet. Add pack-out, cleaning, storage, and other contents services your company performs.
                </div>
              : services.map(svc=>(
                  <div key={svc.id} className="cdox-svc-row">
                    <input value={svc.desc} onChange={e=>updSvc(svc.id,"desc",e.target.value)}
                      placeholder="e.g. Contents Pack-Out Labor" className="cdox-inp" style={{fontSize:11}}/>
                    <input value={svc.unit} onChange={e=>updSvc(svc.id,"unit",e.target.value)}
                      placeholder="EA" className="cdox-inp" style={{fontSize:11,textAlign:"center"}}/>
                    <input type="number" value={svc.qty} onChange={e=>updSvc(svc.id,"qty",parseFloat(e.target.value)||1)}
                      className="cdox-inp" style={{fontSize:11}}/>
                    <div style={{position:"relative"}}>
                      <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"var(--t3)",fontSize:11}}>$</span>
                      <input type="number" value={svc.price} onChange={e=>updSvc(svc.id,"price",e.target.value)}
                        placeholder="0.00" className="cdox-inp" style={{fontSize:11,paddingLeft:18}}/>
                    </div>
                    <button onClick={()=>delSvc(svc.id)}
                      style={{background:"transparent",border:"none",color:"var(--t3)",cursor:"pointer",
                        display:"flex",alignItems:"center",justifyContent:"center",padding:4}}>
                      {Ico.trash}
                    </button>
                  </div>
                ))
            }

            <button className="cdox-add-btn" onClick={addSvc} style={{marginBottom:14}}>
              {Ico.plus} Add Service Line
            </button>

            {services.length>0 && (
              <div className="cdox-card" style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)",marginBottom:2}}>CONTENTS SERVICES TOTAL</div>
                  <div style={{fontSize:22,color:"var(--green)",fontWeight:700,fontFamily:"var(--mono)"}}>{fmt$(svcTotal)}</div>
                </div>
                <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                  {pushStatus && <span style={{fontSize:11,fontWeight:700,color:pushStatus.startsWith("✓")?"var(--green)":"var(--amber)"}}>{pushStatus}</span>}
                  {onPushToScope && (
                    <button className="btn btn-blue" onClick={pushServices}>
                      {Ico.push} Push to Scope / Invoice
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
