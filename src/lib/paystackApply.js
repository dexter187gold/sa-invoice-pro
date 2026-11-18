/**
 * Apply Paystack return / verify payloads to the local desk invoice.
 */
import { applyPaymentWebhookEvent } from './paymentWebhook.js'

const LS_PENDING = 'saip_paystack_pending_refs'

function readPending() {
  try {
    return JSON.parse(localStorage.getItem(LS_PENDING) || '[]')
  } catch {
    return []
  }
}

function writePending(arr) {
  try {
    localStorage.setItem(LS_PENDING, JSON.stringify((arr || []).slice(-40)))
  } catch {}
}

export function rememberPaystackReference({ reference, invoiceId, invoiceNumber, amount }) {
  if (!reference) return
  const list = readPending().filter((x) => x.reference !== reference)
  list.push({
    reference,
    invoiceId: invoiceId || null,
    invoiceNumber: invoiceNumber || null,
    amount: amount != null ? Number(amount) : null,
    at: new Date().toISOString(),
  })
  writePending(list)
}

export async function applyPaystackReturnFromUrl(search = typeof location !== 'undefined' ? location.search : '') {
  const params = new URLSearchParams(search || '')
  const reference = params.get('reference') || params.get('trxref') || ''
  if (!reference) return { ok: false, reason: 'no_reference' }

  const pending = readPending().find((x) => x.reference === reference) || {}
  const amountRand =
    pending.amount != null
      ? Number(pending.amount)
      : params.get('amount')
        ? Number(params.get('amount'))
        : 0

  const payload = {
    status: 'paid',
    provider: 'paystack',
    reference,
    invoiceId: pending.invoiceId || params.get('invoiceId') || '',
    invoiceNumber: pending.invoiceNumber || params.get('invoiceNumber') || params.get('number') || '',
    amount: amountRand > 1000 ? amountRand / 100 : amountRand,
    source: 'paystack_return',
  }

  const result = await applyPaymentWebhookEvent(payload)
  if (result.ok) {
    writePending(readPending().filter((x) => x.reference !== reference))
  }
  return result
}

export async function flushPendingPaystackRefs() {
  const list = readPending()
  const done = []
  for (const item of list) {
    const r = await applyPaymentWebhookEvent({
      status: 'paid',
      provider: 'paystack',
      reference: item.reference,
      invoiceId: item.invoiceId || '',
      invoiceNumber: item.invoiceNumber || '',
      amount: item.amount || 0,
      source: 'paystack_pending_flush',
    })
    if (r.ok) done.push(item.reference)
  }
  if (done.length) writePending(readPending().filter((x) => !done.includes(x.reference)))
  return { applied: done.length, references: done }
}
