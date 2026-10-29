/**
 * WhatsApp suggested replies for SA Invoice Pro (P7).
 * Pure helpers — open wa.me with pre-filled ZA-tone messages.
 * Tone: friendly, clear, English-first with short Afrikaans options.
 */
import { formatMoney } from './money'
import { buildChaseMessage } from './chasePack'

function clientName(client = {}, fallback = 'there') {
  return client.name || client.fullName || fallback
}

function shopName(company = {}) {
  return company.name || company.tradingName || 'the shop'
}

function deviceLabel(job = {}) {
  return job.devices || job.passport?.model || job.title || 'device'
}

function waLink(phone, text) {
  const clean = String(phone || '').replace(/\D/g, '')
  if (!clean) return ''
  const num = clean.startsWith('0') ? '27' + clean.slice(1) : clean
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
}

export function suggestReplies({ type = 'general', job, invoice, client = {}, company = {} } = {}) {
  const name = clientName(client)
  const shop = shopName(company)
  const device = deviceLabel(job)
  const replies = []

  if (type === 'job_status' && job) {
    const status = String(job.status || 'open').toLowerCase()
    if (status.includes('ready') || status === 'resolved' || status === 'collected') {
      replies.push({
        label: 'Ready for collection',
        text: `Hi ${name}, hope you are well.\n\nYour *${device}* is ready for collection at *${shop}*.\n\nPlease bring ID and the job reference. See you soon!`,
        af: `Hi ${name}, jou *${device}* is gereed vir afhaal by *${shop}*. Sien jou binnekort!`,
      })
    } else if (status.includes('parts') || status.includes('waiting')) {
      replies.push({
        label: 'Waiting on parts',
        text: `Hi ${name}, quick update on your *${device}*.\n\nWe are still waiting on the part. I will WhatsApp the moment it arrives and we start the repair.\n\nAny questions, just reply.`,
        af: `Hi ${name}, ons wag nog op die onderdeel vir jou *${device}*. Ek stuur 'n WhatsApp sodra dit hier is.`,
      })
    } else {
      replies.push({
        label: 'Status update',
        text: `Hi ${name}, hope you are well.\n\nQuick update on your *${device}* at *${shop}*: we are busy with the repair. I will keep you posted.\n\nReply if you need anything.`,
        af: `Hi ${name}, ons is besig met jou *${device}* by *${shop}*. Ek hou jou op hoogte.`,
      })
    }
  }

  if (type === 'invoice' && invoice) {
    const bal = Number(invoice.amountDue ?? invoice.balance ?? invoice.total) || 0
    replies.push({
      label: 'Invoice / payment',
      text: buildChaseMessage(invoice, client, company),
      af: `Hi ${name}, vriendelike herinnering aan faktuur *${invoice.number || ''}* — balans *${formatMoney(bal)}*. Dankie!`,
    })
    replies.push({
      label: 'Payment details',
      text: `Hi ${name}, here are the payment details for invoice *${invoice.number || ''}* (${formatMoney(bal)}).\n\nBank: ${company.bankName || 'see invoice'}\nAccount: ${company.accountNumber || 'on the PDF'}\n\nPlease use the invoice number as reference. Thank you!`,
    })
  }

  if (type === 'quote') {
    replies.push({
      label: 'Quote follow-up',
      text: `Hi ${name}, hope you are well.\n\nJust following up on the quote for your *${device}*. Let me know if you would like to go ahead or if you have any questions.\n\nThank you!`,
      af: `Hi ${name}, ek volg net op die kwotasie vir jou *${device}*. Laat weet as jy wil voortgaan.`,
    })
  }

  // Always include a general open reply
  replies.push({
    label: 'General reply',
    text: `Hi ${name}, thanks for the message.\n\nHow can I help you today at *${shop}*?`,
    af: `Hi ${name}, dankie vir die boodskap. Hoe kan ek help?`,
  })

  return replies.map((r) => ({
    ...r,
    wa: waLink(client.phone || client.mobile || '', r.text),
    waAf: r.af ? waLink(client.phone || client.mobile || '', r.af) : '',
  }))
}

export function openWhatsApp(phone, text) {
  const url = waLink(phone, text)
  if (url && typeof window !== 'undefined') window.open(url, '_blank')
  return url
}
