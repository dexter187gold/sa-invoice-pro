/**
 * Recurring invoices — templates that spawn drafts on a schedule.
 * Stored in settings key `recurring_invoices` as JSON array.
 */
import * as db from './db'
import { STORES } from './db'
import { invoiceTotals } from './money'

const KEY = 'recurring_invoices'

function nextNumber(prefix, existingList) {
  const year = new Date().getFullYear()
  const n = (existingList || []).length + 1
  return `${prefix}-${year}-${String(n).padStart(4, '0')}`
}

export async function listRecurring() {
  try {
    const row = await db.get(STORES.settings, KEY)
    const v = row?.value
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export async function saveRecurring(list) {
  await db.put(STORES.settings, { key: KEY, value: list })
  return list
}

export async function upsertRecurring(template) {
  const list = await listRecurring()
  const id = template.id || `rec-${Date.now().toString(36)}`
  const row = {
    id,
    clientId: template.clientId,
    lines: Array.isArray(template.lines) ? template.lines : [{ description: template.description || 'Retainer', qty: 1, price: Number(template.amount) || 0 }],
    cadence: template.cadence || 'monthly',
    dayOfMonth: Number(template.dayOfMonth) || 1,
    nextRun: template.nextRun || nextRunDate(template.cadence || 'monthly', template.dayOfMonth || 1),
    active: template.active !== false,
    notes: template.notes || '',
    vatEnabled: template.vatEnabled !== false,
    createdAt: template.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const idx = list.findIndex((x) => x.id === id)
  if (idx >= 0) list[idx] = { ...list[idx], ...row }
  else list.push(row)
  await saveRecurring(list)
  return row
}

export async function removeRecurring(id) {
  const list = (await listRecurring()).filter((x) => x.id !== id)
  await saveRecurring(list)
  return list
}

export function nextRunDate(cadence, dayOfMonth = 1, from = new Date()) {
  const d = new Date(from)
  d.setHours(12, 0, 0, 0)
  if (cadence === 'weekly') {
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  }
  if (cadence === 'quarterly') {
    d.setMonth(d.getMonth() + 3)
    d.setDate(Math.min(dayOfMonth, 28))
    return d.toISOString().slice(0, 10)
  }
  d.setMonth(d.getMonth() + 1)
  d.setDate(Math.min(dayOfMonth, 28))
  return d.toISOString().slice(0, 10)
}

export async function runDueRecurring({ invoices = [], vatRate = 0.15, vatEnabled = true } = {}) {
  const list = await listRecurring()
  const today = new Date().toISOString().slice(0, 10)
  const created = []
  let nextList = [...list]

  for (const t of list) {
    if (!t.active || !t.nextRun || t.nextRun > today) continue
    const lines = (t.lines || []).map((l) => ({ ...l }))
    const totals = invoiceTotals(lines, vatRate, t.vatEnabled !== false && vatEnabled)
    const payload = {
      clientId: t.clientId,
      number: nextNumber('INV', [...invoices, ...created]),
      date: today,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      status: 'unpaid',
      lines,
      notes: t.notes || `Recurring (${t.cadence})`,
      amountPaid: 0,
      amountDue: totals.total,
      total: totals.total,
      exclusive: totals.exclusive,
      vatAmount: totals.vat,
      recurringId: t.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const inv = await db.add(STORES.invoices, payload)
    created.push(inv)
    nextList = nextList.map((x) =>
      x.id === t.id
        ? { ...x, nextRun: nextRunDate(t.cadence, t.dayOfMonth || 1, new Date(t.nextRun)), lastRun: today, updatedAt: new Date().toISOString() }
        : x
    )
  }
  if (created.length) await saveRecurring(nextList)
  return { created: created.length, invoices: created }
}
