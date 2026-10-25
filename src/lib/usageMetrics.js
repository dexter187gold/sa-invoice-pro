export function computeUsage({ invoices = [], clients = [], tickets = [], payments = [], seats = [] } = {}) {
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const invMonth = invoices.filter((i) => String(i.date || i.createdAt || '').startsWith(ym))
  const paidMonth = payments.filter((p) => String(p.date || '').startsWith(ym))
  const ar = invoices
    .filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status))
    .reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
  return {
    month: ym,
    invoicesThisMonth: invMonth.length,
    paymentsThisMonth: paidMonth.length,
    clientsTotal: clients.length,
    openJobs: tickets.filter((t) => !['closed', 'resolved', 'cancelled'].includes(String(t.status || '').toLowerCase())).length,
    seatsActive: seats.filter((s) => s.active !== false).length,
    openAr: ar,
    suggestedTier:
      seats.filter((s) => s.active !== false).length > 5
        ? 'multi'
        : seats.filter((s) => s.active !== false).length > 1
          ? 'shop'
          : invMonth.length > 80
            ? 'shop'
            : 'solo',
  }
}
