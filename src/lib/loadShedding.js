/** Load-shedding / offline-aggressive mode (P10.7 SA moat). */
const KEY = 'sa_load_shedding'

export function isLoadSheddingMode() {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

export function setLoadSheddingMode(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0') } catch {}
  try { window.dispatchEvent(new CustomEvent('sa-load-shedding', { detail: { on: !!on } })) } catch {}
}

export function shouldDeferCloud() {
  if (isLoadSheddingMode()) return true
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  return false
}
