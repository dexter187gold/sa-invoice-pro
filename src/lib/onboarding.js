const KEY = 'sa_onboarding_v1'

export const STEPS = [
  { id: 'company', label: 'Add company name & banking', path: '/settings' },
  { id: 'cloud', label: 'Sign in to cloud (multi-device)', path: '/settings' },
  { id: 'client', label: 'Add first client', path: '/clients' },
  { id: 'catalog', label: 'Install IT service pack', path: '/products' },
  { id: 'invoice', label: 'Create first tax invoice', path: '/invoices/new' },
  { id: 'job', label: 'Log a job card', path: '/tickets' },
  { id: 'portal', label: 'Send a client portal link', path: '/clients' },
  { id: 'theme', label: 'Pick a theme you like', path: '/settings' },
]

export function loadOnboarding() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

export function saveOnboarding(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {}
}

export function toggleStep(id) {
  const s = loadOnboarding()
  s[id] = !s[id]
  saveOnboarding(s)
  return s
}

export function progress() {
  const s = loadOnboarding()
  const done = STEPS.filter((x) => s[x.id]).length
  return { done, total: STEPS.length, pct: Math.round((done / STEPS.length) * 100) }
}
