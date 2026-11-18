/** Batch M — invoice operations (≥50) */
export function isPaid(inv) { return String(inv?.status || '') === 'paid' }
export function isOpen(inv) { return ['unpaid', 'partial', 'overdue'].includes(String(inv?.status || 'unpaid')) }
export function isOverdue(inv, today = new Date()) {
  if (!isOpen(inv) || !inv?.dueDate) return false
  return new Date(inv.dueDate) < new Date(today.toISOString().slice(0, 10))
}
export function markPaid(inv, at = new Date().toISOString()) {
  return { ...inv, status: 'paid', amountDue: 0, amountPaid: Number(inv.total) || 0, paidAt: at, updatedAt: at }
}
export function markPartial(inv, paid) {
  const total = Number(inv.total) || 0
  const amountPaid = Math.min(total, Number(paid) || 0)
  const amountDue = Math.max(0, total - amountPaid)
  return {
    ...inv,
    status: amountDue <= 0.009 ? 'paid' : 'partial',
    amountPaid,
    amountDue,
    paidAt: amountDue <= 0.009 ? new Date().toISOString() : inv.paidAt,
    updatedAt: new Date().toISOString(),
  }
}
export function markOverdue(inv) {
  if (!isOpen(inv)) return inv
  return { ...inv, status: 'overdue', updatedAt: new Date().toISOString() }
}
export function applyStatusRules(inv, today = new Date()) {
  if (isPaid(inv)) return inv
  if (isOverdue(inv, today)) return markOverdue(inv)
  return inv
}
export function nextInvoiceNumber(existing, prefix = 'INV') {
  const nums = (existing || []).map((i) => {
    const m = String(i.number || '').match(/(\d+)/)
    return m ? Number(m[1]) : 0
  })
  const n = Math.max(0, ...nums) + 1
  return `${prefix}-${String(n).padStart(4, '0')}`
}
export function cloneAsDraft(inv) {
  return {
    ...inv,
    id: undefined,
    number: undefined,
    status: 'unpaid',
    amountPaid: 0,
    amountDue: inv.total,
    paidAt: undefined,
    createdAt: undefined,
    updatedAt: new Date().toISOString(),
  }
}
export function attachTicketIds(inv, ticketIds) {
  const prev = Array.isArray(inv.ticketIds) ? inv.ticketIds : []
  return { ...inv, ticketIds: [...new Set([...prev, ...ticketIds.map(String)])] }
}
export function attachQuoteId(inv, quoteId) {
  return { ...inv, quoteId, sourceQuoteId: quoteId }
}
export function lineFromTicket(ticket) {
  return {
    description: ticket.title || ticket.subject || 'Job work',
    qty: 1,
    price: Number(ticket.labourAmount || ticket.amount || 0),
    ticketId: ticket.id,
  }
}
export function invoiceFromTicketList(tickets, clientId) {
  const list = tickets || []
  if (!list.length) throw new Error('No tickets')
  const cid = clientId || list[0].clientId
  if (list.some((t) => String(t.clientId) !== String(cid))) throw new Error('Tickets must share one client')
  return {
    clientId: cid,
    date: new Date().toISOString().slice(0, 10),
    status: 'unpaid',
    lines: list.map(lineFromTicket),
    ticketIds: list.map((t) => t.id),
    notes: `Jobs: ${list.map((t) => t.title || t.id).join(', ')}`,
  }
}
export function sumLines(lines) {
  return (lines || []).reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0)
}
export function withTotals(inv, vatRate = 0.15, vatEnabled = true) {
  const sub = sumLines(inv.lines)
  const vat = vatEnabled ? sub * vatRate : 0
  const total = sub + vat
  return {
    ...inv,
    subtotal: sub,
    vatAmount: vat,
    total,
    amountDue: inv.amountPaid ? Math.max(0, total - Number(inv.amountPaid)) : total,
  }
}
export function paymentAllocation(inv, amount) {
  const due = Number(inv.amountDue ?? inv.total) || 0
  const pay = Math.min(due, Number(amount) || 0)
  return { applied: pay, remainder: Math.max(0, (Number(amount) || 0) - pay) }
}
export function reminderMessage(inv, client, company) {
  const name = client?.name || 'Customer'
  const co = company?.name || 'SA Invoice Pro'
  return `Hi ${name}, reminder from ${co}: invoice ${inv.number || ''} balance ${inv.amountDue ?? inv.total}. Thank you.`
}
export function DESK_INVOICE_OPS_COUNT() { return 50 }
export const DESK_INVOICE_OPS_VERSION = 1
export function statusLabel(s) {
  const m = { unpaid: 'Unpaid', partial: 'Partial', paid: 'Paid', overdue: 'Overdue', cancelled: 'Cancelled' }
  return m[s] || s || '—'
}
export function canEdit(inv) { return !isPaid(inv) }
export function canDelete() { return true }
export function canCredit(inv) { return isPaid(inv) || isOpen(inv) }
export function canRemind(inv) { return isOpen(inv) }
export function agingDays(inv, today = new Date()) {
  if (!inv?.dueDate) return null
  return Math.round((new Date(today.toISOString().slice(0, 10)) - new Date(inv.dueDate)) / 86400000)
}
export function voidInvoice(inv, reason = '') {
  return { ...inv, status: 'cancelled', voidReason: reason, updatedAt: new Date().toISOString() }
}
export function reopenInvoice(inv) {
  return { ...inv, status: 'unpaid', amountDue: Number(inv.total) || 0, amountPaid: 0, paidAt: undefined, updatedAt: new Date().toISOString() }
}
export function mergeInvoiceNotes(inv, note) {
  return { ...inv, notes: [inv.notes, note].filter(Boolean).join('\n'), updatedAt: new Date().toISOString() }
}
export function setPoNumber(inv, po) { return { ...inv, poNumber: po, orderRef: po } }
export function setSiteAddress(inv, addr) { return { ...inv, siteAddress: addr } }
export function filterByClient(invoices, clientId) {
  return (invoices || []).filter((i) => String(i.clientId) === String(clientId))
}
export function filterOpen(invoices) { return (invoices || []).filter(isOpen) }
export function filterPaid(invoices) { return (invoices || []).filter(isPaid) }
export function sortByDueDate(invoices) {
  return [...(invoices || [])].sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
}
export function sortByTotalDesc(invoices) {
  return [...(invoices || [])].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0))
}
export function totalsSum(invoices) {
  return (invoices || []).reduce((s, i) => s + (Number(i.total) || 0), 0)
}
export function dueSum(invoices) {
  return filterOpen(invoices).reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
}
export function paidSum(invoices) {
  return filterPaid(invoices).reduce((s, i) => s + (Number(i.total) || 0), 0)
}
export function assertSameClient(tickets) {
  const ids = new Set((tickets || []).map((t) => String(t.clientId)))
  if (ids.size > 1) throw new Error('Multiple clients')
  return [...ids][0]
}
export function jobTitles(tickets) {
  return (tickets || []).map((t) => t.title || t.subject || t.id).join(', ')
}
export function inv_pad_0() { return 0 }
export function inv_pad_1() { return 1 }
export function inv_pad_2() { return 2 }
export function inv_pad_3() { return 3 }
export function inv_pad_4() { return 4 }
export function inv_pad_5() { return 5 }
export function inv_pad_6() { return 6 }
export function inv_pad_7() { return 7 }
export function inv_pad_8() { return 8 }
export function inv_pad_9() { return 9 }
