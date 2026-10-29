import test from 'node:test'
import assert from 'node:assert/strict'
import { parseBankCsv, normalizeBankRows, explainMatchScore, matchBankToInvoices } from '../src/lib/bankImport.js'

test('parseBankCsv detects comma and headers', () => {
  const csv = 'Date,Description,Amount,Reference\n2026-10-01,Payment INV-1,1500.00,INV-2026-0001\n'
  const { headers, rows } = parseBankCsv(csv)
  assert.ok(headers.some((h) => h.includes('date')))
  assert.equal(rows.length, 1)
})

test('normalizeBankRows builds credit txn', () => {
  const { headers, rows } = parseBankCsv(
    'Date,Description,Amount,Reference\n2026-10-01,ACME INV-9,250.00,REF1\n',
  )
  const txns = normalizeBankRows({ headers, rows })
  assert.equal(txns.length, 1)
  assert.equal(txns[0].isCredit, true)
  assert.equal(txns[0].amount, 250)
})

test('normalizeBankRows handles SA decimal comma amount', () => {
  const { headers, rows } = parseBankCsv(
    'Date;Description;Amount\n01/10/2026;Payment;1.250,50\n',
  )
  const txns = normalizeBankRows({ headers, rows })
  assert.equal(txns.length, 1)
  assert.ok(Math.abs(txns[0].amount - 1250.5) < 0.01)
})

test('explainMatchScore rewards exact amount + number', () => {
  const txn = { isCredit: true, amount: 100, description: 'paid INV-2026-0001', reference: '', date: '2026-10-05' }
  const inv = { number: 'INV-2026-0001', amountDue: 100, total: 100, date: '2026-10-01' }
  const { score, reasons } = explainMatchScore(txn, inv, { name: 'Acme' })
  assert.ok(score >= 70)
  assert.ok(reasons.some((r) => /amount/i.test(r)))
})

test('explainMatchScore adds date proximity', () => {
  const txn = { isCredit: true, amount: 100, description: 'EFT', reference: '', date: '2026-10-03' }
  const inv = { number: 'X', amountDue: 100, total: 100, date: '2026-10-01', dueDate: '2026-10-15' }
  const { score, reasons } = explainMatchScore(txn, inv, null)
  assert.ok(score >= 50)
  assert.ok(reasons.some((r) => /days/i.test(r) || /week/i.test(r)))
})

test('matchBankToInvoices suggests high confidence', () => {
  const txns = [{ id: 't1', isCredit: true, amount: 500, description: 'INV-1 ACME', reference: '', date: '2026-10-01' }]
  const invoices = [{ id: 'i1', number: 'INV-1', status: 'unpaid', amountDue: 500, total: 500, clientId: 'c1', date: '2026-09-28' }]
  const clients = [{ id: 'c1', name: 'Acme Labs' }]
  const matches = matchBankToInvoices(txns, invoices, clients)
  assert.equal(matches.length, 1)
  assert.equal(matches[0].suggested, true)
  assert.ok(matches[0].score >= 40)
})


test('bank matching is read-only and does not change invoice status', () => {
  const invoice = { id: 'i-readonly', number: 'INV-READONLY', status: 'unpaid', amountDue: 125, total: 125, clientId: 'c1', date: '2026-10-01' }
  const before = structuredClone(invoice)
  const txns = [{ id: 't-readonly', isCredit: true, amount: 125, description: 'INV-READONLY ACME', reference: '', date: '2026-10-02' }]
  const result = matchBankToInvoices(txns, [invoice], [{ id: 'c1', name: 'Acme' }])
  assert.equal(result[0].invoice.id, 'i-readonly')
  assert.deepEqual(invoice, before)
  assert.equal(invoice.status, 'unpaid')
})

test('bank matching never suggests a debit as an invoice payment', () => {
  const invoice = { id: 'i-debit', number: 'INV-DEBIT', status: 'unpaid', amountDue: 125, total: 125, clientId: 'c1' }
  const txns = [{ id: 't-debit', isCredit: false, amount: -125, description: 'INV-DEBIT', reference: '', date: '2026-10-02' }]
  assert.deepEqual(matchBankToInvoices(txns, [invoice], [{ id: 'c1', name: 'Acme' }]), [])
})
