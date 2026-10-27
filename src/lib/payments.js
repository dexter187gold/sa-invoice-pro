/**
 * Payment recording shared by Payments page and any future callers.
 * Updates invoice balances, posts accounting journals (Dr Bank / Cr AR),
 * and supports reverse on delete.
 */
import * as db from './db.js'
import { STORES } from './db.js'

export function sumPaymentsForInvoice(payments, invoiceId) {
  return (payments || [])
    .filter((p) => String(p.invoiceId) === String(invoiceId))
    .reduce((s, p) => s + (Number(p.amount) || 0), 0)
}

export function applyPaidToInvoice(inv, amountPaid) {
  const total = Number(inv.total) || 0
  const paid = Math.max(0, Number(amountPaid) || 0)
  const amountDue = Math.max(0, Math.round((total - paid) * 100) / 100)
  let status = inv.status || 'unpaid'
  if (amountDue <= 0.009) {
    status = 'paid'
  } else if (paid > 0.009) {
    status = 'partial'
  } else if (status === 'paid' || status === 'partial') {
    status = 'unpaid'
  }
  const next = {
    ...inv,
    amountPaid: paid,
    amountDue,
    status,
  }
  if (status === 'paid') {
    next.paidAt = inv.paidAt || new Date().toISOString()
    next.paidDate = (inv.paidDate || next.paidAt || '').slice(0, 10)
  } else {
    delete next.paidAt
    delete next.paidDate
  }
  return next
}

/**
 * Record a payment against an invoice.
 * @returns {{ payment, invoice }}
 */
export async function recordPayment({
  invoice,
  amount,
  method = 'EFT',
  date = new Date().toISOString().slice(0, 10),
  reference = '',
  existingPayments = null,
}) {
  if (!invoice?.id) throw new Error('Invoice required')
  const amt = Number(amount) || 0
  if (!(amt > 0)) throw new Error('Amount required')

  const payment = await db.add(STORES.payments, {
    invoiceId: invoice.id,
    clientId: invoice.clientId,
    amount: amt,
    method,
    date: String(date || '').slice(0, 10),
    reference: reference || '',
  })

  let paidSoFar
  if (Array.isArray(existingPayments)) {
    paidSoFar = sumPaymentsForInvoice([...existingPayments, payment], invoice.id)
  } else {
    paidSoFar = (Number(invoice.amountPaid) || 0) + amt
  }
  const updatedInv = applyPaidToInvoice(invoice, paidSoFar)
  await db.put(STORES.invoices, updatedInv)

  // Accounting: cash in bank, reduce AR
  await db.add(STORES.journal, {
    date: String(date || '').slice(0, 10),
    memo: `Payment ${method}${reference ? ` · ${reference}` : ''} · ${invoice.number || invoice.id}`,
    debitCode: '1000',
    creditCode: '1100',
    debit: amt,
    credit: amt,
    amount: amt,
    autoPost: true,
    sourceKey: `pay-${payment.id}`,
    paymentId: payment.id,
    invoiceId: invoice.id,
    clientId: invoice.clientId,
  })

  return { payment, invoice: updatedInv }
}

/** Delete a payment and reverse invoice + matching journal entry. */
export async function deletePayment(payment, { invoice, allPaymentsForInvoice = [] } = {}) {
  if (!payment?.id) return

  await db.remove(STORES.payments, payment.id)

  // Reverse journal if present
  const journals = await db.getAll(STORES.journal)
  const related = journals.filter(
    (j) => j.sourceKey === `pay-${payment.id}` || String(j.paymentId) === String(payment.id)
  )
  for (const j of related) {
    await db.remove(STORES.journal, j.id)
  }

  if (invoice) {
    const remaining = (allPaymentsForInvoice || [])
      .filter((p) => String(p.id) !== String(payment.id))
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const updatedInv = applyPaidToInvoice(invoice, remaining)
    await db.put(STORES.invoices, updatedInv)
    return updatedInv
  }
  return null
}

/**
 * Build chronological statement lines for a client (invoices + payments).
 * Positive amount = charge (invoice); negative = payment credit.
 */
export function buildClientLedger(client, invoices = [], payments = []) {
  const cid = String(client?.id)
  const invs = (invoices || []).filter((i) => String(i.clientId) === cid && !i.isCredit)
  const pays = (payments || []).filter((p) => {
    if (String(p.clientId) === cid) return true
    const inv = invs.find((i) => String(i.id) === String(p.invoiceId))
    return !!inv
  })

  const lines = []
  for (const inv of invs) {
    lines.push({
      type: 'invoice',
      id: inv.id,
      date: String(inv.date || inv.createdAt || '').slice(0, 10),
      ref: inv.number || String(inv.id).slice(0, 8),
      description: `Invoice ${inv.number || ''}`.trim(),
      status: inv.status || 'unpaid',
      debit: Number(inv.total) || 0,
      credit: 0,
      amount: Number(inv.total) || 0,
    })
  }
  for (const p of pays) {
    const inv = invs.find((i) => String(i.id) === String(p.invoiceId))
      || invoices.find((i) => String(i.id) === String(p.invoiceId))
    lines.push({
      type: 'payment',
      id: p.id,
      date: String(p.date || p.createdAt || '').slice(0, 10),
      ref: p.reference || p.method || 'Payment',
      description: `Payment${p.method ? ` · ${p.method}` : ''}${inv?.number ? ` · ${inv.number}` : ''}`,
      status: 'paid',
      debit: 0,
      credit: Number(p.amount) || 0,
      amount: -(Number(p.amount) || 0),
    })
  }

  lines.sort((a, b) => {
    const d = String(a.date).localeCompare(String(b.date))
    if (d) return d
    if (a.type !== b.type) return a.type === 'invoice' ? -1 : 1
    return String(a.ref).localeCompare(String(b.ref))
  })

  let running = 0
  for (const line of lines) {
    running += line.amount
    line.balance = Math.round(running * 100) / 100
  }

  const outstanding = Math.max(
    0,
    invs
      .filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status || 'unpaid'))
      .reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
  )

  return { lines, outstanding, running: Math.round(running * 100) / 100 }
}
