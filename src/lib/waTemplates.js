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

/** Quick replies for inbound WhatsApp / inbox responses (ZA tone) */
export function greetingReply(client, company, lang = 'en') {
  const name = (client?.name || '').split(' ')[0] || (lang === 'af' ? 'daar' : 'there')
  const co = company?.name || 'SA Invoice Pro'
  if (lang === 'af') {
    return `Hallo ${name}, dankie dat jy *${co}* kontak. Hoe kan ons jou help vandag?`
  }
  return `Hi ${name}, thanks for messaging *${co}*. How can we help you today?`
}

export function askMoreInfo(client, company, lang = 'en') {
  const name = (client?.name || '').split(' ')[0] || (lang === 'af' ? 'daar' : 'there')
  const co = company?.name || 'us'
  if (lang === 'af') {
    return `Hallo ${name}, van *${co}*: kan jy asseblief meer besonderhede gee (toestel model, probleem, of foto's) sodat ons kan help? Dankie!`
  }
  return `Hi ${name}, from *${co}*: could you please share more details (device model, issue, or photos) so we can assist? Thank you!`
}

export function afterHoursReply(client, company, lang = 'en') {
  const name = (client?.name || '').split(' ')[0] || (lang === 'af' ? 'daar' : 'there')
  const co = company?.name || 'SA Invoice Pro'
  if (lang === 'af') {
    return `Hallo ${name}, ons is tans buite ure by *${co}*. Ons antwoord in die oggend. Vir dringende sake, los 'n boodskap. Dankie!`
  }
  return `Hi ${name}, we are currently outside business hours at *${co}*. We'll reply in the morning. For urgent matters, leave a message. Thank you!`
}

export function readyCollectionReply(client, company) {
  const name = (client?.name || '').split(' ')[0] || 'there'
  const co = company?.name || 'us'
  return `Hi ${name}, good news from *${co}* — your device is ready for collection.\n\nPlease bring ID. See you soon!`
}

export function waitingPartsReply(client, company) {
  const name = (client?.name || '').split(' ')[0] || 'there'
  const co = company?.name || 'us'
  return `Hi ${name}, quick update from *${co}*: we are still waiting on the part for your repair.\n\nI will WhatsApp the moment it arrives and we start the job. Reply if you have questions.`
}

export function quoteFollowReply(client, company) {
  const name = (client?.name || '').split(' ')[0] || 'there'
  const co = company?.name || 'us'
  return `Hi ${name}, just following up on the quote from *${co}*.\n\nLet me know if you would like to go ahead or if you need any changes. Thank you!`
}

export function paymentReceivedReply(client, company) {
  const name = (client?.name || '').split(' ')[0] || 'there'
  const co = company?.name || 'us'
  return `Hi ${name}, *${co}* confirms we have received your payment. Thank you!\n\nReceipt / invoice is available if you need a copy — just reply.`
}

export function bringAccessoriesReply(client, company) {
  const name = (client?.name || '').split(' ')[0] || 'there'
  const co = company?.name || 'us'
  return `Hi ${name}, from *${co}*: when you collect, please bring your ID and any accessories (charger, box if you have it). See you soon!`
}

export function priceEstimateReply(client, company) {
  const name = (client?.name || '').split(' ')[0] || 'there'
  const co = company?.name || 'us'
  return `Hi ${name}, thanks for the details. From *${co}*: once we diagnose the device we will send a firm quote.\n\nTypical turnaround is 1–2 days after parts arrive. Reply with model + issue for a faster estimate.`
}

export function bookingConfirmReply(client, company) {
  const name = (client?.name || '').split(' ')[0] || 'there'
  const co = company?.name || 'us'
  return `Hi ${name}, your booking at *${co}* is confirmed.\n\nPlease bring the device and ID. Reply if you need to change the time.`
}

export function frpReply(client, company) {
  const name = (client?.name || '').split(' ')[0] || 'there'
  const co = company?.name || 'us'
  return `Hi ${name}, from *${co}*: FRP / Google lock notes.\n\nWe can check activation lock status. Please confirm the device is yours and bring proof of purchase if possible. Reply with model + whether you know the Google account.`
}

export function screenReply(client, company) {
  const name = (client?.name || '').split(' ')[0] || 'there'
  const co = company?.name || 'us'
  return `Hi ${name}, from *${co}*: screen / glass repair.\n\nWe stock common models. Reply with exact model (e.g. iPhone 13 / Samsung A54) + photo of the damage for a faster quote. Typical 1–2 hours once the part is in.`
}

export function batteryReply(client, company) {
  const name = (client?.name || '').split(' ')[0] || 'there'
  const co = company?.name || 'us'
  return `Hi ${name}, from *${co}*: battery swap.\n\nMost models we can do same-day. Reply with the exact model and whether it is swollen or just dying fast. We'll confirm price and time.`
}

export function dataReply(client, company) {
  const name = (client?.name || '').split(' ')[0] || 'there'
  const co = company?.name || 'us'
  return `Hi ${name}, from *${co}*: data recovery.\n\nWe can assess photos / WhatsApp / contacts. Success depends on the damage. Reply with model + what happened (water, drop, not turning on) and we'll advise next steps.`
}

export function warrantyReply(client, company) {
  const name = (client?.name || '').split(' ')[0] || 'there'
  const co = company?.name || 'us'
  return `Hi ${name}, from *${co}*: warranty note.\n\nOur repairs carry a 90-day workmanship warranty on the part we fitted. Accidental damage or new issues are not covered. Reply with the original job number if you need a check.`
}

export function etaReply(client, company) {
  const name = (client?.name || '').split(' ')[0] || 'there'
  const co = company?.name || 'us'
  return `Hi ${name}, from *${co}*: ETA update.\n\nMost screen/battery jobs are same-day or next-day once the part is in stock. I'll WhatsApp as soon as yours is ready. Reply if you have a deadline.`
}

/** Local keyword match for inbound text. Returns best QUICK_REPLY id. */
export function suggestFromInbound(text = '') {
  const t = String(text || '').toLowerCase()
  if (!t.trim()) return null
  const rules = [
    { keys: ['frp', 'google lock', 'locked', 'activation lock', 'mdm'], id: 'frp' },
    { keys: ['screen', 'crack', 'cracked', 'broken glass', 'lcd', 'display'], id: 'screen' },
    { keys: ['battery', 'batt', 'swollen', 'not charging'], id: 'battery' },
    { keys: ['data', 'recovery', 'photos', 'backup'], id: 'data' },
    { keys: ['ready', 'collect', 'afhaal', 'pick up', 'collection'], id: 'ready' },
    { keys: ['parts', 'waiting', 'wait', 'order', 'onderdeel'], id: 'parts' },
    { keys: ['quote', 'kwotasie', 'price', 'how much', 'cost', 'estimate'], id: 'estimate' },
    { keys: ['paid', 'payment', 'betaling', 'proof', 'eft', 'receipt'], id: 'paid' },
    { keys: ['book', 'booking', 'appointment', 'afspraak'], id: 'book' },
    { keys: ['after hours', 'closed', 'after 5', 'weekend'], id: 'after_hours' },
    { keys: ['warranty', 'waarborg', 'guarantee'], id: 'warranty' },
    { keys: ['eta', 'how long', 'when ready', 'turnaround'], id: 'eta' },
  ]
  for (const r of rules) {
    if (r.keys.some((k) => t.includes(k))) return r.id
  }
  return 'greeting'
}

export const QUICK_REPLIES = [
  { id: 'greeting', label: 'Greeting', build: greetingReply },
  { id: 'ask_more', label: 'Ask for more info', build: askMoreInfo },
  { id: 'after_hours', label: 'After hours', build: afterHoursReply },
  { id: 'ready', label: 'Ready for collection', build: readyCollectionReply },
  { id: 'parts', label: 'Waiting on parts', build: waitingPartsReply },
  { id: 'quote', label: 'Quote follow-up', build: quoteFollowReply },
  { id: 'paid', label: 'Payment received', build: paymentReceivedReply },
  { id: 'bring', label: 'Bring ID + accessories', build: bringAccessoriesReply },
  { id: 'estimate', label: 'Price / diagnose next', build: priceEstimateReply },
  { id: 'book', label: 'Booking confirmed', build: bookingConfirmReply },
  { id: 'frp', label: 'FRP / Google lock', build: frpReply },
  { id: 'screen', label: 'Screen / glass', build: screenReply },
  { id: 'battery', label: 'Battery swap', build: batteryReply },
  { id: 'data', label: 'Data recovery', build: dataReply },
  { id: 'warranty', label: 'Warranty note', build: warrantyReply },
  { id: 'eta', label: 'ETA / turnaround', build: etaReply },
]

export const WA_TEMPLATE_CATALOG = [
  { id: 'invoice_reminder', label: 'Invoice reminder', build: 'invoiceReminder' },
  { id: 'job_update', label: 'Job status update', build: 'jobUpdate' },
  { id: 'ready_collection', label: 'Ready for collection', build: 'readyForCollection' },
  { id: 'quote_followup', label: 'Quote follow-up', build: 'quoteFollowUp' },
  { id: 'payment_thanks', label: 'Payment thank-you', build: 'paymentThanks' },
  { id: 'portal_share', label: 'Client portal link', build: 'portalShare' },
  { id: 'bulk_ar', label: 'Bulk AR summary', build: 'bulkArSummary' },
]
