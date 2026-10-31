import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import AppLogo from './AppLogo'
import { ROOT_NAV } from './shellNav'

const LEFT = [
  { to: '/invoices/new', label: 'Create invoice', icon: '＋' },
  { to: '/invoices', label: 'Invoices', icon: '▤' },
  { to: '/clients', label: 'Clients', icon: '♙' },
  { to: '/tickets', label: 'Job cards', icon: '⚒' },
  { to: '/quotes', label: 'Quotes', icon: '▧' },
]
const RIGHT = [
  { to: '/payments', label: 'Payments', icon: 'R' },
  { to: '/expenses', label: 'Expenses', icon: '↗' },
  { to: '/inbox', label: 'Inbox', icon: '✉' },
  { to: '/reports', label: 'Reports', icon: '▥' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export default function OrbNavigation({ onCommand }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [gestureHint, setGestureHint] = useState('')
  const touch = useRef(null)
  const suppressClick = useRef(false)
  const nav = useNavigate()
  const location = useLocation()
  useEffect(() => setMenuOpen(false), [location.pathname, location.search])
  const menuItems = ROOT_NAV.filter((item) => item.to !== '/dev-portal')

  useEffect(() => {
    if (!menuOpen) return undefined
    const previousOverflow = document.body.style.overflow
    const previousOverscroll = document.body.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscroll
    }
  }, [menuOpen])

  const start = (event) => {
    const point = event.touches?.[0]
    if (!point) return
    touch.current = { x: point.clientX, y: point.clientY, time: Date.now() }
    suppressClick.current = false
  }
  const end = (event) => {
    if (!touch.current) return
    const point = event.changedTouches?.[0]
    const origin = touch.current
    touch.current = null
    if (!point) return
    const dx = point.clientX - origin.x
    const dy = point.clientY - origin.y
    if (Date.now() - origin.time > 900 || Math.max(Math.abs(dx), Math.abs(dy)) < 48) return
    suppressClick.current = true
    if (Math.abs(dy) > Math.abs(dx) * 1.15) {
      if (dy < -48) {
        setMenuOpen(true)
        setGestureHint('Main menu')
      } else {
        setMenuOpen(false)
        setGestureHint('Menu closed')
      }
    } else if (Math.abs(dx) >= 58) {
      setMenuOpen(false)
      const destination = dx < 0 ? '/invoices/new' : '/tickets'
      setGestureHint(dx < 0 ? 'New invoice' : 'Create job card')
      nav(destination)
    } else {
      suppressClick.current = false
      return
    }
    window.setTimeout(() => { suppressClick.current = false; setGestureHint('') }, 650)
  }

  const renderRail = (items, side) => (
    <div className={'orb-rail orb-rail-' + side} aria-label={side === 'left' ? 'Primary shortcuts' : 'Quick access'}>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => 'orb-shortcut' + (isActive ? ' active' : '')} title={item.label} aria-label={item.label}>
          <span className="orb-shortcut-icon" aria-hidden="true">{item.icon}</span>
          <span className="orb-shortcut-label">{item.label}</span>
        </NavLink>
      ))}
      {side === 'right' ? (
        <button type="button" className="orb-shortcut orb-command" onClick={onCommand} title="Command Centre" aria-label="Open Command Centre">
          <span className="orb-shortcut-icon" aria-hidden="true">⌘</span>
          <span className="orb-shortcut-label">Command</span>
        </button>
      ) : null}
    </div>
  )

  return (
    <>
      <style>{`
        .sa-orb-dock{position:fixed;z-index:80;left:0;right:0;bottom:calc(7px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;justify-content:center;gap:clamp(5px,1.4vw,18px);padding:0 8px;pointer-events:none}
        .orb-rail{position:absolute;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:clamp(3px,.7vw,10px);max-width:calc((100vw - 104px)/2);min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;pointer-events:auto;padding:7px 2px}
        .orb-rail-left{left:6px}.orb-rail-right{right:6px}.orb-rail::-webkit-scrollbar{display:none}
        .orb-shortcut{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:48px;padding:5px 7px;border:1px solid transparent;border-radius:12px;color:var(--text);text-decoration:none;background:color-mix(in srgb,var(--card,#111827) 88%,transparent);backdrop-filter:blur(16px);font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
        .orb-shortcut.active{border-color:color-mix(in srgb,var(--green,#16a34a) 55%,transparent);color:var(--green,#16a34a);background:color-mix(in srgb,var(--green,#16a34a) 12%,var(--card,#111827))}
        .orb-shortcut-icon{font-size:19px;line-height:1.15;font-weight:800}.orb-shortcut-label{font-size:9px;font-weight:700;white-space:nowrap}
        .orb-command{appearance:none}
        .sa-orb-trigger{touch-action:none;user-select:none;-webkit-user-select:none;pointer-events:auto;position:relative;flex:0 0 76px;width:76px;height:76px;border-radius:50%;border:1px solid rgba(255,255,255,.75);padding:5px;display:grid;place-items:center;background:radial-gradient(circle at 34% 24%,#ffffff 0%,#d8fff0 8%,#168c61 34%,#07553d 66%,#062d27 100%);box-shadow:0 0 0 3px #12b98135,0 0 18px 7px #10b98175,0 0 42px 12px #05966945,inset 0 3px 9px #ffffffb8,inset 0 -8px 16px #001b16b8;cursor:pointer;transition:transform .2s ease,filter .2s ease}
        .sa-orb-trigger:before{content:"";position:absolute;inset:5px;border-radius:50%;border:1px solid #ffffff75;box-shadow:inset 0 0 13px #ffffff55;pointer-events:none}
        .sa-orb-trigger:after{content:"";position:absolute;left:15%;top:9%;width:48%;height:22%;border-radius:50%;background:linear-gradient(#ffffffb8,#ffffff00);filter:blur(2px);transform:rotate(-24deg);pointer-events:none}
        .sa-orb-trigger:active{transform:scale(.94)}.sa-orb-trigger img{border-radius:50%!important;width:54px!important;height:54px!important;object-fit:contain!important;position:relative;z-index:1;filter:drop-shadow(0 2px 4px #001b16aa)}
        .sa-orb-backdrop{position:fixed;inset:0;z-index:79;width:100%;height:100%;padding:0;border:0;cursor:default;background:rgba(2,18,14,.42);-webkit-backdrop-filter:blur(18px) brightness(.72) saturate(125%);backdrop-filter:blur(18px) brightness(.72) saturate(125%);touch-action:none;animation:orbBackdropIn .2s ease both}
        @keyframes orbBackdropIn{from{opacity:0}to{opacity:1}}
        @media(prefers-reduced-transparency:reduce){.sa-orb-backdrop{background:rgba(2,18,14,.78);-webkit-backdrop-filter:none;backdrop-filter:none}}
        .sa-orb-menu{position:fixed;z-index:82;left:50%;bottom:94px;transform:translateX(-50%);width:min(94vw,760px);max-height:min(68vh,590px);overflow:auto;overscroll-behavior:contain;touch-action:pan-y;padding:10px 8px 18px;background:transparent;border:0;border-radius:0;box-shadow:none;pointer-events:auto;animation:orbMenuIn .32s cubic-bezier(.2,.8,.2,1) both}
        @keyframes orbMenuIn{from{opacity:0;transform:translate(-50%,18px) scale(.96)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
        .sa-orb-menu-head{display:flex;align-items:center;justify-content:center;gap:8px;padding:4px 8px 12px;color:var(--text);text-shadow:0 2px 12px #0009}.sa-orb-menu-head strong{font-size:13px}.sa-orb-menu-head span{display:block;font-size:10px;color:var(--muted)}
        .sa-orb-grid{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:clamp(10px,2.2vw,20px);padding:6px 2px}
        .sa-orb-grid a{position:relative;display:flex;flex:0 0 clamp(70px,15vw,104px);min-height:82px;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:9px 5px;border:1px solid transparent;border-radius:18px;background:transparent;color:var(--text);text-decoration:none;font-size:11px;font-weight:700;text-align:center;text-shadow:0 2px 8px #000b;animation:orbItemIn .36s both;transition:transform .18s ease,color .18s ease,background .18s ease}
        .sa-orb-grid a span:first-child{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;font-size:25px;line-height:1;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.24);box-shadow:0 5px 18px #0003;backdrop-filter:blur(12px);text-shadow:none}
        .sa-orb-grid a:nth-child(3n+1){animation-delay:35ms}.sa-orb-grid a:nth-child(3n+2){animation-delay:75ms}.sa-orb-grid a:nth-child(3n){animation-delay:115ms}
        @keyframes orbItemIn{from{opacity:0;transform:translateY(16px) scale(.86)}to{opacity:1;transform:translateY(0) scale(1)}}
        .sa-orb-menu a:hover,.sa-orb-grid a:focus-visible,.sa-orb-grid a:active{color:var(--green,#16a34a);background:rgba(16,185,129,.10);outline:none;transform:translateY(-3px) scale(1.04)}.sa-orb-hint{position:absolute;bottom:88px;left:50%;transform:translateX(-50%);white-space:nowrap;padding:7px 12px;border-radius:99px;background:#064e3b;color:white;font-size:11px;font-weight:800;box-shadow:0 4px 20px #0005}
        @media(max-width:520px){.sa-orb-dock{gap:3px}.orb-rail{max-width:calc((100vw - 88px)/2);gap:1px}.orb-shortcut{min-width:42px;padding:5px 4px}.orb-shortcut-label{font-size:8px}.sa-orb-trigger{width:68px;height:68px;flex-basis:68px}.sa-orb-trigger img{width:48px!important;height:48px!important}.sa-orb-menu{bottom:80px}.sa-orb-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(prefers-reduced-motion:reduce){.sa-orb-menu,.sa-orb-grid a{animation:none!important}.sa-orb-trigger{transition:none}}
        html.nav-bottom .main{padding-bottom:calc(108px + env(safe-area-inset-bottom,0px))!important} html.nav-bottom,html.nav-bottom body{overscroll-behavior-y:none} .sa-orb-dock{touch-action:pan-x}
      `}</style>
      <nav className="sa-orb-dock" aria-label="SA Invoice Pro navigation">
        {renderRail(LEFT, 'left')}
        <div style={{ position: 'relative', flex: '0 0 76px', display: 'grid', placeItems: 'center' }}>
          {menuOpen ? (
            <div className="sa-orb-menu" role="dialog" aria-label="Main menu" onTouchStart={(event) => event.stopPropagation()} onTouchMove={(event) => event.stopPropagation()}>
              <div className="sa-orb-menu-head"><AppLogo size={30}/><div><strong>SA Invoice Pro</strong><span>Choose where you want to go</span></div></div>
              <div className="sa-orb-grid">
                {menuItems.map((item) => (
                  <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)}>
                    <span aria-hidden="true">{item.icon}</span><span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ) : null}
          {gestureHint ? <span className="sa-orb-hint">{gestureHint}</span> : null}
          <button type="button" className="sa-orb-trigger" onTouchStart={start} onTouchMove={(event) => event.preventDefault()} onTouchEnd={end} onTouchCancel={() => { touch.current = null }} onClick={() => { if (suppressClick.current) return; setMenuOpen((value) => !value) }} aria-label={menuOpen ? 'Close main menu' : 'Open main menu'} aria-expanded={menuOpen} title="SA Invoice Pro main menu — swipe left for invoice, right for job card">
            <AppLogo size={54}/>
          </button>
        </div>
        {renderRail(RIGHT, 'right')}
      </nav>
      {menuOpen ? <button type="button" aria-label="Close main menu" onClick={() => setMenuOpen(false)} className="sa-orb-backdrop" /> : null}
    </>
  )
}
