// Service Worker
const CACHE_NAME = 'interview-assist-v1';
const urlsToCache = [
  '/',
  '/dashboard.html',
  '/css/styles.css',
  '/css/base.css',
  '/css/dashboard.css',
  '/js/supabase.min.js',
  '/js/auth.js',
  '/js/ui.js',
  '/js/storage.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if available
        if (response) {
          console.log(`Serving ${event.request.url} from cache`);
          return response;
        }

        // Clone the request to avoid modifying the original
        const fetchRequest = event.request.clone();

        // Only fetch and cache GET requests
        if (fetchRequest.method === 'GET') {
          return fetch(fetchRequest).then((fetchResponse) => {
            // Check if we received a valid response
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }

            // Clone the response to avoid modifying the original
            const responseToCache = fetchResponse.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return fetchResponse;
          });
        }

        // For non-GET requests (e.g., POST), fetch directly without caching
        return fetch(fetchRequest);
      })
      .catch((error) => {
        console.error('Fetch error:', error);
        // Optionally return a fallback response for offline mode
        return caches.match('/dashboard.html');
      })
  );
});
