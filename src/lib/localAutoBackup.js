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
  try {
    if (db.STORES?.autoBackups) {
      await db.add(db.STORES.autoBackups, snap)
      const all = (await db.getAll(db.STORES.autoBackups)) || []
      all.sort((a, b) => String(b.at || b.createdAt).localeCompare(String(a.at || a.createdAt)))
      for (const old of all.slice(MAX_SNAPS)) {
        try {
          await db.remove(db.STORES.autoBackups, old.id)
        } catch {}
      }
    } else {
      const list = (await db.getSetting('autoBackups', [])) || []
      const next = [snap, ...list].slice(0, MAX_SNAPS)
      await db.setSetting('autoBackups', next)
    }
  } catch (e) {
    console.warn('[autoBackup]', e)
    const list = (await db.getSetting('autoBackups', [])) || []
    await db.setSetting('autoBackups', [snap, ...list].slice(0, MAX_SNAPS))
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
  try {
    if (db.STORES?.autoBackups) {
      const all = (await db.getAll(db.STORES.autoBackups)) || []
      return all.sort((a, b) => String(b.at || b.createdAt).localeCompare(String(a.at || a.createdAt))).slice(0, MAX_SNAPS)
    }
  } catch {}
  const list = (await db.getSetting('autoBackups', [])) || []
  return list.slice(0, MAX_SNAPS)
}

export async function getAutoBackup(id) {
  const list = await listAutoBackups()
  return list.find((s) => s.id === id) || null
}

export async function restoreAutoBackup(id) {
  const list = await listAutoBackups()
  const snap = id ? list.find((s) => s.id === id) : list[0]
  if (!snap?.data) throw new Error('Snapshot not found')
  await db.importAll(snap.data, { wipe: false })
  return snap
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
