/**
 * Local rolling auto-backups in IndexedDB — recovery without downloading JSON.
 */
import * as db from './db.js'

const META_KEY = 'saip_auto_backup_meta'
const MAX_SNAPS = 5
const THROTTLE_MS = 60_000

function loadMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || '{}') || {}
  } catch {
    return {}
  }
}

function saveMeta(m) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m))
  } catch {}
}

export function getAutoBackupMeta() {
  return loadMeta()
}

async function exportSnapshot(label, reason) {
  const data = await db.exportAll()
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    label: label || 'Auto',
    reason: reason || 'auto',
    counts: {
      clients: (data.clients || []).length,
      invoices: (data.invoices || []).length,
      tickets: (data.tickets || []).length,
      quotes: (data.quotes || []).length,
    },
    data,
  }
}

export async function saveAutoBackup({ reason = 'manual', label = 'Snapshot' } = {}) {
  const snap = await exportSnapshot(label, reason)
  if (!db.STORES?.autoBackups) throw new Error('Recovery snapshot storage is unavailable. Refresh the app to complete the storage upgrade.')
  await db.add(db.STORES.autoBackups, snap)
  const all = (await db.getAll(db.STORES.autoBackups)) || []
  all.sort((a, b) => String(b.at || b.createdAt).localeCompare(String(a.at || a.createdAt)))
  for (const old of all.slice(MAX_SNAPS)) {
    try { await db.remove(db.STORES.autoBackups, old.id) } catch {}
  }
  saveMeta({ lastAt: snap.at, lastReason: reason, lastCounts: snap.counts })
  return snap
}

export async function saveAutoBackupThrottled(opts = {}) {
  const meta = loadMeta()
  const last = meta.lastAt ? Date.parse(meta.lastAt) : 0
  if (last && Date.now() - last < THROTTLE_MS) return null
  return saveAutoBackup(opts)
}

export async function listAutoBackups() {
  let current = []
  try {
    if (db.STORES?.autoBackups) current = (await db.getAll(db.STORES.autoBackups)) || []
  } catch (error) {
    console.warn('[autoBackup] snapshot listing failed', error)
  }
  // Include legacy settings-based snapshots until the rolling window expires.
  const legacy = (await db.getSetting('autoBackups', [])) || []
  const unique = new Map()
  for (const snap of [...current, ...legacy]) if (snap?.id && snap?.data) unique.set(snap.id, snap)
  return [...unique.values()]
    .sort((a, b) => String(b.at || b.createdAt).localeCompare(String(a.at || a.createdAt)))
    .slice(0, MAX_SNAPS)
}

export async function getAutoBackup(id) {
  const list = await listAutoBackups()
  return list.find((s) => s.id === id) || null
}

export async function restoreAutoBackup(id, { confirmed = false } = {}) {
  if (confirmed !== true) throw new Error('Restore requires explicit confirmation')
  const snap = await getAutoBackup(id)
  if (!snap?.data) throw new Error('Snapshot not found')

  // Capture the current workspace first. replaceAllAtomic commits all store
  // changes together, so a failed restore leaves the live workspace unchanged.
  const rollbackSnapshot = await saveAutoBackup({
    reason: 'pre-restore-rollback',
    label: 'Automatic rollback before restore',
  })
  const stats = await db.replaceAllAtomic(snap.data)
  return { snapshot: snap, rollbackSnapshot, stats }
}

/** Download a snapshot as a JSON file the user can keep offline / email. */
export async function downloadAutoBackup(id) {
  const list = await listAutoBackups()
  const row = id ? list.find((s) => s.id === id) : list[0]
  if (!row?.data) throw new Error('No auto-backup to download')
  const blob = new Blob([JSON.stringify(row.data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sa-invoice-autobackup-${(row.at || row.createdAt || '').slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return row
}
