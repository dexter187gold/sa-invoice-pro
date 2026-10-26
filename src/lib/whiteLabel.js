/**
 * White-label CSS pilot — brand accent, app title, portal header.
 * Stores prefs in localStorage + optional company fields; applies CSS vars on :root.
 */

const LS_KEY = 'saip_white_label_v1'

export const WHITE_LABEL_DEFAULTS = {
  brandName: '',
  accent: '',
  accentSoft: '',
  hidePoweredBy: false,
  portalTagline: '',
}

export function loadWhiteLabel() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '{}')
    return { ...WHITE_LABEL_DEFAULTS, ...raw }
  } catch {
    return { ...WHITE_LABEL_DEFAULTS }
  }
}

export function saveWhiteLabel(partial) {
  const next = { ...loadWhiteLabel(), ...partial }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next))
  } catch {}
  applyWhiteLabel(next)
  try {
    window.dispatchEvent(new CustomEvent('sa-white-label', { detail: next }))
  } catch {}
  return next
}

/** Soften hex accent for --green-soft style backgrounds. */
export function softAccent(hex) {
  const h = String(hex || '').trim()
  if (!/^#?[0-9a-fA-F]{6}$/.test(h.replace('#', ''))) return ''
  const raw = h.startsWith('#') ? h : `#${h}`
  return `color-mix(in srgb, ${raw} 18%, transparent)`
}

/** Apply brand CSS variables without wiping the full theme pack. */
export function applyWhiteLabel(prefs = loadWhiteLabel()) {
  const root = typeof document !== 'undefined' ? document.documentElement : null
  if (!root) return prefs
  const accent = String(prefs.accent || '').trim()
  if (accent && /^#?[0-9a-fA-F]{6}$/i.test(accent.replace('#', ''))) {
    const hex = accent.startsWith('#') ? accent : `#${accent}`
    root.style.setProperty('--green', hex)
    root.style.setProperty('--brand-accent', hex)
    const soft = prefs.accentSoft || softAccent(hex)
    if (soft) root.style.setProperty('--green-soft', soft)
  } else {
    root.style.removeProperty('--brand-accent')
  }
  const name = String(prefs.brandName || '').trim()
  if (name) root.setAttribute('data-brand-name', name)
  else root.removeAttribute('data-brand-name')
  if (prefs.hidePoweredBy) root.setAttribute('data-hide-powered', '1')
  else root.removeAttribute('data-hide-powered')
  return prefs
}

export function displayAppName(fallback = 'SA Invoice Pro') {
  const p = loadWhiteLabel()
  return String(p.brandName || '').trim() || fallback
}

export function portalTagline(fallback = 'Client portal') {
  const p = loadWhiteLabel()
  return String(p.portalTagline || '').trim() || fallback
}
