/**
 * Local developer secrets vault (this browser only).
 * Values never leave the device unless you copy them to Render.
 * Soft-obfuscated at rest with a device key — not a bank vault.
 */
const VAULT_KEY = 'sa_dev_secrets_v1'
const OBF_PREFIX = 'v1:'

const SECRET_FIELDS = [
  { key: 'payfastMerchantId', label: 'PayFast Merchant ID', group: 'PayFast' },
  { key: 'payfastMerchantKey', label: 'PayFast Merchant Key', group: 'PayFast', secret: true },
  { key: 'payfastPassphrase', label: 'PayFast Passphrase', group: 'PayFast', secret: true },
  { key: 'payfastSandbox', label: 'PayFast sandbox mode (true/false)', group: 'PayFast' },
  { key: 'jwtSecret', label: 'JWT secret (saip-sync)', group: 'Auth', secret: true },
  { key: 'licenseAdminToken', label: 'License admin token', group: 'License', secret: true },
  { key: 'googleClientId', label: 'Google OAuth Client ID', group: 'Google' },
  { key: 'googleClientSecret', label: 'Google OAuth Client Secret', group: 'Google', secret: true },
  { key: 'metaAppId', label: 'Meta / WhatsApp App ID', group: 'Meta' },
  { key: 'metaAppSecret', label: 'Meta App Secret', group: 'Meta', secret: true },
  { key: 'metaAccessToken', label: 'WhatsApp / Graph access token', group: 'Meta', secret: true },
  { key: 'metaPhoneNumberId', label: 'WhatsApp Phone Number ID', group: 'Meta' },
  { key: 'metaWabaId', label: 'WhatsApp Business Account ID', group: 'Meta' },
  { key: 'updateToken', label: 'Updates server token', group: 'Updates', secret: true },
  { key: 'renderApiKey', label: 'Render API key', group: 'Render', secret: true },
  { key: 'gitStoreToken', label: 'Git-store / sync persistence token', group: 'Sync', secret: true },
  { key: 'extraNotes', label: 'Extra secrets / notes (JSON or text)', group: 'Other' },
]

export { SECRET_FIELDS }

function xorObfuscate(text, key) {
  const t = new TextEncoder().encode(String(text))
  const k = new TextEncoder().encode(String(key || 'saip'))
  const out = new Uint8Array(t.length)
  for (let i = 0; i < t.length; i++) out[i] = t[i] ^ k[i % k.length]
  let bin = ''
  out.forEach((b) => { bin += String.fromCharCode(b) })
  return OBF_PREFIX + btoa(bin)
}

function xorDeobfuscate(blob, key) {
  if (!blob || typeof blob !== 'string') return ''
  if (!blob.startsWith(OBF_PREFIX)) return blob
  try {
    const bin = atob(blob.slice(OBF_PREFIX.length))
    const t = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) t[i] = bin.charCodeAt(i)
    const k = new TextEncoder().encode(String(key || 'saip'))
    const out = new Uint8Array(t.length)
    for (let i = 0; i < t.length; i++) out[i] = t[i] ^ k[i % k.length]
    return new TextDecoder().decode(out)
  } catch {
    return ''
  }
}

function deviceKey() {
  try {
    let id = localStorage.getItem('sa_dev_device_key')
    if (!id) {
      id = crypto.randomUUID?.() || `d_${Date.now()}`
      localStorage.setItem('sa_dev_device_key', id)
    }
    return id
  } catch {
    return 'local'
  }
}

export function loadSecrets() {
  try {
    const raw = JSON.parse(localStorage.getItem(VAULT_KEY) || '{}')
    const key = deviceKey()
    const out = {}
    for (const f of SECRET_FIELDS) {
      const v = raw[f.key]
      out[f.key] = typeof v === 'string' ? xorDeobfuscate(v, key) : (v || '')
    }
    return out
  } catch {
    return Object.fromEntries(SECRET_FIELDS.map((f) => [f.key, '']))
  }
}

export function saveSecrets(values) {
  const key = deviceKey()
  const packed = {}
  for (const f of SECRET_FIELDS) {
    const v = values?.[f.key]
    if (v == null || String(v).trim() === '') continue
    packed[f.key] = f.secret !== false ? xorObfuscate(String(v), key) : String(v)
  }
  localStorage.setItem(VAULT_KEY, JSON.stringify(packed))
  return loadSecrets()
}

export function clearSecrets() {
  try { localStorage.removeItem(VAULT_KEY) } catch {}
}

/** Env snippet for pasting into Render */
export function secretsToEnvSnippet(values) {
  const map = {
    payfastMerchantId: 'PAYFAST_MERCHANT_ID',
    payfastMerchantKey: 'PAYFAST_MERCHANT_KEY',
    payfastPassphrase: 'PAYFAST_PASSPHRASE',
    jwtSecret: 'JWT_SECRET',
    licenseAdminToken: 'ADMIN_TOKEN',
    googleClientId: 'GOOGLE_CLIENT_ID',
    googleClientSecret: 'GOOGLE_CLIENT_SECRET',
    metaAppId: 'META_APP_ID',
    metaAppSecret: 'META_APP_SECRET',
    metaAccessToken: 'META_ACCESS_TOKEN',
    metaPhoneNumberId: 'META_PHONE_NUMBER_ID',
    metaWabaId: 'META_WABA_ID',
    updateToken: 'UPDATE_TOKEN',
    renderApiKey: 'RENDER_API_KEY',
    gitStoreToken: 'GIT_STORE_TOKEN',
  }
  const lines = []
  for (const [k, env] of Object.entries(map)) {
    const v = values?.[k]
    if (v != null && String(v).trim()) lines.push(`${env}=${String(v).trim()}`)
  }
  return lines.join('\n')
}
