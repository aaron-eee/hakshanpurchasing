"use client";
import React, { useState, useMemo } from "react";
import { Search, Warehouse, Package, MapPin, ArrowRight, Check, X, ChevronDown, ChevronRight, ArrowUpDown } from "lucide-react";
import { supabase } from "../lib/supabase";
import { C, serif, inp, Field, Badge, Btn, Empty, Head } from "./ui";
import { LOCATIONS, CATEGORIES } from "../lib/constants";

const todayISO = () => new Date().toISOString().slice(0, 10);

const SORTS = {
  newest: { label: "Newest 最新", fn: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
  category: { label: "Category 类别", fn: (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name) },
  location: { label: "Location 地点", fn: (a, b) => a.location.localeCompare(b.location) || a.name.localeCompare(b.name) },
  name: { label: "Name 名称", fn: (a, b) => a.name.localeCompare(b.name) },
  qty_desc: { label: "Quantity: high → low 库存多到少", fn: (a, b) => b.quantity - a.quantity },
  qty_asc: { label: "Quantity: low → high 库存少到多", fn: (a, b) => a.quantity - b.quantity },
};

export default function WarehouseTab({ warehouse, reload }) {
  const [takeFor, setTakeFor] = useState(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [loc, setLoc] = useState("All");
  const [sort, setSort] = useState("newest");

  const items = useMemo(() => {
    return warehouse
      .filter((w) => (cat === "All" || w.category === cat) && (loc === "All" || w.location === loc) && w.name.toLowerCase().includes(q.toLowerCase()))
      .sort(SORTS[sort].fn);
  }, [warehouse, cat, loc, q, sort]);

  const units = warehouse.reduce((n, w) => n + (+w.quantity || 0), 0);

  return (
    <div>
      <Head eyebrow="INVENTORY" en="Warehouse Stock" zh="仓库库存"
        right={<div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, letterSpacing: ".2em", color: C.sub }}>TOTAL</div>
          <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 600, color: C.text }}>{units} <span style={{ fontSize: 16, color: C.sub }}>units</span></div>
        </div>} />
      <p style={{ margin: "-8px 0 20px", color: C.sub, fontSize: 13.5 }}>Press <b style={{ color: C.text }}>Take Item</b> to send stock out — record the destination and the quantity drops automatically.</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: 11, color: C.subLt }} />
          <input style={{ ...inp, paddingLeft: 36 }} placeholder="Search items… 搜索" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select style={{ ...inp, width: "auto" }} value={cat} onChange={(e) => setCat(e.target.value)} title="Category"><option>All</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select style={{ ...inp, width: "auto" }} value={loc} onChange={(e) => setLoc(e.target.value)} title="Location"><option value="All">All locations</option>{LOCATIONS.map((l) => <option key={l}>{l}</option>)}</select>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: "0 10px" }}>
          <ArrowUpDown size={14} color={C.sub} />
          <select style={{ ...inp, width: "auto", border: "none", padding: "9px 4px", background: "transparent" }} value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {items.length === 0 && <Empty icon={Warehouse} en="Warehouse is empty" zh="确认并开箱后的物品会入库到这里" />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px,1fr))", gap: 18 }}>
        {items.map((w) => (
          <div key={w.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 2px 12px rgba(0,0,0,.03)" }}>
            {w.image_url ? <img src={w.image_url} alt="" style={{ width: "100%", height: 150, objectFit: "cover" }} />
              : <div style={{ height: 150, background: C.panel, display: "flex", alignItems: "center", justifyContent: "center" }}><Package size={36} color={C.subLt} /></div>}
            <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ marginBottom: 6 }}><Badge tone="gold">{w.category}</Badge></div>
              <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 20, color: C.text }}>{w.name}</div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}><MapPin size={11} style={{ verticalAlign: -1 }} /> {w.location}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7, margin: "12px 0" }}>
                <span style={{ fontFamily: serif, fontSize: 40, fontWeight: 700, color: w.quantity <= 0 ? "#9c5548" : C.text, lineHeight: 1 }}>{w.quantity}</span>
                <span style={{ fontSize: 12, color: C.sub }}>in stock 库存</span>
              </div>
              <div style={{ marginTop: "auto" }}>
                <Btn size="sm" variant="primary" onClick={() => setTakeFor(w)} disabled={w.quantity <= 0} style={{ width: "100%" }}><ArrowRight size={14} /> Take Item 出库</Btn>
              </div>
              {(w.take_log?.length || 0) > 0 && <TakeLog log={w.take_log} />}
            </div>
          </div>
        ))}
      </div>

      {takeFor && <TakeModal item={takeFor} onClose={() => setTakeFor(null)} reload={reload} />}
    </div>
  );
}

function TakeLog({ log }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 12, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12, color: C.sub, padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />} History ({log.length}) 出库记录
      </button>
      {open && <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
        {log.map((l) => <div key={l.id} style={{ fontSize: 12, color: C.text, display: "flex", justifyContent: "space-between" }}>
          <span>−{l.qty} → {l.destination}{l.note ? ` (${l.note})` : ""}</span><span style={{ color: C.subLt }}>{l.taken_on}</span></div>)}
      </div>}
    </div>
  );
}

function TakeModal({ item, onClose, reload }) {
  const [qty, setQty] = useState(1);
  const [to, setTo] = useState(LOCATIONS[0]);
  const [note, setNote] = useState("");
  const max = item.quantity;
  const submit = async () => {
    const n = Math.min(Math.max(1, +qty || 1), max);
    await supabase.from("take_log").insert({ warehouse_id: item.id, qty: n, destination: to, note });
    await supabase.from("warehouse").update({ quantity: max - n }).eq("id", item.id);
    reload();
    onClose();
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,21,18,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 26, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontFamily: serif, fontSize: 24, fontWeight: 600, color: C.text }}>Take Item <span style={{ color: C.gold, fontSize: 17 }}>出库</span></h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer" }}><X size={19} color={C.sub} /></button>
        </div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>{item.name} · {max} available</div>
        <Field label="Quantity to send 出库数量"><input style={inp} type="number" min="1" max={max} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></Field>
        <Field label="Send To 送往"><select style={inp} value={to} onChange={(e) => setTo(e.target.value)}>{LOCATIONS.map((l) => <option key={l}>{l}</option>)}</select></Field>
        <Field label="Note (optional) 备注"><input style={inp} value={note} onChange={(e) => setNote(e.target.value)} placeholder="who / purpose" /></Field>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
          <Btn variant="gold" onClick={submit} style={{ flex: 1 }}><Check size={15} /> Confirm 确认出库</Btn>
        </div>
      </div>
    </div>
  );
}
