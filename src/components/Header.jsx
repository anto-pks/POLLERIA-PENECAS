// src/components/Header.jsx
import React from "react";

export default function Header({ mesaSel, profile, onSignOut }) {
  return (
    <header className="header">
      <div className="brand">
        <img src="/logo.png" alt="Logo Polleria Penecas" className="logo" />
        <h1 className="title">Polleria Penecas</h1>
      </div>
      <div className="right-controls">
        {profile && (
          <>
            <div className="mesa-info">
              <span>Sucursal</span><strong>{profile.sucursal_id || "—"}</strong>
            </div>
            <div className="mesa-info">
              <span>Rol</span><strong>{profile.role || "—"}</strong>
            </div>
          </>
        )}
        <div className="mesa-info"><span>Mesa</span><strong>#{mesaSel}</strong></div>
        {profile && (
          <button className="btn-action" onClick={onSignOut}>Salir</button>
        )}
      </div>
    </header>
  );
}
