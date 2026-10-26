
import versionInfo from '../../version.json'\n\nconst DB_NAME = 'SAInvoicePro_v2'
const DB_VERSION = 3

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
  popiaRequests: 'popiaRequests',
  documentTemplates: 'documentTemplates',
  documentRenders: 'documentRenders',
  reminders: 'reminders',
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
export async function getCompany() {
  const all = await getAll(STORES.company)
  return all[0] || null
}
export async function saveCompany(data) {
  const existing = await getCompany()
  const row = { ...(existing || {}), ...data, id: existing?.id || 'main' }
  await put(STORES.company, row)
  return row
}
export async function exportAll() {
  const out = {}
  for (const k of Object.keys(STORES)) out[k] = await getAll(STORES[k])
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
