/**
 * Desk polish helpers — small UX / formatting / list utilities (Batch H).
 */
export const ZA_LOCALE = 'en-ZA'
export const ZAR = 'ZAR'

export function formatRands(n, fallback = '—') {
  const v = Number(n)
  if (!Number.isFinite(v)) return fallback
  try {
    return new Intl.NumberFormat(ZA_LOCALE, { style: 'currency', currency: ZAR }).format(v)
  } catch {
    return `R ${v.toFixed(2)}`
  }
}

export function formatPct(n, digits = 0) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return `${(v * 100).toFixed(digits)}%`
}

export function formatDateShort(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(ZA_LOCALE)
  } catch {
    return String(iso).slice(0, 10)
  }
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(ZA_LOCALE)
  } catch {
    return String(iso)
  }
}

export function relativeAge(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms)) return ''
  const m = Math.round(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, Number(n) || 0))
}

export function sumBy(rows, key) {
  return (rows || []).reduce((a, r) => a + (Number(r?.[key]) || 0), 0)
}

export function groupBy(rows, keyFn) {
  const map = {}
  for (const r of rows || []) {
    const k = keyFn(r)
    if (!map[k]) map[k] = []
    map[k].push(r)
  }
  return map
}

export function uniqueBy(rows, keyFn) {
  const seen = new Set()
  const out = []
  for (const r of rows || []) {
    const k = keyFn(r)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
}

export function sortByDateDesc(rows, key = 'date') {
  return [...(rows || [])].sort((a, b) => String(b?.[key] || '').localeCompare(String(a?.[key] || '')))
}

export function sortByNumberDesc(rows, key = 'total') {
  return [...(rows || [])].sort((a, b) => (Number(b?.[key]) || 0) - (Number(a?.[key]) || 0))
}

export function filterOpenInvoices(invoices) {
  return (invoices || []).filter((i) => ['unpaid', 'partial', 'overdue'].includes(String(i.status || 'unpaid')))
}

export function filterPaidInvoices(invoices) {
  return (invoices || []).filter((i) => String(i.status || '') === 'paid')
}

export function isOverdueInvoice(inv, today = new Date()) {
  if (!inv?.dueDate) return false
  if (['paid', 'cancelled', 'void'].includes(String(inv.status || ''))) return false
  const due = new Date(inv.dueDate)
  return due < new Date(today.toISOString().slice(0, 10))
}

export function daysBetween(a, b = new Date()) {
  try {
    const d1 = new Date(a)
    const d2 = new Date(b)
    return Math.round((d2 - d1) / 86400000)
  } catch {
    return null
  }
}

export function emptyToDash(v) {
  const s = String(v ?? '').trim()
  return s || '—'
}

export function truncate(s, n = 80) {
  const t = String(s || '')
  return t.length <= n ? t : t.slice(0, n - 1) + '…'
}

export function titleCase(s) {
  return String(s || '')
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ')
}

export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function parseMoneyInput(raw) {
  const s = String(raw || '').replace(/[R\s,]/gi, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

export function safeJsonParse(raw, fallback = null) {
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function copyText(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(String(text || ''))
  }
  return Promise.reject(new Error('clipboard unavailable'))
}

export function downloadText(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function downloadJson(filename, obj) {
  downloadText(filename, JSON.stringify(obj, null, 2), 'application/json')
}

export function csvEscape(cell) {
  const s = String(cell ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function rowsToCsv(headers, rows) {
  const head = headers.map(csvEscape).join(',')
  const body = rows.map((r) => r.map(csvEscape).join(',')).join('\n')
  return head + '\n' + body
}

export function debounce(fn, ms = 200) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

export function throttle(fn, ms = 200) {
  let last = 0
  let pending
  return (...args) => {
    const now = Date.now()
    if (now - last >= ms) {
      last = now
      fn(...args)
    } else {
      clearTimeout(pending)
      pending = setTimeout(() => {
        last = Date.now()
        fn(...args)
      }, ms - (now - last))
    }
  }
}

export function matchQuery(row, q, fields) {
  const qq = String(q || '').trim().toLowerCase()
  if (!qq) return true
  const blob = fields.map((f) => String(row?.[f] ?? '')).join(' ').toLowerCase()
  return blob.includes(qq)
}

export function pageSlice(rows, page, pageSize) {
  const p = Math.max(1, page | 0)
  const size = Math.max(1, pageSize | 0)
  const start = (p - 1) * size
  return {
    rows: (rows || []).slice(start, start + size),
    page: p,
    pageSize: size,
    total: (rows || []).length,
    pages: Math.max(1, Math.ceil((rows || []).length / size)),
  }
}

export function statusTone(status) {
  const s = String(status || '').toLowerCase()
  if (['paid', 'resolved', 'accepted', 'active'].includes(s)) return 'success'
  if (['overdue', 'rejected', 'cancelled', 'void', 'failed'].includes(s)) return 'danger'
  if (['partial', 'waiting', 'pending'].includes(s)) return 'warn'
  return 'neutral'
}

export function invoiceDueLabel(inv) {
  if (!inv) return '—'
  if (String(inv.status) === 'paid') return 'Paid'
  if (isOverdueInvoice(inv)) return 'Overdue'
  if (inv.dueDate) return `Due ${formatDateShort(inv.dueDate)}`
  return 'Open'
}

export function clientDisplayName(c) {
  if (!c) return '—'
  return c.tradingName || c.name || c.company || 'Client'
}

export function phoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '')
}

export function zaMobileToWa(phone) {
  let d = phoneDigits(phone)
  if (d.startsWith('0') && d.length === 10) d = '27' + d.slice(1)
  if (d.startsWith('27')) return d
  return d
}

export function emailLooksValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

export function vatDigitsOk(vat) {
  const d = String(vat || '').replace(/\D/g, '')
  return !d.length || d.length === 10
}

export function pick(obj, keys) {
  const out = {}
  for (const k of keys) if (obj && obj[k] !== undefined) out[k] = obj[k]
  return out
}

export function omit(obj, keys) {
  const skip = new Set(keys)
  const out = {}
  for (const [k, v] of Object.entries(obj || {})) if (!skip.has(k)) out[k] = v
  return out
}

export function deepFreeze(obj) {
  if (obj && typeof obj === 'object') {
    Object.freeze(obj)
    Object.values(obj).forEach(deepFreeze)
  }
  return obj
}

export function idempotentId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed')
}

export function tryOr(fn, fallback) {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export async function tryOrAsync(fn, fallback) {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

export function listIds(rows) {
  return (rows || []).map((r) => r.id).filter(Boolean)
}

export function indexById(rows) {
  const map = {}
  for (const r of rows || []) if (r?.id != null) map[String(r.id)] = r
  return map
}

export function mergePreferDefined(base, patch) {
  const out = { ...base }
  for (const [k, v] of Object.entries(patch || {})) {
    if (v !== undefined && v !== null && v !== '') out[k] = v
  }
  return out
}

export function outstandingTotal(invoices) {
  return sumBy(filterOpenInvoices(invoices), 'amountDue') || sumBy(filterOpenInvoices(invoices), 'total')
}

export function paidTotal(invoices) {
  return sumBy(filterPaidInvoices(invoices), 'total')
}

export function avgInvoice(invoices) {
  const list = invoices || []
  if (!list.length) return 0
  return sumBy(list, 'total') / list.length
}

export function topClientsBySpend(invoices, clients, limit = 5) {
  const spend = {}
  for (const inv of invoices || []) {
    const id = String(inv.clientId || '')
    spend[id] = (spend[id] || 0) + (Number(inv.total) || 0)
  }
  const ranked = Object.entries(spend)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
  const byId = indexById(clients)
  return ranked.map(([id, total]) => ({ client: byId[id], total }))
}

export function countByStatus(rows, key = 'status') {
  const c = {}
  for (const r of rows || []) {
    const s = String(r?.[key] || 'unknown')
    c[s] = (c[s] || 0) + 1
  }
  return c
}

export function humanFileSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function isBrowserOnline() {
  return typeof navigator === 'undefined' ? true : !!navigator.onLine
}

export function onOnlineChange(cb) {
  if (typeof window === 'undefined') return () => {}
  const up = () => cb(true)
  const down = () => cb(false)
  window.addEventListener('online', up)
  window.addEventListener('offline', down)
  return () => {
    window.removeEventListener('online', up)
    window.removeEventListener('offline', down)
  }
}

export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function scrollToId(id) {
  try {
    document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  } catch {}
}

export function focusSelector(sel) {
  try {
    document.querySelector(sel)?.focus?.()
  } catch {}
}

export const DESK_POLISH_COUNT = 55
