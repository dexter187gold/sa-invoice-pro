const ROOT_NAV = [
  { to: '/', label: 'Home', icon: '⌂', end: true, section: 'home' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊', section: 'home' },
  { to: '/invoices', label: 'Invoices', icon: '📄', section: 'money' },
  { to: '/clients', label: 'Clients', icon: '👤', section: 'clients' },
  { to: '/tickets', label: 'Job cards', icon: '🎫', section: 'jobs' },
  { to: '/tickets/bill', label: 'Bill jobs', icon: '🧾', section: 'jobs' },
  { to: '/quotes', label: 'Quotes', icon: '📝', section: 'money' },
  { to: '/payments', label: 'Payments', icon: '💳', section: 'money' },
  { to: '/wa-chase', label: 'WhatsApp follow-ups', icon: '📲', section: 'money' },
  { to: '/expenses', label: 'Expenses', icon: '💸', section: 'books' },
  { to: '/reports', label: 'Reports', icon: '📈', section: 'home' },
  { to: '/products', label: 'Products', icon: '📦', section: 'jobs' },
  { to: '/documents', label: 'Documents', icon: '📁', section: 'tools' },
  { to: '/inbox', label: 'Messages', icon: '💬', section: 'home' },
  { to: '/accounting', label: 'Accounting', icon: '📒', section: 'books' },
  { to: '/settings', label: 'Settings', icon: '⚙️', section: 'settings' },
  { to: '/owner-console', label: 'Owner console', icon: '🛡️', section: 'settings' },
  { to: '/portal-admin', label: 'Client portal administration', icon: '👥', section: 'settings' },
  { to: '/license', label: 'License & plans', icon: '🔑', section: 'settings' },
  { to: '/support', label: 'Help & support', icon: '🛟', section: 'settings' },
  { to: '/about', label: 'About SA Invoice Pro', icon: 'ⓘ', section: 'settings' },
]

const SECTION_NAV = {
  home: [
    { to: '/', label: 'Home', icon: '⌂', end: true },
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/reports', label: 'Reports', icon: '📈' },
    { to: '/documents', label: 'Documents', icon: '📁' },
    { to: '/inbox', label: 'Messages', icon: '💬' },
    { to: '__root__', label: 'Main', icon: '☰', isRoot: true },
  ],
  money: [
    { to: '/invoices', label: 'Invoices', icon: '📄', end: true },
    { to: '/invoices?status=overdue', label: 'Overdue', icon: '⚠️' },
    { to: '/payments', label: 'Payments', icon: '💳' },
    { to: '/wa-chase', label: 'WhatsApp follow-ups', icon: '📲' },
    { to: '/quotes', label: 'Quotes', icon: '📝' },
    { to: '/tickets', label: 'Job cards', icon: '🎫' },
    { to: '/tickets/bill', label: 'Bill jobs', icon: '🧾' },
  ],
  clients: [
    { to: '/clients', label: 'Clients', icon: '👤', end: true },
    { to: '/inbox', label: 'Messages', icon: '💬' },
    { to: '/quotes', label: 'Quotes', icon: '📝' },
  ],
  jobs: [
    { to: '/tickets', label: 'Job cards', icon: '🎫', end: true },
    { to: '/tickets/bill', label: 'Bill jobs', icon: '🧾' },
    { to: '/products', label: 'Products', icon: '📦' },
  ],
  books: [
    { to: '/accounting', label: 'Accounting', icon: '📒', end: true },
    { to: '/expenses', label: 'Expenses', icon: '💸' },
    { to: '/reports', label: 'Reports', icon: '📈' },
  ],
  settings: [
    { to: '/settings', label: 'Settings', icon: '⚙️', end: true },
    { to: '/license', label: 'License', icon: '🔑' },
    { to: '/support', label: 'Help', icon: '🛟' },
    { to: '/about', label: 'About', icon: 'ⓘ' },
  ],
  tools: [
    { to: '/documents', label: 'Documents', icon: '📁', end: true },
  ],
}

function sectionFromPath(pathname) {
  const p = String(pathname || '/')
  if (p.startsWith('/tickets')) return 'jobs'
  if (p.startsWith('/invoices') || p.startsWith('/quotes') || p.startsWith('/payments') || p.startsWith('/wa-chase')) return 'money'
  if (p.startsWith('/clients')) return 'clients'
  if (p.startsWith('/accounting') || p.startsWith('/expenses') || p.startsWith('/petty') || p.startsWith('/payroll') || p.startsWith('/employees') || p.startsWith('/bank')) return 'books'
  if (p.startsWith('/settings') || p.startsWith('/license') || p.startsWith('/support') || p.startsWith('/about') || p.startsWith('/owner')) return 'settings'
  if (p.startsWith('/products')) return 'jobs'
  if (p.startsWith('/documents')) return 'tools'
  return 'home'
}

export { ROOT_NAV, SECTION_NAV, sectionFromPath }
