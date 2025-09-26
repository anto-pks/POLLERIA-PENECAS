// src/components/Header.jsx
import React from "react";
import { ROLES } from "../config/constants";

export default function Header({ mesaSel, rol, requestRole }) {
  return (
    <header className="header">
      <div className="brand">
        <img src="/logo.png" alt="Logo Polleria Penecas" className="logo" />
        <h1 className="title">Polleria Penecas</h1>
      </div>
      <div className="right-controls">
        <div className="mesa-info"><span>Mesa</span><strong>#{mesaSel}</strong></div>
        <select value={rol} onChange={(e)=>requestRole(e.target.value)} className="role-select" title="Cambiar rol">
          {ROLES.map((r)=><option key={r} value={r}>{r}</option>)}
        </select>
      </div>
    </header>
  );
}
