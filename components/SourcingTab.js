"use client";
import React, { useState } from "react";
import {
  Search, Plus, Trash2, Check, Clock, ShoppingCart, ChevronRight, ChevronDown, X, Minus, ShieldCheck, ExternalLink,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { C, serif, inp, Field, Badge, Btn, Empty, Head, fmtMoney } from "./ui";
import ImageInput from "./ImageInput";
import { CATEGORIES, daysBetween } from "../lib/constants";

const NOTIFY_EMAIL = "puitenglee1995@gmail.com";
const todayISO = () => new Date().toISOString().slice(0, 10);

function statusMeta(s) {
  return {
    sourcing: ["Sourcing · 寻源中", "gray"],
    purchased: ["Purchased · 待到货", "amber"],
    received: ["Received · 待开箱验收", "gold"],
    in_warehouse: ["In Warehouse · 已入库", "green"],
  }[s] || ["", "gray"];
}

export default function SourcingTab({ items, reload, locations }) {
  const [expanded, setExpanded] = useState(items[0]?.id);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [cat, setCat] = useState(CATEGORIES[0]);

  const active = items.filter((it) => it.status !== "in_warehouse");

  const add = async () => {
    if (!name.trim()) return;
    const { data } = await supabase.from("items").insert({ name: name.trim(), category: cat, status: "sourcing" }).select().single();
    setName(""); setShowNew(false);
    if (data) setExpanded(data.id);
    reload();
  };

  return (
    <div>
      <Head eyebrow="PROJECT SOURCING" en="Items to Source" zh="采购寻源"
        right={<Btn variant="gold" onClick={() => setShowNew((v) => !v)}><Plus size={16} /> New Item</Btn>} />

      {showNew && (
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,.03)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 14, alignItems: "end" }}>
            <Field label="Item Name 物品名称"><input style={inp} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Artificial Plant" onKeyDown={(e) => e.key === "Enter" && add()} /></Field>
            <Field label="Category 类别"><select style={inp} value={cat} onChange={(e) => setCat(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Btn variant="primary" onClick={add} style={{ marginBottom: 12 }}>Add</Btn>
          </div>
        </div>
      )}

      {active.length === 0 && <Empty icon={Search} en="No items yet" zh="从添加一个需要采购的物品开始" />}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {active.map((it) => (
          <SourcingCard key={it.id} item={it} reload={reload} locations={locations}
            expanded={expanded === it.id} toggle={() => setExpanded((e) => (e === it.id ? null : it.id))} />
        ))}
      </div>
    </div>
  );
}

function SourcingCard({ item, expanded, toggle, reload, locations }) {
  const purchase = item.purchases?.[0] || null;
  const isDraft = item.status === "sourcing" && purchase && !purchase.confirmed;
  const [label, tone] = isDraft ? ["Selecting · 填写采购中", "amber"] : statusMeta(item.status);

  // value labels — unit price + total value
  const unit = purchase?.unit_price ?? (purchase ? null : bestPrice(item));
  const qty = purchase?.quantity ?? 1;
  const total = unit != null ? unit * qty : null;

  const del = async () => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await supabase.from("items").delete().eq("id", item.id);
    reload();
  };
  const addSup = async () => {
    await supabase.from("suppliers").insert({ item_id: item.id, name: `Supplier ${(item.suppliers?.length || 0) + 1}`, sort_ord: item.suppliers?.length || 0 });
    reload();
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,.03)" }}>
      <div className="srow" onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 22px", cursor: "pointer" }}>
        {expanded ? <ChevronDown size={20} color={C.gold} /> : <ChevronRight size={20} color={C.sub} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 22, color: C.text }}>{item.name}</div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 3, letterSpacing: ".04em" }}>{item.category} · {item.suppliers?.length || 0} supplier{(item.suppliers?.length || 0) !== 1 ? "s" : ""}</div>
        </div>
        {/* value labels — always visible */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginRight: 6 }}>
          {unit != null && <Badge tone="gray">Unit 单价 {fmtMoney(unit)}</Badge>}
          {total != null && <Badge tone="gold">Total 总价值 {fmtMoney(total)}</Badge>}
        </div>
        <Badge tone={tone}>{label}</Badge>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.line}`, padding: 22, background: C.panel }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, color: C.text }}>Suppliers <span style={{ color: C.gold, fontSize: 14 }}>供应商</span></span>
            {item.status === "sourcing" && <Btn size="sm" variant="ghost" onClick={addSup}><Plus size={13} /> Add supplier</Btn>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 14, marginBottom: 18 }}>
            {(item.suppliers || []).map((s) => (
              <SupplierCard key={s.id} supplier={s} item={item} chosen={purchase?.supplier_id === s.id} hasDraft={!!purchase} reload={reload} locations={locations} />
            ))}
            {(item.suppliers?.length || 0) === 0 && <div style={{ color: C.subLt, fontSize: 13, gridColumn: "1/-1", padding: 12 }}>No suppliers added yet.</div>}
          </div>

          {purchase && <PurchaseSummary item={item} purchase={purchase} reload={reload} locations={locations} />}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <Btn size="sm" variant="danger" onClick={del}><Trash2 size={13} /> Delete item</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function bestPrice(item) {
  const ps = (item.suppliers || []).map((s) => Number(s.price)).filter((n) => isFinite(n));
  return ps.length ? Math.min(...ps) : null;
}

function SupplierCard({ supplier: s, item, chosen, hasDraft, reload, locations }) {
  // editable only while sourcing AND no purchase draft/selection exists yet
  const editable = item.status === "sourcing" && !hasDraft;
  const save = async (patch) => { await supabase.from("suppliers").update(patch).eq("id", s.id); reload(); };
  const del = async () => { await supabase.from("suppliers").delete().eq("id", s.id); reload(); };

  const choose = async () => {
    // create a DRAFT purchase — item stays in "sourcing" until Confirm Purchase is pressed
    const loc = (locations && locations[0]) || "Cheras Warehouse";
    const price = s.price === "" || s.price == null ? null : Number(s.price);
    const { error } = await supabase.from("purchases").upsert({
      item_id: item.id, supplier_id: s.id, supplier_name: s.name || "Supplier", image_url: s.image_url || null,
      unit_price: price, quantity: 1, location: loc, confirmed: false, arrived: false,
    }, { onConflict: "item_id" });
    if (error) { alert("Could not start purchase: " + error.message); return; }
    reload();
  };

  const cancelDraft = async () => {
    // remove the draft purchase, unlocking suppliers again
    await supabase.from("purchases").delete().eq("item_id", item.id);
    reload();
  };

  // local buffered edits to avoid re-render churn
  const [local, setLocal] = useState(s);
  React.useEffect(() => setLocal(s), [s.id]);
  const upd = (k, v) => setLocal((x) => ({ ...x, [k]: v }));
  const commit = (k) => save({ [k]: local[k] });

  return (
    <div style={{ border: `1px solid ${chosen ? C.gold : C.line}`, borderRadius: 14, padding: 14, background: "#fff", boxShadow: chosen ? `0 0 0 1px ${C.gold}` : "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <input style={{ ...inp, fontFamily: serif, fontSize: 17, fontWeight: 600, padding: "3px 6px", border: "1px solid transparent", background: "transparent" }}
          value={local.name || ""} onChange={(e) => upd("name", e.target.value)} onBlur={() => commit("name")} disabled={!editable} />
        {editable && <button onClick={del} style={{ border: "none", background: "none", cursor: "pointer", color: C.subLt }}><X size={16} /></button>}
      </div>
      {editable ? (
        <>
          <div style={{ marginBottom: 10 }}><ImageInput value={local.image_url} onChange={(v) => save({ image_url: v })} height={120} /></div>
          <Field label="Price (RM) 价格"><input style={inp} value={local.price ?? ""} onChange={(e) => upd("price", e.target.value)} onBlur={() => commit("price")} placeholder="0.00" /></Field>
          <Field label="ETA (estimate) 预计到货"><input style={inp} value={local.eta ?? ""} onChange={(e) => upd("eta", e.target.value)} onBlur={() => commit("eta")} placeholder="e.g. 7-10 days" /></Field>
          <Field label="Note 备注"><input style={inp} value={local.note ?? ""} onChange={(e) => upd("note", e.target.value)} onBlur={() => commit("note")} placeholder="MOQ, colour…" /></Field>
          <Field label="Product Link 产品链接"><input style={inp} value={local.product_url ?? ""} onChange={(e) => upd("product_url", e.target.value)} onBlur={() => commit("product_url")} placeholder="Taobao / 1688 / 淘宝链接…" /></Field>
          <Btn size="sm" variant="gold" style={{ width: "100%", marginTop: 4 }} onClick={choose}><ShoppingCart size={13} /> Purchase this</Btn>
        </>
      ) : (
        <>
          {s.image_url ? <img src={s.image_url} alt="" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 10, marginBottom: 8 }} /> : null}
          <div style={{ fontSize: 14, color: C.text }}>{fmtMoney(s.price)} · {s.eta || "—"}</div>
          {s.note ? <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>{s.note}</div> : null}
          {s.product_url ? <a href={s.product_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 12.5, color: C.goldDk, textDecoration: "none", fontWeight: 600 }}><ExternalLink size={12} /> View product 查看产品</a> : null}
          {chosen && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Badge tone="gold"><Check size={11} style={{ verticalAlign: -1 }} /> Chosen 已选</Badge>
              {item.status === "sourcing" && (
                <button onClick={cancelDraft} style={{ border: "none", background: "none", cursor: "pointer", color: C.sub, fontSize: 12, textDecoration: "underline", padding: 0 }}>
                  Change 换供应商
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PurchaseSummary({ item, purchase: p, reload, locations }) {
  const [local, setLocal] = useState(p);
  React.useEffect(() => setLocal(p), [p.id, p.confirmed]);
  const upd = (k, v) => setLocal((x) => ({ ...x, [k]: v }));
  const save = async (patch) => { await supabase.from("purchases").update(patch).eq("id", p.id); reload(); };
  const commit = (k) => save({ [k]: local[k] });

  const d = daysBetween(local.arrival_date);
  const confirmed = p.confirmed;
  const canConfirm = local.quantity >= 1 && local.arrival_date && local.location && local.unit_price != null && local.unit_price !== "";
  const total = (Number(local.unit_price) || 0) * (Number(local.quantity) || 0);

  const confirmPurchase = async () => {
    if (!canConfirm) { alert("Please fill in price, quantity, arrival date and location first."); return; }
    await supabase.from("purchases").update({
      confirmed: true, unit_price: local.unit_price, quantity: local.quantity,
      arrival_date: local.arrival_date, location: local.location,
    }).eq("id", p.id);
    // NOW the item becomes purchased and enters Arrivals
    await supabase.from("items").update({ status: "purchased" }).eq("id", item.id);
    reload();
  };
  const reopen = async () => {
    await supabase.from("purchases").update({ confirmed: false }).eq("id", p.id);
    // move item back to sourcing so it leaves Arrivals while being edited
    await supabase.from("items").update({ status: "sourcing" }).eq("id", item.id);
    reload();
  };

  return (
    <div style={{ background: confirmed ? "linear-gradient(135deg,#f3ede1,#eadfc9)" : "linear-gradient(135deg, #faf3e6, #f6ecd6)",
      border: `1px solid ${confirmed ? "#d8c39a" : "#ecd9b0"}`, borderRadius: 14, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShoppingCart size={16} color={C.goldDk} />
          <span style={{ fontFamily: serif, fontWeight: 600, fontSize: 18, color: C.goldDk }}>Purchase — {p.supplier_name}</span>
        </div>
        {confirmed && <Badge tone="gold"><ShieldCheck size={11} style={{ verticalAlign: -1 }} /> Confirmed 已确认</Badge>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 14 }}>
        <Field label="Unit Price (RM) 单价">
          <input style={inp} type="number" step="0.01" value={local.unit_price ?? ""} disabled={confirmed}
            onChange={(e) => upd("unit_price", e.target.value)} onBlur={() => commit("unit_price")} placeholder="0.00" />
        </Field>
        <Field label="Quantity 数量">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Btn size="sm" variant="subtle" disabled={confirmed} onClick={() => { const v = Math.max(1, (+local.quantity || 1) - 1); upd("quantity", v); save({ quantity: v }); }}><Minus size={13} /></Btn>
            <input style={{ ...inp, textAlign: "center" }} type="number" min="1" value={local.quantity} disabled={confirmed}
              onChange={(e) => upd("quantity", e.target.value)} onBlur={() => commit("quantity")} />
            <Btn size="sm" variant="subtle" disabled={confirmed} onClick={() => { const v = (+local.quantity || 0) + 1; upd("quantity", v); save({ quantity: v }); }}><Plus size={13} /></Btn>
          </div>
        </Field>
        <Field label="Re-confirm Arrival 确认到货日期">
          <input style={inp} type="date" value={local.arrival_date || ""} disabled={confirmed}
            onChange={(e) => { upd("arrival_date", e.target.value); save({ arrival_date: e.target.value }); }} />
        </Field>
        <Field label="Deliver To 送往">
          <select style={inp} value={local.location} disabled={confirmed}
            onChange={(e) => { upd("location", e.target.value); save({ location: e.target.value }); }}>{locations.map((l) => <option key={l}>{l}</option>)}</select>
        </Field>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 14, color: C.goldDk }}>
          Total 总价值: <b style={{ fontFamily: serif, fontSize: 18 }}>{fmtMoney(total)}</b>
          {local.arrival_date && (
            <span style={{ marginLeft: 16, fontSize: 13, color: d <= 0 ? "#9c5548" : C.goldDk }}>
              <Clock size={13} style={{ verticalAlign: -2 }} />{" "}
              {d > 0 ? `${d} day${d !== 1 ? "s" : ""} left 倒数` : d === 0 ? "Due today 今天到期" : `Overdue ${-d}d 逾期`}
            </span>
          )}
        </div>
        {confirmed
          ? <Btn size="sm" variant="ghost" onClick={reopen}>Edit 修改</Btn>
          : <Btn variant="primary" onClick={confirmPurchase} disabled={!canConfirm}><ShieldCheck size={15} /> Confirm Purchase 确认采购</Btn>}
      </div>

      {!confirmed && <div style={{ marginTop: 8, fontSize: 12, color: "#a1854e" }}>Fill in all fields, then press Confirm Purchase. It then moves to Arrivals and auto-notifies {NOTIFY_EMAIL} when due.</div>}
    </div>
  );
}
