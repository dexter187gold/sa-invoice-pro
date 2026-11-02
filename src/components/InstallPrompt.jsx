import React, { useEffect, useState } from 'react'

/** PWA install affordance — beforeinstallprompt + iOS Add to Home Screen hint. */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [visible, setVisible] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem('sa_pwa_install_dismissed') === '1') return
    } catch {}

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    if (isStandalone) return

    const ua = navigator.userAgent || ''
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (ios) {
      setIosHint(true)
      setVisible(true)
      return
    }

    const onBip = (e) => {
      e.preventDefault()
      setDeferred(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  const dismiss = () => {
    setVisible(false)
    try { localStorage.setItem('sa_pwa_install_dismissed', '1') } catch {}
  }

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    try { await deferred.userChoice } catch {}
    setDeferred(null)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="card"
      role="region"
      aria-label="Install app"
      style={{
        position: 'fixed',
        bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
        left: 12,
        right: 12,
        zIndex: 80,
        maxWidth: 420,
        margin: '0 auto',
        borderColor: 'var(--biz-accent-soft, var(--border))',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <strong style={{ display: 'block', marginBottom: 4 }}>Install SA Invoice Pro</strong>
      <p className="muted" style={{ margin: '0 0 10px', fontSize: 13 }}>
        {iosHint
          ? 'On iPhone/iPad: Share → Add to Home Screen for a full-screen desk icon.'
          : 'Install on this device for offline-friendly access and a home-screen icon.'}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {!iosHint && (
          <button type="button" className="btn btn-primary btn-sm" onClick={install} disabled={!deferred}>
            Install
          </button>
        )}
        <button type="button" className="btn btn-outline btn-sm" onClick={dismiss}>
          Not now
        </button>
      </div>
    </div>
  )
}
