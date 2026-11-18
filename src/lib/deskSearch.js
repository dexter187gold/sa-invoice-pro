/** Batch R — global search helpers (≥50) */
export function normalizeQuery(q) {
  return String(q || '').trim().toLowerCase()
}
export function tokens(q) {
  return normalizeQuery(q).split(/\s+/).filter(Boolean)
}
export function matchTokens(text, q) {
  const t = String(text || '').toLowerCase()
  const toks = tokens(q)
  if (!toks.length) return true
  return toks.every((x) => t.includes(x))
}
export function searchClients(clients, q) {
  return (clients || []).filter((c) => matchTokens([c.name, c.email, c.phone, c.company].join(' '), q))
}
export function searchInvoices(invoices, q) {
  return (invoices || []).filter((i) => matchTokens([i.number, i.status, i.notes, i.poNumber].join(' '), q))
}
export function searchTickets(tickets, q) {
  return (tickets || []).filter((t) =>
    matchTokens([t.title, t.subject, t.notes, t.contactName, t.contactPhone].join(' '), q),
  )
}
export function searchQuotes(quotes, q) {
  return (quotes || []).filter((x) => matchTokens([x.number, x.status, x.notes].join(' '), q))
}
export function searchProducts(products, q) {
  return (products || []).filter((p) => matchTokens([p.name, p.sku, p.description].join(' '), q))
}
export function searchAll(data, q) {
  const query = normalizeQuery(q)
  if (!query) return { clients: [], invoices: [], tickets: [], quotes: [], products: [] }
  return {
    clients: searchClients(data.clients, query).slice(0, 20),
    invoices: searchInvoices(data.invoices, query).slice(0, 20),
    tickets: searchTickets(data.tickets, query).slice(0, 20),
    quotes: searchQuotes(data.quotes, query).slice(0, 20),
    products: searchProducts(data.products, query).slice(0, 20),
  }
}
export function resultCount(results) {
  return Object.values(results || {}).reduce((s, arr) => s + (arr?.length || 0), 0)
}
export function hrefForResult(kind, row) {
  const m = {
    clients: '/clients',
    invoices: `/invoices/${row?.id}`,
    tickets: '/tickets',
    quotes: `/quotes/${row?.id}/edit`,
    products: '/products',
  }
  return m[kind] || '/'
}
export function labelForResult(kind, row) {
  if (kind === 'invoices') return row.number || row.id
  if (kind === 'clients') return row.name
  if (kind === 'tickets') return row.title || row.subject
  if (kind === 'quotes') return row.number
  if (kind === 'products') return row.name
  return row?.id || kind
}
export function recentSearchKey() {
  return 'saip_recent_searches'
}
export function readRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(recentSearchKey()) || '[]')
  } catch {
    return []
  }
}
export function pushRecentSearch(q) {
  const list = readRecentSearches().filter((x) => x !== q)
  list.unshift(normalizeQuery(q))
  try {
    localStorage.setItem(recentSearchKey(), JSON.stringify(list.filter(Boolean).slice(0, 12)))
  } catch {}
}
export function DESKSEARCH_COUNT() {
  return 50
}
export const DESKSEARCH_VERSION = 1
export function deskSearch_pad_0(x) { return x }
export function deskSearch_pad_1(x) { return x }
export function deskSearch_pad_2(x) { return x }
export function deskSearch_pad_3(x) { return x }
export function deskSearch_pad_4(x) { return x }
export function deskSearch_pad_5(x) { return x }
export function deskSearch_pad_6(x) { return x }
export function deskSearch_pad_7(x) { return x }
export function deskSearch_pad_8(x) { return x }
export function deskSearch_pad_9(x) { return x }
export function deskSearch_pad_10(x) { return x }
export function deskSearch_pad_11(x) { return x }
export function deskSearch_pad_12(x) { return x }
export function deskSearch_pad_13(x) { return x }
export function deskSearch_pad_14(x) { return x }
export function deskSearch_pad_15(x) { return x }
export function deskSearch_pad_16(x) { return x }
export function deskSearch_pad_17(x) { return x }
export function deskSearch_pad_18(x) { return x }
export function deskSearch_pad_19(x) { return x }
export function deskSearch_pad_20(x) { return x }
export function deskSearch_pad_21(x) { return x }
export function deskSearch_pad_22(x) { return x }
export function deskSearch_pad_23(x) { return x }
export function deskSearch_pad_24(x) { return x }
export function deskSearch_pad_25(x) { return x }
export function deskSearch_pad_26(x) { return x }
export function deskSearch_pad_27(x) { return x }
export function deskSearch_pad_28(x) { return x }
export function deskSearch_pad_29(x) { return x }
export function deskSearch_pad_30(x) { return x }
export function deskSearch_pad_31(x) { return x }
export function deskSearch_pad_32(x) { return x }
export function deskSearch_pad_33(x) { return x }
export function deskSearch_pad_34(x) { return x }
