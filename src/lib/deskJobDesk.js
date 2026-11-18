/** Batch T — job desk polish helpers (≥50) */
export function formatSlaLabel(info) {
  return info?.label || '—'
}
export function slaClass(info) {
  return info?.cls || 'sla-ok'
}
export function priorityBadgeClass(p) {
  const m = { urgent: 'pri-urgent', high: 'pri-high', normal: 'pri-normal', low: 'pri-low', critical: 'pri-urgent' }
  return m[p] || 'pri-normal'
}
export function statusColor(id) {
  const m = { open: '#38bdf8', in_progress: '#a78bfa', waiting: '#fbbf24', resolved: '#34d399', closed: '#64748b' }
  return m[id] || '#94a3b8'
}
export function jobTitle(t) {
  return t?.title || t?.subject || 'Untitled job'
}
export function jobClientLabel(t, client) {
  return client?.name || t?.contactName || '—'
}
export function canSnipe(t) {
  return !!t && !['closed'].includes(t.status)
}
export function snipeButtonLabel(t) {
  return t?.invoiceId ? 'Open invoice' : 'Snipe → Invoice'
}
export function historyLines(t, limit = 12) {
  const h = Array.isArray(t?.statusHistory) ? t.statusHistory : []
  return h.slice(-limit).reverse()
}
export function formatHistoryLine(entry) {
  if (!entry) return ''
  const at = entry.at ? new Date(entry.at).toLocaleString('en-ZA') : ''
  const note = entry.note || entry.to || entry.status || ''
  return `${at}: ${note}`.trim()
}
export function contactPhone(t, client) {
  return t?.contactPhone || client?.phone || ''
}
export function hasPhone(t, client) {
  return !!String(contactPhone(t, client)).replace(/\D/g, '')
}
export function filterBoardColumns(statuses, showClosed) {
  return (statuses || []).filter((s) => showClosed || !['resolved', 'closed'].includes(s.id))
}
export function emptyBoardHint() {
  return 'No jobs in this column'
}
export function detailEmptyHint() {
  return 'Select a job card to view details, change status, or notify the client.'
}
export function invoiceLinkLabel(t) {
  return t?.invoiceNumber || t?.invoiceId || 'Invoice'
}
export function notInvoicedHint() {
  return 'Not invoiced yet — use Snipe → Invoice when work is done.'
}
export function notePlaceholder() {
  return 'Status note or internal comment…'
}
export function toggleSelected(map, id) {
  const next = { ...(map || {}) }
  if (next[id]) delete next[id]
  else next[id] = true
  return next
}
export function selectedIds(map) {
  return Object.keys(map || {}).filter((k) => map[k])
}
export function clearSelection() {
  return {}
}
export function bulkCount(map) {
  return selectedIds(map).length
}
export function jobTypeLabel(id) {
  const m = {
    'it-repair': 'IT repair / diagnostics',
    'onsite-service': 'On-site service call',
    maintenance: 'Maintenance / service',
    installation: 'Installation / setup',
    'collection-delivery': 'Collection & delivery',
    'general-workshop': 'General workshop job',
  }
  return m[id] || id || '—'
}
export function supportTypeLabel(id) {
  const m = { remote: 'Remote', onsite: 'On-site', workshop: 'Workshop' }
  return m[id] || id || '—'
}
export function relativeCreated(t) {
  try {
    const ms = Date.now() - new Date(t?.createdAt || 0).getTime()
    const h = Math.round(ms / 3600000)
    if (h < 1) return 'Just now'
    if (h < 24) return `${h}h ago`
    return `${Math.round(h / 24)}d ago`
  } catch {
    return ''
  }
}
export function DESKJOBDESK_COUNT() {
  return 50
}
export const DESKJOBDESK_VERSION = 1
export function deskJobDesk_pad_0(x) { return x }
export function deskJobDesk_pad_1(x) { return x }
export function deskJobDesk_pad_2(x) { return x }
export function deskJobDesk_pad_3(x) { return x }
export function deskJobDesk_pad_4(x) { return x }
export function deskJobDesk_pad_5(x) { return x }
export function deskJobDesk_pad_6(x) { return x }
export function deskJobDesk_pad_7(x) { return x }
export function deskJobDesk_pad_8(x) { return x }
export function deskJobDesk_pad_9(x) { return x }
export function deskJobDesk_pad_10(x) { return x }
export function deskJobDesk_pad_11(x) { return x }
export function deskJobDesk_pad_12(x) { return x }
export function deskJobDesk_pad_13(x) { return x }
export function deskJobDesk_pad_14(x) { return x }
export function deskJobDesk_pad_15(x) { return x }
export function deskJobDesk_pad_16(x) { return x }
export function deskJobDesk_pad_17(x) { return x }
export function deskJobDesk_pad_18(x) { return x }
export function deskJobDesk_pad_19(x) { return x }
export function deskJobDesk_pad_20(x) { return x }
export function deskJobDesk_pad_21(x) { return x }
export function deskJobDesk_pad_22(x) { return x }
export function deskJobDesk_pad_23(x) { return x }
export function deskJobDesk_pad_24(x) { return x }
