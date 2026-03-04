// This is a basic service worker to make the web application installable.

// On install, the service worker is installed.
self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  // A real-world app would cache assets here.
  self.skipWaiting();
});

// On activate, clean up old caches if any.
self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
  // Claim clients to take control immediately.
  return self.clients.claim();
});

// On fetch, respond from the network.
self.addEventListener('fetch', (event) => {
  // This is required for the app to be considered a PWA.
  // A real app would have a caching strategy here.
  event.respondWith(
    fetch(event.request).catch(() => {
      // Basic offline fallback.
      return new Response(
        'Network error: You are offline and the resource is not cached.',
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        }
      );
    })
  );
});
