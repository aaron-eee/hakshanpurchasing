"use client";
import React, { useState } from "react";
import { MapPin, Trash2, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { C, serif, inp, Field, Badge, Btn, Head } from "./ui";

export default function SettingsTab({ locations, reload, warehouse, items }) {
  const [newLoc, setNewLoc] = useState("");
  const [delFor, setDelFor] = useState(null);
  const [busy, setBusy] = useState(false);

  const usage = (loc) => {
    const w = (warehouse || []).filter((x) => x.location === loc).length;
    const p = (items || []).filter((x) => x.purchases?.[0]?.location === loc && x.status !== "in_warehouse").length;
    return w + p;
  };

  const add = async () => {
    const v = newLoc.trim();
    if (!v) return;
    if (locations.includes(v)) { alert("That location already exists."); return; }
    setBusy(true);
    await supabase.from("locations").insert({ name: v, sort_ord: locations.length });
    setNewLoc(""); setBusy(false);
    reload();
  };

  const remove = async () => {
    await supabase.from("locations").delete().eq("name", delFor);
    setDelFor(null);
    reload();
  };

  return (
    <div>
      <Head eyebrow="CONFIGURATION" en="Settings" zh="设置" />

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 24, maxWidth: 640, boxShadow: "0 2px 12px rgba(0,0,0,.03)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <MapPin size={18} color={C.gold} />
          <h2 style={{ margin: 0, fontFamily: serif, fontSize: 24, fontWeight: 600, color: C.text }}>Delivery Locations <span style={{ color: C.gold, fontSize: 16 }}>送货地点</span></h2>
        </div>
        <p style={{ margin: "0 0 18px", color: C.sub, fontSize: 13 }}>These appear in every "Deliver to / Send to" dropdown and as warehouse groups.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {locations.map((l) => {
            const n = usage(l);
            return (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", border: `1px solid ${C.line}`, borderRadius: 12, background: C.panel }}>
                <MapPin size={15} color={C.sub} />
                <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{l}</span>
                {n > 0 && <Badge tone="gray">{n} in use 使用中</Badge>}
                <button onClick={() => setDelFor(l)} disabled={locations.length <= 1}
                  style={{ border: "none", background: "none", cursor: locations.length <= 1 ? "not-allowed" : "pointer", color: locations.length <= 1 ? C.subLt : "#9c5548", opacity: locations.length <= 1 ? 0.4 : 1, display: "flex", alignItems: "center" }}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <Field label="New location 新地点">
              <input style={inp} value={newLoc} onChange={(e) => setNewLoc(e.target.value)} placeholder="e.g. Penang Store" onKeyDown={(e) => e.key === "Enter" && add()} />
            </Field>
          </div>
          <Btn variant="gold" onClick={add} disabled={busy} style={{ marginBottom: 12 }}><Plus size={15} /> Add Location</Btn>
        </div>
      </div>

      {delFor && (
        <div onClick={() => setDelFor(null)} style={{ position: "fixed", inset: 0, background: "rgba(26,21,18,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 60 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 26, width: "100%", maxWidth: 380 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 999, background: "#f3e0dc", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Trash2 size={18} color="#9c5548" /></div>
              <h3 style={{ margin: 0, fontFamily: serif, fontSize: 22, fontWeight: 600, color: C.text }}>Delete location 删除地点</h3>
            </div>
            <div style={{ fontSize: 14, color: C.sub, marginBottom: 20, lineHeight: 1.5 }}>
              {usage(delFor) > 0
                ? `"${delFor}" is used by ${usage(delFor)} item(s). Deleting it won't change those records, but it will no longer appear in dropdowns. Continue?`
                : `Delete location "${delFor}"?`}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" onClick={() => setDelFor(null)} style={{ flex: 1 }}>Cancel 取消</Btn>
              <Btn onClick={remove} style={{ flex: 1, background: "#9c5548", color: "#fff" }}><Trash2 size={14} /> Delete 删除</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
