
import { supabase } from '../js/supabaseClient.js';
import { requireAuth, signOut } from '../js/auth.js';

const app = document.getElementById('app');
const modalRoot = document.getElementById('modalRoot');
let currentTab = 'ajustes';
let business = null;

/* ---------- helpers ---------- */
function escapeHtml(str){
  return String(str||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function money(n){ return '$' + Number(n||0).toLocaleString('es-AR', {maximumFractionDigits:0}); }
function toast(msg, isErr){
  const t = document.createElement('div');
  t.className = 'toast' + (isErr?' err':'');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2400);
}
function openModal(html){
  modalRoot.innerHTML = `<div class="overlay" onclick="if(event.target===this) window.__closeModal()"><div class="modal">${html}</div></div>`;
}
function closeModal(){ modalRoot.innerHTML = ''; }
window.__closeModal = closeModal;
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });

async function uploadFile(file, folder){
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false });
  if (error) { toast('Error al subir el archivo: ' + error.message, true); return null; }
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

/* ---------- arranque ---------- */
async function init(){
  const session = await requireAuth();
  if (!session) return;

  document.getElementById('logoutBtn').addEventListener('click', signOut);

  const { data } = await supabase.from('business_settings').select('*').eq('id', 1).single();
  business = data;
  renderBrandLogo();

  document.querySelectorAll('.navitem[data-tab]').forEach(el=>{
    el.addEventListener('click', ()=> setTab(el.dataset.tab));
  });
  setTab('ajustes');
}
function renderBrandLogo(){
  const el = document.getElementById('brandLogo');
  el.innerHTML = business && business.logo_url
    ? `<img src="${business.logo_url}" alt="${escapeHtml(business.name||'Puelo Neon')}">`
    : `<div style="font-family:var(--font-display);font-weight:700;color:var(--green);text-align:center;padding:10px 0">${escapeHtml(business?.name || 'PUELO NEON')}</div>`;
}
function setTab(tab){
  currentTab = tab;
  document.querySelectorAll('.navitem[data-tab]').forEach(el=> el.classList.toggle('active', el.dataset.tab===tab));
  if (tab==='ajustes') renderAjustes();
  if (tab==='stock') renderStock();
  if (tab==='galeria') renderGaleriaAdmin();
  if (tab==='presupuestos') renderPresupuestos();
  if (tab==='ventas') renderVentas();
  if (tab==='clientes') renderClientes();
  if (tab==='gastos') renderGastos();
  if (tab==='proveedores') renderProveedores();
  if (tab==='pedidos') renderCartelesPedidos();
  if (tab==='ganancias') renderGanancias();
}
function pageHeader(title, sub, actionLabel, actionFn){
  return `<div class="page-head">
    <div><h2 class="page-h">${title}</h2>${sub?`<div class="page-sub">${sub}</div>`:''}</div>
    ${actionLabel ? `<button class="btn auto" onclick="${actionFn}">${actionLabel}</button>` : ''}
  </div>`;
}

/* =====================================================================
   AJUSTES
===================================================================== */
function renderAjustes(){
  const b = business || {};
  app.innerHTML = `
    ${pageHeader('Ajustes del negocio', 'datos de contacto, redes y logo')}
    <div class="card" style="max-width:560px">
      <label>Nombre del negocio</label>
      <input id="s_name" value="${escapeHtml(b.name||'')}">
      <label>Teléfono (WhatsApp / llamadas)</label>
      <input id="s_phone" value="${escapeHtml(b.phone||'')}" placeholder="Ej: 5492920000000">
      <label>Instagram</label>
      <input id="s_instagram" value="${escapeHtml(b.instagram||'')}" placeholder="usuario o link">
      <label>Facebook</label>
      <input id="s_facebook" value="${escapeHtml(b.facebook||'')}" placeholder="usuario o link">
      <label>Correo electrónico</label>
      <input id="s_email" type="email" value="${escapeHtml(b.email||'')}">
      <label>Estilo de íconos de contacto</label>
      <select id="s_iconstyle">
        <option value="logo" ${b.icon_style!=='emoji'?'selected':''}>Logos de cada red</option>
        <option value="emoji" ${b.icon_style==='emoji'?'selected':''}>Emojis</option>
      </select>
      <div class="divider"></div>
      <label>Logo</label>
      <div id="logoThumb" class="photo-thumbs" style="margin-bottom:8px">
        ${b.logo_url ? `<div class="photo-thumb"><img src="${b.logo_url}"></div>` : `<div class="muted">Sin logo todavía.</div>`}
      </div>
      <input type="file" id="logoInput" accept="image/*" style="display:none">
      <button class="btn ghost sm" onclick="document.getElementById('logoInput').click()">+ subir logo</button>
      <div class="divider"></div>
      <label>Valor de la hora de trabajo ($)</label>
      <input id="s_hourly" type="number" step="any" value="${b.hourly_rate||0}">
      <label>Precio por metro de neón ($)</label>
      <input id="s_neon" type="number" step="any" value="${b.neon_meter_price||0}">
      <label>Porcentaje de ganancia (%)</label>
      <input id="s_profit" type="number" step="any" value="${b.profit_percent||0}">
      <button class="btn" style="margin-top:16px" onclick="window.__saveAjustes()">Guardar ajustes</button>
    </div>
  `;
  document.getElementById('logoInput').addEventListener('change', async e=>{
    const file = e.target.files[0];
    if (!file) return;
    toast('Subiendo logo...');
    const url = await uploadFile(file, 'logo');
    if (url) {
      const { error } = await supabase.from('business_settings').update({ logo_url: url }).eq('id', 1);
      if (!error) { business.logo_url = url; renderBrandLogo(); renderAjustes(); toast('Logo actualizado'); }
    }
    e.target.value = '';
  });
}
window.__saveAjustes = async function(){
  const updates = {
    name: document.getElementById('s_name').value.trim() || 'Puelo Neon',
    phone: document.getElementById('s_phone').value.trim(),
    instagram: document.getElementById('s_instagram').value.trim(),
    facebook: document.getElementById('s_facebook').value.trim(),
    email: document.getElementById('s_email').value.trim(),
    icon_style: document.getElementById('s_iconstyle').value,
    hourly_rate: parseFloat(document.getElementById('s_hourly').value)||0,
    neon_meter_price: parseFloat(document.getElementById('s_neon').value)||0,
    profit_percent: parseFloat(document.getElementById('s_profit').value)||0,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('business_settings').update(updates).eq('id', 1);
  if (error) { toast('No se pudo guardar: ' + error.message, true); return; }
  Object.assign(business, updates);
  renderBrandLogo();
  toast('Ajustes guardados');
};

/* =====================================================================
   STOCK / TIENDA
===================================================================== */
let materialsCache = [];
async function renderStock(){
  app.innerHTML = `${pageHeader('Stock / Tienda', 'cargando...')}`;
  const { data, error } = await supabase.from('materials').select('*').order('name');
  if (error) { app.innerHTML = `<div class="empty">Error cargando stock: ${escapeHtml(error.message)}</div>`; return; }
  materialsCache = data || [];
  const totalValue = materialsCache.reduce((a,m)=> a + Number(m.qty)*Number(m.cost), 0);
  app.innerHTML = `
    ${pageHeader('Stock / Tienda', 'el costo es precio de compra. Activá "en tienda" para venderlo con carrito.', '+ Material', 'window.__openMaterialForm()')}
    <div class="stat" style="margin-bottom:16px;max-width:320px"><div class="label">Valor total del stock</div><div class="value">${money(totalValue)}</div></div>
    <div class="card">
      ${materialsCache.length ? materialsCache.map(m=>{
        const bajo = Number(m.qty) <= Number(m.min_qty||0);
        return `
        <div class="item-row">
          <div class="item-main">
            <div class="item-title">${escapeHtml(m.name)}</div>
            <div class="item-sub">${m.qty} ${escapeHtml(m.unit)} · compra ${money(m.cost)}${m.for_sale?` · venta ${money(m.sale_price)}`:''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            ${m.for_sale ? '<span class="pill entregado">🛒 en tienda</span>' : ''}
            ${bajo ? '<span class="pill bajo">bajo</span>' : ''}
            <button class="tag-edit" onclick="window.__openMaterialForm('${m.id}')">editar</button>
            <button class="tag-del" onclick="window.__deleteMaterial('${m.id}')">borrar</button>
          </div>
        </div>`;
      }).join('') : `<div class="empty"><span class="ic">📦</span>No hay materiales cargados.</div>`}
    </div>
  `;
}
window.__openMaterialForm = function(id){
  const m = id ? materialsCache.find(x=>x.id===id) : null;
  window.__prodPhotoTemp = m ? m.product_photo_url || '' : '';
  openModal(`
    <button class="close-x" onclick="window.__closeModal()">✕</button>
    <div class="modal-title">${m?'Editar material':'Nuevo material'}</div>
    <label>Nombre</label>
    <input id="f_name" value="${m?escapeHtml(m.name):''}">
    <div class="grid-2">
      <div><label>Cantidad en stock</label><input id="f_qty" type="number" step="any" value="${m?m.qty:''}"></div>
      <div><label>Unidad</label><input id="f_unit" value="${m?escapeHtml(m.unit):''}" placeholder="unid / mts / kg"></div>
    </div>
    <div class="grid-2">
      <div><label>Precio de compra</label><input id="f_cost" type="number" step="any" value="${m?m.cost:''}" oninput="window.__updateMarkups()"></div>
      <div><label>Stock mínimo (alerta)</label><input id="f_min" type="number" step="any" value="${m?m.min_qty||'':''}"></div>
    </div>
    <div class="divider"></div>
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
      <input type="checkbox" id="f_forsale" style="width:auto" ${m&&m.for_sale?'checked':''} onchange="window.__toggleForSale()">
      <span>🛒 Ofrecer en la Tienda online</span>
    </label>
    <div id="forSaleFields" style="display:${m&&m.for_sale?'block':'none'}">
      <label>Precio de venta</label>
      <input id="f_saleprice" type="number" step="any" value="${m&&m.sale_price?m.sale_price:''}">
      <div class="btn-row" id="markupBtns" style="margin:8px 0"></div>
      <label>Descripción para la tienda</label>
      <textarea id="f_prodesc">${m?escapeHtml(m.product_description||''):''}</textarea>
      <label>Foto del producto</label>
      <div id="prodPhotoThumb" class="photo-thumbs"></div>
      <button class="btn ghost sm" onclick="document.getElementById('prodPhotoInput').click()">+ elegir foto</button>
      <input type="file" id="prodPhotoInput" accept="image/*" style="display:none">
    </div>
    <button class="btn" style="margin-top:16px" onclick="window.__saveMaterial('${id||''}')">Guardar material</button>
  `);
  window.__updateMarkups();
  renderProdPhotoThumb();
  document.getElementById('prodPhotoInput').addEventListener('change', async e=>{
    const file = e.target.files[0];
    if (!file) return;
    toast('Subiendo foto...');
    const url = await uploadFile(file, 'products');
    if (url) { window.__prodPhotoTemp = url; renderProdPhotoThumb(); }
    e.target.value = '';
  });
};
function renderProdPhotoThumb(){
  const el = document.getElementById('prodPhotoThumb');
  if (!el) return;
  el.innerHTML = window.__prodPhotoTemp
    ? `<div class="photo-thumb"><img src="${window.__prodPhotoTemp}"><button class="rm" onclick="window.__prodPhotoTemp='';window.__updateMarkups();document.getElementById('prodPhotoThumb').innerHTML='<div class=\\'muted\\'>Sin foto.</div>'">✕</button></div>`
    : `<div class="muted">Sin foto todavía.</div>`;
}
window.__toggleForSale = function(){
  document.getElementById('forSaleFields').style.display = document.getElementById('f_forsale').checked ? 'block' : 'none';
};
window.__updateMarkups = function(){
  const el = document.getElementById('markupBtns');
  if (!el) return;
  const cost = parseFloat(document.getElementById('f_cost').value)||0;
  el.innerHTML = [20,30,50,100].map(pct=>{
    const price = Math.round(cost*(1+pct/100));
    return `<button type="button" class="btn ghost sm" style="width:auto;flex:1" onclick="document.getElementById('f_saleprice').value=${price}">+${pct}% (${money(price)})</button>`;
  }).join('');
};
window.__saveMaterial = async function(id){
  const payload = {
    name: document.getElementById('f_name').value.trim(),
    qty: parseFloat(document.getElementById('f_qty').value)||0,
    unit: document.getElementById('f_unit').value.trim()||'unid',
    cost: parseFloat(document.getElementById('f_cost').value)||0,
    min_qty: parseFloat(document.getElementById('f_min').value)||0,
    for_sale: document.getElementById('f_forsale').checked,
    sale_price: parseFloat(document.getElementById('f_saleprice').value)||0,
    product_description: document.getElementById('f_prodesc').value.trim(),
    product_photo_url: window.__prodPhotoTemp || ''
  };
  if (!payload.name) { toast('Poné un nombre', true); return; }
  const { error } = id
    ? await supabase.from('materials').update(payload).eq('id', id)
    : await supabase.from('materials').insert(payload);
  if (error) { toast('Error: ' + error.message, true); return; }
  closeModal(); toast('Material guardado'); renderStock();
};
window.__deleteMaterial = async function(id){
  if (!confirm('¿Borrar este material?')) return;
  const { error } = await supabase.from('materials').delete().eq('id', id);
  if (error) { toast('Error: ' + error.message, true); return; }
  renderStock();
};

/* =====================================================================
   GALERÍA (admin: categorías + fotos/videos + reseñas)
===================================================================== */
let galleryCache = [];
let categoriesCache = [];
let reviewsCache = [];
async function renderGaleriaAdmin(){
  app.innerHTML = `${pageHeader('Galería', 'cargando...')}`;
  const [{ data: items }, { data: cats }, { data: revs }] = await Promise.all([
    supabase.from('gallery_items').select('*').order('item_date', { ascending:false }),
    supabase.from('gallery_categories').select('*').order('sort_order'),
    supabase.from('reviews').select('*').order('created_at', { ascending:false })
  ]);
  galleryCache = items || [];
  categoriesCache = cats || [];
  reviewsCache = revs || [];
  app.innerHTML = `
    ${pageHeader('Galería', 'fotos y videos para mostrarle a tus clientes', '+ Agregar foto', 'window.__openGalleryForm()')}
    <div class="btn-row" style="margin:-6px 0 16px;max-width:480px">
      <button class="btn ghost" style="width:auto;flex:1" onclick="window.__openCategoryManager()">🏷️ Categorías</button>
      <a class="btn secondary" style="width:auto;flex:1;text-align:center" href="/galeria.html" target="_blank">🖥️ Ver página pública</a>
    </div>
    <div class="card">
      ${galleryCache.length ? galleryCache.map(g=>`
        <div class="item-row">
          <div class="item-main">
            <div class="item-title">${escapeHtml(g.description||'Trabajo')}</div>
            <div class="item-sub">${g.item_date||''} · ${escapeHtml(g.category||'Otros')} · ${(g.photo_urls||[]).length} foto(s)</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <button class="tag-edit" onclick="window.__openGalleryForm('${g.id}')">editar</button>
            <button class="tag-del" onclick="window.__deleteGalleryItem('${g.id}')">borrar</button>
          </div>
        </div>
      `).join('') : `<div class="empty"><span class="ic">📸</span>Todavía no hay fotos cargadas acá (revisá también Carteles pedidos entregados, cuando esa sección esté migrada).</div>`}
    </div>

    <div class="card" style="margin-top:20px">
      <div class="item-title" style="margin-bottom:8px">💬 Consultas y reseñas de clientes</div>
      ${reviewsCache.length ? reviewsCache.map(r=>`
        <div class="item-row">
          <div class="item-main">
            <div class="item-title">${escapeHtml(r.name||'Cliente')} ${r.rating?'⭐'.repeat(r.rating):''}</div>
            <div class="item-sub">${escapeHtml(r.comment||'')}</div>
          </div>
          <button class="tag-del" onclick="window.__deleteReview('${r.id}')">✕</button>
        </div>
      `).join('') : `<div class="muted">Sin mensajes todavía.</div>`}
    </div>
  `;
}
window.__openCategoryManager = function(){
  openModal(`
    <button class="close-x" onclick="window.__closeModal()">✕</button>
    <div class="modal-title">Categorías de la Galería</div>
    <div id="catList"></div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <input id="newCatName" placeholder="Nueva categoría" style="flex:1">
      <button class="btn secondary sm" onclick="window.__addCategory()">+ Agregar</button>
    </div>
  `);
  renderCatList();
};
function renderCatList(){
  const el = document.getElementById('catList');
  if (!el) return;
  el.innerHTML = categoriesCache.map(c=>`
    <div class="item-row">
      <div class="item-title">${escapeHtml(c.name)}</div>
      ${c.name!=='Otros' ? `<button class="tag-del" onclick="window.__deleteCategory('${c.id}','${escapeHtml(c.name).replace(/'/g,"&#39;")}')">✕</button>` : ''}
    </div>
  `).join('');
}
window.__addCategory = async function(){
  const input = document.getElementById('newCatName');
  const name = input.value.trim();
  if (!name) return;
  const { error } = await supabase.from('gallery_categories').insert({ name, sort_order: categoriesCache.length+1 });
  if (error) { toast('Error: ' + error.message, true); return; }
  const { data } = await supabase.from('gallery_categories').select('*').order('sort_order');
  categoriesCache = data || [];
  input.value = '';
  renderCatList();
};
window.__deleteCategory = async function(id, name){
  if (!confirm(`¿Borrar "${name}"? Las fotos con esa categoría pasan a "Otros".`)) return;
  await supabase.from('gallery_items').update({ category: 'Otros' }).eq('category', name);
  const { error } = await supabase.from('gallery_categories').delete().eq('id', id);
  if (error) { toast('Error: ' + error.message, true); return; }
  const { data } = await supabase.from('gallery_categories').select('*').order('sort_order');
  categoriesCache = data || [];
  renderCatList();
};
window.__openGalleryForm = function(id){
  const g = id ? galleryCache.find(x=>x.id===id) : null;
  window.__galleryPhotosTemp = g ? [...(g.photo_urls||[])] : [];
  const catOpts = categoriesCache.map(c=>`<option value="${escapeHtml(c.name)}" ${g&&g.category===c.name?'selected':''}>${escapeHtml(c.name)}</option>`).join('');
  openModal(`
    <button class="close-x" onclick="window.__closeModal()">✕</button>
    <div class="modal-title">${g?'Editar foto':'Agregar foto'}</div>
    <label>Descripción del trabajo</label>
    <input id="f_gdesc" value="${g?escapeHtml(g.description||''):''}">
    <label>Fecha</label>
    <input id="f_gdate" type="date" value="${g?g.item_date:new Date().toISOString().slice(0,10)}">
    <label>Categoría</label>
    <select id="f_gcat">${catOpts}</select>
    <label>Fotos</label>
    <div id="galPhotoThumbs" class="photo-thumbs"></div>
    <button class="btn ghost sm" onclick="document.getElementById('galPhotoInput').click()">+ elegir fotos</button>
    <input type="file" id="galPhotoInput" accept="image/*" multiple style="display:none">
    <button class="btn" style="margin-top:16px" onclick="window.__saveGalleryItem('${id||''}')">Guardar</button>
    ${g ? `<button class="btn danger" style="margin-top:10px" onclick="window.__deleteGalleryItem('${g.id}')">Eliminar</button>` : ''}
  `);
  renderGalPhotoThumbs();
  document.getElementById('galPhotoInput').addEventListener('change', async e=>{
    const files = Array.from(e.target.files||[]);
    for (const file of files){
      toast('Subiendo foto...');
      const url = await uploadFile(file, 'gallery');
      if (url) window.__galleryPhotosTemp.push(url);
    }
    renderGalPhotoThumbs();
    e.target.value = '';
  });
};
function renderGalPhotoThumbs(){
  const el = document.getElementById('galPhotoThumbs');
  if (!el) return;
  el.innerHTML = window.__galleryPhotosTemp.length
    ? window.__galleryPhotosTemp.map((src,i)=>`<div class="photo-thumb"><img src="${src}"><button class="rm" onclick="window.__galleryPhotosTemp.splice(${i},1);document.getElementById('galPhotoThumbs').innerHTML='';window.__rerenderGalThumbs()">✕</button></div>`).join('')
    : `<div class="muted" style="grid-column:1/-1">Sin fotos todavía.</div>`;
}
window.__rerenderGalThumbs = renderGalPhotoThumbs;
window.__saveGalleryItem = async function(id){
  const payload = {
    description: document.getElementById('f_gdesc').value.trim(),
    item_date: document.getElementById('f_gdate').value || new Date().toISOString().slice(0,10),
    category: document.getElementById('f_gcat').value,
    photo_urls: window.__galleryPhotosTemp || []
  };
  if (!payload.photo_urls.length) { toast('Agregá al menos una foto', true); return; }
  const { error } = id
    ? await supabase.from('gallery_items').update(payload).eq('id', id)
    : await supabase.from('gallery_items').insert(payload);
  if (error) { toast('Error: ' + error.message, true); return; }
  closeModal(); toast('Guardado'); renderGaleriaAdmin();
};
window.__deleteGalleryItem = async function(id){
  if (!confirm('¿Borrar esta foto?')) return;
  const { error } = await supabase.from('gallery_items').delete().eq('id', id);
  if (error) { toast('Error: ' + error.message, true); return; }
  closeModal(); renderGaleriaAdmin();
};
window.__deleteReview = async function(id){
  if (!confirm('¿Borrar esta reseña?')) return;
  await supabase.from('reviews').delete().eq('id', id);
  renderGaleriaAdmin();
};

async function ensureMaterialsLoaded(){
  if (materialsCache.length) return materialsCache;
  const { data } = await supabase.from('materials').select('*').order('name');
  materialsCache = data || [];
  return materialsCache;
}

/* =====================================================================
   CLIENTES
===================================================================== */
let clientsCache = [];
async function renderClientes(){
  app.innerHTML = pageHeader('Clientes', 'cargando...');
  const { data } = await supabase.from('clients').select('*').order('name');
  clientsCache = data || [];
  app.innerHTML = `
    ${pageHeader('Clientes', 'base de clientes', '+ Cliente', 'window.__openClientForm()')}
    <div class="card">
      ${clientsCache.length ? clientsCache.map(c=>`
        <div class="item-row">
          <div class="item-main">
            <div class="item-title">${escapeHtml(c.name)}</div>
            <div class="item-sub">${escapeHtml(c.phone||'sin teléfono')}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <button class="tag-edit" onclick="window.__openClientForm('${c.id}')">editar</button>
            <button class="tag-del" onclick="window.__deleteClient('${c.id}')">borrar</button>
          </div>
        </div>
      `).join('') : `<div class="empty"><span class="ic">👤</span>No hay clientes cargados.</div>`}
    </div>
  `;
}
window.__openClientForm = function(id, thenFocusSelect){
  const c = id ? clientsCache.find(x=>x.id===id) : null;
  openModal(`
    <button class="close-x" onclick="window.__closeModal()">✕</button>
    <div class="modal-title">${c?'Editar cliente':'Nuevo cliente'}</div>
    <label>Nombre</label><input id="f_cname" value="${c?escapeHtml(c.name):''}">
    <label>Teléfono (WhatsApp)</label><input id="f_cphone" value="${c?escapeHtml(c.phone||''):''}">
    <label>Dirección</label><input id="f_caddr" value="${c?escapeHtml(c.address||''):''}">
    <button class="btn" style="margin-top:16px" onclick="window.__saveClient('${id||''}', ${thenFocusSelect?`'${thenFocusSelect}'`:'null'})">Guardar cliente</button>
  `);
};
window.__saveClient = async function(id, thenFocusSelect){
  const payload = {
    name: document.getElementById('f_cname').value.trim(),
    phone: document.getElementById('f_cphone').value.trim(),
    address: document.getElementById('f_caddr').value.trim()
  };
  if (!payload.name) { toast('Poné un nombre', true); return; }
  const { data, error } = id
    ? await supabase.from('clients').update(payload).eq('id', id).select('id').single()
    : await supabase.from('clients').insert(payload).select('id').single();
  if (error) { toast('Error: ' + error.message, true); return; }
  const { data: all } = await supabase.from('clients').select('*').order('name');
  clientsCache = all || [];
  closeModal(); toast('Cliente guardado');
  if (thenFocusSelect) {
    const sel = document.getElementById(thenFocusSelect);
    if (sel) { sel.innerHTML = clientsCache.map(c=>`<option value="${c.id}" ${c.id===data.id?'selected':''}>${escapeHtml(c.name)}</option>`).join(''); }
  } else if (currentTab === 'clientes') renderClientes();
};
window.__deleteClient = async function(id){
  if (!confirm('¿Borrar este cliente?')) return;
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) { toast('Error: ' + error.message, true); return; }
  renderClientes();
};

/* =====================================================================
   PROVEEDORES
===================================================================== */
let suppliersCache = [];
async function renderProveedores(){
  app.innerHTML = pageHeader('Proveedores', 'cargando...');
  const { data } = await supabase.from('suppliers').select('*').order('name');
  suppliersCache = data || [];
  app.innerHTML = `
    ${pageHeader('Proveedores', 'información de proveedores', '+ Proveedor', 'window.__openSupplierForm()')}
    <div class="card">
      ${suppliersCache.length ? suppliersCache.map(s=>`
        <div class="item-row">
          <div class="item-main">
            <div class="item-title">${escapeHtml(s.name)}</div>
            <div class="item-sub">${escapeHtml(s.phone||'sin teléfono')}${s.products?(' · '+escapeHtml(s.products)):''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <button class="tag-edit" onclick="window.__openSupplierForm('${s.id}')">editar</button>
            <button class="tag-del" onclick="window.__deleteSupplier('${s.id}')">borrar</button>
          </div>
        </div>
      `).join('') : `<div class="empty"><span class="ic">🚚</span>No hay proveedores cargados.</div>`}
    </div>
  `;
}
window.__openSupplierForm = function(id){
  const s = id ? suppliersCache.find(x=>x.id===id) : null;
  openModal(`
    <button class="close-x" onclick="window.__closeModal()">✕</button>
    <div class="modal-title">${s?'Editar proveedor':'Nuevo proveedor'}</div>
    <label>Nombre / empresa</label><input id="f_sname" value="${s?escapeHtml(s.name):''}">
    <label>Teléfono</label><input id="f_sphone" value="${s?escapeHtml(s.phone||''):''}">
    <label>Productos que provee</label><input id="f_sprod" value="${s?escapeHtml(s.products||''):''}">
    <label>Notas</label><textarea id="f_snotes">${s?escapeHtml(s.notes||''):''}</textarea>
    <button class="btn" style="margin-top:16px" onclick="window.__saveSupplier('${id||''}')">Guardar proveedor</button>
  `);
};
window.__saveSupplier = async function(id){
  const payload = {
    name: document.getElementById('f_sname').value.trim(),
    phone: document.getElementById('f_sphone').value.trim(),
    products: document.getElementById('f_sprod').value.trim(),
    notes: document.getElementById('f_snotes').value.trim()
  };
  if (!payload.name) { toast('Poné un nombre', true); return; }
  const { error } = id
    ? await supabase.from('suppliers').update(payload).eq('id', id)
    : await supabase.from('suppliers').insert(payload);
  if (error) { toast('Error: ' + error.message, true); return; }
  closeModal(); toast('Proveedor guardado'); renderProveedores();
};
window.__deleteSupplier = async function(id){
  if (!confirm('¿Borrar este proveedor?')) return;
  await supabase.from('suppliers').delete().eq('id', id);
  renderProveedores();
};

/* =====================================================================
   GASTOS
===================================================================== */
async function renderGastos(){
  app.innerHTML = pageHeader('Gastos', 'cargando...');
  const [{ data: exp }, { data: sup }] = await Promise.all([
    supabase.from('expenses').select('*, suppliers(name)').order('expense_date', { ascending:false }),
    supabase.from('suppliers').select('*').order('name')
  ]);
  const expenses = exp || [];
  suppliersCache = sup || [];
  const thisMonth = new Date().toISOString().slice(0,7);
  const totalMes = expenses.filter(e=> (e.expense_date||'').slice(0,7)===thisMonth).reduce((a,e)=>a+Number(e.amount||0),0);
  app.innerHTML = `
    ${pageHeader('Gastos', 'gastos en materiales', '+ Gasto', 'window.__openExpenseForm()')}
    <div class="stat" style="margin-bottom:16px;max-width:320px"><div class="label">Total gastado este mes</div><div class="value" style="color:var(--red)">${money(totalMes)}</div></div>
    <div class="card">
      ${expenses.length ? expenses.map(e=>`
        <div class="item-row">
          <div class="item-main">
            <div class="item-title">${escapeHtml(e.concept)}</div>
            <div class="item-sub">${e.expense_date||''}${e.suppliers?(' · '+escapeHtml(e.suppliers.name)):''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="item-title" style="color:var(--red)">${money(e.amount)}</div>
            <button class="tag-del" onclick="window.__deleteExpense('${e.id}')">✕</button>
          </div>
        </div>
      `).join('') : `<div class="empty"><span class="ic">💸</span>No hay gastos cargados.</div>`}
    </div>
  `;
}
window.__openExpenseForm = function(){
  const supOpts = suppliersCache.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  openModal(`
    <button class="close-x" onclick="window.__closeModal()">✕</button>
    <div class="modal-title">Nuevo gasto</div>
    <label>Concepto</label><input id="f_econcept" placeholder="Ej: compra de tubos de neón">
    <label>Monto</label><input id="f_eamount" type="number" step="any">
    <label>Proveedor</label>
    <select id="f_esupplier"><option value="">— sin especificar —</option>${supOpts}</select>
    <label>Fecha</label><input id="f_edate" type="date" value="${new Date().toISOString().slice(0,10)}">
    <button class="btn" style="margin-top:16px" onclick="window.__saveExpense()">Guardar gasto</button>
  `);
};
window.__saveExpense = async function(){
  const payload = {
    concept: document.getElementById('f_econcept').value.trim(),
    amount: parseFloat(document.getElementById('f_eamount').value)||0,
    supplier_id: document.getElementById('f_esupplier').value || null,
    expense_date: document.getElementById('f_edate').value || new Date().toISOString().slice(0,10)
  };
  if (!payload.concept || !payload.amount) { toast('Completá concepto y monto', true); return; }
  const { error } = await supabase.from('expenses').insert(payload);
  if (error) { toast('Error: ' + error.message, true); return; }
  closeModal(); toast('Gasto guardado'); renderGastos();
};
window.__deleteExpense = async function(id){
  if (!confirm('¿Borrar este gasto?')) return;
  await supabase.from('expenses').delete().eq('id', id);
  renderGastos();
};

/* =====================================================================
   PRESUPUESTOS / VENTAS (misma tabla "sales")
===================================================================== */
function saleRow(s){
  const clientName = s.clients ? s.clients.name : 'sin cliente';
  return `
    <div class="item-row" style="cursor:pointer" onclick="window.__openSaleDetail('${s.id}')">
      <div class="item-main">
        <div class="item-title">${escapeHtml(s.job || clientName)}</div>
        <div class="item-sub">${escapeHtml(clientName)} · ${s.sale_date||''} · ${money(s.total)}</div>
      </div>
      <span class="pill ${s.status==='pagado'?'entregado':(s.status==='rechazado'?'bajo':'')}" style="${s.status==='pendiente'?'background:rgba(255,204,51,.15);color:var(--yellow);border:1px solid rgba(255,204,51,.4)':''}">${s.status}</span>
    </div>
  `;
}
async function renderPresupuestos(){
  app.innerHTML = pageHeader('Presupuestos', 'cargando...');
  const { data } = await supabase.from('sales').select('*, clients(name)').order('sale_date', { ascending:false });
  const sales = data || [];
  app.innerHTML = `
    ${pageHeader('Presupuestos', 'crear presupuestos con materiales — descuenta el stock al crearlos', '+ Presupuesto', 'window.__openBudgetForm()')}
    <div class="card">
      ${sales.length ? sales.map(saleRow).join('') : `<div class="empty"><span class="ic">🧾</span>Creá tu primer presupuesto.</div>`}
    </div>
  `;
}
async function renderVentas(){
  app.innerHTML = pageHeader('Ventas', 'cargando...');
  const { data } = await supabase.from('sales').select('*, clients(name)').order('sale_date', { ascending:false });
  const sales = data || [];
  const pendientes = sales.filter(s=>s.status==='pendiente').length;
  const pagadas = sales.filter(s=>s.status==='pagado').length;
  app.innerHTML = `
    ${pageHeader('Ventas', 'historial de ventas')}
    <div class="grid-2" style="margin-bottom:16px;max-width:420px">
      <div class="stat"><div class="label">Pendientes</div><div class="value" style="color:var(--yellow)">${pendientes}</div></div>
      <div class="stat"><div class="label">Pagadas</div><div class="value">${pagadas}</div></div>
    </div>
    <div class="card">
      ${sales.length ? sales.map(saleRow).join('') : `<div class="empty"><span class="ic">💳</span>Todavía no hay ventas.</div>`}
    </div>
  `;
}
window._budgetItems = [];
window.__openBudgetForm = async function(){
  await ensureMaterialsLoaded();
  if (!materialsCache.length) { toast('Cargá materiales en Stock primero', true); return; }
  const { data: biz } = await supabase.from('business_settings').select('*').eq('id',1).single();
  window._budgetItems = [{ materialId: materialsCache[0].id, qty:1 }];
  openModal(`
    <button class="close-x" onclick="window.__closeModal()">✕</button>
    <div class="modal-title">Nuevo presupuesto</div>
    <label>Título del trabajo</label><input id="f_job" placeholder="Ej: Cartel COCA COLA">
    <label>Cliente</label>
    <div style="display:flex;gap:8px">
      <select id="f_client" style="flex:1">
        <option value="">— seleccionar —</option>
        ${clientsCache.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
      </select>
      <button class="btn ghost sm" onclick="window.__openClientForm(null,'f_client')">+ nuevo</button>
    </div>
    <label>Materiales utilizados</label>
    <div id="matLines"></div>
    <button class="btn secondary sm" onclick="window.__addMatLine()">+ agregar material</button>
    <div class="divider"></div>
    <div class="grid-2">
      <div><label>Horas de trabajo</label><input id="f_hours" type="number" step="any" value="0" oninput="window.__updateBudgetPreview()"></div>
      <div><label>Valor hora ($)</label><input id="f_hourly" type="number" step="any" value="${biz?.hourly_rate||0}" oninput="window.__updateBudgetPreview()"></div>
    </div>
    <div class="grid-2">
      <div><label>Metros de neón</label><input id="f_meters" type="number" step="any" value="0" oninput="window.__updateBudgetPreview()"></div>
      <div><label>Precio por metro ($)</label><input id="f_meterprice" type="number" step="any" value="${biz?.neon_meter_price||0}" oninput="window.__updateBudgetPreview()"></div>
    </div>
    <label>Costos extra</label><input id="f_extra" type="number" step="any" value="0" oninput="window.__updateBudgetPreview()">
    <label>Porcentaje de ganancia (%)</label><input id="f_profit" type="number" step="any" value="${biz?.profit_percent||0}" oninput="window.__updateBudgetPreview()">
    <label>Observaciones</label><textarea id="f_obs"></textarea>
    <div class="card" id="totalBreakdown" style="margin-top:14px"></div>
    <button class="btn" style="margin-top:16px" onclick="window.__saveBudget()">Guardar presupuesto</button>
  `);
  renderMatLines();
};
window.__addMatLine = function(){ window._budgetItems.push({ materialId: materialsCache[0].id, qty:1 }); renderMatLines(); };
window.__removeMatLine = function(i){ window._budgetItems.splice(i,1); renderMatLines(); };
function renderMatLines(){
  const el = document.getElementById('matLines');
  if (!el) return;
  el.innerHTML = window._budgetItems.map((it,i)=>`
    <div class="btn-row" style="align-items:center;margin-bottom:8px">
      <select style="flex:2" onchange="window._budgetItems[${i}].materialId=this.value; window.__updateBudgetPreview()">
        ${materialsCache.map(m=>`<option value="${m.id}" ${m.id===it.materialId?'selected':''}>${escapeHtml(m.name)} (${m.qty} ${escapeHtml(m.unit)} disp.)</option>`).join('')}
      </select>
      <input style="flex:1" type="number" step="any" min="0" value="${it.qty}" oninput="window._budgetItems[${i}].qty=parseFloat(this.value)||0; window.__updateBudgetPreview()">
      <button class="tag-del" style="flex:none" onclick="window.__removeMatLine(${i})">✕</button>
    </div>
  `).join('');
  window.__updateBudgetPreview();
}
function computeBudget(){
  let materialsCost = 0;
  window._budgetItems.forEach(it=>{
    const m = materialsCache.find(x=>x.id===it.materialId);
    if (m) materialsCost += Number(m.cost)*Number(it.qty||0);
  });
  const hours = parseFloat(document.getElementById('f_hours')?.value)||0;
  const hourlyRate = parseFloat(document.getElementById('f_hourly')?.value)||0;
  const meters = parseFloat(document.getElementById('f_meters')?.value)||0;
  const meterPrice = parseFloat(document.getElementById('f_meterprice')?.value)||0;
  const extra = parseFloat(document.getElementById('f_extra')?.value)||0;
  const profitPercent = parseFloat(document.getElementById('f_profit')?.value)||0;
  const laborCost = hours*hourlyRate;
  const neonCost = meters*meterPrice;
  const subtotal = materialsCost + laborCost + neonCost + extra;
  const profitAmount = subtotal*(profitPercent/100);
  return { materialsCost, hours, hourlyRate, laborCost, meters, meterPrice, neonCost, extra, subtotal, profitPercent, profitAmount, total: subtotal+profitAmount };
}
window.__updateBudgetPreview = function(){
  const b = computeBudget();
  const box = document.getElementById('totalBreakdown');
  if (!box) return;
  box.innerHTML = `
    <div class="item-sub">Materiales: ${money(b.materialsCost)}</div>
    <div class="item-sub">Mano de obra (${b.hours}h × ${money(b.hourlyRate)}): ${money(b.laborCost)}</div>
    <div class="item-sub">Neón (${b.meters}m × ${money(b.meterPrice)}): ${money(b.neonCost)}</div>
    <div class="item-sub">Ganancia (${b.profitPercent}%): ${money(b.profitAmount)}</div>
    <div class="divider"></div>
    <div style="display:flex;justify-content:space-between;font-weight:700"><span>Total</span><span style="color:var(--green)">${money(b.total)}</span></div>
  `;
};
window.__saveBudget = async function(){
  const clientId = document.getElementById('f_client').value;
  if (!clientId) { toast('Elegí un cliente', true); return; }
  const items = window._budgetItems.filter(it=>it.materialId && it.qty>0);
  for (const it of items){
    const m = materialsCache.find(x=>x.id===it.materialId);
    if (!m || Number(m.qty) < Number(it.qty)) { toast(`Stock insuficiente de "${m?m.name:'material'}"`, true); return; }
  }
  const b = computeBudget();
  const { data: sale, error } = await supabase.from('sales').insert({
    client_id: clientId, job: document.getElementById('f_job').value.trim(), sale_date: new Date().toISOString().slice(0,10),
    hours: b.hours, hourly_rate: b.hourlyRate, labor_cost: b.laborCost, neon_meters: b.meters, neon_meter_price: b.meterPrice,
    neon_cost: b.neonCost, material_cost: b.materialsCost, extra: b.extra, subtotal: b.subtotal, profit_percent: b.profitPercent,
    profit_amount: b.profitAmount, total: b.total, status: 'pendiente', abono: 0, observations: document.getElementById('f_obs').value.trim()
  }).select('id').single();
  if (error) { toast('Error: ' + error.message, true); return; }
  for (const it of items){
    await supabase.from('sale_items').insert({ sale_id: sale.id, material_id: it.materialId, qty: it.qty });
    const m = materialsCache.find(x=>x.id===it.materialId);
    const newQty = Math.round((Number(m.qty)-Number(it.qty))*100)/100;
    await supabase.from('materials').update({ qty: newQty }).eq('id', it.materialId);
    m.qty = newQty;
  }
  closeModal(); toast('Presupuesto creado y stock descontado'); setTab('presupuestos');
};
window.__openSaleDetail = async function(id){
  const { data: s } = await supabase.from('sales').select('*, clients(name, phone)').eq('id', id).single();
  const { data: items } = await supabase.from('sale_items').select('*, materials(name, unit)').eq('sale_id', id);
  const saldo = Math.max(Number(s.total) - Number(s.abono||0), 0);
  openModal(`
    <button class="close-x" onclick="window.__closeModal()">✕</button>
    <div class="modal-title">${escapeHtml(s.job || (s.clients?s.clients.name:'Trabajo'))}</div>
    <div class="muted">${s.clients?escapeHtml(s.clients.name):''} · ${s.sale_date||''}</div>
    <div class="divider"></div>
    ${(items||[]).map(it=>`<div class="item-sub">${it.materials?escapeHtml(it.materials.name):'(borrado)'} — ${it.qty} ${it.materials?escapeHtml(it.materials.unit):''}</div>`).join('') || '<div class="muted">Sin materiales desglosados.</div>'}
    <div class="divider"></div>
    <div style="display:flex;justify-content:space-between;font-weight:700"><span>Total</span><span>${money(s.total)}</span></div>
    <label>Estado</label>
    <select id="f_status" onchange="window.__updateSaleField('${s.id}','status',this.value)">
      <option value="pendiente" ${s.status==='pendiente'?'selected':''}>Pendiente</option>
      <option value="pagado" ${s.status==='pagado'?'selected':''}>Pagado</option>
      <option value="rechazado" ${s.status==='rechazado'?'selected':''}>Rechazado</option>
    </select>
    <label>Monto abonado (seña)</label>
    <input type="number" step="any" value="${s.abono||0}" onchange="window.__updateSaleField('${s.id}','abono',parseFloat(this.value)||0)">
    <div class="muted" style="margin-top:6px">Saldo pendiente: <b style="color:var(--yellow)">${money(saldo)}</b></div>
    <div class="btn-row" style="margin-top:16px">
      <button class="btn" style="background:#25D366;flex:1" onclick="window.__shareSaleWhatsapp('${s.id}')">📲 WhatsApp</button>
      <button class="btn danger" style="flex:1" onclick="window.__deleteSale('${s.id}')">Eliminar</button>
    </div>
  `);
};
window.__updateSaleField = async function(id, field, value){
  const payload = {}; payload[field] = value;
  await supabase.from('sales').update(payload).eq('id', id);
  toast('Actualizado');
};
window.__shareSaleWhatsapp = async function(id){
  const { data: s } = await supabase.from('sales').select('*, clients(name, phone)').eq('id', id).single();
  let text = `*${(document.querySelector('.brand-logo img')?.alt)||'Puelo Neon'}*\n${s.job?('Trabajo: '+s.job+'\n'):''}Cliente: ${s.clients?s.clients.name:''}\n\n*Total: ${money(s.total)}*\nEstado: ${s.status}`;
  const phone = s.clients && s.clients.phone ? s.clients.phone.replace(/[^0-9]/g,'') : '';
  window.open(phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};
window.__deleteSale = async function(id){
  if (!confirm('¿Eliminar? (no repone el stock automáticamente)')) return;
  await supabase.from('sales').delete().eq('id', id);
  closeModal(); setTab(currentTab==='ventas'?'ventas':'presupuestos');
};

/* =====================================================================
   CARTELES PEDIDOS
===================================================================== */
const ORDER_STATUSES = ['pedido','fabricacion','listo','entregado'];
const ORDER_LABELS = { pedido:'Pedido', fabricacion:'En fabricación', listo:'Listo', entregado:'Entregado' };
let ordersCache = [];
let salesForLinkCache = [];
async function renderCartelesPedidos(){
  app.innerHTML = pageHeader('Carteles pedidos', 'cargando...');
  const { data } = await supabase.from('orders').select('*, clients(name)').order('order_date', { ascending:false });
  ordersCache = data || [];
  app.innerHTML = `
    ${pageHeader('Carteles pedidos', 'seguimiento de fabricación y entrega', '+ Cartel pedido', 'window.__openOrderForm()')}
    <div class="card">
      ${ordersCache.length ? ordersCache.map(o=>{
        const today = new Date().toISOString().slice(0,10);
        const atrasado = o.due_date && o.due_date < today && o.status !== 'entregado';
        return `
        <div class="item-row">
          <div class="item-main">
            <div class="item-title">${escapeHtml(o.description)}</div>
            <div class="item-sub">${o.clients?escapeHtml(o.clients.name):'sin cliente'} · pedido ${o.order_date||''}${o.due_date?(' · entrega '+o.due_date):''}${o.sale_id?' · 🔗 vinculado':''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            ${atrasado ? '<span class="pill bajo">atrasado</span>' : ''}
            <select onchange="window.__quickOrderStatus('${o.id}', this.value)">
              ${ORDER_STATUSES.map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${ORDER_LABELS[s]}</option>`).join('')}
            </select>
            <button class="tag-edit" onclick="window.__openOrderForm('${o.id}')">editar</button>
            <button class="tag-del" onclick="window.__deleteOrder('${o.id}')">borrar</button>
          </div>
        </div>`;
      }).join('') : `<div class="empty"><span class="ic">🪧</span>No hay carteles pedidos cargados.</div>`}
    </div>
  `;
}
window._orderItems = [];
window._orderPhotos = [];
window.__openOrderForm = async function(id){
  await ensureMaterialsLoaded();
  const o = id ? ordersCache.find(x=>x.id===id) : null;
  let items = [], photos = o ? [...(o.photo_urls||[])] : [];
  if (o) {
    const { data } = await supabase.from('order_items').select('*').eq('order_id', o.id);
    items = (data||[]).map(it=>({ materialId: it.material_id, qty: it.qty }));
  }
  window._orderItems = items;
  window._orderPhotos = photos;
  const { data: sales } = await supabase.from('sales').select('*, clients(name)').order('sale_date', { ascending:false });
  salesForLinkCache = sales || [];
  openModal(`
    <button class="close-x" onclick="window.__closeModal()">✕</button>
    <div class="modal-title">${o?'Editar cartel pedido':'Nuevo cartel pedido'}</div>
    <label>Descripción del cartel</label><input id="f_odesc" value="${o?escapeHtml(o.description):''}">
    <label>Cliente</label>
    <div style="display:flex;gap:8px">
      <select id="f_oclient" style="flex:1">
        <option value="">— seleccionar —</option>
        ${clientsCache.map(c=>`<option value="${c.id}" ${o&&o.client_id===c.id?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}
      </select>
      <button class="btn ghost sm" onclick="window.__openClientForm(null,'f_oclient')">+ nuevo</button>
    </div>
    <div class="grid-2">
      <div><label>Fecha de pedido</label><input id="f_oorderdate" type="date" value="${o?o.order_date||'':new Date().toISOString().slice(0,10)}"></div>
      <div><label>Entrega estimada</label><input id="f_oduedate" type="date" value="${o?o.due_date||'':''}"></div>
    </div>
    <label>Estado</label>
    <select id="f_ostatus">
      ${ORDER_STATUSES.map(s=>`<option value="${s}" ${o?(o.status===s?'selected':''):(s==='pedido'?'selected':'')}>${ORDER_LABELS[s]}</option>`).join('')}
    </select>
    ${o && o.materials_discounted ? '<div class="muted" style="margin-top:6px">✔ El stock de esta orden ya se descontó.</div>' : ''}
    <label>Presupuesto vinculado (opcional)</label>
    <select id="f_osale" onchange="window.__renderOrderMaterialsBlock()">
      <option value="">— sin vincular, cargar materiales abajo —</option>
      ${salesForLinkCache.map(s=>`<option value="${s.id}" ${o&&o.sale_id===s.id?'selected':''}>${escapeHtml(s.job||'Presupuesto')} — ${s.clients?escapeHtml(s.clients.name):''} (${money(s.total)})</option>`).join('')}
    </select>
    <div class="muted" style="margin:-2px 0 10px">Si vinculás un presupuesto, no se vuelve a descontar el stock (ya se descontó al crearlo).</div>
    <label>Materiales utilizados</label>
    <div id="orderMaterialsBlock"></div>
    <div class="divider"></div>
    <label>Fotos del cartel</label>
    <div id="orderPhotoThumbs" class="photo-thumbs"></div>
    <button class="btn ghost sm" onclick="document.getElementById('orderPhotoInput').click()">+ agregar fotos</button>
    <input type="file" id="orderPhotoInput" accept="image/*" multiple style="display:none">
    <label>Observaciones</label><textarea id="f_oobs">${o?escapeHtml(o.observations||''):''}</textarea>
    <button class="btn" style="margin-top:16px" onclick="window.__saveOrder('${id||''}')">Guardar cartel pedido</button>
    ${o ? `<button class="btn danger" style="margin-top:10px" onclick="window.__deleteOrder('${o.id}')">Eliminar</button>` : ''}
  `);
  window.__renderOrderMaterialsBlock();
  renderOrderPhotoThumbs();
  document.getElementById('orderPhotoInput').addEventListener('change', async e=>{
    const files = Array.from(e.target.files||[]);
    for (const file of files){
      toast('Subiendo foto...');
      const url = await uploadFile(file, 'gallery');
      if (url) window._orderPhotos.push(url);
    }
    renderOrderPhotoThumbs();
    e.target.value = '';
  });
};
window.__renderOrderMaterialsBlock = function(){
  const el = document.getElementById('orderMaterialsBlock');
  if (!el) return;
  const saleId = document.getElementById('f_osale')?.value;
  if (saleId) {
    const s = salesForLinkCache.find(x=>x.id===saleId);
    el.innerHTML = `<div class="muted">✔ Vinculado — los materiales de ese presupuesto ya descontaron el stock.</div>`;
  } else {
    el.innerHTML = `
      <div id="orderMatLines"></div>
      <button class="btn secondary sm" onclick="window.__addOrderMatLine()">+ agregar material</button>
    `;
    renderOrderMatLines();
  }
};
window.__addOrderMatLine = function(){ window._orderItems.push({ materialId: materialsCache[0]?.id, qty:1 }); renderOrderMatLines(); };
window.__removeOrderMatLine = function(i){ window._orderItems.splice(i,1); renderOrderMatLines(); };
function renderOrderMatLines(){
  const el = document.getElementById('orderMatLines');
  if (!el) return;
  el.innerHTML = window._orderItems.map((it,i)=>`
    <div class="btn-row" style="align-items:center;margin-bottom:8px">
      <select style="flex:2" onchange="window._orderItems[${i}].materialId=this.value">
        ${materialsCache.map(m=>`<option value="${m.id}" ${m.id===it.materialId?'selected':''}>${escapeHtml(m.name)} (${m.qty} ${escapeHtml(m.unit)} disp.)</option>`).join('')}
      </select>
      <input style="flex:1" type="number" step="any" min="0" value="${it.qty}" oninput="window._orderItems[${i}].qty=parseFloat(this.value)||0">
      <button class="tag-del" style="flex:none" onclick="window.__removeOrderMatLine(${i})">✕</button>
    </div>
  `).join('') || '<div class="muted">Sin materiales asociados.</div>';
}
function renderOrderPhotoThumbs(){
  const el = document.getElementById('orderPhotoThumbs');
  if (!el) return;
  el.innerHTML = window._orderPhotos.length
    ? window._orderPhotos.map((src,i)=>`<div class="photo-thumb"><img src="${src}"><button class="rm" onclick="window._orderPhotos.splice(${i},1);document.getElementById('orderPhotoThumbs').innerHTML='';window.__rerenderOrderThumbs()">✕</button></div>`).join('')
    : `<div class="muted" style="grid-column:1/-1">Sin fotos todavía.</div>`;
}
window.__rerenderOrderThumbs = renderOrderPhotoThumbs;
window.__saveOrder = async function(id){
  const saleId = document.getElementById('f_osale').value || null;
  const payload = {
    description: document.getElementById('f_odesc').value.trim(),
    client_id: document.getElementById('f_oclient').value || null,
    sale_id: saleId,
    order_date: document.getElementById('f_oorderdate').value || new Date().toISOString().slice(0,10),
    due_date: document.getElementById('f_oduedate').value || null,
    observations: document.getElementById('f_oobs').value.trim(),
    photo_urls: window._orderPhotos || []
  };
  if (!payload.description) { toast('Poné una descripción', true); return; }
  const status = document.getElementById('f_ostatus').value;
  const items = saleId ? [] : window._orderItems.filter(it=>it.materialId && it.qty>0);

  let orderId = id;
  let materialsDiscounted = false;
  if (id) {
    const existing = ordersCache.find(x=>x.id===id);
    materialsDiscounted = existing ? existing.materials_discounted : false;
    await supabase.from('orders').update(payload).eq('id', id);
    await supabase.from('order_items').delete().eq('order_id', id);
  } else {
    const { data, error } = await supabase.from('orders').insert({ ...payload, materials_discounted:false }).select('id').single();
    if (error) { toast('Error: ' + error.message, true); return; }
    orderId = data.id;
  }
  for (const it of items){
    await supabase.from('order_items').insert({ order_id: orderId, material_id: it.materialId, qty: it.qty });
  }

  // Descuento de stock solo la primera vez que pasa a "entregado", y solo si no está vinculado a un presupuesto
  if (status === 'entregado' && !materialsDiscounted) {
    if (!saleId) {
      for (const it of items){
        const m = materialsCache.find(x=>x.id===it.materialId);
        if (m) {
          const newQty = Math.round((Number(m.qty)-Number(it.qty))*100)/100;
          await supabase.from('materials').update({ qty:newQty }).eq('id', it.materialId);
          m.qty = newQty;
        }
      }
    }
    await supabase.from('orders').update({ status, materials_discounted:true }).eq('id', orderId);
  } else {
    await supabase.from('orders').update({ status }).eq('id', orderId);
  }

  closeModal(); toast('Cartel pedido guardado'); renderCartelesPedidos();
};
window.__quickOrderStatus = async function(id, newStatus){
  const o = ordersCache.find(x=>x.id===id);
  if (!o) return;
  if (newStatus === 'entregado' && !o.materials_discounted) {
    if (!o.sale_id) {
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', id);
      for (const it of (items||[])){
        const { data: m } = await supabase.from('materials').select('qty').eq('id', it.material_id).single();
        if (m) await supabase.from('materials').update({ qty: Math.round((Number(m.qty)-Number(it.qty))*100)/100 }).eq('id', it.material_id);
      }
    }
    await supabase.from('orders').update({ status:newStatus, materials_discounted:true }).eq('id', id);
    toast('Entregado — stock descontado');
  } else {
    await supabase.from('orders').update({ status:newStatus }).eq('id', id);
  }
  renderCartelesPedidos();
};
window.__deleteOrder = async function(id){
  if (!confirm('¿Borrar este cartel pedido?')) return;
  await supabase.from('orders').delete().eq('id', id);
  closeModal(); renderCartelesPedidos();
};

/* =====================================================================
   GANANCIAS
===================================================================== */
async function renderGanancias(){
  app.innerHTML = pageHeader('Ganancias', 'cargando...');
  const [{ data: sales }, { data: expenses }] = await Promise.all([
    supabase.from('sales').select('total,status,abono,sale_date'),
    supabase.from('expenses').select('amount,expense_date')
  ]);
  const months = {};
  (sales||[]).forEach(s=>{
    const mk = (s.sale_date||'').slice(0,7); if (!mk) return;
    months[mk] = months[mk] || { ingresos:0, gastos:0 };
    months[mk].ingresos += (s.status==='pagado' ? Number(s.total) : Number(s.abono||0));
  });
  (expenses||[]).forEach(e=>{
    const mk = (e.expense_date||'').slice(0,7); if (!mk) return;
    months[mk] = months[mk] || { ingresos:0, gastos:0 };
    months[mk].gastos += Number(e.amount||0);
  });
  const keys = Object.keys(months).sort().reverse();
  const names = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  app.innerHTML = `
    ${pageHeader('Ganancias', 'ganancias mensuales')}
    <div class="card">
      ${keys.length ? keys.map(mk=>{
        const [y,m] = mk.split('-');
        const label = `${names[parseInt(m,10)-1]} ${y}`;
        const d = months[mk]; const g = d.ingresos - d.gastos;
        return `
        <div class="item-row">
          <div class="item-main">
            <div class="item-title">${label}</div>
            <div class="item-sub">ingresos ${money(d.ingresos)} · gastos ${money(d.gastos)}</div>
          </div>
          <div class="item-title" style="color:${g<0?'var(--red)':'var(--green)'}">${money(g)}</div>
        </div>`;
      }).join('') : `<div class="empty"><span class="ic">📈</span>Todavía no hay datos suficientes.</div>`}
    </div>
  `;
}

init();
