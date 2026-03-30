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
  activeTab: 'tab-explore',
  selectedCategory: '',
  savedPlaces: [],
  markers: [],
  selectedPlan: 'monthly'
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
// CATEGORY SELECTION
// ============================================================
function selectCategory(btn) {
  // Update active styling
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.remove('bg-primary-container', 'text-on-primary-container', 'border-primary/20');
    b.classList.add('bg-surface/80', 'backdrop-blur-md', 'border-outline-variant/30', 'text-on-surface-variant');
  });
  btn.classList.remove('bg-surface/80', 'backdrop-blur-md', 'border-outline-variant/30', 'text-on-surface-variant');
  btn.classList.add('bg-primary-container', 'text-on-primary-container', 'border-primary/20');
  
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
window.initMap = function() {
  map = new google.maps.Map(document.getElementById('map-bg'), {
    center: { lat: 47.3769, lng: 8.5417 },
    zoom: 14,
    disableDefaultUI: true,
    styles: [
      {elementType:'geometry',stylers:[{color:'#f5f5f5'}]},
      {elementType:'labels.icon',stylers:[{visibility:'off'}]},
      {elementType:'labels.text.fill',stylers:[{color:'#616161'}]},
      {elementType:'labels.text.stroke',stylers:[{color:'#f5f5f5'}]},
      {featureType:'administrative.land_parcel',elementType:'labels.text.fill',stylers:[{color:'#bdbdbd'}]},
      {featureType:'poi',elementType:'geometry',stylers:[{color:'#eeeeee'}]},
      {featureType:'poi',elementType:'labels.text.fill',stylers:[{color:'#757575'}]},
      {featureType:'poi.park',elementType:'geometry',stylers:[{color:'#e5e5e5'}]},
      {featureType:'road',elementType:'geometry',stylers:[{color:'#ffffff'}]},
      {featureType:'road.arterial',elementType:'labels.text.fill',stylers:[{color:'#757575'}]},
      {featureType:'road.highway',elementType:'geometry',stylers:[{color:'#dadada'}]},
      {featureType:'road.local',elementType:'labels.text.fill',stylers:[{color:'#9e9e9e'}]},
      {featureType:'transit.line',elementType:'geometry',stylers:[{color:'#e5e5e5'}]},
      {featureType:'water',elementType:'geometry',stylers:[{color:'#c9c9c9'}]},
      {featureType:'water',elementType:'labels.text.fill',stylers:[{color:'#9e9e9e'}]}
    ]
  });
};

// Add a marker to the map
function addMapMarker(place) {
  if (!map || !place.lat || !place.lng) return;
  const marker = new google.maps.Marker({
    position: { lat: place.lat, lng: place.lng },
    map: map,
    title: place.name,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: '#D4AF37',
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
      distance: dist < 1 ? Math.round(dist * 1000) + 'm away' : dist.toFixed(1) + 'km away',
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
        b.classList.remove('bg-surface-container-lowest', 'text-on-surface');
        b.classList.add('text-secondary');
      });
      btn.classList.add('bg-surface-container-lowest', 'text-on-surface');
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
        b.classList.remove('bg-surface-container-highest', 'text-on-surface');
        b.classList.add('text-secondary');
      });
      btn.classList.add('bg-surface-container-highest', 'text-on-surface');
      btn.classList.remove('text-secondary');
    });
  });

  // Hide Google watermarks
  hideGoogleWatermarks();

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
  toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-[999] bg-on-surface text-surface px-6 py-3 text-sm font-body tracking-wide shadow-xl max-w-sm text-center transition-all duration-500';
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
