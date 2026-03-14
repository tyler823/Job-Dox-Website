/* ══════════════════════════════════════════════════════════════════
   DRYDOX FLOOR PLAN — LiDAR Scanning & Interactive Floor Plan
   - Uses WebXR / ARKit LiDAR when available on device
   - Falls back to manual room entry with measurements
   - Interactive canvas for marking wet areas, placing equipment
   - Supports multiple floors, rooms, suites
══════════════════════════════════════════════════════════════════ */
import { useState, useRef, useEffect, useCallback } from "react";
import { dduid, DDIc, MATERIAL_CLASSES, WATER_CATEGORIES } from "./DryDoxConstants.jsx";
import { JobDoxLiDAR } from "../plugins/jobdox-lidar.js";

// ── LiDAR Hook ──
// Uses Capacitor native plugin (RoomPlan) on iOS, falls back gracefully on web
function useLiDAR() {
  const [supported, setSupported] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanResult, setScanResult] = useState(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    JobDoxLiDAR.checkSupport().then(result => {
      setSupported(result.supported);
      setReason(result.reason || "");
    });
  }, []);

  const startScan = useCallback(async () => {
    setScanning(true);
    setProgress(0);

    // Show indeterminate progress while RoomPlan UI is open
    const iv = setInterval(() => {
      setProgress(p => p >= 90 ? 90 : p + Math.random() * 5 + 1);
    }, 300);

    try {
      const { rooms: scannedRooms } = await JobDoxLiDAR.scanRoom();

      clearInterval(iv);
      setProgress(100);
      setScanning(false);

      // Normalize results — add IDs, points, equipment arrays, etc.
      const normalized = (scannedRooms || []).map((r, i) => ({
        id: dduid(),
        label: r.label || `Room ${i + 1}`,
        widthFt: r.widthFt || 12,
        depthFt: r.depthFt || 10,
        ceilingFt: r.ceilingFt || 8,
        floor: 1,
        category: "cat1",
        materialClass: "class2",
        sqft: Math.round((r.widthFt || 12) * (r.depthFt || 10)),
        walls: (r.walls || []).map(w => ({
          id: dduid(),
          label: w.label || "Wall",
          lengthFt: w.lengthFt || 10,
        })),
        points: [],
        equipment: [],
      }));

      setScanResult(normalized);
    } catch (err) {
      clearInterval(iv);
      setScanning(false);
      setProgress(0);
      console.warn("LiDAR scan failed or cancelled:", err?.message || err);
      // Return empty so the UI stays on the prompt screen
      setScanResult(null);
    }
  }, []);

  const stopScan = useCallback(() => {
    // Native RoomPlan has its own cancel — this is a no-op safety valve
    setScanning(false);
    setProgress(0);
  }, []);

  return { supported, scanning, progress, scanResult, startScan, stopScan, setScanResult, reason };
}

// ── Room Scan File Parser ──
// Supports: JSON (RoomPlan / generic), CSV (name,width,depth,ceiling)
function parseRoomScanFile(text, fileName) {
  const ext = (fileName || "").split(".").pop().toLowerCase();

  // ── JSON parsing ──
  if (ext === "json" || text.trim().startsWith("{") || text.trim().startsWith("[")) {
    try {
      const data = JSON.parse(text);
      return parseRoomJSON(data);
    } catch (e) {
      throw new Error("Invalid JSON file: " + e.message);
    }
  }

  // ── CSV parsing ──
  if (ext === "csv" || text.includes(",")) {
    return parseRoomCSV(text);
  }

  throw new Error("Unsupported file format. Use JSON or CSV.");
}

function parseRoomJSON(data) {
  // Handle Apple RoomPlan / RoomBuilder JSON export
  // Shape: { rooms: [...] } or { capturedRooms: [...] } or direct array
  let roomsArr = [];

  if (Array.isArray(data)) {
    roomsArr = data;
  } else if (data.rooms && Array.isArray(data.rooms)) {
    roomsArr = data.rooms;
  } else if (data.capturedRooms && Array.isArray(data.capturedRooms)) {
    roomsArr = data.capturedRooms;
  } else if (data.results && Array.isArray(data.results)) {
    // Some scanning apps export as { results: [...] }
    roomsArr = data.results;
  } else if (data.width || data.widthFt || data.dimensions) {
    // Single room object
    roomsArr = [data];
  } else {
    throw new Error("Could not find room data in JSON. Expected an array of rooms or an object with a 'rooms' key.");
  }

  return roomsArr.map((r, i) => {
    // Handle various dimension formats
    let widthFt, depthFt, ceilingFt;

    if (r.dimensions) {
      // RoomPlan format: dimensions in meters { x, y, z }
      const d = r.dimensions;
      widthFt = round1(toFeet(d.x || d.width || 0));
      depthFt = round1(toFeet(d.z || d.depth || d.y || 0));
      ceilingFt = round1(toFeet(d.y || d.height || 2.4));
    } else {
      // Direct feet values
      widthFt = r.widthFt || r.width_ft || r.width || 12;
      depthFt = r.depthFt || r.depth_ft || r.depth || r.length || 10;
      ceilingFt = r.ceilingFt || r.ceiling_ft || r.ceilingHeight || r.ceiling || 8;

      // If values look like meters (all < 15), convert
      if (widthFt < 15 && depthFt < 15) {
        widthFt = round1(toFeet(widthFt));
        depthFt = round1(toFeet(depthFt));
        if (ceilingFt < 5) ceilingFt = round1(toFeet(ceilingFt));
      }
    }

    // Build walls
    let walls;
    if (r.walls && Array.isArray(r.walls)) {
      walls = r.walls.map(w => ({
        id: dduid(),
        label: w.label || w.name || "Wall",
        lengthFt: w.lengthFt || w.length_ft || (w.length ? round1(toFeet(w.length)) : 10),
      }));
    } else {
      walls = [
        { id: dduid(), label: "North Wall", lengthFt: widthFt },
        { id: dduid(), label: "East Wall",  lengthFt: depthFt },
        { id: dduid(), label: "South Wall", lengthFt: widthFt },
        { id: dduid(), label: "West Wall",  lengthFt: depthFt },
      ];
    }

    return {
      id: dduid(),
      label: r.label || r.name || r.roomName || `Scanned Room ${i + 1}`,
      widthFt, depthFt, ceilingFt,
      floor: r.floor || 1,
      suite: r.suite || "",
      category: r.category || "cat1",
      materialClass: r.materialClass || "class2",
      sqft: Math.round(widthFt * depthFt),
      walls,
      points: [],
      equipment: [],
    };
  });
}

function parseRoomCSV(text) {
  const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");

  // Parse header
  const header = lines[0].toLowerCase().split(",").map(h => h.trim());
  const nameIdx = header.findIndex(h => /name|label|room/.test(h));
  const widthIdx = header.findIndex(h => /width/.test(h));
  const depthIdx = header.findIndex(h => /depth|length/.test(h));
  const ceilingIdx = header.findIndex(h => /ceiling|height/.test(h));

  if (widthIdx === -1 || depthIdx === -1) {
    throw new Error("CSV must have 'width' and 'depth' (or 'length') columns.");
  }

  const rooms = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim());
    const label = nameIdx >= 0 ? cols[nameIdx] : `Room ${i}`;
    const widthFt = parseFloat(cols[widthIdx]) || 12;
    const depthFt = parseFloat(cols[depthIdx]) || 10;
    const ceilingFt = ceilingIdx >= 0 ? (parseFloat(cols[ceilingIdx]) || 8) : 8;

    rooms.push({
      id: dduid(),
      label: label || `Room ${i}`,
      widthFt, depthFt, ceilingFt,
      floor: 1,
      suite: "",
      category: "cat1",
      materialClass: "class2",
      sqft: Math.round(widthFt * depthFt),
      walls: [
        { id: dduid(), label: "North Wall", lengthFt: widthFt },
        { id: dduid(), label: "East Wall",  lengthFt: depthFt },
        { id: dduid(), label: "South Wall", lengthFt: widthFt },
        { id: dduid(), label: "West Wall",  lengthFt: depthFt },
      ],
      points: [],
      equipment: [],
    });
  }

  if (rooms.length === 0) throw new Error("No room data found in CSV.");
  return rooms;
}

function toFeet(meters) { return meters * 3.28084; }
function round1(n) { return Math.round(n * 10) / 10; }

// ── Import Scan Modal ──
function ImportScanModal({ onImport, onClose }) {
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPreview(null);

    try {
      const text = await file.text();
      const rooms = parseRoomScanFile(text, file.name);
      if (!rooms.length) throw new Error("No rooms found in file.");
      setPreview(rooms);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="dd-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dd-modal" style={{ maxWidth: 420 }}>
        <div className="dd-modal-title">Import Room Scan</div>

        <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.6, marginBottom: 14 }}>
          Import room measurements from a scanning app. Supported formats:
        </div>

        <div style={{ display: "grid", gap: 6, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "var(--t2)", padding: "8px 12px", background: "var(--s2)", borderRadius: 8 }}>
            <strong style={{ color: "var(--t1)" }}>JSON</strong> — Export from RoomPlan-compatible apps (3d Scanner App, Polycam, Canvas, magicplan)
          </div>
          <div style={{ fontSize: 11, color: "var(--t2)", padding: "8px 12px", background: "var(--s2)", borderRadius: 8 }}>
            <strong style={{ color: "var(--t1)" }}>CSV</strong> — Spreadsheet with columns: name, width, depth, ceiling
          </div>
        </div>

        <div style={{
          border: "2px dashed var(--br)", borderRadius: 10, padding: "24px 16px",
          textAlign: "center", cursor: "pointer", marginBottom: 14,
          background: "var(--s2)", transition: "border-color .15s",
        }} onClick={() => fileRef.current?.click()}>
          <div style={{ marginBottom: 6 }}>{DDIc.upload}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>
            Tap to select file
          </div>
          <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 4 }}>.json or .csv</div>
          <input ref={fileRef} type="file" accept=".json,.csv,.txt"
            style={{ display: "none" }} onChange={handleFile} />
        </div>

        {error && (
          <div style={{
            fontSize: 11, color: "var(--acc)", background: "rgba(228,53,49,.08)",
            padding: "8px 12px", borderRadius: 6, marginBottom: 12,
          }}>
            {error}
          </div>
        )}

        {preview && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t1)", marginBottom: 6 }}>
              {preview.length} room{preview.length !== 1 ? "s" : ""} found:
            </div>
            <div style={{ maxHeight: 180, overflowY: "auto" }}>
              {preview.map((r, i) => (
                <div key={i} style={{
                  fontSize: 11, padding: "6px 10px", background: "var(--s2)",
                  borderRadius: 6, marginBottom: 4, display: "flex",
                  justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontWeight: 600, color: "var(--t1)" }}>{r.label}</span>
                  <span style={{ color: "var(--t3)", fontFamily: "var(--mono)", fontSize: 10 }}>
                    {r.widthFt}' x {r.depthFt}' x {r.ceilingFt}' · {r.sqft} SF
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-xs"
            disabled={!preview} style={{ opacity: preview ? 1 : 0.4 }}
            onClick={() => { if (preview) { onImport(preview); onClose(); } }}>
            Import {preview ? `${preview.length} Room${preview.length !== 1 ? "s" : ""}` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Floor Plan Canvas Renderer ──
function FloorPlanCanvas({
  rooms, floors, activeFloor, activeRoom, moisturePoints, equipmentPlacements,
  onSelectRoom, onAddPoint, onMoveEquipment, tool, showGrid, onRoomClick
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(null);
  const SCALE = 12; // pixels per foot

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const wrap = wrapRef.current;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight || 400;
    canvas.width = w * 2; canvas.height = h * 2;
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(pan.x + w/2, pan.y + h/2);
    ctx.scale(zoom, zoom);

    // Filter rooms for active floor
    const floorRooms = rooms.filter(r => (r.floor || 1) === activeFloor);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,.04)";
      ctx.lineWidth = 0.5;
      for (let x = -500; x < 500; x += SCALE) {
        ctx.beginPath(); ctx.moveTo(x, -500); ctx.lineTo(x, 500); ctx.stroke();
      }
      for (let y = -500; y < 500; y += SCALE) {
        ctx.beginPath(); ctx.moveTo(-500, y); ctx.lineTo(500, y); ctx.stroke();
      }
    }

    // Layout rooms in a grid
    let ox = -((floorRooms.length - 1) * 100) / 2;
    floorRooms.forEach((room, i) => {
      const rx = (room._x ?? ox + i * (room.widthFt * SCALE + 20));
      const ry = (room._y ?? 0) - (room.depthFt * SCALE) / 2;
      const rw = room.widthFt * SCALE;
      const rh = room.depthFt * SCALE;

      // Room fill
      const isActive = activeRoom === room.id;
      ctx.fillStyle = isActive ? "rgba(228,53,49,.08)" : "rgba(255,255,255,.03)";
      ctx.fillRect(rx, ry, rw, rh);

      // Room walls
      ctx.strokeStyle = isActive ? "#e43531" : "rgba(255,255,255,.25)";
      ctx.lineWidth = isActive ? 2.5 : 1.5;
      ctx.strokeRect(rx, ry, rw, rh);

      // Room label
      ctx.fillStyle = isActive ? "#e43531" : "#8b95b0";
      ctx.font = "bold 10px 'Outfit', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(room.label, rx + rw/2, ry + 14);

      // Dimensions
      ctx.fillStyle = "rgba(139,149,176,.5)";
      ctx.font = "9px 'Space Mono', monospace";
      ctx.fillText(`${room.widthFt}' × ${room.depthFt}'`, rx + rw/2, ry + rh - 6);

      // Wall length labels on each side
      ctx.fillStyle = "rgba(139,149,176,.35)";
      ctx.font = "8px 'Space Mono', monospace";
      // Top
      ctx.textAlign = "center";
      ctx.fillText(`${room.widthFt}'`, rx + rw/2, ry - 4);
      // Left
      ctx.save();
      ctx.translate(rx - 4, ry + rh/2);
      ctx.rotate(-Math.PI/2);
      ctx.fillText(`${room.depthFt}'`, 0, 0);
      ctx.restore();

      // Ceiling height indicator
      if (room.ceilingFt) {
        ctx.fillStyle = "rgba(139,149,176,.3)";
        ctx.font = "7px 'Space Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillText(`↕${room.ceilingFt}'`, rx + rw - 4, ry + 14);
      }

      // Moisture reading points in this room
      const roomPoints = moisturePoints.filter(p => p.roomId === room.id);
      roomPoints.forEach(pt => {
        const px = rx + (pt.x / 100) * rw;
        const py = ry + (pt.y / 100) * rh;
        const latest = pt.readings?.[pt.readings.length - 1];
        const rh_ = latest?.rh ?? 999;
        const color = rh_ <= 55 ? "#1ad98a" : rh_ <= 65 ? "#e89c18" : "#e43531";

        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = color + "33";
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Reading value
        if (latest) {
          ctx.fillStyle = color;
          ctx.font = "bold 7px 'Space Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText(latest.value || `${rh_}%`, px, py + 3);
        }
      });

      // Equipment placements in this room
      const roomEquip = equipmentPlacements.filter(e => e.roomId === room.id && !e.removedAt);
      roomEquip.forEach(eq => {
        const ex = rx + (eq.x / 100) * rw;
        const ey = ry + (eq.y / 100) * rh;

        ctx.fillStyle = "rgba(91,163,245,.15)";
        ctx.strokeStyle = "var(--blue)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect?.(ex - 10, ey - 10, 20, 20, 4) ?? ctx.rect(ex-10,ey-10,20,20);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(eq.icon || "🔧", ex, ey + 4);
      });
    });

    ctx.restore();
  }, [rooms, activeFloor, activeRoom, moisturePoints, equipmentPlacements, pan, zoom, showGrid, SCALE]);

  // Handle canvas interactions
  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * 2;
    const y = (e.clientY - rect.top) * 2;

    // Convert to world coordinates
    const w = rect.width;
    const h = rect.height;
    const wx = (x/2 - pan.x - w/2) / zoom;
    const wy = (y/2 - pan.y - h/2) / zoom;

    const floorRooms = rooms.filter(r => (r.floor || 1) === activeFloor);
    let ox = -((floorRooms.length - 1) * 100) / 2;

    // Check which room was clicked
    floorRooms.forEach((room, i) => {
      const rx = (room._x ?? ox + i * (room.widthFt * SCALE + 20));
      const ry = (room._y ?? 0) - (room.depthFt * SCALE) / 2;
      const rw = room.widthFt * SCALE;
      const rh_ = room.depthFt * SCALE;

      if (wx >= rx && wx <= rx + rw && wy >= ry && wy <= ry + rh_) {
        if (tool === "point" && onAddPoint) {
          // Add moisture reading point at click location within room
          const relX = ((wx - rx) / rw) * 100;
          const relY = ((wy - ry) / rh_) * 100;
          onAddPoint(room.id, relX, relY);
        } else if (onRoomClick) {
          onRoomClick(room.id);
        }
      }
    });
  }, [rooms, activeFloor, pan, zoom, tool, onAddPoint, onRoomClick, SCALE]);

  // Touch / pointer events for pan & zoom
  const pointerRef = useRef({ down: false, x: 0, y: 0 });
  const onPointerDown = e => { pointerRef.current = { down: true, x: e.clientX, y: e.clientY }; };
  const onPointerMove = e => {
    if (!pointerRef.current.down || tool !== "pan") return;
    const dx = e.clientX - pointerRef.current.x;
    const dy = e.clientY - pointerRef.current.y;
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    pointerRef.current.x = e.clientX;
    pointerRef.current.y = e.clientY;
  };
  const onPointerUp = () => { pointerRef.current.down = false; };
  const onWheel = e => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(3, z + (e.deltaY > 0 ? -0.1 : 0.1))));
  };

  return (
    <div ref={wrapRef} className="dd-canvas-wrap" style={{ height: 400 }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      onWheel={onWheel}>
      <canvas ref={canvasRef} onClick={handleCanvasClick} />
    </div>
  );
}

// ── LiDAR Scan Prompt ──
function LiDARScanPrompt({ lidar, onManualAdd, onImportScan }) {
  if (lidar.scanning) {
    return (
      <div className="dd-lidar-prompt">
        <div className="dd-lidar-icon" style={{ animation: "jd-ping 1.5s ease infinite" }}>
          {DDIc.lidar}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)" }}>Scanning Structure...</div>
        <div style={{ fontSize: 11, color: "var(--t2)", maxWidth: 280, lineHeight: 1.5 }}>
          Move your device slowly around the room. Point at walls, floor, and ceiling for best results.
        </div>
        <div className="dd-scan-progress">
          <div className="dd-scan-progress-bar" style={{ width: `${lidar.progress}%` }} />
        </div>
        <div style={{ fontSize: 10, color: "var(--t3)", fontFamily: "var(--mono)" }}>{lidar.progress}%</div>
        <button className="btn btn-ghost btn-xs" onClick={lidar.stopScan}>Stop Scan</button>
      </div>
    );
  }

  return (
    <div className="dd-lidar-prompt">
      <div className="dd-lidar-icon">{DDIc.lidar}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)" }}>Create Floor Plan</div>
      <div style={{ fontSize: 12, color: "var(--t2)", maxWidth: 300, lineHeight: 1.5 }}>
        {lidar.supported
          ? "Use your device's LiDAR sensor to automatically scan and measure the structure, or add rooms manually."
          : "Add rooms manually with measurements. For automatic LiDAR scanning, use the Job-Dox Field iOS app on an iPhone 12 Pro or newer."}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {lidar.supported && (
          <button className="btn btn-primary" onClick={lidar.startScan}>
            {DDIc.lidar} LiDAR Scan
          </button>
        )}
        <button className="btn btn-secondary" onClick={onImportScan}>
          {DDIc.upload} Import Room Scan
        </button>
        <button className="btn btn-ghost" onClick={onManualAdd}>
          {DDIc.plus} Add Rooms Manually
        </button>
      </div>
    </div>
  );
}

// ── Add Room Modal ──
function AddRoomModal({ onAdd, onClose, floors }) {
  const [f, setF] = useState({
    label: "", widthFt: "12", depthFt: "10", ceilingFt: "8",
    floor: 1, category: "cat1", materialClass: "class2",
    suite: "",
  });

  const save = () => {
    if (!f.label.trim()) return;
    onAdd({
      id: dduid(),
      label: f.label.trim(),
      widthFt: parseFloat(f.widthFt) || 12,
      depthFt: parseFloat(f.depthFt) || 10,
      ceilingFt: parseFloat(f.ceilingFt) || 8,
      floor: parseInt(f.floor) || 1,
      suite: f.suite.trim(),
      category: f.category,
      materialClass: f.materialClass,
      walls: [
        { id: dduid(), label: "North Wall", lengthFt: parseFloat(f.widthFt) || 12 },
        { id: dduid(), label: "East Wall",  lengthFt: parseFloat(f.depthFt) || 10 },
        { id: dduid(), label: "South Wall", lengthFt: parseFloat(f.widthFt) || 12 },
        { id: dduid(), label: "West Wall",  lengthFt: parseFloat(f.depthFt) || 10 },
      ],
      points: [],
      equipment: [],
      sqft: Math.round((parseFloat(f.widthFt)||12) * (parseFloat(f.depthFt)||10)),
    });
    onClose();
  };

  return (
    <div className="dd-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dd-modal">
        <div className="dd-modal-title">Add Room / Area</div>

        <div style={{ marginBottom: 12 }}>
          <label className="lbl">Room Name *</label>
          <input className="inp" value={f.label} onChange={e => setF(p => ({ ...p, label: e.target.value }))}
            placeholder="e.g. Living Room, Suite 101, Hallway" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div>
            <label className="lbl">Width (ft)</label>
            <input className="inp" type="number" value={f.widthFt}
              onChange={e => setF(p => ({ ...p, widthFt: e.target.value }))}
              placeholder="12" inputMode="decimal" />
          </div>
          <div>
            <label className="lbl">Depth (ft)</label>
            <input className="inp" type="number" value={f.depthFt}
              onChange={e => setF(p => ({ ...p, depthFt: e.target.value }))}
              placeholder="10" inputMode="decimal" />
          </div>
          <div>
            <label className="lbl">Ceiling Height (ft)</label>
            <input className="inp" type="number" value={f.ceilingFt}
              onChange={e => setF(p => ({ ...p, ceilingFt: e.target.value }))}
              placeholder="8" inputMode="decimal" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div>
            <label className="lbl">Floor</label>
            <select className="sel" value={f.floor} onChange={e => setF(p => ({ ...p, floor: parseInt(e.target.value) }))}>
              {floors.map(fl => <option key={fl} value={fl}>Floor {fl}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl">Suite / Unit (optional)</label>
            <input className="inp" value={f.suite} onChange={e => setF(p => ({ ...p, suite: e.target.value }))}
              placeholder="e.g. Suite 200" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          <div>
            <label className="lbl">Water Category</label>
            <select className="sel" value={f.category} onChange={e => setF(p => ({ ...p, category: e.target.value }))}>
              {WATER_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl">Material Class</label>
            <select className="sel" value={f.materialClass} onChange={e => setF(p => ({ ...p, materialClass: e.target.value }))}>
              {MATERIAL_CLASSES.map(c => <option key={c.id} value={c.id}>{c.label} — {c.desc}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-xs" onClick={save}>Add Room</button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Room Modal (for wall lengths, ceiling) ──
function EditRoomModal({ room, onSave, onClose }) {
  const [f, setF] = useState({ ...room });

  const updateWall = (wallId, key, val) => {
    setF(p => ({
      ...p,
      walls: (p.walls||[]).map(w => w.id === wallId ? { ...w, [key]: val } : w),
    }));
  };

  return (
    <div className="dd-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dd-modal">
        <div className="dd-modal-title">Edit: {room.label}</div>

        <div style={{ marginBottom: 12 }}>
          <label className="lbl">Room Name</label>
          <input className="inp" value={f.label} onChange={e => setF(p => ({ ...p, label: e.target.value }))} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div>
            <label className="lbl">Width (ft)</label>
            <input className="inp" type="number" value={f.widthFt}
              onChange={e => setF(p => ({ ...p, widthFt: parseFloat(e.target.value) || 0 }))} inputMode="decimal" />
          </div>
          <div>
            <label className="lbl">Depth (ft)</label>
            <input className="inp" type="number" value={f.depthFt}
              onChange={e => setF(p => ({ ...p, depthFt: parseFloat(e.target.value) || 0 }))} inputMode="decimal" />
          </div>
          <div>
            <label className="lbl">Ceiling (ft)</label>
            <input className="inp" type="number" value={f.ceilingFt}
              onChange={e => setF(p => ({ ...p, ceilingFt: parseFloat(e.target.value) || 0 }))} inputMode="decimal" />
          </div>
        </div>

        <div className="dd-sec" style={{ marginTop: 12 }}>Individual Wall Lengths</div>
        {(f.walls || []).map(wall => (
          <div key={wall.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <input className="inp" value={wall.label} style={{ flex: 1 }}
              onChange={e => updateWall(wall.id, "label", e.target.value)} />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input className="inp" type="number" value={wall.lengthFt} style={{ width: 70 }}
                onChange={e => updateWall(wall.id, "lengthFt", parseFloat(e.target.value) || 0)} inputMode="decimal" />
              <span style={{ fontSize: 10, color: "var(--t3)" }}>ft</span>
            </div>
          </div>
        ))}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, marginBottom: 14 }}>
          <div>
            <label className="lbl">Water Category</label>
            <select className="sel" value={f.category||"cat1"} onChange={e => setF(p => ({ ...p, category: e.target.value }))}>
              {WATER_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl">Material Class</label>
            <select className="sel" value={f.materialClass||"class2"} onChange={e => setF(p => ({ ...p, materialClass: e.target.value }))}>
              {MATERIAL_CLASSES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-xs" onClick={() => { onSave({ ...f, sqft: Math.round(f.widthFt * f.depthFt) }); onClose(); }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Floor Plan Tab ──
export default function DryDoxFloorPlan({
  rooms, setRooms, floors, setFloors, activeFloor, setActiveFloor,
  moisturePoints, equipmentPlacements, onAddPoint, onMoveEquipment,
  activeRoom, setActiveRoom, onEditRoom,
}) {
  const lidar = useLiDAR();
  const [tool, setTool] = useState("select"); // select, pan, point, equip
  const [showGrid, setShowGrid] = useState(true);
  const [addRoomModal, setAddRoomModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const hasRooms = rooms.length > 0;

  const handleImportRooms = (importedRooms) => {
    setRooms(prev => [...prev, ...importedRooms]);
  };

  // After LiDAR scan completes, merge results
  useEffect(() => {
    if (lidar.scanResult && lidar.scanResult.length > 0) {
      setRooms(prev => [...prev, ...lidar.scanResult]);
    }
  }, [lidar.scanResult, setRooms]);

  const addFloor = () => {
    const next = Math.max(...floors, 0) + 1;
    setFloors(prev => [...prev, next]);
    setActiveFloor(next);
  };

  const handleRoomClick = (roomId) => {
    setActiveRoom(roomId);
    if (tool === "select") {
      setEditRoom(rooms.find(r => r.id === roomId));
    }
  };

  const handleSaveRoom = (updated) => {
    setRooms(prev => prev.map(r => r.id === updated.id ? updated : r));
    setEditRoom(null);
  };

  const deleteRoom = (roomId) => {
    setRooms(prev => prev.filter(r => r.id !== roomId));
    if (activeRoom === roomId) setActiveRoom(null);
  };

  return (
    <div>
      {!hasRooms && !lidar.scanning ? (
        <LiDARScanPrompt lidar={lidar} onManualAdd={() => setAddRoomModal(true)} onImportScan={() => setImportModal(true)} />
      ) : (
        <>
          {/* Floor selector */}
          {floors.length > 1 && (
            <div style={{ display: "flex", gap: 4, marginBottom: 10, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "var(--t3)", fontFamily: "var(--mono)", marginRight: 6 }}>FLOOR:</span>
              {floors.map(fl => (
                <button key={fl} className={`btn btn-xs ${activeFloor === fl ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setActiveFloor(fl)}>
                  {fl}
                </button>
              ))}
              <button className="btn btn-xs btn-ghost" onClick={addFloor}>{DDIc.plus}</button>
            </div>
          )}

          {/* Interactive floor plan */}
          <FloorPlanCanvas
            rooms={rooms} floors={floors} activeFloor={activeFloor}
            activeRoom={activeRoom} moisturePoints={moisturePoints}
            equipmentPlacements={equipmentPlacements}
            onSelectRoom={setActiveRoom} onAddPoint={onAddPoint}
            onMoveEquipment={onMoveEquipment} tool={tool} showGrid={showGrid}
            onRoomClick={handleRoomClick}
          />

          {/* Canvas toolbar */}
          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
            {[
              ["select", "Select", DDIc.pin],
              ["pan",    "Pan",    DDIc.move],
              ["point",  "Add Moisture Point", DDIc.drop],
            ].map(([k, l, ic]) => (
              <button key={k} className={`dd-canvas-btn${tool === k ? " active" : ""}`}
                onClick={() => setTool(k)}>
                {ic} {l}
              </button>
            ))}
            <button className={`dd-canvas-btn${showGrid ? " active" : ""}`} onClick={() => setShowGrid(g => !g)}>
              Grid
            </button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-primary btn-xs" onClick={() => setAddRoomModal(true)}>
              {DDIc.plus} Add Room
            </button>
            {floors.length <= 1 && (
              <button className="btn btn-ghost btn-xs" onClick={addFloor}>
                {DDIc.layers} Add Floor
              </button>
            )}
            <button className="btn btn-ghost btn-xs" onClick={() => setImportModal(true)}>
              {DDIc.upload} Import
            </button>
            {lidar.supported && (
              <button className="btn btn-ghost btn-xs" onClick={lidar.startScan}>
                {DDIc.lidar} Re-scan
              </button>
            )}
          </div>

          {/* Room list below canvas */}
          <div className="dd-sec-row" style={{ marginTop: 16 }}>
            <div className="dd-sec">Rooms — Floor {activeFloor}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 8 }}>
            {rooms.filter(r => (r.floor || 1) === activeFloor).map(room => {
              const mc = MATERIAL_CLASSES.find(c => c.id === room.materialClass);
              const wc = WATER_CATEGORIES.find(c => c.id === room.category);
              const roomPts = moisturePoints.filter(p => p.roomId === room.id);
              const roomEq = equipmentPlacements.filter(e => e.roomId === room.id && !e.removedAt);
              const latestRH = roomPts.length > 0
                ? Math.max(...roomPts.map(p => p.readings?.[p.readings.length-1]?.rh ?? 0))
                : null;

              return (
                <div key={room.id} className="dd-card"
                  style={{ cursor: "pointer", borderLeft: `3px solid ${activeRoom === room.id ? "var(--acc)" : "transparent"}` }}
                  onClick={() => { setActiveRoom(room.id); setEditRoom(room); }}>
                  <div className="dd-card-header">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t1)" }}>{room.label}</div>
                      <div style={{ fontSize: 10, color: "var(--t3)", fontFamily: "var(--mono)", marginTop: 1 }}>
                        {room.widthFt}' × {room.depthFt}' × {room.ceilingFt || 8}' · {room.sqft || Math.round(room.widthFt * room.depthFt)} SF
                        {room.suite && ` · ${room.suite}`}
                      </div>
                    </div>
                    <button className="btn btn-danger btn-xs" style={{ padding: "2px 5px" }}
                      onClick={e => { e.stopPropagation(); deleteRoom(room.id); }}>
                      {DDIc.trash}
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {wc && <span className="dd-chip" style={{ background: wc.color + "18", color: wc.color }}>{wc.label}</span>}
                    {mc && <span className="dd-chip" style={{ background: mc.color + "18", color: mc.color }}>{mc.label}</span>}
                    {latestRH !== null && (
                      <span className="dd-chip" style={{
                        background: (latestRH <= 55 ? "var(--green)" : latestRH <= 65 ? "var(--amber)" : "var(--acc)") + "18",
                        color: latestRH <= 55 ? "var(--green)" : latestRH <= 65 ? "var(--amber)" : "var(--acc)",
                      }}>
                        {latestRH <= 55 ? "DRY" : latestRH <= 65 ? "TRENDING" : "WET"} {latestRH}%
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <div style={{ fontSize: 10, color: "var(--t3)" }}>
                      <span style={{ color: "var(--blue)", fontWeight: 700 }}>{roomPts.length}</span> points
                    </div>
                    <div style={{ fontSize: 10, color: "var(--t3)" }}>
                      <span style={{ color: "var(--green)", fontWeight: 700 }}>{roomEq.length}</span> equipment
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modals */}
      {addRoomModal && (
        <AddRoomModal
          floors={floors}
          onAdd={room => setRooms(prev => [...prev, room])}
          onClose={() => setAddRoomModal(false)}
        />
      )}
      {editRoom && (
        <EditRoomModal
          room={editRoom}
          onSave={handleSaveRoom}
          onClose={() => setEditRoom(null)}
        />
      )}
      {importModal && (
        <ImportScanModal
          onImport={handleImportRooms}
          onClose={() => setImportModal(false)}
        />
      )}
    </div>
  );
}

export { FloorPlanCanvas, LiDARScanPrompt, AddRoomModal, EditRoomModal, ImportScanModal, useLiDAR };
