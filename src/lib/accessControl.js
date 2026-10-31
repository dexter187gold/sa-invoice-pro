import { getLicenseStatus } from './license.js'

const BASIC_PATHS = new Set([
  '/', '/dashboard', '/clients', '/invoices', '/quotes', '/tickets',
  '/products', '/payments', '/license', '/support', '/about', '/settings',
])

// A trial is deliberately a small, usable introduction to the core workflow.
// Keep this list narrow: trial accounts can manage clients, invoices and quotes only.
const TRIAL_PATHS = new Set(['/clients', '/invoices', '/quotes'])

const PLAN_FEATURES = {
  solo: new Set([
    ...BASIC_PATHS, '/inbox', '/documents', '/portal',
  ]),
  shop: new Set([
    ...BASIC_PATHS, '/inbox', '/wa-chase', '/documents', '/portal',
    '/expenses', '/petty-cash', '/accounting', '/reports', '/employees',
    '/payroll', '/recurring', '/bank', '/excel', '/sync', '/team',
    '/wa-templates', '/sms',
  ]),
  multi: new Set([
    ...BASIC_PATHS, '/inbox', '/wa-chase', '/documents', '/portal',
    '/expenses', '/petty-cash', '/accounting', '/reports', '/employees',
    '/payroll', '/recurring', '/bank', '/excel', '/sync', '/team',
    '/wa-templates', '/sms', '/branches', '/webhooks', '/portal-admin',
  ]),
}

const OWNER_ONLY = new Set(['/owner-console', '/owner-recovery', '/dev-portal'])

export function normalizedPlan(status) {
  const raw = String(status?.meta?.plan || status?.meta?.planId || '').toLowerCase()
  if (raw.includes('multi') || raw === 'm') return 'multi'
  if (raw.includes('shop') || raw === 'p') return 'shop'
  if (raw.includes('solo') || raw === 's' || raw === 'standard') return 'solo'
  return ''
}

export function canAccessPath(pathname, status, isOwner = false) {
  let path = String(pathname || '/').split('?')[0]
  if (path.startsWith('/invoices/')) path = '/invoices'
  if (path.startsWith('/portal/')) path = '/portal'
  if (OWNER_ONLY.has(path)) return !!isOwner

  if (status?.licensed) {
    if (path === '/license' || path === '/support' || path === '/about' || path === '/settings') return true
    const plan = normalizedPlan(status)
    const allowed = PLAN_FEATURES[plan] || BASIC_PATHS
    return allowed.has(path)
  }

  // Keep licence checkout reachable so a trial user can upgrade, but expose
  // no other modules beyond the three trial workflow areas.
  if (path === '/license') return true
  return TRIAL_PATHS.has(path) && Number(status?.trialDaysLeft || 0) > 0
}

export async function readAccessStatus() {
  try { return await getLicenseStatus() }
  catch { return { licensed: false, trialDaysLeft: 0, meta: null } }
}

export function pathFeatureLabel(pathname) {
  const path = String(pathname || '').split('?')[0]
  const labels = {
    '/expenses': 'Expense management', '/petty-cash': 'Petty cash',
    '/accounting': 'Accounting', '/reports': 'Advanced reports',
    '/employees': 'Staff management', '/payroll': 'Payroll',
    '/recurring': 'Recurring invoices', '/bank': 'Bank statement import',
    '/excel': 'Spreadsheet tools', '/branches': 'Multi-branch management',
    '/webhooks': 'API and webhooks', '/portal-admin': 'Client portal administration',
    '/sms': 'SMS gateway', '/wa-templates': 'WhatsApp templates',
    '/team': 'Team and seat management', '/sync': 'Advanced sync tools',
    '/inbox': 'Team inbox', '/wa-chase': 'WhatsApp automation',
    '/documents': 'Business document library', '/tickets': 'Job cards',
    '/products': 'Products and services', '/payments': 'Payment management',
    '/dashboard': 'Dashboard', '/settings': 'Settings',
  }
  return labels[path] || 'This feature'
}
