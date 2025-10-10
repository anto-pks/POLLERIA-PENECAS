// src/hooks/useAuth.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/db";

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session || null);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    }

    async function loadProfile(userId) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, role, sucursal_id")
        .eq("id", userId)
        .maybeSingle();
      if (p) setProfile(p);
    }

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      if (sess?.user) await loadProfile(sess.user.id);
      else setProfile(null);
    });

    bootstrap();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { loading, session, profile, signIn, signOut };
}
