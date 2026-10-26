/** Load-shedding / offline-first mode (P10.7). */

const KEY = 'sa_load_shedding'
const QUEUE_KEY = 'sa_sms_queue'

export function isLoadSheddingMode() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setLoadSheddingMode(on) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent('sa-load-shedding', { detail: { on: !!on } }))
  } catch {}
  return !!on
}

export function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

/** Queue outbound SMS/WA for when grid returns */
export function enqueueOutbound({ channel = 'wa', phone, text, meta = {} } = {}) {
  const list = listOutboundQueue()
  const entry = {
    id: `q-${Date.now().toString(36)}`,
    channel,
    phone: String(phone || ''),
    text: String(text || ''),
    meta,
    createdAt: new Date().toISOString(),
    sent: false,
  }
  list.unshift(entry)
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(0, 200)))
  } catch {}
  return entry
}

export function listOutboundQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const v = raw ? JSON.parse(raw) : []
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function clearSentFromQueue() {
  const next = listOutboundQueue().filter((e) => !e.sent)
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(next))
  } catch {}
  return next
}

export function markQueueSent(id) {
  const list = listOutboundQueue().map((e) => (e.id === id ? { ...e, sent: true, sentAt: new Date().toISOString() } : e))
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(list))
  } catch {}
  return list
}

/** Prefer queue when load-shedding or offline; else allow live open */
export function shouldQueueOutbound() {
  return isLoadSheddingMode() || isOffline()
}
