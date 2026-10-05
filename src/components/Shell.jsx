
import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { APP_VERSION } from '../config'

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
      { to: '/tickets', label: 'Tickets' },
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

export default function Shell({ children }) {
  const { company, user, logout, theme, setTheme, online } = useApp()
  const [open, setOpen] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        const el = document.querySelector('.search-input')
        if (el) el.focus()
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        nav('/invoices/new')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav])

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className={`sidebar-backdrop ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <div className="mobile-bar">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(true)} aria-label="Open menu">
          Menu
        </button>
        <strong>{company?.name || 'SA Invoice Pro'}</strong>
        <span className={`status-dot ${online ? 'on' : 'off'}`} title={online ? 'Online' : 'Offline'} />
      </div>
      <div className="shell">
        <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
          <div className="brand">
            <div className="logo-mark" style={{ width: 36, height: 36, fontSize: 12 }}>
              SA
            </div>
            <div>
              <div>{company?.name || 'SA Invoice Pro'}</div>
              <div className="muted" style={{ fontWeight: 500, fontSize: 12 }}>
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
          <div style={{ marginTop: 'auto', padding: '.75rem .5rem', display: 'grid', gap: '.5rem' }}>
            <div className="muted" style={{ fontSize: 11 }}>
              Shortcuts: Ctrl+N new invoice · Ctrl+K search
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <div className="muted" style={{ fontSize: 12 }}>
              {user?.username || user?.email}
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                logout()
                nav('/login')
              }}
            >
              Sign out
            </button>
          </div>
        </aside>
        <main className="main" id="main-content">
          {children}
        </main>
      </div>
    </>
  )
}
