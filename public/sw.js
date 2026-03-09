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
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

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
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
