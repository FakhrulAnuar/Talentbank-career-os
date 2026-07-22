/* ASCEND service worker. Minimal + network-first so the app is installable ("Add to Home
   Screen") and loads offline as a shell, without ever serving stale API data or code.
   API calls (/api/*) always go to the network. */
const CACHE = 'ascend-shell-v1';
const SHELL = ['/', '/index.html', '/icon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  // Never cache API or non-GET requests - always hit the network.
  if (request.method !== 'GET' || new URL(request.url).pathname.startsWith('/api/')) return;

  // Network-first: fresh when online, cached shell when offline.
  e.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match('/index.html')))
  );
});
