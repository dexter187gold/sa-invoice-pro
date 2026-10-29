import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeFinancialIntegrity } from '../src/lib/financialIntegrity.js'

test('flags paid invoices with incomplete payment evidence without changing source records', () => {
  const invoice = { id: 'i1', total: 100, amountDue: 100, amountPaid: 0, status: 'paid' }
  const before = structuredClone(invoice)
  const result = analyzeFinancialIntegrity({ invoices: [invoice], payments: [], bankTxns: [], journal: [] })
  assert.equal(result.readOnly, true)
  assert.equal(result.counts.high, 1)
  assert.equal(result.findings[0].code, 'paid_invoice_balance_mismatch')
  assert.deepEqual(invoice, before)
})

test('flags missing invoice links and duplicate journal sources', () => {
  const result = analyzeFinancialIntegrity({
    invoices: [],
    payments: [{ id: 'p1', invoiceId: 'missing', amount: 50 }],
    bankTxns: [],
    journal: [{ id: 'j1', sourceKey: 'pay-p1' }, { id: 'j2', sourceKey: 'pay-p1' }],
  })
  assert.ok(result.findings.some((f) => f.code === 'payment_missing_invoice'))
  assert.ok(result.findings.some((f) => f.code === 'duplicate_journal_source'))
})

test('flags duplicate bank fingerprints but does not delete either row', () => {
  const rows = [
    { id: 'b1', date: '2026-10-01', amount: 100, description: 'ACME', reference: 'R1' },
    { id: 'b2', date: '2026-10-01', amount: 100, description: 'acme', reference: 'r1' },
  ]
  const result = analyzeFinancialIntegrity({ bankTxns: rows })
  assert.ok(result.findings.some((f) => f.code === 'duplicate_bank_fingerprint'))
  assert.equal(rows.length, 2)
})
