import {
  STORES, openDB, tx, getAll, get, put, remove,
  unwrapBackup, normalizeRow,
} from './dbCore.js'

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
