import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import CommandPalette from './CommandPalette'
import QuickActions from './QuickActions'
import AppAssistant from './AppAssistant'
import NotificationBell from './NotificationBell'
import ActiveSeatChip from './ActiveSeatChip'
import AppLogo from './AppLogo'
import OrbNavigation from './OrbNavigation'
import { ROOT_NAV, SECTION_NAV, sectionFromPath } from './shellNav'
import { displayAppName } from '../lib/whiteLabel'
import GestureLayer from './GestureLayer'
import { loadGesturePrefs } from '../lib/deviceAccess'
import { readAccessStatus, canAccessPath } from '../lib/accessControl'

export default function Shell({ children, sections: sectionsProp }) {
  const { user, online, lock, logout, syncNow, toast } = useApp() || {}
  const nav = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [gesturesOn, setGesturesOn] = useState(() => !!loadGesturePrefs().enabled)
  const [accessStatus, setAccessStatus] = useState(null)
  const [navPrefs, setNavPrefs] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('sa_nav_prefs') || '{}')
      return { layout: raw.layout || 'bottom', ...raw }
    } catch {
      return { layout: 'bottom' }
    }
  })

  useEffect(() => {
    let alive = true
    const refreshAccess = () => readAccessStatus().then((value) => { if (alive) setAccessStatus(value) })
    refreshAccess()
    window.addEventListener('sa-license-updated', refreshAccess)
    return () => { alive = false; window.removeEventListener('sa-license-updated', refreshAccess) }
  }, [])

  const visibleRootNav = ROOT_NAV.filter((item) => item.to !== '/dev-portal' && (
    item.to === '/owner-console' || item.to === '/owner-recovery'
      ? !!(user?.isOwner || user?.role === 'owner' || user?.role === 'Owner')
      : canAccessPath(item.to, accessStatus, !!(user?.isOwner || user?.role === 'owner' || user?.role === 'Owner'))
  ))

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
    setOpen(false)
    setCommandOpen(false)
  }, [location.pathname, location.search])

  const section = sectionFromPath(location.pathname)
  const bottomItems = SECTION_NAV[section] || SECTION_NAV.home
  const sections = useMemo(
    () =>
      sectionsProp || [
        { title: 'Main', links: visibleRootNav.filter((x) => x.section === 'home' || x.section === 'money') },
        { title: 'Work', links: visibleRootNav.filter((x) => x.section === 'jobs' || x.section === 'clients') },
        { title: 'Books', links: visibleRootNav.filter((x) => x.section === 'books') },
        { title: 'Account', links: visibleRootNav.filter((x) => x.section === 'settings' && x.to !== '/dev-portal') },
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

  const handleLock = () => {
    try { lock?.() } finally { nav('/login?locked=1', { replace: true }) }
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
            setPaletteOpen(true)
            setCommandOpen(false)
          }}
          onCloseMenu={() => {
            setPaletteOpen(false)
            setCommandOpen(false)
            setOpen(false)
          }}
          onOpenCommand={() => {
            setCommandOpen(true)
          }}
          onCreate={(path) => {
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
        <button type="button" className="shell-account-action" onClick={handleLock} title="Lock workspace" aria-label="Lock workspace">🔒</button>
        <button type="button" className="shell-account-action" onClick={handleSignOut} title="Sign out" aria-label="Sign out">↪</button>
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
              <span className="muted" style={{ fontSize: 11 }}>Business workspace</span>
            </div>
          </div>
          <nav className="side-nav">
            {visibleRootNav.map((item) => (
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

      {useBottom ? <OrbNavigation onCommand={() => setCommandOpen((value) => !value)} accessStatus={accessStatus} isOwner={!!(user?.isOwner || user?.role === 'owner' || user?.role === 'Owner')} /> : null}

    </>
  )
}
