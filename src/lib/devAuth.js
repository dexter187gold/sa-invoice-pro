/**
 * Developer portal sessions are issued only by saip-sync after server-side
 * validation of the owner email + SA_OWNER_TOKEN. Never validate the secret
 * in the browser or persist the raw owner token.
 */
const SESSION_KEY = 'sa_dev_portal_session_v2'
const DEV_EMAIL = 'sainvoicepro@gmail.com'
const SYNC_API = 'https://saip-sync.onrender.com'

export function isDevPortalAuthed() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return false
    const session = JSON.parse(raw)
    if (!session?.token || session.email !== DEV_EMAIL || session.role !== 'developer') return false
    if (!session.exp || Date.now() >= session.exp) {
      sessionStorage.removeItem(SESSION_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export async function loginDevPortal(email, ownerToken) {
  const address = String(email || '').trim().toLowerCase()
  const secret = String(ownerToken || '')
  if (address !== DEV_EMAIL || !secret) throw new Error('Invalid developer credentials')
  let response
  try {
    response = await fetch(`${SYNC_API}/api/dev/owner-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: address, token: secret }),
      cache: 'no-store',
      signal: AbortSignal.timeout?.(12000),
    })
  } catch {
    throw new Error('Could not reach the secure sign-in service. Please try again.')
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.token || data?.user?.role !== 'developer') {
    throw new Error(data?.error || 'Developer sign-in failed')
  }
  const session = {
    token: data.token,
    email: DEV_EMAIL,
    role: 'developer',
    exp: Date.now() + Math.max(60, Number(data.expires_in) || 7200) * 1000,
  }
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    throw new Error('This browser could not store the temporary developer session.')
  }
  return session
}

export function logoutDevPortal() {
  try { sessionStorage.removeItem(SESSION_KEY) } catch {}
}
