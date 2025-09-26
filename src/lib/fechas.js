// src/lib/fechas.js
const toLocalUTC = (d=new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset()*60000);

const ymd = (d=new Date()) => {
  const u = toLocalUTC(d);
  return `${u.getUTCFullYear()}-${String(u.getUTCMonth()+1).padStart(2,"0")}-${String(u.getUTCDate()).padStart(2,"0")}`;
};

export const businessKeyDate = (d=new Date()) => {
  const u = toLocalUTC(d);
  // 17:00 = inicio del día de negocio
  if (u.getUTCHours() < 17) {
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
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch { return String(date); }
};
