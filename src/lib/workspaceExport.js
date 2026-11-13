/**
 * Full workspace export — JSON pack + optional ZIP (store method, no deps).
 */
import * as db from './db.js'

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2500)
}

export async function buildWorkspacePack() {
  const data = await db.exportAll()
  const stamp = new Date().toISOString().slice(0, 10)
  const meta = {
    app: 'SA Invoice Pro',
    kind: 'workspace-pack',
    exportedAt: new Date().toISOString(),
    version: 1,
    counts: Object.fromEntries(
      Object.entries(data || {}).map(([k, v]) => [k, Array.isArray(v) ? v.length : v ? 1 : 0]),
    ),
  }
  return { meta, data, stamp }
}

/** Download single JSON workspace file (always works). */
export async function downloadWorkspaceJson() {
  const { meta, data, stamp } = await buildWorkspacePack()
  const payload = { ...meta, data }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `sa-invoice-workspace-${stamp}.json`)
  return { filename: `sa-invoice-workspace-${stamp}.json`, counts: meta.counts }
}

/** CRC32 for ZIP local headers */
function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function u16(n) {
  const b = new Uint8Array(2)
  b[0] = n & 255
  b[1] = (n >>> 8) & 255
  return b
}
function u32(n) {
  const b = new Uint8Array(4)
  b[0] = n & 255
  b[1] = (n >>> 8) & 255
  b[2] = (n >>> 16) & 255
  b[3] = (n >>> 24) & 255
  return b
}

function concat(parts) {
  const len = parts.reduce((s, p) => s + p.length, 0)
  const out = new Uint8Array(len)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

/** Build an uncompressed ZIP (method 0). */
export function buildZipStore(files) {
  const encoder = new TextEncoder()
  const locals = []
  const centrals = []
  let offset = 0

  for (const f of files) {
    const nameBytes = encoder.encode(f.name)
    const data = typeof f.data === 'string' ? encoder.encode(f.data) : f.data
    const crc = crc32(data)
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
      data,
    ])
    const central = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ])
    locals.push(local)
    centrals.push(central)
    offset += local.length
  }

  const centralDir = concat(centrals)
  const end = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ])
  return concat([...locals, centralDir, end])
}

/** Download workspace as ZIP with manifest + data JSON. */
export async function downloadWorkspaceZip() {
  const { meta, data, stamp } = await buildWorkspacePack()
  const files = [
    { name: 'manifest.json', data: JSON.stringify(meta, null, 2) },
    { name: 'workspace.json', data: JSON.stringify(data) },
    {
      name: 'README.txt',
      data:
        'SA Invoice Pro workspace export\n' +
        `Exported: ${meta.exportedAt}\n` +
        'Restore via Settings → Import backup JSON (use workspace.json or single-file JSON export).\n',
    },
  ]
  const zipBytes = buildZipStore(files)
  const blob = new Blob([zipBytes], { type: 'application/zip' })
  const filename = `sa-invoice-workspace-${stamp}.zip`
  downloadBlob(blob, filename)
  return { filename, counts: meta.counts }
}
