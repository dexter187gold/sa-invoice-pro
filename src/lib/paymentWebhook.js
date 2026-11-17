/**
 * Apply inbound payment webhook payloads to local invoices.
 */
import * as db from './db.js'
import { STORES } from './db.js'
import { audit } from './auditLog.js'

function matchInvoice(invoices, payload) {
  const number = String(payload.invoiceNumber || payload.number || payload.reference || '').trim()
  const id = String(payload.invoiceId || payload.id || '').trim()
  if (id) {
    const byId = invoices.find((i) => String(i.id) === id)
    if (byId) return byId
  }
  if (number) {
    return invoices.find((i) => String(i.number || '').toLowerCase() === number.toLowerCase())
  }
  return null
}

export async function applyPaymentWebhookEvent(payload = {}) {
  const amount = Number(payload.amount || payload.amountPaid || 0)
  const status = String(payload.status || payload.event || '').toLowerCase()
  const paidLike = /paid|success|complete|settled|charge\.success|payment\.success/.test(status) || amount > 0
  if (!paidLike) {
    return { ok: false, reason: 'not_a_paid_event', status }
  }
  const invoices = (await db.getAll(STORES.invoices)) || []
  const inv = matchInvoice(invoices, payload)
  if (!inv) return { ok: false, reason: 'invoice_not_found', payload }

  const payAmount = amount > 0 ? amount : Number(inv.amountDue ?? inv.total) || Number(inv.total) || 0
  const prevPaid = Number(inv.amountPaid) || 0
  const total = Number(inv.total) || 0
  const nextPaid = Math.min(total, prevPaid + payAmount)
  const fullyPaid = nextPaid >= total - 0.009
  const next = {
    ...inv,
    amountPaid: nextPaid,
    amountDue: Math.max(0, total - nextPaid),
    status: fullyPaid ? 'paid' : 'partial',
    paidAt: fullyPaid ? new Date().toISOString() : inv.paidAt,
    updatedAt: new Date().toISOString(),
    paymentSource: payload.provider || payload.source || 'webhook',
    lastWebhookAt: new Date().toISOString(),
  }
  await db.put(STORES.invoices, next)

  try {
    await db.put(STORES.payments, {
      id: `pay-wh-${Date.now()}`,
      invoiceId: inv.id,
      clientId: inv.clientId,
      amount: payAmount,
      method: payload.provider || 'webhook',
      reference: payload.reference || payload.transactionId || '',
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    })
  } catch {}

  try {
    await audit('payment.webhook_applied', { invoiceId: inv.id, amount: payAmount, provider: payload.provider })
  } catch {}

  return { ok: true, invoice: next, fullyPaid }
}
