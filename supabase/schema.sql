-- =====================================================================
-- PUELO NEON — esquema de base de datos para Supabase
-- =====================================================================
-- Cómo usar este archivo:
--   1. Entrá a tu proyecto en https://supabase.com/dashboard
--   2. Andá a "SQL Editor" → "New query"
--   3. Pegá TODO este archivo y tocá "Run"
--   4. Revisá la sección de Storage al final: los buckets también se
--      crean acá mismo por SQL, no hace falta crearlos a mano.
--
-- Este esquema cubre TODO el sistema (aunque en esta primera etapa
-- solo Ajustes, Stock, Galería y Tienda tienen pantallas de admin
-- funcionando). Las demás tablas ya quedan listas para cuando
-- migremos Presupuestos, Clientes, Carteles pedidos, etc.
-- =====================================================================

create extension if not exists "pgcrypto";

-- =====================================================================
-- 1) DATOS DEL NEGOCIO (fila única)
-- =====================================================================
create table if not exists business_settings (
  id int primary key default 1,
  name text not null default 'Puelo Neon',
  phone text default '',
  instagram text default '',
  facebook text default '',
  email text default '',
  icon_style text default 'logo',            -- 'logo' | 'emoji'
  hourly_rate numeric default 0,
  neon_meter_price numeric default 0,
  profit_percent numeric default 0,
  logo_url text default '',
  gallery_order jsonb default '[]'::jsonb,     -- orden manual ["manual:uuid", "order:uuid", ...]
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);
insert into business_settings (id) values (1) on conflict (id) do nothing;

-- =====================================================================
-- 2) CLIENTES
-- =====================================================================
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text default '',
  address text default '',
  created_at timestamptz default now()
);

-- =====================================================================
-- 3) PROVEEDORES
-- =====================================================================
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text default '',
  products text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- =====================================================================
-- 4) STOCK / MATERIALES (también catálogo de la Tienda)
-- =====================================================================
create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  qty numeric default 0,
  unit text default 'unid',
  cost numeric default 0,              -- precio de compra
  min_qty numeric default 0,
  for_sale boolean default false,      -- ¿aparece en la Tienda pública?
  sale_price numeric default 0,
  product_description text default '',
  product_photo_url text default '',
  created_at timestamptz default now()
);

-- =====================================================================
-- 5) PRESUPUESTOS / VENTAS
-- =====================================================================
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  job text default '',
  sale_date date default current_date,
  hours numeric default 0,
  hourly_rate numeric default 0,
  labor_cost numeric default 0,
  neon_meters numeric default 0,
  neon_meter_price numeric default 0,
  neon_cost numeric default 0,
  material_cost numeric default 0,
  extra numeric default 0,
  subtotal numeric default 0,
  profit_percent numeric default 0,
  profit_amount numeric default 0,
  total numeric default 0,
  status text default 'pendiente',     -- pendiente | pagado | rechazado
  abono numeric default 0,
  observations text default '',
  created_at timestamptz default now()
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references sales(id) on delete cascade,
  material_id uuid references materials(id) on delete set null,
  qty numeric default 0
);

-- =====================================================================
-- 6) GASTOS
-- =====================================================================
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  concept text not null,
  amount numeric default 0,
  supplier_id uuid references suppliers(id) on delete set null,
  expense_date date default current_date,
  created_at timestamptz default now()
);

-- =====================================================================
-- 7) CARTELES PEDIDOS
-- =====================================================================
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  client_id uuid references clients(id) on delete set null,
  sale_id uuid references sales(id) on delete set null,   -- presupuesto vinculado (evita doble descuento de stock)
  order_date date default current_date,
  due_date date,
  status text default 'pedido',        -- pedido | fabricacion | listo | entregado
  materials_discounted boolean default false,
  observations text default '',
  category text default 'Otros',       -- categoría de Galería si se muestra públicamente
  photo_urls text[] default '{}',
  video_urls jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  material_id uuid references materials(id) on delete set null,
  qty numeric default 0
);

-- =====================================================================
-- 8) GALERÍA (fotos/videos cargados directo, sin pasar por un cartel pedido)
-- =====================================================================
create table if not exists gallery_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int default 0
);
insert into gallery_categories (name, sort_order)
values ('Infantiles',1), ('Fútbol',2), ('Otros',3), ('Neons',4), ('Nuestros trabajos en la calle',5)
on conflict (name) do nothing;

create table if not exists gallery_items (
  id uuid primary key default gen_random_uuid(),
  description text default '',
  item_date date default current_date,
  category text default 'Otros',
  photo_urls text[] default '{}',
  video_urls jsonb default '[]'::jsonb,   -- [{"type":"file"|"link","src":"..."}]
  created_at timestamptz default now()
);

-- Vista combinada: fotos cargadas directo + fotos de carteles entregados.
-- Es lo que consultan las páginas públicas de Galería (sin exponer datos del cliente).
create or replace view public_gallery as
  select id, 'manual' as kind, description, item_date as item_date, category,
         photo_urls, video_urls, created_at
  from gallery_items
  union all
  select id, 'order' as kind, description, coalesce(due_date, order_date) as item_date, category,
         photo_urls, '[]'::jsonb as video_urls, created_at
  from orders
  where status = 'entregado' and array_length(photo_urls,1) > 0;

-- =====================================================================
-- 9) RESEÑAS / CONSULTAS DE CLIENTES
-- =====================================================================
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  name text default 'Cliente',
  comment text not null,
  rating int default 0,
  review_date date default current_date,
  created_at timestamptz default now()
);

-- Vista pública de la Tienda: solo lo necesario para mostrar, sin costo ni stock interno.
create or replace view store_products as
  select id, name, sale_price, product_description, product_photo_url
  from materials
  where for_sale = true;

-- =====================================================================
-- SEED opcional: productos de ejemplo (compra a "ilu led la plata")
-- Comentá o borrá este bloque si no lo querés.
-- =====================================================================
insert into materials (name, qty, unit, cost, for_sale, sale_price)
select * from (values
  ('TIRA LED ZIG ZAG BLANCO FRIO 2835', 20, 'unid', 1800, true, 2340),
  ('NEON 12X6 VERDE', 10, 'unid', 2115, true, 2750),
  ('NEON 12X6 VIOLETA', 5, 'unid', 2115, true, 2750),
  ('NEON 12X6 ROSA', 5, 'unid', 2115, true, 2750),
  ('NEON 12X6 PIXEL', 5, 'unid', 8550, true, 11115),
  ('MINI CONTROLADORA PIXEL CON CONTROL', 2, 'unid', 5130, true, 6670)
) as v(name, qty, unit, cost, for_sale, sale_price)
where not exists (select 1 from materials m where m.name = v.name);

-- =====================================================================
-- ROW LEVEL SECURITY
-- Regla general: el panel de administración requiere estar logueado
-- (rol "authenticated"). Las páginas públicas (Galería/Tienda) solo
-- pueden LEER lo que corresponde, nunca escribir salvo reseñas.
-- =====================================================================
alter table business_settings enable row level security;
alter table clients enable row level security;
alter table suppliers enable row level security;
alter table materials enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table expenses enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table gallery_items enable row level security;
alter table gallery_categories enable row level security;
alter table reviews enable row level security;

-- business_settings: lectura pública (necesaria para logo/contacto en páginas públicas), edición solo admin
create policy "business_settings_public_read" on business_settings for select using (true);
create policy "business_settings_admin_write" on business_settings for all using (auth.role() = 'authenticated');

-- tablas 100% privadas (solo el admin logueado)
create policy "clients_admin_only" on clients for all using (auth.role() = 'authenticated');
create policy "suppliers_admin_only" on suppliers for all using (auth.role() = 'authenticated');
create policy "sales_admin_only" on sales for all using (auth.role() = 'authenticated');
create policy "sale_items_admin_only" on sale_items for all using (auth.role() = 'authenticated');
create policy "expenses_admin_only" on expenses for all using (auth.role() = 'authenticated');
create policy "order_items_admin_only" on order_items for all using (auth.role() = 'authenticated');

-- materials: el admin ve/edita todo. El público NO tiene acceso directo a esta tabla
-- (usa la vista store_products, que ya filtra columnas sensibles como costo y stock).
create policy "materials_admin_only" on materials for all using (auth.role() = 'authenticated');

-- orders: el admin ve/edita todo. El público accede solo via la vista public_gallery.
create policy "orders_admin_only" on orders for all using (auth.role() = 'authenticated');

-- gallery_items: lectura pública, escritura solo admin
create policy "gallery_items_public_read" on gallery_items for select using (true);
create policy "gallery_items_admin_write" on gallery_items for insert with check (auth.role() = 'authenticated');
create policy "gallery_items_admin_update" on gallery_items for update using (auth.role() = 'authenticated');
create policy "gallery_items_admin_delete" on gallery_items for delete using (auth.role() = 'authenticated');

-- gallery_categories: lectura pública, escritura solo admin
create policy "gallery_categories_public_read" on gallery_categories for select using (true);
create policy "gallery_categories_admin_write" on gallery_categories for insert with check (auth.role() = 'authenticated');
create policy "gallery_categories_admin_delete" on gallery_categories for delete using (auth.role() = 'authenticated');

-- reviews: cualquiera puede leer y ESCRIBIR (dejar su reseña/consulta); solo el admin borra
create policy "reviews_public_read" on reviews for select using (true);
create policy "reviews_public_insert" on reviews for insert with check (true);
create policy "reviews_admin_delete" on reviews for delete using (auth.role() = 'authenticated');

-- Las vistas (public_gallery, store_products) heredan permisos de sus tablas base
-- más el grant explícito para el rol anónimo:
grant select on public_gallery to anon, authenticated;
grant select on store_products to anon, authenticated;

-- =====================================================================
-- STORAGE (fotos, videos, logo)
-- Un solo bucket público de lectura; solo el admin logueado puede subir/borrar.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media_public_read" on storage.objects for select
  using (bucket_id = 'media');
create policy "media_admin_upload" on storage.objects for insert
  with check (bucket_id = 'media' and auth.role() = 'authenticated');
create policy "media_admin_update" on storage.objects for update
  using (bucket_id = 'media' and auth.role() = 'authenticated');
create policy "media_admin_delete" on storage.objects for delete
  using (bucket_id = 'media' and auth.role() = 'authenticated');

-- =====================================================================
-- Fin del esquema. Después de correr esto:
--   1. Andá a Authentication → Users → "Add user" y creá tu usuario admin
--      (el email/contraseña con los que vas a entrar al panel).
--   2. Copiá Project URL y el "anon public" API key desde
--      Settings → API — los vas a necesitar en Vercel (ver README.md).
-- =====================================================================
