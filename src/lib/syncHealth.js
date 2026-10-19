import { Sync } from './sync.js'
import { SA_CONFIG } from '../config'

/**
 * Lightweight cloud / offline health for dashboard + command centre.
 */
export async function pingSyncServer(timeoutMs = 5000) {
  const base = (SA_CONFIG?.syncServerUrl || Sync.base || '').replace(/\/$/, '')
  if (!base) return { ok: false, latencyMs: null, error: 'no_server' }
  const t0 = performance.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(base + '/health', { signal: ctrl.signal, cache: 'no-store' })
    const latencyMs = Math.round(performance.now() - t0)
    let body = null
    try {
      body = await res.json()
    } catch {}
    return {
      ok: res.ok,
      status: res.status,
      latencyMs,
      version: body?.version || null,
      body,
    }
  } catch (e) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - t0),
      error: e?.name === 'AbortError' ? 'timeout' : String(e?.message || e),
    }
  } finally {
    clearTimeout(timer)
  }
}

export function offlineQueueSize() {
  try {
    const raw = localStorage.getItem('sa_offline_queue')
    if (!raw) return 0
    const q = JSON.parse(raw)
    return Array.isArray(q) ? q.length : 0
  } catch {
    return 0
  }
}

export async function getSyncHealthSummary() {
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true
  const loggedIn = Sync.isLoggedIn()
  const queue = offlineQueueSize()
  let ping = { ok: false, latencyMs: null }
  if (online) {
    ping = await pingSyncServer()
  }
  return {
    online,
    loggedIn,
    queue,
    pingOk: !!ping.ok,
    latencyMs: ping.latencyMs,
    serverVersion: ping.version || null,
    error: ping.error || null,
  }
}
