// V2 Bypass: Force all caches to delete
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        return caches.delete(key);
      }));
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Pass through all requests directly to network
});
