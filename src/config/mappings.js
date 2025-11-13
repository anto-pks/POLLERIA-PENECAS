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
  if (N.includes("PARRILLA DE CARNE") || N.includes("PARRILLA CARNE")) return "CARNE";
  if (N.includes("CHULETA") || N.includes("CERDO")) return "CHULETA";
  return null;
};
