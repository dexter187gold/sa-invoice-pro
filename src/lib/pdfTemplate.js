/**
 * SA Invoice Pro — professional PDF templates (invoice / quote)
 */
import { formatMoney } from './money.js'
import { APP_NAME, APP_COPYRIGHT, APP_VERSION } from '../config.js'
import { loadJsPdf } from './loadJsPdf.js'
import { openJsPdf, downloadJsPdf } from './pdfOpen.js'

const GREEN = [0, 122, 77]
const MUTED = [100, 116, 139]
const SLATE = [51, 65, 85]

export const TEMPLATE_PRESETS = [
  { id: 'standard', label: 'Standard invoice / quote', banner: null },
  { id: 'hourly', label: 'Hourly model (COD)', banner: 'HOURLY MODEL', sub: 'Transparent time-based pricing' },
  { id: 'flatrate', label: 'Flat-rate package (COD)', banner: 'FLAT-RATE PACKAGE', sub: 'Fixed price upfront' },
  { id: 'adhoc', label: 'Ad-hoc rate card (COD)', banner: 'AD-HOC RATE CARD', sub: 'Pay only for what you use' },
]

function money(n) {
  try {
    return formatMoney(n).replace(/\u00a0/g, ' ')
  } catch {
    return 'R ' + (Number(n) || 0).toFixed(2)
  }
}

function fmtDate(d) {
  if (!d) return new Date().toLocaleDateString('en-ZA')
  try {
    return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return String(d).slice(0, 10)
  }
}

export async function buildProfessionalPdf(docData, options = {}) {
  const jsPDF = await loadJsPdf()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const isQuote = !!(options.isQuote || docData.isQuote)
  const company = {
    ...(typeof docData.company === 'object' && docData.company ? docData.company : {}),
    ...(typeof options.company === 'object' && options.company ? options.company : {}),
  }
  const client = {
    ...(typeof docData.client === 'object' && docData.client ? docData.client : {}),
    ...(typeof options.client === 'object' && options.client ? options.client : {}),
  }
  const co = {
    name: company.name || APP_NAME,
    email: company.email || '',
    phone: company.phone || '',
    address: company.address || '',
    vatNumber: company.vatNumber || '',
    bankName: company.bankName || '',
    accountNumber: company.accountNumber || '',
    branchCode: company.branchCode || '',
  }
  const cl = {
    name: client.name || docData.clientName || 'Client',
    email: client.email || '',
    phone: client.phone || '',
    address: client.address || '',
    company: client.company || '',
  }
  const number = docData.number || (isQuote ? 'QT-' : 'INV-') + Date.now().toString().slice(-6)
  const lines = Array.isArray(docData.lines) ? docData.lines : []

  let y = 16
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...GREEN)
  doc.text(String(co.name).toUpperCase().slice(0, 48), 14, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  const contact = [co.phone, co.email].filter(Boolean).join(' · ')
  if (contact) {
    doc.text(contact.slice(0, 90), 14, y)
    y += 4
  }
  if (co.vatNumber) {
    doc.text('VAT ' + co.vatNumber, 14, y)
    y += 4
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...SLATE)
  doc.text(isQuote ? 'QUOTATION' : 'TAX INVOICE', 196, 16, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(String(number), 196, 22, { align: 'right' })
  doc.text(fmtDate(docData.date), 196, 27, { align: 'right' })

  y = Math.max(y, 34) + 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('BILL TO', 14, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...SLATE)
  doc.text(String(cl.name).slice(0, 60), 14, y)
  y += 4
  if (cl.company) {
    doc.text(String(cl.company).slice(0, 60), 14, y)
    y += 4
  }
  const clContact = [cl.phone, cl.email].filter(Boolean).join(' · ')
  if (clContact) {
    doc.setTextColor(...MUTED)
    doc.text(clContact.slice(0, 70), 14, y)
    y += 6
  }

  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('DESCRIPTION', 14, y)
  doc.text('QTY', 120, y, { align: 'right' })
  doc.text('RATE', 150, y, { align: 'right' })
  doc.text('AMOUNT', 196, y, { align: 'right' })
  y += 5
  doc.setDrawColor(226, 232, 240)
  doc.line(14, y, 196, y)
  y += 5

  let sub = 0
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SLATE)
  for (const line of lines) {
    const qty = Number(line.qty) || 1
    const price = Number(line.price ?? line.rate) || 0
    const amt = qty * price
    sub += amt
    if (y > 270) {
      doc.addPage()
      y = 18
    }
    doc.text(String(line.description || line.name || '').slice(0, 55), 14, y)
    doc.text(String(qty), 120, y, { align: 'right' })
    doc.text(money(price), 150, y, { align: 'right' })
    doc.text(money(amt), 196, y, { align: 'right' })
    y += 5
  }

  const vatRate = Number(docData.vatRate ?? options.vatRate ?? 0.15)
  const vatAmount = docData.vatAmount != null ? Number(docData.vatAmount) : sub * (vatRate > 1 ? vatRate / 100 : vatRate)
  const total = docData.total != null ? Number(docData.total) : sub + vatAmount
  const paid = Number(docData.amountPaid || 0)

  y += 4
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal', 140, y)
  doc.text(money(sub), 196, y, { align: 'right' })
  y += 5
  doc.text('VAT', 140, y)
  doc.text(money(vatAmount), 196, y, { align: 'right' })
  y += 5
  doc.setFont('helvetica', 'bold')
  doc.text(isQuote ? 'QUOTE TOTAL' : 'TOTAL', 140, y)
  doc.text(money(total), 196, y, { align: 'right' })
  y += 6
  if (!isQuote && paid > 0) {
    doc.setFont('helvetica', 'normal')
    doc.text('Paid', 140, y)
    doc.text(money(paid), 196, y, { align: 'right' })
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.text('BALANCE DUE', 140, y)
    doc.text(money(Math.max(0, total - paid)), 196, y, { align: 'right' })
  }

  if (co.bankName || co.accountNumber) {
    y += 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...GREEN)
    doc.text('PAYMENT DETAILS', 14, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE)
    const bank = [co.bankName, co.accountNumber && 'Acc ' + co.accountNumber, co.branchCode && 'Branch ' + co.branchCode]
      .filter(Boolean)
      .join(' · ')
    doc.text(bank.slice(0, 90), 14, y)
  }

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text(`${APP_NAME} · ${APP_COPYRIGHT} · v${APP_VERSION}`, 105, 290, { align: 'center' })
  }
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
  return [{ description: 'Driver installation', unit: 'per device', price: 220, typicalUse: 'Essential' }]
}
export function demoHourlyLines() {
  return [{ description: 'Blended hourly rate', qty: 1, price: 480 }]
}
export function demoFlatLines() {
  return [{ description: 'Flat-rate package', qty: 1, price: 450 }]
}
