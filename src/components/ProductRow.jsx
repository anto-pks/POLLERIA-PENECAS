import React from "react";
import VariantChip from "./VariantChip";
import { VARS_BRASAS, VARS_PARRILLA_DEFAULT, variantPrice, keyFor } from "../config/variants";

const TONES = {
  PF: { bg: "#fff7cc", fg: "#7c6000", bd: "#e6d37a" },
  APF: { bg: "#e0f2fe", fg: "#0c4a6e", bd: "#93c5fd" },
  CH: { bg: "#ffedd5", fg: "#9a3412", bd: "#fdba74" },
  PS: { bg: "#dcfce7", fg: "#14532d", bd: "#86efac" },
  APS: { bg: "#e5e7eb", fg: "#111827", bd: "#cbd5e1" },
};

const getVariantsFor = (catKey, prodName) => {
  if (catKey === "BRASAS") {
    const v = VARS_BRASAS[prodName];
    return v || "SIMPLE";
  }
  if (catKey === "PARRILLAS" || catKey === "PARRILLAS_ESPECIALES") {
    return VARS_PARRILLA_DEFAULT;
  }
  return "SIMPLE";
};

export default function ProductRow({ catKey, prod, draft, setCant }) {
  const vset = getVariantsFor(catKey, prod.nombre);

  if (vset === "SIMPLE") {
    const k = keyFor(prod.nombre, "SIMPLE");
    const q = draft[k]?.cantidad || 0;
    return (
      <div className="item-row">
        <span className="item-name">{prod.nombre}</span>
        <div className="qty-box">
          <button onClick={() => setCant(k, prod.precio, -1)}>−</button>
          <span className="num">{q}</span>
          <button onClick={() => setCant(k, prod.precio, +1)}>+</button>
        </div>
      </div>
    );
  }

  const variants = Array.isArray(vset) ? vset : [vset];
  return (
    <div className="item-row">
      <span className="item-name">{prod.nombre}</span>
      <div className="dual-controls">
        {variants.map((v) => {
          const k = keyFor(prod.nombre, v);
          const price = variantPrice(prod.precio, v);
          const q = draft[k]?.cantidad || 0;
          const tone = TONES[v] || { bg: "#f3f4f6", fg: "#111827", bd: "#e5e7eb" };
          return (
            <VariantChip
              key={v}
              label={v}
              qty={q}
              tone={tone}
              onDec={() => setCant(k, price, -1)}
              onInc={() => setCant(k, price, +1)}
            />
          );
        })}
      </div>
    </div>
  );
}
