"use client";
import React, { useState } from "react";
import { Search, Warehouse, Package, MapPin, ArrowRight, Check, X, ChevronDown, ChevronRight, ArrowUpDown, Trash2, Plus, Pencil, PackagePlus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { C, serif, inp, Field, Badge, Btn, Empty, Head, fmtMoney } from "./ui";
import ImageInput from "./ImageInput";
import { CATEGORIES } from "../lib/constants";

const todayISO = () => new Date().toISOString().slice(0, 10);

// Compute reserve / incoming info for a warehouse item from the bulk-order tables.
function bulkInfo(w, bulk) {
  const b = bulk || { orders: [], items: [], allocs: [] };
  const orderById = Object.fromEntries((b.orders || []).map((o) => [o.id, o]));
  const its = (b.items || []).filter((i) => i.warehouse_id === w.id);
  const reserves = [], incoming = [];
  let freeTotal = 0;
  its.forEach((it) => {
    const o = orderById[it.order_id];
    if (!o) return;
    const active = o.status === "confirmed" || o.status === "paid";
    const allocs = (b.allocs || []).filter((a) => a.item_id === it.id);
    const reservedQty = allocs.reduce((s, a) => s + Number(a.qty || 0), 0);
    if (active) {
      allocs.forEach((a) => {
        const rem = Number(a.qty || 0) - Number(a.qty_taken || 0);
        if (rem > 0) reserves.push({ store: a.store_name || "Store", rem, allocId: a.id, order: o.name, taken: Number(a.qty_taken || 0), qty: Number(a.qty || 0) });
      });
      const free = Number(it.qty_ordered || 0) - reservedQty;
      if (free > 0) freeTotal += free;
    }
    if (o.status === "paid") {
      const inc = Number(it.qty_ordered || 0) - Number(it.qty_arrived || 0);
      if (inc > 0) incoming.push({ order: o.name, itemId: it.id, rem: inc, arrived: Number(it.qty_arrived || 0), ordered: Number(it.qty_ordered || 0) });
    }
  });
  return { reserves, incoming, freeTotal, hasAny: reserves.length > 0 || incoming.length > 0 || freeTotal > 0 };
}

const SORTS = {
  newest: "Newest 最新",
  category: "Group by Category 按类别分组",
  location: "Group by Location 按地点分组",
  name: "Name 名称",
  qty_desc: "Qty high→low 库存多到少",
  qty_asc: "Qty low→high 库存少到多",
};

export default function WarehouseTab({ warehouse, reload, locations, bulk }) {
  const [takeFor, setTakeFor] = useState(null);
  const [stockFor, setStockFor] = useState(null);
  const [delFor, setDelFor] = useState(null);
  const [editFor, setEditFor] = useState(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [loc, setLoc] = useState("All");
  const [sort, setSort] = useState("newest");

  let items = warehouse.filter((w) => (cat === "All" || w.category === cat) && (loc === "All" || w.location === loc) && w.name.toLowerCase().includes(q.toLowerCase()));

  const grouped = sort === "location" || sort === "category";
  const groupKey = sort === "location" ? "location" : "category";
  const groupOrder = sort === "location" ? locations : CATEGORIES;

  if (!grouped) {
    items = [...items].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "qty_desc") return b.quantity - a.quantity;
      if (sort === "qty_asc") return a.quantity - b.quantity;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }

  let groups = [];
  if (grouped) {
    const map = {};
    items.forEach((w) => { const k = w[groupKey] || "Other"; (map[k] = map[k] || []).push(w); });
    const keys = [...groupOrder.filter((k) => map[k]), ...Object.keys(map).filter((k) => !groupOrder.includes(k))];
    groups = keys.map((k) => ({ title: k, items: map[k].sort((a, b) => a.name.localeCompare(b.name)) }));
  }

  const units = warehouse.reduce((n, w) => n + (+w.quantity || 0), 0);
  const totalValue = warehouse.reduce((n, w) => n + (+w.quantity || 0) * (+w.unit_price || 0), 0);
  const cardGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px,1fr))", gap: 18 };

  const del = async () => {
    await supabase.from("warehouse").delete().eq("id", delFor.id);
    setDelFor(null);
    reload();
  };

  return (
    <div>
      <Head eyebrow="INVENTORY" en="Warehouse Stock" zh="仓库库存"
        right={<div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, letterSpacing: ".2em", color: C.sub }}>TOTAL VALUE 总价值</div>
            <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 600, color: C.text }}>{fmtMoney(totalValue)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, letterSpacing: ".2em", color: C.sub }}>UNITS 数量</div>
            <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 600, color: C.text }}>{units}</div>
          </div>
          <Btn variant="gold" onClick={() => setAdding(true)}><Plus size={16} /> Add Item</Btn>
        </div>} />
      <p style={{ margin: "-8px 0 20px", color: C.sub, fontSize: 13.5 }}>Press <b style={{ color: C.text }}>Take Item</b> to send stock out — record the destination and the quantity drops automatically.</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: 11, color: C.subLt }} />
          <input style={{ ...inp, paddingLeft: 36 }} placeholder="Search items… 搜索" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select style={{ ...inp, width: "auto" }} value={cat} onChange={(e) => setCat(e.target.value)} title="Category"><option>All</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select style={{ ...inp, width: "auto" }} value={loc} onChange={(e) => setLoc(e.target.value)} title="Location"><option value="All">All locations</option>{locations.map((l) => <option key={l}>{l}</option>)}</select>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: "0 10px" }}>
          <ArrowUpDown size={14} color={C.sub} />
          <select style={{ ...inp, width: "auto", border: "none", padding: "9px 4px", background: "transparent" }} value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {items.length === 0 && <Empty icon={Warehouse} en="Warehouse is empty" zh="确认并开箱后的物品会入库到这里，或按 Add Item 手动添加" />}

      {grouped ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
          {groups.map((g) => {
            const gUnits = g.items.reduce((n, w) => n + (+w.quantity || 0), 0);
            const gValue = g.items.reduce((n, w) => n + (+w.quantity || 0) * (+w.unit_price || 0), 0);
            return (
              <div key={g.title}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {sort === "location" ? <MapPin size={18} color={C.gold} /> : <Package size={18} color={C.gold} />}
                    <h2 style={{ margin: 0, fontFamily: serif, fontSize: 26, fontWeight: 600, color: C.text }}>{g.title}</h2>
                  </div>
                  <Badge tone="gold">{g.items.length} item{g.items.length !== 1 ? "s" : ""} · {gUnits} units · {fmtMoney(gValue)}</Badge>
                  <div style={{ flex: 1, height: 1, background: C.line }} />
                </div>
                <div style={cardGrid}>
                  {g.items.map((w) => <StockCard key={w.id} w={w} info={bulkInfo(w, bulk)} onTake={() => setTakeFor(w)} onDelete={() => setDelFor(w)} onEdit={() => setEditFor(w)} onAddStock={() => setStockFor(w)} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={cardGrid}>
          {items.map((w) => <StockCard key={w.id} w={w} info={bulkInfo(w, bulk)} onTake={() => setTakeFor(w)} onDelete={() => setDelFor(w)} onEdit={() => setEditFor(w)} onAddStock={() => setStockFor(w)} />)}
        </div>
      )}

      {takeFor && <TakeModal item={takeFor} info={bulkInfo(takeFor, bulk)} onClose={() => setTakeFor(null)} reload={reload} locations={locations} />}
      {stockFor && <AddStockModal item={stockFor} info={bulkInfo(stockFor, bulk)} onClose={() => setStockFor(null)} reload={reload} />}
      {adding && <ItemFormModal mode="add" onClose={() => setAdding(false)} reload={reload} locations={locations} />}
      {editFor && <ItemFormModal mode="edit" item={editFor} onClose={() => setEditFor(null)} reload={reload} locations={locations} />}
      {delFor && <ConfirmModal
        title="Delete from warehouse 从仓库删除"
        message={`Delete "${delFor.name}" (${delFor.quantity} in stock) permanently? This also removes its take-out history.`}
        onCancel={() => setDelFor(null)} onConfirm={del} />}
    </div>
  );
}

function StockCard({ w, onTake, onDelete, onEdit, onAddStock, info }) {
  const total = (+w.quantity || 0) * (+w.unit_price || 0);
  const bi = info || { reserves: [], incoming: [], freeTotal: 0, hasAny: false };
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 2px 12px rgba(0,0,0,.03)" }}>
      {w.image_url ? <img src={w.image_url} alt="" style={{ width: "100%", height: 150, objectFit: "cover" }} />
        : <div style={{ height: 150, background: C.panel, display: "flex", alignItems: "center", justifyContent: "center" }}><Package size={36} color={C.subLt} /></div>}
      <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <Badge tone="gold">{w.category}</Badge>
          <button onClick={onEdit} title="Edit" style={{ border: "none", background: "none", cursor: "pointer", color: C.sub, display: "flex", alignItems: "center", padding: 2 }}><Pencil size={15} /></button>
        </div>
        <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 20, color: C.text }}>{w.name}</div>
        <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}><MapPin size={11} style={{ verticalAlign: -1 }} /> {w.location}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7, margin: "12px 0 6px" }}>
          <span style={{ fontFamily: serif, fontSize: 40, fontWeight: 700, color: w.quantity <= 0 ? "#9c5548" : C.text, lineHeight: 1 }}>{w.quantity}</span>
          <span style={{ fontSize: 12, color: C.sub }}>in stock 库存</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.sub, marginBottom: 12, paddingTop: 8, borderTop: `1px solid ${C.line}` }}>
          <span>Unit 单价 <b style={{ color: C.text }}>{fmtMoney(w.unit_price)}</b></span>
          <span>Total 总价值 <b style={{ color: C.goldDk }}>{fmtMoney(total)}</b></span>
        </div>

        {bi.hasAny && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
            {bi.incoming.map((inc, i) => (
              <div key={"inc" + i} style={{ fontSize: 11.5, fontWeight: 600, color: "#7a5a1f", background: "#faf1dc", border: "1px solid #ecd9ab", borderRadius: 8, padding: "5px 9px" }}>
                📦 {inc.rem} incoming · from {inc.order}
              </div>
            ))}
            {bi.reserves.map((r, i) => (
              <div key={"res" + i} style={{ fontSize: 11.5, fontWeight: 600, color: "#4a6b47", background: "#eef5ec", border: "1px solid #cfe3ca", borderRadius: 8, padding: "5px 9px" }}>
                🔖 {r.rem} reserved → {r.store}{r.taken > 0 ? ` (${r.taken} taken)` : ""}
              </div>
            ))}
            {bi.freeTotal > 0 && (
              <div style={{ fontSize: 11.5, fontWeight: 600, color: C.sub, background: C.panel, borderRadius: 8, padding: "5px 9px" }}>
                {bi.freeTotal} ordered, not yet reserved
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
          <Btn size="sm" variant="primary" onClick={onTake} disabled={w.quantity <= 0} style={{ flex: 1 }}><ArrowRight size={14} /> Take Item 出库</Btn>
          <Btn size="sm" variant="gold" onClick={onAddStock} style={{ padding: "6px 10px" }} title="Stock Arrived 到货"><PackagePlus size={14} /></Btn>
          <Btn size="sm" variant="danger" onClick={onDelete} style={{ padding: "6px 10px" }}><Trash2 size={14} /></Btn>
        </div>
        {(w.take_log?.length || 0) > 0 && <TakeLog log={w.take_log} />}
      </div>
    </div>
  );
}

function TakeLog({ log }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 12, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12, color: C.sub, padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />} History ({log.length}) 出入库记录
      </button>
      {open && <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
        {log.map((l) => {
          const isIn = l.kind === "in";
          return (
            <div key={l.id} style={{ fontSize: 12, color: C.text, display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: isIn ? "#4a6b47" : C.text }}>
                {isIn ? `+${l.qty} 到货` : `−${l.qty} → ${l.destination}`}{l.note ? ` (${l.note})` : ""}
              </span>
              <span style={{ color: C.subLt }}>{l.taken_on}</span>
            </div>
          );
        })}
      </div>}
    </div>
  );
}

function ItemFormModal({ mode, item, onClose, reload, locations }) {
  const [name, setName] = useState(item?.name || "");
  const [category, setCategory] = useState(item?.category || CATEGORIES[0]);
  const [quantity, setQuantity] = useState(item?.quantity ?? 1);
  const [unitPrice, setUnitPrice] = useState(item?.unit_price ?? "");
  const [location, setLocation] = useState(item?.location || locations[0]);
  const [image, setImage] = useState(item?.image_url || "");
  const [busy, setBusy] = useState(false);

  const canSave = name.trim() && quantity !== "" && location;

  const save = async () => {
    if (!canSave) { alert("Please fill in name, quantity and location."); return; }
    setBusy(true);
    const payload = {
      name: name.trim(), category, quantity: Number(quantity) || 0,
      unit_price: unitPrice === "" ? null : Number(unitPrice),
      location, image_url: image || null,
    };
    let error;
    if (mode === "add") {
      ({ error } = await supabase.from("warehouse").insert({ ...payload, stocked_on: todayISO() }));
    } else {
      ({ error } = await supabase.from("warehouse").update(payload).eq("id", item.id));
    }
    setBusy(false);
    if (error) { alert("Save failed: " + error.message); return; }
    reload();
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,21,18,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 26, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,.25)", margin: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontFamily: serif, fontSize: 24, fontWeight: 600, color: C.text }}>{mode === "add" ? "Add Item" : "Edit Item"} <span style={{ color: C.gold, fontSize: 17 }}>{mode === "add" ? "添加物品" : "编辑物品"}</span></h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer" }}><X size={19} color={C.sub} /></button>
        </div>
        <Field label="Name 名称"><input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wooden Chair" autoFocus /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Category 类别"><select style={inp} value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Location 地点"><select style={inp} value={location} onChange={(e) => setLocation(e.target.value)}>{locations.map((l) => <option key={l}>{l}</option>)}</select></Field>
          <Field label="Quantity 数量"><input style={inp} type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></Field>
          <Field label="Unit Price (RM) 单价"><input style={inp} type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0.00" /></Field>
        </div>
        <Field label="Photo 照片"><ImageInput value={image} onChange={setImage} height={150} /></Field>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel 取消</Btn>
          <Btn variant="gold" onClick={save} disabled={busy || !canSave} style={{ flex: 1 }}><Check size={15} /> {mode === "add" ? "Add 添加" : "Save 保存"}</Btn>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, onCancel, onConfirm }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(26,21,18,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 26, width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: "#f3e0dc", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Trash2 size={18} color="#9c5548" /></div>
          <h3 style={{ margin: 0, fontFamily: serif, fontSize: 22, fontWeight: 600, color: C.text }}>{title}</h3>
        </div>
        <div style={{ fontSize: 14, color: C.sub, marginBottom: 20, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="ghost" onClick={onCancel} style={{ flex: 1 }}>Cancel 取消</Btn>
          <Btn onClick={onConfirm} style={{ flex: 1, background: "#9c5548", color: "#fff" }}><Trash2 size={14} /> Delete 删除</Btn>
        </div>
      </div>
    </div>
  );
}

function TakeModal({ item, onClose, reload, locations, info }) {
  const reserves = (info && info.reserves) || [];
  const [qty, setQty] = useState(1);
  const [dest, setDest] = useState(reserves.length ? "res:" + reserves[0].allocId : (locations[0] || ""));
  const [note, setNote] = useState("");
  const max = item.quantity;
  const res = dest.startsWith("res:") ? reserves.find((r) => "res:" + r.allocId === dest) : null;
  const submit = async () => {
    const n = Math.min(Math.max(1, +qty || 1), max);
    const destName = res ? res.store : dest;
    const noteFull = res ? (note ? note + " · " : "") + "reserved for " + res.store + " · " + res.order : note;
    await supabase.from("take_log").insert({ warehouse_id: item.id, qty: n, destination: destName, note: noteFull });
    await supabase.from("warehouse").update({ quantity: max - n }).eq("id", item.id);
    if (res) {
      const newTaken = Math.min(res.qty, res.taken + n);
      await supabase.from("bulk_order_allocations").update({ qty_taken: newTaken }).eq("id", res.allocId);
    }
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
        <Field label="Send To 送往">
          <select style={inp} value={dest} onChange={(e) => setDest(e.target.value)}>
            {reserves.length > 0 && (
              <optgroup label="Reserved store 预留的店">
                {reserves.map((r) => <option key={r.allocId} value={"res:" + r.allocId}>🔖 {r.store} · {r.rem} reserved ({r.order})</option>)}
              </optgroup>
            )}
            <optgroup label="Location 地点">
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </optgroup>
          </select>
        </Field>
        {res && <div style={{ fontSize: 12, color: "#4a6b47", marginTop: -6, marginBottom: 10 }}>This clears the reservation for {res.store} as you send it out.</div>}
        <Field label="Note (optional) 备注"><input style={inp} value={note} onChange={(e) => setNote(e.target.value)} placeholder="who / purpose" /></Field>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
          <Btn variant="gold" onClick={submit} style={{ flex: 1 }}><Check size={15} /> Confirm 确认出库</Btn>
        </div>
      </div>
    </div>
  );
}


function AddStockModal({ item, onClose, reload, info }) {
  const incoming = (info && info.incoming) || [];
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [fromId, setFromId] = useState(incoming.length ? incoming[0].itemId : "");
  const [busy, setBusy] = useState(false);
  const from = incoming.find((i) => i.itemId === fromId);
  const submit = async () => {
    const n = Math.max(1, +qty || 1);
    setBusy(true);
    const noteFull = from ? (note ? note + " · " : "") + "from " + from.order : note;
    await supabase.from("take_log").insert({ warehouse_id: item.id, qty: n, destination: from ? "到货 · " + from.order : "到货 Stock Arrived", note: noteFull, kind: "in" });
    await supabase.from("warehouse").update({ quantity: (item.quantity || 0) + n }).eq("id", item.id);
    if (from) {
      const newArrived = Math.min(from.ordered, from.arrived + n);
      await supabase.from("bulk_order_items").update({ qty_arrived: newArrived }).eq("id", from.itemId);
    }
    setBusy(false);
    reload();
    onClose();
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,21,18,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 26, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontFamily: serif, fontSize: 24, fontWeight: 600, color: C.text }}>Stock Arrived <span style={{ color: C.gold, fontSize: 17 }}>到货</span></h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer" }}><X size={19} color={C.sub} /></button>
        </div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>{item.name} · currently {item.quantity} in stock</div>
        {incoming.length > 0 && (
          <Field label="From a bulk order? 是否来自某个订单">
            <select style={inp} value={fromId} onChange={(e) => setFromId(e.target.value)}>
              {incoming.map((i) => <option key={i.itemId} value={i.itemId}>From {i.order} · {i.rem} still incoming</option>)}
              <option value="">Not from a bulk order 不是</option>
            </select>
          </Field>
        )}
        <Field label="Quantity to add 增加数量"><input style={inp} type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></Field>
        <Field label="Note (optional) 备注"><input style={inp} value={note} onChange={(e) => setNote(e.target.value)} placeholder="new batch / supplier…" /></Field>
        <div style={{ fontSize: 13, color: C.goldDk, marginBottom: 8 }}>New total 新库存: <b>{(item.quantity || 0) + (+qty || 0)}</b></div>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
          <Btn variant="gold" onClick={submit} disabled={busy} style={{ flex: 1 }}><Check size={15} /> Confirm 确认到货</Btn>
        </div>
      </div>
    </div>
  );
}
