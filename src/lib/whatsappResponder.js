/**
 * WhatsApp suggested replies for SA Invoice Pro (P6/P7).
 * Pure helpers — open wa.me with pre-filled ZA-tone messages.
 * Tone: friendly, clear, English-first with short Afrikaans options.
 * Supports both outbound status and inbound message response suggestions.
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

/**
 * Keyword-aware suggestions for inbound WhatsApp messages from clients.
 * Context-aware when job / invoice are passed.
 */
export function suggestInboundReplies({ message = '', client = {}, company = {}, job, invoice } = {}) {
  const text = String(message || '').toLowerCase()
  const name = clientName(client)
  const shop = shopName(company)
  const device = deviceLabel(job)
  const status = job?.status ? String(job.status).replace(/_/g, ' ') : 'in progress'
  const replies = []

  if (/where|status|update|progress|how long|when ready|is it done|finish|eta|turnaround/.test(text)) {
    replies.push({
      label: 'Status check',
      text: `Hi ${name}, thanks for checking in.\n\nYour *${device}* is currently *${status}* at *${shop}*. I will update you as soon as there is more news.\n\nAny questions, just reply here.`,
      af: `Hi ${name}, jou *${device}* is tans *${status}*. Ek stuur ’n update sodra daar nuus is.`,
    })
  }

  if (/how much|price|cost|quote|quotation|estimate|how much is|what does it cost/.test(text)) {
    replies.push({
      label: 'Pricing / quote',
      text: `Hi ${name}, happy to help with a price.\n\nPlease send the exact model of the *${device || 'phone'}* and what is wrong (e.g. cracked screen, not charging, water). I will send a proper quote shortly.\n\nThanks!`,
      af: `Hi ${name}, stuur asseblief die model en wat fout is, dan stuur ek ’n kwotasie.`,
    })
  }

  if (/screen|crack|cracked|broken glass|lcd|display|glass/.test(text)) {
    replies.push({
      label: 'Screen repair',
      text: `Hi ${name}, from *${shop}*: screen / glass repair.\n\nWe stock common models. Reply with the exact model (e.g. iPhone 13 / Samsung A54) + a photo of the damage for a faster quote. Most screens are 1–2 hours once the part is in.`,
      af: `Hi ${name}, skermherstel by *${shop}*. Stuur model + foto van die skade vir ’n vinnige kwotasie.`,
    })
  }

  if (/battery|batt|swollen|not charging|dies fast/.test(text)) {
    replies.push({
      label: 'Battery',
      text: `Hi ${name}, from *${shop}*: battery swap.\n\nMost models we can do same-day. Reply with the exact model and whether it is swollen or just dying fast. We'll confirm price and time.`,
      af: `Hi ${name}, battery by *${shop}*. Stuur die model en of dit geswel is.`,
    })
  }

  if (/water|liquid|wet|dropped in|coffee|rain/.test(text)) {
    replies.push({
      label: 'Water damage',
      text: `Hi ${name}, from *${shop}*: water / liquid damage.\n\nSwitch the phone off and do not charge it. Bring it in as soon as possible — the sooner we open it the better the chance of saving data. Reply with model + what happened.`,
      af: `Hi ${name}, water skade. Skakel dit af en bring dit so gou as moontlik.`,
    })
  }

  if (/charging|charge port|not charging|charger|cable|usb/.test(text) && !/battery/.test(text)) {
    replies.push({
      label: 'Charging issue',
      text: `Hi ${name}, from *${shop}*: charging / port issue.\n\nReply with the exact model and whether it charges at all with a known-good cable. We can check the port and battery.`,
      af: `Hi ${name}, laaiprobleem. Stuur model en of dit enigsins laai.`,
    })
  }

  if (/camera|photo|lens|blurry|not focusing/.test(text)) {
    replies.push({
      label: 'Camera',
      text: `Hi ${name}, from *${shop}*: camera issue.\n\nReply with the model and whether front or back camera (or both). A short video of the problem helps us quote faster.`,
      af: `Hi ${name}, kamera. Stuur model en of dit voor of agter is.`,
    })
  }

  if (/dead|not turning|won't turn|black screen|no power|boot/.test(text)) {
    replies.push({
      label: 'No power / dead',
      text: `Hi ${name}, from *${shop}*: device not turning on.\n\nPlease bring it in for diagnosis. Reply with model + when it last worked and any recent drops or water. We'll assess and quote before any work.`,
      af: `Hi ${name}, toestel wil nie aanskakel nie. Bring dit vir diagnose.`,
    })
  }

  if (/frp|google lock|activation lock|mdm|locked|forgot google/.test(text)) {
    replies.push({
      label: 'FRP / Google lock',
      text: `Hi ${name}, from *${shop}*: FRP / Google lock.\n\nWe can check activation lock status. Please confirm the device is yours and bring proof of purchase if possible. Reply with model + whether you know the Google account.`,
      af: `Hi ${name}, FRP / Google slot. Bring bewys van eienaarskap as jy het.`,
    })
  }

  if (/data|recovery|photos|backup|whatsapp|contacts/.test(text)) {
    replies.push({
      label: 'Data recovery',
      text: `Hi ${name}, from *${shop}*: data recovery.\n\nWe can assess photos / WhatsApp / contacts. Success depends on the damage. Reply with model + what happened (water, drop, not turning on).`,
      af: `Hi ${name}, data herstel. Stuur model en wat gebeur het.`,
    })
  }

  if (/paid|payment|eft|transferred|deposited|paid in|proof|receipt/.test(text)) {
    replies.push({
      label: 'Payment received',
      text: `Hi ${name}, thank you for the payment.\n\nWe have noted it for *${invoice?.number || 'your account'}*. If there is a balance left we will confirm shortly.\n\nAppreciate the business!`,
      af: `Hi ${name}, dankie vir die betaling. Ons het dit aangeteken.`,
    })
  }

  if (/collect|pickup|pick up|ready|when can i|come get|afhaal/.test(text)) {
    replies.push({
      label: 'Collection',
      text: `Hi ${name}, your *${device}* is ready for collection at *${shop}* (or will be shortly).\n\nPlease bring ID and quote the job number. We are open during normal hours.\n\nSee you soon!`,
      af: `Hi ${name}, jou *${device}* is gereed vir afhaal. Bring asseblief ID saam.`,
    })
  }

  if (/warranty|waarborg|guarantee|come back|problem again/.test(text)) {
    replies.push({
      label: 'Warranty',
      text: `Hi ${name}, from *${shop}*: warranty note.\n\nOur repairs carry a 90-day workmanship warranty on the part we fitted. Accidental damage or new issues are not covered. Reply with the original job number if you need a check.`,
      af: `Hi ${name}, waarborg. Stuur die oorspronklike job nommer.`,
    })
  }

  if (/hello|hi|hey|good morning|good afternoon|howzit|sawubona/.test(text) && replies.length === 0) {
    replies.push({
      label: 'Greeting',
      text: `Hi ${name}, hope you are well.\n\nHow can *${shop}* help you today?`,
      af: `Hi ${name}, hoe kan ek help vandag?`,
    })
  }

  if (replies.length === 0) {
    replies.push({
      label: 'General',
      text: `Hi ${name}, thanks for the message.\n\nHow can I help you at *${shop}*?`,
      af: `Hi ${name}, dankie vir die boodskap. Hoe kan ek help?`,
    })
  }

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
