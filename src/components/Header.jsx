import React from "react";

// Cómo se muestran los textos de rol
const ROLE_LABELS = {
  ADMINISTRADOR: "ADMIN",
  COCINERO: "COCINA",
  // MESERO y CAJERO se muestran tal cual
};

export default function Header({rol, createTakeaway, onLogout }) {
  const isMesero = rol === "MESERO";
  const roleText = ROLE_LABELS[rol] || rol || "SIN ROL";

  // Estilo base para los “chips” (rol y salir)
  const baseBtnStyle = {
    textTransform: "uppercase",
    fontWeight: 700,
    fontSize: 13,
    padding: "6px 12px",
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: "solid",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 78,
    textAlign: "center",
  };

  return (
    <header className="header">
      {/* Logo + nombre */}
      <div className="brand">
        <img src="/logo.png" alt="Logo Penecas" className="logo" />
        <h1 className="title">Penecas</h1>
      </div>

      {/* Controles de la derecha */}
      <div className="right-controls">
        {/* SOLO MESERO: botón LLEVAR (primero) */}
        {isMesero && (
          <button
            className="carry-btn"
            onClick={createTakeaway}
            title="Crear pedido para llevar"
          >
            🛍️D
          </button>
        )}

        {/* Chip con el rol (MESERO / COCINA / CAJERO / ADMIN) */}
        <span
          style={{
            ...baseBtnStyle,
            background: "#d1fae5",
            color: "#065f46",
            borderColor: "#10b981",
          }}
        >
          {roleText}
        </span>

        {/* Botón salir (siempre visible, último) */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Salir"
            style={{
              ...baseBtnStyle,
              background: "#fee2e2",
              color: "#991b1b",
              borderColor: "#fca5a5",
              cursor: "pointer",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#fecaca")}
            onMouseLeave={(e) => (e.target.style.background = "#fee2e2")}
          >
            SALIR
          </button>
        )}
      </div>
    </header>
  );
}
