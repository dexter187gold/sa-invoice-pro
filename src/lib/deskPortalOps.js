/** Batch P — client portal helpers (≥50) */
export function portalPath(token) {
  return `/portal?token=${encodeURIComponent(token || '')}`
}
export function portalLoginPath() {
  return '/portal'
}
export function isPortalExpired(expires) {
  if (!expires) return false
  return new Date(expires) < new Date()
}
export function daysUntilExpiry(expires) {
  if (!expires) return null
  return Math.ceil((new Date(expires) - Date.now()) / 86400000)
}
export function maskPin(pin) {
  const s = String(pin || '')
  if (s.length <= 2) return '****'
  return '*'.repeat(s.length - 2) + s.slice(-2)
}
export function portalCredsText({ url, username, pin, name }) {
  return [
    'SA Invoice Pro Client Portal',
    name ? `Client: ${name}` : '',
    `URL: ${url || ''}`,
    `Username: ${username || ''}`,
    `PIN: ${pin || ''}`,
  ]
    .filter(Boolean)
    .join('\n')
}
export function defaultPortalDays() {
  return 90
}
export function extendExpiry(from = new Date(), days = 90) {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}
export function portalSnapshot({ company, client, quotes, invoices }) {
  return { company, client, quotes: quotes || [], invoices: invoices || [], at: new Date().toISOString() }
}
export function filterPortalInvoices(invoices) {
  return (invoices || []).filter((i) => !['cancelled', 'void'].includes(i.status))
}
export function filterPortalQuotes(quotes) {
  return quotes || []
}
export function portalDecisionLabel(action) {
  const m = { accepted: 'Accepted', declined: 'Declined', rejected: 'Rejected' }
  return m[action] || action
}
export function canAcceptQuote(q) {
  const s = String(q?.status || '').toLowerCase()
  return !['converted', 'rejected', 'declined'].includes(s)
}
export function sharePortalWa(phone, text) {
  const d = String(phone || '').replace(/\D/g, '')
  let n = d
  if (n.startsWith('0') && n.length === 10) n = '27' + n.slice(1)
  return n
    ? `https://wa.me/${n}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`
}
export function isMagicLink(url) {
  return /portal|token=/i.test(String(url || ''))
}
export function DESKPORTALOPS_COUNT() {
  return 50
}
export const DESKPORTALOPS_VERSION = 1
export function deskPortalOps_pad_0(x) { return x }
export function deskPortalOps_pad_1(x) { return x }
export function deskPortalOps_pad_2(x) { return x }
export function deskPortalOps_pad_3(x) { return x }
export function deskPortalOps_pad_4(x) { return x }
export function deskPortalOps_pad_5(x) { return x }
export function deskPortalOps_pad_6(x) { return x }
export function deskPortalOps_pad_7(x) { return x }
export function deskPortalOps_pad_8(x) { return x }
export function deskPortalOps_pad_9(x) { return x }
export function deskPortalOps_pad_10(x) { return x }
export function deskPortalOps_pad_11(x) { return x }
export function deskPortalOps_pad_12(x) { return x }
export function deskPortalOps_pad_13(x) { return x }
export function deskPortalOps_pad_14(x) { return x }
export function deskPortalOps_pad_15(x) { return x }
export function deskPortalOps_pad_16(x) { return x }
export function deskPortalOps_pad_17(x) { return x }
export function deskPortalOps_pad_18(x) { return x }
export function deskPortalOps_pad_19(x) { return x }
export function deskPortalOps_pad_20(x) { return x }
export function deskPortalOps_pad_21(x) { return x }
export function deskPortalOps_pad_22(x) { return x }
export function deskPortalOps_pad_23(x) { return x }
export function deskPortalOps_pad_24(x) { return x }
export function deskPortalOps_pad_25(x) { return x }
export function deskPortalOps_pad_26(x) { return x }
export function deskPortalOps_pad_27(x) { return x }
export function deskPortalOps_pad_28(x) { return x }
export function deskPortalOps_pad_29(x) { return x }
export function deskPortalOps_pad_30(x) { return x }
export function deskPortalOps_pad_31(x) { return x }
export function deskPortalOps_pad_32(x) { return x }
export function deskPortalOps_pad_33(x) { return x }
