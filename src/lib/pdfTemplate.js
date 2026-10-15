/**
 * Professional PDF template (invoice / quote) — shared layout helpers.
 * Capacitor / Android WebView-safe via openJsPdf / downloadJsPdf.
 */
import { formatMoney } from './money.js'
import { APP_NAME, APP_COPYRIGHT, APP_VERSION } from '../config.js'
import { loadJsPdf } from './loadJsPdf.js'
import { openJsPdf, downloadJsPdf } from './pdfOpen'

const GREEN = [0, 122, 77]
const AMBER = [217, 119, 6]
const SLATE = [51, 65, 85]
const LIGHT = [248, 250, 252]
const MUTED = [100, 116, 139]

function drawHeader(doc, company, title, number, dateStr) {
  const pageW = doc.internal.pageSize.getWidth()
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(company?.name || APP_NAME, 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  if (company?.tagline) doc.text(String(company.tagline).slice(0, 60), 14, 18)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(title, pageW - 14, 12, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(number || '', pageW - 14, 18, { align: 'right' })
  if (dateStr) doc.text(dateStr, pageW - 14, 23, { align: 'right' })
  doc.setTextColor(...SLATE)
}

function drawFooter(doc, page, totalPages) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(`${APP_NAME} v${APP_VERSION} · ${APP_COPYRIGHT}`, 14, pageH - 8)
  doc.text(`Page ${page} of ${totalPages}`, pageW - 14, pageH - 8, { align: 'right' })
}

export async function buildProfessionalPdf(docData, options = {}) {
  const { jsPDF } = await loadJsPdf()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const isQuote = !!options.isQuote
  const title = isQuote ? 'QUOTATION' : 'TAX INVOICE'
  const company = docData.company || {}
  const client = docData.client || {}
  const lines = Array.isArray(docData.lines) ? docData.lines : []
  const number = docData.number || ''
  const dateStr = docData.date || new Date().toISOString().slice(0, 10)
  const dueDate = docData.dueDate || ''
  const notes = docData.notes || ''
  const bank = docData.bank || company.bank || {}

  drawHeader(doc, company, title, number, dateStr)

  let y = 36
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE)
  doc.text('From', 14, y)
  doc.text('Bill to', 110, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const fromLines = [
    company.name,
    company.address,
    company.city || company.suburb,
    company.vatNumber ? `VAT: ${company.vatNumber}` : null,
    company.phone,
    company.email,
  ].filter(Boolean)
  fromLines.forEach((l, i) => doc.text(String(l).slice(0, 45), 14, y + i * 4.5))
  const toLines = [
    client.name,
    client.company,
    client.address,
    client.city || client.suburb,
    client.vatNumber ? `VAT: ${client.vatNumber}` : null,
    client.phone,
    client.email,
  ].filter(Boolean)
  toLines.forEach((l, i) => doc.text(String(l).slice(0, 45), 110, y + i * 4.5))
  y += Math.max(fromLines.length, toLines.length) * 4.5 + 8

  if (dueDate && !isQuote) {
    doc.setFont('helvetica', 'bold')
    doc.text(`Due: ${dueDate}`, 14, y)
    y += 6
  }

  // Table header
  doc.setFillColor(...LIGHT)
  doc.rect(14, y - 4, 182, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Description', 16, y)
  doc.text('Qty', 120, y, { align: 'right' })
  doc.text('Unit', 140, y, { align: 'right' })
  doc.text('Amount', 192, y, { align: 'right' })
  y += 6
  doc.setFont('helvetica', 'normal')

  let subtotal = 0
  let vatTotal = 0
  for (const line of lines) {
    if (y > 260) {
      doc.addPage()
      y = 20
    }
    const qty = Number(line.qty) || 0
    const unit = Number(line.unitPrice ?? line.price) || 0
    const amt = qty * unit
    const vatRate = Number(line.vatRate ?? docData.vatRate ?? 15) / 100
    const lineVat = line.vatInclusive ? amt - amt / (1 + vatRate) : amt * vatRate
    subtotal += line.vatInclusive ? amt - lineVat : amt
    vatTotal += lineVat
    doc.setFontSize(8)
    const desc = String(line.description || line.name || '').slice(0, 55)
    doc.text(desc, 16, y)
    doc.text(String(qty), 120, y, { align: 'right' })
    doc.text(formatMoney(unit), 140, y, { align: 'right' })
    doc.text(formatMoney(amt), 192, y, { align: 'right' })
    y += 5
  }

  y += 4
  const total = subtotal + vatTotal
  doc.setFont('helvetica', 'bold')
  doc.text('Subtotal', 140, y)
  doc.text(formatMoney(subtotal), 192, y, { align: 'right' })
  y += 5
  doc.text('VAT', 140, y)
  doc.text(formatMoney(vatTotal), 192, y, { align: 'right' })
  y += 5
  doc.setFontSize(11)
  doc.setTextColor(...GREEN)
  doc.text('TOTAL', 140, y)
  doc.text(formatMoney(total), 192, y, { align: 'right' })
  doc.setTextColor(...SLATE)
  y += 10

  if (notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Notes', 14, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const split = doc.splitTextToSize(String(notes), 180)
    doc.text(split, 14, y)
    y += split.length * 4 + 4
  }

  if (bank?.accountName || bank?.accountNumber) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Bank details', 14, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    ;[
      bank.bankName && `Bank: ${bank.bankName}`,
      bank.accountName && `Account: ${bank.accountName}`,
      bank.accountNumber && `Number: ${bank.accountNumber}`,
      bank.branchCode && `Branch: ${bank.branchCode}`,
      bank.reference && `Ref: ${bank.reference}`,
    ]
      .filter(Boolean)
      .forEach((l, i) => doc.text(l, 14, y + i * 4))
  }

  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(doc, p, totalPages)
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
  return [
    { description: 'Consulting services', qty: 2, unitPrice: 1500, vatRate: 15 },
    { description: 'Materials', qty: 1, unitPrice: 450, vatRate: 15 },
  ]
}
