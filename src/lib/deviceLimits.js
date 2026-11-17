/**
 * Device seat limits by plan (owner product rules).
 * Solo → 1 device, Shop → 3, Multi → 8, Enterprise → 25, Lifetime → 1.
 */
import { getHardwareId, getLicenseStatus } from './license.js'
import { getSetting, setSetting } from './db.js'
import { featurePlanGroup, normalizePlanId } from './licenseTiers.js'
import { Sync } from './sync.js'

const LS_DEVICES = 'saip_device_registry_v1'

export function maxDevicesForPlan(planRaw) {
  const id = featurePlanGroup(planRaw) || normalizePlanId(planRaw) || 'solo'
  const map = {
    trial: 1,
    solo: 1,
    shop: 3,
    multi: 8,
    lifetime: 1,
    enterprise: 25,
  }
  return map[id] || 1
}

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS_DEVICES) || '[]') || []
  } catch {
    return []
  }
}

function saveLocal(rows) {
  try {
    localStorage.setItem(LS_DEVICES, JSON.stringify(rows.slice(0, 50)))
  } catch {}
}

export async function currentDeviceRecord() {
  const hwid = await getHardwareId()
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  return {
    fingerprint: hwid,
    hwid,
    label: /Mobile|Android|iPhone/i.test(ua) ? 'Mobile browser' : 'Desktop browser',
    ua: String(ua).slice(0, 180),
    lastSeenAt: new Date().toISOString(),
  }
}

export async function assertAndRegisterDevice({ accountEmail, plan } = {}) {
  const status = plan ? { meta: { plan } } : await getLicenseStatus()
  const planId = status?.meta?.plan || status?.meta?.planId || plan || 'solo'
  const max = maxDevicesForPlan(planId)
  const me = await currentDeviceRecord()
  const email = String(accountEmail || (await getSetting('licenseEmail', '')) || '').trim().toLowerCase()

  let remote = null
  try {
    if (typeof Sync.isLoggedIn === 'function' && Sync.isLoggedIn()) {
      remote = await Sync.registerDevice({
        fingerprint: me.fingerprint,
        label: me.label,
        accountEmail: email,
        plan: planId,
      })
    }
  } catch (e) {
    const msg = String(e?.message || e)
    if (/device.?limit|too many devices|seat limit|max devices/i.test(msg)) {
      const err = new Error(
        msg || `Device limit reached for ${planId} plan (max ${max}). Sign out another device or upgrade.`,
      )
      err.code = 'device_limit'
      throw err
    }
  }

  const rows = loadLocal().filter((r) => r && r.fingerprint)
  const existing = rows.find((r) => r.fingerprint === me.fingerprint)
  if (!existing) {
    const active = rows.filter((r) => r.revoked !== true)
    if (active.length >= max) {
      const err = new Error(
        `This ${planId} licence allows ${max} device${max === 1 ? '' : 's'}. ` +
          `Remove a device under Settings → Security or upgrade (Shop = 3 devices).`,
      )
      err.code = 'device_limit'
      throw err
    }
    rows.push({ ...me, accountEmail: email, plan: planId, createdAt: new Date().toISOString() })
  } else {
    Object.assign(existing, me, { accountEmail: email, plan: planId, revoked: false })
  }
  saveLocal(rows)
  await setSetting('deviceRegistry', rows)
  return { ok: true, max, used: rows.filter((r) => !r.revoked).length, device: me, remote }
}

export function listLocalDevices() {
  return loadLocal()
}

export function revokeLocalDevice(fingerprint) {
  const rows = loadLocal().map((r) =>
    String(r.fingerprint) === String(fingerprint)
      ? { ...r, revoked: true, revokedAt: new Date().toISOString() }
      : r,
  )
  saveLocal(rows)
  return rows
}
