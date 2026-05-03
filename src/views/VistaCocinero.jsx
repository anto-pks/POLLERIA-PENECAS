import React, { useMemo, useEffect, useRef } from "react";

export default function VistaCocinero({
  MESAS_TOTAL,
  pedidosPorMesa,
  ensureMesa,
  pendientesMesa,
  estadoMesa,
  notasPorMesa,
  marcarListo,
  TAKEAWAY_BASE,
  isTakeawayId,
}) {
  // --- 1️⃣ Calcula las mesas con pendientes ---
  const mesas = useMemo(() => {
    const mesasNum = Array.from({ length: MESAS_TOTAL }, (_, i) => i + 1);
    const llevarIds = Object.keys(pedidosPorMesa)
      .map(Number)
      .filter((id) => isTakeawayId(id));

    // solo mesas con pendientes AGREGUE EL 03/05/26 🚫
    return [...mesasNum, ...llevarIds].filter((n) => {
      const estado = estadoMesa[n];

      //  Si ya está cobrado, NO mostrar en cocina
      if (estado === "cobrado") return false;

      return pendientesMesa(n).length > 0;
    });
  }, [MESAS_TOTAL, pedidosPorMesa, isTakeawayId, pendientesMesa, estadoMesa]);

  // --- 2️⃣ Calcula el total de platos pendientes en toda la cocina ---
  const totalPendientes = useMemo(() => {
    return mesas.reduce((acum, idMesa) => {
      const pend = pendientesMesa(idMesa);
      const subtotalMesa = pend.reduce((s, it) => s + (it.cantidad || 0), 0);
      return acum + subtotalMesa;
    }, 0);
  }, [mesas, pendientesMesa]);

  // --- 3️⃣ Detecta si aumentaron los pendientes para sonar ---
  const prevTotalRef = useRef(0);
  const firstRunRef = useRef(true);
  const prevSentRef = useRef({});

  useEffect(() => {
    let hayNuevo = false;

    mesas.forEach((idMesa) => {
      const mesa = pedidosPorMesa[idMesa] || {};
      const sentActual = mesa.sent || {};
      const sentPrev = prevSentRef.current[idMesa] || {};

      Object.keys(sentActual).forEach((item) => {
        const actual = sentActual[item]?.cantidad || 0;
        const previo = sentPrev[item]?.cantidad || 0;

        if (actual > previo) {
          hayNuevo = true;
        }
      });
    });

    if (!firstRunRef.current && hayNuevo) {
      const audio = new Audio("/sonidos/nuevo-pedido.mp3");
      audio.play().catch(() => {});
    }

    firstRunRef.current = false;

    // guardar snapshot actual
    const snapshot = {};
    mesas.forEach((idMesa) => {
      snapshot[idMesa] = pedidosPorMesa[idMesa]?.sent || {};
    });
    prevSentRef.current = snapshot;

  }, [pedidosPorMesa, mesas]);

  // --- 4️⃣ Mostrar pedidos pendientes ---
  const etiquetaMesa = (id) =>
    isTakeawayId(id) ? `LLEVAR ${id - TAKEAWAY_BASE}` : `Mesa #${id}`;

return (
  <div className="content one-col">
    <div className="kitchen">

      {mesas.length === 0 ? (
        <p className="muted">No hay pedidos pendientes.</p>
      ) : (
        // 👇 NUEVO CONTENEDOR GRID
        <div className="k-grid">
          {mesas.map((n) => {
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

                <ul className="k-list">
                  {pend.map((it) => (
                    <li key={it.nombre} className="k-row">
                      <div className="k-item-left">
                        <strong className="k-qty">{it.cantidad}</strong>
                        <span>{it.nombre}</span>
                      </div>

                      <button
                        className="btn-action done"
                        onClick={() => marcarListo(n, it.nombre, it.cantidad)}
                      >
                        LISTO
                      </button>
                    </li>
                  ))}
                </ul>

                {notaVisible && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "8px 10px",
                      border: "1px dashed #cbd5e1",
                      borderRadius: 8,
                      background: "#f8fafc",
                    }}
                  >
                    <strong>Nota:</strong>{" "}
                    <span style={{ color: "#334155" }}>{notaVisible}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
);

}
