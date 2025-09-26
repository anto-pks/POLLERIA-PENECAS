// src/views/VistaAdmin.jsx
import React, { useMemo } from "react";

export default function VistaAdmin({
  ventasDia, bizKey, brasaOctavos, parrillaControl, gaseosaControl
}) {
  const totalDia = useMemo(()=>ventasDia.reduce((s,t)=>s+(t.total||0),0),[ventasDia]);
  return (
    <div className="content admin">
      <div className="admin-left">
        <h2>Administrador</h2>
        <div className="filters" style={{ alignItems:"end", justifyContent:"space-between" }}>
          <div className="dash" style={{margin:0}}>
            <div className="dash-item"><span>Día de negocio</span><strong>{bizKey.replace("ventas_","")}</strong></div>
            <div className="dash-item"><span>Tickets</span><strong>{ventasDia.length}</strong></div>
            <div className="dash-item"><span>Ventas Totales</span><strong>S/ {totalDia}</strong></div>
          </div>
        </div>

        <div className="panel">
          <h3>Pollo a la Brasa (equivalencias)</h3>
          <p>Total: <strong>{brasaOctavos.pollos} pollo(s)</strong> y <strong>{brasaOctavos.restoOctavos} octavo(s)</strong> <span className="muted">(= {brasaOctavos.totalOctavos} octavos)</span></p>
          <p className="muted" style={{marginTop:6}}>* “Caldo de gallina” no se incluye en este control.</p>
        </div>

        <div className="panel">
          <h3>Control de Parrillas</h3>
          <ul className="k-list">
            <li className="k-row"><span>Pollo parrilla</span><strong>{parrillaControl.POLLO}</strong></li>
            <li className="k-row"><span>Carne parrilla</span><strong>{parrillaControl.CARNE}</strong></li>
            <li className="k-row"><span>Chuleta (cerdo)</span><strong>{parrillaControl.CHULETA}</strong></li>
          </ul>
          <p className="muted" style={{marginTop:6}}>* Incluye especiales mapeadas y <strong>Pollo Broaster</strong> como pollo parrilla.</p>
        </div>

        <div className="panel">
          <h3>Control de Gaseosas</h3>
          <ul className="k-list">
            <li className="k-row"><span>Personal</span><strong>{gaseosaControl.PERSONAL}</strong></li>
            <li className="k-row"><span>Gordita</span><strong>{gaseosaControl.GORDITA}</strong></li>
            <li className="k-row"><span>Litro</span><strong>{gaseosaControl.LITRO}</strong></li>
            <li className="k-row"><span>2 Litros (aprox)</span><strong>{gaseosaControl["2 LITROS"]}</strong></li>
          </ul>
          <p className="muted" style={{marginTop:6}}>* Conteo de 2L agrupa 2.0–2.25L para un vistazo rápido.</p>
        </div>
      </div>

      <aside className="admin-right">
        <h3>Tickets del día</h3>
        {ventasDia.length===0 ? <p className="muted">No hay tickets en este día de negocio.</p> : (
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
