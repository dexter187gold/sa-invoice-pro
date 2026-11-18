/**
 * Desk guards — security, privacy, stability helpers (Batch I).
 */
const LS_LOCK = 'saip_workspace_locked'
const LS_FAILS = 'saip_auth_fail_count'
const LS_LAST_ACTIVE = 'saip_last_active_at'

export function markActivity() {
  try {
    localStorage.setItem(LS_LAST_ACTIVE, String(Date.now()))
  } catch {}
}

export function lastActivityAt() {
  try {
    return Number(localStorage.getItem(LS_LAST_ACTIVE) || 0)
  } catch {
    return 0
  }
}

export function idleMs() {
  const last = lastActivityAt()
  if (!last) return 0
  return Date.now() - last
}

export function shouldAutoLock(minutes = 15) {
  return idleMs() > minutes * 60_000
}

export function setWorkspaceLocked(locked) {
  try {
    if (locked) localStorage.setItem(LS_LOCK, '1')
    else localStorage.removeItem(LS_LOCK)
  } catch {}
}

export function isWorkspaceLocked() {
  try {
    return localStorage.getItem(LS_LOCK) === '1'
  } catch {
    return false
  }
}

export function bumpAuthFail() {
  try {
    const n = Number(localStorage.getItem(LS_FAILS) || 0) + 1
    localStorage.setItem(LS_FAILS, String(n))
    return n
  } catch {
    return 0
  }
}

export function clearAuthFails() {
  try {
    localStorage.removeItem(LS_FAILS)
  } catch {}
}

export function authFailCount() {
  try {
    return Number(localStorage.getItem(LS_FAILS) || 0)
  } catch {
    return 0
  }
}

export function isAuthThrottled(max = 8) {
  return authFailCount() >= max
}

export function redactEmail(email) {
  const s = String(email || '')
  const at = s.indexOf('@')
  if (at < 2) return '***'
  return s[0] + '***' + s.slice(at)
}

export function redactPhone(phone) {
  const d = String(phone || '').replace(/\D/g, '')
  if (d.length < 6) return '***'
  return d.slice(0, 2) + '****' + d.slice(-2)
}

export function stripHtml(input) {
  return String(input || '').replace(/<[^>]*>/g, '')
}

export function sanitizeFilename(name) {
  return String(name || 'file')
    .replace(/[^\w.\- ()]+/g, '_')
    .slice(0, 120)
}

export function isSafeHttpUrl(url) {
  try {
    const u = new URL(url, typeof location !== 'undefined' ? location.origin : 'https://local')
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

export function isSameOriginUrl(url) {
  try {
    const u = new URL(url, location.origin)
    return u.origin === location.origin
  } catch {
    return false
  }
}

export function preventExternalNav(url) {
  if (!isSafeHttpUrl(url)) return false
  if (isSameOriginUrl(url)) return true
  return false
}

export function maskSecret(s, keep = 4) {
  const t = String(s || '')
  if (t.length <= keep) return '****'
  return '*'.repeat(Math.max(4, t.length - keep)) + t.slice(-keep)
}

export function constantTimeEqual(a, b) {
  const x = String(a || '')
  const y = String(b || '')
  if (x.length !== y.length) return false
  let out = 0
  for (let i = 0; i < x.length; i++) out |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return out === 0
}

export function rateLimitBucket(key, limit = 20, windowMs = 60_000) {
  const k = `saip_rl_${key}`
  try {
    const raw = JSON.parse(sessionStorage.getItem(k) || '{"n":0,"t":0}')
    const now = Date.now()
    if (now - (raw.t || 0) > windowMs) {
      sessionStorage.setItem(k, JSON.stringify({ n: 1, t: now }))
      return { ok: true, remaining: limit - 1 }
    }
    if ((raw.n || 0) >= limit) return { ok: false, remaining: 0 }
    raw.n = (raw.n || 0) + 1
    sessionStorage.setItem(k, JSON.stringify(raw))
    return { ok: true, remaining: limit - raw.n }
  } catch {
    return { ok: true, remaining: limit }
  }
}

export function requireConfirm(message) {
  if (typeof window === 'undefined') return true
  return window.confirm(message || 'Continue?')
}

export function guardDestructive(actionLabel) {
  return requireConfirm(`This cannot be easily undone: ${actionLabel || 'continue'}?`)
}

export function validateRequired(fields) {
  const missing = []
  for (const [k, v] of Object.entries(fields || {})) {
    if (v == null || String(v).trim() === '') missing.push(k)
  }
  return { ok: !missing.length, missing }
}

export function validateAmount(n, { min = 0, max = 1e9 } = {}) {
  const v = Number(n)
  if (!Number.isFinite(v)) return { ok: false, reason: 'not_a_number' }
  if (v < min) return { ok: false, reason: 'below_min' }
  if (v > max) return { ok: false, reason: 'above_max' }
  return { ok: true, value: v }
}

export function validateVatNumber(vat) {
  const d = String(vat || '').replace(/\D/g, '')
  if (!d) return { ok: true, empty: true }
  if (d.length !== 10) return { ok: false, reason: 'length' }
  return { ok: true, digits: d }
}

export function validateSaPhone(phone) {
  const d = String(phone || '').replace(/\D/g, '')
  if (!d) return { ok: true, empty: true }
  if (d.length === 10 && d.startsWith('0')) return { ok: true, digits: d }
  if (d.length === 11 && d.startsWith('27')) return { ok: true, digits: d }
  return { ok: false, reason: 'format' }
}

export function schemaKeysPresent(obj, keys) {
  const missing = keys.filter((k) => obj?.[k] === undefined)
  return { ok: !missing.length, missing }
}

export function freezeConfig(cfg) {
  return Object.freeze({ ...cfg })
}

export function safeLocalGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function safeLocalSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function safeSessionGet(key, fallback = null) {
  try {
    const raw = sessionStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function safeSessionSet(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function clearSensitiveSessionKeys(prefixes = ['saip_', 'sa_']) {
  try {
    const keys = []
    for (let i = 0; i < sessionStorage.length; i++) keys.push(sessionStorage.key(i))
    for (const k of keys) {
      if (prefixes.some((p) => String(k).startsWith(p))) sessionStorage.removeItem(k)
    }
  } catch {}
}

export function auditLocal(event, detail = {}) {
  try {
    const list = safeLocalGet('saip_local_audit', []) || []
    list.unshift({ event, detail, at: new Date().toISOString() })
    safeLocalSet('saip_local_audit', list.slice(0, 100))
  } catch {}
}

export function readLocalAudit(limit = 20) {
  const list = safeLocalGet('saip_local_audit', []) || []
  return list.slice(0, limit)
}

export function detectStorageQuotaError(err) {
  const m = String(err?.message || err || '').toLowerCase()
  return /quota|storage|exceeded|disk/.test(m)
}

export function isPrivateModeGuess() {
  try {
    const x = '__saip_probe__'
    localStorage.setItem(x, '1')
    localStorage.removeItem(x)
    return false
  } catch {
    return true
  }
}

export function csrfTokenLocal() {
  let t = safeSessionGet('saip_csrf', null)
  if (!t) {
    t = Math.random().toString(36).slice(2) + Date.now().toString(36)
    safeSessionSet('saip_csrf', t)
  }
  return t
}

export function verifyCsrf(token) {
  return constantTimeEqual(String(token || ''), String(csrfTokenLocal() || ''))
}

export function lockPayload(obj) {
  return JSON.parse(JSON.stringify(obj || {}))
}

export function maxList(rows, n = 500) {
  return (rows || []).slice(0, n)
}

export function guardLoop(n, max = 10_000) {
  if (n > max) throw new Error('Loop guard exceeded')
}

export function withTimeout(promise, ms = 15000, label = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timed out`)), ms)),
  ])
}

export function retry(fn, { tries = 3, delayMs = 400 } = {}) {
  return (async () => {
    let last
    for (let i = 0; i < tries; i++) {
      try {
        return await fn(i)
      } catch (e) {
        last = e
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)))
      }
    }
    throw last
  })()
}

export function isDevHost() {
  try {
    const h = location.hostname
    return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.pages.dev')
  } catch {
    return false
  }
}

export function featureFlag(name, defaultOn = false) {
  try {
    const raw = localStorage.getItem(`saip_ff_${name}`)
    if (raw == null) return defaultOn
    return raw === '1' || raw === 'true'
  } catch {
    return defaultOn
  }
}

export function setFeatureFlag(name, on) {
  try {
    localStorage.setItem(`saip_ff_${name}`, on ? '1' : '0')
  } catch {}
}

export function privacyModeEnabled() {
  return featureFlag('privacy_mode', false)
}

export function displayNamePrivacy(name) {
  if (!privacyModeEnabled()) return name
  const s = String(name || '')
  if (s.length < 3) return '***'
  return s[0] + '***'
}

export function logWarn(scope, err) {
  try {
    console.warn(`[${scope}]`, err?.message || err)
    auditLocal('warn', { scope, message: String(err?.message || err) })
  } catch {}
}

export function assertStoreName(name, allowed) {
  if (!allowed.includes(name)) throw new Error(`Store not allowed: ${name}`)
  return name
}

export function paymentReferenceSafe(ref) {
  return String(ref || '')
    .replace(/[^\w\-./]+/g, '')
    .slice(0, 64)
}

export function invoiceNumberSafe(n) {
  return String(n || '')
    .replace(/[^\w\-]+/g, '')
    .slice(0, 32)
}

export function clientIdSafe(id) {
  return String(id || '').replace(/[^\w\-]+/g, '').slice(0, 64)
}

export function noPrototypePollution(obj) {
  if (!obj || typeof obj !== 'object') return {}
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue
    out[k] = v
  }
  return out
}

export function stableStringify(obj) {
  return JSON.stringify(obj, Object.keys(obj || {}).sort())
}

export function hashLite(str) {
  let h = 0
  const s = String(str || '')
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(16)
}

export function integrityStamp(obj) {
  return hashLite(stableStringify(obj))
}

export const DESK_GUARDS_COUNT = 55
