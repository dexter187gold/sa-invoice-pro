import { can } from './roles'
import { getActiveSeat } from './seats'

export async function currentRoleId() {
  try {
    const seat = await getActiveSeat()
    if (seat?.role) return seat.role
  } catch {}
  return 'owner'
}

export async function currentCan(perm) {
  const role = await currentRoleId()
  return can(role, perm)
}

export const ROUTE_PERMS = {
  '/invoices': 'invoices',
  '/quotes': 'quotes',
  '/clients': 'clients',
  '/tickets': 'tickets',
  '/products': 'products',
  '/payments': 'payments',
  '/reports': 'reports',
  '/settings': 'settings',
  '/documents': 'documents',
  '/employees': 'employees',
  '/expenses': 'expenses',
  '/license': 'settings',
  '/team': 'settings',
  '/webhooks': 'settings',
  '/bank': 'payments',
  '/branches': 'settings',
  '/sms': 'settings',
  '/accounting': 'reports',
  '/payroll': 'employees',
}

export function permForPath(pathname) {
  const p = String(pathname || '')
  for (const [prefix, perm] of Object.entries(ROUTE_PERMS)) {
    if (p === prefix || p.startsWith(prefix + '/')) return perm
  }
  return null
}
