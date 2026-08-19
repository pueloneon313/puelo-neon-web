function escapeHtml(str){
  return String(str||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function normalizeSocialUrl(value, domain){
  if (!value) return '';
  value = value.trim();
  if (/^https?:\/\//i.test(value)) return value;
  value = value.replace(/^@/, '');
  return `https://${domain}/${value}`;
}
const SVGS = {
  whatsapp: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#25D366"/><path fill="#fff" d="M21.5 18.3c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-.9 1.1-.3.2-.6.1a6.9 6.9 0 0 1-2-1.3 7.7 7.7 0 0 1-1.4-1.8c-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.3-.4a.5.5 0 0 0 0-.5c-.1-.1-.7-1.6-.9-2.2s-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.5 3.5 0 0 0-1 2.5 6 6 0 0 0 1.3 3.2 13.6 13.6 0 0 0 5 4.5c.7.3 1.2.5 1.7.6a3.9 3.9 0 0 0 1.8.1 3 3 0 0 0 2-1.4 2.4 2.4 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3z"/><path fill="#fff" d="M16 6a10 10 0 0 0-8.6 15.1L6 26l5.1-1.3A10 10 0 1 0 16 6zm0 18.2a8.1 8.1 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 24.2 16 8.2 8.2 0 0 1 16 24.2z"/></svg>`,
  phone: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#2a2a2a"/><path fill="#39FF14" d="M12.7 9.3c-.4-.9-1.2-.8-2-.8-1.4 0-3.5 1.6-3.5 4.6a12.9 12.9 0 0 0 3 7.5 13.4 13.4 0 0 0 7.6 4.7c2.9.6 4.6-1.4 4.7-2.8.1-.8 0-1.6-.9-1.9l-2.9-1.3c-.7-.3-1.2 0-1.6.6l-.7 1a10.1 10.1 0 0 1-3.4-2.7 10.2 10.2 0 0 1-2-3.6l.9-.6c.6-.4.9-.9.6-1.6z"/></svg>`,
  instagram: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#FEE411"/><stop offset="30%" stop-color="#FD5949"/><stop offset="65%" stop-color="#D6249F"/><stop offset="100%" stop-color="#285AEB"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#igGrad)"/><rect x="8" y="8" width="16" height="16" rx="5" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="16" cy="16" r="4.2" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="21.5" cy="10.5" r="1.1" fill="#fff"/></svg>`,
  facebook: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#1877F2"/><path fill="#fff" d="M20.1 16.6h-2.9V25h-3.4v-8.4h-2v-3h2v-2.1c0-2.5 1-3.9 3.9-3.9h2.5v3h-1.6c-1.1 0-1.2.4-1.2 1.2v1.8h2.9z"/></svg>`,
  email: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#39FF14"/><rect x="7" y="10" width="18" height="13" rx="2.5" fill="none" stroke="#06140a" stroke-width="1.8"/><path d="M8 11.5l8 6 8-6" fill="none" stroke="#06140a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};

export function buildContactIcons(business){
  const icons = [];
  const phoneDigits = (business.phone||'').replace(/[^0-9]/g,'');
  if (phoneDigits) icons.push({ type:'whatsapp', emoji:'💬', url:`https://wa.me/${phoneDigits}`, label:'WhatsApp' });
  if (phoneDigits) icons.push({ type:'phone', emoji:'📞', url:`tel:+${phoneDigits}`, label:'Llamar' });
  if (business.instagram) icons.push({ type:'instagram', emoji:'📷', url:normalizeSocialUrl(business.instagram,'instagram.com'), label:'Instagram' });
  if (business.facebook) icons.push({ type:'facebook', emoji:'👍', url:normalizeSocialUrl(business.facebook,'facebook.com'), label:'Facebook' });
  if (business.email) icons.push({ type:'email', emoji:'✉️', url:`mailto:${business.email.trim()}`, label:'Email' });
  return icons;
}
export function contactIconsHtml(icons, style){
  if (!icons.length) return '';
  const useLogo = style !== 'emoji';
  return `<div class="contact-icons">${icons.map(ic=>
    useLogo
      ? `<a class="ci-logo" href="${ic.url}" target="_blank" title="${ic.label}">${SVGS[ic.type]||''}</a>`
      : `<a class="ci-emoji" href="${ic.url}" target="_blank" title="${ic.label}">${ic.emoji}</a>`
  ).join('')}</div>`;
}
