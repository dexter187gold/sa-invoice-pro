/* SA Invoice Pro SW – network-first code, auto-activate, notify clients to reload */
const CACHE = 'sa-invoice-v3.2.1';
const CORE = ['./index.html', './manifest.json', './icons/logo.svg'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
  // Tell all tabs to reload once
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(c => c.postMessage({ type: 'SA_SW_UPDATED', cache: CACHE }));
  });
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  const isCode = /\.(js|css)(\?|$)/i.test(url.pathname) || url.pathname.includes('/js/');
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(m => m || (isCode ? undefined : caches.match('./index.html'))))
  );
});
