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

export function dueReminders(tickets, now = Date.now()) {
  const out = []
  for (const t of tickets || []) {
    for (const r of t.reminders || []) {
      if (!r.done && r.dueAt && new Date(r.dueAt).getTime() <= now) {
        out.push({ ticket: t, reminder: r })
      }
    }
  }
  return out
}

export function sortTickets(list, mode = 'priority') {
  const arr = [...(list || [])]
  if (mode === 'priority') {
    arr.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 2
      const pb = PRIORITY_ORDER[b.priority] ?? 2
      if (pa !== pb) return pa - pb
      return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))
    })
  } else if (mode === 'updated') {
    arr.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  }
  return arr
}

export function ticketAgeHours(t) {
  const start = t.createdAt || t.date
  if (!start) return 0
  return Math.max(0, (Date.now() - new Date(start).getTime()) / 3600000)
}
