
const DB_NAME = 'SAInvoicePro_v2'
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
  out.version = '2.5.0'
  return out
}
export async function importAll(data, { wipe = false } = {}) {
  if (!data || typeof data !== 'object') throw new Error('Invalid backup')
  for (const k of Object.keys(STORES)) {
    if (!Array.isArray(data[k])) continue
    if (wipe) {
      const existing = await getAll(STORES[k])
      for (const row of existing) {
        const id = k === 'settings' ? row.key : row.id
        if (id != null) await remove(STORES[k], id)
      }
    }
    for (const row of data[k]) {
      try { await put(STORES[k], row) } catch (e) { console.warn(k, e) }
    }
  }
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
