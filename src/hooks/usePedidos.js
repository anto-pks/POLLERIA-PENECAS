import {
  getMesaSnapshot,
  getMesaAbierta,
  upsertMesaAbierta,
  setEstadoMesa as setEstadoMesaDB,
  setNotaMesa as setNotaMesaDB,
  sendDiffToKitchen,
  markReady,
  cobrarMesaDB,
  subscribeMesa,
} from "../lib/dbHelpers";

import { useEffect, useMemo, useRef, useState } from "react";
import { ventasKey, businessKeyDate, formatFechaPE } from "../lib/fechas";
import { BRASA_EQ, normalize, PARRILLA_MAIN } from "../config/mappings";
import { MESAS_TOTAL, ROLES, ROLE_PASSWORD, TAKEAWAY_BASE } from "../config/constants";

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

  // Ventas día (local, para dashboard)
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
    try {
      localStorage.setItem(k, JSON.stringify(ventasDia));
    } catch {}
  }, [ventasDia]);

  // Notas por mesa
  const [notasPorMesa, setNotasPorMesa] = useState({});
  const notaInputRef = useRef(null);

  // Helpers “para llevar”
  const isTakeawayId = (id) => Number(id) >= TAKEAWAY_BASE;
  const nextTakeawayId = () => {
    // busca el mayor id >= base en memoria y suma 1; si no hay, 9001
    const ids = Object.keys({ ...pedidosPorMesa, ...estadoMesa }).map(Number);
    const maxL = ids.filter((x) => x >= TAKEAWAY_BASE).reduce((m, x) => Math.max(m, x), TAKEAWAY_BASE);
    return maxL + 1;
  };
  const createTakeaway = () => {
    const id = nextTakeawayId();
    // Creamos estructura local “tomando”
    setPedidosPorMesa((prev) => ({ ...prev, [id]: ensureMesa(prev[id]) }));
    setEstadoMesa((prev) => ({ ...prev, [id]: "tomando" }));
    // Seleccionamos el pedido
    setMesaSel(id);
  };

  // ==== CARGA DE MESA + REALTIME ====
  useEffect(() => {
    let unsubscribe;
    async function loadMesa() {
      // 1) Items persistidos en DB (solo sent/ready)
      const snap = await getMesaSnapshot(mesaSel); // {sent:{}, ready:{}}

      // 2) Estado/nota de la mesa (si existe)
      const mesa = await getMesaAbierta(mesaSel); // {id_mesa, estado, nota} | null

      // 3) Actualiza estado local manteniendo borrador (draft) si existía
      setPedidosPorMesa((prev) => ({
        ...prev,
        [mesaSel]: {
          draft: prev[mesaSel]?.draft || {},
          sent: snap.sent || {},
          ready: snap.ready || {},
          nota: mesa?.nota ?? prev[mesaSel]?.nota ?? "",
        },
      }));

      // 4) Estado de la mesa
      if (mesa?.estado) {
        setEstadoMesa((prev) => ({ ...prev, [mesaSel]: mesa.estado }));
      }

      // 5) Reflejar nota también en el editor local
      setNotasPorMesa((prev) => ({
        ...prev,
        [mesaSel]: mesa?.nota ?? prev[mesaSel] ?? "",
      }));
    }

    loadMesa();
    unsubscribe = subscribeMesa(mesaSel, loadMesa);

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [mesaSel]);

  const ensureMesa = (m) => ({ draft: {}, sent: {}, ready: {}, ...(m || {}) });

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

  // Mutadores de cantidades (borrador local)
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

  // Guardar nota (local + Supabase)
  const guardarNotaMesa = async (texto) => {
    setNotasPorMesa((prev) => ({ ...prev, [mesaSel]: texto }));
    await upsertMesaAbierta(mesaSel, estadoMesa[mesaSel] || "tomando", texto);
    setPedidosPorMesa((prev) => {
      const m = ensureMesa(prev[mesaSel]);
      m.nota = texto;
      return { ...prev, [mesaSel]: m };
    });
  };

  // Enviar a cocina (persistir solo deltas: draft - sent)
  const enviarACocina = async () => {
    const m = ensureMesa(pedidosPorMesa[mesaSel]);
    const notaActual = (notasPorMesa[mesaSel] || "").trim();

    // crear/actualizar mesas + estado enviado
    await upsertMesaAbierta(mesaSel, "enviado", notaActual);

    // mandar dif a DB
    await sendDiffToKitchen(mesaSel, m.draft, m.sent);

    // refrescar snapshot
    const snap = await getMesaSnapshot(mesaSel);
    setPedidosPorMesa((prev) => ({
      ...prev,
      [mesaSel]: { ...m, sent: snap.sent || {}, draft: {}, nota: notaActual },
    }));
    setEstadoMesa((prev) => ({ ...prev, [mesaSel]: "enviado" }));
  };

  // Pendientes para cocina (local, a partir de sent y ready)
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

  // Cocina: marcar listo
  const marcarListo = async (id, nombreKey, qty) => {
    if (qty <= 0) return;
    const m = nombreKey.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    const nombre = m ? m[1] : nombreKey;
    const variante = m ? m[2] : null;

    await markReady(id, nombre, variante, qty);
    await setEstadoMesaDB(id, "listo");
  };

  // Cajero: cobrar y limpiar
  const cobrarMesa = async (id) => {
    const m = ensureMesa(pedidosPorMesa[id]);
    const s = m.sent || {};
    const items = Object.entries(s).map(([nombre, v]) => ({
      nombre,
      precio: v.precio,
      cantidad: v.cantidad,
      subtotal: v.precio * v.cantidad,
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

    // persistir en DB y limpiar DB
    await cobrarMesaDB({
      mesa: id,
      dateISO: ticket.dateISO,
      fecha: now.toISOString(),
      items,
      total: totalTicket,
      nota: notaTicket,
    });

    // limpiar UI
    setPedidosPorMesa((prev) => {
      const cp = { ...prev };
      delete cp[id];
      return cp;
    });
    setEstadoMesa((prev) => ({ ...prev, [id]: "cobrado" }));
    setNotasPorMesa((prev) => {
      const cp = { ...prev };
      delete cp[id];
      return cp;
    });
    if (mesaSel === id) setAbiertas({});
  };

  // Auth
  const requestRole = (r) => {
    setPendingRole(r);
    setPassInput("");
    setShowAuth(true);
  };
  const confirmRole = () => {
    if (ROLE_PASSWORD[pendingRole] === passInput.trim()) {
      setRol(pendingRole);
      setShowAuth(false);
    } else alert("Clave incorrecta");
  };

  // Métricas admin (desde ventasDia)
  const ticketsDay = ventasDia;

  const brasaOctavos = useMemo(() => {
    let oct = 0;
    for (const t of ticketsDay)
      for (const it of t.items) {
        const base = normalize(it.nombre);
        if (base === "CALDO DE GALLINA") continue;
        const eq = BRASA_EQ[base];
        if (eq) oct += eq * (it.cantidad || 0);
      }
    return { pollos: Math.floor(oct / 8), restoOctavos: oct % 8, totalOctavos: oct };
  }, [ticketsDay]);

  const parrillaControl = useMemo(() => {
    const acc = { POLLO: 0, CARNE: 0, CHULETA: 0 };
    for (const t of ticketsDay)
      for (const it of t.items) {
        const main = PARRILLA_MAIN(it.nombre);
        if (main) acc[main] += it.cantidad || 0;
      }
    return acc;
  }, [ticketsDay]);

  const gaseosaControl = useMemo(() => {
    const acc = { PERSONAL: 0, GORDITA: 0, LITRO: 0, "2 LITROS": 0 };
    for (const t of ticketsDay)
      for (const it of t.items) {
        const n = (it.nombre || "").toUpperCase();
        if (n.includes("GASEOSA PERSONAL")) acc.PERSONAL += it.cantidad || 0;
        else if (n.includes("GASEOSA GORDITA")) acc.GORDITA += it.cantidad || 0;
        else if (n.includes("GASEOSA LITRO") || n.includes("GASEOSA INKA 1 LT")) acc.LITRO += it.cantidad || 0;
        else if (n.includes("GASEOSA 2 LT") || n.includes("GASEOSA 2.25")) acc["2 LITROS"] += it.cantidad || 0;
      }
    return acc;
  }, [ticketsDay]);

  return {
    // constantes
    MESAS_TOTAL,
    ROLES,
    ROLE_PASSWORD,
    TAKEAWAY_BASE,
    isTakeawayId,

    // estados base
    pedidosPorMesa,
    estadoMesa,
    mesaSel,
    setMesaSel,
    abiertas,
    setAbiertas,
    rol,
    setRol,
    showAuth,
    setShowAuth,
    pendingRole,
    passInput,
    setPassInput,

    // auth
    requestRole,
    confirmRole,

    // ventas / día
    ventasDia,
    bizKey,

    // notas
    notasPorMesa,
    guardarNotaMesa,
    notaInputRef,

    // mesa actual / helpers
    draft,
    sent,
    itemsSent,
    totalSent,
    ensureMesa,
    mesaOcupada,
    setCant,
    enviarACocina,
    pendientesMesa,
    marcarListo,
    cobrarMesa,

    // “para llevar”
    createTakeaway,

    // métricas
    brasaOctavos,
    parrillaControl,
    gaseosaControl,
  };
}
