import { supabase } from '../js/supabaseClient.js';
import { requireAuth } from '../js/auth.js';

const logEl = document.getElementById('log');
const fileInput = document.getElementById('fileInput');
const startBtn = document.getElementById('startBtn');
let backupData = null;

function log(msg){
  logEl.textContent += msg + '\n';
  logEl.scrollTop = logEl.scrollHeight;
}

fileInput.addEventListener('change', async e=>{
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    backupData = JSON.parse(text);
    startBtn.disabled = false;
    startBtn.textContent = 'Importar este backup';
    log(`Archivo leído: ${file.name}`);
    log(`— ${(backupData.materials||[]).length} materiales`);
    log(`— ${(backupData.clients||[]).length} clientes`);
    log(`— ${(backupData.suppliers||[]).length} proveedores`);
    log(`— ${(backupData.sales||[]).length} presupuestos/ventas`);
    log(`— ${(backupData.expenses||[]).length} gastos`);
    log(`— ${(backupData.orders||[]).length} carteles pedidos`);
    log(`— ${(backupData.gallery||[]).length} fotos de galería`);
    log(`— ${(backupData.reviews||[]).length} reseñas`);
    log('\nRevisá que los números tengan sentido y tocá "Importar este backup".');
  } catch(err){
    log('ERROR: el archivo no es un backup .json válido — ' + err.message);
    startBtn.disabled = true;
  }
});

/* ---------- helpers ---------- */
function dataUrlToBlob(dataUrl){
  const [meta, b64] = dataUrl.split(',');
  const mimeMatch = meta.match(/data:(.*);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
async function uploadBase64(dataUrl, folder){
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl || null; // ya es una URL normal, o vacío
  const blob = dataUrlToBlob(dataUrl);
  const ext = (blob.type.split('/')[1] || 'jpg').split('+')[0];
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, blob, { upsert:false, contentType: blob.type });
  if (error) { log(`  ⚠️ no se pudo subir una imagen (${folder}): ${error.message}`); return null; }
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}
async function uploadPhotoArray(photos, folder){
  const urls = [];
  for (const p of (photos||[])){
    const url = await uploadBase64(p, folder);
    if (url) urls.push(url);
  }
  return urls;
}
async function uploadVideoArray(videos, folder){
  const out = [];
  for (const v of (videos||[])){
    if (v.type === 'link') { out.push(v); continue; }
    const url = await uploadBase64(v.src, folder);
    if (url) out.push({ type:'file', src:url });
  }
  return out;
}

startBtn.addEventListener('click', async ()=>{
  if (!backupData) return;
  startBtn.disabled = true;
  startBtn.textContent = 'Importando...';
  log('\n=== Empezando la importación ===\n');

  const clientMap = {};    // id viejo -> id nuevo
  const supplierMap = {};
  const materialMap = {};
  const saleMap = {};
  const galleryMap = {};   // id viejo de gallery_item -> id nuevo
  const orderMap = {};     // id viejo de order -> id nuevo

  try {
    /* --- 1) datos del negocio --- */
    if (backupData.business) {
      const b = backupData.business;
      log('Actualizando datos del negocio...');
      await supabase.from('business_settings').update({
        name: b.name || 'Puelo Neon',
        phone: b.phone || '',
        instagram: b.instagram || '',
        facebook: b.facebook || '',
        email: b.email || '',
        icon_style: b.iconStyle || 'logo',
        hourly_rate: b.hourlyRate || 0,
        neon_meter_price: b.neonMeterPrice || 0,
        profit_percent: b.profitPercent || 0
      }).eq('id', 1);
      log('  ✔ listo (el logo no venía en el backup — subilo de nuevo en Ajustes si hace falta)');
    }

    /* --- 2) clientes --- */
    for (const c of (backupData.clients||[])){
      const { data, error } = await supabase.from('clients').insert({
        name: c.name, phone: c.phone||'', address: c.address||''
      }).select('id').single();
      if (error) { log(`  ⚠️ cliente "${c.name}": ${error.message}`); continue; }
      clientMap[c.id] = data.id;
    }
    log(`✔ Clientes importados: ${Object.keys(clientMap).length}/${(backupData.clients||[]).length}`);

    /* --- 3) proveedores --- */
    for (const s of (backupData.suppliers||[])){
      const { data, error } = await supabase.from('suppliers').insert({
        name: s.name, phone: s.phone||'', products: s.products||'', notes: s.notes||''
      }).select('id').single();
      if (error) { log(`  ⚠️ proveedor "${s.name}": ${error.message}`); continue; }
      supplierMap[s.id] = data.id;
    }
    log(`✔ Proveedores importados: ${Object.keys(supplierMap).length}/${(backupData.suppliers||[]).length}`);

    /* --- 4) materiales (con foto de producto si tiene) --- */
    let mCount = 0;
    for (const m of (backupData.materials||[])){
      let photoUrl = '';
      if (m.productPhoto) { photoUrl = await uploadBase64(m.productPhoto, 'products') || ''; }
      const { data, error } = await supabase.from('materials').insert({
        name: m.name, qty: m.qty||0, unit: m.unit||'unid', cost: m.cost||0, min_qty: m.minQty||0,
        for_sale: !!m.forSale, sale_price: m.salePrice||0,
        product_description: m.productDescription||'', product_photo_url: photoUrl
      }).select('id').single();
      if (error) { log(`  ⚠️ material "${m.name}": ${error.message}`); continue; }
      materialMap[m.id] = data.id;
      mCount++;
      if (mCount % 5 === 0) log(`  ...${mCount} materiales subidos`);
    }
    log(`✔ Materiales importados: ${mCount}/${(backupData.materials||[]).length}`);

    /* --- 5) categorías de galería --- */
    const { data: existingCats } = await supabase.from('gallery_categories').select('name');
    const existingNames = new Set((existingCats||[]).map(c=>c.name));
    let nextOrder = existingNames.size + 1;
    for (const catName of (backupData.galleryCategories||[])){
      if (existingNames.has(catName)) continue;
      await supabase.from('gallery_categories').insert({ name: catName, sort_order: nextOrder++ });
      existingNames.add(catName);
    }
    log('✔ Categorías de galería revisadas');

    /* --- 6) galería (fotos y videos) --- */
    let gCount = 0;
    for (const g of (backupData.gallery||[])){
      log(`  Subiendo fotos de "${g.description || 'trabajo sin nombre'}"...`);
      const photoUrls = await uploadPhotoArray(g.photos, 'gallery');
      const videoUrls = await uploadVideoArray(g.videos, 'gallery');
      const { data, error } = await supabase.from('gallery_items').insert({
        description: g.description||'', item_date: g.date||null, category: g.category||'Otros',
        photo_urls: photoUrls, video_urls: videoUrls
      }).select('id').single();
      if (error) { log(`  ⚠️ foto de galería: ${error.message}`); continue; }
      galleryMap[g.id] = data.id;
      gCount++;
    }
    log(`✔ Fotos de galería importadas: ${gCount}/${(backupData.gallery||[]).length}`);

    /* --- 7) presupuestos/ventas + sus materiales --- */
    let sCount = 0;
    for (const s of (backupData.sales||[])){
      const { data, error } = await supabase.from('sales').insert({
        client_id: clientMap[s.clientId] || null, job: s.job||'', sale_date: s.date||null,
        hours: s.hours||0, hourly_rate: s.hourlyRate||0, labor_cost: s.laborCost||0,
        neon_meters: s.neonMeters||0, neon_meter_price: s.neonMeterPrice||0, neon_cost: s.neonCost||0,
        material_cost: s.materialCost||0, extra: s.extra||0, subtotal: s.subtotal||0,
        profit_percent: s.profitPercent||0, profit_amount: s.profitAmount||0, total: s.total||0,
        status: s.status||'pendiente', abono: s.abono||0, observations: s.observations||''
      }).select('id').single();
      if (error) { log(`  ⚠️ presupuesto "${s.job}": ${error.message}`); continue; }
      saleMap[s.id] = data.id;
      sCount++;
      for (const it of (s.items||[])){
        if (!materialMap[it.materialId]) continue;
        await supabase.from('sale_items').insert({
          sale_id: data.id, material_id: materialMap[it.materialId], qty: it.qty||0
        });
      }
    }
    log(`✔ Presupuestos/ventas importados: ${sCount}/${(backupData.sales||[]).length}`);

    /* --- 8) gastos --- */
    let eCount = 0;
    for (const e of (backupData.expenses||[])){
      const { error } = await supabase.from('expenses').insert({
        concept: e.concept, amount: e.amount||0, supplier_id: supplierMap[e.supplierId] || null,
        expense_date: e.date||null
      });
      if (error) { log(`  ⚠️ gasto "${e.concept}": ${error.message}`); continue; }
      eCount++;
    }
    log(`✔ Gastos importados: ${eCount}/${(backupData.expenses||[]).length}`);

    /* --- 9) carteles pedidos + sus materiales --- */
    let oCount = 0;
    for (const o of (backupData.orders||[])){
      log(`  Subiendo fotos de cartel "${o.description}"...`);
      const photoUrls = await uploadPhotoArray(o.photos, 'gallery');
      const { data, error } = await supabase.from('orders').insert({
        description: o.description||'', client_id: clientMap[o.clientId] || null,
        sale_id: saleMap[o.saleId] || null, order_date: o.orderDate||null, due_date: o.dueDate||null,
        status: o.status||'pedido', materials_discounted: !!o.materialsDiscounted,
        observations: o.observations||'', category: o.category||'Otros', photo_urls: photoUrls
      }).select('id').single();
      if (error) { log(`  ⚠️ cartel "${o.description}": ${error.message}`); continue; }
      orderMap[o.id] = data.id;
      oCount++;
      for (const it of (o.items||[])){
        if (!materialMap[it.materialId]) continue;
        await supabase.from('order_items').insert({
          order_id: data.id, material_id: materialMap[it.materialId], qty: it.qty||0
        });
      }
    }
    log(`✔ Carteles pedidos importados: ${oCount}/${(backupData.orders||[]).length}`);

    /* --- 10) reseñas --- */
    let rCount = 0;
    for (const r of (backupData.reviews||[])){
      const { error } = await supabase.from('reviews').insert({
        name: r.name||'Cliente', comment: r.comment||'', rating: r.rating||0, review_date: r.date||null
      });
      if (!error) rCount++;
    }
    log(`✔ Reseñas importadas: ${rCount}/${(backupData.reviews||[]).length}`);

    /* --- 11) orden manual de la galería --- */
    if (backupData.galleryOrder && backupData.galleryOrder.length){
      const remapped = backupData.galleryOrder.map(key=>{
        const [kind, oldId] = key.split(':');
        const newId = kind === 'order' ? orderMap[oldId] : galleryMap[oldId];
        return newId ? `${kind}:${newId}` : null;
      }).filter(Boolean);
      await supabase.from('business_settings').update({ gallery_order: remapped }).eq('id', 1);
      log('✔ Orden manual de la galería aplicado');
    }

    log('\n=== ¡Listo! Importación terminada. ===');
    log('Revisá Stock, Galería y las demás secciones para confirmar que esté todo.');
  } catch (err) {
    log('\n❌ Error inesperado: ' + err.message);
    log('Contame en qué paso se cortó y seguimos desde ahí — lo que ya se importó queda guardado.');
  }
  startBtn.textContent = 'Importación terminada';
});

requireAuth();
