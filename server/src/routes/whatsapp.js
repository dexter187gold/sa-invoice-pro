/**
 * WhatsApp Cloud API proxy — keeps META_ACCESS_TOKEN on the server.
 * POST /api/whatsapp/send  { to, text, phoneNumberId? }
 * GET  /api/whatsapp/webhook  (Meta verification)
 * POST /api/whatsapp/webhook  (incoming — ack only for now)
 */
import { Router } from 'express'

export const whatsappRouter = Router()

function env(name, fallback = '') {
  return process.env[name] || fallback
}

whatsappRouter.post('/send', async (req, res) => {
  try {
    const token = env('META_ACCESS_TOKEN') || req.body?.accessToken
    const phoneNumberId = env('META_PHONE_NUMBER_ID') || req.body?.phoneNumberId
    const to = String(req.body?.to || '').replace(/\D/g, '')
    const text = String(req.body?.text || '').slice(0, 4096)
    const graphVersion = env('META_GRAPH_VERSION', 'v21.0')

    if (!token || !phoneNumberId) {
      return res.status(501).json({
        error: 'META_ACCESS_TOKEN / META_PHONE_NUMBER_ID not configured on server',
      })
    }
    if (!to || to.length < 10) return res.status(400).json({ error: 'Invalid to number' })
    if (!text) return res.status(400).json({ error: 'text required' })

    const url = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      return res.status(r.status).json({
        error: data?.error?.message || 'Graph API error',
        details: data?.error || data,
      })
    }
    return res.json({
      ok: true,
      messageId: data?.messages?.[0]?.id,
      messages: data?.messages,
    })
  } catch (e) {
    console.error('[whatsapp/send]', e)
    return res.status(500).json({ error: e.message || 'send failed' })
  }
})

// Meta webhook verification
whatsappRouter.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  const expected = env('META_VERIFY_TOKEN', 'saip-wa-verify')
  if (mode === 'subscribe' && token === expected) {
    return res.status(200).send(challenge)
  }
  return res.sendStatus(403)
})

// Incoming messages — acknowledge; full inbox sync is a later slice
whatsappRouter.post('/webhook', (req, res) => {
  try {
    const body = req.body
    if (body?.object === 'whatsapp_business_account') {
      // Future: enqueue into portal-store / notify desk
      console.log('[whatsapp/webhook] event', JSON.stringify(body).slice(0, 400))
    }
  } catch (e) {
    console.warn('[whatsapp/webhook]', e.message)
  }
  res.sendStatus(200)
})

whatsappRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    hasToken: !!env('META_ACCESS_TOKEN'),
    hasPhoneId: !!env('META_PHONE_NUMBER_ID'),
  })
})
