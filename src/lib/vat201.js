/**
 * VAT201-style period helper (ZA simplified).
 * Output VAT from invoices (taxable supplies), input VAT from expenses marked with vat.
 */

function inPeriod(iso, from, to) {
  const d = String(iso || '').slice(0, 10)
  if (!d) return false
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

/** Default period: current calendar month */
export function defaultVatPeriod(now = new Date()) {
  const y = now.getFullYear()
  const m = now.getMonth()
  const from = `${y}-${String(m + 1).padStart(2, '0')}-01`
  const last = new Date(y, m + 1, 0).getDate()
  const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { from, to, label: `${from} → ${to}` }
}

/**
 * @param {{ invoices?: any[], expenses?: any[], payments?: any[], from?: string, to?: string }} opts
 */
export function computeVat201({ invoices = [], expenses = [], from, to } = {}) {
  const period = from && to ? { from, to } : defaultVatPeriod()
  const f = period.from
  const t = period.to

  let standardRatedSupplies = 0
  let outputVat = 0
  let zeroRated = 0
  let creditNotes = 0
  let creditVat = 0

  for (const inv of invoices) {
    const d = inv.date || inv.paidDate || inv.createdAt
    if (!inPeriod(d, f, t)) continue
    const exclusive = Number(inv.exclusive) || Math.max(0, (Number(inv.total) || 0) - (Number(inv.vatAmount) || 0))
    const vat = Number(inv.vatAmount) || 0
    if (inv.isCredit || inv.documentType === 'credit-note' || (Number(inv.total) || 0) < 0) {
      creditNotes += Math.abs(exclusive)
      creditVat += Math.abs(vat)
      continue
    }
    if (vat <= 0.009) {
      zeroRated += exclusive || Number(inv.total) || 0
    } else {
      standardRatedSupplies += exclusive
      outputVat += vat
    }
  }

  let inputVat = 0
  let deductibleExpenses = 0
  for (const e of expenses) {
    const d = e.date || e.createdAt
    if (!inPeriod(d, f, t)) continue
    const amt = Number(e.amount) || 0
    const vat = Number(e.vatAmount) != null && Number.isFinite(Number(e.vatAmount))
      ? Number(e.vatAmount)
      : e.vatInclusive
        ? Math.round((amt * 15) / 115 * 100) / 100
        : e.hasVat
          ? Math.round(amt * 0.15 * 100) / 100
          : 0
    if (vat > 0.009) {
      inputVat += vat
      deductibleExpenses += e.vatInclusive ? amt - vat : amt
    }
  }

  const netVat = Math.round((outputVat - creditVat - inputVat) * 100) / 100

  return {
    period: { from: f, to: t },
    standardRatedSupplies: Math.round(standardRatedSupplies * 100) / 100,
    outputVat: Math.round(outputVat * 100) / 100,
    zeroRated: Math.round(zeroRated * 100) / 100,
    creditNotes: Math.round(creditNotes * 100) / 100,
    creditVat: Math.round(creditVat * 100) / 100,
    inputVat: Math.round(inputVat * 100) / 100,
    deductibleExpenses: Math.round(deductibleExpenses * 100) / 100,
    netVatPayable: netVat > 0 ? netVat : 0,
    netVatRefundable: netVat < 0 ? Math.abs(netVat) : 0,
    netVat,
  }
}

export function vat201CsvRows(summary) {
  return [
    ['Field', 'Amount (R)'],
    ['Period from', summary.period.from],
    ['Period to', summary.period.to],
    ['Standard-rated supplies (excl. VAT)', summary.standardRatedSupplies],
    ['Output VAT', summary.outputVat],
    ['Zero-rated / non-taxable supplies', summary.zeroRated],
    ['Credit notes (excl. VAT)', summary.creditNotes],
    ['Credit note VAT', summary.creditVat],
    ['Input VAT (expenses)', summary.inputVat],
    ['Net VAT payable', summary.netVatPayable],
    ['Net VAT refundable', summary.netVatRefundable],
  ]
}
