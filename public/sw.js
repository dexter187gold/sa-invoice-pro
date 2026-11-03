/* SA Invoice Pro — installable shell cache */
const CACHE = 'saip-shell-v8'
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.hostname.includes('saip-sync') || url.hostname.includes('onrender.com') || url.pathname.startsWith('/api/')) return
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/index.html', copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/'))),
    )
    return
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((res) => {
          if (res && res.ok && url.origin === self.location.origin) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
          }
          return res
        })
        .catch(() => cached)
      return cached || fetched
    }),
  )
})


self.addEventListener('push', (event) => {
  let payload = {}
  try { payload = event.data ? event.data.json() : {} } catch {}
  const title = String(payload.title || 'SA Invoice Pro alert').slice(0, 120)
  const options = {
    body: String(payload.body || 'You have a new update.').slice(0, 240),
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: String(payload.tag || 'saip-notification').slice(0, 100),
    renotify: true,
    data: { url: typeof payload.url === 'string' && payload.url.startsWith('/') ? payload.url : '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clientsList) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        await client.focus()
        if ('navigate' in client && client.url !== target) await client.navigate(target)
        return
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target)
  })())
})
