/** Shareable job status card for WhatsApp (P10.5). */
import { ticketDeepLink } from './share'

export function buildJobHologram(ticket, company = {}) {
  const co = company.name || 'Workshop'
  const title = ticket?.title || ticket?.number || 'Job'
  const st = ticket?.status || 'open'
  const device = [ticket?.passport?.brand, ticket?.passport?.model].filter(Boolean).join(' ')
    || ticket?.devices || ''
  const link = ticketDeepLink(ticket?.id)
  return [
    `◈ ${co.toUpperCase()} · JOB STATUS`,
    `────────────────`,
    `📋 ${title}`,
    device ? `📱 ${device}` : null,
    `🔖 Status: *${st}*`,
    ticket?.contactName ? `👤 ${ticket.contactName}` : null,
    `────────────────`,
    `Open card: ${link}`,
  ].filter(Boolean).join('\n')
}

export async function shareJobHologram(ticket, company, phone) {
  const text = buildJobHologram(ticket, company)
  const { openWhatsApp, copyText } = await import('./share')
  if (phone) openWhatsApp(phone, text)
  else await copyText(text)
  return text
}
