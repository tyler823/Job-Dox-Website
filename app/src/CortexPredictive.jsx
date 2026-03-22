import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════
   Cortex Predictive AI Insight Cards
   ───────────────────────────────────────────────────────────────────
   Five named exports, each following a shared idle→loading→review→dismissed
   state machine. Coins are only deducted on Approve (not on Generate).
═══════════════════════════════════════════════════════════════════ */

const CARD_STYLE = { borderLeft: "3px solid var(--purple)", background: "var(--acc-lo)", borderRadius: 8, padding: "12px 14px", marginBottom: 12 };
const CONTENT_STYLE = { fontSize: 12, color: "var(--t1)", lineHeight: 1.6, marginTop: 8 };
const SPINNER = <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid var(--purple)", borderTopColor: "transparent", borderRadius: "50%", animation: "jd-spin .6s linear infinite", marginRight: 6 }} />;

async function generateAI(companyId, prompt, systemPrompt) {
  const res = await fetch("/.netlify/functions/cortex-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "copilot",
      skipDeduct: true,
      companyId,
      userId: "",
      messages: [{ role: "user", content: prompt }],
      systemPrompt: systemPrompt || "You are a restoration industry project management assistant. Be concise and professional.",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Generation failed");
  return json.content || "";
}

async function deductCoin(companyId) {
  await fetch("/.netlify/functions/cortex-coins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyId, action: "deduct", feature: "predictive", userId: "" }),
  });
  window.dispatchEvent(new CustomEvent("jd-ai-usage-updated"));
}

function stripFences(text) {
  return (text || "").replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
}

/* ── Shared Header ── */
function CardHeader({ label, loading, loadingMsg }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span className="lbl" style={{ color: "var(--purple)", margin: 0, fontSize: 9, letterSpacing: ".08em" }}>{label}</span>
      {loading && <>{SPINNER}<span style={{ fontSize: 10, color: "var(--t3)" }}>{loadingMsg}</span></>}
    </div>
  );
}

/* ── Shared Button Row ── */
function ActionRow({ onEdit, onApprove, onDismiss, editing, showApprove = true, showEdit = true }) {
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
      {showEdit && !editing && <button className="btn btn-xs btn-secondary" onClick={onEdit}>Edit</button>}
      {editing && <button className="btn btn-xs btn-secondary" onClick={onEdit}>Done Editing</button>}
      {showApprove && <button className="btn btn-xs" style={{ borderColor: "var(--purple)", color: "var(--purple)" }} onClick={onApprove}>Approve</button>}
      <button className="btn btn-xs btn-ghost" onClick={onDismiss}>Dismiss</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   1. NotesInsightCard
═══════════════════════════════════════════════════════════════════ */
export function NotesInsightCard({ projectId, companyId, dailyNotes = [], onAddNote }) {
  const [state, setState] = useState("idle");  // idle | loading | review | editing | dismissed | error
  const [content, setContent] = useState("");
  const [editText, setEditText] = useState("");

  if (!dailyNotes.length || state === "dismissed") return null;

  const generate = async () => {
    setState("loading");
    try {
      const prompt = `Here are the daily notes for a restoration project:\n${dailyNotes.map(n => `[${n.author || n.date || "Staff"}]: ${n.content || n.text || ""}`).join("\n")}\n\nWrite a 3–5 sentence executive summary of this project's progress. Write it in professional language suitable for sharing with an insurance adjuster. Do not use bullet points.`;
      const result = await generateAI(companyId, prompt);
      setContent(result);
      setEditText(result);
      setState("review");
    } catch {
      setState("error");
    }
  };

  const approve = async () => {
    await deductCoin(companyId);
    onAddNote(state === "editing" ? editText : content);
    setState("dismissed");
  };

  if (state === "idle") return (
    <div style={CARD_STYLE}>
      <CardHeader label="✦ NOTES SUMMARY" />
      <button className="btn btn-xs" style={{ marginTop: 8, borderColor: "var(--purple)", color: "var(--purple)" }} onClick={generate}>Generate Summary</button>
    </div>
  );

  if (state === "error") return (
    <div style={CARD_STYLE}>
      <CardHeader label="✦ NOTES SUMMARY" />
      <div style={{ fontSize: 11, color: "var(--acc)", marginTop: 6 }}>Generation failed — try again</div>
      <button className="btn btn-xs" style={{ marginTop: 6 }} onClick={() => setState("idle")}>Retry</button>
    </div>
  );

  return (
    <div style={CARD_STYLE}>
      <CardHeader label="✦ NOTES SUMMARY" loading={state === "loading"} loadingMsg="Analyzing notes…" />
      {state !== "loading" && (
        <>
          {state === "editing"
            ? <textarea className="txa" value={editText} onChange={e => setEditText(e.target.value)} style={{ marginTop: 8, minHeight: 80, fontSize: 12 }} />
            : <div style={CONTENT_STYLE}>{content}</div>}
          <ActionRow
            editing={state === "editing"}
            onEdit={() => setState(state === "editing" ? "review" : "editing")}
            onApprove={approve}
            onDismiss={() => setState("dismissed")}
          />
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   2. StatusSuggestionCard
═══════════════════════════════════════════════════════════════════ */
export function StatusSuggestionCard({ projectId, companyId, currentStatus, availableStatuses = [], completedTaskCount, totalTaskCount, dailyNotes = [], onApplyStatus }) {
  const [state, setState] = useState("idle");
  const [content, setContent] = useState("");
  const [editText, setEditText] = useState("");
  const [suggest, setSuggest] = useState(false);
  const suggestedRef = useRef("");

  if (state === "dismissed") return null;

  const generate = async () => {
    setState("loading");
    try {
      const prompt = `A restoration project is currently in status: "${currentStatus}".\nTask completion: ${completedTaskCount} of ${totalTaskCount} tasks done.\nRecent notes: ${dailyNotes.slice(-3).map(n => n.content || n.text || "").join(" | ")}\nAvailable statuses: ${availableStatuses.join(", ")}\n\nShould this project's status be advanced? Reply ONLY with valid JSON in this exact shape:\n{"suggest": true, "newStatus": "Status Name", "reason": "One sentence explanation."}\nor\n{"suggest": false, "reason": "One sentence explanation."}`;
      const raw = await generateAI(companyId, prompt);
      const cleaned = stripFences(raw);
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON");
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.suggest) {
        suggestedRef.current = parsed.newStatus;
        const display = `Advance to: ${parsed.newStatus}\n\n${parsed.reason}`;
        setContent(display);
        setEditText(display);
        setSuggest(true);
      } else {
        setContent(parsed.reason || "No status change recommended.");
        setSuggest(false);
      }
      setState("review");
    } catch {
      setState("error");
    }
  };

  const approve = async () => {
    await deductCoin(companyId);
    onApplyStatus(suggestedRef.current);
    setState("dismissed");
  };

  if (state === "idle") return (
    <div style={CARD_STYLE}>
      <CardHeader label="✦ STATUS CHECK" />
      <button className="btn btn-xs" style={{ marginTop: 8, borderColor: "var(--purple)", color: "var(--purple)" }} onClick={generate}>Check Status</button>
    </div>
  );

  if (state === "error") return (
    <div style={CARD_STYLE}>
      <CardHeader label="✦ STATUS CHECK" />
      <div style={{ fontSize: 11, color: "var(--acc)", marginTop: 6 }}>Generation failed — try again</div>
      <button className="btn btn-xs" style={{ marginTop: 6 }} onClick={() => setState("idle")}>Retry</button>
    </div>
  );

  return (
    <div style={CARD_STYLE}>
      <CardHeader label="✦ STATUS CHECK" loading={state === "loading"} loadingMsg="Reviewing project stage…" />
      {state !== "loading" && (
        <>
          {state === "editing"
            ? <textarea className="txa" value={editText} onChange={e => setEditText(e.target.value)} style={{ marginTop: 8, minHeight: 60, fontSize: 12 }} />
            : <div style={CONTENT_STYLE}>{content}</div>}
          <ActionRow
            editing={state === "editing"}
            showApprove={suggest}
            showEdit={suggest}
            onEdit={() => setState(state === "editing" ? "review" : "editing")}
            onApprove={approve}
            onDismiss={() => setState("dismissed")}
          />
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   3. TaskGapCard
═══════════════════════════════════════════════════════════════════ */
export function TaskGapCard({ projectId, companyId, workTypes = [], existingTasks = [], onAddTasks }) {
  const [state, setState] = useState("idle");
  const [tasks, setTasks] = useState([]);
  const [editText, setEditText] = useState("");

  if (state === "dismissed") return null;

  const generate = async () => {
    setState("loading");
    try {
      const prompt = `Restoration project work types: ${workTypes.join(", ")}\nTasks already in the project: ${existingTasks.join(", ")}\n\nList up to 5 important tasks that are commonly needed for these work types but appear to be missing from this project. Reply ONLY with valid JSON:\n{"tasks": ["Task title 1", "Task title 2"]}`;
      const raw = await generateAI(companyId, prompt);
      const cleaned = stripFences(raw);
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON");
      const parsed = JSON.parse(jsonMatch[0]);
      const list = parsed.tasks || [];
      setTasks(list);
      setEditText(list.join("\n"));
      setState("review");
    } catch {
      setState("error");
    }
  };

  const approve = async () => {
    await deductCoin(companyId);
    const final = (state === "editing" ? editText : tasks.join("\n"))
      .split("\n").map(l => l.trim()).filter(Boolean);
    onAddTasks(final);
    setState("dismissed");
  };

  if (state === "idle") return (
    <div style={CARD_STYLE}>
      <CardHeader label="✦ TASK GAPS" />
      <button className="btn btn-xs" style={{ marginTop: 8, borderColor: "var(--purple)", color: "var(--purple)" }} onClick={generate}>Find Missing Tasks</button>
    </div>
  );

  if (state === "error") return (
    <div style={CARD_STYLE}>
      <CardHeader label="✦ TASK GAPS" />
      <div style={{ fontSize: 11, color: "var(--acc)", marginTop: 6 }}>Generation failed — try again</div>
      <button className="btn btn-xs" style={{ marginTop: 6 }} onClick={() => setState("idle")}>Retry</button>
    </div>
  );

  return (
    <div style={CARD_STYLE}>
      <CardHeader label="✦ TASK GAPS" loading={state === "loading"} loadingMsg="Scanning for task gaps…" />
      {state !== "loading" && (
        <>
          {state === "editing"
            ? <textarea className="txa" value={editText} onChange={e => setEditText(e.target.value)} style={{ marginTop: 8, minHeight: 80, fontSize: 12 }} />
            : <div style={CONTENT_STYLE}>{tasks.map((t, i) => <div key={i}>{t}</div>)}</div>}
          <ActionRow
            editing={state === "editing"}
            onEdit={() => { if (state === "editing") { setTasks(editText.split("\n").filter(Boolean)); setState("review"); } else { setState("editing"); } }}
            onApprove={approve}
            onDismiss={() => setState("dismissed")}
          />
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   4. ScopePatternCard
═══════════════════════════════════════════════════════════════════ */
export function ScopePatternCard({ projectId, companyId, workTypes = [], existingLineItems = [], pinnedItems = [], onAddItems }) {
  const [state, setState] = useState("idle");
  const [items, setItems] = useState([]);
  const [editText, setEditText] = useState("");

  if (state === "dismissed") return null;

  const formatItem = (it) => `${it.description} — ${it.unit} @ $${it.unitPrice}`;

  const generate = async () => {
    setState("loading");
    try {
      const prompt = `Restoration project work types: ${workTypes.join(", ")}\nScope items already added: ${existingLineItems.join(", ")}\nAvailable price list items: ${JSON.stringify(pinnedItems.slice(0, 30))}\n\nSuggest up to 6 line items from the price list that are commonly needed for these work types but are not yet in the scope. Reply ONLY with valid JSON:\n{"items": [{"description": "...", "unit": "...", "unitPrice": 0}]}`;
      const raw = await generateAI(companyId, prompt);
      const cleaned = stripFences(raw);
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON");
      const parsed = JSON.parse(jsonMatch[0]);
      const list = parsed.items || [];
      setItems(list);
      setEditText(list.map(formatItem).join("\n"));
      setState("review");
    } catch {
      setState("error");
    }
  };

  const parseLines = (text) => {
    return text.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
      const m = line.match(/^(.+?)\s*—\s*(.+?)\s*@\s*\$?([\d.]+)/);
      if (m) return { description: m[1].trim(), unit: m[2].trim(), unitPrice: parseFloat(m[3]) || 0 };
      return null;
    }).filter(Boolean);
  };

  const approve = async () => {
    await deductCoin(companyId);
    const final = state === "editing" ? parseLines(editText) : items;
    onAddItems(final);
    setState("dismissed");
  };

  if (state === "idle") return (
    <div style={CARD_STYLE}>
      <CardHeader label="✦ SCOPE SUGGESTIONS" />
      <button className="btn btn-xs" style={{ marginTop: 8, borderColor: "var(--purple)", color: "var(--purple)" }} onClick={generate}>Suggest Scope Items</button>
    </div>
  );

  if (state === "error") return (
    <div style={CARD_STYLE}>
      <CardHeader label="✦ SCOPE SUGGESTIONS" />
      <div style={{ fontSize: 11, color: "var(--acc)", marginTop: 6 }}>Generation failed — try again</div>
      <button className="btn btn-xs" style={{ marginTop: 6 }} onClick={() => setState("idle")}>Retry</button>
    </div>
  );

  return (
    <div style={CARD_STYLE}>
      <CardHeader label="✦ SCOPE SUGGESTIONS" loading={state === "loading"} loadingMsg="Checking scope patterns…" />
      {state !== "loading" && (
        <>
          {state === "editing"
            ? <textarea className="txa" value={editText} onChange={e => setEditText(e.target.value)} style={{ marginTop: 8, minHeight: 80, fontSize: 12 }} />
            : <div style={CONTENT_STYLE}>{items.map((it, i) => <div key={i}>{formatItem(it)}</div>)}</div>}
          <ActionRow
            editing={state === "editing"}
            onEdit={() => { if (state === "editing") { setItems(parseLines(editText)); setState("review"); } else { setState("editing"); } }}
            onApprove={approve}
            onDismiss={() => setState("dismissed")}
          />
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   5. FollowUpCard
═══════════════════════════════════════════════════════════════════ */
const PULSE_STYLE_ID = "cortex-pulse-style";

export function FollowUpCard({ projectId, companyId, clientName, lastMessageDate, projectStatus, onUseDraft }) {
  const daysSince = lastMessageDate
    ? Math.floor((Date.now() - new Date(lastMessageDate).getTime()) / 86400000)
    : null;

  // Only render if no prior messages OR more than 5 days since last
  const shouldRender = lastMessageDate === null || lastMessageDate === undefined || (daysSince !== null && daysSince > 5);

  const [state, setState] = useState("idle"); // idle here means auto-loading on mount
  const [content, setContent] = useState("");
  const [editText, setEditText] = useState("");
  const styleInjected = useRef(false);

  // Inject pulse animation style once
  useEffect(() => {
    if (styleInjected.current) return;
    if (document.getElementById(PULSE_STYLE_ID)) { styleInjected.current = true; return; }
    const style = document.createElement("style");
    style.id = PULSE_STYLE_ID;
    style.textContent = "@keyframes cortex-pulse{0%,100%{opacity:.4}50%{opacity:.8}}";
    document.head.appendChild(style);
    styleInjected.current = true;
  }, []);

  // Auto-generate on mount
  useEffect(() => {
    if (!shouldRender || !companyId) return;
    let cancelled = false;
    setState("loading");
    const daysLabel = daysSince !== null ? daysSince : "unknown";
    const prompt = `Write a brief, professional 2–3 sentence follow-up SMS to a restoration client named ${clientName}.\nThe project is currently in "${projectStatus}" status.\nIt has been ${daysLabel} days since last contact.\nBe warm, professional, and reassuring. Do not use placeholders or brackets. Write the message as if ready to send.`;
    generateAI(companyId, prompt).then(result => {
      if (cancelled) return;
      setContent(result);
      setEditText(result);
      setState("review");
    }).catch(() => {
      if (!cancelled) setState("error");
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!shouldRender || state === "dismissed") return null;

  const headerLabel = daysSince !== null
    ? `✦ FOLLOW-UP SUGGESTION · ${daysSince}d since last message`
    : "✦ FOLLOW-UP SUGGESTION · No prior messages";

  const approve = async () => {
    await deductCoin(companyId);
    onUseDraft(state === "editing" ? editText : content);
    setState("dismissed");
  };

  if (state === "error") return (
    <div style={CARD_STYLE}>
      <CardHeader label={headerLabel} />
      <div style={{ fontSize: 11, color: "var(--acc)", marginTop: 6 }}>Generation failed — try again</div>
      <button className="btn btn-xs" style={{ marginTop: 6 }} onClick={() => setState("idle")}>Retry</button>
    </div>
  );

  if (state === "loading" || state === "idle") return (
    <div style={CARD_STYLE}>
      <CardHeader label={headerLabel} loading loadingMsg="Drafting follow-up…" />
      <div style={{ height: 40, borderRadius: 6, background: "var(--s3)", marginTop: 8, animation: "cortex-pulse 1.5s ease-in-out infinite" }} />
    </div>
  );

  return (
    <div style={CARD_STYLE}>
      <CardHeader label={headerLabel} />
      {state === "editing"
        ? <textarea className="txa" value={editText} onChange={e => setEditText(e.target.value)} style={{ marginTop: 8, minHeight: 60, fontSize: 12 }} />
        : <div style={CONTENT_STYLE}>{content}</div>}
      <ActionRow
        editing={state === "editing"}
        onEdit={() => setState(state === "editing" ? "review" : "editing")}
        onApprove={approve}
        onDismiss={() => setState("dismissed")}
      />
    </div>
  );
}
