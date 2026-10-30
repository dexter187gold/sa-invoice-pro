/**
 * WhatsApp Business Cloud API client (P7).
 * Uses Meta Graph API when token + phone number id are configured.
 * Falls back to wa.me deep links when Cloud API is not configured.
 *
 * Secrets: prefer Dev Portal vault / Render env — never commit tokens.
 */
import { getSetting } from './db.js'
import { loadSecrets } from './devSecrets.js'
import { openWhatsApp } from './whatsappResponder.js'

const GRAPH = 'https://graph.facebook.com/v21.0'

async function resolveConfig() {
  let token = ''
  let phoneNumberId = ''
  let wabaId = ''
  try {
    const vault = loadSecrets()
    token = vault.metaAccessToken || ''
    phoneNumberId = vault.metaPhoneNumberId || ''
    wabaId = vault.metaWabaId || ''
  } catch {}
  try {
    if (!token) token = (await getSetting('metaAccessToken', '')) || ''
    if (!phoneNumberId) phoneNumberId = (await getSetting('metaPhoneNumberId', '')) || ''
    if (!wabaId) wabaId = (await getSetting('metaWabaId', '')) || ''
  } catch {}
  return {
    token: String(token || '').trim(),
    phoneNumberId: String(phoneNumberId || '').trim(),
    wabaId: String(wabaId || '').trim(),
    configured: !!(token && phoneNumberId),
  }
}

function toE164Za(phone) {
  let d = String(phone || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('0')) d = '27' + d.slice(1)
  if (!d.startsWith('27') && d.length === 9) d = '27' + d
  return d
}

/**
 * Send a plain text message via Cloud API, or open wa.me fallback.
 */
export async function sendWhatsAppText({ to, body, preferCloud = true } = {}) {
  const text = String(body || '').trim()
  const e164 = toE164Za(to)
  if (!text) throw new Error('Message body is empty')
  if (!e164) throw new Error('Client phone number is missing')

  const cfg = await resolveConfig()
  if (preferCloud && cfg.configured) {
    const url = `${GRAPH}/${cfg.phoneNumberId}/messages`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: e164,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = data?.error?.message || res.statusText || 'WhatsApp API error'
      throw new Error(err)
    }
    return { channel: 'cloud', id: data?.messages?.[0]?.id, data }
  }

  openWhatsApp(e164, text)
  return { channel: 'wa.me', id: null }
}

/** Job status template-style text (pre-approved wording for ops). */
export function jobStatusMessage({ job, client, company, status } = {}) {
  const name = client?.name || 'there'
  const shop = company?.name || 'our workshop'
  const device = job?.devices || job?.title || 'device'
  const st = String(status || job?.status || 'in progress').replace(/_/g, ' ')
  return `Hi ${name}, update from *${shop}* on your *${device}*:\n\nStatus: *${st}*\nRef: ${job?.number || job?.id || '—'}\n\nReply on this chat if you have questions.`
}

export async function notifyJobStatus({ job, client, company, status } = {}) {
  const body = jobStatusMessage({ job, client, company, status })
  const phone = client?.phone || client?.mobile || job?.clientPhone
  return sendWhatsAppText({ to: phone, body })
}

export async function getWhatsAppConfigStatus() {
  const cfg = await resolveConfig()
  return {
    configured: cfg.configured,
    phoneNumberId: cfg.phoneNumberId ? `${cfg.phoneNumberId.slice(0, 4)}…` : '',
    hasToken: !!cfg.token,
    mode: cfg.configured ? 'cloud' : 'wa.me fallback',
  }
}
