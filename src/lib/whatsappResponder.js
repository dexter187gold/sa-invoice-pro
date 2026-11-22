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
 * Expanded pack for common SA phone / IT repair desk queries.
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

  if (/how much|price|cost|quote|quotation|estimate|how much is|what does it cost|cheaper|discount|negotiate/.test(text)) {
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

  if (/data|recovery|photos|backup|whatsapp|contacts|transfer|migrate|move data|old phone/.test(text)) {
    replies.push({
      label: 'Data recovery / transfer',
      text: `Hi ${name}, from *${shop}*: data recovery or transfer.\n\nWe can assess photos / WhatsApp / contacts or help move data to a new phone. Success depends on the damage. Reply with model + what happened (water, drop, not turning on) or the two models for a transfer.`,
      af: `Hi ${name}, data herstel of oordrag. Stuur model en wat gebeur het.`,
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

  if (/speaker|sound|audio|silent|no sound|mic|microphone|voice|call sound/.test(text)) {
    replies.push({
      label: 'Speaker / sound',
      text: `Hi ${name}, from *${shop}*: speaker / microphone issue.\n\nReply with the exact model and whether it is no sound on calls, music, or both, plus if the mic works. We can test and quote a repair or replacement.`,
      af: `Hi ${name}, luidspreker / mikrofoon. Stuur model en of dit op oproepe of musiek is.`,
    })
  }

  if (/wifi|wi-fi|internet|network|not connecting|bluetooth|bt |pairing/.test(text)) {
    replies.push({
      label: 'WiFi / Bluetooth',
      text: `Hi ${name}, from *${shop}*: WiFi or Bluetooth issue.\n\nReply with the model and what happens (can't see networks, drops, won't pair). Often software or antenna related — we can diagnose.`,
      af: `Hi ${name}, WiFi of Bluetooth probleem. Stuur model en wat gebeur.`,
    })
  }

  if (/software|update|stuck|bootloop|logo|apple logo|samsung logo|restarting/.test(text)) {
    replies.push({
      label: 'Software / boot',
      text: `Hi ${name}, from *${shop}*: software or boot issue.\n\nIf it is stuck on the logo or keeps restarting, bring it in. We can try recovery or flash. Reply with model + iOS/Android version if known, and whether you have a backup.`,
      af: `Hi ${name}, sagteware / boot probleem. Bring dit in, ons kan herstel probeer.`,
    })
  }

  if (/password|pin|pattern|forgot|unlock|can't open|lock screen/.test(text) && !/frp|google|icloud|samsung/.test(text)) {
    replies.push({
      label: 'Lock / password',
      text: `Hi ${name}, from *${shop}*: lock screen / password.\n\nWe can help with pattern/PIN if the device is yours. For Google/Apple account locks see the FRP note. Reply with model and confirm ownership.`,
      af: `Hi ${name}, slotskerm. Bevestig eienaarskap en stuur model.`,
    })
  }

  if (/icloud|apple id|samsung account|find my|activation/.test(text)) {
    replies.push({
      label: 'iCloud / account lock',
      text: `Hi ${name}, from *${shop}*: iCloud / Samsung account lock.\n\nThese require the original account credentials or proof of ownership. Bring proof of purchase if possible. Reply with model and whether you know the account details.`,
      af: `Hi ${name}, iCloud of Samsung-rekening. Bring bewys van eienaarskap.`,
    })
  }

  if (/face id|touch id|fingerprint|faceid|touchid/.test(text)) {
    replies.push({
      label: 'Face ID / Touch ID',
      text: `Hi ${name}, from *${shop}*: Face ID or Touch ID issue.\n\nReply with the model and whether it stopped working after a drop, screen repair, or software update. We can diagnose sensor or software.`,
      af: `Hi ${name}, Face ID / Touch ID. Stuur model en wanneer dit opgehou werk het.`,
    })
  }

  // Additional common desk queries
  if (/motherboard|logic board|board|main board|chip|ic|no power after drop|won't charge after water/.test(text)) {
    replies.push({
      label: 'Motherboard / board',
      text: `Hi ${name}, from *${shop}*: motherboard / logic board issue.\n\nThese need proper diagnosis. Bring the device in — we can check if it is board-level or a simpler fix. Reply with model + what happened (drop, water, after repair).`,
      af: `Hi ${name}, moederbord. Bring dit in vir diagnose. Stuur model en wat gebeur het.`,
    })
  }

  if (/drop off|drop it off|bring it in|when can i come|book|booking|appointment|afspraak|today|tomorrow|same day/.test(text)) {
    replies.push({
      label: 'Drop-off / booking',
      text: `Hi ${name}, from *${shop}*: drop-off or booking.\n\nYou can bring the *${device || 'device'}* in during normal hours. Reply with preferred time or just come through — we'll diagnose and quote before any work. Please bring ID.`,
      af: `Hi ${name}, jy kan dit bring tydens gewone ure. Stuur as jy ’n spesifieke tyd wil.`,
    })
  }

  if (/accessories|charger|cable|case|screen protector|glass|tempered|buy|sell|trade/.test(text)) {
    replies.push({
      label: 'Accessories',
      text: `Hi ${name}, from *${shop}*: accessories.\n\nWe have chargers, cables, cases and tempered glass for common models. Reply with the exact phone model and what you need — we can confirm stock and price.`,
      af: `Hi ${name}, bykomstighede. Stuur die model en wat jy soek.`,
    })
  }

  if (/load shedding|loadshed|power cut|generator|no power at shop|closed/.test(text)) {
    replies.push({
      label: 'Load shedding',
      text: `Hi ${name}, from *${shop}*: load shedding note.\n\nWe keep working through most stages with backup power. If we are temporarily affected we will WhatsApp. Reply with your job number if you are checking status.`,
      af: `Hi ${name}, lasafskakeling. Ons werk meestal deur met rugsteun. Stuur job nommer as jy status soek.`,
    })
  }

  // New packs for 6.69
  if (/hours|open|close|opening|closing|when open|what time|business hours|trading hours/.test(text)) {
    replies.push({
      label: 'Business hours',
      text: `Hi ${name}, from *${shop}*: we are open during normal trading hours (typically Mon–Fri 8:30–17:00, Sat 9:00–13:00 — confirm with us).\n\nYou can drop the device off anytime we are open. Reply if you need the exact address or a specific time.`,
      af: `Hi ${name}, ons is oop tydens gewone ure. Stuur as jy die adres of ’n spesifieke tyd wil hê.`,
    })
  }

  if (/address|where are you|location|directions|find you|map|google maps|how to get there/.test(text)) {
    replies.push({
      label: 'Location / address',
      text: `Hi ${name}, from *${shop}*: you can find us at our usual workshop address (see Google Maps or reply for the pin).\n\nPlease bring the device, ID, and any previous job number. See you soon!`,
      af: `Hi ${name}, ons is by die gewone adres. Bring die toestel en ID saam.`,
    })
  }

  if (/network|sim|unlock|blocked|network lock|carrier|vodacom|mtn|telkom|cell c|imei/.test(text)) {
    replies.push({
      label: 'Network unlock / SIM',
      text: `Hi ${name}, from *${shop}*: network unlock or SIM issue.\n\nReply with the exact model and carrier. We can check IMEI status and advise on unlock options (where legal). Bring the device for testing.`,
      af: `Hi ${name}, netwerk of SIM. Stuur model en netwerk.`,
    })
  }

  if (/laptop|pc|computer|windows|mac|macbook|notebook|slow|virus|malware|storage|full|space|ssd|hard drive/.test(text)) {
    replies.push({
      label: 'Laptop / PC / slow',
      text: `Hi ${name}, from *${shop}*: laptop / PC issue.\n\nReply with the model (or Windows/Mac), what is happening (slow, virus, storage full, not booting, screen, battery). We diagnose and quote before any work. Bring it in or we can advise remotely for simple software.`,
      af: `Hi ${name}, laptop of rekenaar. Stuur model en wat die probleem is.`,
    })
  }

  if (/tablet|ipad|galaxy tab|android tablet/.test(text)) {
    replies.push({
      label: 'Tablet / iPad',
      text: `Hi ${name}, from *${shop}*: tablet / iPad repair.\n\nSame as phones — reply with exact model + issue (screen, battery, not turning on, charge port). We stock many common parts. Bring it in for diagnosis.`,
      af: `Hi ${name}, tablet of iPad. Stuur model en probleem.`,
    })
  }

  // New packs for 6.71
  if (/parts|waiting|still waiting|how long for parts|part delay|order the part|when will the part/.test(text)) {
    replies.push({
      label: 'Parts delay',
      text: `Hi ${name}, from *${shop}*: update on parts for your *${device}*.\n\nWe are still waiting on the part. I will WhatsApp the moment it arrives and we start. Reply if you want an estimated arrival or to discuss alternatives.`,
      af: `Hi ${name}, ons wag nog op die onderdeel. Ek stuur ’n WhatsApp sodra dit hier is.`,
    })
  }

  if (/go ahead|approve|yes please|do it|proceed|accept the quote|ok do the repair|book it/.test(text)) {
    replies.push({
      label: 'Quote approved',
      text: `Hi ${name}, thank you — we will go ahead with the repair on your *${device}*.\n\nPlease drop it off (or confirm it is already with us) and bring ID. We will keep you updated on this chat.`,
      af: `Hi ${name}, dankie, ons gaan voort met die herstel. Bring dit asseblief en ID saam.`,
    })
  }

  if (/photo|picture|pic of|send a photo|image of the damage|show the crack/.test(text)) {
    replies.push({
      label: 'Photo of damage',
      text: `Hi ${name}, from *${shop}*: a photo helps a lot.\n\nPlease reply with a clear photo of the damage (screen, port, etc.) and the exact model. We can quote faster and check stock.`,
      af: `Hi ${name}, stuur asseblief ’n foto van die skade en die model.`,
    })
  }

  if (/urgent|same day|today|rush|asap|emergency|quick|fast|how soon/.test(text)) {
    replies.push({
      label: 'Rush / same-day',
      text: `Hi ${name}, from *${shop}*: we understand it is urgent.\n\nReply with the exact model and issue. If we have the part in stock we can often do same-day or next-day. Bring it in as soon as you can.`,
      af: `Hi ${name}, as dit dringend is, stuur model en probleem. Ons kan dikwels dieselfde dag doen as die onderdeel hier is.`,
    })
  }

  if (/trade in|trade-in|sell my|buy my phone|trade my|what will you give|offer on my/.test(text)) {
    replies.push({
      label: 'Trade-in / buy',
      text: `Hi ${name}, from *${shop}*: trade-in or buy.\n\nReply with the exact model, condition (screen, battery, any damage), and whether it is unlocked. Bring it in for a proper offer — we assess on the spot.`,
      af: `Hi ${name}, inruil of koop. Stuur model en toestand, of bring dit in.`,
    })
  }

  if (/factory reset|wipe|erase|delete all|data wipe|clear the phone|format/.test(text)) {
    replies.push({
      label: 'Factory reset / wipe',
      text: `Hi ${name}, from *${shop}*: factory reset or data wipe.\n\nWe can do a full wipe for you (useful before trade-in or sale). Reply with the model and confirm you have a backup of anything important. Bring ID.`,
      af: `Hi ${name}, fabrieksherstel. Stuur model en bevestig jy het ’n rugsteun.`,
    })
  }

  if (/insurance|claim|insure|cover|policy/.test(text)) {
    replies.push({
      label: 'Insurance claim',
      text: `Hi ${name}, from *${shop}*: insurance claim note.\n\nWe can provide a quote and job card for your claim. Reply with the model, what happened, and your insurer if known. Bring the device and any claim number.`,
      af: `Hi ${name}, versekerings eis. Stuur model en wat gebeur het.`,
    })
  }

  if (/after hours|afterhours|emergency|weekend|sunday|closed now|too late/.test(text)) {
    replies.push({
      label: 'After hours',
      text: `Hi ${name}, from *${shop}*: we are currently closed.\n\nDrop a message with the model and issue — we will reply first thing when we open. For true emergencies reply and we will advise if anything can be arranged.`,
      af: `Hi ${name}, ons is tans toe. Stuur model en probleem, ons antwoord so gou as ons oop is.`,
    })
  }

  if (/thank you|thanks|dankie|appreciate|great service|google review|review/.test(text)) {
    replies.push({
      label: 'Thanks / review',
      text: `Hi ${name}, thank you — we appreciate the business from *${shop}*.\n\nIf you have a moment, a Google review helps other clients find us. Reply if you need anything else.`,
      af: `Hi ${name}, dankie! ’n Google-resensie help baie as jy tyd het.`,
    })
  }

  if (/stop|unsubscribe|opt out|remove me|don't message|don't contact|popia/.test(text)) {
    replies.push({
      label: 'Opt-out',
      text: `Hi ${name}, noted — we will not send further marketing or chase messages from *${shop}*.\n\nService updates on an open job will still come through if needed. Reply STOP again if you want everything paused.`,
      af: `Hi ${name}, ons sal nie verder bemarkingsboodskappe stuur nie.`,
    })
  }

  if (/change time|different time|later|earlier|can i collect|collect at|pickup time/.test(text)) {
    replies.push({
      label: 'Change collection time',
      text: `Hi ${name}, from *${shop}*: no problem changing the collection time for your *${device}*.\n\nReply with the day and time that suits you (during opening hours). We will confirm.`,
      af: `Hi ${name}, stuur die dag en tyd wat jou pas vir afhaal.`,
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
