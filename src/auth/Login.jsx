import React, { useState } from "react";
import { supabase } from "../lib/db";

const LOGIN_DOMAIN = "penecas.com";

export default function Login({ onLogged }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const email = `${username.trim()}@${LOGIN_DOMAIN}`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error("No se obtuvo el usuario de la sesión.");

      // Traer perfil
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("full_name, role, sucursal_id")
        .eq("id", userId)
        .maybeSingle();

      if (pErr) throw pErr;

      const role = profile?.role || "MESERO";
      const sucursal_id = profile?.sucursal_id || "MATRIZ";

      // Guardar en localStorage para mantener sesión/rol/sucursal
      localStorage.setItem("ppos_role", role);
      localStorage.setItem("ppos_sucursal", sucursal_id);

      onLogged({ role, sucursal_id });
    } catch (e) {
      setErr("Usuario o clave incorrectos.");
      // console.error("[LOGIN ERR]", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login__wrap">
      <div className="login__card">
        <div className="login__brand">
          <img src="/logo.png" alt="Penecas" />
          <div>
            <h1>Pollería Penecas</h1>
            <p>Ingreso por usuario</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="login__form">
          <label>Usuario</label>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="isamar"
          />

          <label>Clave</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
          />

          {err && <div className="login__error">{err}</div>}

          <button className="btn btn--primary" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <div className="login__hint">
            Se convierte en correo: <b>usuario@{LOGIN_DOMAIN}</b>
          </div>
        </form>
      </div>
    </div>
  );
}
