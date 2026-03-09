<<<<<<< HEAD
const CACHE_NAME = 'energy-engine-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon.svg',
  // Agrega aquí otras rutas y assets estáticos que quieras cachear
  // por ejemplo: '/styles/globals.css', '/images/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
=======
// This is a basic service worker for caching assets.
// It helps the app work offline and load faster.

const CACHE_NAME = 'energy-engine-cache-v1';
const urlsToCache = [
  '/',
  '/inspection',
  // Next.js static files are automatically handled by its service worker integration,
  // but we can add some explicit ones if needed. For now, we'll keep it simple.
  // '/_next/static/css/...',
  // '/_next/static/chunks/...',
];

// Install a service worker
self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

<<<<<<< HEAD
self.addEventListener('fetch', (event) => {
  // Ignorar todas las peticiones que no sean GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Estrategia: Network falling back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es válida, la clonamos y la guardamos en caché
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Si la red falla, intentamos servir desde la caché
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            // Si tampoco está en caché, podrías devolver una página de offline genérica
            // Por ahora, simplemente dejamos que falle.
          });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
=======
// Cache and return requests
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // IMPORTANT: Clone the request. A request is a stream and
        // can only be consumed once. Since we are consuming this
        // once by cache and once by the browser for fetch, we need
        // to clone the response.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          function(response) {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});

// Update a service worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
