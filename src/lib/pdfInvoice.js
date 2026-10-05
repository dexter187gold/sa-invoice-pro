
import { formatMoney } from './money.js'
import { APP_NAME, APP_COPYRIGHT, APP_VERSION } from '../config.js'
import { loadJsPdf } from './loadJsPdf.js'

export async function buildInvoicePdf(invoice, { company, client, payments = [] } = {}) {
  const jsPDF = await loadJsPdf()
  const doc = new jsPDF()
  const co = company || {}
  const cl = client || {}
  const paid = (payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0) || Number(invoice.amountPaid) || 0
  const total = Number(invoice.total) || 0
  const due = Math.max(0, total - paid)
  let y = 16
  doc.setFontSize(16)
  doc.setTextColor(0, 122, 77)
  doc.text(co.name || APP_NAME, 14, y)
  y += 7
  doc.setFontSize(9)
  doc.setTextColor(80)
  const coLines = [co.address, co.email, co.phone, co.vatNumber ? 'VAT: ' + co.vatNumber : ''].filter(Boolean)
  for (const line of coLines) { doc.text(String(line), 14, y); y += 4.5 }
  y += 2
  doc.setFontSize(14)
  doc.setTextColor(20)
  doc.text(invoice.isQuote ? 'QUOTATION' : 'TAX INVOICE', 14, y)
  y += 7
  doc.setFontSize(10)
  doc.text('No: ' + (invoice.number || ''), 14, y)
  doc.text('Date: ' + ((invoice.date || '').slice(0, 10)), 120, y)
  y += 5
  doc.text('Due: ' + ((invoice.dueDate || invoice.date || '').slice(0, 10)), 120, y)
  y += 8
  doc.setFont(undefined, 'bold')
  doc.text('Bill to', 14, y)
  doc.setFont(undefined, 'normal')
  y += 5
  doc.text(cl.name || 'Client', 14, y)
  y += 4.5
  if (cl.email) { doc.text(cl.email, 14, y); y += 4.5 }
  if (cl.phone) { doc.text(cl.phone, 14, y); y += 4.5 }
  y += 4
  doc.setFont(undefined, 'bold')
  doc.text('Description', 14, y)
  doc.text('Qty', 120, y)
  doc.text('Amount', 160, y)
  doc.setFont(undefined, 'normal')
  y += 2
  doc.line(14, y, 196, y)
  y += 6
  for (const line of invoice.lines || []) {
    if (y > 250) { doc.addPage(); y = 20 }
    const desc = String(line.description || '').slice(0, 60)
    const qty = Number(line.qty) || 0
    const price = Number(line.price) || 0
    const amt = qty * price
    doc.text(desc, 14, y)
    doc.text(String(qty), 120, y)
    doc.text(formatMoney(amt).replace(/\u00a0/g, ' '), 160, y)
    y += 6
  }
  y += 4
  doc.line(14, y, 196, y)
  y += 7
  doc.text('Subtotal: ' + formatMoney(invoice.exclusive || 0).replace(/\u00a0/g, ' '), 120, y)
  y += 5
  doc.text('VAT: ' + formatMoney(invoice.vatAmount || 0).replace(/\u00a0/g, ' '), 120, y)
  y += 5
  doc.setFont(undefined, 'bold')
  doc.text('TOTAL: ' + formatMoney(total).replace(/\u00a0/g, ' '), 120, y)
  y += 5
  doc.setFont(undefined, 'normal')
  if (paid > 0) {
    doc.text('Amount paid: ' + formatMoney(paid).replace(/\u00a0/g, ' '), 120, y)
    y += 5
    doc.setFont(undefined, 'bold')
    doc.text('BALANCE DUE: ' + formatMoney(due).replace(/\u00a0/g, ' '), 120, y)
    y += 5
    doc.setFont(undefined, 'normal')
  }
  if (invoice.notes) {
    y += 4
    doc.setFontSize(9)
    const notes = doc.splitTextToSize('Notes: ' + invoice.notes, 180)
    doc.text(notes, 14, y)
    y += notes.length * 4 + 4
  }
  if (co.bankName || co.accountNumber) {
    y += 2
    doc.setFontSize(9)
    doc.text('Bank: ' + [co.bankName, co.accountNumber && ('Acc ' + co.accountNumber), co.branchCode && ('Branch ' + co.branchCode)].filter(Boolean).join(' · '), 14, y)
  }
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(APP_NAME + ' · ' + APP_COPYRIGHT + ' · v' + APP_VERSION, 14, 285)
  return doc
}

export async function downloadInvoicePdf(invoice, ctx) {
  const doc = await buildInvoicePdf(invoice, ctx)
  doc.save((invoice.number || 'document') + '.pdf')
}

export async function openInvoicePdf(invoice, ctx) {
  const doc = await buildInvoicePdf(invoice, ctx)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank')
  if (!w) {
    doc.save((invoice.number || 'document') + '.pdf')
  }
  return url
}
