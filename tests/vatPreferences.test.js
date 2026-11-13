import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeVatEnabled, normalizeVatRate } from '../src/lib/vatPreferences.js'
import { invoiceTotals } from '../src/lib/money.js'

test('VAT preference normalization preserves off and zero-rate choices', () => {
  assert.equal(normalizeVatEnabled(false), false)
  assert.equal(normalizeVatEnabled('0'), false)
  assert.equal(normalizeVatEnabled(true), true)
  assert.equal(normalizeVatRate(0), 0)
  assert.equal(normalizeVatRate(0.15), 0.15)
  assert.equal(normalizeVatRate(15), 0.15)
})

test('invoice totals respect VAT disabled, standard and zero-rated modes', () => {
  const lines = [{ qty: 2, price: 100 }]
  assert.deepEqual(invoiceTotals(lines), { exclusive: 200, vat: 0, total: 200 })
  assert.deepEqual(invoiceTotals(lines, 0.15, false), { exclusive: 200, vat: 0, total: 200 })
  assert.deepEqual(invoiceTotals(lines, 0.15, true), { exclusive: 200, vat: 30, total: 230 })
  assert.deepEqual(invoiceTotals(lines, 0, true), { exclusive: 200, vat: 0, total: 200 })
})
