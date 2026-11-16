
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


/**
 * Low-memory staged workspace restore.
 * Incoming records are written to IndexedDB in small batches, then swapped
 * into the live stores in one transaction. Recovery snapshots are preserved.
 */
export async function replaceAllStaged(data, { allowPartial = false, onProgress, estimatedBytes = 0 } = {}) {
  const src = unwrapBackup(data)
  data = null
  if (!src || typeof src !== 'object') throw new Error('Invalid backup file')
  const storeKeys = Object.keys(STORES).filter((key) => !['users', 'autoBackups', 'accountWorkspaces', 'importStaging'].includes(key))
  const present = storeKeys.filter((key) => Array.isArray(src[key]) || (key === 'company' && src[key] && typeof src[key] === 'object'))
  const missing = storeKeys.filter((key) => !present.includes(key))
  if (!allowPartial && missing.length) throw new Error(`This is not a complete workspace backup. Missing store data: ${missing.join(', ')}`)

  if (estimatedBytes > 0 && typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate()
      const available = Number(estimate.quota || 0) - Number(estimate.usage || 0)
      const required = Math.ceil(estimatedBytes * 1.25)
      if (available > 0 && available < required) {
        throw new Error(`Not enough browser storage to stage this backup safely. Approximately ${Math.ceil(required / 1048576)} MB free space is recommended. Your existing workspace has not been replaced.`)
      }
    } catch (error) {
      if (String(error?.message || '').startsWith('Not enough browser storage')) throw error
      console.warn('[backup] storage estimate unavailable', error)
    }
  }
  const db = await openDB()
  const batchId = crypto.randomUUID?.() || `import_${Date.now()}`
  const batchSize = 150
  let totalRows = 0
  let completedStores = 0
  let companyRows = 0
  const report = (phase, percent, message) => {
    try { onProgress?.({ phase, percent, message, rows: totalRows }) } catch {}
  }
  const clearStage = async () => tx(STORES.importStaging, 'readwrite', (s) => s.clear())
  await clearStage()
  try {
    report('staging', 2, 'Preparing backup records')
    for (const key of storeKeys) {
      let rows = src[key]
      if (key === 'company' && rows && !Array.isArray(rows) && typeof rows === 'object') rows = [rows]
      if (!Array.isArray(rows)) rows = []
      for (let offset = 0; offset < rows.length; offset += batchSize) {
        const chunk = rows.slice(offset, offset + batchSize)
        await new Promise((resolve, reject) => {
          const t = db.transaction(STORES.importStaging, 'readwrite')
          const stage = t.objectStore(STORES.importStaging)
          chunk.forEach((row, index) => {
            const normalized = normalizeRow(key, row)
            if (!normalized) return
            const sequence = offset + index
            stage.put({ id: `${batchId}:${key}:${sequence}`, batchId, storeKey: key, row: normalized })
            totalRows++
            if (key === 'company') companyRows++
          })
          t.oncomplete = resolve
          t.onerror = () => reject(t.error || new Error('Could not stage backup records'))
          t.onabort = () => reject(t.error || new Error('Backup staging was interrupted'))
        })
        report('staging', Math.min(85, 5 + Math.round((completedStores / storeKeys.length) * 80)), `Preparing ${key}`)
      }
      // Release each source array as soon as it has been staged.
      try { delete src[key] } catch {}
      completedStores++
    }
    if (!totalRows) throw new Error('Backup contains no workspace records; nothing was changed')
    if (allowPartial && companyRows === 0) {
      await tx(STORES.importStaging, 'readwrite', (s) => s.put({
        id: `${batchId}:company:placeholder`, batchId, storeKey: 'company',
        row: { id: 'main', name: 'Restored business' },
      }))
    }
    // Only replace stores actually present in the backup. Older/partial backups
    // must not erase newer data types that they do not know about.
    const targetKeys = present.filter((key) => storeKeys.includes(key))
    report('finalizing', 90, 'Applying validated backup')
    await new Promise((resolve, reject) => {
      const names = [...targetKeys.map((key) => STORES[key]), STORES.importStaging]
      const t = db.transaction(names, 'readwrite')
      const stage = t.objectStore(STORES.importStaging)
      for (const key of targetKeys) t.objectStore(STORES[key]).clear()
      const cursorRequest = stage.openCursor()
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result
        if (!cursor) {
          stage.clear()
          return
        }
        const item = cursor.value
        if (item.batchId === batchId && targetKeys.includes(item.storeKey) && STORES[item.storeKey]) {
          t.objectStore(STORES[item.storeKey]).put(item.row)
        }
        cursor.continue()
      }
      cursorRequest.onerror = () => { try { t.abort() } catch {} }
      t.oncomplete = resolve
      t.onerror = () => reject(t.error || new Error('Workspace restore transaction failed'))
      t.onabort = () => reject(t.error || new Error('Workspace restore was rolled back'))
    })
    report('complete', 100, 'Backup restored successfully')
    return { stores: present.length, rows: totalRows, staged: true, preservedRecoverySnapshots: true }
  } catch (error) {
    try { await clearStage() } catch {}
    throw error
  }
}


const DEVICE_LICENSE_SETTING_KEYS = new Set(['licenseKey', 'licenseMeta', 'activationToken', 'licenseOfflineBlob', 'licenseEmail', 'licenseServerUrl', 'hwid', 'handshakeOk', 'lastLicenseExchange', 'pendingLicenseKey', 'trialStartedAt'])

const ACCOUNT_WORKSPACE_STORES = Object.keys(STORES).filter(
  (key) => !['users', 'autoBackups', 'accountWorkspaces', 'importStaging'].includes(key),
)

/** Preserve the current device workspace under its authenticated account before switching users. */
export async function saveAccountWorkspace(accountEmail) {
  const id = String(accountEmail || '').trim().toLowerCase()
  if (!id) return false
  const data = {}
  let rows = 0
  for (const key of ACCOUNT_WORKSPACE_STORES) {
    data[key] = await getAll(STORES[key])
    if (key === 'settings') data[key] = data[key].filter((row) => !DEVICE_LICENSE_SETTING_KEYS.has(String(row.key)))
    rows += data[key].length
  }
  if (!rows) return false
  await put(STORES.accountWorkspaces, { id, data, savedAt: new Date().toISOString() })
  return true
}

/** Start with an isolated workspace; account and recovery records remain on device. */
export async function clearActiveWorkspace() {
  const database = await openDB()
  const names = ACCOUNT_WORKSPACE_STORES.filter((key) => key !== 'settings').map((key) => STORES[key])
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(names, 'readwrite')
    transaction.oncomplete = async () => {
      try {
        const settings = await getAll(STORES.settings)
        for (const row of settings) if (!DEVICE_LICENSE_SETTING_KEYS.has(String(row.key))) await remove(STORES.settings, row.key)
        resolve(true)
      } catch (error) { reject(error) }
    }
    transaction.onerror = () => reject(transaction.error || new Error('Could not isolate account workspace'))
    transaction.onabort = () => reject(transaction.error || new Error('Account workspace isolation was aborted'))
    for (const name of names) transaction.objectStore(name).clear()
  })
}

/** Restore only the workspace previously saved for this exact account email. */
export async function restoreAccountWorkspace(accountEmail) {
  const id = String(accountEmail || '').trim().toLowerCase()
  if (!id) return false
  const saved = await get(STORES.accountWorkspaces, id)
  if (!saved?.data) return false
  const data = { ...saved.data }
  if (Array.isArray(data.settings)) data.settings = data.settings.filter((row) => !DEVICE_LICENSE_SETTING_KEYS.has(String(row.key)))
  await importAll(data, { wipe: false })

  // Recover a previously isolated device activation from legacy account snapshots,
  // but only when its recorded hardware ID matches this browser's device ID.
  try {
    const current = await getAll(STORES.settings)
    const hasProof = current.some((row) => row.key === 'licenseKey' && row.value) && current.some((row) => row.key === 'activationToken' && row.value)
    const deviceId = localStorage.getItem('saip_hwid') || current.find((row) => row.key === 'hwid')?.value
    if (!hasProof && deviceId) {
      const snapshots = await getAll(STORES.accountWorkspaces)
      for (const snapshot of snapshots) {
        const rows = snapshot?.data?.settings || []
        const meta = rows.find((row) => row.key === 'licenseMeta')?.value
        const key = rows.find((row) => row.key === 'licenseKey')?.value
        const token = rows.find((row) => row.key === 'activationToken')?.value
        if (meta?.server === true && meta?.hwid === deviceId && key && token) {
          for (const row of rows.filter((item) => DEVICE_LICENSE_SETTING_KEYS.has(String(item.key)))) await setSetting(row.key, row.value)
          break
        }
      }
    }
  } catch (error) { console.warn('[license recovery] legacy device proof', error?.message || error) }
  return true
}

export async function recoverDeviceLicenseSettings() {
  try {
    const current = await getAll(STORES.settings)
    const hasProof = current.some((row) => row.key === 'licenseKey' && row.value) && current.some((row) => row.key === 'activationToken' && row.value)
    if (hasProof) return true
    const deviceId = localStorage.getItem('saip_hwid') || current.find((row) => row.key === 'hwid')?.value
    if (!deviceId) return false
    const snapshots = await getAll(STORES.accountWorkspaces)
    for (const snapshot of snapshots) {
      const rows = snapshot?.data?.settings || []
      const meta = rows.find((row) => row.key === 'licenseMeta')?.value
      const key = rows.find((row) => row.key === 'licenseKey')?.value
      const token = rows.find((row) => row.key === 'activationToken')?.value
      if (meta?.server === true && meta?.hwid === deviceId && key && token) {
        for (const row of rows.filter((item) => DEVICE_LICENSE_SETTING_KEYS.has(String(item.key)))) await setSetting(row.key, row.value)
        return true
      }
    }
  } catch (error) { console.warn('[license recovery] device proof', error?.message || error) }
  return false
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
    let result
    const setResult = (value) => { result = value }
    const failure = () => transaction.__failure || transaction.error || new Error('IndexedDB transaction failed')
    transaction.oncomplete = () => resolve(result === undefined ? true : result)
    transaction.onerror = () => reject(failure())
    transaction.onabort = () => reject(failure())
    try {
      const stores = {}
      for (const n of names) stores[n] = transaction.objectStore(n)
      handler(stores, transaction, setResult)
    } catch (e) {
      transaction.__failure = e
      try { transaction.abort() } catch {}
      reject(e)
    }
  })
}


/**
 * Stream a company backup from IndexedDB in bounded batches.
 * The File System Access API is preferred so large exports are written
 * directly to disk instead of being assembled as one giant JSON string.
 */
export async function downloadBackupStreaming({ onProgress, signal } = {}) {
  const excluded = new Set(['users', 'autoBackups', 'accountWorkspaces', 'importStaging']);
  const keys = Object.keys(STORES).filter((key) => !excluded.has(key));
  const metadata = {
    exportedAt: new Date().toISOString(),
    version: versionInfo.version,
    app: 'SA Invoice Pro Lab',
    format: 'sa-invoice-pro-workspace-v2',
  };
  let writable = null;
  let parts = [];
  let bytesWritten = 0;
  const encoder = new TextEncoder();
  const write = async (value) => {
    if (signal?.aborted) throw new DOMException('Backup export cancelled', 'AbortError');
    const chunk = encoder.encode(value);
    if (writable) await writable.write(chunk);
    else parts.push(chunk);
    bytesWritten += chunk.byteLength;
  };
  const report = (percent, message, rows) => {
    try { onProgress?.({ percent, message, rows, bytes: bytesWritten }); } catch {}
  };

  // Open the picker synchronously from the user's click before awaiting DB work.
  if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: `sa-invoice-backup-${new Date().toISOString().slice(0, 10)}.json`,
        types: [{ description: 'SA Invoice Pro backup', accept: { 'application/json': ['.json'] } }],
      });
      writable = await handle.createWritable();
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      // Unsupported or denied picker: use the browser download fallback.
      writable = null;
    }
  }

  try {
    await write('{');
    await write('"exportedAt":' + JSON.stringify(metadata.exportedAt));
    await write(',"version":' + JSON.stringify(metadata.version));
    await write(',"app":' + JSON.stringify(metadata.app));
    await write(',"format":' + JSON.stringify(metadata.format));

    const database = await openDB();
    let totalRows = 0;
    let storesDone = 0;
    for (const key of keys) {
      if (signal?.aborted) throw new DOMException('Backup export cancelled', 'AbortError');
      await write(',' + JSON.stringify(key) + ':[');
      const storeName = STORES[key];
      let lastKey;
      let first = true;
      let storeRows = 0;
      while (true) {
        const batch = await new Promise((resolve, reject) => {
          const transaction = database.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          let request;
          try {
            const range = lastKey === undefined ? null : IDBKeyRange.lowerBound(lastKey, true);
            request = store.getAll(range, 100);
          } catch (error) { reject(error); return; }
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error || new Error('Could not read backup records'));
          transaction.onerror = () => reject(transaction.error || new Error('Could not read backup records'));
          transaction.onabort = () => reject(transaction.error || new Error('Backup read was interrupted'));
        });
        if (!batch.length) break;
        for (const row of batch) {
          if (!first) await write(',');
          await write(JSON.stringify(row));
          first = false;
          storeRows++;
          totalRows++;
        }
        const last = batch[batch.length - 1];
        // All current stores have a keyPath. Use its actual key for pagination.
        lastKey = key === 'settings' ? last.key : last.id;
        if (batch.length < 100) break;
      }
      await write(']');
      storesDone++;
      report(5 + Math.round((storesDone / keys.length) * 90), `Exporting ${key}`, totalRows);
    }
    await write('}');
    if (writable) {
      await writable.close();
      report(100, 'Backup saved successfully', totalRows);
      return { rows: totalRows, bytes: bytesWritten, streamed: true, fileSystemWriter: true };
    }
    const blob = new Blob(parts, { type: 'application/json;charset=utf-8' });
    parts = [];
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sa-invoice-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    report(100, 'Backup downloaded successfully', totalRows);
    return { rows: totalRows, bytes: bytesWritten, streamed: true, fileSystemWriter: false };
  } catch (error) {
    if (writable) {
      try { await writable.abort() } catch {}
    }
    parts = [];
    throw error;
  }
}
