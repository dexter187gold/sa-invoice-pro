/**
 * Business insights helpers (top clients, credit notes, overdue flag).
 */
import * as db from './db'
import { STORES } from './db'

function nextNumber(prefix, existingList) {
  const year = new Date().getFullYear()
  const n = (existingList || []).length + 1
  return `${prefix}-${year}-${String(n).padStart(4, '0')}`
}

export function topClientsByRevenue({ invoices = [], clients = [], payments = [] }, limit = 8) {
  const byClient = {}
  for (const inv of invoices || []) {
    if (inv.isCredit) continue
    const id = String(inv.clientId || '')
    if (!id) continue
    if (!byClient[id]) byClient[id] = { clientId: id, invoiced: 0, paid: 0, open: 0, count: 0 }
    const total = Number(inv.total) || 0
    byClient[id].invoiced += total
    byClient[id].count++
    if (inv.status === 'paid') byClient[id].paid += total
    else if (['unpaid', 'partial', 'overdue'].includes(inv.status || '')) {
      byClient[id].open += Number(inv.amountDue ?? inv.total) || 0
    }
  }
  for (const p of payments || []) {
    const id = String(p.clientId || '')
    if (!id) continue
    if (!byClient[id]) byClient[id] = { clientId: id, invoiced: 0, paid: 0, open: 0, count: 0 }
    byClient[id].paid += Number(p.amount) || 0
  }
  return Object.values(byClient)
    .map((r) => {
      const c = (clients || []).find((x) => String(x.id) === r.clientId)
      return { ...r, name: c?.name || 'Unknown', phone: c?.phone || c?.whatsapp || '' }
    })
    .sort((a, b) => b.paid - a.paid || b.invoiced - a.invoiced)
    .slice(0, limit)
}

export async function createCreditNote(source, { invoices = [], reason = '' } = {}) {
  if (!source || typeof source !== 'object') throw new Error('No invoice for credit note')
  const { id, number, createdAt, updatedAt, amountPaid, amountDue, status, date, dueDate, ...rest } = source
  const total = -(Math.abs(Number(source.total) || 0))
  const exclusive = -(Math.abs(Number(source.exclusive) || 0))
  const vatAmount = -(Math.abs(Number(source.vatAmount) || 0))
  const payload = {
    ...rest,
    number: nextNumber('CN', invoices),
    date: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    status: 'paid',
    isCredit: true,
    creditFor: source.id,
    amountPaid: total,
    amountDue: 0,
    total,
    exclusive,
    vatAmount,
    lines: Array.isArray(source.lines)
      ? source.lines.map((l) => ({
          ...l,
          qty: Number(l.qty) || 1,
          price: -(Math.abs(Number(l.price) || 0)),
        }))
      : [{ description: reason || 'Credit note', qty: 1, price: total }],
    notes: [
      reason || 'Credit note',
      source.number ? `Against invoice ${source.number}` : '',
      source.notes || '',
    ]
      .filter(Boolean)
      .join('\n'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  return db.add(STORES.invoices, payload)
}

export async function flagOverdueInvoices(invoices = []) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let n = 0
  for (const inv of invoices) {
    if (inv.isCredit || ['paid', 'cancelled', 'void', 'overdue'].includes(inv.status)) continue
    const due = inv.dueDate || inv.date
    if (!due) continue
    const d = new Date(String(due).slice(0, 10) + 'T00:00:00')
    if (Number.isNaN(d.getTime()) || d >= today) continue
    await db.put(STORES.invoices, { ...inv, status: 'overdue', updatedAt: new Date().toISOString() })
    n++
  }
  return n
}
