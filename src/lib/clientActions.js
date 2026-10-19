import * as db from './db.js'
import { STORES } from './db.js'

export async function archiveClient(clientId, archived = true) {
  const c = await db.get(STORES.clients, clientId)
  if (!c) throw new Error('Client not found')
  const next = { ...c, archived: !!archived, updatedAt: new Date().toISOString() }
  await db.put(STORES.clients, next)
  return next
}

export async function tagClient(clientId, tags) {
  const c = await db.get(STORES.clients, clientId)
  if (!c) throw new Error('Client not found')
  const list = Array.isArray(tags) ? tags : String(tags || '').split(',').map((t) => t.trim()).filter(Boolean)
  const next = { ...c, tags: list, updatedAt: new Date().toISOString() }
  await db.put(STORES.clients, next)
  return next
}

export async function mergeClients(keepId, dropId) {
  if (String(keepId) === String(dropId)) throw new Error('Cannot merge a client into itself')
  const keep = await db.get(STORES.clients, keepId)
  const drop = await db.get(STORES.clients, dropId)
  if (!keep || !drop) throw new Error('Both clients must exist')

  const reassign = async (store) => {
    const rows = (await db.getAll(store)) || []
    for (const row of rows) {
      if (String(row.clientId) === String(dropId)) {
        await db.put(store, { ...row, clientId: keepId, updatedAt: new Date().toISOString() })
      }
    }
  }
  await reassign(STORES.invoices)
  await reassign(STORES.quotes)
  await reassign(STORES.tickets)
  await reassign(STORES.payments)

  const merged = {
    ...keep,
    email: keep.email || drop.email,
    phone: keep.phone || drop.phone,
    address: keep.address || drop.address,
    company: keep.company || drop.company,
    vatNumber: keep.vatNumber || drop.vatNumber,
    notes: [keep.notes, drop.notes, `Merged from ${drop.name || dropId}`].filter(Boolean).join('\n'),
    tags: [...new Set([...(keep.tags || []), ...(drop.tags || [])])],
    updatedAt: new Date().toISOString(),
  }
  await db.put(STORES.clients, merged)
  await db.remove(STORES.clients, dropId)
  return merged
}

export function clientBalance(clientId, invoices = [], payments = []) {
  const invs = invoices.filter((i) => String(i.clientId) === String(clientId))
  const total = invs.reduce((s, i) => s + (Number(i.total) || 0), 0)
  const paid = payments
    .filter((p) => invs.some((i) => String(i.id) === String(p.invoiceId)))
    .reduce((s, p) => s + (Number(p.amount) || 0), 0)
  return { total, paid, due: Math.max(0, total - paid), invoiceCount: invs.length }
}
