// ============================================================
// Wanderlost — Depth-First Engine
// ============================================================

const BACKEND_URL = 'https://wanderlost-app.onrender.com';

// Category Color Mapping
const CATEGORY_COLORS = {
  restaurant: '#FFB5A7',
  cafe: '#D4C5F9',
  bakery: '#FFD6A5',
  bar: '#E8A0BF',
  park: '#B8E0D2',
  museum: '#A7D8FF',
  default: '#38B6FF'
};

// State
const state = {
  discoveriesRemaining: 3,
  isSubscribed: false,
  currentPlace: null,
  history: [],
  activeTab: 'tab-explore',
  selectedCategory: '',
  savedPlaces: [],
  markers: [],
  selectedPlan: 'monthly',
  distanceUnit: 'meters',
  theme: localStorage.getItem('wanderlost-theme') || 'dark',
  sheetState: 'hidden'
};

// ============================================================
// HAPTIC VIBRATION
// ============================================================
function haptic(duration = 10) {
  if (navigator.vibrate) navigator.vibrate(duration);
}

function getCategoryColor(type) {
  if (!type) return CATEGORY_COLORS.default;
  const key = type.toLowerCase().replace(/[^a-z]/g, '');
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.default;
}

// ============================================================
// TAB NAVIGATION
// ============================================================
function switchTab(tabId) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add('active');
      btn.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 1";
    } else {
      btn.classList.remove('active');
      btn.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 0";
    }
  });
  state.activeTab = tabId;
}

// ============================================================
// MODAL SYSTEM
// ============================================================
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  const anyOpen = document.querySelector('.modal-slide.open');
  if (!anyOpen) document.body.style.overflow = '';
}

// ============================================================
// DISTANCE FORMATTING
// ============================================================
function formatDistance(distKm) {
  if (state.distanceUnit === 'feet') {
    const feet = distKm * 3280.84;
    return feet < 5280
      ? Math.round(feet) + ' ft away'
      : (feet / 5280).toFixed(1) + ' mi away';
  }
  return distKm < 1
    ? Math.round(distKm * 1000) + ' m away'
    : distKm.toFixed(1) + ' km away';
}

// ============================================================
// DISCOVERY SHEET (CSS Morph)
// ============================================================
function openDiscoverySheet() {
  const sheet = document.getElementById('discovery-sheet');
  const btn = document.getElementById('btn-discover');
  sheet.classList.add('open');
  if (btn) btn.classList.add('morphing');
  state.sheetState = 'expanded';
  haptic(15);
}

function closeDiscoverySheet() {
  const sheet = document.getElementById('discovery-sheet');
  const btn = document.getElementById('btn-discover');
  sheet.classList.remove('open');
  if (btn) btn.classList.remove('morphing');
  state.sheetState = 'hidden';
}

// ============================================================
// CATEGORY SELECTION
// ============================================================
function selectCategory(btn) {
  haptic(10);
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  state.selectedCategory = btn.dataset.category || '';
}

// ============================================================
// HELP CENTER
// ============================================================
function toggleHelpItem(btn) {
  const item = btn.closest('.help-item');
  const answer = item.querySelector('.help-a');
  const chevron = btn.querySelector('.material-symbols-outlined');
  const category = item.closest('.help-category');
  category.querySelectorAll('.help-item').forEach(other => {
    if (other !== item) {
      other.querySelector('.help-a').classList.add('hidden');
      const otherChevron = other.querySelector('.help-q .material-symbols-outlined');
      if (otherChevron) { otherChevron.style.transform = ''; otherChevron.textContent = 'chevron_right'; }
    }
  });
  const isOpen = !answer.classList.contains('hidden');
  answer.classList.toggle('hidden');
  if (isOpen) {
    chevron.style.transform = ''; chevron.textContent = 'chevron_right';
  } else {
    chevron.style.transform = 'rotate(90deg)'; chevron.textContent = 'expand_more';
  }
}

function filterHelpItems(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.help-item').forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = !q || text.includes(q) ? '' : 'none';
  });
  document.querySelectorAll('.help-category').forEach(cat => {
    const hasVisible = Array.from(cat.querySelectorAll('.help-item')).some(i => i.style.display !== 'none');
    cat.style.display = hasVisible ? '' : 'none';
  });
}

// ============================================================
// GOOGLE MAPS
// ============================================================
let map;
const MAP_MIDNIGHT = [
  {elementType:'geometry',stylers:[{color:'#1a1d23'}]},
  {elementType:'labels.icon',stylers:[{visibility:'off'}]},
  {elementType:'labels.text.fill',stylers:[{color:'#8B949E'}]},
  {elementType:'labels.text.stroke',stylers:[{color:'#0d1117'}]},
  {featureType:'administrative.land_parcel',elementType:'labels.text.fill',stylers:[{color:'#484f58'}]},
  {featureType:'poi',elementType:'geometry',stylers:[{color:'#21262d'}]},
  {featureType:'poi',elementType:'labels.text.fill',stylers:[{color:'#6e7681'}]},
  {featureType:'poi.park',elementType:'geometry',stylers:[{color:'#1a2617'}]},
  {featureType:'road',elementType:'geometry',stylers:[{color:'#30363d'}]},
  {featureType:'road.arterial',elementType:'labels.text.fill',stylers:[{color:'#6e7681'}]},
  {featureType:'road.highway',elementType:'geometry',stylers:[{color:'#3a424d'}]},
  {featureType:'road.local',elementType:'labels.text.fill',stylers:[{color:'#484f58'}]},
  {featureType:'transit.line',elementType:'geometry',stylers:[{color:'#21262d'}]},
  {featureType:'water',elementType:'geometry',stylers:[{color:'#0d1926'}]},
  {featureType:'water',elementType:'labels.text.fill',stylers:[{color:'#2a4a6b'}]}
];
const MAP_SILVER = [
  {elementType:'geometry',stylers:[{color:'#f8f8f8'}]},
  {elementType:'labels.icon',stylers:[{visibility:'off'}]},
  {elementType:'labels.text.fill',stylers:[{color:'#3A3A3A'}]},
  {elementType:'labels.text.stroke',stylers:[{color:'#ffffff'}]},
  {featureType:'administrative.land_parcel',elementType:'labels.text.fill',stylers:[{color:'#bdbdbd'}]},
  {featureType:'poi',elementType:'geometry',stylers:[{color:'#f0f0f0'}]},
  {featureType:'poi',elementType:'labels.text.fill',stylers:[{color:'#757575'}]},
  {featureType:'poi.park',elementType:'geometry',stylers:[{color:'#E2EBD8'}]},
  {featureType:'road',elementType:'geometry',stylers:[{color:'#ffffff'}]},
  {featureType:'road.arterial',elementType:'labels.text.fill',stylers:[{color:'#757575'}]},
  {featureType:'road.highway',elementType:'geometry',stylers:[{color:'#f0f0f0'}]},
  {featureType:'road.local',elementType:'labels.text.fill',stylers:[{color:'#9e9e9e'}]},
  {featureType:'transit.line',elementType:'geometry',stylers:[{color:'#e5e5e5'}]},
  {featureType:'water',elementType:'geometry',stylers:[{color:'#D4E4F7'}]},
  {featureType:'water',elementType:'labels.text.fill',stylers:[{color:'#7BADD4'}]}
];

window.initMap = function() {
  map = new google.maps.Map(document.getElementById('map-bg'), {
    center: { lat: 47.3769, lng: 8.5417 },
    zoom: 2, // Start at world view for power zoom
    disableDefaultUI: true,
    styles: state.theme === 'light' ? MAP_SILVER : MAP_MIDNIGHT
  });
};

// Power Zoom: zoom 2 → 15 over 3s with blur clearing
function initPowerZoom() {
  const mapEl = document.getElementById('map-bg');
  if (!map || !mapEl) return;

  // Blur is already set in HTML; animate zoom
  const startZoom = 2;
  const endZoom = 15;
  const duration = 3000;
  const startTime = performance.now();

  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function step(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = easeOutExpo(t);

    const currentZoom = startZoom + (endZoom - startZoom) * eased;
    map.setZoom(currentZoom);

    // Clear blur progressively
    const blur = 20 * (1 - eased);
    const brightness = 0.7 + 0.3 * eased;
    mapEl.style.filter = `blur(${blur}px) brightness(${brightness})`;

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      mapEl.style.filter = 'none';
      mapEl.classList.add('power-zoom-complete');
    }
  }
  requestAnimationFrame(step);
}

function addMapMarker(place) {
  if (!map || !place.lat || !place.lng) return;
  const catColor = getCategoryColor(place.type);
  const marker = new google.maps.Marker({
    position: { lat: place.lat, lng: place.lng },
    map,
    title: place.name,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: catColor,
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 3
    },
    animation: google.maps.Animation.DROP
  });
  marker.addListener('click', () => {
    state.currentPlace = place;
    document.getElementById('sheet-title').textContent = place.name;
    document.getElementById('sheet-tag').textContent = place.type || 'Discovery';
    document.getElementById('sheet-address').textContent = place.address || 'Nearby';
    document.getElementById('sheet-distance').textContent = place.distance || 'Close by';
    document.getElementById('sheet-desc').textContent = place.description || '';
    openDiscoverySheet();
  });
  state.markers.push(marker);
  return marker;
}

function hideGoogleWatermarks() {
  const style = document.createElement('style');
  style.innerHTML = `.dismissButton,.gm-err-container,.gm-style-mtc,.gm-style-bg,div[style*="background-image: url"]{display:none !important;}.gm-style div,.gm-style span{background-color:transparent !important;}`;
  document.head.appendChild(style);
  setInterval(() => {
    document.querySelectorAll('.gm-style div').forEach(div => {
      if (div.innerHTML.includes('development purposes only')) div.style.display = 'none';
    });
  }, 500);
}
window.gm_authFailure = hideGoogleWatermarks;

// ============================================================
// AI DISCOVERY (Client-side Places)
// ============================================================
let placesService = null;

async function runDiscovery() {
  const btn = document.getElementById('btn-discover');
  const sonar = document.getElementById('sonar-marker');

  if (!state.isSubscribed && state.discoveriesRemaining <= 0) {
    openModal('modal-premium');
    return;
  }

  btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;animation:spin 1s linear infinite">progress_activity</span> Scanning...';
  btn.disabled = true;

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true, timeout: 10000
      });
    });

    const { latitude, longitude } = position.coords;
    if (map) { map.panTo({ lat: latitude, lng: longitude }); map.setZoom(15); }

    if (sonar) sonar.style.display = 'block';

    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;animation:spin 1s linear infinite">progress_activity</span> Discovering...';

    if (!placesService && map) placesService = new google.maps.places.PlacesService(map);
    if (!placesService) throw new Error('Places service not available');

    const typeMap = { restaurant: 'restaurant', cafe: 'cafe', bakery: 'bakery', bar: 'bar', park: 'park', museum: 'museum' };
    const request = { location: new google.maps.LatLng(latitude, longitude), radius: 2000 };
    if (state.selectedCategory && typeMap[state.selectedCategory]) {
      request.type = typeMap[state.selectedCategory];
    } else {
      request.keyword = 'hidden gem local favorite';
    }

    const results = await new Promise((resolve, reject) => {
      placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) resolve(results);
        else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) resolve([]);
        else reject(new Error('Places search: ' + status));
      });
    });

    if (results.length === 0) {
      showToast('No places found nearby. Try a different category!');
      resetDiscoverBtn(btn); return;
    }

    let candidates = results.filter(p => (p.rating || 0) >= 4.0);
    if (candidates.length === 0) candidates = results;
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const placeLat = target.geometry.location.lat();
    const placeLng = target.geometry.location.lng();
    const dist = getDistanceKm(latitude, longitude, placeLat, placeLng);

    state.currentPlace = {
      name: target.name || 'Hidden Gem',
      type: (target.types && target.types[0]) || state.selectedCategory || 'Discovery',
      address: target.vicinity || 'A local favorite',
      distance: formatDistance(dist),
      distKm: dist,
      description: target.rating ? 'Rating: ' + target.rating + ' — Highly rated by locals' : 'A secret spot favored by locals.',
      lat: placeLat, lng: placeLng,
      discoveredAt: new Date()
    };

    document.getElementById('sheet-title').textContent = state.currentPlace.name;
    document.getElementById('sheet-tag').textContent = state.currentPlace.type;
    document.getElementById('sheet-address').textContent = state.currentPlace.address;
    document.getElementById('sheet-distance').textContent = state.currentPlace.distance;
    document.getElementById('sheet-desc').textContent = state.currentPlace.description;

    addMapMarker(state.currentPlace);
    if (map) map.panTo({ lat: placeLat, lng: placeLng });

    openDiscoverySheet();
    addToHistory(state.currentPlace);

    if (!state.isSubscribed) {
      state.discoveriesRemaining--;
      document.getElementById('discovery-counter').textContent =
        state.discoveriesRemaining + ' Credit' + (state.discoveriesRemaining === 1 ? '' : 's');
    }
  } catch (err) {
    console.error('Discovery error:', err);
    showToast('Could not discover places. Check your location permissions.');
  }

  resetDiscoverBtn(btn);
}

function resetDiscoverBtn(btn) {
  btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">explore</span> Discover Places';
  btn.disabled = false;
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// HISTORY
// ============================================================
function addToHistory(place) {
  state.history.unshift(place);
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('history-list');
  if (!list || state.history.length === 0) return;
  list.innerHTML = state.history.map(place => {
    const date = place.discoveredAt ? new Date(place.discoveredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today';
    return `
      <div style="padding:20px 0; border-bottom:0.5px solid var(--border-glass);">
        <p class="type-meta" style="margin-bottom:6px;">${place.type || 'Discovery'} · ${date}</p>
        <h3 class="type-title" style="font-size:1.3rem; margin-bottom:8px;">${place.name}</h3>
        <p class="type-body">${place.description || ''}</p>
      </div>`;
  }).join('');
}

// ============================================================
// NAVIGATION & PAYMENT
// ============================================================
function goToGoogleMaps() {
  if (!state.currentPlace) return;
  const { lat, lng, name, address } = state.currentPlace;
  const encodedName = encodeURIComponent(name || 'Discovery');
  const searchQuery = encodeURIComponent((name || '') + ' ' + (address || ''));
  let mapUrl;
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    mapUrl = `http://maps.apple.com/?q=${encodedName}&ll=${lat},${lng}`;
  } else {
    mapUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
  }
  window.open(mapUrl, '_blank');
  closeDiscoverySheet();
}

function confirmPayment() {
  const form = document.getElementById('checkout-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const btn = document.getElementById('btn-confirm-payment');
  btn.textContent = 'Verifying...'; btn.disabled = true;
  setTimeout(() => {
    btn.textContent = 'Authorized ✓';
    state.isSubscribed = true;
    state.discoveriesRemaining = 999;
    setTimeout(() => {
      closeModal('modal-checkout');
      document.getElementById('discovery-counter').textContent = 'Premium';
      btn.textContent = 'Confirm Payment'; btn.disabled = false;
    }, 1200);
  }, 2000);
}

function saveCurrentPlace() {
  if (!state.currentPlace) return;
  const btn = document.getElementById('btn-save-place');
  if (state.savedPlaces.find(p => p.name === state.currentPlace.name)) {
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">check</span> Already Saved';
    return;
  }
  state.savedPlaces.push({ ...state.currentPlace });
  btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">bookmark_added</span> Saved!';
  setTimeout(() => {
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">bookmark</span> Save';
  }, 2000);
}

// ============================================================
// TOAST
// ============================================================
function showToast(message) {
  const existing = document.getElementById('app-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'app-toast';
  Object.assign(toast.style, {
    position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%) translateY(-10px)',
    zIndex: '999', padding: '12px 24px', fontSize: '13px', textAlign: 'center',
    maxWidth: '320px', borderRadius: '9999px', opacity: '0',
    background: 'var(--bg-glass-strong)', backdropFilter: 'blur(40px)',
    border: '0.5px solid var(--border-glass)', color: 'var(--text-primary)',
    boxShadow: 'var(--depth-shadow)', transition: 'all 0.5s var(--ease-out)',
    fontFamily: 'Inter, sans-serif', letterSpacing: '0.03em'
  });
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-10px)';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

// ============================================================
// NEURAL NETWORK CANVAS
// ============================================================
function initNeuralCanvas() {
  const canvas = document.getElementById('neural-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let nodes = [];

  function resize() {
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    generateNodes();
  }

  function generateNodes() {
    nodes = [];
    const count = Math.floor((canvas.width * canvas.height) / 18000);
    const colors = ['#FFB5A7', '#B8E0D2', '#D4C5F9', '#A7D8FF', '#FFD6A5'];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        r: 3 + Math.random() * 4, color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2, speed: 0.003 + Math.random() * 0.004
      });
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 0.5;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 120) {
          const alpha = (1 - dist / 120) * 0.4;
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.shadowColor = 'rgba(56,182,255,0.15)'; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
        }
      }
    }
    ctx.shadowBlur = 0;
    for (const node of nodes) {
      const scale = 1 + 0.05 * Math.sin(t * node.speed * 2 + node.phase);
      const r = node.r * scale;
      ctx.beginPath(); ctx.arc(node.x, node.y, r+2, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill();
      const g = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r);
      g.addColorStop(0, node.color); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI*2); ctx.fillStyle = g; ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize(); draw(0);
}

// ============================================================
// THEME
// ============================================================
function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('wanderlost-theme', theme);
  document.documentElement.classList.toggle('light', theme === 'light');
  document.querySelector('meta[name="theme-color"]').content = theme === 'light' ? '#F0F2F5' : '#0D1117';
  if (map) map.setOptions({ styles: theme === 'light' ? MAP_SILVER : MAP_MIDNIGHT });
}

// ============================================================
// INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {

  // Apply theme
  applyTheme(state.theme);

  // Discover
  const btnDiscover = document.getElementById('btn-discover');
  if (btnDiscover) btnDiscover.addEventListener('click', runDiscovery);

  // Maps nav
  const btnGoMaps = document.getElementById('btn-go-maps');
  if (btnGoMaps) btnGoMaps.addEventListener('click', goToGoogleMaps);

  // Payment
  const btnPayment = document.getElementById('btn-confirm-payment');
  if (btnPayment) btnPayment.addEventListener('click', confirmPayment);

  // Save
  const btnSave = document.getElementById('btn-save-place');
  if (btnSave) btnSave.addEventListener('click', saveCurrentPlace);

  // Plan toggle
  document.querySelectorAll('.plan-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.plan-toggle-btn').forEach(b => {
        b.style.background = 'transparent'; b.style.color = 'var(--text-secondary)';
      });
      btn.style.background = 'var(--accent)'; btn.style.color = '#fff';
      state.selectedPlan = btn.dataset.plan;
      const totalEl = document.getElementById('checkout-total');
      const billingEl = document.getElementById('checkout-billing');
      if (state.selectedPlan === 'annual') {
        if (totalEl) totalEl.textContent = '200.00 CHF';
        if (billingEl) billingEl.textContent = 'Billed Annually';
      } else {
        if (totalEl) totalEl.textContent = '20.00 CHF';
        if (billingEl) billingEl.textContent = 'Billed Monthly';
      }
    });
  });

  // Distance unit toggle
  document.querySelectorAll('.unit-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.unit-toggle-btn').forEach(b => {
        b.style.background = 'transparent'; b.style.color = 'var(--text-secondary)';
      });
      btn.style.background = 'var(--accent)'; btn.style.color = '#fff';
      state.distanceUnit = btn.dataset.unit || 'meters';
      if (state.currentPlace && state.currentPlace.distKm !== undefined) {
        const distEl = document.getElementById('sheet-distance');
        if (distEl) distEl.textContent = formatDistance(state.currentPlace.distKm);
      }
    });
  });

  // Theme toggle
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      haptic(12);
      document.querySelectorAll('.theme-toggle-btn').forEach(b => {
        b.style.background = 'transparent'; b.style.color = 'var(--text-secondary)';
      });
      btn.style.background = 'var(--accent)'; btn.style.color = '#fff';
      applyTheme(btn.dataset.theme);
    });
  });
  // Set initial theme button state
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    if (btn.dataset.theme === state.theme) {
      btn.style.background = 'var(--accent)'; btn.style.color = '#fff';
    }
  });

  // Hide Google watermarks
  hideGoogleWatermarks();

  // Haptic on all buttons
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') || e.target.closest('.cat-btn') || e.target.closest('.nav-btn')) haptic(8);
  });

  // ---- AUTH GATE ----
  const authGate = document.getElementById('auth-gate');
  const loginOverlay = document.getElementById('login-overlay');
  const forgotOverlay = document.getElementById('forgot-overlay');

  document.getElementById('btn-try-free')?.addEventListener('click', () => {
    authGate.classList.add('hidden');
    // Trigger power zoom after gate dismissal
    setTimeout(initPowerZoom, 300);
  });

  document.getElementById('btn-open-login')?.addEventListener('click', () => loginOverlay.classList.add('open'));
  document.getElementById('btn-close-login')?.addEventListener('click', () => loginOverlay.classList.remove('open'));

  document.getElementById('btn-login-submit')?.addEventListener('click', () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) { showToast('Please fill in all fields'); return; }
    const btn = document.getElementById('btn-login-submit');
    btn.textContent = 'Signing in...'; btn.disabled = true;
    setTimeout(() => {
      loginOverlay.classList.remove('open');
      authGate.classList.add('hidden');
      btn.textContent = 'SIGN IN'; btn.disabled = false;
      showToast('Welcome back, Explorer!');
      setTimeout(initPowerZoom, 300);
    }, 1500);
  });

  document.getElementById('btn-open-forgot')?.addEventListener('click', () => forgotOverlay.classList.add('open'));
  document.getElementById('btn-close-forgot')?.addEventListener('click', () => {
    forgotOverlay.classList.remove('open');
    document.getElementById('forgot-confirm-msg').classList.add('hidden');
  });
  document.getElementById('btn-forgot-submit')?.addEventListener('click', () => {
    const email = document.getElementById('forgot-email').value.trim();
    if (!email) { showToast('Please enter your email address'); return; }
    const btn = document.getElementById('btn-forgot-submit');
    btn.textContent = 'Sending...'; btn.disabled = true;
    setTimeout(() => {
      btn.textContent = 'SEND RECOVERY LINK'; btn.disabled = false;
      document.getElementById('forgot-confirm-msg').classList.remove('hidden');
    }, 1500);
  });

  // ---- PROFILE SAVE ----
  document.getElementById('btn-save-profile')?.addEventListener('click', () => {
    const pw = document.getElementById('profile-password').value;
    const pwConfirm = document.getElementById('profile-password-confirm').value;
    if (pw && pw !== pwConfirm) { showToast('Passwords do not match'); return; }
    const btn = document.getElementById('btn-save-profile');
    btn.textContent = 'Saving...'; btn.disabled = true;
    setTimeout(() => {
      const nameInput = document.getElementById('profile-fullname');
      const displayName = document.getElementById('profile-display-name');
      if (nameInput && displayName && nameInput.value.trim()) displayName.textContent = nameInput.value.trim();
      btn.textContent = 'SAVE CHANGES'; btn.disabled = false;
      showToast('Profile updated successfully');
    }, 1200);
  });

  console.log('Wanderlost Depth-First Engine — Initialized');
});

// Neural canvas init
document.addEventListener('DOMContentLoaded', () => { setTimeout(initNeuralCanvas, 500); });

// Spin keyframe for loading
(function() {
  const s = document.createElement('style');
  s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);
})();
