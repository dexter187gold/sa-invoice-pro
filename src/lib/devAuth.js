/**
 * Developer portal gate — client-side only.
 * Not a multi-tenant security boundary; keeps staff away from ops UI.
 * Password is never stored in source; only a SHA-256 challenge hash.
 */
const SESSION_KEY = 'sa_dev_portal_session_v1'
const DEV_USERNAME = 'pcrepairdex@gmail.com'
// sha256('saip-dev-portal|pcrepairdex@gmail.com|' + password)
const DEV_PASS_HASH = '41c4183fb33ae415cc5cebe178dcfb21f89ddaf17a9ea79f71224bfc022047f9'

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function isDevPortalAuthed() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return false
    const s = JSON.parse(raw)
    if (!s?.ok || s.user !== DEV_USERNAME) return false
    if (s.exp && Date.now() > s.exp) {
      sessionStorage.removeItem(SESSION_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export async function loginDevPortal(username, password) {
  const u = String(username || '').trim().toLowerCase()
  const p = String(password || '')
  if (u !== DEV_USERNAME.toLowerCase()) {
    throw new Error('Invalid developer credentials')
  }
  const hash = await sha256Hex(`saip-dev-portal|${DEV_USERNAME}|${p}`)
  if (hash !== DEV_PASS_HASH) {
    throw new Error('Invalid developer credentials')
  }
  const session = {
    ok: true,
    user: DEV_USERNAME,
    at: new Date().toISOString(),
    exp: Date.now() + 12 * 60 * 60 * 1000, // 12h
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function logoutDevPortal() {
  try { sessionStorage.removeItem(SESSION_KEY) } catch {}
}

export function getDevDevUsername() {
  return DEV_USERNAME
}
