import React, { useMemo } from "react";

export default function VistaCocinero({
  MESAS_TOTAL, pedidosPorMesa, ensureMesa,
  pendientesMesa, estadoMesa, notasPorMesa,
  marcarListo,
  TAKEAWAY_BASE, isTakeawayId,
}) {
  const mesas = useMemo(() => {
    const mesasNum = Array.from({ length: MESAS_TOTAL }, (_, i) => i + 1);
    const llevarIds = Object.keys(pedidosPorMesa)
      .map(Number)
      .filter(id => isTakeawayId(id));

    return [...mesasNum, ...llevarIds]
      // solo mostramos mesas que todavía tienen algo pendiente
      .filter(n => pendientesMesa(n).length > 0);
}, [MESAS_TOTAL, pedidosPorMesa, pendientesMesa, isTakeawayId]);

  const etiquetaMesa = (id) =>
    isTakeawayId(id) ? `LLEVAR ${id - TAKEAWAY_BASE}` : `Mesa #${id}`;

  return (
    <div className="content one-col">
      <div className="kitchen">
        <h2>Pedidos en Cocina</h2>
        {mesas.length===0 ? <p className="muted">No hay pedidos pendientes.</p> : (
          mesas.map((n)=>{
            const m = ensureMesa(pedidosPorMesa[n]);
            const pend = pendientesMesa(n);
            const estado = estadoMesa[n] || "enviado";
            const notaVisible = (m.nota ?? notasPorMesa[n] ?? "").trim();
            return (
              <div key={n} className="k-card">
                <div className="k-head">
                  <strong>{etiquetaMesa(n)}</strong>
                  <span className={`chip ${estado}`}>{estado}</span>
                </div>
                {pend.length===0 ? <p className="muted">Todo listo.</p> : (
                  <ul className="k-list">
                    {pend.map((it)=>(
                      <li key={it.nombre} className="k-row">
                        <span>{it.nombre}</span><strong>x{it.cantidad}</strong>
                        <button className="btn-action done" onClick={()=>marcarListo(n,it.nombre,it.cantidad)}>Marcar LISTO</button>
                      </li>
                    ))}
                  </ul>
                )}
                {notaVisible && (
                  <div style={{marginTop:8, padding:"8px 10px", border:"1px dashed #cbd5e1", borderRadius:8, background:"#f8fafc"}}>
                    <strong>Nota:</strong> <span style={{color:"#334155"}}>{notaVisible}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

