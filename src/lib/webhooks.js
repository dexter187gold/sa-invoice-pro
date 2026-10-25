import * as db from './db'
import { audit } from './auditLog'

const KEY = 'webhooks_config'
const LOG_KEY = 'webhooks_log'

export const WEBHOOK_EVENTS = [
  { id: 'invoice.created', label: 'Invoice created' },
  { id: 'invoice.updated', label: 'Invoice updated' },
  { id: 'invoice.paid', label: 'Invoice marked paid' },
  { id: 'ticket.created', label: 'Job created' },
  { id: 'ticket.updated', label: 'Job updated' },
  { id: 'ticket.done', label: 'Job marked done' },
  { id: 'client.created', label: 'Client created' },
  { id: 'payment.recorded', label: 'Payment recorded' },
  { id: 'portal.link', label: 'Portal link created' },
]

export async function getWebhooks() {
  const cfg = (await db.getSetting(KEY)) || { endpoints: [] }
  if (!Array.isArray(cfg.endpoints)) cfg.endpoints = []
  return cfg
}

export async function saveWebhooks(cfg) {
  await db.setSetting(KEY, cfg)
  await audit('webhooks.save', { count: (cfg.endpoints || []).length })
}

export async function upsertEndpoint(ep) {
  const cfg = await getWebhooks()
  const id = ep.id || 'wh_' + Date.now().toString(36)
  const row = {
    id,
    url: String(ep.url || '').trim(),
    secret: String(ep.secret || '').trim(),
    events: Array.isArray(ep.events) ? ep.events : ['invoice.created'],
    enabled: ep.enabled !== false,
    label: String(ep.label || 'Webhook').trim(),
  }
  const idx = cfg.endpoints.findIndex((e) => e.id === id)
  if (idx >= 0) cfg.endpoints[idx] = row
  else cfg.endpoints.push(row)
  await saveWebhooks(cfg)
  return row
}

export async function removeEndpoint(id) {
  const cfg = await getWebhooks()
  cfg.endpoints = cfg.endpoints.filter((e) => e.id !== id)
  await saveWebhooks(cfg)
}

async function pushLog(entry) {
  try {
    const prev = (await db.getSetting(LOG_KEY)) || []
    const list = Array.isArray(prev) ? prev : []
    list.unshift({ ...entry, at: new Date().toISOString() })
    await db.setSetting(LOG_KEY, list.slice(0, 100))
  } catch {}
}

export async function getWebhookLog(limit = 30) {
  const prev = (await db.getSetting(LOG_KEY)) || []
  return (Array.isArray(prev) ? prev : []).slice(0, limit)
}

export async function fireWebhook(event, payload = {}) {
  try {
    const cfg = await getWebhooks()
    const targets = (cfg.endpoints || []).filter(
      (e) => e.enabled && e.url && (e.events || []).includes(event),
    )
    let ok = 0
    let fail = 0
    const body = JSON.stringify({
      event,
      sentAt: new Date().toISOString(),
      source: 'sa-invoice-pro',
      data: payload,
    })
    await Promise.all(
      targets.map(async (ep) => {
        try {
          const headers = {
            'Content-Type': 'application/json',
            'X-SAIP-Event': event,
          }
          if (ep.secret) headers['X-SAIP-Secret'] = ep.secret
          const res = await fetch(ep.url, { method: 'POST', headers, body, mode: 'cors' })
          if (res.ok) ok++
          else fail++
          await pushLog({ endpointId: ep.id, event, status: res.status, ok: res.ok, url: ep.url })
        } catch (err) {
          fail++
          await pushLog({ endpointId: ep.id, event, ok: false, error: String(err?.message || err), url: ep.url })
        }
      }),
    )
    if (targets.length) await audit('webhook.fire', { event, ok, fail, targets: targets.length })
    return { ok, fail, targets: targets.length }
  } catch (e) {
    console.warn('[webhook]', e)
    return { ok: 0, fail: 0, targets: 0 }
  }
}
