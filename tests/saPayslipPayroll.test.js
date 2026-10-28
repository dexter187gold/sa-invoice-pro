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

test('UIF employee and employer contributions respect the monthly ceiling', () => {
  const result = processProudlySaPayrollRun({
    baseSalaryCents: toCents(50000),
    uifApplicable: true,
    age: 40,
  })
  assert.equal(result.uifEmployeeCents, toCents(17712 * 0.01))
  assert.equal(result.uifEmployerCents, result.uifEmployeeCents)
})

test('negative input values are clamped to zero rather than creating negative earnings', () => {
  const result = processProudlySaPayrollRun({
    baseSalaryCents: -100000,
    transportAllowanceCents: -10000,
    otherTaxableCents: -5000,
  })
  assert.equal(result.grossR, 0)
  assert.equal(result.taxableR, 0)
  assert.equal(result.uifR, 0)
  assert.equal(result.netR, 0)
})

test('older employee rebates never increase PAYE for identical taxable remuneration', () => {
  const base = { baseSalaryCents: toCents(20000), uifApplicable: false }
  const under65 = processProudlySaPayrollRun({ ...base, age: 40 })
  const age65 = processProudlySaPayrollRun({ ...base, age: 65 })
  const age75 = processProudlySaPayrollRun({ ...base, age: 75 })
  assert.ok(age65.payeR <= under65.payeR)
  assert.ok(age75.payeR <= age65.payeR)
})
