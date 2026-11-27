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
 * Full expanded pack covering common SA phone / IT repair desk queries.
 * More specific keywords checked first for better prioritization.
 */
export function suggestInboundReplies({ message = '', client = {}, company = {}, job, invoice } = {}) {
  const text = String(message || '').toLowerCase()
  const name = clientName(client)
  const shop = shopName(company)
  const device = deviceLabel(job)
  const status = job?.status ? String(job.status).replace(/_/g, ' ') : 'in progress'
  const replies = []

  // Water damage (high urgency)
  if (/water|liquid|wet|rain|water damage|dropped in water/.test(text)) {
    replies.push({
      label: 'Water damage',
      text: `Hi ${name}, please switch the *${device}* off immediately and do not charge it.\n\nBring it in as soon as possible — the sooner we open it, the better the chance of saving data and the board.`,
      af: `Hi ${name}, skakel die toestel af en bring dit so gou as moontlik in. Moenie laai nie.`,
    })
  }

  // FRP / Google lock / wipe
  if (/frp|google lock|account lock|forgot password|frp bypass|wipe|factory reset|erase|locked out/.test(text)) {
    replies.push({
      label: 'FRP / lock / wipe',
      text: `Hi ${name}, we can assist with FRP / Google account lock or factory wipe on your *${device}*.\n\nPlease bring proof of ownership (invoice or ID matching the account). We will assess on the bench.`,
      af: `Hi ${name}, ons kan help met die Google-slot of wipe. Bring bewys van eienaarskap.`,
    })
  }

  // Data recovery
  if (/data recovery|recover data|photos gone|deleted|backup fail|lost data/.test(text)) {
    replies.push({
      label: 'Data recovery',
      text: `Hi ${name}, we can try data recovery on your *${device}*.\n\nSuccess depends on the damage and whether it still powers on. Bring it in for assessment.`,
      af: `Hi ${name}, ons kan probeer om data te herstel. Bring dit in vir beoordeling.`,
    })
  }

  // Black screen / not turning on
  if (/black screen|not turning on|won't turn on|dead|no power|not starting|boot loop/.test(text)) {
    replies.push({
      label: 'No power / black screen',
      text: `Hi ${name}, we can diagnose the no-power or black screen issue on your *${device}*.\n\nPlease drop it off so we can test the board and battery.`,
      af: `Hi ${name}, ons kan die swart skerm of geen krag diagnoseer. Bring dit in.`,
    })
  }

  // Charging port / USB
  if (/charging port|usb port|not charging|charge port|loose charge/.test(text)) {
    replies.push({
      label: 'Charging port',
      text: `Hi ${name}, charging port repairs are common. We can replace or clean the port on your *${device}*.\n\nWould you like a quote or to drop it off?`,
      af: `Hi ${name}, ons kan die laaipoort herstel. Wil jy 'n kwotasie of aflewering?`,
    })
  }

  // Face ID / fingerprint
  if (/face id|faceid|fingerprint|touch id|biometric|sensor/.test(text)) {
    replies.push({
      label: 'Biometrics',
      text: `Hi ${name}, we can check the Face ID / fingerprint sensor on your *${device}*.\n\nSome models need parts; others can be calibrated. Bring it in for a look.`,
      af: `Hi ${name}, ons kan die vingerafdruk of Face ID kyk. Bring dit in.`,
    })
  }

  // Motherboard / logic board
  if (/motherboard|logic board|main board|board damage|water board/.test(text)) {
    replies.push({
      label: 'Board repair',
      text: `Hi ${name}, board-level repairs are possible on many models. We will assess the *${device}* on the bench.\n\nData recovery may be possible depending on damage.`,
      af: `Hi ${name}, ons kan board-herstel probeer. Bring dit in vir beoordeling.`,
    })
  }

  // Status / update
  if (/status|update|progress|how.?s (it|my)|when (will|is)|klaar|gereed/.test(text)) {
    replies.push({
      label: 'Status update',
      text: `Hi ${name}, quick update on your *${device}*.\n\nCurrent status: *${status}*.\n\nI will keep you posted. Any questions, just reply.`,
      af: `Hi ${name}, status van jou *${device}* is *${status}*. Ek hou jou op hoogte.`,
    })
  }

  // Ready / collection
  if (/ready|collect|afhaal|pick.?up|klaar|done|finished/.test(text)) {
    replies.push({
      label: 'Ready for collection',
      text: `Hi ${name}, good news!\n\nYour *${device}* is ready for collection at *${shop}*.\n\nPlease bring ID. See you soon!`,
      af: `Hi ${name}, jou *${device}* is gereed vir afhaal by *${shop}*. Sien jou!`,
    })
  }

  // Parts waiting / delay
  if (/parts|onderdeel|waiting|order|still waiting|wanneer|delay|late/.test(text)) {
    replies.push({
      label: 'Waiting on parts',
      text: `Hi ${name}, we are still waiting on the part for your *${device}*.\n\nI will WhatsApp the moment it arrives. Thanks for your patience.`,
      af: `Hi ${name}, ons wag nog op die onderdeel. Ek stuur 'n boodskap sodra dit hier is.`,
    })
  }

  // Quote / price / negotiation
  if (/quote|price|cost|how much|kwotasie|prys|amount|cheaper|discount|negotiate/.test(text)) {
    replies.push({
      label: 'Quote / price',
      text: `Hi ${name}, thanks for the enquiry.\n\nI can prepare a quote for your *${device}*. Can you tell me a bit more about the issue so I can give an accurate price?`,
      af: `Hi ${name}, ek kan 'n kwotasie vir jou *${device}* voorberei. Vertel my meer van die probleem?`,
    })
  }

  // Quote approve
  if (/approve|go ahead|proceed|yes please|ok go|accept quote/.test(text)) {
    replies.push({
      label: 'Quote approved',
      text: `Hi ${name}, perfect — we will go ahead with the repair on your *${device}*.\n\nI will keep you updated on progress.`,
      af: `Hi ${name}, ons gaan voort met die herstel. Ek hou jou op hoogte.`,
    })
  }

  // Payment / invoice / plan
  if (/pay|payment|invoice|faktuur|ef t|bank|account|balance|plan|instalment|statement/.test(text)) {
    replies.push({
      label: 'Payment details',
      text: `Hi ${name}, here are the payment details.\n\nBank: ${company.bankName || 'see invoice'}\nAccount: ${company.accountNumber || 'on the PDF'}\n\nPlease use the invoice number as reference. Thank you!`,
      af: `Hi ${name}, hier is die betalingsbesonderhede. Gebruik die faktuurnommer as verwysing. Dankie!`,
    })
  }

  // Hours / location / delivery / call-out
  if (/hours|open|close|where|address|location|ure|oop|adres|delivery|collect|home visit|call.?out|come to/.test(text)) {
    replies.push({
      label: 'Hours / location',
      text: `Hi ${name}, *${shop}* is open Monday to Friday 08:30–17:00, Saturday 09:00–13:00.\n\nAddress: ${company.address || 'see our profile'}.\n\nWe also do drop-offs and can arrange collection if needed.`,
      af: `Hi ${name}, ons is oop Ma-Vr 08:30–17:00, Saterdag 09:00–13:00.`,
    })
  }

  // Screen / battery / common repairs / laptop / tablet
  if (/screen|battery|charging|cracked|broken|not charging|skerm|laptop|pc|tablet|ipad|slow|storage|network|sim|unlock/.test(text)) {
    replies.push({
      label: 'Common repair',
      text: `Hi ${name}, we can help with the issue on your *${device}*.\n\nWould you like to book a drop-off or get a quote first?`,
      af: `Hi ${name}, ons kan help met die herstel. Wil jy 'n afspraak maak?`,
    })
  }

  // Photos of damage
  if (/photo|picture|image|send pic|damage photo/.test(text)) {
    replies.push({
      label: 'Photo of damage',
      text: `Hi ${name}, please send a clear photo of the damage on your *${device}* so I can give a better idea of the repair.\n\nThanks!`,
      af: `Hi ${name}, stuur asseblief 'n foto van die skade.`,
    })
  }

  // Rush / same-day
  if (/rush|urgent|same.?day|asap|today|quick/.test(text)) {
    replies.push({
      label: 'Rush / same-day',
      text: `Hi ${name}, for same-day or rush on your *${device}* please drop it off before 11:00 and we will do our best.\n\nLet me know when you are coming.`,
      af: `Hi ${name}, vir dieselfde dag, bring dit voor 11:00.`,
    })
  }

  // Trade-in
  if (/trade.?in|sell|buy my|old phone/.test(text)) {
    replies.push({
      label: 'Trade-in',
      text: `Hi ${name}, we do trade-ins. Bring your *${device}* in for a valuation.\n\nCondition and model will determine the offer.`,
      af: `Hi ${name}, ons doen inruil. Bring dit in vir 'n waardasie.`,
    })
  }

  // Insurance
  if (/insurance|claim|cover|policy/.test(text)) {
    replies.push({
      label: 'Insurance',
      text: `Hi ${name}, we can assist with insurance claims on your *${device}*.\n\nBring the device and any claim number / documents you have.`,
      af: `Hi ${name}, ons kan help met versekerings eise.`,
    })
  }

  // After hours / load shedding / holiday
  if (/after hours|load shedding|power|electricity|closed|holiday|public holiday/.test(text)) {
    replies.push({
      label: 'After hours / power',
      text: `Hi ${name}, we are closed now but I will reply first thing in the morning.\n\nFor urgent same-day, please drop off before 11:00.`,
      af: `Hi ${name}, ons is toe, maar ek antwoord môreoggend.`,
    })
  }

  // Review / thanks / opt-out
  if (/thanks|thank you|review|rating|star|stop|opt.?out|unsubscribe/.test(text)) {
    replies.push({
      label: 'Thanks / review',
      text: `Hi ${name}, thanks so much! If you have a moment, a quick Google review helps us a lot.\n\nGlad we could help with your *${device}*.`,
      af: `Hi ${name}, dankie! 'n Google review sal baie help.`,
    })
  }

  // Turnaround / backup / IMEI / tech
  if (/how long|turnaround|when ready|backup|data|imei|stolen|technician|tech/.test(text)) {
    replies.push({
      label: 'Turnaround / backup',
      text: `Hi ${name}, typical turnaround is 1–3 days depending on parts. We always recommend a backup first.\n\nI will keep you posted on your *${device}*.`,
      af: `Hi ${name}, tipies 1–3 dae. Ons beveel 'n backup aan.`,
    })
  }

  // Greeting
  if (/hello|hi|hey|good morning|good afternoon|howzit|sawubona|molo/.test(text)) {
    replies.push({
      label: 'Greeting',
      text: `Hi ${name}, hope you are well.\n\nHow can *${shop}* help you today?`,
      af: `Hi ${name}, hoe kan ek help vandag?`,
    })
  }

  // Fallback
  if (replies.length === 0) {
    replies.push({
      label: 'General',
      text: `Hi ${name}, thanks for the message.\n\nHow can I help you at *${shop}* today?`,
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
