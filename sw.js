/* 奇遇护照 · service worker
   App shell -> cache-first (works fully offline once installed).
   CDN resources (fonts / d3 / world map data) -> network-first with cache
   fallback, so the map still works offline after the first successful visit,
   but picks up updates whenever there's a connection. */

const VERSION = 'v16';
const SHELL_CACHE = 'ap-shell-' + VERSION;
const RUNTIME_CACHE = 'ap-runtime-' + VERSION;

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== SHELL_CACHE && n !== RUNTIME_CACHE)
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    // App shell: cache-first
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
  } else {
    // Third-party (fonts, d3, topojson, world-atlas map data): network-first,
    // fall back to cache so it still works offline after first load.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});
