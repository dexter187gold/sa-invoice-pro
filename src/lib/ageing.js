export function bucketForInvoice(inv, now = Date.now()) {
  if (['paid', 'cancelled'].includes(inv.status)) return null
  const due = inv.dueDate || inv.date
  if (!due) return 'current'
  const days = Math.floor((now - new Date(due).getTime()) / 86400000)
  if (days <= 0) return 'current'
  if (days <= 30) return 'd30'
  if (days <= 60) return 'd60'
  if (days <= 90) return 'd90'
  return 'd90plus'
}

export function ageingReport(invoices) {
  const buckets = {
    current: { label: 'Current', total: 0, count: 0, ids: [] },
    d30: { label: '1–30 days', total: 0, count: 0, ids: [] },
    d60: { label: '31–60 days', total: 0, count: 0, ids: [] },
    d90: { label: '61–90 days', total: 0, count: 0, ids: [] },
    d90plus: { label: '90+ days', total: 0, count: 0, ids: [] },
  }
  for (const inv of invoices || []) {
    const b = bucketForInvoice(inv)
    if (!b || !buckets[b]) continue
    const amt = Number(inv.amountDue ?? inv.total) || 0
    buckets[b].total += amt
    buckets[b].count++
    buckets[b].ids.push(inv.id)
  }
  return buckets
}
