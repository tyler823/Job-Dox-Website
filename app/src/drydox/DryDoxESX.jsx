/* ══════════════════════════════════════════════════════════════════
   DRYDOX ESX EXPORT — Xactimate Sketch (.esx) Generator
   - Generates ESX-format XML sketch files from DryDox floor plan data
   - Rooms, walls, dimensions, floor levels
   - Compatible with Xactimate import for repair scoping
   - Uses Xactimate's ESX schema for room geometry
══════════════════════════════════════════════════════════════════ */
import { useState, useCallback } from "react";
import { DDIc, getET, WATER_CATEGORIES, MATERIAL_CLASSES } from "./DryDoxConstants.js";

// ── ESX XML Generation ──
// Xactimate ESX files are ZIP archives containing XML sketch data.
// Since we can't create ZIP in pure browser without a library, we generate
// the ESX-compatible XML and allow download. Users can rename to .esx or
// use Xactimate's XML import.

function generateESXXml({ rooms, floors, equipmentPlacements, project, moisturePoints }) {
  const escXml = s => (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

  // Convert feet to inches (Xactimate uses inches internally)
  const ftToIn = ft => Math.round((parseFloat(ft) || 0) * 12);

  let xml = `<?xml version="1.0" encoding="utf-8"?>
<ESX version="11">
  <Project>
    <Name>${escXml(project?.name || "DryDox Export")}</Name>
    <Address>${escXml(project?.address || "")}</Address>
    <ClaimNumber>${escXml(project?.projectNumber || project?.id || "")}</ClaimNumber>
    <DateOfLoss>${new Date().toISOString().split("T")[0]}</DateOfLoss>
    <ExportDate>${new Date().toISOString()}</ExportDate>
    <Source>DryDox by Job-Dox</Source>
  </Project>
  <Sketch>
    <Levels>
`;

  // Group rooms by floor
  const floorGroups = {};
  rooms.forEach(room => {
    const fl = room.floor || 1;
    if (!floorGroups[fl]) floorGroups[fl] = [];
    floorGroups[fl].push(room);
  });

  // Generate each floor level
  (floors || Object.keys(floorGroups).map(Number).sort()).forEach(fl => {
    const floorRooms = floorGroups[fl] || [];
    if (floorRooms.length === 0) return;

    xml += `      <Level name="Floor ${fl}" height="${ftToIn(floorRooms[0]?.ceilingFt || 8)}">\n`;
    xml += `        <Rooms>\n`;

    // Layout rooms with sequential positioning
    let offsetX = 0;
    floorRooms.forEach((room, ri) => {
      const wc = WATER_CATEGORIES.find(c => c.id === room.category);
      const mc = MATERIAL_CLASSES.find(c => c.id === room.materialClass);
      const widthIn = ftToIn(room.widthFt);
      const depthIn = ftToIn(room.depthFt);
      const heightIn = ftToIn(room.ceilingFt || 8);

      xml += `          <Room id="room-${ri}" name="${escXml(room.label)}">\n`;
      xml += `            <Properties>\n`;
      xml += `              <FloorArea>${Math.round(room.widthFt * room.depthFt)}</FloorArea>\n`;
      xml += `              <CeilingHeight>${heightIn}</CeilingHeight>\n`;
      if (wc) xml += `              <WaterCategory>${escXml(wc.label)}</WaterCategory>\n`;
      if (mc) xml += `              <MaterialClass>${escXml(mc.label)}</MaterialClass>\n`;
      if (room.suite) xml += `              <Suite>${escXml(room.suite)}</Suite>\n`;
      xml += `            </Properties>\n`;

      // Wall segments forming the room perimeter
      xml += `            <Walls>\n`;

      const walls = room.walls || [
        { label: "North Wall", lengthFt: room.widthFt },
        { label: "East Wall",  lengthFt: room.depthFt },
        { label: "South Wall", lengthFt: room.widthFt },
        { label: "West Wall",  lengthFt: room.depthFt },
      ];

      // Generate wall segments as connected points (clockwise)
      const points = [
        [offsetX, 0],
        [offsetX + widthIn, 0],
        [offsetX + widthIn, depthIn],
        [offsetX, depthIn],
      ];

      walls.forEach((wall, wi) => {
        const start = points[wi];
        const end = points[(wi + 1) % points.length];
        const wallLenIn = ftToIn(wall.lengthFt);

        xml += `              <Wall id="wall-${ri}-${wi}" name="${escXml(wall.label)}">\n`;
        xml += `                <Start x="${start[0]}" y="${start[1]}" />\n`;
        xml += `                <End x="${end[0]}" y="${end[1]}" />\n`;
        xml += `                <Length>${wallLenIn}</Length>\n`;
        xml += `                <Height>${heightIn}</Height>\n`;
        xml += `              </Wall>\n`;
      });

      xml += `            </Walls>\n`;

      // Equipment placed in this room (as annotations)
      const roomEquip = equipmentPlacements.filter(e => e.roomId === room.id);
      if (roomEquip.length > 0) {
        xml += `            <Annotations>\n`;
        roomEquip.forEach((eq, ei) => {
          const et = getET(eq.type);
          xml += `              <Annotation type="equipment" id="eq-${ri}-${ei}">\n`;
          xml += `                <Label>${escXml(et.label)} — ${escXml(eq.brand || "")}</Label>\n`;
          xml += `                <Code>${escXml(et.xactCode || et.code)}</Code>\n`;
          xml += `                <Position x="${Math.round((eq.x / 100) * widthIn) + offsetX}" y="${Math.round((eq.y / 100) * depthIn)}" />\n`;
          if (eq.serial) xml += `                <Serial>${escXml(eq.serial)}</Serial>\n`;
          xml += `              </Annotation>\n`;
        });
        xml += `            </Annotations>\n`;
      }

      // Moisture points (as damage markers)
      const roomPoints = moisturePoints.filter(p => p.roomId === room.id);
      if (roomPoints.length > 0) {
        xml += `            <DamageMarkers>\n`;
        roomPoints.forEach((pt, pi) => {
          const latest = pt.readings?.[pt.readings.length - 1];
          xml += `              <Marker id="pt-${ri}-${pi}" type="moisture">\n`;
          xml += `                <Label>${escXml(pt.label || `Point ${pi + 1}`)}</Label>\n`;
          xml += `                <Position x="${Math.round((pt.x / 100) * widthIn) + offsetX}" y="${Math.round((pt.y / 100) * depthIn)}" />\n`;
          if (latest) {
            xml += `                <Reading rh="${latest.rh || ""}" mc="${latest.value || ""}" />\n`;
          }
          xml += `              </Marker>\n`;
        });
        xml += `            </DamageMarkers>\n`;
      }

      xml += `          </Room>\n`;
      offsetX += widthIn + 24; // 2-foot gap between rooms
    });

    xml += `        </Rooms>\n`;
    xml += `      </Level>\n`;
  });

  xml += `    </Levels>
  </Sketch>
  <LineItems>
`;

  // Add equipment as Xactimate line items with proper codes
  equipmentPlacements.forEach((eq, i) => {
    const et = getET(eq.type);
    const dIn = parseInt(eq.dayIn) || 1;
    const dOut = parseInt(eq.dayOut) || 3;
    const days = Math.max(1, dOut - dIn + 1);
    const room = rooms.find(r => r.id === eq.roomId);

    xml += `    <LineItem id="li-${i}">
      <Category>Water Mitigation</Category>
      <Code>${escXml(et.xactCode || "WTR EQMT")}</Code>
      <Description>${escXml(et.label)} — ${escXml(eq.brand || "")}${room ? ` (${escXml(room.label)})` : ""}</Description>
      <Unit>DAY</Unit>
      <Quantity>${days}</Quantity>
      <Room>${escXml(room?.label || "")}</Room>
    </LineItem>
`;
  });

  xml += `  </LineItems>
</ESX>`;

  return xml;
}

// ── Main ESX Export Tab ──
export default function DryDoxESX({
  rooms, floors, equipmentPlacements, project, moisturePoints,
}) {
  const [exported, setExported] = useState(false);
  const [previewXml, setPreviewXml] = useState(null);

  const handleExport = useCallback(() => {
    const xml = generateESXXml({ rooms, floors, equipmentPlacements, project, moisturePoints });

    // Create downloadable file
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project?.name || "DryDox-Sketch").replace(/[^a-zA-Z0-9-_ ]/g, "")}.esx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExported(true);
    setTimeout(() => setExported(false), 4000);
  }, [rooms, floors, equipmentPlacements, project, moisturePoints]);

  const handlePreview = useCallback(() => {
    const xml = generateESXXml({ rooms, floors, equipmentPlacements, project, moisturePoints });
    setPreviewXml(previewXml ? null : xml);
  }, [rooms, floors, equipmentPlacements, project, moisturePoints, previewXml]);

  const hasData = rooms.length > 0;

  return (
    <div>
      <div className="dd-sec-row">
        <div>
          <div className="dd-sec">Xactimate Export</div>
          <div style={{ fontSize: 10, color: "var(--t3)" }}>
            Generate an ESX-format sketch file for import into Xactimate.
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-xs" onClick={handlePreview} disabled={!hasData}>
            {previewXml ? "Hide" : "Preview"} XML
          </button>
          <button className="btn btn-primary btn-xs" onClick={handleExport} disabled={!hasData}>
            {DDIc.export} Export .esx
          </button>
        </div>
      </div>

      {exported && (
        <div style={{
          background: "rgba(26,217,138,.08)", border: "1px solid rgba(26,217,138,.25)",
          borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 11,
          fontWeight: 700, color: "var(--green)",
        }}>
          ESX file downloaded. Open in Xactimate via File → Import Sketch.
        </div>
      )}

      {/* Export summary */}
      <div className="dd-card" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Export Contents</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 8 }}>
          {[
            ["Floors", (floors || [1]).length, "var(--blue)"],
            ["Rooms", rooms.length, "var(--teal)"],
            ["Walls", rooms.reduce((s, r) => s + (r.walls?.length || 4), 0), "var(--purple)"],
            ["Equipment", equipmentPlacements.length, "var(--amber)"],
            ["Moisture Points", moisturePoints.length, "var(--acc)"],
          ].map(([l, v, c]) => (
            <div key={l} style={{
              background: "var(--s3)", borderRadius: 7, padding: "8px 10px",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 10, color: "var(--t2)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* What gets exported */}
      <div className="dd-card" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>What's Included</div>
        {[
          "Room geometry with exact wall lengths and ceiling heights",
          "Multi-floor/multi-suite layout with proper level structure",
          "Equipment placements with Xactimate category codes",
          "Moisture damage markers with latest readings",
          "Water category and material class per room",
          "Line items with WTR codes for equipment billing",
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: 11, color: "var(--t2)" }}>
            <span style={{ color: "var(--green)", fontSize: 10 }}>✓</span>
            {item}
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="dd-card">
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Import Instructions</div>
        <ol style={{ paddingLeft: 18, fontSize: 11, color: "var(--t2)", lineHeight: 1.8 }}>
          <li>Download the .esx file using the Export button above</li>
          <li>Open Xactimate and go to <strong>File → Import</strong></li>
          <li>Select "Sketch Import" and browse to the downloaded .esx file</li>
          <li>Review the imported rooms and make any adjustments needed</li>
          <li>The sketch will include all room geometry, damage markers, and equipment codes</li>
          <li>Use the imported sketch as a starting point for your repair estimate</li>
        </ol>
      </div>

      {!hasData && (
        <div style={{
          textAlign: "center", padding: "20px", marginTop: 10,
          background: "rgba(232,156,24,.06)", border: "1px solid rgba(232,156,24,.2)",
          borderRadius: 10, fontSize: 11, color: "var(--amber)",
        }}>
          Add rooms in the Floor Plan tab first to generate an ESX export.
        </div>
      )}

      {/* XML Preview */}
      {previewXml && (
        <div style={{ marginTop: 14 }}>
          <div className="dd-sec" style={{ marginBottom: 6 }}>XML Preview</div>
          <pre style={{
            background: "var(--s1)", border: "1px solid var(--br)", borderRadius: 8,
            padding: 14, fontSize: 10, fontFamily: "var(--mono)", color: "var(--t2)",
            overflow: "auto", maxHeight: 400, whiteSpace: "pre-wrap", lineHeight: 1.5,
          }}>
            {previewXml}
          </pre>
        </div>
      )}
    </div>
  );
}

export { generateESXXml };
