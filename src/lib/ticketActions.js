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
  const arr = Array.isArray(list) ? [...list] : []
  if (mode === 'priority') {
    arr.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9))
  } else if (mode === 'status') {
    const order = ['open', 'in_progress', 'waiting', 'resolved', 'closed']
    arr.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))
  } else {
    arr.sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
  }
  return arr
}

export function slaHours(priority) {
  if (priority === 'critical' || priority === 'urgent') return 4
  if (priority === 'high') return 24
  if (priority === 'low') return 72
  return 48
}

export function isOverdueTicket(ticket) {
  if (!ticket || ticket.status === 'closed' || ticket.status === 'resolved') return false
  const start = new Date(ticket.createdAt || ticket.updatedAt || 0).getTime()
  if (!start) return false
  const limit = slaHours(ticket.priority) * 3600000
  return Date.now() - start > limit
}

function invoiceTotals(lines, vatRate, vatEnabled) {
  const exclusive = (lines || []).reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0)
  const vat = vatEnabled ? exclusive * (Number(vatRate) || 0) : 0
  return { exclusive, vat, total: exclusive + vat }
}

export async function invoiceFromTicket(ticket, opts = {}) {
  const {
    invoices = [],
    vatRate = 0.15,
    vatEnabled = true,
    force = false,
    markResolved = true,
    defaultRate = 0,
  } = opts
  if (!ticket) throw new Error('No ticket')
  if (ticket.invoiceId && !force) {
    const existing = (invoices || []).find((i) => String(i.id) === String(ticket.invoiceId))
    if (existing) return { ...existing, _alreadyInvoiced: true }
  }
  const nums = (invoices || []).map((i) => {
    const m = String(i.number || '').match(/(\d+)/)
    return m ? Number(m[1]) : 0
  })
  const next = Math.max(0, ...nums) + 1
  const number = `INV-${String(next).padStart(4, '0')}`
  const lines = []
  const labourPrice = Number(ticket.labourAmount || ticket.amount || defaultRate) || 0
  if (labourPrice > 0 || ticket.title) {
    const desc = [
      ticket.title || ticket.subject || 'Job work',
      ticket.workDone ? `Work: ${ticket.workDone}` : '',
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
  const nextStatus =
    markResolved && !['closed', 'resolved'].includes(ticket.status) ? 'resolved' : ticket.status
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
      closedAt:
        nextStatus === 'resolved' || nextStatus === 'closed'
          ? ticket.closedAt || new Date().toISOString()
          : ticket.closedAt,
    })
  } catch {}
  return inv
}

/** Soft-delete job card into recycle bin (Settings → Backup). */
export async function softDeleteTicket(id, meta = {}) {
  const { softDelete } = await import('./recycleBin.js')
  return softDelete(STORES.tickets || 'tickets', id, { reason: 'user-delete', ...meta })
}
