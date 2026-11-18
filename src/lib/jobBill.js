/**
 * Bill one or many job cards onto a single client invoice.
 */
import * as db from './db.js'
import { STORES } from './db.js'
import { invoiceTotals } from './money.js'
import { invoiceFromTicket } from './ticketActions.js'

export async function invoiceFromTickets(tickets, {
  invoices = [],
  vatRate = 0.15,
  vatEnabled = true,
  defaultRate = 450,
  markResolved = true,
  force = false,
  billingOptions = {},
} = {}) {
  const list = (tickets || []).filter(Boolean)
  if (!list.length) throw new Error('Select at least one job card')

  const hasExtras = Boolean(billingOptions?.fuelEnabled || billingOptions?.calloutEnabled || billingOptions?.diagnosticsEnabled || billingOptions?.consumablesEnabled || billingOptions?.otherEnabled);
  if (list.length === 1 && !force && !hasExtras) {
    const inv = await invoiceFromTicket(list[0], {
      invoices, vatRate, vatEnabled, defaultRate, markResolved, force,
    })
    return { invoice: inv, ticketIds: [list[0].id], lines: inv.lines || [] }
  }

  const clientIds = [...new Set(list.map((t) => String(t.clientId || '')).filter(Boolean))]
  if (clientIds.length > 1) {
    throw new Error('Selected job cards belong to different clients — pick one client only')
  }
  const clientId = clientIds[0] || list[0].clientId || ''

  const already = list.filter((t) => t.invoiceId && !force)
  if (already.length === list.length) {
    const existing = await db.get(STORES.invoices, already[0].invoiceId).catch(() => null)
    if (existing) return { invoice: { ...existing, _alreadyInvoiced: true }, ticketIds: list.map((t) => t.id), lines: existing.lines || [] }
  }

  const lines = []
  for (const ticket of list) {
    if (ticket.invoiceId && !force) continue
    const labourPrice =
      Number(ticket.amount || ticket.quotedAmount || ticket.labourAmount) || defaultRate
    const descParts = [
      ticket.title || ticket.subject,
      ticket.jobType ? `[${ticket.jobType}]` : '',
      ticket.scheduledDate ? `Date: ${String(ticket.scheduledDate).slice(0, 10)}` : '',
      ticket.scheduledTime ? `Time: ${ticket.scheduledTime}` : '',
      ticket.siteAddress || ticket.location ? `Site: ${ticket.siteAddress || ticket.location}` : '',
      ticket.workDone || ticket.description || '',
      ticket.devices || ticket.serials || '',
    ].filter(Boolean)
    const detail = [
      ticket.id ? `Job card: ${ticket.id}` : '',
      ticket.assignee || ticket.technician ? `Technician: ${ticket.assignee || ticket.technician}` : '',
      ticket.priority ? `Priority: ${ticket.priority}` : '',
    ].filter(Boolean);
    lines.push({
      description: [descParts.join(' · ') || 'Job card service', ...detail].join(' · '),
      qty: 1,
      price: labourPrice,
      ticketId: ticket.id,
      category: 'labour',
    })
    if (Array.isArray(ticket.parts)) {
      for (const part of ticket.parts) {
        lines.push({
          description: `${part.name || part.description || 'Part'} (job ${ticket.title || ticket.id})`,
          qty: Number(part.qty) || 1,
          price: Number(part.price) || 0,
          ticketId: ticket.id,
          category: 'parts',
        })
      }
    }
  }
  if (!lines.length) {
    lines.push({ description: 'Job card services', qty: 1, price: defaultRate, category: 'labour' })
  }

  // Optional invoice-level charges are only added when the operator enables them.
  const addOptionalLine = (enabled, description, qty, price, category) => {
    const q = Number(qty) || 0
    const p = Number(price) || 0
    if (enabled && q > 0 && p >= 0 && q * p > 0) {
      lines.push({ description, qty: q, price: p, category })
    }
  }
  if (billingOptions.fuelEnabled) {
    const km = Number(billingOptions.fuelKm) || 0
    const rate = Number(billingOptions.fuelRate) || 0
    if (billingOptions.fuelMode === 'distance') {
      addOptionalLine(true, `Travel / fuel charge (${km} km × R ${rate.toFixed(2)} per km)`, km, rate, 'fuel')
    } else {
      addOptionalLine(true, billingOptions.fuelDescription || 'Fuel / travel charge', 1, billingOptions.fuelAmount, 'fuel')
    }
  }
  addOptionalLine(billingOptions.calloutEnabled, billingOptions.calloutDescription || 'Call-out fee', 1, billingOptions.calloutAmount, 'callout')
  addOptionalLine(billingOptions.diagnosticsEnabled, billingOptions.diagnosticsDescription || 'Diagnostic / assessment fee', 1, billingOptions.diagnosticsAmount, 'diagnostics')
  addOptionalLine(billingOptions.consumablesEnabled, billingOptions.consumablesDescription || 'Consumables / workshop materials', 1, billingOptions.consumablesAmount, 'consumables')
  addOptionalLine(billingOptions.otherEnabled, billingOptions.otherDescription || 'Additional service charge', 1, billingOptions.otherAmount, 'other')

  const totals = invoiceTotals(lines, vatRate, vatEnabled)
  const year = new Date().getFullYear()
  const sameYear = (invoices || []).filter((i) => String(i.number || '').includes(String(year)))
  const number = `INV-${year}-${String(sameYear.length + 1).padStart(4, '0')}`
  const today = new Date().toISOString().slice(0, 10)
  const ticketIds = list.map((t) => t.id)
  const payload = {
    clientId,
    number,
    date: today,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    status: 'unpaid',
    lines,
    notes: `Billed from ${ticketIds.length} job card(s): ${ticketIds.join(', ')}`,
    amountPaid: 0,
    amountDue: totals.total,
    total: totals.total,
    exclusive: totals.exclusive,
    vatAmount: totals.vat,
    fromTicketIds: ticketIds,
    fromTicketId: ticketIds[0],
    technician: list.map((t) => t.assignee || t.technician).filter(Boolean).join(', '),
    siteAddress: list.map((t) => t.siteAddress || t.location).filter(Boolean).join(' | '),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const inv = await db.add(STORES.invoices, payload)

  for (const ticket of list) {
    if (ticket.invoiceId && !force) continue
    const history = Array.isArray(ticket.statusHistory) ? [...ticket.statusHistory] : []
    const nextStatus = markResolved && !['closed', 'resolved'].includes(ticket.status)
      ? 'resolved'
      : ticket.status
    if (nextStatus !== ticket.status) {
      history.push({
        from: ticket.status,
        to: nextStatus,
        at: new Date().toISOString(),
        note: 'Invoiced (multi job-card bill)',
      })
    }
    await db.put(STORES.tickets, {
      ...ticket,
      invoiceId: inv.id,
      invoiceNumber: inv.number,
      invoicedAt: new Date().toISOString(),
      status: nextStatus || ticket.status,
      statusHistory: history.slice(-40),
      updatedAt: new Date().toISOString(),
      closedAt:
        nextStatus === 'resolved' || nextStatus === 'closed'
          ? ticket.closedAt || new Date().toISOString()
          : ticket.closedAt,
    })
  }

  return { invoice: inv, ticketIds, lines }
}

export function ticketsShareClient(tickets) {
  const ids = [...new Set((tickets || []).map((t) => String(t.clientId || '')).filter(Boolean))]
  return ids.length <= 1
}
