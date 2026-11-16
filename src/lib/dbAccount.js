import {
  STORES, openDB, getAll, get, put, remove, add, setSetting,
} from './dbCore.js'
import { importAll } from './dbImport.js'

const DEVICE_LICENSE_SETTING_KEYS = new Set(['licenseKey', 'licenseMeta', 'activationToken', 'licenseOfflineBlob', 'licenseEmail', 'licenseServerUrl', 'hwid', 'handshakeOk', 'lastLicenseExchange', 'pendingLicenseKey', 'trialStartedAt'])

const ACCOUNT_WORKSPACE_STORES = Object.keys(STORES).filter(
  (key) => !['users', 'autoBackups', 'accountWorkspaces', 'importStaging'].includes(key),
)

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
  if (!operations.length) return []
  const names = [...new Set(operations.map((op) => op.store))]
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(names, 'readwrite')
    const results = []
    transaction.oncomplete = () => resolve(results)
    transaction.onerror = () => reject(transaction.error || new Error('Bulk write failed'))
    transaction.onabort = () => reject(transaction.error || new Error('Bulk write aborted'))
    try {
      for (const op of operations) {
        const store = transaction.objectStore(op.store)
        if (op.type === 'put') {
          const req = store.put(op.value)
          req.onsuccess = () => results.push(req.result)
        } else if (op.type === 'add') {
          const req = store.add(op.value)
          req.onsuccess = () => results.push(req.result)
        } else if (op.type === 'delete') {
          store.delete(op.id)
        }
      }
    } catch (e) {
      try { transaction.abort() } catch {}
      reject(e)
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
