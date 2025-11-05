import React from "react";
import ProductRow from "../components/ProductRow";

export default function VistaMesero({
  CATS,
  abiertas, setAbiertas,
  draft, sent, estadoMesa, mesaSel,
  enviarACocina, totalSent,
  // nota
  notaInputRef, notasPorMesa, guardarNotaMesa,
  // para llevar
  isTakeawayId, TAKEAWAY_BASE,
  pedidosPorMesa, setMesaSel,
  cobrarMesa
}) {
  const etiqueta = isTakeawayId(mesaSel)
    ? `Llevar ${mesaSel - TAKEAWAY_BASE}`
    : `Mesa #${mesaSel}`;
  
  // Buscar los pedidos “para llevar” activos (que tienen productos)
  const takeawaysActivos = Object.keys(pedidosPorMesa || {})
    .map(Number)
    .filter(id => isTakeawayId(id))
    .filter(id => {
      const mesa = pedidosPorMesa[id] || {};
      const has = (o) => o && Object.values(o).some(x => x.cantidad > 0);
      return has(mesa.draft) || has(mesa.sent);
    });


  return (
    <div className="content">
      <div className="menu"> 
        {CATS.map((cat) => (
          <div key={cat.key} className="cat-block">
            <div
              className="cat-head"
              onClick={() =>
                setAbiertas((p) => ({ ...p, [cat.key]: !p[cat.key] }))
              }
            >
              <span className="cat-name">{cat.label}</span>

              <button
                className="cat-toggle"
                onClick={(e) => {
                  e.stopPropagation(); // para que no se dispare también el click del div
                  setAbiertas((p) => ({ ...p, [cat.key]: !p[cat.key] }));
                }}
              >
                {abiertas[cat.key] ? "−" : "+"}
              </button>
            </div>

            {abiertas[cat.key] && (
              <div className="cat-items">
                {cat.items.map((p) => (
                  <ProductRow
                    key={p.nombre}
                    catKey={cat.key}
                    prod={p}
                    draft={draft}
                    setCant={(...args) => window.setCant(...args)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

      </div>

      <aside className="ticket">
        <div className="ticket-head">
          <h3>Pedido {etiqueta}</h3>
          <span className={`chip ${estadoMesa[mesaSel] || "tomando"}`}>{estadoMesa[mesaSel] || "tomando"}</span>
        </div>

        {takeawaysActivos.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                fontSize: 12,
                display: "block",
                marginBottom: 4,
                color: "#374151",
              }}
            >
              Pedidos para llevar activos
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {takeawaysActivos.map((id) => (
                <button
                  key={id}
                  className="btn-action"
                  style={{ padding: "6px 10px", fontSize: 13 }}
                  onClick={() => setMesaSel(id)}
                >
                  L{ id - TAKEAWAY_BASE }
                </button>
              ))}
            </div>
          </div>
        )}


        {Object.keys(draft).length===0 && Object.keys(sent).length===0 ? (
          <p className="muted">Sin productos.</p>
        ) : (
          <>
            {Object.keys(sent).length>0 && (
              <>
                <h4>Enviado a cocina</h4>
                <ul className="ticket-list">
                  {Object.entries(sent).map(([n,v])=>(
                    <li key={n} className="ticket-row">
                      <span>{n} ({v.cantidad})</span><span>S/ {v.precio*v.cantidad}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {Object.keys(draft).length>0 && (
              <>
                <h4 style={{marginTop:10}}>Borrador</h4>
                <ul className="ticket-list">
                  {Object.entries(draft).map(([n,v])=>(
                    <li key={n} className="ticket-row">
                      <span>{n} ({v.cantidad})</span><span>S/ {v.precio*v.cantidad}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        {/* Nota por mesa */}
        <div style={{ marginTop: 12 }}>
          <label style={{fontSize:12, display:"block", marginBottom:6, color:"#374151"}}>
            Nota especial (opcional)
          </label>
          <input
            key={`nota-mesa-${mesaSel}`}
            ref={notaInputRef}
            type="text"
            placeholder="Ej: para llevar, sin ensalada, etc."
            defaultValue={notasPorMesa[mesaSel] || ""}
            onBlur={(e)=>guardarNotaMesa(e.target.value)}
            style={{width:"100%", padding:"10px", border:"1px solid #e5e7eb", borderRadius:8}}
          />
        </div>

        <div className="total-row"><span>Total (enviado)</span><strong>S/ {totalSent}</strong></div>
        <div className="ticket-actions" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            className="btn-action send"
            onClick={enviarACocina}
            disabled={Object.keys(draft).length === 0}
          >
            Enviar a Cocina (solo cambios)
          </button>

          {Object.keys(sent).length > 0 && (
            <button
              className="btn-pay"
              onClick={() => cobrarMesa(mesaSel)}
            >
              Cobrar / Cerrar cuenta
            </button>
          )}
        </div>

      </aside>
    </div>
  );
}
