import {
  getMesaSnapshot,
  getMesaAbierta,
  upsertMesaAbierta,
  setEstadoMesa as setEstadoMesaDB,
  sendDiffToKitchen,
  cobrarMesaDB,
  subscribeMesa,
  listMesasAbiertas,
  subscribeMesas,
  getVentasDelDia,
  getVentasPorFecha,
} from "../lib/dbHelpers";

import { useEffect, useMemo, useRef, useState } from "react";
import { ventasKey, businessKeyDate, formatFechaPE } from "../lib/fechas";
import { BRASA_EQ, normalize, PARRILLA_MAIN, PARRILLA_EQ} from "../config/mappings";
import { MESAS_TOTAL, ROLES, TAKEAWAY_BASE } from "../config/constants";

export function usePedidos() {
  // pedidos[mesa] = { draft:{key:{precio,cantidad}}, sent:{}, ready:{}, nota? }
  const [pedidosPorMesa, setPedidosPorMesa] = useState({});
  const [estadoMesa, setEstadoMesa] = useState({});
  const [mesaSel, setMesaSel] = useState(1);
  const [abiertas, setAbiertas] = useState({});
  const [rol, setRol] = useState("MESERO");

  // Ventas día (local, para dashboard)
  const [ventasDia, setVentasDia] = useState([]);
  const [fechaNegocio, setFechaNegocio] = useState(businessKeyDate()); // "YYYY-MM-DD"
  const [bizKey, setBizKey] = useState(ventasKey());
  // dentro de useEffect de carga (src/hooks/usePedidos.js)
  
  // Notas por mesa
  const [notasPorMesa, setNotasPorMesa] = useState({});
  const notaInputRef = useRef(null);

useEffect(() => {
  let unsubscribe;

  async function loadMesaSafe() {
    try {
      // 1) Items persistidos en DB
      const snap = await getMesaSnapshot(mesaSel); // {sent:{}, ready:{}}

      // 2) Estado/nota de la mesa
      const mesa = await getMesaAbierta(mesaSel);

      // 3) Estado local
      setPedidosPorMesa((prev) => {
        const prevMesa = prev[mesaSel] || {};
        return {
          ...prev,
          [mesaSel]: {
            draft: prevMesa.draft || {},
            sent: snap.sent || {},
            // 👇 conservamos lo que ya estaba listo en este dispositivo
            ready: prevMesa.ready || {},
            nota: mesa?.nota ?? prevMesa.nota ?? "",
          },
        };
      });
      // 4) Estado de la mesa
      if (mesa?.estado) {
        setEstadoMesa((prev) => ({ ...prev, [mesaSel]: mesa.estado }));
      }

      // 5) Nota local
      setNotasPorMesa((prev) => ({
        ...prev,
        [mesaSel]: mesa?.nota ?? prev[mesaSel] ?? "",
      }));
    } catch (err) {
      console.error('[loadMesaSafe] Error cargando mesa', err);
      // No crashea la UI: sólo deja la mesa en estado local.
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
    if (typeof unsubscribe === "function") unsubscribe();
  };
}, [mesaSel]);

  useEffect(() => {
    const k = ventasKey();
    setBizKey(k);
    try {
      localStorage.setItem(k, JSON.stringify(ventasDia));
    } catch {}
  }, [ventasDia]);
  // ==== COCINA EN VIVO: escuchar TODAS las mesas abiertas ====
  useEffect(() => {
    let unsubscribeAll;

    async function refreshAllMesas() {
      try {
        // 1) Traer todas las mesas abiertas (id, estado, nota)
        const mesas = await listMesasAbiertas(); // [{id, estado, nota}, ...]

        // 2) Actualizar estados de mesa
        setEstadoMesa((prev) => {
          const next = { ...prev };
          mesas.forEach((m) => {
            next[m.id] = m.estado || "enviado";
          });
          return next;
        });

        // 3) Cargar snapshot (sent/ready) de cada mesa
        const snaps = await Promise.all(
          mesas.map(async (m) => {
            const snap = await getMesaSnapshot(m.id);
            return { id: m.id, snap, nota: m.nota };
          })
        );

        // 4) Actualizar pedidosPorMesa manteniendo el draft local si existe
        setPedidosPorMesa((prev) => {
          const next = { ...prev };
          snaps.forEach(({ id, snap, nota }) => {
            const prevMesa = prev[id] || { draft: {}, sent: {}, ready: {}, nota: "" };
            next[id] = {
              draft: prevMesa.draft || {},
              sent: snap.sent || {},
              ready: prevMesa.ready || {},
              nota: nota ?? prevMesa.nota ?? "",
            };
          });
          return next;
        });

        // 5) Actualizar notasPorMesa
        setNotasPorMesa((prev) => {
          const next = { ...prev };
          mesas.forEach((m) => {
            next[m.id] = m.nota ?? prev[m.id] ?? "";
          });
          return next;
        });
      } catch (e) {
        console.error("[refreshAllMesas] Error", e);
      }
    }

    // Primera carga
    refreshAllMesas();

    // Suscripción realtime a cualquier cambio en tabla "mesas"
    try {
      unsubscribeAll = subscribeMesas(refreshAllMesas);
    } catch (e) {
      console.error("[subscribeMesas] Error", e);
    }

    return () => {
      if (typeof unsubscribeAll === "function") unsubscribeAll();
    };
  }, []);

  // Cargar tickets del día (EN FUNCIÓN DE fechaNegocio)
  useEffect(() => {
    (async () => {
      try {
        const rows = await getVentasPorFecha(fechaNegocio);
        const mapped = (rows || [])
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

        setVentasDia(mapped);
      } catch (e) {
        console.error("[usePedidos] Error cargando ventas por fecha", e);
        setVentasDia([]);
      }
    })();
  }, [fechaNegocio]);

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

const marcarListo = async (id, nombreKey, qty) => {
  if (qty <= 0) return;

  // 1) Actualizar "ready" SOLO en el estado local (no en la BD)
  setPedidosPorMesa((prev) => {
    const mesa = ensureMesa(prev[id]);
    const sent = mesa.sent || {};
    const ready = { ...(mesa.ready || {}) };

    const infoSent = sent[nombreKey] || {};
    const actual = ready[nombreKey]?.cantidad || 0;
    const nueva = actual + qty;

    ready[nombreKey] = {
      precio: infoSent.precio || ready[nombreKey]?.precio || 0,
      cantidad: nueva,
    };

    return {
      ...prev,
      [id]: {
        ...mesa,
        ready,
      },
    };
  });

  // 2) Actualizar solo el estado de la mesa en la tabla "mesas"
  await setEstadoMesaDB(id, "listo");
};
// Cajero: cobrar y limpiar
const cobrarMesa = async (id) => {
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

  const notaTicket = (m.nota ?? notasPorMesa[id] ?? "").trim();
  const now = new Date();
  const dateISO = businessKeyDate(now); // ej: "2025-11-05"

  const ticket = {
    id: `${Date.now()}_${id}`, // 👈 mismo ID que también mandamos a Supabase
    mesa: id,
    ts: now.getTime(),
    dateISO,
    fecha: formatFechaPE(now),
    items,
    total: totalTicket,
    nota: notaTicket,
  };

  // 1️⃣ Actualizar dashboard local al toque
  setVentasDia((prev) => [ticket, ...prev]);

  // 2️⃣ Guardar en Supabase
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
    console.error("[cobrarMesa] Error al cobrar", e);
    alert("No se pudo guardar la venta en Supabase. Revisa la consola (F12 → Console) para más detalle.");
    return;
  }

  // 3️⃣ Limpiar la mesa de la memoria (desaparece del cajero / cocina)
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

  for (const t of ticketsDay) {
    for (const it of t.items) {
      const nombre = (it.nombre || "").toUpperCase();
      const qty = it.cantidad || 0;

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


  return {
    // constantes
    MESAS_TOTAL,
    ROLES,
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

    // ventas / día
    ventasDia,
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

    // “para llevar”
    createTakeaway,

    // métricas
    brasaOctavos,
    parrillaControl,
    bebidasControl,
  };
}
