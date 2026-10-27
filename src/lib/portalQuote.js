/**
 * Client portal quote decisions — approve / reject / status helpers.
 * Tries SPA paths first, then saip-sync native paths.
 */

const PORTAL_BASE = 'https://saip-sync.onrender.com'
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
    ...quote,
    status: accepted ? 'accepted' : 'rejected',
    portalDecision: accepted ? 'accepted' : 'rejected',
    portalDecisionAt: now,
    portalNote: String(note || '').slice(0, 500),
    updatedAt: now,
  }
}

export function extractPortalToken(search = '', pathname = '') {
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    const q = params.get('t') || params.get('token') || params.get('portal')
    if (q) return String(q).trim()
  } catch {}
  const m = String(pathname || '').match(/\/portal\/([^/?#]+)/i)
  return m ? decodeURIComponent(m[1]) : ''
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
    localStorage.setItem(LS_DECISIONS, JSON.stringify(rows.slice(-100)))
  } catch {}
}

export function queuePortalDecision(entry) {
  const rows = readDecisionQueue()
  rows.push({
    ...entry,
    queuedAt: new Date().toISOString(),
    id: 'pd_' + Date.now().toString(36),
  })
  writeDecisionQueue(rows)
  return rows
}

export function listQueuedPortalDecisions() {
  return readDecisionQueue()
}

export function clearQueuedPortalDecisions() {
  writeDecisionQueue([])
}

async function parseJson(res) {
  return res.json().catch(() => ({}))
}

export async function fetchPortalView(token, { base = PORTAL_BASE } = {}) {
  const t = String(token || '').trim()
  if (!t) throw new Error('Missing portal link')
  const paths = [
    `${base}/api/portal/view/${encodeURIComponent(t)}`,
    `${base}/api/portal/${encodeURIComponent(t)}`,
  ]
  let lastErr = 'Portal link invalid or expired'
  for (const url of paths) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      const data = await parseJson(res)
      if (res.ok) return data
      lastErr = data.error || data.message || lastErr
      // 404 on alias → try next
      if (res.status === 404 || res.status === 405) continue
      throw new Error(lastErr)
    } catch (e) {
      if (e?.message && !/Failed to fetch|NetworkError|fetch/i.test(e.message)) throw e
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
  { base = PORTAL_BASE, quote } = {},
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
      if (res.ok) return { ...data, ok: true, offline: false }
      lastErr = data.error || data.message || lastErr
      if (res.status === 404 || res.status === 405) continue
      // Business errors (409 already decided) should not go offline-queue as success path
      if (res.status >= 400 && res.status < 500 && res.status !== 404) {
        throw new Error(lastErr)
      }
    } catch (e) {
      if (e?.message && !/Failed to fetch|NetworkError|fetch/i.test(e.message)) {
        // rethrow client errors after queue? only queue network failures
        if (!/already decided|not found|required/i.test(e.message)) {
          /* fall through */
        } else {
          throw e
        }
      }
      lastErr = e?.message || lastErr
    }
  }
  const decision = quote ? buildQuoteDecision(quote, act, noteStr) : null
  queuePortalDecision({
    token: t,
    quoteId,
    action: act,
    note: noteStr,
    error: lastErr,
  })
  return {
    ok: true,
    offline: true,
    decision,
    message: 'Saved offline — shop will see this when sync is available',
  }
}

export function applyPortalDecisionLocally(quotes, quoteId, action, note = '') {
  const list = Array.isArray(quotes) ? quotes : []
  const idx = list.findIndex((q) => String(q.id) === String(quoteId))
  if (idx < 0) return { quotes: list, updated: null }
  const updated = buildQuoteDecision(list[idx], action, note)
  const next = list.slice()
  next[idx] = updated
  return { quotes: next, updated }
}

export function portalQuoteSummary(quotes = []) {
  const out = { total: 0, open: 0, accepted: 0, rejected: 0, converted: 0 }
  for (const q of quotes || []) {
    out.total++
    const s = normalizeQuoteStatus(q.status)
    if (s === 'accepted') out.accepted++
    else if (s === 'rejected') out.rejected++
    else if (s === 'converted') out.converted++
    else if (canDecideQuote(q)) out.open++
  }
  return out
}
