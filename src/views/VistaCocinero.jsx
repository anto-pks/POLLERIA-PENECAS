import React, { useMemo, useEffect, useRef, useState } from "react";

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
  const audioRef = useRef(null);
  const [sonidoActivo, setSonidoActivo] = useState(false);

  const activarSonido = async () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/sonidos/nuevo-pedido.mp3");
        audioRef.current.preload = "auto";
      }
      audioRef.current.volume = 1;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setSonidoActivo(true);
    } catch (e) {
      console.warn("[cocina] El navegador bloqueó el sonido hasta que haya un toque/clic.", e);
    }
  };

  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    // Solo actualiza el texto "hace X min". No consulta Supabase.
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const tiempoTranscurrido = (fechaIso) => {
    const ts = Date.parse(fechaIso || "");
    if (!Number.isFinite(ts)) return "sin hora";

    const diffMs = Math.max(0, nowTick - ts);
    const min = Math.floor(diffMs / 60000);

    if (min < 1) return "recién enviado";
    if (min < 60) return `hace ${min} min`;

    const h = Math.floor(min / 60);
    const r = min % 60;
    return r > 0 ? `hace ${h} h ${r} min` : `hace ${h} h`;
  };

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

  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      prevTotalRef.current = totalPendientes;
      return;
    }

    if (totalPendientes > prevTotalRef.current) {
      const audio = audioRef.current || new Audio("/sonidos/nuevo-pedido.mp3");
      audioRef.current = audio;
      audio.currentTime = 0;
      audio.play().then(() => setSonidoActivo(true)).catch(() => {
        setSonidoActivo(false);
      });
    }

    prevTotalRef.current = totalPendientes;
  }, [totalPendientes]);

  useEffect(() => {
    const unlock = () => activarSonido();
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // --- 4️⃣ Mostrar pedidos pendientes ---
  const etiquetaMesa = (id) =>
    isTakeawayId(id) ? `LLEVAR ${id - TAKEAWAY_BASE}` : `Mesa #${id}`;

return (
  <div className="content one-col">
    <div className="kitchen">
      <div className="sound-row">
        <span className={sonidoActivo ? "sound-ok" : "sound-warn"}>
          Sonido cocina: {sonidoActivo ? "activo" : "toca Activar sonido"}
        </span>
        {!sonidoActivo && (
          <button className="btn-action sound" onClick={activarSonido}>
            Activar sonido
          </button>
        )}
      </div>

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
              <div key={n} className={`k-card ${isTakeawayId(n) ? "takeaway-card" : ""}`}>
                <div className="k-head">
                  <div className="k-title-block">
                    <strong>{etiquetaMesa(n)}</strong>
                    <span className="k-elapsed">{tiempoTranscurrido(m.enviadoAt || m.updatedAt)}</span>
                  </div>
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
