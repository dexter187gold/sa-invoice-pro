/**
 * Apply Paystack return / verify payloads to the local desk invoice.
 * On success, deep-link target is exposed as result.deepLink = /invoices/:id
 */
import { applyPaymentWebhookEvent } from './paymentWebhook.js'

const LS_PENDING = 'saip_paystack_pending_refs'
const SS_DEEP = 'saip_paystack_deeplink'

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

export function consumePaystackDeepLink() {
  try {
    const raw = sessionStorage.getItem(SS_DEEP)
    if (!raw) return null
    sessionStorage.removeItem(SS_DEEP)
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function setDeepLink(invoiceId, number) {
  if (!invoiceId) return
  try {
    sessionStorage.setItem(
      SS_DEEP,
      JSON.stringify({ invoiceId, number: number || null, at: new Date().toISOString() }),
    )
  } catch {}
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
    const inv = result.invoice
    setDeepLink(inv?.id, inv?.number)
    result.deepLink = inv?.id ? `/invoices/${inv.id}` : null
  }
  return result
}

export async function flushPendingPaystackRefs() {
  const list = readPending()
  const done = []
  let lastInvoice = null
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
    if (r.ok) {
      done.push(item.reference)
      lastInvoice = r.invoice
    }
  }
  if (done.length) writePending(readPending().filter((x) => !done.includes(x.reference)))
  if (lastInvoice?.id) setDeepLink(lastInvoice.id, lastInvoice.number)
  return {
    applied: done.length,
    references: done,
    deepLink: lastInvoice?.id ? `/invoices/${lastInvoice.id}` : null,
  }
}
