/**
 * Apply inbound payment webhook payloads to local invoices.
 */
import * as db from './db.js'
import { STORES } from './db.js'
import { audit } from './auditLog.js'

function matchInvoice(invoices, payload) {
  const number = String(payload.invoiceNumber || payload.number || payload.reference_label || '').trim()
  const id = String(payload.invoiceId || payload.id || '').trim()
  const ref = String(payload.reference || payload.transactionId || '').trim()
  if (id) {
    const byId = invoices.find((i) => String(i.id) === id)
    if (byId) return byId
  }
  if (number) {
    const byNum = invoices.find((i) => String(i.number || '').toLowerCase() === number.toLowerCase())
    if (byNum) return byNum
  }
  if (ref) {
    const byRef = invoices.find(
      (i) =>
        String(i.paymentReference || '') === ref ||
        String(i.lastPaymentReference || '') === ref ||
        String(i.notes || '').includes(ref),
    )
    if (byRef) return byRef
  }
  return null
}

export async function applyPaymentWebhookEvent(payload = {}) {
  let amount = Number(payload.amount || payload.amountPaid || 0)
  if (payload.amount_in_cents != null) amount = Number(payload.amount_in_cents) / 100
  else if (amount > 0 && payload.unit === 'cents') amount = amount / 100

  const status = String(payload.status || payload.event || '').toLowerCase()
  const paidLike =
    /paid|success|complete|settled|charge\.success|payment\.success/.test(status) || amount > 0
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
    paymentReference: payload.reference || inv.paymentReference || '',
    lastPaymentReference: payload.reference || inv.lastPaymentReference || '',
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
    await audit('payment.webhook_applied', {
      invoiceId: inv.id,
      amount: payAmount,
      provider: payload.provider,
      reference: payload.reference,
    })
  } catch {}

  return { ok: true, invoice: next, fullyPaid }
}
