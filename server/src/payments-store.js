/**
 * Lightweight payments ledger for portal Pay Now (Paystack primary).
 * Stored alongside portal-store under DATA_DIR/payments-store.json
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const STORE_PATH = path.join(DATA_DIR, 'payments-store.json')

function ensureDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  } catch {}
}

function load() {
  ensureDir()
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'))
    }
  } catch (e) {
    console.warn('[payments-store] load', e.message)
  }
  return { payments: [], byRef: {} }
}

function save(data) {
  ensureDir()
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8')
}

/** Create a pending payment intent (before redirect / popup). */
export function createPaymentIntent({
  token,
  invoiceId,
  amount,
  currency = 'ZAR',
  email,
  clientId,
  workspaceId,
  metadata = {},
} = {}) {
  const data = load()
  const reference =
    'SAIP_' +
    Date.now().toString(36).toUpperCase() +
    '_' +
    crypto.randomBytes(4).toString('hex')
  const now = new Date().toISOString()
  const row = {
    id: 'pay_' + crypto.randomBytes(8).toString('hex'),
    reference,
    token: String(token || ''),
    invoiceId: String(invoiceId || ''),
    amount: Number(amount) || 0,
    currency: String(currency || 'ZAR').toUpperCase(),
    email: String(email || '').toLowerCase(),
    clientId: String(clientId || ''),
    workspaceId: String(workspaceId || ''),
    status: 'pending',
    provider: 'paystack',
    metadata: metadata || {},
    createdAt: now,
    updatedAt: now,
  }
  data.payments.push(row)
  data.byRef[reference] = row.id
  // keep last 2000
  if (data.payments.length > 2000) {
    const drop = data.payments.splice(0, data.payments.length - 2000)
    drop.forEach((p) => {
      if (data.byRef[p.reference] === p.id) delete data.byRef[p.reference]
    })
  }
  save(data)
  return row
}

export function getPaymentByReference(reference) {
  const data = load()
  const id = data.byRef[String(reference || '')]
  if (!id) return null
  return data.payments.find((p) => p.id === id) || null
}

export function getPaymentById(id) {
  const data = load()
  return data.payments.find((p) => p.id === id) || null
}

/** Mark payment successful (from verify or webhook). Idempotent. */
export function markPaymentSuccess(reference, providerPayload = {}) {
  const data = load()
  const id = data.byRef[String(reference || '')]
  if (!id) return null
  const idx = data.payments.findIndex((p) => p.id === id)
  if (idx < 0) return null
  const prev = data.payments[idx]
  if (prev.status === 'success') {
    return { payment: prev, already: true }
  }
  const now = new Date().toISOString()
  const updated = {
    ...prev,
    status: 'success',
    paidAt: now,
    updatedAt: now,
    providerReference: providerPayload.providerReference || providerPayload.id || prev.providerReference,
    channel: providerPayload.channel || prev.channel,
    fees: providerPayload.fees,
    providerPayload: {
      status: providerPayload.status,
      paid_at: providerPayload.paid_at,
      channel: providerPayload.channel,
      amount: providerPayload.amount,
    },
  }
  data.payments[idx] = updated
  save(data)
  return { payment: updated, already: false }
}

export function markPaymentFailed(reference, reason = '') {
  const data = load()
  const id = data.byRef[String(reference || '')]
  if (!id) return null
  const idx = data.payments.findIndex((p) => p.id === id)
  if (idx < 0) return null
  const prev = data.payments[idx]
  if (prev.status === 'success') return { payment: prev, already: true }
  const now = new Date().toISOString()
  const updated = {
    ...prev,
    status: 'failed',
    failReason: String(reason || '').slice(0, 300),
    updatedAt: now,
  }
  data.payments[idx] = updated
  save(data)
  return { payment: updated, already: false }
}

export function listPaymentsForToken(token, { limit = 50 } = {}) {
  const data = load()
  return data.payments
    .filter((p) => String(p.token) === String(token))
    .slice(-limit)
    .reverse()
}
