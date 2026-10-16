/**
 * Pull live Lab config from saip-sync so browser + APK stay aligned.
 */
import { Sync } from './sync'

const CACHE_KEY = 'sa_lab_remote_config'
const CACHE_TS = 'sa_lab_remote_config_ts'

export function getCachedConfig() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
  } catch {
    return null
  }
}

export async function fetchRemoteConfig(force = false) {
  const ts = Number(localStorage.getItem(CACHE_TS) || 0)
  if (!force && Date.now() - ts < 5 * 60 * 1000) {
    const c = getCachedConfig()
    if (c) return c
  }
  const base =
    (typeof Sync?.baseUrl === 'function' ? Sync.baseUrl() : null) ||
    localStorage.getItem('sa_api_base') ||
    localStorage.getItem('saip_api') ||
    'https://saip-sync.onrender.com'
  try {
    const res = await fetch(String(base).replace(/\/$/, '') + '/api/config/app', {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error('config ' + res.status)
    const data = await res.json()
    const cfg = data.config || data
    localStorage.setItem(CACHE_KEY, JSON.stringify(cfg))
    localStorage.setItem(CACHE_TS, String(Date.now()))
    if (cfg.google_client_id) {
      try {
        localStorage.setItem('sa_google_client_id', cfg.google_client_id)
      } catch {}
    }
    return cfg
  } catch (e) {
    console.warn('remoteConfig', e)
    return getCachedConfig() || {}
  }
}

export function getAnnouncement() {
  return getCachedConfig()?.announcement || ''
}
