/**
 * Feature flags — industry-standard toggles for progressive delivery.
 * Defaults favour pilot stability; override via localStorage saip_flags.
 */
const DEFAULTS = {
  multiJobBill: true,
  softDelete: true,
  portalMagicLink: true,
  paystackReturn: true,
  streamingBackup: true,
  opfsRecovery: true,
  traditionalLayout: true,
  deskReports: true,
  whatsappCloud: true,
  clientPortal: true,
  recycleBin: true,
  onboardingChecklist: true,
  verticalCatalogPacks: true,
  experimentalSyncDeltas: false,
  experimentalAiAssistant: false,
}

export function readFlags() {
  try {
    const raw = JSON.parse(localStorage.getItem('saip_flags') || '{}')
    return { ...DEFAULTS, ...raw }
  } catch {
    return { ...DEFAULTS }
  }
}

export function writeFlags(patch) {
  const next = { ...readFlags(), ...patch }
  try {
    localStorage.setItem('saip_flags', JSON.stringify(next))
  } catch {}
  return next
}

export function flag(name) {
  return !!readFlags()[name]
}

export function resetFlags() {
  try {
    localStorage.removeItem('saip_flags')
  } catch {}
  return { ...DEFAULTS }
}

export function listFlags() {
  const f = readFlags()
  return Object.keys(DEFAULTS).map((id) => ({ id, enabled: !!f[id], default: !!DEFAULTS[id] }))
}

export const FEATURE_FLAG_DEFAULTS = DEFAULTS
