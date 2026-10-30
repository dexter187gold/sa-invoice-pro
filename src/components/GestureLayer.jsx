import { useEffect, useRef, useState } from 'react'
import { loadGesturePrefs } from '../lib/deviceAccess'

/**
 * Opt-in, intentional gestures only.
 * - Single-finger swipes only from screen edges (when edgeOnly)
 * - Multi-finger taps / 3-finger swipe down for command
 * - Ignores scroll-like movement and chrome (nav, inputs, drawers)
 */
export default function GestureLayer({
  onOpenMenu,
  onCloseMenu,
  onOpenCommand,
  onCreate,
}) {
  const start = useRef(null)
  const locked = useRef(false)
  const [prefs, setPrefs] = useState(() => loadGesturePrefs())

  useEffect(() => {
    const on = (e) => setPrefs(e.detail || loadGesturePrefs())
    window.addEventListener('sa-gesture-prefs', on)
    return () => window.removeEventListener('sa-gesture-prefs', on)
  }, [])

  useEffect(() => {
    if (!prefs?.enabled) return undefined
    if (typeof window === 'undefined') return undefined

    const EDGE = 24
    const MIN = 72
    const MAX_TAP = 28
    const TAP_MS = 280
    const SWIPE_MS = 650

    const blockedTarget = (t) => {
      if (!t || !t.closest) return true
      const tag = t.tagName || ''
      if (/INPUT|TEXTAREA|SELECT|OPTION|BUTTON|A/.test(tag)) return true
      if (t.isContentEditable) return true
      if (t.closest('.bottom-nav, .drawer, .drawer-backdrop, .sidebar, .mobile-bar, .auth-page, [role="dialog"], .quick-actions, .command-palette')) return true
      return false
    }

    const onStart = (e) => {
      if (!e.touches?.length) return
      if (blockedTarget(e.target)) {
        start.current = null
        return
      }
      const t0 = e.touches[0]
      const n = e.touches.length
      const edgeLeft = t0.clientX <= EDGE
      const edgeRight = t0.clientX >= window.innerWidth - EDGE
      const edgeTop = t0.clientY <= EDGE
      // Single finger: only begin tracking from edges (comfortable, no scroll fight)
      if (n === 1 && prefs.edgeOnly !== false && !edgeLeft && !edgeRight && !edgeTop) {
        start.current = null
        return
      }
      start.current = {
        x: t0.clientX,
        y: t0.clientY,
        t: Date.now(),
        n,
        edgeLeft,
        edgeRight,
        edgeTop,
        moved: 0,
      }
      locked.current = false
    }

    const onMove = (e) => {
      const s = start.current
      if (!s || !e.touches?.[0]) return
      const t0 = e.touches[0]
      const adx = Math.abs(t0.clientX - s.x)
      const ady = Math.abs(t0.clientY - s.y)
      s.moved = Math.max(s.moved, adx, ady)
      // If single-finger vertical travel dominates early → treat as scroll, abandon
      if (s.n === 1 && ady > 40 && ady > adx * 1.4) {
        start.current = null
      }
    }

    const fire = (fn) => {
      if (locked.current) return
      locked.current = true
      try {
        if (prefs.hapticHint && navigator.vibrate) navigator.vibrate(12)
      } catch {}
      fn?.()
      setTimeout(() => { locked.current = false }, 400)
    }

    const onEnd = (e) => {
      const s = start.current
      start.current = null
      if (!s || locked.current) return
      const touch = e.changedTouches?.[0]
      if (!touch) return
      const dx = touch.clientX - s.x
      const dy = touch.clientY - s.y
      const adx = Math.abs(dx)
      const ady = Math.abs(dy)
      const dt = Date.now() - s.t

      // 3-finger swipe down → Command centre (explicit request)
      if (s.n >= 3 && dy > MIN && ady > adx * 1.1 && dt < 900) {
        if (prefs.threeFingerSwipeDownCommand || prefs.threeFingerCommand) {
          fire(onOpenCommand)
          return
        }
      }

      // Multi-finger short tap
      if (s.n >= 2 && adx < MAX_TAP && ady < MAX_TAP && dt < TAP_MS) {
        if (s.n >= 3 && prefs.threeFingerCommand) fire(onOpenCommand)
        else if (s.n === 2 && prefs.twoFingerMenu) fire(onOpenMenu)
        return
      }

      if (dt > SWIPE_MS) return
      if (adx < MIN && ady < MIN) return

      // Single-finger edge swipes only
      if (s.n === 1) {
        if (adx > ady * 1.25) {
          if (dx > MIN && s.edgeLeft && prefs.swipeMenu) fire(onOpenMenu)
          else if (dx < -MIN && (s.edgeRight || prefs.swipeClose) && prefs.swipeClose) fire(onCloseMenu)
          return
        }
        if (ady > adx * 1.25) {
          if (dy < -MIN && s.edgeTop && prefs.swipeUpCreate) fire(() => onCreate?.('/invoices/new'))
          else if (dy > MIN && s.edgeTop && prefs.swipeDownHome) fire(() => onCreate?.('/'))
        }
      }
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    window.addEventListener('touchcancel', () => { start.current = null }, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [prefs, onOpenMenu, onCloseMenu, onOpenCommand, onCreate])

  return null
}
