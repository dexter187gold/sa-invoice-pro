import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Floating "Buy us a coffee" control — visible on all authenticated pages.
 * Opens License contribute section or expands tip shortcuts.
 */
export default function DonateFab() {
  const nav = useNavigate()
  const loc = useLocation()
  const [open, setOpen] = useState(false)

  // Hide on portal / login surfaces
  if (loc.pathname.startsWith('/portal') || loc.pathname === '/login') return null

  const goContribute = () => {
    setOpen(false)
    if (loc.pathname === '/license') {
      const el = document.getElementById('contribute')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else window.location.hash = 'contribute'
    } else {
      nav('/license#contribute')
    }
  }

  return (
    <div
      className="donate-fab-wrap"
      style={{
        position: 'fixed',
        right: 14,
        bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {open ? (
        <div
          className="card"
          style={{
            pointerEvents: 'auto',
            padding: '10px 12px',
            minWidth: 200,
            boxShadow: '0 8px 24px rgba(0,0,0,.25)',
            borderLeft: '4px solid #f59e0b',
          }}
        >
          <strong style={{ fontSize: 13 }}>Support development</strong>
          <p className="muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>
            Optional tip — does not change your licence.
          </p>
          <button type="button" className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={goContribute}>
            Buy us a coffee
          </button>
        </div>
      ) : null}
      <button
        type="button"
        className="donate-fab"
        title="Buy us a coffee"
        aria-label="Buy us a coffee"
        onClick={() => setOpen((v) => !v)}
        style={{
          pointerEvents: 'auto',
          width: 52,
          height: 52,
          borderRadius: 999,
          border: 'none',
          cursor: 'pointer',
          background: 'linear-gradient(145deg,#f59e0b,#ea580c)',
          color: '#fff',
          fontSize: 22,
          boxShadow: '0 6px 18px rgba(234,88,12,.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ☕
      </button>
    </div>
  )
}
