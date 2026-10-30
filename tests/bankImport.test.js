import test from 'node:test'
import assert from 'node:assert/strict'
import { parseBankCsv, normalizeBankRows, explainMatchScore, matchBankToInvoices, bankTxnFingerprint, findBankTxnForMatch, groupBankTxnsByDescription } from '../src/lib/bankImport.js'

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

test('normalizeBankRows reads separate Debit and Credit columns', () => {
  const { headers, rows } = parseBankCsv(
    'Date,Description,Debit,Credit,Reference\n2026-10-01,Client payment,,1500.00,INV-1\n2026-10-02,Engen fuel,450.00,,CARD\n',
  )
  const txns = normalizeBankRows({ headers, rows })
  assert.equal(txns.length, 2)
  const inn = txns.find((t) => t.amount > 0)
  const out = txns.find((t) => t.amount < 0)
  assert.ok(inn && inn.amount === 1500 && inn.direction === 'in')
  assert.ok(out && out.amount === -450 && out.direction === 'out')
})

test('groupBankTxnsByDescription clusters similar narratives', () => {
  const groups = groupBankTxnsByDescription([
    { amount: -50, description: 'ENGEN MIDRAND 1234', date: '2026-10-01' },
    { amount: -80, description: 'Engen Sandton POS', date: '2026-10-02' },
    { amount: 500, description: 'ACME payment INV-9', date: '2026-10-03' },
  ])
  assert.ok(groups.length >= 2)
  const fuel = groups.find((g) => /engen/i.test(g.label) || /engen/i.test(g.key))
  assert.ok(fuel && fuel.count === 2 && fuel.totalOut > 0)
})

test('explainMatchScore rewards exact amount + number', () => {
  const txn = { isCredit: true, amount: 100, description: 'paid INV-2026-0001', reference: '', date: '2026-10-05' }
  const inv = { number: 'INV-2026-0001', amountDue: 100, total: 100, date: '2026-10-01' }
  const { score, reasons } = explainMatchScore(txn, inv, { name: 'Acme' })
  assert.ok(score >= 70)
  assert.ok(reasons.some((r) => /amount/i.test(r)))
})

test('bank matching never suggests a debit as an invoice payment', () => {
  const invoice = { id: 'i-debit', number: 'INV-DEBIT', status: 'unpaid', amountDue: 125, total: 125, clientId: 'c1' }
  const txns = [{ id: 't-debit', isCredit: false, amount: -125, description: 'INV-DEBIT', reference: '', date: '2026-10-02' }]
  const result = matchBankToInvoices(txns, [invoice], [{ id: 'c1', name: 'Acme' }])
  assert.equal(result.length, 1)
  assert.equal(result[0].invoice, null)
  assert.equal(result[0].suggested, false)
})

test('bank matching reuses a previously imported but unmatched statement line', () => {
  const txn = { date: '2026-10-29', amount: 250, description: 'ACME INV-1', reference: 'REF-1' }
  const prior = { ...txn, id: 'bank-row-1', reconciled: false, bookkeepingStatus: 'needs-review' }
  const found = findBankTxnForMatch(txn, [prior])
  assert.equal(found.row.id, 'bank-row-1')
  assert.equal(found.alreadyApplied, false)
  assert.equal(bankTxnFingerprint(txn), bankTxnFingerprint(prior))
})

test('bank matching blocks a duplicate payment when the statement line was already applied', () => {
  const txn = { date: '2026-10-29', amount: 250, description: 'ACME INV-1', reference: 'REF-1' }
  const prior = { ...txn, id: 'bank-row-1', matchedInvoiceId: 'inv-1', paymentId: 'pay-1' }
  const found = findBankTxnForMatch(txn, [prior])
  assert.equal(found.row.id, 'bank-row-1')
  assert.equal(found.alreadyApplied, true)
})
