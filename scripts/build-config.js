// Se corre automáticamente en cada deploy de Vercel (ver "build" en package.json).
// Toma las variables de entorno del proyecto en Vercel y genera public/config.js,
// que es el archivo que la app carga en el navegador para conectarse a Supabase.
const fs = require('fs');
const path = require('path');

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';

if (!url || !anonKey) {
  console.warn(
    '\n⚠️  Faltan SUPABASE_URL y/o SUPABASE_ANON_KEY como variables de entorno.\n' +
    '    En Vercel: Project Settings → Environment Variables.\n' +
    '    En local: copiá .env.example a .env y completalo (ver README.md).\n'
  );
}

const content = `// Archivo generado automáticamente — NO editar a mano ni commitear cambios acá.
window.SUPABASE_URL = ${JSON.stringify(url)};
window.SUPABASE_ANON_KEY = ${JSON.stringify(anonKey)};
`;

const outPath = path.join(__dirname, '..', 'public', 'config.js');
fs.writeFileSync(outPath, content);
console.log('config.js generado en', outPath);
