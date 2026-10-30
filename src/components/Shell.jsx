import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { APP_VERSION } from '../config'
import CommandPalette from './CommandPalette'
import QuickActions from './QuickActions'
import AppAssistant from './AppAssistant'
import NotificationBell from './NotificationBell'
import ActiveSeatChip from './ActiveSeatChip'
import AppLogo from './AppLogo'
import { ROOT_NAV, SECTION_NAV, sectionFromPath } from './shellNav'
import { displayAppName } from '../lib/whiteLabel'
import GestureLayer from './GestureLayer'
import { loadGesturePrefs } from '../lib/deviceAccess'

export default function Shell({ children, sections: sectionsProp }) {
  const { user, online, logout, syncNow, toast } = useApp() || {}
  const nav = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [gesturesOn, setGesturesOn] = useState(() => !!loadGesturePrefs().enabled)
  const [navPrefs, setNavPrefs] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('sa_nav_prefs') || '{}')
      return { layout: raw.layout || 'bottom', ...raw }
    } catch {
      return { layout: 'bottom' }
    }
  })

  const useBottom = (navPrefs?.layout || 'bottom') !== 'side'

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('nav-bottom', useBottom)
    root.classList.toggle('nav-compact', navPrefs?.layout === 'compact')
    try {
      localStorage.setItem('sa_nav_prefs', JSON.stringify({ ...navPrefs, layout: navPrefs.layout || 'bottom' }))
    } catch {}
  }, [useBottom, navPrefs])

  useEffect(() => {
    const onPrefs = (e) => setNavPrefs({ layout: 'bottom', ...(e.detail || {}) })
    window.addEventListener('sa-nav-prefs', onPrefs)
    return () => window.removeEventListener('sa-nav-prefs', onPrefs)
  }, [])

  useEffect(() => {
    const onG = (e) => setGesturesOn(!!(e.detail?.enabled ?? loadGesturePrefs().enabled))
    window.addEventListener('sa-gesture-prefs', onG)
    return () => window.removeEventListener('sa-gesture-prefs', onG)
  }, [])

  useEffect(() => {
    setMoreOpen(false)
    setOpen(false)
    setCommandOpen(false)
  }, [location.pathname, location.search])

  const section = sectionFromPath(location.pathname)
  const bottomItems = SECTION_NAV[section] || SECTION_NAV.home
  const sections = useMemo(
    () =>
      sectionsProp || [
        { title: 'Main', links: ROOT_NAV.filter((x) => x.section === 'home' || x.section === 'money') },
        { title: 'Work', links: ROOT_NAV.filter((x) => x.section === 'jobs' || x.section === 'clients') },
        { title: 'Books', links: ROOT_NAV.filter((x) => x.section === 'books') },
        { title: 'Account', links: ROOT_NAV.filter((x) => x.section === 'settings' && x.to !== '/dev-portal') },
      ],
    [sectionsProp],
  )

  const brandLabel = displayAppName('SA Invoice Pro')
  const ledPhase = syncing ? 'busy' : online ? 'ok' : 'off'

  const runSync = async () => {
    if (syncing) return
    setSyncing(true)
    try {
      await syncNow?.()
    } catch (e) {
      toast?.(e?.message || 'Sync failed', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleSignOut = () => {
    try {
      logout?.()
    } finally {
      nav('/login', { replace: true })
    }
  }

  const isItemActive = (item) => {
    if (item.end) return location.pathname === item.to
    const base = String(item.to || '').split('?')[0]
    return location.pathname === base || location.pathname.startsWith(base + '/')
  }

  return (
    <>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {gesturesOn ? (
        <GestureLayer
          onOpenMenu={() => {
            setMoreOpen(true)
            setCommandOpen(false)
          }}
          onCloseMenu={() => {
            setMoreOpen(false)
            setCommandOpen(false)
            setOpen(false)
          }}
          onOpenCommand={() => {
            setCommandOpen(true)
            setMoreOpen(false)
          }}
          onCreate={(path) => {
            setMoreOpen(false)
            setCommandOpen(false)
            nav(path)
          }}
        />
      ) : null}
      <AppAssistant />
      <QuickActions open={commandOpen} onOpenChange={setCommandOpen} hideTrigger={true} sections={sections} />

      <div className="mobile-bar">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => {
            setMoreOpen((v) => !v)
            setCommandOpen(false)
            setOpen(false)
          }}
          aria-label={moreOpen ? 'Close main menu' : 'Open main menu'}
          aria-expanded={moreOpen}
          title="Main menu"
        >
          ☰
        </button>
        <button
          type="button"
          className="brand-logo-trigger"
          style={{
            border: 0,
            background: 'transparent',
            padding: 0,
            margin: 0,
            display: 'inline-flex',
            alignItems: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          onClick={() => {
            setOpen(false)
            setMoreOpen(false)
            setCommandOpen(false)
            nav('/')
          }}
          aria-label="Go home"
          title="Home"
        >
          <AppLogo size={28} />
        </button>
        <strong style={{ fontSize: 13, letterSpacing: '-0.02em', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {brandLabel}
        </strong>
        <div className="mobile-top-tools" aria-label="Workspace controls">
          <ActiveSeatChip compact />
          <button
            type="button"
            className={'live-leds mobile-sync-indicator phase-' + ledPhase}
            onClick={runSync}
            disabled={syncing}
            aria-label={syncing ? 'Syncing now' : 'Sync'}
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
            <button type="button" className="brand-logo-trigger" onClick={() => { setOpen(false); nav('/') }} aria-label="Home">
              <AppLogo size={40} />
            </button>
            <div>
              <strong>{brandLabel}</strong>
              <span className="muted" style={{ fontSize: 11 }}>v{APP_VERSION}</span>
            </div>
          </div>
          <nav className="side-nav">
            {ROOT_NAV.filter((item) => item.to !== '/dev-portal').map((item) => (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <span className="ico" aria-hidden>{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {open ? <div className="sidebar-backdrop show" onClick={() => setOpen(false)} aria-hidden="true" /> : null}

        <main className="main" id="main-content">
          {children}
        </main>
      </div>

      {useBottom ? (
        <>
          <nav className="bottom-nav" aria-label="Main menu, contextual navigation and command centre">
            <button
              type="button"
              className={`bnav bottom-nav-menu ${moreOpen ? 'on' : ''}`}
              onClick={() => {
                setMoreOpen((v) => !v)
                setCommandOpen(false)
                setOpen(false)
              }}
              aria-label={moreOpen ? 'Close main menu' : 'Open main menu'}
              aria-expanded={moreOpen}
              title="Main menu"
            >
              <span className="ico" aria-hidden>☰</span>
              Menu
            </button>
            <div className="bottom-nav-scroll" aria-label="Section shortcuts">
              {bottomItems
                .filter((item) => !item.isRoot && !item.isMore)
                .map((item) => (
                  <NavLink
                    key={item.to + item.label}
                    to={item.to}
                    end={item.end}
                    className={() => `bnav ${isItemActive(item) ? 'on' : ''}`}
                    onClick={() => {
                      setMoreOpen(false)
                      setOpen(false)
                    }}
                  >
                    <span className="ico" aria-hidden>{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
            </div>
            <button
              type="button"
              className={`bnav bottom-nav-fixed ${commandOpen ? 'on' : ''}`}
              onClick={() => {
                setCommandOpen((v) => !v)
                setMoreOpen(false)
                setOpen(false)
              }}
              aria-label={commandOpen ? 'Close command centre' : 'Open command centre'}
              aria-expanded={commandOpen}
            >
              <span className="ico" aria-hidden>▦</span>
              {commandOpen ? 'Close' : 'Command'}
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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => { setMoreOpen(false); nav('/invoices/new') }}>+ Invoice</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setMoreOpen(false); nav('/quotes') }}>+ Quote</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setMoreOpen(false); nav('/tickets') }}>+ Job</button>
            </div>
            {user ? (
              <button type="button" className="btn btn-outline btn-sm" style={{ width: '100%', marginBottom: 12 }} onClick={handleSignOut}>
                Sign out
              </button>
            ) : null}
            {sections.map((sec) => (
              <div key={sec.title} className="drawer-section">
                <div className="drawer-section-title">{sec.title}</div>
                {sec.links.map((l) => (
                  <NavLink
                    key={l.to + l.label}
                    to={l.to}
                    end={l.end}
                    className={({ isActive }) => `drawer-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMoreOpen(false)}
                  >
                    {l.icon ? <span className="ico">{l.icon}</span> : null}
                    {l.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </>
  )
}
