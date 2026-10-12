/**
 * SLA hours: cap on client vs total billable/job time on their tickets.
 */
import { categoryOf } from './clientCategories'

export function isSlaClient(client) {
  return categoryOf(client) === 'sla'
}

/** Sum minutes for tickets belonging to clientId */
export function clientTicketMinutes(clientId, tickets = [], timeEntries = []) {
  const ticketIds = new Set(
    (tickets || [])
      .filter((t) => String(t.clientId) === String(clientId))
      .map((t) => String(t.id))
  )
  let mins = 0
  for (const e of timeEntries || []) {
    if (!ticketIds.has(String(e.ticketId))) continue
    mins += Number(e.minutes) || 0
  }
  // Also count running timers on those tickets
  for (const t of tickets || []) {
    if (!ticketIds.has(String(t.id))) continue
    if (t.timerStatus === 'running' && t.timerStartedAt) {
      const acc = Number(t.timerAccumulatedMs) || 0
      const live = Date.now() - new Date(t.timerStartedAt).getTime()
      mins += Math.max(0, Math.round((acc + live) / 60000))
    } else if (t.timerStatus === 'paused') {
      mins += Math.max(0, Math.round((Number(t.timerAccumulatedMs) || 0) / 60000))
    }
  }
  return mins
}

export function slaUsage(client, tickets, timeEntries) {
  const capHours = Number(client?.slaHoursCap)
  const usedMins = clientTicketMinutes(client?.id, tickets, timeEntries)
  const usedHours = Math.round((usedMins / 60) * 100) / 100
  const hasCap = Number.isFinite(capHours) && capHours > 0
  const remaining = hasCap ? Math.max(0, Math.round((capHours - usedHours) * 100) / 100) : null
  const pct = hasCap ? Math.min(100, Math.round((usedHours / capHours) * 100)) : 0
  const over = hasCap && usedHours > capHours
  return {
    hasCap,
    capHours: hasCap ? capHours : null,
    usedMins,
    usedHours,
    remaining,
    pct,
    over,
  }
}

export function toWaNumber(phone) {
  let d = String(phone || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('0') && d.length >= 9) d = '27' + d.slice(1)
  if (d.length < 10) return ''
  return d
}

export function buildOverdueReminder(inv, client, company) {
  const co = company?.name || 'SA Invoice Pro'
  const num = inv.number || inv.id
  const due = inv.dueDate || inv.date || ''
  const bal = Number(inv.amountDue ?? inv.total) || 0
  const total = Number(inv.total) || 0
  const name = client?.name || 'Client'
  const lines = [
    `Hi ${name},`,
    '',
    `Friendly reminder from *${co}*:`,
    '',
    `Invoice *${num}* is overdue.`,
    `Total: R${total.toFixed(2)}`,
    `Balance due: R${bal.toFixed(2)}`,
    due ? `Original due date: ${String(due).slice(0, 10)}` : '',
    '',
    'Please arrange payment at your earliest convenience.',
    'Reply to this message if you have already paid or need a copy of the invoice.',
    '',
    `Thank you — ${co}`,
  ].filter(Boolean)
  return lines.join('\n')
}
