/**
 * Attachments for job cards and invoices — photos (compressed) + documents.
 */
import { compressImageFile, listTicketPhotos, MAX_PHOTOS } from './ticketPhotos.js'

const MAX_DOCS = 8
const MAX_DOC_BYTES = 1_200_000

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
  const added = []
  for (const f of files) {
    if (f.size > MAX_DOC_BYTES) throw new Error(`${f.name} is too large (max ~1 MB each)`)
    const dataUrl = await readAsDataUrl(f)
    added.push({
      id: crypto.randomUUID(),
      name: f.name || 'document',
      mime: f.type || 'application/octet-stream',
      size: f.size,
      dataUrl,
      createdAt: new Date().toISOString(),
    })
  }
  return {
    ...record,
    [key]: [...current, ...added],
    updatedAt: new Date().toISOString(),
  }
}

export function removeAttachment(record, id, { key = 'attachments' } = {}) {
  const list = key === 'photos' ? listTicketPhotos(record) : listAttachments(record, key)
  return {
    ...record,
    [key]: list.filter((a) => String(a.id) !== String(id)),
    updatedAt: new Date().toISOString(),
  }
}

export { MAX_PHOTOS, MAX_DOCS, listTicketPhotos }
