// Service Worker robusto para Energy Engine
const CACHE_NAME = 'energy-engine-v2';
const assetsToCache = [
  '/',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assetsToCache).catch(() => {
        console.log('Fallo al cachear algunos recursos iniciales, se intentará luego.');
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // NO interceptar peticiones de Firebase, APIs externas o Workstations internos
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.includes('_workstation') ||
    url.pathname.includes('firebase') ||
    url.hostname.includes('googleapis')
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        const networkResponse = await fetch(event.request);
        
        // Solo cachear respuestas válidas del mismo origen
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // Fallback para navegación offline
        if (event.request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          const offlinePage = await cache.match('/');
          if (offlinePage) return offlinePage;
        }
        
        // Devolver una respuesta vacía válida en lugar de fallar
        return new Response('No disponible sin conexión', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      }
    })()
  );
});
