/**
 * JobDoxInPersonSign.jsx — Full-screen in-person document signing overlay
 * Customer-facing white surface for signing documents on the tech's device.
 * Renders PDF pages via PDF.js canvas + positioned field overlays,
 * matching the approach used by PublicSigningPage in JobDoxDocuments.jsx.
 */

import { useState, useRef, useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";

// ── PDF.js CDN loading (same version + pattern as JobDoxDocuments.jsx) ──────
const PDFJS_VER = "3.11.174";
let _pdfJsPromise = null;
const loadPdfJs = () => {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (_pdfJsPromise) return _pdfJsPromise;
  _pdfJsPromise = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VER}/pdf.min.js`;
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VER}/pdf.worker.min.js`;
      res(window.pdfjsLib);
    };
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return _pdfJsPromise;
};

// ── PDF Page Canvas (same as JobDoxDocuments.jsx PdfPageCanvas) ─────────────
function PdfPageCanvas({ pdfData, pageNum = 1, width = 700, onDims }) {
  const cvRef = useRef();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!pdfData) return;
    let dead = false;
    setLoading(true); setErr(null);
    (async () => {
      try {
        const lib = await loadPdfJs();
        if (dead) return;
        const raw = pdfData.includes(",") ? pdfData.split(",")[1] : pdfData;
        const bin = atob(raw);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        const pdf = await lib.getDocument({ data: buf }).promise;
        if (dead) return;
        const page = await pdf.getPage(pageNum);
        if (dead) return;
        const vp = page.getViewport({ scale: 1 });
        const sc = width / vp.width;
        const svp = page.getViewport({ scale: sc });
        const cv = cvRef.current;
        if (!cv) return;
        cv.width = svp.width;
        cv.height = svp.height;
        await page.render({ canvasContext: cv.getContext("2d"), viewport: svp }).promise;
        if (!dead) { setLoading(false); if (onDims) onDims({ w: svp.width, h: svp.height }); }
      } catch (e) { if (!dead) { setLoading(false); setErr("PDF render failed"); } }
    })();
    return () => { dead = true; };
  }, [pdfData, pageNum, width]);

  return (
    <div style={{ position: "relative", display: "inline-block", minHeight: 40 }}>
      <canvas ref={cvRef} style={{ display: "block" }} />
      {loading && (
        <div style={{ position: "absolute", inset: 0, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3 }}>
          <div style={{ width: 20, height: 20, border: "2px solid #ccc", borderTopColor: "#666", borderRadius: "50%", animation: "jd-spin .7s linear infinite" }} />
        </div>
      )}
      {err && (
        <div style={{ position: "absolute", inset: 0, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#c00" }}>
          {err}
        </div>
      )}
    </div>
  );
}

// ── Signature Pad (same pattern as JobDoxDocuments.jsx SignaturePad) ─────────
function SignaturePad({ label = "Sign here", height = 160, onCapture, onClear }) {
  const cvRef = useRef();
  const drawing = useRef(false);
  const lastPt = useRef(null);
  const [hasSig, setHasSig] = useState(false);

  const getXY = (e, cv) => {
    const r = cv.getBoundingClientRect();
    const s = e.touches ? e.touches[0] : e;
    return { x: s.clientX - r.left, y: s.clientY - r.top };
  };

  const onStart = e => {
    e.preventDefault(); drawing.current = true;
    const cv = cvRef.current; const pt = getXY(e, cv);
    lastPt.current = pt;
    const ctx = cv.getContext("2d");
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 1, 0, Math.PI * 2); ctx.fillStyle = "#111"; ctx.fill();
  };
  const onMove = e => {
    e.preventDefault(); if (!drawing.current) return;
    const cv = cvRef.current; const pt = getXY(e, cv);
    const ctx = cv.getContext("2d");
    ctx.beginPath(); ctx.moveTo(lastPt.current.x, lastPt.current.y); ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = "#111"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.stroke();
    lastPt.current = pt; setHasSig(true);
  };
  const onEnd = e => {
    e.preventDefault(); if (!drawing.current) return;
    drawing.current = false;
    if (hasSig && onCapture) onCapture(cvRef.current.toDataURL("image/png"));
  };
  const clear = () => {
    cvRef.current.getContext("2d").clearRect(0, 0, cvRef.current.width, cvRef.current.height);
    setHasSig(false); if (onClear) onClear();
  };
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    cv.width = cv.offsetWidth; cv.height = height;
  }, [height]);

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#333", marginBottom: 8 }}>{label}</div>
      <div style={{ border: `2px solid ${hasSig ? "#059669" : "#ccc"}`, borderRadius: 10, background: "#fff", position: "relative", height, transition: "border-color .15s" }}>
        <canvas ref={cvRef} style={{ display: "block", width: "100%", height: "100%", touchAction: "none", cursor: "crosshair" }}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} />
        {!hasSig && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <span style={{ fontSize: 14, color: "#aaa", fontStyle: "italic" }}>Draw with finger or mouse</span>
          </div>
        )}
      </div>
      {hasSig && (
        <button onClick={clear} style={{ marginTop: 8, fontSize: 12, color: "#e43531", background: "none", border: "1px solid #e4353144", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>
          Clear
        </button>
      )}
    </div>
  );
}

// ── Field colors (light-mode hex equivalents) ───────────────────────────────
const FIELD_COLORS = {
  signature: "#e43531",
  initials: "#2563eb",
  textInput: "#059669",
  date: "#7c3aed",
  checkbox: "#d97706",
};

// ── Get client name from project contacts ───────────────────────────────────
function getClientName(project) {
  if (project?.contacts && Array.isArray(project.contacts)) {
    const match = project.contacts.find(c =>
      /insured|homeowner|client/i.test(c.role || "")
    );
    if (match?.name) return match.name;
  }
  return project?.clientName || project?.client || "Customer";
}

// ── Today's date in MM/DD/YYYY ──────────────────────────────────────────────
function todayFormatted() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function JobDoxInPersonSign({ document: docData, project, companyId, onComplete, onCancel }) {
  // Filter to customer-relevant fields only
  const customerFields = (docData.fields || []).filter(
    f => f.signerRole === "customer" || f.signerRole === "both"
  );

  // Initialize values from document.values, auto-fill dates
  const [values, setValues] = useState(() => {
    const init = { ...(docData.values || {}) };
    customerFields.forEach(f => {
      const fid = f.fieldId || f.id;
      if (!init[fid] && f.type === "date") {
        init[fid] = { text: todayFormatted() };
      }
    });
    return init;
  });

  const [sigPadField, setSigPadField] = useState(null);
  const [sigData, setSigData] = useState(null);
  const [dims, setDims] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const pdfData = docData.pdfBase64 || docData.pdfData;
  const pages = Array.from({ length: docData.pageCount || 1 }, (_, i) => i + 1);
  const clientName = getClientName(project);

  // Check if all required customer fields are complete
  const allRequiredDone = customerFields
    .filter(f => f.required !== false)
    .every(f => {
      const fid = f.fieldId || f.id;
      const v = values[fid];
      if (f.type === "date") return true;
      if (f.type === "signature" || f.type === "initials") return !!v?.data;
      if (f.type === "textInput") return !!v?.text?.trim();
      if (f.type === "checkbox") return !!v?.checked;
      return true;
    });

  const setValue = (fieldId, val) => {
    setValues(prev => ({ ...prev, [fieldId]: val }));
  };

  // Save to Firestore
  const handleSave = async () => {
    if (!allRequiredDone) return;
    setSaving(true);
    setError(null);
    try {
      const ref = doc(db, "companies", companyId, "projects", docData.projectId || project?.id, "documents", docData.documentId);
      const updates = {
        values,
        status: "signed",
        signedAt: new Date().toISOString(),
        signedInPerson: true,
        signedBy: clientName,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(ref, updates);
      const savedDoc = { ...docData, ...updates, updatedAt: new Date().toISOString() };
      onComplete(savedDoc);
    } catch (e) {
      setError("Failed to save: " + e.message);
      setSaving(false);
    }
  };

  // ── Render a single field overlay on the PDF page ─────────────────────────
  const renderField = (field, pageDims) => {
    const fid = field.fieldId || field.id;
    const fw = (field.width ?? field.w ?? 0.3) * pageDims.w;
    const fh = (field.height ?? field.h ?? 0.05) * pageDims.h;
    const left = field.x * pageDims.w;
    const top = field.y * pageDims.h;
    const color = FIELD_COLORS[field.type] || "#666";
    const val = values[fid];
    const done = !!val?.data || !!val?.text || val?.checked;

    // Signature / Initials
    if (field.type === "signature" || field.type === "initials") {
      return (
        <div key={fid} onClick={() => { if (!done) setSigPadField(field); }}
          style={{
            position: "absolute", left, top, width: fw, height: fh, boxSizing: "border-box",
            border: done ? `2px solid ${color}` : `2px dashed ${color}88`,
            background: done ? `${color}08` : `${color}0a`,
            borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: done ? "default" : "pointer", overflow: "hidden",
            ...(done ? {} : { boxShadow: `0 0 0 3px ${color}20` }),
          }}>
          {done && val?.data ? (
            <img src={val.data} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, pointerEvents: "none" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={`${color}99`}>
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
              <span style={{ fontSize: Math.max(8, fh * 0.25), color: `${color}88`, fontWeight: 600, textTransform: "uppercase" }}>
                {field.type === "initials" ? "Tap to initial" : "Tap to sign"}
              </span>
            </div>
          )}
        </div>
      );
    }

    // Text input — inline editable
    if (field.type === "textInput") {
      return (
        <div key={fid} style={{ position: "absolute", left, top, width: fw, height: fh, boxSizing: "border-box" }}>
          <input
            type="text"
            value={val?.text || ""}
            onChange={e => setValue(fid, { text: e.target.value })}
            placeholder={field.label || "Enter text"}
            style={{
              width: "100%", height: "100%", border: `1.5px solid ${done ? color : "#ccc"}`,
              borderRadius: 4, padding: "0 6px", fontSize: Math.max(10, fh * 0.45),
              fontFamily: "'Outfit', sans-serif", color: "#111", background: done ? `${color}08` : "#fff",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
      );
    }

    // Date — read-only, auto-filled
    if (field.type === "date") {
      return (
        <div key={fid} style={{
          position: "absolute", left, top, width: fw, height: fh, boxSizing: "border-box",
          border: `1.5px solid ${color}`,
          background: `${color}08`, borderRadius: 4,
          display: "flex", alignItems: "center", padding: "0 6px",
        }}>
          <span style={{ fontSize: Math.max(10, fh * 0.45), color: "#111", fontFamily: "'Outfit', sans-serif" }}>
            {val?.text || todayFormatted()}
          </span>
        </div>
      );
    }

    // Checkbox — large tappable area
    if (field.type === "checkbox") {
      return (
        <div key={fid} onClick={() => setValue(fid, { checked: !val?.checked })}
          style={{
            position: "absolute", left, top,
            width: Math.max(44, fw), height: Math.max(44, fh),
            boxSizing: "border-box",
            border: `2px solid ${val?.checked ? color : "#ccc"}`,
            background: val?.checked ? `${color}15` : "#fff",
            borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all .12s",
          }}>
          {val?.checked && (
            <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          )}
        </div>
      );
    }

    return null;
  };

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: "#ffffff",
      overflowY: "auto", fontFamily: "'Outfit', sans-serif",
    }}>
      {/* Spin keyframe (needed for loaders) */}
      <style>{`@keyframes jd-spin{to{transform:rotate(360deg)}}`}</style>

      {/* Exit button — fixed top-right */}
      <button onClick={onCancel} style={{
        position: "fixed", top: 12, right: 12, zIndex: 10000,
        background: "none", border: "1px solid var(--acc, #e43531)",
        color: "var(--acc, #e43531)", borderRadius: 6, padding: "6px 12px",
        fontSize: 12, fontWeight: 600, cursor: "pointer",
        fontFamily: "'Outfit', sans-serif", display: "flex", alignItems: "center", gap: 4,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
        Exit
      </button>

      {/* Document header */}
      <div style={{ padding: "20px 16px 12px", maxWidth: 820, margin: "0 auto" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: 0 }}>{docData.name}</h1>
        <p style={{ fontSize: 12, color: "#888", margin: "4px 0 0", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: ".03em" }}>
          {project?.name ? `Project: ${project.name} · ` : ""}Please review and sign below
        </p>
      </div>

      {/* PDF pages rendered in sequence with field overlays */}
      <div style={{ padding: "0 16px 120px", maxWidth: 820, margin: "0 auto" }}>
        {pages.map(p => (
          <div key={p} style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
            <div style={{ position: "relative", display: "inline-block", boxShadow: "0 2px 16px rgba(0,0,0,.1)", borderRadius: 3, overflow: "hidden" }}>
              <PdfPageCanvas
                pdfData={pdfData}
                pageNum={p}
                width={Math.min(780, window.innerWidth - 32)}
                onDims={d => setDims(prev => ({ ...prev, [p]: d }))}
              />
              {dims[p] && customerFields.filter(f => f.page === p).map(f => renderField(f, dims[p]))}
            </div>
          </div>
        ))}
      </div>

      {/* Signature pad overlay */}
      {sigPadField && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10001, background: "rgba(0,0,0,.5)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }} onClick={e => { if (e.target === e.currentTarget) { setSigPadField(null); setSigData(null); } }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480,
            boxShadow: "0 12px 40px rgba(0,0,0,.2)",
          }}>
            <SignaturePad
              label={sigPadField.type === "initials" ? "Draw your initials" : "Draw your full signature"}
              height={sigPadField.type === "initials" ? 100 : 160}
              onCapture={d => setSigData(d)}
              onClear={() => setSigData(null)}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => { setSigPadField(null); setSigData(null); }}
                style={{ flex: 1, padding: "12px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#666", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
                Cancel
              </button>
              <button disabled={!sigData}
                onClick={() => {
                  if (!sigData) return;
                  const fid = sigPadField.fieldId || sigPadField.id;
                  setValue(fid, { data: sigData, timestamp: new Date().toISOString() });
                  setSigPadField(null); setSigData(null);
                }}
                style={{
                  flex: 2, padding: "12px", borderRadius: 8, border: "none",
                  background: sigData ? "#059669" : "#e5e5e5",
                  color: sigData ? "#fff" : "#999",
                  cursor: sigData ? "pointer" : "default",
                  fontSize: 14, fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error message — positioned above the action bar */}
      {error && (
        <div style={{
          position: "fixed", bottom: 68, left: 16, right: 16, zIndex: 10001,
          background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8,
          padding: "10px 14px", fontSize: 13, color: "#b91c1c", textAlign: "center",
        }}>
          {error}
        </div>
      )}

      {/* Fixed bottom action bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#f5f5f5", borderTop: "1px solid #ddd",
        padding: "12px 16px", display: "flex", alignItems: "center",
        justifyContent: "space-between", zIndex: 10000,
      }}>
        <div style={{ fontSize: 13, color: "#555" }}>
          Signing as: <strong style={{ color: "#111" }}>{clientName}</strong>
        </div>
        <button onClick={handleSave} disabled={!allRequiredDone || saving}
          style={{
            padding: "12px 28px", borderRadius: 8, border: "none",
            background: allRequiredDone && !saving ? "#059669" : "#ccc",
            color: "#fff", fontSize: 15, fontWeight: 700,
            cursor: allRequiredDone && !saving ? "pointer" : "default",
            fontFamily: "'Outfit', sans-serif", display: "flex", alignItems: "center", gap: 8,
            transition: "background .15s",
          }}>
          {saving && <div style={{ width: 16, height: 16, border: "2px solid #fff4", borderTopColor: "#fff", borderRadius: "50%", animation: "jd-spin .7s linear infinite" }} />}
          {saving ? "Saving..." : "Complete & Save Document"}
        </button>
      </div>
    </div>
  );
}
