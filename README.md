# Puelo Neon — panel + Galería + Tienda (Supabase + Vercel)

Sistema de gestión para Puelo Neon, migrado del archivo único HTML a una
aplicación real: base de datos en la nube (Supabase), hosting con deploys
automáticos (Vercel) y repositorio en GitHub.

## Estado del proyecto (por partes)

Esta es la **Etapa 1**. Ya funcionan de punta a punta, con login y base de
datos real:

- ✅ Login / panel de administración protegido
- ✅ Ajustes del negocio (nombre, contacto, redes, logo)
- ✅ Stock (con precio de compra/venta y sugerencias de margen) — también
  alimenta la Tienda
- ✅ Galería pública, con categorías, fotos/videos, reseñas/consultas
- ✅ Tienda pública, con carrito y pedido por WhatsApp

Todavía **no están migradas** (siguen "Próximamente" en el menú, las vamos
sumando en las próximas partes): Presupuestos, Ventas, Clientes, Gastos,
Proveedores, Carteles pedidos, Ganancias. El esquema de base de datos
(`supabase/schema.sql`) ya tiene las tablas para todo eso, así que no hace
falta tocar la base de datos de nuevo cuando sigamos.

---

## 1. Creá el proyecto en Supabase

1. Andá a [supabase.com](https://supabase.com) → **New project**.
2. Cuando esté listo, andá a **SQL Editor** → **New query**.
3. Abrí el archivo `supabase/schema.sql` de este proyecto, copiá **todo** el
   contenido, pegalo ahí, y tocá **Run**. Esto crea todas las tablas, la
   seguridad (RLS) y el espacio de almacenamiento para fotos/videos.
4. Andá a **Authentication → Users → Add user** y creá tu usuario admin
   (el email y contraseña con los que vas a entrar al panel).
5. Andá a **Settings → API** y copiá dos datos, los vas a necesitar en el
   paso 3:
   - **Project URL**
   - **anon public** key

> La "anon key" está pensada para ser pública (no es una contraseña) — la
> seguridad real la da la configuración RLS que ya viene en `schema.sql`,
> que dice exactamente qué puede leer/escribir cada quien.

## 2. Subilo a GitHub

```bash
cd puelo-neon-web
git init
git add .
git commit -m "Puelo Neon — etapa 1"
```

Creá un repositorio nuevo en [github.com/new](https://github.com/new) (no
hace falta que sea público) y seguí las instrucciones que te da GitHub para
conectar tu carpeta local:

```bash
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git branch -M main
git push -u origin main
```

## 3. Desplegalo en Vercel

1. Andá a [vercel.com/new](https://vercel.com/new) e importá el repositorio
   de GitHub que acabás de crear.
2. Antes de tocar "Deploy", abrí **Environment Variables** y cargá las dos
   que copiaste de Supabase:
   - `SUPABASE_URL` = tu Project URL
   - `SUPABASE_ANON_KEY` = tu anon public key
3. Tocá **Deploy**. Vercel construye el proyecto solo (corre
   `npm run build`, que genera `public/config.js` con esas variables).
4. Cuando termine, te da una URL tipo `tu-proyecto.vercel.app`. Ya está en
   producción.

Cada vez que hagas `git push`, Vercel vuelve a desplegar solo — no hay que
subir archivos a mano nunca más (eso reemplaza lo que veníamos haciendo con
Netlify Drop).

## 4. Entrá y probá

- **Panel de administración**: `https://tu-proyecto.vercel.app/login.html`
  — entrá con el usuario que creaste en el paso 1.4.
- **Galería pública**: `https://tu-proyecto.vercel.app/galeria.html`
- **Tienda pública**: `https://tu-proyecto.vercel.app/tienda.html`

Estos son los links que ponés en la bio de Instagram/Facebook o mandás por
WhatsApp — ya no dependen de que vos los compartas cada vez ni de subir
archivos: se actualizan solos apenas cargás algo nuevo desde el panel.

## Dominio propio (opcional)

En Vercel: **Project → Settings → Domains** — podés conectar un dominio que
ya tengas, o comprar uno nuevo desde ahí mismo.

## Desarrollo local (opcional)

```bash
cp .env.example .env      # completá con tus datos de Supabase
npm run dev                # genera config.js y levanta un servidor local
```

## Estructura del proyecto

```
puelo-neon-web/
├── supabase/schema.sql       ← todo el esquema de base de datos
├── scripts/build-config.js   ← genera config.js en cada deploy
├── public/
│   ├── index.html             ← landing con los 3 accesos
│   ├── login.html
│   ├── galeria.html           ← página pública
│   ├── tienda.html            ← página pública con carrito
│   ├── admin/                 ← panel de administración (requiere login)
│   ├── js/                    ← lógica compartida (Supabase, íconos, etc.)
│   └── css/styles.css         ← estilos compartidos por todo el sitio
├── vercel.json
└── package.json
```

## Siguiente parte

Cuando quieras seguir, decime y migramos el próximo bloque (por ejemplo
Clientes + Presupuestos, o Carteles pedidos). La base de datos ya está
lista para eso, así que cada parte nueva es más rápida que esta.
