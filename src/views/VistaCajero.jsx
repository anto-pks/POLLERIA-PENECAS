// src/views/VistaCajero.jsx
import React, { useMemo } from "react";

export default function VistaCajero({
  MESAS_TOTAL, pedidosPorMesa, ensureMesa, estadoMesa,
  cobrarMesa, notasPorMesa, ventasDia, bizKey,
}) {
  const abiertas = useMemo(
    () => Array.from({length:MESAS_TOTAL},(_,i)=>i+1)
      .filter(n => ensureMesa(pedidosPorMesa[n]).sent && Object.keys(ensureMesa(pedidosPorMesa[n]).sent).length>0),
    [MESAS_TOTAL, pedidosPorMesa, ensureMesa]
  );
  const totalDia = useMemo(()=>ventasDia.reduce((s,t)=>s+(t.total||0),0),[ventasDia]);

  return (
    <div className="content cajero">
      <div className="c-left">
        <h2>Mesas para Cobro</h2>
        {abiertas.length===0 ? <p className="muted">No hay mesas con consumo.</p> : (
          <div className="charge-grid">
            {abiertas.map((n)=>{
              const m = ensureMesa(pedidosPorMesa[n]);
              const s = m.sent;
              const items = Object.entries(s).map(([nombre,v])=>({nombre, ...v}));
              const totalMesa = items.reduce((a,it)=>a+it.precio*it.cantidad,0);
              const estado = estadoMesa[n] || "enviado";
              const notaVisible = (m.nota ?? notasPorMesa[n] ?? "").trim();
              return (
                <div key={n} className="charge-card">
                  <div className="k-head"><strong>Mesa #{n}</strong><span className={`chip ${estado}`}>{estado}</span></div>
                  <ul className="k-list">
                    {items.map((it)=>(
                      <li key={it.nombre} className="k-row">
                        <span>{it.nombre} ({it.cantidad})</span>
                        <span>S/ {it.precio*it.cantidad}</span>
                      </li>
                    ))}
                  </ul>
                  {notaVisible && (
                    <div style={{ marginTop: 6, fontSize: 13, color: "#475569" }}>
                      Nota: {notaVisible}
                    </div>
                  )}
                  <div className="total-row"><span>Total</span><strong>S/ {totalMesa}</strong></div>
                  <button className="btn-action charge" onClick={()=>cobrarMesa(n)}>Cobrar / Cerrar cuenta</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <aside className="c-right">
        <h2>Dashboard del Día (negocio)</h2>
        <div className="dash">
          <div className="dash-item"><span>Clave</span><strong>{bizKey}</strong></div>
          <div className="dash-item"><span>Tickets</span><strong>{ventasDia.length}</strong></div>
          <div className="dash-item"><span>Ventas Totales</span><strong>S/ {totalDia}</strong></div>
        </div>
        <h3>Últimos tickets</h3>
        {ventasDia.length===0 ? <p className="muted">Sin ventas registradas.</p> : (
          <div className="tickets-list">
            {ventasDia.map((t)=>(
              <div key={t.id} className="ticket-card">
                <div className="k-head"><strong>Mesa #{t.mesa}</strong><span className="muted">{t.fecha}</span></div>
                <ul className="k-list">
                  {t.items.map((it)=>(
                    <li key={it.nombre} className="k-row">
                      <span>{it.nombre} ({it.cantidad})</span><span>S/ {it.subtotal}</span>
                    </li>
                  ))}
                </ul>
                {t.nota?.trim() && (
                  <div style={{ marginTop: 6, fontSize: 13, color: "#475569" }}>
                    Nota: {t.nota}
                  </div>
                )}
                <div className="total-row"><span>Total</span><strong>S/ {t.total}</strong></div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
