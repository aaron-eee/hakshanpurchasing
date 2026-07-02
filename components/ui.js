"use client";
import React from "react";

export const C = {
  ink: "#1a1512", inkSoft: "#241d18", cream: "#f5f1ea", card: "#ffffff",
  gold: "#a8834f", goldLt: "#b8935a", goldDk: "#8a6a3d", line: "#e4dccf",
  lineDk: "#3a2f26", text: "#2b2320", sub: "#8a7d6e", subLt: "#b8a894", panel: "#faf7f1",
};
export const serif = "'Cormorant Garamond', Georgia, serif";
export const sans = "'Inter', system-ui, -apple-system, sans-serif";

export const inp = {
  width: "100%", padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 10,
  fontSize: 14, fontFamily: sans, boxSizing: "border-box", background: "#fff", color: C.text,
};

export function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ display: "block", fontSize: 10.5, fontWeight: 600, letterSpacing: ".12em",
        textTransform: "uppercase", color: C.sub, marginBottom: 5 }}>{label}</span>
      {children}
    </label>
  );
}

export function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: ["#efe9df", C.sub], gold: ["#f0e4d0", C.goldDk], amber: ["#f6ecd6", "#8a6a2f"],
    green: ["#e3ede1", "#4a6b47"], red: ["#f3e0dc", "#9c5548"], ink: [C.ink, "#e8dcc8"],
  };
  const [bg, fg] = tones[tone] || tones.gray;
  return <span style={{ background: bg, color: fg, fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em",
    padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap", textTransform: "uppercase", fontFamily: sans }}>{children}</span>;
}

export function Btn({ children, onClick, variant = "primary", size = "md", style = {}, disabled }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, border: "none",
    cursor: disabled ? "not-allowed" : "pointer", borderRadius: 10, fontWeight: 600, fontFamily: sans,
    opacity: disabled ? 0.45 : 1, letterSpacing: ".02em", transition: "all .15s",
    fontSize: size === "sm" ? 12.5 : 13.5, padding: size === "sm" ? "6px 12px" : "10px 18px",
  };
  const v = {
    primary: { background: C.ink, color: "#f0e8da" },
    gold: { background: C.gold, color: "#fff" },
    ghost: { background: "transparent", color: C.text, border: `1px solid ${C.line}` },
    danger: { background: "transparent", color: "#9c5548", border: "1px solid #e6cfc9" },
    subtle: { background: C.panel, color: C.text, border: `1px solid ${C.line}` },
  };
  return <button disabled={disabled} onClick={onClick} style={{ ...base, ...v[variant], ...style }}>{children}</button>;
}

export function Empty({ icon: Icon, en, zh }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 20px", color: C.subLt, background: C.card, border: `1px dashed ${C.line}`, borderRadius: 16 }}>
      <Icon size={34} style={{ marginBottom: 12, color: C.gold, opacity: .7 }} />
      <div style={{ fontFamily: serif, fontSize: 20, color: C.sub, marginBottom: 4 }}>{en}</div>
      <div style={{ fontSize: 13 }}>{zh}</div>
    </div>
  );
}

export function Head({ eyebrow, en, zh, right }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {eyebrow && <div style={{ fontSize: 11, letterSpacing: ".28em", color: C.gold, fontWeight: 600, marginBottom: 8 }}>{eyebrow}</div>}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ margin: 0, fontFamily: serif, fontSize: 40, fontWeight: 600, color: C.text, lineHeight: 1.05 }}>
          {en} {zh && <span style={{ color: C.gold, fontSize: 26, fontWeight: 500 }}>{zh}</span>}
        </h1>
        {right}
      </div>
      <div style={{ height: 1, background: C.line, marginTop: 20 }} />
    </div>
  );
}

export const fmtMoney = (n) => {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return "RM " + v.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
