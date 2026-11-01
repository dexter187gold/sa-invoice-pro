/**
 * WhatsApp Cloud API (Meta) — send text / job status / approved templates from the desk.
 * Prefers saip-sync proxy so the long-lived token never ships to the browser in production.
 * Falls back to direct Graph when proxy is unavailable and local secrets exist (dev).
 */
import * as db from './db.js'
import { audit } from './auditLog.js'
import { loadSecrets } from './devSecrets.js'
import { SYNC_API_URL } from '../config.js'
import { toWaNumber, openWhatsApp } from './share.js'

const SETTING_KEY = 'whatsapp_cloud_config'
const LOG_KEY = 'whatsapp_send_log'

export async function getWhatsAppConfig() {
  const saved = (await db.getSetting(SETTING_KEY)) || {}
  let secrets = {}
  try {
    secrets = loadSecrets() || {}
  } catch {}
  return {
    enabled: saved.enabled !== false,
    preferCloud: saved.preferCloud !== false,
    proxyUrl:
      saved.proxyUrl ||
      `${String(SYNC_API_URL || 'https://saip-sync.onrender.com').replace(/\/$/, '')}/api/whatsapp/send`,
    accessToken: saved.accessToken || secrets.metaAccessToken || '',
    phoneNumberId: saved.phoneNumberId || secrets.metaPhoneNumberId || '',
    wabaId: saved.wabaId || secrets.metaWabaId || '',
    appId: saved.appId || secrets.metaAppId || '',
    graphVersion: saved.graphVersion || 'v21.0',
  }
}

export async function saveWhatsAppConfig(patch = {}) {
  const cur = await getWhatsAppConfig()
  const next = {
    enabled: patch.enabled != null ? !!patch.enabled : cur.enabled,
    preferCloud: patch.preferCloud != null ? !!patch.preferCloud : cur.preferCloud,
    proxyUrl: patch.proxyUrl != null ? String(patch.proxyUrl) : cur.proxyUrl,
    accessToken: patch.accessToken != null ? String(patch.accessToken) : cur.accessToken,
    phoneNumberId: patch.phoneNumberId != null ? String(patch.phoneNumberId) : cur.phoneNumberId,
    wabaId: patch.wabaId != null ? String(patch.wabaId) : cur.wabaId,
    appId: patch.appId != null ? String(patch.appId) : cur.appId,
    graphVersion: patch.graphVersion || cur.graphVersion,
  }
  await db.setSetting(SETTING_KEY, {
    enabled: next.enabled,
    preferCloud: next.preferCloud,
    proxyUrl: next.proxyUrl,
    phoneNumberId: next.phoneNumberId,
    wabaId: next.wabaId,
    appId: next.appId,
    graphVersion: next.graphVersion,
    accessToken: patch.accessToken != null ? String(patch.accessToken) : (await db.getSetting(SETTING_KEY))?.accessToken || '',
  })
  await audit('whatsapp.config', { enabled: next.enabled, hasToken: !!next.accessToken, phoneNumberId: next.phoneNumberId })
  return getWhatsAppConfig()
}

export async function hasCloudCredentials() {
  const c = await getWhatsAppConfig()
  return !!(c.accessToken && c.phoneNumberId)
}

async function pushLog(entry) {
  try {
    const prev = (await db.getSetting(LOG_KEY)) || []
    const list = Array.isArray(prev) ? prev : []
    list.unshift({ ...entry, at: new Date().toISOString() })
    await db.setSetting(LOG_KEY, list.slice(0, 80))
  } catch {}
}

export async function getWhatsAppLog(limit = 30) {
  const prev = (await db.getSetting(LOG_KEY)) || []
  return (Array.isArray(prev) ? prev : []).slice(0, limit)
}

export async function sendWhatsAppText(to, text, opts = {}) {
  const cfg = await getWhatsAppConfig()
  const msisdn = toWaNumber(to)
  const body = String(text || '').slice(0, 4096)
  if (!msisdn) {
    if (opts.fallbackWaMe !== false) {
      openWhatsApp(to, body)
      return { ok: true, mode: 'wa.me', note: 'No valid number — opened compose' }
    }
    throw new Error('Invalid WhatsApp number')
  }
  if (!body) throw new Error('Message is empty')

  const canCloud = cfg.enabled && cfg.preferCloud && cfg.accessToken && cfg.phoneNumberId
  if (!canCloud) {
    if (opts.fallbackWaMe !== false) {
      openWhatsApp(msisdn, body)
      await pushLog({ to: msisdn, ok: true, mode: 'wa.me', reason: 'no-cloud-creds' })
      return { ok: true, mode: 'wa.me' }
    }
    throw new Error('WhatsApp Cloud not configured — add Meta token + Phone number ID in Dev Portal / Integrations')
  }

  if (cfg.proxyUrl && !opts.forceDirect) {
    try {
      const res = await fetch(cfg.proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: msisdn,
          text: body,
          phoneNumberId: cfg.phoneNumberId,
          accessToken: cfg.accessToken,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        await pushLog({ to: msisdn, ok: true, mode: 'cloud-proxy', id: data.messageId || data.messages?.[0]?.id })
        await audit('whatsapp.send', { to: msisdn, via: 'proxy' })
        return { ok: true, mode: 'cloud', messageId: data.messageId || data.messages?.[0]?.id }
      }
      if (res.status !== 404 && res.status !== 501) {
        await pushLog({ to: msisdn, ok: false, mode: 'cloud-proxy', status: res.status, error: data.error || data.message })
        if (opts.fallbackWaMe !== false) {
          openWhatsApp(msisdn, body)
          return { ok: true, mode: 'wa.me', error: data.error || 'Proxy failed — opened wa.me' }
        }
        throw new Error(data.error || data.message || 'WhatsApp proxy failed')
      }
    } catch (e) {
      if (String(e.message || '').includes('proxy failed') && opts.fallbackWaMe === false) throw e
    }
  }

  const url = `https://graph.facebook.com/${cfg.graphVersion}/${cfg.phoneNumberId}/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: msisdn,
      type: 'text',
      text: { preview_url: false, body },
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const errMsg = data?.error?.message || data?.error?.error_user_msg || 'Graph API error'
    await pushLog({ to: msisdn, ok: false, mode: 'cloud-direct', status: res.status, error: errMsg })
    if (opts.fallbackWaMe !== false) {
      openWhatsApp(msisdn, body)
      return { ok: true, mode: 'wa.me', error: errMsg }
    }
    throw new Error(errMsg)
  }
  const messageId = data?.messages?.[0]?.id
  await pushLog({ to: msisdn, ok: true, mode: 'cloud-direct', id: messageId })
  await audit('whatsapp.send', { to: msisdn, via: 'direct' })
  return { ok: true, mode: 'cloud', messageId }
}

export function buildJobStatusMessage(ticket, company) {
  const name = ticket?.contactName || 'there'
  const co = company?.name || 'SA Invoice Pro'
  const st = ticket?.status || 'open'
  const label =
    ({ open: 'Open', in_progress: 'In progress', waiting: 'Waiting on you', resolved: 'Resolved', closed: 'Closed' })[st] ||
    st
  return [
    `Hi ${name}, update from *${co}* on your job *${ticket?.title || ticket?.subject || ticket?.id || ''}*:`,
    `Status: *${label}*`,
    ticket?.workDone ? `Work done: ${String(ticket.workDone).slice(0, 280)}` : '',
    'Reply here if you have questions — we will keep you posted.',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function notifyJobStatus(ticket, phone, company, opts = {}) {
  const msg = opts.message || buildJobStatusMessage(ticket, company)
  return sendWhatsAppText(phone, msg, opts)
}

/**
 * Meta-approved message templates (outside 24h session window).
 * templateName must match the exact name approved in Meta Business Manager.
 */
export async function sendWhatsAppTemplate(to, templateName, bodyParams = [], opts = {}) {
  const cfg = await getWhatsAppConfig()
  const msisdn = toWaNumber(to)
  if (!msisdn) throw new Error('Invalid WhatsApp number')
  const name = String(templateName || '').trim()
  if (!name) throw new Error('Template name required')
  const lang = opts.language || 'en'
  const components = []
  if (bodyParams?.length) {
    components.push({
      type: 'body',
      parameters: bodyParams.map((t) => ({ type: 'text', text: String(t ?? '').slice(0, 1024) })),
    })
  }
  if (!(cfg.accessToken && cfg.phoneNumberId)) {
    const fallback = opts.fallbackText || bodyParams.join(' · ')
    if (opts.fallbackWaMe !== false && fallback) {
      openWhatsApp(msisdn, fallback)
      return { ok: true, mode: 'wa.me', note: 'Template needs Cloud API — opened free-form instead' }
    }
    throw new Error('WhatsApp Cloud credentials required for Meta templates')
  }
  const url = `https://graph.facebook.com/${cfg.graphVersion || 'v21.0'}/${cfg.phoneNumberId}/messages`
  const payload = {
    messaging_product: 'whatsapp',
    to: msisdn,
    type: 'template',
    template: {
      name,
      language: { code: lang },
      components,
    },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + cfg.accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const errMsg = data?.error?.message || data?.error?.error_user_msg || 'Template send failed'
    await pushLog({ to: msisdn, ok: false, mode: 'template', template: name, error: errMsg })
    if (opts.fallbackWaMe !== false && opts.fallbackText) {
      openWhatsApp(msisdn, opts.fallbackText)
      return { ok: true, mode: 'wa.me', error: errMsg }
    }
    throw new Error(errMsg)
  }
  const messageId = data?.messages?.[0]?.id
  await pushLog({ to: msisdn, ok: true, mode: 'template', template: name, id: messageId })
  await audit('whatsapp.template', { to: msisdn, template: name })
  return { ok: true, mode: 'cloud-template', messageId, template: name }
}

/** Catalog of Meta template names — align metaName with your approval emails */
export const META_TEMPLATE_MAP = [
  {
    id: 'job_status_update',
    metaName: 'job_status_update',
    label: 'Job status update',
    category: 'UTILITY',
    language: 'en',
    bodyParams: ['customer_name', 'job_title', 'status', 'company'],
    when: 'Outside 24h chat window — job progress',
  },
  {
    id: 'invoice_reminder',
    metaName: 'invoice_reminder',
    label: 'Invoice reminder',
    category: 'UTILITY',
    language: 'en',
    bodyParams: ['customer_name', 'invoice_number', 'amount', 'company'],
    when: 'Chase overdue invoices (utility)',
  },
  {
    id: 'appointment_update',
    metaName: 'appointment_update',
    label: 'Appointment / collection',
    category: 'UTILITY',
    language: 'en',
    bodyParams: ['customer_name', 'detail', 'company'],
    when: 'Ready for collection / on-site ETA',
  },
  {
    id: 'hello_world',
    metaName: 'hello_world',
    label: 'Hello World (Meta sample)',
    category: 'UTILITY',
    language: 'en_US',
    bodyParams: [],
    when: 'Test that Cloud API + WABA work after approval',
  },
]
