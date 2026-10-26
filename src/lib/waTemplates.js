/**
 * EN / AF WhatsApp templates for SA workshops.
 */
export const LANGS = [
  { id: 'en', label: 'English' },
  { id: 'af', label: 'Afrikaans' },
]

function money(n) {
  try {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(n) || 0)
  } catch {
    return 'R' + (Number(n) || 0).toFixed(2)
  }
}

export function invoiceReminder(inv, client, company, lang = 'en') {
  const name = (client?.name || '').split(' ')[0] || (lang === 'af' ? 'daar' : 'there')
  const co = company?.name || 'SA Invoice Pro'
  const num = inv?.number || 'invoice'
  const bal = money(inv?.amountDue != null ? inv.amountDue : inv?.total)
  if (lang === 'af') {
    return `Hallo ${name}, vriendelike herinnering van *${co}*: faktuur *${num}* het 'n uitstaande balans van *${bal}*. Stuur asseblief bewys van betaling of vra vir bankbesonderhede hier. Dankie!`
  }
  return `Hi ${name}, friendly reminder from *${co}*: invoice *${num}* has an outstanding balance of *${bal}*. Please send proof of payment or reply here for banking details. Thank you!`
}

export function jobUpdate(ticket, company, lang = 'en') {
  const name = ticket?.contactName?.split(' ')[0] || (lang === 'af' ? 'daar' : 'there')
  const co = company?.name || 'SA Invoice Pro'
  const title = ticket?.title || ticket?.subject || 'job'
  const st = ticket?.status || 'open'
  if (lang === 'af') {
    return `Hallo ${name}, opdatering van *${co}* op jou werk *${title}*:\nStatus: *${st}*${ticket?.workDone ? `\nWerk gedoen: ${ticket.workDone}` : ''}\nOns hou jou op hoogte.`
  }
  return `Hi ${name}, update from *${co}* on your job *${title}*:\nStatus: *${st}*${ticket?.workDone ? `\nWork done: ${ticket.workDone}` : ''}\nWe'll keep you posted.`
}

export function portalShare(client, company, url, lang = 'en') {
  const name = (client?.name || '').split(' ')[0] || (lang === 'af' ? 'daar' : 'there')
  const co = company?.name || 'us'
  if (lang === 'af') {
    return `Hallo ${name}, bekyk jou fakture aanlyn vir *${co}*: ${url}`
  }
  return `Hi ${name}, view your invoices online for *${co}*: ${url}`
}

export function bulkArSummary(rows, company, lang = 'en') {
  const co = company?.name || 'SA Invoice Pro'
  const total = rows.reduce((s, r) => s + (Number(r.amountDue != null ? r.amountDue : r.total) || 0), 0)
  if (lang === 'af') {
    return `Hallo, vriendelike opsomming van *${co}*: ${rows.length} oop faktuur(e), totaal *${money(total)}*. Antwoord vir PDF of bankbesonderhede. Dankie!`
  }
  return `Hi, friendly summary from *${co}*: ${rows.length} open invoice(s), total *${money(total)}*. Reply for PDF or banking details. Thank you!`
}

export function readyForCollection(ticket, client, company, lang = 'en') {
  const co = company?.name || 'us'
  const name = (client?.name || ticket?.contactName || '').split(' ')[0] || (lang === 'af' ? 'daar' : 'there')
  const job = ticket?.title || ticket?.number || (lang === 'af' ? 'jou toestel' : 'your device')
  if (lang === 'af') {
    return `Hallo ${name}, goeie nuus van *${co}*: *${job}* is reg vir afhaal. Bring ID asseblief. Dankie!`
  }
  return `Hi ${name}, good news from *${co}*: *${job}* is ready for collection. Please bring ID. Thank you!`
}

export function quoteFollowUp(quote, client, company) {
  const co = company?.name || 'us'
  const name = (client?.name || '').split(' ')[0] || 'there'
  const num = quote?.number || ''
  const total = Number(quote?.total) || 0
  return `Hi ${name}, following up on quote *${num}* from *${co}* (R${total.toFixed(2)}). Happy to adjust scope or start the job — reply here.`
}

export function paymentThanks(inv, client, company, amount) {
  const co = company?.name || 'us'
  const name = (client?.name || '').split(' ')[0] || 'there'
  const amt = Number(amount != null ? amount : inv?.amountPaid) || 0
  return `Hi ${name}, *${co}* confirms payment of R${amt.toFixed(2)} on invoice *${inv?.number || ''}*. Thank you!`
}

export const WA_TEMPLATE_CATALOG = [
  { id: 'invoice_reminder', label: 'Invoice reminder', build: 'invoiceReminder' },
  { id: 'job_update', label: 'Job status update', build: 'jobUpdate' },
  { id: 'ready_collection', label: 'Ready for collection', build: 'readyForCollection' },
  { id: 'quote_followup', label: 'Quote follow-up', build: 'quoteFollowUp' },
  { id: 'payment_thanks', label: 'Payment thank-you', build: 'paymentThanks' },
  { id: 'portal_share', label: 'Client portal link', build: 'portalShare' },
  { id: 'bulk_ar', label: 'Bulk AR summary', build: 'bulkArSummary' },
]
