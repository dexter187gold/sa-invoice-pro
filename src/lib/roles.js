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
    id: 'front_desk',
    label: 'Front desk',
    description: 'Clients, jobs, quotes — limited money',
    permissions: ['clients', 'tickets', 'quotes', 'invoices.create', 'payments.view'],
  },
  {
    id: 'tech',
    label: 'Technician',
    description: 'Jobs & job photos · bill own work',
    permissions: ['tickets', 'invoices.create', 'products.view', 'clients.view'],
  },
]

export function roleById(id) {
  return ROLES.find((r) => r.id === id) || ROLES[0]
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
