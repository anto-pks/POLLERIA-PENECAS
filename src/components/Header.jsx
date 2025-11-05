import React from "react";

export default function Header({ mesaSel, rol, createTakeaway, onLogout }) {
  // Estilo base común para los botones de rol y salir
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
      {/* --- Logo y nombre --- */}
      <div className="brand">
        <img src="/logo.png" alt="Logo Penecas" className="logo" />
        <h1 className="title">Penecas</h1>
      </div>

      {/* --- Controles derechos --- */}
      <div className="right-controls">
        {/* Botón "Para llevar" */}
        <button
          className="carry-btn"
          onClick={createTakeaway}
          title="Crear pedido para llevar"
        >
          🛍️ LLEVAR
        </button>

        {/* Info mesa */}
        <div className="mesa-info">
          <strong>M#{mesaSel}</strong>
        </div>

        {/* Rol visible */}
        <span
          style={{
            ...baseBtnStyle,
            background: "#d1fae5",
            color: "#065f46",
            borderColor: "#10b981",
          }}
        >
          {rol || "SIN ROL"}
        </span>

        {/* Botón salir */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            style={{
              ...baseBtnStyle,
              background: "#fee2e2",
              color: "#991b1b",
              borderColor: "#fca5a5",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) =>
              (e.target.style.background = "#fecaca")
            }
            onMouseLeave={(e) =>
              (e.target.style.background = "#fee2e2")
            }
          >
            Salir
          </button>
        )}
      </div>
    </header>
  );
}
