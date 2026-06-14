/* Финансы — service worker for full offline support */
const CACHE_NAME = 'finance-v6';

/* App shell — everything needed to run the app offline.
   The app is a single self-contained index.html plus its icon and manifest. */
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only handle same-origin requests; let everything else pass through.
  if (url.origin !== self.location.origin) return;

  // For navigations, serve the cached app shell first so the app launches offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html')
        .then((cached) => cached || fetch(req))
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first for all other same-origin assets, with network fallback that
  // also populates the cache so the app becomes fully available offline.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'Финансы', body: 'Напоминание' };
    const options = {
        body: data.body,
        icon: './icon-512.png',
        badge: './icon-512.png',
        data: data.data || {}
    };
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow('./index.html'));
});