// Helpers para IDs de mesa y “para llevar”
export const isTakeawayId = (id) =>
  typeof id === "string" && id.startsWith("L");

export const toTakeawayId = (n) => `L${n}`;     // ej: 1 -> "L1"
export const fromTakeawayId = (id) =>           // ej: "L1" -> 1
  isTakeawayId(id) ? Number(id.slice(1)) : Number(id);

// Etiqueta amigable para mostrar
export const labelMesa = (id) =>
    isTakeawayId(id) ? `Llevar #${fromTakeawayId(id)}` : `Mesa #${id}`;
