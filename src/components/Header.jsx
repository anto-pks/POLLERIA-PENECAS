import React from "react";
import { ROLES } from "../config/constants";

export default function Header({ mesaSel, rol, requestRole, isTakeawayId, TAKEAWAY_BASE, createTakeaway }) {
  const etiqueta = isTakeawayId(mesaSel)
    ? `LLEVAR ${mesaSel - TAKEAWAY_BASE}`
    : `MESA #${mesaSel}`;

  return (
    <header className="header">
      <div className="brand">
        <img src="/logo.png" alt="Logo Polleria Penecas" className="logo" />
        <h1 className="title">Polleria Penecas</h1>
      </div>

      <div className="right-controls">
        <div className="mesa-info"><span>{isTakeawayId(mesaSel) ? "" : "Mesa"}</span><strong>{etiqueta}</strong></div>

        {/* Botón rápido para crear pedido “LLEVAR” */}
        <button
          className="btn-action"
          style={{ background: "#dbeafe", color: "#1e40af" }}
          onClick={createTakeaway}
          title="Nuevo pedido para llevar"
        >
          Para llevar
        </button>

        <select value={rol} onChange={(e)=>requestRole(e.target.value)} className="role-select" title="Cambiar rol">
          {ROLES.map((r)=><option key={r} value={r}>{r}</option>)}
        </select>
      </div>
    </header>
  );
}
