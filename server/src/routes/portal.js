import { Router } from 'express'
import {
  createPortalToken,
  getPortalByToken,
  applyQuoteDecision,
  listRecentDecisions,
  upsertPortalSnapshot,
} from '../portal-store.js'

export const portalRouter = Router()

/** Public: client portal payload */
portalRouter.get('/view/:token', (req, res) => {
  const found = getPortalByToken(req.params.token)
  if (!found) return res.status(404).json({ error: true, message: 'Portal link invalid or expired' })
  if (found.expired) return res.status(410).json({ error: true, message: 'Portal link expired' })
  const { row } = found
  res.json({
    company: row.company || {},
    client: row.client || {},
    quotes: row.quotes || [],
    invoices: row.invoices || [],
    expires: row.expires,
    token: row.token,
  })
})

/** Public: approve / reject quote */
portalRouter.post('/quote-decision', (req, res, next) => {
  try {
    const body = req.body || {}
    const token = body.token || body.portalToken
    const quoteId = body.quoteId || body.quote_id
    const action = body.action
    const note = body.note || ''
    if (!token || !quoteId) {
      return res.status(400).json({ error: true, message: 'token and quoteId required' })
    }
    const result = applyQuoteDecision(token, quoteId, action, note)
    res.json({
      ok: true,
      quote: result.quote,
      status: result.quote.status,
      message: result.quote.status === 'accepted' ? 'Quote accepted' : 'Quote declined',
    })
  } catch (e) {
    next(e)
  }
})

/** Shop / sync: register or refresh a portal snapshot */
portalRouter.post('/register', (req, res, next) => {
  try {
    const body = req.body || {}
    const days = body.days != null ? Number(body.days) : 90
    if (body.token && body.refresh) {
      const updated = upsertPortalSnapshot(body.token, body)
      if (!updated) return res.status(404).json({ error: true, message: 'Unknown token' })
      return res.json({ ok: true, token: updated.token, expires: updated.expires, url: portalUrl(req, updated.token) })
    }
    const row = createPortalToken(body, { days })
    res.status(201).json({
      ok: true,
      token: row.token,
      expires: row.expires,
      url: portalUrl(req, row.token),
    })
  } catch (e) {
    next(e)
  }
})

/** Shop: recent decisions (optional workspace filter) */
portalRouter.get('/decisions', (req, res) => {
  const workspaceId = req.query.workspaceId || req.query.workspace_id || ''
  const limit = Math.min(200, Number(req.query.limit) || 50)
  res.json({ data: listRecentDecisions({ workspaceId, limit }) })
})

function portalUrl(req, token) {
  const base = process.env.PORTAL_PUBLIC_URL || process.env.APP_PUBLIC_URL || ''
  if (base) return `${String(base).replace(/\/$/, '')}/portal/${encodeURIComponent(token)}`
  // Fallback relative path for SPA hosts
  return `/portal/${encodeURIComponent(token)}`
}
