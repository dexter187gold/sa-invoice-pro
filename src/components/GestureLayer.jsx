import { useEffect, useRef, useState } from 'react'
import { loadGesturePrefs } from '../lib/deviceAccess'

/**
 * Opt-in gestures only. Master switch + each action must be enabled in Settings.
 * Default: completely inactive (does not intercept navigation).
 */
export default function GestureLayer({
  onOpenMenu,
  onCloseMenu,
  onOpenCommand,
  onCreate,
}) {
  const start = useRef(null)
  const [prefs, setPrefs] = useState(() => loadGesturePrefs())

  useEffect(() => {
    const on = (e) => setPrefs(e.detail || loadGesturePrefs())
    window.addEventListener('sa-gesture-prefs', on)
    return () => window.removeEventListener('sa-gesture-prefs', on)
  }, [])

  useEffect(() => {
    if (!prefs?.enabled) return undefined
    if (typeof window === 'undefined') return undefined

    const EDGE = 28
    const MIN = 64

    const onStart = (e) => {
      if (!e.touches?.length) return
      const tag = (e.target && e.target.tagName) || ''
      if (/INPUT|TEXTAREA|SELECT|OPTION/.test(tag)) return
      if (e.target?.isContentEditable) return
      // Never fight scrollable lists / tables
      if (e.target?.closest?.('.bottom-nav, .drawer, .sidebar, .mobile-bar')) return

      const t0 = e.touches[0]
      start.current = {
        x: t0.clientX,
        y: t0.clientY,
        t: Date.now(),
        n: e.touches.length,
        edge: t0.clientX <= EDGE,
      }
    }

    const onEnd = (e) => {
      const s = start.current
      start.current = null
      if (!s) return
      const touch = e.changedTouches?.[0]
      if (!touch) return
      const dx = touch.clientX - s.x
      const dy = touch.clientY - s.y
      const adx = Math.abs(dx)
      const ady = Math.abs(dy)
      const dt = Date.now() - s.t

      // Multi-finger taps
      if (s.n >= 2 && adx < 20 && ady < 20 && dt < 300) {
        if (s.n >= 3 && prefs.threeFingerCommand) onOpenCommand?.()
        else if (s.n === 2 && prefs.twoFingerMenu) onOpenMenu?.()
        return
      }

      if (dt > 700) return
      if (adx < MIN && ady < MIN) return

      if (adx > ady * 1.2) {
        if (dx > MIN && s.edge && prefs.swipeMenu) onOpenMenu?.()
        else if (dx < -MIN && prefs.swipeClose) onCloseMenu?.()
        return
      }

      if (ady > adx * 1.2) {
        if (dy < -MIN && prefs.swipeUpCreate) onCreate?.('/invoices/new')
        else if (dy > MIN && prefs.swipeDownHome) onCreate?.('/')
      }
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend', onEnd)
    }
  }, [prefs, onOpenMenu, onCloseMenu, onOpenCommand, onCreate])

  return null
}
