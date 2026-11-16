/**
 * Company backup import entry points (streaming + staged).
 * Keeps large-file parse off the main Settings path.
 */
import * as db from './db.js'
import { streamWorkspaceRecords, fileTextChunks, workspaceStoreNames } from './streamBackupImport.js'

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

/**
 * Import a company backup from a File/Blob with low memory use.
 * Large files: File.stream() + brace-aware scanner + IndexedDB staging.
 * Small files: JSON.parse + replaceAllStaged (existing validated path).
 */
export async function importBackupFromFile(file, {
  allowPartial = true,
  onProgress,
  signal,
  estimatedBytes,
} = {}) {
  if (!file) throw new Error('No backup file selected')
  const size = Number(file.size || estimatedBytes || 0)
  const report = (phase, percent, message, rows = 0) => {
    try { onProgress?.({ phase, percent, message, rows }) } catch {}
  }

  const SMALL = 1_500_000
  if ((size > 0 && size < SMALL) || typeof file.stream !== 'function') {
    report('reading', 3, 'Reading backup file…')
    let raw
    try {
      raw = JSON.parse(await file.text())
    } catch {
      throw new Error('Backup file is not valid JSON. Your workspace was not changed.')
    }
    return db.replaceAllStaged(raw, {
      allowPartial,
      onProgress,
      estimatedBytes: size || estimatedBytes || 0,
    })
  }

  if (size > 0 && typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate()
      const available = Number(estimate.quota || 0) - Number(estimate.usage || 0)
      const required = Math.ceil(size * 1.25)
      if (available > 0 && available < required) {
        throw new Error(`Not enough browser storage to stage this backup safely. Approximately ${Math.ceil(required / 1048576)} MB free space is recommended. Your existing workspace has not been replaced.`)
      }
    } catch (error) {
      if (String(error?.message || '').startsWith('Not enough browser storage')) throw error
      console.warn('[backup] storage estimate unavailable', error)
    }
  }

  const storeKeys = workspaceStoreNames(db.STORES)
  const batchId = crypto.randomUUID?.() || `import_${Date.now()}`
  const batchSize = 150
  const present = new Set()
  let totalRows = 0
  let companyRows = 0
  let stageBuffer = []
  let sequence = 0

  try {
    const existing = await db.getAll(db.STORES.importStaging)
    for (const row of existing) {
      try { await db.remove(db.STORES.importStaging, row.id) } catch {}
    }
  } catch {}

  const flushStage = async () => {
    if (!stageBuffer.length) return
    const chunk = stageBuffer
    stageBuffer = []
    for (const item of chunk) {
      await db.put(db.STORES.importStaging, item)
    }
  }

  try {
    report('staging', 5, 'Streaming and staging records…')
    const textIter = fileTextChunks(file, { signal })
    await streamWorkspaceRecords(textIter, {
      storeNames: storeKeys,
      signal,
      onProgress: (p) => {
        report(p.phase || 'staging', Math.min(85, 5 + Math.round((p.rows || 0) / 200)), p.message || 'Staging…', p.rows || totalRows)
      },
      onRecord: async (storeKey, row) => {
        if (signal?.aborted) throw new DOMException('Backup import cancelled', 'AbortError')
        const normalized = normalizeRow(storeKey, row)
        if (!normalized) return
        present.add(storeKey)
        stageBuffer.push({
          id: `${batchId}:${storeKey}:${sequence++}`,
          batchId,
          storeKey,
          row: normalized,
        })
        totalRows++
        if (storeKey === 'company') companyRows++
        if (stageBuffer.length >= batchSize) await flushStage()
      },
    })
    await flushStage()

    if (!totalRows) throw new Error('Backup contains no workspace records; nothing was changed')
    if (allowPartial && companyRows === 0) {
      await db.put(db.STORES.importStaging, {
        id: `${batchId}:company:placeholder`,
        batchId,
        storeKey: 'company',
        row: { id: 'main', name: 'Restored business' },
      })
      present.add('company')
    }

    const staged = await db.getAll(db.STORES.importStaging)
    const workspace = {}
    for (const item of staged) {
      if (item.batchId !== batchId) continue
      if (!workspace[item.storeKey]) workspace[item.storeKey] = []
      workspace[item.storeKey].push(item.row)
    }
    for (const row of staged) {
      try { await db.remove(db.STORES.importStaging, row.id) } catch {}
    }

    report('finalizing', 90, 'Applying validated backup', totalRows)
    const stats = await db.replaceAllStaged(workspace, {
      allowPartial,
      onProgress,
      estimatedBytes: 0,
    })
    report('complete', 100, 'Backup restored successfully', stats.rows || totalRows)
    return { ...stats, streamed: true, rows: stats.rows || totalRows }
  } catch (error) {
    try {
      const left = await db.getAll(db.STORES.importStaging)
      for (const row of left) {
        if (String(row.id || '').startsWith(batchId)) await db.remove(db.STORES.importStaging, row.id)
      }
    } catch {}
    throw error
  }
}
