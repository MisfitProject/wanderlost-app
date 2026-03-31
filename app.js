// ============================================================
// Wanderlost App — Motion Engine Edition
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
  theme: localStorage.getItem('wanderlost-theme') || 'light',
  sheetState: 'hidden' // 'hidden' | 'expanded' | 'collapsed'
};

// ============================================================
// SPRING PHYSICS SOLVER
// ============================================================
function springAnimate(from, to, config, onUpdate, onComplete) {
  const { stiffness = 200, damping = 0.7 } = config;
  let velocity = 0;
  let current = from;
  const mass = 1;
  const dampingForce = damping * 2 * Math.sqrt(stiffness * mass);
  let lastTime = performance.now();
  let raf;
  function step(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.064);
    lastTime = now;
    const springForce = -stiffness * (current - to);
    const dampForce = -dampingForce * velocity;
    const acceleration = (springForce + dampForce) / mass;
    velocity += acceleration * dt;
    current += velocity * dt;
    onUpdate(current);
    if (Math.abs(current - to) < 0.5 && Math.abs(velocity) < 0.5) {
      onUpdate(to);
      if (onComplete) onComplete();
      return;
    }
    raf = requestAnimationFrame(step);
  }
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

// ============================================================
// HAPTIC VIBRATION
// ============================================================
function haptic(duration = 10) {
  if (navigator.vibrate) navigator.vibrate(duration);
}

// Get category color
function getCategoryColor(type) {
  if (!type) return CATEGORY_COLORS.default;
  const key = type.toLowerCase().replace(/[^a-z]/g, '');
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.default;
}

// ============================================================
// TAB NAVIGATION
// ============================================================
function switchTab(tabId) {
  // Hide all tabs
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  // Show target
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
  // Update nav buttons — floating glass dock with glow indicator
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const glowEl = btn.querySelector('.bg-accent\\/15');
    if (btn.dataset.tab === tabId) {
      btn.classList.remove('text-[#5F5E5E]', 'opacity-70');
      btn.classList.add('text-accent');
      btn.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 1";
      if (glowEl) glowEl.style.display = 'block';
    } else {
      btn.classList.add('text-[#5F5E5E]', 'opacity-70');
      btn.classList.remove('text-accent');
      btn.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 0";
      if (glowEl) glowEl.style.display = 'none';
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
// DISTANCE FORMATTING
// ============================================================
function formatDistance(distKm) {
  if (state.distanceUnit === 'feet') {
    const feet = distKm * 3280.84;
    if (feet < 5280) {
      return Math.round(feet) + ' ft away';
    } else {
      return (feet / 5280).toFixed(1) + ' mi away';
    }
  } else {
    if (distKm < 1) {
      return Math.round(distKm * 1000) + ' m away';
    } else {
      return distKm.toFixed(1) + ' km away';
    }
  }
}

// ============================================================
// DISCOVERY SHEET — SPRING MORPH + DRAG-TO-DISMISS
// ============================================================
let cancelSheetSpring = null;

function openDiscoverySheet() {
  const sheet = document.getElementById('discovery-sheet');
  sheet.classList.remove('collapsed');
  state.sheetState = 'expanded';
  haptic(15);
  
  // Apply category color glow
  if (state.currentPlace) {
    const color = getCategoryColor(state.currentPlace.type);
    sheet.querySelector('.glow-category').style.boxShadow = 
      `0 -4px 12px rgba(0,0,0,0.03), 0 -16px 48px rgba(0,0,0,0.06), 0 0 40px ${color}33`;
    // Update sonar dot color
    const sonarDot = document.querySelector('#sonar-marker .bg-accent');
    if (sonarDot) sonarDot.style.backgroundColor = color;
    // Update pill content
    const pillTitle = document.getElementById('sheet-pill-title');
    const pillDist = document.getElementById('sheet-pill-distance');
    if (pillTitle) pillTitle.textContent = state.currentPlace.name;
    if (pillDist) pillDist.textContent = state.currentPlace.distance || '';
  }
  
  // Spring animate from off-screen to visible
  if (cancelSheetSpring) cancelSheetSpring();
  cancelSheetSpring = springAnimate(100, 0, { stiffness: 200, damping: 0.7 }, (v) => {
    sheet.style.transform = `translateY(${v}%)`;
  });
  
  // Trigger sonar burst
  triggerSonarBurst();
}

function closeDiscoverySheet() {
  const sheet = document.getElementById('discovery-sheet');
  state.sheetState = 'hidden';
  if (cancelSheetSpring) cancelSheetSpring();
  cancelSheetSpring = springAnimate(0, 100, { stiffness: 300, damping: 0.8 }, (v) => {
    sheet.style.transform = `translateY(${v}%)`;
  });
}

function collapseDiscoverySheet() {
  const sheet = document.getElementById('discovery-sheet');
  sheet.classList.add('collapsed');
  state.sheetState = 'collapsed';
  haptic(8);
}

function expandDiscoverySheet() {
  const sheet = document.getElementById('discovery-sheet');
  sheet.classList.remove('collapsed');
  state.sheetState = 'expanded';
  haptic(12);
}

// Sonar Burst Sync
function triggerSonarBurst() {
  const sonar = document.getElementById('sonar-marker');
  if (!sonar) return;
  sonar.classList.add('sonar-burst');
  setTimeout(() => sonar.classList.remove('sonar-burst'), 1600);
}

// Drag-to-dismiss setup
function initSheetDrag() {
  const handle = document.getElementById('sheet-drag-handle');
  const sheet = document.getElementById('discovery-sheet');
  if (!handle || !sheet) return;
  
  let startY = 0, currentTranslate = 0, dragging = false;
  
  function onStart(e) {
    dragging = true;
    startY = (e.touches ? e.touches[0].clientY : e.clientY);
    currentTranslate = 0;
    if (cancelSheetSpring) cancelSheetSpring();
    handle.style.cursor = 'grabbing';
  }
  
  function onMove(e) {
    if (!dragging) return;
    const y = (e.touches ? e.touches[0].clientY : e.clientY);
    const delta = y - startY;
    currentTranslate = Math.max(0, delta); // Only drag down
    const pct = (currentTranslate / window.innerHeight) * 100;
    sheet.style.transform = `translateY(${pct}%)`;
  }
  
  function onEnd(e) {
    if (!dragging) return;
    dragging = false;
    handle.style.cursor = 'grab';
    const pct = (currentTranslate / window.innerHeight) * 100;
    
    if (pct > 25) {
      // Dragged far enough — dismiss or collapse
      if (state.sheetState === 'expanded') {
        collapseDiscoverySheet();
        cancelSheetSpring = springAnimate(pct, 0, { stiffness: 250, damping: 0.7 }, (v) => {
          sheet.style.transform = `translateY(${v}%)`;
        });
      } else {
        closeDiscoverySheet();
      }
    } else {
      // Snap back
      cancelSheetSpring = springAnimate(pct, 0, { stiffness: 300, damping: 0.7 }, (v) => {
        sheet.style.transform = `translateY(${v}%)`;
      });
    }
  }
  
  handle.addEventListener('pointerdown', onStart);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onEnd);
  
  // Tap collapsed pill to expand
  sheet.addEventListener('click', (e) => {
    if (state.sheetState === 'collapsed' && !e.target.closest('button')) {
      expandDiscoverySheet();
    }
  });
}

// ============================================================
// CATEGORY SELECTION
// ============================================================
function selectCategory(btn) {
  haptic(10);
  // Update active styling — glass pills with blue active + glow
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.remove('bg-accent', 'text-white', 'border-accent/20', 'active-glow');
    b.classList.add('text-on-surface-variant');
    if (!b.classList.contains('glass')) b.classList.add('glass', 'glass-border');
  });
  btn.classList.remove('text-on-surface-variant', 'glass', 'glass-border');
  btn.classList.add('bg-accent', 'text-white', 'border-accent/20', 'active-glow');
  
  // Scroll selected into center
  btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  
  // Store selected category
  state.selectedCategory = btn.dataset.category || '';
}

// ============================================================
// HELP CENTER
// ============================================================
function toggleHelpItem(btn) {
  const item = btn.closest('.help-item');
  const answer = item.querySelector('.help-a');
  const chevron = btn.querySelector('.material-symbols-outlined');
  
  // Close other open items in same category
  const category = item.closest('.help-category');
  category.querySelectorAll('.help-item').forEach(other => {
    if (other !== item) {
      other.querySelector('.help-a').classList.add('hidden');
      const otherChevron = other.querySelector('.help-q .material-symbols-outlined');
      if (otherChevron) { otherChevron.style.transform = ''; otherChevron.textContent = 'chevron_right'; }
    }
  });
  
  // Toggle this item
  const isOpen = !answer.classList.contains('hidden');
  answer.classList.toggle('hidden');
  if (isOpen) {
    chevron.style.transform = '';
    chevron.textContent = 'chevron_right';
  } else {
    chevron.style.transform = 'rotate(90deg)';
    chevron.textContent = 'expand_more';
  }
}

function filterHelpItems(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.help-item').forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = !q || text.includes(q) ? '' : 'none';
  });
  // Show/hide category headers based on visible items
  document.querySelectorAll('.help-category').forEach(cat => {
    const visibleItems = cat.querySelectorAll('.help-item[style=""], .help-item:not([style])');
    const hasVisible = Array.from(cat.querySelectorAll('.help-item')).some(i => i.style.display !== 'none');
    cat.style.display = hasVisible ? '' : 'none';
  });
}

// ============================================================
// GOOGLE MAPS
// ============================================================
let map;
// Map Themes
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

window.initMap = function() {
  map = new google.maps.Map(document.getElementById('map-bg'), {
    center: { lat: 47.3769, lng: 8.5417 },
    zoom: 14,
    disableDefaultUI: true,
    styles: state.theme === 'dark' ? MAP_MIDNIGHT : MAP_SILVER
  });
};

// Add a marker to the map
function addMapMarker(place) {
  if (!map || !place.lat || !place.lng) return;
  const catColor = getCategoryColor(place.type);
  const marker = new google.maps.Marker({
    position: { lat: place.lat, lng: place.lng },
    map: map,
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
  // Click marker to show sheet
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
// AI DISCOVERY (Client-side using Maps JS Places Library)
// ============================================================
let placesService = null;

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

    // Center map on user
    if (map) {
      map.panTo({ lat: latitude, lng: longitude });
      map.setZoom(15);
    }

    // Show sonar
    sonar.classList.remove('hidden');

    btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span> Discovering...';

    // Initialize PlacesService if not already
    if (!placesService && map) {
      placesService = new google.maps.places.PlacesService(map);
    }

    if (!placesService) {
      throw new Error('Places service not available');
    }

    // Build search request
    const typeMap = {
      'restaurant': 'restaurant',
      'cafe': 'cafe',
      'bakery': 'bakery',
      'bar': 'bar',
      'park': 'park',
      'museum': 'museum'
    };

    const request = {
      location: new google.maps.LatLng(latitude, longitude),
      radius: 2000
    };

    if (state.selectedCategory && typeMap[state.selectedCategory]) {
      request.type = typeMap[state.selectedCategory];
    } else {
      request.keyword = 'hidden gem local favorite';
    }

    // Client-side Places nearbySearch
    const results = await new Promise((resolve, reject) => {
      placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          resolve(results);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          reject(new Error('Places search: ' + status));
        }
      });
    });

    if (results.length === 0) {
      showToast('No places found nearby. Try a different category!');
      btn.innerHTML = '<span class="material-symbols-outlined text-sm">explore</span> Discover Places';
      btn.disabled = false;
      return;
    }

    // Filter for > 4.0 stars
    let candidates = results.filter(p => (p.rating || 0) >= 4.0);
    if (candidates.length === 0) candidates = results;

    // Pick a random one
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
      lat: placeLat,
      lng: placeLng,
      discoveredAt: new Date()
    };

    // Update sheet
    document.getElementById('sheet-title').textContent = state.currentPlace.name;
    document.getElementById('sheet-tag').textContent = state.currentPlace.type;
    document.getElementById('sheet-address').textContent = state.currentPlace.address;
    document.getElementById('sheet-distance').textContent = state.currentPlace.distance;
    document.getElementById('sheet-desc').textContent = state.currentPlace.description;

    // Add marker on map
    addMapMarker(state.currentPlace);

    // Pan map to discovered place
    if (map) map.panTo({ lat: placeLat, lng: placeLng });

    openDiscoverySheet();
    addToHistory(state.currentPlace);

    if (!state.isSubscribed) {
      state.discoveriesRemaining--;
      document.getElementById('discovery-counter').textContent = 
        state.discoveriesRemaining + ' Free Discover' + (state.discoveriesRemaining === 1 ? 'y' : 'ies');
    }
  } catch (err) {
    console.error('Discovery error:', err);
    showToast('Could not discover places. Check your location permissions.');
  }

  // Reset button
  btn.innerHTML = '<span class="material-symbols-outlined text-sm">explore</span> Discover Places';
  btn.disabled = false;
}

// Haversine distance in km
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
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
  const { lat, lng, name, address } = state.currentPlace;
  const encodedName = encodeURIComponent(name || 'Discovery');
  const searchQuery = encodeURIComponent((name || '') + ' ' + (address || ''));
  let mapUrl;
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    mapUrl = `http://maps.apple.com/?q=${encodedName}&ll=${lat},${lng}`;
  } else {
    // Use place name + address as query so Maps shows the actual place listing
    mapUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
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
// INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {


  // Discover button
  const btnDiscover = document.getElementById('btn-discover');
  if (btnDiscover) btnDiscover.addEventListener('click', runDiscovery);

  // Go to Maps button
  const btnGoMaps = document.getElementById('btn-go-maps');
  if (btnGoMaps) btnGoMaps.addEventListener('click', goToGoogleMaps);

  // Payment button
  const btnPayment = document.getElementById('btn-confirm-payment');
  if (btnPayment) btnPayment.addEventListener('click', confirmPayment);

  // Save button on discovery sheet
  const btnSave = document.getElementById('btn-save-place');
  if (btnSave) btnSave.addEventListener('click', saveCurrentPlace);

  // Checkout plan toggle
  document.querySelectorAll('.plan-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.plan-toggle-btn').forEach(b => {
        b.classList.remove('bg-accent', 'text-white');
        b.classList.add('text-secondary');
      });
      btn.classList.add('bg-accent', 'text-white');
      btn.classList.remove('text-secondary');
      state.selectedPlan = btn.dataset.plan;
      // Update total
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
        b.classList.remove('bg-accent', 'text-white');
        b.classList.add('text-secondary');
      });
      btn.classList.add('bg-accent', 'text-white');
      btn.classList.remove('text-secondary');
      state.distanceUnit = btn.dataset.unit || 'meters';
      // Live-update the currently shown discovery distance
      if (state.currentPlace && state.currentPlace.distKm !== undefined) {
        const distEl = document.getElementById('sheet-distance');
        if (distEl) distEl.textContent = formatDistance(state.currentPlace.distKm);
      }
    });
  });

  // Hide Google watermarks
  hideGoogleWatermarks();

  // ============================================================
  // THEME TOGGLE (Light/Dark)
  // ============================================================
  function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem('wanderlost-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#0D1117' : '#F9F9F9';
    // Update map style
    if (map) map.setOptions({ styles: theme === 'dark' ? MAP_MIDNIGHT : MAP_SILVER });
    // Update filter UI grayscale
    const mapBg = document.getElementById('map-bg');
    if (mapBg) mapBg.style.filter = theme === 'dark' ? 'none' : 'grayscale(100%) contrast(1.05)';
  }
  // Apply saved theme on load
  applyTheme(state.theme);
  
  // Theme toggle buttons
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      haptic(12);
      document.querySelectorAll('.theme-toggle-btn').forEach(b => {
        b.classList.remove('bg-accent', 'text-white');
        b.classList.add('text-secondary');
      });
      btn.classList.add('bg-accent', 'text-white');
      btn.classList.remove('text-secondary');
      applyTheme(btn.dataset.theme);
    });
  });
  // Set initial toggle state
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    if (btn.dataset.theme === state.theme) {
      btn.classList.add('bg-accent', 'text-white');
      btn.classList.remove('text-secondary');
    } else {
      btn.classList.remove('bg-accent', 'text-white');
      btn.classList.add('text-secondary');
    }
  });

  // ============================================================
  // DRAG-TO-DISMISS SHEET INIT
  // ============================================================
  initSheetDrag();

  // ============================================================
  // HAPTIC VIBRATION ON ALL BUTTONS
  // ============================================================
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') || e.target.closest('.cat-btn') || e.target.closest('.nav-btn')) {
      haptic(8);
    }
  });

  // ============================================================
  // AUTH GATE
  // ============================================================
  const authGate = document.getElementById('auth-gate');
  const loginOverlay = document.getElementById('login-overlay');
  const forgotOverlay = document.getElementById('forgot-overlay');

  // "Try for Free" — dismiss the gate
  const btnTryFree = document.getElementById('btn-try-free');
  if (btnTryFree) btnTryFree.addEventListener('click', () => {
    authGate.classList.add('hidden');
  });

  // "Log In" — show login overlay
  const btnOpenLogin = document.getElementById('btn-open-login');
  if (btnOpenLogin) btnOpenLogin.addEventListener('click', () => {
    loginOverlay.classList.add('open');
  });

  // Back from login
  const btnCloseLogin = document.getElementById('btn-close-login');
  if (btnCloseLogin) btnCloseLogin.addEventListener('click', () => {
    loginOverlay.classList.remove('open');
  });

  // Login submit
  const btnLoginSubmit = document.getElementById('btn-login-submit');
  if (btnLoginSubmit) btnLoginSubmit.addEventListener('click', () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) {
      showToast('Please fill in all fields');
      return;
    }
    btnLoginSubmit.textContent = 'Signing in...';
    btnLoginSubmit.disabled = true;
    setTimeout(() => {
      loginOverlay.classList.remove('open');
      authGate.classList.add('hidden');
      btnLoginSubmit.textContent = 'SIGN IN';
      btnLoginSubmit.disabled = false;
      showToast('Welcome back, Explorer!');
    }, 1500);
  });

  // "Forgot my password"
  const btnOpenForgot = document.getElementById('btn-open-forgot');
  if (btnOpenForgot) btnOpenForgot.addEventListener('click', () => {
    forgotOverlay.classList.add('open');
  });

  // Back from forgot
  const btnCloseForgot = document.getElementById('btn-close-forgot');
  if (btnCloseForgot) btnCloseForgot.addEventListener('click', () => {
    forgotOverlay.classList.remove('open');
    document.getElementById('forgot-confirm-msg').classList.add('hidden');
  });

  // Forgot submit
  const btnForgotSubmit = document.getElementById('btn-forgot-submit');
  if (btnForgotSubmit) btnForgotSubmit.addEventListener('click', () => {
    const email = document.getElementById('forgot-email').value.trim();
    if (!email) {
      showToast('Please enter your email address');
      return;
    }
    btnForgotSubmit.textContent = 'Sending...';
    btnForgotSubmit.disabled = true;
    setTimeout(() => {
      btnForgotSubmit.textContent = 'SEND RECOVERY LINK';
      btnForgotSubmit.disabled = false;
      document.getElementById('forgot-confirm-msg').classList.remove('hidden');
    }, 1500);
  });

  // ============================================================
  // PROFILE SAVE
  // ============================================================
  const btnSaveProfile = document.getElementById('btn-save-profile');
  if (btnSaveProfile) btnSaveProfile.addEventListener('click', () => {
    const pw = document.getElementById('profile-password').value;
    const pwConfirm = document.getElementById('profile-password-confirm').value;
    if (pw && pw !== pwConfirm) {
      showToast('Passwords do not match');
      return;
    }
    btnSaveProfile.textContent = 'Saving...';
    btnSaveProfile.disabled = true;
    setTimeout(() => {
      // Update the profile display name
      const nameInput = document.getElementById('profile-fullname');
      const displayName = document.getElementById('profile-display-name');
      if (nameInput && displayName && nameInput.value.trim()) {
        displayName.textContent = nameInput.value.trim();
      }
      btnSaveProfile.textContent = 'SAVE CHANGES';
      btnSaveProfile.disabled = false;
      showToast('Profile updated successfully');
    }, 1200);
  });

  console.log('Wanderlost Stitch Edition — Initialized');
});

// Save place
function saveCurrentPlace() {
  if (!state.currentPlace) return;
  const btn = document.getElementById('btn-save-place');
  if (state.savedPlaces.find(p => p.name === state.currentPlace.name)) {
    btn.innerHTML = '<span class="material-symbols-outlined text-sm">check</span> Already Saved';
    return;
  }
  state.savedPlaces.push({ ...state.currentPlace });
  btn.innerHTML = '<span class="material-symbols-outlined text-sm">bookmark_added</span> Saved!';
  setTimeout(() => {
    btn.innerHTML = '<span class="material-symbols-outlined text-sm">bookmark</span> Save';
  }, 2000);
}

// Toast notification
function showToast(message) {
  const existing = document.getElementById('app-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.id = 'app-toast';
  toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-[999] glass glass-border text-on-surface px-6 py-3 text-sm font-body tracking-wide shadow-xl max-w-sm text-center transition-all duration-500 rounded-full';
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(-50%) translateY(-10px)';
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
// NEURAL NETWORK CANVAS OVERLAY
// ============================================================
function initNeuralCanvas() {
  const canvas = document.getElementById('neural-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let nodes = [];
  let animFrame;

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
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2,
        speed: 0.003 + Math.random() * 0.004
      });
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw connections (fiber-optic threads)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const alpha = (1 - dist / 120) * 0.4;
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.shadowColor = 'rgba(56, 182, 255, 0.15)';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.shadowBlur = 0;

    // Draw nodes (frosted glass spheres with pulsing cores)
    for (const node of nodes) {
      const scale = 1 + 0.05 * Math.sin(t * node.speed * 2 + node.phase);
      const r = node.r * scale;

      // Outer frosted sphere
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fill();

      // Inner glowing core
      const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r);
      gradient.addColorStop(0, node.color);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    animFrame = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw(0);
}

// Initialize neural canvas after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initNeuralCanvas, 500);
});
