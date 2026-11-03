const STORAGE_KEY = 'saip_personal_vault_v1'
const FAIL_KEY = 'saip_personal_vault_failures_v1'
const MAX_ATTEMPTS = 5
const LOCK_MS = 15 * 60 * 1000

const b64 = (bytes) => {
  let binary = ''
  new Uint8Array(bytes).forEach((b) => { binary += String.fromCharCode(b) })
  return btoa(binary)
}
const unb64 = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0))

async function deriveKey(password, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return b64(bytes)
}
function readFailures() {
  try { return JSON.parse(localStorage.getItem(FAIL_KEY) || '{"count":0,"until":0}') } catch { return { count: 0, until: 0 } }
}
function checkLock() {
  const f = readFailures()
  if (f.until > Date.now()) throw new Error('Vault temporarily locked after repeated failed sign-in attempts. Try again later.')
}
function failedAttempt() {
  const f = readFailures()
  const count = f.count + 1
  localStorage.setItem(FAIL_KEY, JSON.stringify({ count, until: count >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0 }))
}
function clearFailures() { localStorage.removeItem(FAIL_KEY) }

export function vaultExists() {
  return !!localStorage.getItem(STORAGE_KEY)
}
export function getVaultUsername() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')?.username || '' } catch { return '' }
}
export async function createVault(username, password) {
  const name = String(username || '').trim()
  const pass = String(password || '')
  if (vaultExists()) throw new Error('A personal vault is already configured on this device.')
  if (!/^[a-zA-Z0-9._-]{4,32}$/.test(name)) throw new Error('Username must be 4–32 characters using letters, numbers, dots, underscores or hyphens.')
  if (pass.length < 14 || !/[a-z]/.test(pass) || !/[A-Z]/.test(pass) || !/[0-9]/.test(pass) || !/[^A-Za-z0-9]/.test(pass)) {
    throw new Error('Use at least 14 characters with uppercase, lowercase, a number and a symbol.')
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveKey(pass, salt)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const payload = { version: 1, transactions: [], budgets: [], goals: [], notes: [], createdAt: new Date().toISOString() }
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload)))
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, username: name, usernameHash: await digest(name.toLowerCase()), salt: b64(salt), iv: b64(iv), ciphertext: b64(ciphertext) }))
  clearFailures()
  return payload
}
export async function unlockVault(username, password) {
  checkLock()
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  if (!stored) throw new Error('Personal vault has not been configured on this device.')
  const name = String(username || '').trim()
  if (await digest(name.toLowerCase()) !== stored.usernameHash) { failedAttempt(); throw new Error('Incorrect username or password.') }
  try {
    const key = await deriveKey(String(password || ''), unb64(stored.salt))
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(stored.iv) }, key, unb64(stored.ciphertext))
    clearFailures()
    return { key, data: JSON.parse(new TextDecoder().decode(plain)) }
  } catch {
    failedAttempt()
    throw new Error('Incorrect username or password.')
  }
}
export async function saveVault(key, data) {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  if (!stored) throw new Error('Vault is not configured.')
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(data)))
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, iv: b64(iv), ciphertext: b64(ciphertext) }))
}
