const CACHE_NAME = 'energy-engine-cache-v1';

// Install event: cache the app shell
self.addEventListener('install', (event) => {
  // Perform install steps
  // We can pre-cache main assets here if we know their paths
  // For Next.js, filenames have hashes, so it's better to cache dynamically
  console.log('[Service Worker] Install');
  event.waitUntil(self.skipWaiting()); // Activate worker immediately
});


// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all clients
  );
});


// Fetch event: serve from cache, fall back to network, and cache new requests
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Network-first strategy
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return fetch(event.request).then((response) => {
        // If we get a valid response, we cache it and return it
        if (response && response.status === 200) {
          cache.put(event.request, response.clone());
        }
        return response;
      }).catch(() => {
        // If the network fails, we try to get it from the cache
        return cache.match(event.request);
      });
    })
  );
});
