
/**
 * SA Invoice Pro - Professional document templates
 * Inspired by PC REPAIR DEX quote layout (hourly / flat-rate / ad-hoc COD).
 * Sections: header · banner · client grid · rate tables · payment · T&Cs · acceptance · footer
 */
import { formatMoney } from './money.js'
import { APP_NAME, APP_COPYRIGHT, APP_VERSION } from '../config.js'
import { loadJsPdf } from './loadJsPdf.js'

const GREEN = [0, 122, 77]
const AMBER = [217, 119, 6]
const SLATE = [51, 65, 85]
const MUTED = [100, 116, 139]
const LINE = [226, 232, 240]

export const TEMPLATE_PRESETS = [
  { id: 'standard', label: 'Standard invoice / quote', banner: null },
  { id: 'hourly', label: 'Hourly model (COD)', banner: 'HOURLY MODEL', sub: 'Transparent time-based pricing · Ideal for first-time clients who want full control' },
  { id: 'flatrate', label: 'Flat-rate package (COD)', banner: 'FLAT-RATE PACKAGE', sub: 'Fixed price · Know the total upfront · Ideal for defined scope' },
  { id: 'adhoc', label: 'Ad-hoc rate card (COD)', banner: 'AD-HOC RATE CARD', sub: 'Pay only for what you use · Maximum flexibility · Ideal when scope may vary' },
]

function fmtDate(d) {
  if (!d) return new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
  try {
    return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return String(d).slice(0, 10)
  }
}

function addDays(iso, n) {
  const d = new Date(iso || Date.now())
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function money(n) {
  return formatMoney(n).replace(/\u00a0/g, ' ')
}

function ensureSpace(doc, y, need = 20) {
  if (y + need > 280) {
    doc.addPage()
    return 18
  }
  return y
}

function drawHeader(doc, { company, docLabel, number, date, validUntil, accountType }) {
  const co = company || {}
  let y = 14
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...GREEN)
  doc.text((co.name || APP_NAME).toUpperCase(), 14, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  const addr = [co.address, [co.city, co.postalCode].filter(Boolean).join(' '), co.province].filter(Boolean)
  if (addr.length) {
    doc.text(addr.join(' · '), 14, y)
    y += 4
  } else if (co.address) {
    doc.text(String(co.address), 14, y)
    y += 4
  }
  const contact = [co.phone, co.email].filter(Boolean).join(' · ')
  if (contact) {
    doc.text(contact, 14, y)
    y += 4
  }
  if (co.tagline || co.businessType) {
    doc.text(co.tagline || co.businessType, 14, y)
    y += 4
  }
  if (co.vatNumber) {
    doc.text('VAT: ' + co.vatNumber, 14, y)
    y += 4
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...SLATE)
  doc.text(`${docLabel} · ${number || '—'}`, 196, 14, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('Date: ' + fmtDate(date), 196, 20, { align: 'right' })
  if (validUntil) doc.text('Valid until: ' + fmtDate(validUntil), 196, 25, { align: 'right' })
  if (accountType) doc.text('Account Type: ' + accountType, 196, 30, { align: 'right' })

  const topY = Math.max(y, 34) + 2
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.4)
  doc.line(14, topY, 196, topY)
  return topY + 6
}

function drawBanner(doc, y, title, subtitle, color = AMBER) {
  if (!title) return y
  doc.setFillColor(...color)
  doc.roundedRect(14, y - 4, 182, 12, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text(title, 18, y + 3)
  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(subtitle, 196 - 4, y + 3, { align: 'right' })
  }
  return y + 14
}

function drawClientGrid(doc, y, { clientLabel, devices, serviceType }) {
  y = ensureSpace(doc, y, 28)
  const colW = 60
  const headers = ['CLIENT', 'DEVICES', 'SERVICE TYPE']
  const values = [clientLabel || '—', devices || '—', serviceType || '—']
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  headers.forEach((h, i) => doc.text(h, 14 + i * colW, y))
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...SLATE)
  values.forEach((v, i) => {
    const lines = doc.splitTextToSize(String(v), colW - 4)
    doc.text(lines, 14 + i * colW, y)
  })
  const maxLines = Math.max(...values.map((v) => doc.splitTextToSize(String(v), colW - 4).length))
  return y + maxLines * 4.5 + 6
}

function drawIntro(doc, y, text) {
  if (!text) return y
  y = ensureSpace(doc, y, 20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...SLATE)
  const lines = doc.splitTextToSize(text, 182)
  doc.text(lines, 14, y)
  return y + lines.length * 4 + 6
}

function drawTable(doc, y, headers, rows, colWidths) {
  y = ensureSpace(doc, y, 16 + rows.length * 7)
  const startX = 14
  let x = startX
  doc.setFillColor(248, 250, 252)
  doc.rect(startX, y - 4, 182, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  headers.forEach((h, i) => {
    const align = i === headers.length - 1 || i === headers.length - 2 ? 'right' : 'left'
    const xx = align === 'right' ? x + colWidths[i] - 2 : x
    doc.text(h, xx, y, { align })
    x += colWidths[i]
  })
  y += 6
  doc.setDrawColor(...LINE)
  doc.line(14, y - 2, 196, y - 2)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...SLATE)
  for (const row of rows) {
    y = ensureSpace(doc, y, 10)
    x = startX
    row.forEach((cell, i) => {
      const align = i === row.length - 1 || (headers[i] || '').toLowerCase().includes('rate') || (headers[i] || '').toLowerCase().includes('amount') || (headers[i] || '').toLowerCase().includes('total')
        ? 'right'
        : 'left'
      const xx = align === 'right' ? x + colWidths[i] - 2 : x
      const t = doc.splitTextToSize(String(cell ?? ''), colWidths[i] - 3)
      doc.text(t, xx, y, { align })
      x += colWidths[i]
    })
    y += 6
  }
  doc.setDrawColor(...LINE)
  doc.line(14, y - 2, 196, y - 2)
  return y + 4
}

function drawSectionTitle(doc, y, title) {
  y = ensureSpace(doc, y, 12)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...GREEN)
  doc.text(title, 14, y)
  return y + 6
}

function drawParagraph(doc, y, text) {
  if (!text) return y
  y = ensureSpace(doc, y, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...SLATE)
  const lines = doc.splitTextToSize(text, 182)
  doc.text(lines, 14, y)
  return y + lines.length * 4 + 4
}

function drawBullets(doc, y, items) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...SLATE)
  for (const item of items || []) {
    y = ensureSpace(doc, y, 8)
    const lines = doc.splitTextToSize('•  ' + item, 180)
    doc.text(lines, 16, y)
    y += lines.length * 4 + 1
  }
  return y + 3
}

function drawTerms(doc, y, companyName) {
  const name = companyName || APP_NAME
  y = drawSectionTitle(doc, y, 'STANDARD TERMS & CONDITIONS')
  y = drawParagraph(
    doc,
    y,
    `These terms reference the Consumer Protection Act 68 of 2008 (CPA), the Protection of Personal Information Act 4 of 2013 (POPIA) and South African common law.`
  )
  const clauses = [
    `Acceptance — Accepting this document (in writing, electronically or by handing over devices / approving work) creates a binding agreement on these terms.`,
    `Scope — Only the services listed are included. Extra work (hardware faults, data recovery, full OS reinstall, malware removal) is quoted separately.`,
    `Data — Customer is responsible for all backups. ${name} accepts no liability for data loss. Backup service available on request.`,
    `Software Licences — Customer must supply valid licences / product keys / Microsoft accounts for Microsoft Office and any other paid software. Installation of unlicensed software is not performed.`,
    `Labour Warranty — 14 calendar days on workmanship. Does not cover later updates, user changes, malware or hardware failure.`,
    `Liability — Total liability is limited to the amount paid under this document (to the maximum allowed by the CPA).`,
    `POPIA — Minimal personal information is processed only to deliver the service and invoice. Not shared with third parties except as required by law.`,
    `Independent Contractor — ${name} acts as an independent contractor. No employment or partnership is created.`,
    `Cancellation — Free cancellation before work starts. Once work has begun, reasonable costs already incurred are payable.`,
    `Law — Governed by the laws of South Africa. Disputes first attempted amicably; otherwise the Magistrates Court with jurisdiction at the service location applies.`,
    `CPA — Nothing here limits any non-excludable rights under the Consumer Protection Act 68 of 2008.`,
  ]
  doc.setFontSize(8)
  clauses.forEach((c, i) => {
    y = ensureSpace(doc, y, 12)
    const lines = doc.splitTextToSize(`${i + 1}. ${c}`, 182)
    doc.setTextColor(...SLATE)
    doc.text(lines, 14, y)
    y += lines.length * 3.6 + 2
  })
  return y + 4
}

function drawAcceptance(doc, y) {
  y = ensureSpace(doc, y, 36)
  y = drawSectionTitle(doc, y, 'ACCEPTANCE')
  y = drawParagraph(
    doc,
    y,
    'Signature or electronic confirmation + provision of devices / approval to proceed = acceptance of this document and the terms above.'
  )
  y += 6
  doc.setDrawColor(...MUTED)
  doc.setLineWidth(0.3)
  const positions = [14, 78, 142]
  const labels = ['Customer / Authorised Signatory', 'Date', 'Service provider']
  positions.forEach((x, i) => {
    doc.line(x, y + 10, x + 50, y + 10)
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text(labels[i], x, y + 15)
  })
  return y + 24
}

function drawFooter(doc, company, isQuote) {
  const co = company || {}
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    const line1 = [co.name || APP_NAME, co.address, co.phone].filter(Boolean).join(' · ')
    doc.text(line1.slice(0, 110), 105, 287, { align: 'center' })
    const line2 = isQuote
      ? 'This is a quotation, not a tax invoice. A tax invoice can be issued on request after payment.'
      : `${APP_NAME} · ${APP_COPYRIGHT} · v${APP_VERSION}`
    doc.text(line2, 105, 292, { align: 'center' })
  }
}

export async function buildProfessionalPdf(docData, options = {}) {
  const jsPDF = await loadJsPdf()
  const doc = new jsPDF('p', 'mm', 'a4')
  const company = options.company || {}
  const client = options.client || {}
  const isQuote = !!(docData.isQuote || options.isQuote)
  const templateId = docData.templateId || options.templateId || 'standard'
  const preset = TEMPLATE_PRESETS.find((p) => p.id === templateId) || TEMPLATE_PRESETS[0]

  const number = docData.number || (isQuote ? 'QT-' : 'INV-') + Date.now().toString().slice(-6)
  const date = docData.date || new Date().toISOString().slice(0, 10)
  const validUntil = docData.validUntil || (isQuote ? addDays(date, 14) : null)
  const accountType = docData.accountType || options.accountType || (isQuote ? 'COD Account' : 'Account')

  let y = drawHeader(doc, {
    company,
    docLabel: isQuote ? 'QUOTE' : 'TAX INVOICE',
    number,
    date,
    validUntil,
    accountType,
  })

  if (preset.banner) {
    const bannerColor = templateId === 'hourly' ? GREEN : templateId === 'flatrate' ? [37, 99, 235] : AMBER
    y = drawBanner(doc, y, preset.banner, preset.sub, bannerColor)
  }

  const clientLabel = [
    client.name || docData.clientName || 'Client',
    client.company,
    docData.clientNote || (accountType && accountType.includes('COD') ? '(Cash on Delivery / Collection)' : ''),
  ]
    .filter(Boolean)
    .join('\n')

  y = drawClientGrid(doc, y, {
    clientLabel,
    devices: docData.devices || client.devices || '—',
    serviceType: docData.serviceType || docData.serviceSummary || 'Professional services',
  })

  const intro =
    docData.intro ||
    (templateId === 'adhoc'
      ? 'First-time client approach: Clear unit rates so you stay in control. We only charge for the services actually performed. Perfect if some devices need more attention than others.'
      : templateId === 'hourly'
        ? 'First-time client advantage: Fair blended hourly rate. You only pay for actual time used — no padding. Estimated total time is shown so you can budget with confidence.'
        : templateId === 'flatrate'
          ? 'Fixed package pricing for a defined scope of work. You know the total before we start. Extra work outside scope is quoted separately.'
          : null)
  y = drawIntro(doc, y, intro)

  const lines = docData.lines || []
  if (lines.length) {
    y = drawSectionTitle(
      doc,
      y,
      templateId === 'adhoc'
        ? '1. AD-HOC RATE CARD'
        : templateId === 'hourly'
          ? '1. PRICING MODEL — HOURLY'
          : templateId === 'flatrate'
            ? '1. PACKAGE PRICING'
            : isQuote
              ? '1. QUOTED ITEMS'
              : '1. LINE ITEMS'
    )
    const headers =
      templateId === 'adhoc'
        ? ['Service', 'Unit', 'Rate (ZAR)', 'Typical use']
        : ['Description', 'Qty', 'Rate', 'Amount']
    const colWidths =
      templateId === 'adhoc' ? [70, 28, 32, 52] : [90, 22, 35, 35]
    const rows = lines.map((l) => {
      if (templateId === 'adhoc') {
        return [
          l.description || l.name || '',
          l.unit || 'per device',
          money(l.price ?? l.rate ?? 0),
          l.typicalUse || l.notes || '',
        ]
      }
      const qty = Number(l.qty) || 1
      const price = Number(l.price) || 0
      return [l.description || '', String(qty), money(price), money(qty * price)]
    })
    y = drawTable(doc, y, headers, rows, colWidths)
  }

  if (docData.exampleRows?.length) {
    y = drawSectionTitle(doc, y, '2. EXAMPLE CALCULATION')
    y = drawTable(
      doc,
      y,
      ['Example scope', 'Qty', 'Rate', 'Amount'],
      docData.exampleRows.map((r) => [
        r.description,
        String(r.qty ?? 1),
        money(r.rate ?? r.price ?? 0),
        money(r.amount ?? (r.qty || 1) * (r.rate || r.price || 0)),
      ]),
      [80, 25, 35, 42]
    )
    if (docData.exampleTotal != null) {
      doc.setFont('helvetica', 'bold')
      doc.text('Indicative total', 14, y)
      doc.text(money(docData.exampleTotal), 196, y, { align: 'right' })
      y += 8
      doc.setFont('helvetica', 'normal')
      y = drawParagraph(doc, y, 'Final invoice = only the services actually performed × the rates above.')
    }
  } else {
    const exclusive = Number(docData.exclusive) || lines.reduce((s, l) => s + (Number(l.qty) || 1) * (Number(l.price) || 0), 0)
    const vat = Number(docData.vatAmount) || 0
    const total = Number(docData.total) || exclusive + vat
    const paid = (options.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0) || Number(docData.amountPaid) || 0
    y = ensureSpace(doc, y, 30)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...SLATE)
    const boxX = 120
    doc.text('Subtotal', boxX, y)
    doc.text(money(exclusive), 196, y, { align: 'right' })
    y += 5
    doc.text('VAT', boxX, y)
    doc.text(money(vat), 196, y, { align: 'right' })
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...GREEN)
    doc.text(isQuote ? 'QUOTE TOTAL' : 'TOTAL', boxX, y)
    doc.text(money(total), 196, y, { align: 'right' })
    y += 6
    if (!isQuote && paid > 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...SLATE)
      doc.text('Amount paid', boxX, y)
      doc.text(money(paid), 196, y, { align: 'right' })
      y += 5
      doc.setFont('helvetica', 'bold')
      doc.text('BALANCE DUE', boxX, y)
      doc.text(money(Math.max(0, total - paid)), 196, y, { align: 'right' })
      y += 6
    }
  }

  if (docData.included?.length) {
    y = drawSectionTitle(doc, y, templateId === 'hourly' ? '2. WHAT IS INCLUDED' : 'INCLUDED')
    y = drawBullets(doc, y, docData.included)
  }

  y = drawSectionTitle(doc, y, isQuote ? 'PAYMENT (COD ACCOUNT)' : 'PAYMENT')
  y = drawParagraph(
    doc,
    y,
    docData.paymentNote ||
      (isQuote
        ? 'Payment due on completion, unless stated otherwise in writing. You receive a simple itemised summary of what was done. Cash, EFT (proof required) or instant payment. Devices / deliverables released only after payment is confirmed.'
        : 'Payment is due as per the terms on this tax invoice. EFT, cash or card as arranged. Bank details appear below where provided.')
  )
  if (!isQuote && (company.bankName || company.accountNumber)) {
    y = drawParagraph(
      doc,
      y,
      `Bank: ${[company.bankName, company.accountNumber && 'Acc ' + company.accountNumber, company.branchCode && 'Branch ' + company.branchCode].filter(Boolean).join(' · ')}`
    )
  }

  if (isQuote && templateId !== 'standard') {
    y = drawSectionTitle(doc, y, 'STRATEGIC VALUE FOR FIRST-TIME CLIENTS')
    y = drawParagraph(
      doc,
      y,
      docData.strategicNote ||
        'You stay in full control of cost. We only charge for real work delivered. This model builds trust quickly — many clients who start on flexible pricing later move to retainer or flat-rate relationships because they already know our quality and fairness.'
    )
  }

  if (docData.notes) {
    y = drawSectionTitle(doc, y, 'NOTES')
    y = drawParagraph(doc, y, docData.notes)
  }

  if (docData.includeTerms !== false) {
    y = drawTerms(doc, y, company.name)
    y = drawAcceptance(doc, y)
  }

  drawFooter(doc, company, isQuote)
  return doc
}

export async function downloadProfessionalPdf(docData, options = {}) {
  const doc = await buildProfessionalPdf(docData, options)
  const name = (docData.number || (options.isQuote ? 'quote' : 'invoice')) + '.pdf'
  doc.save(name)
  return name
}

export async function openProfessionalPdf(docData, options = {}) {
  const doc = await buildProfessionalPdf(docData, options)
  const name = (docData.number || (options.isQuote ? 'quote' : 'invoice')) + '.pdf'
  const url = URL.createObjectURL(doc.output('blob'))
  const w = window.open(url, '_blank')
  if (!w) doc.save(name)
  return url
}

export function demoAdhocLines() {
  return [
    { description: 'Driver installation & verification', unit: 'per device', price: 220, typicalUse: 'Essential for every device' },
    { description: 'Essential applications install', unit: 'per device', price: 150, typicalUse: 'Browser, PDF, media, archive, security' },
    { description: 'Microsoft Office installation', unit: 'per device', price: 120, typicalUse: 'Requires valid customer-supplied licence' },
    { description: 'Windows updates (critical + recommended)', unit: 'per device', price: 120, typicalUse: 'Keeps devices secure & current' },
    { description: 'Light optimisation & cleanup', unit: 'per device', price: 90, typicalUse: 'Startup, temp files, quick tune' },
    { description: 'Email / cloud account setup', unit: 'per account', price: 70, typicalUse: 'Optional add-on' },
    { description: 'On-site call-out (local town)', unit: 'per visit', price: 0, typicalUse: 'Waived for first-time clients' },
  ]
}

export function demoHourlyLines() {
  return [
    { description: 'Blended hourly rate (all devices)', qty: 1, price: 480, notes: 'First-time client rate' },
    { description: 'Estimated hours (min 1)', qty: 2.5, price: 480, notes: 'Typical drivers + apps' },
  ]
}

export function demoFlatLines() {
  return [
    { description: 'Flat-rate package: drivers + essential apps (per device)', qty: 3, price: 450 },
    { description: 'Windows updates package (per device)', qty: 3, price: 100 },
  ]
}
