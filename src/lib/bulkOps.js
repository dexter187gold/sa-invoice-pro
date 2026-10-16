/** Bulk and multi-select helpers — Q4 user control */
import * as db from './db'
import { STORES } from './db'

export async function bulkUpdateStatus(storeName, ids, status, list) {
  let n = 0
  for (const id of ids) {
    const row = (list || []).find((r) => String(r.id) === String(id))
    if (!row) continue
    await db.put(storeName, { ...row, status, updatedAt: new Date().toISOString() })
    n++
  }
  return n
}

export async function bulkDelete(storeName, ids) {
  let n = 0
  for (const id of ids) {
    await db.remove(storeName, id)
    n++
  }
  return n
}

export function selectionStats(selectedMap) {
  const ids = Object.keys(selectedMap || {}).filter((k) => selectedMap[k])
  return { ids, count: ids.length }
}

export function toggleSelection(selected, id, checked) {
  const next = { ...selected }
  if (checked) next[id] = true
  else delete next[id]
  return next
}

export function selectAllVisible(selected, rows, on) {
  const next = { ...selected }
  for (const r of rows || []) {
    if (on) next[r.id] = true
    else delete next[r.id]
  }
  return next
}

export { STORES }
