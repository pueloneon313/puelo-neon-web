import { supabase } from './supabaseClient.js';
import { buildContactIcons, contactIconsHtml } from './contactIcons.js';

const app = document.getElementById('app');
const modalRoot = document.getElementById('modalRoot');
let business = {};
let groups = [];
let activeCategory = null;
let reviewRating = 0;

function escapeHtml(str){
  return String(str||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function openModal(html){
  modalRoot.innerHTML = `<div class="overlay" onclick="if(event.target===this) window.__closeModal()"><div class="modal">${html}</div></div>`;
}
function closeModal(){ modalRoot.innerHTML = ''; }
window.__closeModal = closeModal;
document.addEventListener('keydown', e=>{ if (e.key==='Escape') closeModal(); });

function mediaBlockHtml(item){
  let html = (item.photo_urls||[]).map(src=>`<img class="lightbox-img" src="${src}">`).join('');
  (item.video_urls||[]).forEach(v=>{
    html += v.type==='link'
      ? `<a class="btn secondary" style="margin-bottom:12px" href="${escapeHtml(v.src)}" target="_blank">▶ Ver video</a>`
      : `<video class="lightbox-img" controls src="${v.src}"></video>`;
  });
  return html;
}

async function init(){
  const [{ data: biz }, { data: items }, { data: revs }] = await Promise.all([
    supabase.from('business_settings').select('*').eq('id',1).single(),
    supabase.from('public_gallery').select('*').order('item_date', { ascending:false }),
    supabase.from('reviews').select('*').order('created_at', { ascending:false })
  ]);
  business = biz || {};
  window.__reviews = revs || [];
  groupByCategory(items || []);
  render();
}
function groupByCategory(items){
  const byCat = {};
  items.forEach(it=>{
    const cat = it.category || 'Otros';
    (byCat[cat] = byCat[cat]||[]).push(it);
  });
  groups = Object.keys(byCat).map(cat=>({ category: cat, items: byCat[cat] }));
}
function render(){
  const logoBlock = business.logo_url ? `<img src="${business.logo_url}" alt="${escapeHtml(business.name||'Puelo Neon')}">` : '';
  const icons = buildContactIcons(business);
  const reviews = window.__reviews || [];

  let bodyHtml;
  if (activeCategory){
    const g = groups.find(x=>x.category===activeCategory);
    const items = g ? g.items : [];
    bodyHtml = `
      <button class="btn ghost sm" style="margin:0 auto 20px;display:block" onclick="window.__goBack()">← Volver a categorías</button>
      <h2 class="category-detail-title">${escapeHtml(activeCategory)}</h2>
      <div class="gallery-grid">
        ${items.map(it=>`
          <div class="gallery-card" onclick="window.__openLightbox('${it.kind}','${it.id}')">
            <img class="thumb" src="${it.photo_urls[0]}">
            ${it.photo_urls.length>1 ? `<span class="badge">+${it.photo_urls.length-1}</span>` : ''}
            <div class="info"><div class="item-title">${escapeHtml(it.description||'Trabajo realizado')}</div></div>
          </div>
        `).join('')}
      </div>`;
  } else {
    bodyHtml = groups.length ? `
      <div class="category-grid">
        ${groups.map((g,i)=>`
          <div class="category-tile" onclick="window.__openCategory(${i})">
            <div class="category-tile-imgs">
              <img src="${g.items[0].photo_urls[0]}">
              ${g.items[1] ? `<img src="${g.items[1].photo_urls[0]}">` : ''}
            </div>
            <div class="category-tile-info">
              <div class="category-tile-title">${escapeHtml(g.category)}</div>
              <div class="category-tile-count">${g.items.length} trabajo${g.items.length!==1?'s':''}</div>
            </div>
          </div>
        `).join('')}
      </div>
    ` : `<div class="empty"><span class="ic">📸</span>Todavía no hay fotos cargadas.</div>`;
  }

  const reviewsHtml = activeCategory ? '' : `
    ${reviews.length ? `
    <div style="max-width:640px;margin:50px auto 0">
      <h2 style="font-family:var(--font-display);font-size:18px;text-align:center;margin-bottom:18px">⭐ Lo que dicen nuestros clientes</h2>
      ${reviews.map(r=>`
        <div class="card" style="margin-bottom:10px">
          <b>${escapeHtml(r.name||'Cliente')}</b> ${r.rating?'★'.repeat(r.rating):''}
          ${r.comment ? `<div class="muted" style="margin-top:4px">${escapeHtml(r.comment)}</div>` : ''}
        </div>
      `).join('')}
    </div>` : ''}
    <div style="max-width:640px;margin:30px auto 0" class="card">
      <h2 style="margin-bottom:6px">✉️ Envianos tu consulta o idea</h2>
      <div class="muted" style="text-align:center;margin-bottom:16px">Contanos qué necesitás, tu idea para un cartel, o dejanos tu comentario.</div>
      <input id="rv_name" placeholder="Tu nombre">
      <textarea id="rv_comment" placeholder="Escribí acá tu mensaje..."></textarea>
      <label style="margin:8px 0 2px">Calificación (opcional)</label>
      <div id="rv_stars" style="font-size:26px;letter-spacing:6px;color:var(--yellow);cursor:pointer">
        ${[1,2,3,4,5].map(i=>`<span onclick="window.__setRating(${i})" data-i="${i}">☆</span>`).join('')}
      </div>
      <button class="btn" style="margin-top:10px" onclick="window.__submitReview()">Enviar mensaje</button>
    </div>
  `;

  app.innerHTML = `
    <div class="public-header">
      ${logoBlock}
      <h1>Nuestros trabajos</h1>
      ${contactIconsHtml(icons, business.icon_style)}
    </div>
    ${bodyHtml}
    ${reviewsHtml}
  `;
}
window.__openCategory = function(i){
  activeCategory = groups[i] ? groups[i].category : null;
  render();
  window.scrollTo({ top:0, behavior:'smooth' });
};
window.__goBack = function(){ activeCategory = null; render(); window.scrollTo({top:0, behavior:'smooth'}); };
window.__openLightbox = function(kind, id){
  const g = groups.find(gr=>gr.items.some(it=>it.id===id && it.kind===kind));
  const it = g && g.items.find(x=>x.id===id && x.kind===kind);
  if (!it) return;
  openModal(`
    <button class="close-x" onclick="window.__closeModal()">✕</button>
    <div class="modal-title">${escapeHtml(it.description||'Trabajo realizado')}</div>
    ${mediaBlockHtml(it)}
  `);
};
window.__setRating = function(i){
  reviewRating = i;
  document.querySelectorAll('#rv_stars span').forEach(sp=>{
    sp.textContent = Number(sp.dataset.i) <= i ? '★' : '☆';
  });
};
window.__submitReview = async function(){
  const name = document.getElementById('rv_name').value.trim();
  const comment = document.getElementById('rv_comment').value.trim();
  if (!comment) { alert('Escribí tu mensaje'); return; }
  const { error } = await supabase.from('reviews').insert({
    name: name || 'Cliente', comment, rating: reviewRating
  });
  if (error) { alert('No se pudo enviar: ' + error.message); return; }
  const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending:false });
  window.__reviews = data || [];
  reviewRating = 0;
  render();
  alert('¡Gracias! Ya recibimos tu mensaje.');
};

init();
