// src/lib/fechas.js
const toLocalUTC = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000);

const ymd = (d = new Date()) => {
  const u = toLocalUTC(d);
  return `${u.getUTCFullYear()}-${String(u.getUTCMonth() + 1).padStart(2, "0")}-${String(u.getUTCDate()).padStart(2, "0")}`;
};

// Día de negocio: de 06:00 am a 05:59 am del día siguiente
export const businessKeyDate = (d = new Date()) => {
  const u = toLocalUTC(d);
  const hour = u.getUTCHours();

  // Si es antes de las 6am, seguimos contando como el día anterior
  if (hour < 6) {
    const prev = new Date(u);
    prev.setUTCDate(prev.getUTCDate() - 1);
    return ymd(prev);
  }

  // De 6am en adelante, se cuenta como el día actual
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
