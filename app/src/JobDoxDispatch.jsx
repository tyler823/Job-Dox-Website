// ════════════════════════════════════════════════════════════════
//  Job-Dox · Dispatch Panel
//  Map-based project dispatch, scheduling & AI route optimization
// ════════════════════════════════════════════════════════════════
import { useState, useRef, useEffect, useMemo, useCallback } from "react";

// ── CSS for Dispatch Panel ──
const DISPATCH_CSS = `
.dispatch-page{flex:1;display:flex;overflow:hidden;height:100%;}
.dispatch-sidebar{width:340px;flex-shrink:0;border-right:1px solid var(--br);background:var(--s1);display:flex;flex-direction:column;overflow:hidden;}
.dispatch-sidebar-hd{padding:14px 16px 10px;border-bottom:1px solid var(--br);flex-shrink:0;}
.dispatch-sidebar-body{flex:1;overflow-y:auto;padding:8px;}
.dispatch-map-area{flex:1;position:relative;background:var(--s2);overflow:hidden;}
.dispatch-map{width:100%;height:100%;}

.dispatch-filter-bar{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px;}
.dispatch-proj-card{background:var(--s2);border:1px solid var(--br);border-radius:9px;padding:10px 12px;margin-bottom:6px;cursor:pointer;transition:all .12s;}
.dispatch-proj-card:hover{border-color:var(--blue);box-shadow:0 2px 10px rgba(91,163,245,.12);}
.dispatch-proj-card.selected{border-color:var(--acc);background:var(--acc-lo);}

.dispatch-detail-panel{position:absolute;top:12px;right:12px;width:380px;max-height:calc(100% - 24px);background:var(--s2);border:1px solid var(--br);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.35);z-index:10;display:flex;flex-direction:column;overflow:hidden;animation:jd-pop .15s ease both;}
.dispatch-detail-hd{padding:14px 16px 10px;border-bottom:1px solid var(--br);display:flex;align-items:flex-start;justify-content:space-between;gap:8px;flex-shrink:0;}
.dispatch-detail-body{flex:1;overflow-y:auto;padding:14px 16px;}

.dispatch-cal-wrap{background:var(--s1);border:1px solid var(--br);border-radius:10px;overflow:hidden;}
.dispatch-cal-hd{padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--br);}
.dispatch-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;padding:6px;}
.dispatch-cal-day{width:100%;aspect-ratio:1;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;cursor:pointer;border:none;background:transparent;color:var(--t2);font-family:var(--ui);transition:all .12s;position:relative;}
.dispatch-cal-day:hover{background:var(--s3);color:var(--t1);}
.dispatch-cal-day.today{background:var(--acc-lo);color:var(--acc);font-weight:700;}
.dispatch-cal-day.sel{background:var(--acc);color:#fff;font-weight:700;}
.dispatch-cal-day.other{opacity:.25;}
.dispatch-cal-day .dot-row{display:flex;gap:2px;position:absolute;bottom:2px;}
.dispatch-cal-day .appt-dot{width:4px;height:4px;border-radius:50%;}

.dispatch-appt-card{background:var(--s2);border:1px solid var(--br);border-left:3px solid var(--blue);border-radius:8px;padding:10px 12px;margin-bottom:6px;cursor:pointer;transition:all .12s;}
.dispatch-appt-card:hover{border-color:var(--blue);box-shadow:0 2px 10px rgba(91,163,245,.12);}
.dispatch-appt-card.editing{border-color:var(--acc);box-shadow:0 0 0 2px var(--acc-lo);}

.dispatch-ai-btn{background:linear-gradient(135deg,rgba(167,139,250,.15),rgba(91,163,245,.15));border:1px solid rgba(167,139,250,.3);border-radius:8px;padding:10px 14px;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:10px;width:100%;}
.dispatch-ai-btn:hover{border-color:rgba(167,139,250,.5);box-shadow:0 4px 16px rgba(167,139,250,.15);}

.dispatch-comment-thread{display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto;margin:8px 0;}
.dispatch-comment{display:flex;gap:8px;align-items:flex-start;}
.dispatch-comment-bubble{flex:1;background:var(--s3);border-radius:8px;padding:7px 10px;border:1px solid var(--br);}

@media(max-width:768px){
  .dispatch-sidebar{width:100%;position:absolute;z-index:5;height:50%;bottom:0;border-right:none;border-top:1px solid var(--br);}
  .dispatch-detail-panel{width:calc(100% - 24px);max-height:60%;}
}
`;

// ── Inject styles once ──
let _dispatchStyled = false;
function injectDispatchCSS() {
  if (_dispatchStyled) return;
  _dispatchStyled = true;
  const s = document.createElement("style");
  s.textContent = DISPATCH_CSS;
  document.head.appendChild(s);
}

// ── Haversine distance (miles) ──
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Geocode address using Photon/Nominatim ──
async function geocodeAddress(addressStr) {
  if (!addressStr?.trim()) return null;
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(addressStr)}&limit=3&lang=en`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const features = (data.features || []);
      const us = features.find(f => f.properties?.countrycode === 'US') || features[0];
      if (us) {
        const [lng, lat] = us.geometry.coordinates;
        return { lat, lng };
      }
    }
  } catch { /* fall through */ }
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressStr)}&limit=1&countrycodes=us`;
    const res = await fetch(url, { headers: { "Accept-Language": "en-US,en" } });
    if (res.ok) {
      const data = await res.json();
      if (data.length) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch { /* both failed */ }
  return null;
}

// ── LS helpers for dispatch appointments ──
const LS_DISPATCH_APPTS = "jd_dispatch_appointments";
function loadDispatchAppts(companyId) {
  try { return JSON.parse(localStorage.getItem(`${LS_DISPATCH_APPTS}_${companyId}`)) || []; } catch { return []; }
}
function saveDispatchAppts(companyId, appts) {
  try { localStorage.setItem(`${LS_DISPATCH_APPTS}_${companyId}`, JSON.stringify(appts)); } catch {}
}

// ── LS helpers for dispatch resources (trucks/crews) ──
const LS_DISPATCH_RESOURCES = "jd_dispatch_resources";
function loadDispatchResources(companyId) {
  try { return JSON.parse(localStorage.getItem(`${LS_DISPATCH_RESOURCES}_${companyId}`)) || []; } catch { return []; }
}
function saveDispatchResources(companyId, resources) {
  try { localStorage.setItem(`${LS_DISPATCH_RESOURCES}_${companyId}`, JSON.stringify(resources)); } catch {}
}

// ── LS for project lat/lng cache ──
const LS_GEO_CACHE = "jd_dispatch_geocache";
function loadGeoCache() { try { return JSON.parse(localStorage.getItem(LS_GEO_CACHE)) || {}; } catch { return {}; } }
function saveGeoCache(cache) { try { localStorage.setItem(LS_GEO_CACHE, JSON.stringify(cache)); } catch {} }

// ── Unique ID generator ──
let _dispatchId = 5000;
const duid = () => `d_${Date.now()}_${++_dispatchId}`;

// ── Date helpers ──
const TODAY_ISO = new Date().toISOString().split("T")[0];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function isWithinDays(dateStr, days) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const diff = (now - d) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

// ════════════════════════════════════════════════════════════════
//  MINI AVATAR (matches portal Av)
// ════════════════════════════════════════════════════════════════
const AVCOLORS = ["#5ba3f5","#1ad98a","#e89c18","#a78bfa","#e43531","#22d3ee"];
function Av({ name, color, size=28 }) {
  const init = (name||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  return <div style={{width:size,height:size,borderRadius:"50%",background:color||"var(--s4)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.34,fontWeight:700,flexShrink:0,letterSpacing:"-0.5px"}}>{init}</div>;
}

// ════════════════════════════════════════════════════════════════
//  ICONS (subset matching portal)
// ════════════════════════════════════════════════════════════════
const DIc = {
  close:    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
  check:    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>,
  plus:     <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  search:   <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>,
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg>,
  pin:      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>,
  office:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>,
  filter:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>,
  ai:       <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  comment:  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>,
  truck:    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>,
  edit:     <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>,
  del:      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>,
  send:     <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>,
  route:    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z"/></svg>,
  crew:     <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
  back:     <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>,
  chevL:    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>,
  chevR:    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>,
  folder:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>,
  dispatch: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/></svg>,
};


// ════════════════════════════════════════════════════════════════
//  LEAFLET MAP COMPONENT (no API key needed, uses OpenStreetMap)
// ════════════════════════════════════════════════════════════════
let _leafletLoaded = false;
let _leafletResolve = null;
const _leafletReady = new Promise(r => { _leafletResolve = r; });

function loadLeaflet() {
  if (_leafletLoaded) return _leafletReady;
  _leafletLoaded = true;
  // CSS
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
  // JS
  const script = document.createElement("script");
  script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  script.onload = () => _leafletResolve(window.L);
  document.head.appendChild(script);
  return _leafletReady;
}

function DispatchMap({ markers, officeMarkers, selectedId, onMarkerClick, center, zoom }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then(L => {
      if (cancelled || !mapRef.current) return;
      if (mapInstanceRef.current) return; // already initialized

      const map = L.map(mapRef.current, {
        center: center || [39.8283, -98.5795], // center of US
        zoom: zoom || 5,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);
    });
    return () => { cancelled = true; };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const L = window.L;
    if (!L) return;

    markersLayerRef.current.clearLayers();

    // Office markers (blue building icon)
    officeMarkers.forEach(o => {
      if (o.lat == null || o.lng == null) return;
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:32px;height:32px;border-radius:8px;background:${o.color||"var(--teal)"};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid #fff;cursor:pointer;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      const marker = L.marker([o.lat, o.lng], { icon }).addTo(markersLayerRef.current);
      marker.bindTooltip(`<strong>${o.name}</strong><br/>Office`, {
        direction: "top", offset: [0, -34], className: "dispatch-tooltip"
      });
    });

    // Project markers
    markers.forEach(p => {
      if (p.lat == null || p.lng == null) return;
      const isSelected = p.id === selectedId;
      const color = isSelected ? "#e43531" : "#5ba3f5";
      const size = isSelected ? 36 : 28;

      const icon = L.divIcon({
        className: "",
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid #fff;cursor:pointer;transition:all .15s;${isSelected?"transform:scale(1.15);z-index:999;":""}">
          <svg width="${size*.45}" height="${size*.45}" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        </div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size],
      });

      const marker = L.marker([p.lat, p.lng], { icon }).addTo(markersLayerRef.current);
      marker.bindTooltip(`<strong>${p.name || p.address}</strong>`, {
        direction: "top", offset: [0, -size], className: "dispatch-tooltip"
      });
      marker.on("click", () => onMarkerClick(p.id));
    });

    // Auto-fit bounds if there are markers
    const allCoords = [
      ...officeMarkers.filter(o => o.lat != null).map(o => [o.lat, o.lng]),
      ...markers.filter(p => p.lat != null).map(p => [p.lat, p.lng]),
    ];
    if (allCoords.length > 1 && !selectedId) {
      mapInstanceRef.current.fitBounds(allCoords, { padding: [40, 40], maxZoom: 13 });
    } else if (allCoords.length === 1) {
      mapInstanceRef.current.setView(allCoords[0], 12);
    }
  }, [markers, officeMarkers, selectedId]);

  // Pan to selected marker
  useEffect(() => {
    if (!selectedId || !mapInstanceRef.current) return;
    const p = markers.find(m => m.id === selectedId);
    if (p?.lat != null) {
      mapInstanceRef.current.setView([p.lat, p.lng], Math.max(mapInstanceRef.current.getZoom(), 12), { animate: true });
    }
  }, [selectedId]);

  return <div ref={mapRef} className="dispatch-map" style={{width:"100%",height:"100%"}} />;
}


// ════════════════════════════════════════════════════════════════
//  APPOINTMENT FORM MODAL — schedule from dispatch
// ════════════════════════════════════════════════════════════════
function AppointmentModal({ proj, globalStaff, resources, onSave, onClose, existing, currentUser }) {
  const [f, setF] = useState(existing ? {
    title:    existing.title || "",
    date:     existing.date || TODAY_ISO,
    time:     existing.time || "09:00",
    endTime:  existing.endTime || "10:00",
    priority: existing.priority || "med",
    notes:    existing.notes || "",
    assignedStaffIds: existing.assignedStaffIds || [],
    resourceId: existing.resourceId || "",
  } : {
    title:    proj ? `Visit: ${proj.name || proj.address || "Project"}` : "",
    date:     TODAY_ISO,
    time:     "09:00",
    endTime:  "10:00",
    priority: "med",
    notes:    "",
    assignedStaffIds: [],
    resourceId: "",
  });

  const toggleStaff = (id) => {
    setF(p => ({
      ...p,
      assignedStaffIds: p.assignedStaffIds.includes(id)
        ? p.assignedStaffIds.filter(x => x !== id)
        : [...p.assignedStaffIds, id],
    }));
  };

  const submit = () => {
    if (!f.title.trim()) return;
    onSave({
      id:          existing?.id || duid(),
      projId:      proj?.id || existing?.projId || null,
      projName:    proj?.name || proj?.address || existing?.projName || "",
      projAddress: proj?.address || existing?.projAddress || "",
      title:       f.title,
      date:        f.date,
      time:        f.time,
      endTime:     f.endTime,
      priority:    f.priority,
      notes:       f.notes,
      assignedStaffIds: f.assignedStaffIds,
      resourceId:  f.resourceId,
      status:      existing?.status || "scheduled",
      commentThread: existing?.commentThread || [],
      createdAt:   existing?.createdAt || new Date().toISOString(),
      createdBy:   existing?.createdBy || currentUser?.name || "Staff",
    });
    onClose();
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm anim" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <div className="modal-ttl">{existing ? "Edit Appointment" : "New Appointment"}</div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{DIc.close}</button>
        </div>
        <div className="modal-body">
          {proj && (
            <div style={{display:"flex",alignItems:"center",gap:8,background:"var(--s3)",borderRadius:8,padding:"8px 12px",border:"1px solid var(--br)"}}>
              {DIc.pin}
              <div>
                <div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{proj.name || proj.address}</div>
                <div style={{fontSize:10,color:"var(--t3)"}}>{proj.address}</div>
              </div>
            </div>
          )}

          <div>
            <label className="lbl">Title *</label>
            <input className="inp" value={f.title} onChange={e=>setF(p=>({...p,title:e.target.value}))} placeholder="e.g. Site inspection" autoFocus/>
          </div>

          <div className="g2">
            <div>
              <label className="lbl">Date</label>
              <input type="date" className="inp" value={f.date} onChange={e=>setF(p=>({...p,date:e.target.value}))}/>
            </div>
            <div>
              <label className="lbl">Priority</label>
              <select className="sel" value={f.priority} onChange={e=>setF(p=>({...p,priority:e.target.value}))}>
                <option value="high">High</option>
                <option value="med">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="g2">
            <div>
              <label className="lbl">Start Time</label>
              <input type="time" className="inp" value={f.time} onChange={e=>setF(p=>({...p,time:e.target.value}))}/>
            </div>
            <div>
              <label className="lbl">End Time</label>
              <input type="time" className="inp" value={f.endTime} onChange={e=>setF(p=>({...p,endTime:e.target.value}))}/>
            </div>
          </div>

          {/* Assign Staff */}
          {globalStaff.length > 0 && (
            <div>
              <label className="lbl">Assign Staff</label>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:4}}>
                {globalStaff.map((s,i) => {
                  const name = `${s.firstName||""} ${s.lastName||""}`.trim() || s.email || s.id;
                  const sel = f.assignedStaffIds.includes(s.id);
                  return (
                    <button key={s.id} onClick={()=>toggleStaff(s.id)} style={{
                      display:"flex",alignItems:"center",gap:5,
                      padding:"3px 9px",borderRadius:20,border:`1px solid ${sel?"var(--blue)":"var(--br)"}`,
                      background:sel?"rgba(91,163,245,.12)":"transparent",
                      color:sel?"var(--blue)":"var(--t2)",cursor:"pointer",fontSize:11,transition:"all .12s",
                    }}>
                      <Av name={name} color={AVCOLORS[i % AVCOLORS.length]} size={18}/>
                      {name}
                      {sel && <span style={{color:"var(--blue)"}}>{DIc.check}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Assign Resource (truck/crew) */}
          {resources.length > 0 && (
            <div>
              <label className="lbl">Assign Truck / Crew</label>
              <select className="sel" value={f.resourceId} onChange={e=>setF(p=>({...p,resourceId:e.target.value}))}>
                <option value="">— None —</option>
                {resources.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="lbl">Notes</label>
            <textarea className="txa" value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} rows={2} placeholder="Optional details..."/>
          </div>
        </div>
        <div className="modal-ft">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={!f.title.trim()}>
            {DIc.calendar} {existing ? "Save Changes" : "Create Appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════
//  COMMENT THREAD — isolated per-appointment
// ════════════════════════════════════════════════════════════════
function ApptCommentThread({ appt, onUpdate, currentUser, globalStaff }) {
  const [text, setText] = useState("");
  const comments = appt.commentThread || [];

  const post = () => {
    if (!text.trim()) return;
    const newComment = {
      id: duid(),
      author: currentUser?.name || "Staff",
      text: text.trim(),
      at: new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}) + " · " +
          new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),
    };
    onUpdate({ ...appt, commentThread: [...comments, newComment] });
    setText("");
  };

  return (
    <div>
      <div className="mono" style={{fontSize:9,color:"var(--t3)",marginBottom:6}}>COMMENTS ({comments.length})</div>
      {comments.length === 0 ? (
        <div style={{padding:"10px 0",textAlign:"center",color:"var(--t3)",fontSize:11,fontStyle:"italic"}}>No comments yet.</div>
      ) : (
        <div className="dispatch-comment-thread">
          {comments.map(c => (
            <div key={c.id} className="dispatch-comment">
              <Av name={c.author} color={c.author===(currentUser?.name||"")?"var(--acc)":AVCOLORS[1]} size={22}/>
              <div className="dispatch-comment-bubble">
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontSize:10,fontWeight:700,color:"var(--t1)"}}>{c.author}</span>
                  <span style={{fontSize:8,color:"var(--t3)",fontFamily:"var(--mono)"}}>{c.at}</span>
                </div>
                <div style={{fontSize:11,color:"var(--t2)",lineHeight:1.5}}>{c.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{display:"flex",gap:6,marginTop:6}}>
        <input className="inp" value={text} onChange={e=>setText(e.target.value)}
          placeholder="Add a comment..." style={{flex:1,fontSize:11}}
          onKeyDown={e => { if (e.key==="Enter") post(); }}/>
        <button className="btn btn-primary btn-xs" onClick={post} disabled={!text.trim()}>
          {DIc.send}
        </button>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════
//  PROJECT DETAIL PANEL (right side of map)
// ════════════════════════════════════════════════════════════════
function ProjectDetailPanel({ proj, appts, globalStaff, resources, currentUser, onClose, onCreateAppt, onEditAppt, onUpdateAppt, onNavigate }) {
  const [activeApptId, setActiveApptId] = useState(null);
  const projAppts = appts.filter(a => a.projId === proj.id).sort((a,b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });

  const priC = {high:"var(--acc)", med:"var(--amber)", low:"var(--t3)"};

  return (
    <div className="dispatch-detail-panel">
      <div className="dispatch-detail-hd">
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {proj.name || proj.address}
          </div>
          <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{proj.address}</div>
          <div style={{display:"flex",gap:5,marginTop:6,flexWrap:"wrap"}}>
            {proj.type && (
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(91,163,245,.1)",border:"1px solid rgba(91,163,245,.25)",color:"var(--blue)"}}>{proj.type}</span>
            )}
            {proj.status && (
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(26,217,138,.1)",border:"1px solid rgba(26,217,138,.25)",color:"var(--green)"}}>{proj.status}</span>
            )}
            {(proj.worktypes||[]).map((wt,i) => (
              <span key={i} style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(232,156,24,.1)",border:"1px solid rgba(232,156,24,.25)",color:"var(--amber)"}}>{wt.type||wt}</span>
            ))}
          </div>
        </div>
        <button className="btn btn-ghost btn-xs" onClick={onClose}>{DIc.close}</button>
      </div>
      <div className="dispatch-detail-body">
        {/* Quick actions */}
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          <button className="btn btn-primary btn-xs" onClick={() => onCreateAppt(proj)}>
            {DIc.plus} Schedule Appointment
          </button>
          <button className="btn btn-ghost btn-xs" onClick={() => onNavigate(proj.id, "overview")}>
            {DIc.folder} Open Project
          </button>
        </div>

        {/* Project info */}
        <div style={{marginBottom:14}}>
          <div className="mono" style={{fontSize:9,color:"var(--t3)",marginBottom:6}}>PROJECT INFO</div>
          <div className="card" style={{padding:10}}>
            {[
              ["Client", proj.client || proj.clientName || "—"],
              ["Phone", proj.clientPhone || "—"],
              ["Carrier", proj.carrier || "—"],
              ["Claim #", proj.claim || "—"],
              ["Created", proj.created || "—"],
            ].map(([l,v]) => (
              <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"3px 0",borderBottom:"1px solid var(--br)"}}>
                <span style={{color:"var(--t3)"}}>{l}</span>
                <span style={{color:"var(--t1)",fontWeight:500}}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Appointments for this project */}
        <div>
          <div className="mono" style={{fontSize:9,color:"var(--t3)",marginBottom:6}}>
            APPOINTMENTS ({projAppts.length})
          </div>
          {projAppts.length === 0 ? (
            <div style={{padding:"16px 0",textAlign:"center",color:"var(--t3)",fontSize:11}}>
              No appointments scheduled for this project.
            </div>
          ) : projAppts.map(a => (
            <div key={a.id}>
              <div
                className={`dispatch-appt-card${activeApptId===a.id?" editing":""}`}
                style={{borderLeftColor: priC[a.priority] || "var(--blue)"}}
                onClick={() => setActiveApptId(activeApptId === a.id ? null : a.id)}
              >
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
                  <div style={{fontSize:12,fontWeight:600,color:"var(--t1)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {a.title}
                  </div>
                  <div style={{display:"flex",gap:4,flexShrink:0}}>
                    <button className="btn btn-ghost btn-xs" style={{padding:"1px 5px"}} onClick={e=>{e.stopPropagation();onEditAppt(a);}}>
                      {DIc.edit}
                    </button>
                  </div>
                </div>
                <div style={{display:"flex",gap:10,fontSize:10,color:"var(--t3)",marginTop:4}}>
                  <span>{a.date}</span>
                  <span>{a.time} - {a.endTime}</span>
                  <span style={{color: a.status==="completed"?"var(--green)":"var(--blue)"}}>{a.status}</span>
                </div>
                {a.assignedStaffIds?.length > 0 && (
                  <div style={{display:"flex",gap:3,marginTop:6}}>
                    {a.assignedStaffIds.map((sid,i) => {
                      const s = globalStaff.find(x=>x.id===sid);
                      const name = s ? `${s.firstName||""} ${s.lastName||""}`.trim() : sid;
                      return <Av key={sid} name={name} color={AVCOLORS[i%AVCOLORS.length]} size={20}/>;
                    })}
                  </div>
                )}
                {(a.commentThread||[]).length > 0 && (
                  <div style={{fontSize:10,color:"var(--purple)",marginTop:4}}>
                    {DIc.comment} {a.commentThread.length} comment{a.commentThread.length>1?"s":""}
                  </div>
                )}
              </div>
              {/* Expanded: comment thread (only for THIS appointment) */}
              {activeApptId === a.id && (
                <div style={{marginLeft:12,marginBottom:10,paddingLeft:10,borderLeft:"2px solid var(--br)"}}>
                  <ApptCommentThread
                    appt={a}
                    onUpdate={onUpdateAppt}
                    currentUser={currentUser}
                    globalStaff={globalStaff}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════
//  DISPATCH CALENDAR — centralized view of all appointments
// ════════════════════════════════════════════════════════════════
function DispatchCalendar({ appts, selDate, setSelDate, globalStaff, resources }) {
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

  const prevMonth = () => { if(calMonth===0){setCalYear(y=>y-1);setCalMonth(11);}else setCalMonth(m=>m-1); };
  const nextMonth = () => { if(calMonth===11){setCalYear(y=>y+1);setCalMonth(0);}else setCalMonth(m=>m+1); };

  // Build map of dates to appointment counts
  const apptsByDate = useMemo(() => {
    const map = {};
    appts.forEach(a => {
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    });
    return map;
  }, [appts]);

  const cells = [];
  // Previous month trailing days
  for (let i = 0; i < firstDay; i++) {
    const day = prevMonthDays - firstDay + 1 + i;
    cells.push({ day, other: true, iso: null });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    cells.push({ day: d, other: false, iso, isToday: iso === TODAY_ISO, isSel: iso === selDate });
  }
  // Next month leading days
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, other: true, iso: null });
    }
  }

  return (
    <div className="dispatch-cal-wrap">
      <div className="dispatch-cal-hd">
        <button className="btn btn-ghost btn-xs" onClick={prevMonth}>{DIc.chevL}</button>
        <span style={{fontSize:12,fontWeight:600}}>{MONTHS[calMonth]} {calYear}</span>
        <button className="btn btn-ghost btn-xs" onClick={nextMonth}>{DIc.chevR}</button>
      </div>
      <div style={{padding:"2px 6px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1}}>
          {DAYS.map(d => (
            <div key={d} style={{fontSize:9,color:"var(--t3)",textAlign:"center",padding:"4px 0",fontFamily:"var(--mono)"}}>{d}</div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1}}>
          {cells.map((c,i) => {
            const dayAppts = c.iso ? (apptsByDate[c.iso] || []) : [];
            return (
              <button key={i}
                className={`dispatch-cal-day${c.other?" other":""}${c.isToday?" today":""}${c.isSel?" sel":""}`}
                onClick={() => c.iso && setSelDate(c.iso)}
                disabled={c.other}
              >
                {c.day}
                {dayAppts.length > 0 && (
                  <div className="dot-row">
                    {dayAppts.slice(0,3).map((a,j) => (
                      <div key={j} className="appt-dot" style={{background: a.priority==="high"?"var(--acc)":a.priority==="med"?"var(--amber)":"var(--blue)"}}/>
                    ))}
                    {dayAppts.length > 3 && <div className="appt-dot" style={{background:"var(--t3)"}}/>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════
//  AI SCHEDULING ENGINE
//  Optimizes daily routes based on proximity, staff availability,
//  and resource assignment (crews/trucks).
// ════════════════════════════════════════════════════════════════
function generateAISchedule({ projects, offices, globalStaff, resources, appts, targetDate, geoCache }) {
  // 1. Find projects that need visits (no appointment on target date)
  const dateAppts = appts.filter(a => a.date === targetDate);
  const scheduledProjIds = new Set(dateAppts.map(a => a.projId).filter(Boolean));

  const unscheduled = projects.filter(p => {
    if (p.archived) return false;
    if (scheduledProjIds.has(p.id)) return false;
    // Must have geocoded location
    const geo = geoCache[p.id];
    if (!geo) return false;
    return true;
  });

  if (!unscheduled.length) return { suggestions: [], message: "All active projects already have appointments scheduled for this date." };

  // 2. Get available staff (those not fully booked)
  const staffApptCounts = {};
  dateAppts.forEach(a => {
    (a.assignedStaffIds || []).forEach(sid => {
      staffApptCounts[sid] = (staffApptCounts[sid] || 0) + 1;
    });
  });
  const availableStaff = globalStaff.filter(s => (staffApptCounts[s.id] || 0) < 6);

  if (!availableStaff.length) return { suggestions: [], message: "All staff members are fully booked for this date." };

  // 3. Cluster projects by proximity to offices
  const geocodedOffices = offices.filter(o => o.lat != null && o.lng != null);
  const clusters = {};

  unscheduled.forEach(p => {
    const geo = geoCache[p.id];
    if (!geo) return;
    let nearestOff = null;
    let nearestDist = Infinity;
    geocodedOffices.forEach(o => {
      const d = haversineDistance(geo.lat, geo.lng, o.lat, o.lng);
      if (d < nearestDist) { nearestDist = d; nearestOff = o; }
    });
    const clusterId = nearestOff?.id || "unassigned";
    if (!clusters[clusterId]) clusters[clusterId] = { office: nearestOff, projects: [] };
    clusters[clusterId].projects.push({ ...p, _geo: geo, _dist: nearestDist });
  });

  // 4. For each cluster, sort projects by distance and assign staff
  const suggestions = [];
  let staffIdx = 0;
  const timeSlots = ["08:00","09:00","10:00","11:00","13:00","14:00","15:00","16:00"];

  Object.values(clusters).forEach(cluster => {
    // Sort by distance from office (nearest first for efficient routing)
    cluster.projects.sort((a,b) => a._dist - b._dist);

    // Assign staff in round-robin
    cluster.projects.forEach((proj, i) => {
      const staff = availableStaff[staffIdx % availableStaff.length];
      const staffName = staff ? `${staff.firstName||""} ${staff.lastName||""}`.trim() : "";
      const timeSlot = timeSlots[i % timeSlots.length];
      const endHour = parseInt(timeSlot.split(":")[0]) + 1;
      const endTime = `${String(endHour).padStart(2,"0")}:00`;

      // Find best resource (truck/crew) - prefer one assigned to same office
      let bestResource = null;
      if (resources.length) {
        const officeResources = resources.filter(r =>
          r.officeId === cluster.office?.id ||
          !r.officeId
        );
        bestResource = officeResources[i % officeResources.length] || resources[i % resources.length];
      }

      suggestions.push({
        id: duid(),
        projId: proj.id,
        projName: proj.name || proj.address || "Project",
        projAddress: proj.address || "",
        title: `AI Scheduled: ${proj.name || proj.address || "Visit"}`,
        date: targetDate,
        time: timeSlot,
        endTime,
        priority: "med",
        notes: `Auto-scheduled by AI dispatcher. ${cluster.office ? `Nearest office: ${cluster.office.name} (${Math.round(proj._dist)}mi)` : ""}`,
        assignedStaffIds: staff ? [staff.id] : [],
        resourceId: bestResource?.id || "",
        status: "suggested",
        commentThread: [],
        createdAt: new Date().toISOString(),
        createdBy: "AI Dispatcher",
        _staffName: staffName,
        _distance: Math.round(proj._dist * 10) / 10,
        _officeName: cluster.office?.name || "—",
      });

      staffIdx++;
    });
  });

  // Sort suggestions by time
  suggestions.sort((a,b) => a.time.localeCompare(b.time));

  return {
    suggestions,
    message: `AI generated ${suggestions.length} appointment suggestion${suggestions.length>1?"s":""} for ${targetDate}.`,
  };
}

// ════════════════════════════════════════════════════════════════
//  AI SCHEDULE REVIEW MODAL
// ════════════════════════════════════════════════════════════════
function AIScheduleModal({ suggestions, onAccept, onAcceptAll, onClose }) {
  const [selected, setSelected] = useState(new Set(suggestions.map(s => s.id)));

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const priC = {high:"var(--acc)", med:"var(--amber)", low:"var(--t3)"};

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg anim" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <div>
            <div className="modal-ttl" style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{color:"var(--purple)"}}>{DIc.ai}</span>
              AI Schedule Suggestions
            </div>
            <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>
              {suggestions.length} appointment{suggestions.length>1?"s":""} suggested — review and accept
            </div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{DIc.close}</button>
        </div>
        <div className="modal-body" style={{maxHeight:450}}>
          {suggestions.map(s => (
            <div key={s.id} style={{
              display:"flex",gap:10,alignItems:"flex-start",
              padding:"10px 12px",background: selected.has(s.id)?"rgba(167,139,250,.06)":"var(--s3)",
              border:`1px solid ${selected.has(s.id)?"rgba(167,139,250,.25)":"var(--br)"}`,
              borderRadius:9,cursor:"pointer",transition:"all .12s",
            }} onClick={() => toggle(s.id)}>
              <div style={{
                width:20,height:20,borderRadius:5,border:`2px solid ${selected.has(s.id)?"var(--purple)":"var(--br)"}`,
                background:selected.has(s.id)?"var(--purple)":"transparent",
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2,
              }}>
                {selected.has(s.id) && <span style={{color:"#fff"}}>{DIc.check}</span>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{s.projName}</span>
                  <span style={{fontSize:10,color:"var(--blue)",fontFamily:"var(--mono)"}}>{s.time} - {s.endTime}</span>
                </div>
                <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{s.projAddress}</div>
                <div style={{display:"flex",gap:10,fontSize:10,color:"var(--t3)",marginTop:4}}>
                  {s._staffName && <span>Staff: <strong style={{color:"var(--t2)"}}>{s._staffName}</strong></span>}
                  {s._distance != null && <span>{s._distance} mi from {s._officeName}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-ft">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-secondary" onClick={() => {
            const sel = suggestions.filter(s => selected.has(s.id));
            onAccept(sel);
          }}>
            Accept Selected ({selected.size})
          </button>
          <button className="btn btn-primary" onClick={() => onAcceptAll(suggestions)}>
            {DIc.check} Accept All ({suggestions.length})
          </button>
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════
//  RESOURCE MANAGEMENT MODAL (trucks/crews)
// ════════════════════════════════════════════════════════════════
function ResourceModal({ resources, offices, onSave, onClose }) {
  const [list, setList] = useState(resources);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name:"", type:"truck", officeId:"" });

  const add = () => {
    if (!f.name.trim()) return;
    setList(l => [...l, { id: duid(), ...f }]);
    setF({ name:"", type:"truck", officeId:"" });
    setAdding(false);
  };

  const remove = (id) => setList(l => l.filter(r => r.id !== id));

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm anim" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <div className="modal-ttl">{DIc.truck} Trucks & Crews</div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{DIc.close}</button>
        </div>
        <div className="modal-body">
          {list.map(r => (
            <div key={r.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid var(--br)"}}>
              <span style={{color: r.type==="truck"?"var(--blue)":"var(--purple)"}}>{r.type==="truck"?DIc.truck:DIc.crew}</span>
              <span style={{flex:1,fontSize:12,fontWeight:500}}>{r.name}</span>
              <span style={{fontSize:10,color:"var(--t3)"}}>{r.type}</span>
              <button className="btn btn-ghost btn-xs" style={{padding:"1px 5px"}} onClick={()=>remove(r.id)}>{DIc.del}</button>
            </div>
          ))}
          {adding ? (
            <div style={{marginTop:8}}>
              <div className="g2" style={{gap:6}}>
                <div>
                  <label className="lbl">Name</label>
                  <input className="inp" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="e.g. Truck 1" autoFocus/>
                </div>
                <div>
                  <label className="lbl">Type</label>
                  <select className="sel" value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))}>
                    <option value="truck">Truck</option>
                    <option value="crew">Crew</option>
                  </select>
                </div>
              </div>
              {offices.length > 0 && (
                <div style={{marginTop:6}}>
                  <label className="lbl">Home Office</label>
                  <select className="sel" value={f.officeId} onChange={e=>setF(p=>({...p,officeId:e.target.value}))}>
                    <option value="">— Any —</option>
                    {offices.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:8}}>
                <button className="btn btn-ghost btn-xs" onClick={()=>setAdding(false)}>Cancel</button>
                <button className="btn btn-primary btn-xs" onClick={add} disabled={!f.name.trim()}>{DIc.plus} Add</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-ghost btn-xs" style={{marginTop:8}} onClick={()=>setAdding(true)}>{DIc.plus} Add Truck or Crew</button>
          )}
        </div>
        <div className="modal-ft">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onSave(list); onClose(); }}>Save</button>
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════
//  MAIN DISPATCH PANEL
// ════════════════════════════════════════════════════════════════
export default function DispatchPanel({
  projects=[],
  offices=[],
  globalStaff=[],
  companyId="",
  currentUser=null,
  currentMemberId="",
  onNavigate,
  customWorkTypes=[],
  customProjectTypes=[],
  customStatuses=[],
}) {
  useEffect(() => { injectDispatchCSS(); }, []);

  // ── State ──
  const [selectedProjId, setSelectedProjId] = useState(null);
  const [selDate, setSelDate] = useState(TODAY_ISO);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("map"); // "map" | "calendar"
  const [showApptModal, setShowApptModal] = useState(false);
  const [apptModalProj, setApptModalProj] = useState(null);
  const [editingAppt, setEditingAppt] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

  // ── Filters ──
  const [fWorkType, setFWorkType] = useState("All");
  const [fProjectType, setFProjectType] = useState("All");
  const [fStatus, setFStatus] = useState("All");
  const [fDateRange, setFDateRange] = useState("all"); // "all" | "new" | "7d" | "30d"
  const [fOffice, setFOffice] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  // ── Appointments (persisted to LS) ──
  const [appts, setApptsRaw] = useState(() => loadDispatchAppts(companyId));
  const setAppts = useCallback((updater) => {
    setApptsRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (companyId) saveDispatchAppts(companyId, next);
      return next;
    });
  }, [companyId]);

  // ── Resources (trucks/crews) ──
  const [resources, setResourcesRaw] = useState(() => loadDispatchResources(companyId));
  const setResources = useCallback((updater) => {
    setResourcesRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (companyId) saveDispatchResources(companyId, next);
      return next;
    });
  }, [companyId]);

  // ── Geocode cache — geocode projects on mount ──
  const [geoCache, setGeoCache] = useState(loadGeoCache);
  const geocodingRef = useRef(false);

  useEffect(() => {
    if (geocodingRef.current || !projects.length) return;
    geocodingRef.current = true;
    const cache = { ...geoCache };
    let dirty = false;

    (async () => {
      for (const p of projects) {
        if (cache[p.id]) continue;
        if (!p.address) continue;
        const result = await geocodeAddress(p.address);
        if (result) {
          cache[p.id] = { lat: result.lat, lng: result.lng };
          dirty = true;
        }
        // Rate-limit geocoding
        await new Promise(r => setTimeout(r, 350));
      }
      if (dirty) {
        setGeoCache({ ...cache });
        saveGeoCache(cache);
      }
      geocodingRef.current = false;
    })();
  }, [projects]);

  // ── Build work type filter options ──
  const workTypeOptions = useMemo(() => {
    const types = new Set();
    projects.forEach(p => {
      (p.worktypes||[]).forEach(wt => types.add(wt.type || wt));
    });
    return ["All", ...Array.from(types).sort()];
  }, [projects]);

  const projectTypeOptions = useMemo(() => {
    return ["All", ...customProjectTypes.map(t => t.name)];
  }, [customProjectTypes]);

  const statusOptions = useMemo(() => {
    return ["All", ...customStatuses.map(s => s.name)];
  }, [customStatuses]);

  const officeOptions = useMemo(() => {
    return ["All", ...offices.map(o => ({ id: o.id, name: o.name }))];
  }, [offices]);

  // ── Filter projects ──
  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (p.archived) return false;
      const q = search.toLowerCase();
      if (q && ![p.name, p.address, p.client||"", p.clientName||""].join(" ").toLowerCase().includes(q)) return false;
      if (fProjectType !== "All" && p.type !== fProjectType) return false;
      if (fStatus !== "All" && p.status !== fStatus) return false;
      if (fWorkType !== "All") {
        const pWTs = (p.worktypes||[]).map(wt => wt.type || wt);
        if (!pWTs.includes(fWorkType)) return false;
      }
      if (fOffice !== "All" && p.officeId !== fOffice) return false;
      if (fDateRange === "new" || fDateRange === "7d") {
        if (!isWithinDays(p.createdAt?.toDate ? p.createdAt.toDate().toISOString().split("T")[0] : p.created, 7)) return false;
      }
      if (fDateRange === "30d") {
        if (!isWithinDays(p.createdAt?.toDate ? p.createdAt.toDate().toISOString().split("T")[0] : p.created, 30)) return false;
      }
      return true;
    });
  }, [projects, search, fProjectType, fStatus, fWorkType, fOffice, fDateRange]);

  // ── Map markers ──
  const mapMarkers = useMemo(() => {
    return filtered.map(p => ({
      ...p,
      lat: geoCache[p.id]?.lat ?? null,
      lng: geoCache[p.id]?.lng ?? null,
    })).filter(p => p.lat != null);
  }, [filtered, geoCache]);

  const selectedProj = selectedProjId ? projects.find(p => p.id === selectedProjId) : null;

  // ── Appointment CRUD ──
  const createAppt = (proj) => {
    setApptModalProj(proj);
    setEditingAppt(null);
    setShowApptModal(true);
  };

  const editAppt = (appt) => {
    const proj = appt.projId ? projects.find(p => p.id === appt.projId) : null;
    setApptModalProj(proj);
    setEditingAppt(appt);
    setShowApptModal(true);
  };

  const saveAppt = (appt) => {
    setAppts(prev => {
      const idx = prev.findIndex(a => a.id === appt.id);
      if (idx >= 0) return prev.map(a => a.id === appt.id ? appt : a);
      return [...prev, appt];
    });
  };

  const updateAppt = (appt) => {
    setAppts(prev => prev.map(a => a.id === appt.id ? appt : a));
  };

  const deleteAppt = (id) => {
    setAppts(prev => prev.filter(a => a.id !== id));
  };

  // ── AI Scheduling ──
  const runAISchedule = () => {
    const result = generateAISchedule({
      projects: filtered,
      offices,
      globalStaff,
      resources,
      appts,
      targetDate: selDate,
      geoCache,
    });
    setAiSuggestions(result.suggestions);
    setAiMessage(result.message);
    if (result.suggestions.length > 0) {
      setShowAIModal(true);
    }
  };

  const acceptAISuggestions = (suggestions) => {
    const accepted = suggestions.map(s => ({
      ...s,
      status: "scheduled",
      title: s.title.replace("AI Scheduled: ", ""),
      notes: s.notes,
    }));
    // Remove internal fields
    accepted.forEach(a => { delete a._staffName; delete a._distance; delete a._officeName; });
    setAppts(prev => [...prev, ...accepted]);
    setShowAIModal(false);
    setAiSuggestions([]);
  };

  // ── Day appointments for calendar view ──
  const dayAppts = useMemo(() => {
    return appts.filter(a => a.date === selDate).sort((a,b) => a.time.localeCompare(b.time));
  }, [appts, selDate]);

  const activeFilterCount = [fWorkType, fProjectType, fStatus, fOffice].filter(f => f !== "All").length + (fDateRange !== "all" ? 1 : 0);

  const priC = {high:"var(--acc)", med:"var(--amber)", low:"var(--t3)"};

  // ── Render ──
  return (
    <>
      {/* Modals */}
      {showApptModal && (
        <AppointmentModal
          proj={apptModalProj}
          globalStaff={globalStaff}
          resources={resources}
          onSave={saveAppt}
          onClose={() => { setShowApptModal(false); setApptModalProj(null); setEditingAppt(null); }}
          existing={editingAppt}
          currentUser={currentUser}
        />
      )}
      {showAIModal && aiSuggestions.length > 0 && (
        <AIScheduleModal
          suggestions={aiSuggestions}
          onAccept={acceptAISuggestions}
          onAcceptAll={acceptAISuggestions}
          onClose={() => { setShowAIModal(false); setAiSuggestions([]); }}
        />
      )}
      {showResourceModal && (
        <ResourceModal
          resources={resources}
          offices={offices}
          onSave={(list) => setResources(list)}
          onClose={() => setShowResourceModal(false)}
        />
      )}

      <div className="topbar">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div>
            <div className="topbar-ttl" style={{display:"flex",alignItems:"center",gap:8}}>
              {DIc.dispatch} Dispatch
            </div>
            <div className="topbar-sub">MAP · SCHEDULING · AI ROUTING</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {/* View toggle */}
          <div style={{display:"flex",gap:2,background:"var(--s3)",borderRadius:7,padding:2}}>
            {[["map","Map"],["calendar","Calendar"]].map(([v,l]) => (
              <button key={v} className={`btn btn-xs${view===v?" btn-primary":""}`}
                style={view!==v?{background:"transparent",border:"none",color:"var(--t2)"}:{}}
                onClick={()=>setView(v)}>
                {v==="map" ? DIc.pin : DIc.calendar} {l}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-xs" onClick={()=>setShowResourceModal(true)}>
            {DIc.truck} Resources
          </button>
          <button className="btn btn-primary btn-xs" onClick={()=>createAppt(null)}>
            {DIc.plus} New Appointment
          </button>
        </div>
      </div>

      <div className="dispatch-page">
        {/* ── LEFT SIDEBAR: Search, Filters, Calendar, Project List ── */}
        <div className="dispatch-sidebar">
          <div className="dispatch-sidebar-hd">
            {/* Search */}
            <div style={{position:"relative"}}>
              <input className="inp" value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search projects..." style={{paddingLeft:28,fontSize:11}}/>
              <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"var(--t3)"}}>{DIc.search}</span>
            </div>

            {/* Filter toggle */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:8}}>
              <button className={`chip${showFilters?" on":""}`} onClick={()=>setShowFilters(v=>!v)} style={{fontSize:10}}>
                {DIc.filter} Filters {activeFilterCount > 0 && <span className="mono" style={{fontSize:8,marginLeft:3}}>({activeFilterCount})</span>}
              </button>
              <span className="mono" style={{fontSize:9,color:"var(--t3)"}}>{filtered.length} PROJECT{filtered.length!==1?"S":""}</span>
            </div>

            {/* Filter dropdowns */}
            {showFilters && (
              <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:6,animation:"jd-fade .15s ease"}}>
                <div className="g2" style={{gap:6}}>
                  <div>
                    <label className="lbl">Work Type</label>
                    <select className="sel" value={fWorkType} onChange={e=>setFWorkType(e.target.value)} style={{fontSize:10,padding:"4px 6px"}}>
                      {workTypeOptions.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="lbl">Project Type</label>
                    <select className="sel" value={fProjectType} onChange={e=>setFProjectType(e.target.value)} style={{fontSize:10,padding:"4px 6px"}}>
                      {projectTypeOptions.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <div className="g2" style={{gap:6}}>
                  <div>
                    <label className="lbl">Status</label>
                    <select className="sel" value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{fontSize:10,padding:"4px 6px"}}>
                      {statusOptions.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="lbl">Office</label>
                    <select className="sel" value={fOffice} onChange={e=>setFOffice(e.target.value)} style={{fontSize:10,padding:"4px 6px"}}>
                      <option value="All">All</option>
                      {offices.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="lbl">Date Created</label>
                  <div style={{display:"flex",gap:4}}>
                    {[["all","All"],["new","New (7d)"],["30d","30 Days"]].map(([v,l]) => (
                      <button key={v} className={`chip${fDateRange===v?" on":""}`} onClick={()=>setFDateRange(v)} style={{fontSize:9}}>{l}</button>
                    ))}
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <button className="btn btn-ghost btn-xs" onClick={()=>{setFWorkType("All");setFProjectType("All");setFStatus("All");setFOffice("All");setFDateRange("all");}}>
                    Clear All Filters
                  </button>
                )}
              </div>
            )}

            {/* Mini Calendar */}
            <div style={{marginTop:10}}>
              <DispatchCalendar appts={appts} selDate={selDate} setSelDate={setSelDate} globalStaff={globalStaff} resources={resources}/>
            </div>

            {/* AI Schedule Button */}
            <button className="dispatch-ai-btn" style={{marginTop:10}} onClick={runAISchedule}>
              <span style={{color:"var(--purple)",flexShrink:0}}>{DIc.ai}</span>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>AI Schedule</div>
                <div style={{fontSize:10,color:"var(--t3)"}}>Auto-assign staff & optimize routes for {new Date(selDate+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
              </div>
            </button>
            {aiMessage && !showAIModal && (
              <div style={{fontSize:10,color:"var(--t3)",marginTop:4,fontStyle:"italic"}}>{aiMessage}</div>
            )}
          </div>

          {/* Sidebar body: project cards or day appointments */}
          <div className="dispatch-sidebar-body">
            {view === "calendar" ? (
              <>
                <div className="mono" style={{fontSize:9,color:"var(--t3)",marginBottom:8,padding:"0 4px"}}>
                  {new Date(selDate+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})} — {dayAppts.length} APPOINTMENT{dayAppts.length!==1?"S":""}
                </div>
                {dayAppts.length === 0 ? (
                  <div style={{padding:"20px 0",textAlign:"center",color:"var(--t3)",fontSize:11}}>
                    No appointments for this day.
                    <br/>
                    <button className="btn btn-ghost btn-xs" style={{marginTop:8}} onClick={()=>createAppt(null)}>
                      {DIc.plus} Create Appointment
                    </button>
                  </div>
                ) : dayAppts.map(a => (
                  <div key={a.id} className="dispatch-appt-card"
                    style={{borderLeftColor: priC[a.priority] || "var(--blue)"}}
                    onClick={() => {
                      if (a.projId) setSelectedProjId(a.projId);
                    }}
                  >
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <span style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{a.title}</span>
                      <div style={{display:"flex",gap:3}}>
                        <button className="btn btn-ghost btn-xs" style={{padding:"1px 5px"}} onClick={e=>{e.stopPropagation();editAppt(a);}}>{DIc.edit}</button>
                        <button className="btn btn-ghost btn-xs" style={{padding:"1px 5px",color:"var(--acc)"}} onClick={e=>{e.stopPropagation();deleteAppt(a.id);}}>{DIc.del}</button>
                      </div>
                    </div>
                    <div style={{fontSize:10,color:"var(--t3)",marginTop:2}}>{a.projName}</div>
                    <div style={{display:"flex",gap:8,fontSize:10,color:"var(--t3)",marginTop:3}}>
                      <span className="mono">{a.time} - {a.endTime}</span>
                      <span style={{color: a.status==="completed"?"var(--green)":"var(--blue)"}}>{a.status}</span>
                    </div>
                    {a.assignedStaffIds?.length > 0 && (
                      <div style={{display:"flex",gap:3,marginTop:5}}>
                        {a.assignedStaffIds.map((sid,i) => {
                          const s = globalStaff.find(x=>x.id===sid);
                          const name = s ? `${s.firstName||""} ${s.lastName||""}`.trim() : "?";
                          return <Av key={sid} name={name} color={AVCOLORS[i%AVCOLORS.length]} size={18}/>;
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="mono" style={{fontSize:9,color:"var(--t3)",marginBottom:8,padding:"0 4px"}}>
                  PROJECTS
                </div>
                {filtered.map(p => {
                  const geo = geoCache[p.id];
                  return (
                    <div key={p.id}
                      className={`dispatch-proj-card${selectedProjId===p.id?" selected":""}`}
                      onClick={() => setSelectedProjId(selectedProjId === p.id ? null : p.id)}
                    >
                      <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                        <span style={{color: geo ? "var(--blue)" : "var(--t3)", marginTop:2, flexShrink:0}}>{DIc.pin}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {p.name || p.address}
                          </div>
                          <div style={{fontSize:10,color:"var(--t3)",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.address}</div>
                          <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>
                            {p.type && <span style={{fontSize:9,padding:"1px 6px",borderRadius:10,background:"rgba(91,163,245,.1)",color:"var(--blue)"}}>{p.type}</span>}
                            {p.status && <span style={{fontSize:9,padding:"1px 6px",borderRadius:10,background:"rgba(26,217,138,.1)",color:"var(--green)"}}>{p.status}</span>}
                            {!geo && <span style={{fontSize:9,padding:"1px 6px",borderRadius:10,background:"rgba(228,53,49,.1)",color:"var(--acc)"}}>No location</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* ── MAP AREA ── */}
        <div className="dispatch-map-area">
          <DispatchMap
            markers={mapMarkers}
            officeMarkers={offices}
            selectedId={selectedProjId}
            onMarkerClick={(id) => setSelectedProjId(selectedProjId === id ? null : id)}
            center={null}
            zoom={5}
          />

          {/* Selected project detail panel */}
          {selectedProj && (
            <ProjectDetailPanel
              proj={selectedProj}
              appts={appts}
              globalStaff={globalStaff}
              resources={resources}
              currentUser={currentUser}
              onClose={() => setSelectedProjId(null)}
              onCreateAppt={createAppt}
              onEditAppt={editAppt}
              onUpdateAppt={updateAppt}
              onNavigate={onNavigate}
            />
          )}

          {/* Day appointments overlay on map (calendar view) */}
          {view === "calendar" && dayAppts.length > 0 && (
            <div style={{
              position:"absolute",bottom:12,left:12,right:12,
              background:"var(--s2)",border:"1px solid var(--br)",borderRadius:10,
              padding:"10px 14px",boxShadow:"0 4px 20px rgba(0,0,0,.25)",
              maxHeight:120,overflowY:"auto",
            }}>
              <div className="mono" style={{fontSize:9,color:"var(--t3)",marginBottom:4}}>
                TODAY'S ROUTE — {dayAppts.length} STOP{dayAppts.length>1?"S":""}
              </div>
              <div style={{display:"flex",gap:6,overflowX:"auto"}}>
                {dayAppts.map((a,i) => (
                  <div key={a.id} style={{
                    display:"flex",alignItems:"center",gap:6,
                    padding:"4px 10px",borderRadius:20,
                    background:"var(--s3)",border:"1px solid var(--br)",
                    fontSize:10,whiteSpace:"nowrap",flexShrink:0,
                    cursor:"pointer",
                  }} onClick={() => a.projId && setSelectedProjId(a.projId)}>
                    <span style={{fontWeight:700,color:"var(--acc)"}}>{i+1}</span>
                    <span style={{color:"var(--t1)"}}>{a.projName || a.title}</span>
                    <span className="mono" style={{color:"var(--t3)",fontSize:9}}>{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
