
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
    Date.now().toString(36),
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

export async function handshake() {
  const base = await getServerUrl()
  if (!base) throw new Error('License server URL not set')
  const hwid = await getHardwareId()
  const res = await fetch(base + '/api/handshake', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hwid, app: 'sa-invoice-pro', version: SA_CONFIG.appVersion }),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j.error || 'Handshake failed')
  await setSetting('handshakeOk', true)
  if (j.key) await setSetting('pendingLicenseKey', j.key)
  return j
}

export async function requestLicense() {
  const base = await getServerUrl()
  if (!base) throw new Error('License server URL not set')
  const hwid = await getHardwareId()
  const res = await fetch(base + '/api/request-license', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hwid }),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j.error || 'Request failed')
  if (j.key) {
    await setSetting('pendingLicenseKey', j.key)
    await setSetting('licenseKey', j.key)
    await setSetting('licenseMeta', j.meta || { plan: j.plan || 'trial', at: new Date().toISOString() })
  }
  return j
}

export async function activate(key) {
  const k = (key || (await getSetting('pendingLicenseKey', '')) || '').trim()
  if (!k) throw new Error('No license key')
  const base = await getServerUrl()
  const hwid = await getHardwareId()
  if (base) {
    try {
      const res = await fetch(base + '/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hwid, key: k }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Activation rejected')
      await setSetting('licenseKey', k)
      await setSetting('licenseMeta', j.meta || { activatedAt: new Date().toISOString(), plan: j.plan || 'standard' })
      await setSetting('licenseOfflineBlob', { key: k, meta: j.meta || {} })
      try { localStorage.setItem('sa_license_cache', JSON.stringify({ key: k, meta: j.meta })) } catch {}
      return j
    } catch (e) {
      // offline activate store
      await setSetting('licenseKey', k)
      await setSetting('licenseMeta', { activatedAt: new Date().toISOString(), offline: true })
      throw e
    }
  }
  await setSetting('licenseKey', k)
  await setSetting('licenseMeta', { activatedAt: new Date().toISOString(), local: true })
  return { ok: true }
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
  return {
    licensed: !!(key && meta),
    key,
    meta,
    hwid,
    trialDaysLeft,
    handshakeOk: !!(await getSetting('handshakeOk', false)),
  }
}
