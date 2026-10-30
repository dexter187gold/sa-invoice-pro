/**
 * WhatsApp Cloud API (Meta) — send text / job status from the desk.
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
  // Never persist full token into IndexedDB if it came only from secrets vault
  await db.setSetting(SETTING_KEY, {
    enabled: next.enabled,
    preferCloud: next.preferCloud,
    proxyUrl: next.proxyUrl,
    phoneNumberId: next.phoneNumberId,
    wabaId: next.wabaId,
    appId: next.appId,
    graphVersion: next.graphVersion,
    // only store token if user explicitly pasted one in Settings
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

/**
 * Send a plain text message via Cloud API.
 * @returns {{ ok: boolean, mode: 'cloud'|'wa.me', messageId?: string, error?: string }}
 */
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

  // 1) Prefer proxy (token stays on Render)
  if (cfg.proxyUrl && !opts.forceDirect) {
    try {
      const res = await fetch(cfg.proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: msisdn,
          text: body,
          phoneNumberId: cfg.phoneNumberId,
          accessToken: cfg.accessToken, // proxy may ignore and use its own env
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        await pushLog({ to: msisdn, ok: true, mode: 'cloud-proxy', id: data.messageId || data.messages?.[0]?.id })
        await audit('whatsapp.send', { to: msisdn, via: 'proxy' })
        return { ok: true, mode: 'cloud', messageId: data.messageId || data.messages?.[0]?.id }
      }
      // fall through to direct if proxy returns 404/501
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
      // network / missing route → try direct
    }
  }

  // 2) Direct Graph API (dev / when proxy not deployed)
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

/** Job-status template used from Tickets */
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

/** One-shot helper: prefer Cloud, fall back to wa.me */
export async function notifyJobStatus(ticket, phone, company, opts = {}) {
  const msg = opts.message || buildJobStatusMessage(ticket, company)
  return sendWhatsAppText(phone, msg, opts)
}
