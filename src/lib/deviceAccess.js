/**
 * Device access prefs — biometrics + gestures are OFF until the user enables them.
 */
const GESTURE_KEY = 'sa_gesture_prefs_v1'
const BIO_KEY = 'sa_biometric_prefs_v1'
const GESTURE_MIGRATION = 'sa_gesture_force_off_v6401'

export const DEFAULT_GESTURE_PREFS = {
  enabled: false,
  swipeMenu: false,
  swipeClose: false,
  swipeUpCreate: false,
  swipeDownHome: false,
  twoFingerMenu: false,
  threeFingerCommand: false,
}

export const DEFAULT_BIO_PREFS = {
  enabled: false,
  credentialId: null,
  setupAt: null,
}

function forceOffLegacyGesturesOnce() {
  try {
    if (localStorage.getItem(GESTURE_MIGRATION) === '1') return
    // Previous builds enabled gestures globally and interfered with navigation
    localStorage.setItem(GESTURE_KEY, JSON.stringify({ ...DEFAULT_GESTURE_PREFS }))
    localStorage.setItem(GESTURE_MIGRATION, '1')
  } catch {}
}

export function loadGesturePrefs() {
  forceOffLegacyGesturesOnce()
  try {
    return { ...DEFAULT_GESTURE_PREFS, ...JSON.parse(localStorage.getItem(GESTURE_KEY) || '{}') }
  } catch {
    return { ...DEFAULT_GESTURE_PREFS }
  }
}

export function saveGesturePrefs(prefs) {
  const next = { ...DEFAULT_GESTURE_PREFS, ...prefs }
  localStorage.setItem(GESTURE_KEY, JSON.stringify(next))
  try {
    window.dispatchEvent(new CustomEvent('sa-gesture-prefs', { detail: next }))
  } catch {}
  return next
}

export function loadBioPrefs() {
  try {
    return { ...DEFAULT_BIO_PREFS, ...JSON.parse(localStorage.getItem(BIO_KEY) || '{}') }
  } catch {
    return { ...DEFAULT_BIO_PREFS }
  }
}

export function saveBioPrefs(prefs) {
  const next = { ...DEFAULT_BIO_PREFS, ...prefs }
  localStorage.setItem(BIO_KEY, JSON.stringify(next))
  return next
}

export async function biometricSupported() {
  try {
    if (!window.PublicKeyCredential) return false
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return !!(await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    }
    return true
  } catch {
    return false
  }
}

function bufToB64(buf) {
  const bytes = new Uint8Array(buf)
  let s = ''
  bytes.forEach((b) => { s += String.fromCharCode(b) })
  return btoa(s)
}

function b64ToBuf(b64) {
  const s = atob(b64)
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i)
  return bytes.buffer
}

/** Register platform authenticator (Face ID / fingerprint / Windows Hello). */
export async function setupBiometric(userLabel = 'SA Invoice Pro user') {
  if (!(await biometricSupported())) {
    throw new Error('Biometrics are not available on this device or browser')
  }
  const userId = crypto.getRandomValues(new Uint8Array(16))
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'SA Invoice Pro', id: location.hostname },
      user: {
        id: userId,
        name: userLabel,
        displayName: userLabel,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  })
  if (!cred) throw new Error('Biometric setup was cancelled')
  const id = bufToB64(cred.rawId)
  return saveBioPrefs({
    enabled: true,
    credentialId: id,
    setupAt: new Date().toISOString(),
  })
}

/** Prompt biometric to unlock (verify local credential). */
export async function verifyBiometric() {
  const prefs = loadBioPrefs()
  if (!prefs.enabled || !prefs.credentialId) {
    throw new Error('Biometrics are not set up on this device')
  }
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      timeout: 60000,
      userVerification: 'required',
      allowCredentials: [
        {
          type: 'public-key',
          id: b64ToBuf(prefs.credentialId),
          transports: ['internal'],
        },
      ],
    },
  })
  if (!assertion) throw new Error('Biometric check cancelled')
  return true
}

export function disableBiometric() {
  return saveBioPrefs({ enabled: false, credentialId: null, setupAt: null })
}
