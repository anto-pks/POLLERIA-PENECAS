// src/PolleriaPOS.jsx
import React from "react";
import { useAuth } from "./hooks/useAuth";
import Login from "./auth/Login";

import { CATS } from "./config/menuData";
import { usePedidos } from "./hooks/usePedidos";
import Header from "./components/Header";
import MesaBar from "./components/MesaBar";
import VistaMesero from "./views/VistaMesero";
import VistaCocinero from "./views/VistaCocinero";
import VistaCajero from "./views/VistaCajero";
import VistaAdmin from "./views/VistaAdmin";

export default function PolleriaPOS() {
  const { loading, session, profile, signIn, signOut } = useAuth();
  const h = usePedidos();

  // vincula perfil con la app (rol/sucursal) — sin romper lo que ya tenías
  React.useEffect(() => {
    if (profile?.role) h.setRol(profile.role); // fija rol desde perfil (ya no usa PIN)
  }, [profile?.role]);

  if (loading) return null; // pequeño skeleton si quieres
  if (!session || !profile) return <Login onLogin={signIn} />;

  return (
    <div className="app">
      <Header mesaSel={h.mesaSel} profile={profile} onSignOut={signOut} />

      {profile.role === "MESERO" && (
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
        />
      )}

      {profile.role === "COCINERO" && (
        <VistaCocinero
          MESAS_TOTAL={h.MESAS_TOTAL}
          pedidosPorMesa={h.pedidosPorMesa}
          ensureMesa={h.ensureMesa}
          pendientesMesa={h.pendientesMesa}
          estadoMesa={h.estadoMesa}
          notasPorMesa={h.notasPorMesa}
          marcarListo={h.marcarListo}
        />
      )}

      {profile.role === "CAJERO" && (
        <VistaCajero
          MESAS_TOTAL={h.MESAS_TOTAL}
          pedidosPorMesa={h.pedidosPorMesa}
          ensureMesa={h.ensureMesa}
          estadoMesa={h.estadoMesa}
          cobrarMesa={h.cobrarMesa}
          notasPorMesa={h.notasPorMesa}
          ventasDia={h.ventasDia}
          bizKey={h.bizKey}
        />
      )}

      {profile.role === "ADMINISTRADOR" && (
        <VistaAdmin
          ventasDia={h.ventasDia}
          bizKey={h.bizKey}
          brasaOctavos={h.brasaOctavos}
          parrillaControl={h.parrillaControl}
          gaseosaControl={h.gaseosaControl}
        />
      )}

      <MesaBar
        MESAS_TOTAL={h.MESAS_TOTAL}
        mesaSel={h.mesaSel}
        setMesaSel={h.setMesaSel}
        mesaOcupada={h.mesaOcupada}
      />
    </div>
  );
}
