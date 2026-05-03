// src/lib/dbHelpers.js
import { supabase } from './db';

/** ========== LECTURAS / ESCRITURAS BÁSICAS ========== */

/** Devuelve {sent, ready, nota} a partir de DB para una mesa */
export async function getMesaSnapshot(mesaId) {
  // mesa (nota/estado)
  const { data: mesa, error: e1 } = await supabase
    .from('mesas')
    .select('*')
    .eq('id', mesaId)
    .maybeSingle();
  if (e1) throw e1;

  // items enviados
  const { data: items, error: e2 } = await supabase
    .from('mesa_items')
    .select('*')
    .eq('mesa_id', mesaId);
  if (e2) throw e2;

  const sent = {};
  (items || []).forEach((it) => {
    sent[it.nombre] = { precio: Number(it.precio), cantidad: Number(it.cantidad || 0) };
  });

  return {
    draft: {},      // el draft es local
    sent,
    ready: {},      // si deseas, podrías tener otra tabla para "ready"
    nota: mesa?.nota || ''
  };
}

/** Trae una mesa abierta (si existe) */
export async function getMesaAbierta(mesaId) {
  const { data, error } = await supabase
    .from('mesas')
    .select('id, estado, nota')
    .eq('id', mesaId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/** Crea/actualiza una mesa abierta con estado/nota */
export async function upsertMesaAbierta(mesaId, estado = 'tomando', nota = '') {
  const payload = {
    id: mesaId,
    estado,
    nota: (nota || '').trim(),
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('mesas').upsert(payload);
  if (error) throw error;
}

/** Cambia solo el estado */
export async function setEstadoMesa(mesaId, estado) {
  const { error } = await supabase
    .from('mesas')
    .upsert({ id: mesaId, estado, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Cambia solo la nota */
export async function setNotaMesa(mesaId, nota) {
  const { error } = await supabase
    .from('mesas')
    .upsert({ id: mesaId, nota: (nota || '').trim(), updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Sube delta de draft contra prevSent a mesa_items y marca mesa enviada */
export async function sendDiffToKitchen(mesaId, draft, prevSent) {
  const rows = [];

  Object.entries(draft || {}).forEach(([nombre, { precio, cantidad } = {}]) => {
    const ya = Number(prevSent?.[nombre]?.cantidad || 0); // lo que ya estaba enviado
    const delta = Number(cantidad || 0);                  // lo nuevo en borrador
    const nuevaCantidad = ya + delta;                     // TOTAL acumulado

    if (nuevaCantidad > 0) {
      rows.push({
        mesa_id: mesaId,
        nombre,
        precio: Number(precio || 0),
        cantidad: nuevaCantidad, // 👈 ahora guardamos el total (ya + delta)
      });
    }
  });

  if (rows.length) {
    const { error } = await supabase.from("mesa_items").upsert(rows);
    if (error) throw error;
  }

  const { error: e2 } = await supabase
    .from("mesas")
    .upsert({
      id: mesaId,
      estado: "enviado",
      updated_at: new Date().toISOString(),
    });
  if (e2) throw e2;
}

/** Cobrar: inserta venta y limpia mesa */
export async function cobrarMesaDB({ id, mesa, dateISO, fecha, items, total, nota }) {
  const payload = {
    id,              // 👈 ID del ticket (texto)
    mesa,            // int4
    ts: Date.now(),  // int8, timestamp en ms
    dateiso: dateISO, // 👈 columna en la BD se llama "dateiso"
    fecha,           // timestamptz (ISO string)
    total,           // numeric
    nota,            // text
    data: items,     // jsonb (tu columna se llama "data")
  };

  console.log("[cobrarMesaDB] Payload venta:", payload);

  const { error } = await supabase.from("ventas").insert(payload);

  if (error) {
    console.error("[cobrarMesaDB] Error insertando venta", error);
    throw error; // dejamos que subir el error para que cobrarMesa se entere
  }

  // 2️⃣ Borra items de la mesa
  const { error: eItems } = await supabase
    .from("mesa_items")
    .delete()
    .eq("mesa_id", mesa);

  if (eItems) {
    console.error("[cobrarMesaDB] Error borrando mesa_items", eItems);
  }

  // 3️⃣ Borra la mesa en "mesas"
  const { error: eMesa } = await supabase
    .from("mesas")
    .delete()
    .eq("id", mesa);

  if (eMesa) {
    console.error("[cobrarMesaDB] Error borrando mesa", eMesa);
  }
}

/** Lee ventas recientes; el filtro por día se hace en el frontend */
export async function getVentasDelDia(dayKey) {
  const { data, error } = await supabase
    .from("ventas")
    .select("id, mesa, fecha, dateiso, total, nota, data, ts")
    .eq("dateiso", dayKey)           // 👈 filtro en la BD
    .order("fecha", { ascending: false });

  if (error) throw error;
  return data || [];
}
// Lee ventas EXACTAS de un día de negocio (columna 'dateiso')
export async function getVentasPorFecha(dateISO) {
  const { data, error } = await supabase
    .from("ventas")
    .select("id, mesa, fecha, dateiso, total, nota, data, ts")
    .eq("dateiso", dateISO)
    .order("fecha", { ascending: false });

  if (error) {
    console.error("[getVentasPorFecha] Error", error);
    throw error;
  }
  return data || [];
}

/** ========== UTILIDADES PARA “TODAS LAS MESAS” ========== */

/** Lista todas las mesas abiertas (existen en tabla mesas) */
export async function listMesasAbiertas() {
  const { data, error } = await supabase
    .from('mesas')
    .select('id, estado, nota')
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Realtime: escucha cualquier cambio en la tabla mesas (alta/baja/cambio) */
export function subscribeMesas(onChange) {
  const ch = supabase.channel('mesas-all');

  ch.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'mesas' },
    () => { try { onChange(); } catch(e){ console.error(e); } }
  ).subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      try { onChange(); } catch(e){ console.error(e); }
    }
  });

  return () => supabase.removeChannel(ch);
}

/** Realtime: escucha una mesa (mesas + mesa_items) y dispara onChange */
export function subscribeMesa(mesaId, onChange) {
  const channel = supabase.channel(`mesa-${mesaId}`);

  channel
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'mesas', filter: `id=eq.${mesaId}` },
      () => { try { onChange(); } catch(e){ console.error(e);} })
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'mesa_items', filter: `mesa_id=eq.${mesaId}` },
      () => { try { onChange(); } catch(e){ console.error(e);} })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        try { onChange(); } catch(e){ console.error(e); }
      }
    });

  return () => supabase.removeChannel(channel);
}
