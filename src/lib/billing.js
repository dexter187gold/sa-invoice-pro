/**
 * Self-serve billing: plans → PayFast/Paystack checkout → claim / key activate.
 * Account/email seats — not IP or MAC.
 * Contribution tips use plan ids tip_1, tip_10, tip_20, tip_30, tip_50, tip_100.
 * Default browser return matches Paystack dashboard callback:
 * https://sa-invoice.pages.dev/payment-success.html
 */
import { getServerUrl, getHardwareId } from './license.js'
import { getSetting, setSetting } from './db.js'
import { SA_CONFIG } from '../config.js'

const MARKETING_SUCCESS =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PAYMENT_SUCCESS_URL) ||
  'https://sa-invoice.pages.dev/payment-success.html'

function defaultReturnUrl() {
  return MARKETING_SUCCESS
}

export async function fetchBillingPlans() {
  const base = (await getServerUrl()) || SA_CONFIG.defaultLicenseServerUrl
  const res = await fetch(`${base.replace(/\/$/, '')}/api/billing/plans`, {
    headers: { Accept: 'application/json' },
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j.error || 'Could not load plans')
  return j.plans || []
}

export async function startCheckout({ plan, email, phone, returnUrl, cancelUrl } = {}) {
  const base = ((await getServerUrl()) || SA_CONFIG.defaultLicenseServerUrl || '').replace(/\/$/, '')
  const body = {
    plan: plan || 'shop',
    email: (email || '').trim().toLowerCase(),
    phone: String(phone || '').trim(),
    returnUrl: returnUrl || defaultReturnUrl(),
    cancelUrl: cancelUrl || defaultReturnUrl(),
  }
  const res = await fetch(`${base}/api/billing/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j.error || j.message || 'Checkout failed')
  await setSetting('licenseEmail', body.email)
  return j
}

export async function buyPlan(plan, email, provider = 'paystack', phone = '') {
  const cleanPhone = String(phone || '').trim()
  if (provider === 'paystack' || provider === 'payfast') {
    const session = await startCheckout({ plan, email, phone: cleanPhone })
    if (session.redirectUrl || session.url) {
      window.location.href = session.redirectUrl || session.url
      return session
    }
    throw new Error(session.error || session.message || 'Checkout did not return a payment URL')
  }
  const base = ((await getServerUrl()) || SA_CONFIG.defaultLicenseServerUrl || '').replace(/\/$/, '')
  const res = await fetch(`${base}/api/billing/buy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan, email: (email || '').trim().toLowerCase(), phone: cleanPhone }),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j.error || 'Purchase failed')
  await setSetting('licenseEmail', (email || '').trim().toLowerCase())
  return j
}

/** Optional “buy us a coffee” contribution (ZAR). Maps to plan tip_{amount}. */
export async function contribute(amountZar, email, phone = '', provider = 'paystack') {
  const n = Number(amountZar)
  if (!Number.isFinite(n) || n <= 0) throw new Error('Invalid contribution amount')
  return buyPlan(`tip_${n}`, email, provider, phone)
}

export async function claimPaidLicense(email) {
  const base = ((await getServerUrl()) || SA_CONFIG.defaultLicenseServerUrl || '').replace(/\/$/, '')
  const res = await fetch(`${base}/api/billing/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: (email || '').trim().toLowerCase() }),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j.error || 'Claim failed')
  if (j.meta || j.plan) {
    await setSetting('licenseMeta', { server: true, email, plan: j.plan, seats: j.seats, activatedAt: j.meta?.activatedAt || new Date().toISOString(), ...(j.meta || {}) })
  }
  await setSetting('licenseEmail', email)
  try { window.dispatchEvent(new CustomEvent('sa-license-updated', { detail: { plan: j.plan } })) } catch {}
  return j
}

export async function billingStatus(email) {
  const base = ((await getServerUrl()) || SA_CONFIG.defaultLicenseServerUrl || '').replace(/\/$/, '')
  const q = encodeURIComponent((email || '').trim().toLowerCase())
  const res = await fetch(`${base}/api/billing/status?email=${q}`, { headers: { Accept: 'application/json' } })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j.error || 'Status failed')
  return j
}

export async function verifyPaystackReturn(reference, email) {
  const base = ((await getServerUrl()) || SA_CONFIG.defaultLicenseServerUrl || '').replace(/\/$/, '')
  const res = await fetch(`${base}/api/billing/paystack/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference, email: (email || '').trim().toLowerCase() }),
  })
  const result = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(result.error || 'Verify failed')
  if (result.paid && result.activation) {
    const activation = result.activation
    try { window.dispatchEvent(new CustomEvent('sa-license-updated', { detail: { plan: activation.plan } })) } catch {}
    return { paid: true, activated: true, plan: activation.plan, activation, transaction: result.transaction || {}, payment: result }
  }
  return { paid: !!result.paid, activated: false, ...result }
}

export async function getLicenseEmail() {
  return (await getSetting('licenseEmail', '')) || ''
}

export async function saveLicenseContact(email, phone = '') {
  const em = String(email || '').trim().toLowerCase()
  const ph = String(phone || '').trim()
  if (!em || !em.includes('@')) throw new Error('Enter a valid email')
  await setSetting('licenseEmail', em)
  await setSetting('licensePhone', ph)
  let server = { ok: false }
  try {
    const base = ((await getServerUrl()) || SA_CONFIG.defaultLicenseServerUrl || '').replace(/\/$/, '')
    let hwid = ''
    try { hwid = (await getHardwareId()) || '' } catch {}
    const res = await fetch(`${base}/api/license/contact-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: em, phone: ph, hwid }),
    })
    server = await res.json().catch(() => ({}))
  } catch {
    server = { ok: false, offline: true }
  }
  return { ok: true, email: em, phone: ph, server }
}

export async function getLicensePhone() {
  return (await getSetting('licensePhone', '')) || ''
}
