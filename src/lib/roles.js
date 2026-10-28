/** Role definitions + permission checks for multi-seat desks. */

export const ROLES = [
  {
    id: 'owner',
    label: 'Owner',
    description: 'Full access · billing · license · delete',
    permissions: ['*'],
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Settings, clients, money, jobs — no license sell',
    permissions: [
      'invoices', 'quotes', 'clients', 'tickets', 'products', 'payments',
      'reports', 'settings', 'documents', 'employees', 'expenses',
    ],
  },
  {
    id: 'manager',
    label: 'Manager',
    description: 'Desk + money + reports · no team/license settings',
    permissions: [
      'invoices', 'quotes', 'clients', 'tickets', 'products', 'payments',
      'reports', 'documents', 'expenses',
    ],
  },
  {
    id: 'front_desk',
    label: 'Front desk',
    description: 'Clients, jobs, quotes — limited money',
    permissions: ['clients', 'tickets', 'quotes', 'invoices', 'payments'],
  },
  {
    id: 'helpdesk',
    label: 'Helpdesk',
    description: 'Support queue, customer communication and job triage',
    permissions: ['tickets', 'clients', 'quotes', 'invoices'],
  },
  {
    id: 'tech',
    label: 'Technician',
    description: 'Jobs & job photos · bill own work',
    permissions: ['tickets', 'invoices', 'products', 'clients'],
  },
  {
    id: 'accountant',
    label: 'Accountant',
    description: 'Payments, reports, expenses · read clients/invoices',
    permissions: ['payments', 'reports', 'expenses', 'invoices', 'clients', 'accounting'],
  },
  {
    id: 'viewer',
    label: 'Viewer',
    description: 'Read-only dashboard-style access',
    permissions: ['clients', 'tickets', 'invoices', 'quotes', 'reports'],
  },
]

export function roleById(id) {
  // Unknown server-supplied roles must fail closed, never inherit owner access.
  return ROLES.find((r) => r.id === id) || ROLES.find((r) => r.id === 'viewer')
}

export function can(roleId, perm) {
  const role = roleById(roleId)
  if (!role) return false
  if (role.permissions.includes('*')) return true
  if (role.permissions.includes(perm)) return true
  const base = String(perm).split('.')[0]
  if (role.permissions.includes(base)) return true
  return false
}

/** Human list for Team page / docs. */
export function rolesForUi() {
  return ROLES.map(({ id, label, description }) => ({ id, label, description }))
}
