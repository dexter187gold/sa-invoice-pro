import { getSetting, setSetting } from './db.js'
import { SA_CONFIG } from '../config.js'

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

export async function handshake() {
  const base = await getServerUrl()
  if (!base) throw new Error('License server URL not set')
  const hwid = await getHardwareId()
  const j = await postJson(base, ['/api/handshake', '/api/license/handshake'], {
    hwid, app: 'sa-invoice-pro', appVersion: SA_CONFIG.appVersion, version: SA_CONFIG.appVersion,
  })
  await setSetting('handshakeOk', true)
  await setSetting('lastLicenseExchange', { step: 'handshake', at: new Date().toISOString(), response: j })
  if (j.key) await setSetting('pendingLicenseKey', j.key)
  return j
}

export async function requestLicense() {
  const base = await getServerUrl()
  if (!base) throw new Error('License server URL not set')
  const hwid = await getHardwareId()
  const j = await postJson(base, ['/api/request-license', '/api/license/request', '/api/request', '/api/claim'], {
    hwid,
    app: 'sa-invoice-pro',
    version: SA_CONFIG.appVersion,
    appVersion: SA_CONFIG.appVersion,
    email: (await getSetting('licenseEmail', '')) || '',
  })
  await setSetting('lastLicenseExchange', { step: 'request', at: new Date().toISOString(), response: j })
  const key = j.key || j.licenseKey || j.license_key
  if (key) {
    await setSetting('pendingLicenseKey', key)
    await setSetting('licenseMeta', j.meta || { plan: j.plan || 'pending', requestedAt: new Date().toISOString(), status: j.status || 'requested' })
  }
  return j
}

export async function activate(key) {
  const k = (key || (await getSetting('pendingLicenseKey', '')) || (await getSetting('licenseKey', '')) || '').trim()
  if (!k) throw new Error('No license key — run Request first so the server can issue one')
  const base = await getServerUrl()
  if (!base) throw new Error('License server URL not set')
  const hwid = await getHardwareId()
  const j = await postJson(base, ['/api/activate', '/api/license/activate', '/api/activate-validate'], { hwid, key: k, app: 'sa-invoice-pro' })
  if (j.valid === false || j.ok === false || j.activated === false) throw new Error(j.error || j.message || 'Server did not confirm activation')
  // Normalise activate-validate response shape
  if (j.valid === true && j.ok === undefined) { j.ok = true; j.activated = true }
  if (j.valid === true && !j.meta) j.meta = { plan: j.plan, label: j.label, expiresAt: j.expiresAt, server: true, activatedAt: new Date().toISOString() }
  await setSetting('licenseKey', j.key || k)
  await setSetting('licenseMeta', j.meta || { activatedAt: new Date().toISOString(), plan: j.plan || 'standard', server: true })
  await setSetting('licenseOfflineBlob', { key: j.key || k, meta: j.meta || {} })
  await setSetting('lastLicenseExchange', { step: 'activate', at: new Date().toISOString(), response: j })
  try { localStorage.setItem('sa_license_cache', JSON.stringify({ key: j.key || k, meta: j.meta })) } catch {}
  return j
}

export async function fullActivate() {
  const hs = await handshake()
  const req = await requestLicense()
  const key = req.key || req.licenseKey || req.license_key || hs.key
  const act = await activate(key)
  return { handshake: hs, request: req, activate: act }
}

export async function getLicenseStatus() {
  const key = await getSetting('licenseKey', null)
  const meta = await getSetting('licenseMeta', null)
  const trialStart = await getSetting('trialStartedAt', null)
  const hwid = await getHardwareId()
  let trialDaysLeft = 7
  if (trialStart) {
    const elapsed = (Date.now() - new Date(trialStart).getTime()) / 86400000
    trialDaysLeft = Math.max(0, Math.ceil(7 - elapsed))
  }
  const exchange = await getSetting('lastLicenseExchange', null)
  return {
    licensed: !!(key && meta && meta.server),
    key,
    meta,
    hwid,
    trialDaysLeft,
    handshakeOk: !!(await getSetting('handshakeOk', false)),
    exchange,
  }
}
