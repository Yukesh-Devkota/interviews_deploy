const CACHE_NAME = 'interview-assistant-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/ui.js',
  '/manifest.json',
  '/assets/favicon.ico' // Include favicon in cache list
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache).catch((error) => {
        console.error('Failed to cache some assets:', error);
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response; // Return cached response if found
      }
      return fetch(event.request).catch((error) => {
        console.error('Fetch failed for:', event.request.url, error);
        // Optionally return a fallback response for failed fetches
        if (event.request.url.includes('favicon.ico')) {
          return new Response('', { status: 404, statusText: 'Not Found' });
        }
        return new Response('Network error occurred', {
          status: 503,
          statusText: 'Service Unavailable'
        });
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
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});