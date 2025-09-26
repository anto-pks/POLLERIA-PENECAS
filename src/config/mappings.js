// src/config/mappings.js
export const BRASA_EQ = {
  "POLLO ENTERO": 8,
  "MEDIO POLLO": 4,
  "CUARTO DE POLLO": 2,
  "OCTAVO DE POLLO": 1,
  MOSTRITO: 1,
};

export const normalize = (n="") =>
  n.toUpperCase().replace(/\s*\([^)]*\)/g,"").trim();

export const PARRILLA_MAIN = (n) => {
  const N = normalize(n);
  if (N.includes("POLLO BROASTER")) return "POLLO";
  if (N.includes("PARRILLA DE POLLO") || N.includes("PARRILLA POLLO")) return "POLLO";
  if (N.includes("PARRILLA DE CARNE") || N.includes("PARRILLA CARNE") || N.includes("ANTICUCH")) return "CARNE";
  if (N.includes("CHULETA") || N.includes("CERDO") || N.includes("CHANCHO")) return "CHULETA";
  if (N.includes("MOLLEJ")) return "POLLO";
  if (N.includes("COMBINADO") || N.includes("MIXTO")) return "CARNE";
  return null;
};
