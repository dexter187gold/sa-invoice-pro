/** Share helpers — WhatsApp, clipboard, job deep links. */

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
