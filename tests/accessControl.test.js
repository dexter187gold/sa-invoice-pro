import test from 'node:test'
import assert from 'node:assert/strict'
import { canAccessPath } from '../src/lib/accessControl.js'

const trial = { licensed: false, trialDaysLeft: 14 }
const expiredTrial = { licensed: false, trialDaysLeft: 0 }
const solo = { licensed: true, meta: { plan: 'solo' } }
const shop = { licensed: true, meta: { plan: 'shop' } }

test('trial permits only clients, invoices and quotes (plus licence checkout)', () => {
  for (const path of ['/clients', '/invoices', '/invoices/new', '/invoices/123', '/quotes', '/license']) {
    assert.equal(canAccessPath(path, trial), true, path)
  }
  for (const path of ['/', '/dashboard', '/tickets', '/products', '/payments', '/settings', '/support', '/about', '/inbox', '/documents', '/wa-chase', '/wa-templates', '/expenses', '/accounting']) {
    assert.equal(canAccessPath(path, trial), false, path)
  }
})

test('expired trial cannot access trial workflow modules', () => {
  for (const path of ['/clients', '/invoices', '/quotes']) {
    assert.equal(canAccessPath(path, expiredTrial), false, path)
  }
})

test('Solo excludes WhatsApp automation and templates', () => {
  assert.equal(canAccessPath('/wa-chase', solo), false)
  assert.equal(canAccessPath('/wa-templates', solo), false)
  assert.equal(canAccessPath('/clients', solo), true)
  assert.equal(canAccessPath('/invoices', solo), true)
  assert.equal(canAccessPath('/quotes', solo), true)
})

test('Shop retains WhatsApp features', () => {
  assert.equal(canAccessPath('/wa-chase', shop), true)
  assert.equal(canAccessPath('/wa-templates', shop), true)
})
