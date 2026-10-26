/**
 * Document clone helpers + quote/job/invoice chain.
 */
import * as db from './db'
import { STORES } from './db'

function nextNumber(prefix, existingList) {
  const year = new Date().getFullYear()
  const n = (existingList || []).length + 1
  return `${prefix}-${year}-${String(n).padStart(4, '0')}`
}

export async function duplicateInvoice(source, { invoices = [] } = {}) {
  if (!source || typeof source !== 'object') throw new Error('No invoice to duplicate')
  const { id, number, createdAt, updatedAt, amountPaid, amountDue, status, date, dueDate, ...rest } = source
  const payload = {
    ...rest,
    number: nextNumber('INV', invoices),
    date: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    status: 'unpaid',
    amountPaid: 0,
    amountDue: Number(source.total) || 0,
    total: Number(source.total) || 0,
    exclusive: Number(source.exclusive) || 0,
    vatAmount: Number(source.vatAmount) || 0,
    lines: Array.isArray(source.lines)
      ? source.lines.map((l) => ({ ...l }))
      : [{ description: '', qty: 1, price: 0 }],
    notes: source.notes
      ? `${source.notes}\n\n(Duplicated from ${source.number || source.id})`
      : `Duplicated from ${source.number || source.id}`,
    duplicatedFrom: source.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  return db.add(STORES.invoices, payload)
}

export async function duplicateQuote(source, { quotes = [] } = {}) {
  if (!source || typeof source !== 'object') throw new Error('No quote to duplicate')
  const { id, number, createdAt, updatedAt, status, date, validUntil, convertedAt, ...rest } = source
  const payload = {
    ...rest,
    number: nextNumber('QT', quotes),
    date: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    status: 'draft',
    lines: Array.isArray(source.lines) ? source.lines.map((l) => ({ ...l })) : [],
    notes: source.notes
      ? `${source.notes}\n\n(Duplicated from ${source.number || source.id})`
      : `Duplicated from ${source.number || source.id}`,
    duplicatedFrom: source.id,
    isQuote: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  delete payload.convertedAt
  return db.add(STORES.quotes, payload)
}

export function invoiceAgingDays(inv, today = new Date()) {
  const due = inv.dueDate || inv.date
  if (!due) return 0
  const d = new Date(String(due).slice(0, 10) + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return 0
  const t = new Date(today)
  t.setHours(12, 0, 0, 0)
  return Math.max(0, Math.floor((t - d) / 86400000))
}

export function agingBucketLabel(days) {
  if (days <= 0) return 'Current'
  if (days <= 30) return '1–30 days'
  if (days <= 60) return '31–60 days'
  if (days <= 90) return '61–90 days'
  return '90+ days'
}

export function buildAgingReport(invoices) {
  const buckets = { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 }
  const open = (invoices || []).filter((i) =>
    !i.isCredit && ['unpaid', 'partial', 'overdue'].includes(i.status || 'unpaid')
  )
  for (const inv of open) {
    const due = Number(inv.amountDue ?? inv.total) || 0
    if (due <= 0) continue
    const days = invoiceAgingDays(inv)
    if (days <= 0) buckets.current += due
    else if (days <= 30) buckets.d30 += due
    else if (days <= 60) buckets.d60 += due
    else if (days <= 90) buckets.d90 += due
    else buckets.d90plus += due
  }
  const total = buckets.current + buckets.d30 + buckets.d60 + buckets.d90 + buckets.d90plus
  return { buckets, total, openCount: open.length }
}

export function monthCashSnapshot({ invoices = [], expenses = [], payments = [] }, ref = new Date()) {
  const y = ref.getFullYear()
  const m = ref.getMonth()
  const inMonth = (iso) => {
    if (!iso) return false
    const d = new Date(String(iso).slice(0, 10) + 'T12:00:00')
    return d.getFullYear() === y && d.getMonth() === m
  }
  const revenue = (payments || []).filter((p) => inMonth(p.date)).reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const expenseTotal = (expenses || []).filter((e) => inMonth(e.date)).reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const invoiced = (invoices || []).filter((i) => inMonth(i.date) && !i.isCredit).reduce((s, i) => s + (Number(i.total) || 0), 0)
  return {
    revenue,
    expenseTotal,
    invoiced,
    net: revenue - expenseTotal,
    label: ref.toLocaleString('en-ZA', { month: 'long', year: 'numeric' }),
  }
}

/** Quote → Job card */
export async function quoteToJob(quote) {
  if (!quote) throw new Error('No quote')
  const payload = {
    title: `Job from ${quote.number || 'quote'}`,
    clientId: quote.clientId,
    status: 'open',
    priority: 'normal',
    notes: [quote.notes || '', quote.devices ? `Devices: ${quote.devices}` : '', `Source quote: ${quote.number || quote.id}`].filter(Boolean).join('\n'),
    description: (quote.lines || []).map((l) => `${l.qty || 1}× ${l.description || l.name || 'Item'} @ ${l.price || 0}`).join('\n'),
    devices: quote.devices || '',
    jobType: quote.serviceType === 'on_site' || quote.serviceType === 'onsite' ? 'on_site' : 'walk_in',
    supportType: quote.serviceType || 'remote',
    fromQuoteId: quote.id,
    billable: true,
    labourAmount: Number(quote.total) || 0,
    checklistType: 'intake',
    checklist: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const job = await db.add(STORES.tickets, payload)
  await db.put(STORES.quotes, {
    ...quote,
    status: quote.status === 'converted' ? quote.status : 'accepted',
    jobId: job.id || job,
    updatedAt: new Date().toISOString(),
  })
  return job
}

/** Job → Invoice prefill */
export async function jobToInvoice(ticket, { invoices = [] } = {}) {
  if (!ticket) throw new Error('No job')
  const lines = []
  if (ticket.billable && Number(ticket.labourAmount) > 0) {
    lines.push({ description: ticket.title || 'Labour', qty: 1, price: Number(ticket.labourAmount) || 0 })
  }
  if (!lines.length && ticket.description) {
    lines.push({ description: String(ticket.description).slice(0, 120), qty: 1, price: 0 })
  }
  if (!lines.length) lines.push({ description: ticket.title || 'Service', qty: 1, price: 0 })
  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0)
  const payload = {
    clientId: ticket.clientId,
    number: nextNumber('INV', invoices),
    date: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    status: 'unpaid',
    lines,
    total,
    exclusive: total,
    vatAmount: 0,
    amountPaid: 0,
    amountDue: total,
    fromTicketId: ticket.id,
    devices: ticket.devices || ticket.passport?.model || '',
    notes: `From job ${ticket.title || ticket.id}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const inv = await db.add(STORES.invoices, payload)
  await db.put(STORES.tickets, {
    ...ticket,
    status: ticket.status === 'open' ? 'resolved' : ticket.status,
    invoiceId: inv.id || inv,
    updatedAt: new Date().toISOString(),
  })
  return inv
}
