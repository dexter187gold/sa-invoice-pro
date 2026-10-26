/**
 * File-backed portal tokens + quote decisions for saip-sync / local API.
 * DATA_DIR/portal-store.json
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const STORE_PATH = path.join(DATA_DIR, 'portal-store.json')

function ensureDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  } catch {}
}

function load() {
  ensureDir()
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'))
    }
  } catch (e) {
    console.warn('[portal-store] load', e.message)
  }
  return { tokens: {}, decisions: [] }
}

function save(data) {
  ensureDir()
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8')
}

export function createPortalToken(payload = {}, { days = 90 } = {}) {
  const data = load()
  const token =
    crypto.randomBytes(18).toString('base64url') ||
    ('pt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10))
  const expires = new Date(Date.now() + Math.max(1, Number(days) || 90) * 86400000).toISOString()
  const row = {
    token,
    clientId: payload.clientId || payload.client?.id || '',
    company: payload.company || {},
    client: payload.client || {},
    quotes: Array.isArray(payload.quotes) ? payload.quotes : [],
    invoices: Array.isArray(payload.invoices) ? payload.invoices : [],
    createdAt: new Date().toISOString(),
    expires,
    workspaceId: payload.workspaceId || '',
  }
  data.tokens[token] = row
  save(data)
  return row
}

export function getPortalByToken(token) {
  const t = String(token || '').trim()
  if (!t) return null
  const data = load()
  const row = data.tokens[t]
  if (!row) return null
  if (row.expires && new Date(row.expires).getTime() < Date.now()) {
    return { expired: true, row }
  }
  return { expired: false, row }
}

/** Merge decision into stored quote list for this token. */
export function applyQuoteDecision(token, quoteId, action, note = '') {
  const found = getPortalByToken(token)
  if (!found) {
    const err = new Error('Portal link invalid or expired')
    err.status = 404
    err.code = 'PORTAL_NOT_FOUND'
    throw err
  }
  if (found.expired) {
    const err = new Error('Portal link expired')
    err.status = 410
    err.code = 'PORTAL_EXPIRED'
    throw err
  }
  const act = String(action || '').toLowerCase()
  const accepted = act === 'approve' || act === 'accept'
  const rejected = act === 'reject' || act === 'decline'
  if (!accepted && !rejected) {
    const err = new Error('Action must be approve or reject')
    err.status = 400
    throw err
  }
  const status = accepted ? 'accepted' : 'rejected'
  const now = new Date().toISOString()
  const data = load()
  const row = data.tokens[token]
  const quotes = Array.isArray(row.quotes) ? row.quotes : []
  const idx = quotes.findIndex((q) => String(q.id) === String(quoteId))
  if (idx < 0) {
    const err = new Error('Quote not found on this portal')
    err.status = 404
    err.code = 'QUOTE_NOT_FOUND'
    throw err
  }
  const prev = quotes[idx]
  const prevStatus = String(prev.status || '').toLowerCase()
  if (['accepted', 'rejected', 'converted'].includes(prevStatus)) {
    const err = new Error('Quote already decided')
    err.status = 409
    err.code = 'ALREADY_DECIDED'
    throw err
  }
  const updated = {
    ...prev,
    status,
    portalDecision: status,
    portalDecisionAt: now,
    portalNote: String(note || '').slice(0, 500),
    updatedAt: now,
  }
  quotes[idx] = updated
  row.quotes = quotes
  row.updatedAt = now
  data.tokens[token] = row
  data.decisions = data.decisions || []
  data.decisions.push({
    id: 'dec_' + Date.now().toString(36),
    token,
    quoteId,
    action: status,
    note: String(note || '').slice(0, 500),
    clientId: row.clientId,
    workspaceId: row.workspaceId || '',
    at: now,
  })
  // keep last 500 decisions
  if (data.decisions.length > 500) data.decisions = data.decisions.slice(-500)
  save(data)
  return { quote: updated, portal: row }
}

export function listRecentDecisions({ workspaceId, limit = 50 } = {}) {
  const data = load()
  let rows = data.decisions || []
  if (workspaceId) rows = rows.filter((d) => String(d.workspaceId || '') === String(workspaceId))
  return rows.slice(-limit).reverse()
}

export function upsertPortalSnapshot(token, patch = {}) {
  const data = load()
  const row = data.tokens[token]
  if (!row) return null
  if (patch.quotes) row.quotes = patch.quotes
  if (patch.invoices) row.invoices = patch.invoices
  if (patch.company) row.company = { ...row.company, ...patch.company }
  if (patch.client) row.client = { ...row.client, ...patch.client }
  row.updatedAt = new Date().toISOString()
  data.tokens[token] = row
  save(data)
  return row
}
