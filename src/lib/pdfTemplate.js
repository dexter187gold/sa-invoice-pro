/**
 * SA Invoice Pro - Professional document templates
 * Inspired by PC REPAIR DEX quote layout (hourly / flat-rate / ad-hoc COD).
 * Sections: header · banner · client grid · rate tables · payment · T&Cs · acceptance · footer
 */
import { formatMoney } from './money.js'
import { APP_NAME, APP_COPYRIGHT, APP_VERSION } from '../config.js'
import { loadJsPdf } from './loadJsPdf.js'
import { openJsPdf, downloadJsPdf } from './pdfOpen'

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
  }
  const contact = [co.phone, co.email].filter(Boolean).join(' · ')
  if (contact) {
    doc.text(contact, 14, y)
    y += 4
  }
  if (co.vatNumber) {
    doc.text('VAT ' + co.vatNumber, 14, y)
    y += 4
  }
  y += 2
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.4)
  doc.line(14, y, 196, y)
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...SLATE)
  doc.text(docLabel || 'DOCUMENT', 14, y)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  const rightX = 196
  let ry = y - 10
  if (number) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...SLATE)
    doc.text(String(number), rightX, ry, { align: 'right' })
    ry += 5
  }
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(fmtDate(date), rightX, ry, { align: 'right' })
  ry += 5
  if (validUntil) {
    doc.text('Valid until ' + fmtDate(validUntil), rightX, ry, { align: 'right' })
    ry += 5
  }
  if (accountType) {
    doc.setTextColor(...AMBER)
    doc.text(String(accountType), rightX, ry, { align: 'right' })
  }
  return Math.max(y + 6, ry + 4)
}

function drawBanner(doc, y, banner, sub) {
  if (!banner) return y
  y = ensureSpace(doc, y, 18)
  doc.setFillColor(...GREEN)
  doc.roundedRect(14, y, 182, sub ? 14 : 10, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(banner, 105, y + (sub ? 5.5 : 6.5), { align: 'center' })
  if (sub) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(sub, 105, y + 11, { align: 'center' })
  }
  return y + (sub ? 18 : 14)
}

function drawClientGrid(doc, y, client, company) {
  y = ensureSpace(doc, y, 28)
  const c = client || {}
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...SLATE)
  doc.text('FROM', 14, y)
  doc.text('BILL TO', 110, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  const from = [
    company?.name,
    company?.address,
    [company?.city, company?.postalCode].filter(Boolean).join(' '),
    company?.phone,
    company?.email,
    company?.vatNumber && 'VAT ' + company.vatNumber,
  ].filter(Boolean)
  const to = [
    c.name,
    c.company,
    c.address,
    [c.city, c.postalCode].filter(Boolean).join(' '),
    c.phone,
    c.email,
    c.vatNumber && 'VAT ' + c.vatNumber,
  ].filter(Boolean)
  const rows = Math.max(from.length, to.length)
  for (let i = 0; i < rows; i++) {
    if (from[i]) doc.text(String(from[i]).slice(0, 48), 14, y + i * 4)
    if (to[i]) doc.text(String(to[i]).slice(0, 48), 110, y + i * 4)
  }
  return y + rows * 4 + 6
}

function drawSectionTitle(doc, y, title) {
  y = ensureSpace(doc, y, 10)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...GREEN)
  doc.text(title, 14, y)
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.line(14, y + 2, 196, y + 2)
  return y + 7
}

function drawParagraph(doc, y, text, maxW = 182) {
  if (!text) return y
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...SLATE)
  const lines = doc.splitTextToSize(String(text), maxW)
  for (const line of lines) {
    y = ensureSpace(doc, y, 5)
    doc.text(line, 14, y)
    y += 4
  }
  return y + 2
}

function drawLineItems(doc, y, lines, vatRate) {
  y = ensureSpace(doc, y, 16)
  doc.setFillColor(248, 250, 252)
  doc.rect(14, y - 4, 182, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  doc.text('DESCRIPTION', 16, y)
  doc.text('QTY', 120, y, { align: 'right' })
  doc.text('UNIT', 145, y, { align: 'right' })
  doc.text('AMOUNT', 192, y, { align: 'right' })
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SLATE)
  let sub = 0
  let vat = 0
  const rate = (Number(vatRate) || 15) / 100
  for (const line of lines || []) {
    y = ensureSpace(doc, y, 6)
    const qty = Number(line.qty) || 0
    const unit = Number(line.unitPrice ?? line.price) || 0
    const amt = qty * unit
    const inclusive = !!line.vatInclusive
    const lineVat = inclusive ? amt - amt / (1 + rate) : amt * rate
    sub += inclusive ? amt - lineVat : amt
    vat += lineVat
    const desc = String(line.description || line.name || '').slice(0, 55)
    doc.setFontSize(8)
    doc.text(desc, 16, y)
    doc.text(String(qty), 120, y, { align: 'right' })
    doc.text(money(unit), 145, y, { align: 'right' })
    doc.text(money(amt), 192, y, { align: 'right' })
    y += 5
  }
  return { y: y + 2, subtotal: sub, vatTotal: vat, total: sub + vat }
}

function drawTotals(doc, y, subtotal, vatTotal, total) {
  y = ensureSpace(doc, y, 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...SLATE)
  doc.text('Subtotal', 145, y)
  doc.text(money(subtotal), 192, y, { align: 'right' })
  y += 5
  doc.text('VAT', 145, y)
  doc.text(money(vatTotal), 192, y, { align: 'right' })
  y += 6
  doc.setFontSize(11)
  doc.setTextColor(...GREEN)
  doc.text('TOTAL', 145, y)
  doc.text(money(total), 192, y, { align: 'right' })
  return y + 8
}

function drawPayment(doc, y, bank, company) {
  const b = bank || company?.bank || {}
  if (!b.accountName && !b.accountNumber && !company?.bankName) return y
  y = drawSectionTitle(doc, y, 'PAYMENT DETAILS')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...SLATE)
  const rows = [
    (b.bankName || company?.bankName) && 'Bank: ' + (b.bankName || company.bankName),
    b.accountName && 'Account name: ' + b.accountName,
    b.accountNumber && 'Account number: ' + b.accountNumber,
    b.branchCode && 'Branch code: ' + b.branchCode,
    b.reference && 'Reference: ' + b.reference,
  ].filter(Boolean)
  for (const r of rows) {
    y = ensureSpace(doc, y, 5)
    doc.text(r, 14, y)
    y += 4
  }
  return y + 2
}

function drawTerms(doc, y, companyName) {
  y = drawSectionTitle(doc, y, 'TERMS & CONDITIONS')
  const terms = [
    'Payment is due as indicated. COD / on completion unless account terms apply.',
    'Prices are in South African Rand (ZAR). VAT is charged where the supplier is registered.',
    'Workmanship warranty as stated on the invoice (default 14 days) excluding misuse, third-party changes, or hardware failure.',
    'Client is responsible for data backups and valid software licences.',
    'Liability is limited to fees paid for the affected service, to the extent permitted by the Consumer Protection Act 68 of 2008.',
    'Governing law: Republic of South Africa.',
  ]
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  for (const t of terms) {
    y = ensureSpace(doc, y, 8)
    const lines = doc.splitTextToSize('• ' + t, 182)
    doc.text(lines, 14, y)
    y += lines.length * 3.5 + 1
  }
  return y + 2
}

function drawAcceptance(doc, y) {
  y = ensureSpace(doc, y, 28)
  y = drawSectionTitle(doc, y, 'ACCEPTANCE')
  doc.setDrawColor(...MUTED)
  doc.setLineWidth(0.3)
  doc.line(14, y + 12, 90, y + 12)
  doc.line(110, y + 12, 186, y + 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('Client signature / name', 14, y + 17)
  doc.text('Date / Service provider', 110, y + 17)
  return y + 22
}

function drawFooter(doc, company, isQuote) {
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text(
      `${APP_NAME} v${APP_VERSION} · ${APP_COPYRIGHT}` + (isQuote ? ' · Quotation' : ' · Tax invoice'),
      105,
      290,
      { align: 'center' }
    )
  }
}

export async function buildProfessionalPdf(docData, options = {}) {
  const jsPDF = await loadJsPdf()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const isQuote = !!options.isQuote
  const company = docData.company || {}
  const client = docData.client || {}
  const lines = Array.isArray(docData.lines) ? docData.lines : []
  const preset = TEMPLATE_PRESETS.find((p) => p.id === (docData.templateId || options.templateId)) || TEMPLATE_PRESETS[0]

  let y = drawHeader(doc, {
    company,
    docLabel: isQuote ? 'QUOTATION' : 'TAX INVOICE',
    number: docData.number,
    date: docData.date,
    validUntil: docData.validUntil || (isQuote ? addDays(docData.date, 14) : null),
    accountType: docData.accountType,
  })

  y = drawBanner(doc, y, preset.banner, preset.sub)
  y = drawClientGrid(doc, y, client, company)

  if (docData.dueDate && !isQuote) {
    y = ensureSpace(doc, y, 8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...AMBER)
    doc.text('Due: ' + fmtDate(docData.dueDate), 14, y)
    y += 6
  }

  y = drawSectionTitle(doc, y, isQuote ? 'QUOTED ITEMS' : 'LINE ITEMS')
  const totals = drawLineItems(doc, y, lines, docData.vatRate)
  y = totals.y
  y = drawTotals(doc, y, totals.subtotal, totals.vatTotal, totals.total)
  y = drawPayment(doc, y, docData.bank, company)

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
  return downloadJsPdf(doc, name)
}

export async function openProfessionalPdf(docData, options = {}) {
  const doc = await buildProfessionalPdf(docData, options)
  const name = (docData.number || (options.isQuote ? 'quote' : 'invoice')) + '.pdf'
  return openJsPdf(doc, name)
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
