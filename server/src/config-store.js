/**
 * saip-sync / SA API — config store v5.1
 * Public subset served to browser + APK.
 * Secrets only via authenticated admin (masked in views).
 */
import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const CONFIG_PATH = path.join(DATA_DIR, 'lab-config.json')

const DEFAULT_PUBLIC = {
  version: '5.1.0',
  codename: 'Pro Studio',
  announcement: '',
  google_client_id: '',
  min_app_version: '5.0.0',
  flags: {
    oauth_enabled: true,
    wa_enabled: true,
    demo_mode: false,
    maintenance: false,
    force_update: false,
  },
  currency: 'ZAR',
  vat_rate: 15,
  timezone: 'Africa/Johannesburg',
  invoice_prefix: 'INV',
  quote_prefix: 'QUO',
  job_prefix: 'JOB',
  company: {
    name: '',
    reg: '',
    vat: '',
    support_email: '',
    support_wa: '',
  },
  bank: {
    name: '',
    account: '',
    branch: '',
    reference_hint: '',
  },
}

const DEFAULT_SECRETS = {
  google_client_secret: '',
  jwt_secret: '',
  admin_api_key: '',
  wa_token: '',
  payfast_merchant_id: '',
  payfast_merchant_key: '',
  payfast_passphrase: '',
  smtp_url: '',
}

function ensureDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  } catch {}
}

function loadRaw() {
  ensureDir()
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    }
  } catch (e) {
    console.warn('[config-store] load', e.message)
  }
  return { public: { ...DEFAULT_PUBLIC }, secrets: { ...DEFAULT_SECRETS } }
}

function saveRaw(data) {
  ensureDir()
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8')
}

export function getPublic() {
  const raw = loadRaw()
  return { ...DEFAULT_PUBLIC, ...(raw.public || {}) }
}

export function getAdminView() {
  const raw = loadRaw()
  const pub = { ...DEFAULT_PUBLIC, ...(raw.public || {}) }
  const secrets = { ...DEFAULT_SECRETS, ...(raw.secrets || {}) }
  const masked = {}
  for (const [k, v] of Object.entries(secrets)) {
    const s = String(v || '')
    masked[k] = s ? (s.length <= 4 ? '****' : s.slice(0, 2) + '****' + s.slice(-2)) : ''
  }
  return { public: pub, secrets: masked, hasSecrets: Object.values(secrets).some(Boolean) }
}

export function updatePublic(patch = {}) {
  const raw = loadRaw()
  raw.public = { ...DEFAULT_PUBLIC, ...(raw.public || {}), ...patch }
  // Never allow secrets keys into public
  for (const k of Object.keys(DEFAULT_SECRETS)) delete raw.public[k]
  saveRaw(raw)
  return getPublic()
}

export function updateSecrets(patch = {}) {
  const raw = loadRaw()
  const next = { ...DEFAULT_SECRETS, ...(raw.secrets || {}) }
  for (const [k, v] of Object.entries(patch)) {
    if (k in DEFAULT_SECRETS && typeof v === 'string') {
      // Empty string means "leave unchanged"; explicit clear uses "__CLEAR__"
      if (v === '__CLEAR__') next[k] = ''
      else if (v !== '') next[k] = v
    }
  }
  raw.secrets = next
  saveRaw(raw)
  return getAdminView()
}
