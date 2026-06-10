import {
  getMesaSnapshot,
  getMesaAbierta,
  upsertMesaAbierta,
  setEstadoMesa as setEstadoMesaDB,
  sendDiffToKitchen,
  cobrarMesaDB,
  subscribeMesa,
  getMesasConItems,
  subscribeMesas,
  getVentasPorFecha,
  getResumenAdminPorFecha,
  setCantidadListaItem,
  getProductosMenu,
  crearPedidoLlevarDB,
} from "../lib/dbHelpers";

import { useEffect, useMemo, useRef, useState } from "react";
import { ventasKey, businessKeyDate, formatFechaPE } from "../lib/fechas";
import { BRASA_EQ, normalize, PARRILLA_MAIN, PARRILLA_EQ} from "../config/mappings";
import { MESAS_TOTAL, ROLES, TAKEAWAY_BASE } from "../config/constants";
import { CATS as MENU_LOCAL } from "../config/menuData";

export function usePedidos(rolSupabase = null) {
  // pedidos[mesa] = { draft:{key:{precio,cantidad}}, sent:{}, ready:{}, nota? }
  const [pedidosPorMesa, setPedidosPorMesa] = useState({});
  const [estadoMesa, setEstadoMesa] = useState({});
  const [mesaSel, setMesaSel] = useState(1);
  const [abiertas, setAbiertas] = useState({});
  const [rol, setRol] = useState("MESERO");
  const rolEfectivo = rolSupabase || rol;
  const [productosMenu, setProductosMenu] = useState(MENU_LOCAL);
  const cobrandoRef = useRef(new Set());
  const [cobrandoMesas, setCobrandoMesas] = useState({});
  const [creandoLlevar, setCreandoLlevar] = useState(false);


  // Ventas día (local, para dashboard)
  const [ventasDia, setVentasDia] = useState([]);
  const [adminResumen, setAdminResumen] = useState({ tickets: 0, total: 0, items: [] });
  const [adminTicketsDetalle, setAdminTicketsDetalle] = useState([]);
  const [adminDetalleVisible, setAdminDetalleVisible] = useState(false);
  const [adminDetalleLoading, setAdminDetalleLoading] = useState(false);
  const [fechaNegocio, setFechaNegocio] = useState(businessKeyDate()); // "YYYY-MM-DD"
  const [bizKey, setBizKey] = useState(ventasKey());
  // dentro de useEffect de carga (src/hooks/usePedidos.js)
  
  // Notas por mesa
  const [notasPorMesa, setNotasPorMesa] = useState({});
  const notaInputRef = useRef(null);

useEffect(() => {
  let cancelado = false;

  async function cargarProductos() {
    try {
      const menu = await getProductosMenu();
      if (!cancelado && Array.isArray(menu) && menu.length > 0) {
        setProductosMenu(menu);
      }
    } catch (e) {
      console.warn("[productos] No se pudo cargar productos desde Supabase. Se usará el menú local.", e);
      if (!cancelado) setProductosMenu(MENU_LOCAL);
    }
  }

  cargarProductos();
  return () => {
    cancelado = true;
  };
}, []);

useEffect(() => {
  if (rolEfectivo !== "MESERO") return;

  let unsubscribe;
  let cancelado = false;

  async function loadMesaSafe() {
    try {
      const snap = await getMesaSnapshot(mesaSel);
      const mesa = await getMesaAbierta(mesaSel);
      if (cancelado) return;

      setPedidosPorMesa((prev) => {
        const prevMesa = prev[mesaSel] || {};
        return {
          ...prev,
          [mesaSel]: {
            draft: prevMesa.draft || {},
            sent: snap.sent || {},
            ready: snap.ready || prevMesa.ready || {},
            nota: mesa?.nota ?? prevMesa.nota ?? "",
            updatedAt: snap.updatedAt || mesa?.updated_at || prevMesa.updatedAt || "",
            enviadoAt: snap.enviadoAt || mesa?.enviado_at || prevMesa.enviadoAt || "",
          },
        };
      });

      if (mesa?.estado) {
        setEstadoMesa((prev) => ({ ...prev, [mesaSel]: mesa.estado }));
      }

      setNotasPorMesa((prev) => ({
        ...prev,
        [mesaSel]: mesa?.nota ?? prev[mesaSel] ?? "",
      }));
    } catch (err) {
      console.error('[loadMesaSafe] Error cargando mesa', err);
      if (cancelado) return;
      setPedidosPorMesa((prev) => ({
        ...prev,
        [mesaSel]: prev[mesaSel] || { draft: {}, sent: {}, ready: {}, nota: "" },
      }));
    }
  }

  loadMesaSafe();
  try {
    unsubscribe = subscribeMesa(mesaSel, loadMesaSafe);
  } catch (e) {
    console.error('[subscribeMesa] Error', e);
  }

  return () => {
    cancelado = true;
    if (typeof unsubscribe === "function") unsubscribe();
  };
}, [mesaSel, rolEfectivo]);

  useEffect(() => {
    const k = ventasKey();
    setBizKey(k);

    if (!["CAJERO", "ADMINISTRADOR"].includes(rolEfectivo)) return;

    try {
      localStorage.setItem(k, JSON.stringify(ventasDia));
    } catch {}
  }, [ventasDia, rolEfectivo]);
  // ==== MESAS EN VIVO: escuchar todas las mesas abiertas, pero sin hacer N consultas por mesa ====
  useEffect(() => {
    if (!["MESERO", "COCINERO", "CAJERO"].includes(rolEfectivo)) return;

    let unsubscribeAll;
    let timerId;
    let cancelado = false;

    async function refreshAllMesas() {
      try {
        const mesasConItems = await getMesasConItems();
        if (cancelado) return;

        setEstadoMesa(() => {
          const next = {};
          mesasConItems.forEach((m) => {
            next[m.id] = m.estado || "enviado";
          });
          return next;
        });

        setPedidosPorMesa((prev) => {
          const next = {};

          mesasConItems.forEach(({ id, snap, nota }) => {
            const prevMesa = prev[id] || {};
            next[id] = {
              draft: prevMesa.draft || {},
              sent: snap.sent || {},
              ready: snap.ready || prevMesa.ready || {},
              nota: nota ?? prevMesa.nota ?? "",
              updatedAt: snap.updatedAt || prevMesa.updatedAt || "",
              enviadoAt: snap.enviadoAt || prevMesa.enviadoAt || "",
            };
          });

          return next;
        });

        setNotasPorMesa((prev) => {
          const next = {};
          mesasConItems.forEach((m) => {
            next[m.id] = m.nota ?? prev[m.id] ?? "";
          });
          return next;
        });
      } catch (e) {
        console.error("[refreshAllMesas] Error", e);
      }
    }

    const scheduleRefreshAllMesas = () => {
      clearTimeout(timerId);
      timerId = setTimeout(refreshAllMesas, 150);
    };

    refreshAllMesas();

    try {
      unsubscribeAll = subscribeMesas(scheduleRefreshAllMesas);
    } catch (e) {
      console.error("[subscribeMesas] Error", e);
    }

    return () => {
      cancelado = true;
      clearTimeout(timerId);
      if (typeof unsubscribeAll === "function") unsubscribeAll();
    };
  }, [rolEfectivo]);

  const mapVentasRows = (rows = []) =>
    (rows || [])
      .map((row) => ({
        id: row.id || `${row.fecha}_${row.mesa}`,
        mesa: row.mesa,
        ts: row.ts || new Date(row.fecha).getTime(),
        dateISO: row.dateiso,
        fecha: formatFechaPE(row.fecha),
        items: row.data || [],
        total: row.total || 0,
        nota: row.nota || "",
      }))
      .sort((a, b) => b.ts - a.ts);

  // Carga de ventas: cajero necesita tickets completos; admin solo resumen liviano.
  useEffect(() => {
    if (!["CAJERO", "ADMINISTRADOR"].includes(rolEfectivo)) {
      setVentasDia([]);
      setAdminResumen({ tickets: 0, total: 0, items: [] });
      setAdminTicketsDetalle([]);
      setAdminDetalleVisible(false);
      return;
    }

    let cancelado = false;

    (async () => {
      try {
        if (rolEfectivo === "ADMINISTRADOR") {
          const resumen = await getResumenAdminPorFecha(fechaNegocio);
          if (cancelado) return;
          setAdminResumen(resumen || { tickets: 0, total: 0, items: [] });
          setAdminTicketsDetalle([]);
          setAdminDetalleVisible(false);
          setVentasDia([]);
          return;
        }

        const rows = await getVentasPorFecha(fechaNegocio);
        if (cancelado) return;
        setVentasDia(mapVentasRows(rows));
      } catch (e) {
        console.error("[usePedidos] Error cargando ventas/resumen por fecha", e);
        if (!cancelado) {
          setVentasDia([]);
          setAdminResumen({ tickets: 0, total: 0, items: [] });
        }
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [fechaNegocio, rolEfectivo]);

  const cargarAdminTicketsDetalle = async () => {
    if (adminDetalleLoading) return adminTicketsDetalle;
    setAdminDetalleLoading(true);
    try {
      const rows = await getVentasPorFecha(fechaNegocio);
      const mapped = mapVentasRows(rows);
      setAdminTicketsDetalle(mapped);
      setAdminDetalleVisible(true);
      return mapped;
    } catch (e) {
      console.error("[cargarAdminTicketsDetalle] Error cargando tickets", e);
      alert("No se pudo cargar el detalle de tickets. Revisa la conexión e intenta otra vez.");
      return [];
    } finally {
      setAdminDetalleLoading(false);
    }
  };

  const ocultarAdminTicketsDetalle = () => {
    setAdminDetalleVisible(false);
  };

  // Helpers “para llevar”
  const isTakeawayId = (id) => Number(id) >= TAKEAWAY_BASE;
  const nextTakeawayId = () => {
    // busca el mayor id >= base en memoria y suma 1; si no hay, 9001
    const ids = Object.keys({ ...pedidosPorMesa, ...estadoMesa }).map(Number);
    const maxL = ids.filter((x) => x >= TAKEAWAY_BASE).reduce((m, x) => Math.max(m, x), TAKEAWAY_BASE);
    return maxL + 1;
  };
  const createTakeaway = async () => {
    if (creandoLlevar) return;
    setCreandoLlevar(true);

    try {
      const id = await crearPedidoLlevarDB();
      const nowIso = new Date().toISOString();

      setPedidosPorMesa((prev) => ({
        ...prev,
        [id]: {
          ...ensureMesa(prev[id]),
          updatedAt: nowIso,
          enviadoAt: prev[id]?.enviadoAt || "",
        },
      }));
      setEstadoMesa((prev) => ({ ...prev, [id]: "tomando" }));
      setMesaSel(id);
    } catch (e) {
      console.error("[createTakeaway] Error creando pedido para llevar", e);
      alert("No se pudo crear el pedido para llevar. Revisa Supabase o tu conexión.");
    } finally {
      setCreandoLlevar(false);
    }
  };

  const ensureMesa = (m) => ({ draft: {}, sent: {}, ready: {}, updatedAt: "", ...(m || {}) });

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
      return { ...prev, [mesaSel]: { ...m, nota: texto, updatedAt: new Date().toISOString() } };
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
      [mesaSel]: { ...m, sent: snap.sent || {}, ready: snap.ready || {}, draft: {}, nota: notaActual, updatedAt: snap.updatedAt || new Date().toISOString(), enviadoAt: snap.enviadoAt || new Date().toISOString() },
    }));
    setEstadoMesa((prev) => ({ ...prev, [mesaSel]: "enviado" }));
  };

// Productos que NO van a cocina (solo caja)
// Ajusta la lista según tus nombres reales
const esSoloCaja = (nombre) => {
  const n = (nombre || "").toUpperCase();

  // === BEBIDAS ===
  if (
    n.includes("INKA PERSONAL VIDRIO") ||
    n.includes("INKA PERSONAL DESC") ||
    n.includes("CONCORDIA PERSONAL") ||
    n.includes("GORDITA") ||
    n.includes("INKA LITRO") ||
    n.includes("PEPSI LITRO") ||
    n.includes("INKA 1.5 LT") ||
    n.includes("CONCORDIA 2 LT") ||
    n.includes("INKA 2 LT") ||
    n.includes("INKA 2.25 LT") ||
    n.includes("JARRA DE CHICHA") ||
    n.includes("JARRA DE MARACUYA") ||
    n.includes("MEDIA JARRA DE CHICHA") ||
    n.includes("MEDIA JARRA DE MARACUYA") ||
    n.includes("VASO DE CHICHA") ||
    n.includes("VASO DE MARACUYA") ||
    n.includes("AGUA MINERAL")

  ) {
    return true;
  }

  // === OTROS ===
  // Aquí mete lo que tengas en categoría OTROS
  if (
    n.includes("TAPER") ||
    n.includes("CREMA")
    // agrega más: || n.includes("…")
  ) {
    return true;
  }

  return false;
};
  
// Pendientes para cocina (local, a partir de sent y ready)
const pendientesMesa = (id) => {
  const m = ensureMesa(pedidosPorMesa[id]);
  const s = m.sent || {}, r = m.ready || {};
  const out = [];

  Object.keys(s).forEach((nombre) => {
    // 🔴 si es bebida u "OTROS", no va a cocina
    if (esSoloCaja(nombre)) return;

    const q = (s[nombre]?.cantidad || 0) - (r[nombre]?.cantidad || 0);
    if (q > 0) {
      out.push({
        nombre,
        precio: s[nombre].precio,
        cantidad: q,
      });
    }
  });

  return out;
};

const marcarListo = async (id, nombreKey, qty) => {
  if (qty <= 0) return;

  const mesaActual = ensureMesa(pedidosPorMesa[id]);
  const sent = mesaActual.sent || {};
  const ready = { ...(mesaActual.ready || {}) };
  const infoSent = sent[nombreKey] || {};
  const cantidadPedida = Number(infoSent.cantidad || 0);
  const actual = Number(ready[nombreKey]?.cantidad || 0);
  const nuevaLista = Math.min(cantidadPedida, actual + Number(qty || 0));

  try {
    const listaGuardada = await setCantidadListaItem(id, nombreKey, qty);

    const readyActualizado = {
      ...ready,
      [nombreKey]: {
        precio: infoSent.precio || ready[nombreKey]?.precio || 0,
        cantidad: listaGuardada,
      },
    };

    const quedanPendientes = Object.keys(sent).some((nombre) => {
      if (esSoloCaja(nombre)) return false;
      const pedido = Number(sent[nombre]?.cantidad || 0);
      const listo = Number(readyActualizado[nombre]?.cantidad || 0);
      return pedido - listo > 0;
    });

    setPedidosPorMesa((prev) => {
      const mesa = ensureMesa(prev[id]);
      return {
        ...prev,
        [id]: {
          ...mesa,
          ready: readyActualizado,
          updatedAt: new Date().toISOString(),
        },
      };
    });

    await setEstadoMesaDB(id, quedanPendientes ? "enviado" : "listo");
    setEstadoMesa((prev) => ({ ...prev, [id]: quedanPendientes ? "enviado" : "listo" }));
  } catch (e) {
    console.error("[marcarListo] Error guardando LISTO en Supabase", e);
    alert("No se pudo guardar LISTO. Revisa tu conexión e intenta otra vez.");
  }
};
// Cajero: cobrar y limpiar
const isCobrandoMesa = (id) => !!cobrandoMesas[id];

const cobrarMesa = async (id) => {
  if (cobrandoRef.current.has(id)) return;

  const m = ensureMesa(pedidosPorMesa[id]);
  const s = m.sent || {};

  // Construimos los ítems del ticket
  const items = Object.entries(s).map(([nombre, v]) => ({
    nombre,
    precio: v.precio,
    cantidad: v.cantidad,
    subtotal: v.precio * v.cantidad,
  }));

  const totalTicket = items.reduce((a, it) => a + it.subtotal, 0);
  if (totalTicket <= 0) return; // nada que cobrar

  cobrandoRef.current.add(id);
  setCobrandoMesas((prev) => ({ ...prev, [id]: true }));

  const notaTicket = (m.nota ?? notasPorMesa[id] ?? "").trim();
  const now = new Date();
  const dateISO = businessKeyDate(now); // ej: "2025-11-05"
  const baseTicketTs = Date.parse(m.updatedAt || "") || now.getTime();

  const ticket = {
    id: `VENTA_${id}_${baseTicketTs}`, // id estable: evita doble cobro si presionan 2 veces por internet lento
    mesa: id,
    ts: now.getTime(),
    dateISO,
    fecha: formatFechaPE(now),
    items,
    total: totalTicket,
    nota: notaTicket,
  };

  let yaRegistrado = false;

  try {
    await cobrarMesaDB({
      id: ticket.id,
      mesa: id,
      dateISO,
      fecha: now.toISOString(),
      items,
      total: totalTicket,
      nota: notaTicket,
    });
  } catch (e) {
    if (e?.code === "23505") {
      // Ya se guardó este mismo cobro. No lo volvemos a insertar.
      yaRegistrado = true;
      console.warn("[cobrarMesa] Cobro duplicado bloqueado", e);
    } else {
      console.error("[cobrarMesa] Error al cobrar", e);
      alert("No se pudo guardar la venta en Supabase. Revisa tu conexión e intenta otra vez.");
      cobrandoRef.current.delete(id);
      setCobrandoMesas((prev) => ({ ...prev, [id]: false }));
      return;
    }
  }

  if (!yaRegistrado) {
    setVentasDia((prev) => [ticket, ...prev]);
  }

  // Limpiar la mesa de la memoria (desaparece del cajero / cocina)
  setPedidosPorMesa((prev) => {
    const cp = { ...prev };
    delete cp[id];
    return cp;
  });

  setEstadoMesa((prev) => ({
    ...prev,
    [id]: "cobrado",
  }));

  setNotasPorMesa((prev) => {
    const cp = { ...prev };
    delete cp[id];
    return cp;
  });

  if (mesaSel === id) {
    setAbiertas({});
  }

  cobrandoRef.current.delete(id);
  setCobrandoMesas((prev) => {
    const cp = { ...prev };
    delete cp[id];
    return cp;
  });
};

  // Métricas admin. En administrador usamos resumen agrupado para no cargar ticket por ticket.
  const ticketsDay = rolEfectivo === "ADMINISTRADOR"
    ? [{ items: adminResumen.items || [] }]
    : ventasDia;

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
  const acc = { POLLO: 0, CARNE: 0, CHULETA: 0, COMBINADO: 0, MIXTO: 0, ANTICUCHO: 0, MOLLEJITAS: 0};

  for (const t of ticketsDay) {
    for (const it of t.items) {
      const nombre = (it.nombre || "").toUpperCase();
      const qty = it.cantidad || 0;
      // 🔥 NUEVO: detectar estos productos
      if (nombre.includes("COMBINADO")) {
        acc.COMBINADO += qty;
      }

      if (nombre.includes("MIXTO")) {
        acc.MIXTO += qty;
      }

      if (nombre.includes("MOLLEJITAS")) {
        acc.MOLLEJITAS += qty;
      }

      if (nombre.includes("ANTICUCHO")) {
        // Regla de control:
        // - "ANTICUCHOS" del grupo Parrillas = 1 porción (vienen 2 palitos).
        // - Cualquier otro producto con ANTICUCHO = 0.5 porción (viene 1 palito).
        const nombreBase = normalize(nombre);
        acc.ANTICUCHO += (nombreBase === "ANTICUCHOS" ? 1 : 0.5) * qty;
      }

      // 1️⃣ Primero usar mapeo simple (platos directos)
      const main = PARRILLA_MAIN(nombre);
      if (main) {
        acc[main] += qty;
        continue;
      }

      // 2️⃣ Luego revisar equivalencias para parrillas especiales
      for (const key of Object.keys(PARRILLA_EQ)) {
        if (nombre.includes(key)) {
          const eq = PARRILLA_EQ[key];
          acc.POLLO   += eq.POLLO   * qty;
          acc.CARNE   += eq.CARNE   * qty;
          acc.CHULETA += eq.CHULETA * qty;
          break;
        }
      }
    }
  }

  return acc;
}, [ticketsDay]);


// usePedidos.js
const bebidasControl = useMemo(() => {
  const acc = {
    personalesVidrio: 0,       // Personales de Vidrio (INK, CC, FTA)
    personalesDesc: 0,         // Personales Descartables (INK, CC)
    personalConcordia: 0,      // Personal Concordia
    gordita: 0,                // Gordita
    gaseosaLitro: 0,           // Gaseosa Litro (INKA LITRO)
    pepsiLitro: 0,             // Pepsi Litro
    gaseosa15: 0,              // Gaseosa 1.5 LT (INK, CC)
    gaseosaConcordia2: 0,      // Gaseosa Concordia 2 LT
    gaseosa2: 0,               // Gaseosa 2 LT (INK, CC) -> incluye 2.25
    aguaMineral: 0,            // Agua Mineral
  };

  const is = (name, re) => re.test(name);

  for (const t of ticketsDay) {
    for (const it of t.items) {
      const n = (it.nombre || "").toUpperCase();
      const q = it.cantidad || 0;

      // 1) Personales de Vidrio (INK, CC, FTA) -> "PERSONAL" sin "DESC"
      if (
        is(n, /\bPERSONAL\b/) &&
        !is(n, /\bDESC\b/) &&
        is(n, /\b(INKA|COCA|COCA COLA|FANTA)\b/)
      ) {
        acc.personalesVidrio += q;
        continue;
      }

      // 2) Personales Descartables (INK, CC) -> contiene "PERSONAL DESC"
      if (
        is(n, /\bPERSONAL\b/) &&
        is(n, /\bDESC\b/) &&
        is(n, /\b(INKA|COCA|COCA COLA)\b/)
      ) {
        acc.personalesDesc += q;
        continue;
      }

      // 3) Personal Concordia
      if (is(n, /\bCONCORDIA\b.*\bPERSONAL\b/)) {
        acc.personalConcordia += q;
        continue;
      }

      // 4) Gordita
      if (is(n, /\bGORDITA\b/)) {
        acc.gordita += q;
        continue;
      }

      // 5) Gaseosa Litro (INKA LITRO)
      if (is(n, /\bINKA\b.*\bLITRO\b/)) {
        acc.gaseosaLitro += q;
        continue;
      }

      // 6) Pepsi Litro
      if (is(n, /\bPEPSI\b.*\bLITRO\b/)) {
        acc.pepsiLitro += q;
        continue;
      }

      // 7) Gaseosa 1.5 LT (INK, CC)
      if (is(n, /\b(INKA|COCA|COCA COLA)\b.*\b1\.?5\b.*\bLT\b/)) {
        acc.gaseosa15 += q;
        continue;
      }

      // 8) Gaseosa Concordia 2 LT
      if (is(n, /\bCONCORDIA\b.*\b2\b.*\bLT\b/)) {
        acc.gaseosaConcordia2 += q;
        continue;
      }

      // 9) Gaseosa 2 LT (INK, CC) — agrupa 2.0 y 2.25
      if (is(n, /\b(INKA|COCA|COCA COLA)\b.*\b2(\.25)?\b.*\bLT\b/)) {
        acc.gaseosa2 += q;
        continue;
      }

      // 10) Agua Mineral
      if (is(n, /\bAGUA\b.*\bMINERAL\b/)) {
        acc.aguaMineral += q;
        continue;
      }
    }
  }

  return acc;
}, [ticketsDay]);


const chifaControl = useMemo(() => {
  const acc = {
    CHAUFA: 0,
    AEROPUERTO: 0,
  };

  for (const t of ticketsDay) {
    for (const it of t.items) {
      const n = (it.nombre || "").toUpperCase();
      const q = Number(it.cantidad || 0);

      // Cuenta todos los chaufas: mixto, pollo, carne, chancho, etc.
      if (n.includes("CHAUFA")) {
        acc.CHAUFA += q;
      }

      // Cuenta todos los aeropuertos: mixto, pollo, carne, chancho, etc.
      if (n.includes("AEROPUERTO")) {
        acc.AEROPUERTO += q;
      }
    }
  }

  return acc;
}, [ticketsDay]);


  return {
    // constantes
    MESAS_TOTAL,
    ROLES,
    TAKEAWAY_BASE,
    isTakeawayId,

    // productos
    productosMenu,

    // estados base
    pedidosPorMesa,
    estadoMesa,
    mesaSel,
    setMesaSel,
    abiertas,
    setAbiertas,
    rol,
    setRol,

    // ventas / día
    ventasDia,
    adminResumen,
    adminTicketsDetalle,
    adminDetalleVisible,
    adminDetalleLoading,
    cargarAdminTicketsDetalle,
    ocultarAdminTicketsDetalle,
    bizKey,

    fechaNegocio,
    setFechaNegocio,
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
    isCobrandoMesa,

    // “para llevar”
    createTakeaway,
    creandoLlevar,

    // métricas
    brasaOctavos,
    parrillaControl,
    bebidasControl,
    chifaControl,
  };
}
