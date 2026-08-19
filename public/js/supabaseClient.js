// Cliente de Supabase compartido por toda la app.
// window.SUPABASE_URL y window.SUPABASE_ANON_KEY los define config.js,
// que se genera automáticamente en cada deploy de Vercel a partir de
// las variables de entorno (ver scripts/build-config.js y README.md).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
  console.error('Faltan las credenciales de Supabase. Revisá config.js / las variables de entorno en Vercel.');
}

export const supabase = createClient(
  window.SUPABASE_URL || '',
  window.SUPABASE_ANON_KEY || ''
);
