/**
 * WANDERLØST V3 - FRONTEND ENGINE
 * STRICT MOBILE-FIRST ARCHITECTURE
 */

const state = {
    discoveredNodes: [],
    BACKEND_URL: localStorage.getItem('WANDERLOST_BACKEND_OVERRIDE') || 'https://wanderlost-app.onrender.com'
};

const refs = {};

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    bindDOM();
    setupNavigation();
    setupAlertBinds();
    setupAccountActions();
});

// Google Maps Callback
window.initMapData = function() {
    let center = { lat: 47.3769, lng: 8.5417 };
    
    window.map = new google.maps.Map(document.getElementById('map-bg'), {
        center: center,
        zoom: 14,
        disableDefaultUI: true,
        styles: [
            {elementType: 'geometry', stylers: [{color: '#ebe3cd'}]},
            {elementType: 'labels.text.fill', stylers: [{color: '#523735'}]},
            {elementType: 'labels.text.stroke', stylers: [{color: '#f5f1e6'}]},
            {featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{color: '#c9b2a6'}]},
            {featureType: 'landscape.natural', elementType: 'geometry', stylers: [{color: '#dfd2ae'}]},
            {featureType: 'poi', stylers: [{visibility: 'off'}]},
            {featureType: 'road', elementType: 'geometry', stylers: [{color: '#f5f1e6'}]},
            {featureType: 'water', elementType: 'geometry.fill', stylers: [{color: '#b9d3c2'}]}
        ]
    });
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
    
    refs.btnScan = document.getElementById('nav-scan');
    refs.btnProfile = document.getElementById('nav-profile');
    refs.btnMap = document.getElementById('nav-map');
    
    refs.modalAlert = document.getElementById('alert-modal');
    refs.modalProfile = document.getElementById('profile-modal');
    refs.modalLegal = document.getElementById('legal-modal');
    
    refs.hudBadges = document.querySelectorAll('.hud-badges i');
    refs.statPlaces = document.getElementById('stat-places');
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

    // Scan Button
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
    
    document.getElementById('close-legal-btn').addEventListener('click', () => {
        refs.modalLegal.classList.add('hidden');
    });
}

function setupAccountActions() {
    document.getElementById('manage-payments-btn').addEventListener('click', () => {
        showModalAlert("CHF 20.00 / month. Billed to card ending in 4242.", "Active Subscription", "fa-credit-card");
    });
    
    document.getElementById('terms-btn').addEventListener('click', () => {
        refs.modalLegal.classList.remove('hidden');
    });
    
    document.getElementById('cancel-membership-btn').addEventListener('click', async () => {
        const confirmed = await showConfirm(
            "Are you sure you want to end your Elite Journey? You will lose access to secret coordinates at the end of this billing cycle.",
            "Confirm Cancellation",
            "fa-ban"
        );
        if (confirmed) {
            showModalAlert("Your membership has been cancelled. Access remains active until the end of the period.", "Cancellation Confirmed", "fa-check-circle");
        }
    });
    
    document.getElementById('delete-data-btn').addEventListener('click', async () => {
        const confirmed = await showConfirm(
            "This will permanently delete your 'Travel Trails', earned badges, and discovery history. This cannot be undone.",
            "Destroy All Data?",
            "fa-trash-can"
        );
        if (confirmed) {
            state.discoveredNodes = [];
            updateBadges();
            
            if (window.map) {
                window.map.panTo({ lat: 47.3769, lng: 8.5417 });
                window.map.setZoom(14);
            }
            
            refs.modalProfile.classList.add('hidden');
            refs.btnMap.click();
            showModalAlert("All your history has been wiped from the Intelligence Rig.", "Data Purged", "fa-fire");
        }
    });
}

// --- INTELLIGENCE ENGINE (DISCOVERY) ---
function startScan() {
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
        position => executeDiscovery(position.coords.latitude, position.coords.longitude, icon),
        error => {
            showModalAlert("Location access denied.", "Scanner Error", "fa-location-dot");
            resetScanBtn(icon);
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

async function executeDiscovery(lat, lng, icon) {
    refs.scanStatusText.textContent = "Connecting to Rig...";
    
    try {
        const response = await fetch(`${state.BACKEND_URL}/api/discover`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng })
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
    
    // 3. Pan Map
    if (window.map) {
        window.map.panTo({ lat: data.lat, lng: data.lng });
        window.map.setZoom(17);
    }
    
    updateBadges();
    resetScanBtn(icon);
}

function updateBadges() {
    const count = state.discoveredNodes.length;
    refs.statPlaces.textContent = count;
    
    const badgeCount = Math.floor(count / 3);
    refs.hudBadges.forEach((badge, index) => {
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
