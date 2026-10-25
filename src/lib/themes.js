/**
 * Global theme pack — 10 dominant product aesthetics (2025–2026).
 * Applied via documentElement data-theme + CSS variables.
 */
export const THEMES = [
  {
    id: 'midnight',
    label: 'Midnight Pro',
    desc: 'Dark SaaS default — Linear / Vercel style',
    vars: {
      '--bg': '#0b1220',
      '--bg-elevated': '#111827',
      '--card': '#111827',
      '--text': '#e5e7eb',
      '--muted': '#94a3b8',
      '--border': 'rgba(148,163,184,.18)',
      '--green': '#38bdf8',
      '--green-soft': 'rgba(56,189,248,.15)',
      '--danger': '#f87171',
      '--warn': '#fbbf24',
    },
  },
  {
    id: 'aurora',
    label: 'Aurora',
    desc: 'Indigo + violet gradients — AI product look',
    vars: {
      '--bg': '#0f0a1a',
      '--bg-elevated': '#1a1030',
      '--card': '#1a1030',
      '--text': '#f3e8ff',
      '--muted': '#c4b5fd',
      '--border': 'rgba(167,139,250,.22)',
      '--green': '#a78bfa',
      '--green-soft': 'rgba(167,139,250,.18)',
      '--danger': '#fb7185',
      '--warn': '#fbbf24',
    },
  },
  {
    id: 'ocean',
    label: 'Ocean Depth',
    desc: 'Calm blue helpdesk — Zendesk / Freshdesk calm',
    vars: {
      '--bg': '#0a1628',
      '--bg-elevated': '#0f2137',
      '--card': '#0f2137',
      '--text': '#e0f2fe',
      '--muted': '#7dd3fc',
      '--border': 'rgba(56,189,248,.2)',
      '--green': '#0ea5e9',
      '--green-soft': 'rgba(14,165,233,.16)',
      '--danger': '#f87171',
      '--warn': '#fbbf24',
    },
  },
  {
    id: 'sunset',
    label: 'Sunset Heat',
    desc: 'Warm coral / amber — commerce energy',
    vars: {
      '--bg': '#1a0f0a',
      '--bg-elevated': '#2a1810',
      '--card': '#2a1810',
      '--text': '#ffedd5',
      '--muted': '#fdba74',
      '--border': 'rgba(251,146,60,.22)',
      '--green': '#f97316',
      '--green-soft': 'rgba(249,115,22,.16)',
      '--danger': '#ef4444',
      '--warn': '#fbbf24',
    },
  },
  {
    id: 'forest',
    label: 'Forest SA',
    desc: 'South African green — trust & finance',
    vars: {
      '--bg': '#0a1410',
      '--bg-elevated': '#102018',
      '--card': '#102018',
      '--text': '#ecfdf5',
      '--muted': '#6ee7b7',
      '--border': 'rgba(16,185,129,.22)',
      '--green': '#10b981',
      '--green-soft': 'rgba(16,185,129,.16)',
      '--danger': '#f87171',
      '--warn': '#fbbf24',
    },
  },
  {
    id: 'rose',
    label: 'Rose Glass',
    desc: 'Soft rose / glassmorphism — consumer apps',
    vars: {
      '--bg': '#1a0a12',
      '--bg-elevated': '#2a1220',
      '--card': '#2a1220',
      '--text': '#fce7f3',
      '--muted': '#f9a8d4',
      '--border': 'rgba(244,114,182,.22)',
      '--green': '#ec4899',
      '--green-soft': 'rgba(236,72,153,.16)',
      '--danger': '#f43f5e',
      '--warn': '#fbbf24',
    },
  },
  {
    id: 'slate',
    label: 'Slate Minimal',
    desc: 'Neutral grey — Notion / Slack clean',
    vars: {
      '--bg': '#0f1115',
      '--bg-elevated': '#181b22',
      '--card': '#181b22',
      '--text': '#e8eaed',
      '--muted': '#9aa0a6',
      '--border': 'rgba(154,160,166,.18)',
      '--green': '#8ab4f8',
      '--green-soft': 'rgba(138,180,248,.14)',
      '--danger': '#f28b82',
      '--warn': '#fdd663',
    },
  },
  {
    id: 'light',
    label: 'Daylight',
    desc: 'Clean light mode — enterprise default',
    vars: {
      '--bg': '#f4f6f9',
      '--bg-elevated': '#ffffff',
      '--card': '#ffffff',
      '--text': '#0f172a',
      '--muted': '#64748b',
      '--border': 'rgba(15,23,42,.1)',
      '--green': '#007A4D',
      '--green-soft': 'rgba(0,122,77,.1)',
      '--danger': '#dc2626',
      '--warn': '#d97706',
    },
  },
  {
    id: 'sand',
    label: 'Warm Sand',
    desc: 'Cream / khaki — premium offline-first',
    vars: {
      '--bg': '#f5f0e6',
      '--bg-elevated': '#fffaf0',
      '--card': '#fffaf0',
      '--text': '#3f2e1e',
      '--muted': '#8b7355',
      '--border': 'rgba(63,46,30,.12)',
      '--green': '#b45309',
      '--green-soft': 'rgba(180,83,9,.12)',
      '--danger': '#b91c1c',
      '--warn': '#ca8a04',
    },
  },
  {
    id: 'neon',
    label: 'Neon Cyber',
    desc: 'High-contrast neon — gaming / ops dashboards',
    vars: {
      '--bg': '#050508',
      '--bg-elevated': '#0c0c14',
      '--card': '#0c0c14',
      '--text': '#e2e8f0',
      '--muted': '#94a3b8',
      '--border': 'rgba(34,211,238,.25)',
      '--green': '#22d3ee',
      '--green-soft': 'rgba(34,211,238,.14)',
      '--danger': '#ff2d55',
      '--warn': '#facc15',
    },
  },
]

export function getTheme(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0]
}

export function applyTheme(id) {
  const theme = getTheme(id)
  const root = document.documentElement
  root.setAttribute('data-theme', theme.id)
  for (const [k, v] of Object.entries(theme.vars)) {
    root.style.setProperty(k, v)
  }
  if (theme.id === 'light' || theme.id === 'sand') {
    root.classList.remove('dark', 'brain')
  } else {
    root.classList.add('dark', 'brain')
  }
  try {
    localStorage.setItem('sa_global_theme', theme.id)
    localStorage.setItem('sa_theme', theme.id === 'light' || theme.id === 'sand' ? 'light' : 'brain')
  } catch {}
  window.dispatchEvent(new CustomEvent('sa-theme', { detail: theme }))
  return theme
}

export function loadSavedTheme() {
  try {
    const id = localStorage.getItem('sa_global_theme') || 'midnight'
    return applyTheme(id)
  } catch {
    return applyTheme('midnight')
  }
}
