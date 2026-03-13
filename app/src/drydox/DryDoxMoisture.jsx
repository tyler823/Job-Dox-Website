/* ══════════════════════════════════════════════════════════════════
   DRYDOX MOISTURE — Readings, Psychrometric Data, Drying Logs
   - Per-point moisture readings with daily tracking
   - Psychrometric readings: temp, RH, GPP, dew point
   - Chamber-level and equipment-level readings
   - Visual charts showing drying trends over time
══════════════════════════════════════════════════════════════════ */
import { useState, useRef, useCallback, useMemo } from "react";
import {
  dduid, DDIc, READING_TYPES, MATERIAL_CLASSES,
  DRY_STANDARD_RH, DRY_STANDARD_GPP,
  rhColor, rhLabel, fmtDate, fmtShort,
  calcGPP, calcDewPoint,
} from "./DryDoxConstants.jsx";

// ── SVG Mini-Chart: Line chart for moisture trends ──
function TrendChart({ data, dataKey, color, label, threshold, height = 100, width = "100%" }) {
  if (!data || data.length < 2) {
    return (
      <div className="dd-chart" style={{ textAlign: "center", padding: 20 }}>
        <div style={{ fontSize: 11, color: "var(--t3)" }}>Need at least 2 readings for {label} trend</div>
      </div>
    );
  }

  const values = data.map(d => d[dataKey] || 0);
  const max = Math.max(...values, threshold || 0) * 1.1;
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const svgW = 400;
  const svgH = height;
  const pad = { top: 10, right: 10, bottom: 25, left: 35 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;

  const points = values.map((v, i) => {
    const x = pad.left + (i / (values.length - 1)) * plotW;
    const y = pad.top + plotH - ((v - min) / range) * plotH;
    return `${x},${y}`;
  });

  const areaPoints = [
    `${pad.left},${pad.top + plotH}`,
    ...points,
    `${pad.left + plotW},${pad.top + plotH}`,
  ].join(" ");

  return (
    <div className="dd-chart">
      <div className="dd-chart-title">{label}</div>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="dd-chart-svg" style={{ height }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const y = pad.top + plotH * (1 - f);
          const val = Math.round(min + range * f);
          return (
            <g key={f}>
              <line x1={pad.left} y1={y} x2={pad.left + plotW} y2={y}
                stroke="rgba(255,255,255,.06)" strokeWidth="0.5" />
              <text x={pad.left - 4} y={y + 3} fill="rgba(255,255,255,.3)"
                fontSize="8" fontFamily="'Space Mono',monospace" textAnchor="end">{val}</text>
            </g>
          );
        })}

        {/* Threshold line */}
        {threshold && (
          <g>
            <line
              x1={pad.left} y1={pad.top + plotH - ((threshold - min) / range) * plotH}
              x2={pad.left + plotW} y2={pad.top + plotH - ((threshold - min) / range) * plotH}
              stroke="rgba(26,217,138,.5)" strokeWidth="1" strokeDasharray="4,3" />
            <text
              x={pad.left + plotW + 2}
              y={pad.top + plotH - ((threshold - min) / range) * plotH + 3}
              fill="rgba(26,217,138,.7)" fontSize="7" fontFamily="'Space Mono',monospace">
              DRY
            </text>
          </g>
        )}

        {/* Area fill */}
        <polygon points={areaPoints} fill={`${color}15`} />

        {/* Line */}
        <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {values.map((v, i) => {
          const x = pad.left + (i / (values.length - 1)) * plotW;
          const y = pad.top + plotH - ((v - min) / range) * plotH;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="3.5" fill={color} stroke="var(--s2)" strokeWidth="1.5" />
              <text x={x} y={y - 7} fill={color} fontSize="7" fontFamily="'Space Mono',monospace"
                textAnchor="middle" fontWeight="700">{v}</text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => {
          const x = pad.left + (i / Math.max(data.length - 1, 1)) * plotW;
          return (
            <text key={i} x={x} y={svgH - 4} fill="rgba(255,255,255,.3)"
              fontSize="7" fontFamily="'Space Mono',monospace" textAnchor="middle">
              {d.label || `D${i + 1}`}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ── Bar Chart for daily comparison ──
function BarChart({ data, bars, height = 120, label }) {
  if (!data || data.length === 0) return null;

  const svgW = 400;
  const svgH = height;
  const pad = { top: 10, right: 10, bottom: 25, left: 35 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;

  const allVals = data.flatMap(d => bars.map(b => d[b.key] || 0));
  const max = Math.max(...allVals) * 1.15 || 100;
  const barW = plotW / data.length;
  const subW = barW / (bars.length + 1);

  return (
    <div className="dd-chart">
      <div className="dd-chart-title">{label}</div>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="dd-chart-svg" style={{ height }}>
        {data.map((d, i) => (
          <g key={i}>
            {bars.map((b, j) => {
              const val = d[b.key] || 0;
              const bh = (val / max) * plotH;
              const x = pad.left + i * barW + (j + 0.5) * subW;
              return (
                <g key={j}>
                  <rect x={x} y={pad.top + plotH - bh} width={subW * 0.8} height={bh}
                    rx="2" fill={b.color} opacity="0.7" />
                  <text x={x + subW * 0.4} y={pad.top + plotH - bh - 3}
                    fill={b.color} fontSize="7" fontFamily="'Space Mono',monospace"
                    textAnchor="middle" fontWeight="700">{val}</text>
                </g>
              );
            })}
            <text x={pad.left + i * barW + barW / 2} y={svgH - 4}
              fill="rgba(255,255,255,.3)" fontSize="7" fontFamily="'Space Mono',monospace"
              textAnchor="middle">{d.label || `D${i + 1}`}</text>
          </g>
        ))}
      </svg>
      {/* Legend */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 4 }}>
        {bars.map(b => (
          <div key={b.key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: b.color }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />
            {b.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Psychrometric Summary Cards ──
function PsychrometricCards({ reading }) {
  if (!reading) return null;

  const gpp = reading.gpp || calcGPP(reading.temp, reading.rh);
  const dewPt = calcDewPoint(reading.temp, reading.rh);

  const cards = [
    { label: "Temperature", value: `${reading.temp}°F`, color: "var(--t1)" },
    { label: "Relative Humidity", value: `${reading.rh}%`, color: rhColor(reading.rh) },
    { label: "GPP", value: gpp.toFixed(1), color: gpp <= DRY_STANDARD_GPP ? "var(--green)" : "var(--amber)" },
    { label: "Dew Point", value: `${dewPt}°F`, color: "var(--teal)" },
    { label: "Status", value: rhLabel(reading.rh), color: rhColor(reading.rh) },
  ];

  return (
    <div className="dd-psychro">
      {cards.map(c => (
        <div key={c.label} className="dd-psychro-card">
          <div className="dd-psychro-val" style={{ color: c.color }}>{c.value}</div>
          <div className="dd-psychro-lbl">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Add Reading Modal ──
function AddReadingModal({ rooms, dehumidifiers, onSave, onClose }) {
  const [mode, setMode] = useState("chamber"); // chamber, point, equipment
  const [f, setF] = useState({
    roomId: rooms[0]?.id || "",
    pointId: "",
    equipId: "",
    temp: "", rh: "", gpp: "",
    moistureContent: "",
    readingType: "thermo",
    surface: "",
    notes: "",
    tech: "",
  });

  const save = () => {
    const temp = parseFloat(f.temp) || 0;
    const rh = parseFloat(f.rh) || 0;
    const gpp = f.gpp ? parseFloat(f.gpp) : calcGPP(temp, rh);
    const dewPoint = calcDewPoint(temp, rh);

    onSave({
      id: dduid(),
      mode,
      roomId: f.roomId,
      pointId: f.pointId || null,
      equipId: f.equipId || null,
      temp, rh, gpp, dewPoint,
      moistureContent: parseFloat(f.moistureContent) || null,
      readingType: f.readingType,
      surface: f.surface,
      notes: f.notes,
      tech: f.tech,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    });
    onClose();
  };

  const selectedRoom = rooms.find(r => r.id === f.roomId);
  const roomPoints = selectedRoom?.points || [];

  return (
    <div className="dd-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dd-modal">
        <div className="dd-modal-title">Log Reading</div>

        {/* Reading type selector */}
        <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
          {[["chamber", "Chamber"], ["point", "Moisture Point"], ["equipment", "Equipment"]].map(([k, l]) => (
            <button key={k} className={`btn btn-xs ${mode === k ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setMode(k)}>{l}</button>
          ))}
        </div>

        {/* Room selector */}
        <div style={{ marginBottom: 10 }}>
          <label className="lbl">Room / Chamber</label>
          <select className="sel" value={f.roomId} onChange={e => setF(p => ({ ...p, roomId: e.target.value }))}>
            <option value="">-- Select Room --</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>

        {mode === "point" && roomPoints.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <label className="lbl">Moisture Point</label>
            <select className="sel" value={f.pointId} onChange={e => setF(p => ({ ...p, pointId: e.target.value }))}>
              <option value="">-- Select Point --</option>
              {roomPoints.map(p => <option key={p.id} value={p.id}>{p.label || `Point ${p.id.slice(-4)}`}</option>)}
            </select>
          </div>
        )}

        {mode === "equipment" && (
          <div style={{ marginBottom: 10 }}>
            <label className="lbl">Equipment (Dehumidifier)</label>
            <select className="sel" value={f.equipId} onChange={e => setF(p => ({ ...p, equipId: e.target.value }))}>
              <option value="">-- Select Equipment --</option>
              {dehumidifiers.map(d => <option key={d.id} value={d.id}>{d.brand || d.label} ({d.serial || "N/A"})</option>)}
            </select>
          </div>
        )}

        {/* Psychrometric readings */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div>
            <label className="lbl">Temp (°F)</label>
            <input className="inp" type="number" value={f.temp}
              onChange={e => setF(p => ({ ...p, temp: e.target.value }))}
              placeholder="72" inputMode="decimal" />
          </div>
          <div>
            <label className="lbl">RH %</label>
            <input className="inp" type="number" value={f.rh}
              onChange={e => setF(p => ({ ...p, rh: e.target.value }))}
              placeholder="55" inputMode="decimal" />
          </div>
          <div>
            <label className="lbl">GPP (auto-calc)</label>
            <input className="inp" type="number" value={f.gpp || (f.temp && f.rh ? calcGPP(parseFloat(f.temp), parseFloat(f.rh)).toFixed(1) : "")}
              onChange={e => setF(p => ({ ...p, gpp: e.target.value }))}
              placeholder="Auto" inputMode="decimal" />
          </div>
        </div>

        {/* Moisture content (for point readings) */}
        {(mode === "point") && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div>
              <label className="lbl">Moisture Content (%MC or REL)</label>
              <input className="inp" type="number" value={f.moistureContent}
                onChange={e => setF(p => ({ ...p, moistureContent: e.target.value }))}
                placeholder="0" inputMode="decimal" />
            </div>
            <div>
              <label className="lbl">Meter Type</label>
              <select className="sel" value={f.readingType} onChange={e => setF(p => ({ ...p, readingType: e.target.value }))}>
                {READING_TYPES.map(rt => <option key={rt.id} value={rt.id}>{rt.label}</option>)}
              </select>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div>
            <label className="lbl">Surface / Material</label>
            <input className="inp" value={f.surface}
              onChange={e => setF(p => ({ ...p, surface: e.target.value }))}
              placeholder="e.g. Drywall, Baseboard, Subfloor" />
          </div>
          <div>
            <label className="lbl">Technician</label>
            <input className="inp" value={f.tech}
              onChange={e => setF(p => ({ ...p, tech: e.target.value }))}
              placeholder="Name" />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="lbl">Notes</label>
          <textarea className="txa" value={f.notes}
            onChange={e => setF(p => ({ ...p, notes: e.target.value }))}
            placeholder="Observations, equipment changes, etc." rows={2} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-xs" onClick={save}>{DDIc.check} Save Reading</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Moisture Tab ──
export default function DryDoxMoisture({
  rooms, dryingLogs, setDryingLogs, moisturePoints, setMoisturePoints,
  equipmentPlacements, dryingComplete, setDryingComplete,
}) {
  const [addModal, setAddModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  // Group readings by day
  const dayGroups = useMemo(() => {
    const groups = {};
    dryingLogs.forEach(log => {
      const day = log.date || fmtShort(log.timestamp);
      if (!groups[day]) groups[day] = { label: day, readings: [], dayNum: Object.keys(groups).length + 1 };
      groups[day].readings.push(log);
    });
    return Object.values(groups);
  }, [dryingLogs]);

  // Latest readings summary
  const latestByRoom = useMemo(() => {
    const map = {};
    dryingLogs.forEach(log => {
      if (log.roomId) {
        if (!map[log.roomId] || new Date(log.timestamp) > new Date(map[log.roomId].timestamp)) {
          map[log.roomId] = log;
        }
      }
    });
    return map;
  }, [dryingLogs]);

  // Trend data for charts
  const trendData = useMemo(() => {
    return dayGroups.map(dg => {
      const chamberReadings = dg.readings.filter(r => r.mode === "chamber" || !r.mode);
      const avgRH = chamberReadings.length > 0
        ? Math.round(chamberReadings.reduce((s, r) => s + (r.rh || 0), 0) / chamberReadings.length)
        : 0;
      const avgTemp = chamberReadings.length > 0
        ? Math.round(chamberReadings.reduce((s, r) => s + (r.temp || 0), 0) / chamberReadings.length)
        : 0;
      const avgGPP = chamberReadings.length > 0
        ? Math.round(chamberReadings.reduce((s, r) => s + (r.gpp || calcGPP(r.temp, r.rh) || 0), 0) / chamberReadings.length * 10) / 10
        : 0;
      return { label: `D${dg.dayNum}`, rh: avgRH, temp: avgTemp, gpp: avgGPP, date: dg.label, count: dg.readings.length };
    });
  }, [dayGroups]);

  // Dehumidifiers for equipment readings
  const dehumidifiers = equipmentPlacements.filter(e =>
    (e.type === "dehu" || e.type === "dehu-des") && !e.removedAt
  );

  // Overall status
  const latestAvgRH = trendData.length > 0 ? trendData[trendData.length - 1].rh : 0;
  const allDry = rooms.length > 0 && rooms.every(r => {
    const latest = latestByRoom[r.id];
    return latest && latest.rh <= DRY_STANDARD_RH;
  });

  const handleSaveReading = (reading) => {
    setDryingLogs(prev => [...prev, reading]);

    // If it's a point reading, update the point's readings array
    if (reading.pointId && reading.roomId) {
      setMoisturePoints(prev => prev.map(p =>
        p.id === reading.pointId
          ? { ...p, readings: [...(p.readings || []), { rh: reading.rh, value: reading.moistureContent, date: reading.date, timestamp: reading.timestamp }] }
          : p
      ));
    }
  };

  const markDryingComplete = () => {
    setDryingComplete({
      completedAt: new Date().toISOString(),
      completedBy: "", // Would be filled from auth context
      finalRH: latestAvgRH,
      totalDays: dayGroups.length,
    });
  };

  return (
    <div>
      {/* KPI row */}
      <div className="dd-kpi-row">
        {[
          ["Days Active", dayGroups.length, "var(--blue)"],
          ["Latest Avg RH", latestAvgRH ? `${latestAvgRH}%` : "—", rhColor(latestAvgRH)],
          ["Total Readings", dryingLogs.length, "var(--teal)"],
          ["Status", dryingComplete ? "COMPLETE" : allDry ? "DRY STANDARD" : latestAvgRH <= 65 ? "TRENDING" : "DRYING",
            dryingComplete ? "var(--green)" : allDry ? "var(--green)" : "var(--amber)"],
        ].map(([l, v, c]) => (
          <div key={l} className="dd-kpi">
            <div className="dd-kpi-val" style={{ color: c }}>{v}</div>
            <div className="dd-kpi-lbl">{l}</div>
          </div>
        ))}
      </div>

      {/* Latest psychrometric summary */}
      {trendData.length > 0 && (
        <PsychrometricCards reading={dryingLogs.filter(l => l.mode === "chamber" || !l.mode).slice(-1)[0]} />
      )}

      {/* Action buttons */}
      <div className="dd-sec-row">
        <div className="dd-sec">Drying Log</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-primary btn-xs" onClick={() => setAddModal(true)}>
            {DDIc.plus} New Reading
          </button>
          {allDry && !dryingComplete && (
            <button className="btn btn-xs" onClick={markDryingComplete}
              style={{ background: "rgba(26,217,138,.12)", border: "1px solid rgba(26,217,138,.25)", color: "var(--green)" }}>
              {DDIc.check} Mark Drying Complete
            </button>
          )}
        </div>
      </div>

      {/* Trend charts */}
      {trendData.length >= 2 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          <TrendChart data={trendData} dataKey="rh" color="#e43531" label="RH % Trend" threshold={DRY_STANDARD_RH} />
          <TrendChart data={trendData} dataKey="gpp" color="#22d3ee" label="GPP Trend" threshold={DRY_STANDARD_GPP} />
        </div>
      )}

      {trendData.length >= 2 && (
        <BarChart
          data={trendData}
          bars={[
            { key: "rh", color: "#e43531", label: "RH %" },
            { key: "temp", color: "#5ba3f5", label: "Temp °F" },
            { key: "gpp", color: "#22d3ee", label: "GPP" },
          ]}
          label="Daily Psychrometric Comparison"
        />
      )}

      {/* Per-room latest readings */}
      {rooms.length > 0 && (
        <>
          <div className="dd-sec" style={{ marginTop: 14 }}>Room Status</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8, marginBottom: 14 }}>
            {rooms.map(room => {
              const latest = latestByRoom[room.id];
              const mc = MATERIAL_CLASSES.find(c => c.id === room.materialClass);
              return (
                <div key={room.id} className="dd-card" style={{ padding: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "var(--t1)", marginBottom: 4 }}>{room.label}</div>
                  {latest ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span className="dd-chip" style={{ background: rhColor(latest.rh) + "18", color: rhColor(latest.rh) }}>
                        {latest.rh}% RH
                      </span>
                      {latest.temp > 0 && (
                        <span className="dd-chip" style={{ background: "var(--s3)", color: "var(--t2)" }}>{latest.temp}°F</span>
                      )}
                      {(latest.gpp || 0) > 0 && (
                        <span className="dd-chip" style={{ background: "rgba(34,211,238,.1)", color: "var(--teal)" }}>{latest.gpp} GPP</span>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: "var(--t3)" }}>No readings yet</div>
                  )}
                  {mc && <div style={{ fontSize: 9, color: mc.color, marginTop: 4 }}>{mc.label}: Dry Std ≤{mc.dryStd}%</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Day-by-day log */}
      {dayGroups.length === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 20px" }}>
          <div style={{ fontSize: 24, opacity: 0.15, marginBottom: 8 }}>{DDIc.drop}</div>
          <div style={{ fontSize: 12, color: "var(--t3)" }}>No readings yet. Add your first reading to start tracking.</div>
        </div>
      ) : (
        [...dayGroups].reverse().map(dg => (
          <div key={dg.label} className="dd-card" style={{ cursor: "pointer" }}
            onClick={() => setSelectedDay(selectedDay === dg.label ? null : dg.label)}>
            <div className="dd-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, background: "var(--acc-lo)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--acc)", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700,
                }}>D{dg.dayNum}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t1)" }}>Day {dg.dayNum} — {dg.label}</div>
                  <div style={{ fontSize: 10, color: "var(--t3)" }}>{dg.readings.length} reading{dg.readings.length !== 1 ? "s" : ""}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {(() => {
                  const chamberR = dg.readings.filter(r => r.mode === "chamber" || !r.mode);
                  if (chamberR.length === 0) return null;
                  const avgRH = Math.round(chamberR.reduce((s, r) => s + (r.rh || 0), 0) / chamberR.length);
                  const avgTemp = Math.round(chamberR.reduce((s, r) => s + (r.temp || 0), 0) / chamberR.length);
                  return (
                    <>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: rhColor(avgRH) }}>{avgRH}%</div>
                        <div className="lbl" style={{ margin: 0 }}>RH</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: "var(--t1)" }}>{avgTemp}°F</div>
                        <div className="lbl" style={{ margin: 0 }}>Temp</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Expanded day detail */}
            {selectedDay === dg.label && (
              <div style={{ marginTop: 10, borderTop: "1px solid var(--br)", paddingTop: 10 }}>
                {dg.readings.map(r => (
                  <div key={r.id} className="dd-reading-row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t1)" }}>
                        {r.mode === "equipment" ? "Equipment" : r.mode === "point" ? "Moisture Point" : "Chamber"}
                        {r.surface && ` — ${r.surface}`}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                        {r.rh > 0 && <span className="dd-chip" style={{ background: rhColor(r.rh) + "18", color: rhColor(r.rh) }}>{r.rh}% RH</span>}
                        {r.temp > 0 && <span className="dd-chip" style={{ background: "var(--s3)", color: "var(--t2)" }}>{r.temp}°F</span>}
                        {(r.gpp || 0) > 0 && <span className="dd-chip" style={{ background: "rgba(34,211,238,.1)", color: "var(--teal)" }}>{r.gpp} GPP</span>}
                        {r.moistureContent && <span className="dd-chip" style={{ background: "rgba(167,139,250,.1)", color: "var(--purple)" }}>{r.moistureContent} %MC</span>}
                      </div>
                      {r.notes && <div style={{ fontSize: 10, color: "var(--t2)", marginTop: 4 }}>{r.notes}</div>}
                    </div>
                    {r.tech && <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)" }}>{r.tech}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      {/* Drying complete banner */}
      {dryingComplete && (
        <div style={{
          background: "rgba(26,217,138,.08)", border: "1px solid rgba(26,217,138,.25)",
          borderRadius: 10, padding: 16, marginTop: 14, textAlign: "center",
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--green)", marginBottom: 4 }}>
            {DDIc.check} Drying Complete
          </div>
          <div style={{ fontSize: 11, color: "var(--t2)" }}>
            Completed {fmtDate(dryingComplete.completedAt)} · Final RH: {dryingComplete.finalRH}% · {dryingComplete.totalDays} days
          </div>
        </div>
      )}

      {/* Add Reading Modal */}
      {addModal && (
        <AddReadingModal
          rooms={rooms}
          dehumidifiers={dehumidifiers}
          onSave={handleSaveReading}
          onClose={() => setAddModal(false)}
        />
      )}
    </div>
  );
}

export { TrendChart, BarChart, PsychrometricCards, AddReadingModal };
