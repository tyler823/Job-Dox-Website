/* ══════════════════════════════════════════════════════════════════
   DryDoxScanner  —  Standalone LiDAR scan component
   ═══════════════════════════════════════════════════════════════
   Checks LiDAR support on mount, shows a "Scan Room" button if
   supported, and displays returned room dimensions + wall
   measurements in a clean results card.

   Styled with JobDoxDesignSystem.css tokens:
     --acc    red accent
     --s2     card surface
     --t1     primary text
     --t2     secondary text
     --mono   monospace font for measurements
══════════════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback } from "react";
import { JobDoxLiDAR } from "./plugins/jobdox-lidar.js";

export default function DryDoxScanner() {
  const [supported, setSupported] = useState(null); // null = checking
  const [reason, setReason] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { rooms: [...] }
  const [error, setError] = useState(null);

  // ── Check support on mount ──
  useEffect(() => {
    let mounted = true;
    JobDoxLiDAR.checkSupport().then(({ supported: s, reason: r }) => {
      if (!mounted) return;
      setSupported(s);
      setReason(r);
    });
    return () => { mounted = false; };
  }, []);

  // ── Scan handler ──
  const handleScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    setScanResult(null);
    try {
      const result = await JobDoxLiDAR.scanRoom();
      setScanResult(result);
    } catch (err) {
      if (err?.message?.includes("cancelled")) {
        // User cancelled — don't show error
      } else {
        setError(err?.message || "Scan failed");
      }
    } finally {
      setScanning(false);
    }
  }, []);

  // ── Loading state ──
  if (supported === null) {
    return (
      <div style={S.wrap}>
        <div style={S.card}>
          <div style={S.cardBody}>
            <span style={S.mutedText}>Checking LiDAR support…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      {/* ── Scan Button Card ── */}
      <div style={S.card}>
        <div style={S.cardBody}>
          <div style={S.iconCircle}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--acc)">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 7c-2.76 0-5 2.24-5 5h2c0-1.66 1.34-3 3-3V7zm0 10c2.76 0 5-2.24 5-5h-2c0 1.66-1.34 3-3 3v2z"/>
            </svg>
          </div>
          <div style={S.title}>LiDAR Room Scanner</div>

          {supported ? (
            <>
              <div style={S.mutedText}>
                Scan the room with your device's LiDAR sensor to automatically capture dimensions.
              </div>
              <button
                style={{
                  ...S.scanBtn,
                  opacity: scanning ? 0.6 : 1,
                  cursor: scanning ? "not-allowed" : "pointer",
                }}
                onClick={handleScan}
                disabled={scanning}
              >
                {scanning ? "Scanning…" : "Scan Room"}
              </button>
            </>
          ) : (
            <div style={S.unsupported}>
              <span style={S.unsupportedIcon}>⚠</span>
              <span>{reason}</span>
            </div>
          )}

          {error && (
            <div style={S.error}>{error}</div>
          )}
        </div>
      </div>

      {/* ── Results Card ── */}
      {scanResult?.rooms?.map((room, ri) => (
        <div key={ri} style={S.card}>
          <div style={S.cardBody}>
            <div style={S.resultHeader}>
              <span style={S.resultLabel}>{room.label || `Room ${ri + 1}`}</span>
              <span style={S.resultBadge}>SCANNED</span>
            </div>

            {/* Dimensions grid */}
            <div style={S.dimsGrid}>
              <DimCell label="Width" value={room.widthFt} unit="ft" />
              <DimCell label="Depth" value={room.depthFt} unit="ft" />
              <DimCell label="Ceiling" value={room.ceilingFt} unit="ft" />
              <DimCell
                label="Area"
                value={Math.round(room.widthFt * room.depthFt)}
                unit="sf"
              />
            </div>

            {/* Wall measurements */}
            {room.walls?.length > 0 && (
              <div style={S.wallSection}>
                <div style={S.wallHeader}>Wall Measurements</div>
                {room.walls.map((wall, wi) => (
                  <div key={wi} style={S.wallRow}>
                    <span style={S.wallLabel}>{wall.label}</span>
                    <span style={S.wallValue}>{wall.lengthFt} ft</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Dimension cell sub-component ──
function DimCell({ label, value, unit }) {
  return (
    <div style={S.dimCell}>
      <div style={S.dimValue}>
        {value}
        <span style={S.dimUnit}>{unit}</span>
      </div>
      <div style={S.dimLabel}>{label}</div>
    </div>
  );
}

// ── Inline styles using CSS custom properties ──
const S = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 16,
    maxWidth: 480,
    margin: "0 auto",
  },
  card: {
    background: "var(--s2)",
    border: "1px solid var(--br)",
    borderRadius: 12,
    overflow: "hidden",
  },
  cardBody: {
    padding: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: "rgba(228,53,49,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "var(--t1)",
  },
  mutedText: {
    fontSize: 13,
    color: "var(--t2)",
    textAlign: "center",
    lineHeight: 1.5,
  },
  scanBtn: {
    background: "var(--acc)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "12px 32px",
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "var(--ui)",
    marginTop: 4,
  },
  unsupported: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "var(--t2)",
    background: "var(--s1)",
    borderRadius: 8,
    padding: "10px 14px",
  },
  unsupportedIcon: {
    fontSize: 16,
    color: "var(--amber, #e89c18)",
  },
  error: {
    fontSize: 12,
    color: "var(--acc)",
    background: "rgba(228,53,49,0.08)",
    borderRadius: 6,
    padding: "8px 12px",
    textAlign: "center",
  },
  resultHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  resultLabel: {
    fontSize: 15,
    fontWeight: 700,
    color: "var(--t1)",
  },
  resultBadge: {
    fontSize: 9,
    fontWeight: 700,
    fontFamily: "var(--mono)",
    letterSpacing: "0.06em",
    color: "var(--acc)",
    background: "rgba(228,53,49,0.1)",
    borderRadius: 5,
    padding: "3px 8px",
  },
  dimsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 8,
    width: "100%",
  },
  dimCell: {
    background: "var(--s1, var(--s2))",
    borderRadius: 8,
    padding: "12px 10px",
    textAlign: "center",
  },
  dimValue: {
    fontFamily: "var(--mono)",
    fontSize: 22,
    fontWeight: 700,
    color: "var(--t1)",
  },
  dimUnit: {
    fontSize: 12,
    fontWeight: 400,
    color: "var(--t2)",
    marginLeft: 3,
  },
  dimLabel: {
    fontFamily: "var(--mono)",
    fontSize: 9,
    color: "var(--t2)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginTop: 3,
  },
  wallSection: {
    width: "100%",
    borderTop: "1px solid var(--br)",
    paddingTop: 12,
  },
  wallHeader: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--t2)",
    fontFamily: "var(--mono)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 8,
  },
  wallRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
    borderBottom: "1px solid var(--br)",
  },
  wallLabel: {
    fontSize: 13,
    color: "var(--t1)",
  },
  wallValue: {
    fontFamily: "var(--mono)",
    fontSize: 14,
    fontWeight: 700,
    color: "var(--t1)",
  },
};
