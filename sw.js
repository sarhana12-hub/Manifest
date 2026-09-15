const CACHE = 'manifest-v19';
const SHELL = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

// GitHub Pages serves everything with Cache-Control: max-age=600, which we
// can't override (static host, no server config). `cache: 'no-store'` makes
// every fetch here bypass that entirely — otherwise "fresh" installs and
// revalidation could silently reuse a browser-cached response that's up to
// 10 minutes stale, on top of the normal cache-storage layer below.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(SHELL.map((url) =>
        fetch(url, { cache: 'no-store' }).then((res) => c.put(url, res))
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Cache-first with background revalidation: everything here is local-only
// (no live backend), so instant offline load matters more than freshness —
// the cache updates quietly from the network for next time.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request, { cache: 'no-store' }).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
