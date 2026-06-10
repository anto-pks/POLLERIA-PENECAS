import React, { useMemo, useState } from "react";

const TAKEAWAY_BASE = 9000;

const normalizarTexto = (txt = "") =>
  String(txt).toUpperCase().replace(/\s*\([^)]*\)/g, "").trim();

function descargarCSV(nombreArchivo, rows) {
  // En Excel en español, el separador correcto suele ser punto y coma (;).
  // Si usamos coma, Excel mete todo en una sola columna.
  const SEP = ";";
  const headers = [
    "venta_id",
    "tipo_pedido",
    "mesa",
    "llevar_numero",
    "fecha_hora",
    "fecha",
    "hora",
    "nota",
    "producto",
    "cantidad",
    "precio_unitario",
    "subtotal_producto",
    "total_ticket",
  ];

  const escTexto = (value) => {
    const s = value == null ? "" : String(value);
    return `"${s.replace(/"/g, '""')}"`;
  };

  const escNumero = (value) => {
    const n = Number(value || 0);
    return Number.isFinite(n) ? String(n) : "0";
  };

  const fechaSolo = (fecha = "") => String(fecha).split(",")[0]?.trim() || "";
  const horaSolo = (fecha = "") => String(fecha).split(",")[1]?.trim() || "";
  const tipoPedido = (mesa) => Number(mesa) >= TAKEAWAY_BASE ? "LLEVAR" : "MESA";
  const numeroMesa = (mesa) => Number(mesa) >= TAKEAWAY_BASE ? "" : Number(mesa);
  const numeroLlevar = (mesa) => Number(mesa) >= TAKEAWAY_BASE ? Number(mesa) - TAKEAWAY_BASE : "";

  // La primera línea fuerza a Excel a usar punto y coma como separador.
  // Los campos numéricos salen SIN comillas para que puedas sumar/filtrar fácilmente.
  const lines = [`sep=${SEP}`, headers.join(SEP)];
  rows.forEach((t) => {
    (t.items || []).forEach((it) => {
      lines.push([
        escTexto(t.id),
        escTexto(tipoPedido(t.mesa)),
        escNumero(numeroMesa(t.mesa)),
        escNumero(numeroLlevar(t.mesa)),
        escTexto(t.fecha),
        escTexto(fechaSolo(t.fecha)),
        escTexto(horaSolo(t.fecha)),
        escTexto(t.nota || ""),
        escTexto(it.nombre),
        escNumero(it.cantidad),
        escNumero(it.precio),
        escNumero(it.subtotal),
        escNumero(t.total),
      ].join(SEP));
    });
  });

  const blob = new Blob(["\ufeff" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function VistaAdmin({
  fechaNegocio,
  setFechaNegocio,
  brasaOctavos,
  parrillaControl,
  bebidasControl,
  chifaControl = { CHAUFA: 0, AEROPUERTO: 0 },
  productosMenu = [],
  adminResumen = { tickets: 0, total: 0, items: [] },
  adminTicketsDetalle = [],
  adminDetalleVisible = false,
  adminDetalleLoading = false,
  cargarAdminTicketsDetalle,
  ocultarAdminTicketsDetalle,
}) {
  const [exportando, setExportando] = useState(false);

  const etiquetaMesa = (id) =>
    Number(id) >= TAKEAWAY_BASE ? `LLEVAR ${Number(id) - TAKEAWAY_BASE}` : `Mesa #${id}`;

  const totalDia = Number(adminResumen?.total || 0);
  const ticketsCount = Number(adminResumen?.tickets || 0);

  const nombresActivos = useMemo(() => {
    return (productosMenu || [])
      .flatMap((cat) => cat.items || [])
      .map((p) => normalizarTexto(p.nombre));
  }, [productosMenu]);

  const bebidasRows = useMemo(() => {
    const rows = [
      {
        key: "personalesVidrio",
        label: "Personales de Vidrio (INK, CC, FTA)",
        activo: nombresActivos.some((n) => /\bPERSONAL\b/.test(n) && !/\bDESC\b/.test(n) && /\b(INKA|COCA|COCA COLA|FANTA)\b/.test(n)),
      },
      {
        key: "personalesDesc",
        label: "Personales Descartables (INK, CC, FTA)",
        activo: nombresActivos.some((n) => /\bPERSONAL\b/.test(n) && /\bDESC\b/.test(n)),
      },
      {
        key: "personalConcordia",
        label: "Personal Concordia",
        activo: nombresActivos.some((n) => /\bCONCORDIA\b.*\bPERSONAL\b/.test(n)),
      },
      {
        key: "gordita",
        label: "Gordita",
        activo: nombresActivos.some((n) => /\bGORDITA\b/.test(n)),
      },
      {
        key: "gaseosaLitro",
        label: "Gaseosa Litro",
        activo: nombresActivos.some((n) => /\b(INKA|GASEOSA)\b.*\bLITRO\b/.test(n)),
      },
      {
        key: "pepsiLitro",
        label: "Pepsi Litro",
        activo: nombresActivos.some((n) => /\bPEPSI\b.*\bLITRO\b/.test(n)),
      },
      {
        key: "gaseosa15",
        label: "Gaseosa 1.5 LT (INK, CC)",
        activo: nombresActivos.some((n) => /\b(INKA|COCA|COCA COLA)\b.*\b1\.?5\b.*\bLT\b/.test(n)),
      },
      {
        key: "gaseosaConcordia2",
        label: "Gaseosa Concordia 2 LT",
        activo: nombresActivos.some((n) => /\bCONCORDIA\b.*\b2\b.*\bLT\b/.test(n)),
      },
      {
        key: "gaseosa2",
        label: "Gaseosa 2 LT (INK, CC)",
        activo: nombresActivos.some((n) => /\b(INKA|COCA|COCA COLA)\b.*\b2(\.25)?\b.*\bLT\b/.test(n)),
      },
      {
        key: "aguaMineral",
        label: "Agua Mineral",
        activo: nombresActivos.some((n) => /\bAGUA\b.*\bMINERAL\b/.test(n)),
      },
    ];

    // Si el producto está desactivado y tampoco vendió hoy, no lo mostramos.
    return rows.filter((r) => r.activo || Number(bebidasControl?.[r.key] || 0) > 0);
  }, [nombresActivos, bebidasControl]);

  const handleToggleDetalle = async () => {
    if (adminDetalleVisible) {
      ocultarAdminTicketsDetalle?.();
      return;
    }
    await cargarAdminTicketsDetalle?.();
  };

  const handleExportar = async () => {
    setExportando(true);
    try {
      const rows = adminDetalleVisible && adminTicketsDetalle.length
        ? adminTicketsDetalle
        : await cargarAdminTicketsDetalle?.();

      if (!rows || rows.length === 0) {
        alert("No hay tickets para exportar en ese día.");
        return;
      }

      descargarCSV(`tickets_${fechaNegocio}.csv`, rows);
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="content admin">
      <div className="admin-left">
        <h2>Administrador</h2>

        <div className="filters" style={{ alignItems: "end", justifyContent: "space-between" }}>
          <div className="dash" style={{ margin: 0 }}>
            <div className="dash-item"><span>Día de negocio</span><strong>{fechaNegocio}</strong></div>
            <div className="dash-item"><span>Tickets</span><strong>{ticketsCount}</strong></div>
            <div className="dash-item"><span>Ventas Totales</span><strong>S/ {totalDia.toFixed(2)}</strong></div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "end", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
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

          <button className="btn-action" onClick={handleToggleDetalle} disabled={adminDetalleLoading}>
            {adminDetalleLoading
              ? "Cargando tickets..."
              : adminDetalleVisible
                ? "Ocultar detalle"
                : "Ver detalle de tickets"}
          </button>

          <button className="btn-action" onClick={handleExportar} disabled={adminDetalleLoading || exportando}>
            {exportando ? "Exportando..." : "Exportar tickets Excel/CSV"}
          </button>
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
            <li className="k-row"><span>Combinado</span><strong>{parrillaControl.COMBINADO}</strong></li>
            <li className="k-row"><span>Mixto</span><strong>{parrillaControl.MIXTO}</strong></li>
            <li className="k-row"><span>Anticucho</span><strong>{parrillaControl.ANTICUCHO}</strong></li>
            <li className="k-row"><span>Mollejitas</span><strong>{parrillaControl.MOLLEJITAS}</strong></li>
          </ul>
          <p className="muted" style={{marginTop:6}}>* Incluye parrillas especiales y <strong>Pollo Broaster</strong> como pollo parrilla.</p>
        </div>

        <div className="panel">
          <h3>Control de Chifa</h3>
          <ul className="k-list">
            <li className="k-row"><span>Chaufa total</span><strong>{chifaControl.CHAUFA || 0}</strong></li>
            <li className="k-row"><span>Aeropuerto total</span><strong>{chifaControl.AEROPUERTO || 0}</strong></li>
            <li className="k-row"><span>Total Chifa</span><strong>{Number(chifaControl.CHAUFA || 0) + Number(chifaControl.AEROPUERTO || 0)}</strong></li>
          </ul>
          <p className="muted" style={{marginTop:6}}>
            * Cuenta todos los productos que contengan <strong>CHAUFA</strong> o <strong>AEROPUERTO</strong>, sin importar si son de pollo, carne, chancho o mixto.
          </p>
        </div>

        <div className="panel">
          <h3>Control de Gaseosas</h3>
          {bebidasRows.length === 0 ? (
            <p className="muted">No hay gaseosas activas ni ventas de gaseosas para este día.</p>
          ) : (
            <ul className="k-list">
              {bebidasRows.map((row) => (
                <li key={row.key} className="k-row">
                  <span>{row.label}</span><strong>{bebidasControl[row.key] || 0}</strong>
                </li>
              ))}
            </ul>
          )}
          <p className="muted" style={{marginTop:6}}>
            Los controles se ocultan cuando el producto está inactivo en catálogo y no tuvo ventas ese día.
          </p>
        </div>
      </div>

      <aside className="admin-right">
        <h3>Tickets del día</h3>

        {!adminDetalleVisible ? (
          <div className="ticket-card">
            <p className="muted" style={{ margin: 0 }}>
              El detalle de tickets no se carga automáticamente para no sobrecargar Supabase.
            </p>
            <p className="muted" style={{ marginTop: 8 }}>
              Usa <strong>Ver detalle de tickets</strong> solo cuando necesites revisar los comprobantes.
            </p>
          </div>
        ) : adminTicketsDetalle.length === 0 ? (
          <p className="muted">No hay tickets en este día de negocio.</p>
        ) : (
          <div className="tickets-list">
            {adminTicketsDetalle.map((t) => (
              <div key={t.id} className="ticket-card">
                <div className="k-head"><strong>{etiquetaMesa(t.mesa)}</strong><span className="muted">{t.fecha}</span></div>
                <ul className="k-list">
                  {t.items.map((it) => (
                    <li key={`${t.id}-${it.nombre}`} className="k-row">
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
