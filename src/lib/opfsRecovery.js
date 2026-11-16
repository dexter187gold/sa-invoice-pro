/**
 * OPFS helpers for large recovery snapshots (roadmap A1).
 * Metadata stays in IndexedDB; bulky payload lives on disk when supported.
 */
const DIR = 'saip-recovery-snapshots'

export async function opfsAvailable() {
  try {
    return !!(navigator?.storage?.getDirectory)
  } catch {
    return false
  }
}

async function recoveryDir() {
  const root = await navigator.storage.getDirectory()
  return root.getDirectoryHandle(DIR, { create: true })
}

export async function writeOpfsPayload(id, dataObj) {
  if (!(await opfsAvailable())) return null
  const dir = await recoveryDir()
  const name = `${String(id).replace(/[^\w.-]+/g, '_')}.json`
  const fh = await dir.getFileHandle(name, { create: true })
  const w = await fh.createWritable()
  try {
    await w.write(JSON.stringify(dataObj))
  } finally {
    await w.close()
  }
  return { opfs: true, path: `${DIR}/${name}` }
}

export async function readOpfsPayload(pathOrName) {
  if (!(await opfsAvailable())) return null
  const name = String(pathOrName).split('/').pop()
  const dir = await recoveryDir()
  const fh = await dir.getFileHandle(name)
  const file = await fh.getFile()
  const text = await file.text()
  return JSON.parse(text)
}

export async function removeOpfsPayload(pathOrName) {
  if (!(await opfsAvailable())) return
  try {
    const name = String(pathOrName).split('/').pop()
    const dir = await recoveryDir()
    await dir.removeEntry(name)
  } catch {}
}
