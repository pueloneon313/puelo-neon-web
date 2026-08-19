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

init();
