/* ══════════════════════════════════════════════════════════════════
   DRYDOX REPORT — PDF Drying Report Generator
   - Company logo header
   - Floor plan sketch per area
   - Moisture readings & psychrometric data with charts/graphs
   - Progressive daily readings
   - Equipment deployment history
   - Generates downloadable PDF via browser print / jsPDF
   - Drops into Documents tab on the project
══════════════════════════════════════════════════════════════════ */
import { useState, useRef, useMemo, useCallback } from "react";
import {
  DDIc, MATERIAL_CLASSES, WATER_CATEGORIES, EQUIP_TYPES, getET,
  rhColor, rhLabel, fmtDate, fmtShort, calcGPP, calcDewPoint,
  DRY_STANDARD_RH, DRY_STANDARD_GPP, fmt$c,
} from "./DryDoxConstants.js";

// ── SVG Chart for PDF (self-contained, print-friendly) ──
function PrintTrendChart({ data, dataKey, color, label, threshold, height = 80 }) {
  if (!data || data.length < 2) return null;
  const values = data.map(d => d[dataKey] || 0);
  const max = Math.max(...values, threshold || 0) * 1.1;
  const min = 0;
  const range = max - min || 1;
  const svgW = 360;
  const svgH = height;
  const pad = { top: 8, right: 8, bottom: 20, left: 30 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;

  const points = values.map((v, i) => {
    const x = pad.left + (i / (values.length - 1)) * plotW;
    const y = pad.top + plotH - ((v - min) / range) * plotH;
    return `${x},${y}`;
  });

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <svg width={svgW} height={svgH} style={{ border: "1px solid #ddd", borderRadius: 4 }}>
        <rect width={svgW} height={svgH} fill="#fafafa" />
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const y = pad.top + plotH * (1 - f);
          return <line key={f} x1={pad.left} y1={y} x2={pad.left + plotW} y2={y} stroke="#eee" strokeWidth="0.5" />;
        })}
        {/* Threshold */}
        {threshold && (
          <line
            x1={pad.left} y1={pad.top + plotH - ((threshold - min) / range) * plotH}
            x2={pad.left + plotW} y2={pad.top + plotH - ((threshold - min) / range) * plotH}
            stroke="#059669" strokeWidth="1" strokeDasharray="3,2" />
        )}
        {/* Line */}
        <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2" />
        {/* Points */}
        {values.map((v, i) => {
          const x = pad.left + (i / (values.length - 1)) * plotW;
          const y = pad.top + plotH - ((v - min) / range) * plotH;
          return <circle key={i} cx={x} cy={y} r="3" fill={color} stroke="#fff" strokeWidth="1" />;
        })}
        {/* X labels */}
        {data.map((d, i) => {
          const x = pad.left + (i / Math.max(data.length - 1, 1)) * plotW;
          return <text key={i} x={x} y={svgH - 4} fill="#999" fontSize="7" textAnchor="middle" fontFamily="monospace">{d.label}</text>;
        })}
      </svg>
    </div>
  );
}

// ── Floor Plan SVG for print ──
function PrintFloorPlan({ rooms, moisturePoints, equipmentPlacements }) {
  const SCALE = 8;
  const padding = 20;

  if (!rooms || rooms.length === 0) return null;

  let totalW = 0;
  const roomLayouts = rooms.map((room, i) => {
    const x = totalW + padding;
    const y = padding;
    const w = room.widthFt * SCALE;
    const h = room.depthFt * SCALE;
    totalW += w + 15;
    return { room, x, y, w, h };
  });

  const svgW = totalW + padding * 2;
  const svgH = Math.max(...roomLayouts.map(r => r.h)) + padding * 3;

  return (
    <div style={{ marginBottom: 12 }}>
      <svg width={Math.min(svgW, 520)} height={Math.min(svgH, 300)}
        viewBox={`0 0 ${svgW} ${svgH}`} style={{ border: "1px solid #ddd", borderRadius: 4, background: "#fafafa" }}>
        {roomLayouts.map(({ room, x, y, w, h }) => (
          <g key={room.id}>
            <rect x={x} y={y} width={w} height={h} fill="#f0f0f0" stroke="#333" strokeWidth="1.5" />
            <text x={x + w / 2} y={y + 12} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#333">{room.label}</text>
            <text x={x + w / 2} y={y + h - 4} textAnchor="middle" fontSize="7" fill="#999" fontFamily="monospace">
              {room.widthFt}' × {room.depthFt}'
            </text>
            {/* Moisture points */}
            {moisturePoints.filter(p => p.roomId === room.id).map(pt => {
              const px = x + (pt.x / 100) * w;
              const py = y + (pt.y / 100) * h;
              const latest = pt.readings?.[pt.readings.length - 1];
              const rh = latest?.rh ?? 0;
              const c = rh <= 55 ? "#059669" : rh <= 65 ? "#b45309" : "#dc2626";
              return (
                <g key={pt.id}>
                  <circle cx={px} cy={py} r="4" fill={c} opacity="0.3" stroke={c} strokeWidth="1" />
                  {latest && <text x={px} y={py + 2.5} textAnchor="middle" fontSize="5" fill={c} fontWeight="bold">{rh}%</text>}
                </g>
              );
            })}
            {/* Equipment */}
            {equipmentPlacements.filter(e => e.roomId === room.id && !e.removedAt).map(eq => {
              const ex = x + (eq.x / 100) * w;
              const ey = y + (eq.y / 100) * h;
              return (
                <g key={eq.id}>
                  <rect x={ex - 5} y={ey - 5} width="10" height="10" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="0.5" />
                  <text x={ex} y={ey + 3} textAnchor="middle" fontSize="6">{getET(eq.type).code}</text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Report Preview (also used as print target) ──
function ReportPreview({
  project, companyLogo, rooms, dryingLogs, moisturePoints,
  equipmentPlacements, dryingComplete, floors, trendData,
}) {
  const dayGroups = useMemo(() => {
    const groups = {};
    dryingLogs.forEach(log => {
      const day = log.date || fmtShort(log.timestamp);
      if (!groups[day]) groups[day] = { label: day, readings: [], dayNum: Object.keys(groups).length + 1 };
      groups[day].readings.push(log);
    });
    return Object.values(groups);
  }, [dryingLogs]);

  const tData = trendData || dayGroups.map(dg => {
    const chamberR = dg.readings.filter(r => r.mode === "chamber" || !r.mode);
    const avgRH = chamberR.length > 0 ? Math.round(chamberR.reduce((s, r) => s + (r.rh || 0), 0) / chamberR.length) : 0;
    const avgTemp = chamberR.length > 0 ? Math.round(chamberR.reduce((s, r) => s + (r.temp || 0), 0) / chamberR.length) : 0;
    const avgGPP = chamberR.length > 0 ? Math.round(chamberR.reduce((s, r) => s + (r.gpp || calcGPP(r.temp, r.rh) || 0), 0) / chamberR.length * 10) / 10 : 0;
    return { label: `D${dg.dayNum}`, rh: avgRH, temp: avgTemp, gpp: avgGPP };
  });

  return (
    <div className="dd-report-preview" id="drydox-report-content">
      {/* Header with logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, paddingBottom: 12, borderBottom: "3px solid #e43531" }}>
        {companyLogo ? (
          <img src={companyLogo} alt="Company Logo" style={{ height: 48, objectFit: "contain" }} />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: 10, background: "#e43531", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16, fontFamily: "monospace" }}>JD</div>
        )}
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Drying Report</div>
          <div style={{ fontSize: 11, color: "#666" }}>
            {project?.name || "Project"} · {project?.address || ""} · Generated {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Project summary */}
      <h2>Project Summary</h2>
      <table>
        <tbody>
          <tr><td style={{ fontWeight: 700, width: 150 }}>Project</td><td>{project?.name || "—"}</td></tr>
          <tr><td style={{ fontWeight: 700 }}>Address</td><td>{project?.address || "—"}</td></tr>
          <tr><td style={{ fontWeight: 700 }}>Type</td><td>{project?.type || "Water Damage"}</td></tr>
          <tr><td style={{ fontWeight: 700 }}>Total Drying Days</td><td>{dayGroups.length}</td></tr>
          <tr><td style={{ fontWeight: 700 }}>Total Rooms/Areas</td><td>{rooms.length}</td></tr>
          <tr><td style={{ fontWeight: 700 }}>Status</td><td style={{ color: dryingComplete ? "#059669" : "#b45309", fontWeight: 700 }}>
            {dryingComplete ? `Complete — ${fmtDate(dryingComplete.completedAt)}` : "In Progress"}
          </td></tr>
        </tbody>
      </table>

      {/* Floor Plans */}
      <h2>Floor Plan</h2>
      {(floors || [1]).map(fl => {
        const floorRooms = rooms.filter(r => (r.floor || 1) === fl);
        if (floorRooms.length === 0) return null;
        return (
          <div key={fl}>
            {floors && floors.length > 1 && <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Floor {fl}</div>}
            <PrintFloorPlan rooms={floorRooms} moisturePoints={moisturePoints} equipmentPlacements={equipmentPlacements} />
          </div>
        );
      })}

      {/* Room Details */}
      <h2>Room Details</h2>
      <table>
        <thead>
          <tr>
            <th>Room</th><th>Dimensions</th><th>SF</th><th>Ceiling</th>
            <th>Water Cat.</th><th>Material Class</th><th>Latest RH</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map(room => {
            const mc = MATERIAL_CLASSES.find(c => c.id === room.materialClass);
            const wc = WATER_CATEGORIES.find(c => c.id === room.category);
            const roomLogs = dryingLogs.filter(l => l.roomId === room.id);
            const latestRH = roomLogs.length > 0 ? roomLogs[roomLogs.length - 1].rh : null;
            return (
              <tr key={room.id}>
                <td style={{ fontWeight: 600 }}>{room.label}{room.suite ? ` (${room.suite})` : ""}</td>
                <td>{room.widthFt}' × {room.depthFt}'</td>
                <td>{room.sqft || Math.round(room.widthFt * room.depthFt)}</td>
                <td>{room.ceilingFt || 8}'</td>
                <td>{wc?.label || "—"}</td>
                <td>{mc?.label || "—"}</td>
                <td style={{ color: latestRH ? (latestRH <= 55 ? "#059669" : latestRH <= 65 ? "#b45309" : "#dc2626") : "#999", fontWeight: 700 }}>
                  {latestRH ? `${latestRH}%` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Drying Trend Charts */}
      {tData.length >= 2 && (
        <>
          <h2>Drying Trends</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <PrintTrendChart data={tData} dataKey="rh" color="#dc2626" label="Relative Humidity (%)" threshold={DRY_STANDARD_RH} />
            <PrintTrendChart data={tData} dataKey="gpp" color="#0891b2" label="Grains Per Pound" threshold={DRY_STANDARD_GPP} />
            <PrintTrendChart data={tData} dataKey="temp" color="#2563eb" label="Temperature (°F)" />
          </div>
        </>
      )}

      {/* Daily Readings Table */}
      <h2>Daily Psychrometric Readings</h2>
      <table>
        <thead>
          <tr>
            <th>Day</th><th>Date</th><th>Temp °F</th><th>RH %</th>
            <th>GPP</th><th>Dew Point</th><th>Tech</th><th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {dayGroups.map(dg => {
            const chamberR = dg.readings.filter(r => r.mode === "chamber" || !r.mode);
            if (chamberR.length === 0) return (
              <tr key={dg.label}>
                <td>Day {dg.dayNum}</td><td>{dg.label}</td>
                <td colSpan={6} style={{ color: "#999" }}>Point readings only</td>
              </tr>
            );
            return chamberR.map((r, i) => (
              <tr key={r.id}>
                {i === 0 && <td rowSpan={chamberR.length} style={{ fontWeight: 700 }}>Day {dg.dayNum}</td>}
                {i === 0 && <td rowSpan={chamberR.length}>{dg.label}</td>}
                <td>{r.temp || "—"}</td>
                <td style={{ color: r.rh <= 55 ? "#059669" : r.rh <= 65 ? "#b45309" : "#dc2626", fontWeight: 700 }}>
                  {r.rh || "—"}
                </td>
                <td>{r.gpp || calcGPP(r.temp, r.rh).toFixed(1)}</td>
                <td>{calcDewPoint(r.temp, r.rh)}</td>
                <td>{r.tech || "—"}</td>
                <td style={{ fontSize: 9 }}>{r.notes || ""}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>

      {/* Moisture Point Readings */}
      {moisturePoints.length > 0 && (
        <>
          <h2>Moisture Point Readings</h2>
          <table>
            <thead>
              <tr><th>Point</th><th>Room</th><th>Surface</th>
                {dayGroups.map(dg => <th key={dg.label}>D{dg.dayNum}</th>)}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {moisturePoints.map(pt => {
                const room = rooms.find(r => r.id === pt.roomId);
                const readings = pt.readings || [];
                const latest = readings[readings.length - 1];
                return (
                  <tr key={pt.id}>
                    <td style={{ fontWeight: 600 }}>{pt.label || `Point ${pt.id.slice(-4)}`}</td>
                    <td>{room?.label || "—"}</td>
                    <td>{pt.surface || "—"}</td>
                    {dayGroups.map((dg, i) => {
                      const r = readings[i];
                      return (
                        <td key={dg.label} style={{
                          fontWeight: 700, fontFamily: "monospace",
                          color: r ? (r.rh <= 55 ? "#059669" : r.rh <= 65 ? "#b45309" : "#dc2626") : "#ccc",
                        }}>
                          {r ? (r.value || `${r.rh}%`) : "—"}
                        </td>
                      );
                    })}
                    <td style={{
                      fontWeight: 700,
                      color: latest ? (latest.rh <= 55 ? "#059669" : "#dc2626") : "#999",
                    }}>
                      {latest ? (latest.rh <= 55 ? "DRY" : "WET") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {/* Equipment Log */}
      <h2>Equipment Deployment</h2>
      <table>
        <thead>
          <tr><th>Type</th><th>Brand/Model</th><th>Serial</th><th>Room</th><th>Day In</th><th>Day Out</th><th>Days</th></tr>
        </thead>
        <tbody>
          {equipmentPlacements.map(eq => {
            const et = getET(eq.type);
            const room = rooms.find(r => r.id === eq.roomId);
            const dIn = parseInt(eq.dayIn) || 1;
            const dOut = parseInt(eq.dayOut) || dayGroups.length;
            const days = Math.max(1, dOut - dIn + 1);
            return (
              <tr key={eq.id}>
                <td>{et.icon} {et.label}</td>
                <td>{eq.brand || "—"}</td>
                <td style={{ fontFamily: "monospace" }}>{eq.serial || "—"}</td>
                <td>{room?.label || "—"}</td>
                <td>Day {dIn}</td>
                <td>{eq.removedAt ? `Day ${dOut}` : "Active"}</td>
                <td style={{ fontWeight: 700 }}>{days}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: 24, paddingTop: 12, borderTop: "1px solid #ddd", textAlign: "center", fontSize: 9, color: "#999" }}>
        Generated by DryDox — Job-Dox Restoration Management Platform · {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}

// ── Main Report Tab ──
export default function DryDoxReport({
  project, companyLogo, rooms, dryingLogs, moisturePoints,
  equipmentPlacements, dryingComplete, floors,
  onSaveDocument,
}) {
  const [generating, setGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const reportRef = useRef(null);

  const trendData = useMemo(() => {
    const groups = {};
    dryingLogs.forEach(log => {
      const day = log.date || fmtShort(log.timestamp);
      if (!groups[day]) groups[day] = { readings: [], dayNum: Object.keys(groups).length + 1 };
      groups[day].readings.push(log);
    });
    return Object.values(groups).map(dg => {
      const chamberR = dg.readings.filter(r => r.mode === "chamber" || !r.mode);
      const avgRH = chamberR.length > 0 ? Math.round(chamberR.reduce((s, r) => s + (r.rh || 0), 0) / chamberR.length) : 0;
      const avgTemp = chamberR.length > 0 ? Math.round(chamberR.reduce((s, r) => s + (r.temp || 0), 0) / chamberR.length) : 0;
      const avgGPP = chamberR.length > 0 ? Math.round(chamberR.reduce((s, r) => s + (r.gpp || calcGPP(r.temp, r.rh) || 0), 0) / chamberR.length * 10) / 10 : 0;
      return { label: `D${dg.dayNum}`, rh: avgRH, temp: avgTemp, gpp: avgGPP };
    });
  }, [dryingLogs]);

  // Generate PDF via browser print
  const generatePDF = useCallback(async () => {
    setGenerating(true);
    setPreviewMode(true);

    // Wait for render
    await new Promise(r => setTimeout(r, 300));

    const content = document.getElementById("drydox-report-content");
    if (!content) { setGenerating(false); return; }

    // Create print-friendly window
    const printWin = window.open("", "_blank", "width=800,height=1000");
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Drying Report — ${project?.name || "Project"}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Outfit', sans-serif; font-size: 11px; color: #111; padding: 20px; }
          h2 { font-size: 14px; margin: 16px 0 6px; border-bottom: 2px solid #e43531; padding-bottom: 3px; }
          table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; }
          th, td { border: 1px solid #ddd; padding: 4px 6px; font-size: 10px; text-align: left; }
          th { background: #f5f5f5; font-weight: 700; }
          @media print {
            body { padding: 0; }
            @page { margin: 0.5in; size: letter; }
          }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();

    // Auto-trigger print (which allows Save as PDF)
    setTimeout(() => {
      printWin.print();
      setGenerating(false);

      // Save record to documents
      if (onSaveDocument) {
        onSaveDocument({
          id: `drydox-report-${Date.now()}`,
          name: `Drying Report — ${project?.name || "Project"}`,
          type: "DryDox",
          date: new Date().toISOString(),
          source: "DryDox",
          status: dryingComplete ? "Final" : "In Progress",
        });
      }
    }, 1000);
  }, [project, dryingComplete, onSaveDocument]);

  return (
    <div>
      <div className="dd-sec-row">
        <div>
          <div className="dd-sec">Drying Report</div>
          <div style={{ fontSize: 10, color: "var(--t3)" }}>
            Generate a comprehensive PDF report for insurance carrier or customer.
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-xs" onClick={() => setPreviewMode(p => !p)}>
            {previewMode ? "Hide Preview" : "Preview Report"}
          </button>
          <button className="btn btn-primary btn-xs" onClick={generatePDF} disabled={generating}>
            {generating ? <span className="spin" style={{ display: "inline-block", animation: "spin .7s linear infinite" }}>⟳</span> : DDIc.pdf}
            {generating ? " Generating..." : " Generate PDF"}
          </button>
        </div>
      </div>

      {/* Report summary stats */}
      <div className="dd-kpi-row" style={{ marginBottom: 14 }}>
        {[
          ["Drying Days", trendData.length, "var(--blue)"],
          ["Rooms", rooms.length, "var(--teal)"],
          ["Readings", dryingLogs.length, "var(--purple)"],
          ["Equipment", equipmentPlacements.length, "var(--amber)"],
          ["Status", dryingComplete ? "COMPLETE" : "IN PROGRESS", dryingComplete ? "var(--green)" : "var(--amber)"],
        ].map(([l, v, c]) => (
          <div key={l} className="dd-kpi">
            <div className="dd-kpi-val" style={{ color: c, fontSize: 16 }}>{v}</div>
            <div className="dd-kpi-lbl">{l}</div>
          </div>
        ))}
      </div>

      {/* What's included checklist */}
      <div className="dd-card" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Report Contents</div>
        {[
          ["Company logo & project info", true],
          ["Floor plan sketches with moisture markers", rooms.length > 0],
          ["Room measurements & material classifications", rooms.length > 0],
          ["Daily psychrometric readings (Temp, RH, GPP, Dew Point)", dryingLogs.length > 0],
          ["Moisture point progression readings", dryingLogs.filter(l => l.mode === "point").length > 0],
          ["RH & GPP trend charts", trendData.length >= 2],
          ["Equipment deployment log", equipmentPlacements.length > 0],
          ["Drying completion certification", !!dryingComplete],
        ].map(([label, included], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 11 }}>
            <span style={{
              width: 16, height: 16, borderRadius: 4,
              background: included ? "rgba(26,217,138,.15)" : "var(--s3)",
              border: `1px solid ${included ? "rgba(26,217,138,.3)" : "var(--br)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: included ? "var(--green)" : "var(--t3)", fontSize: 10,
            }}>
              {included ? "✓" : "—"}
            </span>
            <span style={{ color: included ? "var(--t1)" : "var(--t3)" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Preview */}
      {previewMode && (
        <div style={{ border: "1px solid var(--br)", borderRadius: 10, overflow: "hidden" }}>
          <div ref={reportRef}>
            <ReportPreview
              project={project}
              companyLogo={companyLogo}
              rooms={rooms}
              dryingLogs={dryingLogs}
              moisturePoints={moisturePoints}
              equipmentPlacements={equipmentPlacements}
              dryingComplete={dryingComplete}
              floors={floors}
              trendData={trendData}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export { ReportPreview, PrintFloorPlan, PrintTrendChart };
