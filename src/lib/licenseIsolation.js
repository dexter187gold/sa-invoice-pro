/**
 * License must never bleed across local accounts on the same browser profile.
 * New registration / account switch clears local activation unless the same
 * licence email owns the proof and the server still confirms it.
 */
import { clearLicenseLocal, getLicenseStatus, revalidateLicense, hasServerProof } from './license.js'
import { getSetting, setSetting } from './db.js'

export async function boundLicenseEmail() {
  return String((await getSetting('licenseEmail', '')) || '').trim().toLowerCase()
}

/** Call when a different user is about to become active on this device. */
export async function isolateLicenseForAccount(nextEmail) {
  const next = String(nextEmail || '').trim().toLowerCase()
  const bound = await boundLicenseEmail()
  const proof = await hasServerProof()

  if (!next) {
    await clearLicenseLocal()
    return { cleared: true, reason: 'no_email' }
  }

  if (!proof) {
    try {
      await setSetting('licenseKey', null)
      await setSetting('activationToken', null)
    } catch {}
    return { cleared: false, reason: 'no_proof' }
  }

  if (bound && next && bound !== next) {
    await clearLicenseLocal()
    try {
      await setSetting('licenseEmail', next)
    } catch {}
    return { cleared: true, reason: 'email_mismatch', previous: bound, next }
  }

  try {
    const v = await revalidateLicense()
    if (v && v.licensed === false && !v.offline) {
      await clearLicenseLocal()
      return { cleared: true, reason: 'server_rejected' }
    }
  } catch {}

  if (!bound && next) {
    try { await setSetting('licenseEmail', next) } catch {}
  }
  return { cleared: false, reason: 'kept' }
}

/** After admin deletes a key on the server, force local UI to drop stale proof. */
export async function refreshLicenseAfterRemoteChange() {
  const v = await revalidateLicense()
  if (!v?.licensed) await clearLicenseLocal()
  return getLicenseStatus()
}
