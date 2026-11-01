/**
 * Q7 — Ticket status machine, reminders, assignment, SLA helpers
 */
import * as db from './db'
import { STORES } from './db'

export const TICKET_FLOW = {
  open: ['in_progress', 'waiting', 'closed'],
  in_progress: ['waiting', 'resolved', 'open'],
  waiting: ['in_progress', 'resolved', 'closed'],
  resolved: ['closed', 'open'],
  closed: ['open'],
}

export const PRIORITY_ORDER = { critical: 0, high: 1, normal: 2, low: 3 }

export function nextStatuses(current) {
  return TICKET_FLOW[current] || TICKET_FLOW.open
}

export function canTransition(from, to) {
  return nextStatuses(from).includes(to)
}

export async function setTicketStatus(ticketId, status, note) {
  const store = STORES.tickets || 'tickets'
  const t = await db.get(store, ticketId)
  if (!t) throw new Error('Ticket not found')
  if (t.status && !canTransition(t.status, status) && t.status !== status) {
    console.warn(`Ticket ${ticketId}: ${t.status} → ${status} (non-standard)`)
  }
  const history = Array.isArray(t.statusHistory) ? t.statusHistory : []
  history.push({
    from: t.status,
    to: status,
    at: new Date().toISOString(),
    note: note || '',
  })
  const patch = {
    ...t,
    status,
    statusHistory: history.slice(-40),
    updatedAt: new Date().toISOString(),
  }
  if (status === 'resolved' || status === 'closed') patch.closedAt = new Date().toISOString()
  if (status === 'open' || status === 'in_progress') {
    patch.closedAt = null
    patch.reopenedAt = new Date().toISOString()
  }
  await db.put(store, patch)
  return patch
}

export async function assignTicket(ticketId, assignee) {
  const store = STORES.tickets || 'tickets'
  const t = await db.get(store, ticketId)
  if (!t) throw new Error('Ticket not found')
  const patch = {
    ...t,
    assignee: assignee || '',
    assignedAt: assignee ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  }
  await db.put(store, patch)
  return patch
}

export async function addTicketReminder(ticketId, { dueAt, message }) {
  const store = STORES.tickets || 'tickets'
  const t = await db.get(store, ticketId)
  if (!t) throw new Error('Ticket not found')
  const reminders = Array.isArray(t.reminders) ? t.reminders : []
  reminders.push({
    id: 'rm-' + Date.now().toString(36),
    dueAt: dueAt || new Date(Date.now() + 86400000).toISOString(),
    message: message || 'Follow up',
    createdAt: new Date().toISOString(),
    done: false,
  })
  const patch = { ...t, reminders, updatedAt: new Date().toISOString() }
  await db.put(store, patch)
  return patch
}

export function sortTickets(list, mode = 'updated') {
  const arr = [...(list || [])]
  if (mode === 'priority') {
    arr.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9))
  } else if (mode === 'created') {
    arr.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  } else {
    arr.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  }
  return arr
}

export function ticketAgeHours(t) {
  const start = t.createdAt || t.date
  if (!start) return 0
  return Math.max(0, (Date.now() - new Date(start).getTime()) / 3600000)
}

/**
 * One-shot: job card → unpaid invoice, linked both ways.
 * Idempotent: if ticket already has invoiceId, returns existing invoice (unless force).
 */
export async function invoiceFromTicket(ticket, {
  invoices = [],
  vatRate = 0.15,
  vatEnabled = true,
  defaultRate = 450,
  force = false,
  markResolved = true,
  labourOverride = null,
} = {}) {
  if (!ticket) throw new Error('Ticket required')

  if (ticket.invoiceId && !force) {
    const existing = await db.get(STORES.invoices, ticket.invoiceId).catch(() => null)
    if (existing) return { ...existing, _alreadyInvoiced: true }
  }

  const { invoiceTotals } = await import('./money')
  const year = new Date().getFullYear()
  const sameYear = (invoices || []).filter((i) => String(i.number || '').includes(String(year)))
  const n = sameYear.length + 1
  const number = `INV-${year}-${String(n).padStart(4, '0')}`

  const lines = []
  const labourPrice = labourOverride != null
    ? Number(labourOverride)
    : (Number(ticket.amount || ticket.quotedAmount || ticket.labourAmount) || defaultRate)

  if (ticket.workDone || ticket.description || ticket.title || labourPrice) {
    const desc = [
      ticket.title,
      ticket.workDone,
      ticket.description,
      ticket.devices || ticket.serials,
    ]
      .filter(Boolean)
      .join('\n')
    lines.push({ description: desc || 'Service', qty: 1, price: labourPrice })
  }
  if (Array.isArray(ticket.parts) && ticket.parts.length) {
    for (const part of ticket.parts) {
      lines.push({
        description: part.name || part.description || 'Part',
        qty: Number(part.qty) || 1,
        price: Number(part.price) || 0,
      })
    }
  }
  if (!lines.length) {
    lines.push({ description: ticket.title || 'Job card service', qty: 1, price: defaultRate })
  }

  const totals = invoiceTotals(lines, vatRate, vatEnabled)
  const today = new Date().toISOString().slice(0, 10)
  const payload = {
    clientId: ticket.clientId || '',
    clientName: ticket.contactName || '',
    number,
    date: today,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    status: 'unpaid',
    lines,
    notes: `From job card ${ticket.id}${ticket.contactName ? ` · ${ticket.contactName}` : ''}`,
    amountPaid: 0,
    amountDue: totals.total,
    total: totals.total,
    exclusive: totals.exclusive,
    vatAmount: totals.vat,
    fromTicketId: ticket.id,
    technician: ticket.assignee || ticket.technician || '',
    siteAddress: ticket.siteAddress || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const inv = await db.add(STORES.invoices, payload)

  const history = Array.isArray(ticket.statusHistory) ? [...ticket.statusHistory] : []
  const nextStatus = markResolved && !['closed', 'resolved'].includes(ticket.status)
    ? 'resolved'
    : ticket.status
  if (nextStatus !== ticket.status) {
    history.push({ from: ticket.status, to: nextStatus, at: new Date().toISOString(), note: 'Invoiced (one-shot)' })
  }
  try {
    await db.put(STORES.tickets, {
      ...ticket,
      invoiceId: inv.id,
      invoiceNumber: inv.number,
      invoicedAt: new Date().toISOString(),
      status: nextStatus || ticket.status,
      statusHistory: history.slice(-40),
      updatedAt: new Date().toISOString(),
      closedAt: nextStatus === 'resolved' || nextStatus === 'closed'
        ? (ticket.closedAt || new Date().toISOString())
        : ticket.closedAt,
    })
  } catch {}
  return inv
}
