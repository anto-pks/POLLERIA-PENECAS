import React, { useMemo ,useState} from "react";
import ConfirmModal from "../components/ConfirmModal";

export default function VistaCajero({
  MESAS_TOTAL, pedidosPorMesa, ensureMesa, estadoMesa,
  cobrarMesa, notasPorMesa, ventasDia, bizKey,
  TAKEAWAY_BASE, isTakeawayId,
}) {
  const abiertas = useMemo(
    () => Array.from({ length: MESAS_TOTAL }, (_, i) => i + 1)
      .concat( // incluir pedidos LLEVAR que existan en memoria
        Object.keys(pedidosPorMesa)
          .map(Number)
          .filter(id => isTakeawayId(id))
      )
      .filter(n => {
        const m = ensureMesa(pedidosPorMesa[n]);
        return m.sent && Object.keys(m.sent).length > 0;
      }),
    [MESAS_TOTAL, pedidosPorMesa, ensureMesa]
  );

  const totalDia = useMemo(
    () => ventasDia.reduce((s, t) => s + (t.total || 0), 0),
    [ventasDia]
  );

  const etiquetaMesa = (id) =>
    isTakeawayId(id) ? `LLEVAR ${id - TAKEAWAY_BASE}` : `Mesa #${id}`;
  
  const [confirmData, setConfirmData] = useState(null);

  const handleCobrarClick = (id, totalMesa) => {
    setConfirmData({ id, total: totalMesa });
  };

  const confirmCobro = () => {
    if (confirmData) {
      cobrarMesa(confirmData.id);
      setConfirmData(null);
    }
  };

  return (
    <div className="content cajero one-col">
      <div className="cajero-top panel">
        <h2 className="cajero-title">Dashboard del Día (negocio)</h2>
        <div className="dash cajero-dash">
          <div className="dash-item">
            <span>Clave</span>
            <strong>{bizKey}</strong>
          </div>
          <div className="dash-item">
            <span>Tickets</span>
            <strong>{ventasDia.length}</strong>
          </div>
          <div className="dash-item">
            <span>Ventas Totales</span>
            <strong>S/ {totalDia}</strong>
          </div>
        </div>

        {ventasDia.length > 0 && (
          <>
            <h3 style={{ marginTop: 10 }}>Últimos tickets</h3>
            <div className="tickets-list">
              {ventasDia.map((t) => (
                <div key={t.id} className="ticket-card">
                  <div className="k-head">
                    <strong>{etiquetaMesa(t.mesa)}</strong>
                    <span className="muted">{t.fecha}</span>
                  </div>
                  <ul className="k-list">
                    {t.items.map((it) => (
                      <li key={it.nombre} className="k-row">
                        <span>
                          {it.nombre} ({it.cantidad})
                        </span>
                        <span>S/ {it.subtotal}</span>
                      </li>
                    ))}
                  </ul>
                  {t.nota?.trim() && (
                    <div style={{ marginTop: 6, fontSize: 13, color: "#475569" }}>
                      Nota: {t.nota}
                    </div>
                  )}
                  <div className="total-row">
                    <span>Total</span>
                    <strong>S/ {t.total}</strong>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="cajero-bottom">
        <h2 className="cajero-subtitle">Mesas para Cobro</h2>

        {abiertas.length === 0 ? (
          <p className="muted">No hay mesas con consumo.</p>
        ) : (
          <div className="charge-grid">
            {abiertas.map((n) => {
              const m = ensureMesa(pedidosPorMesa[n]);
              const s = m.sent;
              const items = Object.entries(s).map(([nombre, v]) => ({
                nombre,
                ...v,
              }));
              const totalMesa = items.reduce((a, it) => a + it.precio * it.cantidad, 0);
              const estado = estadoMesa[n] || "enviado";
              const notaVisible = (m.nota ?? notasPorMesa[n] ?? "").trim();

              return (
                <div key={n} className="charge-card pretty">
                  <div className="k-head">
                    <div className="mesa-title">
                      <strong>{etiquetaMesa(n)}</strong>
                    </div>
                    <span className={`chip ${estado}`}>{estado}</span>
                  </div>

                  <ul className="k-list">
                    {items.map((it) => (
                      <li key={it.nombre} className="k-row">
                        <span className="it-name">
                          {it.nombre} <em>({it.cantidad})</em>
                        </span>
                        <span className="it-imp">S/ {it.precio * it.cantidad}</span>
                      </li>
                    ))}
                  </ul>

                  {notaVisible && (
                    <div style={{ marginTop: 6, fontSize: 13, color: "#475569" }}>
                      Nota: {notaVisible}
                    </div>
                  )}

                  <div className="divider" />

                  <div className="total-row strong">
                    <span>Total</span>
                    <strong>S/ {totalMesa}</strong>
                  </div>

                  <button className="btn-pay" onClick={() => handleCobrarClick(n, totalMesa)}>
                    Cobrar / Cerrar cuenta
                  </button>
                  {/* modal de confirmación */}
                  <ConfirmModal
                    open={!!confirmData}
                    total={confirmData?.total || 0}
                    onCancel={() => setConfirmData(null)}
                    onConfirm={confirmCobro}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
