/**
 * Home / pulse desk pure helpers — what the owner should do next.
 */

export function isOpenInvoice(inv) {
  return ['unpaid', 'partial', 'overdue'].includes(String(inv?.status || '').toLowerCase())
}

export function isOpenJob(t) {
  return !['closed', 'resolved', 'cancelled'].includes(String(t?.status || '').toLowerCase())
}

/** Quotes the client accepted (portal or desk) that still need convert → invoice. */
export function acceptedQuotesAwaitingConvert(quotes = []) {
  return (quotes || [])
    .filter((q) => {
      const s = String(q.status || '').toLowerCase()
      return s === 'accepted' || String(q.portalDecision || '').toLowerCase() === 'accepted'
    })
    .filter((q) => String(q.status || '').toLowerCase() !== 'converted')
    .sort((a, b) => String(b.portalDecisionAt || b.updatedAt || b.date || '').localeCompare(String(a.portalDecisionAt || a.updatedAt || a.date || '')))
}

export function declinedQuotesRecent(quotes = [], days = 14) {
  const cut = Date.now() - days * 86400000
  return (quotes || []).filter((q) => {
    const s = String(q.status || '').toLowerCase()
    if (s !== 'rejected' && String(q.portalDecision || '').toLowerCase() !== 'rejected') return false
    const at = new Date(q.portalDecisionAt || q.updatedAt || q.date || 0).getTime()
    return !Number.isFinite(at) || at >= cut
  })
}

/** Jobs past promise / SLA rough signal for free-tier alpha desks. */
export function jobsPastPromise(tickets = []) {
  const now = Date.now()
  return (tickets || []).filter((t) => {
    if (!isOpenJob(t)) return false
    const due = t.promisedAt || t.dueDate || t.slaDue || t.eta
    if (!due) return false
    const ms = new Date(due).getTime()
    return Number.isFinite(ms) && ms < now
  })
}

export function deskNextActions({ quotes = [], tickets = [], invoices = [] } = {}) {
  const accept = acceptedQuotesAwaitingConvert(quotes)
  const declined = declinedQuotesRecent(quotes)
  const overdueJobs = jobsPastPromise(tickets)
  const openAr = (invoices || []).filter(isOpenInvoice).length
  const actions = []
  if (accept.length) {
    actions.push({
      id: 'convert_quotes',
      priority: 1,
      title: `${accept.length} accepted quote${accept.length > 1 ? 's' : ''} ready to invoice`,
      href: '/quotes',
      tone: 'good',
    })
  }
  if (overdueJobs.length) {
    actions.push({
      id: 'sla_jobs',
      priority: 2,
      title: `${overdueJobs.length} job${overdueJobs.length > 1 ? 's' : ''} past promised date`,
      href: '/tickets',
      tone: 'warn',
    })
  }
  if (openAr > 0) {
    actions.push({
      id: 'ar',
      priority: 3,
      title: `${openAr} open invoice${openAr > 1 ? 's' : ''} on the books`,
      href: '/invoices?status=overdue',
      tone: 'warn',
    })
  }
  if (declined.length) {
    actions.push({
      id: 'declined',
      priority: 4,
      title: `${declined.length} declined quote${declined.length > 1 ? 's' : ''} (last 14d)`,
      href: '/quotes',
      tone: 'muted',
    })
  }
  return actions.sort((a, b) => a.priority - b.priority)
}
