import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { APP_VERSION } from '../config'
import CommandPalette from './CommandPalette'
import AppLogo from './AppLogo'
import AppAssistant, { toggleHelp } from './AppAssistant'
import NotificationBell from './NotificationBell'
import QuickActions from './QuickActions'
import { Sync } from '../lib/sync'
import { canUseCloudSync } from '../lib/soloMode'

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

const ROOT_NAV = [
  { to: '/', label: 'Home', icon: '⌂', end: true, section: 'home' },
  { to: '/invoices', label: 'Money', icon: '📄', section: 'money' },
  { to: '/clients', label: 'Clients', icon: '👤', section: 'clients' },
  { to: '/tickets', label: 'Jobs', icon: '🎫', section: 'jobs' },
  { to: '__more__', label: 'More', icon: '☰', section: 'more', isMore: true },
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
    { to: '/excel', label: 'Excel', icon: '📊' },
    { to: '/sync', label: 'Sync', icon: '☁️' },
    { to: '/changelog', label: 'Notes', icon: '📋' },
    { to: '__root__', label: 'Main', icon: '☰', isRoot: true },
  ],
  settings: [
    { to: '/settings', label: 'Settings', icon: '⚙️', end: true },
    { to: '/license', label: 'License', icon: '🔑' },
    { to: '/sync', label: 'Cloud', icon: '☁️' },
    { to: '/changelog', label: 'Updates', icon: '✨' },
    { to: '__root__', label: 'Main', icon: '☰', isRoot: true },
  ],
}

function sectionFromPath(pathname) {
  const p = pathname || '/'
  if (p === '/' || p === '/dashboard' || p === '/reports' || p === '/inbox') return 'home'
  if (p.startsWith('/invoices') || p.startsWith('/quotes') || p.startsWith('/payments')) return 'money'
  if (p.startsWith('/clients')) return 'clients'
  if (p.startsWith('/tickets') || p.startsWith('/products')) return 'jobs'
  if (p.startsWith('/expenses') || p.startsWith('/accounting') || p.startsWith('/employees') || p.startsWith('/payroll')) return 'books'
  if (p.startsWith('/documents') || p.startsWith('/excel') || p.startsWith('/sync') || p.startsWith('/changelog')) return 'tools'
  if (p.startsWith('/settings') || p.startsWith('/license')) return 'settings'
  return 'home'
}

export default function Shell({ children }) {
  const { company, user, logout, theme, setTheme, online, density, setDensity, invoices, syncNow, toast } = useApp()
  const [open, setOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [forceRoot, setForceRoot] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  const [navPrefs, setNavPrefs] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem('sa_nav_prefs') || '{}')
      if (!p.layout) p.layout = 'bottom'
      return p
    } catch {
      return { layout: 'bottom' }
    }
  })

  const section = useMemo(() => sectionFromPath(loc.pathname), [loc.pathname])

  useEffect(() => {
    setForceRoot(false)
    setMoreOpen(false)
    setOpen(false)
  }, [loc.pathname, loc.search])

  useEffect(() => {
    const apply = (prefs) => {
      const root = document.documentElement
      root.classList.toggle('nav-compact', prefs.layout === 'compact')
      root.classList.toggle('nav-bottom', prefs.layout === 'bottom')
      if (prefs.accent) root.style.setProperty('--nav-accent', prefs.accent)
    }
    apply(navPrefs)
    try {
      localStorage.setItem('sa_nav_prefs', JSON.stringify(navPrefs))
    } catch {}
    const on = (e) => {
      const prefs = e.detail || {}
      setNavPrefs((prev) => {
        const next = { ...prev, ...prefs }
        apply(next)
        return next
      })
    }
    window.addEventListener('sa-nav-prefs', on)
    return () => window.removeEventListener('sa-nav-prefs', on)
  }, [navPrefs.layout, navPrefs.accent])

  const invCounts = useMemo(() => {
    const c = { all: 0, unpaid: 0, partial: 0, paid: 0, overdue: 0 }
    for (const i of invoices || []) {
      c.all++
      const s = i.status || 'unpaid'
      if (c[s] != null) c[s]++
    }
    return c
  }, [invoices])

  const sections = useMemo(
    () => [
      {
        title: 'Overview',
        links: [
          { to: '/', label: 'Home', end: true },
          { to: '/dashboard', label: 'Dashboard' },
          { to: '/reports', label: 'Reports' },
        ],
      },
      {
        title: 'Money in',
        links: [
          { to: '/invoices', label: 'All invoices', count: invCounts.all },
          { to: '/invoices?status=unpaid', label: 'Unpaid', count: invCounts.unpaid },
          { to: '/invoices?status=partial', label: 'Partial', count: invCounts.partial },
          { to: '/invoices?status=overdue', label: 'Overdue', count: invCounts.overdue },
          { to: '/invoices?status=paid', label: 'Paid', count: invCounts.paid },
          { to: '/quotes', label: 'Quotes' },
          { to: '/payments', label: 'Payments' },
          { to: '/clients', label: 'Clients' },
        ],
      },
      {
        title: 'Field work',
        links: [
          { to: '/tickets', label: 'Job cards' },
          { to: '/inbox', label: 'WhatsApp inbox' },
          { to: '/products', label: 'Products & services' },
        ],
      },
      {
        title: 'Money out & books',
        links: [
          { to: '/expenses', label: 'Expenses' },
          { to: '/accounting', label: 'Accounting' },
          { to: '/employees', label: 'Employees' },
          { to: '/payroll', label: 'Payroll' },
        ],
      },
      {
        title: 'Tools',
        links: [
          { to: '/documents', label: 'Documents' },
          { to: '/excel', label: 'Excel viewer' },
          { to: '/sync', label: 'Sync health' },
        ],
      },
      {
        title: 'Account',
        links: [
          { to: '/settings', label: 'Settings' },
          { to: '/changelog', label: 'Changelog' },
          { to: '/license', label: 'License' },
        ],
      },
    ],
    [invCounts],
  )

  const bottomItems = useMemo(() => {
    if (forceRoot) return ROOT_NAV
    return SECTION_NAV[section] || ROOT_NAV
  }, [section, forceRoot])

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
    '/changelog': 'Changelog',
    '/sync': 'Sync health',
    '/employees': 'Employees',
    '/payroll': 'Payroll',
    '/accounting': 'Accounting',
    '/reports': 'Reports',
    '/documents': 'Documents',
    '/license': 'License',
    '/settings': 'Settings',
  }

  useEffect(() => {
    try {
      const root = document.documentElement
      if (theme === 'dark' || theme === 'brain') root.classList.add('dark', 'brain')
      else root.classList.remove('dark', 'brain')
    } catch {}
  }, [theme])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        toggleHelp()
      }
      if (e.key === 'Escape') {
        setMoreOpen(false)
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const isInvLinkActive = (to) => {
    if (!loc.pathname.startsWith('/invoices')) return false
    const want = new URLSearchParams(to.split('?')[1] || '').get('status')
    const have = new URLSearchParams(loc.search).get('status')
    if (!want) return !have || have === 'all'
    return want === have
  }

  const isItemActive = (item) => {
    if (item.isMore || item.isRoot) return false
    if (item.to.includes('?')) return isInvLinkActive(item.to)
    const path = item.to.split('?')[0]
    if (item.end) return loc.pathname === path
    return loc.pathname === path || loc.pathname.startsWith(path + '/')
  }

  const runSync = async () => {
    if (!canUseCloudSync()) {
      toast?.('Cloud sync not available in this mode', 'info')
      return
    }
    setSyncing(true)
    try {
      if (typeof syncNow === 'function') await syncNow()
      else await Sync.pullAndPush?.()
      toast?.('Synced', 'success')
    } catch (e) {
      toast?.(e?.message || 'Sync failed', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const pathKey = Object.keys(crumbMap)
    .filter((k) => k !== '/' && loc.pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  const crumb = crumbMap[loc.pathname] || (pathKey ? crumbMap[pathKey] : loc.pathname)
  const useBottom = navPrefs.layout === 'bottom'

  const onBottomClick = (item, e) => {
    if (item.isMore) {
      e.preventDefault()
      setMoreOpen((v) => !v)
      return
    }
    if (item.isRoot) {
      e.preventDefault()
      setForceRoot(true)
      setMoreOpen(false)
      return
    }
    setMoreOpen(false)
  }

  const sectionTitle = {
    home: 'Overview',
    money: 'Money in',
    clients: 'Clients',
    jobs: 'Field work',
    books: 'Books',
    tools: 'Tools',
    settings: 'Account',
  }[section] || 'Menu'

  return (
    <>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <AppAssistant />
      <QuickActions />

      <div className="mobile-bar">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => (useBottom ? setMoreOpen(true) : setOpen(true))}
          aria-label="Open menu"
        >
          Menu
        </button>
        <AppLogo size={28} />
        <strong style={{ fontSize: 13, letterSpacing: '-0.02em', flex: 1 }}>
          {company?.name || 'SA Invoice Pro'}
        </strong>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => toggleHelp()} aria-label="Help">
          ✦
        </button>
        <NotificationBell />
        <span className={`status-dot ${online ? 'on' : 'off'}`} title={online ? 'Online' : 'Offline'} />
      </div>

      <div className={`shell ${useBottom ? 'shell-bottom' : ''}`}>
        <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
          <div className="brand">
            <AppLogo size={40} />
            <div style={{ minWidth: 0 }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {company?.name || 'SA Invoice Pro'}
              </div>
              <div className="brain-ribbon" style={{ fontWeight: 600, fontSize: 10, marginTop: 3 }}>
                v{APP_VERSION}
              </div>
              <div className="muted" style={{ fontWeight: 500, fontSize: 11, marginTop: 2 }}>
                {online ? 'Online' : 'Offline'} · cloud sync
              </div>
            </div>
          </div>
          <nav className="side-nav">
            {(navPrefs.sections === 'flat'
              ? [{ title: '', links: sections.flatMap((s) => s.links) }]
              : sections
            ).map((sec) => (
              <div key={sec.title || 'all'}>
                {sec.title ? <div className="nav-section">{sec.title}</div> : null}
                {sec.links.map((l) => {
                  const invStatus = l.to.startsWith('/invoices')
                  return (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      end={l.end}
                      className={({ isActive }) =>
                        `nav-link ${(invStatus ? isInvLinkActive(l.to) : isActive) ? 'active' : ''}`
                      }
                      onClick={() => setOpen(false)}
                    >
                      <span className="nav-label">{l.label}</span>
                      {l.count != null ? <span className="nav-count">{l.count}</span> : null}
                    </NavLink>
                  )
                })}
              </div>
            ))}
          </nav>
          <div className="sidebar-foot" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="muted" style={{ fontSize: 12 }}>
              {user?.email || user?.name || 'Signed in'}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => cycleTheme(theme, setTheme)}>
                Theme
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
              >
                {density === 'compact' ? 'Comfort' : 'Compact'}
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={runSync} disabled={syncing}>
                {syncing ? '…' : 'Sync'}
              </button>
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
          </div>
        </aside>

        <div className={`sidebar-backdrop ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />

        <main className="main" id="main-content">
          <div
            className="breadcrumb"
            aria-label="Breadcrumb"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
          >
            <div>
              <span className="muted">Workspace</span>
              <span className="muted"> / </span>
              <strong>{crumb}</strong>
              {useBottom && !forceRoot && section !== 'home' ? (
                <span className="muted" style={{ marginLeft: 8, fontSize: 11 }}>
                  · {sectionTitle}
                </span>
              ) : null}
            </div>
            <div className="desktop-only header-actions" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={runSync} disabled={syncing}>
                {syncing ? 'Syncing…' : 'Sync'}
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => toggleHelp()} title="Help">
                ✦ Help
              </button>
              <NotificationBell />
            </div>
          </div>
          {children}
        </main>
      </div>

      {useBottom ? (
        <>
          <nav className="bottom-nav" aria-label="Contextual navigation">
            {bottomItems.map((item) => {
              if (item.isMore || item.isRoot) {
                return (
                  <button
                    key={item.to + item.label}
                    type="button"
                    className={`bnav ${moreOpen && item.isMore ? 'on' : ''}`}
                    onClick={(e) => onBottomClick(item, e)}
                    aria-label={item.label}
                  >
                    <span className="ico" aria-hidden>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                )
              }
              return (
                <NavLink
                  key={item.to + item.label}
                  to={item.to}
                  end={item.end}
                  className={() => `bnav ${isItemActive(item) ? 'on' : ''}`}
                  onClick={(e) => onBottomClick(item, e)}
                >
                  <span className="ico" aria-hidden>
                    {item.icon}
                  </span>
                  {item.label}
                </NavLink>
              )
            })}
          </nav>

          <div
            className={`drawer-backdrop ${moreOpen ? 'show' : ''}`}
            onClick={() => setMoreOpen(false)}
            aria-hidden={!moreOpen}
          />
          <div className={`drawer ${moreOpen ? 'open' : ''}`} id="more-drawer" role="dialog" aria-label="More pages">
            <div className="drawer-handle" />
            <h3>All sections</h3>
            {sections.map((sec) => (
              <div key={sec.title} className="drawer-section">
                <div className="drawer-section-title">{sec.title}</div>
                {sec.links.map((l) => {
                  const invStatus = l.to.startsWith('/invoices')
                  return (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      end={l.end}
                      className={({ isActive }) =>
                        `drawer-link ${(invStatus ? isInvLinkActive(l.to) : isActive) ? 'on' : ''}`
                      }
                      onClick={() => setMoreOpen(false)}
                    >
                      <span>{l.label}</span>
                      {l.count != null ? <span className="nav-count">{l.count}</span> : null}
                    </NavLink>
                  )
                })}
              </div>
            ))}
            <div className="drawer-section">
              <div className="drawer-section-title">Session</div>
              <button
                type="button"
                className="drawer-link"
                onClick={() => {
                  setMoreOpen(false)
                  cycleTheme(theme, setTheme)
                }}
              >
                Toggle theme
              </button>
              <button
                type="button"
                className="drawer-link"
                onClick={() => {
                  setMoreOpen(false)
                  runSync()
                }}
              >
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
              <button
                type="button"
                className="drawer-link danger"
                onClick={() => {
                  setMoreOpen(false)
                  logout()
                  nav('/login')
                }}
              >
                Sign out
              </button>
            </div>
            <p className="muted" style={{ fontSize: 11, margin: '8px 12px 0' }}>
              v{APP_VERSION} · Bottom bar follows the page you are on
            </p>
          </div>
        </>
      ) : null}
    </>
  )
}
