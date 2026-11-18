/** Soft-delete helpers for list pages */
import { softDelete } from './recycleBin.js'

export async function softBulkDelete(store, ids) {
  const result = { ok: 0, failed: 0, errors: [] }
  for (const id of ids || []) {
    try {
      await softDelete(store, id)
      result.ok++
    } catch (e) {
      result.failed++
      result.errors.push(String(e?.message || e))
    }
  }
  return result
}
