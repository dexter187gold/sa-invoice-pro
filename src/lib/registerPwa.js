/** Register service worker for installable / offline shell */
export function registerPwa() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  const run = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      console.warn('[pwa] SW register failed', err)
    })
  }
  if (document.readyState === 'complete') run()
  else window.addEventListener('load', run)
}
