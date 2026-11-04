import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isOpenInvoice,
  daysPastDue,
  buildChaseMessage,
  buildChaseList,
  buildCollectionChaseList,
} from '../src/lib/chasePack.js'

test('isOpenInvoice recognises unpaid states', () => {
  assert.equal(isOpenInvoice({ status: 'unpaid' }), true)
  assert.equal(isOpenInvoice({ status: 'partial' }), true)
  assert.equal(isOpenInvoice({ status: 'overdue' }), true)
  assert.equal(isOpenInvoice({ status: 'paid' }), false)
})

test('daysPastDue returns 0 without due date', () => {
  assert.equal(daysPastDue({}), 0)
})

test('buildChaseMessage includes balance and optional portal line', () => {
  const msg = buildChaseMessage(
    { number: 'INV-9', amountDue: 500, dueDate: '2020-01-01' },
    { name: 'Thabo' },
    { name: 'Bench Co' },
    { portalUrl: 'https://portal.example/pay' },
  )
  assert.match(msg, /Thabo/)
  assert.match(msg, /INV-9/)
  assert.match(msg, /Bench Co/)
  assert.match(msg, /portal\.example\/pay/)
})

test('buildChaseList sorts oldest first and flags phone', () => {
  const invoices = [
    { id: 'a', status: 'unpaid', number: 'INV-1', clientId: 'c1', amountDue: 100, dueDate: '2026-10-01' },
    { id: 'b', status: 'overdue', number: 'INV-2', clientId: 'c2', amountDue: 200, dueDate: '2026-09-01' },
    { id: 'c', status: 'paid', number: 'INV-3', clientId: 'c1', amountDue: 0 },
  ]
  const clients = [
    { id: 'c1', name: 'Acme', phone: '0821234567' },
    { id: 'c2', name: 'Beta', phone: '' },
  ]
  const list = buildChaseList(invoices, clients, { name: 'Shop' }, { portalUrl: 'https://p.test' })
  assert.equal(list.length, 2)
  assert.equal(list[0].id, 'b') // older first
  assert.equal(list[1].hasPhone, true)
  assert.equal(list[0].hasPhone, false)
  assert.match(list[1].message, /p\.test/)
})

test('buildCollectionChaseList maps ready jobs', () => {
  const tickets = [
    { id: 't1', status: 'resolved', title: 'Screen fix', clientId: 'c1', number: 'JOB-1' },
    { id: 't2', status: 'closed', title: 'Done', clientId: 'c1' },
  ]
  const clients = [{ id: 'c1', name: 'Acme', phone: '0820000000' }]
  const list = buildCollectionChaseList(tickets, clients, { name: 'Shop' })
  assert.equal(list.length, 1)
  assert.equal(list[0].kind, 'job')
  assert.match(list[0].message, /ready for collection/i)
})
