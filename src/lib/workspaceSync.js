/**
 * Guaranteed workspace sync — seed / restore / merge after login.
 */
import * as db from './db.js'
import { STORES } from './db.js'
import { Sync } from './sync.js'

const QUEUE_KEY = 'saip_sync_push_queue'
const LAST_KEY = 'saip_workspace_sync_meta'

function readQueue() {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    return Array.isArray(q) ? q : []
  } catch {
    return []
  }
}

function writeQueue(q) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-10)))
  } catch {}
}

function setMeta(patch) {
  try {
    const prev = JSON.parse(localStorage.getItem(LAST_KEY) || '{}')
    localStorage.setItem(LAST_KEY, JSON.stringify({ ...prev, ...patch, at: new Date().toISOString() }))
  } catch {}
}

export function getWorkspaceSyncMeta() {
  try {
    return JSON.parse(localStorage.getItem(LAST_KEY) || '{}')
  } catch {
    return {}
  }
}

function scoreWorkspace(data) {
  if (!data || typeof data !== 'object') return 0
  let n = 0
  for (const k of ['clients', 'invoices', 'quotes', 'tickets', 'payments', 'products', 'services', 'expenses']) {
    n += Array.isArray(data[k]) ? data[k].length : 0
  }
  if (data.company) n += 1
  return n
}

async function localSnapshot() {
  const company = await db.getCompany()
  const clients = (await db.getAll(STORES.clients)) || []
  const invoices = (await db.getAll(STORES.invoices)) || []
  const quotes = (await db.getAll(STORES.quotes)) || []
  const tickets = (await db.getAll(STORES.tickets)) || []
  const payments = (await db.getAll(STORES.payments)) || []
  const products = (await db.getAll(STORES.products)) || []
  const services = (await db.getAll(STORES.services)) || []
  const expenses = (await db.getAll(STORES.expenses)) || []
  return { company, clients, invoices, quotes, tickets, payments, products, services, expenses }
}

function mergeLists(localArr, cloudArr, idKey = 'id') {
  const map = new Map()
  for (const row of cloudArr || []) {
    if (row && row[idKey] != null) map.set(String(row[idKey]), row)
  }
  for (const row of localArr || []) {
    if (!row || row[idKey] == null) continue
    const id = String(row[idKey])
    const existing = map.get(id)
    if (!existing) map.set(id, row)
    else {
      const lt = String(row.updatedAt || row.updated_at || row.date || '')
      const ct = String(existing.updatedAt || existing.updated_at || existing.date || '')
      map.set(id, lt >= ct ? { ...existing, ...row } : { ...row, ...existing })
    }
  }
  return Array.from(map.values())
}

function mergeWorkspaces(local, cloud) {
  return {
    company: local.company?.name ? local.company : cloud.company || local.company,
    clients: mergeLists(local.clients, cloud.clients),
    invoices: mergeLists(local.invoices, cloud.invoices),
    quotes: mergeLists(local.quotes, cloud.quotes),
    tickets: mergeLists(local.tickets, cloud.tickets),
    payments: mergeLists(local.payments, cloud.payments),
    products: mergeLists(local.products, cloud.products),
    services: mergeLists(local.services, cloud.services),
    expenses: mergeLists(local.expenses, cloud.expenses),
    settings: { ...(cloud.settings || {}), ...(local.settings || {}), mergedAt: new Date().toISOString() },
  }
}

export async function flushPushQueue() {
  if (!Sync.isLoggedIn()) return { flushed: 0 }
  const q = readQueue()
  if (!q.length) return { flushed: 0 }
  let flushed = 0
  const remain = []
  for (const item of q) {
    try {
      await Sync.push(item.data)
      flushed += 1
    } catch {
      remain.push(item)
    }
  }
  writeQueue(remain)
  return { flushed, remaining: remain.length }
}

function enqueuePush(data) {
  const q = readQueue()
  q.push({ at: new Date().toISOString(), data })
  writeQueue(q)
}

/**
 * Core: make local and cloud converge after login / boot / manual sync.
 */
export async function ensureWorkspaceSynced({ forcePush = false } = {}) {
  if (!Sync.isLoggedIn()) {
    return { ok: false, action: 'none', reason: 'not_logged_in' }
  }

  const local = await localSnapshot()
  const localScore = scoreWorkspace(local)

  let cloudRow = null
  let cloudData = {}
  let cloudScore = 0
  try {
    cloudRow = await Sync.pull()
    cloudData = Sync.workspaceToImportShape(cloudRow) || {}
    cloudScore = scoreWorkspace(cloudData)
  } catch (e) {
    const msg = String(e.message || e)
    if (!msg.includes('No workspace') && !msg.includes('404')) {
      // offline or auth error — queue local if we have data
      if (localScore > 0) enqueuePush(local)
      return { ok: false, action: 'queued', reason: msg, localScore }
    }
  }

  // Both empty
  if (localScore === 0 && cloudScore === 0) {
    if (forcePush) {
      try {
        await Sync.push(local)
        setMeta({ action: 'seed_empty', version: 1 })
        return { ok: true, action: 'seed_empty', localScore, cloudScore }
      } catch (e) {
        enqueuePush(local)
        return { ok: false, action: 'queued', reason: e.message }
      }
    }
    return { ok: true, action: 'both_empty', localScore, cloudScore }
  }

  // Cloud empty, local has data → seed
  if (cloudScore === 0 && localScore > 0) {
    try {
      const r = await Sync.push(local)
      setMeta({ action: 'seed', version: r.version })
      return { ok: true, action: 'seed', localScore, cloudScore, version: r.version }
    } catch (e) {
      enqueuePush(local)
      return { ok: false, action: 'queued', reason: e.message, localScore }
    }
  }

  // Local empty, cloud has data → restore
  if (localScore === 0 && cloudScore > 0) {
    try {
      await db.importAll(cloudData, { wipe: false })
      setMeta({ action: 'restore', version: cloudRow?.version })
      return { ok: true, action: 'restore', localScore, cloudScore, version: cloudRow?.version }
    } catch (e) {
      return { ok: false, action: 'restore_failed', reason: e.message }
    }
  }

  // Both have data → merge then push
  const merged = mergeWorkspaces(local, cloudData)
  try {
    await db.importAll(merged, { wipe: false })
    const r = await Sync.push(merged)
    setMeta({ action: 'merge', version: r.version })
    return { ok: true, action: 'merge', localScore, cloudScore, version: r.version }
  } catch (e) {
    enqueuePush(merged)
    return { ok: false, action: 'queued', reason: e.message }
  }
}

export function describeEnsureResult(r) {
  if (!r) return 'Sync finished'
  switch (r.action) {
    case 'seed':
      return 'Uploaded this device data to cloud — available on any device'
    case 'seed_empty':
      return 'Cloud workspace ready'
    case 'restore':
      return 'Restored your cloud profile on this device'
    case 'merge':
      return 'Merged local + cloud and saved the combined workspace'
    case 'both_empty':
      return 'Signed in — start adding clients and invoices'
    case 'queued':
      return 'Offline or temporary error — sync will retry automatically'
    case 'none':
      return 'Sign in to enable cloud sync'
    default:
      return r.ok ? 'Workspace synced' : r.reason || 'Sync incomplete'
  }
}
