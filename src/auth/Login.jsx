// src/auth/Login.jsx
import React, { useState } from "react";

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setBusy(true);
      const emailFicticio = `${usuario}@penecas.local`.toLowerCase().trim();
      await onLogin({ email: emailFicticio, password: pass });
    } catch (err) {
      alert("Usuario o contraseña incorrecta");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f6f7f9",
        padding: 16,
      }}
    >
      <div
        style={{
          width: 340,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 20,
          boxShadow: "0 10px 30px rgba(0,0,0,.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <img src="/logo.png" alt="Logo" style={{ width: 64, height: 64 }} />
          <h2 style={{ margin: "8px 0 0", color: "#14532d" }}>Pollería Penecas</h2>
          <div style={{ color: "#475569", fontSize: 14 }}>Inicio de Sesión</div>
        </div>
        <form onSubmit={submit}>
          <label style={{ fontSize: 13, color: "#374151" }}>Usuario</label>
          <input
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
            placeholder="Ej: mesero1"
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              marginBottom: 8,
            }}
          />
          <label style={{ fontSize: 13, color: "#374151" }}>Contraseña</label>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            required
            placeholder="****"
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
            }}
          />
          <button
            type="submit"
            disabled={busy}
            style={{
              marginTop: 12,
              width: "100%",
              padding: "12px 14px",
              border: "none",
              borderRadius: 12,
              fontWeight: 800,
              background: "linear-gradient(180deg,#34d399,#10b981)",
              color: "#083d21",
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(16,185,129,.25)",
            }}
          >
            {busy ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
