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
    const ya = Number(prevSent?.[nombre]?.cantidad || 0);
    const next = Number(cantidad || 0);
    if (next > 0) {
      rows.push({
        mesa_id: mesaId,
        nombre,
        precio: Number(precio || 0),
        cantidad: next
      });
    }
  });

  if (rows.length) {
    const { error } = await supabase.from('mesa_items').upsert(rows);
    if (error) throw error;
  }

  const { error: e2 } = await supabase
    .from('mesas')
    .upsert({ id: mesaId, estado: 'enviado', updated_at: new Date().toISOString() });
  if (e2) throw e2;
}

/** Cobrar: inserta venta y limpia mesa */
export async function cobrarMesaDB({ mesa, dateISO, fecha, items, total, nota }) {
  // 1️⃣ Guarda ticket en ventas
  await supabase.from("ventas").insert({
    mesa,
    fecha,
    dateISO,
    total,
    nota,
    items,
  });

  // 2️⃣ Elimina todos los items asociados
  await supabase.from("mesa_items").delete().eq("mesa", mesa);

  // 3️⃣ ⚡ Elimina la mesa completa (esto dispara el DELETE realtime)
  await supabase.from("mesas").delete().eq("id", mesa);
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
