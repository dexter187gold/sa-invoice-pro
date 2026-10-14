/**
 * Personal phone-only offline mode.
 * When enabled: no cloud sync, data stays on this device only.
 */
const KEY = 'sa_solo_offline'

export function isSoloOffline() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setSoloOffline(on) {
  try {
    if (on) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent('sa-solo-mode', { detail: { on: !!on } }))
  } catch {}
}

export function canUseCloudSync() {
  return !isSoloOffline()
}
