// ============================================================
// Wanderlost App — Pure Stitch Edition
// ============================================================

const BACKEND_URL = 'https://wanderlost-app.onrender.com';

// State
const state = {
  discoveriesRemaining: 3,
  isSubscribed: false,
  currentPlace: null,
  history: [],
  activeTab: 'tab-explore'
};

// ============================================================
// TAB NAVIGATION
// ============================================================
function switchTab(tabId) {
  // Hide all tabs
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  // Show target
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.classList.remove('text-[#5F5E5E]', 'opacity-70');
      btn.classList.add('text-[#735C00]');
      btn.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 1";
      btn.querySelector('span:last-child').classList.add('font-bold');
    } else {
      btn.classList.add('text-[#5F5E5E]', 'opacity-70');
      btn.classList.remove('text-[#735C00]');
      btn.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 0";
      btn.querySelector('span:last-child').classList.remove('font-bold');
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
  // Restore scroll if no other modals are open
  const anyOpen = document.querySelector('.modal-slide.open');
  if (!anyOpen) document.body.style.overflow = '';
}

// ============================================================
// DISCOVERY BOTTOM SHEET
// ============================================================
function openDiscoverySheet() {
  document.getElementById('discovery-sheet').classList.add('open');
}

function closeDiscoverySheet() {
  document.getElementById('discovery-sheet').classList.remove('open');
}

// ============================================================
// GOOGLE MAPS
// ============================================================
let map;
window.initMap = function() {
  map = new google.maps.Map(document.getElementById('map-bg'), {
    center: { lat: 47.3769, lng: 8.5417 },
    zoom: 14,
    disableDefaultUI: true,
    styles: [
      {elementType:'geometry',stylers:[{color:'#ebe3cd'}]},
      {elementType:'labels.text.fill',stylers:[{color:'#523735'}]},
      {elementType:'labels.text.stroke',stylers:[{color:'#f5f1e6'}]},
      {featureType:'administrative',elementType:'geometry.stroke',stylers:[{color:'#c9b2a6'}]},
      {featureType:'landscape.natural',elementType:'geometry',stylers:[{color:'#dfd2ae'}]},
      {featureType:'poi',elementType:'geometry',stylers:[{color:'#dfd2ae'},{visibility:'off'}]},
      {featureType:'poi.park',elementType:'geometry.fill',stylers:[{color:'#a5b076'}]},
      {featureType:'road',elementType:'geometry',stylers:[{color:'#f5f1e6'}]},
      {featureType:'road.arterial',elementType:'geometry',stylers:[{color:'#fdfcf8'}]},
      {featureType:'road.highway',elementType:'geometry',stylers:[{color:'#f8c967'}]},
      {featureType:'road.highway',elementType:'geometry.stroke',stylers:[{color:'#e9bc62'}]},
      {featureType:'water',elementType:'geometry.fill',stylers:[{color:'#b9d3c2'}]},
      {featureType:'water',elementType:'labels.text.fill',stylers:[{color:'#92998d'}]}
    ]
  });
};

// Hide Google Maps watermarks
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
// AI DISCOVERY
// ============================================================
async function runDiscovery() {
  const btn = document.getElementById('btn-discover');
  const sonar = document.getElementById('sonar-marker');
  
  if (!state.isSubscribed && state.discoveriesRemaining <= 0) {
    openModal('modal-premium');
    return;
  }

  btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span> Scanning...';
  btn.disabled = true;

  try {
    // Get GPS
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true, timeout: 10000
      });
    });

    const { latitude, longitude } = position.coords;

    // Center map
    if (map) {
      map.panTo({ lat: latitude, lng: longitude });
      map.setZoom(15);
    }

    // Show sonar
    sonar.classList.remove('hidden');

    btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span> Discovering...';

    // Call backend
    const response = await fetch(`${BACKEND_URL}/api/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: latitude, lng: longitude })
    });

    const result = await response.json();

    if (result.place) {
      state.currentPlace = {
        ...result.place,
        lat: latitude,
        lng: longitude,
        discoveredAt: new Date()
      };

      // Update sheet
      document.getElementById('sheet-title').textContent = result.place.name || 'Hidden Gem';
      document.getElementById('sheet-tag').textContent = result.place.type || 'Discovery';
      document.getElementById('sheet-address').textContent = result.place.address || 'Nearby';
      document.getElementById('sheet-distance').textContent = result.place.distance || 'Close by';
      document.getElementById('sheet-desc').textContent = result.place.description || 'A local favorite worth exploring.';

      openDiscoverySheet();

      // Add to history
      addToHistory(state.currentPlace);

      // Decrement counter
      if (!state.isSubscribed) {
        state.discoveriesRemaining--;
        document.getElementById('discovery-counter').textContent = 
          state.discoveriesRemaining + ' Free Discover' + (state.discoveriesRemaining === 1 ? 'y' : 'ies');
      }
    }
  } catch (err) {
    console.error('Discovery error:', err);
    // Fallback with demo data
    state.currentPlace = {
      name: 'The Artisanal Hearth',
      type: 'Bakery',
      address: 'Near your current location',
      distance: 'Within walking distance',
      description: 'A local favorite with handmade pastries and artisan bread.',
      lat: 47.3769,
      lng: 8.5417,
      discoveredAt: new Date()
    };
    document.getElementById('sheet-title').textContent = state.currentPlace.name;
    document.getElementById('sheet-tag').textContent = state.currentPlace.type;
    document.getElementById('sheet-address').textContent = state.currentPlace.address;
    document.getElementById('sheet-distance').textContent = state.currentPlace.distance;
    document.getElementById('sheet-desc').textContent = state.currentPlace.description;
    openDiscoverySheet();
    addToHistory(state.currentPlace);
    if (!state.isSubscribed) {
      state.discoveriesRemaining--;
      document.getElementById('discovery-counter').textContent = 
        state.discoveriesRemaining + ' Free Discover' + (state.discoveriesRemaining === 1 ? 'y' : 'ies');
    }
  }

  // Reset button
  btn.innerHTML = '<span class="material-symbols-outlined text-sm">explore</span> Discover Places';
  btn.disabled = false;
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
      <div class="group flex flex-col md:flex-row gap-6 items-start">
        <div class="w-full md:w-32 h-32 bg-surface-container-high overflow-hidden flex items-center justify-center">
          <span class="material-symbols-outlined text-4xl text-outline-variant">location_on</span>
        </div>
        <div class="flex-1 border-b border-outline-variant/20 pb-6 w-full">
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-serif-title text-2xl text-on-surface group-hover:text-primary transition-colors">${place.name}</h4>
            <span class="text-[10px] tracking-[0.1em] font-label text-secondary uppercase px-2 py-1 bg-surface-container">${place.type || 'Discovery'}</span>
          </div>
          <p class="text-secondary text-sm mb-4 font-body leading-relaxed">${place.description || ''}</p>
          <div class="flex items-center text-[11px] text-outline uppercase tracking-widest font-label">
            <span class="material-symbols-outlined text-xs mr-2">calendar_today</span>${date}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// GOOGLE MAPS NAVIGATION
// ============================================================
function goToGoogleMaps() {
  if (!state.currentPlace) return;
  const { lat, lng, name } = state.currentPlace;
  const encodedName = encodeURIComponent(name || 'Discovery');
  let mapUrl;
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    mapUrl = `http://maps.apple.com/?q=${encodedName}&ll=${lat},${lng}`;
  } else {
    mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  window.open(mapUrl, '_blank');
  closeDiscoverySheet();
}

// ============================================================
// PAYMENT
// ============================================================
function confirmPayment() {
  const form = document.getElementById('checkout-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }

  const btn = document.getElementById('btn-confirm-payment');
  btn.textContent = 'Verifying...';
  btn.disabled = true;

  setTimeout(() => {
    btn.textContent = 'Authorized ✓';
    state.isSubscribed = true;
    state.discoveriesRemaining = 999;

    setTimeout(() => {
      closeModal('modal-checkout');
      document.getElementById('discovery-counter').textContent = 'Premium Active';
      btn.textContent = 'Confirm Payment';
      btn.disabled = false;
    }, 1200);
  }, 2000);
}

// ============================================================
// WELCOME FLOW
// ============================================================
function dismissWelcome() {
  const splash = document.getElementById('welcome-splash');
  splash.style.opacity = '0';
  splash.style.pointerEvents = 'none';
  setTimeout(() => splash.remove(), 1000);
}

// ============================================================
// INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  // Welcome button
  const btnBegin = document.getElementById('btn-begin');
  if (btnBegin) btnBegin.addEventListener('click', dismissWelcome);

  // Discover button
  const btnDiscover = document.getElementById('btn-discover');
  if (btnDiscover) btnDiscover.addEventListener('click', runDiscovery);

  // Go to Maps button
  const btnGoMaps = document.getElementById('btn-go-maps');
  if (btnGoMaps) btnGoMaps.addEventListener('click', goToGoogleMaps);

  // Payment button
  const btnPayment = document.getElementById('btn-confirm-payment');
  if (btnPayment) btnPayment.addEventListener('click', confirmPayment);

  // Hide Google watermarks
  hideGoogleWatermarks();

  console.log('Wanderlost Stitch Edition — Initialized');
});
