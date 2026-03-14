/* ══════════════════════════════════════════════════════════════════
   DRYDOX CONSTANTS, HELPERS & CSS
   Shared across all DryDox sub-modules
══════════════════════════════════════════════════════════════════ */

// ── Equipment types ──
export const EQUIP_TYPES = [
  { value:"fan",        label:"Air Mover",           icon:"🌀", code:"AM", xactCode:"WTR EQAM" },
  { value:"dehu",       label:"Dehumidifier (LGR)",  icon:"💧", code:"DH", xactCode:"WTR EQDH" },
  { value:"dehu-des",   label:"Desiccant Dehu",      icon:"🔵", code:"DD", xactCode:"WTR EQDD" },
  { value:"scrubber",   label:"HEPA Air Scrubber",   icon:"🌬️", code:"AS", xactCode:"WTR EQAS" },
  { value:"negair",     label:"Negative Air Machine",icon:"⬇️", code:"NA", xactCode:"WTR EQNA" },
  { value:"ozone",      label:"Ozone Generator",     icon:"🟡", code:"OZ", xactCode:"WTR EQOZ" },
  { value:"fogger",     label:"Thermal Fogger",      icon:"🌫️", code:"FG", xactCode:"WTR EQFG" },
  { value:"mat",        label:"Drying Mat",          icon:"🟫", code:"DM", xactCode:"WTR EQDM" },
  { value:"injectidry", label:"InjectiDry System",   icon:"💉", code:"ID", xactCode:"WTR EQID" },
  { value:"thermal",    label:"Thermal Camera",      icon:"📷", code:"TC", xactCode:"WTR EQTC" },
  { value:"other",      label:"Other Equipment",     icon:"🔧", code:"OT", xactCode:"WTR EQOT" },
];
export const getET = v => EQUIP_TYPES.find(t=>t.value===v) || EQUIP_TYPES[EQUIP_TYPES.length-1];

// ── Material classes (IICRC S500 standard) ──
export const MATERIAL_CLASSES = [
  { id:"class1", label:"Class 1", desc:"Low evaporation rate (concrete, stone)", dryStd:17, color:"var(--green)" },
  { id:"class2", label:"Class 2", desc:"Medium evaporation (plywood, drywall)", dryStd:15, color:"var(--blue)" },
  { id:"class3", label:"Class 3", desc:"Fast evaporation (carpet, insulation)", dryStd:12, color:"var(--amber)" },
  { id:"class4", label:"Class 4", desc:"Specialty (hardwood, concrete sub-floor)", dryStd:21, color:"var(--purple)" },
];

// ── Water loss categories (IICRC) ──
export const WATER_CATEGORIES = [
  { id:"cat1", label:"Category 1", desc:"Clean water (supply lines, rain)", color:"var(--blue)" },
  { id:"cat2", label:"Category 2", desc:"Gray water (dishwasher, washing machine)", color:"var(--amber)" },
  { id:"cat3", label:"Category 3", desc:"Black water (sewage, flooding)", color:"var(--acc)" },
];

// ── Moisture reading types ──
export const READING_TYPES = [
  { id:"pin",   label:"Pin Meter",   desc:"Penetrating moisture (%MC)", unit:"%MC" },
  { id:"npin",  label:"Non-Penetrating", desc:"Relative surface reading", unit:"REL" },
  { id:"thermo",label:"Thermo-Hygrometer", desc:"Ambient temp/RH/GPP", unit:"RH%" },
  { id:"calcium",label:"Calcium Chloride", desc:"MVER for concrete", unit:"lbs/1000sf/24hr" },
];

// ── Psychrometric constants ──
export const DRY_STANDARD_RH  = 55;   // Below this = dry
export const DRY_WARNING_RH   = 65;   // Between 55-65 = trending
export const DRY_STANDARD_GPP = 72;   // Grains per pound threshold
export const TARGET_TEMP_MIN  = 70;
export const TARGET_TEMP_MAX  = 90;

// ── Helpers ──
let _ddId = Date.now();
export const dduid = () => `dd-${_ddId++}`;

export const fmt$  = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n||0);
export const fmt$c = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n||0);

export const rhColor = rh => rh<=DRY_STANDARD_RH ? "var(--green)" : rh<=DRY_WARNING_RH ? "var(--amber)" : "var(--acc)";
export const rhLabel = rh => rh<=DRY_STANDARD_RH ? "DRY" : rh<=DRY_WARNING_RH ? "TRENDING" : "WET";

export const fmtDate = d => {
  if (!d) return "";
  const dt = d instanceof Date ? d : (d.toDate ? d.toDate() : new Date(d));
  return dt.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
};

export const fmtShort = d => {
  if (!d) return "";
  const dt = d instanceof Date ? d : (d.toDate ? d.toDate() : new Date(d));
  return dt.toLocaleDateString("en-US",{month:"short",day:"numeric"});
};

// Psychrometric: Calculate GPP from temp (°F) and RH (%)
export function calcGPP(tempF, rh) {
  if (!tempF || !rh) return 0;
  const tempC = (tempF - 32) * 5/9;
  // Saturation vapor pressure (Antoine equation approximation)
  const es = 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
  const ea = es * (rh / 100);
  // Convert to grains per pound: ea(hPa) → mixing ratio → GPP
  const w = 0.622 * (ea / (1013.25 - ea)); // mixing ratio kg/kg
  const gpp = w * 7000; // 7000 grains per pound
  return Math.round(gpp * 10) / 10;
}

// Dew point calculation
export function calcDewPoint(tempF, rh) {
  if (!tempF || !rh) return 0;
  const tempC = (tempF - 32) * 5/9;
  const a = 17.27, b = 237.7;
  const gamma = (a * tempC) / (b + tempC) + Math.log(rh/100);
  const dpC = (b * gamma) / (a - gamma);
  return Math.round((dpC * 9/5 + 32) * 10) / 10;
}

// ── IICRC S500 Equipment Recommendation Formulas ──
// Chart factors for dehumidifier PPD calculation by water class
export const S500_DEHU_FACTORS = {
  class1: 100,  // Low evaporation
  class2: 50,   // Medium evaporation
  class3: 40,   // Fast evaporation
  class4: 40,   // Specialty drying
};

// Default dehumidifier AHAM rating (PPD) — user can override per unit
export const DEFAULT_DEHU_PPD = 80;

// Default air scrubber CFM rating — user can override
export const DEFAULT_SCRUBBER_CFM = 500;

// Standard air changes per hour for air scrubbers (Cat 3 = 6, Cat 2 = 4, Cat 1 = 0)
export const S500_ACH = {
  cat1: 0,  // Category 1 — no scrubber required by standard
  cat2: 4,  // Category 2 — gray water
  cat3: 6,  // Category 3 — black water
};

/**
 * Calculate S500 air mover recommendation for a room.
 * Method: 1 air mover per 50 SF of affected floor area (high density)
 *         or 1 per 14 LF of wall (wall method) — we use whichever is higher.
 */
export function calcAirMovers(room) {
  const sqft = (parseFloat(room.widthFt) || 0) * (parseFloat(room.depthFt) || 0);
  const perimLF = 2 * ((parseFloat(room.widthFt) || 0) + (parseFloat(room.depthFt) || 0));
  const byFloor = Math.ceil(sqft / 50);
  const byWall = Math.ceil(perimLF / 14);
  return Math.max(byFloor, byWall, 1);
}

/**
 * Calculate S500 dehumidifier recommendation for a room.
 * Formula: Cubic footage ÷ chart factor = PPD needed
 *          PPD needed ÷ dehu AHAM rating = number of units
 */
export function calcDehumidifiers(room, dehuPPD = DEFAULT_DEHU_PPD) {
  const sqft = (parseFloat(room.widthFt) || 0) * (parseFloat(room.depthFt) || 0);
  const ceilingFt = parseFloat(room.ceilingFt) || 8;
  const cubicFt = sqft * ceilingFt;
  const matClass = room.materialClass || "class2";
  const factor = S500_DEHU_FACTORS[matClass] || 50;
  const ppdNeeded = cubicFt / factor;
  return Math.max(Math.ceil(ppdNeeded / dehuPPD), sqft > 0 ? 1 : 0);
}

/**
 * Calculate S500 air scrubber recommendation for a room.
 * Formula: CFM = (Cubic Feet × ACH) / 60
 *          Units = CFM needed ÷ scrubber CFM rating
 * Only required for Cat 2/3 water.
 */
export function calcAirScrubbers(room, scrubberCFM = DEFAULT_SCRUBBER_CFM) {
  const category = room.category || "cat1";
  const ach = S500_ACH[category] || 0;
  if (ach === 0) return 0;
  const sqft = (parseFloat(room.widthFt) || 0) * (parseFloat(room.depthFt) || 0);
  const ceilingFt = parseFloat(room.ceilingFt) || 8;
  const cubicFt = sqft * ceilingFt;
  const cfmNeeded = (cubicFt * ach) / 60;
  return Math.max(Math.ceil(cfmNeeded / scrubberCFM), 1);
}

/**
 * Calculate full S500 recommendation for all rooms.
 * Returns { rooms: [...per-room], totals: { fan, dehu, scrubber } }
 */
export function calcS500Recommendations(rooms, dehuPPD = DEFAULT_DEHU_PPD, scrubberCFM = DEFAULT_SCRUBBER_CFM) {
  const result = { rooms: [], totals: { fan: 0, dehu: 0, scrubber: 0 } };
  (rooms || []).forEach(room => {
    const fan = calcAirMovers(room);
    const dehu = calcDehumidifiers(room, dehuPPD);
    const scrubber = calcAirScrubbers(room, scrubberCFM);
    result.rooms.push({ roomId: room.id, label: room.label, fan, dehu, scrubber });
    result.totals.fan += fan;
    result.totals.dehu += dehu;
    result.totals.scrubber += scrubber;
  });
  return result;
}

/**
 * Compare deployed equipment vs S500 recommendations.
 * Returns { matched, mismatches[], deployed: {fan,dehu,scrubber}, recommended: {fan,dehu,scrubber} }
 */
export function compareS500(rooms, equipmentPlacements, dehuPPD, scrubberCFM) {
  const recs = calcS500Recommendations(rooms, dehuPPD, scrubberCFM);
  const active = (equipmentPlacements || []).filter(e => !e.removedAt);

  const deployed = { fan: 0, dehu: 0, scrubber: 0 };
  active.forEach(eq => {
    if (eq.type === "fan") deployed.fan++;
    else if (eq.type === "dehu" || eq.type === "dehu-des") deployed.dehu++;
    else if (eq.type === "scrubber" || eq.type === "negair") deployed.scrubber++;
  });

  const mismatches = [];
  if (deployed.fan < recs.totals.fan) mismatches.push({ type: "fan", label: "Air Movers", deployed: deployed.fan, recommended: recs.totals.fan });
  if (deployed.dehu < recs.totals.dehu) mismatches.push({ type: "dehu", label: "Dehumidifiers", deployed: deployed.dehu, recommended: recs.totals.dehu });
  if (deployed.scrubber < recs.totals.scrubber) mismatches.push({ type: "scrubber", label: "Air Scrubbers", deployed: deployed.scrubber, recommended: recs.totals.scrubber });
  // Also flag over-deployment (not a violation, but informational)
  if (deployed.fan > recs.totals.fan) mismatches.push({ type: "fan", label: "Air Movers", deployed: deployed.fan, recommended: recs.totals.fan, over: true });
  if (deployed.dehu > recs.totals.dehu) mismatches.push({ type: "dehu", label: "Dehumidifiers", deployed: deployed.dehu, recommended: recs.totals.dehu, over: true });

  return {
    matched: mismatches.filter(m => !m.over).length === 0,
    mismatches,
    deployed,
    recommended: recs.totals,
    perRoom: recs.rooms,
  };
}

// ── SVG Icons used across DryDox ──
export const DDIc = {
  drop:    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/></svg>,
  plus:    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  trash:   <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>,
  check:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>,
  scan:    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 8h1.5v1.5H13V13zm1.5 1.5H16V16h-1.5v-1.5zM16 13h1.5v1.5H16V13zm-3 3h1.5v1.5H13V16zm1.5 1.5H16V19h-1.5v-1.5zM16 16h1.5v1.5H16V16zm1.5-1.5H19V16h-1.5v-1.5zm0 3H19V19h-1.5v-1.5z"/></svg>,
  floor:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 12h4v5H7zm6-5h4v4h-4zm-6-0h4v4H7zm6 6h4v4h-4z" opacity=".3"/></svg>,
  chart:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zM16.2 13h2.8v6h-2.8v-6z"/></svg>,
  pdf:     <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg>,
  export:  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/></svg>,
  move:    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/></svg>,
  equip:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>,
  scope:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/></svg>,
  camera:  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8a3.2 3.2 0 0 1 3.2 3.2 3.2 3.2 0 0 1-3.2 3.2M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z"/></svg>,
  lidar:   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><circle cx="12" cy="12" r="3"/><path d="M12 7c-2.76 0-5 2.24-5 5h2c0-1.66 1.34-3 3-3V7zm0 10c2.76 0 5-2.24 5-5h-2c0 1.66-1.34 3-3 3v2z"/></svg>,
  ruler:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h2v4h2V8h2v4h2V8h2v4h2V8h2v4h2V8h2v8z"/></svg>,
  pricetag:<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>,
  layers:  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z"/></svg>,
  pin:     <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>,
  upload:  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>,
  drag:    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>,
  warn:    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>,
  fix:     <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>,
};

// ── DryDox CSS ──
export const DRYDOX_CSS = `
/* DryDox Module Styles */
.dd-wrap{display:flex;flex-direction:column;flex:1;overflow:hidden;font-family:var(--ui);}
.dd-subtabs{display:flex;background:var(--s2);border-bottom:1px solid var(--br);padding:0 12px;flex-shrink:0;overflow-x:auto;-webkit-overflow-scrolling:touch;}
.dd-subtab{background:none;border:none;font-family:var(--ui);font-size:11px;padding:10px 12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t2);font-weight:400;transition:all .12s;white-space:nowrap;display:flex;align-items:center;gap:5px;}
.dd-subtab.active{color:var(--t1);font-weight:700;border-bottom-color:var(--acc);}
.dd-subtab .dd-badge{font-size:8px;background:var(--acc);color:#fff;border-radius:9px;padding:1px 5px;font-family:var(--mono);}
.dd-body{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;}
.dd-content{max-width:960px;margin:0 auto;padding:16px;}
@media(max-width:600px){.dd-content{padding:10px;}}

/* KPI cards */
.dd-kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:14px;}
.dd-kpi{background:var(--s2);border:1px solid var(--br);border-radius:9px;padding:12px;text-align:center;}
.dd-kpi-val{font-family:var(--mono);font-size:20px;font-weight:700;margin-bottom:2px;}
.dd-kpi-lbl{font-family:var(--mono);font-size:8px;color:var(--t2);text-transform:uppercase;letter-spacing:.07em;}
@media(max-width:600px){.dd-kpi-row{grid-template-columns:repeat(2,1fr);}.dd-kpi-val{font-size:16px;}}

/* Section headers */
.dd-sec{font-size:14px;font-weight:700;color:var(--t1);margin-bottom:8px;}
.dd-sec-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px;flex-wrap:wrap;}

/* Cards */
.dd-card{background:var(--s2);border:1px solid var(--br);border-radius:10px;padding:14px;margin-bottom:8px;transition:border-color .12s;}
.dd-card:hover{border-color:var(--br-hi);}
.dd-card-header{display:flex;align-items:center;justify-content:space-between;gap:8px;}

/* Floor plan canvas */
.dd-canvas-wrap{position:relative;background:var(--s1);border:1px solid var(--br);border-radius:12px;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;}
.dd-canvas-wrap canvas{display:block;width:100%;height:100%;}
.dd-canvas-toolbar{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:4px;background:var(--s2);border:1px solid var(--br);border-radius:8px;padding:4px;box-shadow:0 4px 16px rgba(0,0,0,.3);z-index:10;}
.dd-canvas-btn{background:transparent;border:1px solid transparent;color:var(--t2);border-radius:6px;padding:6px 10px;cursor:pointer;font-family:var(--ui);font-size:10px;display:flex;align-items:center;gap:4px;transition:all .12s;white-space:nowrap;}
.dd-canvas-btn:hover{background:var(--s3);color:var(--t1);}
.dd-canvas-btn.active{background:var(--acc-lo);border-color:rgba(228,53,49,.25);color:var(--acc);}

/* Moisture point markers */
.dd-moisture-pin{position:absolute;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;font-family:var(--mono);cursor:pointer;transform:translate(-50%,-50%);transition:transform .12s;z-index:5;border:2px solid;}
.dd-moisture-pin:hover{transform:translate(-50%,-50%) scale(1.2);}
.dd-moisture-pin.wet{background:rgba(228,53,49,.2);border-color:var(--acc);color:var(--acc);}
.dd-moisture-pin.trending{background:rgba(232,156,24,.2);border-color:var(--amber);color:var(--amber);}
.dd-moisture-pin.dry{background:rgba(26,217,138,.2);border-color:var(--green);color:var(--green);}

/* Equipment on floor plan */
.dd-equip-marker{position:absolute;cursor:grab;transform:translate(-50%,-50%);z-index:6;transition:box-shadow .12s;}
.dd-equip-marker:active{cursor:grabbing;box-shadow:0 4px 16px rgba(0,0,0,.4);}
.dd-equip-icon{width:32px;height:32px;border-radius:8px;background:var(--s2);border:1px solid var(--br);display:flex;align-items:center;justify-content:center;font-size:16px;}

/* Reading history */
.dd-reading-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--br);}
.dd-reading-row:last-child{border-bottom:none;}
.dd-chip{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:5px;font-size:10px;font-weight:700;font-family:var(--mono);}

/* Equipment grid */
.dd-equip-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px;}
@media(max-width:600px){.dd-equip-grid{grid-template-columns:1fr;}}
.dd-equip-card{background:var(--s2);border:1px solid var(--br);border-radius:10px;padding:12px;cursor:grab;transition:all .12s;}
.dd-equip-card:active{cursor:grabbing;border-color:var(--acc);box-shadow:0 4px 16px rgba(228,53,49,.2);}
.dd-equip-card.deployed{border-left:3px solid var(--green);}
.dd-equip-card.removed{opacity:.6;border-left:3px solid var(--t3);}

/* Scope inline */
.dd-scope-row{display:grid;grid-template-columns:1fr 60px 80px 80px 28px;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--br);}
@media(max-width:600px){.dd-scope-row{grid-template-columns:1fr 50px 60px 60px 24px;gap:4px;font-size:11px;}}

/* Report preview */
.dd-report-preview{background:#fff;color:#111;border-radius:8px;padding:32px;max-width:800px;margin:0 auto;font-family:'Outfit',sans-serif;}
.dd-report-preview h2{font-size:16px;margin:20px 0 8px;border-bottom:2px solid #e43531;padding-bottom:4px;}
.dd-report-preview table{width:100%;border-collapse:collapse;margin:8px 0 16px;}
.dd-report-preview th,.dd-report-preview td{border:1px solid #ddd;padding:6px 8px;font-size:11px;text-align:left;}
.dd-report-preview th{background:#f5f5f5;font-weight:700;}

/* Chart container */
.dd-chart{background:var(--s2);border:1px solid var(--br);border-radius:10px;padding:14px;margin-bottom:12px;}
.dd-chart-title{font-size:12px;font-weight:700;color:var(--t1);margin-bottom:8px;}
.dd-chart-svg{width:100%;overflow:visible;}

/* Drag overlay */
.dd-drag-overlay{position:fixed;inset:0;z-index:100;pointer-events:none;}
.dd-drag-ghost{position:absolute;pointer-events:none;opacity:.8;transform:translate(-50%,-50%);z-index:101;}

/* Modal / Sheet */
.dd-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(3px);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}
@media(max-width:600px){.dd-modal-overlay{align-items:flex-end;padding:0;}}
.dd-modal{background:var(--s2);border:1px solid var(--br);border-radius:14px;width:100%;max-width:600px;max-height:90vh;overflow-y:auto;padding:20px;animation:jd-pop .15s ease both;}
@media(max-width:600px){.dd-modal{border-radius:18px 18px 0 0;max-height:92vh;padding:16px 14px calc(16px + env(safe-area-inset-bottom,0px));}}
.dd-modal-title{font-size:16px;font-weight:700;color:var(--t1);margin-bottom:14px;}

/* Floor plan room labels */
.dd-room-label{position:absolute;padding:3px 8px;border-radius:4px;font-size:9px;font-weight:700;font-family:var(--mono);letter-spacing:.04em;color:var(--t1);background:rgba(0,0,0,.6);white-space:nowrap;pointer-events:none;z-index:4;}
.dd-room-dims{font-size:8px;color:var(--t2);font-weight:400;margin-top:1px;}

/* LiDAR scanning UI */
.dd-lidar-prompt{display:flex;flex-direction:column;align-items:center;gap:14px;padding:40px 20px;text-align:center;}
.dd-lidar-icon{width:64px;height:64px;border-radius:16px;background:var(--acc-lo);display:flex;align-items:center;justify-content:center;color:var(--acc);}
.dd-scan-progress{width:100%;max-width:300px;height:6px;background:var(--s3);border-radius:3px;overflow:hidden;}
.dd-scan-progress-bar{height:100%;background:var(--acc);border-radius:3px;transition:width .3s ease;}

/* Psychrometric chart mini */
.dd-psychro{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:12px;}
.dd-psychro-card{background:var(--s2);border:1px solid var(--br);border-radius:8px;padding:10px;text-align:center;}
.dd-psychro-val{font-family:var(--mono);font-size:16px;font-weight:700;}
.dd-psychro-lbl{font-size:8px;color:var(--t3);text-transform:uppercase;font-family:var(--mono);letter-spacing:.06em;margin-top:2px;}
`;
