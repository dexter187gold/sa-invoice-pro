import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { APP_VERSION } from '../config'
import CommandPalette from './CommandPalette'
import AppLogo from './AppLogo'
import AppAssistant, { toggleHelp } from './AppAssistant'
import NotificationBell from './NotificationBell'
import QuickActions from './QuickActions'

const sections = [
  {
    title: 'Workspace',
    links: [
      { to: '/', label: 'Home', end: true },
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/inbox', label: 'WhatsApp inbox' },
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
      { to: '/excel', label: 'Excel' },
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
      { to: '/sync', label: 'Sync health' },
      { to: '/changelog', label: 'Changelog' },
      { to: '/license', label: 'License' },
      { to: '/settings', label: 'Settings' },
    ],
  },
]

const crumbMap = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/inbox': 'WhatsApp inbox',
  '/invoices': 'Invoices',
  '/quotes': 'Quotes',
  '/clients': 'Clients',
  '/products': 'Products',
  '/tickets': 'Job cards',
  '/expenses': 'Expenses',
  '/payments': 'Payments',
  '/excel': 'Excel',
  '/employees': 'Employees',
  '/payroll': 'Payroll',
  '/accounting': 'Accounting',
  '/reports': 'Reports',
  '/documents': 'Documents',
  '/sync': 'Sync health',
  '/changelog': 'Changelog',
  '/license': 'License',
  '/settings': 'Settings',
}

function cycleTheme(theme, setTheme) {
  const next = theme === 'light' ? 'dark' : 'light'
  setTheme(next)
  try {
    const root = document.documentElement
    if (next === 'dark') {
      root.classList.add('dark', 'brain')
      localStorage.setItem('sa_theme', 'brain')
    } else {
      root.classList.remove('dark', 'brain')
      localStorage.setItem('sa_theme', 'light')
    }
  } catch {}
}

export default function Shell({ children }) {
  const { company, user, logout, theme, setTheme, online, density, setDensity } = useApp()
  const [open, setOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()

  useEffect(() => {
    try {
      const root = document.documentElement
      if (theme === 'dark' || theme === 'brain') {
        root.classList.add('dark', 'brain')
      } else {
        root.classList.remove('dark', 'brain')
      }
    } catch {}
  }, [theme])

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
        cycleTheme(theme, setTheme)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        toggleHelp()
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
      <QuickActions />
      <div className={`sidebar-backdrop ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <div className="mobile-bar">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(true)} aria-label="Open menu">Menu</button>
        <AppLogo size={28} />
        <strong style={{ fontSize: 13, letterSpacing: '-0.02em', flex: 1 }}>{company?.name || 'SA Invoice Pro'}</strong>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => toggleHelp()} aria-label="Help and tips" title="Help & tips (Ctrl+/)">✦</button>
        <NotificationBell />
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
              <div className="brain-ribbon" style={{ fontWeight: 600, fontSize: 10, marginTop: 3 }}>
                Lab v{APP_VERSION}
              </div>
              <div className="muted" style={{ fontWeight: 500, fontSize: 11, marginTop: 2 }}>
                {online ? 'Online' : 'Offline'} · sync ready
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
              >
                {density === 'compact' ? 'Compact' : 'Comfort'}
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => cycleTheme(theme, setTheme)}
                title="Toggle light / lab dark"
              >
                {theme === 'dark' || theme === 'brain' ? 'Light' : 'Lab'}
              </button>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>{user?.username || user?.email}</div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => { logout(); nav('/login') }}>
              Sign out
            </button>
          </div>
        </aside>
        <main className="main" id="main-content">
          <div className="breadcrumb" aria-label="Breadcrumb" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div>
              <span className="muted">Workspace</span>
              <span className="muted"> / </span>
              <strong>{crumb}</strong>
            </div>
            <div className="desktop-only header-actions" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => toggleHelp()} aria-label="Help and tips" title="Help & tips (Ctrl+/)">✦ Help</button>
              <NotificationBell />
            </div>
          </div>
          {children}
        </main>
      </div>
    </>
  )
}
