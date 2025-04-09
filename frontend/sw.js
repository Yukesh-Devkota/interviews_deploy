const CACHE_NAME = 'interview-assistant-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/dashboard.html',
  '/css/styles.css',
  '/css/index.css',
  '/js/ui.js',
  '/js/auth.js',
  '/manifest.json',
  '/assets/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      // Cache assets individually to avoid addAll failure
      return Promise.all(
        urlsToCache.map((url) => {
          return cache.add(url).catch((error) => {
            console.error(`Failed to cache ${url}:`, error);
          });
        })
      ).then(() => {
        console.log('Caching complete');
      });
    }).catch((error) => {
      console.error('Cache setup failed:', error);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        console.log(`Serving ${event.request.url} from cache`);
        return response;
      }
      return fetch(event.request).then((networkResponse) => {
        // Optionally cache successful fetches dynamically
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch((error) => {
        console.error('Fetch failed for:', event.request.url, error);
        if (event.request.url.includes('favicon.ico')) {
          return new Response('', { status: 404, statusText: 'Not Found' });
        }
        return new Response('Offline: Network error occurred', {
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
            console.log(`Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Cache cleanup complete');
    })
  );
});
