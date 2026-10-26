import { Sync } from './sync'

let _ran = false

/** After Google/email cloud token exists, pull workspace once per session */
export async function maybeRestoreCloudProfile({ refresh } = {}) {
  if (_ran) return { skipped: true }
  if (!Sync.isLoggedIn()) return { skipped: true, reason: 'not_logged_in' }
  _ran = true
  try {
    const r = await Sync.restoreFromCloud()
    if (r?.restored && typeof refresh === 'function') await refresh()
    return r
  } catch (e) {
    return { ok: false, error: e.message || String(e) }
  }
}
