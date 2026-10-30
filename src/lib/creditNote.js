/**
 * Credit notes (P2) — partial refunds / invoice corrections.
 * A credit note reduces amount rep due; never invents cash without a payment row.
 */
import * as db from './db.js'
import { STORES } from './db.js'

export function remainingBalance(invoice = {}) {
  const total = Number(invoice.total ?? invoice.grandTotal ?? 0) || 0
  const paid = Number(invoice.amountPaid ?? invoice.paid ?? 0) || 0
  const credited = Number(invoice.amountCredited ?? 0) || 0
  return Math.max(0, Math.round((total - paid - credited) * 100) / 100)
}

export function canIssueCreditNote(invoice = {}) {
  if (!invoice || !invoice.id) return false
  const status = String(invoice.status || '').toLowerCase()
  if (status === 'void' || status === 'draft') return false
  return remainingBalance(invoice) > 0 || Number(invoice.amountPaid || 0) > 0
}

export function maxCreditAmount(invoice = {}) {
  return Math.max(remainingBalance(invoice), Number(invoice.amountPaid || 0) || 0)
}

export function buildCreditNote(invoice, opts = {}) {
  if (!canIssueCreditNote(invoice)) {
    throw new Error('Cannot issue a credit note on this invoice')
  }
  const max = maxCreditAmount(invoice)
  const amount = Math.round(Number(opts.amount || 0) * 100) / 100
  if (!(amount > 0)) throw new Error('Credit amount must be greater than zero')
  if (amount > max + 0.001) {
    throw new Error('Credit amount cannot exceed R' + max.toFixed(2))
  }
  const now = new Date().toISOString()
  return {
    id: opts.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'cn_' + Date.now()),
    type: 'credit_note',
    number: opts.number || ('CN-' + String(invoice.number || invoice.id).replace(/[^A-Za-z0-9]/g, '') + '-' + Date.now().toString(36).toUpperCase()),
    invoiceId: invoice.id,
    invoiceNumber: invoice.number || '',
    clientId: invoice.clientId,
    amount,
    reason: String(opts.reason || '').trim() || 'Adjustment',
    lines: Array.isArray(opts.lines) ? opts.lines : [{ description: opts.reason || 'Credit', amount }],
    status: 'issued',
    createdAt: now,
    updatedAt: now,
  }
}

export function applyCreditToInvoice(invoice, creditNote) {
  const amount = Number(creditNote && creditNote.amount || 0) || 0
  const amountCredited = Math.round(((Number(invoice.amountCredited || 0) || 0) + amount) * 100) / 100
  const bal = remainingBalance({ ...invoice, amountCredited })
  let status = invoice.status
  if (bal <= 0.009) status = 'paid'
  else if (Number(invoice.amountPaid || 0) > 0 || amountCredited > 0) status = 'partial'
  return {
    ...invoice,
    amountCredited,
    amountDue: bal,
    balance: bal,
    status,
    updatedAt: new Date().toISOString(),
    lastCreditNoteId: creditNote && creditNote.id,
  }
}

export async function issueCreditNote(invoice, opts = {}) {
  const cn = buildCreditNote(invoice, opts)
  const updatedInv = applyCreditToInvoice(invoice, cn)
  await db.put(STORES.invoices, updatedInv)

  const cnDoc = {
    id: cn.id,
    number: cn.number,
    type: 'credit_note',
    isCredit: true,
    creditFor: invoice.id,
    clientId: invoice.clientId,
    date: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    status: 'paid',
    total: -Math.abs(cn.amount),
    exclusive: -Math.abs(cn.amount),
    vatAmount: 0,
    amountPaid: -Math.abs(cn.amount),
    amountDue: 0,
    amountCredited: 0,
    lines: cn.lines.map(function (l) {
      return {
        description: l.description || cn.reason,
        qty: 1,
        price: -Math.abs(Number(l.amount) || cn.amount),
      }
    }),
    notes: 'Credit note against ' + (invoice.number || invoice.id) + ': ' + cn.reason,
    reason: cn.reason,
    createdAt: cn.createdAt,
    updatedAt: cn.updatedAt,
  }
  await db.add(STORES.invoices, cnDoc)
  return { creditNote: cn, invoice: updatedInv, document: cnDoc }
}

export function partialPaymentClarity(invoice = {}, paymentAmount = 0) {
  const before = remainingBalance(invoice)
  const pay = Math.round(Number(paymentAmount || 0) * 100) / 100
  const after = Math.max(0, Math.round((before - pay) * 100) / 100)
  return {
    balanceBefore: before,
    payment: pay,
    balanceAfter: after,
    fullyPaid: after <= 0.009,
    overpay: pay > before + 0.001,
    label: after <= 0.009
      ? 'This payment settles the invoice in full'
      : 'After this payment, R' + after.toFixed(2) + ' will still be due',
  }
}
