
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
  if (id) await setSetting(ACTIVE_COMPANY_KEY, String(id))
  else {
    try { await remove(STORES.settings, ACTIVE_COMPANY_KEY) } catch {}
  }
  return getCompany()
}
export async function getCompany() {
  const all = await getAll(STORES.company)
  if (!all.length) return null
  const activeId = await getSetting(ACTIVE_COMPANY_KEY, null)
  return all.find((c) => String(c.id) === String(activeId)) || all[0] || null
}
export async function saveCompany(data, { createNew = false } = {}) {
  const existing = data?.id ? await get(STORES.company, data.id) : (createNew ? null : await getCompany())
  const row = { ...(existing || {}), ...data, id: data?.id || existing?.id || (createNew ? crypto.randomUUID() : 'main'), updatedAt: new Date().toISOString() }
  delete row.createNew
  await put(STORES.company, row)
  await setActiveCompany(row.id)
  return row
}
export async function deleteCompany(id) {
  const all = await getAll(STORES.company)
  if (all.length <= 1) throw new Error('Keep at least one company profile. Add another company before deleting this one.')
  await remove(STORES.company, id)
  const activeId = await getSetting(ACTIVE_COMPANY_KEY, null)
  if (String(activeId) === String(id)) await setActiveCompany(all.find((c) => String(c.id) !== String(id))?.id)
  return getCompany()
}
export async function exportAll() {
  const out = {}
  for (const k of Object.keys(STORES)) {
    if (k === 'autoBackups') continue // Keep recovery snapshots outside exported workspace data.
    out[k] = await getAll(STORES[k])
  }
  out.exportedAt = new Date().toISOString()
  out.version = versionInfo.version
  out.app = 'SA Invoice Pro Lab'
  return out
}

function unwrapBackup(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (Array.isArray(raw.clients) || Array.isArray(raw.invoices) || Array.isArray(raw.users) || Array.isArray(raw.company)) {
    return raw
  }
  for (const key of ['data', 'workspace', 'stores', 'backup', 'payload']) {
    const inner = raw[key]
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      const u = unwrapBackup(inner)
      if (u) return u
    }
  }
  if (raw.company && !Array.isArray(raw.company) && typeof raw.company === 'object') {
    return { ...raw, company: [raw.company] }
  }
  return raw
}

function normalizeRow(storeKey, row) {
  if (!row || typeof row !== 'object') return null
  const r = { ...row }
  if (storeKey === 'settings') {
    if (r.key == null && r.id != null) r.key = r.id
    if (r.key == null) return null
  } else if (storeKey === 'company') {
    if (!r.id) r.id = 'main'
  } else {
    if (r.id == null && r._id != null) r.id = r._id
  }
  return r
}

export async function importAll(data, { wipe = false } = {}) {
  const src = unwrapBackup(data)
  if (!src || typeof src !== 'object') throw new Error('Invalid backup file')

  const stats = { stores: 0, rows: 0, errors: 0 }

  for (const k of Object.keys(STORES)) {
    if (k === 'autoBackups') continue // A workspace import must never overwrite recovery history.
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
    throw new Error('No recognisable data in backup (expected clients, invoices, users, etc.)')
  }
  return stats
}


/**
 * Replace the complete workspace from a full export in one IndexedDB
 * transaction. The dedicated autoBackups store is deliberately excluded so
 * the pre-restore rollback snapshot survives the replacement.
 */
export async function replaceAllAtomic(data, { allowPartial = false } = {}) {
  const src = unwrapBackup(data)
  if (!src || typeof src !== 'object') throw new Error('Invalid backup file')

  const storeKeys = Object.keys(STORES).filter((key) => key !== 'autoBackups')
  const missing = storeKeys.filter((key) => !Array.isArray(src[key]) && !(key === 'company' && src[key] && typeof src[key] === 'object'))
  if (missing.length && !allowPartial) {
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
    throw new Error('Profile backup must contain at least one company profile. No data was replaced.')
  }
  if (!totalRows) throw new Error('Backup contains no workspace records; restore cancelled')

  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeKeys.map((key) => STORES[key]), 'readwrite')
    const fail = (error) => {
      try { transaction.abort() } catch {}
      reject(error || new Error('Workspace restore failed'))
    }
    transaction.oncomplete = () => resolve({
      stores: storeKeys.length,
      rows: totalRows,
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


/**
 * Enqueue related IndexedDB writes in one transaction. Every request is
 * scheduled synchronously before the transaction can auto-commit.
 * operations: [{ store, type: 'add'|'put'|'delete', value }]
 */
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
      for (const operation of operations) {
        const store = transaction.objectStore(operation.store)
        let request
        if (operation.type === 'delete') request = store.delete(operation.value)
        else {
          const row = { ...(operation.value || {}) }
          if (operation.type === 'add') {
            if (row.id == null) row.id = crypto.randomUUID()
            if (!row.createdAt) row.createdAt = new Date().toISOString()
          }
          request = operation.type === 'put' ? store.put(row) : store.add(row)
        }
        request.onsuccess = () => results.push(request.result)
        request.onerror = () => { /* transaction aborts automatically */ }
      }
    } catch (error) {
      try { transaction.abort() } catch {}
      reject(error)
    }
  })
}


/**
 * Run coordinated IndexedDB reads and writes in one transaction.
 * The handler must enqueue its initial requests synchronously; follow-up
 * requests may be queued from IndexedDB request callbacks while the
 * transaction is active. Resolves only after the transaction commits.
 */
export async function withTransaction(storeNames, handler) {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    let result
    let settled = false
    let transaction
    const fail = (error) => {
      if (settled) return
      settled = true
      reject(error || new Error('IndexedDB transaction failed'))
    }
    try {
      transaction = database.transaction([...new Set(storeNames)], 'readwrite')
      transaction.oncomplete = () => {
        if (settled) return
        settled = true
        resolve(result)
      }
      transaction.onerror = () => fail(transaction.error)
      transaction.onabort = () => fail(transaction.__failure || transaction.error || new Error('IndexedDB transaction aborted'))
      handler(transaction, (value) => { result = value })
    } catch (error) {
      try { transaction?.abort() } catch {}
      fail(error)
    }
  })
}
