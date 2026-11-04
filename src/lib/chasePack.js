/** Overdue / collection chase messages — dual path ready (wa.me + Cloud) */
import { formatMoney } from './money.js'
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

/** Optional second line: portal URL or “pay online” hint */
function portalPayBit(portalUrl) {
  if (!portalUrl) return ''
  return `\n\nView or pay online: ${portalUrl}`
}

export function buildChaseMessage(inv, client = {}, company = {}, opts = {}) {
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
    `Please arrange payment or reply here if you need a copy / payment details. Thank you.` +
    portalPayBit(opts.portalUrl)
  )
}

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

export function buildChaseList(invoices, clients = [], company = {}, opts = {}) {
  return (invoices || [])
    .filter(isOpenInvoice)
    .map((inv) => {
      const client = (clients || []).find((c) => String(c.id) === String(inv.clientId)) || {}
      const message = buildChaseMessage(inv, client, company, opts)
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

export function buildCollectionChaseList(tickets, clients = [], company = {}) {
  return (tickets || [])
    .filter((t) => ['resolved', 'waiting', 'in_progress'].includes(String(t.status || '')))
    .map((ticket) => {
      const client = (clients || []).find((c) => String(c.id) === String(ticket.clientId)) || {}
      const message = buildJobReadyMessage(ticket, client, company)
      const phone = client.phone || ticket.contactPhone || ''
      return {
        id: String(ticket.id),
        kind: 'job',
        ticket,
        client,
        phone,
        hasPhone: !!toWaNumber(phone),
        message,
        url: waMeUrl(phone, message),
      }
    })
}

export function buildInvoiceReminder(inv, client, company, opts) {
  return buildChaseMessage(inv, client, company, opts)
}
export function buildJobUpdate(ticket, client, company) {
  const name = client?.name || ticket?.contactName || 'there'
  const co = company?.name || 'us'
  const st = ticket?.status || 'in progress'
  return (
    `Hi ${name},\n\n` +
    `Update from *${co}* on *${ticket?.title || ticket?.subject || 'your job'}*: status is now *${st}*.\n\n` +
    `Reply here if you have questions.`
  )
}
export function buildReadyForCollection(ticket, client, company) {
  return buildJobReadyMessage(ticket, client, company)
}
export function buildQuoteFollowUp(quote, client, company) {
  const name = client?.name || 'there'
  const co = company?.name || 'us'
  const num = quote?.number || ''
  return (
    `Hi ${name},\n\n` +
    `Just checking in from *${co}* about quote *${num}*. Happy to adjust scope or answer questions.\n\n` +
    `Reply here when you are ready.`
  )
}
export function buildPaymentThanks(inv, client, company) {
  const name = client?.name || 'there'
  const co = company?.name || 'us'
  const num = inv?.number || ''
  return (
    `Hi ${name},\n\n` +
    `Thank you — *${co}* received your payment` +
    (num ? ` for invoice *${num}*` : '') +
    `. We appreciate your business.`
  )
}
export function buildPortalShare(client, company, url) {
  const name = client?.name || 'there'
  const co = company?.name || 'us'
  return (
    `Hi ${name},\n\n` +
    `*${co}* shared your client portal:\n${url || ''}\n\n` +
    `You can view quotes, accept them, and pay invoices online.`
  )
}
