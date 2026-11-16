/**
 * Low-memory streaming company backup import.
 * Reads via File.stream() + TextDecoder, extracts store records with a
 * brace-aware scanner, and never materialises the full workspace object.
 *
 * Protected stores (users, autoBackups, accountWorkspaces, importStaging)
 * are never written by the importer — the staged swap in db.js also skips them.
 */

const WRAPPER_KEYS = new Set(['data', 'workspace', 'stores', 'backup', 'payload', 'export', 'dump', 'body'])

/** Known workspace store names that appear as top-level arrays (or company object). */
export function workspaceStoreNames(storeMap) {
  return Object.keys(storeMap || {}).filter(
    (k) => !['users', 'autoBackups', 'accountWorkspaces', 'importStaging'].includes(k),
  )
}

/**
 * Scan UTF-8 text chunks and emit complete top-level JSON objects for each
 * recognised store array. Handles strings, escapes, and nested braces.
 *
 * @param {AsyncIterable<string>|ReadableStreamDefaultReader} textSource
 * @param {{ storeNames: string[], onRecord: (storeKey: string, row: object) => Promise<void>|void, onProgress?: Function, signal?: AbortSignal }} opts
 */
export async function streamWorkspaceRecords(textSource, opts) {
  const { storeNames, onRecord, onProgress, signal } = opts
  const nameByLower = new Map(storeNames.map((s) => [s.toLowerCase(), s]))

  let buf = ''
  let i = 0
  let totalEmitted = 0
  let bytesRead = 0

  const report = (phase, message, extra = {}) => {
    try {
      onProgress?.({ phase, message, rows: totalEmitted, bytes: bytesRead, ...extra })
    } catch {}
  }

  const ensure = async (need) => {
    while (buf.length - i < need) {
      if (signal?.aborted) throw new DOMException('Backup import cancelled', 'AbortError')
      let chunk = null
      if (typeof textSource.read === 'function') {
        const r = await textSource.read()
        if (r.done) break
        chunk = r.value
      } else if (textSource[Symbol.asyncIterator]) {
        const next = await textSource.next()
        if (next.done) break
        chunk = next.value
      } else {
        break
      }
      if (chunk == null) break
      const s = typeof chunk === 'string' ? chunk : String(chunk)
      bytesRead += s.length
      if (i > 256_000) {
        buf = buf.slice(i)
        i = 0
      }
      buf += s
    }
  }

  const peek = () => (i < buf.length ? buf[i] : '')
  const skipWs = async () => {
    for (;;) {
      await ensure(1)
      if (i >= buf.length) return
      const c = buf[i]
      if (c === ' ' || c === '\n' || c === '\r' || c === '\t') i++
      else return
    }
  }

  const readString = async () => {
    await ensure(2)
    if (buf[i] !== '"') throw new Error('Expected string in backup JSON')
    i++
    let out = ''
    for (;;) {
      await ensure(1)
      if (i >= buf.length) throw new Error('Truncated string in backup JSON')
      const c = buf[i++]
      if (c === '\\') {
        await ensure(1)
        if (i >= buf.length) throw new Error('Truncated escape in backup JSON')
        const e = buf[i++]
        if (e === 'u') {
          await ensure(4)
          out += String.fromCharCode(parseInt(buf.slice(i, i + 4), 16) || 0)
          i += 4
        } else if (e === 'n') out += '\n'
        else if (e === 'r') out += '\r'
        else if (e === 't') out += '\t'
        else if (e === 'b') out += '\b'
        else if (e === 'f') out += '\f'
        else out += e
      } else if (c === '"') {
        return out
      } else {
        out += c
      }
    }
  }

  const readValueRaw = async () => {
    await skipWs()
    await ensure(1)
    if (i >= buf.length) throw new Error('Unexpected end of backup JSON')
    const start = i
    const c = buf[i]
    if (c === '"') {
      await readString()
      return buf.slice(start, i)
    }
    if (c === '{' || c === '[') {
      const open = c
      const close = c === '{' ? '}' : ']'
      let depth = 0
      let inStr = false
      let esc = false
      for (;;) {
        await ensure(1)
        if (i >= buf.length) throw new Error('Truncated object/array in backup JSON')
        const ch = buf[i++]
        if (inStr) {
          if (esc) esc = false
          else if (ch === '\\') esc = true
          else if (ch === '"') inStr = false
          continue
        }
        if (ch === '"') {
          inStr = true
          continue
        }
        if (ch === open) depth++
        else if (ch === close) {
          depth--
          if (depth === 0) return buf.slice(start, i)
        }
      }
    }
    while (i < buf.length || (await ensure(1), i < buf.length)) {
      const ch = buf[i]
      if (/[,\}\]\s]/.test(ch)) break
      i++
    }
    return buf.slice(start, i)
  }

  const tryParseRow = (raw) => {
    try {
      const v = JSON.parse(raw)
      return v && typeof v === 'object' && !Array.isArray(v) ? v : null
    } catch {
      return null
    }
  }

  const consumeObjectArray = async (canonicalStore) => {
    await skipWs()
    await ensure(1)
    if (peek() !== '[') {
      if (peek() === '{') {
        const raw = await readValueRaw()
        const row = tryParseRow(raw)
        if (row) {
          await onRecord(canonicalStore, row)
          totalEmitted++
        }
        return
      }
      await readValueRaw()
      return
    }
    i++
    for (;;) {
      await skipWs()
      await ensure(1)
      if (i >= buf.length) throw new Error(`Truncated array for store "${canonicalStore}"`)
      if (peek() === ']') {
        i++
        return
      }
      if (peek() === ',') {
        i++
        continue
      }
      const raw = await readValueRaw()
      const row = tryParseRow(raw)
      if (row) {
        await onRecord(canonicalStore, row)
        totalEmitted++
        if (totalEmitted % 50 === 0) {
          report('staging', `Importing ${canonicalStore}…`, { percent: Math.min(80, 10 + (totalEmitted % 500) / 10) })
        }
      }
      await skipWs()
      if (peek() === ',') i++
    }
  }

  const consumeObject = async (depth = 0) => {
    await skipWs()
    await ensure(1)
    if (peek() !== '{') throw new Error('Backup must start with a JSON object')
    i++
    for (;;) {
      await skipWs()
      await ensure(1)
      if (i >= buf.length) throw new Error('Truncated backup JSON object')
      if (peek() === '}') {
        i++
        return
      }
      if (peek() === ',') {
        i++
        continue
      }
      if (peek() !== '"') throw new Error('Expected property name in backup JSON')
      const key = await readString()
      await skipWs()
      await ensure(1)
      if (peek() !== ':') throw new Error(`Expected ':' after key "${key}"`)
      i++
      await skipWs()

      const lower = key.toLowerCase()
      if (nameByLower.has(lower)) {
        await consumeObjectArray(nameByLower.get(lower))
      } else if (WRAPPER_KEYS.has(lower) && depth < 4) {
        await ensure(1)
        if (peek() === '{') await consumeObject(depth + 1)
        else if (peek() === '[') {
          i++
          for (;;) {
            await skipWs()
            if (peek() === ']') {
              i++
              break
            }
            if (peek() === ',') {
              i++
              continue
            }
            if (peek() === '{') await consumeObject(depth + 1)
            else await readValueRaw()
          }
        } else await readValueRaw()
      } else {
        await readValueRaw()
      }
      await skipWs()
      if (peek() === ',') i++
    }
  }

  report('reading', 'Streaming backup file…', { percent: 5 })
  await consumeObject(0)
  report('staging', 'Stream parse complete', { percent: 85, rows: totalEmitted })
  return { rows: totalEmitted, bytes: bytesRead }
}

/**
 * Decode a File/Blob as an async text stream (UTF-8, handles split multi-byte chars).
 */
export async function* fileTextChunks(file, { signal } = {}) {
  if (!file || typeof file.stream !== 'function') {
    const t = await file.text()
    yield t
    return
  }
  const reader = file.stream().getReader()
  const decoder = new TextDecoder('utf-8')
  try {
    for (;;) {
      if (signal?.aborted) throw new DOMException('Backup import cancelled', 'AbortError')
      const { done, value } = await reader.read()
      if (done) {
        const tail = decoder.decode()
        if (tail) yield tail
        break
      }
      yield decoder.decode(value, { stream: true })
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {}
  }
}
