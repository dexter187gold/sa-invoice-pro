import test from 'node:test'
import assert from 'node:assert/strict'
import { seatLimits, verifySeatPin, activeSeatSummary } from '../src/lib/seats.js'
import { can, roleById } from '../src/lib/roles.js'
import { softAccent, loadWhiteLabel, WHITE_LABEL_DEFAULTS } from '../src/lib/whiteLabel.js'

test('seatLimits maps shop to 5 users', () => {
  const lim = seatLimits({}, { tier: 'shop' })
  assert.equal(lim.tier, 'shop')
  assert.equal(lim.users, 5)
})

test('seatLimits multi is 25 users', () => {
  const lim = seatLimits({}, { tier: 'multi' })
  assert.equal(lim.users, 25)
})

test('verifySeatPin empty pin always ok', () => {
  assert.equal(verifySeatPin({ pin: '' }, ''), true)
  assert.equal(verifySeatPin({ pin: '1234' }, '1234'), true)
  assert.equal(verifySeatPin({ pin: '1234' }, '0000'), false)
})

test('activeSeatSummary defaults', () => {
  const s = activeSeatSummary(null)
  assert.equal(s.role, 'owner')
})

test('tech cannot open settings perm', () => {
  assert.equal(can('tech', 'settings'), false)
  assert.equal(can('owner', 'settings'), true)
  assert.equal(roleById('accountant').id, 'accountant')
})

test('softAccent returns color-mix for hex', () => {
  const s = softAccent('#0ea5e9')
  assert.ok(s.includes('color-mix'))
})

test('loadWhiteLabel has defaults shape', () => {
  const w = loadWhiteLabel()
  assert.ok('brandName' in w)
  assert.equal(typeof WHITE_LABEL_DEFAULTS.hidePoweredBy, 'boolean')
})
