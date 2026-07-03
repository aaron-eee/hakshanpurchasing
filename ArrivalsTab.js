"use client";
import React, { useState } from "react";
import { Truck, Package, MapPin, Clock, AlertCircle, Check, PackageOpen, Camera, X, CalendarPlus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { C, serif, inp, Field, Badge, Btn, Empty, Head, fmtMoney } from "./ui";
import ImageInput from "./ImageInput";
import { daysBetween } from "../lib/constants";

const todayISO = () => new Date().toISOString().slice(0, 10);

// Build a Google Calendar "add event" link for an arrival (all-day event on the arrival date)
function gcalLink(it, p) {
  if (!p.arrival_date) return null;
  const start = p.arrival_date.replace(/-/g, "");
  const end = new Date(new Date(p.arrival_date + "T00:00:00").getTime() + 86400000).toISOString().slice(0, 10).replace(/-/g, "");
  const title = `📦 Arrival: ${it.name} ×${p.quantity} — ${p.location}`;
  const details = [
    `Item: ${it.name}`,
    `Quantity: ${p.quantity}`,
    `Supplier: ${p.supplier_name || "-"}`,
    `Deliver to: ${p.location}`,
    `Value: ${fmtMoney((Number(p.unit_price) || 0) * (Number(p.quantity) || 0))}`,
    ``,
    `HAKSHAN Supply Portal — please open, check & confirm on arrival.`,
  ].join("\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${end}`,
    details,
    location: p.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function ArrivalsTab({ items, reload }) {
  const [photoFor, setPhotoFor] = useState(null); // item pending arrival confirmation

  const pending = items.filter((it) => it.purchases?.[0]?.confirmed && it.status !== "in_warehouse");

  const stock = async (it) => {
    const p = it.purchases[0];
    const { data: w } = await supabase.from("warehouse").insert({
      item_id: it.id, name: it.name, category: it.category, image_url: p.image_url,
      quantity: p.quantity, unit_price: p.unit_price, location: p.location, stocked_on: todayISO(),
    }).select().single();
    await supabase.from("items").update({ status: "in_warehouse" }).eq("id", it.id);
    reload();
  };

  return (
    <div>
      <Head eyebrow="RECEIVING" en="Arrivals" zh="到货接收" />
      <p style={{ margin: "-8px 0 22px", color: C.sub, fontSize: 13.5 }}>
        Add each arrival to Google Calendar so Pui Teng gets reminded. Confirm arrival with an opening photo, then it enters the warehouse.
      </p>

      {pending.length === 0 && <Empty icon={Truck} en="Nothing in transit" zh="确认采购后的物品会显示在这里" />}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {pending.map((it) => {
          const p = it.purchases[0];
          const d = daysBetween(p.arrival_date);
          const due = (d ?? 99) <= 0;
          return (
            <div key={it.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 20,
              display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap", boxShadow: "0 2px 12px rgba(0,0,0,.03)" }}>
              {p.image_url ? <img src={p.image_url} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 12, flexShrink: 0 }} />
                : <div style={{ width: 84, height: 84, borderRadius: 12, background: C.panel, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Package size={28} color={C.subLt} /></div>}
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 22, color: C.text }}>{it.name} <span style={{ color: C.subLt, fontWeight: 400, fontSize: 16 }}>×{p.quantity}</span></div>
                <div style={{ fontSize: 13, color: C.sub, marginTop: 5, display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <span><MapPin size={12} style={{ verticalAlign: -2 }} /> {p.location}</span>
                  <span>{p.supplier_name}</span>
                  <span>{p.arrival_date || "no date"}</span>
                  <span>{fmtMoney(p.unit_price)} × {p.quantity} = <b style={{ color: C.text }}>{fmtMoney((Number(p.unit_price) || 0) * (Number(p.quantity) || 0))}</b></span>
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {it.status === "received" ? <Badge tone="gold">Arrived · needs opening & check 待开箱</Badge>
                    : due ? <Badge tone="red"><AlertCircle size={11} style={{ verticalAlign: -1 }} /> {d === 0 ? "Due today 今天到期" : `Overdue ${-d}d 逾期`}</Badge>
                    : <Badge tone="amber"><Clock size={11} style={{ verticalAlign: -1 }} /> {d} day{d !== 1 ? "s" : ""} left · 倒数</Badge>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
                {gcalLink(it, p) && (
                  <a href={gcalLink(it, p)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                    <Btn variant="ghost" size="sm" style={{ width: "100%" }}><CalendarPlus size={14} /> Add to Google Calendar 加入日历</Btn>
                  </a>
                )}
                {it.status === "purchased" && <Btn variant="gold" onClick={() => setPhotoFor(it)}><Camera size={15} /> Confirm arrived 确认到货</Btn>}
                {it.status === "received" && (
                  <>
                    {p.check_photo_url && <img src={p.check_photo_url} alt="check" style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 10, border: `1px solid ${C.line}` }} />}
                    <Btn variant="primary" onClick={() => stock(it)}><PackageOpen size={15} /> Opened & OK → Stock 入库</Btn>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {photoFor && <PhotoModal item={photoFor} onClose={() => setPhotoFor(null)} reload={reload} />}
    </div>
  );
}

function PhotoModal({ item, onClose, reload }) {
  const [photo, setPhoto] = useState("");
  const p = item.purchases[0];
  const submit = async () => {
    if (!photo) { alert("Please upload an opening/inspection photo to confirm."); return; }
    await supabase.from("purchases").update({ arrived: true, arrived_on: todayISO(), check_photo_url: photo }).eq("id", p.id);
    await supabase.from("items").update({ status: "received" }).eq("id", item.id);
    reload();
    onClose();
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,21,18,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 26, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontFamily: serif, fontSize: 24, fontWeight: 600, color: C.text }}>Confirm Arrival <span style={{ color: C.gold, fontSize: 17 }}>确认到货</span></h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer" }}><X size={19} color={C.sub} /></button>
        </div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 18 }}>{item.name} · ×{p.quantity} · {p.location}</div>
        <Field label="Opening / inspection photo 开箱检查照片 (required)">
          <ImageInput value={photo} onChange={setPhoto} height={180} />
        </Field>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 14 }}>Take a photo after opening the box to confirm the goods are not damaged.</div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
          <Btn variant="gold" onClick={submit} style={{ flex: 1 }} disabled={!photo}><Check size={15} /> Confirm 确认到货</Btn>
        </div>
      </div>
    </div>
  );
}
