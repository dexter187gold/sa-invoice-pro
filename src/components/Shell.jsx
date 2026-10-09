import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { APP_VERSION } from '../config'
import CommandPalette from './CommandPalette'
import AppLogo from './AppLogo'
import AppAssistant from './AppAssistant'

const sections = [
  {
    title: 'Workspace',
    links: [
      { to: '/', label: 'Home', end: true },
      { to: '/dashboard', label: 'Dashboard' },
    ],
  },
  {
    title: 'Sales',
    links: [
      { to: '/invoices', label: 'Invoices' },
      { to: '/quotes', label: 'Quotes' },
      { to: '/clients', label: 'Clients' },
      { to: '/products', label: 'Products & services' },
    ],
  },
  {
    title: 'Operations',
    links: [
      { to: '/tickets', label: 'Job cards' },
      { to: '/expenses', label: 'Expenses' },
      { to: '/payments', label: 'Payments' },
      { to: '/employees', label: 'Employees' },
      { to: '/payroll', label: 'Payroll' },
    ],
  },
  {
    title: 'Finance & docs',
    links: [
      { to: '/accounting', label: 'Accounting' },
      { to: '/reports', label: 'Reports' },
      { to: '/documents', label: 'Documents' },
    ],
  },
  {
    title: 'System',
    links: [
      { to: '/license', label: 'License' },
      { to: '/settings', label: 'Settings' },
    ],
  },
]

const crumbMap = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/invoices': 'Invoices',
  '/quotes': 'Quotes',
  '/clients': 'Clients',
  '/products': 'Products',
  '/tickets': 'Job cards',
  '/expenses': 'Expenses',
  '/payments': 'Payments',
  '/employees': 'Employees',
  '/payroll': 'Payroll',
  '/accounting': 'Accounting',
  '/reports': 'Reports',
  '/documents': 'Documents',
  '/license': 'License',
  '/settings': 'Settings',
}

export default function Shell({ children }) {
  const { company, user, logout, theme, setTheme, online, density, setDensity } = useApp()
  const [open, setOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        nav('/invoices/new')
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        setTheme(theme === 'dark' ? 'light' : 'dark')
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        document.querySelector('.app-assist-fab')?.click()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav, theme, setTheme])

  const path = loc.pathname
  const crumb =
    crumbMap[path] ||
    (path.startsWith('/invoices/') ? 'Invoice' : path.split('/').filter(Boolean).pop() || 'Home')

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <AppAssistant />
      <div className={`sidebar-backdrop ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <div className="mobile-bar">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(true)} aria-label="Open menu">Menu</button>
        <AppLogo size={28} />
        <strong style={{ fontSize: 13, letterSpacing: '-0.02em' }}>{company?.name || 'SA Invoice Pro'}</strong>
        <span className={`status-dot ${online ? 'on' : 'off'}`} title={online ? 'Online' : 'Offline'} />
      </div>
      <div className="shell">
        <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
          <div className="brand">
            <AppLogo size={40} />
            <div style={{ minWidth: 0 }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {company?.name || 'SA Invoice Pro'}
              </div>
              <div className="muted" style={{ fontWeight: 500, fontSize: 11.5, marginTop: 2 }}>
                v{APP_VERSION} · {online ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>
          <nav className="side-nav">
            {sections.map((sec) => (
              <div key={sec.title}>
                <div className="nav-section">{sec.title}</div>
                {sec.links.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.end}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
          <div style={{
            marginTop: 'auto',
            padding: '0.85rem 0.55rem 0.35rem',
            display: 'grid',
            gap: '0.45rem',
            borderTop: '1px solid var(--border)',
          }}>
            <div className="muted" style={{ fontSize: 11, lineHeight: 1.4 }}>
              <kbd className="kbd">Ctrl+K</kbd> search · <kbd className="kbd">Ctrl+/</kbd> help
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setPaletteOpen(true)}>
              Search…
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
                title="Toggle density"
              >
                {density === 'compact' ? 'Compact' : 'Comfort'}
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title="Toggle theme"
              >
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>
            <div className="muted" style={{
              fontSize: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '0.15rem 0',
            }}>
              {user?.username || user?.email}
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => { logout(); nav('/login') }}
            >
              Sign out
            </button>
          </div>
        </aside>
        <main className="main" id="main-content">
          <div className="breadcrumb" aria-label="Breadcrumb">
            <span className="muted">Workspace</span>
            <span className="muted">/</span>
            <strong>{crumb}</strong>
          </div>
          {children}
        </main>
      </div>
    </>
  )
}
