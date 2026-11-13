/**
 * Payment recording — cascade overpayments to open invoices, then unapplied credit.
 * Updates invoice balances, posts accounting journals (Dr Bank / Cr AR or unapplied),
 * and supports reverse on delete.
 */
import * as db from './db.js'
import { STORES } from './db.js'

export function sumPaymentsForInvoice(payments, invoiceId) {
  return (payments || [])
    .filter((p) => String(p.invoiceId) === String(invoiceId) && !p.unapplied)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0)
}

/** Live remaining balance from invoice total − linked payments (ignores stale amountDue). */
export function invoiceOutstanding(invoice, payments = []) {
  if (!invoice?.id) return 0
  const total = Number(invoice.total)
  if (!Number.isFinite(total)) return Math.max(0, Number(invoice.amountDue) || 0)
  const paid = sumPaymentsForInvoice(payments, invoice.id)
  return Math.max(0, Math.round((total - paid) * 100) / 100)
}

export function clientOutstanding(clientId, invoices = [], payments = []) {
  const cid = String(clientId)
  return (invoices || [])
    .filter((i) => String(i.clientId) === cid && !i.isCredit)
    .reduce((s, i) => s + invoiceOutstanding(i, payments), 0)
}

/**
 * Validate payment amount. When opts.allowOverpay is true, amounts above due are allowed
 * (caller cascades surplus). Otherwise reject overpay.
 */
export function validatePaymentAmount(invoice, amount, existingPayments = null, opts = {}) {
  const allowOverpay = !!opts.allowOverpay
  if (!invoice?.id) throw new Error('Invoice required')
  const amt = Number(amount)
  if (!Number.isFinite(amt) || !(amt > 0)) throw new Error('Amount required')

  const total = Number(invoice.total)
  let due
  if (Number.isFinite(total) && Array.isArray(existingPayments)) {
    due = Math.max(0, Math.round((total - sumPaymentsForInvoice(existingPayments, invoice.id)) * 100) / 100)
  } else if (invoice.amountDue != null && Number.isFinite(Number(invoice.amountDue))) {
    due = Math.max(0, Number(invoice.amountDue))
  } else if (Number.isFinite(total)) {
    due = Math.max(0, total - (Number(invoice.amountPaid) || 0))
  } else {
    throw new Error('Invoice balance unavailable')
  }

  if (!allowOverpay && amt - due > 0.009) {
    throw new Error(
      'Payment exceeds remaining balance of R' +
        due.toFixed(2) +
        '. Surplus can cascade to other open invoices.',
    )
  }
  return { amount: Math.round(amt * 100) / 100, due: Math.round(due * 100) / 100 }
}

export function applyPaidToInvoice(inv, amountPaid) {
  const total = Number(inv.total) || 0
  const paid = Math.max(0, Number(amountPaid) || 0)
  const amountDue = Math.max(0, Math.round((total - paid) * 100) / 100)
  let status = inv.status || 'unpaid'
  if (amountDue <= 0.009) status = 'paid'
  else if (paid > 0.009) status = 'partial'
  else if (status === 'paid' || status === 'partial') status = 'unpaid'
  const next = { ...inv, amountPaid: paid, amountDue, status }
  if (status === 'paid') {
    next.paidAt = inv.paidAt || new Date().toISOString()
    next.paidDate = (inv.paidDate || next.paidAt || '').slice(0, 10)
  } else {
    delete next.paidAt
    delete next.paidDate
  }
  return next
}

function openInvoicesForClient(allInvoices, clientId, excludeId) {
  const cid = String(clientId)
  return (allInvoices || [])
    .filter((i) => String(i.clientId) === cid && !i.isCredit && String(i.id) !== String(excludeId))
    .filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status || 'unpaid'))
    .sort((a, b) => String(a.dueDate || a.date || '').localeCompare(String(b.dueDate || b.date || '')))
}

/**
 * Record payment. When cascadeOverpay is true (default):
 * 1) apply to selected invoice up to due
 * 2) cascade residual to same client's other open invoices (oldest due first)
 * 3) any leftover becomes unapplied client credit (invoiceId=null, unapplied=true)
 */
export async function recordPayment({
  invoice,
  amount,
  method = 'EFT',
  date = new Date().toISOString().slice(0, 10),
  reference = '',
  idempotencyKey = '',
  cascadeOverpay = true,
}) {
  if (!invoice?.id) throw new Error('Invoice required')
  const requestedAmount = Number(amount)
  if (!Number.isFinite(requestedAmount) || !(requestedAmount > 0)) throw new Error('Amount required')

  let outcome
  await db.withTransaction(
    [STORES.invoices, STORES.payments, STORES.journal],
    (stores, transaction, setResult) => {
      const invoicesStore = stores[STORES.invoices]
      const paymentsStore = stores[STORES.payments]
      const journalStore = stores[STORES.journal]
      let currentInvoice
      let allPayments
      let allInvoices
      let ready = 0

      const commit = () => {
        if (ready !== 3) return
        try {
          if (!currentInvoice) throw new Error('Invoice no longer exists')
          if (idempotencyKey) {
            const prior = allPayments.find((p) => p.idempotencyKey === idempotencyKey)
            if (prior) {
              outcome = {
                payment: prior,
                invoice: currentInvoice,
                duplicate: true,
                allocations: [],
              }
              setResult(outcome)
              return
            }
          }
          const linkedPayments = allPayments.filter(
            (p) => String(p.invoiceId) === String(currentInvoice.id) && !p.unapplied,
          )
          const validated = validatePaymentAmount(currentInvoice, requestedAmount, linkedPayments, {
            allowOverpay: cascadeOverpay,
          })
          const totalPay = validated.amount
          const due = validated.due
          const payDate = String(date || '').slice(0, 10)
          const allocations = []
          let remaining = totalPay
          const createdPayments = []

          const postSlice = (invRow, sliceAmt, note) => {
            const amt = Math.round(sliceAmt * 100) / 100
            if (!(amt > 0.009)) return invRow
            const payment = {
              id: crypto.randomUUID(),
              invoiceId: invRow.id,
              clientId: invRow.clientId,
              amount: amt,
              method,
              date: payDate,
              reference: reference || note || '',
              allocationNote: note || '',
              createdAt: new Date().toISOString(),
            }
            if (idempotencyKey && createdPayments.length === 0) payment.idempotencyKey = idempotencyKey
            const priorPaid = sumPaymentsForInvoice(allPayments.concat(createdPayments), invRow.id)
            const updated = applyPaidToInvoice(invRow, priorPaid + amt)
            const journal = {
              id: crypto.randomUUID(),
              date: payDate,
              memo:
                'Payment ' +
                method +
                (reference ? ' · ' + reference : '') +
                ' · ' +
                (invRow.number || invRow.id) +
                (note ? ' · ' + note : ''),
              debitCode: '1000',
              creditCode: '1100',
              debit: amt,
              credit: amt,
              amount: amt,
              autoPost: true,
              sourceKey: 'pay-' + payment.id,
              paymentId: payment.id,
              invoiceId: invRow.id,
              clientId: invRow.clientId,
              createdAt: new Date().toISOString(),
            }
            paymentsStore.add(payment)
            invoicesStore.put(updated)
            journalStore.add(journal)
            createdPayments.push(payment)
            allocations.push({
              invoiceId: invRow.id,
              number: invRow.number,
              amount: amt,
              status: updated.status,
            })
            remaining = Math.round((remaining - amt) * 100) / 100
            return updated
          }

          let primaryUpdated = currentInvoice
          const primarySlice = Math.min(remaining, due)
          if (primarySlice > 0.009) primaryUpdated = postSlice(currentInvoice, primarySlice, 'Primary invoice')

          if (cascadeOverpay && remaining > 0.009) {
            const others = openInvoicesForClient(allInvoices, currentInvoice.clientId, currentInvoice.id)
            for (let i = 0; i < others.length; i++) {
              if (remaining <= 0.009) break
              const inv = others[i]
              const invDue = invoiceOutstanding(inv, allPayments.concat(createdPayments))
              if (invDue <= 0.009) continue
              postSlice(inv, Math.min(remaining, invDue), 'Overpayment cascade')
            }
          }

          if (remaining > 0.009) {
            const creditAmt = Math.round(remaining * 100) / 100
            const credit = {
              id: crypto.randomUUID(),
              invoiceId: null,
              clientId: currentInvoice.clientId,
              amount: creditAmt,
              method,
              date: payDate,
              reference: reference || 'Unapplied credit',
              unapplied: true,
              createdAt: new Date().toISOString(),
            }
            journalStore.add({
              id: crypto.randomUUID(),
              date: payDate,
              memo: 'Unapplied customer credit · ' + method + (reference ? ' · ' + reference : ''),
              debitCode: '1000',
              creditCode: '2100',
              debit: creditAmt,
              credit: creditAmt,
              amount: creditAmt,
              autoPost: true,
              sourceKey: 'pay-' + credit.id,
              paymentId: credit.id,
              clientId: currentInvoice.clientId,
              createdAt: new Date().toISOString(),
            })
            paymentsStore.add(credit)
            createdPayments.push(credit)
            allocations.push({ invoiceId: null, number: 'CREDIT', amount: creditAmt, status: 'unapplied' })
          }

          outcome = {
            payment: createdPayments[0] || null,
            payments: createdPayments,
            invoice: primaryUpdated,
            duplicate: false,
            allocations,
            cascaded: allocations.length > 1,
            totalAmount: totalPay,
          }
          setResult(outcome)
        } catch (error) {
          transaction.__failure = error
          try {
            transaction.abort()
          } catch (e) {}
        }
      }

      const r1 = invoicesStore.get(invoice.id)
      r1.onsuccess = function () {
        currentInvoice = r1.result
        ready++
        commit()
      }
      r1.onerror = function () {
        try {
          transaction.abort()
        } catch (e) {}
      }
      const r2 = paymentsStore.getAll()
      r2.onsuccess = function () {
        allPayments = r2.result || []
        ready++
        commit()
      }
      r2.onerror = function () {
        try {
          transaction.abort()
        } catch (e) {}
      }
      const r3 = invoicesStore.getAll()
      r3.onsuccess = function () {
        allInvoices = r3.result || []
        ready++
        commit()
      }
      r3.onerror = function () {
        try {
          transaction.abort()
        } catch (e) {}
      }
    },
  )
  return outcome
}

export async function deletePayment(payment) {
  if (!payment?.id) return null
  let updatedInvoice = null
  await db.withTransaction(
    [STORES.invoices, STORES.payments, STORES.journal],
    (stores, transaction, setResult) => {
      const invoicesStore = stores[STORES.invoices]
      const paymentsStore = stores[STORES.payments]
      const journalStore = stores[STORES.journal]
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
                if (
                  entry.sourceKey === 'pay-' + currentPayment.id ||
                  String(entry.paymentId) === String(currentPayment.id)
                ) {
                  journalStore.delete(entry.id)
                }
              }
              if (currentInvoice && currentPayment.invoiceId) {
                const remaining = allPayments
                  .filter(
                    (p) =>
                      String(p.id) !== String(currentPayment.id) &&
                      String(p.invoiceId) === String(currentPayment.invoiceId) &&
                      !p.unapplied,
                  )
                  .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
                updatedInvoice = applyPaidToInvoice(currentInvoice, remaining)
                invoicesStore.put(updatedInvoice)
              }
              setResult(updatedInvoice)
            } catch (error) {
              try {
                transaction.abort()
              } catch (e) {}
            }
          }
          invoiceRequest.onerror = () => {
            try {
              transaction.abort()
            } catch (e) {}
          }
        } catch (e) {
          try {
            transaction.abort()
          } catch (err) {}
        }
      }

      paymentRequest.onsuccess = () => {
        currentPayment = paymentRequest.result
        ready++
        commit()
      }
      paymentsRequest.onsuccess = () => {
        allPayments = paymentsRequest.result || []
        ready++
        commit()
      }
      journalsRequest.onsuccess = () => {
        journals = journalsRequest.result || []
        ready++
        commit()
      }
      paymentRequest.onerror = () => {
        try {
          transaction.abort()
        } catch (e) {}
      }
      paymentsRequest.onerror = () => {
        try {
          transaction.abort()
        } catch (e) {}
      }
      journalsRequest.onerror = () => {
        try {
          transaction.abort()
        } catch (e) {}
      }
    },
  )
  return updatedInvoice
}

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
      description: 'Invoice ' + (inv.number || ''),
      status: inv.status || 'unpaid',
      debit: Number(inv.total) || 0,
      credit: 0,
      amount: Number(inv.total) || 0,
    })
  }
  for (const p of pays) {
    const inv =
      invs.find((i) => String(i.id) === String(p.invoiceId)) ||
      invoices.find((i) => String(i.id) === String(p.invoiceId))
    lines.push({
      type: 'payment',
      id: p.id,
      date: String(p.date || p.createdAt || '').slice(0, 10),
      ref: p.reference || p.method || 'Payment',
      description:
        'Payment' +
        (p.method ? ' · ' + p.method : '') +
        (inv?.number ? ' · ' + inv.number : '') +
        (p.unapplied ? ' · credit' : ''),
      status: p.unapplied ? 'unapplied' : 'paid',
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

  const outstanding = clientOutstanding(cid, invs, pays)
  return { lines, outstanding, running: Math.round(running * 100) / 100 }
}

/** Convenience: list unapplied credits for a client. */
export function unappliedCreditsForClient(clientId, payments = []) {
  const cid = String(clientId)
  return (payments || []).filter((p) => p.unapplied && String(p.clientId) === cid)
}
