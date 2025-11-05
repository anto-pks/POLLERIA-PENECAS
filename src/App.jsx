import React, { useEffect, useState } from "react";
import PolleriaPOS from "./PolleriaPOS";
import { supabase } from "./lib/db";

// Pantalla de login con logo
function LoginScreen({ onLogin, loading, errorMsg }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f6f7f9",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 10px 25px rgba(0,0,0,.12)",
          border: "1px solid #e5e7eb",
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <img
          src="/logo.png"
          alt="Logo Penecas"
          style={{ width: 80, height: 80, marginBottom: 6 }}
        />

        {/* Nombre */}
        <h2
          style={{
            margin: 0,
            marginBottom: 12,
            color: "#065f46",
            fontWeight: 800,
          }}
        >
          Penecas
        </h2>

        <p
          style={{
            fontSize: 13,
            color: "#4b5563",
            marginBottom: 16,
          }}
        >
          Ingresa con tu usuario autorizado.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          <div style={{ textAlign: "left" }}>
            <label style={{ fontSize: 12, color: "#374151" }}>Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ej: mesero@penecas.com"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                marginTop: 4,
              }}
            />
          </div>

          <div style={{ textAlign: "left" }}>
            <label style={{ fontSize: 12, color: "#374151" }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="********"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                marginTop: 4,
              }}
            />
          </div>

          {errorMsg && (
            <div
              style={{
                color: "#b91c1c",
                fontSize: 13,
                marginTop: 4,
                textAlign: "left",
              }}
            >
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              fontWeight: 700,
              background: "linear-gradient(180deg,#34d399,#10b981)",
              color: "#064e3b",
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [checking, setChecking] = useState(true);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let mounted = true;

    // Revisar si ya hay sesión al cargar
    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        console.error(error);
      }
      const u = data?.user ?? null;
      setUser(u);
      const rol = u?.user_metadata?.rol || null;
      setUserRole(rol);
      setChecking(false);
    });

    // Listener de cambios de sesión (login / logout)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        const rol = u?.user_metadata?.rol || null;
        setUserRole(rol);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (email, password) => {
    setErrorMsg("");
    setLoadingLogin(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        console.error(error);
        setErrorMsg("Correo o contraseña incorrectos.");
      }
      // Si todo va bien, onAuthStateChange pondrá el user
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al iniciar sesión.");
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // listener limpiará user
    } catch (err) {
      console.error("Error al cerrar sesión", err);
    }
  };

  if (checking) {
    return (
      <div
        className="app"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f4f6",
        }}
      >
        <p style={{ color: "#4b5563" }}>Cargando...</p>
      </div>
    );
  }

  // Si NO hay usuario => mostramos login con logo
  if (!user) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        loading={loadingLogin}
        errorMsg={errorMsg}
      />
    );
  }

  // Si hay usuario => mostramos el POS
  return <PolleriaPOS rolSupabase={userRole} onLogout={handleLogout} />;
}
