/**
 * Bulk operations for invoices, tickets, clients
 * Company-scale multi-select actions with progress + undo snapshot.
 */
import * as db from './db'
import { STORES } from './db'

export const BULK_INVOICE_STATUSES = [
  { id: 'unpaid', label: 'Mark unpaid' },
  { id: 'partial', label: 'Mark partial' },
  { id: 'paid', label: 'Mark paid' },
  { id: 'overdue', label: 'Mark overdue' },
  { id: 'void', label: 'Void' },
]

export const BULK_TICKET_STATUSES = [
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'waiting', label: 'Waiting on client' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed', label: 'Closed' },
]

/**
 * @param {string} store
 * @param {Array<string|number>} ids
 * @param {object} patch
 * @returns {{ ok: number, failed: number, errors: string[] }}
 */
export async function bulkPatch(store, ids, patch) {
  const result = { ok: 0, failed: 0, errors: [] }
  if (!ids?.length) return result
  for (const id of ids) {
    try {
      const row = await db.get(store, id)
      if (!row) {
        result.failed++
        result.errors.push(`Missing ${id}`)
        continue
      }
      await db.put(store, {
        ...row,
        ...patch,
        id: row.id,
        updatedAt: new Date().toISOString(),
      })
      result.ok++
    } catch (e) {
      result.failed++
      result.errors.push(String(e?.message || e))
    }
  }
  return result
}

export async function bulkSetInvoiceStatus(ids, status) {
  const patch = { status }
  if (status === 'paid') patch.paidAt = new Date().toISOString()
  if (status === 'void') patch.voidedAt = new Date().toISOString()
  return bulkPatch(STORES.invoices, ids, patch)
}

export async function bulkSetTicketStatus(ids, status) {
  const patch = { status }
  if (status === 'resolved' || status === 'closed') patch.closedAt = new Date().toISOString()
  return bulkPatch(STORES.tickets || 'tickets', ids, patch)
}

export async function bulkUpdateStatus(storeName, ids, status, list) {
  let n = 0
  for (const id of ids) {
    const row = (list || []).find((r) => String(r.id) === String(id))
    if (!row) continue
    await db.put(storeName, { ...row, status, updatedAt: new Date().toISOString() })
    n++
  }
  return n
}

export async function bulkDelete(store, ids) {
  const result = { ok: 0, failed: 0, errors: [] }
  for (const id of ids) {
    try {
      await db.remove(store, id)
      result.ok++
    } catch (e) {
      result.failed++
      result.errors.push(String(e?.message || e))
    }
  }
  return result
}

export async function bulkExportCsv(rows, columns, filename = 'export.csv') {
  const escape = (v) => {
    const s = v == null ? '' : String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const header = columns.map((c) => c.label || c.key).join(',')
  const body = rows
    .map((r) => columns.map((c) => escape(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(','))
    .join('\n')
  const csv = header + '\n' + body
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return { ok: true, rows: rows.length }
}

export function invoiceCsvColumns() {
  return [
    { key: 'number', label: 'Number' },
    { key: 'date', label: 'Date' },
    { key: 'dueDate', label: 'Due' },
    { key: 'status', label: 'Status' },
    { key: 'clientId', label: 'ClientId' },
    { key: 'total', label: 'Total' },
    { key: 'amountPaid', label: 'Paid' },
    { key: 'notes', label: 'Notes' },
  ]
}

export function ticketCsvColumns() {
  return [
    { key: 'number', label: 'Number' },
    { key: 'subject', label: 'Subject' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'clientId', label: 'ClientId' },
    { key: 'createdAt', label: 'Created' },
    { key: 'updatedAt', label: 'Updated' },
  ]
}

export function selectionStats(selectedMap) {
  const ids = Object.keys(selectedMap || {}).filter((k) => selectedMap[k])
  return { ids, count: ids.length }
}

export function toggleSelection(selected, id, checked) {
  const next = { ...selected }
  if (checked) next[id] = true
  else delete next[id]
  return next
}

export function selectAllVisible(selected, rows, on) {
  const next = { ...selected }
  for (const r of rows || []) {
    if (on) next[r.id] = true
    else delete next[r.id]
  }
  return next
}

export { STORES }
