import React from "react";
import { CATS } from "./config/menuData";
import { usePedidos } from "./hooks/usePedidos";
import Header from "./components/Header";
import MesaBar from "./components/MesaBar";
import VistaMesero from "./views/VistaMesero";
import VistaCocinero from "./views/VistaCocinero";
import VistaCajero from "./views/VistaCajero";
import VistaAdmin from "./views/VistaAdmin";

export default function PolleriaPOS() {
  const h = usePedidos();

  // Exponer setCant global (para ProductRow)
  window.setCant = h.setCant;

  return (
    <div className="app">
      <Header
        mesaSel={h.mesaSel}
        rol={h.rol}
        requestRole={h.requestRole}
        isTakeawayId={h.isTakeawayId}
        TAKEAWAY_BASE={h.TAKEAWAY_BASE}
        createTakeaway={h.createTakeaway}
      />

      {h.rol === "MESERO" && (
        <VistaMesero
          CATS={CATS}
          abiertas={h.abiertas}
          setAbiertas={h.setAbiertas}
          draft={h.draft}
          sent={h.sent}
          estadoMesa={h.estadoMesa}
          mesaSel={h.mesaSel}
          enviarACocina={h.enviarACocina}
          totalSent={h.totalSent}
          notaInputRef={h.notaInputRef}
          notasPorMesa={h.notasPorMesa}
          guardarNotaMesa={h.guardarNotaMesa}
          isTakeawayId={h.isTakeawayId}
          TAKEAWAY_BASE={h.TAKEAWAY_BASE}
          pedidosPorMesa={h.pedidosPorMesa}
          setMesaSel={h.setMesaSel}
          cobrarMesa={h.cobrarMesa} 
        />
      )}

      {h.rol === "COCINERO" && (
        <VistaCocinero
          MESAS_TOTAL={h.MESAS_TOTAL}
          pedidosPorMesa={h.pedidosPorMesa}
          ensureMesa={h.ensureMesa}
          pendientesMesa={h.pendientesMesa}
          estadoMesa={h.estadoMesa}
          notasPorMesa={h.notasPorMesa}
          marcarListo={h.marcarListo}
          isTakeawayId={h.isTakeawayId}
          TAKEAWAY_BASE={h.TAKEAWAY_BASE}
        />
      )}

      {h.rol === "CAJERO" && (
        <VistaCajero
          MESAS_TOTAL={h.MESAS_TOTAL}
          pedidosPorMesa={h.pedidosPorMesa}
          ensureMesa={h.ensureMesa}
          estadoMesa={h.estadoMesa}
          cobrarMesa={h.cobrarMesa}
          notasPorMesa={h.notasPorMesa}
          ventasDia={h.ventasDia}
          bizKey={h.bizKey}
          isTakeawayId={h.isTakeawayId}
          TAKEAWAY_BASE={h.TAKEAWAY_BASE}
        />
      )}

      {h.rol === "ADMINISTRADOR" && (
        <VistaAdmin
          ventasDia={h.ventasDia}
          bizKey={h.bizKey}
          brasaOctavos={h.brasaOctavos}
          parrillaControl={h.parrillaControl}
          gaseosaControl={h.gaseosaControl}
        />
      )}

      {(h.rol === "MESERO") && (
        <MesaBar
          MESAS_TOTAL={h.MESAS_TOTAL}
          mesaSel={h.mesaSel}
          setMesaSel={h.setMesaSel}
          mesaOcupada={h.mesaOcupada}
        />
      )}

      {h.showAuth && (
        <div className="auth-backdrop">
          <div className="auth-modal">
            <h3>Ingresar clave ({h.pendingRole})</h3>
            <input
              type="password"
              value={h.passInput}
              onChange={(e)=>h.setPassInput(e.target.value)}
              placeholder="****"
            />
            <div className="auth-actions">
              <button className="btn-action charge" onClick={h.confirmRole}>Entrar</button>
              <button className="btn-action" onClick={()=>h.setShowAuth(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
