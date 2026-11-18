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
  if (status === 'resolved') patch.resolvedAt = patch.updatedAt
  if (status === 'closed') patch.closedAt = patch.updatedAt
  await db.put(store, patch)
  return patch
}

export function sortTickets(rows, by = 'priority') {
  const list = [...(rows || [])]
  if (by === 'priority') {
    list.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2))
  } else if (by === 'updated') {
    list.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  }
  return list
}

export async function invoiceFromTicket(ticket, opts = {}) {
  const { invoices = [], vatRate = 0.15, vatEnabled = true, force = false, markResolved = false } = opts
  if (!ticket) throw new Error('No ticket')
  if (ticket.invoiceId && !force) {
    const existing = invoices.find((i) => String(i.id) === String(ticket.invoiceId))
    if (existing) return { ...existing, _alreadyInvoiced: true }
  }
  const { invoiceFromTickets } = await import('./jobBill.js')
  const inv = await invoiceFromTickets([ticket], {
    clientId: ticket.clientId,
    invoices,
    vatRate,
    vatEnabled,
  })
  if (markResolved && ticket.id) {
    try {
      await setTicketStatus(ticket.id, 'resolved', 'Invoiced')
    } catch {}
  }
  return inv
}

/** Soft-delete job card into recycle bin (Settings → Backup). */
export async function softDeleteTicket(id, meta = {}) {
  const { softDelete } = await import('./recycleBin.js')
  return softDelete(STORES.tickets || 'tickets', id, { reason: 'user-delete', ...meta })
}
