/**
 * OPFS storage for large job/invoice media blobs.
 * Small previews stay as data URLs in IndexedDB; full files live on disk when OPFS is available.
 */
const DIR = 'saip-media'

export async function mediaOpfsAvailable() {
  try {
    return !!(typeof navigator !== 'undefined' && navigator.storage?.getDirectory)
  } catch {
    return false
  }
}

async function mediaDir() {
  const root = await navigator.storage.getDirectory()
  return root.getDirectoryHandle(DIR, { create: true })
}

function safeName(id, name) {
  const base = String(id || crypto.randomUUID()).replace(/[^\w.-]+/g, '_')
  const ext = String(name || '').split('.').pop() || 'bin'
  return `${base}.${ext}`.slice(0, 120)
}

/** Write ArrayBuffer/Blob → OPFS; returns path ref */
export async function writeMediaBlob(id, blob, fileName = 'file.bin') {
  if (!(await mediaOpfsAvailable())) return null
  const dir = await mediaDir()
  const name = safeName(id, fileName)
  const fh = await dir.getFileHandle(name, { create: true })
  const w = await fh.createWritable()
  try {
    await w.write(blob)
  } finally {
    await w.close()
  }
  return { opfs: true, path: `${DIR}/${name}`, name, size: blob.size || 0 }
}

export async function readMediaBlob(pathOrName) {
  if (!(await mediaOpfsAvailable())) return null
  const name = String(pathOrName).split('/').pop()
  const dir = await mediaDir()
  const fh = await dir.getFileHandle(name)
  return fh.getFile()
}

export async function removeMediaBlob(pathOrName) {
  if (!(await mediaOpfsAvailable())) return
  try {
    const name = String(pathOrName).split('/').pop()
    const dir = await mediaDir()
    await dir.removeEntry(name)
  } catch {}
}

/** Object URL for display; caller should revoke when done */
export async function mediaObjectUrl(pathOrName) {
  const file = await readMediaBlob(pathOrName)
  if (!file) return null
  return URL.createObjectURL(file)
}
