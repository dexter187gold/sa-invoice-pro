/**
 * SA Invoice Pro – Cloud Sync client
 * Auth recovery + workspace + team + portal (create + register snapshot fallback).
 */
const BASE = 'https://saip-sync.onrender.com'
const TOKEN_KEY = 'saip_sync_token'
const META_KEY = 'saip_sync_meta'

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || null } catch { return null }
}

function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function request(path, opts = {}, attempt = 1) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const token = getToken()
  if (token) headers['Authorization'] = 'Bearer ' + token
  const maxAttempts = opts._maxAttempts || 3
  let res
  try {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timer = setTimeout(() => { try { ctrl?.abort() } catch {} }, opts._timeout || 55000)
    try {
      res = await fetch(BASE + path, { ...opts, headers, signal: ctrl?.signal })
    } finally {
      clearTimeout(timer)
    }
  } catch (e) {
    const msg = String(e?.message || e)
    const isNet = /abort|Failed to fetch|NetworkError|network|timeout|interrupted/i.test(msg)
    if (isNet && attempt < maxAttempts) {
      await sleep(1800 * attempt)
      return request(path, opts, attempt + 1)
    }
    throw new Error(
      isNet
        ? 'Cloud server waking up or offline — wait 20s and try Sync Now again'
        : 'Network error — check connection to cloud sync',
    )
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = data.error || data.message || res.statusText || 'Request failed'
    if ((res.status === 502 || res.status === 503) && attempt < maxAttempts) {
      await sleep(2000 * attempt)
      return request(path, opts, attempt + 1)
    }
    const e = new Error(err)
    e.status = res.status
    e.data = data
    throw e
  }
  return data
}

let _autoTimer = null
let _lastPushAt = 0
let _lastError = null

function normalizePortalResponse(data, clientId) {
  const token = data.token || data.portalToken || data.id || ''
  let url = data.url || data.link || data.portalUrl || ''
  if (!url && token) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    url = `${origin}/portal/${encodeURIComponent(token)}`
  }
  return {
    ...data,
    token,
    url,
    expires: data.expires || data.expiresAt || data.expires_at,
    clientId: data.clientId || clientId,
  }
}

export const Sync = {
  base: BASE,
  isLoggedIn() { return !!getToken() },
  getToken,
  lastError() { return _lastError },

  async health() {
    try {
      const r = await request('/health', { _maxAttempts: 2, _timeout: 20000 })
      _lastError = null
      return r
    } catch (e) {
      _lastError = e.message || String(e)
      throw e
    }
  },

  async register(email, password, name) {
    const data = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
    setToken(data.token)
    return data
  },

  async login(email, password) {
    try { await request('/health', { _maxAttempts: 2, _timeout: 25000 }) } catch {}
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(data.token)
    _lastError = null
    return data
  },

  async forgotPassword(email) {
    return request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: String(email || '').trim().toLowerCase() }),
    })
  },

  async recoverAccount(email, code, newPassword) {
    const data = await request('/api/auth/recover', {
      method: 'POST',
      body: JSON.stringify({
        email: String(email || '').trim().toLowerCase(),
        recovery_code: String(code || '').trim(),
        password: newPassword,
      }),
    })
    if (data.token) setToken(data.token)
    return data
  },

  async resetPasswordWithCode(email, code, newPassword) {
    const data = await request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email: String(email || '').trim().toLowerCase(),
        recovery_code: String(code || '').trim(),
        code: String(code || '').trim(),
        password: newPassword,
      }),
    })
    if (data.token) setToken(data.token)
    return data
  },

  logout() { setToken(null) },
  async me() { return request('/api/auth/me') },
  async pull() { return request('/api/workspace') },

  async push(workspaceData) {
    const r = await request('/api/workspace', {
      method: 'PUT',
      body: JSON.stringify({ data: workspaceData }),
    })
    _lastPushAt = Date.now()
    _lastError = null
    return r
  },

  async workspaceHistory() { return request('/api/workspace/history') },

  getMeta() {
    try { return JSON.parse(localStorage.getItem(META_KEY) || 'null') || {} } catch { return {} }
  },
  setMeta(meta) {
    try { localStorage.setItem(META_KEY, JSON.stringify({ ...Sync.getMeta(), ...meta })) } catch {}
  },

  workspaceToImportShape(row) {
    if (!row || typeof row !== 'object') return null
    const data = row.data && typeof row.data === 'object' ? row.data : row
    const out = { ...data }
    if (out.company && !Array.isArray(out.company) && typeof out.company === 'object') {
      out.company = [{ id: 'main', ...out.company }]
    }
    return out
  },

  async restoreFromCloud() {
    const row = await Sync.pull()
    const shape = Sync.workspaceToImportShape(row)
    if (!shape) return { ok: true, restored: false, reason: 'empty', rows: 0 }
    const { importAll } = await import('./db.js')
    const stats = await importAll(shape, { wipe: false })
    Sync.setMeta({ version: row.version, updatedAt: row.updated_at, lastRestore: new Date().toISOString() })
    return { ok: true, restored: true, rows: stats?.rows || 0, version: row.version }
  },

  async snapshotAndPush(snapshot = {}) {
    if (!getToken()) return { ok: false, reason: 'not_logged_in' }
    const data = {
      company: snapshot.company || null,
      clients: snapshot.clients || [],
      invoices: snapshot.invoices || [],
      quotes: snapshot.quotes || [],
      tickets: snapshot.tickets || [],
      payments: snapshot.payments || [],
      products: snapshot.products || [],
      services: snapshot.services || [],
      expenses: snapshot.expenses || [],
      settings: { pushedAt: new Date().toISOString() },
    }
    const r = await Sync.push(data)
    Sync.setMeta({ version: r.version, updatedAt: r.updated_at, lastPush: new Date().toISOString() })
    return { ok: true, ...r }
  },

  async pushAll(snapshot = {}) {
    if (!getToken()) return { ok: false, reason: 'not_logged_in' }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, reason: 'offline' }
    try {
      const r = await Sync.snapshotAndPush(snapshot)
      return { ok: true, version: r.version }
    } catch (e) {
      _lastError = e.message || String(e)
      return { ok: false, error: _lastError }
    }
  },

  scheduleAutoPush(snapshot, delayMs = 2000) {
    if (!getToken()) return
    if (_autoTimer) clearTimeout(_autoTimer)
    _autoTimer = setTimeout(() => { _autoTimer = null; Sync.pushAll(snapshot) }, delayMs)
  },

  lastPushAt() { return _lastPushAt },

  async getTeam() { return request('/api/team') },
  async createTeamInvite(role = 'tech') {
    return request('/api/team/invite', { method: 'POST', body: JSON.stringify({ role }) })
  },
  async joinTeam(code) {
    return request('/api/team/join', { method: 'POST', body: JSON.stringify({ code: String(code || '').trim() }) })
  },
  async leaveTeam() {
    return request('/api/team/leave', { method: 'POST', body: JSON.stringify({}) })
  },
  async setWorkspaceResetPin(pin, confirmPin) {
    return request('/api/workspace/reset-pin', {
      method: 'POST',
      body: JSON.stringify({ pin: String(pin || ''), confirmPin: String(confirmPin || '') }),
    })
  },

  async resetWorkspace(pin, confirmation) {
    const result = await request('/api/workspace/reset', {
      method: 'POST',
      body: JSON.stringify({ pin: String(pin || ''), confirmation: String(confirmation || '') }),
      _maxAttempts: 1,
    })
    // Stop background sync immediately so pre-reset local data cannot repopulate the empty cloud workspace.
    setToken(null)
    return result
  },

  async updateTeamMemberRole(userId, role) {
    return request('/api/team/member-role', { method: 'POST', body: JSON.stringify({ userId, role }) })
  },

  async removeTeamMember(userId) {
    return request('/api/team/remove', { method: 'POST', body: JSON.stringify({ userId }) })
  },

  async getBranchWorkspace(branchId) {
    return request('/api/workspace/branch/' + encodeURIComponent(branchId))
  },
  async putBranchWorkspace(branchId, data) {
    return request('/api/workspace/branch/' + encodeURIComponent(branchId), {
      method: 'PUT', body: JSON.stringify({ data }),
    })
  },
  async registerDevice(payload) {
    return request('/api/device/register', { method: 'POST', body: JSON.stringify(payload) })
  },
  async listDevices() { return request('/api/device/list') },
  async deviceHeartbeat(fingerprint) {
    return request('/api/device/heartbeat', { method: 'POST', body: JSON.stringify({ fingerprint }) })
  },

  async createPortalLink(clientId, { days = 90, snapshot } = {}) {
    let data
    try {
      data = await request('/api/portal/create', {
        method: 'POST',
        body: JSON.stringify({ clientId, client_id: clientId, days }),
      })
    } catch (e) {
      if (snapshot) {
        data = await request('/api/portal/register', {
          method: 'POST',
          body: JSON.stringify({
            clientId,
            days,
            company: snapshot.company || {},
            client: snapshot.client || {},
            quotes: (snapshot.quotes || []).filter((q) => String(q.clientId) === String(clientId)),
            invoices: (snapshot.invoices || []).filter((i) => String(i.clientId) === String(clientId)),
          }),
        })
      } else {
        throw e
      }
    }
    const normalized = normalizePortalResponse(data, clientId)
    if (snapshot && normalized.token) {
      try {
        await request('/api/portal/register', {
          method: 'POST',
          body: JSON.stringify({
            token: normalized.token,
            refresh: true,
            clientId,
            company: snapshot.company || {},
            client: snapshot.client || {},
            quotes: (snapshot.quotes || []).filter((q) => String(q.clientId) === String(clientId)),
            invoices: (snapshot.invoices || []).filter((i) => String(i.clientId) === String(clientId)),
          }),
          _maxAttempts: 1,
        })
      } catch {
        /* optional */
      }
    }
    return normalized
  },

  async listPortalLinks() { return request('/api/portal/list') },
  async revokePortalLink(token) {
    return request('/api/portal/revoke', { method: 'POST', body: JSON.stringify({ token }) })
  },

  async listPortalDecisions({ limit = 50 } = {}) {
    return request(`/api/portal/decisions?limit=${limit}`, { _maxAttempts: 2 })
  },

  /** Issue customer portal login (email + PIN) for a client */
  async issueClientPortalLogin(payload) {
    return request('/api/client-portal/issue', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    })
  },

  async pushClientPortalSnapshot(payload) {
    return request('/api/client-portal/push-snapshot', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    })
  },

  async listClientPortalAccounts() {
    return request('/api/client-portal/accounts')
  },

  async setClientPortalAccountActive(email, active) {
    return request('/api/client-portal/accounts/' + encodeURIComponent(email) + '/status', {
      method: 'PATCH',
      body: JSON.stringify({ active: !!active }),
    })
  },

  async resetClientPortalPin(email) {
    return request('/api/client-portal/accounts/' + encodeURIComponent(email) + '/reset-pin', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  },

  async askAssistant(messages) {
    return request('/api/assistant', {
      method: 'POST',
      body: JSON.stringify({ messages: (Array.isArray(messages) ? messages : []).slice(-8).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '').slice(0, 1500),
      })) }),
      _maxAttempts: 1,
      _timeout: 25000,
    })
  },

  async createSupportTicket(payload) {
    return request('/api/support/tickets', { method: 'POST', body: JSON.stringify(payload || {}) })
  },

  async listSupportTickets() {
    return request('/api/support/tickets')
  },

  async listAdminSupportTickets(status = '') {
    const query = status ? '?status=' + encodeURIComponent(status) : ''
    return request('/api/admin/support/tickets' + query)
  },

  async updateSupportTicket(id, payload) {
    return request('/api/admin/support/tickets/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(payload || {}) })
  },
}

export default Sync
