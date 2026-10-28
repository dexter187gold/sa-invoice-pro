import test from 'node:test'
import assert from 'node:assert/strict'
import { processProudlySaPayrollRun, toCents } from '../src/lib/saTaxEngine.js'

test('cash gross includes the full travel allowance while PAYE taxable remuneration uses 80%', () => {
  const result = processProudlySaPayrollRun({
    baseSalaryCents: toCents(10000),
    transportAllowanceCents: toCents(1000),
    otherTaxableCents: 0,
    uifApplicable: true,
    age: 30,
  })
  assert.equal(result.grossR, 11000)
  assert.equal(result.taxableR, 10800)
  assert.equal(result.monthlyTaxableCents, toCents(10800))
  assert.equal(result.netR, 11000 - result.payeR - result.uifR)
})

test('cash gross and net pay remain non-negative for zero earnings', () => {
  const result = processProudlySaPayrollRun({ baseSalaryCents: 0, transportAllowanceCents: 0, otherTaxableCents: 0 })
  assert.equal(result.grossR, 0)
  assert.equal(result.taxableR, 0)
  assert.equal(result.netR, 0)
})
