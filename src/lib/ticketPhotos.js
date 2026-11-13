/**
 * Job-card photo attachments — stored as compressed data URLs on the ticket.
 * Caps: max 6 photos, ~400kb each after resize.
 */

const MAX_PHOTOS = 6
const MAX_EDGE = 1280
const JPEG_QUALITY = 0.72

export function listTicketPhotos(ticket) {
  const list = ticket?.photos
  return Array.isArray(list) ? list : []
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result || ''))
    fr.onerror = () => reject(new Error('Could not read image'))
    fr.readAsDataURL(file)
  })
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Invalid image'))
    img.src = dataUrl
  })
}

/** Resize/compress image file → JPEG data URL */
export async function compressImageFile(file) {
  const raw = await readFileAsDataUrl(file)
  const img = await loadImage(raw)
  let { width, height } = img
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  width = Math.round(width * scale)
  height = Math.round(height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, width, height)
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  return {
    id: crypto.randomUUID(),
    dataUrl,
    name: file.name || 'photo.jpg',
    size: Math.round((dataUrl.length * 3) / 4),
    width,
    height,
    createdAt: new Date().toISOString(),
  }
}

export async function addPhotosToTicket(ticket, fileList) {
  const current = listTicketPhotos(ticket)
  const room = Math.max(0, MAX_PHOTOS - current.length)
  if (!room) throw new Error(`Max ${MAX_PHOTOS} photos per job card`)
  const files = Array.from(fileList || []).filter((f) => f && f.type && f.type.startsWith('image/')).slice(0, room)
  if (!files.length) throw new Error('Choose image files (jpg/png)')
  const added = []
  for (const f of files) {
    added.push(await compressImageFile(f))
  }
  return {
    ...ticket,
    photos: [...current, ...added],
    updatedAt: new Date().toISOString(),
  }
}

export function removePhotoFromTicket(ticket, photoId) {
  return {
    ...ticket,
    photos: listTicketPhotos(ticket).filter((p) => String(p.id) !== String(photoId)),
    updatedAt: new Date().toISOString(),
  }
}

export { MAX_PHOTOS }
