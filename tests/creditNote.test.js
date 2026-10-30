import test from 'node:test'
import assert from 'node:assert/strict'
import {
  remainingBalance,
  canIssueCreditNote,
  buildCreditNote,
  applyCreditToInvoice,
  maxCreditAmount,
  partialPaymentClarity,
} from '../src/lib/creditNote.js'

test('remainingBalance accounts for credits', () => {
  const inv = { total: 1000, amountPaid: 200, amountCredited: 100 }
  assert.equal(remainingBalance(inv), 700)
})

test('buildCreditNote partial amount', () => {
  const inv = { id: 'i1', number: 'INV-1', total: 500, amountPaid: 0, status: 'unpaid', clientId: 'c1' }
  const cn = buildCreditNote(inv, { amount: 150, reason: 'Discount' })
  assert.equal(cn.amount, 150)
  assert.equal(cn.invoiceId, 'i1')
  const next = applyCreditToInvoice(inv, cn)
  assert.equal(next.amountCredited, 150)
  assert.equal(next.amountDue, 350)
  assert.equal(next.status, 'partial')
})

test('cannot credit void invoice', () => {
  assert.equal(canIssueCreditNote({ id: 'x', status: 'void', total: 10 }), false)
})

test('partialPaymentClarity labels', () => {
  const inv = { total: 100, amountPaid: 0, amountCredited: 0 }
  const c = partialPaymentClarity(inv, 40)
  assert.equal(c.balanceAfter, 60)
  assert.ok(/still be due/i.test(c.label))
})

test('maxCreditAmount uses paid when balance zero', () => {
  const inv = { total: 100, amountPaid: 100, amountCredited: 0, status: 'paid' }
  assert.equal(maxCreditAmount(inv), 100)
  assert.equal(canIssueCreditNote({ ...inv, id: 'i' }), true)
})
