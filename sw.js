// ==========================================
// SERVICE WORKER (FRUTISHA PWA - VERSIÓN SPA)
// ==========================================
const CACHE_NAME = 'frutisha-v3';

// ¡Mira qué cortita es la lista ahora! Solo lo esencial.
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/login.html'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia: "Network first, then cache" (Siempre buscar lo más nuevo de internet)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
