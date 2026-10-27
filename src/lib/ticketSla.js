/**
 * Deeper ticket SLA — priority clocks + promised dates.
 */

/** Response / work clock hours by priority (business-ish defaults). */
export const SLA_HOURS = {
  urgent: 4,
  critical: 4,
  high: 12,
  normal: 24,
  low: 72,
}

export function prioritySlaHours(priority) {
  const p = String(priority || 'normal').toLowerCase()
  return SLA_HOURS[p] ?? SLA_HOURS.normal
}

export function ticketAgeHours(t) {
  const start = t?.createdAt || t?.date
  if (!start) return 0
  return Math.max(0, (Date.now() - new Date(start).getTime()) / 3600000)
}

export function promisedMs(t) {
  const due = t?.promisedAt || t?.dueDate || t?.slaDue || t?.eta
  if (!due) return null
  const ms = new Date(due).getTime()
  return Number.isFinite(ms) ? ms : null
}

/**
 * Unified SLA badge for board / list / pulse.
 * @returns {{ label: string, cls: 'sla-ok'|'sla-warn'|'sla-bad', overdue: boolean, hoursLeft: number|null }}
 */
export function computeTicketSla(t) {
  if (!t) return { label: '—', cls: 'sla-ok', overdue: false, hoursLeft: null }
  const st = String(t.status || 'open').toLowerCase()
  if (['resolved', 'closed', 'cancelled'].includes(st)) {
    return { label: 'Done', cls: 'sla-ok', overdue: false, hoursLeft: null }
  }

  const promised = promisedMs(t)
  if (promised != null) {
    const leftH = (promised - Date.now()) / 3600000
    if (leftH < 0) {
      return {
        label: `${Math.round(-leftH)}h past promise`,
        cls: 'sla-bad',
        overdue: true,
        hoursLeft: leftH,
      }
    }
    if (leftH < 4) {
      return {
        label: `${Math.round(leftH)}h to promise`,
        cls: 'sla-warn',
        overdue: false,
        hoursLeft: leftH,
      }
    }
    return {
      label: `promise ${Math.round(leftH)}h`,
      cls: 'sla-ok',
      overdue: false,
      hoursLeft: leftH,
    }
  }

  const hrs = ticketAgeHours(t)
  const limit = prioritySlaHours(t.priority)
  if (hrs > limit) {
    return {
      label: `${Math.round(hrs - limit)}h over`,
      cls: 'sla-bad',
      overdue: true,
      hoursLeft: limit - hrs,
    }
  }
  if (hrs > limit * 0.7) {
    return {
      label: `${Math.round(limit - hrs)}h left`,
      cls: 'sla-warn',
      overdue: false,
      hoursLeft: limit - hrs,
    }
  }
  return {
    label: `${Math.round(limit - hrs)}h left`,
    cls: 'sla-ok',
    overdue: false,
    hoursLeft: limit - hrs,
  }
}

export function ticketsSlaRisk(tickets = []) {
  return (tickets || []).filter((t) => computeTicketSla(t).overdue)
}

/** Sort open tickets: overdue first, then least time left. */
export function sortBySlaUrgency(tickets = []) {
  return [...(tickets || [])].sort((a, b) => {
    const sa = computeTicketSla(a)
    const sb = computeTicketSla(b)
    if (sa.overdue !== sb.overdue) return sa.overdue ? -1 : 1
    const ha = sa.hoursLeft ?? 9999
    const hb = sb.hoursLeft ?? 9999
    return ha - hb
  })
}
