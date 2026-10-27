const ROOT_NAV = [
  { to: '/', label: 'Home', icon: '⌂', end: true, section: 'home' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊', section: 'home' },
  { to: '/invoices', label: 'Invoices', icon: '📄', section: 'money' },
  { to: '/clients', label: 'Clients', icon: '👤', section: 'clients' },
  { to: '/tickets', label: 'Jobs', icon: '🎫', section: 'jobs' },
  { to: '/quotes', label: 'Quotes', icon: '📝', section: 'money' },
  { to: '/payments', label: 'Payments', icon: '💳', section: 'money' },
  { to: '/expenses', label: 'Expenses', icon: '💸', section: 'books' },
  { to: '/reports', label: 'Reports', icon: '📈', section: 'home' },
  { to: '/products', label: 'Products', icon: '📦', section: 'jobs' },
  { to: '/inbox', label: 'Inbox', icon: '💬', section: 'home' },
  { to: '/accounting', label: 'Books', icon: '📒', section: 'books' },
  { to: '/settings', label: 'Settings', icon: '⚙️', section: 'settings' },
]

const SECTION_NAV = {
  home: [
    { to: '/', label: 'Home', icon: '⌂', end: true },
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/reports', label: 'Reports', icon: '📈' },
    { to: '/inbox', label: 'Inbox', icon: '💬' },
    { to: '__root__', label: 'Main', icon: '☰', isRoot: true },
  ],
  money: [
    { to: '/invoices', label: 'Invoices', icon: '📄', end: true },
    { to: '/invoices?status=overdue', label: 'Overdue', icon: '⚠️' },
    { to: '/payments', label: 'Payments', icon: '💳' },
    { to: '/quotes', label: 'Quotes', icon: '📝' },
    { to: '/tickets', label: 'Jobs', icon: '🎫' },
  ],
  clients: [
    { to: '/clients', label: 'Clients', icon: '👤', end: true },
    { to: '/invoices', label: 'Invoices', icon: '📄' },
    { to: '/tickets', label: 'Jobs', icon: '🎫' },
    { to: '/inbox', label: 'WhatsApp', icon: '💬' },
    { to: '__root__', label: 'Main', icon: '☰', isRoot: true },
  ],
  jobs: [
    { to: '/tickets', label: 'Board', icon: '🎫', end: true },
    { to: '/inbox', label: 'Inbox', icon: '💬' },
    { to: '/products', label: 'Stock', icon: '📦' },
    { to: '/invoices', label: 'Bill', icon: '📄' },
    { to: '__root__', label: 'Main', icon: '☰', isRoot: true },
  ],
  books: [
    { to: '/expenses', label: 'Expenses', icon: '💸', end: true },
    { to: '/accounting', label: 'Books', icon: '📒' },
    { to: '/employees', label: 'Staff', icon: '👷' },
    { to: '/payroll', label: 'Payroll', icon: '💰' },
    { to: '__root__', label: 'Main', icon: '☰', isRoot: true },
  ],
  tools: [
    { to: '/documents', label: 'Docs', icon: '📎', end: true },
    { to: '/bank', label: 'Bank', icon: '🏦' },
    { to: '/excel', label: 'Excel', icon: '📊' },
    { to: '/sync', label: 'Sync', icon: '☁️' },
    { to: '__root__', label: 'Main', icon: '☰', isRoot: true },
  ],
  settings: [
    { to: '/settings', label: 'Settings', icon: '⚙️', end: true },
    { to: '/team', label: 'Team', icon: '👥' },
    { to: '/branches', label: 'Branches', icon: '🏬' },
    { to: '/license', label: 'License', icon: '🔑' },
    { to: '__root__', label: 'Main', icon: '☰', isRoot: true },
  ],
}

function sectionFromPath(pathname) {
  const p = pathname || '/'
  if (p === '/' || p === '/dashboard' || p === '/reports' || p === '/inbox') return 'home'
  if (p.startsWith('/invoices') || p.startsWith('/quotes') || p.startsWith('/payments') || p.startsWith('/bank')) return 'money'
  if (p.startsWith('/clients')) return 'clients'
  if (p.startsWith('/tickets') || p.startsWith('/products')) return 'jobs'
  if (p.startsWith('/expenses') || p.startsWith('/accounting') || p.startsWith('/employees') || p.startsWith('/payroll')) return 'books'
  if (p.startsWith('/documents') || p.startsWith('/excel') || p.startsWith('/sync') || p.startsWith('/changelog')) return 'tools'
  if (p.startsWith('/settings') || p.startsWith('/license') || p.startsWith('/team') || p.startsWith('/branches')) return 'settings'
  return 'home'
}

export { ROOT_NAV, SECTION_NAV, sectionFromPath }
