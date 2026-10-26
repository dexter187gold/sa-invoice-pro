/**
 * Encrypted device passcode storage — Web Crypto AES-GCM + vault PIN.
 */
const VAULT_PIN_KEY = 'sa_vault_pin_hash'
const VAULT_SALT_KEY = 'sa_vault_salt'

function b64(buf) {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function fromB64(str) {
  const bin = atob(str)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out.buffer
}

async function sha256(text) {
  const data = new TextEncoder().encode(text)
  return crypto.subtle.digest('SHA-256', data)
}

export async function setVaultPin(pin) {
  const p = String(pin || '')
  if (p.length < 4) throw new Error('Vault PIN at least 4 characters')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await sha256(p + b64(salt))
  localStorage.setItem(VAULT_SALT_KEY, b64(salt))
  localStorage.setItem(VAULT_PIN_KEY, b64(hash))
  return true
}

export function hasVaultPin() {
  return !!(localStorage.getItem(VAULT_PIN_KEY) && localStorage.getItem(VAULT_SALT_KEY))
}

export async function unlockVault(pin) {
  const saltB = localStorage.getItem(VAULT_SALT_KEY)
  const hashB = localStorage.getItem(VAULT_PIN_KEY)
  if (!saltB || !hashB) throw new Error('Set a vault PIN in Settings first')
  const hash = await sha256(String(pin || '') + saltB)
  if (b64(hash) !== hashB) throw new Error('Wrong vault PIN')
  return crypto.subtle.importKey(
    'raw',
    await sha256(String(pin) + saltB + '|saip-vault'),
    'AES-GCM',
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptPasscode(plain, pin) {
  const text = String(plain || '')
  if (!text) return null
  const key = await unlockVault(pin)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text))
  return { v: 1, iv: b64(iv), ct: b64(ct) }
}

export async function decryptPasscode(blob, pin) {
  if (!blob || !blob.ct || !blob.iv) return ''
  const key = await unlockVault(pin)
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(fromB64(blob.iv)) },
    key,
    fromB64(blob.ct),
  )
  return new TextDecoder().decode(pt)
}
