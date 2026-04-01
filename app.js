// ================================================================
// WANDERLOST — Engine v60 (from scratch)
// ================================================================

// — State —
const S = {
  credits: 3, subscribed: false, place: null,
  history: [], saved: [], markers: [],
  tab: 'tab-explore', cat: '', plan: 'monthly',
  unit: 'meters',
  theme: localStorage.getItem('wl-theme') || 'dark'
};

// — Helpers —
const $ = id => document.getElementById(id);
const haptic = (ms = 10) => { if (navigator.vibrate) navigator.vibrate(ms); };

// ================================================================
// TOAST
// ================================================================
function toast(msg) {
  const old = $('toast'); if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'toast';
  Object.assign(el.style, {
    position:'fixed',top:'80px',left:'50%',transform:'translateX(-50%) translateY(-10px)',
    zIndex:'999',padding:'12px 24px',fontSize:'13px',textAlign:'center',
    maxWidth:'320px',borderRadius:'9999px',opacity:'0',
    background:'var(--bg-glass-solid)',backdropFilter:'blur(40px)',
    border:'.5px solid var(--border)',color:'var(--text-1)',
    boxShadow:'var(--shadow)',transition:'all .5s var(--smooth)',
    fontFamily:'Inter,sans-serif',letterSpacing:'.03em'
  });
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)'; });
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(-10px)'; setTimeout(() => el.remove(), 500); }, 4000);
}
window.toast = toast; // expose for inline onclick

// ================================================================
// TABS
// ================================================================
function switchTab(id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const t = $(id); if (t) t.classList.add('active');
  document.querySelectorAll('.dock-btn').forEach(b => {
    const icon = b.querySelector('.material-symbols-outlined');
    if (b.dataset.tab === id) { b.classList.add('active'); icon.style.fontVariationSettings = "'FILL' 1"; }
    else { b.classList.remove('active'); icon.style.fontVariationSettings = "'FILL' 0"; }
  });
  S.tab = id;
}
window.switchTab = switchTab;

// ================================================================
// MODALS
// ================================================================
function openModal(id) { const el = $(id); if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; } }
function closeModal(id) { const el = $(id); if (el) { el.classList.remove('open'); if (!document.querySelector('.modal.open')) document.body.style.overflow = ''; } }
window.openModal = openModal;
window.closeModal = closeModal;

// ================================================================
// DISCOVERY SHEET
// ================================================================
function openSheet() { $('discovery-sheet').classList.add('open'); $('btn-discover')?.classList.add('morphing'); haptic(15); }
function closeSheet() { $('discovery-sheet').classList.remove('open'); $('btn-discover')?.classList.remove('morphing'); }
window.closeSheet = closeSheet;

// ================================================================
// CATEGORIES
// ================================================================
function pickCat(btn) {
  haptic(10);
  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  S.cat = btn.dataset.cat || '';
}
window.pickCat = pickCat;

// ================================================================
// FAQ
// ================================================================
function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const answer = item.querySelector('.faq-a');
  const icon = btn.querySelector('.material-symbols-outlined');
  // Close others
  document.querySelectorAll('.faq-item').forEach(other => {
    if (other !== item) { other.querySelector('.faq-a').classList.add('hidden'); const i = other.querySelector('button .material-symbols-outlined'); if (i) { i.style.transform = ''; i.textContent = 'chevron_right'; } }
  });
  const open = !answer.classList.contains('hidden');
  answer.classList.toggle('hidden');
  icon.style.transform = open ? '' : 'rotate(90deg)';
  icon.textContent = open ? 'chevron_right' : 'expand_more';
}
window.toggleFaq = toggleFaq;

// ================================================================
// DISTANCE
// ================================================================
function fmtDist(km) {
  if (S.unit === 'feet') { const ft = km * 3280.84; return ft < 5280 ? Math.round(ft) + ' ft away' : (ft / 5280).toFixed(1) + ' mi away'; }
  return km < 1 ? Math.round(km * 1000) + ' m away' : km.toFixed(1) + ' km away';
}
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ================================================================
// GOOGLE MAPS
// ================================================================
let map, placesService;
const CAT_COLORS = { restaurant:'#FFB5A7', cafe:'#D4C5F9', bakery:'#FFD6A5', bar:'#E8A0BF', park:'#B8E0D2', museum:'#A7D8FF' };
const MAP_DARK = [
  {elementType:'geometry',stylers:[{color:'#1a1d23'}]},{elementType:'labels.icon',stylers:[{visibility:'off'}]},
  {elementType:'labels.text.fill',stylers:[{color:'#8B949E'}]},{elementType:'labels.text.stroke',stylers:[{color:'#0d1117'}]},
  {featureType:'poi',elementType:'geometry',stylers:[{color:'#21262d'}]},{featureType:'poi.park',elementType:'geometry',stylers:[{color:'#1a2617'}]},
  {featureType:'road',elementType:'geometry',stylers:[{color:'#30363d'}]},{featureType:'road.highway',elementType:'geometry',stylers:[{color:'#3a424d'}]},
  {featureType:'water',elementType:'geometry',stylers:[{color:'#0d1926'}]}
];
const MAP_LIGHT = [
  {elementType:'geometry',stylers:[{color:'#f8f8f8'}]},{elementType:'labels.icon',stylers:[{visibility:'off'}]},
  {elementType:'labels.text.fill',stylers:[{color:'#3A3A3A'}]},{elementType:'labels.text.stroke',stylers:[{color:'#ffffff'}]},
  {featureType:'poi',elementType:'geometry',stylers:[{color:'#f0f0f0'}]},{featureType:'poi.park',elementType:'geometry',stylers:[{color:'#E2EBD8'}]},
  {featureType:'road',elementType:'geometry',stylers:[{color:'#ffffff'}]},{featureType:'water',elementType:'geometry',stylers:[{color:'#D4E4F7'}]}
];

window.initMap = function () {
  map = new google.maps.Map($('map'), { center: { lat: 47.3769, lng: 8.5417 }, zoom: 2, disableDefaultUI: true, styles: S.theme === 'light' ? MAP_LIGHT : MAP_DARK });
};

function powerZoom() {
  const el = $('map');
  if (!map || !el) return;
  const start = performance.now(), dur = 3000;
  function ease(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  (function step(now) {
    const t = Math.min((now - start) / dur, 1), e = ease(t);
    map.setZoom(2 + 13 * e);
    el.style.filter = `blur(${20 * (1 - e)}px) brightness(${0.7 + 0.3 * e})`;
    if (t < 1) requestAnimationFrame(step); else el.style.filter = 'none';
  })(start);
}

function addMarker(p) {
  if (!map || !p.lat || !p.lng) return;
  const color = CAT_COLORS[p.type?.toLowerCase().replace(/[^a-z]/g, '')] || '#38B6FF';
  const m = new google.maps.Marker({
    position: { lat: p.lat, lng: p.lng }, map, title: p.name,
    icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: color, fillOpacity: 1, strokeColor: '#FFF', strokeWeight: 3 },
    animation: google.maps.Animation.DROP
  });
  m.addListener('click', () => { S.place = p; fillSheet(p); openSheet(); });
  S.markers.push(m);
}

function hideWatermarks() {
  const s = document.createElement('style');
  s.innerHTML = '.dismissButton,.gm-err-container,.gm-style-mtc,.gm-style-bg,div[style*="background-image: url"]{display:none!important}.gm-style div,.gm-style span{background-color:transparent!important}';
  document.head.appendChild(s);
  setInterval(() => { document.querySelectorAll('.gm-style div').forEach(d => { if (d.innerHTML.includes('development purposes only')) d.style.display = 'none'; }); }, 500);
}
window.gm_authFailure = hideWatermarks;

// ================================================================
// DISCOVERY
// ================================================================
function fillSheet(p) {
  $('s-name').textContent = p.name;
  $('s-tag').textContent = p.type || 'Discovery';
  $('s-addr').textContent = p.address || 'Nearby';
  $('s-dist').textContent = p.distance || 'Close by';
  $('s-desc').textContent = p.description || '';
}

async function discover() {
  const btn = $('btn-discover');
  if (!S.subscribed && S.credits <= 0) { openModal('modal-premium'); return; }
  btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;animation:spin 1s linear infinite">progress_activity</span> Scanning...';
  btn.disabled = true;
  try {
    const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 }));
    const { latitude: lat, longitude: lng } = pos.coords;
    if (map) { map.panTo({ lat, lng }); map.setZoom(15); }
    $('sonar').style.display = 'block';
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;animation:spin 1s linear infinite">progress_activity</span> Discovering...';
    if (!placesService && map) placesService = new google.maps.places.PlacesService(map);
    if (!placesService) throw new Error('No places service');
    const req = { location: new google.maps.LatLng(lat, lng), radius: 2000 };
    if (S.cat) req.type = S.cat; else req.keyword = 'hidden gem local favorite';
    const results = await new Promise((res, rej) => {
      placesService.nearbySearch(req, (r, s) => { if (s === google.maps.places.PlacesServiceStatus.OK) res(r); else if (s === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) res([]); else rej(new Error(s)); });
    });
    if (!results.length) { toast('No places found. Try a different category!'); resetBtn(); return; }
    let cands = results.filter(p => (p.rating || 0) >= 4.0); if (!cands.length) cands = results;
    const t = cands[Math.floor(Math.random() * cands.length)];
    const pLat = t.geometry.location.lat(), pLng = t.geometry.location.lng();
    const dist = haversine(lat, lng, pLat, pLng);
    S.place = {
      name: t.name || 'Hidden Gem', type: t.types?.[0] || S.cat || 'Discovery',
      address: t.vicinity || 'A local favorite', distance: fmtDist(dist), distKm: dist,
      description: t.rating ? 'Rating: ' + t.rating + ' — Highly rated by locals' : 'A secret spot favored by locals.',
      lat: pLat, lng: pLng, discoveredAt: new Date()
    };
    fillSheet(S.place); addMarker(S.place);
    if (map) map.panTo({ lat: pLat, lng: pLng });
    openSheet(); addHistory(S.place);
    if (!S.subscribed) { S.credits--; $('credits').textContent = S.credits + ' Credit' + (S.credits === 1 ? '' : 's'); }
  } catch (e) { console.error(e); toast('Could not discover places. Check location permissions.'); }
  resetBtn();
}
function resetBtn() { const b = $('btn-discover'); b.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">explore</span> Discover Places'; b.disabled = false; }

// ================================================================
// HISTORY
// ================================================================
function addHistory(p) { S.history.unshift(p); renderHistory(); }
function renderHistory() {
  const el = $('history-list'); if (!el || !S.history.length) return;
  el.innerHTML = S.history.map(p => {
    const d = p.discoveredAt ? new Date(p.discoveredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today';
    return `<div style="padding:20px 0;border-bottom:.5px solid var(--border)"><p class="t-meta" style="margin-bottom:6px">${p.type || 'Discovery'} · ${d}</p><h3 class="t-title" style="font-size:1.3rem;margin-bottom:8px">${p.name}</h3><p class="t-body">${p.description || ''}</p></div>`;
  }).join('');
}
window.renderHistory = renderHistory;

// ================================================================
// NAVIGATE / SAVE
// ================================================================
function goMaps() {
  if (!S.place) return;
  const { lat, lng, name, address } = S.place;
  const q = encodeURIComponent((name || '') + ' ' + (address || ''));
  const url = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? `http://maps.apple.com/?q=${encodeURIComponent(name)}&ll=${lat},${lng}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
  window.open(url, '_blank'); closeSheet();
}
function savePlace() {
  if (!S.place) return;
  const btn = $('btn-save');
  if (S.saved.find(p => p.name === S.place.name)) { btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">check</span> Already Saved'; return; }
  S.saved.push({ ...S.place });
  btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">bookmark_added</span> Saved!';
  setTimeout(() => { btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">bookmark</span> Save'; }, 2000);
}

// ================================================================
// PAYMENT
// ================================================================
function confirmPay() {
  const form = $('pay-form'); if (!form.checkValidity()) { form.reportValidity(); return; }
  const btn = $('btn-pay'); btn.textContent = 'Verifying...'; btn.disabled = true;
  setTimeout(() => {
    btn.textContent = 'Authorized ✓'; S.subscribed = true; S.credits = 999;
    setTimeout(() => { closeModal('modal-checkout'); $('credits').textContent = 'Premium'; btn.textContent = 'Confirm Payment'; btn.disabled = false; }, 1200);
  }, 2000);
}

// ================================================================
// THEME
// ================================================================
function applyTheme(t) {
  S.theme = t; localStorage.setItem('wl-theme', t);
  document.documentElement.classList.toggle('light', t === 'light');
  document.querySelector('meta[name="theme-color"]').content = t === 'light' ? '#F0F2F5' : '#0D1117';
  if (map) map.setOptions({ styles: t === 'light' ? MAP_LIGHT : MAP_DARK });
}

// ================================================================
// NEURAL CANVAS
// ================================================================
function initCanvas() {
  const c = $('neural-canvas'); if (!c) return;
  const ctx = c.getContext('2d'); let nodes = [];
  const colors = ['#FFB5A7','#B8E0D2','#D4C5F9','#A7D8FF','#FFD6A5'];
  function resize() { c.width = c.parentElement.offsetWidth; c.height = c.parentElement.offsetHeight; gen(); }
  function gen() { nodes = []; const n = Math.floor(c.width * c.height / 18000); for (let i = 0; i < n; i++) nodes.push({ x: Math.random() * c.width, y: Math.random() * c.height, r: 3 + Math.random() * 4, color: colors[Math.floor(Math.random() * colors.length)], phase: Math.random() * Math.PI * 2, speed: .003 + Math.random() * .004 }); }
  function draw(t) {
    ctx.clearRect(0, 0, c.width, c.height); ctx.lineWidth = .5;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 120) { ctx.strokeStyle = `rgba(255,255,255,${(1 - d / 120) * .4})`; ctx.shadowColor = 'rgba(56,182,255,.15)'; ctx.shadowBlur = 4; ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke(); }
    }
    ctx.shadowBlur = 0;
    for (const n of nodes) {
      const s = 1 + .05 * Math.sin(t * n.speed * 2 + n.phase), r = n.r * s;
      ctx.beginPath(); ctx.arc(n.x, n.y, r + 2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fill();
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r);
      g.addColorStop(0, n.color); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize', resize); resize(); draw(0);
}

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(S.theme);
  hideWatermarks();

  // Discover
  $('btn-discover')?.addEventListener('click', discover);
  $('btn-navigate')?.addEventListener('click', goMaps);
  $('btn-save')?.addEventListener('click', savePlace);
  $('btn-pay')?.addEventListener('click', confirmPay);

  // Auth
  $('btn-try-free')?.addEventListener('click', () => { $('auth-gate').classList.add('hidden'); setTimeout(powerZoom, 300); });
  $('btn-login-open')?.addEventListener('click', () => $('login-slide').classList.add('open'));
  $('btn-login-close')?.addEventListener('click', () => $('login-slide').classList.remove('open'));
  $('btn-login-submit')?.addEventListener('click', () => {
    if (!$('login-email').value.trim() || !$('login-password').value) { toast('Please fill in all fields'); return; }
    const b = $('btn-login-submit'); b.textContent = 'Signing in...'; b.disabled = true;
    setTimeout(() => { $('login-slide').classList.remove('open'); $('auth-gate').classList.add('hidden'); b.textContent = 'Sign In'; b.disabled = false; toast('Welcome back, Explorer!'); setTimeout(powerZoom, 300); }, 1500);
  });
  $('btn-forgot-open')?.addEventListener('click', () => $('forgot-slide').classList.add('open'));
  $('btn-forgot-close')?.addEventListener('click', () => { $('forgot-slide').classList.remove('open'); $('forgot-msg').classList.add('hidden'); });
  $('btn-forgot-submit')?.addEventListener('click', () => {
    if (!$('forgot-email').value.trim()) { toast('Please enter your email'); return; }
    const b = $('btn-forgot-submit'); b.textContent = 'Sending...'; b.disabled = true;
    setTimeout(() => { b.textContent = 'Send Recovery Link'; b.disabled = false; $('forgot-msg').classList.remove('hidden'); }, 1500);
  });

  // Profile
  $('btn-save-profile')?.addEventListener('click', () => {
    if ($('pf-pw').value && $('pf-pw').value !== $('pf-pw2').value) { toast('Passwords do not match'); return; }
    const b = $('btn-save-profile'); b.textContent = 'Saving...'; b.disabled = true;
    setTimeout(() => {
      const name = $('pf-name')?.value.trim();
      if (name) $('display-name').textContent = name;
      b.textContent = 'Save Changes'; b.disabled = false;
      toast('Profile updated successfully');
    }, 1200);
  });

  // Plan toggle
  document.querySelectorAll('.plan-btn').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.plan-btn').forEach(x => { x.style.background = 'transparent'; x.style.color = 'var(--text-2)'; });
    b.style.background = 'var(--accent)'; b.style.color = '#fff';
    S.plan = b.dataset.plan;
    $('pay-total').textContent = S.plan === 'annual' ? '200.00 CHF' : '20.00 CHF';
    $('pay-cycle').textContent = S.plan === 'annual' ? 'Billed Annually' : 'Billed Monthly';
  }));

  // Unit toggle
  document.querySelectorAll('.unit-btn').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.unit-btn').forEach(x => { x.style.background = 'transparent'; x.style.color = 'var(--text-2)'; });
    b.style.background = 'var(--accent)'; b.style.color = '#fff';
    S.unit = b.dataset.unit || 'meters';
    if (S.place?.distKm !== undefined) $('s-dist').textContent = fmtDist(S.place.distKm);
  }));

  // Theme toggle
  document.querySelectorAll('.theme-btn').forEach(b => b.addEventListener('click', () => {
    haptic(12);
    document.querySelectorAll('.theme-btn').forEach(x => { x.style.background = 'transparent'; x.style.color = 'var(--text-2)'; });
    b.style.background = 'var(--accent)'; b.style.color = '#fff';
    applyTheme(b.dataset.theme);
  }));
  document.querySelectorAll('.theme-btn').forEach(b => { if (b.dataset.theme === S.theme) { b.style.background = 'var(--accent)'; b.style.color = '#fff'; } });

  // Haptic feedback
  document.addEventListener('pointerdown', e => { if (e.target.closest('button')) haptic(8); });

  // Neural canvas
  setTimeout(initCanvas, 500);

  console.log('Wanderlost v60 — Ready');
});
