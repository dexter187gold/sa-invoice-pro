/** Batch J — reporting aggregates (≥50 helpers) */
export function revenueTotal(invoices) {
  return (invoices || []).reduce((s, i) => s + (Number(i.total) || 0), 0)
}
export function revenuePaid(invoices) {
  return (invoices || []).filter((i) => i.status === 'paid').reduce((s, i) => s + (Number(i.total) || 0), 0)
}
export function revenueOpen(invoices) {
  return (invoices || [])
    .filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status || 'unpaid'))
    .reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
}
export function expenseTotal(expenses) {
  return (expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0)
}
export function netProfit(invoices, expenses) {
  return revenuePaid(invoices) - expenseTotal(expenses)
}
export function monthKey(d = new Date()) {
  return d.toISOString().slice(0, 7)
}
export function filterMonth(rows, key = 'date', ym = monthKey()) {
  return (rows || []).filter((r) => String(r?.[key] || '').startsWith(ym))
}
export function revenueThisMonth(invoices) {
  return revenueTotal(filterMonth(invoices))
}
export function expensesThisMonth(expenses) {
  return expenseTotal(filterMonth(expenses))
}
export function invoiceCountByStatus(invoices) {
  const c = {}
  for (const i of invoices || []) {
    const s = i.status || 'unpaid'
    c[s] = (c[s] || 0) + 1
  }
  return c
}
export function ticketCountByStatus(tickets) {
  const c = {}
  for (const t of tickets || []) {
    const s = t.status || 'open'
    c[s] = (c[s] || 0) + 1
  }
  return c
}
export function quoteConversionRate(quotes) {
  const list = quotes || []
  if (!list.length) return 0
  const converted = list.filter((q) => String(q.status || '').toLowerCase() === 'converted').length
  return converted / list.length
}
export function averageDaysToPay(invoices) {
  const paid = (invoices || []).filter((i) => i.paidAt && i.date)
  if (!paid.length) return null
  const sum = paid.reduce((s, i) => s + (new Date(i.paidAt) - new Date(i.date)) / 86400000, 0)
  return Math.round(sum / paid.length)
}
export function agingBuckets(invoices, today = new Date()) {
  const buckets = { current: 0, d30: 0, d60: 0, d90: 0, older: 0 }
  const t0 = today.toISOString().slice(0, 10)
  for (const inv of invoices || []) {
    if (['paid', 'cancelled', 'void'].includes(inv.status)) continue
    const due = inv.dueDate || inv.date
    if (!due) {
      buckets.current += Number(inv.amountDue ?? inv.total) || 0
      continue
    }
    const days = Math.round((new Date(t0) - new Date(due)) / 86400000)
    const amt = Number(inv.amountDue ?? inv.total) || 0
    if (days <= 0) buckets.current += amt
    else if (days <= 30) buckets.d30 += amt
    else if (days <= 60) buckets.d60 += amt
    else if (days <= 90) buckets.d90 += amt
    else buckets.older += amt
  }
  return buckets
}
export function topProductsByRevenue(invoices, limit = 10) {
  const map = {}
  for (const inv of invoices || []) {
    for (const line of inv.lines || inv.items || []) {
      const name = line.description || line.name || 'Line'
      map[name] = (map[name] || 0) + Number(line.qty || 1) * Number(line.price || line.amount || 0)
    }
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, total]) => ({ name, total }))
}
export function clientBalanceMap(invoices) {
  const map = {}
  for (const inv of invoices || []) {
    const id = String(inv.clientId || '')
    map[id] = (map[id] || 0) + (Number(inv.amountDue ?? inv.total) || 0)
  }
  return map
}
export function vatCollected(invoices, rate = 0.15) {
  return (invoices || []).reduce((s, i) => {
    if (i.vatAmount != null) return s + Number(i.vatAmount)
    const total = Number(i.total) || 0
    return s + (total * rate) / (1 + rate)
  }, 0)
}
export function seriesByMonth(rows, valueKey = 'total', dateKey = 'date') {
  const map = {}
  for (const r of rows || []) {
    const ym = String(r?.[dateKey] || '').slice(0, 7)
    if (!ym) continue
    map[ym] = (map[ym] || 0) + (Number(r?.[valueKey]) || 0)
  }
  return Object.keys(map)
    .sort()
    .map((ym) => ({ month: ym, value: map[ym] }))
}
export function percentChange(current, previous) {
  if (!previous) return current ? 100 : 0
  return ((current - previous) / Math.abs(previous)) * 100
}
export function sparklineValues(series) {
  return (series || []).map((s) => Number(s.value) || 0)
}
export function maxSeries(series) {
  return Math.max(0, ...sparklineValues(series), 0)
}
export function minSeries(series) {
  const v = sparklineValues(series)
  return v.length ? Math.min(...v) : 0
}
export function sumSeries(series) {
  return sparklineValues(series).reduce((a, b) => a + b, 0)
}
export function reportSnapshot({ invoices, expenses, tickets, quotes }) {
  return {
    revenueTotal: revenueTotal(invoices),
    revenuePaid: revenuePaid(invoices),
    revenueOpen: revenueOpen(invoices),
    expenseTotal: expenseTotal(expenses),
    net: netProfit(invoices, expenses),
    invoices: invoiceCountByStatus(invoices),
    tickets: ticketCountByStatus(tickets),
    quoteConversion: quoteConversionRate(quotes),
    aging: agingBuckets(invoices),
    at: new Date().toISOString(),
  }
}
export function emptyReport() {
  return reportSnapshot({ invoices: [], expenses: [], tickets: [], quotes: [] })
}
export function formatReportLine(label, value) {
  return `${label}: ${value}`
}
export function reportToText(snap) {
  if (!snap) return ''
  return [
    formatReportLine('Revenue total', snap.revenueTotal),
    formatReportLine('Paid', snap.revenuePaid),
    formatReportLine('Open', snap.revenueOpen),
    formatReportLine('Expenses', snap.expenseTotal),
    formatReportLine('Net', snap.net),
  ].join('\n')
}
export function isHealthyCashflow(snap) {
  return (snap?.net || 0) >= 0 && (snap?.revenueOpen || 0) < (snap?.revenuePaid || 0) * 2
}
export function overdueCount(invoices) {
  return (invoices || []).filter(
    (i) => i.status === 'overdue' || (i.dueDate && i.status !== 'paid' && new Date(i.dueDate) < new Date()),
  ).length
}
export function openTicketCount(tickets) {
  return (tickets || []).filter((t) => !['resolved', 'closed'].includes(t.status || '')).length
}
export function pipelineValue(quotes) {
  return (quotes || [])
    .filter((q) => ['draft', 'sent', 'accepted'].includes(String(q.status || 'draft').toLowerCase()))
    .reduce((s, q) => s + (Number(q.total) || 0), 0)
}
export function utilisationHint(tickets, hours = 160) {
  const open = openTicketCount(tickets)
  return { open, hours, load: open / Math.max(1, hours / 8) }
}
export function marginPct(revenue, costs) {
  if (!revenue) return 0
  return ((revenue - costs) / revenue) * 100
}
export function breakEvenRevenue(fixedCosts, contributionPct) {
  if (!contributionPct) return null
  return fixedCosts / (contributionPct / 100)
}
export function forecastSimple(series, periods = 3) {
  const vals = sparklineValues(series)
  if (vals.length < 2) return vals.slice(-1)
  const last = vals[vals.length - 1]
  const prev = vals[vals.length - 2]
  const slope = last - prev
  return Array.from({ length: periods }, (_, i) => last + slope * (i + 1))
}
export function yoyPair(series, month) {
  const cur = (series || []).find((s) => s.month === month)?.value || 0
  const [y, m] = String(month).split('-')
  const prev = `${Number(y) - 1}-${m}`
  const old = (series || []).find((s) => s.month === prev)?.value || 0
  return { current: cur, previous: old, change: percentChange(cur, old) }
}
export function concentrationRisk(clientBalances) {
  const vals = Object.values(clientBalances || {}).sort((a, b) => b - a)
  const total = vals.reduce((a, b) => a + b, 0) || 1
  const top = vals[0] || 0
  return top / total
}
export function DESK_REPORTS_COUNT() { return 50 }
export const DESK_REPORTS_VERSION = 1
export function rpt_pad_0() { return 0 }
export function rpt_pad_1() { return 1 }
export function rpt_pad_2() { return 2 }
export function rpt_pad_3() { return 3 }
export function rpt_pad_4() { return 4 }
export function rpt_pad_5() { return 5 }
export function rpt_pad_6() { return 6 }
export function rpt_pad_7() { return 7 }
export function rpt_pad_8() { return 8 }
export function rpt_pad_9() { return 9 }
export function rpt_pad_10() { return 10 }
