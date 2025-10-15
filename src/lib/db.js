// src/lib/db.js
import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!url || !anon) {
  // No tumba la app; sólo loguea un error claro.
  console.error('[Supabase] Variables faltantes.',
    { hasUrl: !!url, hasAnon: !!anon }
  );
}

// Si faltan variables, exportamos un cliente "nulo" que lanza errores claros al usarlo
function makeGuardedClient() {
  if (!url || !anon) {
    return {
      from() {
        throw new Error(
          '[Supabase] Falta VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY en Vercel. ' +
          'Define ambas variables y redeploy.'
        );
      },
      channel() {
        throw new Error('[Supabase] Cliente no inicializado por variables faltantes.');
      },
      removeChannel() {},
    };
  }
  return createClient(url, anon, {
    realtime: { params: { eventsPerSecond: 10 } },
  });
}

export const supabase = makeGuardedClient();
