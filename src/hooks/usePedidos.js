// src/hooks/usePedidos.js
import { useEffect, useMemo, useRef, useState } from "react";
import { ventasKey, businessKeyDate, formatFechaPE } from "../lib/fechas";
import { BRASA_EQ, normalize, PARRILLA_MAIN } from "../config/mappings";
import { MESAS_TOTAL, ROLES, ROLE_PASSWORD } from "../config/constants";

export function usePedidos() {
  // pedidos[mesa] = { draft:{key:{precio,cantidad}}, sent:{}, ready:{}, nota? }
  const [pedidosPorMesa, setPedidosPorMesa] = useState({});
  const [estadoMesa, setEstadoMesa] = useState({});
  const [mesaSel, setMesaSel] = useState(1);
  const [abiertas, setAbiertas] = useState({});
  const [rol, setRol] = useState("MESERO");

  // Login por rol
  const [showAuth, setShowAuth] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);
  const [passInput, setPassInput] = useState("");

  // Ventas día
  const [ventasDia, setVentasDia] = useState([]);
  const [bizKey, setBizKey] = useState(ventasKey());
  useEffect(() => {
    const k = ventasKey();
    setBizKey(k);
    try {
      const raw = localStorage.getItem(k);
      setVentasDia(raw ? JSON.parse(raw) : []);
    } catch {
      setVentasDia([]);
    }
  }, []);
  useEffect(() => {
    const k = ventasKey();
    setBizKey(k);
    try { localStorage.setItem(k, JSON.stringify(ventasDia)); } catch {}
  }, [ventasDia]);

  // Notas por mesa (no controlado con ref)
  const [notasPorMesa, setNotasPorMesa] = useState({});
  const notaInputRef = useRef(null);
  const guardarNotaMesa = (texto) =>
    setNotasPorMesa(prev => ({ ...prev, [mesaSel]: texto }));

  const ensureMesa = (m) => ({ draft:{}, sent:{}, ready:{}, ...(m||{}) });

  // Selectores mesa actual
  const mesaData = ensureMesa(pedidosPorMesa[mesaSel]);
  const draft = mesaData.draft || {};
  const sent = mesaData.sent || {};
  const itemsSent = useMemo(
    () => Object.entries(sent).map(([nombre, v]) => ({ nombre, ...v })),
    [sent]
  );
  const totalSent = useMemo(
    () => itemsSent.reduce((s, it) => s + it.precio * it.cantidad, 0),
    [itemsSent]
  );

  const mesaOcupada = (id) => {
    const m = ensureMesa(pedidosPorMesa[id]);
    const has = (o) => o && Object.values(o).some((x) => x.cantidad > 0);
    return has(m.draft) || has(m.sent);
  };

  // Mutadores
  const setCant = (key, precio, delta) => {
    setPedidosPorMesa((prev) => {
      const m = ensureMesa(prev[mesaSel]);
      const d = { ...m.draft };
      const cur = d[key]?.cantidad || 0;
      const next = Math.max(0, cur + delta);
      if (next === 0) delete d[key];
      else d[key] = { precio, cantidad: next };
      return { ...prev, [mesaSel]: { ...m, draft: d } };
    });
    setEstadoMesa((prev) => ({ ...prev, [mesaSel]: prev[mesaSel] || "tomando" }));
  };

  const enviarACocina = () => {
    const notaActual = (notasPorMesa[mesaSel] || "").trim();
    setPedidosPorMesa((prev) => {
      const m = ensureMesa(prev[mesaSel]);
      const d = m.draft;
      const s = { ...m.sent };
      Object.entries(d).forEach(([nombre, { precio, cantidad }]) => {
        const ya = s[nombre]?.cantidad || 0;
        const diff = cantidad - ya;
        if (diff > 0) s[nombre] = { precio, cantidad: ya + diff };
      });
      return { ...prev, [mesaSel]: { ...m, sent: s, nota: notaActual } };
    });
    setEstadoMesa((prev) => ({ ...prev, [mesaSel]: "enviado" }));
  };

  const pendientesMesa = (id) => {
    const m = ensureMesa(pedidosPorMesa[id]);
    const s = m.sent || {}, r = m.ready || {};
    const out = [];
    Object.keys(s).forEach((nombre) => {
      const q = (s[nombre]?.cantidad || 0) - (r[nombre]?.cantidad || 0);
      if (q > 0) out.push({ nombre, precio: s[nombre].precio, cantidad: q });
    });
    return out;
  };

  const marcarListo = (id, nombre, qty) => {
    if (qty <= 0) return;
    setPedidosPorMesa((prev) => {
      const m = ensureMesa(prev[id]);
      const r = { ...m.ready };
      const cur = r[nombre]?.cantidad || 0;
      const precio = m.sent?.[nombre]?.precio || 0;
      r[nombre] = { precio, cantidad: cur + qty };
      return { ...prev, [id]: { ...m, ready: r } };
    });
    setEstadoMesa((prev) => ({ ...prev, [id]: "listo" }));
  };

  const cobrarMesa = (id) => {
    const m = ensureMesa(pedidosPorMesa[id]);
    const s = m.sent || {};
    const items = Object.entries(s).map(([nombre, v]) => ({
      nombre, precio: v.precio, cantidad: v.cantidad, subtotal: v.precio*v.cantidad
    }));
    const totalTicket = items.reduce((a, it) => a + it.subtotal, 0);
    if (totalTicket <= 0) return;

    const notaTicket = (m.nota ?? notasPorMesa[id] ?? "").trim();
    const now = new Date();
    const ticket = {
      id: `${Date.now()}_${id}`,
      mesa: id,
      ts: now.getTime(),
      dateISO: businessKeyDate(now),
      fecha: formatFechaPE(now),
      items,
      total: totalTicket,
      nota: notaTicket,
    };
    setVentasDia((prev) => [ticket, ...prev]);
    setPedidosPorMesa((prev) => {
      const cp = { ...prev }; delete cp[id]; return cp;
    });
    setEstadoMesa((prev) => ({ ...prev, [id]: "cobrado" }));
    setNotasPorMesa((prev) => { const cp = { ...prev }; delete cp[id]; return cp; });
    if (mesaSel === id) setAbiertas({});
  };

  // Auth
  const requestRole = (r) => { setPendingRole(r); setPassInput(""); setShowAuth(true); };
  const confirmRole = () => {
    if (ROLE_PASSWORD[pendingRole] === passInput.trim()) {
      setRol(pendingRole); setShowAuth(false);
    } else alert("Clave incorrecta");
  };

  // Métricas admin
  const ticketsDay = ventasDia;

  const brasaOctavos = useMemo(() => {
    let oct = 0;
    for (const t of ticketsDay) for (const it of t.items) {
      const base = normalize(it.nombre);
      if (base === "CALDO DE GALLINA") continue; // no suma
      const eq = BRASA_EQ[base]; if (eq) oct += eq * (it.cantidad || 0);
    }
    return { pollos: Math.floor(oct/8), restoOctavos: oct%8, totalOctavos: oct };
  }, [ticketsDay]);

  const parrillaControl = useMemo(() => {
    const acc = { POLLO:0, CARNE:0, CHULETA:0 };
    for (const t of ticketsDay) for (const it of t.items) {
      const main = PARRILLA_MAIN(it.nombre); if (main) acc[main] += it.cantidad || 0;
    }
    return acc;
  }, [ticketsDay]);

  const gaseosaControl = useMemo(() => {
    const acc = { PERSONAL:0, GORDITA:0, LITRO:0, "2 LITROS":0 };
    for (const t of ticketsDay) for (const it of t.items) {
      const n = (it.nombre||"").toUpperCase();
      if (n.includes("GASEOSA PERSONAL")) acc.PERSONAL += it.cantidad||0;
      else if (n.includes("GASEOSA GORDITA")) acc.GORDITA += it.cantidad||0;
      else if (n.includes("GASEOSA LITRO")) acc.LITRO += it.cantidad||0;
      else if (n.includes("GASEOSA 2 LT") || n.includes("GASEOSA 2.25")) acc["2 LITROS"] += it.cantidad||0;
    }
    return acc;
  }, [ticketsDay]);

  return {
    // constantes para otras partes
    MESAS_TOTAL, ROLES, ROLE_PASSWORD,

    // estados base
    pedidosPorMesa, estadoMesa, mesaSel, setMesaSel, abiertas, setAbiertas,
    rol, setRol, showAuth, setShowAuth, pendingRole, passInput, setPassInput,

    // auth
    requestRole, confirmRole,

    // ventas y día de negocio
    ventasDia, bizKey,

    // notas
    notasPorMesa, guardarNotaMesa, notaInputRef,

    // mesa actual / selectores y helpers
    draft, sent, itemsSent, totalSent, ensureMesa, mesaOcupada,
    setCant, enviarACocina, pendientesMesa, marcarListo, cobrarMesa,

    // métricas
    brasaOctavos, parrillaControl, gaseosaControl,
  };
}
