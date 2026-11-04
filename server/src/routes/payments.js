/**
 * Professional Pay Now routes — Paystack primary (dual-rail ready for PayFast later).
 *
 * Env:
 *   PAYSTACK_SECRET_KEY   (sk_test_... or sk_live_...)
 *   PAYSTACK_PUBLIC_KEY   (pk_test_... or pk_live_...)
 */
import { Router } from 'express'
import crypto from 'crypto'
import { getPortalByToken, upsertPortalSnapshot } from '../portal-store.js'
import {
  createPaymentIntent,
  getPaymentByReference,
  markPaymentSuccess,
  markPaymentFailed,
  listPaymentsForToken,
} from '../payments-store.js'

export const paymentsRouter = Router()

function paystackSecret() {
  return process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET || ''
}
function paystackPublic() {
  return process.env.PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC || ''
}

/** Public config for the portal (never returns secret). */
paymentsRouter.get('/config', (_req, res) => {
  const publicKey = paystackPublic()
  res.json({
    ok: true,
    provider: 'paystack',
    enabled: Boolean(publicKey && paystackSecret()),
    publicKey: publicKey || null,
    currency: 'ZAR',
    channels: ['card', 'bank', 'qr', 'ussd', 'mobile_money'],
    rails: {
      paystack: Boolean(publicKey),
      payfast: false,
    },
  })
})

/**
 * Initialise a payment for a portal invoice.
 * Body: { token, invoiceId, amount? , email? }
 */
paymentsRouter.post('/init', async (req, res, next) => {
  try {
    const body = req.body || {}
    const token = body.token || body.portalToken
    const invoiceId = body.invoiceId || body.invoice_id
    if (!token || !invoiceId) {
      return res.status(400).json({ error: true, message: 'token and invoiceId required' })
    }

    const found = getPortalByToken(token)
    if (!found) return res.status(404).json({ error: true, message: 'Portal link invalid or expired' })
    if (found.expired) return res.status(410).json({ error: true, message: 'Portal link expired' })

    const row = found.row
    const invoices = Array.isArray(row.invoices) ? row.invoices : []
    const inv = invoices.find((i) => String(i.id) === String(invoiceId) || String(i.number) === String(invoiceId))
    if (!inv) {
      return res.status(404).json({ error: true, message: 'Invoice not found on this portal' })
    }

    const status = String(inv.status || '').toLowerCase()
    if (['paid', 'settled', 'closed'].includes(status)) {
      return res.status(409).json({ error: true, message: 'Invoice is already paid' })
    }

    let amountRands = Number(body.amount != null ? body.amount : inv.balance != null ? inv.balance : inv.total)
    if (!Number.isFinite(amountRands) || amountRands <= 0) {
      return res.status(400).json({ error: true, message: 'Invalid amount' })
    }
    const amountCents = Math.round(amountRands * 100)

    const email =
      body.email ||
      (row.client && row.client.email) ||
      inv.clientEmail ||
      'client@sa-invoice-pro.local'

    const secret = paystackSecret()
    const publicKey = paystackPublic()
    if (!secret || !publicKey) {
      return res.status(503).json({
        error: true,
        message: 'Payments not configured yet. Set PAYSTACK_PUBLIC_KEY and PAYSTACK_SECRET_KEY on the server.',
        code: 'PAYMENTS_NOT_CONFIGURED',
      })
    }

    const intent = createPaymentIntent({
      token,
      invoiceId: inv.id || invoiceId,
      amount: amountRands,
      currency: 'ZAR',
      email,
      clientId: row.clientId || (row.client && row.client.id),
      workspaceId: row.workspaceId,
      metadata: {
        invoiceNumber: inv.number || inv.id,
        company: (row.company && row.company.name) || '',
      },
    })

    const initRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + secret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountCents,
        currency: 'ZAR',
        reference: intent.reference,
        callback_url: body.callbackUrl || undefined,
        metadata: {
          saip_payment_id: intent.id,
          saip_invoice_id: inv.id || invoiceId,
          saip_token: token,
          custom_fields: [
            { display_name: 'Invoice', variable_name: 'invoice', value: inv.number || inv.id },
            { display_name: 'Workshop', variable_name: 'workshop', value: (row.company && row.company.name) || 'SA Invoice Pro' },
          ],
        },
      }),
    })

    const initJson = await initRes.json().catch(function () { return {} })
    if (!initRes.ok || !initJson.status) {
      markPaymentFailed(intent.reference, initJson.message || 'Paystack init failed')
      return res.status(502).json({
        error: true,
        message: initJson.message || 'Could not start payment with Paystack',
        detail: initJson,
      })
    }

    const data = initJson.data || {}
    res.json({
      ok: true,
      reference: intent.reference,
      access_code: data.access_code,
      authorization_url: data.authorization_url,
      publicKey,
      amount: amountRands,
      amountCents,
      currency: 'ZAR',
      email,
      invoice: {
        id: inv.id,
        number: inv.number,
        total: inv.total,
      },
    })
  } catch (e) {
    next(e)
  }
})

/** Verify a transaction after popup / redirect. */
paymentsRouter.post('/verify', async (req, res, next) => {
  try {
    const reference = (req.body && (req.body.reference || req.body.trxref)) || ''
    if (!reference) {
      return res.status(400).json({ error: true, message: 'reference required' })
    }

    const local = getPaymentByReference(reference)
    if (!local) {
      return res.status(404).json({ error: true, message: 'Unknown payment reference' })
    }

    const secret = paystackSecret()
    if (!secret) {
      return res.status(503).json({ error: true, message: 'Payments not configured' })
    }

    const vRes = await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference), {
      headers: { Authorization: 'Bearer ' + secret },
    })
    const vJson = await vRes.json().catch(function () { return {} })
    if (!vRes.ok || !vJson.status) {
      return res.status(502).json({ error: true, message: vJson.message || 'Verify failed', detail: vJson })
    }

    const tx = vJson.data || {}
    if (String(tx.status).toLowerCase() !== 'success') {
      markPaymentFailed(reference, tx.status || 'not_success')
      return res.json({ ok: false, status: tx.status, message: 'Payment not successful' })
    }

    const result = markPaymentSuccess(reference, {
      providerReference: tx.id,
      channel: tx.channel,
      fees: tx.fees,
      status: tx.status,
      paid_at: tx.paid_at,
      amount: tx.amount,
    })

    try {
      const found = getPortalByToken(local.token)
      if (found && !found.expired) {
        const invoices = Array.isArray(found.row.invoices) ? found.row.invoices.slice() : []
        const idx = invoices.findIndex(function (i) {
          return String(i.id) === String(local.invoiceId) || String(i.number) === String(local.invoiceId)
        })
        if (idx >= 0) {
          invoices[idx] = Object.assign({}, invoices[idx], {
            status: 'paid',
            paidAt: new Date().toISOString(),
            paymentReference: reference,
            paymentChannel: tx.channel,
          })
          upsertPortalSnapshot(local.token, { invoices: invoices })
        }
      }
    } catch (e) {
      console.warn('[payments] snapshot update', e.message)
    }

    res.json({
      ok: true,
      status: 'success',
      already: (result && result.already) || false,
      payment: {
        reference: reference,
        amount: local.amount,
        channel: tx.channel,
        paidAt: result && result.payment && result.payment.paidAt,
      },
      message: 'Payment received — thank you',
    })
  } catch (e) {
    next(e)
  }
})

/** Paystack webhook — mark paid even if client never returns. */
paymentsRouter.post('/webhook', async (req, res) => {
  try {
    const secret = paystackSecret()
    const signature = req.headers['x-paystack-signature']
    if (secret && signature) {
      const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex')
      if (hash !== signature) {
        return res.status(401).json({ error: true, message: 'Invalid signature' })
      }
    }

    const event = req.body || {}
    const eventName = event.event
    const tx = event.data || {}

    if (eventName === 'charge.success' && tx.reference) {
      const result = markPaymentSuccess(tx.reference, {
        providerReference: tx.id,
        channel: tx.channel,
        fees: tx.fees,
        status: tx.status,
        paid_at: tx.paid_at,
        amount: tx.amount,
      })
      if (result && result.payment) {
        try {
          const local = result.payment
          const found = getPortalByToken(local.token)
          if (found && !found.expired) {
            const invoices = Array.isArray(found.row.invoices) ? found.row.invoices.slice() : []
            const idx = invoices.findIndex(function (i) {
              return String(i.id) === String(local.invoiceId) || String(i.number) === String(local.invoiceId)
            })
            if (idx >= 0) {
              invoices[idx] = Object.assign({}, invoices[idx], {
                status: 'paid',
                paidAt: new Date().toISOString(),
                paymentReference: tx.reference,
                paymentChannel: tx.channel,
              })
              upsertPortalSnapshot(local.token, { invoices: invoices })
            }
          }
        } catch (e) {
          console.warn('[payments/webhook] snapshot', e.message)
        }
      }
    }

    res.sendStatus(200)
  } catch (e) {
    console.error('[payments/webhook]', e)
    res.sendStatus(200)
  }
})

/** List payments for a portal token (client view). */
paymentsRouter.get('/list', (req, res) => {
  const token = req.query.token || ''
  if (!token) return res.status(400).json({ error: true, message: 'token required' })
  const found = getPortalByToken(token)
  if (!found || found.expired) return res.status(404).json({ error: true, message: 'Portal not found' })
  res.json({ data: listPaymentsForToken(token) })
})
