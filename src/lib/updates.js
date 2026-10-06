import { SA_CONFIG } from '../config.js'
import { getSetting, setSetting } from './db.js'

/** Fetch latest version info from the license server updates portal. */
export async function checkForUpdates() {
  const base = ((await getSetting('licenseServerUrl', '')) || SA_CONFIG.defaultLicenseServerUrl || '').replace(/\/$/, '')
  if (!base) return { ok: false, error: 'No license server URL' }
  try {
    const res = await fetch(base + '/api/updates/latest', { headers: { Accept: 'application/json' } })
    if (!res.ok) return { ok: false, error: 'HTTP ' + res.status }
    const j = await res.json()
    const current = SA_CONFIG.appVersion
    const latest = j.version
    const newer = latest && latest !== current && String(latest).localeCompare(String(current), undefined, { numeric: true }) > 0
    await setSetting('lastUpdateCheck', { at: new Date().toISOString(), latest, current, response: j })
    return { ok: true, current, latest, newer, mandatory: !!j.mandatory, notes: j.notes, url: j.url, publishedAt: j.publishedAt }
  } catch (e) {
    return { ok: false, error: e.message || String(e) }
  }
}
