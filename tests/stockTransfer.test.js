import test from 'node:test'
import assert from 'node:assert/strict'
import { applyStockTransfer, stockAt, stockTotal, HQ_KEY } from '../src/lib/stockTransfer.js'

test('stockAt uses legacy stock as HQ', () => {
  assert.equal(stockAt({ stock: 10 }, ''), 10)
  assert.equal(stockAt({ stock: 10, branchStock: { [HQ_KEY]: 4 } }, ''), 4)
})

test('transfer moves qty between branches', () => {
  const p = { id: '1', stock: 10, name: 'SSD' }
  const next = applyStockTransfer(p, { fromBranchId: '', toBranchId: 'br_a', qty: 3, note: 'restock' })
  assert.equal(stockAt(next, ''), 7)
  assert.equal(stockAt(next, 'br_a'), 3)
  assert.equal(stockTotal(next), 10)
  assert.equal(next.stockTransfers.length, 1)
})

test('transfer rejects overdraw', () => {
  assert.throws(() => applyStockTransfer({ stock: 2 }, { fromBranchId: '', toBranchId: 'x', qty: 5 }), /Only 2/)
})

test('transfer rejects same branch', () => {
  assert.throws(() => applyStockTransfer({ stock: 5 }, { fromBranchId: 'a', toBranchId: 'a', qty: 1 }), /differ/)
})
