/**
 * Collections desk helpers — promise-to-pay, call log, chase due.
 * ROADMAP_100 #9–10 / P3 money loop.
 */
import * as db from './db'
import { STORES } from './db'

const CALL_LOG_KEY = 'collection_call_log'

function addDays(isoOrDate, days) {
  const d = new Date(isoOrDate || Date.now())
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + (Number(days) || 0))
  return d.toISOString().slice(0, 10)
}

/** Persist promise-to-pay note + next chase date on the invoice row */
export async function setPromiseToPay(inv, { note = '', days = 3, nextChaseDate } = {}) {
  if (!inv?.id) throw new Error('No invoice')
  const next = {
    ...inv,
    promiseNote: String(note || '').trim(),
    promiseAt: new Date().toISOString(),
    nextChaseDate: nextChaseDate || addDays(new Date(), days),
    updatedAt: new Date().toISOString(),
  }
  await db.put(STORES.invoices, next)
  return next
}

export async function clearPromiseToPay(inv) {
  if (!inv?.id) return inv
  const next = {
    ...inv,
    promiseNote: '',
    promiseAt: null,
    nextChaseDate: null,
    updatedAt: new Date().toISOString(),
  }
  await db.put(STORES.invoices, next)
  return next
}

/** Open invoices whose nextChaseDate is on or before today */
export function invoicesDueForChase(invoices = [], today = new Date().toISOString().slice(0, 10)) {
  return (invoices || []).filter((inv) => {
    if (!['unpaid', 'partial', 'overdue'].includes(inv.status || 'unpaid')) return false
    if (!inv.nextChaseDate) return false
    return String(inv.nextChaseDate).slice(0, 10) <= today
  })
}

export async function listCallLog() {
  try {
    const row = await db.get(STORES.settings, CALL_LOG_KEY)
    const v = row?.value
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export async function logCollectionCall({
  invoiceId,
  clientId,
  outcome = 'note',
  note = '',
  who = '',
} = {}) {
  const list = await listCallLog()
  const entry = {
    id: `call-${Date.now().toString(36)}`,
    invoiceId: invoiceId || null,
    clientId: clientId || null,
    outcome: String(outcome || 'note').toLowerCase(),
    note: String(note || '').trim(),
    who: String(who || '').trim(),
    at: new Date().toISOString(),
  }
  list.unshift(entry)
  await db.put(STORES.settings, { key: CALL_LOG_KEY, value: list.slice(0, 500) })
  return entry
}

export async function callLogForClient(clientId) {
  const list = await listCallLog()
  return list.filter((e) => String(e.clientId) === String(clientId))
}

export async function callLogForInvoice(invoiceId) {
  const list = await listCallLog()
  return list.filter((e) => String(e.invoiceId) === String(invoiceId))
}
