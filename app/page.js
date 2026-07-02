"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Warehouse, Truck, ChevronDown, Bell, RefreshCw, Settings,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { C, serif, sans } from "../components/ui";
import SourcingTab from "../components/SourcingTab";
import ArrivalsTab from "../components/ArrivalsTab";
import WarehouseTab from "../components/WarehouseTab";
import SettingsTab from "../components/SettingsTab";
import { daysBetween } from "../lib/constants";

function Logo() {
  return <img src="/logo.png" alt="HAKSHAN 客善" style={{ width: 150, height: "auto", display: "block", margin: "0 auto" }} />;
}

export default function Page() {
  const [tab, setTab] = useState("sourcing");
  const [items, setItems] = useState(null);
  const [warehouse, setWarehouse] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [{ data: its }, { data: wh }, { data: locs }] = await Promise.all([
      supabase.from("items").select("*, suppliers(*), purchases(*)").order("created_at", { ascending: false }),
      supabase.from("warehouse").select("*, take_log(*)").order("created_at", { ascending: false }),
      supabase.from("locations").select("*").order("sort_ord", { ascending: true }),
    ]);
    (its || []).forEach((it) => {
      it.suppliers?.sort((a, b) => a.sort_ord - b.sort_ord);
      if (it.purchases && !Array.isArray(it.purchases)) it.purchases = [it.purchases];
      else if (!it.purchases) it.purchases = [];
    });
    (wh || []).forEach((w) => w.take_log?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    setItems(its || []);
    setWarehouse(wh || []);
    setLocations((locs || []).map((l) => l.name));
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("realtime-all")
      .on("postgres_changes", { event: "*", schema: "public" }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [reload]);

  if (loading || items === null) {
    return <div style={{ padding: 60, textAlign: "center", color: C.sub, fontFamily: sans, background: C.cream, minHeight: "100vh" }}>
      <RefreshCw size={22} className="spin" style={{ marginBottom: 8 }} /><div>Loading…</div></div>;
  }

  const dueCount = items.filter((it) => {
    const p = it.purchases?.[0];
    return p && it.status !== "in_warehouse" && (it.status === "received" || (p.confirmed && !p.arrived && (daysBetween(p.arrival_date) ?? 99) <= 0));
  }).length;
  const stockUnits = warehouse.reduce((n, w) => n + (+w.quantity || 0), 0);

  const nav = [
    ["sourcing", "Sourcing", "采购寻源", Search],
    ["arrivals", "Arrivals", "到货接收", Truck, dueCount],
    ["warehouse", "Warehouse", "仓库库存", Warehouse],
    ["settings", "Settings", "设置", Settings],
  ];

  return (
    <div style={{ fontFamily: sans, color: C.text, background: C.cream, minHeight: "100vh", display: "flex" }}>
      <aside style={{ width: 250, background: `linear-gradient(180deg, ${C.ink} 0%, ${C.inkSoft} 100%)`,
        display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "30px 24px 24px", textAlign: "center", borderBottom: `1px solid ${C.lineDk}` }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><Logo /></div>
          <div style={{ fontSize: 9.5, color: C.subLt, letterSpacing: ".32em", paddingLeft: ".32em" }}>SUPPLY PORTAL</div>
        </div>
        <nav style={{ padding: "18px 14px", flex: 1 }}>
          {nav.map(([k, en, zh, Icon, badge]) => {
            const active = tab === k;
            return (
              <button key={k} className="navitem" onClick={() => setTab(k)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                marginBottom: 4, border: "none", cursor: "pointer", borderRadius: 12, fontFamily: sans,
                background: active ? "rgba(168,131,79,.18)" : "transparent",
                boxShadow: active ? `inset 3px 0 0 ${C.gold}` : "none", textAlign: "left" }}>
                <Icon size={18} color={active ? C.goldLt : C.subLt} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: active ? "#f0e8da" : "#cabca8" }}>{en}</span>
                  <span style={{ display: "block", fontSize: 10, color: C.subLt, letterSpacing: ".08em" }}>{zh}</span>
                </span>
                {badge ? <span style={{ background: C.gold, color: "#fff", fontSize: 10.5, fontWeight: 700,
                  minWidth: 20, height: 20, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{badge}</span> : null}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontFamily: serif, fontSize: 16, fontStyle: "italic", color: "#cabca8", lineHeight: 1.5 }}>
            A Seat Reserved,<br />For Those Who<br />Walk With Us.
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, padding: "18px 32px" }}>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: "#fff", border: `1px solid ${C.line}`,
            display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
            <Bell size={17} color={C.sub} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1px solid ${C.line}`,
            padding: "6px 14px 6px 6px", borderRadius: 999, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
            <div style={{ width: 30, height: 30, borderRadius: 999, background: C.gold, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>PT</div>
            <span style={{ fontSize: 13.5, color: C.text, fontWeight: 500 }}>Hello, Team</span>
            <ChevronDown size={15} color={C.sub} />
          </div>
        </div>

        <div style={{ padding: "8px 32px 60px", maxWidth: 1180 }}>
          {tab === "sourcing" && <SourcingTab items={items} reload={reload} locations={locations} />}
          {tab === "arrivals" && <ArrivalsTab items={items} reload={reload} />}
          {tab === "warehouse" && <WarehouseTab warehouse={warehouse} reload={reload} locations={locations} />}
          {tab === "settings" && <SettingsTab locations={locations} reload={reload} warehouse={warehouse} items={items} />}
        </div>
      </main>
    </div>
  );
}
