import test from 'node:test'
import assert from 'node:assert/strict'
import { workspaceStoreNames, streamWorkspaceRecords } from '../src/lib/streamBackupImport.js'

test('workspaceStoreNames excludes protected stores', () => {
  const names = workspaceStoreNames({
    clients: 'clients',
    invoices: 'invoices',
    users: 'users',
    autoBackups: 'autoBackups',
    accountWorkspaces: 'accountWorkspaces',
    importStaging: 'importStaging',
  })
  assert.ok(names.includes('clients'))
  assert.ok(names.includes('invoices'))
  assert.ok(!names.includes('users'))
  assert.ok(!names.includes('autoBackups'))
})

test('streamWorkspaceRecords emits client rows from a small JSON object', async () => {
  const json = JSON.stringify({
    clients: [{ id: 'c1', name: 'Ada' }, { id: 'c2', name: 'Bob' }],
    invoices: [{ id: 'i1', number: 'INV-1', total: 100 }],
  })
  async function* chunks() {
    yield json.slice(0, 20)
    yield json.slice(20)
  }
  const got = []
  const result = await streamWorkspaceRecords(chunks(), {
    storeNames: ['clients', 'invoices'],
    onRecord: (store, row) => { got.push([store, row.id]) },
  })
  assert.equal(result.rows, 3)
  assert.deepEqual(got, [
    ['clients', 'c1'],
    ['clients', 'c2'],
    ['invoices', 'i1'],
  ])
})
