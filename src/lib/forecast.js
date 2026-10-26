/** Cash forecast from open invoice due dates (30 / 60 / 90). */

function bucketDays(dueStr, now = Date.now()) {
  if (!dueStr) return 90
  const t = new Date(String(dueStr).slice(0, 10) + 'T12:00:00').getTime()
  if (Number.isNaN(t)) return 90
  const days = Math.ceil((t - now) / 86400000)
  if (days <= 30) return 30
  if (days <= 60) return 60
  return 90
}

/**
 * @returns {{ d30: number, d60: number, d90: number, total: number, overdue: number, count: number }}
 */
export function cashForecast(invoices = [], now = Date.now()) {
  const out = { d30: 0, d60: 0, d90: 0, total: 0, overdue: 0, count: 0 }
  for (const inv of invoices || []) {
    if (inv.isCredit) continue
    if (!['unpaid', 'partial', 'overdue'].includes(inv.status || 'unpaid')) continue
    const amt = Number(inv.amountDue ?? inv.total) || 0
    if (amt <= 0) continue
    out.count++
    out.total += amt
    const dueStr = inv.dueDate || inv.date
    const dueDayMs = dueStr ? new Date(String(dueStr).slice(0, 10) + 'T00:00:00').getTime() : NaN
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    // Compare calendar days, not the current time; an invoice due today is not overdue at noon.
    if (!Number.isNaN(dueDayMs) && dueDayMs < today.getTime()) {
      out.overdue += amt
      out.d30 += amt // expect soonest collection pressure
      continue
    }
    const b = bucketDays(dueStr, now)
    if (b === 30) out.d30 += amt
    else if (b === 60) out.d60 += amt
    else out.d90 += amt
  }
  for (const k of ['d30', 'd60', 'd90', 'total', 'overdue']) {
    out[k] = Math.round(out[k] * 100) / 100
  }
  return out
}
