
import versionInfo from '../../version.json' with { type: 'json' }

const DB_NAME = 'SAInvoicePro_v2'
const DB_VERSION = 7

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
  accountWorkspaces: 'accountWorkspaces',
  importStaging: 'importStaging',
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
        else if (name === 'company' || name === 'accountWorkspaces' || name === 'importStaging') d.createObjectStore(name, { keyPath: 'id' })
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
    let result
    let settled = false
    const fail = (error) => {
      if (settled) return
      settled = true
      reject(error || t.error || new Error('IndexedDB transaction failed'))
    }
    t.oncomplete = () => {
      if (settled) return
      settled = true
      resolve(result)
    }
    t.onerror = () => fail(t.error)
    t.onabort = () => fail(t.error || new Error('IndexedDB transaction aborted'))
    try {
      req = fn(s)
      if (req && typeof req === 'object' && 'onsuccess' in req) {
        req.onsuccess = () => { result = req.result }
        req.onerror = () => fail(req.error)
      } else {
        result = req
      }
    } catch (err) {
      try { t.abort() } catch {}
      fail(err)
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
    if (k === 'autoBackups' || k === 'importStaging') continue
    out[k] = await getAll(STORES[k])
  }
  out.exportedAt = new Date().toISOString()
  out.version = versionInfo.version
  out.app = 'SA Invoice Pro Lab'
  return out
}
