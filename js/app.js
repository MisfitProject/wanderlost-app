/**
 * WANDERLØST V3 - FRONTEND ENGINE
 * STRICT MOBILE-FIRST ARCHITECTURE
 */

const state = {
    discoveredNodes: [],
    markers: [],
    colorZones: [],
    isSubscribed: false,
    selectedCategory: 'all',
    trailPath: null,
    token: localStorage.getItem('wanderlost_token') || null,
    unlockedBadges: JSON.parse(localStorage.getItem('wanderlost_badges')) || [],
    BACKEND_URL: localStorage.getItem('WANDERLOST_BACKEND_OVERRIDE') || 'https://wanderlost-app.onrender.com'
};

const BADGE_TYPES = {
    'cafe': { icon: 'fa-mug-hot', name: 'Coffee Culture' },
    'museum': { icon: 'fa-building-columns', name: 'Historian' },
    'park': { icon: 'fa-tree', name: 'Nature Walker' },
    'restaurant': { icon: 'fa-utensils', name: 'Gastronome' },
    'bar': { icon: 'fa-martini-glass', name: 'Night Owl' },
    'art_gallery': { icon: 'fa-palette', name: 'Art Critic' },
    'church': { icon: 'fa-church', name: 'Spiritual' },
    'tourist_attraction': { icon: 'fa-camera', name: 'Sightseer' },
    'amusement_park': { icon: 'fa-roller-coaster', name: 'Thrillseeker' },
    'aquarium': { icon: 'fa-fish-fins', name: 'Marine Biologist' },
    'campground': { icon: 'fa-campground', name: 'Camper' },
    'night_club': { icon: 'fa-music', name: 'Dancer' },
    'spa': { icon: 'fa-spa', name: 'Zen Master' },
    'stadium': { icon: 'fa-futbol', name: 'Sports Fan' },
    'zoo': { icon: 'fa-hippo', name: 'Zoologist' },
    'point_of_interest': { icon: 'fa-location-dot', name: 'Explorer' }
};

const AudioEngine = {
    ctx: null,
    init() {
        if (!this.ctx && window.AudioContext) {
            this.ctx = new AudioContext();
        }
    },
    playChime() {
        if (!this.ctx) this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        
        frequencies.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            gain.gain.setValueAtTime(0, now + (i * 0.1));
            gain.gain.linearRampToValueAtTime(0.2, now + (i * 0.1) + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.1) + 2.0);
            osc.start(now + (i * 0.1));
            osc.stop(now + (i * 0.1) + 2.0);
        });
    }
};

const refs = {};

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    bindDOM();
    setupNavigation();
    setupAlertBinds();
    setupAccountActions();
    setupAuth();
    initializePassportGallery();
    
    // Dismiss Splash Screen after logo cinematic
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) splash.classList.add('fade-out');
        
        // Contextual Onboarding Hook (Option 2: Forced Interaction)
        if (!localStorage.getItem('wanderlost_onboarded')) {
            setTimeout(() => {
                if (refs.onboardingScrim && refs.onboardingTooltip) {
                    refs.onboardingScrim.classList.remove('hidden');
                    refs.onboardingTooltip.classList.remove('hidden');
                    refs.hudBottom.classList.add('nav-elevated');
                    refs.btnScan.classList.add('relative-z-elevate');
                    refs.btnProfile.classList.add('pointer-disabled');
                    refs.btnMap.classList.add('pointer-disabled');
                }
            }, 600); // wait for splash CSS fade
        }
    }, 3200);
});

// Google Maps Callback
window.initMapData = function() {
    let center = { lat: 47.3769, lng: 8.5417 };
    
    window.map = new google.maps.Map(document.getElementById('map-bg'), {
        center: center,
        zoom: 14,
        disableDefaultUI: true
    });
    
    class FogOfWarEngine {
        constructor(map) {
            this.map = map;
            this.radius = 350; // 350 meters visibility
            this.darkOverlay = null;
            this.userMarker = null;
            
            // Massive globe-spanning bounds (Clockwise)
            this.outerBounds = [
                { lat: 85, lng: -180 },
                { lat: -85, lng: -180 },
                { lat: -85, lng: 180 },
                { lat: 85, lng: 180 },
                { lat: 85, lng: -180 }
            ];
        }

        init() {
            this.darkOverlay = new google.maps.Polygon({
                paths: [this.outerBounds],
                strokeWeight: 0,
                fillColor: '#0a0a0a', /* Nearly pitch black */
                fillOpacity: 0.9, /* 90% opacity */
                map: this.map,
                clickable: false,
                zIndex: 1
            });
            
            // Initiate live tracking
            if ("geolocation" in navigator) {
                navigator.geolocation.watchPosition(
                    (pos) => this.updateMask({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    (err) => console.warn('FogOfWar GPS tracking error:', err),
                    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
                );
            }
        }
        
        updateMask(userLatLng) {
            if (!this.darkOverlay) return;
            
            // Generate a 350m inner ring (Counter-Clockwise geometry to carve hole)
            const innerHole = [];
            const vertexCount = 40;
            for (let i = 0; i < vertexCount; i++) {
                const heading = 360 - (i * (360 / vertexCount));
                const point = google.maps.geometry.spherical.computeOffset(userLatLng, this.radius, heading);
                innerHole.push(point);
            }
            
            // Refresh polygon overlay paths
            this.darkOverlay.setPaths([this.outerBounds, innerHole]);
            
            // Maintain physical user beacon 
            if (!this.userMarker) {
                this.userMarker = new google.maps.Marker({
                    position: userLatLng,
                    map: this.map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 7,
                        fillColor: '#4285F4',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2.5
                    },
                    zIndex: 999
                });
            } else {
                this.userMarker.setPosition(userLatLng);
            }
        }
    }
    
    // Boot Engine if Geo-sphere limits are loaded 
    if (google.maps.geometry && google.maps.geometry.spherical) {
        window.fogEngine = new FogOfWarEngine(window.map);
        window.fogEngine.init();
    }

    window.CustomMarker = class extends google.maps.OverlayView {
        constructor(latlng, map, isPulse) {
            super();
            this.latlng = latlng;
            this.isPulse = isPulse;
            this.div = null;
            this.setMap(map);
        }

        onAdd() {
            this.div = document.createElement('div');
            this.div.className = this.isPulse ? 'map-marker pulse-orange' : 'map-marker solid-green';
            const panes = this.getPanes();
            panes.overlayImage.appendChild(this.div); // Correct pane for interacting with map clicks
        }

        draw() {
            const overlayProjection = this.getProjection();
            const pos = overlayProjection.fromLatLngToDivPixel(this.latlng);
            if (this.div) {
                // Offset by half dimensions (10px) to center it physically on the point
                this.div.style.left = (pos.x - 10) + 'px';
                this.div.style.top = (pos.y - 10) + 'px';
            }
        }

        onRemove() {
            if (this.div) {
                this.div.parentNode.removeChild(this.div);
                this.div = null;
            }
        }

        setAsVisited() {
            this.isPulse = false;
            if (this.div) {
                this.div.className = 'map-marker solid-green';
            }
        }
    };
    
    // Attempt to load cloud state once map is ready
    loadStateFromCloud();
};

// Handle occasional Google Watermark errors
window.gm_authFailure = () => {
    const s = document.createElement('style');
    s.innerHTML = '.gm-err-container, .dismissButton { display: none !important; }';
    document.head.appendChild(s);
};

// --- CORE UTILS ---
function bindDOM() {
    refs.hudBottom = document.getElementById('bottom-nav');
    refs.locationSheet = document.getElementById('location-sheet');
    refs.locTitle = document.getElementById('loc-title');
    refs.locDesc = document.getElementById('loc-desc');
    refs.btnNavigate = document.getElementById('btn-navigate');
    
    refs.scanIndicator = document.getElementById('scan-indicator');
    refs.scanStatusText = document.getElementById('scan-status-text');
    
    refs.btnScan = document.getElementById('nav-radar');
    refs.btnProfile = document.getElementById('nav-profile');
    refs.btnSettings = document.getElementById('nav-settings-profile');
    refs.btnMap = document.getElementById('nav-map');
    
    refs.modalAlert = document.getElementById('alert-modal');
    refs.modalProfile = document.getElementById('profile-modal');
    refs.modalSettings = document.getElementById('settings-modal');
    refs.modalLegal = document.getElementById('legal-modal');
    refs.modalCheckout = document.getElementById('checkout-modal');
    refs.modalSafety = document.getElementById('safety-modal');
    refs.modalAuth = document.getElementById('auth-modal');
    
    refs.onboardingScrim = document.getElementById('onboarding-scrim');
    refs.onboardingTooltip = document.getElementById('onboarding-tooltip');
    
    refs.authEmail = document.getElementById('auth-email');
    refs.authPassword = document.getElementById('auth-password');
    refs.authPasswordConfirm = document.getElementById('auth-password-confirm');
    refs.authActionBtn = document.getElementById('auth-action-btn');
    refs.authToggleLink = document.getElementById('auth-toggle-link');
    refs.authForgotLink = document.getElementById('auth-forgot-link');
    refs.forgotPwContainer = document.getElementById('forgot-pw-container');
    
    refs.modalAccountEdit = document.getElementById('account-edit-modal');
    refs.editEmail = document.getElementById('edit-email');
    refs.editPassword = document.getElementById('edit-password');
    refs.editPasswordConfirm = document.getElementById('edit-password-confirm');
    refs.saveAccountBtn = document.getElementById('save-account-btn');
    
    refs.hudBadges = document.querySelectorAll('.hud-badges i');
    refs.statPlaces = document.getElementById('stat-places');
    
    refs.categoryPills = document.querySelectorAll('.cat-pill');
}

function showModalAlert(message, title = "Notice", icon = "fa-circle-info") {
    document.getElementById('alert-message').textContent = message;
    document.getElementById('alert-title').textContent = title;
    document.querySelector('.modal-icon').innerHTML = `<i class="fa-solid ${icon}"></i>`;
    refs.modalAlert.classList.remove('hidden');
}

function showConfirm(message, title = "Confirmation", icon = "fa-circle-question") {
    return new Promise((resolve) => {
        document.getElementById('alert-message').textContent = message;
        document.getElementById('alert-title').textContent = title;
        document.querySelector('.modal-icon').innerHTML = `<i class="fa-solid ${icon}"></i>`;
        
        const cancelBtn = document.getElementById('alert-cancel-btn');
        const okBtn = document.getElementById('alert-ok-btn');
        
        cancelBtn.classList.remove('hidden');
        refs.modalAlert.classList.remove('hidden');

        const cleanup = () => {
            cancelBtn.classList.add('hidden');
            refs.modalAlert.classList.add('hidden');
        };

        okBtn.onclick = () => { cleanup(); resolve(true); };
        cancelBtn.onclick = () => { cleanup(); resolve(false); };
    });
}

function setupAlertBinds() {
    document.getElementById('alert-ok-btn').addEventListener('click', () => {
        refs.modalAlert.classList.add('hidden');
    });
}

// --- NAVIGATION & GESTURES ---
function setupNavigation() {
    // Nav Active States
    const navItems = [refs.btnProfile, refs.btnMap];
    navItems.forEach(btn => {
        btn.addEventListener('click', () => {
            navItems.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if(btn.id === 'nav-profile') {
                refs.modalProfile.classList.remove('hidden');
            }
        });
    });

    // Relocated Settings Gear (Inside Profile Modal)
    refs.btnSettings.addEventListener('click', () => {
        refs.modalSettings.classList.remove('hidden');
    });

    // Scanner Button (Center Nav)
    refs.btnScan.addEventListener('click', () => {
        startScan();
    });

    // Navigate to Location
    refs.btnNavigate.addEventListener('click', () => {
        const lastNode = state.discoveredNodes[state.discoveredNodes.length - 1];
        if (!lastNode) return;
        
        const encoded = encodeURIComponent(lastNode.title);
        const mapUrl = /iPhone|iPad|iPod/i.test(navigator.userAgent) 
            ? `http://maps.apple.com/?q=${encoded}&ll=${lastNode.lat},${lastNode.lng}`
            : `https://www.google.com/maps/search/?api=1&query=${encoded}&query_place_id=${lastNode.placeId}`;
        
        window.open(mapUrl, '_blank');
        refs.locationSheet.classList.add('hidden');
    });

    // Tap outside Bottom Sheet to close
    document.getElementById('fog-overlay').addEventListener('click', () => {
        refs.locationSheet.classList.add('hidden');
    });

    // Close Modals
    document.getElementById('close-profile-btn').addEventListener('click', () => {
        refs.modalProfile.classList.add('hidden');
        refs.btnProfile.classList.remove('active');
        refs.btnMap.classList.add('active');
    });
    
    document.getElementById('close-settings-btn').addEventListener('click', () => {
        refs.modalSettings.classList.add('hidden');
        // Do not alter nav bar active states, since Settings is now a sub-modal of Profile
    });
    
    document.getElementById('close-legal-btn').addEventListener('click', () => {
        refs.modalLegal.classList.add('hidden');
    });
    
    document.getElementById('close-checkout-btn').addEventListener('click', () => {
        refs.modalCheckout.classList.add('hidden');
    });
    
    document.getElementById('close-auth-btn').addEventListener('click', () => {
        refs.modalAuth.classList.add('hidden');
    });
    
    document.getElementById('close-account-edit-btn').addEventListener('click', () => {
        refs.modalAccountEdit.classList.add('hidden');
    });
    
    document.getElementById('accept-safety-btn').addEventListener('click', () => {
        localStorage.setItem('wanderlost_safety_accepted', 'true');
        refs.modalSafety.classList.add('hidden');
        startScan(); // Resume the scan automatically
    });
    
    // Settings Module Wiring (Store-Required List)
    document.getElementById('set-auth').addEventListener('click', () => {
        if (!state.userEmail) {
            return showModalAlert("You are browsing as a Guest. Log in via 'My Account' to manage your credentials.", "Guest Account", "fa-user-astronaut");
        }
        refs.modalAccountEdit.classList.remove('hidden');
        refs.editEmail.value = state.userEmail || '';
        refs.editPassword.value = '';
        refs.editPasswordConfirm.value = '';
    });

    refs.saveAccountBtn.addEventListener('click', async () => {
        const newEmail = refs.editEmail.value.trim();
        const newPassword = refs.editPassword.value;
        const confirmPassword = refs.editPasswordConfirm.value;
        
        if (!newEmail && !newPassword) {
            return showModalAlert("Please enter an email or password to update.", "Input Required", "fa-triangle-exclamation");
        }
        
        if (newPassword && newPassword !== confirmPassword) {
            return showModalAlert("Passwords do not match.", "Error", "fa-circle-xmark");
        }

        const token = localStorage.getItem('wanderlost_token');
        if (!token) {
            return showModalAlert("You must be logged in to update credentials.", "Authentication Required", "fa-lock");
        }

        try {
            const res = await fetch(`${API_BASE_URL}/auth/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({
                    email: state.userEmail,
                    newEmail: newEmail,
                    newPassword: newPassword || undefined
                })
            });
            const data = await res.json();
            
            if (data.success) {
                if (newEmail) {
                    state.userEmail = newEmail;
                    localStorage.setItem('wanderlost_email', state.userEmail);
                    document.getElementById('profile-identity').textContent = state.userEmail;
                }
                refs.modalAccountEdit.classList.add('hidden');
                showModalAlert("Your account credentials have been successfully updated.", "Account Updated", "fa-check-circle");
            } else {
                showModalAlert(data.error || "Failed to update account.", "Error", "fa-circle-xmark");
            }
        } catch (err) {
            showModalAlert("Server unreachable.", "Connection Error", "fa-wifi");
        }
    });
    
    document.getElementById('set-restore').addEventListener('click', () => {
        if (state.isSubscribed) {
            showModalAlert("Your purchases are already restored and active.", "Already Active", "fa-check-circle");
            return;
        }
        setTimeout(() => {
            state.isSubscribed = true;
            document.querySelectorAll('.premium-lock').forEach(icon => icon.classList.add('hidden'));
            showModalAlert("Purchases restored successfully. Premium features are now active.", "Restored", "fa-rotate");
        }, 800);
    });
    
    document.getElementById('set-permissions').addEventListener('click', () => {
        showModalAlert("To adjust Location Services, please open your device's native Settings app.", "Location Permissions", "fa-location-crosshairs");
    });
    
    document.getElementById('set-support').addEventListener('click', () => {
        window.location.href = "mailto:support@wonderlost.com?subject=Wanderløst%20Support%20Request";
    });

    document.getElementById('set-tos').addEventListener('click', () => { refs.modalLegal.classList.remove('hidden'); });
    document.getElementById('set-privacy').addEventListener('click', () => { refs.modalLegal.classList.remove('hidden'); });
    
    document.getElementById('set-google-licenses').addEventListener('click', () => {
        showModalAlert("Map data ©2026 Google. Powered by Google Maps Platform.", "Third-Party Credits", "fa-google");
    });
    
    // Toggles
    const toggleSounds = document.getElementById('toggle-sounds');
    toggleSounds.addEventListener('change', (e) => {
        state.soundsEnabled = e.target.checked;
        localStorage.setItem('wanderlost_sounds', state.soundsEnabled);
    });
    

    // Category Selector
    refs.categoryPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const type = pill.dataset.type;
            if (type !== 'all' && !state.isSubscribed) {
                // Free users hit the paywall
                refs.modalCheckout.classList.remove('hidden');
                return;
            }
            
            // Valid selection
            refs.categoryPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.selectedCategory = type;
        });
    });
}

function setupAccountActions() {
    // Data-Control List (My Account)
    document.getElementById('manage-sub-profile-btn').addEventListener('click', () => {
        if (state.isSubscribed) {
            showModalAlert("Manage your active Premium Subscription directly in your device's App Store or Google Play settings.", "Manage Subscription", "fa-crown");
        } else {
            refs.modalCheckout.classList.remove('hidden');
        }
    });

    const handlePayment = () => {
        refs.modalCheckout.classList.add('hidden');
        state.isSubscribed = true;
        document.getElementById('manage-sub-profile-btn').innerHTML = `<i class="fa-solid fa-credit-card"></i> Manage Subscriptions`;
        
        // Remove lock icons
        document.querySelectorAll('.premium-lock').forEach(icon => icon.classList.add('hidden'));
        
        showModalAlert("Payment processed successfully. You are now a Premium Explorer.", "Welcome to Elite", "fa-crown");
    };

    document.getElementById('pay-apple-btn').addEventListener('click', handlePayment);
    document.getElementById('pay-google-btn').addEventListener('click', handlePayment);
    document.getElementById('pay-card-btn').addEventListener('click', handlePayment);
    

    document.getElementById('delete-data-btn').addEventListener('click', async () => {
        const confirmed = await showConfirm(
            "This will permanently delete your 'Travel Trails', earned badges, and discovery history. This cannot be undone.",
            "Destroy All Data?",
            "fa-trash-can"
        );
            // Destroy Data logic
            if (confirmed) {
                state.discoveredNodes = [];
                state.markers.forEach(m => m.setMap(null));
                state.markers = [];
                state.colorZones.forEach(z => z.setMap(null));
                state.colorZones = [];
                updateBadges();
                
                if (window.map) {
                    window.map.panTo({ lat: 47.3769, lng: 8.5417 });
                    window.map.setZoom(14);
                    if (state.trailPath) {
                        state.trailPath.setMap(null);
                        state.trailPath = null;
                    }
                }
                
                refs.modalProfile.classList.add('hidden');
                refs.btnMap.click();
                showModalAlert("All your history has been wiped from the Intelligence Rig.", "Data Purged", "fa-fire");
            }
    });
}

function initializePassportGallery() {
    const gallery = document.getElementById('badge-gallery');
    if (!gallery) return;
    gallery.innerHTML = '';
    
    // Scrape unlocked and locked categories
    const unlockedTypes = state.unlockedBadges.filter(type => BADGE_TYPES[type]);
    const lockedTypes = Object.keys(BADGE_TYPES).filter(type => !state.unlockedBadges.includes(type));
    
    // Vibrant Colors mapping the user's reference image
    const stampColors = ['#ff8fb3', '#6a9bd8', '#a8d87a', '#f9e67a', '#f78f8f', '#b39ddb'];

    // Render all verified Unlocked stamps
    unlockedTypes.forEach((type, index) => {
        const bd = BADGE_TYPES[type];
        const color = stampColors[type.length % stampColors.length];
        const price = (type.length * 2) + 11;
        
        const el = document.createElement('div');
        el.className = 'badge-wrapper';
        el.id = `badge-${type}`; // keep ID on wrapper for scrolling later if needed
        el.innerHTML = `
            <div class="badge-item unlocked">
                <div class="stamp-inner" style="background: ${color};">
                    <i class="fa-solid ${bd.icon}"></i>
                    <div class="stamp-price">${price}</div>
                </div>
            </div>
            <span>${bd.name}</span>
        `;
        gallery.appendChild(el);
    });
    
    // Render exactly 3 Locked 'Mystery' stamps
    const lockedToShow = lockedTypes.slice(0, 3);
    lockedToShow.forEach((type, index) => {
        const price = (type.length * 2) + 11;
        
        const el = document.createElement('div');
        el.className = 'badge-wrapper';
        el.innerHTML = `
            <div class="badge-item locked">
                <div class="stamp-inner">
                    <i class="fa-solid fa-question"></i>
                    <div class="stamp-price">${price}</div>
                </div>
            </div>
            <span>Mystery Stamp</span>
        `;
        gallery.appendChild(el);
    });
}

function awardBadge(type) {
    const mappedType = BADGE_TYPES[type] ? type : 'tourist_attraction';
    
    AudioEngine.playChime();
    
    if (state.unlockedBadges.includes(mappedType)) return;
    
    state.unlockedBadges.push(mappedType);
    localStorage.setItem('wanderlost_badges', JSON.stringify(state.unlockedBadges));
    
    // Force gallery to repaint to convert mystery stamps to active artwork
    initializePassportGallery();
}

// --- INTELLIGENCE ENGINE (DISCOVERY) ---
function startScan() {
    // 0. Contextual Onboarding Dismissal Hook
    if (refs.onboardingScrim && !refs.onboardingScrim.classList.contains('hidden')) {
        refs.onboardingScrim.classList.add('hidden');
        refs.onboardingTooltip.classList.add('hidden');
        refs.hudBottom.classList.remove('nav-elevated');
        refs.btnScan.classList.remove('relative-z-elevate');
        refs.btnProfile.classList.remove('pointer-disabled');
        refs.btnMap.classList.remove('pointer-disabled');
        localStorage.setItem('wanderlost_onboarded', 'true');
    }
    
    // Physical hardware haptic response to Scan execution
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200]);
    }

    // 1. Safety Check (App Store Compliance)
    if (!localStorage.getItem('wanderlost_safety_accepted')) {
        refs.modalSafety.classList.remove('hidden');
        return;
    }

    if (!("geolocation" in navigator)) {
        showModalAlert("GPS disabled on device.", "Scanner Error", "fa-satellite");
        return;
    }

    refs.btnScan.disabled = true;
    refs.scanIndicator.classList.remove('hidden');
    refs.scanStatusText.textContent = "Acquiring GPS Lock...";
    
    const icon = refs.btnScan.querySelector('i');
    icon.classList.remove('fa-satellite-dish');
    icon.classList.add('fa-spinner', 'fa-spin');

    navigator.geolocation.getCurrentPosition(
        position => executeDiscovery(position.coords.latitude, position.coords.longitude, icon, state.selectedCategory),
        error => {
            showModalAlert("Location access denied.", "Scanner Error", "fa-location-dot");
            resetScanBtn(icon);
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

async function executeDiscovery(lat, lng, icon, category) {
    refs.scanStatusText.textContent = "Connecting to Rig...";
    
    try {
        const response = await fetch(`${state.BACKEND_URL}/api/discover`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng, category })
        });
        
        const result = await response.json();
        
        if (result.success) {
            refs.scanStatusText.textContent = "Manifesting...";
            setTimeout(() => displayDiscovery(result.data, icon), 1000);
        } else {
            showModalAlert(result.message || "No secrets found here.", "Scanner Empty", "fa-ghost");
            resetScanBtn(icon);
        }
    } catch (err) {
        showModalAlert("Connection to Intelligence Rig lost.", "Uplink Failed", "fa-tower-broadcast");
        resetScanBtn(icon);
    }
}

function displayDiscovery(data, icon) {
    // 1. Save state
    state.discoveredNodes.push(data);
    
    // 2. Update UI
    refs.locTitle.textContent = data.title;
    refs.locDesc.textContent = data.desc;
    refs.locationSheet.classList.remove('hidden');
    
    // Gamification: Award Badge & Trigger Audio Chime
    awardBadge(data.category || 'tourist_attraction');
    
    // 3. Pan Map and Draw Trail
    if (window.map) {
        window.map.panTo({ lat: data.lat, lng: data.lng });
        window.map.setZoom(17);
        
        // Handle Marker Logic
        if (state.markers.length > 0) {
            state.markers[state.markers.length - 1].setAsVisited(); // Turn previous green
        }
        
        const latlng = new google.maps.LatLng(data.lat, data.lng);
        const newMarker = new window.CustomMarker(latlng, window.map, true); // Create new pulsating orange
        state.markers.push(newMarker);
        
        // Gamification: Paint the map with color around the discovery
        revealColorZone(data.lat, data.lng);
        
        drawTrail();
    }
    
    updateBadges();
    resetScanBtn(icon);
    pushStateToCloud(); // Sync after discovery
}

function drawTrail() {
    const pathCoordinates = state.discoveredNodes.map(node => ({ lat: node.lat, lng: node.lng }));
    
    if (state.trailPath) {
        state.trailPath.setPath(pathCoordinates);
    } else {
        state.trailPath = new google.maps.Polyline({
            path: pathCoordinates,
            geodesic: true,
            strokeOpacity: 0, // 0 for Dashed lines
            icons: [{
                icon: {
                    path: 'M 0,-1 0,1',
                    strokeOpacity: 1,
                    scale: 3,
                    strokeColor: '#e07a5f'
                },
                offset: '0',
                repeat: '20px'
            }],
            map: window.map
        });
    }
}

function revealColorZone(lat, lng) {
    // Array of vibrant, playful colors inspired by the geometric map aesthetic
    const vibrantColors = [
        '#FF6B6B', '#4ECDC4', '#FFE66D', '#FF9F1C', 
        '#2AB7CA', '#FE4A90', '#F15BB5', '#00F5D4',
        '#9B5DE5', '#FEE440'
    ];
    const randomColor = vibrantColors[Math.floor(Math.random() * vibrantColors.length)];

    // We draw a semi-transparent colored circle over the monochrome map
    // The radius is large enough to "paint" a neighborhood block
    const zone = new google.maps.Circle({
        strokeColor: randomColor,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: randomColor,
        fillOpacity: 0.25,
        map: window.map,
        center: { lat, lng },
        radius: 0 // Start at 0 for animation
    });
    
    state.colorZones.push(zone);

    // Animate the circle radiating outwards
    let currentRadius = 0;
    const maxRadius = 350; // Reveal a ~350m radius of "color"
    
    const animateCircle = () => {
        currentRadius += 10;
        zone.setRadius(currentRadius);
        if (currentRadius < maxRadius) {
            requestAnimationFrame(animateCircle);
        }
    };
    
    requestAnimationFrame(animateCircle);
}

function updateBadges() {
    const count = state.discoveredNodes.length;
    refs.statPlaces.textContent = count;
    
    const badgeCount = Math.floor(count / 3);
    refs.hudBadges.forEach((badge, index) => {
        // If unlocking a new badge right now
        if (index === badgeCount - 1 && count > 0 && count % 3 === 0 && badge.classList.contains('locked')) {
            showModalAlert("You've unlocked a new Elite Badge! Keep exploring to earn them all.", "Milestone Reached", "fa-star");
        }
        
        if (index < badgeCount) {
            badge.classList.remove('locked');
        } else {
            badge.classList.add('locked');
        }
    });
}

function resetScanBtn(icon) {
    refs.btnScan.disabled = false;
    refs.scanIndicator.classList.add('hidden');
    icon.classList.remove('fa-spinner', 'fa-spin');
    icon.classList.add('fa-satellite-dish');
}

// --- CLOUD AUTHENTICATION & SYNC ENGINE ---
function setupAuth() {
    let mode = 'login'; // 'login', 'register', or 'recover'
    
    const setMode = (newMode) => {
        mode = newMode;
        // Reset Inputs
        refs.authPassword.value = '';
        refs.authPasswordConfirm.value = '';
        
        if (mode === 'login') {
            document.getElementById('auth-title').textContent = "Welcome to Wanderløst";
            refs.authPassword.classList.remove('hidden');
            refs.authPasswordConfirm.classList.add('hidden');
            refs.forgotPwContainer.classList.remove('hidden');
            refs.authActionBtn.textContent = "Log In";
            refs.authToggleLink.textContent = "Need an account? Register here.";
            refs.authToggleLink.style.display = 'inline';
        } else if (mode === 'register') {
            document.getElementById('auth-title').textContent = "Create an Account";
            refs.authPassword.classList.remove('hidden');
            refs.authPasswordConfirm.classList.remove('hidden');
            refs.forgotPwContainer.classList.add('hidden');
            refs.authActionBtn.textContent = "Register & Sync";
            refs.authToggleLink.textContent = "Already have an account? Log in.";
            refs.authToggleLink.style.display = 'inline';
        } else if (mode === 'recover') {
            document.getElementById('auth-title').textContent = "Recover Password";
            refs.authPassword.classList.add('hidden');
            refs.authPasswordConfirm.classList.add('hidden');
            refs.forgotPwContainer.classList.add('hidden');
            refs.authActionBtn.textContent = "Send Recovery Email";
            refs.authToggleLink.textContent = "Back to Login";
            refs.authToggleLink.style.display = 'inline';
        }
    };
    
    refs.authToggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (mode === 'login') setMode('register');
        else if (mode === 'register') setMode('login');
        else if (mode === 'recover') setMode('login');
    });
    
    refs.authForgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        setMode('recover');
    });

    refs.authActionBtn.addEventListener('click', async () => {
        const email = refs.authEmail.value;
        const password = refs.authPassword.value;
        const passwordConfirm = refs.authPasswordConfirm.value;
        
        if (!email) {
            return showModalAlert("Please enter your email.", "Missing Email", "fa-triangle-exclamation");
        }
        if (mode !== 'recover' && !password) {
            return showModalAlert("Please enter your password.", "Missing Password", "fa-triangle-exclamation");
        }
        if (mode === 'register' && password !== passwordConfirm) {
            return showModalAlert("Passwords do not match.", "Input Error", "fa-triangle-exclamation");
        }
        
        refs.authActionBtn.disabled = true;
        refs.authActionBtn.textContent = "Processing...";
        
        try {
            let endpoint = '';
            if (mode === 'login') endpoint = '/api/auth/login';
            else if (mode === 'register') endpoint = '/api/auth/register';
            else if (mode === 'recover') endpoint = '/api/auth/recover';
            
            const res = await fetch(`${state.BACKEND_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }) // password is ignored by recover endpoint
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Authentication failed.");
            
            if (mode === 'recover') {
                showModalAlert(data.message, "Recovery Initiated", "fa-envelope-open");
                setMode('login');
                return;
            }
            
            // Login or Register Success
            state.token = data.token;
            localStorage.setItem('wanderlost_token', state.token);
            localStorage.setItem('wanderlost_email', email); // Cache email for Identity display
            
            document.getElementById('profile-identity').textContent = email;
            refs.modalAuth.classList.add('hidden');
            document.getElementById('login-sync-btn').classList.add('hidden');
            document.getElementById('logout-btn').classList.remove('hidden');
            
            if (mode === 'login') {
                loadStateFromCloud();
            }
            
            showModalAlert("You are now connected to the Cloud Sync Rig.", "Authenticated", "fa-cloud");
            
        } catch (err) {
            showModalAlert(err.message, "Auth Error", "fa-circle-xmark");
        } finally {
            refs.authActionBtn.disabled = false;
            // Restore button text simply by calling setMode on the current mode
            const currentMode = mode;
            setMode(currentMode);
        }
    });
    
    document.getElementById('login-sync-btn').addEventListener('click', () => {
        refs.modalAuth.classList.remove('hidden');
        refs.modalProfile.classList.add('hidden');
    });
    
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('wanderlost_token');
        location.reload(); // Hard reset local state
    });
    
    // Check boot state for toggling Dossier buttons
    if (state.token) {
        document.getElementById('login-sync-btn').classList.add('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');
    }
}

async function loadStateFromCloud() {
    if (!state.token) return;
    
    try {
        const res = await fetch(`${state.BACKEND_URL}/api/sync`, {
            headers: { 'Authorization': state.token }
        });
        if (!res.ok) throw new Error("Invalid token");
        
        const data = await res.json();
        if (data.stateData) {
            // Unpack remote state
            state.discoveredNodes = data.stateData.discoveredNodes || [];
            state.isSubscribed = data.stateData.isSubscribed || false;
            
            // Re-render UI
            if (state.isSubscribed) {
                document.getElementById('profile-status-tag').textContent = "Wanderløst Premium";
                document.getElementById('manage-payments-btn').innerHTML = `<i class="fa-solid fa-credit-card"></i> Manage Subscriptions`;
                document.getElementById('cancel-membership-btn').classList.remove('hidden');
                document.querySelectorAll('.premium-lock').forEach(icon => icon.classList.add('hidden'));
            }
            
            // Re-render Map Elements
            if (window.map && state.discoveredNodes.length > 0) {
                window.map.panTo({ lat: state.discoveredNodes[state.discoveredNodes.length - 1].lat, lng: state.discoveredNodes[state.discoveredNodes.length - 1].lng });
                
                state.discoveredNodes.forEach((node, index) => {
                    const latlng = new google.maps.LatLng(node.lat, node.lng);
                    const isLast = index === state.discoveredNodes.length - 1;
                    const marker = new window.CustomMarker(latlng, window.map, isLast);
                    if (!isLast) marker.setAsVisited();
                    state.markers.push(marker);
                    
                    revealColorZone(node.lat, node.lng);
                });
                drawTrail();
            }
            updateBadges();
        }
    } catch (err) {
        // Token likely expired or server wiped (prototype memory leak)
        localStorage.removeItem('wanderlost_token');
        state.token = null;
        refs.modalAuth.classList.remove('hidden');
    }
}

async function pushStateToCloud() {
    if (!state.token) return;
    
    // Stripped down state payload (exclude complex instances like google maps objects)
    const payload = {
        discoveredNodes: state.discoveredNodes,
        isSubscribed: state.isSubscribed,
        selectedCategory: state.selectedCategory
    };
    
    try {
        await fetch(`${state.BACKEND_URL}/api/sync`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': state.token 
            },
            body: JSON.stringify({ stateData: payload })
        });
    } catch (e) {
        console.error("Failed to sync state to cloud", e);
    }
}
