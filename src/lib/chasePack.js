/** Overdue / collection chase messages (P3) — ZA tone */
import { formatMoney } from './money'

export function isOpenInvoice(inv) {
  return ['unpaid', 'partial', 'overdue'].includes(String(inv?.status || 'unpaid'))
}

export function daysPastDue(inv, now = Date.now()) {
  if (!inv?.dueDate) return 0
  const d = new Date(inv.dueDate).getTime()
  if (Number.isNaN(d)) return 0
  return Math.max(0, Math.floor((now - d) / 86400000))
}

export function buildChaseMessage(inv, client = {}, company = {}) {
  const name = client.name || inv.clientName || 'there'
  const co = company.name || 'us'
  const num = inv.number || inv.id || ''
  // Split so Rollup does not see ?? mixed with || in one expression
  const rawBal = inv.amountDue ?? inv.balance ?? (Number(inv.total || 0) - Number(inv.amountPaid || 0))
  const bal = Number(rawBal) || 0
  const age = daysPastDue(inv)
  const ageBit = age > 0 ? ` (${age} day${age === 1 ? '' : 's'} past due)` : ''
  return (
    `Hi ${name}, hope you are well.\n\n` +
    `Friendly reminder from *${co}* regarding invoice *${num}* — balance *${formatMoney(bal)}*${ageBit}.\n\n` +
    `Please arrange payment or reply here if you need a copy / payment details. Thank you.`
  )
}

export function buildChaseList(invoices, clients = [], company = {}) {
  return (invoices || [])
    .filter(isOpenInvoice)
    .map((inv) => {
      const client = (clients || []).find((c) => String(c.id) === String(inv.clientId)) || {}
      return {
        inv,
        client,
        phone: client.phone || inv.clientPhone || '',
        message: buildChaseMessage(inv, client, company),
        days: daysPastDue(inv),
      }
    })
    .sort((a, b) => b.days - a.days)
}
