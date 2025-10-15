// scripts/set-passwords.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL   = process.env.SUPABASE_URL;
const SERVICE_ROLE   = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE en .env');
  process.exit(1);
}

// Cliente ADMIN (Service Role) — NO uses tu db.js del frontend aquí
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Define usuarios por EMAIL (más seguro que por id)
const USERS = [
  { email: 'isamar@penecas.com',     password: '121212'  },
  { email: 'edgar@penecas.com',      password: '757575'  },
  { email: 'ale@penecas.com',        password: '927474'  },
  { email: 'adminzana@penecas.com',  password: '73655314'},
];

console.log(`→ URL: ${SUPABASE_URL}`);
console.log(`→ SERVICE ROLE empieza con: ${SERVICE_ROLE.slice(0, 20)}...`);

async function listAllUsers() {
  // Traemos suficientes usuarios para ambientes pequeños (ajusta si necesitas más)
  let page = 1;
  const perPage = 1000;
  let all = [];

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    all = all.concat(data.users || []);
    if ((data.users || []).length < perPage) break;
    page++;
  }
  return all;
}

(async () => {
  try {
    const allUsers = await listAllUsers();

    for (const u of USERS) {
      const matches = allUsers.filter(x => (x.email || '').toLowerCase() === u.email.toLowerCase());

      if (matches.length === 0) {
        console.error(`❌ No se encontró el usuario con email ${u.email}`);
        continue;
      }
      if (matches.length > 1) {
        console.warn(`⚠️ Hay duplicados para ${u.email}. IDs: ${matches.map(m => m.id).join(', ')}`);
        console.warn('   Revisa en Authentication → Users y elimina el que no corresponda (.local).');
      }

      const user = matches[0]; // tomamos el primero que coincida

      const { error } = await admin.auth.admin.updateUserById(user.id, {
        password: u.password,
      });

      if (error) {
        console.error(`❌ Error actualizando ${u.email}:`, error.message);
      } else {
        console.log(`✅ Password seteada correctamente para ${u.email}`);
      }
    }

    console.log('🎯 Listo. Usuarios y contraseñas actualizadas.');
  } catch (e) {
    console.error('❌ Error:', e.message || e);
    process.exit(1);
  }
})();
