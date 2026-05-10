const CACHE = 'shell-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Anthropic API — always live network, never cached
  if (url.hostname === 'api.anthropic.com') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Non-GET — pass through without cache logic
  if (event.request.method !== 'GET') return;

  // HTML navigation — network-first so deploys reach users without cache bumps
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, copy));
          return res;
        })
        .catch(() =>
          caches.match(event.request)
            .then(hit => hit || caches.match('./index.html'))
        )
    );
    return;
  }

  // Static assets — cache-first, network fallback
  event.respondWith(
    caches.match(event.request).then(hit => hit || fetch(event.request))
  );
});
