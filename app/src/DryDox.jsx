/* ══════════════════════════════════════════════════════════════════
   DRYDOX — Complete Drying Documentation Module
   ═══════════════════════════════════════════════════════════════
   Separate file that ties into the portal on each project under
   the DryDox tab. Mobile-optimized for PWA use.

   Features:
   - LiDAR scanning for automatic room measurement
   - Interactive floor plan with moisture point marking
   - Multi-floor / multi-suite / multi-room support
   - Daily moisture & psychrometric readings (Temp, RH, GPP, Dew Point)
   - Chamber & equipment-level psychrometric tracking
   - Equipment drag-and-drop from inventory with billing
   - Live scope items from uploaded pricelist
   - PDF drying report generation (drops into Documents tab)
   - ESX sketch export for Xactimate
══════════════════════════════════════════════════════════════════ */
import { useState, useEffect, useMemo, useCallback } from "react";
import { DRYDOX_CSS, dduid, DDIc, EQUIP_TYPES, getET, fmt$c, rhColor, rhLabel, compareS500 } from "./drydox/DryDoxConstants.jsx";
import DryDoxFloorPlan from "./drydox/DryDoxFloorPlan.jsx";
import DryDoxMoisture from "./drydox/DryDoxMoisture.jsx";
import DryDoxEquipment from "./drydox/DryDoxEquipment.jsx";
import DryDoxScope from "./drydox/DryDoxScope.jsx";
import DryDoxReport from "./drydox/DryDoxReport.jsx";
import DryDoxESX from "./drydox/DryDoxESX.jsx";
import DryDoxS500 from "./drydox/DryDoxS500.jsx";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { getApps } from "firebase/app";

const _dryDoxDb = getApps().length > 0 ? getFirestore(getApps()[0]) : null;
let _dryDoxCompanyId = null;

// Debounce map for DryDox Firestore saves
const _ddSaveTimers = {};

// ── Persistent state hook (saves to both localStorage + Firestore) ──
function useDryDoxState(projId, key, fallback) {
  const lsKey = `dd_${projId}_${key}`;
  const fsField = `dd_${key}`;
  const [val, setValRaw] = useState(() => {
    try {
      const stored = localStorage.getItem(lsKey);
      return stored ? JSON.parse(stored) : fallback;
    } catch { return fallback; }
  });

  // Load from Firestore on mount
  useEffect(() => {
    if (_dryDoxDb && _dryDoxCompanyId && projId) {
      getDoc(doc(_dryDoxDb, "companies", _dryDoxCompanyId, "projects", projId))
        .then(snap => {
          if (snap.exists() && snap.data()[fsField] !== undefined) {
            setValRaw(snap.data()[fsField]);
            try { localStorage.setItem(lsKey, JSON.stringify(snap.data()[fsField])); } catch {}
          }
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projId, lsKey]);

  const setVal = useCallback((updater) => {
    setValRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try { localStorage.setItem(lsKey, JSON.stringify(next)); } catch {}
      // Save to Firestore (debounced)
      if (_dryDoxDb && _dryDoxCompanyId && projId) {
        clearTimeout(_ddSaveTimers[lsKey]);
        _ddSaveTimers[lsKey] = setTimeout(() => {
          setDoc(doc(_dryDoxDb, "companies", _dryDoxCompanyId, "projects", projId), {
            [fsField]: JSON.parse(JSON.stringify(next)),
            updatedAt: serverTimestamp(),
          }, { merge: true }).catch(() => {});
        }, 800);
      }
      return next;
    });
  }, [lsKey, fsField, projId]);

  return [val, setVal];
}

// ── Inject CSS once ──
let _cssInjected = false;
function injectCSS() {
  if (_cssInjected) return;
  _cssInjected = true;
  const style = document.createElement("style");
  style.textContent = DRYDOX_CSS;
  document.head.appendChild(style);
}

// ══════════════════════════════════════════════════════════════════
//  MAIN DRYDOX COMPONENT
// ══════════════════════════════════════════════════════════════════
export default function DryDoxTab({ proj, priceLists = [], onPushToScope, companyLogo, inventory: externalInventory = [], companyId="" }) {
  useEffect(() => { if (companyId) _dryDoxCompanyId = companyId; }, [companyId]);
  // Inject styles
  useEffect(() => { injectCSS(); }, []);

  const projId = proj?.id || "default";

  // ── All persistent state ──
  const [localInventory, setLocalInventory]     = useDryDoxState("company", "inventory", []);
  const inventory = externalInventory.length > 0 ? externalInventory : localInventory;
  const setInventory = setLocalInventory;
  const [rooms, setRooms]                       = useDryDoxState(projId, "rooms", []);
  const [floors, setFloors]                     = useDryDoxState(projId, "floors", [1]);
  const [activeFloor, setActiveFloor]           = useState(1);
  const [activeRoom, setActiveRoom]             = useState(null);
  const [moisturePoints, setMoisturePoints]     = useDryDoxState(projId, "moisturePoints", []);
  const [dryingLogs, setDryingLogs]             = useDryDoxState(projId, "dryingLogs", []);
  const [equipmentPlacements, setEquipmentPlacements] = useDryDoxState(projId, "equipment", []);
  const [scopeItems, setScopeItems]             = useDryDoxState(projId, "scopeItems", []);
  const [dryingComplete, setDryingComplete]     = useDryDoxState(projId, "dryingComplete", null);
  const [billingDays, setBillingDays]           = useDryDoxState(projId, "billingDays", 3);
  const [activePLId, setActivePL]               = useState(priceLists[0]?.id || null);
  const [s500Comments, setS500Comments]         = useDryDoxState(projId, "s500Comments", {});
  const [s500Overrides, setS500Overrides]       = useDryDoxState(projId, "s500Overrides", {});

  // ── S500 compliance check ──
  const s500Status = useMemo(
    () => compareS500(rooms, equipmentPlacements, s500Overrides?.dehuPPD, s500Overrides?.scrubberCFM),
    [rooms, equipmentPlacements, s500Overrides]
  );

  // ── Sub-tab navigation ──
  const [subtab, setSubtab] = useState("floorplan");

  const SUBTABS = [
    { key: "floorplan",  label: "Floor Plan",    icon: DDIc.floor,  badge: rooms.length },
    { key: "moisture",   label: "Moisture",      icon: DDIc.drop,   badge: dryingLogs.length },
    { key: "equipment",  label: "Equipment",     icon: DDIc.equip,  badge: equipmentPlacements.filter(e => !e.removedAt).length },
    { key: "s500",       label: "S500",          icon: DDIc.check,  badge: s500Status.matched ? 0 : s500Status.mismatches.filter(m => !m.over).length, flagged: !s500Status.matched },
    { key: "scope",      label: "Scope",         icon: DDIc.scope,  badge: scopeItems.length },
    { key: "report",     label: "Report",        icon: DDIc.pdf },
    { key: "esx",        label: "ESX Export",    icon: DDIc.export },
  ];

  // ── Add moisture point from floor plan canvas ──
  const handleAddPoint = useCallback((roomId, x, y) => {
    const room = rooms.find(r => r.id === roomId);
    const pointNum = moisturePoints.filter(p => p.roomId === roomId).length + 1;
    const newPoint = {
      id: dduid(),
      roomId,
      x, y,
      label: `${room?.label || "Room"} — Point ${pointNum}`,
      surface: "",
      readings: [],
      createdAt: new Date().toISOString(),
    };
    setMoisturePoints(prev => [...prev, newPoint]);
    // Also update the room's points array for reference
    setRooms(prev => prev.map(r =>
      r.id === roomId ? { ...r, points: [...(r.points || []), newPoint] } : r
    ));
  }, [rooms, moisturePoints, setMoisturePoints, setRooms]);

  // ── Move equipment on floor plan ──
  const handleMoveEquipment = useCallback((eqId, newX, newY, newRoomId) => {
    setEquipmentPlacements(prev => prev.map(eq =>
      eq.id === eqId ? { ...eq, x: newX, y: newY, roomId: newRoomId || eq.roomId } : eq
    ));
  }, [setEquipmentPlacements]);

  // ── Push scope items to project ──
  const handlePushToScope = useCallback((items) => {
    if (onPushToScope) {
      onPushToScope(items);
    }
  }, [onPushToScope]);

  // ── Save document record (for report generation) ──
  const handleSaveDocument = useCallback((doc) => {
    // Save to project's localStorage documents
    try {
      const key = `jd_project_docs_${projId}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push(doc);
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {}
  }, [projId]);

  // ── Overall project drying status ──
  const latestLogs = dryingLogs.filter(l => l.mode === "chamber" || !l.mode);
  const latestRH = latestLogs.length > 0 ? latestLogs[latestLogs.length - 1].rh : null;

  return (
    <div className="dd-wrap">
      {/* Sub-tab bar with price list selector */}
      <div className="dd-subtabs">
        {SUBTABS.map(t => (
          <button key={t.key}
            className={`dd-subtab${subtab === t.key ? " active" : ""}`}
            onClick={() => setSubtab(t.key)}>
            <span style={{ opacity: 0.7 }}>{t.icon}</span>
            <span>{t.label}</span>
            {t.badge > 0 && <span className="dd-badge" style={t.flagged ? { background: "var(--acc)" } : undefined}>{t.badge}</span>}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {/* Price list selector (always visible) */}
        {priceLists.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", whiteSpace: "nowrap" }}>PRICE LIST</div>
            <select className="sel" value={activePLId || ""} onChange={e => setActivePL(e.target.value)}
              style={{ height: 26, fontSize: 10, padding: "3px 8px", width: 160, minWidth: 100 }}>
              <option value="">— None —</option>
              {priceLists.map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Status bar */}
      {latestRH !== null && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "6px 16px",
          background: dryingComplete ? "rgba(26,217,138,.06)" : "var(--s1)",
          borderBottom: "1px solid var(--br)", fontSize: 11, flexShrink: 0,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: dryingComplete ? "var(--green)" : rhColor(latestRH),
          }} />
          <span style={{ fontWeight: 700, color: dryingComplete ? "var(--green)" : rhColor(latestRH) }}>
            {dryingComplete ? "DRYING COMPLETE" : `${rhLabel(latestRH)} — ${latestRH}% RH`}
          </span>
          <span style={{ color: "var(--t3)" }}>·</span>
          <span style={{ color: "var(--t2)" }}>{rooms.length} rooms</span>
          <span style={{ color: "var(--t3)" }}>·</span>
          <span style={{ color: "var(--t2)" }}>{equipmentPlacements.filter(e => !e.removedAt).length} active equip</span>
          <span style={{ color: "var(--t3)" }}>·</span>
          <span style={{ color: "var(--t2)" }}>{dryingLogs.length} readings</span>
        </div>
      )}

      {/* Tab content */}
      <div className="dd-body">
        <div className="dd-content">

          {subtab === "floorplan" && (
            <DryDoxFloorPlan
              rooms={rooms} setRooms={setRooms}
              floors={floors} setFloors={setFloors}
              activeFloor={activeFloor} setActiveFloor={setActiveFloor}
              activeRoom={activeRoom} setActiveRoom={setActiveRoom}
              moisturePoints={moisturePoints}
              equipmentPlacements={equipmentPlacements}
              onAddPoint={handleAddPoint}
              onMoveEquipment={handleMoveEquipment}
            />
          )}

          {subtab === "moisture" && (
            <DryDoxMoisture
              rooms={rooms}
              dryingLogs={dryingLogs} setDryingLogs={setDryingLogs}
              moisturePoints={moisturePoints} setMoisturePoints={setMoisturePoints}
              equipmentPlacements={equipmentPlacements}
              dryingComplete={dryingComplete} setDryingComplete={setDryingComplete}
            />
          )}

          {subtab === "equipment" && (
            <DryDoxEquipment
              rooms={rooms}
              equipmentPlacements={equipmentPlacements} setEquipmentPlacements={setEquipmentPlacements}
              inventory={inventory} setInventory={setInventory}
              priceLists={priceLists} activePLId={activePLId}
              billingDays={billingDays} setBillingDays={setBillingDays}
              onPushToScope={handlePushToScope}
              s500Comments={s500Comments} s500Overrides={s500Overrides}
            />
          )}

          {subtab === "s500" && (
            <DryDoxS500
              rooms={rooms}
              equipmentPlacements={equipmentPlacements}
              s500Comments={s500Comments} setS500Comments={setS500Comments}
              s500Overrides={s500Overrides} setS500Overrides={setS500Overrides}
            />
          )}

          {subtab === "scope" && (
            <DryDoxScope
              scopeItems={scopeItems} setScopeItems={setScopeItems}
              priceLists={priceLists} activePLId={activePLId}
              onPushToScope={handlePushToScope}
            />
          )}

          {subtab === "report" && (
            <DryDoxReport
              project={proj}
              companyLogo={companyLogo}
              rooms={rooms}
              dryingLogs={dryingLogs}
              moisturePoints={moisturePoints}
              equipmentPlacements={equipmentPlacements}
              dryingComplete={dryingComplete}
              floors={floors}
              onSaveDocument={handleSaveDocument}
            />
          )}

          {subtab === "esx" && (
            <DryDoxESX
              rooms={rooms}
              floors={floors}
              equipmentPlacements={equipmentPlacements}
              project={proj}
              moisturePoints={moisturePoints}
            />
          )}

        </div>
      </div>
    </div>
  );
}
