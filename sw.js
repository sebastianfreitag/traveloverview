const CACHE_NAME = 'travel-overview-v1';
const APP_SHELL = [
  './',
  './index.html',
  './todo.html',
  './favicon.png',
  './manifest.json',
];

// Install: cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for app shell
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always use network for external APIs and Google services
  const isExternal = url.origin !== self.location.origin;
  const isApiCall = url.pathname.includes('gviz') ||
                    url.hostname.includes('google') ||
                    url.hostname.includes('googleapis') ||
                    url.hostname.includes('nominatim') ||
                    url.hostname.includes('osrm') ||
                    url.hostname.includes('microlink') ||
                    url.hostname.includes('noembed');

  if (isExternal || isApiCall) {
    // Network-first, fall back to cache for GET requests
    if (event.request.method === 'GET') {
      event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
      );
    }
    return;
  }

  // Cache-first for local app shell assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
