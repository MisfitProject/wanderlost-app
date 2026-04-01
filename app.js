// ============================================================
// WANDERLOST — App Engine (from scratch)
// ============================================================

// --- State ---
const APP = {
  credits: 3,
  subscribed: false,
  place: null,
  history: [],
  saved: [],
  markers: [],
  tab: 'tab-explore',
  cat: '',
  plan: 'monthly',
  unit: 'meters',
  theme: localStorage.getItem('wl-theme') || 'dark'
};

// --- Shorthand ---
const el = (id) => document.getElementById(id);
const vibrate = (ms = 10) => { if (navigator.vibrate) navigator.vibrate(ms); };

// ============================================================
// TOAST
// ============================================================
function showToast(msg) {
  const old = el('wl-toast');
  if (old) old.remove();

  const t = document.createElement('div');
  t.id = 'wl-toast';
  Object.assign(t.style, {
    position: 'fixed', top: '80px', left: '50%',
    transform: 'translateX(-50%) translateY(-10px)',
    zIndex: '9999', padding: '12px 24px', fontSize: '13px',
    textAlign: 'center', maxWidth: '320px', borderRadius: '9999px',
    opacity: '0',
    background: 'var(--surface-solid)',
    backdropFilter: 'blur(40px)',
    border: '0.5px solid var(--border)',
    color: 'var(--text)',
    boxShadow: 'var(--shadow)',
    transition: 'all 0.5s var(--ease)',
    fontFamily: "'Inter', sans-serif",
    letterSpacing: '0.03em'
  });
  t.textContent = msg;
  document.body.appendChild(t);

  requestAnimationFrame(() => {
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
  });

  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(-10px)';
    setTimeout(() => t.remove(), 500);
  }, 4000);
}
window.showToast = showToast;

// ============================================================
// TAB NAVIGATION
// ============================================================
function switchTab(tabId) {
  vibrate(8);
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const target = el(tabId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.dock-btn').forEach(btn => {
    const icon = btn.querySelector('.material-symbols-outlined');
    if (btn.dataset.tab === tabId) {
      btn.classList.add('active');
      icon.style.fontVariationSettings = "'FILL' 1";
    } else {
      btn.classList.remove('active');
      icon.style.fontVariationSettings = "'FILL' 0";
    }
  });

  APP.tab = tabId;
}
window.switchTab = switchTab;

// ============================================================
// MODALS
// ============================================================
function openModal(id) {
  const m = el(id);
  if (m) {
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const m = el(id);
  if (m) {
    m.classList.remove('open');
    if (!document.querySelector('.modal.open')) {
      document.body.style.overflow = '';
    }
  }
}

function closeAuthOpenModal(id) {
  el('auth-gate').classList.add('hidden');
  openModal(id);
}

window.openModal = openModal;
window.closeModal = closeModal;
window.closeAuthOpenModal = closeAuthOpenModal;

// ============================================================
// DISCOVERY SHEET
// ============================================================
function openSheet() {
  el('discovery-sheet').classList.add('open');
  el('btn-discover')?.classList.add('morphing');
  vibrate(15);
}

function closeSheet() {
  el('discovery-sheet').classList.remove('open');
  el('btn-discover')?.classList.remove('morphing');
}
window.closeSheet = closeSheet;

// ============================================================
// CATEGORIES
// ============================================================
function pickCat(btn) {
  vibrate(10);
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  APP.cat = btn.dataset.cat || '';
}
window.pickCat = pickCat;

// ============================================================
// FAQ ACCORDION
// ============================================================
function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const answer = item.querySelector('.faq-a');
  const icon = btn.querySelector('.material-symbols-outlined');

  // Close all others
  document.querySelectorAll('.faq-item').forEach(other => {
    if (other !== item) {
      other.querySelector('.faq-a')?.classList.add('hidden');
      const otherIcon = other.querySelector('button .material-symbols-outlined');
      if (otherIcon) { otherIcon.style.transform = ''; otherIcon.textContent = 'chevron_right'; }
    }
  });

  const isOpen = !answer.classList.contains('hidden');
  answer.classList.toggle('hidden');
  icon.style.transform = isOpen ? '' : 'rotate(90deg)';
  icon.textContent = isOpen ? 'chevron_right' : 'expand_more';
}
window.toggleFaq = toggleFaq;

// ============================================================
// DISTANCE
// ============================================================
function formatDist(km) {
  if (APP.unit === 'feet') {
    const ft = km * 3280.84;
    return ft < 5280 ? Math.round(ft) + ' ft away' : (ft / 5280).toFixed(1) + ' mi away';
  }
  return km < 1 ? Math.round(km * 1000) + ' m away' : km.toFixed(1) + ' km away';
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// GOOGLE MAPS
// ============================================================
let map, placesService;

const COLORS = {
  restaurant: '#FFB5A7', cafe: '#D4C5F9', bakery: '#FFD6A5',
  bar: '#E8A0BF', park: '#B8E0D2', museum: '#A7D8FF'
};

const MAP_DARK = [
  { elementType: 'geometry', stylers: [{ color: '#1a1d23' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8B949E' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#21262d' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a2617' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#30363d' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a424d' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1926' }] }
];

const MAP_LIGHT = [
  { elementType: 'geometry', stylers: [{ color: '#f8f8f8' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#3A3A3A' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#f0f0f0' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#E2EBD8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#D4E4F7' }] }
];

window.initMap = function () {
  map = new google.maps.Map(el('map'), {
    center: { lat: 47.3769, lng: 8.5417 },
    zoom: 2,
    disableDefaultUI: true,
    styles: APP.theme === 'light' ? MAP_LIGHT : MAP_DARK
  });
};

// ============================================================
// POWER ZOOM (zoom 2 → 15, 3s, blur clears)
// ============================================================
function powerZoom() {
  const mapEl = el('map');
  if (!map || !mapEl) return;

  const start = performance.now();
  const duration = 3000;

  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  (function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const e = easeOutExpo(t);

    map.setZoom(2 + 13 * e);
    const blur = 20 * (1 - e);
    const brightness = 0.7 + 0.3 * e;
    mapEl.style.filter = `blur(${blur}px) brightness(${brightness})`;

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      mapEl.style.filter = 'none';
    }
  })(start);
}

// ============================================================
// MAP MARKERS
// ============================================================
function addMarker(place) {
  if (!map || !place.lat || !place.lng) return;

  const key = place.type?.toLowerCase().replace(/[^a-z]/g, '');
  const color = COLORS[key] || '#38B6FF';

  const marker = new google.maps.Marker({
    position: { lat: place.lat, lng: place.lng },
    map,
    title: place.name,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#FFF',
      strokeWeight: 3
    },
    animation: google.maps.Animation.DROP
  });

  marker.addListener('click', () => {
    APP.place = place;
    fillSheet(place);
    openSheet();
  });

  APP.markers.push(marker);
}

// Hide Google watermarks
function hideWatermarks() {
  const s = document.createElement('style');
  s.innerHTML = '.dismissButton,.gm-err-container,.gm-style-mtc,.gm-style-bg,div[style*="background-image: url"]{display:none!important}.gm-style div,.gm-style span{background-color:transparent!important}';
  document.head.appendChild(s);
  setInterval(() => {
    document.querySelectorAll('.gm-style div').forEach(d => {
      if (d.innerHTML.includes('development purposes only')) d.style.display = 'none';
    });
  }, 500);
}
window.gm_authFailure = hideWatermarks;

// ============================================================
// DISCOVERY ENGINE
// ============================================================
function fillSheet(p) {
  el('s-name').textContent = p.name;
  el('s-tag').textContent = p.type || 'Discovery';
  el('s-addr').textContent = p.address || 'Nearby';
  el('s-dist').textContent = p.distance || 'Close by';
  el('s-desc').textContent = p.description || '';
}

async function discover() {
  const btn = el('btn-discover');

  if (!APP.subscribed && APP.credits <= 0) {
    openModal('modal-premium');
    return;
  }

  btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;animation:spin 1s linear infinite">progress_activity</span> Scanning...';
  btn.disabled = true;

  try {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 })
    );

    const { latitude: lat, longitude: lng } = pos.coords;
    if (map) { map.panTo({ lat, lng }); map.setZoom(15); }

    el('sonar').style.display = 'block';
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;animation:spin 1s linear infinite">progress_activity</span> Discovering...';

    if (!placesService && map) placesService = new google.maps.places.PlacesService(map);
    if (!placesService) throw new Error('Places service unavailable');

    const req = { location: new google.maps.LatLng(lat, lng), radius: 2000 };
    if (APP.cat) req.type = APP.cat;
    else req.keyword = 'hidden gem local favorite';

    const results = await new Promise((res, rej) => {
      placesService.nearbySearch(req, (r, s) => {
        if (s === google.maps.places.PlacesServiceStatus.OK) res(r);
        else if (s === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) res([]);
        else rej(new Error(s));
      });
    });

    if (!results.length) {
      showToast('No places found nearby. Try a different category!');
      resetDiscoverBtn();
      return;
    }

    let candidates = results.filter(p => (p.rating || 0) >= 4.0);
    if (!candidates.length) candidates = results;
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const pLat = target.geometry.location.lat();
    const pLng = target.geometry.location.lng();
    const dist = haversine(lat, lng, pLat, pLng);

    APP.place = {
      name: target.name || 'Hidden Gem',
      type: target.types?.[0] || APP.cat || 'Discovery',
      address: target.vicinity || 'A local favorite',
      distance: formatDist(dist),
      distKm: dist,
      description: target.rating
        ? 'Rating: ' + target.rating + ' — Highly rated by locals'
        : 'A secret spot favored by locals.',
      lat: pLat,
      lng: pLng,
      discoveredAt: new Date()
    };

    fillSheet(APP.place);
    addMarker(APP.place);
    if (map) map.panTo({ lat: pLat, lng: pLng });
    openSheet();
    addToHistory(APP.place);

    if (!APP.subscribed) {
      APP.credits--;
      el('credits').textContent = APP.credits + ' Credit' + (APP.credits === 1 ? '' : 's');
    }
  } catch (err) {
    console.error('Discovery error:', err);
    showToast('Could not discover places. Check location permissions.');
  }

  resetDiscoverBtn();
}

function resetDiscoverBtn() {
  const btn = el('btn-discover');
  btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">explore</span> Discover Places';
  btn.disabled = false;
}

// ============================================================
// HISTORY
// ============================================================
function addToHistory(place) {
  APP.history.unshift(place);
  renderHistory();
}

function renderHistory() {
  const list = el('history-list');
  if (!list || !APP.history.length) return;

  list.innerHTML = APP.history.map(p => {
    const date = p.discoveredAt
      ? new Date(p.discoveredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Today';

    return `<div style="padding:20px 0; border-bottom:0.5px solid var(--border);">
      <p class="t-meta" style="margin-bottom:6px;">${p.type || 'Discovery'} · ${date}</p>
      <h3 class="t-title" style="font-size:1.3rem; margin-bottom:8px;">${p.name}</h3>
      <p class="t-body">${p.description || ''}</p>
    </div>`;
  }).join('');
}
window.renderHistory = renderHistory;

// ============================================================
// NAVIGATE & SAVE
// ============================================================
function goToMaps() {
  if (!APP.place) return;
  const { lat, lng, name, address } = APP.place;
  const q = encodeURIComponent((name || '') + ' ' + (address || ''));
  const url = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? `http://maps.apple.com/?q=${encodeURIComponent(name)}&ll=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${q}`;
  window.open(url, '_blank');
  closeSheet();
}

function savePlace() {
  if (!APP.place) return;
  const btn = el('btn-save');
  if (APP.saved.find(p => p.name === APP.place.name)) {
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">check</span> Already Saved';
    return;
  }
  APP.saved.push({ ...APP.place });
  btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">bookmark_added</span> Saved!';
  setTimeout(() => {
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">bookmark</span> Save';
  }, 2000);
}

// ============================================================
// PAYMENT
// ============================================================
function confirmPayment() {
  const form = el('pay-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }

  const btn = el('btn-pay');
  btn.textContent = 'Verifying...';
  btn.disabled = true;

  setTimeout(() => {
    btn.textContent = 'Authorized ✓';
    APP.subscribed = true;
    APP.credits = 999;
    setTimeout(() => {
      closeModal('modal-checkout');
      el('credits').textContent = 'Premium';
      btn.textContent = 'Confirm Payment';
      btn.disabled = false;
    }, 1200);
  }, 2000);
}

// ============================================================
// THEME
// ============================================================
function applyTheme(theme) {
  APP.theme = theme;
  localStorage.setItem('wl-theme', theme);
  document.documentElement.classList.toggle('light', theme === 'light');
  document.querySelector('meta[name="theme-color"]').content =
    theme === 'light' ? '#F0F2F5' : '#0D1117';
  if (map) map.setOptions({ styles: theme === 'light' ? MAP_LIGHT : MAP_DARK });
}

// ============================================================
// NEURAL CANVAS
// ============================================================
function initNeuralCanvas() {
  const canvas = el('neural-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let nodes = [];
  const palette = ['#FFB5A7', '#B8E0D2', '#D4C5F9', '#A7D8FF', '#FFD6A5'];

  function resize() {
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    generateNodes();
  }

  function generateNodes() {
    nodes = [];
    const count = Math.floor((canvas.width * canvas.height) / 18000);
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 3 + Math.random() * 4,
        color: palette[Math.floor(Math.random() * palette.length)],
        phase: Math.random() * Math.PI * 2,
        speed: 0.003 + Math.random() * 0.004
      });
    }
  }

  function draw(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 0.5;

    // Draw connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const alpha = (1 - dist / 120) * 0.4;
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.shadowColor = 'rgba(56,182,255,0.15)';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    ctx.shadowBlur = 0;
    for (const n of nodes) {
      const scale = 1 + 0.05 * Math.sin(time * n.speed * 2 + n.phase);
      const r = n.r * scale;

      // Outer glow
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fill();

      // Core gradient
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r);
      g.addColorStop(0, n.color);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw(0);
}

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

  // Theme
  applyTheme(APP.theme);
  hideWatermarks();

  // --- BUTTON BINDINGS ---

  // Discover
  el('btn-discover')?.addEventListener('click', discover);
  el('btn-navigate')?.addEventListener('click', goToMaps);
  el('btn-save')?.addEventListener('click', savePlace);
  el('btn-pay')?.addEventListener('click', confirmPayment);

  // Auth: Try for Free
  el('btn-try-free')?.addEventListener('click', () => {
    el('auth-gate').classList.add('hidden');
    setTimeout(powerZoom, 300);
  });

  // Auth: Login
  el('btn-login-open')?.addEventListener('click', () => el('login-slide').classList.add('open'));
  el('btn-login-back')?.addEventListener('click', () => el('login-slide').classList.remove('open'));
  el('btn-login-submit')?.addEventListener('click', () => {
    const email = el('login-email').value.trim();
    const pw = el('login-pw').value;
    if (!email || !pw) { showToast('Please fill in all fields.'); return; }

    const btn = el('btn-login-submit');
    btn.textContent = 'Signing in...';
    btn.disabled = true;

    setTimeout(() => {
      el('login-slide').classList.remove('open');
      el('auth-gate').classList.add('hidden');
      btn.textContent = 'Sign In';
      btn.disabled = false;
      showToast('Welcome back, Explorer!');
      setTimeout(powerZoom, 300);
    }, 1500);
  });

  // Auth: Forgot Password
  el('btn-forgot-open')?.addEventListener('click', () => el('forgot-slide').classList.add('open'));
  el('btn-forgot-back')?.addEventListener('click', () => {
    el('forgot-slide').classList.remove('open');
    el('forgot-msg').classList.add('hidden');
  });
  el('btn-forgot-submit')?.addEventListener('click', () => {
    if (!el('forgot-email').value.trim()) { showToast('Please enter your email.'); return; }
    const btn = el('btn-forgot-submit');
    btn.textContent = 'Sending...';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = 'Send Recovery Link';
      btn.disabled = false;
      el('forgot-msg').classList.remove('hidden');
    }, 1500);
  });

  // Profile Save
  el('btn-save-profile')?.addEventListener('click', () => {
    const pw = el('pf-pw').value;
    const pw2 = el('pf-pw2').value;
    if (pw && pw !== pw2) { showToast('Passwords do not match.'); return; }

    const btn = el('btn-save-profile');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    setTimeout(() => {
      const name = el('pf-name')?.value.trim();
      if (name) el('display-name').textContent = name;
      btn.textContent = 'Save Changes';
      btn.disabled = false;
      showToast('Profile updated successfully.');
    }, 1200);
  });

  // Plan toggle
  document.querySelectorAll('.plan-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.plan-btn').forEach(b => {
        b.style.background = 'transparent';
        b.style.color = 'var(--text-dim)';
      });
      btn.style.background = 'var(--blue)';
      btn.style.color = '#fff';
      APP.plan = btn.dataset.plan;
      el('pay-total').textContent = APP.plan === 'annual' ? '200.00 CHF' : '20.00 CHF';
      el('pay-cycle').textContent = APP.plan === 'annual' ? 'Billed Annually' : 'Billed Monthly';
    });
  });

  // Unit toggle
  document.querySelectorAll('.unit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.unit-btn').forEach(b => {
        b.style.background = 'transparent';
        b.style.color = 'var(--text-dim)';
      });
      btn.style.background = 'var(--blue)';
      btn.style.color = '#fff';
      APP.unit = btn.dataset.unit || 'meters';
      if (APP.place?.distKm !== undefined) {
        el('s-dist').textContent = formatDist(APP.place.distKm);
      }
    });
  });

  // Theme toggle
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      vibrate(12);
      document.querySelectorAll('.theme-btn').forEach(b => {
        b.style.background = 'transparent';
        b.style.color = 'var(--text-dim)';
      });
      btn.style.background = 'var(--blue)';
      btn.style.color = '#fff';
      applyTheme(btn.dataset.theme);
    });
  });

  // Set initial theme button
  document.querySelectorAll('.theme-btn').forEach(btn => {
    if (btn.dataset.theme === APP.theme) {
      btn.style.background = 'var(--blue)';
      btn.style.color = '#fff';
    }
  });

  // Haptic on all buttons
  document.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) vibrate(8);
  });

  // Neural Canvas
  setTimeout(initNeuralCanvas, 500);

  console.log('Wanderlost v62 — Ready');
});
