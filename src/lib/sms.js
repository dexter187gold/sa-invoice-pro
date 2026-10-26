/**
 * SMS gateway — Africa's Talking / Clickatell / generic HTTP.
 * Prefer server proxy to avoid browser CORS.
 */
import * as db from './db'
import { audit } from './auditLog'

const KEY = 'sms_config'
const LOG = 'sms_log'

export const SMS_PROVIDERS = [
  { id: 'africastalking', label: "Africa's Talking" },
  { id: 'clickatell', label: 'Clickatell' },
  { id: 'generic', label: 'Generic HTTP POST' },
]

export async function getSmsConfig() {
  const c = (await db.getSetting(KEY)) || {}
  return {
    enabled: !!c.enabled,
    provider: c.provider || 'africastalking',
    apiKey: c.apiKey || '',
    username: c.username || '',
    from: c.from || '',
    proxyUrl: c.proxyUrl || 'https://saip-sync.onrender.com/api/sms/send',
  }
}

export async function saveSmsConfig(patch) {
  const cur = await getSmsConfig()
  const next = { ...cur, ...patch }
  await db.setSetting(KEY, next)
  await audit('sms.config', { provider: next.provider, enabled: next.enabled })
  return next
}

async function pushLog(entry) {
  try {
    const prev = (await db.getSetting(LOG)) || []
    const list = Array.isArray(prev) ? prev : []
    list.unshift({ ...entry, at: new Date().toISOString() })
    await db.setSetting(LOG, list.slice(0, 100))
  } catch {}
}

export async function getSmsLog(limit = 30) {
  const prev = (await db.getSetting(LOG)) || []
  return (Array.isArray(prev) ? prev : []).slice(0, limit)
}

function normalizeMsisdn(phone) {
  let p = String(phone || '').replace(/\D/g, '')
  if (p.startsWith('0') && p.length === 10) p = '27' + p.slice(1)
  if (p.length < 10) return null
  return p
}

export async function sendSms(to, message, opts = {}) {
  const cfg = await getSmsConfig()
  if (!cfg.enabled && !opts.force) {
    throw new Error('SMS gateway disabled — enable under Integrations')
  }
  const msisdn = normalizeMsisdn(to)
  if (!msisdn) throw new Error('Invalid phone number')
  const text = String(message || '').slice(0, 480)

  if (cfg.proxyUrl) {
    const res = await fetch(cfg.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: msisdn,
        message: text,
        from: cfg.from,
        provider: cfg.provider,
        apiKey: cfg.apiKey,
        username: cfg.username,
      }),
    })
    const body = await res.json().catch(() => ({}))
    await pushLog({ to: msisdn, ok: res.ok, provider: cfg.provider, via: 'proxy', status: res.status })
    if (!res.ok) throw new Error(body.error || body.message || 'SMS proxy failed')
    await audit('sms.send', { to: msisdn, via: 'proxy' })
    return body
  }

  if (cfg.provider === 'africastalking') {
    const form = new URLSearchParams()
    form.set('username', cfg.username)
    form.set('to', '+' + msisdn)
    form.set('message', text)
    if (cfg.from) form.set('from', cfg.from)
    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        apiKey: cfg.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    })
    const ok = res.ok
    await pushLog({ to: msisdn, ok, provider: 'africastalking', status: res.status })
    if (!ok) throw new Error("Africa's Talking failed — use SMS proxy URL if CORS blocked")
    await audit('sms.send', { to: msisdn, via: 'africastalking' })
    return { ok: true }
  }

  if (cfg.provider === 'clickatell') {
    const res = await fetch('https://platform.clickatell.com/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: cfg.apiKey,
      },
      body: JSON.stringify({ content: text, to: [msisdn], from: cfg.from || undefined }),
    })
    await pushLog({ to: msisdn, ok: res.ok, provider: 'clickatell', status: res.status })
    if (!res.ok) throw new Error('Clickatell failed — check key or use proxy')
    await audit('sms.send', { to: msisdn, via: 'clickatell' })
    return { ok: true }
  }

  if (!cfg.proxyUrl) throw new Error('Set proxy URL for generic SMS provider')
  throw new Error('Configure SMS provider and proxy')
}

export function smsInvoiceReminder(inv, client, company) {
  const name = (client?.name || '').split(' ')[0] || 'there'
  const co = company?.name || 'us'
  const bal = Number(inv?.amountDue != null ? inv.amountDue : inv?.total) || 0
  return `Hi ${name}, reminder from ${co}: invoice ${inv?.number || ''} balance R${bal.toFixed(2)}. Reply or call us. Thank you.`
}

// Back-compat aliases used by older Settings code
export function loadSmsConfig() {
  return getSmsConfig()
}
