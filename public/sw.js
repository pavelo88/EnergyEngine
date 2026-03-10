const CACHE_NAME = 'energy-engine-cache-v1';
// Lista de archivos fundamentales para que la app 'shell' funcione offline.
// Next.js genera archivos con hashes, por lo que un enfoque más dinámico es mejor.
// Este service worker cacheará las rutas principales y luego cualquier nueva petición.
const urlsToCache = [
  '/',
  '/inspection',
  '/manifest.json'
];

// Evento de instalación: se abre el caché y se guardan los archivos base.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de fetch: intercepta todas las peticiones de red.
self.addEventListener('fetch', event => {
  event.respondWith(
    // 1. Intenta encontrar la respuesta en el caché.
    caches.match(event.request)
      .then(response => {
        // Si se encuentra en caché, la devuelve.
        if (response) {
          return response;
        }

        // 2. Si no está en caché, la busca en la red.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Si la respuesta de red no es válida, la devuelve tal cual.
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clona la respuesta válida.
            const responseToCache = response.clone();

            // Abre el caché y guarda la nueva respuesta.
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});

// Evento de activación: limpia cachés antiguos para mantener la app actualizada.
self.addEventListener('activate', event => {
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
