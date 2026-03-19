const CACHE_NAME = 'wanderlost-v21-cache';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/core.css',
  '/css/components.css',
  '/js/app.js',
  '/icon-192.png',
  '/icon-512.png',
  '/empty-splash.png'
];

// Install event: Cache core assets
self.addEventListener('install', event => {
  self.skipWaiting(); // Bruteforce installation bypass
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event: Serve cached content when offline, otherwise fetch network
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          // Optional: Return a fallback offline page if network fails
        });
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim()); // Force immediate page control
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
