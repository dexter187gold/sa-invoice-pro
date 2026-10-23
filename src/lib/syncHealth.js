/**
 * Q9 — Sync health, offline queue status, remote ping
 */
import { SA_CONFIG } from '../config'

export async function pingSyncServer(timeoutMs = 8000) {
  const base = (SA_CONFIG.syncServerUrl || '').replace(/\/$/, '')
  if (!base) return { ok: false, reason: 'no-url' }
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${base}/health`, { signal: ctrl.signal, cache: 'no-store' })
    clearTimeout(t)
    const text = await res.text().catch(() => '')
    let json = null
    try {
      json = JSON.parse(text)
    } catch {}
    return {
      ok: res.ok,
      status: res.status,
      latencyMs: null,
      body: json || text.slice(0, 200),
      version: json?.version || null,
      git: json?.git || null,
      users: json?.users ?? null,
    }
  } catch (e) {
    clearTimeout(t)
    return { ok: false, reason: e?.name === 'AbortError' ? 'timeout' : String(e?.message || e) }
  }
}

export function offlineQueueSize() {
  try {
    const raw = localStorage.getItem('saip_sync_queue') || localStorage.getItem('sync_queue')
    if (!raw) return 0
    const q = JSON.parse(raw)
    return Array.isArray(q) ? q.length : 0
  } catch {
    return 0
  }
}

export function lastSyncAt() {
  try {
    return localStorage.getItem('saip_last_sync') || localStorage.getItem('last_sync_at') || null
  } catch {
    return null
  }
}

export function setLastSyncAt(iso) {
  try {
    localStorage.setItem('saip_last_sync', iso || new Date().toISOString())
  } catch {}
}

export async function runHealthCheck() {
  const started = performance.now()
  const ping = await pingSyncServer()
  const latencyMs = Math.round(performance.now() - started)
  return {
    ...ping,
    latencyMs: ping.ok ? latencyMs : null,
    queue: offlineQueueSize(),
    lastSync: lastSyncAt(),
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    at: new Date().toISOString(),
    git: ping.git || null,
    version: ping.version || null,
    users: ping.users,
  }
}

export function formatHealth(h) {
  if (!h) return 'Unknown'
  if (!h.online) return 'Offline'
  if (h.ok) return `Online · ${h.latencyMs}ms · queue ${h.queue}`
  return `Sync down · ${h.reason || h.status || 'error'} · queue ${h.queue}`
}
