import test from 'node:test'
import assert from 'node:assert/strict'
import { partitionPushQueue } from '../src/lib/workspaceSync.js'

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
