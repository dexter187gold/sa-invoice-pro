/** Overdue / collection chase messages — dual path ready (wa.me + Cloud) */
import { formatMoney } from './money'
import { toWaNumber } from './share'

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

/** Live demo template (no real client) — shows staff what the link will look like */
export function buildLiveExampleMessage(company = {}) {
  const co = company.name || 'SA Invoice Pro Demo Shop'
  return (
    `Hi Thabo, hope you are well.\n\n` +
    `Friendly reminder from *${co}* regarding invoice *INV-1042* — balance *R1 250.00* (7 days past due).\n\n` +
    `Please arrange payment or reply here if you need a copy / payment details. Thank you.`
  )
}

export function buildJobReadyMessage(ticket, client = {}, company = {}) {
  const name = client.name || ticket.clientName || 'there'
  const co = company.name || 'us'
  const title = ticket.title || ticket.device || 'your device'
  const ref = ticket.number || ticket.id || ''
  return (
    `Hi ${name},\n\n` +
    `Good news from *${co}* — *${title}* is ready for collection` +
    (ref ? ` (job ${ref})` : '') +
    `.\n\nReply to this message if you need directions or a different collection time. Thank you!`
  )
}

export function waMeUrl(phone, text) {
  const wa = toWaNumber(phone)
  if (!wa) return `https://wa.me/?text=${encodeURIComponent(text || '')}`
  return `https://wa.me/${wa}?text=${encodeURIComponent(text || '')}`
}

export function buildChaseList(invoices, clients = [], company = {}) {
  return (invoices || [])
    .filter(isOpenInvoice)
    .map((inv) => {
      const client = (clients || []).find((c) => String(c.id) === String(inv.clientId)) || {}
      const message = buildChaseMessage(inv, client, company)
      const phone = client.phone || inv.clientPhone || ''
      return {
        id: String(inv.id),
        kind: 'invoice',
        inv,
        client,
        phone,
        hasPhone: !!toWaNumber(phone),
        message,
        days: daysPastDue(inv),
        url: waMeUrl(phone, message),
      }
    })
    .sort((a, b) => b.days - a.days)
}

/** Jobs marked ready / completed that still need a collection ping */
export function buildCollectionChaseList(tickets, clients = [], company = {}) {
  const ready = (tickets || []).filter((t) => {
    const s = String(t.status || '').toLowerCase()
    return s.includes('ready') || s === 'completed' || s === 'done' || t.readyForCollection
  })
  return ready
    .map((ticket) => {
      const client = (clients || []).find((c) => String(c.id) === String(ticket.clientId)) || {}
      const phone = client.phone || ticket.clientPhone || ticket.phone || ''
      const message = buildJobReadyMessage(ticket, client, company)
      return {
        id: String(ticket.id),
        kind: 'job',
        ticket,
        client,
        phone,
        hasPhone: !!toWaNumber(phone),
        message,
        days: 0,
        url: waMeUrl(phone, message),
      }
    })
}
