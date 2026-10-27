/**
 * Convert accepted quote → tax invoice (desk one-tap).
 */
import * as db from './db.js'
import { STORES } from './db.js'
import { invoiceTotals } from './money.js'

export function canConvertQuote(quote) {
  if (!quote) return false
  const s = String(quote.status || '').toLowerCase()
  if (s === 'converted') return false
  if (s === 'rejected') return false
  if (s === 'accepted') return true
  if (String(quote.portalDecision || '').toLowerCase() === 'accepted') return true
  // Desk may convert sent/draft when operator chooses
  return s === 'draft' || s === 'sent'
}

export async function convertQuoteToInvoice(quote, { invoices = [], vatRate = 0.15, vatEnabled = true } = {}) {
  if (!quote) throw new Error('Quote required')
  if (String(quote.status || '').toLowerCase() === 'converted') {
    throw new Error('Already converted')
  }
  const lines = (quote.lines || []).map((l) => ({
    description: l.description || l.name || 'Line',
    qty: l.qty != null ? l.qty : 1,
    price: Number(l.price) || 0,
    unit: l.unit,
  }))
  if (!lines.length) {
    lines.push({
      description: quote.notes || quote.number || 'Quotation',
      qty: 1,
      price: Number(quote.total) || 0,
    })
  }
  const t = invoiceTotals(
    lines.map((l) => ({ qty: l.qty, price: l.price })),
    vatRate,
    vatEnabled,
  )
  const year = new Date().getFullYear()
  const number = `INV-${year}-${String((invoices || []).length + 1).padStart(4, '0')}`
  const notesParts = [
    quote.notes || '',
    quote.serviceType ? `Service: ${quote.serviceType}` : '',
    quote.devices ? `Devices: ${quote.devices}` : '',
    quote.portalNote ? `Client portal note: ${quote.portalNote}` : '',
    `Converted from quote ${quote.number || quote.id}`,
  ].filter(Boolean)

  const inv = await db.add(STORES.invoices, {
    clientId: quote.clientId,
    number,
    date: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    status: 'unpaid',
    lines,
    exclusive: quote.exclusive != null ? quote.exclusive : t.exclusive,
    vatAmount: quote.vatAmount != null ? quote.vatAmount : t.vat,
    total: quote.total != null ? quote.total : t.total,
    amountPaid: 0,
    amountDue: quote.total != null ? quote.total : t.total,
    fromQuoteId: quote.id,
    templateId: ['adhoc', 'hourly', 'flatrate'].includes(quote.templateId)
      ? 'standard'
      : quote.templateId || 'standard',
    devices: quote.devices,
    serviceType: quote.serviceType,
    accountType: quote.accountType,
    notes: notesParts.join('\n'),
  })

  await db.put(STORES.quotes, {
    ...quote,
    status: 'converted',
    convertedAt: new Date().toISOString(),
    invoiceId: inv.id,
    updatedAt: new Date().toISOString(),
  })

  return { invoice: inv, quoteId: quote.id }
}
