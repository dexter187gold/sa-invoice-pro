/** Opt-out + quiet hours for outbound WhatsApp/SMS (P6.4). */

const PREFS_KEY = 'sa_comms_prefs'

export function loadCommsPrefs() {
  try {
    const v = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
    return {
      quietStart: Number(v.quietStart ?? 20),
      quietEnd: Number(v.quietEnd ?? 7),
      respectQuiet: v.respectQuiet !== false,
      optOutPhones: Array.isArray(v.optOutPhones) ? v.optOutPhones : [],
    }
  } catch {
    return { quietStart: 20, quietEnd: 7, respectQuiet: true, optOutPhones: [] }
  }
}

export function saveCommsPrefs(prefs) {
  const next = { ...loadCommsPrefs(), ...prefs }
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next))
  } catch {}
  return next
}

export function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '')
}

export function isOptedOut(phone, prefs = loadCommsPrefs()) {
  const d = normalizePhoneDigits(phone)
  if (!d) return false
  return (prefs.optOutPhones || []).some((p) => normalizePhoneDigits(p) === d || d.endsWith(normalizePhoneDigits(p)))
}

export function addOptOut(phone) {
  const prefs = loadCommsPrefs()
  const d = normalizePhoneDigits(phone)
  if (!d) return prefs
  if (!prefs.optOutPhones.includes(d)) prefs.optOutPhones = [...prefs.optOutPhones, d]
  return saveCommsPrefs(prefs)
}

/** Quiet hours spanning midnight (e.g. 20→07) */
export function isQuietHour(date = new Date(), prefs = loadCommsPrefs()) {
  if (!prefs.respectQuiet) return false
  const h = date.getHours()
  const start = Number(prefs.quietStart) || 20
  const end = Number(prefs.quietEnd) || 7
  if (start === end) return false
  if (start > end) return h >= start || h < end
  return h >= start && h < end
}

export function canSendOutbound(phone, date = new Date()) {
  const prefs = loadCommsPrefs()
  if (isOptedOut(phone, prefs)) return { ok: false, reason: 'opt_out' }
  if (isQuietHour(date, prefs)) return { ok: false, reason: 'quiet_hours' }
  return { ok: true, reason: null }
}
