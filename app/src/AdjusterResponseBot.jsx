/**
 * AdjusterResponseBot.jsx
 * AI-powered response generator for adjuster/customer communications.
 *
 * Reads the selected email, project notes, and company industry to craft
 * professional rebuttals grounded in IICRC standards, ReadyTraining best
 * practices, and project-specific documentation.
 */
import { useState, useRef, useEffect } from "react";

const NETLIFY = "/.netlify/functions";

/* ── Tiny inline icons ── */
const BotIc = {
  ai:    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm0-4h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-2c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z"/></svg>,
  send:  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>,
  copy:  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>,
  edit:  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>,
  close: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
  refresh:<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.96 7.96 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>,
};

/**
 * AdjusterResponseModal
 *
 * Props:
 *   message        — the selected email/message object { subject, body, from, to, direction, type }
 *   proj           — current project { id, name, address, type, ... }
 *   dailyNotes     — array of project daily notes
 *   companyInfo    — { name, industry, ... }
 *   currentUser    — { name, email }
 *   threadMessages — other messages in this project for conversation context
 *   onClose        — close callback
 *   onInsertDraft  — callback(draftText) to insert the AI response into an email composer
 */
export default function AdjusterResponseModal({
  message,
  proj,
  dailyNotes = [],
  companyInfo = {},
  currentUser = {},
  threadMessages = [],
  onClose,
  onInsertDraft,
  companyId = "",
}) {
  const [loading, setLoading]       = useState(false);
  const [response, setResponse]     = useState("");
  const [editing, setEditing]       = useState(false);
  const [editText, setEditText]     = useState("");
  const [error, setError]           = useState("");
  const [copied, setCopied]         = useState(false);
  const [customInstr, setCustomInstr] = useState("");
  const [senderRole, setSenderRole] = useState("adjuster");
  const [coinWarning, setCoinWarning] = useState("");
  const textRef = useRef(null);

  const senderName = message?.from || message?.contact || "Unknown";

  /* ── Generate response via Netlify function ── */
  const generate = async () => {
    setLoading(true);
    setError("");
    setResponse("");
    setEditing(false);

    try {
      const res = await fetch(`${NETLIFY}/adjuster-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incomingMessage:     message?.body || message?.preview || "",
          incomingSubject:     message?.subject || "",
          senderName,
          senderRole,
          projectNotes:        dailyNotes.map(n => ({
            text:      n.text,
            createdAt: n.createdAt,
            author:    n.author,
          })),
          projectName:         proj?.name || proj?.address || "",
          projectType:         proj?.type || "",
          companyName:         companyInfo.name || "",
          companyIndustry:     companyInfo.industry || "Restoration",
          conversationHistory: threadMessages.slice(-10).map(m => ({
            direction: m.direction,
            subject:   m.subject,
            body:      m.body || m.preview || "",
            from:      m.from,
          })),
          userName:            currentUser?.name || currentUser?.email || "",
          customInstructions:  customInstr.trim() || undefined,
          companyId:           companyId || "",
          userId:              currentUser?.email || "",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error === "cortex_coins_exhausted") {
          setError(data.message || "You've used all of your Cortex Coins for this billing cycle.");
          return;
        }
        throw new Error(data.error || `Server error ${res.status}`);
      }
      // Check for Cortex Coins alert
      if (data.cortexCoins?.alert80 && data.cortexCoins?.alertMessage) {
        setCoinWarning(data.cortexCoins.alertMessage);
      }
      setResponse(data.response || "");
      setEditText(data.response || "");
    } catch (err) {
      setError(err.message || "Failed to generate response");
    } finally {
      setLoading(false);
    }
  };

  /* ── Auto-generate on mount ── */
  useEffect(() => { generate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copyToClipboard = () => {
    const text = editing ? editText : response;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleInsert = () => {
    const text = editing ? editText : response;
    if (onInsertDraft) onInsertDraft(text);
    onClose();
  };

  return (
    <div className="overlay" style={{ zIndex: 500 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--s1)", borderRadius: 14, width: "min(720px, 96vw)",
        maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden",
        border: "1px solid var(--br)", boxShadow: "0 20px 60px rgba(0,0,0,.4)",
      }}>
        {/* ── Header ── */}
        <div style={{
          padding: "14px 18px", borderBottom: "1px solid var(--br)",
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", flexShrink: 0,
          }}>{BotIc.ai}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)" }}>AI Response Bot</div>
            <div className="mono" style={{ fontSize: 9, color: "var(--t3)", marginTop: 1 }}>
              FORMULATE PROFESSIONAL RESPONSE
            </div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{BotIc.close}</button>
        </div>

        {/* ── Original message preview ── */}
        <div style={{
          padding: "12px 18px", borderBottom: "1px solid var(--br)",
          background: "var(--s2)", flexShrink: 0,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>
            Responding to
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>{senderName}</span>
            {message?.subject && (
              <span style={{ fontSize: 11, color: "var(--t2)" }}>— {message.subject}</span>
            )}
          </div>
          <div style={{
            fontSize: 10, color: "var(--t3)", lineHeight: 1.6,
            maxHeight: 80, overflowY: "auto", whiteSpace: "pre-wrap",
            background: "var(--bg)", borderRadius: 6, padding: "8px 10px",
            border: "1px solid var(--br)",
          }}>
            {message?.body || message?.preview || "(no message body)"}
          </div>
        </div>

        {/* ── Controls ── */}
        <div style={{
          padding: "10px 18px", borderBottom: "1px solid var(--br)",
          display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flexShrink: 0,
        }}>
          <div style={{ fontSize: 10, color: "var(--t3)", marginRight: 4 }}>Sender role:</div>
          {["adjuster", "customer", "carrier", "TPA"].map(role => (
            <button key={role}
              className={`chip${senderRole === role ? " on" : ""}`}
              onClick={() => setSenderRole(role)}
              style={{ fontSize: 10, padding: "3px 10px", textTransform: "capitalize" }}>
              {role}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)" }}>
            {companyInfo.industry || "Restoration"} mode
          </div>
        </div>

        {/* ── Custom instructions ── */}
        <div style={{ padding: "8px 18px", borderBottom: "1px solid var(--br)", flexShrink: 0 }}>
          <input className="inp" placeholder="Additional instructions (optional) — e.g., 'Focus on O&P dispute', 'Keep it brief'…"
            value={customInstr} onChange={e => setCustomInstr(e.target.value)}
            style={{ width: "100%", fontSize: 11, height: 30 }}
            onKeyDown={e => { if (e.key === "Enter" && !loading) generate(); }}
          />
        </div>

        {/* ── Response area ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--t3)" }}>
              <div style={{
                width: 20, height: 20, border: "2px solid var(--br)",
                borderTopColor: "var(--acc)", borderRadius: "50%",
                animation: "jd-spin .7s linear infinite",
                margin: "0 auto 12px",
              }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)" }}>
                Analyzing communication & researching best practices…
              </div>
              <div style={{ fontSize: 10, marginTop: 4 }}>
                Referencing {companyInfo.industry === "Restoration" ? "IICRC standards, ReadyTraining protocols, and " : ""}project documentation
              </div>
            </div>
          )}

          {error && !loading && (
            <div style={{
              padding: "16px", borderRadius: 8, background: "rgba(228,53,49,.1)",
              border: "1px solid rgba(228,53,49,.3)", color: "var(--acc)",
              fontSize: 12, textAlign: "center",
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Generation failed</div>
              <div style={{ fontSize: 11 }}>{error}</div>
              <button className="btn btn-ghost btn-xs" onClick={generate} style={{ marginTop: 8, gap: 4 }}>
                {BotIc.refresh} Try again
              </button>
            </div>
          )}

          {coinWarning && !loading && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 10,
              background: "rgba(232,156,24,.1)", border: "1px solid rgba(232,156,24,.25)",
              fontSize: 11, color: "#e89c18", display: "flex", alignItems: "center", gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              {coinWarning}
            </div>
          )}

          {response && !loading && (
            <>
              {!editing ? (
                <div style={{
                  fontSize: 12, color: "var(--t1)", lineHeight: 1.7,
                  whiteSpace: "pre-wrap", background: "var(--bg)",
                  borderRadius: 8, padding: "16px 18px",
                  border: "1px solid var(--br)",
                }}>
                  {response}
                </div>
              ) : (
                <textarea ref={textRef} value={editText}
                  onChange={e => setEditText(e.target.value)}
                  style={{
                    width: "100%", minHeight: 300, fontSize: 12,
                    color: "var(--t1)", lineHeight: 1.7, background: "var(--bg)",
                    borderRadius: 8, padding: "16px 18px",
                    border: "1px solid var(--blue)", outline: "none",
                    fontFamily: "var(--font)", resize: "vertical",
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* ── Footer actions ── */}
        {response && !loading && (
          <div style={{
            padding: "12px 18px", borderTop: "1px solid var(--br)",
            display: "flex", gap: 8, alignItems: "center", flexShrink: 0,
          }}>
            <button className="btn btn-ghost btn-xs" onClick={() => { setEditing(!editing); }}
              style={{ gap: 4 }}>
              {BotIc.edit} {editing ? "Preview" : "Edit"}
            </button>
            <button className="btn btn-ghost btn-xs" onClick={copyToClipboard}
              style={{ gap: 4 }}>
              {BotIc.copy} {copied ? "Copied!" : "Copy"}
            </button>
            <button className="btn btn-ghost btn-xs" onClick={generate}
              style={{ gap: 4 }}>
              {BotIc.refresh} Regenerate
            </button>
            <div style={{ flex: 1 }} />
            {onInsertDraft && (
              <button className="btn btn-p btn-sm" onClick={handleInsert}
                style={{ gap: 5, fontSize: 11 }}>
                {BotIc.send} Use This Response
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
