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

/**
 * Validate a payment against the remaining invoice balance before any writes.
 * When payment rows are supplied they are authoritative; otherwise use the
 * invoice's stored amountDue/amountPaid fields.
 */
export function validatePaymentAmount(invoice, amount, existingPayments = null) {
  if (!invoice?.id) throw new Error('Invoice required')
  const amt = Number(amount)
  if (!Number.isFinite(amt) || !(amt > 0)) throw new Error('Amount required')

  const total = Number(invoice.total)
  let due
  if (Number.isFinite(total) && Array.isArray(existingPayments)) {
    const paid = sumPaymentsForInvoice(existingPayments, invoice.id)
    due = Math.max(0, Math.round((total - paid) * 100) / 100)
  } else if (invoice.amountDue != null && Number.isFinite(Number(invoice.amountDue))) {
    due = Math.max(0, Number(invoice.amountDue))
  } else if (Number.isFinite(total)) {
    due = Math.max(0, total - (Number(invoice.amountPaid) || 0))
  } else {
    throw new Error('Invoice balance unavailable')
  }

  if (amt - due > 0.009) {
    throw new Error(`Payment exceeds the remaining invoice balance of R${due.toFixed(2)}. Record the excess separately as an unapplied customer credit.`)
  }
  return { amount: Math.round(amt * 100) / 100, due }
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
 * Record a payment and its journal entry atomically. The invoice and its
 * linked payments are re-read inside the same readwrite transaction so stale
 * UI state cannot authorize an overpayment.
 *
 * idempotencyKey is optional for manual payments and should be a stable
 * external transaction identity for imports/webhooks.
 */
export async function recordPayment({
  invoice,
  amount,
  method = 'EFT',
  date = new Date().toISOString().slice(0, 10),
  reference = '',
  idempotencyKey = '',
}) {
  if (!invoice?.id) throw new Error('Invoice required')
  const requestedAmount = Number(amount)
  if (!Number.isFinite(requestedAmount) || !(requestedAmount > 0)) throw new Error('Amount required')

  let outcome
  await db.withTransaction(
    [STORES.invoices, STORES.payments, STORES.journal],
    (transaction, setResult) => {
      const invoicesStore = transaction.objectStore(STORES.invoices)
      const paymentsStore = transaction.objectStore(STORES.payments)
      const journalStore = transaction.objectStore(STORES.journal)
      const invoiceRequest = invoicesStore.get(invoice.id)
      const paymentsRequest = paymentsStore.getAll()
      let currentInvoice
      let linkedPayments
      let invoiceReady = false
      let paymentsReady = false

      const commit = () => {
        if (!invoiceReady || !paymentsReady) return
        try {
          if (!currentInvoice) throw new Error('Invoice no longer exists')
          if (idempotencyKey) {
            const prior = linkedPayments.find((p) => p.idempotencyKey === idempotencyKey)
            if (prior) {
              outcome = { payment: prior, invoice: currentInvoice, duplicate: true }
              setResult(outcome)
              return
            }
          }
          const { amount: amt } = validatePaymentAmount(currentInvoice, requestedAmount, linkedPayments)
          const payment = {
            id: crypto.randomUUID(),
            invoiceId: currentInvoice.id,
            clientId: currentInvoice.clientId,
            amount: amt,
            method,
            date: String(date || '').slice(0, 10),
            reference: reference || '',
            ...(idempotencyKey ? { idempotencyKey } : {}),
            createdAt: new Date().toISOString(),
          }
          const paidSoFar = sumPaymentsForInvoice([...linkedPayments, payment], currentInvoice.id)
          const updatedInvoice = applyPaidToInvoice(currentInvoice, paidSoFar)
          const journal = {
            id: crypto.randomUUID(),
            date: payment.date,
            memo: `Payment ${method}${reference ? ` · ${reference}` : ''} · ${currentInvoice.number || currentInvoice.id}`,
            debitCode: '1000',
            creditCode: '1100',
            debit: amt,
            credit: amt,
            amount: amt,
            autoPost: true,
            sourceKey: `pay-${payment.id}`,
            paymentId: payment.id,
            invoiceId: currentInvoice.id,
            clientId: currentInvoice.clientId,
            createdAt: new Date().toISOString(),
          }
          paymentsStore.add(payment)
          invoicesStore.put(updatedInvoice)
          journalStore.add(journal)
          outcome = { payment, invoice: updatedInvoice, duplicate: false }
          setResult(outcome)
        } catch (error) {
          try { transaction.abort() } catch {}
          throw error
        }
      }

      invoiceRequest.onsuccess = () => {
        currentInvoice = invoiceRequest.result
        invoiceReady = true
        commit()
      }
      paymentsRequest.onsuccess = () => {
        linkedPayments = (paymentsRequest.result || []).filter(
          (p) => String(p.invoiceId) === String(invoice.id)
        )
        paymentsReady = true
        commit()
      }
      invoiceRequest.onerror = () => { try { transaction.abort() } catch {} }
      paymentsRequest.onerror = () => { try { transaction.abort() } catch {} }
    }
  )
  return outcome
}

/** Delete a payment and reverse its invoice + journal entry atomically. */
export async function deletePayment(payment) {
  if (!payment?.id) return null

  let updatedInvoice = null
  await db.withTransaction(
    [STORES.invoices, STORES.payments, STORES.journal],
    (transaction, setResult) => {
      const invoicesStore = transaction.objectStore(STORES.invoices)
      const paymentsStore = transaction.objectStore(STORES.payments)
      const journalStore = transaction.objectStore(STORES.journal)
      const paymentRequest = paymentsStore.get(payment.id)
      const paymentsRequest = paymentsStore.getAll()
      const journalsRequest = journalStore.getAll()
      let currentPayment
      let allPayments
      let journals
      let ready = 0

      const commit = () => {
        if (ready !== 3) return
        try {
          if (!currentPayment) {
            setResult(null)
            return
          }
          const invoiceRequest = invoicesStore.get(currentPayment.invoiceId)
          invoiceRequest.onsuccess = () => {
            try {
              const currentInvoice = invoiceRequest.result
              paymentsStore.delete(currentPayment.id)
              for (const entry of journals) {
                if (entry.sourceKey === `pay-${currentPayment.id}` ||
                    String(entry.paymentId) === String(currentPayment.id)) {
                  journalStore.delete(entry.id)
                }
              }
              if (currentInvoice) {
                const remaining = allPayments
                  .filter((p) => String(p.id) !== String(currentPayment.id) &&
                    String(p.invoiceId) === String(currentPayment.invoiceId))
                  .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
                updatedInvoice = applyPaidToInvoice(currentInvoice, remaining)
                invoicesStore.put(updatedInvoice)
              }
              setResult(updatedInvoice)
            } catch (error) {
              try { transaction.abort() } catch {}
            }
          }
          invoiceRequest.onerror = () => { try { transaction.abort() } catch {} }
        } catch {
          try { transaction.abort() } catch {}
        }
      }

      paymentRequest.onsuccess = () => { currentPayment = paymentRequest.result; ready++; commit() }
      paymentsRequest.onsuccess = () => { allPayments = paymentsRequest.result || []; ready++; commit() }
      journalsRequest.onsuccess = () => { journals = journalsRequest.result || []; ready++; commit() }
      paymentRequest.onerror = () => { try { transaction.abort() } catch {} }
      paymentsRequest.onerror = () => { try { transaction.abort() } catch {} }
      journalsRequest.onerror = () => { try { transaction.abort() } catch {} }
    }
  )
  return updatedInvoice
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
