/**
 * Read-only financial integrity diagnostics.
 * Findings are review candidates only; this module never edits or reverses records.
 */
export function analyzeFinancialIntegrity({ invoices = [], payments = [], bankTxns = [], journal = [] } = {}) {
  const findings = []
  const invoiceById = new Map((invoices || []).map((row) => [String(row.id), row]))
  const paymentSums = new Map()
  const paymentsByInvoice = new Map()
  for (const payment of payments || []) {
    const id = String(payment.invoiceId || '')
    if (id) {
      paymentSums.set(id, (paymentSums.get(id) || 0) + (Number(payment.amount) || 0))
      paymentsByInvoice.set(id, (paymentsByInvoice.get(id) || 0) + 1)
      if (!invoiceById.has(id)) findings.push({
        severity: 'review', code: 'payment_missing_invoice', recordId: payment.id,
        title: 'Payment references a missing invoice',
        detail: 'Confirm whether the invoice was archived, deleted, or linked incorrectly before editing this payment.',
      })
    }
  }

  for (const invoice of invoices || []) {
    const id = String(invoice.id)
    const total = Number(invoice.total) || 0
    const due = Number(invoice.amountDue)
    const linkedPaid = paymentSums.get(id) || 0
    const knownPaid = Number.isFinite(Number(invoice.amountPaid)) ? Number(invoice.amountPaid) : linkedPaid
    if (String(invoice.status || '').toLowerCase() === 'paid' && (due > 0.01 || knownPaid + 0.01 < total)) {
      findings.push({
        severity: 'high', code: 'paid_invoice_balance_mismatch', recordId: invoice.id,
        title: 'Invoice marked Paid but payment evidence is incomplete',
        detail: 'Status, amount due, recorded amount paid, and linked payment rows disagree. Review the source documents; no automatic repair was made.',
      })
    } else if (Math.abs(knownPaid - linkedPaid) > 0.02 && (paymentsByInvoice.get(id) || 0) > 0) {
      findings.push({
        severity: 'review', code: 'invoice_payment_sum_mismatch', recordId: invoice.id,
        title: 'Invoice payment total differs from linked payment rows',
        detail: 'Compare imported history and payment records before making a correction.',
      })
    }
    if (due < -0.01) findings.push({
      severity: 'review', code: 'negative_invoice_balance', recordId: invoice.id,
      title: 'Invoice has a negative balance due',
      detail: 'Review overpayment and credit-note handling.',
    })
  }

  const seenBank = new Map()
  const fingerprint = (row) => [
    String(row.date || '').slice(0, 10),
    Number(row.amount || 0).toFixed(2),
    String(row.description || '').trim().toLowerCase(),
    String(row.reference || '').trim().toLowerCase(),
  ].join('|')
  for (const row of bankTxns || []) {
    const key = fingerprint(row)
    if (seenBank.has(key)) findings.push({
      severity: 'review', code: 'duplicate_bank_fingerprint', recordId: row.id,
      title: 'Potential duplicate bank statement line',
      detail: 'Two rows share date, amount, description, and reference. Check the original statement before removing either row.',
    })
    else seenBank.set(key, row.id)
    if (row.matchedInvoiceId && row.paymentId && !(payments || []).some((p) => String(p.id) === String(row.paymentId))) {
      findings.push({
        severity: 'high', code: 'bank_match_missing_payment', recordId: row.id,
        title: 'Matched bank line references a missing payment',
        detail: 'Check payment and bank-import history before repairing the link.',
      })
    }
  }

  const journalKeys = new Map()
  for (const row of journal || []) {
    if (!row.sourceKey) continue
    journalKeys.set(String(row.sourceKey), (journalKeys.get(String(row.sourceKey)) || 0) + 1)
  }
  for (const [sourceKey, count] of journalKeys) {
    if (count > 1) findings.push({
      severity: 'high', code: 'duplicate_journal_source', recordId: sourceKey,
      title: 'Multiple journal rows share a source key',
      detail: 'Review for duplicate posting. This scan does not delete or reverse entries.',
    })
  }

  return {
    scanned: { invoices: invoices.length, payments: payments.length, bankTransactions: bankTxns.length, journalEntries: journal.length },
    findings,
    counts: {
      high: findings.filter((f) => f.severity === 'high').length,
      review: findings.filter((f) => f.severity === 'review').length,
    },
    readOnly: true,
  }
}
