// src/lib/fechas.js
const toLocalUTC = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000);

const ymd = (d = new Date()) => {
  const u = toLocalUTC(d);
  return `${u.getUTCFullYear()}-${String(u.getUTCMonth() + 1).padStart(2, "0")}-${String(u.getUTCDate()).padStart(2, "0")}`;
};

// HORA DE INICIO DEL DÍA DE NEGOCIO (24h)
const START_HOUR = 16; // 16 = 4:00 pm

export const businessKeyDate = (d = new Date()) => {
  const u = toLocalUTC(d);
  // si aún no es la hora de inicio, cuenta para el día anterior
  if (u.getUTCHours() < START_HOUR) {
    const prev = new Date(u);
    prev.setUTCDate(prev.getUTCDate() - 1);
    return ymd(prev);
  }
  return ymd(u);
};

export const ventasKey = () => `ventas_${businessKeyDate()}`;

export const formatFechaPE = (date) => {
  try {
    return new Date(date).toLocaleString("es-PE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return String(date);
  }
};
