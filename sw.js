const CACHE_NAME = 'frutisha-v2'; // Subimos a la versión 2 para forzar el cambio

const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/login.html',
  '/ventas.html',
  '/historial.html',
  '/inventario.html',
  '/reporte-tallas.html'
];

// Instalar y forzar a que tome el control
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Activar y destruir la memoria caché vieja (La que tiene el error)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log("🗑️ Borrando caché vieja:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia: Primero internet (para ver tus cambios), si no hay red, usa la caché
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
