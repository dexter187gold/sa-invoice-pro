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
import ActiveSeatChip from './ActiveSeatChip'
import { displayAppName } from '../lib/whiteLabel'
import { ROOT_NAV, SECTION_NAV, sectionFromPath } from './shellNav.js'

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
  const { company, user, logout, theme, setTheme, online, density, setDensity, invoices, syncNow, toast } = useApp()
  const [open, setOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [assistantBusy, setAssistantBusy] = useState(false)
  const [syncPhase, setSyncPhase] = useState(() => document.documentElement.dataset.saipSyncState || (navigator.onLine ? 'idle' : 'offline'))
  const ledPhase = assistantBusy ? 'busy' : syncPhase
  const [moreOpen, setMoreOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [forceRoot, setForceRoot] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  const brandLabel = company?.name || displayAppName('SA Invoice Pro')
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
    setCommandOpen(false)
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
          { to: '/bank', label: 'Bank import' },
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
          { to: '/support', label: 'Help & support' },
          { to: '/roadmap', label: 'P1–P20 roadmap' },
        ],
      },
      {
        title: 'Account',
        links: [
          { to: '/settings', label: 'Settings' },
          { to: '/team', label: 'Team & seats' },
          { to: '/branches', label: 'Branches' },
          { to: '/license', label: 'License' },
          { to: '/changelog', label: 'Changelog' },
        ],
      },
    ],
    [invCounts],
  )

  const runSync = async () => {
    if (!canUseCloudSync()) {
      toast?.('Cloud sync not available in this mode', 'info')
      return
    }
    setSyncing(true)
    setSyncPhase('syncing')
    const busyTimer = window.setTimeout(() => setSyncPhase('busy'), 650)
    try {
      const result = typeof syncNow === 'function' ? await syncNow() : await Sync?.pullAndMerge?.()
      setSyncPhase(result?.ok === false ? 'error' : 'synced')
      if (result?.ok === false) toast?.(result.message || 'Sync needs attention. Open Sync Health for details.', 'error')
    } catch (e) {
      setSyncPhase('error')
      toast?.(e?.message || 'Sync failed', 'error')
    } finally {
      window.clearTimeout(busyTimer)
      setSyncing(false)
    }
  }

  useEffect(() => {
    const onState = (e) => setSyncPhase(e.detail || 'idle')
    const onOnline = () => setSyncPhase('idle')
    const onOffline = () => setSyncPhase('offline')
    const onAssistantActivity = (e) => setAssistantBusy(Boolean(e.detail))
    window.addEventListener('saip-sync-state', onState)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('saip-ai-activity', onAssistantActivity)
    return () => {
      window.removeEventListener('saip-sync-state', onState)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('saip-ai-activity', onAssistantActivity)
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === '/') {
        e.preventDefault()
        toggleHelp()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const crumb = useMemo(() => {
    const p = loc.pathname || '/'
    if (p === '/') return 'Home'
    const bit = p.split('/').filter(Boolean)[0] || 'Home'
    return bit.charAt(0).toUpperCase() + bit.slice(1)
  }, [loc.pathname])

  const bottomItems = useMemo(() => {
    if (forceRoot) return ROOT_NAV
    const sec = SECTION_NAV[section] || ROOT_NAV
    return sec
  }, [section, forceRoot])

  const isInvLinkActive = (to) => {
    if (!to.startsWith('/invoices')) return false
    const u = new URL(to, 'http://local')
    const want = u.searchParams.get('status')
    const have = new URLSearchParams(loc.search).get('status')
    if (loc.pathname.startsWith('/invoices')) {
      if (!want) return !have
      return want === have
    }
    return false
  }

  const isItemActive = (item) => {
    if (item.isMore || item.isRoot) return false
    if (item.to?.startsWith('/invoices')) return isInvLinkActive(item.to)
    if (item.end) return loc.pathname === item.to
    return loc.pathname === item.to || loc.pathname.startsWith(item.to + '/')
  }

  const onBottomClick = (item, e) => {
    if (item.isMore) {
      e.preventDefault()
      setCommandOpen((v) => !v)
      setMoreOpen(false)
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

  const useBottom = navPrefs.layout === 'bottom'

  return (
    <>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <AppAssistant />
      <QuickActions open={commandOpen} onOpenChange={setCommandOpen} hideTrigger={true} />

      <div className="mobile-bar">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => {
            if (useBottom) setMoreOpen(true)
            else setOpen(true)
          }}
          aria-label="Open menu"
        >
          Menu
        </button>
        <AppLogo size={28} />
        <strong style={{ fontSize: 13, letterSpacing: '-0.02em', flex: 1 }}>{brandLabel}</strong>
        <div className="mobile-top-tools" aria-label="Workspace controls">
          <ActiveSeatChip compact />
          <button
            type="button"
            className={'live-leds mobile-sync-indicator phase-' + ledPhase}
            onClick={runSync}
            disabled={syncing}
            aria-label={syncing ? 'Syncing now' : 'Tap three dots to sync'}
            title={syncing ? 'Syncing…' : 'Sync now'}
          >
            <span /><span /><span />
          </button>
        </div>
        <NotificationBell />
        <span className={`status-dot ${online ? 'on' : 'off'}`} title={online ? 'Online' : 'Offline'} />
      </div>

      <div className={`shell ${useBottom ? 'shell-bottom' : ''}`}>
        <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
          <div className="brand">
            <AppLogo size={40} />
            <div style={{ minWidth: 0 }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brandLabel}</div>
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
          <div className="sidebar-foot" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ActiveSeatChip />
            <button type="button" className="btn btn-outline btn-sm" onClick={runSync} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => cycleTheme(theme, setTheme)}>
              Theme
            </button>
            {user ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  logout?.()
                  nav('/login')
                }}
              >
                Sign out
              </button>
            ) : null}
          </div>
        </aside>

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
              <span className="live-activity-brand">PC Repair Dex</span>
              <div className={'live-leds phase-' + ledPhase} role="status" aria-label={assistantBusy ? 'AI assistant working' : 'Sync status: ' + syncPhase} title={assistantBusy ? 'AI assistant working' : 'Sync status: ' + syncPhase}><span /><span /><span /></div>
              <ActiveSeatChip compact />
              <button type="button" className="btn btn-outline btn-sm" onClick={runSync} disabled={syncing}>
                {syncing ? 'Syncing…' : 'Sync'}
              </button>
            </div>
          </div>
          {children}
        </main>
      </div>

      {useBottom ? (
        <>
          <nav className="bottom-nav" aria-label={forceRoot ? 'Main navigation shortcuts' : 'Contextual navigation'}>
            <div className="bottom-nav-scroll" aria-label="Swipe horizontally for more navigation items">
              {bottomItems.filter((item) => !item.isRoot && !item.isMore).map((item) => (
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
              ))}
            </div>
            <button
              type="button"
              className={`bnav bottom-nav-fixed ${commandOpen ? 'on' : ''}`}
              onClick={() => { setCommandOpen((v) => !v); setMoreOpen(false) }}
              aria-label={commandOpen ? 'Close command centre' : 'Open command centre'}
              aria-expanded={commandOpen}
            >
              <span className="ico" aria-hidden>▦</span>
              More
            </button>
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
                        `drawer-link ${(invStatus ? isInvLinkActive(l.to) : isActive) ? 'active' : ''}`
                      }
                      onClick={() => setMoreOpen(false)}
                    >
                      {l.label}
                      {l.count != null ? <span className="nav-count">{l.count}</span> : null}
                    </NavLink>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </>
  )
}
