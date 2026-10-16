/**
 * SA Invoice Pro — Google OAuth / OpenID Connect helpers v5.1
 * Uses Google Identity Services (GIS) + id_token validation shape.
 * Client ID is pulled from live remote config (admin portal) so browser + APK stay in sync.
 */

import { getCachedConfig, fetchRemoteConfig } from './remoteConfig'

function decodeJwtPayload(token) {
  try {
    const part = String(token || '').split('.')[1]
    if (!part) return null
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decodeURIComponent(escape(json)))
  } catch {
    return null
  }
}

export function validateIdTokenShape(payload) {
  if (!payload || typeof payload !== 'object') return { ok: false, reason: 'empty' }
  if (!payload.sub) return { ok: false, reason: 'missing sub' }
  if (!payload.email) return { ok: false, reason: 'missing email' }
  if (payload.exp && payload.exp * 1000 < Date.now() - 60_000) {
    return { ok: false, reason: 'expired' }
  }
  return { ok: true, payload }
}

export async function getGoogleClientId() {
  let cfg = getCachedConfig()
  if (!cfg?.google_client_id) {
    cfg = await fetchRemoteConfig(true)
  }
  return (
    cfg?.google_client_id ||
    localStorage.getItem('sa_google_client_id') ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) ||
    ''
  )
}

let gisLoaded = false
function loadGis() {
  if (gisLoaded || (typeof window !== 'undefined' && window.google?.accounts?.id)) {
    gisLoaded = true
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => {
      gisLoaded = true
      resolve()
    }
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(s)
  })
}

/**
 * Sign in with Google. Returns { ok, idToken, profile } or { ok:false, reason }.
 */
export async function signInWithGoogle() {
  const clientId = await getGoogleClientId()
  if (!clientId) {
    return { ok: false, reason: 'Google Client ID not configured. Set it in Admin Lab → Secrets / Cloud Settings.' }
  }
  try {
    await loadGis()
  } catch (e) {
    return { ok: false, reason: e.message || 'GIS load failed' }
  }
  return new Promise((resolve) => {
    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => {
          const idToken = resp?.credential
          if (!idToken) {
            resolve({ ok: false, reason: 'No credential returned' })
            return
          }
          const payload = decodeJwtPayload(idToken)
          const check = validateIdTokenShape(payload)
          if (!check.ok) {
            resolve({ ok: false, reason: check.reason })
            return
          }
          resolve({
            ok: true,
            idToken,
            profile: {
              sub: payload.sub,
              email: payload.email,
              name: payload.name || payload.email,
              picture: payload.picture || '',
              email_verified: !!payload.email_verified,
            },
          })
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      })
      window.google.accounts.id.prompt((notification) => {
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          // Fallback: render a one-tap button programmatically is hard; surface reason
          resolve({ ok: false, reason: 'Google prompt not shown — check Client ID / authorized origins' })
        }
      })
    } catch (e) {
      resolve({ ok: false, reason: e.message || 'GIS initialize failed' })
    }
  })
}

export { decodeJwtPayload }
