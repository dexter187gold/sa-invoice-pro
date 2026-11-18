/**
 * Attachments for job cards and invoices — photos (compressed) + documents.
 * Large documents prefer OPFS when available to keep IndexedDB lean.
 */
import { compressImageFile, listTicketPhotos, MAX_PHOTOS } from './ticketPhotos.js'
import { mediaOpfsAvailable, writeMediaBlob, removeMediaBlob } from './mediaOpfs.js'

const MAX_DOCS = 8
const MAX_DOC_BYTES = 2_500_000
const OPFS_THRESHOLD = 200_000

export function listAttachments(record, key = 'attachments') {
  const list = record?.[key]
  return Array.isArray(list) ? list : []
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result || ''))
    fr.onerror = () => reject(new Error('Could not read file'))
    fr.readAsDataURL(file)
  })
}

function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.onerror = () => reject(new Error('Could not read file'))
    fr.readAsArrayBuffer(file)
  })
}

export async function addImageAttachments(record, fileList, { key = 'photos' } = {}) {
  const current = key === 'photos' ? listTicketPhotos(record) : listAttachments(record, key)
  const room = Math.max(0, MAX_PHOTOS - current.length)
  if (!room) throw new Error(`Max ${MAX_PHOTOS} photos`)
  const files = Array.from(fileList || []).filter((f) => f?.type?.startsWith('image/')).slice(0, room)
  if (!files.length) throw new Error('Choose image files')
  const added = []
  for (const f of files) added.push(await compressImageFile(f))
  return {
    ...record,
    [key]: [...current, ...added],
    updatedAt: new Date().toISOString(),
  }
}

export async function addDocumentAttachments(record, fileList, { key = 'attachments' } = {}) {
  const current = listAttachments(record, key)
  const room = Math.max(0, MAX_DOCS - current.length)
  if (!room) throw new Error(`Max ${MAX_DOCS} documents`)
  const files = Array.from(fileList || []).slice(0, room)
  if (!files.length) throw new Error('Choose files')
  const useOpfs = await mediaOpfsAvailable()
  const added = []
  for (const f of files) {
    if (f.size > MAX_DOC_BYTES) throw new Error(`${f.name} is too large (max ~2.5 MB each)`)
    const id = crypto.randomUUID()
    if (useOpfs && f.size >= OPFS_THRESHOLD) {
      const buf = await readAsArrayBuffer(f)
      const ref = await writeMediaBlob(id, new Blob([buf], { type: f.type || 'application/octet-stream' }), f.name)
      added.push({
        id,
        name: f.name || 'document',
        mime: f.type || 'application/octet-stream',
        size: f.size,
        opfs: true,
        path: ref?.path || null,
        createdAt: new Date().toISOString(),
      })
    } else {
      const dataUrl = await readAsDataUrl(f)
      added.push({
        id,
        name: f.name || 'document',
        mime: f.type || 'application/octet-stream',
        size: f.size,
        dataUrl,
        createdAt: new Date().toISOString(),
      })
    }
  }
  return {
    ...record,
    [key]: [...current, ...added],
    updatedAt: new Date().toISOString(),
  }
}

export async function removeAttachment(record, id, { key = 'attachments' } = {}) {
  const list = key === 'photos' ? listTicketPhotos(record) : listAttachments(record, key)
  const victim = list.find((a) => String(a.id) === String(id))
  if (victim?.opfs && victim.path) {
    try { await removeMediaBlob(victim.path) } catch {}
  }
  return {
    ...record,
    [key]: list.filter((a) => String(a.id) !== String(id)),
    updatedAt: new Date().toISOString(),
  }
}

export { MAX_PHOTOS, MAX_DOCS, listTicketPhotos }
