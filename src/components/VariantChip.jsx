// src/components/VariantChip.jsx
import React from "react";

export default function VariantChip({ label, qty, onDec, onInc, tone }) {
  return (
    <div className="qty-box" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}>
      <span
        className="label"
        style={{
          background: tone.bg,
          color: tone.fg,
          border: `1px solid ${tone.bd}`,
        }}
      >
        {label}
      </span>
      <button onClick={onDec}>−</button>
      <span className="num">{qty}</span>
      <button onClick={onInc}>+</button>
    </div>
  );
}
