import { getSetting, setSetting, recoverDeviceLicenseSettings } from './db.js'
import { SA_CONFIG } from '../config.js'

/** Alpha soft trial length (days). Matches deviceLicense SOFT_LIMITS. */
export const ALPHA_TRIAL_DAYS = 30

export async function getHardwareId() {
  let id = await getSetting('hwid', null)
  if (id) return id
  try { id = localStorage.getItem('saip_hwid') } catch {}
  if (id) { await setSetting('hwid', id); return id }
  const raw = [
    navigator.userAgent || '',
    screen.width + 'x' + screen.height,
    String(navigator.hardwareConcurrency || ''),
    (navigator.language || ''),
  ].join('|')
  let h = 0
  for (let i = 0; i < raw.length; i++) h = ((h << 5) - h + raw.charCodeAt(i)) | 0
  id = 'HWID-' + Math.abs(h).toString(16).toUpperCase().padStart(8, '0') + '-' + Math.abs((h * 31) | 0).toString(16).toUpperCase().padStart(4, '0')
  await setSetting('hwid', id)
  try { localStorage.setItem('saip_hwid', id) } catch {}
  return id
}

export async function getServerUrl() {
  let url = ((await getSetting('licenseServerUrl', '')) || '').trim().replace(/\/$/, '')
  if (!url && SA_CONFIG.defaultLicenseServerUrl) {
    url = String(SA_CONFIG.defaultLicenseServerUrl).trim().replace(/\/$/, '')
    if (url) await setSetting('licenseServerUrl', url)
  }
  return url
}

async function postJson(base, paths, body) {
  const errors = []
  for (const path of paths) {
    try {
      const res = await fetch(base + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      })
      const text = await res.text()
      let j = {}
      try { j = text ? JSON.parse(text) : {} } catch { j = { raw: text.slice(0, 400) } }
      if (res.ok) return { ...j, _path: path, _status: res.status }
      errors.push(path + ' ' + res.status + ': ' + (j.error || j.message || text.slice(0, 180)))
    } catch (e) {
      errors.push(path + ' network: ' + (e.message || e))
    }
  }
  const err = new Error(errors.join(' | ') || 'License server unreachable')
  err.details = errors
  throw err
}

/** True only when the server confirmed activation (token + server flag). */
export async function hasServerProof() {
  const meta = await getSetting('licenseMeta', null)
  const token = await getSetting('activationToken', null)
  const key = await getSetting('licenseKey', null)
  return !!(key && token && meta && meta.server === true && meta.activationToken)
}

export async function clearLicenseLocal() {
  await setSetting('licenseKey', null)
  await setSetting('licenseMeta', null)
  await setSetting('activationToken', null)
  await setSetting('licenseOfflineBlob', null)
  try { localStorage.removeItem('sa_license_cache') } catch {}
}

export async function handshake() {
  const base = await getServerUrl()
  if (!base) throw new Error('License server URL not set')
  const hwid = await getHardwareId()
  const j = await postJson(base, ['/api/handshake', '/api/license/handshake'], {
    hwid, app: 'sa-invoice-pro', appVersion: SA_CONFIG.appVersion, version: SA_CONFIG.appVersion,
  })
  await setSetting('handshakeOk', true)
  await setSetting('lastLicenseExchange', { step: 'handshake', at: new Date().toISOString(), response: j })
  return j
}

export async function requestLicense() {
  const base = await getServerUrl()
  if (!base) throw new Error('License server URL not set')
  const hwid = await getHardwareId()
  const j = await postJson(base, ['/api/request-license', '/api/license/request', '/api/request'], {
    hwid,
    app: 'sa-invoice-pro',
    version: SA_CONFIG.appVersion,
    appVersion: SA_CONFIG.appVersion,
    email: (await getSetting('licenseEmail', '')) || SA_CONFIG.productEmail || '',
  })
  await setSetting('lastLicenseExchange', { step: 'request', at: new Date().toISOString(), response: j })
  const key = j.key || j.licenseKey || j.license_key
  if (key) await setSetting('pendingLicenseKey', key)
  return j
}

/**
 * Activate only if the licence server accepts this key for this device HWID.
 * Wrong keys are rejected; localStorage alone cannot mark licensed.
 */
export async function activate(key) {
  const k = (key || (await getSetting('pendingLicenseKey', '')) || '').trim().toUpperCase()
  if (!k) throw new Error('Enter the activation key from your email or SMS')
  if (k.length < 10) throw new Error('Activation key looks incomplete')
  const base = await getServerUrl()
  if (!base) throw new Error('License server URL not set — cannot verify key')
  const hwid = await getHardwareId()
  const email = ((await getSetting('licenseEmail', '')) || '').trim().toLowerCase()

  const j = await postJson(
    base,
    ['/api/activate', '/api/license/activate', '/api/activate-validate'],
    { hwid, key: k, email, app: 'sa-invoice-pro' },
  )

  const ok = j.ok === true || j.activated === true || j.valid === true
  if (!ok || j.ok === false || j.activated === false || j.valid === false) {
    await clearLicenseLocal()
    throw new Error(j.error || j.message || 'Server rejected this activation key')
  }

  const token = j.activationToken || j.meta?.activationToken
  const meta = {
    ...(j.meta || {}),
    server: true,
    plan: j.plan || j.meta?.plan || 'standard',
    activatedAt: j.meta?.activatedAt || new Date().toISOString(),
    hwid,
    activationToken: token || j.meta?.activationToken || null,
  }

  await setSetting('licenseKey', j.key || k)
  await setSetting('licenseMeta', meta)
  if (token) await setSetting('activationToken', token)
  await setSetting('licenseOfflineBlob', { key: j.key || k, meta, activationToken: token })
  await setSetting('lastLicenseExchange', { step: 'activate', at: new Date().toISOString(), response: { ok: true, plan: meta.plan } })
  try {
    localStorage.setItem('sa_license_cache', JSON.stringify({ key: j.key || k, meta, activationToken: token }))
  } catch {}
  return { ...j, ok: true, activated: true, valid: true, meta }
}

/** Online re-check — clears local proof if server disagrees. */
export async function revalidateLicense() {
  const base = await getServerUrl()
  const key = await getSetting('licenseKey', null)
  const token = await getSetting('activationToken', null)
  const hwid = await getHardwareId()
  if (!base || !key) return { ok: false, licensed: false, reason: 'missing' }
  try {
    const j = await postJson(base, ['/api/license/verify', '/api/device-status'], {
      hwid,
      key,
      activationToken: token,
    })
    const licensed = j.ok === true && (j.licensed === true || j.status === 'licensed' || j.mode === 'licensed')
    if (!licensed) {
      await clearLicenseLocal()
      return { ok: false, licensed: false, reason: j.error || 'not_licensed', remote: j }
    }
    return { ok: true, licensed: true, remote: j }
  } catch (e) {
    const proof = await hasServerProof()
    return { ok: proof, licensed: proof, offline: true, error: e.message }
  }
}

export async function fullActivate() {
  const hs = await handshake()
  const req = await requestLicense()
  const key = req.key || req.licenseKey || req.license_key || hs.key
  const act = await activate(key)
  return { handshake: hs, request: req, activate: act }
}

export async function ensureTrialStarted() {
  let trialStart = await getSetting('trialStartedAt', null)
  if (!trialStart) {
    trialStart = new Date().toISOString()
    await setSetting('trialStartedAt', trialStart)
  }
  return trialStart
}

export async function getLicenseStatus() {
  await recoverDeviceLicenseSettings()
  const trialStart = await ensureTrialStarted()
  const key = await getSetting('licenseKey', null)
  const meta = await getSetting('licenseMeta', null)
  const token = await getSetting('activationToken', null)
  const hwid = await getHardwareId()
  const elapsed = (Date.now() - new Date(trialStart).getTime()) / 86400000
  const trialDaysLeft = Math.max(0, Math.ceil(ALPHA_TRIAL_DAYS - elapsed))
  const exchange = await getSetting('lastLicenseExchange', null)
  const serverUrl = await getServerUrl()
  const licensed = !!(key && meta && meta.server === true && (token || meta.activationToken))
  return {
    licensed,
    key: licensed ? key : null,
    meta: licensed ? meta : null,
    hwid,
    trialDaysLeft,
    trialDaysTotal: ALPHA_TRIAL_DAYS,
    handshakeOk: !!(await getSetting('handshakeOk', false)),
    exchange,
    serverUrl,
    alphaSoft: true,
    serverProof: licensed,
  }
}

export async function getRemoteDeviceStatus() {
  const base = await getServerUrl()
  if (!base) throw new Error('License server URL not set')
  const hwid = await getHardwareId()
  const res = await fetch(base + '/api/device-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ hwid }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not refresh server licence status')
  return data
}

export async function pingLicenseServer() {
  const base = await getServerUrl()
  if (!base) return { ok: false, error: 'No server URL' }
  try {
    const res = await fetch(base + '/api/public-config', { headers: { Accept: 'application/json' } })
    const j = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, config: j, base }
  } catch (e) {
    return { ok: false, error: e.message || String(e), base }
  }
}
