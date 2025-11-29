import React, { useMemo } from "react";

export default function VistaAdmin({
  ventasDia, fechaNegocio, setFechaNegocio, brasaOctavos, parrillaControl, bebidasControl,
}) {
  const totalDia = useMemo(()=>ventasDia.reduce((s,t)=>s+(t.total||0),0),[ventasDia]);
  const TAKEAWAY_BASE = 9000;
  const etiquetaMesa = (id) =>
    id >= TAKEAWAY_BASE ? `LLEVAR ${id - TAKEAWAY_BASE}` : `Mesa #${id}`;

  return (
    <div className="content admin">
      <div className="admin-left">
        <h2>Administrador</h2>
        {/* Barra superior con selector de fecha */}
        <div className="filters" style={{ alignItems: "end", justifyContent: "space-between" }}>
          <div className="dash" style={{ margin: 0 }}>
            <div className="dash-item"><span>Día de negocio</span><strong>{fechaNegocio}</strong></div>
            <div className="dash-item"><span>Tickets</span><strong>{ventasDia.length}</strong></div>
            <div className="dash-item"><span>Ventas Totales</span><strong>S/ {totalDia}</strong></div>
          </div>
        </div>
        {/* Selector de fecha */}
          <div>
            <label style={{ display: "block", fontSize: 12, marginBottom: 4, color: "#374151" }}>
              Ver día:
            </label>
            <input
              type="date"
              value={fechaNegocio}
              onChange={(e) => setFechaNegocio(e.target.value)}
              style={{
                padding: "8px 10px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                background: "#fff",
              }}
            />
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
          <p className="muted" style={{marginTop:6}}>* Incluye parrillas especiales y <strong>Pollo Broaster</strong> como pollo parrilla.</p>
        </div>

        <div className="panel">
          <h3>Control de Gaseosas</h3>
          <ul className="k-list">
            <li className="k-row"><span>Personales de Vidrio (INK, CC, FTA)</span><strong>{bebidasControl.personalesVidrio}</strong></li>
            <li className="k-row"><span>Personales Descartables (INK, CC, FTA)</span><strong>{bebidasControl.personalesDesc}</strong></li>
            <li className="k-row"><span>Personal Concordia</span><strong>{bebidasControl.personalConcordia}</strong></li>
            <li className="k-row"><span>Gordita</span><strong>{bebidasControl.gordita}</strong></li>
            <li className="k-row"><span>Gaseosa Litro</span><strong>{bebidasControl.gaseosaLitro}</strong></li>
            <li className="k-row"><span>Pepsi Litro</span><strong>{bebidasControl.pepsiLitro}</strong></li>
            <li className="k-row"><span>Gaseosa 1.5 LT (INK, CC)</span><strong>{bebidasControl.gaseosa15}</strong></li>
            <li className="k-row"><span>Gaseosa Concordia 2 LT</span><strong>{bebidasControl.gaseosaConcordia2}</strong></li>
            <li className="k-row"><span>Gaseosa 2 LT (INK, CC)</span><strong>{bebidasControl.gaseosa2}</strong></li>
            <li className="k-row"><span>Agua Mineral</span><strong>{bebidasControl.aguaMineral}</strong></li>
          </ul>
        </div>
      </div>

      <aside className="admin-right">
        <h3>Tickets del día</h3>
        {ventasDia.length===0 ? <p className="muted">No hay tickets en este día de negocio.</p> : (
          <div className="tickets-list">
            {ventasDia.map((t)=>(
              <div key={t.id} className="ticket-card">
                <div className="k-head"><strong>{etiquetaMesa(t.mesa)}</strong><span className="muted">{t.fecha}</span></div>
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
