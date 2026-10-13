/**
 * SA Invoice Pro – Cloud Sync client v1.4.0
 * Auto-push + notifications + WA pending + ticket intake + portal links
 */
const BASE = 'https://saip-sync.onrender.com'
const TOKEN_KEY = 'saip_sync_token'

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || null } catch { return null }
}

function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

async function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const token = getToken()
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch(BASE + path, { ...opts, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || res.statusText || 'Request failed')
  return data
}

let _autoTimer = null
let _lastPushAt = 0

export const Sync = {
  base: BASE,

  isLoggedIn() {
    return !!getToken()
  },

  getToken,

  async register(email, password, name) {
    const data = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
    setToken(data.token)
    return data
  },

  async login(email, password) {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(data.token)
    return data
  },

  logout() {
    setToken(null)
  },

  async me() {
    return request('/api/auth/me')
  },

  async pull() {
    return request('/api/workspace')
  },

  async push(workspaceData) {
    return request('/api/workspace', {
      method: 'PUT',
      body: JSON.stringify({ data: workspaceData }),
    })
  },

  async pushInvoiceStatus(invoices) {
    const list = Array.isArray(invoices) ? invoices : [invoices]
    return request('/api/status/push', {
      method: 'POST',
      body: JSON.stringify({ invoices: list }),
    })
  },

  statusFromInvoice(inv, client = {}) {
    const total = Number(inv.total || inv.grandTotal || 0)
    const paid = Number(inv.amountPaid || inv.paid || 0)
    const balance = Math.max(0, total - paid)
    let status = inv.status || 'unpaid'
    if (balance <= 0) status = 'paid'
    else if (paid > 0 && status !== 'overdue') status = 'partial'
    else if (inv.dueDate && new Date(inv.dueDate) < new Date() && status !== 'paid') status = 'overdue'

    return {
      invoice_number: inv.number || inv.invoiceNumber || inv.id,
      client_name: client.name || inv.clientName || null,
      client_phone: client.phone || inv.clientPhone || null,
      total,
      balance_due: balance,
      status,
      due_date: inv.dueDate || null,
      last_payment_at: inv.lastPaymentAt || null,
    }
  },

  async pushAll(snapshot = {}) {
    if (!getToken()) return { ok: false, reason: 'not_logged_in' }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { ok: false, reason: 'offline' }
    }
    const {
      company = null,
      clients = [],
      invoices = [],
      quotes = [],
      tickets = [],
      payments = [],
      products = [],
      services = [],
      expenses = [],
    } = snapshot

    const data = {
      company,
      clients,
      invoices,
      quotes,
      tickets,
      payments,
      products,
      services,
      expenses,
      settings: { pushedAt: new Date().toISOString() },
    }

    try {
      await request('/api/workspace', {
        method: 'PUT',
        body: JSON.stringify({ data }),
      })
      const statusList = (invoices || []).map((inv) => {
        const client = (clients || []).find((c) => String(c.id) === String(inv.clientId)) || {}
        return Sync.statusFromInvoice(inv, client)
      }).filter((x) => x.invoice_number)
      if (statusList.length) {
        await request('/api/status/push', {
          method: 'POST',
          body: JSON.stringify({ invoices: statusList }),
        })
      }
      _lastPushAt = Date.now()
      return { ok: true, invoices: statusList.length }
    } catch (e) {
      console.warn('[Sync.autoPush]', e.message || e)
      return { ok: false, error: e.message || String(e) }
    }
  },

  scheduleAutoPush(snapshot, delayMs = 2000) {
    if (!getToken()) return
    if (_autoTimer) clearTimeout(_autoTimer)
    _autoTimer = setTimeout(() => {
      _autoTimer = null
      Sync.pushAll(snapshot)
    }, delayMs)
  },

  lastPushAt() {
    return _lastPushAt
  },

  async getNotifications({ unreadOnly = false } = {}) {
    const q = unreadOnly ? '?unread=1' : ''
    return request('/api/notifications' + q)
  },

  async markNotificationsRead(ids, all = false) {
    return request('/api/notifications/read', {
      method: 'POST',
      body: JSON.stringify(all ? { all: true } : { ids }),
    })
  },

  async getPendingWaClients() {
    return request('/api/wa/pending')
  },

  /** Best-effort: never throws — local import still succeeds if server mark 404s */
  async markWaClientImported(phone, clientId) {
    const p = encodeURIComponent(String(phone || '').replace(/\D/g, '') || phone)
    try {
      return await request('/api/wa/pending/' + p + '/imported', {
        method: 'POST',
        body: JSON.stringify({ client_id: clientId }),
      })
    } catch (e) {
      console.warn('[Sync] markWaClientImported', e.message || e)
      return { ok: false, error: e.message || String(e) }
    }
  },

  async getTicketIntake() {
    return request('/api/tickets/intake')
  },

  /** Best-effort: never throws */
  async markTicketImported(intakeId, localTicketId) {
    try {
      return await request('/api/tickets/intake/' + encodeURIComponent(intakeId) + '/imported', {
        method: 'POST',
        body: JSON.stringify({ ticket_id: localTicketId }),
      })
    } catch (e) {
      console.warn('[Sync] markTicketImported', e.message || e)
      return { ok: false, error: e.message || String(e) }
    }
  },

  async createPortalLink(clientId, { days = 90 } = {}) {
    return request('/api/portal/create', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId, days }),
    })
  },

  async listPortalLinks() {
    return request('/api/portal/list')
  },

  async revokePortalLink(token) {
    return request('/api/portal/revoke', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  },
}

export default Sync
