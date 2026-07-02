"use client";
import React, { useState } from "react";
import { ImageIcon, RefreshCw } from "lucide-react";
import { uploadImage } from "../lib/supabase";
import { C, inp } from "./ui";

export default function ImageInput({ value, onChange, height = 150 }) {
  const [busy, setBusy] = useState(false);
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const url = await uploadImage(f);
      onChange(url);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <input style={{ ...inp, flex: 1 }} placeholder="Image URL…" value={value || ""} onChange={(e) => onChange(e.target.value)} />
        <label style={{ ...inp, width: "auto", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", color: C.sub }}>
          {busy ? <RefreshCw size={14} className="spin" /> : <ImageIcon size={14} />} {busy ? "Uploading" : "Upload"}
          <input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} disabled={busy} />
        </label>
      </div>
      {value ? <img src={value} alt="" style={{ width: "100%", maxHeight: height, objectFit: "cover", borderRadius: 10, border: `1px solid ${C.line}` }} /> : null}
    </div>
  );
}
