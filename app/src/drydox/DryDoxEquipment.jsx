/* ══════════════════════════════════════════════════════════════════
   DRYDOX EQUIPMENT — Drag & Drop, Inventory Integration, Billing
   - Drag equipment from inventory onto rooms on the floor plan
   - Track deployment dates for automatic billing calculation
   - Equipment day-in / day-out tracking
   - Links to company inventory list
   - CSV import/export for equipment inventory
══════════════════════════════════════════════════════════════════ */
import { useState, useCallback, useMemo, useRef } from "react";
import { dduid, DDIc, EQUIP_TYPES, getET, fmt$c, fmtDate, compareS500 } from "./DryDoxConstants.jsx";

// ── Equipment Inventory Sidebar (drag source) ──
function EquipmentInventory({ inventory, onDeploy, onReportMalfunction }) {
  const [search, setSearch] = useState("");
  const [dragItem, setDragItem] = useState(null);

  const filtered = inventory.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return item.brand?.toLowerCase().includes(s) ||
           item.serial?.toLowerCase().includes(s) ||
           getET(item.type).label.toLowerCase().includes(s);
  });

  const handleDragStart = (e, item) => {
    setDragItem(item);
    e.dataTransfer.setData("text/plain", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="dd-sec-row">
        <div className="dd-sec">Equipment Inventory</div>
      </div>
      <input className="inp" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search equipment..." style={{ marginBottom: 6, height: 32, fontSize: 12 }} />
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--t3)", textAlign: "center", padding: 16 }}>
            No equipment found. Add equipment to your company inventory first.
          </div>
        ) : (
          filtered.map(item => {
            const et = getET(item.type);
            return (
              <div key={item.id} className="dd-equip-card"
                draggable
                onDragStart={e => handleDragStart(e, item)}
                onTouchStart={() => setDragItem(item)}
                onClick={() => onDeploy && onDeploy(item)}
                style={{ padding: 8, marginBottom: 4, cursor: "grab" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{et.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.brand || et.label}
                    </div>
                    {item.serial && (
                      <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)" }}>{item.serial}</div>
                    )}
                  </div>
                  {onReportMalfunction && (
                    <button
                      style={{
                        background: "none", border: "none", cursor: "pointer", padding: 2,
                        color: "var(--amber)", opacity: 0.6, fontSize: 12,
                      }}
                      title="Report Malfunction"
                      onClick={e => { e.stopPropagation(); onReportMalfunction(item); }}>
                      {DDIc.warn}
                    </button>
                  )}
                  <div style={{ color: "var(--t3)", opacity: 0.5 }}>{DDIc.drag}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Deploy Equipment Modal ──
function DeployEquipmentModal({ rooms, priceLists, activePLId, inventoryItem, onDeploy, onClose }) {
  const [f, setF] = useState({
    type: inventoryItem?.type || "fan",
    brand: inventoryItem?.brand || "",
    serial: inventoryItem?.serial || "",
    roomId: rooms[0]?.id || "",
    notes: "",
    plItemId: "",
    inventoryId: inventoryItem?.id || null,
  });

  const currentPL = priceLists.find(pl => pl.id === activePLId);

  const deploy = () => {
    if (!f.roomId) return;
    onDeploy({
      id: dduid(),
      type: f.type,
      brand: f.brand,
      serial: f.serial,
      roomId: f.roomId,
      notes: f.notes,
      plItemId: f.plItemId,
      inventoryId: f.inventoryId,
      deployedAt: new Date().toISOString(),
      dayIn: 1,
      dayOut: 0, // 0 = still active
      removedAt: null,
      // Position on floor plan (center of room by default)
      x: 50, y: 50,
      icon: getET(f.type).icon,
    });
    onClose();
  };

  return (
    <div className="dd-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dd-modal">
        <div className="dd-modal-title">Deploy Equipment</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div>
            <label className="lbl">Equipment Type</label>
            <select className="sel" value={f.type} onChange={e => setF(p => ({ ...p, type: e.target.value }))}>
              {EQUIP_TYPES.map(et => <option key={et.value} value={et.value}>{et.icon} {et.label}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl">Room / Location</label>
            <select className="sel" value={f.roomId} onChange={e => setF(p => ({ ...p, roomId: e.target.value }))}>
              <option value="">-- Select Room --</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div>
            <label className="lbl">Brand / Model</label>
            <input className="inp" value={f.brand} onChange={e => setF(p => ({ ...p, brand: e.target.value }))}
              placeholder="e.g. LGR 7000 XLi" />
          </div>
          <div>
            <label className="lbl">Serial #</label>
            <input className="inp" value={f.serial} onChange={e => setF(p => ({ ...p, serial: e.target.value }))}
              placeholder="SN-0000" />
          </div>
        </div>

        {currentPL && (
          <div style={{ marginBottom: 10 }}>
            <label className="lbl">Price List Item (for billing)</label>
            <select className="sel" value={f.plItemId} onChange={e => setF(p => ({ ...p, plItemId: e.target.value }))}>
              <option value="">-- None --</option>
              {(currentPL.items || []).map(i => (
                <option key={i.id} value={i.id}>{i.desc} (${i.price}/{i.unit})</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label className="lbl">Placement Notes</label>
          <input className="inp" value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))}
            placeholder="e.g. NE corner, facing wall" />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-xs" onClick={deploy}>{DDIc.check} Deploy</button>
        </div>
      </div>
    </div>
  );
}

// ── Report Malfunction Modal ──
function ReportMalfunctionModal({ item, rooms, onReport, onClose }) {
  const [f, setF] = useState({
    description: "",
    severity: "unusable", // unusable, degraded
  });

  const et = getET(item.type);
  const room = rooms?.find(r => r.id === item.roomId);

  const submit = () => {
    if (!f.description.trim()) return;
    onReport({
      id: dduid(),
      equipmentId: item.inventoryId || item.id,
      type: item.type,
      brand: item.brand || "",
      serial: item.serial || "",
      roomId: item.roomId || null,
      roomLabel: room?.label || null,
      description: f.description.trim(),
      severity: f.severity,
      reportedAt: new Date().toISOString(),
      status: "open", // open, resolved
      resolvedAt: null,
      resolutionNotes: "",
    });
    onClose();
  };

  return (
    <div className="dd-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dd-modal">
        <div className="dd-modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--acc)" }}>{DDIc.warn}</span> Report Malfunction
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: 12,
          background: "var(--s1)", border: "1px solid var(--br)", borderRadius: 8, marginBottom: 12,
        }}>
          <span style={{ fontSize: 20 }}>{et.icon}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>{item.brand || et.label}</div>
            <div style={{ fontSize: 10, color: "var(--t3)", fontFamily: "var(--mono)" }}>
              {item.serial ? `SN: ${item.serial}` : et.label}
              {room ? ` · ${room.label}` : ""}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label className="lbl">Severity</label>
          <select className="sel" value={f.severity} onChange={e => setF(p => ({ ...p, severity: e.target.value }))}>
            <option value="unusable">Unusable — Cannot operate</option>
            <option value="degraded">Degraded — Reduced performance</option>
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="lbl">Issue Description</label>
          <textarea
            className="inp"
            value={f.description}
            onChange={e => setF(p => ({ ...p, description: e.target.value }))}
            placeholder="Describe the malfunction (e.g. motor won't start, leaking refrigerant, unusual noise...)"
            style={{ width: "100%", minHeight: 80, resize: "vertical", fontFamily: "var(--ui)", fontSize: 12 }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger btn-xs" onClick={submit} disabled={!f.description.trim()}>
            {DDIc.warn} Report Malfunction
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Equipment Tab ──
export default function DryDoxEquipment({
  rooms, equipmentPlacements, setEquipmentPlacements,
  inventory = [], setInventory, priceLists = [], activePLId,
  billingDays, setBillingDays, onPushToScope,
  s500Comments = {}, s500Overrides = {},
  malfunctionReports = [], setMalfunctionReports,
}) {
  const [view, setView] = useState("deployed"); // deployed, inventory, billing, reports
  const [deployModal, setDeployModal] = useState(null); // item to deploy or true for empty
  const [dragTarget, setDragTarget] = useState(null);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [malfunctionModal, setMalfunctionModal] = useState(null); // item to report

  const currentPL = priceLists.find(pl => pl.id === activePLId);

  // S500 comparison for inline banner
  const s500 = useMemo(
    () => compareS500(rooms, equipmentPlacements, s500Overrides?.dehuPPD, s500Overrides?.scrubberCFM),
    [rooms, equipmentPlacements, s500Overrides]
  );
  const underMismatches = s500.mismatches.filter(m => !m.over);
  const hasUncommented = underMismatches.some(m => !(s500Comments?.[m.type] || "").trim());

  // Equipment counts
  const activeEquip = equipmentPlacements.filter(e => !e.removedAt);
  const removedEquip = equipmentPlacements.filter(e => e.removedAt);

  // Billing calculations
  const calcEquipCost = useCallback((eq) => {
    const dOut = parseInt(eq.dayOut) || 0;
    const dIn = parseInt(eq.dayIn) || 1;
    const days = dOut > 0 ? Math.max(1, dOut - dIn + 1) : Math.max(1, billingDays - dIn + 1);
    const plItem = currentPL?.items.find(i => i.id === eq.plItemId);
    const rate = plItem?.price || 0;
    return { days, rate, total: days * rate, plItem };
  }, [billingDays, currentPL]);

  const totalEquipCost = equipmentPlacements.reduce((sum, eq) => {
    const c = calcEquipCost(eq);
    return sum + c.total;
  }, 0);

  // Handle drop on room
  const handleDrop = useCallback((e, roomId) => {
    e.preventDefault();
    setDragTarget(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      setDeployModal({ ...data, targetRoom: roomId });
    } catch {}
  }, []);

  // Remove equipment (set day out)
  const removeEquipment = (eqId) => {
    setEquipmentPlacements(prev => prev.map(eq =>
      eq.id === eqId
        ? { ...eq, removedAt: new Date().toISOString(), dayOut: billingDays }
        : eq
    ));
  };

  // IDs of equipment currently flagged as malfunctioning (open reports)
  const malfunctioningIds = useMemo(() => {
    const ids = new Set();
    (malfunctionReports || []).filter(r => r.status === "open").forEach(r => ids.add(r.equipmentId));
    return ids;
  }, [malfunctionReports]);

  // Available inventory = inventory minus malfunctioning items
  const availableInventory = useMemo(() =>
    inventory.filter(item => !malfunctioningIds.has(item.id)),
    [inventory, malfunctioningIds]
  );

  const openReports = (malfunctionReports || []).filter(r => r.status === "open");

  // Report a malfunction — pull from deployed if applicable, remove from available inventory
  const handleReportMalfunction = (report) => {
    if (!setMalfunctionReports) return;
    setMalfunctionReports(prev => [...prev, report]);
    // If the equipment is currently deployed, remove it (set dayOut)
    const deployedMatch = equipmentPlacements.find(e =>
      !e.removedAt && (e.inventoryId === report.equipmentId || e.id === report.equipmentId)
    );
    if (deployedMatch) {
      removeEquipment(deployedMatch.id);
    }
  };

  // Resolve a malfunction — mark as resolved and re-add to inventory
  const handleResolveMalfunction = (reportId, notes) => {
    if (!setMalfunctionReports) return;
    setMalfunctionReports(prev => prev.map(r =>
      r.id === reportId
        ? { ...r, status: "resolved", resolvedAt: new Date().toISOString(), resolutionNotes: notes || "" }
        : r
    ));
  };

  // Push equipment billing to scope
  const pushToScope = () => {
    if (!onPushToScope || !currentPL) return;
    const lineItems = equipmentPlacements
      .filter(eq => eq.plItemId)
      .map(eq => {
        const { days, rate, plItem } = calcEquipCost(eq);
        const et = getET(eq.type);
        const room = rooms.find(r => r.id === eq.roomId);
        return {
          id: dduid(),
          desc: `${eq.brand || et.label} — ${et.label}${room ? " (" + room.label + ")" : ""}`,
          unit: "day", qty: days, price: rate,
          source: "drydox",
        };
      }).filter(i => i.price > 0);
    if (lineItems.length > 0) onPushToScope(lineItems);
  };

  return (
    <div>
      {/* KPI row */}
      <div className="dd-kpi-row">
        {[
          ["Active", activeEquip.length, "var(--green)"],
          ["Removed", removedEquip.length, "var(--t3)"],
          ["Types", [...new Set(equipmentPlacements.map(e => e.type))].length, "var(--blue)"],
          ["Est. Cost", fmt$c(totalEquipCost), "var(--amber)"],
        ].map(([l, v, c]) => (
          <div key={l} className="dd-kpi">
            <div className="dd-kpi-val" style={{ color: c }}>{v}</div>
            <div className="dd-kpi-lbl">{l}</div>
          </div>
        ))}
      </div>

      {/* S500 compliance inline banner */}
      {rooms.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
          background: s500.matched ? "rgba(26,217,138,.06)" : "rgba(228,53,49,.06)",
          border: `1px solid ${s500.matched ? "rgba(26,217,138,.2)" : "rgba(228,53,49,.2)"}`,
          borderRadius: 8, marginBottom: 12, fontSize: 11,
        }}>
          <span style={{
            fontWeight: 700, fontFamily: "var(--mono)", fontSize: 10,
            color: s500.matched ? "var(--green)" : "var(--acc)",
          }}>
            {s500.matched ? "✓ S500" : "⚠ S500"}
          </span>
          <div style={{ flex: 1, color: "var(--t2)" }}>
            {s500.matched
              ? "Equipment meets IICRC S500 recommendations."
              : `${underMismatches.length} shortfall${underMismatches.length > 1 ? "s" : ""}: ${underMismatches.map(m => `${m.label} (${m.deployed}/${m.recommended})`).join(", ")}`}
          </div>
          {!s500.matched && hasUncommented && (
            <span style={{ fontSize: 9, color: "var(--acc)", fontWeight: 700, fontFamily: "var(--mono)" }}>
              REASON NEEDED
            </span>
          )}
        </div>
      )}

      {/* View toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {[["deployed", "Deployed"], ["inventory", "Inventory"], ["billing", "Billing"], ["reports", "Reports"]].map(([k, l]) => (
          <button key={k} className={`btn btn-xs ${view === k ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setView(k)}
            style={k === "reports" && openReports.length > 0 ? { position: "relative" } : undefined}>
            {l}
            {k === "reports" && openReports.length > 0 && (
              <span style={{
                marginLeft: 4, fontSize: 8, background: "var(--acc)", color: "#fff",
                borderRadius: 9, padding: "1px 5px", fontFamily: "var(--mono)", fontWeight: 700,
              }}>{openReports.length}</span>
            )}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-xs" onClick={() => setDeployModal(true)}>
          {DDIc.plus} Deploy Equipment
        </button>
      </div>

      {/* DEPLOYED VIEW — equipment in rooms with drag targets */}
      {view === "deployed" && (
        <>
          {rooms.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "var(--t3)", fontSize: 12 }}>
              Add rooms in the Floor Plan tab first, then deploy equipment here.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
              {rooms.map(room => {
                const roomEquip = equipmentPlacements.filter(e => e.roomId === room.id);
                const activeEq = roomEquip.filter(e => !e.removedAt);
                const isDragTarget = dragTarget === room.id;

                return (
                  <div key={room.id}
                    onDragOver={e => { e.preventDefault(); setDragTarget(room.id); }}
                    onDragLeave={() => setDragTarget(null)}
                    onDrop={e => handleDrop(e, room.id)}
                    className="dd-card"
                    style={{
                      borderColor: isDragTarget ? "var(--acc)" : undefined,
                      background: isDragTarget ? "rgba(228,53,49,.04)" : undefined,
                      transition: "all .12s",
                    }}>
                    <div className="dd-card-header" style={{ marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t1)" }}>{room.label}</div>
                        <div style={{ fontSize: 10, color: "var(--t3)", fontFamily: "var(--mono)" }}>
                          {room.widthFt}' × {room.depthFt}' · {activeEq.length} active
                        </div>
                      </div>
                    </div>

                    {isDragTarget && (
                      <div style={{
                        border: "2px dashed var(--acc)", borderRadius: 8, padding: 12,
                        textAlign: "center", color: "var(--acc)", fontSize: 11, marginBottom: 6,
                      }}>
                        Drop equipment here
                      </div>
                    )}

                    {roomEquip.map(eq => {
                      const et = getET(eq.type);
                      const active = !eq.removedAt;
                      const { days, total } = calcEquipCost(eq);
                      return (
                        <div key={eq.id} style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
                          borderTop: "1px solid var(--br)", opacity: active ? 1 : 0.5,
                        }}>
                          <span style={{ fontSize: 16 }}>{et.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {eq.brand || et.label}
                            </div>
                            <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)" }}>
                              D{eq.dayIn}→{eq.dayOut > 0 ? `D${eq.dayOut}` : "Active"} · {days}d
                              {total > 0 && ` · ${fmt$c(total)}`}
                            </div>
                          </div>
                          {active && (
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              <button className="btn btn-xs" style={{
                                padding: "2px 5px", color: "var(--amber)", border: "1px solid var(--amber)",
                                background: "rgba(232,156,24,.08)", fontSize: 9,
                              }}
                                title="Report Malfunction"
                                onClick={() => setMalfunctionModal(eq)}>
                                {DDIc.warn}
                              </button>
                              <button className="btn btn-danger btn-xs" style={{ padding: "2px 5px" }}
                                onClick={() => removeEquipment(eq.id)}>
                                Pull
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {roomEquip.length === 0 && (
                      <div style={{ fontSize: 10, color: "var(--t3)", textAlign: "center", padding: "10px 0" }}>
                        Drag equipment here or click Deploy
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* INVENTORY VIEW — all inventory items as drag sources + CSV import/export */}
      {view === "inventory" && (
        <>
          {setInventory && (
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <button className="btn btn-secondary btn-xs" onClick={() => setShowCSVImport(true)}>
                {DDIc.upload} Import CSV
              </button>
              <button className="btn btn-secondary btn-xs" onClick={() => {
                const inv = inventory.length > 0 ? inventory : generateDefaultInventory();
                const csv = exportEquipmentCSV(inv);
                const blob = new Blob([csv], { type: "text/csv" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                a.download = "equipment-inventory.csv"; a.click();
              }}>
                {DDIc.export} Export CSV
              </button>
            </div>
          )}
          <EquipmentInventory
            inventory={availableInventory.length > 0 ? availableInventory : generateDefaultInventory().filter(i => !malfunctioningIds.has(i.id))}
            onDeploy={item => setDeployModal(item)}
            onReportMalfunction={item => setMalfunctionModal(item)}
          />
        </>
      )}

      {/* CSV Import Modal */}
      {showCSVImport && setInventory && (
        <EquipmentCSVImportModal
          onImport={items => setInventory(prev => [...(prev || []), ...items])}
          onClose={() => setShowCSVImport(false)}
        />
      )}

      {/* BILLING VIEW — cost breakdown */}
      {view === "billing" && (
        <>
          {!currentPL ? (
            <div style={{
              background: "rgba(232,156,24,.08)", border: "1px solid rgba(232,156,24,.25)",
              borderRadius: 10, padding: 14, marginBottom: 14, display: "flex", gap: 10, alignItems: "center",
            }}>
              <span style={{ color: "var(--amber)", fontSize: 16 }}>{DDIc.pricetag}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--amber)" }}>No Price List Selected</div>
                <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 2 }}>
                  Select a price list in the header to calculate equipment billing.
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div className="dd-sec" style={{ marginBottom: 2 }}>Equipment Billing</div>
                  <div style={{ fontSize: 11, color: "var(--t3)" }}>
                    Using: <strong style={{ color: "var(--t1)" }}>{currentPL.name}</strong>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)" }}>PROJECT DAYS</span>
                    <input type="number" className="inp" value={billingDays}
                      onChange={e => setBillingDays(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ width: 56, height: 28, fontSize: 12, textAlign: "center" }} />
                  </div>
                  {onPushToScope && (
                    <button className="btn btn-primary btn-xs" onClick={pushToScope}>
                      {DDIc.scope} Push to Scope
                    </button>
                  )}
                </div>
              </div>

              {/* Billing table */}
              <div style={{ background: "var(--s2)", border: "1px solid var(--br)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "28px 1fr 100px 50px 70px 80px 90px",
                  gap: 6, padding: "8px 12px", background: "var(--s1)", borderBottom: "1px solid var(--br)",
                }}>
                  {["", "Equipment", "Room", "In", "Out", "Days", "Total"].map((h, i) => (
                    <div key={i} style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</div>
                  ))}
                </div>

                {equipmentPlacements.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", color: "var(--t3)", fontSize: 12 }}>
                    No equipment deployed yet.
                  </div>
                ) : (
                  equipmentPlacements.map(eq => {
                    const et = getET(eq.type);
                    const room = rooms.find(r => r.id === eq.roomId);
                    const { days, rate, total, plItem } = calcEquipCost(eq);
                    const active = !eq.removedAt;
                    return (
                      <div key={eq.id} style={{
                        display: "grid", gridTemplateColumns: "28px 1fr 100px 50px 70px 80px 90px",
                        gap: 6, alignItems: "center", padding: "8px 12px", borderBottom: "1px solid var(--br)",
                        opacity: active ? 1 : 0.6,
                      }}>
                        <span style={{ fontSize: 15 }}>{et.icon}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {eq.brand || et.label}
                          </div>
                          {plItem
                            ? <div style={{ fontSize: 9, color: "var(--blue)" }}>{plItem.desc} · ${rate}/{plItem.unit}</div>
                            : <div style={{ fontSize: 9, color: "var(--acc)" }}>No price item assigned</div>}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--t2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {room?.label || "—"}
                        </div>
                        <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--t2)" }}>D{eq.dayIn}</div>
                        <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: active ? "var(--green)" : "var(--t2)" }}>
                          {active ? "Active" : `D${eq.dayOut}`}
                        </div>
                        <div style={{ fontSize: 11, fontFamily: "var(--mono)", fontWeight: 700, color: "var(--blue)" }}>{days}d</div>
                        <div style={{ fontSize: 11, fontFamily: "var(--mono)", fontWeight: 700, color: total > 0 ? "var(--amber)" : "var(--t3)" }}>
                          {total > 0 ? fmt$c(total) : "—"}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Total row */}
                <div style={{
                  display: "grid", gridTemplateColumns: "28px 1fr 100px 50px 70px 80px 90px",
                  gap: 6, padding: "10px 12px", background: "var(--s1)", borderTop: "2px solid var(--br)",
                }}>
                  <div />
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t1)" }}>Equipment Total</div>
                  <div /><div /><div /><div />
                  <div style={{ fontSize: 14, fontFamily: "var(--mono)", fontWeight: 700, color: "var(--green)" }}>
                    {fmt$c(totalEquipCost)}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* REPORTS VIEW — malfunction reports */}
      {view === "reports" && (
        <MalfunctionReportsView
          reports={malfunctionReports || []}
          onResolve={handleResolveMalfunction}
          onDelete={reportId => setMalfunctionReports && setMalfunctionReports(prev => prev.filter(r => r.id !== reportId))}
        />
      )}

      {/* Malfunction report modal */}
      {malfunctionModal && (
        <ReportMalfunctionModal
          item={malfunctionModal}
          rooms={rooms}
          onReport={handleReportMalfunction}
          onClose={() => setMalfunctionModal(null)}
        />
      )}

      {/* Deploy modal */}
      {deployModal && (
        <DeployEquipmentModal
          rooms={rooms}
          priceLists={priceLists}
          activePLId={activePLId}
          inventoryItem={deployModal === true ? null : deployModal}
          onDeploy={eq => setEquipmentPlacements(prev => [...prev, eq])}
          onClose={() => setDeployModal(null)}
        />
      )}
    </div>
  );
}

// ── Malfunction Reports View ──
function MalfunctionReportsView({ reports, onResolve, onDelete }) {
  const [resolveModal, setResolveModal] = useState(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [filter, setFilter] = useState("open"); // open, resolved, all

  const filtered = reports.filter(r => {
    if (filter === "open") return r.status === "open";
    if (filter === "resolved") return r.status === "resolved";
    return true;
  }).sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));

  const openCount = reports.filter(r => r.status === "open").length;
  const resolvedCount = reports.filter(r => r.status === "resolved").length;

  const doResolve = () => {
    if (!resolveModal) return;
    onResolve(resolveModal.id, resolveNotes);
    setResolveModal(null);
    setResolveNotes("");
  };

  return (
    <div>
      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div className="dd-kpi">
          <div className="dd-kpi-val" style={{ color: openCount > 0 ? "var(--acc)" : "var(--t3)" }}>{openCount}</div>
          <div className="dd-kpi-lbl">Open Issues</div>
        </div>
        <div className="dd-kpi">
          <div className="dd-kpi-val" style={{ color: "var(--green)" }}>{resolvedCount}</div>
          <div className="dd-kpi-lbl">Resolved</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {[["open", "Open"], ["resolved", "Resolved"], ["all", "All"]].map(([k, l]) => (
          <button key={k} className={`btn btn-xs ${filter === k ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 30, color: "var(--t3)", fontSize: 12 }}>
          {filter === "open" ? "No open malfunction reports." : "No malfunction reports found."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(report => {
            const et = getET(report.type);
            const isOpen = report.status === "open";
            return (
              <div key={report.id} className="dd-card" style={{
                borderLeft: `3px solid ${isOpen ? "var(--acc)" : "var(--green)"}`,
                opacity: isOpen ? 1 : 0.7,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 22, marginTop: 2 }}>{et.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)" }}>
                        {report.brand || et.label}
                      </span>
                      <span style={{
                        fontSize: 8, fontFamily: "var(--mono)", fontWeight: 700, padding: "1px 6px",
                        borderRadius: 4,
                        background: isOpen ? "rgba(228,53,49,.1)" : "rgba(26,217,138,.1)",
                        color: isOpen ? "var(--acc)" : "var(--green)",
                        textTransform: "uppercase",
                      }}>
                        {isOpen ? "Open" : "Resolved"}
                      </span>
                      <span style={{
                        fontSize: 8, fontFamily: "var(--mono)", fontWeight: 700, padding: "1px 6px",
                        borderRadius: 4,
                        background: report.severity === "unusable" ? "rgba(228,53,49,.1)" : "rgba(232,156,24,.1)",
                        color: report.severity === "unusable" ? "var(--acc)" : "var(--amber)",
                        textTransform: "uppercase",
                      }}>
                        {report.severity}
                      </span>
                    </div>
                    {report.serial && (
                      <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", marginBottom: 4 }}>
                        SN: {report.serial}
                      </div>
                    )}
                    {report.roomLabel && (
                      <div style={{ fontSize: 10, color: "var(--t2)", marginBottom: 4 }}>
                        Location: {report.roomLabel}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "var(--t1)", marginBottom: 6, lineHeight: 1.5 }}>
                      {report.description}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)" }}>
                      Reported: {fmtDate(report.reportedAt)}
                      {report.resolvedAt && ` · Resolved: ${fmtDate(report.resolvedAt)}`}
                    </div>
                    {report.resolutionNotes && (
                      <div style={{
                        fontSize: 10, color: "var(--green)", marginTop: 6, padding: "6px 8px",
                        background: "rgba(26,217,138,.06)", borderRadius: 6, border: "1px solid rgba(26,217,138,.15)",
                      }}>
                        <strong>Resolution:</strong> {report.resolutionNotes}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {isOpen && (
                      <button className="btn btn-xs" style={{
                        padding: "4px 8px", color: "var(--green)", border: "1px solid var(--green)",
                        background: "rgba(26,217,138,.08)", fontSize: 10,
                      }}
                        onClick={() => { setResolveModal(report); setResolveNotes(""); }}>
                        {DDIc.fix} Fixed
                      </button>
                    )}
                    <button className="btn btn-ghost btn-xs" style={{ padding: "4px 5px", opacity: 0.5 }}
                      onClick={() => onDelete(report.id)}>
                      {DDIc.trash}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolve modal */}
      {resolveModal && (
        <div className="dd-modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setResolveModal(null); setResolveNotes(""); } }}>
          <div className="dd-modal">
            <div className="dd-modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--green)" }}>{DDIc.fix}</span> Mark as Fixed
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 10, padding: 12,
              background: "var(--s1)", border: "1px solid var(--br)", borderRadius: 8, marginBottom: 12,
            }}>
              <span style={{ fontSize: 20 }}>{getET(resolveModal.type).icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>{resolveModal.brand || getET(resolveModal.type).label}</div>
                <div style={{ fontSize: 10, color: "var(--t3)" }}>{resolveModal.description}</div>
              </div>
            </div>
            <div style={{
              fontSize: 11, color: "var(--blue)", padding: "8px 10px", marginBottom: 10,
              background: "rgba(59,130,246,.06)", border: "1px solid rgba(59,130,246,.15)", borderRadius: 6,
            }}>
              This equipment will be returned to your available inventory once marked as fixed.
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="lbl">Resolution Notes (optional)</label>
              <textarea
                className="inp"
                value={resolveNotes}
                onChange={e => setResolveNotes(e.target.value)}
                placeholder="Describe what was done to fix the issue (e.g. replaced motor, recalibrated sensor...)"
                style={{ width: "100%", minHeight: 60, resize: "vertical", fontFamily: "var(--ui)", fontSize: 12 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn btn-ghost btn-xs" onClick={() => { setResolveModal(null); setResolveNotes(""); }}>Cancel</button>
              <button className="btn btn-primary btn-xs" onClick={doResolve}>
                {DDIc.check} Return to Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CSV helpers for equipment inventory ──
function parseCSVLine(line) {
  const cols = []; let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
    else if (c === ',' && !inQ) { cols.push(cur.trim()); cur = ""; }
    else { cur += c; }
  }
  cols.push(cur.trim());
  return cols;
}

function parseCSVToEquipment(text) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const raw = parseCSVLine(lines[0]).map(h=>h.replace(/^"|"$/g,"").toLowerCase().replace(/\s+/g,""));
  const colOf = (...names) => { for(const n of names){ const i=raw.indexOf(n); if(i>-1) return i; } return -1; };
  const cType=colOf("type","equipmenttype","equipment_type","category");
  const cBrand=colOf("brand","model","brandmodel","brand/model","name","description");
  const cSerial=colOf("serial","serialnumber","serial_number","serialno","serial#","sn");
  const lookup = {};
  EQUIP_TYPES.forEach(et => { lookup[et.value] = et.value; lookup[et.label.toLowerCase()] = et.value; lookup[et.code.toLowerCase()] = et.value; });
  return lines.slice(1).map(line=>{
    const cols = parseCSVLine(line).map(v=>v.replace(/^"|"$/g,""));
    const brand = cBrand>-1 ? cols[cBrand] : "";
    if (!brand) return null;
    let typeRaw = cType>-1 ? (cols[cType]||"").toLowerCase().trim() : "";
    const type = lookup[typeRaw] || "other";
    return { id:dduid(), type, brand, serial: cSerial>-1 ? (cols[cSerial]||"") : "" };
  }).filter(Boolean);
}

function exportEquipmentCSV(items) {
  const esc = v => { const s = String(v ?? ""); return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g,'""')}"` : s; };
  const rows = ["type,brand,serial"];
  (items || []).forEach(i => rows.push([esc(getET(i.type).label), esc(i.brand), esc(i.serial)].join(",")));
  return rows.join("\n");
}

// ── Equipment CSV Import Modal ──
function EquipmentCSVImportModal({ onImport, onClose }) {
  const [csvText, setCsvText] = useState("");
  const [status, setStatus] = useState(null);
  const fileRef = useRef();

  const handleFile = e => { const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>setCsvText(ev.target.result); r.readAsText(f); e.target.value=""; };
  const doImport = () => {
    const items = parseCSVToEquipment(csvText);
    if (!items.length) { setStatus("No valid items found. Check CSV format."); return; }
    onImport(items);
    setStatus(`Imported ${items.length} items`);
    setCsvText("");
    setTimeout(()=>onClose(), 1200);
  };

  return (
    <div className="dd-modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="dd-modal">
        <div className="dd-modal-title">Import Equipment CSV</div>
        <div style={{background:"var(--s3)",borderRadius:8,padding:"10px 12px",fontSize:11,color:"var(--t2)",marginBottom:10,lineHeight:1.7}}>
          <strong style={{color:"var(--t1)"}}>Required columns:</strong> type, brand<br/>
          <strong style={{color:"var(--t1)"}}>Optional columns:</strong> serial<br/>
          First row must be column headers. Comma-separated.<br/>
          <span style={{color:"var(--t3)"}}>Valid types: Air Mover, Dehumidifier (LGR), Desiccant Dehu, HEPA Air Scrubber, Negative Air Machine, Ozone Generator, Thermal Fogger, Drying Mat, InjectiDry System, Thermal Camera, Other Equipment — or codes: AM, DH, DD, AS, NA, OZ, FG, DM, ID, TC, OT</span>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <button className="btn btn-secondary btn-xs" onClick={()=>fileRef.current?.click()}>{DDIc.upload} Browse File...</button>
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{display:"none"}} onChange={handleFile}/>
        </div>
        <label style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)",display:"block",marginBottom:4}}>Or paste CSV text</label>
        <textarea style={{width:"100%",minHeight:100,fontSize:11,fontFamily:"var(--mono)",background:"var(--s1)",color:"var(--t1)",border:"1px solid var(--br)",borderRadius:6,padding:8,resize:"vertical"}}
          value={csvText} onChange={e=>setCsvText(e.target.value)}
          placeholder={"type,brand,serial\nAir Mover,Dri-Eaz Sahara Pro X3,SN-001\nDehumidifier (LGR),Phoenix 200 HT,SN-002\nHEPA Air Scrubber,Dri-Eaz DefendAir 500,"}/>
        {status && <div style={{fontSize:11,color:status.startsWith("Imported")?"var(--green)":"var(--acc)",marginTop:6}}>{status}</div>}
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:12}}>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-xs" onClick={doImport} disabled={!csvText.trim()}>{DDIc.plus} Import</button>
        </div>
      </div>
    </div>
  );
}

// Generate default inventory if company has none configured
function generateDefaultInventory() {
  return [
    { id: "inv-1", type: "fan", brand: "Dri-Eaz Sahara Pro X3", serial: "" },
    { id: "inv-2", type: "fan", brand: "Dri-Eaz Sahara Pro X3", serial: "" },
    { id: "inv-3", type: "fan", brand: "Phoenix Axial Air Mover", serial: "" },
    { id: "inv-4", type: "dehu", brand: "Dri-Eaz LGR 7000 XLi", serial: "" },
    { id: "inv-5", type: "dehu", brand: "Phoenix 200 HT", serial: "" },
    { id: "inv-6", type: "scrubber", brand: "Dri-Eaz DefendAir 500", serial: "" },
    { id: "inv-7", type: "injectidry", brand: "InjectiDry HP60", serial: "" },
    { id: "inv-8", type: "mat", brand: "Dri-Eaz FloorMat", serial: "" },
  ];
}

export { EquipmentInventory, DeployEquipmentModal, EquipmentCSVImportModal, parseCSVToEquipment, exportEquipmentCSV };
