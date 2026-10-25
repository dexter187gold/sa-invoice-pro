/* SA Invoice Pro · Service worker v6.4.0 */
const CACHE = 'saip-v6.4.0'
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icon.svg']
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.hostname.includes('saip-sync') || url.pathname.startsWith('/api/')) return
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put('/index.html', copy)).catch(() => {})
        return res
      }).catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    )
    return
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req).then((res) => {
        if (res && res.ok && url.origin === self.location.origin) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        }
        return res
      }).catch(() => cached)
      return fetched.catch(() => cached)
    })
  )
})
