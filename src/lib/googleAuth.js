/**
 * Google Sign-In (GIS) helper for SA Invoice Pro.
 *
 * Privacy model:
 * - User signs in with Google → we only receive email + name + Google subject id.
 * - Workspace data (invoices, quotes, etc.) stays on-device and is synced to the
 *   user's cloud profile on saip-sync after the server verifies the ID token.
 * - The licence/server never stores Google passwords; it only trusts verified tokens.
 *
 * Setup:
 * 1. Create OAuth 2.0 Web client in Google Cloud Console
 * 2. Authorized JS origins: your app origin (e.g. https://sa-invoice-pro.pages.dev)
 * 3. Set VITE_GOOGLE_CLIENT_ID in the app env
 * 4. On saip-sync: POST /api/auth/google { idToken } verifies token and issues SAIP session
 */
import { SA_CONFIG } from '../config.js'
import { Sync } from './sync.js'

const GIS_SRC = 'https://accounts.google.com/gsi/client'

export function googleClientId() {
  try {
    return (
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) ||
      SA_CONFIG.googleClientId ||
      ''
    ).trim()
  } catch {
    return ''
  }
}

export function isGoogleSignInConfigured() {
  return !!googleClientId()
}

function loadGisScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.google?.accounts?.id) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-saip-gis]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Google script failed')))
      return
    }
    const s = document.createElement('script')
    s.src = GIS_SRC
    s.async = true
    s.defer = true
    s.dataset.saipGis = '1'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Could not load Google Sign-In'))
    document.head.appendChild(s)
  })
}

/**
 * Prompt Google One Tap / button flow and return the ID token credential.
 */
export async function requestGoogleIdToken() {
  const clientId = googleClientId()
  if (!clientId) throw new Error('Google Sign-In is not configured (set VITE_GOOGLE_CLIENT_ID)')
  await loadGisScript()
  return new Promise((resolve, reject) => {
    let settled = false
    const done = (err, token) => {
      if (settled) return
      settled = true
      if (err) reject(err)
      else resolve(token)
    }
    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) done(null, response.credential)
          else done(new Error('No credential from Google'))
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      })
      window.google.accounts.id.prompt((notification) => {
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          const host = document.createElement('div')
          host.id = 'saip-google-btn-host'
          host.style.cssText = 'position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:rgba(0,0,0,.45)'
          host.innerHTML = '<div style="background:#fff;padding:20px;border-radius:12px;min-width:280px;text-align:center"><p style="margin:0 0 12px;color:#111">Continue with Google</p><div id="saip-google-btn"></div><button type="button" id="saip-google-cancel" style="margin-top:12px">Cancel</button></div>'
          document.body.appendChild(host)
          host.querySelector('#saip-google-cancel')?.addEventListener('click', () => {
            host.remove()
            done(new Error('Google sign-in cancelled'))
          })
          window.google.accounts.id.renderButton(host.querySelector('#saip-google-btn'), {
            theme: 'outline',
            size: 'large',
            shape: 'rectangular',
            text: 'continue_with',
            width: 280,
          })
        }
      })
    } catch (e) {
      done(e)
    }
  })
}

/**
 * Exchange Google ID token with saip-sync for an app session token.
 */
export async function loginWithGoogleIdToken(idToken) {
  if (!idToken) throw new Error('Missing Google ID token')
  const cloudBase = (SA_CONFIG.defaultCloudUrl || 'https://saip-sync.onrender.com').replace(/\/$/, '')
  const res = await fetch(`${cloudBase}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ idToken, id_token: idToken }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Google sign-in was rejected by the server')
  }
  if (data.token && Sync.setToken) Sync.setToken(data.token)
 if (data.token) {
    try { localStorage.setItem('sa_cloud_token', data.token) } catch {}
  }
  return data
}

export async function signInWithGoogle() {
  const idToken = await requestGoogleIdToken()
  return loginWithGoogleIdToken(idToken)
}
