/**
 * Client portal quote decisions — approve / reject / status helpers.
 * Pure where possible; network calls go through Sync BASE.
 */

const PORTAL_BASE = 'https://saip-sync.onrender.com'

export const QUOTE_PORTAL_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'converted', 'expired']

/** Normalise quote status for portal UI. */
export function normalizeQuoteStatus(status) {
  const s = String(status || 'draft').toLowerCase()
  if (s === 'approved') return 'accepted'
  if (s === 'declined' || s === 'refused') return 'rejected'
  return QUOTE_PORTAL_STATUSES.includes(s) ? s : 'draft'
}

/** Whether the client may still approve or reject. */
export function canDecideQuote(quote) {
  const s = normalizeQuoteStatus(quote?.status)
  return s === 'draft' || s === 'sent'
}

/** Build local decision payload applied after a successful portal action. */
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

/** Extract portal token from path or query (?t= / ?token= / /portal/:token). */
export function extractPortalToken(search = '', pathname = '') {
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    const q = params.get('t') || params.get('token') || params.get('portal')
    if (q) return String(q).trim()
  } catch {}
  const m = String(pathname || '').match(/\/portal\/([^/?#]+)/i)
  return m ? decodeURIComponent(m[1]) : ''
}

/** Fetch portal payload (company + client + quotes + invoices) by token. */
export async function fetchPortalView(token, { base = PORTAL_BASE } = {}) {
  const t = String(token || '').trim()
  if (!t) throw new Error('Missing portal link')
  const res = await fetch(`${base}/api/portal/view/${encodeURIComponent(t)}`, {
    headers: { Accept: 'application/json' },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || 'Portal link invalid or expired')
  return data
}

/** Submit approve/reject for a quote on the portal. */
export async function submitPortalQuoteDecision(token, quoteId, action, note = '', { base = PORTAL_BASE } = {}) {
  const t = String(token || '').trim()
  if (!t) throw new Error('Missing portal link')
  if (!quoteId) throw new Error('Missing quote')
  const body = {
    token: t,
    quoteId,
    quote_id: quoteId,
    action: String(action).toLowerCase() === 'reject' || String(action).toLowerCase() === 'decline'
      ? 'reject'
      : 'approve',
    note: String(note || '').slice(0, 500),
  }
  const res = await fetch(`${base}/api/portal/quote-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || 'Could not save decision')
  return data
}

/** Shop-side: apply a portal decision into local IndexedDB quote row shape. */
export function applyPortalDecisionLocally(quotes, quoteId, action, note = '') {
  const list = Array.isArray(quotes) ? quotes : []
  const idx = list.findIndex((q) => String(q.id) === String(quoteId))
  if (idx < 0) return { quotes: list, updated: null }
  const updated = buildQuoteDecision(list[idx], action, note)
  const next = list.slice()
  next[idx] = updated
  return { quotes: next, updated }
}

/** Summary counts for portal dashboard strip. */
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
