/**
 * Local rolling auto-backups in IndexedDB — recovery without downloading JSON.
 * Snapshots are built store-by-store to avoid one giant exportAll() allocation.
 * Large payloads (>~1.5MB JSON) offload to OPFS when available (roadmap A1).
 */
import * as db from './db.js'
import { opfsAvailable, writeOpfsPayload, readOpfsPayload, removeOpfsPayload } from './opfsRecovery.js'

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

/** Keys that belong in a workspace recovery snapshot (not account/licence/staging). */
function snapshotStoreKeys() {
  return Object.keys(db.STORES || {}).filter(
    (key) => !['users', 'autoBackups', 'accountWorkspaces', 'importStaging'].includes(key),
  )
}

/**
 * Build a workspace snapshot one store at a time.
 * Avoids db.exportAll() which materialises every store in one object graph.
 */
async function exportSnapshotChunked(label, reason) {
  const data = {
    exportedAt: new Date().toISOString(),
    app: 'SA Invoice Pro Lab',
    format: 'sa-invoice-pro-workspace-v2',
  }
  const counts = { clients: 0, invoices: 0, tickets: 0, quotes: 0 }
  for (const key of snapshotStoreKeys()) {
    let rows = []
    try {
      rows = (await db.getAll(db.STORES[key])) || []
    } catch (error) {
      console.warn('[autoBackup] store read failed', key, error)
      rows = []
    }
    data[key] = rows
    if (key in counts) counts[key] = rows.length
    rows = null
  }
  return {
    id: crypto.randomUUID?.() || `snap_${Date.now()}`,
    at: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    label: label || 'Auto',
    reason: reason || 'auto',
    counts,
    data,
  }
}

export async function saveAutoBackup({ reason = 'manual', label = 'Snapshot' } = {}) {
  if (!db.STORES?.autoBackups) {
    throw new Error('Recovery snapshot storage is unavailable. Refresh the app to complete the storage upgrade.')
  }
  const snap = await exportSnapshotChunked(label, reason)
  // Roadmap A1: large snapshots keep metadata in IDB and payload in OPFS
  try {
    const rough = JSON.stringify(snap.data || {}).length
    if (rough > 1_500_000 && (await opfsAvailable())) {
      const ref = await writeOpfsPayload(snap.id, snap.data)
      if (ref?.opfs) {
        snap.opfsPath = ref.path
        snap.data = { __opfs: true, path: ref.path, exportedAt: snap.data?.exportedAt }
        snap.counts = snap.counts || {}
        snap.counts.opfsBytesApprox = rough
      }
    }
  } catch (error) {
    console.warn('[autoBackup] OPFS offload skipped', error)
  }
  await db.add(db.STORES.autoBackups, snap)
  const all = (await db.getAll(db.STORES.autoBackups)) || []
  all.sort((a, b) => String(b.at || b.createdAt).localeCompare(String(a.at || a.createdAt)))
  for (const old of all.slice(MAX_SNAPS)) {
    try {
      if (old.opfsPath || old.data?.__opfs) await removeOpfsPayload(old.opfsPath || old.data?.path)
      await db.remove(db.STORES.autoBackups, old.id)
    } catch {}
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
  if (!snap) throw new Error('Snapshot not found')
  let payload = snap.data
  if (payload?.__opfs && (payload.path || snap.opfsPath)) {
    payload = await readOpfsPayload(payload.path || snap.opfsPath)
    if (!payload) throw new Error('OPFS recovery payload missing — restore from a downloaded JSON backup instead')
  }
  if (!payload) throw new Error('Snapshot not found')

  const rollbackSnapshot = await saveAutoBackup({
    reason: 'pre-restore-rollback',
    label: 'Automatic rollback before restore',
  })
  const stats = await db.replaceAllAtomic(payload)
  return { snapshot: snap, rollbackSnapshot, stats }
}

/** Download a snapshot as a JSON file the user can keep offline / email. */
export async function downloadAutoBackup(id) {
  const list = await listAutoBackups()
  const row = id ? list.find((s) => s.id === id) : list[0]
  if (!row?.data) throw new Error('No auto-backup to download')
  let payload = row.data
  if (payload?.__opfs && (payload.path || row.opfsPath)) {
    payload = await readOpfsPayload(payload.path || row.opfsPath)
  }
  if (!payload) throw new Error('No auto-backup payload to download')
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sa-invoice-autobackup-${(row.at || row.createdAt || '').slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return row
}
