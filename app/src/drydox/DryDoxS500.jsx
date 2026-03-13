/* ══════════════════════════════════════════════════════════════════
   DRYDOX S500 — IICRC S500 Equipment Recommendation Engine
   - Calculates required air movers, dehumidifiers, air scrubbers per room
   - Compares deployed vs recommended equipment
   - Flags mismatches with mandatory comment system
   - Visible to all project users for accountability
══════════════════════════════════════════════════════════════════ */
import { useState, useMemo, useCallback } from "react";
import {
  DDIc, EQUIP_TYPES, getET, MATERIAL_CLASSES, WATER_CATEGORIES,
  calcAirMovers, calcDehumidifiers, calcAirScrubbers,
  calcS500Recommendations, compareS500,
  DEFAULT_DEHU_PPD, DEFAULT_SCRUBBER_CFM,
} from "./DryDoxConstants.js";

// ── Mismatch Comment Modal ──
function MismatchCommentModal({ mismatches, existingComments, onSave, onClose }) {
  const [comments, setComments] = useState(() => {
    const init = {};
    mismatches.filter(m => !m.over).forEach(m => {
      init[m.type] = existingComments?.[m.type] || "";
    });
    return init;
  });

  const allFilled = mismatches.filter(m => !m.over).every(m => (comments[m.type] || "").trim().length > 0);

  return (
    <div className="dd-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dd-modal">
        <div className="dd-modal-title">Equipment Mismatch — Reason Required</div>
        <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 14, lineHeight: 1.6 }}>
          Your deployed equipment does not match IICRC S500 recommendations.
          Per company policy, you <strong style={{ color: "var(--acc)" }}>must provide a reason</strong> for each discrepancy before proceeding.
        </div>

        {mismatches.filter(m => !m.over).map(m => (
          <div key={m.type} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                fontFamily: "var(--mono)", background: "rgba(228,53,49,.1)", color: "var(--acc)",
              }}>
                {m.label}: {m.deployed} / {m.recommended} needed
              </span>
              <span style={{ fontSize: 10, color: "var(--acc)", fontWeight: 700 }}>
                SHORT {m.recommended - m.deployed}
              </span>
            </div>
            <textarea
              className="inp"
              value={comments[m.type] || ""}
              onChange={e => setComments(prev => ({ ...prev, [m.type]: e.target.value }))}
              placeholder={`Why are you deploying fewer ${m.label.toLowerCase()} than S500 recommends? (e.g., "Limited access", "Tenant request", "Equipment unavailable")`}
              style={{ width: "100%", minHeight: 60, fontSize: 12, resize: "vertical", fontFamily: "var(--ui)" }}
            />
          </div>
        ))}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-xs" onClick={() => onSave(comments)} disabled={!allFilled}
            style={{ opacity: allFilled ? 1 : 0.5 }}>
            {DDIc.check} Save Reasons
          </button>
        </div>
      </div>
    </div>
  );
}

// ── S500 Flag Badge (used elsewhere in the portal) ──
export function S500FlagBadge({ matched, size = "sm" }) {
  if (matched) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        padding: size === "sm" ? "1px 6px" : "3px 10px",
        borderRadius: 5, fontSize: size === "sm" ? 9 : 11, fontWeight: 700,
        fontFamily: "var(--mono)", background: "rgba(26,217,138,.1)",
        color: "var(--green)", whiteSpace: "nowrap",
      }}>
        ✓ S500
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: size === "sm" ? "1px 6px" : "3px 10px",
      borderRadius: 5, fontSize: size === "sm" ? 9 : 11, fontWeight: 700,
      fontFamily: "var(--mono)", background: "rgba(228,53,49,.1)",
      color: "var(--acc)", whiteSpace: "nowrap", animation: "jd-pulse 2s infinite",
    }}>
      ⚠ S500
    </span>
  );
}

// ── Main S500 Recommendations Tab ──
export default function DryDoxS500({
  rooms, equipmentPlacements, s500Comments, setS500Comments,
  s500Overrides, setS500Overrides,
}) {
  const [commentModal, setCommentModal] = useState(false);

  // Allow user to override default PPD / CFM ratings
  const dehuPPD = s500Overrides?.dehuPPD || DEFAULT_DEHU_PPD;
  const scrubberCFM = s500Overrides?.scrubberCFM || DEFAULT_SCRUBBER_CFM;

  // Calculate recommendations and comparison
  const comparison = useMemo(
    () => compareS500(rooms, equipmentPlacements, dehuPPD, scrubberCFM),
    [rooms, equipmentPlacements, dehuPPD, scrubberCFM]
  );

  const { matched, mismatches, deployed, recommended, perRoom } = comparison;
  const underMismatches = mismatches.filter(m => !m.over);
  const hasUncommentedMismatch = underMismatches.some(m => !(s500Comments?.[m.type] || "").trim());

  // Per-room deployed counts
  const roomDeployed = useMemo(() => {
    const rd = {};
    (equipmentPlacements || []).filter(e => !e.removedAt).forEach(eq => {
      if (!rd[eq.roomId]) rd[eq.roomId] = { fan: 0, dehu: 0, scrubber: 0 };
      if (eq.type === "fan") rd[eq.roomId].fan++;
      else if (eq.type === "dehu" || eq.type === "dehu-des") rd[eq.roomId].dehu++;
      else if (eq.type === "scrubber" || eq.type === "negair") rd[eq.roomId].scrubber++;
    });
    return rd;
  }, [equipmentPlacements]);

  return (
    <div>
      {/* Overall status banner */}
      <div style={{
        background: matched ? "rgba(26,217,138,.06)" : "rgba(228,53,49,.06)",
        border: `1px solid ${matched ? "rgba(26,217,138,.25)" : "rgba(228,53,49,.25)"}`,
        borderRadius: 10, padding: "14px 16px", marginBottom: 14,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: matched ? "rgba(26,217,138,.15)" : "rgba(228,53,49,.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
        }}>
          {matched ? "✓" : "⚠"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: matched ? "var(--green)" : "var(--acc)" }}>
            {matched ? "S500 Compliant" : "Equipment Mismatch Detected"}
          </div>
          <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 2 }}>
            {matched
              ? "Deployed equipment meets or exceeds IICRC S500 recommendations for all rooms."
              : `${underMismatches.length} equipment type${underMismatches.length > 1 ? "s" : ""} below S500 minimum — reason required.`}
          </div>
        </div>
        {!matched && (
          <button className="btn btn-primary btn-xs" onClick={() => setCommentModal(true)}>
            {hasUncommentedMismatch ? "Add Reasons" : "Edit Reasons"}
          </button>
        )}
      </div>

      {/* Mandatory comment warning */}
      {!matched && hasUncommentedMismatch && (
        <div style={{
          background: "rgba(228,53,49,.08)", border: "1px solid rgba(228,53,49,.2)",
          borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 11,
          color: "var(--acc)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>⚠</span>
          You must provide a reason for each equipment shortfall. This flag is visible to all team members.
        </div>
      )}

      {/* Total comparison KPIs */}
      <div className="dd-kpi-row">
        {[
          { label: "Air Movers", icon: "🌀", rec: recommended.fan, dep: deployed.fan, type: "fan" },
          { label: "Dehumidifiers", icon: "💧", rec: recommended.dehu, dep: deployed.dehu, type: "dehu" },
          { label: "Air Scrubbers", icon: "🌬️", rec: recommended.scrubber, dep: deployed.scrubber, type: "scrubber" },
        ].map(item => {
          const ok = item.dep >= item.rec;
          const diff = item.dep - item.rec;
          return (
            <div key={item.type} className="dd-kpi" style={{
              borderColor: ok ? "rgba(26,217,138,.3)" : "rgba(228,53,49,.3)",
              borderWidth: 2,
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6 }}>
                <span className="dd-kpi-val" style={{ color: ok ? "var(--green)" : "var(--acc)" }}>
                  {item.dep}
                </span>
                <span style={{ fontSize: 11, color: "var(--t3)" }}>/</span>
                <span style={{ fontSize: 14, fontFamily: "var(--mono)", fontWeight: 700, color: "var(--t2)" }}>
                  {item.rec}
                </span>
              </div>
              <div className="dd-kpi-lbl">{item.label}</div>
              <div style={{
                fontSize: 9, fontWeight: 700, fontFamily: "var(--mono)", marginTop: 4,
                color: ok ? "var(--green)" : "var(--acc)",
              }}>
                {item.rec === 0 ? "NOT REQUIRED" : ok ? (diff === 0 ? "EXACT MATCH" : `+${diff} OVER`) : `SHORT ${Math.abs(diff)}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Equipment settings */}
      <div className="dd-card" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Calculation Settings</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label className="lbl">Dehumidifier AHAM Rating (PPD)</label>
            <input type="number" className="inp" value={dehuPPD}
              onChange={e => setS500Overrides(prev => ({ ...prev, dehuPPD: Math.max(1, parseInt(e.target.value) || DEFAULT_DEHU_PPD) }))}
              style={{ height: 30, fontSize: 12 }} />
            <div style={{ fontSize: 9, color: "var(--t3)", marginTop: 2 }}>
              Pints per day rating of your LGR dehumidifiers (typical: 70-130)
            </div>
          </div>
          <div>
            <label className="lbl">Air Scrubber CFM Rating</label>
            <input type="number" className="inp" value={scrubberCFM}
              onChange={e => setS500Overrides(prev => ({ ...prev, scrubberCFM: Math.max(1, parseInt(e.target.value) || DEFAULT_SCRUBBER_CFM) }))}
              style={{ height: 30, fontSize: 12 }} />
            <div style={{ fontSize: 9, color: "var(--t3)", marginTop: 2 }}>
              CFM capacity of your HEPA air scrubbers (typical: 500-600)
            </div>
          </div>
        </div>
      </div>

      {/* Per-room breakdown */}
      <div className="dd-sec-row" style={{ marginTop: 6 }}>
        <div className="dd-sec">Room-by-Room Recommendations</div>
      </div>

      {rooms.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 20, color: "var(--t3)", fontSize: 12,
          background: "rgba(232,156,24,.06)", border: "1px solid rgba(232,156,24,.2)", borderRadius: 10,
        }}>
          Add rooms in the Floor Plan tab to see S500 recommendations.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 10 }}>
          {rooms.map(room => {
            const rec = perRoom.find(r => r.roomId === room.id) || { fan: 0, dehu: 0, scrubber: 0 };
            const dep = roomDeployed[room.id] || { fan: 0, dehu: 0, scrubber: 0 };
            const mc = MATERIAL_CLASSES.find(c => c.id === room.materialClass);
            const wc = WATER_CATEGORIES.find(c => c.id === room.category);
            const sqft = (parseFloat(room.widthFt) || 0) * (parseFloat(room.depthFt) || 0);
            const cubicFt = sqft * (parseFloat(room.ceilingFt) || 8);

            return (
              <div key={room.id} className="dd-card">
                <div className="dd-card-header" style={{ marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t1)" }}>{room.label}</div>
                    <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)" }}>
                      {room.widthFt}' × {room.depthFt}' × {room.ceilingFt || 8}' = {Math.round(sqft)} SF / {Math.round(cubicFt)} CF
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {mc && <span className="dd-chip" style={{ background: "rgba(100,149,237,.1)", color: mc.color }}>{mc.label}</span>}
                    {wc && <span className="dd-chip" style={{ background: "rgba(232,156,24,.1)", color: wc.color }}>{wc.label.replace("Category ", "Cat ")}</span>}
                  </div>
                </div>

                {/* Recommendation vs deployed per type */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  {[
                    { label: "Air Movers", icon: "🌀", r: rec.fan, d: dep.fan },
                    { label: "Dehumidifiers", icon: "💧", r: rec.dehu, d: dep.dehu },
                    { label: "Scrubbers", icon: "🌬️", r: rec.scrubber, d: dep.scrubber },
                  ].map(item => {
                    const ok = item.d >= item.r;
                    const na = item.r === 0;
                    return (
                      <div key={item.label} style={{
                        background: na ? "var(--s3)" : ok ? "rgba(26,217,138,.06)" : "rgba(228,53,49,.06)",
                        border: `1px solid ${na ? "var(--br)" : ok ? "rgba(26,217,138,.2)" : "rgba(228,53,49,.2)"}`,
                        borderRadius: 7, padding: "8px 6px", textAlign: "center",
                      }}>
                        <div style={{ fontSize: 14, marginBottom: 2 }}>{item.icon}</div>
                        <div style={{
                          fontFamily: "var(--mono)", fontSize: 14, fontWeight: 700,
                          color: na ? "var(--t3)" : ok ? "var(--green)" : "var(--acc)",
                        }}>
                          {item.d} / {item.r}
                        </div>
                        <div style={{ fontSize: 8, color: "var(--t3)", fontFamily: "var(--mono)", letterSpacing: ".04em" }}>
                          {item.label.toUpperCase()}
                        </div>
                        <div style={{
                          fontSize: 8, fontWeight: 700, marginTop: 2,
                          color: na ? "var(--t3)" : ok ? "var(--green)" : "var(--acc)",
                        }}>
                          {na ? "N/A" : ok ? "OK" : `NEED ${item.r - item.d} MORE`}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* S500 formula breakdown */}
                <div style={{ marginTop: 8, fontSize: 9, color: "var(--t3)", lineHeight: 1.7, fontFamily: "var(--mono)" }}>
                  AM: {Math.round(sqft)} SF ÷ 50 = {Math.ceil(sqft / 50)} (floor) | {Math.round(2*((parseFloat(room.widthFt)||0)+(parseFloat(room.depthFt)||0)))} LF ÷ 14 = {Math.ceil(2*((parseFloat(room.widthFt)||0)+(parseFloat(room.depthFt)||0)) / 14)} (wall)
                  <br />
                  DH: {Math.round(cubicFt)} CF ÷ {S500_DEHU_FACTORS[room.materialClass||"class2"]} = {Math.round(cubicFt / (S500_DEHU_FACTORS[room.materialClass||"class2"]||50))} PPD ÷ {dehuPPD} = {calcDehumidifiers(room, dehuPPD)}
                  {(room.category === "cat2" || room.category === "cat3") && (
                    <>
                      <br />
                      AS: {Math.round(cubicFt)} CF × {S500_ACH[room.category]} ACH ÷ 60 = {Math.round((cubicFt * (S500_ACH[room.category]||0))/60)} CFM ÷ {scrubberCFM} = {calcAirScrubbers(room, scrubberCFM)}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Existing mismatch comments */}
      {!matched && s500Comments && Object.keys(s500Comments).some(k => s500Comments[k]) && (
        <div style={{ marginTop: 14 }}>
          <div className="dd-sec">Discrepancy Reasons</div>
          {underMismatches.map(m => {
            const comment = s500Comments?.[m.type];
            return comment ? (
              <div key={m.type} className="dd-card" style={{
                borderLeft: "3px solid var(--amber)", marginBottom: 6,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--acc)", fontFamily: "var(--mono)" }}>
                    {m.label}: {m.deployed}/{m.recommended}
                  </span>
                  <span style={{ fontSize: 9, color: "var(--amber)", fontWeight: 700 }}>SHORT {m.recommended - m.deployed}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--t1)", lineHeight: 1.5 }}>{comment}</div>
              </div>
            ) : null;
          })}
        </div>
      )}

      {/* S500 reference */}
      <div className="dd-card" style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>IICRC S500 Reference</div>
        {[
          "Air Movers: 1 per 50 SF floor area (high) or 1 per 14 LF wall perimeter — whichever is greater",
          "Dehumidifiers (LGR): Cubic footage ÷ class factor (C1=100, C2=50, C3=40, C4=40) = PPD needed ÷ unit rating",
          "Air Scrubbers: Required for Cat 2/3 water. CFM = (Cubic Ft × ACH) ÷ 60. Cat 2 = 4 ACH, Cat 3 = 6 ACH",
          "These are minimum recommendations — actual conditions may require more or fewer units",
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 6, padding: "3px 0", fontSize: 11, color: "var(--t2)" }}>
            <span style={{ color: "var(--blue)", fontSize: 10, flexShrink: 0 }}>•</span>
            {item}
          </div>
        ))}
      </div>

      {/* Comment modal */}
      {commentModal && (
        <MismatchCommentModal
          mismatches={underMismatches}
          existingComments={s500Comments}
          onSave={comments => {
            setS500Comments(prev => ({ ...prev, ...comments }));
            setCommentModal(false);
          }}
          onClose={() => setCommentModal(false)}
        />
      )}
    </div>
  );
}

// Re-export needed items for use in constants import
import { S500_DEHU_FACTORS, S500_ACH } from "./DryDoxConstants.js";
