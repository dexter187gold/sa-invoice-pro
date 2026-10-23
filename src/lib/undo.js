/**
 * Soft undo for deletes — keep a short-lived snapshot and restore on demand.
 */
import * as db from './db'

const KEY = 'saip_undo_stack'
const MAX = 8
const TTL_MS = 30_000

function readStack() {
  try {
    const raw = sessionStorage.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    const now = Date.now()
    return (Array.isArray(arr) ? arr : []).filter((x) => now - (x.at || 0) < TTL_MS)
  } catch {
    return []
  }
}

function writeStack(arr) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX)))
  } catch {}
}

export function pushUndo(store, rows, label = 'Deleted') {
  if (!store || !rows?.length) return
  const stack = readStack()
  stack.push({
    id: `u-${Date.now()}`,
    store,
    rows: rows.map((r) => ({ ...r })),
    label,
    at: Date.now(),
  })
  writeStack(stack)
  return stack[stack.length - 1]
}

export function peekUndo() {
  const stack = readStack()
  return stack[stack.length - 1] || null
}

export async function undoLast() {
  const stack = readStack()
  const last = stack.pop()
  if (!last) return { ok: false, reason: 'nothing' }
  writeStack(stack)
  let n = 0
  for (const row of last.rows || []) {
    try {
      await db.put(last.store, row)
      n++
    } catch (e) {
      console.warn('undo restore failed', e)
    }
  }
  return { ok: n > 0, restored: n, label: last.label }
}

export async function deleteWithUndo({ store, rows, removeFn, toast, label }) {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : []
  if (!list.length) return 0
  pushUndo(store, list, label || 'Deleted')
  for (const r of list) {
    if (typeof removeFn === 'function') await removeFn(r.id)
    else await db.remove(store, r.id)
  }
  const msg = list.length === 1 ? `${label || 'Deleted'} — Undo available 30s` : `Deleted ${list.length} — Undo available 30s`
  if (typeof toast === 'function') {
    toast(msg, 'info')
  }
  return list.length
}
