/**
 * WANDERLØST - Core Intelligence Rig (Frontend)
 * A premium, elegant discovery engine for the modern explorer.
 */

// --- GLOBAL STATE ---
const state = {
    placesVisited: 0,
    currentLevel: 1,
    nodes: [],
    currentNodeIndex: -1,
    isSubscribed: false,
    // BACKEND URL: Defaults to production, but can be overridden by localStorage for dev
    BACKEND_URL: localStorage.getItem('WANDERLOST_BACKEND_OVERRIDE') || 'https://wanderlost-app.onrender.com'
};

// --- DOM REFERENCES ---
const refs = {};
const bindRefs = () => {
    // Containers
    refs.nodesContainer = document.getElementById('nodes-container');
    refs.trailSvg = document.getElementById('trail-svg');
    refs.fogOverlay = document.getElementById('fog-overlay');
    
    // UI Panels
    refs.locationCard = document.getElementById('location-card');
    refs.idlePrompt = document.getElementById('idle-prompt');
    refs.locTitle = document.getElementById('loc-title');
    refs.locDesc = document.getElementById('loc-desc');
    refs.progressFill = document.querySelector('.progress-fill');
    refs.badges = document.querySelectorAll('.badges-mini i');
    refs.mapBg = document.getElementById('map-bg');
    
    // Buttons
    refs.btnReady = document.getElementById('ready-btn');
    refs.btnScan = document.getElementById('nav-discover-btn');
    refs.btnSettings = document.getElementById('settings-btn');
    refs.btnStartJourney = document.getElementById('start-journey-btn');
    
    // Modals
    refs.modalWelcome = document.getElementById('welcome-modal');
    refs.modalSub = document.getElementById('subscription-modal');
    refs.modalCheckout = document.getElementById('checkout-modal');
    refs.modalLegal = document.getElementById('legal-modal');
    refs.modalProfile = document.getElementById('profile-modal');
    refs.modalCustom = document.getElementById('custom-modal');
    refs.modalLocationPerm = document.getElementById('location-permission-modal');
    
    // History
    refs.historyList = document.querySelector('.history-list');
};

// --- UTILITIES & HELPERS ---

/**
 * Robust event binder that logs failures for easier debugging
 */
function safeBind(id, event, handler) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener(event, handler);
        console.log(`[Wanderløst] Bound ${event} to #${id}`);
    } else {
        console.warn(`[Wanderløst] Skipping binding: #${id} not found.`);
    }
}

/**
 * Custom Modal System (Matches "Premium Explorer" aesthetic)
 */
async function showAlert(message, title = "Notice", icon = "fa-circle-info") {
    return showModalAlert(message, title, icon, false);
}

async function showConfirm(message, title = "Confirmation", icon = "fa-circle-question") {
    return showModalAlert(message, title, icon, true);
}

async function showModalAlert(message, title = "Notice", icon = "fa-circle-info", showCancel = false) {
    return new Promise((resolve) => {
        const modal = refs.modalCustom;
        const msgEl = document.getElementById('modal-message');
        const titleEl = document.getElementById('modal-title');
        const iconEl = document.getElementById('modal-icon');
        const okBtn = document.getElementById('modal-ok-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');

        if (!modal) return resolve(false);

        msgEl.textContent = message;
        titleEl.textContent = title;
        iconEl.innerHTML = `<i class="fa-solid ${icon}"></i>`;
        
        if (cancelBtn) {
            cancelBtn.classList.toggle('hidden', !showCancel);
        }

        const handleOk = () => {
            cleanup();
            resolve(true);
        };
        const handleCancel = () => {
            cleanup();
            resolve(false);
        };
        const cleanup = () => {
            okBtn.removeEventListener('click', handleOk);
            if (cancelBtn) cancelBtn.removeEventListener('click', handleCancel);
            modal.classList.add('hidden');
        };

        okBtn.addEventListener('click', handleOk);
        if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
        
        modal.classList.remove('hidden');
    });
}

// --- MAP ENGINE ---
let map;
window.initMap = function() {
    let center = { lat: 47.3769, lng: 8.5417 }; // Default: Zurich
    
    map = new google.maps.Map(document.getElementById('map-bg'), {
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
            {featureType: 'road.highway', elementType: 'geometry', stylers: [{color: '#f8c967'}]},
            {featureType: 'water', elementType: 'geometry.fill', stylers: [{color: '#b9d3c2'}]}
        ]
    });
};

// --- CORE DISCOVERY ENGINE ---

async function startScan() {
    if (refs.modalLocationPerm) refs.modalLocationPerm.classList.add('hidden');
    
    const statusText = document.getElementById('scan-status-text');
    const discoverIcon = document.querySelector('#nav-discover-btn i');
    
    if (refs.btnScan) {
        refs.btnScan.disabled = true;
        if (discoverIcon) discoverIcon.className = 'fa-solid fa-location-crosshairs fa-spin';
        if (statusText) statusText.textContent = 'Getting GPS...';
    }
    
    if (!("geolocation" in navigator)) {
        showAlert("Geolocation not supported.", "Device Error", "fa-mobile-screen");
        if (refs.btnScan) refs.btnScan.disabled = false;
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        if (statusText) statusText.textContent = 'Verifying Authenticity...';
        if (discoverIcon) discoverIcon.className = 'fa-solid fa-filter fa-spin';
        
        try {
            const response = await fetch(`${state.BACKEND_URL}/api/discover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat: latitude, lng: longitude })
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (statusText) statusText.textContent = 'Manifesting Curiosity...';
                if (discoverIcon) discoverIcon.className = 'fa-solid fa-wand-magic-sparkles fa-spin';
                
                setTimeout(() => {
                    // Duplicate Filter
                    const isDuplicate = state.nodes.find(n => n.placeId === result.data.id || n.title === result.data.title);
                    
                    if (isDuplicate) {
                        if (statusText) statusText.textContent = 'Area already documented';
                        if (discoverIcon) discoverIcon.className = 'fa-solid fa-satellite-dish';
                        refs.btnScan.disabled = false;
                        showAlert("You've already uncovered this secret.", "Echo Location", "fa-satellite-dish");
                        return;
                    }

                    const node = {
                        id: Date.now(),
                        placeId: result.data.id,
                        title: result.data.title,
                        desc: result.data.desc,
                        lat: result.data.lat,
                        lng: result.data.lng,
                        x: 15 + Math.random() * 70,
                        y: 15 + Math.random() * 70,
                        status: 'active'
                    };
                    
                    state.nodes.push(node);
                    state.currentNodeIndex = state.nodes.length - 1;
                    
                    renderNodes();
                    showLocationDetails(node);
                    
                    if (refs.btnScan) {
                        if (discoverIcon) discoverIcon.className = 'fa-solid fa-satellite-dish';
                        if (statusText) statusText.textContent = 'Discovery Complete';
                        setTimeout(() => statusText.textContent = 'Scanning for nearby secrets...', 3000);
                        refs.btnScan.disabled = false;
                    }
                }, 1500);
            } else {
                showAlert(result.message || "No local gems found nearby.", "Discovery Failed", "fa-building-circle-exclamation");
                if (refs.btnScan) {
                    if (discoverIcon) discoverIcon.className = 'fa-solid fa-satellite-dish';
                    if (statusText) statusText.textContent = 'Scanning for nearby secrets...';
                    refs.btnScan.disabled = false;
                }
            }
        } catch (err) {
            showAlert("Unable to reach the Intelligence Rig.", "Connection Error", "fa-tower-broadcast");
            if (refs.btnScan) {
                if (discoverIcon) discoverIcon.className = 'fa-solid fa-satellite-dish';
                refs.btnScan.disabled = false;
            }
        }
    }, () => {
        showAlert("GPS Access Denied.", "GPS Required", "fa-location-dot");
        if (refs.btnScan) refs.btnScan.disabled = false;
    });
}

function showLocationDetails(node) {
    if (!refs.locationCard) return;
    
    refs.locTitle.textContent = node.title;
    refs.locDesc.textContent = node.desc;
    
    // Auto-Pan
    if (map && node.lat && node.lng) {
        map.panTo({ lat: node.lat, lng: node.lng });
        map.setZoom(17);
    }

    const tag = document.querySelector('.card-header .tag');
    if (node.status === 'visited') {
        refs.btnReady.style.display = 'none';
        if (tag) {
            tag.textContent = 'Visited';
            tag.style.color = '#777';
            tag.style.borderColor = '#777';
        }
    } else {
        refs.btnReady.style.display = 'flex';
        if (tag) {
            tag.textContent = 'New Discovery';
            tag.style.color = 'var(--accent-vintage)';
            tag.style.borderColor = 'var(--accent-vintage)';
        }
    }
    
    refs.idlePrompt.classList.add('hidden');
    refs.locationCard.classList.remove('hidden');
}

// --- RENDERING & UI ---

function renderNodes() {
    if (!refs.nodesContainer) return;
    refs.nodesContainer.innerHTML = '';
    
    state.nodes.forEach((node, index) => {
        const el = document.createElement('div');
        el.className = `map-node ${node.status === 'hidden' ? 'hidden-node' : node.status}`;
        el.style.left = `${node.x}%`;
        el.style.top = `${node.y}%`;
        el.innerHTML = `<span class="marker-text">${index + 1}</span>`;
        
        el.addEventListener('click', () => {
            if (node.status === 'active' || node.status === 'visited') {
                showLocationDetails(node);
            } else {
                refs.idlePrompt.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        });
        
        refs.nodesContainer.appendChild(el);
    });
    
    drawTrails();
}

function drawTrails() {
    if (!refs.trailSvg) return;
    refs.trailSvg.innerHTML = '';
    
    let activeNodes = state.nodes.filter(n => n.status === 'visited' || n.status === 'active');
    if (activeNodes.length === 1) activeNodes = [{x: 50, y: 50}, ...activeNodes];
    if (activeNodes.length < 2) return;

    let pathD = `M ${activeNodes[0].x} ${activeNodes[0].y} `;
    for (let i = 0; i < activeNodes.length - 1; i++) {
        const start = activeNodes[i];
        const end = activeNodes[i+1];
        const midX = (start.x + end.x) / 2 + (Math.random() * 10 - 5);
        const midY = (start.y + end.y) / 2 + (Math.random() * 10 - 5);
        pathD += `Q ${midX} ${midY}, ${end.x} ${end.y} `;
    }

    refs.trailSvg.setAttribute('viewBox', '0 0 100 100');
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute('d', pathD);
    path.setAttribute('class', 'trail-line');
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    refs.trailSvg.appendChild(path);
}

function updateProgress() {
    const badgeCount = Math.floor(state.placesVisited / 3); 
    const progress = (state.placesVisited % 3) / 3 * 100;
    
    if (refs.progressFill) {
        refs.progressFill.style.width = `${progress === 0 && state.placesVisited > 0 ? 100 : progress}%`;
    }

    // Update Badges
    document.querySelectorAll('.badges-mini i, .badge-item').forEach((b, i) => {
        if (i < badgeCount) b.classList.remove('locked');
    });
    
    // History
    if (state.placesVisited > 0 && refs.historyList) {
        const currentNode = state.nodes[state.currentNodeIndex];
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <span class="history-date">Today, ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            <span class="history-name">${currentNode.title}</span>
        `;
        refs.historyList.insertBefore(li, refs.historyList.firstChild);
    }
}

// --- INITIALIZATION ---

function init() {
    console.log("Wanderløst Intelligence Rig: Booting Clean Architecture...");
    bindRefs();

    // 1. Welcome Flow
    safeBind('start-journey-btn', 'click', () => {
        refs.modalWelcome.style.opacity = '0';
        setTimeout(() => {
            refs.modalWelcome.classList.add('hidden');
            if (refs.btnScan) refs.btnScan.click();
        }, 800);
    });

    // 2. Discovery Bindings
    safeBind('nav-discover-btn', 'click', () => {
        if (refs.modalLocationPerm) refs.modalLocationPerm.classList.remove('hidden');
        else startScan();
    });
    safeBind('location-allow-btn', 'click', () => startScan());
    safeBind('location-deny-btn', 'click', () => refs.modalLocationPerm.classList.add('hidden'));

    // 3. Navigation (Named)
    safeBind('ready-btn', 'click', () => {
        const node = state.nodes[state.currentNodeIndex];
        const encoded = encodeURIComponent(node.title);
        const mapUrl = /iPhone|iPad|iPod/i.test(navigator.userAgent) 
            ? `http://maps.apple.com/?q=${encoded}&ll=${node.lat},${node.lng}`
            : `https://www.google.com/maps/search/?api=1&query=${encoded}&query_place_id=${node.placeId}`;
        
        window.open(mapUrl, '_blank');
        
        // Complete
        node.status = 'visited';
        state.placesVisited++;
        updateProgress();
        renderNodes();
        refs.locationCard.classList.add('hidden');
        refs.idlePrompt.classList.remove('hidden');
    });

    // 4. Modal Controls
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = () => btn.closest('.modal-backdrop').classList.add('hidden');
    });

    // 5. Account Dossier Actions (FIXED & WIRED)
    safeBind('manage-payments-btn', 'click', () => {
        if (state.isSubscribed) {
            showAlert("CHF 20 monthly. Billed to card **** 4242.", "Active Subscription", "fa-credit-card");
        } else {
            if (refs.modalProfile) refs.modalProfile.classList.add('hidden');
            if (refs.modalSub) refs.modalSub.classList.remove('hidden');
        }
    });

    safeBind('terms-btn', 'click', () => {
        if (refs.modalLegal) refs.modalLegal.classList.remove('hidden');
    });

    safeBind('cancel-membership-btn', 'click', async () => {
        const confirm = await showConfirm("End your Elite Journey? Access continues until period end.", "Confirm Cancellation", "fa-ban");
        if (confirm) {
            state.isSubscribed = false;
            showAlert("Membership cancelled.", "Success", "fa-check-circle");
        }
    });

    safeBind('delete-data-btn', 'click', async () => {
        const confirm = await showConfirm("Permanently wipe your history? This cannot be undone.", "Destroy Dossier?", "fa-trash-can");
        if (confirm) {
            state.nodes = [];
            state.placesVisited = 0;
            renderNodes();
            if (refs.modalProfile) refs.modalProfile.classList.add('hidden');
            showAlert("All data purged.", "Securely Deleted", "fa-fire");
        }
    });

    // 6. Subscription & Checkout
    safeBind('settings-btn', 'click', () => {
        if (refs.modalSub) refs.modalSub.classList.remove('hidden');
    });
    safeBind('subscribe-now-btn', 'click', () => {
        if (refs.modalSub) refs.modalSub.classList.add('hidden');
        if (refs.modalCheckout) refs.modalCheckout.classList.remove('hidden');
    });
    safeBind('confirm-payment-btn', 'click', () => {
        const btn = refs.btnConfirmPayment || document.getElementById('confirm-payment-btn');
        const text = btn.querySelector('.btn-text');
        if (text) text.textContent = 'Authorizing...';
        btn.disabled = true;
        setTimeout(() => {
            state.isSubscribed = true;
            if (refs.modalCheckout) refs.modalCheckout.classList.add('hidden');
            showAlert("Welcome to Wanderløst Elite.", "Payment Authorized", "fa-crown");
            btn.disabled = false;
            if (text) text.textContent = 'Pay 20.00 CHF';
        }, 2000);
    });

    // Clean initial history
    if (refs.historyList) refs.historyList.innerHTML = '';
    
    // Renewal Date
    const renewalEl = document.getElementById('dynamic-renewal-date');
    if (renewalEl) {
        const d = new Date(); d.setDate(d.getDate() + 30);
        renewalEl.textContent = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }

    renderNodes();
}

// --- INITIALIZE ---
window.addEventListener('DOMContentLoaded', init);
window.gm_authFailure = () => {
    const s = document.createElement('style');
    s.innerHTML = '.gm-err-container, .dismissButton { display: none !important; }';
    document.head.appendChild(s);
};
