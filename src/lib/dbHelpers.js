// src/lib/dbHelpers.js
import { supabase } from './db';

/** ========== LECTURAS / ESCRITURAS BÁSICAS ========== */

function agruparItemsPorNombre(items = []) {
  const sent = {};

  (items || []).forEach((it) => {
    const nombre = it.nombre;
    if (!nombre) return;

    const previo = sent[nombre];
    sent[nombre] = {
      precio: Number(it.precio || previo?.precio || 0),
      cantidad: Number(previo?.cantidad || 0) + Number(it.cantidad || 0),
    };
  });

  return sent;
}

function agruparListosPorNombre(items = []) {
  const ready = {};

  (items || []).forEach((it) => {
    const nombre = it.nombre;
    if (!nombre) return;

    const cantidadLista = Number(it.cantidad_lista || 0);
    if (cantidadLista <= 0) return;

    const previo = ready[nombre];
    ready[nombre] = {
      precio: Number(it.precio || previo?.precio || 0),
      cantidad: Number(previo?.cantidad || 0) + cantidadLista,
    };
  });

  return ready;
}

function agruparProductos(rows = []) {
  const cats = [];
  const byKey = new Map();

  (rows || []).forEach((row) => {
    const key = row.categoria_key || 'OTROS';
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        label: row.categoria_label || key,
        items: [],
        categoria_orden: Number(row.categoria_orden || 0),
      });
    }

    byKey.get(key).items.push({
      nombre: row.nombre,
      precio: Number(row.precio || 0),
    });
  });

  byKey.forEach((cat) => {
    cats.push({ key: cat.key, label: cat.label, items: cat.items });
  });

  return cats;
}

/** Crea un pedido PARA LLEVAR con numeración controlada por Supabase.
 *  Devuelve el id real de la mesa, por ejemplo 10000 => LLEVAR 1000.
 */
export async function crearPedidoLlevarDB() {
  const { data, error } = await supabase.rpc('crear_pedido_llevar');
  if (error) throw error;

  const id = Array.isArray(data) ? data[0] : data;
  const numero = Number(id);
  if (!Number.isFinite(numero) || numero <= 0) {
    throw new Error('Supabase no devolvió un ID válido para el pedido para llevar.');
  }
  return numero;
}

/** Productos desde Supabase: así cambias precios en la tabla productos sin tocar código. */
export async function getProductosMenu() {
  const { data, error } = await supabase
    .from('productos')
    .select('categoria_key, categoria_label, categoria_orden, nombre, precio, orden, activo')
    .eq('activo', true)
    .order('categoria_orden', { ascending: true })
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true });

  if (error) throw error;
  return agruparProductos(data || []);
}

/** Devuelve {sent, ready, nota, updatedAt} a partir de DB para una mesa */
export async function getMesaSnapshot(mesaId) {
  const { data: mesa, error: e1 } = await supabase
    .from('mesas')
    .select('id, estado, nota, updated_at, enviado_at')
    .eq('id', mesaId)
    .maybeSingle();
  if (e1) throw e1;

  const { data: items, error: e2 } = await supabase
    .from('mesa_items')
    .select('mesa_id, nombre, precio, cantidad, cantidad_lista')
    .eq('mesa_id', mesaId);
  if (e2) throw e2;

  return {
    draft: {},
    sent: agruparItemsPorNombre(items || []),
    ready: agruparListosPorNombre(items || []),
    nota: mesa?.nota || '',
    updatedAt: mesa?.updated_at || '',
    enviadoAt: mesa?.enviado_at || mesa?.updated_at || '',
  };
}

/** Trae una mesa abierta (si existe) */
export async function getMesaAbierta(mesaId) {
  const { data, error } = await supabase
    .from('mesas')
    .select('id, estado, nota, updated_at, enviado_at')
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
    updated_at: new Date().toISOString(),
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

/** Sube delta de draft contra prevSent a mesa_items y marca mesa enviada.
 *  Conserva cantidad_lista para que lo ya marcado LISTO no vuelva a aparecer.
 */
export async function sendDiffToKitchen(mesaId, draft, prevSent) {
  const nombres = Object.keys(draft || {}).filter((nombre) => Number(draft[nombre]?.cantidad || 0) > 0);

  if (nombres.length) {
    const { data: actuales, error: eRead } = await supabase
      .from('mesa_items')
      .select('mesa_id, nombre, precio, cantidad, cantidad_lista')
      .eq('mesa_id', mesaId)
      .in('nombre', nombres);
    if (eRead) throw eRead;

    const actualPorNombre = {};
    (actuales || []).forEach((it) => {
      const prev = actualPorNombre[it.nombre] || { cantidad: 0, cantidad_lista: 0, precio: 0 };
      actualPorNombre[it.nombre] = {
        precio: Number(it.precio || prev.precio || 0),
        cantidad: Number(prev.cantidad || 0) + Number(it.cantidad || 0),
        cantidad_lista: Number(prev.cantidad_lista || 0) + Number(it.cantidad_lista || 0),
      };
    });

    const rows = nombres.map((nombre) => {
      const info = draft[nombre] || {};
      const actual = actualPorNombre[nombre] || {};
      const baseCantidad = Number(actual.cantidad ?? prevSent?.[nombre]?.cantidad ?? 0);
      const delta = Number(info.cantidad || 0);
      const nuevaCantidad = baseCantidad + delta;
      const listaActual = Number(actual.cantidad_lista || 0);

      return {
        mesa_id: mesaId,
        nombre,
        precio: Number(info.precio || actual.precio || 0),
        cantidad: nuevaCantidad,
        cantidad_lista: Math.min(listaActual, nuevaCantidad),
      };
    }).filter((r) => r.cantidad > 0);

    const { error: eDelete } = await supabase
      .from('mesa_items')
      .delete()
      .eq('mesa_id', mesaId)
      .in('nombre', nombres);
    if (eDelete) throw eDelete;

    if (rows.length) {
      const { error: eInsert } = await supabase.from('mesa_items').insert(rows);
      if (eInsert) throw eInsert;
    }
  }

  const { error: e2 } = await supabase
    .from('mesas')
    .upsert({
      id: mesaId,
      estado: 'enviado',
      updated_at: new Date().toISOString(),
      enviado_at: new Date().toISOString(),
    });
  if (e2) throw e2;
}

/**
 * Marca como LISTO en Supabase de forma persistente.
 * Usa una función SQL (SECURITY DEFINER) para evitar problemas de RLS/permisos
 * y para actualizar de forma atómica aunque el internet esté lento.
 *
 * cantidadAMarcar = cantidad pendiente que cocina acaba de sacar.
 * Retorna la cantidad total lista guardada en BD.
 */
export async function setCantidadListaItem(mesaId, nombre, cantidadAMarcar) {
  const payload = {
    p_mesa_id: Number(mesaId),
    p_nombre: String(nombre || ''),
    p_cantidad: Number(cantidadAMarcar || 0),
  };

  // Camino principal: función SQL robusta.
  const { data, error } = await supabase.rpc('marcar_item_listo', payload);

  if (!error && Array.isArray(data) && data.length > 0) {
    return Number(data[0].cantidad_lista || 0);
  }

  console.error('[setCantidadListaItem] RPC falló', error, payload);

  // Fallback con UPDATE directo y verificación. Si esto también falla, lanzamos error visible.
  const { data: actuales, error: eRead } = await supabase
    .from('mesa_items')
    .select('mesa_id, nombre, cantidad, cantidad_lista')
    .eq('mesa_id', mesaId)
    .eq('nombre', nombre);
  if (eRead) throw eRead;

  const totalPedido = (actuales || []).reduce((s, it) => s + Number(it.cantidad || 0), 0);
  const listaActual = (actuales || []).reduce((s, it) => s + Number(it.cantidad_lista || 0), 0);
  const listaSegura = Math.max(0, Math.min(Number(listaActual || 0) + Number(cantidadAMarcar || 0), totalPedido));

  if (totalPedido <= 0) {
    throw new Error(`No se encontró el producto en mesa_items. Mesa: ${mesaId}, producto: ${nombre}`);
  }

  const { data: updated, error: eUpdate } = await supabase
    .from('mesa_items')
    .update({ cantidad_lista: listaSegura })
    .eq('mesa_id', mesaId)
    .eq('nombre', nombre)
    .select('mesa_id, nombre, cantidad, cantidad_lista');

  if (eUpdate) throw eUpdate;
  if (!updated || updated.length === 0) {
    throw new Error(`Supabase no actualizó ninguna fila. Mesa: ${mesaId}, producto: ${nombre}`);
  }

  return listaSegura;
}

/** Cobrar: registra cabecera en ventas, detalle en venta_items y limpia la mesa.
 *  La venta queda normalizada: el administrador ya no depende del JSON ventas.data.
 */
export async function cobrarMesaDB({ id, mesa, dateISO, fecha, items, total, nota }) {
  const payload = {
    p_id: id,
    p_mesa: Number(mesa),
    p_dateiso: dateISO,
    p_fecha: fecha,
    p_total: Number(total || 0),
    p_nota: nota || '',
    p_items: items || [],
  };

  const { error } = await supabase.rpc('registrar_venta_normalizada', payload);

  if (error) {
    console.error('[cobrarMesaDB] Error registrando venta normalizada', error);
    throw error;
  }
}

/** Lee ventas EXACTAS de un día de negocio.
 *  Antes el admin leía ventas.data JSON. Ahora lee venta_items, que es más rápido y ordenado.
 *  Devuelve el mismo formato anterior: cada venta trae data = items para no romper la pantalla.
 */
export async function getVentasPorFecha(dateISO) {
  const { data: ventas, error } = await supabase
    .from('ventas')
    .select('id, mesa, fecha, dateiso, total, nota, ts')
    .eq('dateiso', dateISO)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('[getVentasPorFecha] Error leyendo ventas', error);
    throw error;
  }

  const ids = (ventas || []).map((v) => v.id);
  if (ids.length === 0) return [];

  const { data: items, error: eItems } = await supabase
    .from('venta_items')
    .select('venta_id, producto_nombre, precio, cantidad, subtotal')
    .in('venta_id', ids)
    .order('id', { ascending: true });

  if (eItems) {
    console.error('[getVentasPorFecha] Error leyendo venta_items', eItems);
    throw eItems;
  }

  const itemsPorVenta = {};
  (items || []).forEach((it) => {
    if (!itemsPorVenta[it.venta_id]) itemsPorVenta[it.venta_id] = [];
    itemsPorVenta[it.venta_id].push({
      nombre: it.producto_nombre,
      precio: Number(it.precio || 0),
      cantidad: Number(it.cantidad || 0),
      subtotal: Number(it.subtotal || 0),
    });
  });

  return (ventas || []).map((v) => ({
    ...v,
    data: itemsPorVenta[v.id] || [],
  }));
}


/** Resumen liviano para Administrador.
 *  Solo trae totales + productos agrupados. No trae ticket por ticket.
 *  Camino principal: RPC en Supabase. Fallback: detalle normal si aún no ejecutaste el SQL v6.
 */
export async function getResumenAdminPorFecha(dateISO) {
  const { data, error } = await supabase.rpc('resumen_admin_dia', { p_dateiso: dateISO });

  if (!error && data) {
    const payload = Array.isArray(data) ? data[0] : data;
    return {
      tickets: Number(payload?.tickets || 0),
      total: Number(payload?.total || 0),
      items: Array.isArray(payload?.items)
        ? payload.items.map((it) => ({
            nombre: it.nombre || it.producto_nombre || '',
            cantidad: Number(it.cantidad || 0),
            subtotal: Number(it.subtotal || 0),
          }))
        : [],
    };
  }

  console.warn('[getResumenAdminPorFecha] RPC no disponible; usando fallback más pesado.', error);
  const rows = await getVentasPorFecha(dateISO);
  const acc = {};
  let total = 0;

  (rows || []).forEach((v) => {
    total += Number(v.total || 0);
    (v.data || []).forEach((it) => {
      const nombre = it.nombre || '';
      if (!nombre) return;
      if (!acc[nombre]) acc[nombre] = { nombre, cantidad: 0, subtotal: 0 };
      acc[nombre].cantidad += Number(it.cantidad || 0);
      acc[nombre].subtotal += Number(it.subtotal || 0);
    });
  });

  return {
    tickets: rows.length,
    total,
    items: Object.values(acc).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  };
}

/** Alias mantenido por compatibilidad */
export async function getVentasDelDia(dayKey) {
  return getVentasPorFecha(dayKey);
}

/** ========== UTILIDADES PARA “TODAS LAS MESAS” ========== */

/** Lista todas las mesas abiertas (existen en tabla mesas) */
export async function listMesasAbiertas() {
  const { data, error } = await supabase
    .from('mesas')
    .select('id, estado, nota, updated_at, enviado_at')
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Carga mesas + items en 2 consultas, no en 1 + 2 consultas por cada mesa */
export async function getMesasConItems() {
  const mesas = await listMesasAbiertas();
  const ids = mesas.map((m) => m.id);

  if (ids.length === 0) return [];

  const { data: items, error } = await supabase
    .from('mesa_items')
    .select('mesa_id, nombre, precio, cantidad, cantidad_lista')
    .in('mesa_id', ids);

  if (error) throw error;

  const itemsPorMesa = {};
  (items || []).forEach((it) => {
    if (!itemsPorMesa[it.mesa_id]) itemsPorMesa[it.mesa_id] = [];
    itemsPorMesa[it.mesa_id].push(it);
  });

  return mesas.map((m) => ({
    id: m.id,
    estado: m.estado || 'enviado',
    nota: m.nota || '',
    updatedAt: m.updated_at || '',
    enviadoAt: m.enviado_at || m.updated_at || '',
    snap: {
      draft: {},
      sent: agruparItemsPorNombre(itemsPorMesa[m.id] || []),
      ready: agruparListosPorNombre(itemsPorMesa[m.id] || []),
      nota: m.nota || '',
      updatedAt: m.updated_at || '',
      enviadoAt: m.enviado_at || m.updated_at || '',
    },
  }));
}

/** Realtime: escucha cualquier cambio en mesas y mesa_items */
export function subscribeMesas(onChange) {
  const ch = supabase.channel('mesas-all');

  ch.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'mesas' },
    () => { try { onChange(); } catch (e) { console.error(e); } }
  );

  ch.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'mesa_items' },
    () => { try { onChange(); } catch (e) { console.error(e); } }
  );

  ch.subscribe((status) => {
    if (status === 'CHANNEL_ERROR') console.error('[subscribeMesas] CHANNEL_ERROR');
  });

  return () => supabase.removeChannel(ch);
}

/** Realtime: escucha una mesa (mesas + mesa_items) y dispara onChange */
export function subscribeMesa(mesaId, onChange) {
  const channel = supabase.channel(`mesa-${mesaId}`);

  channel
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'mesas', filter: `id=eq.${mesaId}` },
      () => { try { onChange(); } catch (e) { console.error(e); } }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'mesa_items', filter: `mesa_id=eq.${mesaId}` },
      () => { try { onChange(); } catch (e) { console.error(e); } }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') console.error(`[subscribeMesa] CHANNEL_ERROR mesa ${mesaId}`);
    });

  return () => supabase.removeChannel(channel);
}
