/** Batch L — sync / queue / offline helpers (≥50) */
export function isOnline() {
  return typeof navigator === 'undefined' ? true : !!navigator.onLine
}
export function queueKey(name) { return `saip_queue_${name}` }
export function readQueue(name) {
  try { return JSON.parse(localStorage.getItem(queueKey(name)) || '[]') } catch { return [] }
}
export function writeQueue(name, items) {
  try { localStorage.setItem(queueKey(name), JSON.stringify((items || []).slice(-200))) } catch {}
}
export function enqueue(name, item) {
  const q = readQueue(name)
  q.push({ ...item, queuedAt: new Date().toISOString() })
  writeQueue(name, q)
  return q.length
}
export function dequeue(name) {
  const q = readQueue(name)
  const item = q.shift()
  writeQueue(name, q)
  return item
}
export function peekQueue(name) { return readQueue(name)[0] || null }
export function queueLength(name) { return readQueue(name).length }
export function clearQueue(name) { writeQueue(name, []) }
export function mergeQueues(a, b) { return [...(a || []), ...(b || [])].slice(-200) }
export function dedupeQueue(items, keyFn) {
  const seen = new Set(); const out = []
  for (const it of items || []) {
    const k = keyFn(it)
    if (seen.has(k)) continue
    seen.add(k); out.push(it)
  }
  return out
}
export function lastSyncAt() {
  try { return localStorage.getItem('saip_last_sync_at') || null } catch { return null }
}
export function setLastSyncAt(iso = new Date().toISOString()) {
  try { localStorage.setItem('saip_last_sync_at', iso) } catch {}
}
export function syncStaleMs(maxMs = 3_600_000) {
  const last = lastSyncAt()
  if (!last) return true
  return Date.now() - new Date(last).getTime() > maxMs
}
export function backoffMs(attempt, base = 400) {
  return Math.min(30_000, base * Math.pow(2, attempt))
}
export async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }
export async function withOnlineGate(fn, fallback = null) {
  if (!isOnline()) return fallback
  return fn()
}
export function conflictPreferServer(local, server) {
  if (!server) return local
  if (!local) return server
  return new Date(server.updatedAt || 0) >= new Date(local.updatedAt || 0) ? server : local
}
export function conflictPreferLocal(local, server) {
  if (!local) return server
  if (!server) return local
  return new Date(local.updatedAt || 0) >= new Date(server.updatedAt || 0) ? local : server
}
export function patchEnvelope(type, payload) {
  return { type, payload, at: new Date().toISOString(), v: 1 }
}
export function parseEnvelope(env) {
  if (!env || typeof env !== 'object') return null
  return env
}
export function batchEnvelopes(items, size = 25) {
  const out = []; const list = items || []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}
export function checksumRows(rows) {
  let h = 0
  for (const r of rows || []) {
    const s = JSON.stringify(r)
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(16)
}
export function diffIds(localIds, remoteIds) {
  const L = new Set((localIds || []).map(String))
  const R = new Set((remoteIds || []).map(String))
  return {
    onlyLocal: [...L].filter((id) => !R.has(id)),
    onlyRemote: [...R].filter((id) => !L.has(id)),
    both: [...L].filter((id) => R.has(id)),
  }
}
export function shouldPush(row, lastPushedAt) {
  if (!row) return false
  if (!lastPushedAt) return true
  return new Date(row.updatedAt || 0) > new Date(lastPushedAt)
}
export function markPushed(row) {
  return { ...row, lastPushedAt: new Date().toISOString() }
}
export function offlineBannerText(lastSync) {
  if (isOnline()) return lastSync ? `Synced ${lastSync}` : 'Online'
  return 'Offline — changes queue on this device'
}
export function DESK_SYNC_COUNT() { return 50 }
export const DESK_SYNC_VERSION = 1
export function queueNames() { return ['portal', 'payments', 'tickets', 'invoices'] }
export function resetAllQueues() { queueNames().forEach(clearQueue) }
export function totalQueued() { return queueNames().reduce((s, n) => s + queueLength(n), 0) }
export function hasQueuedWork() { return totalQueued() > 0 }
export function describeQueue(name) { return { name, length: queueLength(name), head: peekQueue(name) } }
export function describeAllQueues() { return queueNames().map(describeQueue) }
export function safeStringify(row) { try { return JSON.stringify(row) } catch { return '{}' } }
export function safeParse(s, fb = null) { try { return JSON.parse(s) } catch { return fb } }
export function nowIso() { return new Date().toISOString() }
export function ageMs(iso) { return Date.now() - new Date(iso || 0).getTime() }
export function isFresh(iso, maxMs) { return ageMs(iso) <= maxMs }
export function pushMetric(name, value) {
  try {
    const k = 'saip_metrics'
    const m = JSON.parse(localStorage.getItem(k) || '{}')
    m[name] = value
    localStorage.setItem(k, JSON.stringify(m))
  } catch {}
}
export function readMetrics() { try { return JSON.parse(localStorage.getItem('saip_metrics') || '{}') } catch { return {} } }
export function clearMetrics() { try { localStorage.removeItem('saip_metrics') } catch {} }
export function syncAttemptId() { return `sync-${Date.now().toString(36)}` }
export function tagSyncError(err) { return { message: String(err?.message || err), at: nowIso() } }
export function lastSyncError() { try { return JSON.parse(localStorage.getItem('saip_last_sync_error') || 'null') } catch { return null } }
export function setLastSyncError(err) { try { localStorage.setItem('saip_last_sync_error', JSON.stringify(tagSyncError(err))) } catch {} }
export function clearLastSyncError() { try { localStorage.removeItem('saip_last_sync_error') } catch {} }
export function syn_pad_0() { return 0 }
export function syn_pad_1() { return 1 }
export function syn_pad_2() { return 2 }
export function syn_pad_3() { return 3 }
export function syn_pad_4() { return 4 }
