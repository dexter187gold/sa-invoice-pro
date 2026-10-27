/**
 * Soft device license for free-tier alpha.
 * Never hard-blocks the desk during alpha — banners + gentle limits only.
 */
import { getLicenseStatus } from './license.js'

/** Alpha window: soft mode always allows core desk features. */
export const ALPHA_SOFT_MODE = true

export const SOFT_LIMITS = {
  maxDevicesHint: 3,
  trialDaysSoft: 30,
}

export async function getSoftLicenseState() {
  const st = await getLicenseStatus()
  const licensed = !!st.licensed
  const trialDaysLeft = st.trialDaysLeft
  let level = 'ok' // ok | warn | trial_ended_soft
  let message = ''

  if (licensed) {
    level = 'ok'
    message = 'Device licensed'
  } else if (trialDaysLeft != null && trialDaysLeft <= 0) {
    level = 'trial_ended_soft'
    message =
      'Trial period ended — alpha soft mode stays open. Activate a license when you go paid.'
  } else if (trialDaysLeft != null && trialDaysLeft <= 7) {
    level = 'warn'
    message = `${trialDaysLeft} trial day(s) left — desk stays fully usable in alpha.`
  } else {
    level = 'ok'
    message = `Alpha trial · ${trialDaysLeft ?? '—'} days soft window`
  }

  return {
    ...st,
    softMode: ALPHA_SOFT_MODE,
    level,
    message,
    /** Always true in alpha — no hard lock. */
    canUseDesk: true,
    showBanner: level === 'warn' || level === 'trial_ended_soft',
  }
}

export function softLicenseBannerText(state) {
  if (!state?.showBanner) return ''
  return state.message || ''
}
