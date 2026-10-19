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
  const store = 'auto_backups'
  try {
    // Prefer dedicated store if present; fall back to settings blob
    if (db.STORES?.autoBackups) {
      await db.add(db.STORES.autoBackups, snap)
      const all = (await db.getAll(db.STORES.autoBackups)) || []
      all.sort((a, b) => String(b.at).localeCompare(String(a.at)))
      for (const old of all.slice(MAX_SNAPS)) {
        try {
          await db.del(db.STORES.autoBackups, old.id)
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
      return all.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, MAX_SNAPS)
    }
  } catch {}
  const list = (await db.getSetting('autoBackups', [])) || []
  return list.slice(0, MAX_SNAPS)
}

export async function restoreAutoBackup(id) {
  const list = await listAutoBackups()
  const snap = list.find((s) => s.id === id)
  if (!snap?.data) throw new Error('Snapshot not found')
  await db.importAll(snap.data, { wipe: false })
  return snap
}
