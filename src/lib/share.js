
/** Share helpers — WhatsApp, clipboard, job deep links. */

import { formatMoney } from './money'

export function openWhatsApp(phone, text) {
  const digits = String(phone || '').replace(/\D/g, '')
  const msg = encodeURIComponent(text || '')
  if (!digits) {
    window.open('https://wa.me/?text=' + msg, '_blank')
    return
  }
  let n = digits
  if (n.startsWith('0') && n.length === 10) n = '27' + n.slice(1)
  window.open('https://wa.me/' + n + '?text=' + msg, '_blank')
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text || ''))
    return true
  } catch {
    return false
  }
}

export function ticketDeepLink(ticketId, appBase) {
  const base = (appBase || (typeof location !== 'undefined' ? location.origin : '') || '').replace(/\/$/, '')
  if (!ticketId) return base + '/tickets'
  return base + '/tickets?open=' + encodeURIComponent(ticketId)
}

export function openTicketWhatsApp(phone, ticket, company) {
  const link = ticketDeepLink(ticket?.id)
  const name = ticket?.contactName || 'there'
  const co = company?.name || 'us'
  const text = `Hi ${name}, update from *${co}* on job *${ticket?.title || ticket?.number || ''}*.\nOpen job card: ${link}`
  return openWhatsApp(phone, text)
}

/** Build a WhatsApp-shareable dashboard snapshot string. */
export function buildReportSummaryShare(snap, company) {
  const co = company?.name || 'Our business'
  const s = snap || {}
  return [
    `*${co}* — Dashboard snapshot`,
    '',
    `Revenue (paid): ${s.rev ?? '0'}`,
    `Outstanding (AR): ${s.out ?? '0'}`,
    `Collection rate: ${s.collectionRate ?? 0}%`,
    `Expenses: ${s.exp ?? '0'}`,
    `Net: ${s.net ?? '0'}`,
    `Open invoices: ${s.openCount ?? 0}`,
  ].join('\n')
}

/** Build a per-client account statement string for reminders. */
export function buildClientStatement(client, invoices, company) {
  const co = company?.name || 'Our business'
  const name = client?.name || 'there'
  const mine = (invoices || []).filter((i) => String(i.clientId) === String(client?.id))
  const open = mine.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status))
  const totalDue = open.reduce((sum, i) => sum + (Number(i.amountDue ?? i.total) || 0), 0)

  const body = open.length
    ? open
        .map((i) => `• ${i.number || i.id}: ${formatMoney(i.amountDue ?? i.total)} (${i.status})`)
        .join('\n')
    : 'No outstanding invoices.'

  return [
    `Hi ${name}, account update from *${co}*.`,
    '',
    body,
    '',
    `Total outstanding: *${formatMoney(totalDue)}*`,
    '',
    'Please let us know if you have any questions.',
  ].join('\n')
}
