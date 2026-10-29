import test from 'node:test'
import assert from 'node:assert/strict'
import { validatePaymentAmount, applyPaidToInvoice } from '../src/lib/payments.js'

test('accepts a payment equal to the remaining balance', () => {
  const invoice = { id: 'i1', total: 100, amountDue: 40, amountPaid: 60 }
  const result = validatePaymentAmount(invoice, 40)
  assert.equal(result.amount, 40)
  assert.equal(result.due, 40)
})

test('uses linked payment rows as the balance source when supplied', () => {
  const invoice = { id: 'i1', total: 100, amountDue: 100, amountPaid: 0 }
  const payments = [{ id: 'p1', invoiceId: 'i1', amount: 65 }]
  assert.equal(validatePaymentAmount(invoice, 35, payments).due, 35)
  assert.throws(() => validatePaymentAmount(invoice, 36, payments), /exceeds the remaining invoice balance/)
})

test('rejects overpayments before payment writes', () => {
  const invoice = { id: 'i1', total: 100, amountDue: 25, amountPaid: 75 }
  assert.throws(() => validatePaymentAmount(invoice, 25.01), /exceeds the remaining invoice balance/)
})

test('rejects invalid and zero payment amounts', () => {
  const invoice = { id: 'i1', total: 100, amountDue: 100 }
  assert.throws(() => validatePaymentAmount(invoice, 0), /Amount required/)
  assert.throws(() => validatePaymentAmount(invoice, NaN), /Amount required/)
})

test('partial payment preserves the outstanding balance and status', () => {
  const invoice = { id: 'i1', total: 100, status: 'unpaid' }
  const next = applyPaidToInvoice(invoice, 30)
  assert.equal(next.amountPaid, 30)
  assert.equal(next.amountDue, 70)
  assert.equal(next.status, 'partial')
})
