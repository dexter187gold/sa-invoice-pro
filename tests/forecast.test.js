import test from 'node:test'
import assert from 'node:assert/strict'
import { cashForecast } from '../src/lib/forecast.js'

test('an invoice due today is not overdue later in the day', () => {
  const now = new Date(2026, 9, 26, 16, 0, 0).getTime()
  const result = cashForecast([
    { id: 'today', status: 'unpaid', total: 125, dueDate: '2026-10-26' },
  ], now)

  assert.equal(result.overdue, 0)
  assert.equal(result.d30, 125)
  assert.equal(result.total, 125)
})

test('an invoice due before today is counted as overdue for the full day', () => {
  const now = new Date(2026, 9, 26, 9, 0, 0).getTime()
  const result = cashForecast([
    { id: 'late', status: 'unpaid', total: 200, dueDate: '2026-10-25' },
  ], now)

  assert.equal(result.overdue, 200)
  assert.equal(result.d30, 200)
  assert.equal(result.count, 1)
})

test('uses remaining balance and excludes paid invoices and credit notes', () => {
  const now = new Date(2026, 9, 26, 9, 0, 0).getTime()
  const result = cashForecast([
    { id: 'partial', status: 'partial', total: 100, amountDue: 25, dueDate: '2026-11-01' },
    { id: 'paid', status: 'paid', total: 500, dueDate: '2026-11-01' },
    { id: 'credit', status: 'unpaid', isCredit: true, total: 75, dueDate: '2026-11-01' },
  ], now)

  assert.equal(result.total, 25)
  assert.equal(result.count, 1)
  assert.equal(result.overdue, 0)
  assert.equal(result.d30, 25)
})
