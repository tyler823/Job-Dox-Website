/* ══════════════════════════════════════════════════════════════════
   DRYDOX SCOPE — Live Scope Line Items from Pricelist
   - Add scope items in real-time from uploaded pricelist
   - Search/filter pricelist items
   - Quantity / unit editing inline
   - Push to project Scope/Invoice tab
══════════════════════════════════════════════════════════════════ */
import { useState, useMemo } from "react";
import { dduid, DDIc, fmt$c } from "./DryDoxConstants.jsx";

export default function DryDoxScope({
  scopeItems, setScopeItems, priceLists = [], activePLId, onPushToScope,
}) {
  const [search, setSearch] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);
  const [customF, setCustomF] = useState({ desc: "", unit: "EA", qty: "1", price: "" });
  const [pushStatus, setPushStatus] = useState(null);

  const currentPL = priceLists.find(pl => pl.id === activePLId);

  // Filter pricelist items by search
  const plItems = useMemo(() => {
    if (!currentPL) return [];
    if (!search) return currentPL.items || [];
    const s = search.toLowerCase();
    return (currentPL.items || []).filter(i =>
      i.desc?.toLowerCase().includes(s) ||
      i.code?.toLowerCase().includes(s)
    );
  }, [currentPL, search]);

  // Scope totals
  const scopeTotal = scopeItems.reduce((sum, i) => sum + (i.qty || 1) * (i.price || 0), 0);

  // Add pricelist item to scope
  const addPLItem = (plItem) => {
    const existing = scopeItems.find(s => s.plItemId === plItem.id);
    if (existing) {
      // Increment quantity
      setScopeItems(prev => prev.map(s =>
        s.id === existing.id ? { ...s, qty: (s.qty || 1) + 1 } : s
      ));
    } else {
      setScopeItems(prev => [...prev, {
        id: dduid(),
        plItemId: plItem.id,
        code: plItem.code,
        desc: plItem.desc,
        unit: plItem.unit,
        qty: 1,
        price: plItem.price,
        source: "drydox",
      }]);
    }
  };

  // Add custom line item
  const addCustom = () => {
    if (!customF.desc.trim()) return;
    setScopeItems(prev => [...prev, {
      id: dduid(),
      desc: customF.desc.trim(),
      unit: customF.unit,
      qty: parseFloat(customF.qty) || 1,
      price: parseFloat(customF.price) || 0,
      source: "drydox",
    }]);
    setCustomF({ desc: "", unit: "EA", qty: "1", price: "" });
    setAddingCustom(false);
  };

  // Update scope item inline
  const updateItem = (itemId, key, value) => {
    setScopeItems(prev => prev.map(s =>
      s.id === itemId ? { ...s, [key]: value } : s
    ));
  };

  // Remove scope item
  const removeItem = (itemId) => {
    setScopeItems(prev => prev.filter(s => s.id !== itemId));
  };

  // Push all DryDox scope items to project scope
  const pushAll = () => {
    if (!onPushToScope) return;
    const items = scopeItems.filter(i => i.source === "drydox");
    if (items.length === 0) {
      setPushStatus("No DryDox scope items to push.");
      setTimeout(() => setPushStatus(null), 3000);
      return;
    }
    onPushToScope(items);
    setPushStatus(`Pushed ${items.length} items to Scope/Invoice`);
    setTimeout(() => setPushStatus(null), 4000);
  };

  return (
    <div>
      {/* Header with push button */}
      <div className="dd-sec-row">
        <div>
          <div className="dd-sec" style={{ marginBottom: 2 }}>Scope Line Items</div>
          <div style={{ fontSize: 10, color: "var(--t3)" }}>
            {currentPL ? `Price list: ${currentPL.name}` : "No price list selected — select one above"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-xs" onClick={() => setAddingCustom(true)}>
            {DDIc.plus} Custom Item
          </button>
          {onPushToScope && (
            <button className="btn btn-primary btn-xs" onClick={pushAll}>
              {DDIc.scope} Push to Scope
            </button>
          )}
        </div>
      </div>

      {pushStatus && (
        <div style={{
          background: pushStatus.startsWith("Pushed") ? "rgba(26,217,138,.1)" : "rgba(232,156,24,.1)",
          border: `1px solid ${pushStatus.startsWith("Pushed") ? "rgba(26,217,138,.25)" : "rgba(232,156,24,.25)"}`,
          borderRadius: 8, padding: "8px 12px", fontSize: 11, fontWeight: 700,
          color: pushStatus.startsWith("Pushed") ? "var(--green)" : "var(--amber)", marginBottom: 10,
        }}>
          {pushStatus}
        </div>
      )}

      {/* Current scope items */}
      {scopeItems.length > 0 && (
        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{
          background: "var(--s2)", border: "1px solid var(--br)", borderRadius: 10,
          overflow: "hidden", marginBottom: 14,
        }}>
          {/* Header */}
          <div className="dd-scope-row" style={{ background: "var(--s1)", borderBottom: "1px solid var(--br)" }}>
            <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", textTransform: "uppercase" }}>Description</div>
            <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", textTransform: "uppercase" }}>Qty</div>
            <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", textTransform: "uppercase" }}>Unit</div>
            <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", textTransform: "uppercase" }}>Total</div>
            <div />
          </div>

          {scopeItems.map(item => (
            <div key={item.id} className="dd-scope-row">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.desc}
                </div>
                {item.code && (
                  <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)" }}>{item.code}</div>
                )}
              </div>
              <input type="number" className="inp" value={item.qty}
                onChange={e => updateItem(item.id, "qty", parseFloat(e.target.value) || 0)}
                style={{ width: "100%", height: 28, fontSize: 11, textAlign: "center", padding: "4px" }}
                inputMode="decimal" />
              <div style={{ fontSize: 10, color: "var(--t2)" }}>
                {item.unit} @ {fmt$c(item.price)}
              </div>
              <div style={{ fontSize: 11, fontFamily: "var(--mono)", fontWeight: 700, color: "var(--amber)" }}>
                {fmt$c((item.qty || 1) * (item.price || 0))}
              </div>
              <button className="btn btn-danger btn-xs" style={{ padding: "2px 4px" }}
                onClick={() => removeItem(item.id)}>{DDIc.trash}</button>
            </div>
          ))}

          {/* Total */}
          <div className="dd-scope-row" style={{ background: "var(--s1)", borderTop: "2px solid var(--br)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t1)" }}>Scope Total</div>
            <div /><div />
            <div style={{ fontSize: 14, fontFamily: "var(--mono)", fontWeight: 700, color: "var(--green)" }}>
              {fmt$c(scopeTotal)}
            </div>
            <div />
          </div>
        </div>
        </div>
      )}

      {/* Custom item form */}
      {addingCustom && (
        <div className="dd-card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t1)", marginBottom: 8 }}>Custom Line Item</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 80px", gap: 6, marginBottom: 8 }}>
            <input className="inp" value={customF.desc} onChange={e => setCustomF(p => ({ ...p, desc: e.target.value }))}
              placeholder="Description" style={{ height: 32, fontSize: 12 }} />
            <input className="inp" type="number" value={customF.qty} onChange={e => setCustomF(p => ({ ...p, qty: e.target.value }))}
              placeholder="Qty" style={{ height: 32, fontSize: 12, textAlign: "center" }} inputMode="decimal" />
            <select className="sel" value={customF.unit} onChange={e => setCustomF(p => ({ ...p, unit: e.target.value }))}
              style={{ height: 32, fontSize: 10, padding: "4px" }}>
              {["EA", "SF", "LF", "day", "HR", "LS"].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <input className="inp" type="number" value={customF.price} onChange={e => setCustomF(p => ({ ...p, price: e.target.value }))}
              placeholder="$ Price" style={{ height: 32, fontSize: 12, textAlign: "center" }} inputMode="decimal" />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <button className="btn btn-ghost btn-xs" onClick={() => setAddingCustom(false)}>Cancel</button>
            <button className="btn btn-primary btn-xs" onClick={addCustom}>Add</button>
          </div>
        </div>
      )}

      {/* Pricelist browser */}
      {currentPL && (
        <>
          <div className="dd-sec" style={{ marginTop: 4 }}>Add from Price List</div>
          <input className="inp" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search price list items..." style={{ marginBottom: 8, height: 34, fontSize: 12 }} />
          <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid var(--br)", borderRadius: 8 }}>
            {plItems.map(item => {
              const inScope = scopeItems.some(s => s.plItemId === item.id);
              return (
                <div key={item.id} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                  borderBottom: "1px solid var(--br)", cursor: "pointer",
                  background: inScope ? "rgba(26,217,138,.04)" : undefined,
                }}
                  onClick={() => addPLItem(item)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)" }}>{item.desc}</div>
                    <div style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)", marginTop: 1 }}>
                      {item.code} · ${item.price}/{item.unit}
                    </div>
                  </div>
                  {inScope ? (
                    <span style={{ fontSize: 9, color: "var(--green)", fontWeight: 700 }}>ADDED</span>
                  ) : (
                    <span style={{ color: "var(--blue)", fontSize: 12 }}>{DDIc.plus}</span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
