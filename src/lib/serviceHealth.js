/**
 * Synthetic checks against sync + licence public endpoints.
 */
import { SA_CONFIG } from '../config.js'

async function probe(url, { timeoutMs = 8000 } = {}) {
  const started = Date.now()
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
  const t = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: ctrl?.signal,
      cache: 'no-store',
    })
    const ms = Date.now() - started
    let body = null
    try { body = await res.json() } catch {}
    return { ok: res.ok, status: res.status, ms, body, url }
  } catch (e) {
    return { ok: false, status: 0, ms: Date.now() - started, error: e?.message || String(e), url }
  } finally {
    if (t) clearTimeout(t)
  }
}

export async function runServiceHealthChecks() {
  const licenseBase = (SA_CONFIG.defaultLicenseServerUrl || '').replace(/\/$/, '')
  const syncBase = (SA_CONFIG.syncServerUrl || '').replace(/\/$/, '')
  const licenseHealth = await probe(`${licenseBase}/health`)
  const licenseConfig = await probe(`${licenseBase}/api/public-config`)
  let syncHealth = await probe(`${syncBase}/health`)
  if (!syncHealth.ok) syncHealth = await probe(`${syncBase}/api/health`)
  return {
    at: new Date().toISOString(),
    license: licenseHealth,
    licenseConfig,
    sync: syncHealth,
    allOk: !!(licenseHealth.ok && syncHealth.ok),
  }
}
