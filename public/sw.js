// Define a unique cache name for this version of the service worker.
const CACHE_NAME = 'energy-engine-cache-v1';

// List of essential files to be cached for the app to work offline.
const CACHE_FILES = [
  '/',
  '/inspection',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Note: Next.js build files (like JS chunks and CSS) will be added to this list dynamically.
  // For now, we set up the core caching logic.
];

// The 'install' event is fired when the service worker is first installed.
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  // waitUntil() ensures that the service worker will not install until the code inside has successfully completed.
  event.waitUntil(
    // Open the cache.
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        // Add all the specified files to the cache.
        return cache.addAll(CACHE_FILES);
      })
      .catch(error => {
        console.error('[Service Worker] Failed to cache app shell:', error);
      })
  );
});

// The 'activate' event is fired when the service worker becomes active.
// This is a good time to manage old caches.
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        // If the cache name is not the current one, delete it.
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  // Tell the active service worker to take control of the page immediately.
  return self.clients.claim();
});

// The 'fetch' event is fired for every network request made by the page.
self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  // For navigation requests (e.g., loading a new page), use a network-first strategy.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/inspection')) // Fallback to the main inspection page if network fails.
    );
    return;
  }

  // For all other requests (assets like JS, CSS, images), use a cache-first strategy.
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // If the request is in the cache, return the cached response.
        if (response) {
          return response;
        }
        
        // If the request is not in the cache, fetch it from the network.
        return fetch(event.request).then((networkResponse) => {
          // And cache the new response for future use.
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
      .catch(error => {
        console.error('[Service Worker] Fetch failed:', error);
        // You could return a fallback asset here if needed, e.g., an offline placeholder image.
      })
  );
});
