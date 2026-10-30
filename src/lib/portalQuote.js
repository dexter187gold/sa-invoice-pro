/**
 * Client portal quote decisions — approve / reject / status helpers.
 * Tries SPA paths first, then saip-sync native paths.
 */

import { getEndpoint } from './devConfig.js'

function portalBase() {
  return getEndpoint('syncServer', 'https://saip-sync.onrender.com')
}
const PORTAL_BASE = 'https://saip-sync.onrender.com' // fallback constant for tests
const LS_DECISIONS = 'saip_portal_decisions_v1'

export const QUOTE_PORTAL_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'converted', 'expired']

export function normalizeQuoteStatus(status) {
  const s = String(status || 'draft').toLowerCase()
  if (s === 'approved') return 'accepted'
  if (s === 'declined' || s === 'refused') return 'rejected'
  return QUOTE_PORTAL_STATUSES.includes(s) ? s : 'draft'
}

export function canDecideQuote(quote) {
  const s = normalizeQuoteStatus(quote?.status)
  return s === 'draft' || s === 'sent'
}

export function buildQuoteDecision(quote, action, note = '') {
  const a = String(action || '').toLowerCase()
  if (a !== 'approve' && a !== 'accept' && a !== 'reject' && a !== 'decline') {
    throw new Error('Action must be approve or reject')
  }
  const accepted = a === 'approve' || a === 'accept'
  const now = new Date().toISOString()
  return {
    quoteId: quote?.id,
    action: accepted ? 'approve' : 'reject',
    status: accepted ? 'accepted' : 'rejected',
    note: String(note || '').slice(0, 500),
    decidedAt: now,
  }
}

export function extractPortalToken(search = '', pathname = '') {
  try {
    const sp = new URLSearchParams(search || '')
    const q = sp.get('token') || sp.get('t')
    if (q) return q
  } catch {}
  const parts = String(pathname || '').split('/').filter(Boolean)
  const idx = parts.indexOf('portal')
  if (idx >= 0 && parts[idx + 1] && parts[idx + 1] !== 'admin') return parts[idx + 1]
  return ''
}

function readDecisionQueue() {
  try {
    return JSON.parse(localStorage.getItem(LS_DECISIONS) || '[]')
  } catch {
    return []
  }
}

function writeDecisionQueue(rows) {
  try {
    localStorage.setItem(LS_DECISIONS, JSON.stringify(rows || []))
  } catch {}
}

export function queuePortalDecision(entry) {
  const rows = readDecisionQueue()
  rows.unshift({ ...entry, queuedAt: new Date().toISOString() })
  writeDecisionQueue(rows.slice(0, 100))
  return entry
}

export function listQueuedPortalDecisions() {
  return readDecisionQueue()
}

export function clearQueuedPortalDecisions() {
  writeDecisionQueue([])
}

async function parseJson(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

export async function fetchPortalView(token, { base = portalBase() } = {}) {
  const t = String(token || '').trim()
  if (!t) throw new Error('Missing portal link')
  const urls = [
    `${base}/api/portal/view/${encodeURIComponent(t)}`,
    `${base}/api/portal/${encodeURIComponent(t)}`,
  ]
  let lastErr = 'Portal not found'
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      const data = await parseJson(res)
      if (res.ok && data) return data
      lastErr = data?.error || data?.message || res.statusText || lastErr
    } catch (e) {
      lastErr = e?.message || lastErr
    }
  }
  throw new Error(lastErr)
}

export async function submitPortalQuoteDecision(
  token,
  quoteId,
  action,
  note = '',
  { base = portalBase(), quote } = {},
) {
  const t = String(token || '').trim()
  if (!t) throw new Error('Missing portal link')
  if (!quoteId) throw new Error('Missing quote')
  const act =
    String(action).toLowerCase() === 'reject' || String(action).toLowerCase() === 'decline'
      ? 'reject'
      : 'approve'
  const noteStr = String(note || '').slice(0, 500)
  const attempts = [
    {
      url: `${base}/api/portal/quote-decision`,
      body: {
        token: t,
        quoteId,
        quote_id: quoteId,
        action: act,
        note: noteStr,
      },
    },
    {
      url: `${base}/api/portal/${encodeURIComponent(t)}/quote/${encodeURIComponent(quoteId)}/decision`,
      body: {
        decision: act === 'reject' ? 'rejected' : 'approved',
        reason: noteStr,
        note: noteStr,
      },
    },
  ]
  let lastErr = 'Could not save decision'
  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(attempt.body),
      })
      const data = await parseJson(res)
      if (res.ok) return { ok: true, online: true, data }
      lastErr = data?.error || data?.message || res.statusText || lastErr
    } catch (e) {
      if (e?.message && !/Failed to fetch|NetworkError|fetch/i.test(e.message)) throw e
      lastErr = e?.message || lastErr
    }
  }
  // Offline queue
  const decision = quote ? buildQuoteDecision(quote, act, noteStr) : null
  queuePortalDecision({
    token: t,
    quoteId,
    action: act,
    note: noteStr,
    decision,
  })
  return {
    ok: true,
    online: false,
    queued: true,
    decision,
    message: 'Saved offline — shop will see this when sync is available',
  }
}

export function applyPortalDecisionLocally(quotes, quoteId, action, note = '') {
  const act = String(action).toLowerCase()
  const status =
    act === 'reject' || act === 'decline' ? 'rejected' : 'accepted'
  return (quotes || []).map((q) =>
    String(q.id) === String(quoteId)
      ? { ...q, status, portalNote: note, decidedAt: new Date().toISOString() }
      : q,
  )
}

export function portalQuoteSummary(quotes = []) {
  const s = { total: quotes.length, accepted: 0, rejected: 0, pending: 0 }
  for (const q of quotes) {
    const st = normalizeQuoteStatus(q.status)
    if (st === 'accepted' || st === 'converted') s.accepted++
    else if (st === 'rejected') s.rejected++
    else s.pending++
  }
  return s
}
