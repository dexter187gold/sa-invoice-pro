/**
 * Self-serve billing: plans → PayFast checkout → claim by email.
 * Account/email seats — not IP or MAC.
 */
import { getServerUrl, getHardwareId } from './license.js'
import { getSetting, setSetting } from './db.js'
import { SA_CONFIG } from '../config.js'

export async function fetchBillingPlans() {
  const base = (await getServerUrl()) || SA_CONFIG.defaultLicenseServerUrl
  const res = await fetch(`${base.replace(/\/$/, '')}/api/billing/plans`, {
    headers: { Accept: 'application/json' },
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j.error || 'Could not load plans')
  return j.plans || []
}

export async function startCheckout({ plan, email, returnUrl, cancelUrl } = {}) {
  const base = ((await getServerUrl()) || SA_CONFIG.defaultLicenseServerUrl || '').replace(/\/$/, '')
  if (!base) throw new Error('License server URL not set')
  const body = {
    plan: plan || 'shop',
    email: (email || '').trim().toLowerCase(),
    return_url: returnUrl || `${window.location.origin}/license?paid=1`,
    cancel_url: cancelUrl || `${window.location.origin}/license?cancelled=1`,
  }
  if (!body.email || !body.email.includes('@')) {
    throw new Error('Enter the email that will own this license')
  }
  await setSetting('licenseEmail', body.email)
  const res = await fetch(`${base}/api/billing/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(j.error || 'Checkout unavailable')
    err.details = j
    throw err
  }
  return j
}

/** Browser-submit PayFast form (same pattern as portal pay). */
export function submitPayFastForm(processUrl, fields) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = processUrl
  Object.entries(fields || {}).forEach(([k, v]) => {
    const inp = document.createElement('input')
    inp.type = 'hidden'
    inp.name = k
    inp.value = v == null ? '' : String(v)
    form.appendChild(inp)
  })
  document.body.appendChild(form)
  form.submit()
}

export async function buyPlan(plan, email) {
  const session = await startCheckout({ plan, email })
  if (!session.configured || !session.processUrl) {
    throw new Error(session.error || 'PayFast not configured on license server')
  }
  submitPayFastForm(session.processUrl, session.fields)
  return session
}

export async function claimPaidLicense(email) {
  const base = ((await getServerUrl()) || SA_CONFIG.defaultLicenseServerUrl || '').replace(/\/$/, '')
  const deviceId = await getHardwareId()
  const res = await fetch(`${base}/api/billing/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: (email || '').trim().toLowerCase(), deviceId, hwid: deviceId }),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j.error || 'Claim failed')
  if (j.key) {
    await setSetting('licenseKey', j.key)
    await setSetting('licenseMeta', j.meta || { server: true, email, plan: j.plan })
    await setSetting('licenseEmail', email)
  }
  return j
}

export async function billingStatus(email) {
  const base = ((await getServerUrl()) || SA_CONFIG.defaultLicenseServerUrl || '').replace(/\/$/, '')
  const res = await fetch(
    `${base}/api/billing/status?email=${encodeURIComponent((email || '').trim().toLowerCase())}`,
    { headers: { Accept: 'application/json' } },
  )
  return res.json().catch(() => ({}))
}

export async function getLicenseEmail() {
  return (await getSetting('licenseEmail', '')) || ''
}
