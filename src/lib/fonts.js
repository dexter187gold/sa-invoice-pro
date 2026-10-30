/**
 * App-wide font packs — applied via --font-sans on documentElement.
 */
export const FONTS = [
  {
    id: 'system',
    label: 'System default',
    desc: 'Native UI font for your device',
    stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  {
    id: 'inter',
    label: 'Inter',
    desc: 'Clean SaaS — modern product UI',
    stack: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    google: 'Inter:wght@400;500;600;700',
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    desc: 'Friendly geometric — invoices & portals',
    stack: '"DM Sans", system-ui, sans-serif',
    google: 'DM+Sans:wght@400;500;600;700',
  },
  {
    id: 'source-sans',
    label: 'Source Sans 3',
    desc: 'Adobe open — excellent readability',
    stack: '"Source Sans 3", "Source Sans Pro", system-ui, sans-serif',
    google: 'Source+Sans+3:wght@400;500;600;700',
  },
  {
    id: 'nunito',
    label: 'Nunito',
    desc: 'Rounded soft — approachable shop floor',
    stack: '"Nunito", system-ui, sans-serif',
    google: 'Nunito:wght@400;500;600;700',
  },
  {
    id: 'ibm-plex',
    label: 'IBM Plex Sans',
    desc: 'Enterprise — dense data & tables',
    stack: '"IBM Plex Sans", system-ui, sans-serif',
    google: 'IBM+Plex+Sans:wght@400;500;600;700',
  },
  {
    id: 'space-grotesk',
    label: 'Space Grotesk',
    desc: 'Tech forward — dashboards & KPIs',
    stack: '"Space Grotesk", system-ui, sans-serif',
    google: 'Space+Grotesk:wght@400;500;600;700',
  },
  {
    id: 'serif-readable',
    label: 'Literata',
    desc: 'Long-form readable — reports & letters',
    stack: '"Literata", Georgia, "Times New Roman", serif',
    google: 'Literata:wght@400;500;600;700',
  },
]

const KEY = 'sa_app_font'

function ensureGoogleFont(google) {
  if (!google || typeof document === 'undefined') return
  const id = 'sa-google-font-' + google.replace(/[^a-z0-9]+/gi, '-')
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=' + google + '&display=swap'
  document.head.appendChild(link)
}

export function getSavedFontId() {
  try {
    return localStorage.getItem(KEY) || 'inter'
  } catch {
    return 'inter'
  }
}

export function applyFont(fontId) {
  const font = FONTS.find((f) => f.id === fontId) || FONTS[0]
  if (typeof document !== 'undefined') {
    if (font.google) ensureGoogleFont(font.google)
    document.documentElement.style.setProperty('--font-sans', font.stack)
    document.documentElement.dataset.font = font.id
    try {
      localStorage.setItem(KEY, font.id)
    } catch {}
  }
  return font
}

export function initFont() {
  return applyFont(getSavedFontId())
}
