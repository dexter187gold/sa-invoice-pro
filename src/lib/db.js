
import versionInfo from '../../version.json' with { type: 'json' }

const DB_NAME = 'SAInvoicePro_v2'
const DB_VERSION = 5

export const STORES = {
  users: 'users',
  company: 'company',
  clients: 'clients',
  products: 'products',
  services: 'services',
  invoices: 'invoices',
  quotes: 'quotes',
  tickets: 'tickets',
  ticketComments: 'ticketComments',
  timeEntries: 'timeEntries',
  expenses: 'expenses',
  payments: 'payments',
  settings: 'settings',
  employees: 'employees',
  payslips: 'payslips',
  bankTxns: 'bankTxns',
  journal: 'journal',
  accounts: 'accounts',
  reconciliations: 'reconciliations',
  pettyCash: 'pettyCash',
  popiaRequests: 'popiaRequests',
  documentTemplates: 'documentTemplates',
  documentRenders: 'documentRenders',
  reminders: 'reminders',
  autoBackups: 'autoBackups',
}

let dbp = null

function openDB() {
  if (dbp) return dbp
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const d = e.target.result
      for (const name of Object.keys(STORES)) {
        if (d.objectStoreNames.contains(name)) continue
        if (name === 'settings') d.createObjectStore(name, { keyPath: 'key' })
        else if (name === 'company') d.createObjectStore(name, { keyPath: 'id' })
        else d.createObjectStore(name, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
  return dbp
}

async function tx(store, mode, fn) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode)
    const s = t.objectStore(store)
    let req
    try { req = fn(s) } catch (err) { reject(err); return }
    if (req && typeof req === 'object' && 'onsuccess' in req) {
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    } else {
      t.oncomplete = () => resolve(req)
      t.onerror = () => reject(t.error)
    }
  })
}

export async function getAll(store) {
  try { return (await tx(store, 'readonly', (s) => s.getAll())) || [] } catch { return [] }
}
export async function get(store, id) {
  return tx(store, 'readonly', (s) => s.get(id))
}
export async function put(store, value) {
  return tx(store, 'readwrite', (s) => s.put(value))
}
export async function add(store, value) {
  const row = { ...value }
  if (!row.id) row.id = crypto.randomUUID()
  if (!row.createdAt) row.createdAt = new Date().toISOString()
  await tx(store, 'readwrite', (s) => s.add(row))
  return row
}
export async function remove(store, id) {
  return tx(store, 'readwrite', (s) => s.delete(id))
}
export async function getSetting(key, def = null) {
  try {
    const row = await get(STORES.settings, key)
    return row && 'value' in row ? row.value : def
  } catch { return def }
}
export async function setSetting(key, value) {
  return put(STORES.settings, { key, value })
}

const ACTIVE_COMPANY_KEY = 'activeCompanyId'

export async function getCompanies() {
  return (await getAll(STORES.company)).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
}
export async function setActiveCompany(id) {
  if (id == null) {
    try { await remove(STORES.settings, ACTIVE_COMPANY_KEY) } catch {}
    return
  }
  return setSetting(ACTIVE_COMPANY_KEY, id)
}
export async function getCompany() {
  const all = await getAll(STORES.company)
  if (!all.length) return null
  const activeId = await getSetting(ACTIVE_COMPANY_KEY, null)
  if (activeId != null) {
    const hit = all.find((c) => String(c.id) === String(activeId))
    if (hit) return hit
  }
  return all[0]
}
export async function saveCompany(data, { createNew = false } = {}) {
  const existing = data?.id ? await get(STORES.company, data.id) : (createNew ? null : await getCompany())
  const row = { ...(existing || {}), ...(data || {}), id: data?.id || existing?.id || 'main' }
  await put(STORES.company, row)
  return row
}
export async function deleteCompany(id) {
  const all = await getAll(STORES.company)
  if (all.length <= 1) throw new Error('Cannot delete the only company profile')
  await remove(STORES.company, id)
  const activeId = await getSetting(ACTIVE_COMPANY_KEY, null)
  if (String(activeId) === String(id)) await setActiveCompany(all.find((c) => String(c.id) !== String(id))?.id)
  return getCompany()
}
export async function exportAll() {
  const out = {}
  for (const k of Object.keys(STORES)) {
    if (k === 'autoBackups') continue
    out[k] = await getAll(STORES[k])
  }
  out.exportedAt = new Date().toISOString()
  out.version = versionInfo.version
  out.app = 'SA Invoice Pro Lab'
  return out
}

function scoreWorkspace(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return 0
  let score = 0
  for (const k of Object.keys(STORES)) {
    if (k === 'autoBackups') continue
    const v = obj[k]
    if (Array.isArray(v)) score += Math.min(v.length + 1, 20)
    else if (k === 'company' && v && typeof v === 'object') score += 5
  }
  return score
}

function normalizeStoreKeys(src) {
  if (!src || typeof src !== 'object') return src
  const out = { ...src }
  for (const k of Object.keys(STORES)) {
    if (k === 'autoBackups') continue
    if (Array.isArray(out[k])) continue
    if (k === 'company' && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) continue
    const found = Object.keys(src).find((x) => String(x).toLowerCase() === k.toLowerCase())
    if (found && found !== k) out[k] = src[found]
  }
  return out
}

function unwrapBackup(raw) {
  if (!raw || typeof raw !== 'object') return null
  let best = null
  let bestScore = 0
  const visit = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 5) return
    if (Array.isArray(node)) return
    const normalized = normalizeStoreKeys(node)
    const score = scoreWorkspace(normalized)
    if (score > bestScore) {
      bestScore = score
      best = normalized
    }
    for (const key of ['data', 'workspace', 'stores', 'backup', 'payload', 'export', 'dump', 'body']) {
      if (node[key] && typeof node[key] === 'object') visit(node[key], depth + 1)
    }
  }
  visit(raw)
  if (best && bestScore > 0) {
    if (best.company && !Array.isArray(best.company) && typeof best.company === 'object') {
      return { ...best, company: [best.company] }
    }
    return best
  }
  if (raw.company && !Array.isArray(raw.company) && typeof raw.company === 'object') {
    return normalizeStoreKeys({ ...raw, company: [raw.company] })
  }
  return normalizeStoreKeys(raw)
}

function normalizeRow(storeKey, row) {
  if (!row || typeof row !== 'object') return null
  const r = { ...row }
  if (storeKey === 'settings') {
    if (r.key == null && r.id != null) r.key = r.id
    if (r.key == null && r.name != null) r.key = r.name
    if (r.key == null) return null
  } else if (storeKey === 'company') {
    if (!r.id) r.id = 'main'
  } else {
    if (r.id == null && r._id != null) r.id = r._id
    if (r.id == null && r.uuid != null) r.id = r.uuid
  }
  return r
}

export async function importAll(data, { wipe = false } = {}) {
  const src = unwrapBackup(data)
  if (!src || typeof src !== 'object') throw new Error('Invalid backup file — expected a SA Invoice Pro JSON export')

  const stats = { stores: 0, rows: 0, errors: 0, wiped: !!wipe }

  for (const k of Object.keys(STORES)) {
    if (k === 'autoBackups') continue
    let list = src[k]
    if (k === 'company' && list && !Array.isArray(list) && typeof list === 'object') {
      list = [list]
    }
    if (!Array.isArray(list)) continue
    stats.stores++

    if (wipe) {
      const existing = await getAll(STORES[k])
      for (const row of existing) {
        const id = k === 'settings' ? row.key : row.id
        if (id != null) {
          try { await remove(STORES[k], id) } catch {}
        }
      }
    }

    for (const row of list) {
      const norm = normalizeRow(k, row)
      if (!norm) continue
      try {
        await put(STORES[k], norm)
        stats.rows++
      } catch (e) {
        stats.errors++
        console.warn('import', k, e)
        try {
          const { createdAt, updatedAt, ...rest } = norm
          if (k !== 'settings' && rest.id == null) rest.id = crypto.randomUUID?.() || `imp_${Date.now()}_${stats.rows}`
          await put(STORES[k], rest)
          stats.rows++
          stats.errors--
        } catch (e2) {
          console.warn('import retry failed', k, e2)
        }
      }
    }
  }

  if (stats.rows === 0 && stats.stores === 0) {
    throw new Error('No recognisable data in backup (expected clients, invoices, users, company, etc.). Re-export from Settings → Download backup JSON.')
  }
  return stats
}

/**
 * Replace the complete workspace from a full export in one IndexedDB
 * transaction. autoBackups is excluded so rollback snapshots survive.
 */
export async function replaceAllAtomic(data, { allowPartial = false } = {}) {
  const src = unwrapBackup(data)
  if (!src || typeof src !== 'object') throw new Error('Invalid backup file')
  const storeKeys = Object.keys(STORES).filter((key) => key !== 'autoBackups')
  const present = storeKeys.filter((key) => {
    const v = src[key]
    return Array.isArray(v) || (key === 'company' && v && typeof v === 'object')
  })
  const missing = storeKeys.filter((key) => !present.includes(key))
  if (!allowPartial && missing.length) {
    throw new Error(`This is not a complete workspace backup. Missing store data: ${missing.join(', ')}`)
  }

  const prepared = {}
  let totalRows = 0
  for (const key of storeKeys) {
    let rows = src[key]
    if (key === 'company' && rows && !Array.isArray(rows) && typeof rows === 'object') rows = [rows]
    if (!Array.isArray(rows)) rows = []
    prepared[key] = rows.map((row) => normalizeRow(key, row)).filter(Boolean)
    totalRows += prepared[key].length
  }
  if (allowPartial && !prepared.company.length) {
    if (!totalRows) {
      throw new Error('Profile backup must contain workspace records. No data was replaced.')
    }
    prepared.company = [{ id: 'main', name: 'Restored business' }]
  }
  if (!totalRows && !prepared.company.length) {
    throw new Error('Backup contains no workspace records; restore cancelled')
  }

  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeKeys.map((key) => STORES[key]), 'readwrite')
    const fail = (error) => {
      try { transaction.abort() } catch {}
      reject(error || new Error('Workspace restore failed'))
    }
    transaction.oncomplete = () => resolve({
      stores: storeKeys.length,
      rows: totalRows + (prepared.company?.length || 0),
      preservedRecoverySnapshots: true,
    })
    transaction.onerror = () => reject(transaction.error || new Error('Workspace restore transaction failed'))
    transaction.onabort = () => reject(transaction.error || new Error('Workspace restore was rolled back'))
    try {
      for (const key of storeKeys) {
        const store = transaction.objectStore(STORES[key])
        store.clear()
        for (const row of prepared[key]) store.put(row)
      }
    } catch (error) {
      fail(error)
    }
  })
}

export async function listTicketComments(ticketId) {
  const all = await getAll(STORES.ticketComments)
  return all
    .filter((c) => String(c.ticketId) === String(ticketId))
    .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))
}

export async function addTicketComment(ticketId, { text, internal = false, author = '' }) {
  return add(STORES.ticketComments, {
    ticketId,
    text: String(text || '').trim(),
    internal: !!internal,
    author: author || 'staff',
    createdAt: new Date().toISOString(),
  })
}

export async function addManyAtomic(operations = []) {
  if (!Array.isArray(operations) || !operations.length) return []
  const dbi = await openDB()
  const names = [...new Set(operations.map((op) => op.store))]
  return new Promise((resolve, reject) => {
    const transaction = dbi.transaction(names, 'readwrite')
    const results = []
    transaction.oncomplete = () => resolve(results)
    transaction.onerror = () => reject(transaction.error || new Error('Transaction failed'))
    transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted'))
    try {
      for (const op of operations) {
        const store = transaction.objectStore(op.store)
        if (op.type === 'delete') results.push(store.delete(op.value))
        else if (op.type === 'add') results.push(store.add(op.value))
        else results.push(store.put(op.value))
      }
    } catch (error) {
      try { transaction.abort() } catch {}
      reject(error)
    }
  })
}

export async function withTransaction(storeNames, handler) {
  const dbi = await openDB()
  return new Promise((resolve, reject) => {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames]
    const transaction = dbi.transaction(names, 'readwrite')
    transaction.oncomplete = () => resolve(true)
    transaction.onerror = () => reject(transaction.error)
    try {
      const stores = {}
      for (const n of names) stores[n] = transaction.objectStore(n)
      handler(stores, transaction)
    } catch (e) {
      try { transaction.abort() } catch {}
      reject(e)
    }
  })
}
