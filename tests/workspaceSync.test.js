import test from 'node:test'
import assert from 'node:assert/strict'
import { partitionPushQueue, mergeWorkspaces } from '../src/lib/workspaceSync.js'
import { isSameSyncIdentity } from '../src/lib/sync.js'

test('only flushes queued writes owned by the currently signed-in account', () => {
  const queue = [
    { ownerKey: 'id:account-a', data: { invoices: [{ id: 'A' }] } },
    { ownerKey: 'id:account-b', data: { invoices: [{ id: 'B' }] } },
  ]
  const { ready, deferred } = partitionPushQueue(queue, 'id:account-b')
  assert.equal(ready.length, 1)
  assert.equal(ready[0].data.invoices[0].id, 'B')
  assert.equal(deferred.length, 1)
  assert.equal(deferred[0].ownerKey, 'id:account-a')
})

test('legacy unscoped queue entries are quarantined rather than replayed', () => {
  const legacy = { at: '2026-11-01T00:00:00.000Z', data: { invoices: [{ id: 'legacy' }] } }
  const { ready, deferred } = partitionPushQueue([legacy], 'id:account-a')
  assert.equal(ready.length, 0)
  assert.deepEqual(deferred, [legacy])
})

test('missing active identity cannot release any queued account data', () => {
  const queue = [{ ownerKey: 'id:account-a', data: { clients: [{ id: 'private-a' }] } }]
  const { ready, deferred } = partitionPushQueue(queue, null)
  assert.equal(ready.length, 0)
  assert.deepEqual(deferred, queue)
})

test('scheduled sync cannot run after the cloud identity token changes', () => {
  assert.equal(isSameSyncIdentity('token-account-a', 'token-account-a'), true)
  assert.equal(isSameSyncIdentity('token-account-a', 'token-account-b'), false)
  assert.equal(isSameSyncIdentity('token-account-a', null), false)
  assert.equal(isSameSyncIdentity(null, 'token-account-b'), false)
})

test('cloud VAT preferences restore when a new device has no saved local VAT choice', () => {
  const merged = mergeWorkspaces({ settings: {} }, { settings: { vatEnabled: true, vatRate: 0.15 } })
  assert.equal(merged.settings.vatEnabled, true)
  assert.equal(merged.settings.vatRate, 0.15)
})

test('an explicitly saved local VAT-off choice remains authoritative during sync merge', () => {
  const merged = mergeWorkspaces({ settings: { vatEnabled: false, vatRate: 0.15 } }, { settings: { vatEnabled: true, vatRate: 0.15 } })
  assert.equal(merged.settings.vatEnabled, false)
})
