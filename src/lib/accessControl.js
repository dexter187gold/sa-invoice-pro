import { featurePlanGroup, normalizePlanId } from './licenseTiers.js'
import { getLicenseStatus } from './license.js'

const BASIC_PATHS = new Set([
  '/', '/dashboard', '/clients', '/invoices', '/quotes', '/tickets',
  '/products', '/payments', '/license', '/support', '/about', '/settings', '/content-studio',
])

const TRIAL_PATHS = new Set(['/clients', '/invoices', '/quotes', '/content-studio'])

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
  const raw = status?.meta?.plan || status?.meta?.planId || status?.meta?.planName || status?.meta?.tier || status?.plan || status?.planId || status?.licensePlan || ''
  return featurePlanGroup(raw) || normalizePlanId(raw) || ''
}

export function canAccessPath(pathname, status, isOwner = false) {
  let path = String(pathname || '/').split('?')[0]
  if (path.startsWith('/invoices/')) path = '/invoices'
  if (path.startsWith('/tickets')) path = '/tickets'
  if (path.startsWith('/portal/')) path = '/portal'
  if (OWNER_ONLY.has(path)) return !!isOwner
  // Content Studio is a general document-authoring tool for signed-in workspaces, not a paid-plan feature.
  if (path === '/content-studio') return true

  if (status?.licensed) {
    if (path === '/license' || path === '/support' || path === '/about' || path === '/settings') return true
    if (path === '/portal-admin') {
      const plan = normalizedPlan(status)
      return plan === 'multi' || isOwner
    }
    const plan = normalizedPlan(status)
    const allowed = PLAN_FEATURES[plan] || BASIC_PATHS
    return allowed.has(path)
  }

  if (path === '/license' || path === '/settings') return true
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
    '/documents': 'Business document library', '/content-studio': 'Document & content studio', '/tickets': 'Job cards',
    '/products': 'Products and services', '/payments': 'Payment management',
    '/dashboard': 'Dashboard', '/settings': 'Settings',
  }
  return labels[path] || 'This feature'
}
