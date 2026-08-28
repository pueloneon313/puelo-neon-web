import { supabase } from './supabaseClient.js';
import { buildContactIcons, contactIconsHtml } from './contactIcons.js';

const app = document.getElementById('app');
const modalRoot = document.getElementById('modalRoot');
let business = {};
let products = [];
let cart = {}; // id -> qty

function escapeHtml(str){
  return String(str||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function money(n){ return '$' + Number(n||0).toLocaleString('es-AR', { maximumFractionDigits:0 }); }
function openModal(html){
  history.pushState({ modal:true }, '');
  modalRoot.innerHTML = `<div class="overlay" onclick="if(event.target===this) window.__closeModal()"><div class="modal">${html}</div></div>`;
}
function closeModal(){ modalRoot.innerHTML = ''; }
window.__closeModal = closeModal;
document.addEventListener('keydown', e=>{ if (e.key==='Escape') closeModal(); });

async function init(){
  const [{ data: biz }, { data: prods }] = await Promise.all([
    supabase.from('business_settings').select('*').eq('id',1).single(),
    supabase.from('store_products').select('*').order('name')
  ]);
  business = biz || {};
  if (business.store_maintenance) { renderMaintenance(); return; }
  products = prods || [];
  render();
  window.addEventListener('popstate', ()=>{
    if (modalRoot.innerHTML) closeModal();
  });
}
function renderMaintenance(){
  const logoBlock = business.logo_url ? `<img src="${business.logo_url}" alt="${escapeHtml(business.name||'Puelo Neon')}">` : '';
  const icons = buildContactIcons(business);
  app.innerHTML = `
    <div class="public-header">
      ${logoBlock}
      <h1>Tienda</h1>
      ${contactIconsHtml(icons, business.icon_style)}
    </div>
    <div class="empty" style="max-width:480px;margin:40px auto">
      <span class="ic">🛠️</span>
      <div style="font-family:var(--font-display);font-size:18px;color:var(--text);margin-bottom:8px">En mantenimiento</div>
      Estamos actualizando la tienda. Volvé a visitarnos pronto, o escribinos por cualquiera de los medios de arriba.
    </div>
  `;
}
function render(){
  const logoBlock = business.logo_url ? `<img src="${business.logo_url}" alt="${escapeHtml(business.name||'Puelo Neon')}">` : '';
  const icons = buildContactIcons(business);
  app.innerHTML = `
    <div class="public-header">
      ${logoBlock}
      <h1>Tienda</h1>
      ${contactIconsHtml(icons, business.icon_style)}
    </div>
    ${products.length ? `
    <div class="product-grid">
      ${products.map(p=>{
        const photo = p.product_photo_url ? `<img class="photo" src="${p.product_photo_url}">` : `<div class="photo placeholder">🛒</div>`;
        return `
        <div class="product-card">
          ${photo}
          <div class="pinfo">
            <div class="pname">${escapeHtml(p.name)}</div>
            ${p.product_description ? `<div class="pdesc">${escapeHtml(p.product_description)}</div>` : ''}
            <div class="pprice">${money(p.sale_price)}</div>
            <div class="pqty">
              <button class="qty-btn" onclick="window.__changeQty('${p.id}',-1)">−</button>
              <span id="qty-${p.id}">${cart[p.id]||0}</span>
              <button class="qty-btn" onclick="window.__changeQty('${p.id}',1)">+</button>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>` : `<div class="empty"><span class="ic">🛒</span>Todavía no hay productos cargados.</div>`}
  `;
}
window.__changeQty = function(id, delta){
  const cur = cart[id] || 0;
  const next = Math.max(0, cur + delta);
  if (next === 0) delete cart[id]; else cart[id] = next;
  const span = document.getElementById('qty-'+id);
  if (span) span.textContent = next;
  updateFab();
};
function cartCount(){ return Object.values(cart).reduce((a,q)=>a+q,0); }
function cartTotal(){
  let t = 0;
  Object.keys(cart).forEach(id=>{
    const p = products.find(x=>x.id===id);
    if (p) t += Number(p.sale_price)*cart[id];
  });
  return t;
}
function updateFab(){
  const fab = document.getElementById('cartFab');
  const count = cartCount();
  if (count > 0){
    fab.classList.add('show');
    document.getElementById('cartLabel').textContent = count + ' · ' + money(cartTotal());
  } else {
    fab.classList.remove('show');
  }
}
window.__openCart = function(){
  const ids = Object.keys(cart);
  const rows = ids.map(id=>{
    const p = products.find(x=>x.id===id);
    if (!p) return '';
    return `
      <div class="item-row">
        <div class="item-main">
          <div class="item-title">${escapeHtml(p.name)}</div>
          <div class="item-sub">${money(p.sale_price)} c/u</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <button class="qty-btn" onclick="window.__changeQty('${id}',-1);window.__openCart();">−</button>
          <span>${cart[id]}</span>
          <button class="qty-btn" onclick="window.__changeQty('${id}',1);window.__openCart();">+</button>
        </div>
      </div>`;
  }).join('');
  openModal(`
    <button class="close-x" onclick="window.__closeModal()">✕</button>
    <div class="modal-title">Tu pedido</div>
    ${rows || '<div class="muted">El carrito está vacío.</div>'}
    ${ids.length ? `
    <div class="divider"></div>
    <div style="display:flex;justify-content:space-between;font-weight:700"><span>Total</span><span>${money(cartTotal())}</span></div>
    <button class="btn" style="margin-top:16px;background:#25D366" onclick="window.__sendOrder()">📲 Enviar pedido por WhatsApp</button>
    ` : ''}
  `);
};
window.__sendOrder = function(){
  const ids = Object.keys(cart);
  if (!ids.length) return;
  const phone = (business.phone||'').replace(/[^0-9]/g,'');
  let text = `*Pedido — ${business.name||'Puelo Neon'}*\n\n`;
  ids.forEach(id=>{
    const p = products.find(x=>x.id===id);
    if (!p) return;
    text += `• ${p.name} x${cart[id]} — ${money(Number(p.sale_price)*cart[id])}\n`;
  });
  text += `\n*Total: ${money(cartTotal())}*`;
  const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

init();
