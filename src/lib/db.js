// src/lib/db.js
import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const missingEnvError = new Error(
  '[Supabase] Falta VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Define ambas variables y vuelve a desplegar.'
);

if (!url || !anon) {
  console.error('[Supabase] Variables faltantes.', { hasUrl: !!url, hasAnon: !!anon });
}

function makeGuardedClient() {
  if (!url || !anon) {
    return {
      from() {
        throw missingEnvError;
      },
      channel() {
        throw missingEnvError;
      },
      removeChannel() {},
      auth: {
        async getUser() {
          return { data: { user: null }, error: missingEnvError };
        },
        onAuthStateChange() {
          return { data: { subscription: { unsubscribe() {} } } };
        },
        async signInWithPassword() {
          return { data: null, error: missingEnvError };
        },
        async signOut() {
          return { error: null };
        },
      },
    };
  }

  return createClient(url, anon, {
    realtime: { params: { eventsPerSecond: 10 } },
  });
}

export const supabase = makeGuardedClient();
