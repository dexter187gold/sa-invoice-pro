/**
 * SLA hours: client caps + per-ticket priority clocks.
 * Also re-exports WhatsApp reminder helpers so older imports keep working.
 */
import { categoryOf } from './clientCategories'

export { buildOverdueReminder, toWaNumber, openWhatsApp } from './share'

export function isSlaClient(client) {
  return categoryOf(client) === 'sla'
}

export function clientTicketMinutes(clientId, tickets = [], timeEntries = []) {
  const ticketIds = new Set(
    (tickets || [])
      .filter((t) => String(t.clientId) === String(clientId))
      .map((t) => String(t.id)),
  )
  let mins = 0
  for (const e of timeEntries || []) {
    if (!ticketIds.has(String(e.ticketId))) continue
    mins += Number(e.minutes) || 0
  }
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

/** Per-ticket SLA clock from createdAt + priority hours */
export function slaDeadlineHours(ticket) {
  const p = String(ticket?.priority || 'normal').toLowerCase()
  if (p === 'urgent' || p === 'critical') return 4
  if (p === 'high') return 8
  if (p === 'low') return 72
  return 24
}

export function slaStatusForTicket(ticket, now = Date.now()) {
  const start = ticket?.createdAt || ticket?.date
  if (!start) return { state: 'unknown', hoursLeft: null, deadline: null, capHours: null }
  const hrs = slaDeadlineHours(ticket)
  const deadline = new Date(start).getTime() + hrs * 3600000
  const left = (deadline - now) / 3600000
  let state = 'ok'
  if (left < 0) state = 'breached'
  else if (left < hrs * 0.25) state = 'risk'
  return {
    state,
    hoursLeft: Math.round(left * 10) / 10,
    deadline: new Date(deadline).toISOString(),
    capHours: hrs,
  }
}
