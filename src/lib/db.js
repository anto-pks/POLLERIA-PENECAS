// src/lib/db.js
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,         // guarda la sesión en localStorage
    autoRefreshToken: true,       // refresca tokens automáticamente
    detectSessionInUrl: true,
  },
  realtime: { params: { eventsPerSecond: 10 } }
});
