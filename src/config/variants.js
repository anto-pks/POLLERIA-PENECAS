// src/config/variants.js
export const VARS_BRASAS = {
  "POLLO ENTERO": "SIMPLE",
  "MEDIO POLLO": "SIMPLE",
  "CUARTO DE POLLO": ["PF","APF","CH"],
  "OCTAVO DE POLLO": ["PF","APF"],
  "MOSTRITO": "SIMPLE",
  "POLLO BROASTER": ["PF","APF","CH"],
  "CALDO DE GALLINA": "SIMPLE",
};
export const VARS_PARRILLA_DEFAULT = ["PF","APF","CH","PS","APS"];

export const variantPrice = (base, v) => (v === "CH" ? base + 2 : base);
export const keyFor = (name, v) => (v && v !== "SIMPLE") ? `${name} (${v})` : name;
