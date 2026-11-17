/**
 * Soft-delete recycle bin — rows move here before permanent purge.
 */
import * as db from './db.js'
import { STORES } from './db.js'

const BIN = 'recycleBin'
const MAX = 200

export async function softDelete(store, id, meta = {}) {
  const row = await db.get(store, id)
  if (!row) throw new Error('Record not found')
  const entry = {
    id: `bin-${store}-${id}-${Date.now()}`,
    store,
    originalId: id,
    payload: row,
    deletedAt: new Date().toISOString(),
    ...meta,
  }
  try {
    await db.put(STORES.recycleBin || BIN, entry)
  } catch {
    const list = (await db.getSetting('recycleBinList', [])) || []
    list.unshift(entry)
    await db.setSetting('recycleBinList', list.slice(0, MAX))
  }
  await db.remove(store, id)
  return entry
}

export async function listRecycleBin() {
  try {
    if (STORES.recycleBin) {
      const rows = await db.getAll(STORES.recycleBin)
      if (Array.isArray(rows) && rows.length) {
        return rows.sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)))
      }
    }
  } catch {}
  return (await db.getSetting('recycleBinList', [])) || []
}

export async function restoreFromBin(entryId) {
  const list = await listRecycleBin()
  const entry = list.find((e) => String(e.id) === String(entryId))
  if (!entry?.payload) throw new Error('Bin entry not found')
  await db.put(entry.store, entry.payload)
  await removeBinEntry(entryId)
  return entry.payload
}

async function removeBinEntry(entryId) {
  try {
    if (STORES.recycleBin) await db.remove(STORES.recycleBin, entryId)
  } catch {}
  const list = ((await db.getSetting('recycleBinList', [])) || []).filter((e) => String(e.id) !== String(entryId))
  await db.setSetting('recycleBinList', list)
}

export async function purgeBinEntry(entryId) {
  await removeBinEntry(entryId)
}

export async function emptyRecycleBin() {
  const list = await listRecycleBin()
  for (const e of list) await removeBinEntry(e.id)
  return list.length
}
