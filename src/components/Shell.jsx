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

// NOTE: Full Shell restored in follow-up if truncated — critical nav shell
export default function Shell({ children, sections: sectionsProp }) {
  const { user, online, logout, syncNow, toast } = useApp() || {}
  const nav = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [navPrefs, setNavPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sa_nav_prefs') || '{}') } catch { return { layout: 'bottom' } }
  })

  useEffect(() => {
    const onPrefs = (e) => setNavPrefs(e.detail || { layout: 'bottom' })
    window.addEventListener('sa-nav-prefs', onPrefs)
    return () => window.removeEventListener('sa-nav-prefs', onPrefs)
  }, [])

  const section = sectionFromPath(location.pathname)
  const bottomItems = SECTION_NAV[section] || SECTION_NAV.home
  const sections = sectionsProp || [
    { title: 'Main', links: ROOT_NAV.filter((x) => x.section === 'home' || x.section === 'money') },
    { title: 'Work', links: ROOT_NAV.filter((x) => x.section === 'jobs' || x.section === 'clients') },
    { title: 'Books', links: ROOT_NAV.filter((x) => x.section === 'books') },
    { title: 'Account', links: ROOT_NAV.filter((x) => x.section === 'settings') },
  ]

  const brandLabel = displayAppName('SA Invoice Pro')
  const ledPhase = syncing ? 'busy' : online ? 'ok' : 'off'

  const runSync = async () => {
    if (syncing) return
    setSyncing(true)
    try { await syncNow?.() } catch (e) { toast?.(e?.message || 'Sync failed', 'error') }
    finally { setSyncing(false) }
  }

  const handleSignOut = () => {
    try { logout?.() } finally { nav('/login', { replace: true }) }
  }

  const useBottom = navPrefs.layout === 'bottom'
  const isItemActive = (item) => {
    if (item.end) return location.pathname === item.to
    return location.pathname.startsWith(String(item.to || '').split('?')[0])
  }

  return (
    <>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <AppAssistant />
      <QuickActions open={commandOpen} onOpenChange={setCommandOpen} hideTrigger={true} sections={sections} />

      <div className="mobile-bar">
        <button type="button" className="brand-logo-trigger" style={{ border: 0, background: 'transparent', padding: 0, margin: 0, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }} onClick={() => { setOpen(false); setMoreOpen(false); setCommandOpen(false); nav('/') }} aria-label="Go home" title="Home"><AppLogo size={28} /></button>
        <strong style={{ fontSize: 13, letterSpacing: '-0.02em', flex: 1 }}>{brandLabel}</strong>
        <div className="mobile-top-tools" aria-label="Workspace controls">
          <ActiveSeatChip compact />
          <button type="button" className={'live-leds mobile-sync-indicator phase-' + ledPhase} onClick={runSync} disabled={syncing} aria-label={syncing ? 'Syncing now' : 'Sync'} title={syncing ? 'Syncing…' : 'Sync now'}><span /><span /><span /></button>
        </div>
        {user ? (
          <button type="button" className="btn btn-outline btn-sm mobile-signout" onClick={handleSignOut} aria-label="Sign out" title="Sign out">Sign out</button>
        ) : null}
        <NotificationBell />
        <span className={`status-dot ${online ? 'on' : 'off'}`} title={online ? 'Online' : 'Offline'} />
      </div>

      <div className={`shell ${useBottom ? 'shell-bottom' : ''}`}>
        <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
          <div className="brand">
            <button type="button" className="brand-logo-trigger" onClick={() => nav('/')} aria-label="Home"><AppLogo size={40} /></button>
            <div>
              <strong>{brandLabel}</strong>
              <span className="muted" style={{ fontSize: 11 }}>v{APP_VERSION}</span>
            </div>
          </div>
          <nav className="side-nav">
            {ROOT_NAV.map((item) => (
              <NavLink key={item.to + item.label} to={item.to} end={item.end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}>
                <span className="ico" aria-hidden>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="shell-main">
          <main className="main-content">{children}</main>

          {useBottom ? (
            <nav className="bottom-nav" aria-label="Main menu and command centre">
              <button type="button" className={`bnav bottom-nav-menu ${moreOpen ? 'on' : ''}`} onClick={() => { setMoreOpen((v) => !v); setCommandOpen(false) }} aria-label={moreOpen ? 'Close main menu' : 'Open main menu'} title="Main menu">
                <span className="ico" aria-hidden>☰</span>
                Main Menu
              </button>
              <div className="bottom-nav-scroll">
                {bottomItems.filter((item) => !item.isRoot && !item.isMore).map((item) => (
                  <NavLink key={item.to + item.label} to={item.to} end={item.end} className={() => `bnav ${isItemActive(item) ? 'on' : ''}`} onClick={() => { setMoreOpen(false) }}>
                    <span className="ico" aria-hidden>{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
              <button type="button" className={`bnav bottom-nav-fixed ${commandOpen ? 'on' : ''}`} onClick={() => { setCommandOpen((v) => !v); setMoreOpen(false) }} aria-label={commandOpen ? 'Close command centre' : 'Open command centre'} aria-expanded={commandOpen}>
                <span className="ico" aria-hidden>▦</span>
                {commandOpen ? 'Close' : 'Command'}
              </button>
            </nav>
          ) : null}

          <div className={`drawer-backdrop ${moreOpen ? 'show' : ''}`} onClick={() => setMoreOpen(false)} aria-hidden={!moreOpen} />
          <div className={`drawer ${moreOpen ? 'open' : ''}`} id="more-drawer" role="dialog" aria-label="More pages">
            <div className="drawer-handle" />
            <h3>All sections</h3>
            {user ? <button type="button" className="btn btn-outline btn-sm" style={{ width: '100%', marginBottom: 12 }} onClick={handleSignOut}>Sign out</button> : null}
            {sections.map((sec) => (
              <div key={sec.title} className="drawer-section">
                <div className="drawer-section-title">{sec.title}</div>
                {sec.links.map((l) => (
                  <NavLink key={l.to + l.label} to={l.to} end={l.end} className={({ isActive }) => `drawer-link ${isActive ? 'active' : ''}`} onClick={() => setMoreOpen(false)}>
                    {l.icon ? <span className="ico">{l.icon}</span> : null}
                    {l.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
