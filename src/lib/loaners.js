import * as db from './db'
import { audit } from './auditLog'

const KEY = 'loaner_devices'

export async function listLoaners() {
  const rows = (await db.getSetting(KEY)) || []
  return Array.isArray(rows) ? rows : []
}

export async function upsertLoaner(row) {
  const rows = await listLoaners()
  const id = row.id || 'ln_' + Date.now().toString(36)
  const next = {
    id,
    label: String(row.label || 'Loaner').trim(),
    type: row.type || 'laptop',
    serial: String(row.serial || '').trim(),
    status: row.status || 'available',
    clientId: row.clientId || null,
    ticketId: row.ticketId || null,
    outAt: row.outAt || null,
    dueBack: row.dueBack || null,
    notes: String(row.notes || '').trim(),
  }
  const idx = rows.findIndex((r) => r.id === id)
  if (idx >= 0) rows[idx] = { ...rows[idx], ...next }
  else rows.push({ ...next, createdAt: new Date().toISOString() })
  await db.setSetting(KEY, rows)
  await audit('loaner.upsert', { id, status: next.status })
  return next
}

export async function checkOutLoaner(id, { clientId, ticketId, dueBack }) {
  const rows = await listLoaners()
  const i = rows.findIndex((r) => r.id === id)
  if (i < 0) throw new Error('Loaner not found')
  rows[i] = {
    ...rows[i],
    status: 'out',
    clientId,
    ticketId: ticketId || null,
    outAt: new Date().toISOString(),
    dueBack: dueBack || null,
  }
  await db.setSetting(KEY, rows)
  await audit('loaner.out', { id, clientId })
  return rows[i]
}

export async function checkInLoaner(id) {
  const rows = await listLoaners()
  const i = rows.findIndex((r) => r.id === id)
  if (i < 0) throw new Error('Loaner not found')
  rows[i] = {
    ...rows[i],
    status: 'available',
    clientId: null,
    ticketId: null,
    outAt: null,
    dueBack: null,
  }
  await db.setSetting(KEY, rows)
  await audit('loaner.in', { id })
  return rows[i]
}
